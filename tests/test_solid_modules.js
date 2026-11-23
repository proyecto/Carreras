'use strict';
/**
 * ============================================================================
 * TEST SUITE: MÓDULOS SOLID Y PATRONES GOF (tests/test_solid_modules.js)
 * ============================================================================
 * Verifica de forma rigurosa los nuevos módulos desacoplados:
 * 1. RaceDirector (game/race-director.js) - State & Observer
 * 2. CameraSystem (game/camera-system.js) - Strategy
 * 3. GridManager (game/grid-manager.js) - Composite & Manager
 * 4. HudComponents (game/hud-components.js) - Component / Composite
 */

const assert = require('assert');
const { RaceDirector, RaceState } = require('../game/race-director.js');
const { CameraSystem, ChaseCameraStrategy, BonnetCameraStrategy, TvCameraStrategy } = require('../game/camera-system.js');
const { GridManager } = require('../game/grid-manager.js');
const { HudComponents } = require('../game/hud-components.js');

let totalAsserts = 0;
function testAssert(condition, message) {
  assert(condition, message);
  totalAsserts++;
}

console.log('--- [TEST SUITE] Validación Módulos SOLID (RaceDirector, CameraSystem, GridManager, HudComponents) ---');

// 1. RaceDirector (State & Observer Pattern)
{
  const director = new RaceDirector();
  testAssert(director.state === RaceState.IDLE, 'RaceDirector inicia en estado IDLE');
  testAssert(director.active === false, 'RaceDirector inicia inactivo');

  director.triggerStart();
  testAssert(director.state === RaceState.COUNTDOWN, 'triggerStart transiciona a COUNTDOWN');
  testAssert(director.active === true, 'triggerStart activa el semáforo');
  testAssert(director.lightsCount === 0, 'Luces rojas inician en 0');

  const mockVehicles = [{ vx: 10, vy: 2, vz: 5 }, { vx: 8, vy: 0, vz: 3 }];
  director.step(1.05, mockVehicles);
  testAssert(director.lightsCount === 1, 'Tras 1.05s se enciende el 1er foco rojo');
  testAssert(mockVehicles[0].vx === 0 && mockVehicles[0].vz === 0, 'Launch control bloquea la velocidad en parrilla');

  director.step(4.0, mockVehicles);
  testAssert(director.lightsCount === 5, 'Tras 5.05s se encienden los 5 focos rojos');

  // Forzar apagado de luces (lights out)
  director.t = director.goTime + 0.01;
  director.step(0.01, mockVehicles);
  testAssert(director.state === RaceState.LIGHTS_OUT, 'Al cumplirse goTime, se apagan las luces (LIGHTS_OUT)');

  // Fin de secuencia de salida
  director.t = director.doneTime + 0.05;
  director.step(0.01, mockVehicles);
  testAssert(director.state === RaceState.RACING, 'Tras doneTime el estado pasa a RACING');
  testAssert(director.active === false, 'El semáforo se desactiva');
}

// 2. CameraSystem (Strategy Pattern)
{
  const camSys = new CameraSystem();
  testAssert(camSys.strategies[0] instanceof ChaseCameraStrategy, 'Estrategia Chase registrada (id 0)');
  testAssert(camSys.strategies[1] instanceof BonnetCameraStrategy, 'Estrategia Bonnet registrada (id 1)');
  testAssert(camSys.strategies[2] instanceof TvCameraStrategy, 'Estrategia TV registrada (id 2)');

  const mockGS = {
    cam: 0, yaw: 0, speed: 25, cx: 0, cy: 1, cz: 0,
    chaseInit: false, chaseYaw: 0, chaseY: 1,
    body: new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]), keys: 0, cut: false
  };
  const mockVeh = { vx: 25, vy: 0, ay: 0, gPitch: 0, gRoll: 0, roll: 0, s: 100 };
  const camQ = new Float32Array(8);

  // Cámara Chase
  camSys.updateCamera(mockGS, mockVeh, 1 / 60, camQ, 1);
  testAssert(mockGS.chaseInit === true, 'Cámara Chase inicializa chaseInit');
  testAssert(camQ[0] !== 0 || camQ[1] !== 0 || camQ[2] !== 0, 'Cámara Chase calcula posición de ojo');

  // Cámara Bonnet
  mockGS.cam = 1;
  camSys.updateCamera(mockGS, mockVeh, 1 / 60, camQ, 1);
  testAssert(camQ[6] === 1.0, 'Cámara Bonnet fija FOV nominal 1.0');

  // Cámara Reversa
  camSys.updateCamera(mockGS, mockVeh, 1 / 60, camQ, -1);
  testAssert(camQ[0] < 0, 'Cámara Bonnet con reversa desplaza ojo al portón trasero');
}

// 3. GridManager (Composite & Manager Pattern)
{
  const grid = new GridManager();
  const mockRivals = [
    { veh: { lapS: 10, time: 2, steps: 5, spin: new Float64Array(4), susp: new Float64Array(4), vx: 0, vy: 0, vz: 0 }, vin: new Float64Array(3), ds: -8, dd: 3 },
    { veh: { lapS: 5, time: 1, steps: 3, spin: new Float64Array(4), susp: new Float64Array(4), vx: 0, vy: 0, vz: 0 }, vin: new Float64Array(3), ds: -16, dd: -0.2 }
  ];
  grid.init(mockRivals);
  testAssert(grid.rivals.length === 2, 'GridManager almacena la lista de rivales');

  grid.stepAi(2.0, false);
  testAssert(grid.rivals[0].keys !== undefined, 'GridManager calcula entradas de IA para cada rival');

  let collisionChecked = false;
  global.vehicleCarCollide = (v1, v2) => { collisionChecked = true; };
  grid.stepPhysics({ vx: 10 }, false);
  testAssert(collisionChecked === true, 'GridManager ejecuta comprobación de colisiones entre coches');
}

// 4. HudComponents (Component Pattern)
{
  testAssert(typeof HudComponents.formatLapTime === 'function', 'formatLapTime helper existe');
  testAssert(HudComponents.formatLapTime(-1) === '-:--.--', 'formatLapTime maneja tiempo ausente (-:--.--)');
  testAssert(HudComponents.formatLapTime(173.02) === '2:53.02', 'formatLapTime formatea 2:53.02 correctamente');
  testAssert(HudComponents.formatLapTime(0) === '0:00.00', 'formatLapTime formatea 0:00.00 correctamente');

  testAssert(typeof HudComponents.CornerAdvisory.draw === 'function', 'CornerAdvisory.draw existe');
  testAssert(typeof HudComponents.LapTelemetry.draw === 'function', 'LapTelemetry.draw existe');
  testAssert(typeof HudComponents.TimingTower.draw === 'function', 'TimingTower.draw existe');
  testAssert(typeof HudComponents.Minimap.draw === 'function', 'Minimap.draw existe');
  testAssert(typeof HudComponents.StartLights.draw === 'function', 'StartLights.draw existe');

  // Mock canvas 2D context
  const mockCtx = {
    font: '', fillStyle: '', strokeStyle: '', textAlign: '', textBaseline: '', lineWidth: 1,
    clearRect: () => {}, beginPath: () => {}, roundRect: () => {}, arc: () => {}, fill: () => {}, stroke: () => {},
    fillText: () => {}, createRadialGradient: () => ({ addColorStop: () => {} })
  };

  const mockTrk = {
    N: 100, ds: 5, L: 500,
    k: new Float64Array(100),
    corners: [{ name: 'Yokohama-S (T1)', s: 50, k: 0.02, R: 50 }]
  };

  let drawThrew = false;
  try {
    HudComponents.CornerAdvisory.draw(mockCtx, 100, 500, 250, mockTrk, 25);
    HudComponents.LapTelemetry.draw(mockCtx, 100, 500, 250, 46, { curTime: 45.2, lastTime: 92.1, bestTime: 91.5, lapCount: 2 });
    HudComponents.TimingTower.draw(mockCtx, 100, 500, 250, 98, mockTrk, 120, [], 'GT3');
    HudComponents.Minimap.draw(mockCtx, 100, 500, 250, 162, [125, 300, 0, 0, 0.2], [10, 0, 20], [], 5, 'Nürburgring GP', '0.5 / 5.0 km');
    HudComponents.StartLights.draw(mockCtx, { width: 400, height: 100, style: {} }, { active: true, state: 'countdown', lightsCount: 3 });
  } catch (err) {
    drawThrew = true;
    console.error(err);
  }
  testAssert(!drawThrew, 'Todos los componentes visuales del HUD renderizan limpiamente sin excepciones');
}

console.log(`Resultado Módulos SOLID: ${totalAsserts} aserciones correctas, 0 fallos.`);
module.exports = { totalAsserts };
