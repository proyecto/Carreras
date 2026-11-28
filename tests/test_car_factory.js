"use strict";
// ---- test_car_factory.js
// Pruebas unitarias para CarFactory (engine/car-factory.js)
// Verifica la arquitectura data-driven, decodificadores binarios, creación por spec JSON,
// cinemática de ruedas y parseo de modelos 3D GLB.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function runCarFactoryTestSuite() {
  console.log(
    "\n--- [TEST SUITE] Factoría Data-Driven y Modelado de Coches (engine/car-factory.js) ---",
  );
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
    } else {
      failed++;
      console.error(`  ❌ FALLO: ${message}`);
    }
  }

  const root = path.resolve(__dirname, "..");
  const mathCode = fs.readFileSync(path.join(root, "engine/math.js"), "utf8");
  const carFactoryCode = fs.readFileSync(
    path.join(root, "engine/car-factory.js"),
    "utf8",
  );
  const regCode = fs.readFileSync(path.join(root, "game/registry.js"), "utf8");

  const objModels = new Map();
  const objPrevs = new Map();
  let nextSlot = 1;

  const ctx = {
    window: {},
    document: { createElement: () => ({ getContext: () => ({}) }) },
    Float32Array,
    Uint32Array,
    Uint16Array,
    Int32Array,
    Float64Array,
    Uint8Array,
    DataView,
    ArrayBuffer,
    TextDecoder,
    Math,
    WGSL: {},
    objSlot: () => nextSlot++,
    objModel: (s) => {
      if (!objModels.has(s)) objModels.set(s, new Float32Array(16));
      return objModels.get(s);
    },
    objPrev: (s) => {
      if (!objPrevs.has(s)) objPrevs.set(s, new Float32Array(16));
      return objPrevs.get(s);
    },
    mkTex: () => ({ createView: () => ({}) }),
    TU: { RT: 1, TB: 2, CD: 4 },
    G: {
      dev: { queue: { writeTexture: () => {} }, createBindGroup: () => ({}) },
    },
    R: { drawables: [], transparents: [] },
    mkFamily: (name, opts) => ({ name, opts, bgl3: {} }),
    MeshSet: class {
      add() {}
      draw() {}
    },
    GlassSet: class {
      add_() {}
      draw() {}
    },
    MeshBuilder: class {
      constructor() {
        this.ni = 0;
      }
      mat() {}
      v() {}
      tri() {
        this.ni += 3;
      }
      upload() {
        return {};
      }
    },
    atob: (b64) => Buffer.from(b64, "base64").toString("binary"),
  };

  vm.createContext(ctx);
  vm.runInContext(mathCode, ctx);
  vm.runInContext(carFactoryCode, ctx);
  vm.runInContext(regCode, ctx);

  const CarFactory = ctx.CarFactory;
  assert(!!CarFactory, "CarFactory exportado globalmente");

  // 1. Decodificadores Base64
  const testF32 = new Float32Array([1.5, -2.25, 3.125, 0.0]);
  const b64F32 = Buffer.from(testF32.buffer).toString("base64");
  const decodedF32 = CarFactory.b64ToF32(b64F32);
  assert(decodedF32.length === 4, "b64ToF32 decodifica la longitud exacta");
  assert(
    Math.abs(decodedF32[0] - 1.5) < 1e-5 &&
      Math.abs(decodedF32[1] - -2.25) < 1e-5,
    "b64ToF32 conserva los valores IEEE-754",
  );

  const testU32 = new Uint32Array([10, 200, 3000, 40000]);
  const b64U32 = Buffer.from(testU32.buffer).toString("base64");
  const decodedU32 = CarFactory.b64ToU32(b64U32);
  assert(
    decodedU32[0] === 10 && decodedU32[3] === 40000,
    "b64ToU32 decodifica enteros de 32 bits",
  );

  // 2. Definición directa de vehículo (defineCar)
  const miniSpec = {
    id: "test-car-spec",
    name: "Vehículo de Prueba Spec",
    physics: {
      m: 1200,
      Izz: 1600,
      L: 2.6,
      a: 1.3,
      b: 1.3,
      tw: 1.6,
      h: 0.35,
      R: 0.33,
      mu: 1.7,
      B: 11.0,
      C: 1.5,
      driveF: 0.0,
    },
    hud: { maxKmh: 300, maxRpm: 8.0, redlineRpm: 7.2 },
    hubs: [
      [1.3, 0.33, -0.8],
      [1.3, 0.33, 0.8],
      [-1.3, 0.33, -0.8],
      [-1.3, 0.33, 0.8],
    ],
  };

  const carObj = CarFactory.defineCar(miniSpec);
  assert(carObj.id === "test-car-spec", "defineCar asigna el id correctamente");
  assert(
    carObj.wheelbase === 2.6,
    "defineCar infiere wheelbase a partir de bujes",
  );
  assert(carObj.trackF === 1.6, "defineCar infiere trackF a partir de bujes");
  assert(typeof carObj.place === "function", "defineCar genera método place");

  // 3. Prueba Cinemática de Ruedas (place)
  const bodyMatrix = new Float32Array(16);
  ctx.m4ident(bodyMatrix);
  bodyMatrix[12] = 100; // Pos X
  bodyMatrix[13] = 5; // Pos Y
  bodyMatrix[14] = -50; // Pos Z

  carObj.slotBody = 10;
  carObj.slotWheel = [11, 12, 13, 14];
  carObj.inp[0] = 0.25; // Ángulo de dirección
  const spins = new Float64Array([1.0, 1.0, 2.0, 2.0]);
  const susp = new Float64Array([0.02, 0.02, 0.01, 0.01]);

  carObj.place(bodyMatrix, spins, susp);

  const flModel = ctx.objModel(carObj.slotWheel[0]);
  assert(
    flModel[12] !== 0 && flModel[13] !== 0 && flModel[14] !== 0,
    "Cinemática: Rueda FL posicionada en el espacio mundo",
  );
  assert(
    Math.abs(flModel[12] - (100 + 1.3)) < 0.1,
    "Cinemática: Posición X de rueda delantera consistente con chasis + buje",
  );

  // 4. Carga desde Spec Declarativa (createFromSpec) usando car.template.json
  const templatePath = path.join(root, "cars/car.template.json");
  const templateJson = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  const templateCar = CarFactory.createFromSpec(templateJson);

  assert(
    templateCar.id === templateJson.id,
    "createFromSpec: ID cargado desde template JSON",
  );
  assert(
    templateCar.name === templateJson.name,
    "createFromSpec: Nombre cargado desde template JSON",
  );
  assert(
    templateCar.physics.m === 1250,
    "createFromSpec: Masa física verificada (1250 kg)",
  );
  assert(
    templateCar.hud.maxKmh === 330,
    "createFromSpec: HUD velocímetro verificado (330 km/h)",
  );

  // 5. Parser GLB Binario (parseGLB)
  // Comprobación de detección de archivo GLB inválido
  let threwInvalidGlb = false;
  try {
    const fakeBuffer = new ArrayBuffer(32);
    CarFactory.parseGLB(fakeBuffer);
  } catch (e) {
    threwInvalidGlb = true;
  }
  assert(
    threwInvalidGlb,
    "parseGLB rechaza búferes sin el número mágico GLB (0x46546C67)",
  );

  // Comprobación de cabecera GLB sintética válida
  const headerBuf = new ArrayBuffer(40);
  const dv = new DataView(headerBuf);
  dv.setUint32(0, 0x46546c67, true); // Magic 'glTF'
  dv.setUint32(4, 2, true); // Version 2
  dv.setUint32(8, 40, true); // Length 40
  dv.setUint32(12, 12, true); // JSON chunk len
  dv.setUint32(16, 0x4e4f534a, true); // Chunk type 'JSON'
  const jsonStr = '{"nodes":[]}';
  for (let i = 0; i < jsonStr.length; i++)
    dv.setUint8(20 + i, jsonStr.charCodeAt(i));
  // Bin chunk header
  dv.setUint32(32, 0, true); // BIN chunk len
  dv.setUint32(36, 0x004e4942, true); // Chunk type 'BIN'

  const parsedGlb = CarFactory.parseGLB(headerBuf);
  assert(
    parsedGlb && parsedGlb.bodyV instanceof Float32Array,
    "parseGLB procesa correctamente estructura GLB válida",
  );

  // 6. Validación de archivos GLB reales generados en cars/models/
  const realGlbPath = path.join(root, "cars/models/audi-r8-lms-evo-2020.glb");
  assert(
    fs.existsSync(realGlbPath),
    "Archivo GLB real existe en disco (audi-r8-lms-evo-2020.glb)",
  );
  const realGlbBuf = fs.readFileSync(realGlbPath);
  const realGlbParsed = CarFactory.parseGLB(
    realGlbBuf.buffer.slice(
      realGlbBuf.byteOffset,
      realGlbBuf.byteOffset + realGlbBuf.byteLength,
    ),
  );
  assert(
    realGlbParsed.bodyV && realGlbParsed.bodyV.length > 0,
    "parseGLB: Vértices de carrocería extraídos con éxito del GLB real",
  );
  assert(
    realGlbParsed.bodyI && realGlbParsed.bodyI.length > 0,
    "parseGLB: Índices de carrocería extraídos con éxito del GLB real",
  );
  assert(
    realGlbParsed.wheelV && realGlbParsed.wheelV.length > 0,
    "parseGLB: Malla de rueda separada correctamente",
  );

  // 7. Validación de especificación JSON pura en cars/*.json
  const realJsonPath = path.join(root, "cars/audi-r8-lms-evo-2020.json");
  assert(
    fs.existsSync(realJsonPath),
    "Archivo JSON puro existe en disco (audi-r8-lms-evo-2020.json)",
  );
  const realJsonSpec = JSON.parse(fs.readFileSync(realJsonPath, "utf8"));
  assert(
    realJsonSpec.id === "audi-r8-lms-evo-2020",
    "JSON puro: id verificado",
  );
  assert(
    realJsonSpec.model === "cars/models/audi-r8-lms-evo-2020.glb",
    "JSON puro: ruta a modelo GLB",
  );
  assert(
    realJsonSpec.texture === "cars/textures/audi-r8-lms-evo-2020.png",
    "JSON puro: ruta a textura atlas",
  );

  // 8. Integración: Carga de coche completo desde spec vinculada a modelo GLB
  const carFromSpec = CarFactory.createFromSpec(realJsonSpec);
  assert(
    carFromSpec.id === "audi-r8-lms-evo-2020",
    "createFromSpec: Coche instanciado correctamente desde JSON",
  );
  assert(carFromSpec.hubs.length === 4, "createFromSpec: 4 bujes verificados");

  console.log(
    `Resultado CarFactory: ${passed} aserciones correctas, ${failed} fallos.`,
  );
  return { passed, failed };
}

if (require.main === module) {
  const res = runCarFactoryTestSuite();
  process.exit(res.failed > 0 ? 1 : 0);
}

module.exports = { runCarFactoryTestSuite };
