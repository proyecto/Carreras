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
  const regCode = fs.readFileSync(path.join(root, 'game/registry.js'), 'utf8');
  const manifest = fs.readFileSync(path.join(root, 'cars/manifest.js'), 'utf8');

  const ctx = {
    window: {},
    document: { createElement: () => ({ getContext: () => ({}) }) },
    Float32Array,
    Uint32Array,
    Int32Array,
    Float64Array,
    Uint8Array,
    Math,
    WGSL: {},
    mkTex: () => ({}),
    TU: { RT: 1, TB: 2, CD: 4 },
    G: { dev: { queue: { writeTexture: () => {} } } },
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary')
  };
  vm.createContext(ctx);
  vm.runInContext(mathCode, ctx);
  vm.runInContext(regCode, ctx);
  vm.runInContext(manifest, ctx);

  const carList = ctx.window.CAR_LIST || [];
  const carManifest = ctx.window.CAR_MANIFEST || [];
  assert(carList.length === 11, `Se esperan 11 coches en CAR_LIST, se encontraron ${carList.length}`);
  assert(carManifest.length === 11, `Se esperan 11 coches en CAR_MANIFEST para carga bajo demanda, se encontraron ${carManifest.length}`);
  for (const m of carManifest) {
    assert(typeof m.id === 'string' && m.id.length > 0, `[manifest] ID válido: ${m.id}`);
    assert(typeof m.file === 'string' && m.file.endsWith('.js'), `[manifest] Archivo JS válido: ${m.file}`);
    assert(typeof m.name === 'string' && m.name.length > 0, `[manifest] Nombre definido: ${m.name}`);
  }

  for (const carFile of carList) {
    const filePath = path.join(root, 'cars', carFile);
    assert(fs.existsSync(filePath), `El archivo ${carFile} existe en disco`);

    const carCode = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(carCode, ctx);

    // Obtener el coche registrado
    const carsObj = ctx.window.CARS || ctx.CARS;
    const allCars = carsObj && Array.isArray(carsObj.list) ? carsObj.list : [];
    const car = allCars.find(c => carCode.includes(`id: '${c.id}'`) || carCode.includes(`id: "${c.id}"`));

    assert(!!car, `El coche ${carFile} se registró correctamente en CARS`);
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
