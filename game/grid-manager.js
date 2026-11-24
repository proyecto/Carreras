'use strict';
/**
 * ============================================================================
 * GESTOR DE PARRILLA Y MULTI-COCHE (game/grid-manager.js)
 * ============================================================================
 * Patrón: COMPOSITE & MANAGER
 * Responsabilidad Única (SRP):
 * - Control del ciclo de vida de los vehículos rivales en pista (P2..P4).
 * - Posicionamiento en cajones de parrilla, simulación de IA, colisiones físicas
 *   entre coches e interpolación cinemática de ruedas y carrocería.
 */

class GridManager {
  constructor() {
    this.rivals = [];
  }

  /**
   * Inicializa la parrilla con las referencias a vehículos y configuraciones.
   */
  init(rivalDefs = []) {
    this.rivals = rivalDefs;
  }

  /**
   * Posiciona a todos los rivales en sus cajones de salida correspondientes.
   */
  resetGrid(trk, playerStartS, playerStartD) {
    for (let i = 0; i < this.rivals.length; i++) {
      const r = this.rivals[i];
      if (!r.veh || !r.vin) continue;
      const VR = r.veh;
      VR.lapS = 0;
      VR.offCount = 0;
      VR.hits = 0;
      VR.laps = 0;
      VR.time = 0;
      VR.steps = 0;
      VR.spin.fill(0);
      VR.susp.fill(0);
      r.lapStart = 0;
      r.lapSeen = 0;
      r.lastLapTime = -1;
      r.bestLapTime = -1;
      if (typeof vehicleReset === 'function') {
        vehicleReset(trk.L + playerStartS + r.ds, playerStartD + r.dd, 0, r.veh, r.vin);
      }
    }
  }

  /**
   * Actualiza las entradas de IA de todos los rivales a 60 Hz.
   */
  stepAi(t, raceActive) {
    for (let i = 0; i < this.rivals.length; i++) {
      const r = this.rivals[i];
      if (!r.veh) continue;
      if (typeof aiKeys === 'function') {
        r.keys = (t < 0.5 || raceActive) ? 0 : aiKeys(r.veh.time, r.veh);
      } else {
        r.keys = 0;
      }
    }
  }

  /**
   * Aplica un paso de físicas a 120 Hz para todos los rivales y resuelve colisiones.
   */
  stepPhysics(playerVeh, isNetActive) {
    if (isNetActive && typeof NET !== 'undefined') {
      if (this.rivals[0] && this.rivals[0].veh) {
        NET.updateRemoteVehicle(this.rivals[0].veh, typeof PHYS_DT !== 'undefined' ? PHYS_DT : 1 / 120);
        const r = this.rivals[0];
        const laps = r.veh.laps || 0;
        const lapSeen = r.lapSeen || 0;
        if (laps > lapSeen) {
          const t = r.veh.time;
          if (lapSeen > 0 || (r.lapStart !== undefined && r.lapStart >= 0)) {
            const lt = t - (r.lapStart || 0);
            if (lt > 5.0) {
              r.lastLapTime = lt;
              if (!r.bestLapTime || r.bestLapTime < 0 || lt < r.bestLapTime) {
                r.bestLapTime = lt;
              }
            }
          }
          r.lapStart = t;
          r.lapSeen = laps;
        }
      }
    } else {
      for (let i = 0; i < this.rivals.length; i++) {
        const r = this.rivals[i];
        if (r.veh && r.vin && typeof vehicleStep === 'function') {
          vehicleStep(r.keys || 0, r.veh, r.vin);
        }
        if (r.veh) {
          const laps = r.veh.laps || 0;
          const lapSeen = r.lapSeen || 0;
          if (laps > lapSeen) {
            const t = r.veh.time;
            if (lapSeen > 0 || (r.lapStart !== undefined && r.lapStart >= 0)) {
              const lt = t - (r.lapStart || 0);
              if (lt > 5.0) {
                r.lastLapTime = lt;
                if (!r.bestLapTime || r.bestLapTime < 0 || lt < r.bestLapTime) {
                  r.bestLapTime = lt;
                }
              }
            }
            r.lapStart = t;
            r.lapSeen = laps;
          }
        }
      }
    }

    // Colisiones físicas entre jugador y rivales
    if (typeof vehicleCarCollide === 'function' && playerVeh) {
      for (let i = 0; i < this.rivals.length; i++) {
        const r = this.rivals[i];
        if (r.veh) {
          vehicleCarCollide(playerVeh, r.veh);
        }
      }

      // Colisiones físicas entre rivales entre sí
      for (let i = 0; i < this.rivals.length; i++) {
        for (let j = i + 1; j < this.rivals.length; j++) {
          if (this.rivals[i].veh && this.rivals[j].veh) {
            vehicleCarCollide(this.rivals[i].veh, this.rivals[j].veh);
          }
        }
      }
    }
  }

  /**
   * Interpola poses y actualiza matrices de ruedas y carrocería para el renderizador.
   */
  poseAll(al) {
    if (typeof poseRival !== 'function') return;
    for (let i = 0; i < this.rivals.length; i++) {
      const r = this.rivals[i];
      if (r.model && r.veh && r.gs) {
        poseRival(r.model, r.veh, r.gs, r.keys || 0, al);
      }
    }
  }

  /**
   * Construye los modelos 3D de todos los rivales para WebGPU.
   */
  async buildAll() {
    for (let i = 0; i < this.rivals.length; i++) {
      const r = this.rivals[i];
      if (r.model && typeof r.model.build === 'function' && !r.model.built) {
        await r.model.build();
        r.model.built = true;
      }
    }
  }
}

const gridManagerInstance = new GridManager();

if (typeof window !== 'undefined') {
  window.GridManager = GridManager;
  window.gridManagerInstance = gridManagerInstance;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GridManager, gridManagerInstance };
}
