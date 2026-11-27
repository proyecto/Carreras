'use strict';
// Componente HUD: Aviso de próxima curva y radar
const HudCornerAdvisory = {
    draw(m, r, Hh, W, trk, s) {
      if (!trk || !trk.N) return;
      const N = trk.N, ds = trk.ds || 5, kl = trk.lineK || trk.k;
      const padX = Math.round(r * 0.12);
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

      // Dimensiones del radar a la derecha
      const radarW = Math.round(r * 1.10);
      const radarH = Math.round(r * 0.74);
      const radarX = W - padX - radarW;
      const radarY = Math.round(r * 0.08);
      const radarR = Math.round(r * 0.05);

      // Anchura máxima disponible para el bloque de texto izquierdo
      const maxTextW = radarX - padX - Math.round(r * 0.05);

      // =========================================================================
      // BLOQUE IZQUIERDO: TELEMETRÍA Y DATOS DE CURVA
      // =========================================================================
      m.textAlign = 'left';
      m.textBaseline = 'top';

      // 1. Etiqueta de estado superior
      m.font = '600 ' + Math.round(r * 0.070) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      m.fillStyle = 'rgba(255, 255, 255, 0.45)';
      let statusLbl = inCorner ? 'EN CURVA' : (nextCorner || maxK > 0.0035 ? 'PRÓXIMA CURVA' : 'TRAMO ACTUAL');
      if (typeof raceDirectorInstance !== 'undefined' && raceDirectorInstance.active && raceDirectorInstance.state === 'countdown') {
        statusLbl = 'SALIDA EN PARRILLA · [ACELERA / ESPACIO: SALIR YA]';
      } else if (typeof raceDirectorInstance !== 'undefined' && raceDirectorInstance.active && raceDirectorInstance.state === 'lights_out') {
        statusLbl = '¡SALIDA DE CARRERA!';
      }
      m.fillText(statusLbl, padX, Math.round(r * 0.075));

      // 2. Nombre prominente de la curva (con auto-escala según maxTextW)
      let cornerName = 'RECTA';
      let nameColor = '#ffffff';
      if (typeof raceDirectorInstance !== 'undefined' && raceDirectorInstance.active && raceDirectorInstance.state === 'countdown') {
        const lights = raceDirectorInstance.lightsCount;
        let dots = '';
        for (let i = 1; i <= 5; i++) dots += (i <= lights ? '🔴 ' : '⚪ ');
        cornerName = dots.trim();
        nameColor = '#ef4444';
      } else if (typeof raceDirectorInstance !== 'undefined' && raceDirectorInstance.active && raceDirectorInstance.state === 'lights_out') {
        cornerName = '¡LUCES FUERA! ¡GO!';
        nameColor = '#4ade80';
      } else if (inCorner) {
        cornerName = inCorner.name ? inCorner.name.toUpperCase() : 'EN CURVA';
        nameColor = '#facc15';
      } else if (nextCorner) {
        cornerName = nextCorner.name ? nextCorner.name.toUpperCase() : 'CURVA ADELANTE';
        nameColor = '#38bdf8';
      } else if (maxK > 0.0035) {
        cornerName = 'CURVA ADELANTE';
        nameColor = 'rgba(255, 255, 255, 0.90)';
      }

      let titleFontSz = Math.round(r * 0.115);
      m.font = '800 ' + titleFontSz + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      if (typeof m.measureText === 'function') {
        while (titleFontSz > 7 && m.measureText(cornerName).width > maxTextW) {
          titleFontSz -= 0.5;
          m.font = '800 ' + titleFontSz + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        }
      }
      m.fillStyle = nameColor;
      m.fillText(cornerName, padX, Math.round(r * 0.180));

      // 3. Indicador de severidad / radio / distancia y velocidad recomendada
      let badgeColor = '#4ade80';
      let radius = 0;
      if (inCorner) {
        const k = inCorner.k !== undefined ? inCorner.k : (inCorner.ang !== undefined ? (inCorner.ang >= 0 ? 1 : -1) : (kl ? kl[i0] : 0));
        const isRight = k >= 0;
        radius = Math.round(inCorner.R || (maxK > 0 ? 1 / maxK : 60));
        const arrow = isRight ? (radius < 55 ? '⤹ R' : '↱ R') : (radius < 55 ? '⤸ L' : '↰ L');
        badgeColor = radius < 55 ? '#ef4444' : radius < 95 ? '#facc15' : '#4ade80';
        m.fillStyle = badgeColor;
        m.font = '700 ' + Math.round(r * 0.095) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText(arrow + ' EN EL ÁPICE', padX, Math.round(r * 0.350));
        m.font = '700 ' + Math.round(r * 0.086) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText('RADIO ' + radius + 'm', padX, Math.round(r * 0.505));
        const vRec = Math.round(Math.sqrt(1.25 * 9.81 * radius) * 3.6);
        m.fillStyle = 'rgba(255, 255, 255, 0.65)';
        m.font = '600 ' + Math.round(r * 0.076) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText('VEL. REC. ~' + vRec + ' km/h', padX, Math.round(r * 0.655));
      } else if (nextCorner) {
        const k = nextCorner.k !== undefined ? nextCorner.k : (nextCorner.ang !== undefined ? (nextCorner.ang >= 0 ? 1 : -1) : apexK);
        const isRight = k >= 0;
        radius = Math.round(nextCorner.R || (maxK > 0 ? 1 / maxK : 60));
        const distM = Math.round(minNextDist);
        const arrow = isRight ? (radius < 55 ? '⤹ R' : '↱ R') : (radius < 55 ? '⤸ L' : '↰ L');
        badgeColor = radius < 55 ? '#ef4444' : radius < 95 ? '#facc15' : '#4ade80';
        m.fillStyle = badgeColor;
        m.font = '700 ' + Math.round(r * 0.095) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText(arrow + ' A ' + distM + 'm', padX, Math.round(r * 0.350));
        m.font = '700 ' + Math.round(r * 0.086) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText('RADIO ' + radius + 'm', padX, Math.round(r * 0.505));
        const vRec = Math.round(Math.sqrt(1.25 * 9.81 * radius) * 3.6);
        m.fillStyle = 'rgba(255, 255, 255, 0.65)';
        m.font = '600 ' + Math.round(r * 0.076) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText('VEL. REC. ~' + vRec + ' km/h', padX, Math.round(r * 0.655));
      } else if (maxK > 0.0035) {
        const isRight = apexK >= 0;
        radius = Math.round(1 / maxK);
        const arrow = isRight ? (radius < 55 ? '⤹ R' : '↱ R') : (radius < 55 ? '⤸ L' : '↰ L');
        badgeColor = radius < 55 ? '#ef4444' : radius < 95 ? '#facc15' : '#4ade80';
        m.fillStyle = badgeColor;
        m.font = '700 ' + Math.round(r * 0.095) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText(arrow + ' A ' + apexDist + 'm', padX, Math.round(r * 0.350));
        m.font = '700 ' + Math.round(r * 0.086) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText('RADIO ' + radius + 'm', padX, Math.round(r * 0.505));
        const vRec = Math.round(Math.sqrt(1.25 * 9.81 * radius) * 3.6);
        m.fillStyle = 'rgba(255, 255, 255, 0.65)';
        m.font = '600 ' + Math.round(r * 0.076) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText('VEL. REC. ~' + vRec + ' km/h', padX, Math.round(r * 0.655));
      } else {
        m.fillStyle = '#4ade80';
        m.font = '700 ' + Math.round(r * 0.095) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText('GAS A FONDO', padX, Math.round(r * 0.350));
        m.fillStyle = 'rgba(255, 255, 255, 0.45)';
        m.font = '600 ' + Math.round(r * 0.076) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
        m.fillText('RECTA DESPEJADA', padX, Math.round(r * 0.505));
      }

      // =========================================================================
      // BLOQUE DERECHO: RADAR VISUAL PROYECTADO DE LA CARRETERA (HEADING-UP)
      // =========================================================================
      if (m.beginPath) {
        m.beginPath();
        if (m.roundRect) m.roundRect(radarX, radarY, radarW, radarH, radarR);
        else if (m.rect) m.rect(radarX, radarY, radarW, radarH);
        m.fillStyle = 'rgba(7, 11, 17, 0.88)';
        m.fill();
        m.lineWidth = Math.max(1, Math.round(r * 0.012));
        m.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        m.stroke();
      }

      if (m.save && m.clip && m.restore) {
        m.save();
        m.beginPath();
        if (m.roundRect) m.roundRect(radarX + 1, radarY + 1, radarW - 2, radarH - 2, radarR);
        else if (m.rect) m.rect(radarX + 1, radarY + 1, radarW - 2, radarH - 2);
        m.clip();

        const rcx = radarX + radarW * 0.5;
        const rcy = radarY + radarH * 0.80;
        const rScale = (radarH * 0.72) / 160;

        // Arcos guía concéntricos de distancia (50m, 100m, 150m)
        if (m.arc && m.stroke) {
          m.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          m.lineWidth = 1;
          if (m.setLineDash) m.setLineDash([2, 3]);
          const guideDists = [50, 100, 150];
          for (let di = 0; di < guideDists.length; di++) {
            const dRadius = guideDists[di] * rScale;
            m.beginPath();
            m.arc(rcx, rcy, dRadius, -Math.PI * 0.85, -Math.PI * 0.15);
            m.stroke();
          }
          if (m.setLineDash) m.setLineDash([]);
        }

        // Proyección del trazado real 3D
        if (trk && trk.x && trk.z && trk.x.length > 1) {
          const carYaw = (typeof GS !== 'undefined' && GS.yaw !== undefined) ? GS.yaw : (typeof VEH !== 'undefined' && VEH.yaw !== undefined ? VEH.yaw : 0);
          const cosY = Math.cos(carYaw), sinY = Math.sin(carYaw);
          const carX = (typeof GS !== 'undefined' && GS.cx !== undefined) ? GS.cx : (typeof VEH !== 'undefined' && VEH.x !== undefined ? VEH.x : 0);
          const carZ = (typeof GS !== 'undefined' && GS.cz !== undefined) ? GS.cz : (typeof VEH !== 'undefined' && VEH.z !== undefined ? VEH.z : 0);
          const hw = Math.max(3.5, (trk.hw || 6) * 1.5);
          const sampleStep = 5;
          const nPts = 38;

          // 1. Cinta de asfalto y bordes
          m.beginPath();
          let first = true;
          for (let p = 0; p < nPts; p++) {
            const dsDist = (p * sampleStep) - 15;
            let sIdx = (Math.floor(curTrackS) + dsDist) % trk.N;
            if (sIdx < 0) sIdx += trk.N;
            const dx = trk.x[sIdx] - carX, dz = trk.z[sIdx] - carZ;
            const lat = -dx * sinY + dz * cosY;
            const fwd = dx * cosY + dz * sinY;
            const sx = rcx + (lat + hw) * rScale;
            const sy = rcy - fwd * rScale;
            if (first) { if (m.moveTo) m.moveTo(sx, sy); first = false; } else { if (m.lineTo) m.lineTo(sx, sy); }
          }
          for (let p = nPts - 1; p >= 0; p--) {
            const dsDist = (p * sampleStep) - 15;
            let sIdx = (Math.floor(curTrackS) + dsDist) % trk.N;
            if (sIdx < 0) sIdx += trk.N;
            const dx = trk.x[sIdx] - carX, dz = trk.z[sIdx] - carZ;
            const lat = -dx * sinY + dz * cosY;
            const fwd = dx * cosY + dz * sinY;
            const sx = rcx + (lat - hw) * rScale;
            const sy = rcy - fwd * rScale;
            if (m.lineTo) m.lineTo(sx, sy);
          }
          if (m.closePath) m.closePath();
          m.fillStyle = 'rgba(32, 42, 56, 0.90)';
          m.fill();
          m.lineWidth = Math.max(1, Math.round(r * 0.014));
          m.strokeStyle = 'rgba(255, 255, 255, 0.50)';
          m.stroke();

          // 2. Línea central discontinua amarilla
          m.beginPath();
          for (let p = 0; p < nPts; p++) {
            const dsDist = (p * sampleStep) - 15;
            let sIdx = (Math.floor(curTrackS) + dsDist) % trk.N;
            if (sIdx < 0) sIdx += trk.N;
            const dx = trk.x[sIdx] - carX, dz = trk.z[sIdx] - carZ;
            const lat = -dx * sinY + dz * cosY;
            const fwd = dx * cosY + dz * sinY;
            const sx = rcx + lat * rScale;
            const sy = rcy - fwd * rScale;
            if (p === 0) { if (m.moveTo) m.moveTo(sx, sy); } else { if (m.lineTo) m.lineTo(sx, sy); }
          }
          m.lineWidth = Math.max(1, Math.round(r * 0.012));
          m.strokeStyle = 'rgba(250, 204, 21, 0.70)';
          if (m.setLineDash) m.setLineDash([Math.round(r * 0.035), Math.round(r * 0.025)]);
          m.stroke();
          if (m.setLineDash) m.setLineDash([]);

          // 3. Indicador luminoso del punto de ápice sobre el trazado
          const targetCorner = inCorner || nextCorner;
          if (targetCorner) {
            const cornerS = targetCorner.s !== undefined ? targetCorner.s : (targetCorner.s0 !== undefined ? targetCorner.s0 + ((targetCorner.s1 - targetCorner.s0) * 0.5 || 0) : 0);
            let dApex = (cornerS - curTrackS + trk.L) % trk.L;
            if (dApex > trk.L * 0.5) dApex -= trk.L;
            if (dApex >= -15 && dApex <= 165) {
              let sApexIdx = Math.round(cornerS) % trk.N;
              if (sApexIdx < 0) sApexIdx += trk.N;
              const dx = trk.x[sApexIdx] - carX, dz = trk.z[sApexIdx] - carZ;
              const lat = -dx * sinY + dz * cosY;
              const fwd = dx * cosY + dz * sinY;
              const asx = rcx + lat * rScale;
              const asy = rcy - fwd * rScale;
              if (m.arc && m.fill) {
                m.beginPath();
                m.arc(asx, asy, Math.max(3, Math.round(r * 0.030)), 0, Math.PI * 2);
                m.fillStyle = badgeColor || '#facc15';
                m.fill();
                m.lineWidth = 1.5;
                m.strokeStyle = '#ffffff';
                m.stroke();
              }
            }
          }
        }

        // 4. Icono del coche del jugador (flecha/chevron apuntando hacia adelante)
        const cw = Math.round(r * 0.040);
        const cl = Math.round(r * 0.065);
        if (m.beginPath && m.moveTo && m.lineTo && m.closePath) {
          m.beginPath();
          m.moveTo(rcx, rcy - cl);
          m.lineTo(rcx - cw, rcy + cl * 0.6);
          m.lineTo(rcx, rcy + cl * 0.2);
          m.lineTo(rcx + cw, rcy + cl * 0.6);
          m.closePath();
          m.fillStyle = '#ff5a36';
          m.fill();
          m.lineWidth = 1.2;
          m.strokeStyle = '#ffffff';
          m.stroke();
        }

        m.restore();
      }
    }
};

if (typeof window !== 'undefined') window.HudCornerAdvisory = HudCornerAdvisory;
if (typeof module !== 'undefined' && module.exports) module.exports = HudCornerAdvisory;
