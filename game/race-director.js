'use strict';
/**
 * ============================================================================
 * DIRECTOR DE CARRERA Y SEMÁFORO FIA (game/race-director.js)
 * ============================================================================
 * Patrón: STATE & OBSERVER
 * Responsabilidad Única (SRP):
 * - Gestión del ciclo de salida: Cuenta atrás oficial FIA de 5 focos rojos,
 *   pausa tensa aleatoria, apagado de luces (Lights Out), pitidos sonoros
 *   y activación/desactivación del Launch Control (bloqueo físico en parrilla).
 */

const RaceState = Object.freeze({
  IDLE: 'idle',
  COUNTDOWN: 'countdown',
  LIGHTS_OUT: 'lights_out',
  RACING: 'racing',
  FINISHED: 'finished',
});

class RaceDirector {
  constructor() {
    this.state = RaceState.IDLE;
    this.active = false;
    this.t = 0;
    this.lightsCount = 0;
    this.goTime = 6.0;
    this.doneTime = 7.8;
    this.lastBeep = -1;
  }

  /**
   * Dispara una nueva secuencia de salida estilo FIA.
   */
  triggerStart() {
    this.active = true;
    this.state = RaceState.COUNTDOWN;
    this.t = 0;
    this.lightsCount = 0;
    this.lastBeep = -1;
    // 5 luces rojas (1s cada una) + pausa tensa aleatoria (0.8s a 2.0s)
    this.goTime = 5.0 + 0.8 + Math.random() * 1.2;
    this.doneTime = this.goTime + 1.8;

    if (typeof Patterns !== 'undefined' && Patterns.EventBusSingleton) {
      Patterns.EventBusSingleton.emit('race:countdown_start', { goTime: this.goTime });
    }
  }

  /**
   * Actualiza el temporizador de salida a 120 Hz.
   * Aplica Launch Control si está en cuenta atrás.
   * @param {number} dt - Paso de tiempo de simulación (1/120 s)
   * @param {Array<Object>} vehicles - Lista de vehículos en parrilla para bloquear aceleración
   */
  step(dt, vehicles = []) {
    if (!this.active) return;

    this.t += dt;

    if (this.state === RaceState.COUNTDOWN) {
      const curLight = Math.min(5, Math.floor(this.t));
      if (curLight !== this.lightsCount) {
        this.lightsCount = curLight;
        if (curLight > 0 && curLight !== this.lastBeep) {
          this.lastBeep = curLight;
          if (typeof sndBeep === 'function') sndBeep(480, 0.16, 0.28);
          if (typeof Patterns !== 'undefined' && Patterns.EventBusSingleton) {
            Patterns.EventBusSingleton.emit('race:light', { count: curLight });
          }
        }
      }

      if (this.t >= this.goTime) {
        // ¡LUCES FUERA! Salida de carrera
        this.state = RaceState.LIGHTS_OUT;
        if (typeof sndBeep === 'function') sndBeep(1150, 0.38, 0.36);
        if (typeof LAP !== 'undefined') LAP[0] = performance.now() * 0.001;
        if (typeof Patterns !== 'undefined' && Patterns.EventBusSingleton) {
          Patterns.EventBusSingleton.emit('race:lights_out', { time: this.t });
        }
      } else {
        // Launch Control: Bloqueo de velocidad en parrilla durante la cuenta atrás
        for (let i = 0; i < vehicles.length; i++) {
          const v = vehicles[i];
          if (v) { v.vx = 0; v.vy = 0; v.vz = 0; }
        }
      }
    } else if (this.state === RaceState.LIGHTS_OUT) {
      if (this.t >= this.doneTime) {
        this.active = false;
        this.state = RaceState.RACING;
        if (typeof Patterns !== 'undefined' && Patterns.EventBusSingleton) {
          Patterns.EventBusSingleton.emit('race:racing', { time: this.t });
        }
      }
    }
  }

  /**
   * Estado de compatibilidad con interfaz previa.
   */
  getCompatState() {
    return {
      active: this.active,
      state: this.state,
      t: this.t,
      lightsCount: this.lightsCount,
      goTime: this.goTime,
      doneTime: this.doneTime,
      lastBeep: this.lastBeep,
    };
  }
}

// Instancia singleton del director de carrera
const raceDirectorInstance = new RaceDirector();

// Interfaz global compatible para integración directa
const RACE_START = raceDirectorInstance;
function raceStartTrigger() {
  raceDirectorInstance.triggerStart();
}

if (typeof window !== 'undefined') {
  window.RaceState = RaceState;
  window.RaceDirector = RaceDirector;
  window.raceDirectorInstance = raceDirectorInstance;
  window.RACE_START = RACE_START;
  window.raceStartTrigger = raceStartTrigger;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RaceState, RaceDirector, raceDirectorInstance, RACE_START, raceStartTrigger };
}
