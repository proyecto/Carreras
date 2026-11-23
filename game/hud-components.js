'use strict';
/**
 * ============================================================================
 * COMPONENTES VISUALES DEL HUD (game/hud-components.js)
 * ============================================================================
 * Patrón: COMPOSITE / COMPONENT
 * Responsabilidad Única (SRP):
 * - Cada componente renderiza su sección específica del HUD de manera aislada,
 *   reutilizable y sin efectos colaterales.
 */

const HudComponents = {
  /**
   * Componente 1: Aviso de Próxima Curva (Sección Superior del HUD Lateral)
   */
  CornerAdvisory: {
    draw(m, r, Hh, W, trk, s) {
      if (!trk || !trk.N) return;
      const N = trk.N, ds = trk.ds, kl = trk.lineK || trk.k;
      if (!kl) return;

      const i0 = ((Math.floor(s / ds) % N) + N) % N;
      let maxK = 0, apexDist = 0, apexK = 0;
      for (let q = 1; q < 50; q++) {
        const kVal = kl[(i0 + q) % N], absK = Math.abs(kVal);
        if (absK > maxK) {
          maxK = absK;
          apexDist = Math.round(q * ds);
          apexK = kVal;
        }
      }

      // Búsqueda de nombre de curva oficial
      let nextCorner = null, minNextDist = 1e9;
      if (Array.isArray(trk.corners)) {
        for (let c = 0; c < trk.corners.length; c++) {
          const corner = trk.corners[c];
          let d = corner.s - s;
          while (d < -trk.L * 0.5) d += trk.L;
          while (d > trk.L * 0.5) d -= trk.L;
          if (d >= -15 && d < 280 && d < minNextDist) {
            minNextDist = d;
            nextCorner = corner;
          }
        }
      }

      m.textAlign = 'left';
      m.textBaseline = 'top';

      // Nombre de la curva
      m.font = '800 ' + Math.round(r * 0.115) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = '#ffffff';
      const cornerName = nextCorner ? nextCorner.name.toUpperCase() : (maxK > 0.005 ? 'CURVA' : 'RECTA');
      m.fillText(cornerName, Math.round(r * 0.14), Math.round(r * 0.08));

      // Indicador de severidad / radio
      if (nextCorner && minNextDist < 12 && minNextDist > -12) {
        const isRight = nextCorner.k >= 0;
        const radius = Math.round(nextCorner.R || (maxK > 0 ? 1 / maxK : 60));
        const arrow = isRight ? '⤹ R' : '⤸ L';
        const badgeColor = radius < 55 ? '#ef4444' : radius < 95 ? '#facc15' : '#4ade80';
        m.fillStyle = badgeColor;
        m.font = '700 ' + Math.round(r * 0.108) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText(arrow + ' EN EL ÁPICE (' + radius + 'm)', Math.round(r * 0.14), Math.round(r * 0.21));
      } else if (nextCorner || maxK > 0.004) {
        const isRight = nextCorner ? (nextCorner.k >= 0) : (apexK > 0);
        const radius = Math.round(nextCorner ? (nextCorner.R || (maxK > 0 ? 1 / maxK : 60)) : (1 / maxK));
        const distM = nextCorner ? Math.round(minNextDist) : apexDist;
        const arrow = isRight ? (radius < 55 ? '⤹ R' : '↱ R') : (radius < 55 ? '⤸ L' : '↰ L');
        const badgeColor = radius < 55 ? '#ef4444' : radius < 95 ? '#facc15' : '#4ade80';
        m.fillStyle = badgeColor;
        m.font = '700 ' + Math.round(r * 0.108) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText(arrow + ' ' + distM + 'm (' + radius + 'm)', Math.round(r * 0.14), Math.round(r * 0.21));
      } else {
        m.fillStyle = 'rgba(255, 255, 255, 0.40)';
        m.font = '600 ' + Math.round(r * 0.102) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText('GAS A FONDO', Math.round(r * 0.14), Math.round(r * 0.21));
      }
    }
  },

  /**
   * Componente 2: Torre de Clasificación F1 (Sección Central del HUD Lateral)
   */
  TimingTower: {
    draw(m, r, Hh, W, yS1, trk, pProg, rivals = [], carShortName = 'GT3') {
      const allCars = [
        { name: `TÚ (${carShortName})`, prog: pProg, isPlayer: true, col: '#ff5a36' }
      ];

      for (let i = 0; i < rivals.length; i++) {
        const rCar = rivals[i];
        if (rCar && rCar.veh) {
          const prog = rCar.veh.laps * trk.L + rCar.veh.lapS;
          allCars.push({ name: rCar.name || `RIVAL #${i + 1}`, prog, isPlayer: false, col: rCar.col || '#facc15' });
        }
      }

      allCars.sort((a, b) => b.prog - a.prog);
      const playerIdx = allCars.findIndex(c => c.isPlayer);
      const playerPos = playerIdx + 1;
      const leaderProg = allCars[0].prog;
      const refSpeed = Math.max(15, (typeof VEH !== 'undefined' && VEH.speed > 5) ? VEH.speed : 30);

      // Badge grande de posición (P1..P4)
      const posBadgeX = W - Math.round(r * 0.14);
      const posBadgeY = yS1 + Math.round(r * 0.14);
      m.textAlign = 'right';
      m.textBaseline = 'top';
      m.font = '800 ' + Math.round(r * 0.17) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = playerPos === 1 ? '#4ade80' : playerPos === 2 ? '#facc15' : playerPos === 3 ? '#38bdf8' : '#ef4444';
      m.fillText('P' + playerPos, posBadgeX, posBadgeY);

      // Filas de clasificación estilo F1 Timing Tower
      const posColors = ['#facc15', '#94a3b8', '#d97706', '#64748b'];
      const rowStartY = yS1 + Math.round(r * 0.08);
      const rowStepY = Math.round(r * 0.105);

      m.textAlign = 'left';
      m.textBaseline = 'top';

      for (let i = 0; i < allCars.length; i++) {
        const cObj = allCars[i];
        const rowY = rowStartY + i * rowStepY;
        const isLead = (i === 0);
        const gapM = Math.max(0, leaderProg - cObj.prog);
        const gapSec = (gapM / refSpeed).toFixed(1);

        // Posición
        m.font = '800 ' + Math.round(r * 0.085) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillStyle = posColors[i] || '#ffffff';
        m.fillText(String(i + 1), Math.round(r * 0.14), rowY);

        // Nombre
        m.font = (cObj.isPlayer ? '800 ' : '600 ') + Math.round(r * 0.085) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillStyle = cObj.isPlayer ? '#ff5a36' : '#ffffff';
        m.fillText(cObj.name, Math.round(r * 0.28), rowY);

        // Delta
        m.font = '700 ' + Math.round(r * 0.082) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        if (isLead) {
          m.fillStyle = 'rgba(255, 255, 255, 0.45)';
          m.fillText('LÍDER', Math.round(r * 1.34), rowY);
        } else {
          m.fillStyle = cObj.isPlayer ? '#facc15' : 'rgba(255, 255, 255, 0.65)';
          m.fillText('+' + gapSec + 's', Math.round(r * 1.34), rowY);
        }
      }
    }
  },

  /**
   * Componente 3: Minimapa del Circuito (Sección Inferior del HUD Lateral)
   */
  Minimap: {
    draw(m, r, Hh, W, mapTrans, playerPos, rivals = [], vehTime = 0, lapProgressStr = '') {
      const cX = mapTrans[0], cZ = mapTrans[1];
      const midTrackX = mapTrans[2], midTrackZ = mapTrans[3];
      const scale = mapTrans[4];

      // Punto del jugador (pulsante)
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
        m.font = '600 ' + Math.round(r * 0.09) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillStyle = 'rgba(255, 255, 255, 0.55)';
        m.textAlign = 'right';
        m.textBaseline = 'bottom';
        m.fillText(lapProgressStr, W - Math.round(r * 0.14), Hh - Math.round(r * 0.08));
      }
    }
  },

  /**
   * Componente 4: Semáforo Oficial FIA (5 focos + viseras parasol)
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
