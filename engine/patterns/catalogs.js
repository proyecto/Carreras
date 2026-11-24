(function (RootScope) {
  'use strict';
  /**
   * Catalogs & Factories - Patrones Singleton, Factory e Interface Validator
   * Centraliza registros globales, factorías de estado físico y validadores de contrato.
   */

  const getBus = () => (RootScope.EventBusSingleton || (typeof require !== 'undefined' ? require('./event-bus.js').EventBusSingleton : null));

  /**
   * GameEngineContext (Singleton): Contenedor central del estado global del motor.
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
    const bus = getBus();
    if (bus) bus.emit('catalog:vehicle_registered', vehicle.id);
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
    const bus = getBus();
    if (bus) bus.emit('catalog:track_registered', track.id);
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

        /**
         * InterfaceValidator: Valida en tiempo de desarrollo/tests que los objetos
         * de vehículos, circuitos y adaptadores satisfagan los contratos estipulados.
         */
        const InterfaceValidator = {
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

  VehicleContract: {
    id: 'string',
    name: 'string',
    physics: 'object',
    hubs: 'array',
    wheelR: 'number',
    build: 'function',
    place: 'function'
  },

  TrackContract: {
    id: 'string',
    name: 'string',
    L: 'number',
    build: 'function'
  },

  InputSourceContract: {
    poll: 'function'
  },

GameStateContract: {
  name: 'string',
    enter: 'function',
      exit: 'function',
        update: 'function'
}
  };

  /**
   * VehicleFactory: Centraliza la creación e inicialización de estados físicos,
   * vectores de posición y configuraciones de suspensión para vehículos.
   */
  class VehicleFactory {
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

  static createRenderState() {
    const mkMat4 = typeof m4 === 'function' ? m4 : () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    return {
      cx: 0, cy: 0, cz: 0, yaw: 0, steer: 0, speed: 0,
      body: mkMat4(), tmp: mkMat4(), ground: mkMat4(),
      susp: new Float32Array(4),
      spin: new Float32Array(4),
      keys: 0, rivalKeys: 0
    };
  }

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

RootScope.GameEngineContext = GameEngineContext;
RootScope.VehicleCatalog = VehicleCatalog;
RootScope.TrackCatalog = TrackCatalog;
RootScope.InterfaceValidator = InterfaceValidator;
RootScope.VehicleFactory = VehicleFactory;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GameEngineContext,
    VehicleCatalog,
    TrackCatalog,
    InterfaceValidator,
    VehicleFactory
  };
}
}) (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
