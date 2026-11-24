(function (RootScope) {
  'use strict';
  /**
   * ============================================================================
   * MOTOR DE CARRERAS - PATRONES DE DISEÑO DE SOFTWARE (engine/patterns.js)
   * ============================================================================
   * Fachada centralizada (Facade Pattern) que unifica los submódulos especializados
   * de arquitectura de software y diseño bajo principios SOLID:
   *
   * 1. engine/patterns/event-bus.js      -> Observer (EventBus, EventBusSingleton)
   * 2. engine/patterns/catalogs.js       -> Singleton / Factory (GameEngineContext, VehicleCatalog, TrackCatalog, VehicleFactory, InterfaceValidator)
   * 3. engine/patterns/adapters.js       -> Adapter (StorageAdapter, KeyboardInputAdapter, GamepadInputAdapter)
   * 4. engine/patterns/proxies.js        -> Proxy / Bridge (CarAssetProxy, I18nProxy, VehicleRenderBridge)
   * 5. engine/patterns/iterators.js      -> Iterator (TrackWaypointIterator, CatalogIterator)
   * 6. engine/patterns/state-machine.js  -> State (GameStateManager, GameStateBase, States)
   * 7. engine/patterns/templates.js      -> Template Method (SimulationLoopTemplate, RaceSimulationLoop)
   * 8. engine/patterns/strategies.js     -> Strategy (AIDrivingStrategies, CameraStrategies)
   */

        // Carga automática en Node.js / Entornos de prueba
        if (typeof process !== 'undefined' && process.versions && process.versions.node) {
          try {
            if (typeof RootScope.EventBus === 'undefined') {
              const eb = require('./patterns/event-bus.js');
              Object.assign(RootScope, eb);
            }
            if (typeof RootScope.VehicleCatalog === 'undefined') {
              const cat = require('./patterns/catalogs.js');
              Object.assign(RootScope, cat);
            }
            if (typeof RootScope.StorageAdapter === 'undefined') {
              const ad = require('./patterns/adapters.js');
              Object.assign(RootScope, ad);
            }
            if (typeof RootScope.CarAssetProxy === 'undefined') {
              const px = require('./patterns/proxies.js');
              Object.assign(RootScope, px);
            }
            if (typeof RootScope.TrackWaypointIterator === 'undefined') {
              const it = require('./patterns/iterators.js');
              Object.assign(RootScope, it);
            }
            if (typeof RootScope.GameStateManager === 'undefined') {
              const sm = require('./patterns/state-machine.js');
              Object.assign(RootScope, sm);
            }
            if (typeof RootScope.SimulationLoopTemplate === 'undefined') {
              const tp = require('./patterns/templates.js');
              Object.assign(RootScope, tp);
            }
            if (typeof RootScope.AIDrivingStrategies === 'undefined') {
              const st = require('./patterns/strategies.js');
              Object.assign(RootScope, st);
            }
          } catch (e) {
            // Si corre en un sandbox o navegador donde los scripts ya fueron inyectados
          }
        }

      const Patterns = {
        // 1. Singleton
        get EventBusSingleton() { return RootScope.EventBusSingleton; },
        get GameEngineContext() { return RootScope.GameEngineContext; },
        get VehicleCatalog() { return RootScope.VehicleCatalog; },
        get TrackCatalog() { return RootScope.TrackCatalog; },
        // 2. Factory
        get VehicleFactory() { return RootScope.VehicleFactory; },
        // 3. Interface
        get InterfaceValidator() { return RootScope.InterfaceValidator; },
        // 4. Adapter
        get StorageAdapter() { return RootScope.StorageAdapter; },
        get StorageAdapterSingleton() { return RootScope.StorageAdapterSingleton; },
        get KeyboardInputAdapter() { return RootScope.KeyboardInputAdapter; },
        get GamepadInputAdapter() { return RootScope.GamepadInputAdapter; },
        // 5. Proxy
        get CarAssetProxy() { return RootScope.CarAssetProxy; },
        get I18nProxy() { return RootScope.I18nProxy; },
        // 6. Bridge
        get VehicleRenderBridge() { return RootScope.VehicleRenderBridge; },
        // 7. Observer
        get EventBus() { return RootScope.EventBus; },
        // 8. Iterator
        get TrackWaypointIterator() { return RootScope.TrackWaypointIterator; },
        get CatalogIterator() { return RootScope.CatalogIterator; },
        // 9. State
        get GameStateManager() { return RootScope.GameStateManager; },
        get GameStateBase() { return RootScope.GameStateBase; },
        get StateInicio() { return RootScope.StateInicio; },
        get StateJuego() { return RootScope.StateJuego; },
        get StatePausa() { return RootScope.StatePausa; },
        get StateBench() { return RootScope.StateBench; },
        get StateReplay() { return RootScope.StateReplay; },
        get StateResult() { return RootScope.StateResult; },
        get StatePose() { return RootScope.StatePose; },
        // 10. Template Method
        get SimulationLoopTemplate() { return RootScope.SimulationLoopTemplate; },
        get RaceSimulationLoop() { return RootScope.RaceSimulationLoop; },
        // 11. Strategy
        get AIDrivingStrategies() { return RootScope.AIDrivingStrategies; },
        get CameraStrategies() { return RootScope.CameraStrategies; }
      };

      RootScope.Patterns = Patterns;

      if (typeof module !== 'undefined' && module.exports) {
        module.exports = Patterns;
      }
    }) (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
