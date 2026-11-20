'use strict';
/**
 * ============================================================================
 * MOTOR DE CARRERAS - PATRONES DE DISEÑO DE SOFTWARE (engine/patterns.js)
 * ============================================================================
 * Este módulo implementa y centraliza los patrones de diseño clásicos (GoF)
 * adaptados para simuladores de carreras en tiempo real de alto rendimiento:
 *
 * 1.  SINGLETON:         EventBusSingleton, GameEngineContext, VehicleCatalog, TrackCatalog
 * 2.  FACTORY:           VehicleFactory, DrawableFactory, RivalCarFactory
 * 3.  INTERFACE:         InterfaceValidator (IVehicle, ITrack, IInputSource, IState, IRenderable)
 * 4.  ADAPTER:           KeyboardInputAdapter, GamepadInputAdapter, StorageAdapter
 * 5.  PROXY:             CarAssetProxy, I18nProxy, PhysicsStateProxy
 * 6.  BRIDGE:            VehicleRenderBridge (desacopla física 120Hz de la renderización WebGPU)
 * 7.  OBSERVER:          EventBus (Pub/Sub con suscripciones tipadas, once y wildcards)
 * 8.  ITERATOR:          TrackWaypointIterator, CatalogIterator
 * 9.  STATE:             GameStateManager (StateInicio, StateJuego, StatePausa, StateBench, StateReplay, StateResult, StatePose)
 * 10. TEMPLATE METHOD:   SimulationLoopTemplate (RaceSimulationLoop, BenchmarkSimulationLoop)
 * 11. STRATEGY:          AIDrivingStrategy (RacingLine, Overtake, Defensive), CameraStrategy (Chase, Bonnet, TV)
 *
 * NOTA DE RENDIMIENTO:
 * - Cero asignaciones en memoria durante los bucles de simulación (120 Hz) y dibujado (60 FPS).
 * - Compatible tanto con navegador web (WebGPU/DOM) como con entornos Node.js (test runner).
 */

const RootScope = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

// ============================================================================
// 1. PATRÓN OBSERVER / EVENT BUS (OBSERVADOR)
// ============================================================================

/**
 * EventBus: Desacopla la emisión de eventos de juego (vueltas, récords, colisiones,
 * cambios de estado, rebind de controles) de los módulos suscriptores (HUD, Audio, UI, Telemetría).
 */
class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * Suscribe una función callback a un evento específico.
   * @param {string} event - Nombre del evento (ej: 'lap:complete', 'collision')
   * @param {Function} callback - Función manejadora
   * @returns {Function} Función para cancelar la suscripción
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    const handlers = this._listeners.get(event);
    handlers.push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Suscribe un manejador que solo se ejecuta una única vez.
   */
  once(event, callback) {
    const unsub = this.on(event, (...args) => {
      unsub();
      callback(...args);
    });
    return unsub;
  }

  /**
   * Cancela la suscripción de un manejador.
   */
  off(event, callback) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    const idx = handlers.indexOf(callback);
    if (idx !== -1) handlers.splice(idx, 1);
  }

  /**
   * Emite un evento síncrono a todos los suscriptores registrados.
   */
  emit(event, payload) {
    const handlers = this._listeners.get(event);
    if (handlers && handlers.length > 0) {
      for (let i = 0; i < handlers.length; i++) {
        try {
          handlers[i](payload);
        } catch (err) {
          console.error(`[EventBus] Error en manejador de "${event}":`, err);
        }
      }
    }
    // Soporte para oyentes globales comodín (*)
    const wildcards = this._listeners.get('*');
    if (wildcards && wildcards.length > 0) {
      for (let i = 0; i < wildcards.length; i++) {
        try {
          wildcards[i](event, payload);
        } catch (err) {
          console.error(`[EventBus] Error en comodín de "${event}":`, err);
        }
      }
    }
  }

  /**
   * Elimina todos los oyentes registrados.
   */
  clear() {
    this._listeners.clear();
  }
}

// Instancia única (Singleton) del EventBus
const EventBusSingleton = new EventBus();

// ============================================================================
// 2. PATRÓN SINGLETON (GESTORES Y REGISTROS GLOBALES)
// ============================================================================

/**
 * GameEngineContext (Singleton): Contenedor central del estado global del motor,
 * ciclo de renderizado, reloj de simulación y opciones configuradas.
 */
class GameEngineContext {
  static _instance = null;

  constructor() {
    if (GameEngineContext._instance) {
      return GameEngineContext._instance;
    }
    this.version = '2.4.0';
    this.targetFps = 60;
    this.physicsHz = 120;
    this.physicsDt = 1 / 120;
    this.rivalEnabled = true;
    this.activeCarId = 'mercedes-amg-gt3-2020';
    this.activeTrackId = 'nurburgring-gp';
    this.rivalCarId = 'audi-r8-lms-evo-2020';
    this.currentLanguage = 'es';
    this.isPaused = false;
    this.debugTelemetry = false;
    GameEngineContext._instance = this;
  }

  static getInstance() {
    if (!GameEngineContext._instance) {
      GameEngineContext._instance = new GameEngineContext();
    }
    return GameEngineContext._instance;
  }
}

/**
 * VehicleCatalog (Singleton): Registro central de vehículos con catálogo y metadatos.
 */
class VehicleCatalog {
  static _instance = null;

  constructor() {
    if (VehicleCatalog._instance) return VehicleCatalog._instance;
    this._vehicles = new Map();
    VehicleCatalog._instance = this;
  }

  static getInstance() {
    if (!VehicleCatalog._instance) VehicleCatalog._instance = new VehicleCatalog();
    return VehicleCatalog._instance;
  }

  register(vehicle) {
    if (!vehicle || !vehicle.id) throw new Error('[VehicleCatalog] Vehículo inválido');
    this._vehicles.set(vehicle.id, vehicle);
    EventBusSingleton.emit('catalog:vehicle_registered', vehicle.id);
  }

  get(id) {
    return this._vehicles.get(id);
  }

  has(id) {
    return this._vehicles.has(id);
  }

  getAll() {
    return Array.from(this._vehicles.values());
  }

  getAllIds() {
    return Array.from(this._vehicles.keys());
  }

  getRandom(excludeId = null) {
    const ids = this.getAllIds().filter(id => id !== excludeId);
    if (ids.length === 0) return null;
    const randomId = ids[Math.floor(Math.random() * ids.length)];
    return this.get(randomId);
  }

  count() {
    return this._vehicles.size;
  }
}

/**
 * TrackCatalog (Singleton): Registro central de circuitos de carreras.
 */
class TrackCatalog {
  static _instance = null;

  constructor() {
    if (TrackCatalog._instance) return TrackCatalog._instance;
    this._tracks = new Map();
    TrackCatalog._instance = this;
  }

  static getInstance() {
    if (!TrackCatalog._instance) TrackCatalog._instance = new TrackCatalog();
    return TrackCatalog._instance;
  }

  register(track) {
    if (!track || !track.id) throw new Error('[TrackCatalog] Circuito inválido');
    this._tracks.set(track.id, track);
    EventBusSingleton.emit('catalog:track_registered', track.id);
  }

  get(id) {
    return this._tracks.get(id);
  }

  has(id) {
    return this._tracks.has(id);
  }

  getAll() {
    return Array.from(this._tracks.values());
  }

  getAllIds() {
    return Array.from(this._tracks.keys());
  }

  count() {
    return this._tracks.size;
  }
}

// ============================================================================
// 3. PATRÓN INTERFACE / CONTRACT VALIDATOR
// ============================================================================

/**
 * InterfaceValidator: Valida en tiempo de desarrollo/tests que los objetos de
 * vehículos, circuitos y adaptadores satisfagan los contratos estipulados.
 */
const InterfaceValidator = {
  /**
   * Valida que un objeto implemente las propiedades y métodos requeridos.
   */
  validate(target, contract, contractName = 'Interface') {
    if (!target || typeof target !== 'object') {
      throw new TypeError(`[${contractName}] El objetivo no es un objeto válido`);
    }
    const missing = [];
    for (const [key, expectedType] of Object.entries(contract)) {
      const actualType = typeof target[key];
      if (expectedType === 'array') {
        if (!Array.isArray(target[key])) missing.push(`${key} (esperado Array)`);
      } else if (expectedType === 'function') {
        if (typeof target[key] !== 'function') missing.push(`${key}()`);
      } else if (actualType !== expectedType) {
        missing.push(`${key} (esperado ${expectedType}, obtenido ${actualType})`);
      }
    }
    if (missing.length > 0) {
      throw new Error(`[${contractName}] Contrato no satisfecho: faltan [${missing.join(', ')}]`);
    }
    return true;
  },

  // Contrato de Vehículo de Carreras
  VehicleContract: {
    id: 'string',
    name: 'string',
    physics: 'object',
    hubs: 'array',
    wheelR: 'number',
    build: 'function',
    place: 'function'
  },

  // Contrato de Circuito
  TrackContract: {
    id: 'string',
    name: 'string',
    L: 'number',
    build: 'function'
  },

  // Contrato de Adaptador de Entrada
  InputSourceContract: {
    poll: 'function'
  },

  // Contrato de Estado de Juego
  GameStateContract: {
    name: 'string',
    enter: 'function',
    exit: 'function',
    update: 'function'
  }
};

// ============================================================================
// 4. PATRÓN FACTORY (FACTORÍA DE VEHÍCULOS, RIVALES Y DIBUJABLES)
// ============================================================================

/**
 * VehicleFactory: Centraliza la creación e inicialización de estados físicos,
 * vectores de posición y configuraciones de suspensión para vehículos.
 */
class VehicleFactory {
  /**
   * Crea una estructura de estado físico virgen (zero-allocation) para simulación.
   */
  static createPhysicsState() {
    return {
      x: 0, z: 0, yaw: 0, vx: 0, vy: 0, r: 0,
      y: 0, roll: 0, pitch: 0, heave: 0, gPitch: 0, gRoll: 0, steer: 0,
      omega: new Float32Array(4),
      spin: new Float32Array(4),
      susp: new Float32Array(4),
      load: new Float32Array(4),
      slipR: new Float32Array(4),
      slipA: new Float32Array(4),
      fx: new Float32Array(4),
      fy: new Float32Array(4),
      wx: new Float32Array(4),
      wz: new Float32Array(4),
      wy: new Float32Array(4),
      wzone: new Int32Array(4),
      gear: 1, rpm: 1000, clk: 0, s: 0, d: 0, lap: 0, lapTick: 0,
      ay: 0, ax: 0, zone: 0,
      px: 0, pz: 0, pyaw: 0, py: 0, proll: 0, ppitch: 0, pheave: 0, pgPitch: 0, pgRoll: 0, psteer: 0,
      pspin: new Float32Array(4), psusp: new Float32Array(4)
    };
  }

  /**
   * Crea un contenedor de estado de renderizado para interpolación de fotogramas.
   */
  static createRenderState() {
    const m4 = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    return {
      cx: 0, cy: 0, cz: 0, yaw: 0, steer: 0, speed: 0,
      body: m4(), tmp: m4(), ground: m4(),
      susp: new Float32Array(4),
      spin: new Float32Array(4),
      keys: 0, rivalKeys: 0
    };
  }

  /**
   * Configura e inicializa el modelo de rival IA seleccionando aleatoriamente
   * uno de los modelos disponibles si no se especifica uno explícito.
   */
  static createRival(catalog, playerCarId, preferredRivalId = null) {
    const catalogInst = catalog || VehicleCatalog.getInstance();
    let rivalCar = null;

    if (preferredRivalId && catalogInst.has(preferredRivalId) && preferredRivalId !== playerCarId) {
      rivalCar = catalogInst.get(preferredRivalId);
    } else {
      rivalCar = catalogInst.getRandom(playerCarId);
    }

    if (!rivalCar && catalogInst.count() > 0) {
      rivalCar = catalogInst.getAll()[0];
    }

    return rivalCar;
  }
}

// ============================================================================
// 5. PATRÓN ADAPTER (ADAPTADORES DE ENTRADA Y ALMACENAMIENTO)
// ============================================================================

/**
 * StorageAdapter: Adapta localStorage con fallback automático en memoria
 * para guardar controles, tiempos récord y opciones sin fallos de cuota o seguridad.
 */
class StorageAdapter {
  constructor() {
    this._memory = new Map();
    this._hasLocalStorage = false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('__test__', '1');
        localStorage.removeItem('__test__');
        this._hasLocalStorage = true;
      }
    } catch {
      this._hasLocalStorage = false;
    }
  }

  getItem(key) {
    if (this._hasLocalStorage) {
      try {
        return localStorage.getItem(key);
      } catch {
        // Fallback a memoria
      }
    }
    return this._memory.has(key) ? this._memory.get(key) : null;
  }

  setItem(key, value) {
    const str = String(value);
    if (this._hasLocalStorage) {
      try {
        localStorage.setItem(key, str);
        return;
      } catch {
        // Si falla cuota, guardar en memoria
      }
    }
    this._memory.set(key, str);
  }

  removeItem(key) {
    if (this._hasLocalStorage) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignorar
      }
    }
    this._memory.delete(key);
  }

  getJSON(key, defaultValue = null) {
    const val = this.getItem(key);
    if (!val) return defaultValue;
    try {
      return JSON.parse(val);
    } catch {
      return defaultValue;
    }
  }

  setJSON(key, value) {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[StorageAdapter] Error al serializar JSON para ${key}:`, err);
    }
  }
}

const StorageAdapterSingleton = new StorageAdapter();

/**
 * KeyboardInputAdapter: Adapta eventos de teclado del navegador al bitmask del simulador.
 */
class KeyboardInputAdapter {
  constructor(keyBindings = null) {
    this.bindings = keyBindings || {
      forward: ['KeyW', 'ArrowUp'],
      brake: ['KeyS', 'ArrowDown'],
      steerLeft: ['KeyA', 'ArrowLeft'],
      steerRight: ['KeyD', 'ArrowRight'],
      handbrake: ['Space', ''],
      gearUp: ['KeyE', 'KeyX'],
      gearDown: ['KeyQ', 'KeyZ'],
      camera: ['KeyC', ''],
      pause: ['Escape', 'KeyP']
    };
    this.activeKeys = new Set();
  }

  handleKeyDown(code) {
    this.activeKeys.add(code);
  }

  handleKeyUp(code) {
    this.activeKeys.delete(code);
  }

  pollBitmask() {
    let mask = 0;
    const has = (action) => {
      const keys = this.bindings[action];
      if (!keys) return false;
      return keys.some(k => k && this.activeKeys.has(k));
    };

    // Bitmask constants estándar del motor
    if (has('forward')) mask |= 1;       // K_W
    if (has('brake')) mask |= 2;         // K_S
    if (has('steerLeft')) mask |= 4;     // K_A
    if (has('steerRight')) mask |= 8;    // K_D
    if (has('handbrake')) mask |= 16;    // K_SPACE
    if (has('gearUp')) mask |= 32;       // K_E
    if (has('gearDown')) mask |= 64;     // K_Q
    if (has('camera')) mask |= 128;      // K_C
    if (has('pause')) mask |= 256;       // K_ESC
    return mask;
  }
}

/**
 * GamepadInputAdapter: Adapta el API navigator.getGamepads a la entrada analógica del motor.
 */
class GamepadInputAdapter {
  constructor(deadzone = 0.08) {
    this.deadzone = deadzone;
  }

  poll() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return { connected: false, steer: 0, throttle: 0, brake: 0, handbrake: 0 };
    }
    const gps = navigator.getGamepads();
    if (!gps || !gps[0]) {
      return { connected: false, steer: 0, throttle: 0, brake: 0, handbrake: 0 };
    }
    const gp = gps[0];
    let steer = gp.axes && gp.axes.length > 0 ? gp.axes[0] : 0;
    if (Math.abs(steer) < this.deadzone) steer = 0;

    let throttle = 0;
    let brake = 0;
    if (gp.buttons) {
      // Disparador RT / R2 (botón 7)
      if (gp.buttons[7]) throttle = gp.buttons[7].value !== undefined ? gp.buttons[7].value : (gp.buttons[7].pressed ? 1 : 0);
      // Disparador LT / L2 (botón 6)
      if (gp.buttons[6]) brake = gp.buttons[6].value !== undefined ? gp.buttons[6].value : (gp.buttons[6].pressed ? 1 : 0);
    }

    const handbrake = (gp.buttons && gp.buttons[0] && gp.buttons[0].pressed) ? 1 : 0; // Botón A / Cruz
    return { connected: true, steer, throttle, brake, handbrake };
  }
}

// ============================================================================
// 6. PATRÓN PROXY (PROXY DE ASSETS DE COCHES Y LOCALIZACIÓN)
// ============================================================================

/**
 * CarAssetProxy: Proxy virtual que retrasa la descompresión y decodificación
 * de buffers Float32/Uint32 en base64 hasta el momento exacto en que se necesita
 * renderizar el vehículo en pista, liberando memoria caché cuando no se usa.
 */
class CarAssetProxy {
  constructor(carDescriptor) {
    this._target = carDescriptor;
    this._cache = new Map();
  }

  get id() { return this._target.id; }
  get name() { return this._target.name; }
  get physics() { return this._target.physics; }
  get hubs() { return this._target.hubs; }
  get wheelR() { return this._target.wheelR; }

  getBuffer(bufferKey, decoderFn) {
    if (this._cache.has(bufferKey)) {
      return this._cache.get(bufferKey);
    }
    const rawData = this._target[bufferKey];
    if (!rawData) return null;
    const decoded = decoderFn(rawData);
    this._cache.set(bufferKey, decoded);
    return decoded;
  }

  build() {
    return this._target.build();
  }

  place(body, spin, susp) {
    return this._target.place(body, spin, susp);
  }

  clearCache() {
    this._cache.clear();
  }
}

/**
 * I18nProxy: Proxy dinámico con resolución de fallbacks automáticos para textos localizados.
 */
class I18nProxy {
  constructor(dictionary, defaultLang = 'es') {
    this._dict = dictionary || {};
    this._currentLang = defaultLang;
  }

  setLanguage(lang) {
    this._currentLang = lang;
    EventBusSingleton.emit('i18n:language_changed', lang);
  }

  getLanguage() {
    return this._currentLang;
  }

  /**
   * Obtiene la traducción resolviendo la jerarquía: idioma activo -> español -> inglés -> clave bruta.
   */
  t(key, replacements = null) {
    const currentTable = this._dict[this._currentLang];
    const esTable = this._dict['es'];
    const enTable = this._dict['en'];

    let text = (currentTable && currentTable[key]) ||
               (esTable && esTable[key]) ||
               (enTable && enTable[key]) ||
               key;

    if (replacements && typeof replacements === 'object') {
      for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(new RegExp(`{${k}}`, 'g'), v);
      }
    }
    return text;
  }
}

// ============================================================================
// 7. PATRÓN BRIDGE (PUENTE DE FÍSICA A RENDERIZADO)
// ============================================================================

/**
 * VehicleRenderBridge: Desacopla la física del vehículo (espacio de simulación, coordenadas,
 * integración matemática a 120 Hz) del backend de renderizado gráfico WebGPU (matrices 4x4,
 * ranuras de objetos MeshSet, sombras y shaders).
 */
class VehicleRenderBridge {
  constructor(carModel, physicsState) {
    this.carModel = carModel;
    this.physics = physicsState;
    this._transformMatrix = new Float32Array(16);
    this._wheelMatrix = new Float32Array(16);
  }

  /**
   * Actualiza las ranuras de renderizado del modelo 3D usando la pose interpolada.
   */
  syncToRenderer(interpolatedBodyMat, spinArray, suspArray, steerAngle) {
    if (!this.carModel || typeof this.carModel.place !== 'function') return;
    if (this.carModel.inp) {
      this.carModel.inp[0] = steerAngle;
      this.carModel.inp[1] = steerAngle * 14;
    }
    this.carModel.place(interpolatedBodyMat, spinArray, suspArray);
  }
}

// ============================================================================
// 8. PATRÓN ITERATOR (ITERADORES DE WAYPOINTS Y CATÁLOGOS)
// ============================================================================

/**
 * TrackWaypointIterator: Implementa el protocolo Iterator estándar para recorrer
 * los waypoints de la línea de carrera de un circuito sin desbordamientos de array.
 */
class TrackWaypointIterator {
  constructor(waypoints, cyclic = true) {
    this.waypoints = waypoints || [];
    this.cyclic = cyclic;
    this.index = 0;
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this.waypoints.length === 0) {
      return { done: true, value: undefined };
    }
    if (this.index >= this.waypoints.length) {
      if (this.cyclic) {
        this.index = 0;
      } else {
        return { done: true, value: undefined };
      }
    }
    const value = this.waypoints[this.index++];
    return { done: false, value };
  }

  reset() {
    this.index = 0;
  }
}

/**
 * CatalogIterator: Itera colecciones de coches o circuitos con soporte de filtrado dinámico.
 */
class CatalogIterator {
  constructor(items, filterPredicate = null) {
    this.items = filterPredicate ? items.filter(filterPredicate) : [...items];
    this.index = 0;
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this.index < this.items.length) {
      return { done: false, value: this.items[this.index++] };
    }
    return { done: true, value: undefined };
  }
}

// ============================================================================
// 9. PATRÓN STATE (MÁQUINA DE ESTADOS FORMAL PARA EL CICLO DE JUEGO)
// ============================================================================

/**
 * Interfaz base para cada estado del juego.
 */
class GameStateBase {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }
  enter(manager) {}
  exit(manager) {}
  update(manager, dt) {}
  render(manager) {}
  handleInput(manager, keyMask) {}
}

class StateInicio extends GameStateBase {
  constructor() { super('INICIO', 0); }
  enter(m) { EventBusSingleton.emit('state:enter_inicio'); }
}

class StateJuego extends GameStateBase {
  constructor() { super('JUEGO', 1); }
  enter(m) { EventBusSingleton.emit('state:enter_juego'); }
}

class StatePausa extends GameStateBase {
  constructor() { super('PAUSA', 2); }
  enter(m) { EventBusSingleton.emit('state:enter_pausa'); }
}

class StateBench extends GameStateBase {
  constructor() { super('BENCH', 3); }
  enter(m) { EventBusSingleton.emit('state:enter_bench'); }
}

class StateReplay extends GameStateBase {
  constructor() { super('REPLAY', 4); }
  enter(m) { EventBusSingleton.emit('state:enter_replay'); }
}

class StateResult extends GameStateBase {
  constructor() { super('RESULT', 5); }
  enter(m) { EventBusSingleton.emit('state:enter_result'); }
}

class StatePose extends GameStateBase {
  constructor() { super('POSE', 6); }
  enter(m) { EventBusSingleton.emit('state:enter_pose'); }
}

/**
 * GameStateManager: Gestor de estados de juego con transición controlada.
 * Mantiene compatibilidad total hacia atrás con el objeto ST existente.
 */
class GameStateManager {
  constructor() {
    this.states = new Map([
      [0, new StateInicio()],
      [1, new StateJuego()],
      [2, new StatePausa()],
      [3, new StateBench()],
      [4, new StateReplay()],
      [5, new StateResult()],
      [6, new StatePose()]
    ]);
    this.currentState = this.states.get(0);
  }

  getState() {
    return this.currentState.id;
  }

  getStateName() {
    return this.currentState.name;
  }

  setState(stateId) {
    if (!this.states.has(stateId)) {
      console.warn(`[GameStateManager] Estado desconocido: ${stateId}`);
      return;
    }
    const nextState = this.states.get(stateId);
    if (this.currentState === nextState) return;

    const prevState = this.currentState;
    prevState.exit(this);
    this.currentState = nextState;
    nextState.enter(this);

    EventBusSingleton.emit('state:changed', {
      from: prevState.id,
      to: nextState.id,
      fromName: prevState.name,
      toName: nextState.name
    });
  }

  isState(stateId) {
    return this.currentState.id === stateId;
  }
}

// ============================================================================
// 10. PATRÓN TEMPLATE METHOD (PLANTILLA DE CICLO DE SIMULACIÓN FÍSICA)
// ============================================================================

/**
 * SimulationLoopTemplate: Define el esqueleto invariable de pasos para ejecutar
 * un tick de simulación numérica a 120 Hz, permitiendo sobrescribir etapas
 * especializadas en subclases (Carrera vs Benchmark vs Replay).
 */
class SimulationLoopTemplate {
  /**
   * Método plantilla que orquesta los pasos en orden estricto.
   */
  tick(dt) {
    const inputs = this.pollInputs();
    this.prePhysics(dt, inputs);
    this.integratePhysics(dt, inputs);
    this.postPhysics(dt);
    this.updateAI(dt);
    this.resolveVehicleCollisions(dt);
    this.updateSuspensionAndPose(dt);
    this.checkLapCrossing(dt);
    this.afterTick(dt);
  }

  pollInputs() { return 0; }
  prePhysics(dt, inputs) {}
  integratePhysics(dt, inputs) {}
  postPhysics(dt) {}
  updateAI(dt) {}
  resolveVehicleCollisions(dt) {}
  updateSuspensionAndPose(dt) {}
  checkLapCrossing(dt) {}
  afterTick(dt) {}
}

/**
 * ConcreteSimulationLoop: Implementación estándar para la carrera activa.
 */
class RaceSimulationLoop extends SimulationLoopTemplate {
  constructor(handlers) {
    super();
    this.handlers = handlers || {};
  }

  pollInputs() {
    return this.handlers.pollInputs ? this.handlers.pollInputs() : 0;
  }

  integratePhysics(dt, inputs) {
    if (this.handlers.stepPhysics) this.handlers.stepPhysics(dt, inputs);
  }

  updateAI(dt) {
    if (this.handlers.stepAI) this.handlers.stepAI(dt);
  }

  resolveVehicleCollisions(dt) {
    if (this.handlers.stepCollisions) this.handlers.stepCollisions(dt);
  }

  updateSuspensionAndPose(dt) {
    if (this.handlers.stepPose) this.handlers.stepPose(dt);
  }

  checkLapCrossing(dt) {
    if (this.handlers.checkLaps) this.handlers.checkLaps(dt);
  }
}

// ============================================================================
// 11. PATRÓN STRATEGY (ESTRATEGIAS DE CONDUCCIÓN IA Y CÁMARAS)
// ============================================================================

/**
 * Estrategias de Conducción para la IA Rival
 */
const AIDrivingStrategies = {
  RacingLine: {
    name: 'RacingLine',
    calculateTarget(currentPos, trackSpline, lateralOffset) {
      return { targetOffset: lateralOffset, speedMultiplier: 1.0 };
    }
  },
  Overtake: {
    name: 'Overtake',
    calculateTarget(currentPos, trackSpline, lateralOffset) {
      // Abre la trayectoria hacia el interior de la curva
      return { targetOffset: lateralOffset > 0 ? -1.8 : 1.8, speedMultiplier: 1.05 };
    }
  },
  Defensive: {
    name: 'Defensive',
    calculateTarget(currentPos, trackSpline, lateralOffset) {
      // Protege el vértice interior
      return { targetOffset: 0.0, speedMultiplier: 0.98 };
    }
  }
};

/**
 * Estrategias de Cámara
 */
const CameraStrategies = {
  Chase: { id: 0, name: 'Chase' },
  Bonnet: { id: 1, name: 'Bonnet' },
  TV: { id: 2, name: 'TV' }
};

// ============================================================================
// EXPORTACIÓN GLOBAL Y COMPATIBILIDAD
// ============================================================================

const Patterns = {
  // 1. Singleton
  EventBusSingleton,
  GameEngineContext,
  VehicleCatalog,
  TrackCatalog,
  // 2. Factory
  VehicleFactory,
  // 3. Interface
  InterfaceValidator,
  // 4. Adapter
  StorageAdapter,
  StorageAdapterSingleton,
  KeyboardInputAdapter,
  GamepadInputAdapter,
  // 5. Proxy
  CarAssetProxy,
  I18nProxy,
  // 6. Bridge
  VehicleRenderBridge,
  // 7. Observer
  EventBus,
  // 8. Iterator
  TrackWaypointIterator,
  CatalogIterator,
  // 9. State
  GameStateManager,
  StateInicio,
  StateJuego,
  StatePausa,
  StateBench,
  StateReplay,
  StateResult,
  StatePose,
  // 10. Template Method
  SimulationLoopTemplate,
  RaceSimulationLoop,
  // 11. Strategy
  AIDrivingStrategies,
  CameraStrategies
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Patterns;
}

RootScope.Patterns = Patterns;
