'use strict';
/**
 * ============================================================================
 * COMPONENTES VISUALES DEL HUD (game/hud-components.js)
 * ============================================================================
 * Patrón: COMPOSITE / COMPONENT
 * Responsabilidad Única (SRP):
 * - Cada componente renderiza su sección específica del HUD de manera aislada,
 *   con tipografía espaciada sin solapamientos, modular y reutilizable.
 * - Componentes:
 *   1. CornerAdvisory: Próxima curva (nombre oficial, severidad, distancia y radio).
 *   2. LapTelemetry: Cronometraje de vuelta (vuelta actual, última y mejor vuelta).
 *   3. TimingTower: Torre de clasificación F1 (posiciones P1..P4, deltas y líder).
 *   4. Minimap: Trazado 2D con radar de rivales y distancia recorrida.
 *   5. StartLights: Semáforo oficial FIA de salida.
 */

const HudComponents = {
  /**
   * Formatea un tiempo en segundos o centésimas a formato m:ss.cc
   * @param {number} val - Tiempo en segundos (e.g. 173.02) o centésimas
   * @returns {string} - Cadena formateada e.g. "2:53.02" o "-:--.--"
   */
  formatLapTime(val) {
    if (val === undefined || val === null || val < 0) return '-:--.--';
    const totalCs = Math.round(val > 10000 ? val : val * 100);
    if (totalCs <= 0) return '0:00.00';
    if (totalCs > 599999) return '99:59.99';
    const m = Math.floor(totalCs / 6000);
    const s = Math.floor((totalCs % 6000) / 100);
    const c = Math.floor(totalCs % 100);
    return `${m}:${s < 10 ? '0' : ''}${s}.${c < 10 ? '0' : ''}${c}`;
  },

  /**
   * Componente 1: Aviso de Próxima Curva con Radar Visual Dinámico (Sección 1 del HUD Lateral)
   * Altura nominal: 0 a yS1
   * Integra telemetría a la izquierda y proyección geométrica heading-up del trazado a la derecha.
   */
  CornerAdvisory: (typeof HudCornerAdvisory !== 'undefined' ? HudCornerAdvisory : (typeof require === 'function' ? require('./hud-corner.js') : null)),

  LapTelemetry: {
    draw(m, r, Hh, W, yStart, lapData = {}) {
      const padX = Math.round(r * 0.14);
      m.textAlign = 'left';
      m.textBaseline = 'top';

      // Encabezado de sección
      m.font = '600 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = 'rgba(255, 255, 255, 0.45)';
      m.fillText('TIEMPOS DE VUELTA', padX, yStart + Math.round(r * 0.075));

      const totalLaps = (typeof GAME !== 'undefined' && GAME.totalLaps) ? GAME.totalLaps : null;
      const isFinished = totalLaps && lapData.lapCount >= totalLaps;
      const lapNumber = isFinished ? totalLaps : (lapData.lapCount !== undefined ? lapData.lapCount + 1 : 1);
      m.textAlign = 'right';
      m.font = '700 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = isFinished ? '#4ade80' : '#ff5a36';
      const lapText = isFinished
        ? 'META · ' + totalLaps + '/' + totalLaps
        : ('VUELTA ' + lapNumber + (totalLaps ? ' / ' + totalLaps : ''));
      m.fillText(lapText, W - padX, yStart + Math.round(r * 0.075));

      // Filas de cronometraje perfectamente espaciadas
      const rowStep = Math.round(r * 0.105);
      const rowY0 = yStart + Math.round(r * 0.175);

      const rows = [
        { label: 'VUELTA', time: lapData.curTime, col: '#ffffff' },
        { label: 'ÚLTIMA', time: lapData.lastTime, col: 'rgba(255, 255, 255, 0.85)' },
        { label: 'MEJOR', time: lapData.bestTime, col: '#c084fc' }
      ];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const ry = rowY0 + i * rowStep;

        // Etiqueta a la izquierda
        m.textAlign = 'left';
        m.font = '700 ' + Math.round(r * 0.082) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillStyle = 'rgba(255, 255, 255, 0.50)';
        m.fillText(row.label, padX, ry);

        // Tiempo numérico formateado a la derecha
        m.textAlign = 'right';
        m.font = '800 ' + Math.round(r * 0.092) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillStyle = row.col;
        const timeStr = HudComponents.formatLapTime(row.time);
        m.fillText(timeStr, W - padX, ry);
      }
    }
  },

  /**
   * Componente 3: Torre de Clasificación F1 (Sección 3 del HUD Lateral)
   * Altura nominal: yS2 a yS3
   */
  TimingTower: {
    draw(m, r, Hh, W, yStart, trk, pProg, rivals = [], carShortName = 'GT3') {
      const padX = Math.round(r * 0.14);
      const allCars = [
        { name: `TÚ (${carShortName})`, prog: pProg, isPlayer: true, col: '#ff5a36' }
      ];

      for (let i = 0; i < rivals.length; i++) {
        const rCar = rivals[i];
        if (rCar && rCar.veh) {
          const prog = rCar.veh.laps * trk.L + rCar.veh.lapS;
          allCars.push({ name: rCar.name || `RIVAL`, prog, isPlayer: false, col: rCar.col || '#facc15' });
        }
      }

      allCars.sort((a, b) => b.prog - a.prog);
      const playerIdx = allCars.findIndex(c => c.isPlayer);
      const playerPos = playerIdx + 1;
      const leaderProg = allCars[0].prog;
      const refSpeed = Math.max(15, (typeof VEH !== 'undefined' && VEH.speed > 5) ? VEH.speed : 30);

      // Encabezado de sección
      m.textAlign = 'left';
      m.textBaseline = 'top';
      m.font = '600 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = 'rgba(255, 255, 255, 0.45)';
      m.fillText('POSICIÓN EN CARRERA', padX, yStart + Math.round(r * 0.075));

      // Badge de posición grande a la derecha (P1..P16)
      m.textAlign = 'right';
      m.font = '800 ' + Math.round(r * 0.135) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = playerPos === 1 ? '#4ade80' : playerPos === 2 ? '#facc15' : playerPos === 3 ? '#38bdf8' : '#ef4444';
      m.fillText('P' + playerPos + (allCars.length > 1 ? `/${allCars.length}` : ''), W - padX, yStart + Math.round(r * 0.045));

      // Filas de clasificación estilo F1 Timing Tower (inician DEBAJO del encabezado)
      // En parrillas de hasta 16 coches, muestra un visor dinámico de 4 filas con el líder y tus rivales inmediatos
      const posColors = ['#facc15', '#94a3b8', '#d97706', '#64748b'];
      const rowStartY = yStart + Math.round(r * 0.185);
      const rowStepY = Math.round(r * 0.098);

      let displayIndices = [];
      if (allCars.length <= 4) {
        for (let i = 0; i < allCars.length; i++) displayIndices.push(i);
      } else {
        if (playerIdx < 4) {
          displayIndices = [0, 1, 2, 3];
        } else {
          const ahead = playerIdx - 1;
          const current = playerIdx;
          const behind = playerIdx + 1 < allCars.length ? playerIdx + 1 : playerIdx - 2;
          displayIndices = Array.from(new Set([0, ahead, current, behind])).sort((a, b) => a - b);
        }
      }

      for (let slot = 0; slot < displayIndices.length; slot++) {
        const i = displayIndices[slot];
        const cObj = allCars[i];
        const rowY = rowStartY + slot * rowStepY;
        const isLead = (i === 0);
        const gapM = Math.max(0, leaderProg - cObj.prog);
        const gapSec = (gapM / refSpeed).toFixed(1);

        // Posición
        m.textAlign = 'left';
        m.font = '800 ' + Math.round(r * 0.082) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillStyle = (i === 0) ? '#facc15' : (i === 1) ? '#94a3b8' : (i === 2) ? '#d97706' : '#64748b';
        m.fillText(String(i + 1), padX, rowY);

        // Nombre
        m.font = (cObj.isPlayer ? '800 ' : '600 ') + Math.round(r * 0.082) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillStyle = cObj.isPlayer ? '#ff5a36' : '#ffffff';
        m.fillText(cObj.name, padX + Math.round(r * 0.14), rowY);

        // Delta
        m.textAlign = 'right';
        m.font = '700 ' + Math.round(r * 0.080) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        if (isLead) {
          m.fillStyle = 'rgba(255, 255, 255, 0.45)';
          m.fillText('LÍDER', W - padX, rowY);
        } else {
          m.fillStyle = cObj.isPlayer ? '#facc15' : 'rgba(255, 255, 255, 0.65)';
          m.fillText('+' + gapSec + 's', W - padX, rowY);
        }
      }
    }
  },

  /**
   * Componente: Tabla de Posiciones y Clasificación en Paralelo (HUD Derecho #hp)
   * Diseño compacto de 2 líneas por piloto:
   *  Línea 1: Posición · Piloto · Coche
   *  Línea 2: MEJOR <tiempo> | ÚLTIMA <tiempo>
   */
  LeaderboardTower: (typeof HudLeaderboardTower !== 'undefined' ? HudLeaderboardTower : (typeof require === 'function' ? require('./hud-leaderboard.js') : null)),

  Minimap: {
    draw(m, r, Hh, W, p5, p6, p7, p8, p9, p10, p11) {
      let yStart = 0, mapTrans, playerPos, rivals = [], vehTime = 0, trackName = '', lapProgressStr = '';
      if (typeof p5 === 'number') {
        yStart = p5;
        mapTrans = p6;
        playerPos = p7;
        rivals = p8 || [];
        vehTime = p9 || 0;
        trackName = p10 || '';
        lapProgressStr = p11 || '';
      } else {
        mapTrans = p5;
        playerPos = p6;
        rivals = p7 || [];
        vehTime = p8 || 0;
        lapProgressStr = p9 || '';
      }

      const padX = Math.round(r * 0.14);
      m.textAlign = 'left';
      m.textBaseline = 'top';

      // Encabezado
      m.font = '600 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = 'rgba(255, 255, 255, 0.45)';
      m.fillText('CIRCUITO', padX, yStart + Math.round(r * 0.075));

      if (trackName) {
        m.textAlign = 'right';
        m.font = '700 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillStyle = 'rgba(255, 255, 255, 0.55)';
        m.fillText(trackName.toUpperCase(), W - padX, yStart + Math.round(r * 0.075));
      }

      if (!mapTrans) return;
      const cX = mapTrans[0], cZ = mapTrans[1];
      const midTrackX = mapTrans[2], midTrackZ = mapTrans[3];
      const scale = mapTrans[4];

      // Punto del jugador (pulsante)
      if (playerPos) {
        const px = cX + (playerPos[0] - midTrackX) * scale;
        const py = cZ + (playerPos[2] - midTrackZ) * scale;
        const pulse = 0.5 + 0.5 * Math.sin(vehTime * 6.0);

        m.beginPath();
        m.arc(px, py, r * (0.052 + pulse * 0.02), 0, Math.PI * 2);
        m.fillStyle = 'rgba(255, 90, 54, 0.38)';
        m.fill();

        m.beginPath();
        m.arc(px, py, Math.max(2, r * 0.038), 0, Math.PI * 2);
        m.fillStyle = '#ff5a36';
        m.fill();
        m.lineWidth = Math.max(1, r * 0.012);
        m.strokeStyle = '#ffffff';
        m.stroke();
      }

      // Puntos de los rivales
      for (let i = 0; i < rivals.length; i++) {
        const rd = rivals[i];
        if (!rd.veh) continue;
        const rx = cX + (rd.veh.x - midTrackX) * scale;
        const ry = cZ + (rd.veh.z - midTrackZ) * scale;
        m.beginPath();
        m.arc(rx, ry, Math.max(2, r * 0.035), 0, Math.PI * 2);
        m.fillStyle = rd.col || '#facc15';
        m.fill();
        m.lineWidth = Math.max(1, r * 0.012);
        m.strokeStyle = '#000000';
        m.stroke();
      }

      // Distancia de vuelta en la base
      if (lapProgressStr) {
        m.font = '600 ' + Math.round(r * 0.082) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillStyle = 'rgba(255, 255, 255, 0.55)';
        m.textAlign = 'right';
        m.textBaseline = 'bottom';
        m.fillText(lapProgressStr, W - padX, Hh - Math.round(r * 0.08));
      }
    }
  },

  /**
   * Componente 5: Semáforo Oficial FIA (Deprecado: el semáforo ahora es 100% físico 3D en el arco/pórtico del circuito)
   */
  StartLights: {
    draw(ctx, clights, raceStart) {
        if (clights && clights.style) {
          clights.style.display = 'none';
        }
      }
    }
  };

  if(typeof window !== 'undefined') {
    window.HudComponents = HudComponents;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HudComponents };
}
