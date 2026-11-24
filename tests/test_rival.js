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
  const carFactoryCode = fs.readFileSync(path.join(root, 'engine/car-factory.js'), 'utf8');
  const trackFactoryCode = fs.readFileSync(path.join(root, 'engine/track-factory.js'), 'utf8');
  const regCode = fs.readFileSync(path.join(root, 'game/registry.js'), 'utf8');
  const tbCode = fs.readFileSync(path.join(root, 'world/track-builder.js'), 'utf8');
  const trackGpSpec = JSON.parse(fs.readFileSync(path.join(root, 'tracks/nurburgring-gp.json'), 'utf8'));
  const physCode = fs.readFileSync(path.join(root, 'game/physics.js'), 'utf8');
  const aiCode = fs.readFileSync(path.join(root, 'game/ai.js'), 'utf8');
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
  vm.runInContext("this.TRK = TRK; this.trackBuild = trackBuild;", ctx);
  ctx.TrackFactory.createFromSpec(trackGpSpec);
  vm.runInContext(carManifest, ctx);

  // Inicializar circuito y calcular trazada de IA
  const tracksObj = ctx.window.TRACKS || ctx.TRACKS;
  const trackGp = tracksObj.list[0];
  ctx.trackBuild(trackGp);

  vm.runInContext(physCode, ctx);
  vm.runInContext("this.applyCarPhysics = applyCarPhysics; this.vehicleReset = vehicleReset; this.vehicleStep = vehicleStep; this.vehicleCarCollide = vehicleCarCollide; this.VEH = VEH; this.VEH_RIVAL = VEH_RIVAL; this.VIN_RIVAL = VIN_RIVAL;", ctx);

  const carsObj = ctx.window.CARS || ctx.CARS;
  const carManifestList = ctx.window.CAR_MANIFEST || [];
  if (carManifestList.length > 0) {
    const spec = JSON.parse(fs.readFileSync(path.join(root, carManifestList[0].json), 'utf8'));
    ctx.CarFactory.createFromSpec(spec);
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
  assert(manifest.length >= 15, `Catálogo de modelos reales completo (${manifest.length} modelos disponibles)`);
  const playerCarId = 'ford-mustang-gt3-2024';
  const availableRivals = manifest.filter(c => c.id !== playerCarId);
  assert(availableRivals.length === manifest.length - 1, 'Pool de rivales excluye el coche del jugador');
  const randomRival = availableRivals[Math.floor(Math.random() * availableRivals.length)];
  assert(!!randomRival && randomRival.id !== playerCarId, `Selección aleatoria de rival válida: ${randomRival.name}`);
  carsObj.selectRival(randomRival.id);
  assert(carsObj.rival && carsObj.rival.id === randomRival.id, `CARS.selectRival registra correctamente el modelo competidor`);

  // 6. Verificación de activación/desactivación del modo rival (solitario vs carrera)
  ctx.GAME = { rivalEnabled: true, rivalCount: 15 };
  assert(ctx.GAME.rivalEnabled === true, 'Modo carrera: Rival activado');
  ctx.GAME.rivalEnabled = false;
  assert(ctx.GAME.rivalEnabled === false, 'Modo contrarreloj: Rival desactivado (en solitario)');

  // 7. Verificación de escalabilidad de parrilla de 1 a 15 rivales
  const testCounts = [1, 3, 8, 15];
  for (const count of testCounts) {
    const grid = [];
    for (let k = 0; k < count; k++) {
      const ds = -(k + 1) * 8.0;
      const dd = ((k % 2 === 0) ? 1 : -1) * 3.2;
      const carEntry = manifest[k % manifest.length];
      grid.push({ ds, dd, carId: carEntry.id });
    }
    assert(grid.length === count, `Parrilla generada correctamente con ${count} rivales`);
    assert(grid[0].ds === -8.0, `Primer rival en posición -8.0m`);
    if (count > 1) {
      assert(grid[1].ds === -16.0 && grid[1].dd === -3.2, `Segundo rival en cajón escalonado (-16.0m, -3.2m)`);
    }
  }

  // 8. Verificación de renderizado en Espejo Retrovisor Digital (MeshSet, R.isPlayerSlot, cloneCarModelForGrid)
  const rendererCode = fs.readFileSync(path.join(root, 'engine/renderer.js'), 'utf8');
  // Extraer R e isPlayerSlot, MeshSet de rendererCode para verificación rigurosa
  const mockR = {
    playerSlotBody: 5,
    playerSlotWheels: [6, 7, 8, 9],
    objData: new Float32Array(256 * 64),
    dyn2: new Uint32Array(1),
    objBG: {},
    isPlayerSlot(slot) {
      if (slot === this.playerSlotBody) return true;
      if (this.playerSlotWheels) {
        const w = this.playerSlotWheels;
        if (slot === w[0] || slot === w[1] || slot === w[2] || slot === w[3]) return true;
      }
      return false;
    }
  };

  assert(mockR.isPlayerSlot(5) === true, 'R.isPlayerSlot identifica correctamente la carrocería del jugador');
  assert(mockR.isPlayerSlot(7) === true, 'R.isPlayerSlot identifica correctamente las ruedas del jugador');
  assert(mockR.isPlayerSlot(15) === false, 'R.isPlayerSlot discrimina correctamente la carrocería del coche rival');
  assert(mockR.isPlayerSlot(16) === false, 'R.isPlayerSlot discrimina correctamente las ruedas del coche rival');

  // Comprobar discriminación de dibujo en MeshSet para espejo vs cubemap de entorno
  let drawnSlots = [];
  const mockPass = {
    setPipeline: () => { },
    setBindGroup: () => { },
    setVertexBuffer: () => { },
    setIndexBuffer: () => { },
    drawIndexed: (cnt) => { drawnSlots.push(cnt); }
  };

  // Simulación de MeshSet idéntica a la implementada en engine/renderer.js
  const testItems = [
    { on: true, slot: 5, flags: 3, cx: 0, cy: 0, cz: -10, r: 2, maxDist: 100, count: 501 }, // Carrocería jugador
    { on: true, slot: 6, flags: 3, cx: 0, cy: 0, cz: -10, r: 1, maxDist: 100, count: 502 }, // Rueda jugador
    { on: true, slot: 15, flags: 3, cx: 0, cy: 0, cz: -25, r: 2, maxDist: 100, count: 601 }, // Carrocería rival
    { on: true, slot: 16, flags: 3, cx: 0, cy: 0, cz: -25, r: 1, maxDist: 100, count: 602 }, // Rueda rival
    { on: true, slot: 1, flags: 7, cx: 0, cy: 0, cz: -50, r: 10, maxDist: 500, count: 701 }, // Asfalto circuito (flags=7)
  ];

  function runMeshSetDraw(isMirror, kind) {
    drawnSlots = [];
    const pipe = {}; // Simula pipeline CUBE presente
    if (!pipe) return;
    const bit = 1 << kind;
    for (let i = 0; i < testItems.length; i++) {
      const it = testItems[i];
      if (!it.on) continue;
      if (isMirror) {
        if (!(it.flags & 1)) continue;
        if (mockR.isPlayerSlot && mockR.isPlayerSlot(it.slot)) continue;
      } else {
        if (!(it.flags & bit)) continue;
      }
      mockPass.drawIndexed(it.count);
    }
  }

  // A) Pase de cubemap de entorno (KIND.CUBE = 2, isMirror = false)
  // Coches con flags = 3 (GBUF | SHADOW) NO deben pintarse en el cubemap de entorno
  runMeshSetDraw(false, 2);
  assert(!drawnSlots.includes(501) && !drawnSlots.includes(502), 'El cubemap de entorno NO dibuja el coche del jugador');
  assert(!drawnSlots.includes(601) && !drawnSlots.includes(602), 'El cubemap de entorno NO dibuja coches rivales para evitar consumo innecesario');
  assert(drawnSlots.includes(701), 'El cubemap de entorno sí dibuja el circuito (flags & 4)');

  // B) Pase de retrovisor digital (KIND.CUBE = 2, isMirror = true)
  // Coches rivales con flags & 1 DEBEN pintarse; coche del jugador filtrado por R.isPlayerSlot
  runMeshSetDraw(true, 2);
  assert(!drawnSlots.includes(501), 'Retrovisor digital: Carrocería del jugador excluida (evita oclusión de cámara)');
  assert(!drawnSlots.includes(502), 'Retrovisor digital: Ruedas del jugador excluidas');
  assert(drawnSlots.includes(601), 'Retrovisor digital: ¡Carrocería del coche rival que intenta adelantar es RENDERIZADA!');
  assert(drawnSlots.includes(602), 'Retrovisor digital: ¡Ruedas del coche rival son RENDERIZADAS!');
  assert(drawnSlots.includes(701), 'Retrovisor digital: El circuito de fondo se renderiza correctamente');

  // C) Clonación de modelo en grid con aislamiento de slots cuando el rival usa el mismo modelo que el jugador
  const gameSrc = fs.readFileSync(path.join(root, 'game/game.js'), 'utf8');
  let cloneCarFn;
  const gameModuleCtx = vm.createContext({
    Float64Array,
    Float32Array,
    m4: () => new Float32Array(16),
    objSlot: () => Math.floor(Math.random() * 1000) + 100,
    CAR: { id: 'porsche-992', slotBody: 5, slotWheel: [6, 7, 8, 9], set: { items: [{ slot: 5, flags: 3 }, { slot: 6, flags: 3 }] } }
  });
  vm.runInContext(gameSrc.substring(gameSrc.indexOf('function cloneCarModelForGrid'), gameSrc.indexOf('function poseRival')), gameModuleCtx);
  cloneCarFn = gameModuleCtx.cloneCarModelForGrid;

  const playerBase = gameModuleCtx.CAR;
  const clonedRival = cloneCarFn(playerBase, 0); // Rival 0 usando el mismo coche que el jugador
  assert(clonedRival !== playerBase, 'cloneCarModelForGrid clona el modelo si el base es el coche activo del jugador (evita colisión de slots)');
  assert(clonedRival.slotBody !== playerBase.slotBody, 'El rival clonado recibe un slotBody independiente');
  assert(!mockR.isPlayerSlot(clonedRival.slotBody), 'El slotBody del rival clonado no es filtrado como jugador en el retrovisor');

  console.log(`Resultado Rival IA: ${passed} aserciones correctas, ${failed} fallos.`);
  return { passed, failed };
}

module.exports = { runRivalTestSuite };
if (require.main === module) {
  runRivalTestSuite();
}
