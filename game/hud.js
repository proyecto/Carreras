'use strict';
// ---- 51_painel.js
// Panel en pantalla: velocímetro, tacómetro, marcha, cronómetro de vuelta, última y mejor vuelta, estadísticas y minimapa con radar de curvas.
// Cuatro lienzos 2D sobre el juego. Cero asignaciones por frame: relojes y trazado estático pre-renderizados.
const HUD = {
  cg: null, ct: null, cs: null, cm: null, cp: null, cmirror: null,
  g: null, t: null, s: null, m: null, p: null,
  face: null, hub: null, bgT: null, bgS: null, bgMap: null,
  mapTrans: new Float64Array(5), // [cX, cZ, midTrackX, midTrackZ, scale]
  A: null, B: null, C: null,
  L: new Int32Array(40), K: new Int32Array(12), acc: new Float64Array(4), stats: false, vis: false,
  V: new Int32Array(6),   // km/h × 10, rpm, marcha, volta atual, última e melhor
};
const HCH = '0123456789:.,-R';

// Atlas numérico: caracteres centrados en celda para evitar oscilaciones
function hudAtlas(px) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), font = '600 ' + px + 'px "Helvetica Neue",Helvetica,Arial,sans-serif', n = HCH.length, w = new Int32Array(n), x = new Int32Array(n);
  g.font = font; let dw = 0, X = 0; for (let i = 0; i < 10; i++) dw = Math.max(dw, Math.ceil(g.measureText(HCH[i]).width));
  for (let i = 0; i < n; i++) { const m = Math.ceil(g.measureText(HCH[i]).width); w[i] = (i < 10 || i > 12 ? Math.max(dw, m) : m) + 2; x[i] = X; X += w[i]; }
  c.width = X; c.height = Math.ceil(px * 1.16); g.font = font; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  for (let i = 0; i < n; i++) g.fillText(HCH[i], x[i] + w[i] / 2, px * 0.94);
  return { c, w, x, h: c.height };
}

function hudInit() {
  const H = HUD;
  H.cg = document.getElementById('hg');
  H.ct = document.getElementById('ht');
  H.cs = document.getElementById('hs');
  H.cm = document.getElementById('hm');
  H.cp = document.getElementById('hp');
  H.cmirror = document.getElementById('hmirror');
  H.cdash = document.getElementById('hdash');
  H.g = H.cg ? H.cg.getContext('2d') : null;
  H.t = H.ct ? H.ct.getContext('2d') : null;
  H.s = H.cs ? H.cs.getContext('2d') : null;
  if (H.cm) H.m = H.cm.getContext('2d');
  if (H.cp) H.p = H.cp.getContext('2d');
  if (H.cdash) {
    const dpr = devicePixelRatio || 1;
    H.cdash.width = Math.round(340 * dpr);
    H.cdash.height = Math.round(155 * dpr);
    H.dash = H.cdash.getContext('2d');
  }
  hudLayout();
  addEventListener('resize', hudLayout);
}

// Franja con etiquetas fijas para números; devuelve canvas de fondo
function hudStrip(cv, labels, widths, units, At, px, o) {
  const dpr = devicePixelRatio || 1, f = document.createElement('canvas'), g = f.getContext('2d'), font = '600 ' + Math.round(px * 0.62) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif', pad = Math.round(px * 0.7), L = HUD.L;
  g.font = font; let X = pad; const xs = [];
  for (let i = 0; i < labels.length; i++) { const lw = g.measureText(labels[i]).width, uw = units[i] ? g.measureText(units[i]).width + px * 0.25 : 0; xs.push(X); L[o + i] = Math.round(X + lw + px * 0.4); X = L[o + i] + widths[i] + uw + pad * 1.3; }
  const W = Math.round(X - pad * 0.3), Hh = Math.round(px * 1.75); f.width = cv.width = W; f.height = cv.height = Hh; cv.style.width = W / dpr + 'px'; cv.style.height = Hh / dpr + 'px';
  g.fillStyle = 'rgba(9,11,14,.62)'; g.beginPath(); g.roundRect(0, 0, W, Hh, Hh * 0.3); g.fill();
  g.font = font; g.textBaseline = 'alphabetic'; g.fillStyle = 'rgba(255,255,255,.62)';
  for (let i = 0; i < labels.length; i++) { g.fillText(labels[i], xs[i], Hh * 0.5 + px * 0.26); if (units[i]) g.fillText(units[i], L[o + i] + widths[i] + px * 0.25, Hh * 0.5 + px * 0.26); }
  L[o + 6] = Math.round((Hh - At.h) / 2); L[o + 7] = W; L[o + 8] = Hh;
  return f;
}

// Pre-renderiza la base visual de la columna lateral (Curva, Telemetría, Posición y Minimapa vertical)
function hudBuildMap(W, Hh, r) {
  const H = HUD;
  const fc = H.bgMap = document.createElement('canvas');
  fc.width = W; fc.height = Hh;
  const g = fc.getContext('2d');

  // Panel estético de cristal oscuro translúcido
  g.beginPath();
  g.roundRect(0, 0, W, Hh, Math.round(Math.min(W, Hh) * 0.09));
  g.fillStyle = 'rgba(9, 11, 14, 0.78)';
  g.fill();
  g.lineWidth = Math.max(1, Math.round(r * 0.016));
  g.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  g.stroke();

  const isHoriz = W > Hh * 2;
  const yS1 = Math.round(r * 0.90);
  const yS2 = Math.round(r * 1.42);

  g.beginPath();
  if (isHoriz) {
    const xS1 = Math.round(W * 0.36);
    const xS2 = Math.round(W * 0.68);
    const padY = Math.round(Hh * 0.12);
    g.moveTo(xS1, padY); g.lineTo(xS1, Hh - padY);
    g.moveTo(xS2, padY); g.lineTo(xS2, Hh - padY);
  } else {
    g.moveTo(Math.round(r * 0.10), yS1);
    g.lineTo(W - Math.round(r * 0.10), yS1);
    g.moveTo(Math.round(r * 0.10), yS2);
    g.lineTo(W - Math.round(r * 0.10), yS2);
  }
  g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  g.lineWidth = Math.max(1, Math.round(r * 0.012));
  g.stroke();

  // Trazado del circuito (Sección 3: columna derecha en horizontal, o inferior en vertical)
  const trk = (typeof TRK !== 'undefined' ? TRK : null);
  if (trk && trk.N > 1 && trk.x && trk.z) {
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (let i = 0; i < trk.N; i += 2) {
      const x = trk.x[i], z = trk.z[i];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const mapMargin = isHoriz ? Math.round(Hh * 0.10) : Math.round(r * 0.16);
    const xMapLeft = isHoriz ? Math.round(W * 0.68) + mapMargin : mapMargin;
    const boxW = isHoriz ? (W - Math.round(W * 0.68) - mapMargin * 2) : (W - mapMargin * 2);
    const yMapTop = isHoriz ? mapMargin : (yS2 + Math.round(r * 0.18));
    const boxH = Hh - yMapTop - mapMargin;
    const spanX = Math.max(10, maxX - minX);
    const spanZ = Math.max(10, maxZ - minZ);
    const scale = Math.min(boxW / spanX, boxH / spanZ);
    const cX = xMapLeft + boxW * 0.5;
    const cZ = yMapTop + boxH * 0.5;
    const midTrackX = (minX + maxX) * 0.5;
    const midTrackZ = (minZ + maxZ) * 0.5;

    H.mapTrans[0] = cX;
    H.mapTrans[1] = cZ;
    H.mapTrans[2] = midTrackX;
    H.mapTrans[3] = midTrackZ;
    H.mapTrans[4] = scale;

    // 1. Asfalto de base (silueta suave de pista)
    g.beginPath();
    for (let i = 0; i < trk.N; i += 2) {
      const sx = cX + (trk.x[i] - midTrackX) * scale;
      const sz = cZ + (trk.z[i] - midTrackZ) * scale;
      if (i === 0) g.moveTo(sx, sz); else g.lineTo(sx, sz);
    }
    g.closePath();
    g.lineWidth = Math.max(3, Math.round(r * 0.046));
    g.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();

    // 2. Línea central nítida
    g.lineWidth = Math.max(1.2, Math.round(r * 0.020));
    g.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    g.stroke();

    // 3. Marca de Meta (línea de salida)
    if (trk.x.length > 0) {
      const sx0 = cX + (trk.x[0] - midTrackX) * scale;
      const sz0 = cZ + (trk.z[0] - midTrackZ) * scale;
      g.beginPath();
      g.arc(sx0, sz0, Math.max(2, Math.round(r * 0.035)), 0, TAU);
      g.fillStyle = '#ffcc00';
      g.fill();
    }
  }
}

function hudLayout() {
  const H = HUD, L = H.L, dpr = devicePixelRatio || 1, r = Math.round(Math.min(Math.max(innerHeight * 0.105, 54), 124) * dpr), W = Math.round(r * 4.5), Hh = Math.round(r * 2.26);
  const A = H.A = hudAtlas(Math.round(r * 0.33)), B = H.B = hudAtlas(Math.round(r * 0.23)), C = H.C = hudAtlas(Math.round(r * 0.17));
  const c = H.cg; c.width = W; c.height = Hh; c.style.width = W / dpr + 'px'; c.style.height = Hh / dpr + 'px';
  const cx1 = Math.round(r * 1.12), cy = Math.round(r * 1.12), cx2 = W - cx1; L[0] = cx1; L[1] = cy; L[2] = cx2; L[3] = r; L[4] = W; L[5] = Hh;
  const fc = H.face = document.createElement('canvas'); fc.width = W; fc.height = Hh; const f = fc.getContext('2d');
  f.textAlign = 'center'; f.textBaseline = 'middle';
  const dial = (cx, max, step, minor, red0, unit) => {
    const ang = v => (145 + 250 * v / max) * PI / 180;
    f.beginPath(); f.arc(cx, cy, r, 0, TAU); f.fillStyle = 'rgba(9,11,14,.66)'; f.fill(); f.lineWidth = r * 0.02; f.strokeStyle = 'rgba(255,255,255,.3)'; f.stroke();
    if (red0) { f.beginPath(); f.arc(cx, cy, r * 0.9, ang(red0), ang(max)); f.lineWidth = r * 0.075; f.strokeStyle = '#d8351c'; f.stroke(); }
    f.fillStyle = '#fff'; f.font = '600 ' + Math.round(r * 0.135) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    for (let k = 0; k <= Math.round(max / minor); k++) {
      const v = k * minor, major = k % Math.round(step / minor) === 0, a = ang(v), co = Math.cos(a), si = Math.sin(a);
      f.beginPath(); f.moveTo(cx + co * r * 0.945, cy + si * r * 0.945); f.lineTo(cx + co * r * (major ? 0.8 : 0.87), cy + si * r * (major ? 0.8 : 0.87)); f.lineWidth = r * (major ? 0.028 : 0.014); f.strokeStyle = 'rgba(255,255,255,.9)'; f.stroke();
      if (major) f.fillText(String(v), cx + co * r * 0.64, cy + si * r * 0.64);
    }
    f.fillStyle = 'rgba(255,255,255,.6)'; f.font = '600 ' + Math.round(r * 0.115) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif'; f.fillText(unit, cx, cy + r * 0.84);
  };
  const ch = (CAR && CAR.hud) || null;
  const maxKmh = (ch && ch.maxKmh) || 200, maxRpm = (ch && ch.maxRpm) || 7, redRpm = (ch && ch.redlineRpm) || 6.25;
  L[8] = maxKmh * 10; L[9] = maxRpm * 1000;
  const kmStep = maxKmh > 240 ? 40 : 20, kmMinor = kmStep / 2;
  dial(cx1, maxKmh, kmStep, kmMinor, 0, 'km/h'); dial(cx2, maxRpm, 1, 0.5, redRpm, 'rpm × 1000');
  const hb = H.hub = document.createElement('canvas'), hr = Math.round(r * 0.085); hb.width = hb.height = hr * 2; const hg = hb.getContext('2d'); hg.beginPath(); hg.arc(hr, hr, hr, 0, TAU); hg.fillStyle = '#16181b'; hg.fill(); hg.lineWidth = hr * 0.25; hg.strokeStyle = '#ff5a36'; hg.stroke();
  L[6] = hr; L[7] = Math.round(cy + r * 0.3);                                   // Radio de cubo; coordenada Y de números principales
  const g = H.g; g.setTransform(1 / 16, 0, 0, 1 / 16, 0, 0); g.lineCap = 'round'; g.lineWidth = Math.round(r * 0.034 * 16); g.strokeStyle = '#ff5a36';

  // Cronómetro (m:ss.cc) colocado en la esquina superior derecha
  const tw = B.w[0] * 5 + B.w[10] + B.w[11];
  const tLabels = (typeof I18N !== 'undefined') ? I18N.t('hud_timer_labels') : ['LAP', 'LAST', 'BEST'];
  const sLabels = (typeof I18N !== 'undefined') ? I18N.t('hud_stats_labels') : ['FPS', 'FRAME', 'GPU'];
  H.bgT = hudStrip(H.ct, tLabels, [tw, tw, tw], ['', '', ''], B, B.h / 1.16, 10);
  H.bgS = hudStrip(H.cs, sLabels, [C.w[0] * 3, C.w[0] * 4 + C.w[12], C.w[0] * 4 + C.w[12]], ['', 'ms', 'ms'], C, C.h / 1.16, 20);
  H.K.fill(-9);

  // HUD de curva y telemetría pegado justo debajo del retrovisor (mismo ancho y alto: 630x100)
  if (H.cm) {
    const mirrorW = 630;
    const mirrorH = 100;
    const mW = Math.round(mirrorW * dpr), mH = Math.round(mirrorH * dpr);
    H.cm.width = mW; H.cm.height = mH;
    H.cm.style.width = mirrorW + 'px'; H.cm.style.height = mirrorH + 'px';
    H.cm.style.top = `calc(1.6vh + ${mirrorH + 4}px)`;
    H.cm.style.left = '50%';
    H.cm.style.right = 'auto';
    H.cm.style.bottom = 'auto';
    H.cm.style.transform = 'translateX(-50%)';
    hudBuildMap(mW, mH, r);
  }

  // Panel lateral derecho en paralelo (Tabla de clasificación: Posición, Piloto, Coche, Mejor y Última vuelta)
  if (H.cp) {
    const pW = Math.round(r * 2.70), pH = Math.round(r * 5.20);
    H.cp.width = pW; H.cp.height = pH;
    H.cp.style.width = pW / dpr + 'px'; H.cp.style.height = pH / dpr + 'px';
    H.cp.style.top = '1.6vh';
    H.cp.style.right = '1.6vh';
    H.cp.style.left = 'auto';
    H.cp.style.bottom = 'auto';
    H.cp.style.transform = 'none';
  }
}

// Copia carácter del atlas a (x, y) en píxeles
function hudCh(g, A, i, x, y, q) { const w = A.w[i]; g.drawImage(A.c, A.x[i], 0, w, A.h, x * q, y * q, w * q, A.h * q); return w; }
// Entero alineado a la derecha sin ceros precedentes
function hudInt(g, A, v, n, x, y, q) { const w = A.w[0]; for (let k = n - 1; k >= 0; k--) { hudCh(g, A, v % 10, x + k * w, y, q); v = (v / 10) | 0; if (v === 0) break; } }
// tempo em centésimos como m:ss.cc; negativo = sem tempo (-:--.--)
function hudTime(g, A, cs, x, y) {
  if (cs > 59999) cs = 59999;
  const no = cs < 0, m = (cs / 6000) | 0, s = ((cs / 100) | 0) % 60, c = cs % 100;
  x += hudCh(g, A, no ? 13 : m, x, y, 1); x += hudCh(g, A, 10, x, y, 1); x += hudCh(g, A, no ? 13 : (s / 10) | 0, x, y, 1); x += hudCh(g, A, no ? 13 : s % 10, x, y, 1);
  x += hudCh(g, A, 11, x, y, 1); x += hudCh(g, A, no ? 13 : (c / 10) | 0, x, y, 1); hudCh(g, A, no ? 13 : c % 10, x, y, 1);
}
// Valor con un decimal en NN,N; negativo = no disponible
function hudDec(g, A, v10, x, y) {
  const w = A.w[0]; if (v10 > 9999) v10 = 9999;
  if (v10 < 0) { hudCh(g, A, 13, x + w * 2, y, 1); hudCh(g, A, 13, x + w * 3 + A.w[12], y, 1); return; }
  hudInt(g, A, (v10 / 10) | 0, 3, x, y, 1); hudCh(g, A, 12, x + w * 3, y, 1); hudCh(g, A, v10 % 10, x + w * 3 + A.w[12], y, 1);
}

// Renderiza la columna lateral izquierda (Curva arriba, Telemetría de vuelta, Minimapa abajo)
function hudDrawMinimap() {
  const H = HUD, m = H.m, trk = (typeof TRK !== 'undefined' ? TRK : null);
  if (!H.cm || !m || !H.bgMap || !trk || trk.N < 2) return;
  const W = H.cm.width, Hh = H.cm.height, r = H.L[3];
  const curM = typeof VEH !== 'undefined' ? VEH.s : 0;
  const curTrackS = ((curM % trk.L) + trk.L) % trk.L;

  const yS1 = Math.round(r * 0.90);
  const yS2 = Math.round(r * 1.42);

  m.clearRect(0, 0, W, Hh);
  m.drawImage(H.bgMap, 0, 0);

  // Datos de tiempos de vuelta
  const curLapSec = (typeof LAP !== 'undefined' && LAP[3] === 1 && typeof VEH !== 'undefined') ? Math.max(0, VEH.time - LAP[0]) : 0;
  const lastLapSec = (typeof LAP !== 'undefined' && LAP[1] > 0) ? LAP[1] : -1;
  const bestLapSec = (typeof LAP !== 'undefined' && LAP[2] > 0) ? LAP[2] : -1;
  const lapCount = (typeof VEH !== 'undefined' && VEH.laps !== undefined) ? VEH.laps : 0;

  // Lista de rivales para minimapa (exclusivamente modelos reales)
  const rivals = [];
  if (typeof GAME !== 'undefined' && GAME.rivalEnabled === false) {
    // Modo práctica en solitario: sin rivales
  } else if (typeof gridManagerInstance !== 'undefined' && gridManagerInstance.rivals && gridManagerInstance.rivals.length) {
    for (const rCar of gridManagerInstance.rivals) {
      if (rCar.veh) rivals.push(rCar);
    }
  } else if (typeof VEH_RIVAL !== 'undefined' && typeof CARS !== 'undefined' && CARS.rival) {
    rivals.push({ veh: VEH_RIVAL, name: CARS.rival.name || 'RIVAL', col: CARS.rival.accent || '#38bdf8' });
  }

  // Modo horizontal compacto (pegado debajo del retrovisor: 3 columnas)
  if (W > Hh * 2) {
    const xS1 = Math.round(W * 0.36);
    const xS2 = Math.round(W * 0.68);
    const padX = Math.round(Hh * 0.14);
    const fSm = Math.max(9, Math.round(Hh * 0.14));
    const fMd = Math.max(11, Math.round(Hh * 0.18));
    const fLg = Math.max(13, Math.round(Hh * 0.22));
    const fmtT = (sec) => {
      if (sec < 0) return '-:--.--';
      const cs = Math.min(59999, Math.round(sec * 100));
      const mn = (cs / 6000) | 0, sc = ((cs / 100) | 0) % 60, cc = cs % 100;
      return `${mn}:${sc < 10 ? '0' : ''}${sc}.${cc < 10 ? '0' : ''}${cc}`;
    };

    // Columna 1: Siguiente curva y nombre
    const corners = (trk.corners && trk.corners.length) ? trk.corners : ((trk.spec && trk.spec.corners) || []);
    let cInfo = null, cDist = 0, inC = false;
    for (let ci = 0; ci < corners.length; ci++) {
      const c = corners[ci], s0 = c.s0 !== undefined ? c.s0 : c.s, s1 = c.s1 !== undefined ? c.s1 : (s0 + 30);
      if (s0 !== undefined && (s0 <= s1 ? (curTrackS >= s0 - 6 && curTrackS <= s1 + 6) : (curTrackS >= s0 - 6 || curTrackS <= s1 + 6))) {
        cInfo = c; inC = true; break;
      }
    }
    if (!cInfo) {
      let minD = 1e9;
      for (let ci = 0; ci < corners.length; ci++) {
        const c = corners[ci], s0 = c.s0 !== undefined ? c.s0 : c.s;
        if (s0 === undefined) continue;
        const d = (s0 - curTrackS + trk.L) % trk.L;
        if (d < minD) { minD = d; cInfo = c; cDist = d; }
      }
    }
    m.textBaseline = 'top';
    m.font = `700 ${fSm}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
    m.fillStyle = inC ? '#ff5a36' : 'rgba(255,255,255,0.6)';
    m.fillText(inC ? 'EN CURVA' : 'PRÓXIMA CURVA', padX, Math.round(Hh * 0.10));

    const cName = cInfo ? (cInfo.name || cInfo.id || 'Curva') : 'Recta';
    let cDir = cInfo && cInfo.dir ? cInfo.dir : 0;
    if (!cDir && cInfo && trk.k) {
      const sMid = Math.floor(((cInfo.s0 !== undefined ? cInfo.s0 : cInfo.s) || 0) % trk.N);
      const kVal = trk.k[sMid < 0 ? sMid + trk.N : sMid] || 0;
      if (Math.abs(kVal) > 0.001) cDir = kVal > 0 ? 1 : -1;
    }
    const dirTxt = cDir ? (cDir < 0 ? '↰ IZQ' : '↱ DER') : '';
    m.font = `700 ${fLg}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
    m.fillStyle = '#ffffff';
    m.fillText(cName, padX, Math.round(Hh * 0.30), xS1 - padX * 2);

    m.font = `600 ${fMd}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
    m.fillStyle = '#facc15';
    const subC = inC ? (dirTxt || 'EN CURVA') : `${dirTxt ? dirTxt + ' · ' : ''}a ${Math.round(cDist)} m`;
    m.fillText(subC.trim(), padX, Math.round(Hh * 0.62), xS1 - padX * 2);

    // Columna 2: Gráfica radar de la próxima curva (heading-up)
    const radPad = Math.round(Hh * 0.10);
    const radarX = xS1 + radPad;
    const radarY = radPad;
    const radarW = (xS2 - xS1) - radPad * 2;
    const radarH = Hh - radPad * 2;
    m.save();
    m.beginPath();
    m.roundRect(radarX, radarY, radarW, radarH, Math.round(Hh * 0.08));
    m.fillStyle = 'rgba(7, 11, 17, 0.88)';
    m.fill();
    m.lineWidth = 1;
    m.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    m.stroke();
    m.clip();

    const rcx = radarX + radarW * 0.5;
    const rcy = radarY + radarH * 0.82;
    const rScale = (radarH * 0.72) / 160;

    // Arcos guía de distancia
    m.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    m.lineWidth = 1;
    for (const distM of [50, 100, 150]) {
      m.beginPath();
      m.arc(rcx, rcy, distM * rScale, Math.PI, 0, false);
      m.stroke();
    }

    // Proyección de la carretera delante del coche
    if (trk.N > 2 && trk.x && trk.z) {
      const i0 = ((Math.floor(curM) % trk.N) + trk.N) % trk.N;
      const i1 = (i0 + 4) % trk.N;
      const fx = trk.x[i1] - trk.x[i0], fz = trk.z[i1] - trk.z[i0];
      const fLen = Math.hypot(fx, fz) || 1;
      const ux = fx / fLen, uz = fz / fLen;
      const rx = -uz, rz = ux;
      const x0 = trk.x[i0], z0 = trk.z[i0];

      m.beginPath();
      for (let ds = 0; ds <= 180; ds += 4) {
        const idx = (i0 + ds) % trk.N;
        const dx = trk.x[idx] - x0, dz = trk.z[idx] - z0;
        const px = rcx + (dx * rx + dz * rz) * rScale;
        const py = rcy - (dx * ux + dz * uz) * rScale;
        if (ds === 0) m.moveTo(px, py); else m.lineTo(px, py);
      }
      m.lineCap = 'round';
      m.lineJoin = 'round';
      m.lineWidth = Math.max(4, Math.round(Hh * 0.07));
      m.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      m.stroke();
      m.lineWidth = Math.max(1.5, Math.round(Hh * 0.025));
      m.strokeStyle = '#facc15';
      m.stroke();
    }

    // Triángulo del coche
    m.beginPath();
    m.moveTo(rcx, rcy - 4);
    m.lineTo(rcx - 3.5, rcy + 3);
    m.lineTo(rcx + 3.5, rcy + 3);
    m.closePath();
    m.fillStyle = '#ff5a36';
    m.fill();
    m.restore();

    // Columna 3: Posición en el minimapa (jugador + rivales)
    const [cX, cZ, midX, midZ, sc] = H.mapTrans;
    if (sc > 0) {
      for (const rv of rivals) {
        if (!rv.veh) continue;
        m.beginPath();
        m.arc(cX + (rv.veh.x - midX) * sc, cZ + (rv.veh.z - midZ) * sc, Math.max(2.5, Hh * 0.035), 0, TAU);
        m.fillStyle = rv.col || '#38bdf8';
        m.fill();
      }
      if (typeof GS !== 'undefined') {
        m.beginPath();
        m.arc(cX + (GS.cx - midX) * sc, cZ + (GS.cz - midZ) * sc, Math.max(3.5, Hh * 0.048), 0, TAU);
        m.fillStyle = '#ff5a36';
        m.fill();
        m.lineWidth = 1.5;
        m.strokeStyle = '#ffffff';
        m.stroke();
      }
    }
    return;
  }

  // Delegación modular con HudComponents (Patrón Composite/Component)
  if (typeof HudComponents !== 'undefined') {
    // SECCIÓN 1: Aviso de próxima curva oficial (0 a yS1)
    HudComponents.CornerAdvisory.draw(m, r, Hh, W, trk, curM);

    // SECCIÓN 2: Telemetría de cronometraje de vuelta (yS1 a yS2)
    HudComponents.LapTelemetry.draw(m, r, Hh, W, yS1, {
      curTime: curLapSec,
      lastTime: lastLapSec,
      bestTime: bestLapSec,
      lapCount: lapCount
    });

    // SECCIÓN 3: Minimapa del circuito con radar de rivales (yS2 a Hh)
    const trackName = (trk.spec && (trk.spec.name || trk.spec.id)) || 'CIRCUITO';
    const distText = ((curM * 0.001) % (trk.L * 0.001)).toFixed(1) + ' / ' + (trk.L * 0.001).toFixed(1) + ' km';
    HudComponents.Minimap.draw(m, r, Hh, W, yS2, H.mapTrans, [GS.cx, GS.cy, GS.cz], rivals, (typeof VEH !== 'undefined' ? VEH.time : 0), trackName, distText);
    return;
  }

  // ---------------------------------------------------------------------------
  // RUTA DE FALLBACK (en caso de no disponer de HudComponents)
  // ---------------------------------------------------------------------------
  const lookAhead = 650;
  const curS = Math.floor(curM);
  let maxK = 0, apexDist = 0, apexK = 0;
  if (trk.k) {
    for (let ds = 15; ds < lookAhead; ds += 5) {
      let sIdx = (curS + ds) % trk.N;
      if (sIdx < 0) sIdx += trk.N;
      const k = trk.k[sIdx];
      const absK = Math.abs(k);
      if (absK > maxK) { maxK = absK; apexK = k; apexDist = ds; }
    }
  }

  const corners = (trk.corners && trk.corners.length) ? trk.corners : ((trk.spec && trk.spec.corners) || []);
  let inCorner = null, nextCorner = null, minNextDist = 1e9;
  for (let ci = 0; ci < corners.length; ci++) {
    const c = corners[ci];
    const s0 = c.s0 !== undefined ? c.s0 : c.s;
    const s1 = c.s1 !== undefined ? c.s1 : (s0 !== undefined ? s0 + 30 : 0);
    if (s0 !== undefined && s1 !== undefined) {
      if (s0 <= s1) {
        if (curTrackS >= (s0 - 6) && curTrackS <= (s1 + 6)) { inCorner = c; break; }
      } else {
        if (curTrackS >= (s0 - 6) || curTrackS <= (s1 + 6)) { inCorner = c; break; }
      }
    }
  }
  if (!inCorner) {
    for (let ci = 0; ci < corners.length; ci++) {
      const c = corners[ci];
      const cS = c.s0 !== undefined ? c.s0 : c.s;
      if (cS === undefined) continue;
      const distToS0 = (cS - curTrackS + trk.L) % trk.L;
      if (distToS0 > 0 && distToS0 < minNextDist && distToS0 < 650) {
        minNextDist = distToS0;
        nextCorner = c;
      }
    }
  }

  const padX = Math.round(r * 0.14);
  m.textAlign = 'left';
  m.textBaseline = 'top';

  // 1. Curva (Sección 1)
  m.font = '600 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  m.fillStyle = 'rgba(255, 255, 255, 0.45)';
  m.fillText(inCorner ? 'EN CURVA' : (nextCorner || maxK > 0.0035 ? 'PRÓXIMA CURVA' : 'TRAMO ACTUAL'), padX, Math.round(r * 0.075));

  let cornerTitle = 'RECTA';
  let titleColor = '#ffffff';
  if (inCorner) { cornerTitle = inCorner.name ? inCorner.name.toUpperCase() : 'EN CURVA'; titleColor = '#facc15'; }
  else if (nextCorner) { cornerTitle = nextCorner.name ? nextCorner.name.toUpperCase() : 'CURVA ADELANTE'; titleColor = '#38bdf8'; }
  else if (maxK > 0.0035) { cornerTitle = 'CURVA ADELANTE'; titleColor = 'rgba(255, 255, 255, 0.90)'; }

  let titleFontSz = Math.round(r * 0.125);
  m.font = '800 ' + titleFontSz + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  if (typeof m.measureText === 'function') {
    const maxTitleW = W - padX * 2;
    while (titleFontSz > 7 && m.measureText(cornerTitle).width > maxTitleW) {
      titleFontSz -= 0.5;
      m.font = '800 ' + titleFontSz + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    }
  }
  m.fillStyle = titleColor;
  m.fillText(cornerTitle, padX, Math.round(r * 0.180));

  if (inCorner) {
    const k = inCorner.k !== undefined ? inCorner.k : (inCorner.ang !== undefined ? (inCorner.ang >= 0 ? 1 : -1) : (trk.k ? trk.k[curS % trk.N] : 0));
    const isRight = k >= 0;
    const radius = Math.round(inCorner.R || (maxK > 0 ? (1 / maxK) : 60));
    const arrow = isRight ? (radius < 55 ? '⤹ R' : '↱ R') : (radius < 55 ? '⤸ L' : '↰ L');
    const badgeColor = radius < 55 ? '#ef4444' : radius < 95 ? '#facc15' : '#4ade80';
    m.fillStyle = badgeColor;
    m.font = '700 ' + Math.round(r * 0.098) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillText(arrow + ' EN EL ÁPICE · R ' + radius + 'm', padX, Math.round(r * 0.320));
  } else if (nextCorner) {
    const k = nextCorner.k !== undefined ? nextCorner.k : (nextCorner.ang !== undefined ? (nextCorner.ang >= 0 ? 1 : -1) : apexK);
    const isRight = k >= 0;
    const radius = Math.round(nextCorner.R || (maxK > 0 ? (1 / maxK) : 60));
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

  // 2. Telemetría de vueltas (Sección 2)
  m.font = '600 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  m.fillStyle = 'rgba(255, 255, 255, 0.45)';
  m.fillText('TIEMPOS DE VUELTA', padX, yS1 + Math.round(r * 0.075));
  m.textAlign = 'right';
  m.font = '700 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  const totalLaps = (typeof GAME !== 'undefined' && GAME.totalLaps) ? GAME.totalLaps : null;
  const isFinished = totalLaps && lapCount >= totalLaps;
  const lapNum = isFinished ? totalLaps : (lapCount + 1);
  const lapTxt = isFinished
    ? 'META · ' + totalLaps + '/' + totalLaps
    : ('VUELTA ' + lapNum + (totalLaps ? ' / ' + totalLaps : ''));
  m.fillStyle = isFinished ? '#4ade80' : '#ff5a36';
  m.fillText(lapTxt, W - padX, yS1 + Math.round(r * 0.075));

  const fmtTime = s => {
    if (s === undefined || s === null || s < 0) return '-:--.--';
    const totalCs = Math.round(s > 10000 ? s : s * 100);
    if (totalCs <= 0) return '0:00.00';
    const min = Math.floor(totalCs / 6000), sec = Math.floor((totalCs % 6000) / 100), cs = Math.floor(totalCs % 100);
    return `${min}:${sec < 10 ? '0' : ''}${sec}.${cs < 10 ? '0' : ''}${cs}`;
  };
  const rowStep = Math.round(r * 0.105);
  const rowY0 = yS1 + Math.round(r * 0.175);
  const tRows = [
    { label: 'VUELTA', time: curLapSec, col: '#ffffff' },
    { label: 'ÚLTIMA', time: lastLapSec, col: 'rgba(255, 255, 255, 0.85)' },
    { label: 'MEJOR', time: bestLapSec, col: '#c084fc' }
  ];
  for (let i = 0; i < tRows.length; i++) {
    const ry = rowY0 + i * rowStep;
    m.textAlign = 'left';
    m.font = '700 ' + Math.round(r * 0.082) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillStyle = 'rgba(255, 255, 255, 0.50)';
    m.fillText(tRows[i].label, padX, ry);
    m.textAlign = 'right';
    m.font = '800 ' + Math.round(r * 0.092) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillStyle = tRows[i].col;
    m.fillText(fmtTime(tRows[i].time), W - padX, ry);
  }

  // 3. Radar Minimapa (Sección 3 ampliada)
  const trackTitle = (trk.spec && (trk.spec.name || trk.spec.id)) || 'CIRCUITO';
  m.textAlign = 'left';
  m.font = '600 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  m.fillStyle = 'rgba(255, 255, 255, 0.45)';
  m.fillText('CIRCUITO', padX, yS2 + Math.round(r * 0.075));
  m.textAlign = 'right';
  m.font = '700 ' + Math.round(r * 0.075) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  m.fillStyle = 'rgba(255, 255, 255, 0.55)';
  m.fillText(trackTitle.toUpperCase(), W - padX, yS2 + Math.round(r * 0.075));

  const cX = H.mapTrans[0], cZ = H.mapTrans[1];
  const midTrackX = H.mapTrans[2], midTrackZ = H.mapTrans[3];
  const scale = H.mapTrans[4];
  const px = cX + (GS.cx - midTrackX) * scale;
  const py = cZ + (GS.cz - midTrackZ) * scale;

  m.beginPath();
  m.arc(px, py, Math.max(2, r * 0.038), 0, TAU);
  m.fillStyle = '#ff5a36';
  m.fill();
}

// Renderiza la tabla de clasificación en el panel derecho (#hp)
