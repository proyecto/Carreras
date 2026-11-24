(function (RootScope) {
  'use strict';
  /**
   * Templates - Patrón Template Method (Ciclo de Simulación Física)
   * Define el esqueleto canónico e invariable de pasos para simulación numérica a 120 Hz.
   */

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
    prePhysics(dt, inputs) { }
    integratePhysics(dt, inputs) { }
    postPhysics(dt) { }
    updateAI(dt) { }
    resolveVehicleCollisions(dt) { }
    updateSuspensionAndPose(dt) { }
    checkLapCrossing(dt) { }
    afterTick(dt) { }
  }

  /**
   * RaceSimulationLoop: Implementación estándar para la carrera activa.
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

  RootScope.SimulationLoopTemplate = SimulationLoopTemplate;
  RootScope.RaceSimulationLoop = RaceSimulationLoop;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      SimulationLoopTemplate,
      RaceSimulationLoop
    };
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
