(function (RootScope) {
  "use strict";
  /**
   * StateMachine - Patrón State (Ciclo de Vida y Estados de Juego)
   * Máquina de estados formal para transición controlada entre fases de juego:
   * INICIO (0), JUEGO (1), PAUSA (2), BENCH (3), REPLAY (4), RESULT (5), POSE (6).
   */

  const getBus = () =>
    RootScope.EventBusSingleton ||
    (typeof require !== "undefined"
      ? require("./event-bus.js").EventBusSingleton
      : null);

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
    constructor() {
      super("INICIO", 0);
    }
    enter(m) {
      const b = getBus();
      if (b) b.emit("state:enter_inicio");
    }
  }

  class StateJuego extends GameStateBase {
    constructor() {
      super("JUEGO", 1);
    }
    enter(m) {
      const b = getBus();
      if (b) b.emit("state:enter_juego");
    }
  }

  class StatePausa extends GameStateBase {
    constructor() {
      super("PAUSA", 2);
    }
    enter(m) {
      const b = getBus();
      if (b) b.emit("state:enter_pausa");
    }
  }

  class StateBench extends GameStateBase {
    constructor() {
      super("BENCH", 3);
    }
    enter(m) {
      const b = getBus();
      if (b) b.emit("state:enter_bench");
    }
  }

  class StateReplay extends GameStateBase {
    constructor() {
      super("REPLAY", 4);
    }
    enter(m) {
      const b = getBus();
      if (b) b.emit("state:enter_replay");
    }
  }

  class StateResult extends GameStateBase {
    constructor() {
      super("RESULT", 5);
    }
    enter(m) {
      const b = getBus();
      if (b) b.emit("state:enter_result");
    }
  }

  class StatePose extends GameStateBase {
    constructor() {
      super("POSE", 6);
    }
    enter(m) {
      const b = getBus();
      if (b) b.emit("state:enter_pose");
    }
  }

  /**
   * GameStateManager: Gestor de estados de juego con transición controlada.
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
        [6, new StatePose()],
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

      const b = getBus();
      if (b) {
        b.emit("state:changed", {
          from: prevState.id,
          to: nextState.id,
          fromName: prevState.name,
          toName: nextState.name,
        });
      }
    }

    isState(stateId) {
      return this.currentState.id === stateId;
    }
  }

  RootScope.GameStateBase = GameStateBase;
  RootScope.StateInicio = StateInicio;
  RootScope.StateJuego = StateJuego;
  RootScope.StatePausa = StatePausa;
  RootScope.StateBench = StateBench;
  RootScope.StateReplay = StateReplay;
  RootScope.StateResult = StateResult;
  RootScope.StatePose = StatePose;
  RootScope.GameStateManager = GameStateManager;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      GameStateBase,
      StateInicio,
      StateJuego,
      StatePausa,
      StateBench,
      StateReplay,
      StateResult,
      StatePose,
      GameStateManager,
    };
  }
})(
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this,
);
