'use strict';
// ---- 51_painel.js
// Panel en pantalla: velocímetro, tacómetro, marcha, cronómetro de vuelta, última y mejor vuelta, estadísticas y minimapa con radar de curvas.
// Cuatro lienzos 2D sobre el juego. Cero asignaciones por frame: relojes y trazado estático pre-renderizados.
const HUD = {
  cg: null, ct: null, cs: null, cm: null,
  g: null, t: null, s: null, m: null,
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
  H.cmirror = document.getElementById('hmirror');
  H.clights = document.getElementById('hlights');
  H.g = H.cg ? H.cg.getContext('2d') : null;
  H.t = H.ct ? H.ct.getContext('2d') : null;
  H.s = H.cs ? H.cs.getContext('2d') : null;
  if (H.cm) H.m = H.cm.getContext('2d');
  if (H.clights) H.gl = H.clights.getContext('2d');
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

// Pre-renderiza la base visual de la columna lateral (Curva, Posición y Minimapa vertical)
function hudBuildMap(W, Hh, r) {
  const H = HUD;
  const fc = H.bgMap = document.createElement('canvas');
  fc.width = W; fc.height = Hh;
  const g = fc.getContext('2d');

  // Panel estético lateral de cristal oscuro translúcido
  g.beginPath();
  g.roundRect(0, 0, W, Hh, Math.round(r * 0.14));
  g.fillStyle = 'rgba(9, 11, 14, 0.76)';
  g.fill();
  g.lineWidth = Math.max(1, Math.round(r * 0.016));
  g.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  g.stroke();

  // Divisores horizontales entre secciones
  const yS1 = Math.round(Hh * 0.29);
  const yS2 = Math.round(Hh * 0.55);

  g.beginPath();
  g.moveTo(Math.round(r * 0.10), yS1);
  g.lineTo(W - Math.round(r * 0.10), yS1);
  g.moveTo(Math.round(r * 0.10), yS2);
  g.lineTo(W - Math.round(r * 0.10), yS2);
  g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  g.lineWidth = Math.max(1, Math.round(r * 0.012));
  g.stroke();

  // Encabezados estáticos sutiles
  g.fillStyle = 'rgba(255, 255, 255, 0.40)';
  g.font = '600 ' + Math.round(r * 0.088) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText('SIGUIENTE CURVA', Math.round(r * 0.14), Math.round(r * 0.08));
  g.fillText('POSICIÓN EN CARRERA', Math.round(r * 0.14), yS1 + Math.round(r * 0.08));

  const trk = (typeof TRK !== 'undefined' ? TRK : null);
  const trackName = (trk && trk.spec && (trk.spec.name || trk.spec.id)) || 'CIRCUITO';
  g.textAlign = 'right';
  g.fillText(trackName.toUpperCase(), W - Math.round(r * 0.14), yS2 + Math.round(r * 0.08));

  // Trazado del circuito en la Sección 3 (Minimapa inferior)
  if (trk && trk.N > 1 && trk.x && trk.z) {
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (let i = 0; i < trk.N; i += 2) {
      const x = trk.x[i], z = trk.z[i];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const mapMargin = Math.round(r * 0.16);
    const boxW = W - mapMargin * 2;
    const y3Top = yS2 + Math.round(r * 0.22);
    const boxH = Hh - y3Top - mapMargin;
    const spanX = Math.max(10, maxX - minX);
    const spanZ = Math.max(10, maxZ - minZ);
    const scale = Math.min(boxW / spanX, boxH / spanZ);
    const cX = mapMargin + boxW * 0.5;
    const cZ = y3Top + boxH * 0.5;
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

  // Columna lateral izquierda (Siguiente curva arriba, Posición en medio, Minimapa abajo)
  if (H.cm) {
    const mW = Math.round(r * 2.25), mH = Math.round(r * 3.65);
    H.cm.width = mW; H.cm.height = mH;
    H.cm.style.width = mW / dpr + 'px'; H.cm.style.height = mH / dpr + 'px';
    H.cm.style.top = '1.6vh';
    H.cm.style.left = '1.6vh';
    H.cm.style.right = 'auto';
    H.cm.style.bottom = 'auto';
    H.cm.style.transform = 'none';
    hudBuildMap(mW, mH, r);
  }

  // Semáforo de salida FIA
  if (H.clights) {
    const lW = Math.round(r * 4.4), lH = Math.round(r * 1.45);
    H.clights.width = lW; H.clights.height = lH;
    H.clights.style.width = lW / dpr + 'px'; H.clights.style.height = lH / dpr + 'px';
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

// Renderiza la columna lateral (Curva arriba, Clasificación en medio, Minimapa abajo)
function hudDrawMinimap() {
  const H = HUD, m = H.m, trk = (typeof TRK !== 'undefined' ? TRK : null);
  if (!H.cm || !m || !H.bgMap || !trk || trk.N < 2) return;
  const W = H.cm.width, Hh = H.cm.height, r = H.L[3];
  const curM = typeof VEH !== 'undefined' ? VEH.s : 0;
  const curTrackS = ((curM % trk.L) + trk.L) % trk.L;

  m.clearRect(0, 0, W, Hh);
  m.drawImage(H.bgMap, 0, 0);

  // ---------------------------------------------------------------------------
  // SECCIÓN 1: SIGUIENTE CURVA (Top: 0 a yS1)
  // ---------------------------------------------------------------------------
  const yS1 = Math.round(Hh * 0.29);
  const lookAhead = 260;
  const curS = Math.floor(curM);
  let maxK = 0, apexDist = 0, apexK = 0;
  if (trk.k) {
    for (let ds = 15; ds < lookAhead; ds += 5) {
      let sIdx = (curS + ds) % trk.N;
      if (sIdx < 0) sIdx += trk.N;
      const k = trk.k[sIdx];
      const absK = Math.abs(k);
      if (absK > maxK) {
        maxK = absK;
        apexK = k;
        apexDist = ds;
      }
    }
  }

  const corners = (trk.corners && trk.corners.length) ? trk.corners : ((trk.spec && trk.spec.corners) || []);
  let inCorner = null, nextCorner = null, minNextDist = 1e9;
  for (let ci = 0; ci < corners.length; ci++) {
    const c = corners[ci];
    if (c.s0 <= c.s1) {
      if (curTrackS >= (c.s0 - 6) && curTrackS <= (c.s1 + 6)) { inCorner = c; break; }
    } else {
      if (curTrackS >= (c.s0 - 6) || curTrackS <= (c.s1 + 6)) { inCorner = c; break; }
    }
  }
  if (!inCorner) {
    for (let ci = 0; ci < corners.length; ci++) {
      const c = corners[ci];
      const distToS0 = (c.s0 - curTrackS + trk.L) % trk.L;
      if (distToS0 > 0 && distToS0 < minNextDist && distToS0 < 350) {
        minNextDist = distToS0;
        nextCorner = c;
      }
    }
  }

  // Nombre de la curva
  let cornerTitle = 'RECTA';
  let titleColor = 'rgba(255, 255, 255, 0.50)';
  if (inCorner) {
    cornerTitle = inCorner.name ? inCorner.name.toUpperCase() : 'EN CURVA';
    titleColor = '#facc15';
  } else if (nextCorner) {
    cornerTitle = nextCorner.name ? nextCorner.name.toUpperCase() : 'CURVA ADELANTE';
    titleColor = '#38bdf8';
  } else if (maxK > 0.004) {
    cornerTitle = 'CURVA ADELANTE';
    titleColor = 'rgba(255, 255, 255, 0.85)';
  }

  m.textAlign = 'left';
  m.textBaseline = 'top';
  let titleFontSz = Math.round(r * 0.125);
  m.font = '700 ' + titleFontSz + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  const maxTitleW = W - Math.round(r * 0.28);
  while (titleFontSz > 7 && m.measureText(cornerTitle).width > maxTitleW) {
    titleFontSz -= 0.5;
    m.font = '700 ' + titleFontSz + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  }
  m.fillStyle = titleColor;
  m.fillText(cornerTitle, Math.round(r * 0.14), Math.round(r * 0.13));

  // Dirección, radio y distancia
  if (inCorner) {
    const k = inCorner.k ?? (trk.k ? trk.k[Math.floor(curTrackS) % trk.N] : 0);
    const isRight = k >= 0;
    const radius = Math.round(inCorner.R || (maxK > 0 ? (1 / maxK) : 60));
    const arrow = isRight ? (radius < 55 ? '⤹ R' : '↱ R') : (radius < 55 ? '⤸ L' : '↰ L');
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

  // ---------------------------------------------------------------------------
  // SECCIÓN 2: TORRE DE CLASIFICACIÓN / POSICIÓN (yS1 a yS2)
  // ---------------------------------------------------------------------------
  const yS2 = Math.round(Hh * 0.58);
  const pProg = typeof VEH !== 'undefined' ? (VEH.laps * trk.L + VEH.lapS) : 0;
  const carShortName = (typeof CAR !== 'undefined' && CAR.shortName) ? CAR.shortName : 'GT3';

  const allCars = [
    { name: `TÚ (${carShortName})`, prog: pProg, isPlayer: true, col: '#ff5a36' },
    { name: 'RIVAL #7', prog: (typeof VEH_RIVAL !== 'undefined' ? (VEH_RIVAL.laps * trk.L + VEH_RIVAL.lapS) : -1e8), isPlayer: false, col: '#facc15' },
    { name: 'RIVAL #12', prog: (typeof VEH_RIVAL2 !== 'undefined' ? (VEH_RIVAL2.laps * trk.L + VEH_RIVAL2.lapS) : -2e8), isPlayer: false, col: '#38bdf8' },
    { name: 'RIVAL #99', prog: (typeof VEH_RIVAL3 !== 'undefined' ? (VEH_RIVAL3.laps * trk.L + VEH_RIVAL3.lapS) : -3e8), isPlayer: false, col: '#f87171' }
  ];
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

  // Filas de clasificación estilo F1 Timing Tower (4 posiciones)
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

    // Número de posición
    m.font = '800 ' + Math.round(r * 0.085) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillStyle = posColors[i] || '#ffffff';
    m.fillText(String(i + 1), Math.round(r * 0.14), rowY);

    // Nombre del coche (resaltado si es el jugador)
    m.font = (cObj.isPlayer ? '800 ' : '600 ') + Math.round(r * 0.085) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillStyle = cObj.isPlayer ? '#ff5a36' : '#ffffff';
    m.fillText(cObj.name, Math.round(r * 0.28), rowY);

    // Intervalo de tiempo respecto al líder
    m.font = '700 ' + Math.round(r * 0.082) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    if (isLead) {
      m.fillStyle = 'rgba(255, 255, 255, 0.45)';
      m.fillText('LÍDER', Math.round(r * 1.34), rowY);
    } else {
      m.fillStyle = cObj.isPlayer ? '#facc15' : 'rgba(255, 255, 255, 0.65)';
      m.fillText('+' + gapSec + 's', Math.round(r * 1.34), rowY);
    }
  }

  // ---------------------------------------------------------------------------
  // SECCIÓN 3: MINIMAPA DEL CIRCUITO (yS2 a Hh)
  // ---------------------------------------------------------------------------
  const cX = H.mapTrans[0], cZ = H.mapTrans[1];
  const midTrackX = H.mapTrans[2], midTrackZ = H.mapTrans[3];
  const scale = H.mapTrans[4];

  // Punto del jugador en el mapa
  const px = cX + (GS.cx - midTrackX) * scale;
  const py = cZ + (GS.cz - midTrackZ) * scale;

  const pulse = 0.5 + 0.5 * Math.sin((typeof VEH !== 'undefined' ? VEH.time : 0) * 6.0);
  m.beginPath();
  m.arc(px, py, r * (0.052 + pulse * 0.02), 0, TAU);
  m.fillStyle = 'rgba(255, 90, 54, 0.38)';
  m.fill();

  m.beginPath();
  m.arc(px, py, Math.max(2, r * 0.038), 0, TAU);
  m.fillStyle = '#ff5a36';
  m.fill();
  m.lineWidth = Math.max(1, r * 0.012);
  m.strokeStyle = '#ffffff';
  m.stroke();

  // Puntos de los rivales en el mapa
  if (typeof GAME === 'undefined' || GAME.rivalEnabled !== false) {
    const rDots = [
      { v: (typeof VEH_RIVAL !== 'undefined' ? VEH_RIVAL : null), col: '#facc15' },
      { v: (typeof VEH_RIVAL2 !== 'undefined' ? VEH_RIVAL2 : null), col: '#38bdf8' },
      { v: (typeof VEH_RIVAL3 !== 'undefined' ? VEH_RIVAL3 : null), col: '#f87171' }
    ];
    for (const rd of rDots) {
      if (!rd.v) continue;
      const rx = cX + (rd.v.x - midTrackX) * scale;
      const ry = cZ + (rd.v.z - midTrackZ) * scale;
      m.beginPath();
      m.arc(rx, ry, Math.max(2, r * 0.035), 0, TAU);
      m.fillStyle = rd.col;
      m.fill();
      m.lineWidth = Math.max(1, r * 0.012);
      m.strokeStyle = '#000000';
      m.stroke();
    }
  }

  // Distancia recorrida de la vuelta en la base del minimapa
  m.font = '600 ' + Math.round(r * 0.09) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  m.fillStyle = 'rgba(255, 255, 255, 0.55)';
  m.textAlign = 'right';
  m.textBaseline = 'bottom';
  const distText = ((curM * 0.001) % (trk.L * 0.001)).toFixed(1) + ' / ' + (trk.L * 0.001).toFixed(1) + ' km';
  m.fillText(distText, W - Math.round(r * 0.14), Hh - Math.round(r * 0.09));
}

// Renderiza el semáforo de salida FIA de 5 luces rojas/verdes
function hudDrawStartLights() {
  const H = HUD;
  if (!H.clights || !H.gl) return;
  if (typeof RACE_START === 'undefined' || !RACE_START.active) {
    if (H.clights.style.display !== 'none') H.clights.style.display = 'none';
    return;
  }
  if (H.clights.style.display !== 'block') H.clights.style.display = 'block';

  const gl = H.gl, W = H.clights.width, Hh = H.clights.height;
  gl.clearRect(0, 0, W, Hh);

  // Estructura del pórtico FIA
  gl.beginPath();
  gl.roundRect(0, 0, W, Hh, Hh * 0.22);
  gl.fillStyle = 'rgba(10, 12, 16, 0.94)';
  gl.fill();
  gl.lineWidth = Math.max(2, Hh * 0.032);
  gl.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  gl.stroke();

  const nPods = 5;
  const podSpacing = W / (nPods + 1);
  const lampR = Hh * 0.22;
  const lampY = Hh * 0.46;
  const isLightsOut = (RACE_START.state === 'lights_out');
  const count = RACE_START.lightsCount;

  for (let i = 0; i < nPods; i++) {
    const cx = podSpacing * (i + 1);

    // Visera exterior del pod
    gl.beginPath();
    gl.arc(cx, lampY, lampR * 1.32, Math.PI * 1.05, Math.PI * 1.95);
    gl.lineWidth = lampR * 0.22;
    gl.strokeStyle = '#05070a';
    gl.stroke();

    // Fondo del hueco
    gl.beginPath();
    gl.arc(cx, lampY, lampR, 0, TAU);
    gl.fillStyle = '#080a0e';
    gl.fill();
    gl.lineWidth = 2;
    gl.strokeStyle = '#1e2430';
    gl.stroke();

    if (isLightsOut) {
      // Luces verdes de salida
      gl.beginPath();
      gl.arc(cx, lampY, lampR * 0.88, 0, TAU);
      const grad = gl.createRadialGradient(cx, lampY, lampR * 0.15, cx, lampY, lampR * 0.88);
      grad.addColorStop(0, '#86efac');
      grad.addColorStop(0.6, '#22c55e');
      grad.addColorStop(1, '#15803d');
      gl.fillStyle = grad;
      gl.fill();

      // Halo verde brillante
      gl.beginPath();
      gl.arc(cx, lampY, lampR * 1.45, 0, TAU);
      gl.fillStyle = 'rgba(34, 197, 94, 0.35)';
      gl.fill();
    } else {
      const isRedOn = (i < count);
      if (isRedOn) {
        // Lámpara roja encendida
        gl.beginPath();
        gl.arc(cx, lampY, lampR * 0.88, 0, TAU);
        const grad = gl.createRadialGradient(cx, lampY, lampR * 0.15, cx, lampY, lampR * 0.88);
        grad.addColorStop(0, '#fca5a5');
        grad.addColorStop(0.5, '#ef4444');
        grad.addColorStop(1, '#b91c1c');
        gl.fillStyle = grad;
        gl.fill();

        // Halo rojo de alta intensidad
        gl.beginPath();
        gl.arc(cx, lampY, lampR * 1.5, 0, TAU);
        gl.fillStyle = 'rgba(239, 68, 68, 0.38)';
        gl.fill();
      } else {
        // Lámpara apagada
        gl.beginPath();
        gl.arc(cx, lampY, lampR * 0.88, 0, TAU);
        gl.fillStyle = 'rgba(45, 15, 15, 0.45)';
        gl.fill();
      }
    }
  }

  // Rótulo inferior del pórtico
  gl.textAlign = 'center';
  gl.textBaseline = 'bottom';
  gl.font = '700 ' + Math.round(Hh * 0.16) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  if (isLightsOut) {
    gl.fillStyle = '#4ade80';
    gl.fillText('¡LUCES FUERA! · ¡SALIDA!', W * 0.5, Hh - Math.round(Hh * 0.07));
  } else {
    gl.fillStyle = 'rgba(255, 255, 255, 0.70)';
    gl.fillText('PROCEDIMIENTO DE SALIDA FIA', W * 0.5, Hh - Math.round(Hh * 0.07));
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
    K[4] = cur; K[5] = last; K[6] = best; const t = H.t, B = H.B, y = L[16];
    t.clearRect(0, 0, L[17], L[18]); t.drawImage(H.bgT, 0, 0); hudTime(t, B, cur, L[10], y); hudTime(t, B, last, L[11], y); hudTime(t, B, best, L[12], y);
  }

  // Dibuja la columna lateral (curva, posición y minimapa)
  if (H.vis) hudDrawMinimap();

  // Dibuja el semáforo de salida FIA
  hudDrawStartLights();
}

// Estadísticas de rendimiento (tecla H): promedio de frametimes (ms)
function hudStatsFrame() {
  const H = HUD, a = H.acc; a[0] += RT[3]; a[1]++;
  if (a[0] < 500) return;
  const L = H.L, s = H.s, C = H.C, y = L[26], fps = (a[1] * 1000 / a[0] + 0.5) | 0, ms = (a[0] / a[1] * 10 + 0.5) | 0, gpu = PERF.on && PERF.live[0] > 0 ? (PERF.live[0] * 10 + 0.5) | 0 : -1;
  a[0] = 0; a[1] = 0;
  s.clearRect(0, 0, L[27], L[28]); s.drawImage(H.bgS, 0, 0); hudInt(s, C, fps > 999 ? 999 : fps, 3, L[20], y, 1); hudDec(s, C, ms, L[21], y); hudDec(s, C, gpu, L[22], y);
}

function hudShow(on) {
  HUD.vis = on;
  HUD.cg.style.display = HUD.ct.style.display = on ? 'block' : 'none';
  if (HUD.cm) HUD.cm.style.display = on ? 'block' : 'none';
  if (HUD.cmirror) HUD.cmirror.style.display = on ? 'block' : 'none';
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
