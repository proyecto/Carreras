"use strict";
/**
 * ============================================================================
 * TEST SUITE: PATRONES DE DISEÑO (tests/test_patterns.js)
 * ============================================================================
 * Verifica el funcionamiento riguroso de todos los patrones de diseño en engine/patterns.js:
 * Singleton, Factory, Interface, Adapter, Proxy, Bridge, Observer, Iterator, State, Template, Strategy.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Patterns = require("../engine/patterns.js");

let totalAsserts = 0;
function testAssert(condition, message) {
  assert(condition, message);
  totalAsserts++;
}

console.log("--- [TEST SUITE] Patrones de Diseño (engine/patterns.js) ---");

// 1. Observer (EventBus)
{
  const bus = new Patterns.EventBus();
  let received = 0;
  let lastPayload = null;

  const unsub = bus.on("test:event", (payload) => {
    received++;
    lastPayload = payload;
  });

  bus.emit("test:event", { speed: 120 });
  testAssert(received === 1, "EventBus.on recibe evento");
  testAssert(
    lastPayload && lastPayload.speed === 120,
    "EventBus payload correcto",
  );

  unsub();
  bus.emit("test:event", { speed: 150 });
  testAssert(received === 1, "EventBus unsub desuscribe correctamente");

  // Once
  let onceCount = 0;
  bus.once("test:once", () => onceCount++);
  bus.emit("test:once");
  bus.emit("test:once");
  testAssert(onceCount === 1, "EventBus.once se ejecuta una sola vez");

  // Wildcard
  let wildcardCount = 0;
  bus.on("*", (ev, payload) => wildcardCount++);
  bus.emit("any:event", 123);
  testAssert(wildcardCount === 1, "EventBus wildcard captura eventos");
}

// 2. Singleton
{
  const ctx1 = Patterns.GameEngineContext.getInstance();
  const ctx2 = Patterns.GameEngineContext.getInstance();
  testAssert(ctx1 === ctx2, "GameEngineContext es un Singleton único");
  testAssert(
    ctx1.physicsHz === 120,
    "GameEngineContext inicializa physicsHz a 120",
  );

  const cat1 = Patterns.VehicleCatalog.getInstance();
  const cat2 = Patterns.VehicleCatalog.getInstance();
  testAssert(cat1 === cat2, "VehicleCatalog es un Singleton único");

  cat1.register({ id: "car-a", name: "Car A" });
  testAssert(cat2.has("car-a"), "VehicleCatalog sincronizado globalmente");
  testAssert(
    cat2.get("car-a").name === "Car A",
    "VehicleCatalog devuelve vehículo correcto",
  );
}

// 3. Factory
{
  const phys = Patterns.VehicleFactory.createPhysicsState();
  testAssert(
    phys.omega instanceof Float32Array && phys.omega.length === 4,
    "VehicleFactory crea arrays Float32Array para omega",
  );
  testAssert(
    phys.gear === 1 && phys.rpm === 1000,
    "VehicleFactory inicializa marcha y rpm",
  );

  const render = Patterns.VehicleFactory.createRenderState();
  testAssert(
    render.body instanceof Float32Array && render.body.length === 16,
    "VehicleFactory crea matriz 4x4 para render",
  );

  const catalog = new Patterns.VehicleCatalog();
  catalog.register({ id: "car-1", name: "Car 1" });
  catalog.register({ id: "car-2", name: "Car 2" });
  const rival = Patterns.VehicleFactory.createRival(catalog, "car-1");
  testAssert(
    rival && rival.id !== "car-1",
    "VehicleFactory.createRival excluye el coche del jugador",
  );
}

// 4. Interface Validator
{
  const validVehicle = {
    id: "test-car",
    name: "Test Car",
    physics: {},
    hubs: [[1, 0, 0]],
    wheelR: 0.33,
    build: () => {},
    place: () => {},
  };
  testAssert(
    Patterns.InterfaceValidator.validate(
      validVehicle,
      Patterns.InterfaceValidator.VehicleContract,
      "IVehicle",
    ) === true,
    "InterfaceValidator valida objeto conforme",
  );

  let failed = false;
  try {
    Patterns.InterfaceValidator.validate(
      { id: "bad" },
      Patterns.InterfaceValidator.VehicleContract,
      "IVehicle",
    );
  } catch (e) {
    failed = true;
  }
  testAssert(failed, "InterfaceValidator detecta violaciones de contrato");
}

// 5. Adapter
{
  const storage = new Patterns.StorageAdapter();
  storage.setItem("best_lap", "1:24.50");
  testAssert(
    storage.getItem("best_lap") === "1:24.50",
    "StorageAdapter almacena y recupera valores",
  );
  storage.setJSON("cfg", { fov: 60 });
  testAssert(
    storage.getJSON("cfg").fov === 60,
    "StorageAdapter serializa/deserializa JSON",
  );

  const kb = new Patterns.KeyboardInputAdapter();
  testAssert(
    kb.pollBitmask() === 0,
    "KeyboardInputAdapter sin teclas pulsadas",
  );
  kb.handleKeyDown("KeyW");
  testAssert(
    (kb.pollBitmask() & 1) !== 0,
    "KeyboardInputAdapter activa bitmask K_W para forward",
  );
  kb.handleKeyUp("KeyW");
  testAssert(
    (kb.pollBitmask() & 1) === 0,
    "KeyboardInputAdapter libera bitmask",
  );

  const gp = new Patterns.GamepadInputAdapter();
  const res = gp.poll();
  testAssert(
    typeof res.connected === "boolean",
    "GamepadInputAdapter maneja ausencia de gamepad limpiamente",
  );
}

// 6. Proxy
{
  let decoderCalled = 0;
  const mockCar = {
    id: "proxy-car",
    name: "Proxy Car",
    bodyData: "raw-bytes-mock",
    build: () => "built",
    place: () => "placed",
  };
  const proxy = new Patterns.CarAssetProxy(mockCar);
  testAssert(
    proxy.name === "Proxy Car",
    "CarAssetProxy expone propiedades del target",
  );

  const buf1 = proxy.getBuffer("bodyData", (raw) => {
    decoderCalled++;
    return new Float32Array([1, 2, 3]);
  });
  testAssert(
    decoderCalled === 1,
    "CarAssetProxy llama al decodificador en primer acceso",
  );

  const buf2 = proxy.getBuffer("bodyData", () => {
    decoderCalled++;
  });
  testAssert(
    decoderCalled === 1,
    "CarAssetProxy memoiza en caché y no vuelve a llamar al decodificador",
  );
  testAssert(
    buf1 === buf2,
    "CarAssetProxy devuelve la misma referencia de buffer",
  );

  // I18nProxy
  const dict = {
    es: { start: "Empezar", race: "Carrera: {track}" },
    en: { start: "Start", only_en: "Only EN" },
  };
  const i18n = new Patterns.I18nProxy(dict, "es");
  testAssert(
    i18n.t("start") === "Empezar",
    "I18nProxy traduce en idioma activo",
  );
  testAssert(
    i18n.t("race", { track: "Spa" }) === "Carrera: Spa",
    "I18nProxy reemplaza plantillas {key}",
  );
  testAssert(
    i18n.t("only_en") === "Only EN",
    "I18nProxy recurre al fallback inglés cuando falta en español",
  );
}

// 7. Bridge
{
  let placedBody = null;
  const mockModel = {
    inp: new Float64Array(2),
    place: (body, spin, susp) => {
      placedBody = body;
    },
  };
  const bridge = new Patterns.VehicleRenderBridge(mockModel, {});
  const mat = new Float32Array([
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
  ]);
  bridge.syncToRenderer(mat, new Float32Array(4), new Float32Array(4), 0.25);
  testAssert(
    placedBody === mat,
    "VehicleRenderBridge propaga la pose matemática al modelo gráfico",
  );
  testAssert(
    mockModel.inp[0] === 0.25,
    "VehicleRenderBridge sincroniza ángulo de giro en volante",
  );
}

// 8. Iterator
{
  const waypoints = [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
    { x: 20, z: 10 },
  ];
  const iter = new Patterns.TrackWaypointIterator(waypoints, false);
  const collected = [];
  for (const pt of iter) {
    collected.push(pt.x);
  }
  testAssert(
    collected.length === 3 && collected[2] === 20,
    "TrackWaypointIterator recorre todos los elementos",
  );

  // Cyclic iterator
  const cyclic = new Patterns.TrackWaypointIterator(waypoints, true);
  testAssert(
    cyclic.next().value.x === 0,
    "TrackWaypointIterator cíclico: elem 0",
  );
  testAssert(
    cyclic.next().value.x === 10,
    "TrackWaypointIterator cíclico: elem 1",
  );
  testAssert(
    cyclic.next().value.x === 20,
    "TrackWaypointIterator cíclico: elem 2",
  );
  testAssert(
    cyclic.next().value.x === 0,
    "TrackWaypointIterator cíclico: rebobina al inicio",
  );

  // CatalogIterator
  const cars = [
    { id: "gt3-1", cat: "gt3" },
    { id: "gt3-2", cat: "gt3" },
    { id: "classic-1", cat: "classic" },
  ];
  const gt3Iter = new Patterns.CatalogIterator(cars, (c) => c.cat === "gt3");
  const gt3List = Array.from(gt3Iter);
  testAssert(
    gt3List.length === 2 && gt3List[1].id === "gt3-2",
    "CatalogIterator filtra colecciones correctamente",
  );
}

// 9. State
{
  const sm = new Patterns.GameStateManager();
  testAssert(
    sm.getState() === 0,
    "GameStateManager arranca en estado INICIO (0)",
  );
  testAssert(
    sm.getStateName() === "INICIO",
    "GameStateManager nombre de estado inicial correcto",
  );

  let stateChangeEv = null;
  Patterns.EventBusSingleton.once("state:changed", (ev) => {
    stateChangeEv = ev;
  });

  sm.setState(1);
  testAssert(sm.getState() === 1, "GameStateManager transiciona a JUEGO (1)");
  testAssert(
    stateChangeEv && stateChangeEv.from === 0 && stateChangeEv.to === 1,
    "GameStateManager emite evento de cambio de estado",
  );
  testAssert(
    sm.isState(1) && !sm.isState(0),
    "GameStateManager.isState responde con precisión",
  );
}

// 10. Template Method
{
  const order = [];
  const loop = new Patterns.RaceSimulationLoop({
    pollInputs: () => {
      order.push("poll");
      return 1;
    },
    stepPhysics: () => {
      order.push("physics");
    },
    stepAI: () => {
      order.push("ai");
    },
    stepCollisions: () => {
      order.push("collisions");
    },
    stepPose: () => {
      order.push("pose");
    },
    checkLaps: () => {
      order.push("laps");
    },
  });

  loop.tick(1 / 120);
  testAssert(
    order.join("->") === "poll->physics->ai->collisions->pose->laps",
    "SimulationLoopTemplate orquesta los pasos en orden canónico estricto",
  );
}

// 11. Strategy
{
  const rlStrategy = Patterns.AIDrivingStrategies.RacingLine;
  const ovStrategy = Patterns.AIDrivingStrategies.Overtake;
  const resRL = rlStrategy.calculateTarget({ x: 0, z: 0 }, null, 0.5);
  const resOV = ovStrategy.calculateTarget({ x: 0, z: 0 }, null, 0.5);
  testAssert(
    resRL.speedMultiplier === 1.0,
    "Estrategia RacingLine aplica velocidad estándar",
  );
  testAssert(
    resOV.speedMultiplier > 1.0,
    "Estrategia Overtake aplica sobrevelocidad para adelantamiento",
  );
  testAssert(
    Patterns.CameraStrategies.Chase.id === 0,
    "Estrategia de Cámara Chase configurada",
  );
}

// 12. Validación de Modularización SOLID (engine/patterns/)
{
  const patternsDir = path.join(__dirname, "../engine/patterns");
  const modules = [
    "event-bus.js",
    "catalogs.js",
    "adapters.js",
    "proxies.js",
    "iterators.js",
    "state-machine.js",
    "templates.js",
    "strategies.js",
  ];
  for (const mod of modules) {
    testAssert(
      fs.existsSync(path.join(patternsDir, mod)),
      `Submódulo modular SOLID engine/patterns/${mod} presente`,
    );
  }
}

console.log(
  `Resultado Patrones de Diseño: ${totalAsserts} aserciones correctas, 0 fallos.`,
);

if (typeof module !== "undefined" && module.exports) {
  module.exports = { totalAsserts };
}
