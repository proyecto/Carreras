'use strict';
// Clasificación, relojes (velocidad/RPM) y visibilidad del HUD
function hudDrawLeaderboard() {
  const H = HUD;
  if (!H.cp || !H.p) return;
  const r = H.L[3], W = H.cp.width, Hh = H.cp.height;
  const trk = (typeof TRK !== 'undefined' ? TRK : null);
  if (!trk) return;

  const curProg = (typeof VEH !== 'undefined') ? (VEH.laps * trk.L + VEH.lapS) : 0;
  const pCarName = (typeof CAR !== 'undefined' && CAR && (CAR.name || CAR.id))
    ? (CAR.name || CAR.id)
    : ((typeof CARS !== 'undefined' && CARS.active && CARS.active.name) ? CARS.active.name : 'GT3');
  const pDriverName = (typeof I18N !== 'undefined') ? (I18N.t('hud_player_name') || 'TÚ') : 'TÚ';
  const pBestLap = (typeof LAP !== 'undefined' && LAP[2] > 0) ? LAP[2] : -1;
  const pLastLap = (typeof LAP !== 'undefined' && LAP[1] > 0) ? LAP[1] : -1;

  const allCars = [
    {
      isPlayer: true,
      driverName: pDriverName,
      carName: pCarName,
      prog: curProg,
      curLap: (typeof LAP !== 'undefined' && LAP[3] === 1 && typeof VEH !== 'undefined') ? Math.max(0, VEH.time - LAP[0]) : 0,
      bestLap: pBestLap,
      lastLap: pLastLap,
      col: '#ff5a36'
    }
  ];

  if (typeof GAME === 'undefined' || GAME.rivalEnabled !== false) {
    if (typeof gridManagerInstance !== 'undefined' && gridManagerInstance.rivals && gridManagerInstance.rivals.length) {
      for (let i = 0; i < gridManagerInstance.rivals.length; i++) {
        const rCar = gridManagerInstance.rivals[i];
        if (rCar && rCar.veh) {
          const prog = rCar.veh.laps * trk.L + rCar.veh.lapS;
          allCars.push({
            isPlayer: false,
            driverName: rCar.driverName || rCar.name || `Rival #${i + 1}`,
            carName: rCar.carName || (rCar.model && (rCar.model.name || rCar.model.id)) || 'GT3',
            prog: prog,
            bestLap: (rCar.bestLapTime > 0) ? rCar.bestLapTime : -1,
            lastLap: (rCar.lastLapTime > 0) ? rCar.lastLapTime : -1,
            col: rCar.col || '#facc15'
          });
        }
      }
    } else if (typeof VEH_RIVAL !== 'undefined' && typeof CARS !== 'undefined' && CARS.rival) {
      const rCarObj = CARS.rival;
      const prog = VEH_RIVAL.laps * trk.L + VEH_RIVAL.lapS;
      allCars.push({
        isPlayer: false,
        driverName: 'Rival #1',
        carName: rCarObj.name || rCarObj.id || 'GT3',
        prog: prog,
        bestLap: -1,
        lastLap: -1,
        col: rCarObj.accent || '#38bdf8'
      });
    }
  }

  allCars.sort((a, b) => b.prog - a.prog);
  const totalLaps = (typeof GAME !== 'undefined' && GAME.totalLaps) ? GAME.totalLaps : null;

  if (typeof HudComponents !== 'undefined' && HudComponents.LeaderboardTower) {
    HudComponents.LeaderboardTower.draw(H.p, r, Hh, W, allCars, totalLaps);
  }
}

// Invocado en cada frame: lee el estado (hudRead) y redibuja solo los cambios (hudDraw)
function hudFrame() { hudRead(); hudDraw(); }
function hudRead() {
  const V = HUD.V, L = HUD.L, v = VEH, mK = L[8] || 2000, mR = L[9] || 7000;
  let kmh = GS.speed * 36; if (kmh > mK) kmh = mK; let rpm = v.rpm; if (rpm > mR) rpm = mR;
  V[0] = kmh; V[1] = rpm; V[2] = v.gear; V[3] = LAP[3] === 1 ? (v.time - LAP[0]) * 100 : 0; V[4] = LAP[1] > 0 ? LAP[1] * 100 : -1; V[5] = LAP[2] > 0 ? LAP[2] * 100 : -1;
}

function hudDraw() {
  const isCockpit = (typeof GS !== 'undefined' && GS.cam === 3);
  if (HUD.cmirror && HUD.vis) {
    HUD.cmirror.style.display = isCockpit ? 'none' : 'block';
  }
  if (HUD.cdash) {
    HUD.cdash.style.display = (HUD.vis && isCockpit) ? 'block' : 'none';
    if (HUD.vis && isCockpit) hudDrawDash();
  }
  const H = HUD, L = H.L, K = H.K, V = H.V, an = V[0], ki = ((an + 5) / 10) | 0, ar = (V[1] / 10) | 0, gear = V[2];
  if (ki !== K[0] || an !== K[1] || ar !== K[2] || gear !== K[3]) {
    K[0] = ki; K[1] = an; K[2] = ar; K[3] = gear;
    const g = H.g, A = H.A, r = L[3], cy = L[1], w = A.w[0];
    g.clearRect(0, 0, L[4] * 16, L[5] * 16); g.drawImage(H.face, 0, 0, L[4] * 16, L[5] * 16);
    hudInt(g, A, ki, 3, L[0] - ((w * 3) >> 1), L[7], 16); hudCh(g, A, gear === 0 ? 14 : gear, L[2] - (A.w[gear === 0 ? 14 : gear] >> 1), L[7], 16);
    g.beginPath();
    const mK = L[8] || 2000, mR = (L[9] || 7000) / 10;
    for (let d = 0; d < 2; d++) {
      const a = (145 + (d ? ar * (250 / mR) : an * (250 / mK))) * 0.017453292519943295, co = Math.cos(a), si = Math.sin(a), cx = L[d * 2] * 16, cY = cy * 16, len = r * 16;
      g.moveTo((cx - co * len * 0.16) | 0, (cY - si * len * 0.16) | 0); g.lineTo((cx + co * len * 0.86) | 0, (cY + si * len * 0.86) | 0);
    }
    g.stroke();
    const hr = L[6]; g.drawImage(H.hub, (L[0] - hr) * 16, (cy - hr) * 16, hr * 32, hr * 32); g.drawImage(H.hub, (L[2] - hr) * 16, (cy - hr) * 16, hr * 32, hr * 32);
  }
  const cur = V[3], last = V[4], best = V[5];
  if (cur !== K[4] || last !== K[5] || best !== K[6]) {
    K[4] = cur; K[5] = last; K[6] = best;
    // El cronómetro superior (#ht) ha sido retirado porque toda la información de vuelta
    // ahora reside de forma unificada en el HUD lateral (HudComponents.LapTelemetry).
  }

  // Dibuja la columna lateral izquierda (curva, telemetría y minimapa) y derecha (tabla de clasificación)
  if (H.vis) {
    hudDrawMinimap();
    hudDrawLeaderboard();
  }
}

// Estadísticas de rendimiento (tecla H): promedio de frametimes (ms)
function hudStatsFrame() {
  const H = HUD, a = H.acc; a[0] += RT[3]; a[1]++;
  if (a[0] < 500) return;
  const L = H.L, s = H.s, C = H.C, y = L[26], fps = (a[1] * 1000 / a[0] + 0.5) | 0, ms = (a[0] / a[1] * 10 + 0.5) | 0, gpu = PERF.on && PERF.live[0] > 0 ? (PERF.live[0] * 10 + 0.5) | 0 : -1;
  a[0] = 0; a[1] = 0;
  if (!s || !H.bgS || !H.bgS.width || !H.bgS.height) return;
  s.clearRect(0, 0, L[27], L[28]); s.drawImage(H.bgS, 0, 0); hudInt(s, C, fps > 999 ? 999 : fps, 3, L[20], y, 1); hudDec(s, C, ms, L[21], y); hudDec(s, C, gpu, L[22], y);
}

function hudShow(on) {
  HUD.vis = on;
  HUD.cg.style.display = on ? 'block' : 'none';
  if (HUD.ct) HUD.ct.style.display = 'none'; // El cartel superior se mantiene oculto permanentemente
  if (HUD.cm) HUD.cm.style.display = on ? 'block' : 'none';
  if (HUD.cp) HUD.cp.style.display = on ? 'block' : 'none';
  if (HUD.cmirror) {
    const isCockpit = (typeof GS !== 'undefined' && GS.cam === 3);
    HUD.cmirror.style.display = (on && !isCockpit) ? 'block' : 'none';
    if (HUD.cdash) HUD.cdash.style.display = (on && isCockpit) ? 'block' : 'none';
  }
  HUD.K.fill(-9);
}

function hudStats(on) {
  HUD.stats = on;
  HUD.cs.style.display = on ? 'block' : 'none';
  HUD.acc[0] = 0; HUD.acc[1] = 0;
  if (on) {
    const L = HUD.L;
    HUD.s.clearRect(0, 0, L[27], L[28]);
    HUD.s.drawImage(HUD.bgS, 0, 0);
  }
}
