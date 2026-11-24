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
   * Componente 1: Aviso de Próxima Curva (Sección 1 del HUD Lateral)
   * Altura nominal: 0 a yS1
   */
  CornerAdvisory: {
    draw(m, r, Hh, W, trk, s) {
      if (!trk || !trk.N) return;
      const N = trk.N, ds = trk.ds || 5, kl = trk.lineK || trk.k;
      const padX = Math.round(r * 0.14);
      const curTrackS = ((s % trk.L) + trk.L) % trk.L;
      const i0 = ((Math.floor(s / ds) % N) + N) % N;

      let maxK = 0, apexDist = 0, apexK = 0;
      if (kl) {
        for (let q = 1; q < 120; q++) {
          const kVal = kl[(i0 + q) % N], absK = Math.abs(kVal);
          if (absK > maxK) {
            maxK = absK;
            apexDist = Math.round(q * ds);
            apexK = kVal;
          }
        }
      }

      // Detección de curva oficial FIA (lookahead amplio a 650m)
      const corners = (trk.corners && trk.corners.length) ? trk.corners : ((trk.spec && trk.spec.corners) || []);
      let inCorner = null, nextCorner = null, minNextDist = 1e9;
      if (Array.isArray(corners)) {
        for (let c = 0; c < corners.length; c++) {
          const corner = corners[c];
          const s0 = corner.s0 !== undefined ? corner.s0 : corner.s;
          const s1 = corner.s1 !== undefined ? corner.s1 : (s0 !== undefined ? s0 + 30 : 0);
          if (s0 !== undefined && s1 !== undefined) {
            if (s0 <= s1) {
              if (curTrackS >= s0 - 6 && curTrackS <= s1 + 6) { inCorner = corner; break; }
            } else {
              if (curTrackS >= s0 - 6 || curTrackS <= s1 + 6) { inCorner = corner; break; }
            }
          }
        }
        if (!inCorner) {
          for (let c = 0; c < corners.length; c++) {
            const corner = corners[c];
            const cS = corner.s0 !== undefined ? corner.s0 : corner.s;
            if (cS === undefined) continue;
            let d = (cS - curTrackS + trk.L) % trk.L;
            if (d > 0 && d < 650 && d < minNextDist) {
              minNextDist = d;
              nextCorner = corner;
            }
          }
        }
      }

      m.textAlign = 'left';
      m.textBaseline = 'top';

      // 1. Etiqueta de encabezado superior (no solapada)
      m.font = '600 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = 'rgba(255, 255, 255, 0.45)';
      m.fillText(inCorner ? 'EN CURVA' : (nextCorner || maxK > 0.0035 ? 'PRÓXIMA CURVA' : 'TRAMO ACTUAL'), padX, Math.round(r * 0.075));

      // 2. Nombre prominente de la curva (línea intermedia con ajuste de ancho)
      let cornerName = 'RECTA';
      let nameColor = '#ffffff';
      if (inCorner) {
        cornerName = inCorner.name ? inCorner.name.toUpperCase() : 'EN CURVA';
        nameColor = '#facc15';
      } else if (nextCorner) {
        cornerName = nextCorner.name ? nextCorner.name.toUpperCase() : 'CURVA ADELANTE';
        nameColor = '#38bdf8';
      } else if (maxK > 0.0035) {
        cornerName = 'CURVA ADELANTE';
        nameColor = 'rgba(255, 255, 255, 0.90)';
      }

      let titleFontSz = Math.round(r * 0.125);
      m.font = '800 ' + titleFontSz + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      if (typeof m.measureText === 'function') {
        const maxTitleW = W - padX * 2;
        while (titleFontSz > 7 && m.measureText(cornerName).width > maxTitleW) {
          titleFontSz -= 0.5;
          m.font = '800 ' + titleFontSz + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        }
      }
      m.fillStyle = nameColor;
      m.fillText(cornerName, padX, Math.round(r * 0.180));

      // 3. Indicador de severidad / radio / distancia (línea inferior con flecha y color codificado)
      if (inCorner) {
        const k = inCorner.k !== undefined ? inCorner.k : (inCorner.ang !== undefined ? (inCorner.ang >= 0 ? 1 : -1) : (kl ? kl[i0] : 0));
        const isRight = k >= 0;
        const radius = Math.round(inCorner.R || (maxK > 0 ? 1 / maxK : 60));
        const arrow = isRight ? (radius < 55 ? '⤹ R' : '↱ R') : (radius < 55 ? '⤸ L' : '↰ L');
        const badgeColor = radius < 55 ? '#ef4444' : radius < 95 ? '#facc15' : '#4ade80';
        m.fillStyle = badgeColor;
        m.font = '700 ' + Math.round(r * 0.098) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText(arrow + ' EN EL ÁPICE · R ' + radius + 'm', padX, Math.round(r * 0.320));
      } else if (nextCorner) {
        const k = nextCorner.k !== undefined ? nextCorner.k : (nextCorner.ang !== undefined ? (nextCorner.ang >= 0 ? 1 : -1) : apexK);
        const isRight = k >= 0;
        const radius = Math.round(nextCorner.R || (maxK > 0 ? 1 / maxK : 60));
        const distM = Math.round(minNextDist);
        const arrow = isRight ? (radius < 55 ? '⤹ R' : '↱ R') : (radius < 55 ? '⤸ L' : '↰ L');
        const badgeColor = radius < 55 ? '#ef4444' : radius < 95 ? '#facc15' : '#4ade80';
        m.fillStyle = badgeColor;
        m.font = '700 ' + Math.round(r * 0.098) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText(arrow + ' A ' + distM + 'm · R ' + radius + 'm', padX, Math.round(r * 0.320));
      } else if (maxK > 0.0035) {
        const isRight = apexK >= 0;
        const radius = Math.round(1 / maxK);
        const arrow = isRight ? (radius < 55 ? '⤹ R' : '↱ R') : (radius < 55 ? '⤸ L' : '↰ L');
        const badgeColor = radius < 55 ? '#ef4444' : radius < 95 ? '#facc15' : '#4ade80';
        m.fillStyle = badgeColor;
        m.font = '700 ' + Math.round(r * 0.098) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText(arrow + ' A ' + apexDist + 'm · R ' + radius + 'm', padX, Math.round(r * 0.320));
      } else {
        m.fillStyle = '#4ade80';
        m.font = '700 ' + Math.round(r * 0.095) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText('GAS A FONDO', padX, Math.round(r * 0.320));
      }
    }
  },

  /**
   * Componente 2: Cronometraje y Tiempos de Vuelta (Sección 2 del HUD Lateral)
   * Altura nominal: yS1 a yS2
   */
  LapTelemetry: {
    draw(m, r, Hh, W, yStart, lapData = {}) {
      const padX = Math.round(r * 0.14);
      m.textAlign = 'left';
      m.textBaseline = 'top';

      // Encabezado de sección
      m.font = '600 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = 'rgba(255, 255, 255, 0.45)';
      m.fillText('TIEMPOS DE VUELTA', padX, yStart + Math.round(r * 0.075));

      const lapNumber = (lapData.lapCount !== undefined) ? (lapData.lapCount + 1) : 1;
      m.textAlign = 'right';
      m.font = '700 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = '#ff5a36';
      m.fillText('VUELTA ' + lapNumber, W - padX, yStart + Math.round(r * 0.075));

      // Filas de cronometraje perfectamente espaciadas
      const rowStep = Math.round(r * 0.105);
      const rowY0 = yStart + Math.round(r * 0.175);

      const rows = [
        { label: 'VUELTA', time: lapData.curTime, col: '#ffffff' },
        { label: 'ÚLTIMA', time: lapData.lastTime, col: 'rgba(255, 255, 255, 0.85)' },
        { label: 'MEJOR',  time: lapData.bestTime, col: '#c084fc' }
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

      // Badge de posición grande a la derecha (P1..P4)
      m.textAlign = 'right';
      m.font = '800 ' + Math.round(r * 0.135) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = playerPos === 1 ? '#4ade80' : playerPos === 2 ? '#facc15' : playerPos === 3 ? '#38bdf8' : '#ef4444';
      m.fillText('P' + playerPos, W - padX, yStart + Math.round(r * 0.045));

      // Filas de clasificación estilo F1 Timing Tower (inician DEBAJO del encabezado)
      const posColors = ['#facc15', '#94a3b8', '#d97706', '#64748b'];
      const rowStartY = yStart + Math.round(r * 0.185);
      const rowStepY = Math.round(r * 0.098);

      for (let i = 0; i < allCars.length; i++) {
        const cObj = allCars[i];
        const rowY = rowStartY + i * rowStepY;
        const isLead = (i === 0);
        const gapM = Math.max(0, leaderProg - cObj.prog);
        const gapSec = (gapM / refSpeed).toFixed(1);

        // Posición
        m.textAlign = 'left';
        m.font = '800 ' + Math.round(r * 0.082) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillStyle = posColors[i] || '#ffffff';
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
   * Componente 4: Minimapa del Circuito (Sección 4 del HUD Lateral)
   * Altura nominal: yS3 a Hh
   */
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
   * Componente 5: Semáforo Oficial FIA (5 focos + viseras parasol)
   */
  StartLights: {
    draw(ctx, clights, raceStart) {
      if (!ctx || !clights || !raceStart) return;

      if (!raceStart.active && raceStart.state !== 'lights_out') {
        if (clights.style.display !== 'none') clights.style.display = 'none';
        return;
      }
      if (clights.style.display !== 'block') clights.style.display = 'block';

      const w = clights.width, h = clights.height;
      ctx.clearRect(0, 0, w, h);

      // Marco de la cabina
      ctx.fillStyle = '#090b0e';
      ctx.strokeStyle = '#222831';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(8, 8, w - 16, h - 16, 12);
      ctx.fill();
      ctx.stroke();

      const numPods = 5;
      const podW = (w - 32) / numPods;
      const centerY = h * 0.45;
      const lampR = Math.min(podW * 0.32, h * 0.28);

      for (let i = 0; i < numPods; i++) {
        const cx = 16 + i * podW + podW * 0.5;

        // Visera parasol superior
        ctx.fillStyle = '#14171d';
        ctx.beginPath();
        ctx.arc(cx, centerY - lampR * 0.3, lampR * 1.25, Math.PI, 0);
        ctx.fill();

        // Aro exterior
        ctx.fillStyle = '#1a1f26';
        ctx.beginPath();
        ctx.arc(cx, centerY, lampR + 3, 0, Math.PI * 2);
        ctx.fill();

        // Lámpara
        const isRedLit = (raceStart.state === 'countdown' && (i + 1) <= raceStart.lightsCount);
        const isGreenLit = (raceStart.state === 'lights_out');

        if (isRedLit) {
          ctx.shadowColor = '#ff2222';
          ctx.shadowBlur = 18;
          ctx.fillStyle = '#ff1a1a';
        } else if (isGreenLit) {
          ctx.shadowColor = '#00ff66';
          ctx.shadowBlur = 18;
          ctx.fillStyle = '#00e65c';
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#22262c';
        }

        ctx.beginPath();
        ctx.arc(cx, centerY, lampR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Reflejo lente
        if (isRedLit || isGreenLit) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(cx - lampR * 0.3, centerY - lampR * 0.3, lampR * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Letrero inferior
      ctx.font = '800 ' + Math.round(h * 0.16) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (raceStart.state === 'countdown') {
        ctx.fillStyle = '#facc15';
        ctx.fillText('PREPÁRATE · SALIDA EN BREVE', w * 0.5, h * 0.82);
      } else if (raceStart.state === 'lights_out') {
        ctx.fillStyle = '#4ade80';
        ctx.fillText('¡LUCES FUERA! · ¡SALIDA!', w * 0.5, h * 0.82);
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.HudComponents = HudComponents;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HudComponents };
}
