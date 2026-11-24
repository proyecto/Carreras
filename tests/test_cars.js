'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function runCarsTestSuite() {
  console.log('\n--- [TEST SUITE] Validación de Vehículos (cars/) ---');
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

  // Entorno de ejecución simulado
  const root = path.resolve(__dirname, '..');
  const mathCode = fs.readFileSync(path.join(root, 'engine/math.js'), 'utf8');
  const carFactoryCode = fs.readFileSync(path.join(root, 'engine/car-factory.js'), 'utf8');
  const regCode = fs.readFileSync(path.join(root, 'game/registry.js'), 'utf8');
  const carManifestData = JSON.parse(fs.readFileSync(path.join(root, 'cars/manifest.json'), 'utf8'));

  const ctx = {
    window: {
      CAR_MANIFEST: carManifestData,
      CAR_LIST: carManifestData.map(c => c.json)
    },
    document: { createElement: () => ({ getContext: () => ({}) }) },
    Float32Array,
    Uint32Array,
    Uint16Array,
    Int32Array,
    Float64Array,
    Uint8Array,
    ArrayBuffer,
    Math,
    WGSL: {},
    mkTex: () => ({}),
    TU: { RT: 1, TB: 2, CD: 4 },
    G: { dev: { queue: { writeTexture: () => { } } } },
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary')
  };
  vm.createContext(ctx);
  vm.runInContext(mathCode, ctx);
  vm.runInContext(carFactoryCode, ctx);
  vm.runInContext(regCode, ctx);
  for (const item of carManifestData) {
    if (ctx.window.CARS) ctx.window.CARS.register(item);
  }

  const carManifest = ctx.window.CAR_MANIFEST || [];
  assert(carManifest.length === 25, `Se esperan 25 coches en CAR_MANIFEST para carga bajo demanda, se encontraron ${carManifest.length}`);
  for (const m of carManifest) {
    assert(typeof m.id === 'string' && m.id.length > 0, `[manifest] ID válido: ${m.id}`);
    assert(typeof m.name === 'string' && m.name.length > 0, `[manifest] Nombre definido: ${m.name}`);
    assert(typeof m.json === 'string' && m.json.endsWith('.json'), `[manifest] Ruta JSON definida: ${m.json}`);
    assert(typeof m.model === 'string' && m.model.endsWith('.glb'), `[manifest] Ruta GLB definida: ${m.model}`);
    assert(typeof m.texture === 'string' && (m.texture.endsWith('.png') || m.texture.endsWith('.jpg')), `[manifest] Ruta textura definida: ${m.texture}`);

    // Confirmar que el archivo .js legacy de este coche fue eliminado
    const legacyJsPath = path.join(root, 'cars', `${m.id}.js`);
    assert(!fs.existsSync(legacyJsPath), `[limpieza] Archivo JS legacy eliminado con éxito: ${m.id}.js`);

    const jsonDiskPath = path.join(root, m.json);
    assert(fs.existsSync(jsonDiskPath), `[assets] Archivo JSON existe en disco: ${m.json}`);
    if (fs.existsSync(jsonDiskPath)) {
      const spec = JSON.parse(fs.readFileSync(jsonDiskPath, 'utf8'));
      assert(spec.id === m.id, `[assets] JSON spec.id coincide con manifest: ${m.id}`);
      assert(typeof spec.physics === 'object' && spec.physics !== null, `[${m.id}] Especificación física en JSON presente`);
      assert(Array.isArray(spec.hubs) && spec.hubs.length === 4, `[${m.id}] 4 bujes de rueda en JSON`);

      // Registrar coche en CARS mediante CarFactory.createFromSpec
      ctx.CarFactory.createFromSpec(spec);
    }

    const glbDiskPath = path.join(root, m.model);
    assert(fs.existsSync(glbDiskPath), `[assets] Modelo 3D GLB existe en disco: ${m.model}`);
    if (fs.existsSync(glbDiskPath)) {
      const glbStat = fs.statSync(glbDiskPath);
      assert(glbStat.size > 100000, `[assets] Modelo GLB tiene tamaño real (>100KB): ${(glbStat.size / 1024 / 1024).toFixed(2)} MB`);
      const fd = fs.openSync(glbDiskPath, 'r');
      const headerBuf = Buffer.alloc(12);
      fs.readSync(fd, headerBuf, 0, 12, 0);
      fs.closeSync(fd);
      assert(headerBuf.readUInt32LE(0) === 0x46546C67, `[assets] Cabecera binaria glTF 2.0 válida: ${m.model}`);
    }

    const texDiskPath = path.join(root, m.texture);
    assert(fs.existsSync(texDiskPath), `[assets] Textura existe en disco: ${m.texture}`);
    if (fs.existsSync(texDiskPath)) {
      const texStat = fs.statSync(texDiskPath);
      assert(texStat.size > 10000, `[assets] Textura tiene tamaño real (>10KB): ${(texStat.size / 1024).toFixed(0)} KB`);
    }

    // Obtener el coche registrado en CARS
    const carsObj = ctx.window.CARS || ctx.CARS;
    const allCars = carsObj && Array.isArray(carsObj.list) ? carsObj.list : [];
    const car = allCars.find(c => c.id === m.id);

    assert(!!car, `El coche ${m.id} se registró correctamente en CARS`);
    if (!car) continue;

    // 1. Identificación y metadatos
    assert(typeof car.id === 'string' && car.id.length > 0, `[${car.id}] ID de vehículo válido`);
    assert(typeof car.name === 'string' && car.name.length > 0, `[${car.id}] Nombre visible presente: "${car.name}"`);
    assert(typeof car.subtitle === 'string', `[${car.id}] Subtítulo presente`);
    assert(typeof car.specs === 'string', `[${car.id}] Ficha técnica presente`);

    // 2. Parámetros físicos
    const p = car.physics;
    assert(!!p, `[${car.id}] Objeto de físicas presente`);
    if (p) {
      assert(p.m >= 700 && p.m <= 2200, `[${car.id}] Masa coherente: ${p.m} kg`);
      assert(p.Izz > 0, `[${car.id}] Momento de inercia Izz > 0: ${p.Izz}`);
      assert(p.L >= 1.8 && p.L <= 3.4, `[${car.id}] Batalla (wheelbase) realista: ${p.L} m`);
      assert(p.mu >= 0.8 && p.mu <= 2.2, `[${car.id}] Coeficiente de agarre mu válido: ${p.mu}`);
      assert(p.R >= 0.25 && p.R <= 0.45, `[${car.id}] Radio de neumático coherente: ${p.R} m`);
      assert(p.driveF >= 0.0 && p.driveF <= 1.0, `[${car.id}] Reparto de tracción driveF en [0, 1]: ${p.driveF}`);
    }

    // 3. Geometría de bujes (hubs)
    assert(Array.isArray(car.hubs) && car.hubs.length === 4, `[${car.id}] Exactamente 4 bujes definidos`);
    if (car.hubs && car.hubs.length === 4) {
      const [fl, fr, rl, rr] = car.hubs;
      assert(fl[0] > 0 && fr[0] > 0, `[${car.id}] Ruedas delanteras avanzadas (X > 0)`);
      assert(rl[0] < 0 && rr[0] < 0, `[${car.id}] Ruedas traseras retrasadas (X < 0)`);
      assert(fl[2] < 0 && rl[2] < 0, `[${car.id}] Ruedas izquierdas a la izquierda (Z < 0)`);
      assert(fr[2] > 0 && rr[2] > 0, `[${car.id}] Ruedas derechas a la derecha (Z > 0)`);
    }

    // 4. Parámetros de HUD
    const h = car.hud;
    assert(!!h, `[${car.id}] Objeto HUD configurado`);
    if (h) {
      assert(h.maxKmh >= 140 && h.maxKmh <= 450, `[${car.id}] Velocímetro calibrado: ${h.maxKmh} km/h`);
      assert(h.maxRpm >= 5.0 && h.maxRpm <= 12.0, `[${car.id}] Tacómetro calibrado: ${h.maxRpm}k rpm`);
      assert(h.redlineRpm > 0 && h.redlineRpm <= h.maxRpm, `[${car.id}] Línea roja coherente: ${h.redlineRpm}k`);
    }

    console.log(`  ✓ ${car.name.padEnd(28)} [${car.id}]`);
  }

  console.log(`Resultado Vehículos: ${passed} aserciones correctas, ${failed} fallos.`);
  return { passed, failed };
}

if (require.main === module) {
  const res = runCarsTestSuite();
  process.exit(res.failed > 0 ? 1 : 0);
}

module.exports = { runCarsTestSuite };
