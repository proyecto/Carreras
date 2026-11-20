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
  H.g = H.cg.getContext('2d');
  H.t = H.ct.getContext('2d');
  H.s = H.cs.getContext('2d');
  if (H.cm) H.m = H.cm.getContext('2d');
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

// Pre-renderiza la base visual del minimapa y trazado completo
function hudBuildMap(W, Hh, r) {
  const H = HUD;
  const fc = H.bgMap = document.createElement('canvas');
  fc.width = W; fc.height = Hh;
  const g = fc.getContext('2d');

  // Panel estético de cristal oscuro mate unificado
  g.beginPath();
  g.roundRect(0, 0, W, Hh, Math.round(r * 0.16));
  g.fillStyle = 'rgba(9, 11, 14, 0.72)';
  g.fill();
  g.lineWidth = Math.max(1, Math.round(r * 0.02));
  g.strokeStyle = 'rgba(255, 255, 255, 0.20)';
  g.stroke();

  // Divisor central vertical
  const midX = Math.round(W * 0.5);
  g.beginPath();
  g.moveTo(midX, Math.round(r * 0.12));
  g.lineTo(midX, Hh - Math.round(r * 0.12));
  g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  g.lineWidth = Math.max(1, Math.round(r * 0.012));
  g.stroke();

  // Título panel izquierdo (Radar de curva)
  const fontBadge = '600 ' + Math.round(r * 0.105) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  g.font = fontBadge;
  g.fillStyle = 'rgba(255, 255, 255, 0.45)';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText('CURVA ADELANTE', Math.round(r * 0.18), Math.round(r * 0.13));

  // Título panel derecho (Nombre del circuito)
  const trk = (typeof TRK !== 'undefined' ? TRK : null);
  const trackName = (trk && trk.spec && (trk.spec.name || trk.spec.id)) || 'CIRCUITO';
  g.textAlign = 'right';
  g.fillText(trackName.toUpperCase(), W - Math.round(r * 0.18), Math.round(r * 0.13));

  // Cálculo de escala y silueta del circuito en la mitad derecha
  if (trk && trk.N > 1 && trk.x && trk.z) {
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (let i = 0; i < trk.N; i += 2) {
      const x = trk.x[i], z = trk.z[i];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const mapMargin = Math.round(r * 0.24);
    const boxW = (W - midX) - mapMargin * 2;
    const boxH = Hh - mapMargin * 2.2;
    const spanX = Math.max(10, maxX - minX);
    const spanZ = Math.max(10, maxZ - minZ);
    const scale = Math.min(boxW / spanX, boxH / spanZ);
    const cX = midX + mapMargin + boxW * 0.5;
    const cZ = mapMargin * 1.35 + boxH * 0.5;
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
    g.lineWidth = Math.max(3, Math.round(r * 0.055));
    g.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();

    // 2. Línea central nítida
    g.lineWidth = Math.max(1.5, Math.round(r * 0.024));
    g.strokeStyle = 'rgba(255, 255, 255, 0.60)';
    g.stroke();

    // 3. Marca de Meta (línea de salida)
    if (trk.x.length > 0) {
      const sx0 = cX + (trk.x[0] - midTrackX) * scale;
      const sz0 = cZ + (trk.z[0] - midTrackZ) * scale;
      g.beginPath();
      g.arc(sx0, sz0, Math.max(2, Math.round(r * 0.04)), 0, TAU);
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

  // Cronómetro (m:ss.cc) y estadísticas
  const tw = B.w[0] * 5 + B.w[10] + B.w[11];
  const tLabels = (typeof I18N !== 'undefined') ? I18N.t('hud_timer_labels') : ['LAP', 'LAST', 'BEST'];
  const sLabels = (typeof I18N !== 'undefined') ? I18N.t('hud_stats_labels') : ['FPS', 'FRAME', 'GPU'];
  H.bgT = hudStrip(H.ct, tLabels, [tw, tw, tw], ['', '', ''], B, B.h / 1.16, 10);
  H.bgS = hudStrip(H.cs, sLabels, [C.w[0] * 3, C.w[0] * 4 + C.w[12], C.w[0] * 4 + C.w[12]], ['', 'ms', 'ms'], C, C.h / 1.16, 20);
  H.K.fill(-9);

  // Configuración del minimapa (centrado bajo cronómetro #ht)
  if (H.cm) {
    const mW = Math.round(r * 4.2), mH = Math.round(r * 1.85);
    H.cm.width = mW; H.cm.height = mH;
    H.cm.style.width = mW / dpr + 'px'; H.cm.style.height = mH / dpr + 'px';
    const htCssH = H.ct.height / dpr;
    const gap = Math.round(8 * (innerHeight / 1080) * dpr) / dpr;
    H.cm.style.top = 'calc(1.6vh + ' + (htCssH + gap + 4) + 'px)';
    H.cm.style.bottom = 'auto';
    H.cm.style.left = '50%';
    H.cm.style.right = 'auto';
    H.cm.style.transform = 'translateX(-50%)';
    hudBuildMap(mW, mH, r);
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

// Renderiza el radar de curva anticipada y la posición en el minimapa
function hudDrawMinimap() {
  const H = HUD, m = H.m, trk = (typeof TRK !== 'undefined' ? TRK : null);
  if (!H.cm || !m || !H.bgMap || !trk || trk.N < 2) return;
  const W = H.cm.width, Hh = H.cm.height, r = H.L[3];

  m.clearRect(0, 0, W, Hh);
  m.drawImage(H.bgMap, 0, 0);

  // 1. PANEL DERECHO: Posición y progreso del jugador en el circuito completo
  const cX = H.mapTrans[0], cZ = H.mapTrans[1];
  const midTrackX = H.mapTrans[2], midTrackZ = H.mapTrans[3];
  const scale = H.mapTrans[4];

  const px = cX + (GS.cx - midTrackX) * scale;
  const py = cZ + (GS.cz - midTrackZ) * scale;

  // Halo exterior pulsante
  const pulse = 0.5 + 0.5 * Math.sin((typeof VEH !== 'undefined' ? VEH.time : 0) * 6.0);
  m.beginPath();
  m.arc(px, py, r * (0.055 + pulse * 0.02), 0, TAU);
  m.fillStyle = 'rgba(255, 90, 54, 0.35)';
  m.fill();

  // Núcleo del punto del jugador
  m.beginPath();
  m.arc(px, py, Math.max(2, r * 0.04), 0, TAU);
  m.fillStyle = '#ff5a36';
  m.fill();
  m.lineWidth = Math.max(1, r * 0.012);
  m.strokeStyle = '#ffffff';
  m.stroke();

  // Rival IA en el minimapa (punto amarillo de competición #7)
  if ((typeof GAME === 'undefined' || GAME.rivalEnabled !== false) && typeof VEH_RIVAL !== 'undefined') {
    const rx = cX + (VEH_RIVAL.x - midTrackX) * scale;
    const ry = cZ + (VEH_RIVAL.z - midTrackZ) * scale;
    m.beginPath();
    m.arc(rx, ry, Math.max(2, r * 0.038), 0, TAU);
    m.fillStyle = '#facc15';
    m.fill();
    m.lineWidth = Math.max(1, r * 0.012);
    m.strokeStyle = '#000000';
    m.stroke();
  }

  // Posición de carrera en pista (P1 / P2)
  if ((typeof GAME === 'undefined' || GAME.rivalEnabled !== false) && typeof VEH_RIVAL !== 'undefined' && typeof VEH !== 'undefined') {
    const playerProgress = VEH.laps * trk.L + VEH.lapS;
    const rivalProgress = VEH_RIVAL.laps * trk.L + VEH_RIVAL.lapS;
    const isP1 = playerProgress >= rivalProgress;
    m.font = '700 ' + Math.round(r * 0.125) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillStyle = isP1 ? '#4ade80' : '#facc15';
    m.textAlign = 'right';
    m.textBaseline = 'top';
    m.fillText(isP1 ? 'POS: P1' : 'POS: P2', W - Math.round(r * 0.18), Math.round(r * 0.18));
  }

  // Distancia recorrida / longitud de vuelta (e.g. 3.2 / 5.1 km)
  m.font = '600 ' + Math.round(r * 0.11) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  m.fillStyle = 'rgba(255, 255, 255, 0.75)';
  m.textAlign = 'right';
  m.textBaseline = 'bottom';
  const curM = typeof VEH !== 'undefined' ? VEH.s : 0;
  const distText = ((curM * 0.001) % (trk.L * 0.001)).toFixed(1) + ' / ' + (trk.L * 0.001).toFixed(1) + ' km';
  m.fillText(distText, W - Math.round(r * 0.18), Hh - Math.round(r * 0.13));

  // 2. PANEL IZQUIERDO: Radar Dinámico de Curva Anticipada (Heading-Up)
  const rcx = W * 0.25;
  const rcy = Hh * 0.74;
  const carYaw = GS.yaw;
  const cosY = Math.cos(carYaw), sinY = Math.sin(carYaw);
  const midX = Math.round(W * 0.5);

  // Escaneo de curvatura en los próximos 260m
  const curS = Math.floor(curM);
  const lookAhead = 260;
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

  // Indicador de alerta de curva (Distancia, dirección y radio de giro)
  m.textAlign = 'left';
  m.textBaseline = 'top';
  m.font = '700 ' + Math.round(r * 0.13) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  if (maxK > 0.004) {
    const isRight = apexK > 0;
    const radius = Math.round(1 / maxK);
    let badgeColor = '#4ade80'; // verde si es abierta (>100m)
    let arrow = isRight ? '↱ R' : '↰ L';
    if (radius < 55) {
      badgeColor = '#ef4444'; // roja si es cerrada / horquilla (<55m)
      arrow = isRight ? '⤹ R' : '⤸ L';
    } else if (radius < 95) {
      badgeColor = '#facc15'; // amarilla si es media (<95m)
    }
    m.fillStyle = badgeColor;
    m.fillText(arrow + ' ' + apexDist + 'm (' + radius + 'm)', Math.round(r * 0.18), Math.round(r * 0.26));
  } else {
    m.fillStyle = 'rgba(255, 255, 255, 0.45)';
    m.fillText('RECTA', Math.round(r * 0.18), Math.round(r * 0.26));
  }

  // Proyección de la carretera adelante en vista subjetiva (radar)
  const rScale = (Hh * 0.62) / 250;
  const hw = (trk.hw || 6) * 1.8; // realce de anchura para legibilidad a alta velocidad

  m.save();
  // Clip para aislar el radar en la mitad izquierda
  m.beginPath();
  m.rect(Math.round(r * 0.08), Math.round(r * 0.08), midX - Math.round(r * 0.16), Hh - Math.round(r * 0.16));
  m.clip();

  const sampleStep = 6;
  const nPts = 42;

  // Asfalto y bordes proyectados
  m.beginPath();
  let first = true;
  for (let p = 0; p < nPts; p++) {
    const ds = (p * sampleStep) - 20;
    let sIdx = (curS + ds) % trk.N;
    if (sIdx < 0) sIdx += trk.N;
    const dx = trk.x[sIdx] - GS.cx, dz = trk.z[sIdx] - GS.cz;
    const lat = -dx * sinY + dz * cosY;
    const fwd = dx * cosY + dz * sinY;
    const sx = rcx + (lat + hw) * rScale;
    const sy = rcy - fwd * rScale;
    if (first) { m.moveTo(sx, sy); first = false; } else { m.lineTo(sx, sy); }
  }
  for (let p = nPts - 1; p >= 0; p--) {
    const ds = (p * sampleStep) - 20;
    let sIdx = (curS + ds) % trk.N;
    if (sIdx < 0) sIdx += trk.N;
    const dx = trk.x[sIdx] - GS.cx, dz = trk.z[sIdx] - GS.cz;
    const lat = -dx * sinY + dz * cosY;
    const fwd = dx * cosY + dz * sinY;
    const sx = rcx + (lat - hw) * rScale;
    const sy = rcy - fwd * rScale;
    m.lineTo(sx, sy);
  }
  m.closePath();
  m.fillStyle = 'rgba(38, 46, 58, 0.75)';
  m.fill();
  m.lineWidth = Math.max(1, Math.round(r * 0.02));
  m.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  m.stroke();

  // Línea central discontinua
  m.beginPath();
  for (let p = 0; p < nPts; p++) {
    const ds = (p * sampleStep) - 20;
    let sIdx = (curS + ds) % trk.N;
    if (sIdx < 0) sIdx += trk.N;
    const dx = trk.x[sIdx] - GS.cx, dz = trk.z[sIdx] - GS.cz;
    const lat = -dx * sinY + dz * cosY;
    const fwd = dx * cosY + dz * sinY;
    const sx = rcx + lat * rScale;
    const sy = rcy - fwd * rScale;
    if (p === 0) m.moveTo(sx, sy); else m.lineTo(sx, sy);
  }
  m.lineWidth = Math.max(1, Math.round(r * 0.016));
  m.strokeStyle = 'rgba(255, 205, 55, 0.60)';
  m.setLineDash([Math.round(r * 0.05), Math.round(r * 0.035)]);
  m.stroke();
  m.setLineDash([]);

  // Coche del jugador (flecha apuntando hacia adelante)
  const cw = Math.round(r * 0.055);
  const cl = Math.round(r * 0.085);
  m.beginPath();
  m.moveTo(rcx, rcy - cl);
  m.lineTo(rcx - cw, rcy + cl * 0.6);
  m.lineTo(rcx + cw, rcy + cl * 0.6);
  m.closePath();
  m.fillStyle = '#ff5a36';
  m.fill();
  m.lineWidth = 1.5;
  m.strokeStyle = '#ffffff';
  m.stroke();

  // Rival IA en el radar dinámico de curva (si está en el rango visible)
  if ((typeof GAME === 'undefined' || GAME.rivalEnabled !== false) && typeof VEH_RIVAL !== 'undefined') {
    const rdx = VEH_RIVAL.x - GS.cx, rdz = VEH_RIVAL.z - GS.cz;
    const rlat = -rdx * sinY + rdz * cosY;
    const rfwd = rdx * cosY + rdz * sinY;
    if (rfwd > -25 && rfwd < 240) {
      const rsx = rcx + rlat * rScale;
      const rsy = rcy - rfwd * rScale;
      m.beginPath();
      m.arc(rsx, rsy, Math.max(2.5, r * 0.045), 0, TAU);
      m.fillStyle = '#facc15';
      m.fill();
      m.lineWidth = 1.5;
      m.strokeStyle = '#000000';
      m.stroke();
    }
  }

  m.restore();
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

  // Dibuja el minimapa del circuito y radar de curva
  if (H.vis) hudDrawMinimap();
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
