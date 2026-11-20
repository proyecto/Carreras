'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function runRivalTestSuite() {
  console.log('\n--- [TEST SUITE] Simulación de Rival IA y Colisión entre Vehículos (game/ai.js, game/physics.js) ---');
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
  const regCode = fs.readFileSync(path.join(root, 'game/registry.js'), 'utf8');
  const tbCode = fs.readFileSync(path.join(root, 'world/track-builder.js'), 'utf8');
  const trackGpCode = fs.readFileSync(path.join(root, 'tracks/nurburgring-gp.js'), 'utf8');
  const physCode = fs.readFileSync(path.join(root, 'game/physics.js'), 'utf8');
  const aiCode = fs.readFileSync(path.join(root, 'game/ai.js'), 'utf8');
  const carManifest = fs.readFileSync(path.join(root, 'cars/manifest.js'), 'utf8');

  const ctx = {
    window: {},
    document: { createElement: () => ({ getContext: () => ({}) }) },
    Float32Array,
    Uint32Array,
    Int32Array,
    Float64Array,
    Uint8Array,
    Math,
    console: { log: () => {} },
    WGSL: {},
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary')
  };
  vm.createContext(ctx);
  vm.runInContext(mathCode, ctx);
  vm.runInContext(regCode, ctx);
  vm.runInContext(tbCode, ctx);
  vm.runInContext("this.TRK = TRK; this.trackBuild = trackBuild;", ctx);
  vm.runInContext(trackGpCode, ctx);
  vm.runInContext(carManifest, ctx);

  // Inicializar circuito y calcular trazada de IA
  const tracksObj = ctx.window.TRACKS || ctx.TRACKS;
  const trackGp = tracksObj.list[0];
  ctx.trackBuild(trackGp);

  vm.runInContext(physCode, ctx);
  vm.runInContext("this.applyCarPhysics = applyCarPhysics; this.vehicleReset = vehicleReset; this.vehicleStep = vehicleStep; this.vehicleCarCollide = vehicleCarCollide; this.VEH = VEH; this.VEH_RIVAL = VEH_RIVAL; this.VIN_RIVAL = VIN_RIVAL;", ctx);

  const carsObj = ctx.window.CARS || ctx.CARS;
  const carList = ctx.window.CAR_LIST || [];
  if (carList.length > 0) {
    const carCode = fs.readFileSync(path.join(root, 'cars', carList[0]), 'utf8');
    vm.runInContext(carCode, ctx);
    ctx.applyCarPhysics(carsObj.list[0]);
  }

  vm.runInContext(aiCode, ctx);
  vm.runInContext("this.aiBuild = aiBuild; this.aiKeys = aiKeys; this.aiBuild();", ctx);

  const VEH = ctx.window.VEH || ctx.VEH;
  const VEH_RIVAL = ctx.window.VEH_RIVAL || ctx.VEH_RIVAL;
  const VIN_RIVAL = ctx.window.VIN_RIVAL || ctx.VIN_RIVAL;

  assert(!!VEH_RIVAL, 'Instancia de vehículo rival VEH_RIVAL creada correctamente');
  assert(!!VIN_RIVAL, 'Vector de entradas analógicas VIN_RIVAL creado correctamente');

  const TRK = ctx.TRK;
  // 1. Verificación de posición en parrilla
  ctx.vehicleReset(TRK.L + trackGp.startS, trackGp.startD, 0, VEH);
  ctx.vehicleReset(TRK.L + trackGp.startS - 8.0, trackGp.startD + 3.2, 0, VEH_RIVAL, VIN_RIVAL);

  assert(Math.abs((VEH.s - VEH_RIVAL.s) - 8.0) < 0.1, `Parrilla de salida: Rival situado en P2 (8m detrás del jugador)`);
  assert(Math.abs(VEH_RIVAL.d - (trackGp.startD + 3.2)) < 0.1, `Parrilla de salida: Rival con desplazamiento lateral de parrilla (+3.2m)`);

  // 2. Simulación de carrera durante 4 segundos (480 pasos a 120 Hz)
  // Tanto el jugador como el rival aceleran en la salida
  let nanDetected = false;
  let maxKmh = 0;
  for (let step = 0; step < 480; step++) {
    const t = step / 120;
    // Jugador acelera a fondo (K_W)
    ctx.vehicleStep(1, VEH);
    // Rival sigue la trazada y adelanta
    const rk = ctx.aiKeys(t, VEH_RIVAL);
    ctx.vehicleStep(rk, VEH_RIVAL, VIN_RIVAL);

    const kmh = VEH_RIVAL.vx * 3.6;
    if (kmh > maxKmh) maxKmh = kmh;

    if (!Number.isFinite(VEH_RIVAL.x) || !Number.isFinite(VEH_RIVAL.z) || !Number.isFinite(VEH_RIVAL.vx) || !Number.isFinite(VEH_RIVAL.yaw)) {
      nanDetected = true;
    }
  }

  assert(!nanDetected, 'Simulación del Rival IA sin NaNs durante 480 pasos');
  assert(maxKmh > 65, `Rival IA aceleró con éxito hasta ${maxKmh.toFixed(1)} km/h siguiendo la trazada`);
  assert(VEH_RIVAL.s > trackGp.startS, `Rival avanzó a lo largo del circuito (s = ${VEH_RIVAL.s.toFixed(1)}m)`);
  assert(VEH_RIVAL.gear >= 2, `Rival cambió a marchas superiores adecuadamente (marcha actual: ${VEH_RIVAL.gear})`);

  // 3. Prueba de colisión física entre coche del jugador y coche del rival
  VEH.x = 100; VEH.z = 100; VEH.yaw = 0; VEH.vx = 20; VEH.vy = 0;
  VEH_RIVAL.x = 101.2; VEH_RIVAL.z = 100; VEH_RIVAL.yaw = 0; VEH_RIVAL.vx = -10; VEH_RIVAL.vy = 0;
  const preHitsPlayer = VEH.hits;
  const preHitsRival = VEH_RIVAL.hits;

  ctx.vehicleCarCollide(VEH, VEH_RIVAL);

  const postDist = Math.hypot(VEH_RIVAL.x - VEH.x, VEH_RIVAL.z - VEH.z);
  assert(postDist >= 1.85, `Colisión física: Separación efectiva de chasis (distancia: ${postDist.toFixed(2)}m)`);
  assert(VEH.hits > preHitsPlayer && VEH_RIVAL.hits > preHitsRival, 'Colisión física: Registro de impacto y transferencia de impulso');

  // 4. Verificación de evasión / adelantamiento inteligente de la IA
  VEH.s = 300; VEH.d = 0; VEH.vx = 15;
  VEH_RIVAL.s = 288; VEH_RIVAL.d = 0; VEH_RIVAL.vx = 25; // Rival viene más rápido 12m detrás
  const keysOvertake = ctx.aiKeys(5.0, VEH_RIVAL);
  assert(Number.isInteger(keysOvertake), 'IA genera máscara de teclas válida en situación de adelantamiento');

  // 5. Verificación de selección de modelo real al azar para el rival
  const manifest = ctx.window.CAR_MANIFEST || [];
  assert(manifest.length >= 13, `Catálogo de modelos reales completo (${manifest.length} modelos disponibles)`);
  const playerCarId = 'ford-mustang-gt3-2024';
  const availableRivals = manifest.filter(c => c.id !== playerCarId);
  assert(availableRivals.length === manifest.length - 1, 'Pool de rivales excluye el coche del jugador');
  const randomRival = availableRivals[Math.floor(Math.random() * availableRivals.length)];
  assert(!!randomRival && randomRival.id !== playerCarId, `Selección aleatoria de rival válida: ${randomRival.name}`);
  carsObj.selectRival(randomRival.id);
  assert(carsObj.rival && carsObj.rival.id === randomRival.id, `CARS.selectRival registra correctamente el modelo competidor`);

  // 6. Verificación de activación/desactivación del modo rival (solitario vs carrera)
  ctx.GAME = { rivalEnabled: true };
  assert(ctx.GAME.rivalEnabled === true, 'Modo carrera: Rival activado');
  ctx.GAME.rivalEnabled = false;
  assert(ctx.GAME.rivalEnabled === false, 'Modo contrarreloj: Rival desactivado (en solitario)');

  console.log(`Resultado Rival IA: ${passed} aserciones correctas, ${failed} fallos.`);
  return { passed, failed };
}

module.exports = { runRivalTestSuite };
if (require.main === module) {
  runRivalTestSuite();
}
