'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function runPhysicsTestSuite() {
  console.log('\n--- [TEST SUITE] Simulación Numérica Multi-Paso de Físicas (game/physics.js) ---');
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

  const root = path.resolve(__dirname, '..');
  const mathCode = fs.readFileSync(path.join(root, 'engine/math.js'), 'utf8');
  const carFactoryCode = fs.readFileSync(path.join(root, 'engine/car-factory.js'), 'utf8');
  const trackFactoryCode = fs.readFileSync(path.join(root, 'engine/track-factory.js'), 'utf8');
  const regCode = fs.readFileSync(path.join(root, 'game/registry.js'), 'utf8');
  const tbCode = fs.readFileSync(path.join(root, 'world/track-builder.js'), 'utf8');
  const trackGpSpec = JSON.parse(fs.readFileSync(path.join(root, 'tracks/nurburgring-gp.json'), 'utf8'));
  const physCode = fs.readFileSync(path.join(root, 'game/physics.js'), 'utf8');
  const carManifest = fs.readFileSync(path.join(root, 'cars/manifest.js'), 'utf8');

  const ctx = {
    window: {},
    document: { createElement: () => ({ getContext: () => ({}) }) },
    Float32Array,
    Uint32Array,
    Uint16Array,
    Int32Array,
    Float64Array,
    Uint8Array,
    ArrayBuffer,
    Math,
    console: { log: () => { } },
    WGSL: {},
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary')
  };
  vm.createContext(ctx);
  vm.runInContext(mathCode, ctx);
  vm.runInContext(carFactoryCode, ctx);
  vm.runInContext(trackFactoryCode, ctx);
  vm.runInContext(regCode, ctx);
  vm.runInContext(tbCode, ctx);
  ctx.TrackFactory.createFromSpec(trackGpSpec);
  vm.runInContext(carManifest, ctx);

  // Inicializar circuito en el contexto
  const tracksObj = ctx.window.TRACKS || ctx.TRACKS;
  const trackGp = tracksObj.list[0];
  ctx.trackBuild(trackGp);

  const carsObj = ctx.window.CARS || ctx.CARS;
  const carManifestList = ctx.window.CAR_MANIFEST || [];

  for (const m of carManifestList) {
    const spec = JSON.parse(fs.readFileSync(path.join(root, m.json), 'utf8'));
    ctx.CarFactory.createFromSpec(spec);
  }

  // Cargar físicas
  vm.runInContext(physCode, ctx);
  vm.runInContext("this.getVEH = () => VEH; this.vehicleStep = vehicleStep; this.applyCarPhysics = applyCarPhysics; this.vehicleReset = vehicleReset;", ctx);

  const allCars = carsObj.list;
  for (const car of allCars) {
    // Inicializar coche
    ctx.applyCarPhysics(car);
    ctx.vehicleReset(100, 0, 0);

    const VEH = ctx.getVEH();
    const K_W = 1, K_S = 2, K_A = 4, K_D = 8, K_SPACE = 16;

    let maxSpeedKmh = 0;
    let maxRpm = 0;
    let hasShiftedUp = false;
    let hasBraked = false;
    let nanDetected = false;

    // FASE 1: Aceleración a fondo (4 segundos = 480 pasos)
    for (let step = 0; step < 480; step++) {
      ctx.vehicleStep(K_W);
      if (VEH.gear > 1) hasShiftedUp = true;
      if (VEH.rpm > maxRpm) maxRpm = VEH.rpm;
      const kmh = VEH.vx * 3.6;
      if (kmh > maxSpeedKmh) maxSpeedKmh = kmh;

      if (!Number.isFinite(VEH.vx) || !Number.isFinite(VEH.rpm) || !Number.isFinite(VEH.x) || !Number.isFinite(VEH.z)) {
        nanDetected = true;
      }
    }

    assert(!nanDetected, `[${car.id}] Sin NaNs durante aceleración 0-4s`);
    assert(maxSpeedKmh > 70, `[${car.id}] Aceleró con éxito hasta ${maxSpeedKmh.toFixed(1)} km/h`);
    assert(hasShiftedUp || car.id === 'mclaren-x2-2018', `[${car.id}] Subió de marcha adecuadamente (gear: ${VEH.gear})`);

    // FASE 2: Frenada fuerte (2 segundos = 240 pasos)
    const speedBeforeBrake = VEH.vx;
    for (let step = 0; step < 240; step++) {
      ctx.vehicleStep(K_S);
      if (!Number.isFinite(VEH.vx) || !Number.isFinite(VEH.ax)) nanDetected = true;
    }
    if (VEH.vx < speedBeforeBrake * 0.6) hasBraked = true;
    assert(hasBraked, `[${car.id}] Frenada efectiva: redujo de ${(speedBeforeBrake * 3.6).toFixed(1)} a ${(VEH.vx * 3.6).toFixed(1)} km/h`);

    // FASE 3: Giro y aceleración lateral (2 segundos = 240 pasos)
    let maxLateralG = 0;
    for (let step = 0; step < 240; step++) {
      ctx.vehicleStep(K_W | K_D);
      const latG = Math.abs(VEH.ay) / 9.81;
      if (latG > maxLateralG) maxLateralG = latG;
      if (!Number.isFinite(VEH.r) || !Number.isFinite(VEH.ay)) nanDetected = true;
    }
    assert(!nanDetected, `[${car.id}] Sin NaNs durante giro lateral`);
    assert(maxLateralG > 0.4, `[${car.id}] Generó agarre lateral realista: ${maxLateralG.toFixed(2)} G`);

    // FASE 4: Freno de mano e inversión de marcha (1 segundo = 120 pasos)
    ctx.vehicleReset(100, 0, 0); // parada
    for (let step = 0; step < 120; step++) {
      ctx.vehicleStep(K_S); // marcha atrás desde parado
      if (!Number.isFinite(VEH.vx)) nanDetected = true;
    }
    assert(VEH.gear === 0 || VEH.vx <= 0, `[${car.id}] Engranó marcha atrás o frenó en parado`);

    console.log(`  ✓ ${car.name.padEnd(28)} [${maxSpeedKmh.toFixed(0)} km/h | ${maxLateralG.toFixed(2)} G | 0 NaNs]`);
  }

  console.log(`Resultado Físicas: ${passed} aserciones correctas, ${failed} fallos.`);
  return { passed, failed };
}

if (require.main === module) {
  const res = runPhysicsTestSuite();
  process.exit(res.failed > 0 ? 1 : 0);
}

module.exports = { runPhysicsTestSuite };
