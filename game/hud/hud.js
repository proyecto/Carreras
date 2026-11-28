"use strict";
// ---- 51_painel.js
// Panel en pantalla: velocímetro, tacómetro, marcha, cronómetro de vuelta, última y mejor vuelta, estadísticas y minimapa con radar de curvas.
// Cuatro lienzos 2D sobre el juego. Cero asignaciones por frame: relojes y trazado estático pre-renderizados.
const HUD = {
  cg: null,
  ct: null,
  cs: null,
  cm: null,
  cp: null,
  cmirror: null,
  g: null,
  t: null,
  s: null,
  m: null,
  p: null,
  face: null,
  hub: null,
  bgT: null,
  bgS: null,
  bgMap: null,
  mapTrans: new Float64Array(5), // [cX, cZ, midTrackX, midTrackZ, scale]
  A: null,
  B: null,
  C: null,
  L: new Int32Array(40),
  K: new Int32Array(12),
  acc: new Float64Array(4),
  stats: false,
  vis: false,
  V: new Int32Array(6), // km/h × 10, rpm, marcha, volta atual, última e melhor
};
const HCH = "0123456789:.,-R";

// Atlas numérico: caracteres centrados en celda para evitar oscilaciones
function hudAtlas(px) {
  const c = document.createElement("canvas"),
    g = c.getContext("2d"),
    font = "600 " + px + 'px "Helvetica Neue",Helvetica,Arial,sans-serif',
    n = HCH.length,
    w = new Int32Array(n),
    x = new Int32Array(n);
  g.font = font;
  let dw = 0,
    X = 0;
  for (let i = 0; i < 10; i++)
    dw = Math.max(dw, Math.ceil(g.measureText(HCH[i]).width));
  for (let i = 0; i < n; i++) {
    const m = Math.ceil(g.measureText(HCH[i]).width);
    w[i] = (i < 10 || i > 12 ? Math.max(dw, m) : m) + 2;
    x[i] = X;
    X += w[i];
  }
  c.width = X;
  c.height = Math.ceil(px * 1.16);
  g.font = font;
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  for (let i = 0; i < n; i++) g.fillText(HCH[i], x[i] + w[i] / 2, px * 0.94);
  return { c, w, x, h: c.height };
}

function hudInit() {
  const H = HUD;
  H.cg = document.getElementById("hg");
  H.ct = document.getElementById("ht");
  H.cs = document.getElementById("hs");
  H.cm = document.getElementById("hm");
  H.cp = document.getElementById("hp");
  H.cmirror = document.getElementById("hmirror");
  H.cdash = document.getElementById("hdash");
  H.g = H.cg ? H.cg.getContext("2d") : null;
  H.t = H.ct ? H.ct.getContext("2d") : null;
  H.s = H.cs ? H.cs.getContext("2d") : null;
  if (H.cm) H.m = H.cm.getContext("2d");
  if (H.cp) H.p = H.cp.getContext("2d");
  if (H.cdash) {
    const dpr = devicePixelRatio || 1;
    H.cdash.width = Math.round(340 * dpr);
    H.cdash.height = Math.round(155 * dpr);
    H.dash = H.cdash.getContext("2d");
  }
  hudLayout();
  addEventListener("resize", hudLayout);
}

// Franja con etiquetas fijas para números; devuelve canvas de fondo
function hudStrip(cv, labels, widths, units, At, px, o) {
  const dpr = devicePixelRatio || 1,
    f = document.createElement("canvas"),
    g = f.getContext("2d"),
    font =
      "600 " +
      Math.round(px * 0.62) +
      'px "Helvetica Neue",Helvetica,Arial,sans-serif',
    pad = Math.round(px * 0.7),
    L = HUD.L;
  g.font = font;
  let X = pad;
  const xs = [];
  for (let i = 0; i < labels.length; i++) {
    const lw = g.measureText(labels[i]).width,
      uw = units[i] ? g.measureText(units[i]).width + px * 0.25 : 0;
    xs.push(X);
    L[o + i] = Math.round(X + lw + px * 0.4);
    X = L[o + i] + widths[i] + uw + pad * 1.3;
  }
  const W = Math.round(X - pad * 0.3),
    Hh = Math.round(px * 1.75);
  f.width = cv.width = W;
  f.height = cv.height = Hh;
  cv.style.width = W / dpr + "px";
  cv.style.height = Hh / dpr + "px";
  g.fillStyle = "rgba(9,11,14,.62)";
  g.beginPath();
  g.roundRect(0, 0, W, Hh, Hh * 0.3);
  g.fill();
  g.font = font;
  g.textBaseline = "alphabetic";
  g.fillStyle = "rgba(255,255,255,.62)";
  for (let i = 0; i < labels.length; i++) {
    g.fillText(labels[i], xs[i], Hh * 0.5 + px * 0.26);
    if (units[i])
      g.fillText(
        units[i],
        L[o + i] + widths[i] + px * 0.25,
        Hh * 0.5 + px * 0.26,
      );
  }
  L[o + 6] = Math.round((Hh - At.h) / 2);
  L[o + 7] = W;
  L[o + 8] = Hh;
  return f;
}

// Pre-renderiza la base visual de la columna lateral (Curva, Telemetría, Posición y Minimapa vertical)
function hudBuildMap(W, Hh, r) {
  const H = HUD;
  const fc = (H.bgMap = document.createElement("canvas"));
  fc.width = W;
  fc.height = Hh;
  const g = fc.getContext("2d");

  // Panel estético de cristal oscuro translúcido
  g.beginPath();
  g.roundRect(0, 0, W, Hh, Math.round(Math.min(W, Hh) * 0.09));
  g.fillStyle = "rgba(9, 11, 14, 0.78)";
  g.fill();
  g.lineWidth = Math.max(1, Math.round(r * 0.016));
  g.strokeStyle = "rgba(255, 255, 255, 0.16)";
  g.stroke();

  const isHoriz = W > Hh * 2;
  const yS1 = Math.round(r * 0.9);
  const yS2 = Math.round(r * 1.42);

  g.beginPath();
  if (isHoriz) {
    const xS1 = Math.round(W * 0.36);
    const xS2 = Math.round(W * 0.68);
    const padY = Math.round(Hh * 0.12);
    g.moveTo(xS1, padY);
    g.lineTo(xS1, Hh - padY);
    g.moveTo(xS2, padY);
    g.lineTo(xS2, Hh - padY);
  } else {
    g.moveTo(Math.round(r * 0.1), yS1);
    g.lineTo(W - Math.round(r * 0.1), yS1);
    g.moveTo(Math.round(r * 0.1), yS2);
    g.lineTo(W - Math.round(r * 0.1), yS2);
  }
  g.strokeStyle = "rgba(255, 255, 255, 0.12)";
  g.lineWidth = Math.max(1, Math.round(r * 0.012));
  g.stroke();

  // Trazado del circuito (Sección 3: columna derecha en horizontal, o inferior en vertical)
  const trk = typeof TRK !== "undefined" ? TRK : null;
  if (trk && trk.N > 1 && trk.x && trk.z) {
    let minX = 1e9,
      maxX = -1e9,
      minZ = 1e9,
      maxZ = -1e9;
    for (let i = 0; i < trk.N; i += 2) {
      const x = trk.x[i],
        z = trk.z[i];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const mapMargin = isHoriz ? Math.round(Hh * 0.1) : Math.round(r * 0.16);
    const xMapLeft = isHoriz ? Math.round(W * 0.68) + mapMargin : mapMargin;
    const boxW = isHoriz
      ? W - Math.round(W * 0.68) - mapMargin * 2
      : W - mapMargin * 2;
    const yMapTop = isHoriz ? mapMargin : yS2 + Math.round(r * 0.18);
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
      if (i === 0) g.moveTo(sx, sz);
      else g.lineTo(sx, sz);
    }
    g.closePath();
    g.lineWidth = Math.max(3, Math.round(r * 0.046));
    g.strokeStyle = "rgba(255, 255, 255, 0.16)";
    g.lineCap = "round";
    g.lineJoin = "round";
    g.stroke();

    // 2. Línea central nítida
    g.lineWidth = Math.max(1.2, Math.round(r * 0.02));
    g.strokeStyle = "rgba(255, 255, 255, 0.65)";
    g.stroke();

    // 3. Marca de Meta (línea de salida)
    if (trk.x.length > 0) {
      const sx0 = cX + (trk.x[0] - midTrackX) * scale;
      const sz0 = cZ + (trk.z[0] - midTrackZ) * scale;
      g.beginPath();
      g.arc(sx0, sz0, Math.max(2, Math.round(r * 0.035)), 0, TAU);
      g.fillStyle = "#ffcc00";
      g.fill();
    }
  }
}

function hudLayout() {
  const H = HUD,
    L = H.L,
    dpr = devicePixelRatio || 1,
    r = Math.round(Math.min(Math.max(innerHeight * 0.105, 54), 124) * dpr),
    W = Math.round(r * 4.5),
    Hh = Math.round(r * 2.26);
  const A = (H.A = hudAtlas(Math.round(r * 0.33))),
    B = (H.B = hudAtlas(Math.round(r * 0.23))),
    C = (H.C = hudAtlas(Math.round(r * 0.17)));
  const c = H.cg;
  c.width = W;
  c.height = Hh;
  c.style.width = W / dpr + "px";
  c.style.height = Hh / dpr + "px";
  const cx1 = Math.round(r * 1.12),
    cy = Math.round(r * 1.12),
    cx2 = W - cx1;
  L[0] = cx1;
  L[1] = cy;
  L[2] = cx2;
  L[3] = r;
  L[4] = W;
  L[5] = Hh;
  const fc = (H.face = document.createElement("canvas"));
  fc.width = W;
  fc.height = Hh;
  const f = fc.getContext("2d");
  f.textAlign = "center";
  f.textBaseline = "middle";
  const dial = (cx, max, step, minor, red0, unit) => {
    const ang = (v) => ((145 + (250 * v) / max) * PI) / 180;
    f.beginPath();
    f.arc(cx, cy, r, 0, TAU);
    f.fillStyle = "rgba(9,11,14,.66)";
    f.fill();
    f.lineWidth = r * 0.02;
    f.strokeStyle = "rgba(255,255,255,.3)";
    f.stroke();
    if (red0) {
      f.beginPath();
      f.arc(cx, cy, r * 0.9, ang(red0), ang(max));
      f.lineWidth = r * 0.075;
      f.strokeStyle = "#d8351c";
      f.stroke();
    }
    f.fillStyle = "#fff";
    f.font =
      "600 " +
      Math.round(r * 0.135) +
      'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    for (let k = 0; k <= Math.round(max / minor); k++) {
      const v = k * minor,
        major = k % Math.round(step / minor) === 0,
        a = ang(v),
        co = Math.cos(a),
        si = Math.sin(a);
      f.beginPath();
      f.moveTo(cx + co * r * 0.945, cy + si * r * 0.945);
      f.lineTo(
        cx + co * r * (major ? 0.8 : 0.87),
        cy + si * r * (major ? 0.8 : 0.87),
      );
      f.lineWidth = r * (major ? 0.028 : 0.014);
      f.strokeStyle = "rgba(255,255,255,.9)";
      f.stroke();
      if (major) f.fillText(String(v), cx + co * r * 0.64, cy + si * r * 0.64);
    }
    f.fillStyle = "rgba(255,255,255,.6)";
    f.font =
      "600 " +
      Math.round(r * 0.115) +
      'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    f.fillText(unit, cx, cy + r * 0.84);
  };
  const ch = (CAR && CAR.hud) || null;
  const maxKmh = (ch && ch.maxKmh) || 200,
    maxRpm = (ch && ch.maxRpm) || 7,
    redRpm = (ch && ch.redlineRpm) || 6.25;
  L[8] = maxKmh * 10;
  L[9] = maxRpm * 1000;
  const kmStep = maxKmh > 240 ? 40 : 20,
    kmMinor = kmStep / 2;
  dial(cx1, maxKmh, kmStep, kmMinor, 0, "km/h");
  dial(cx2, maxRpm, 1, 0.5, redRpm, "rpm × 1000");
  const hb = (H.hub = document.createElement("canvas")),
    hr = Math.round(r * 0.085);
  hb.width = hb.height = hr * 2;
  const hg = hb.getContext("2d");
  hg.beginPath();
  hg.arc(hr, hr, hr, 0, TAU);
  hg.fillStyle = "#16181b";
  hg.fill();
  hg.lineWidth = hr * 0.25;
  hg.strokeStyle = "#ff5a36";
  hg.stroke();
  L[6] = hr;
  L[7] = Math.round(cy + r * 0.3); // Radio de cubo; coordenada Y de números principales
  const g = H.g;
  g.setTransform(1 / 16, 0, 0, 1 / 16, 0, 0);
  g.lineCap = "round";
  g.lineWidth = Math.round(r * 0.034 * 16);
  g.strokeStyle = "#ff5a36";

  // Cronómetro (m:ss.cc) colocado en la esquina superior derecha
  const tw = B.w[0] * 5 + B.w[10] + B.w[11];
  const tLabels =
    typeof I18N !== "undefined"
      ? I18N.t("hud_timer_labels")
      : ["LAP", "LAST", "BEST"];
  const sLabels =
    typeof I18N !== "undefined"
      ? I18N.t("hud_stats_labels")
      : ["FPS", "FRAME", "GPU"];
  H.bgT = hudStrip(
    H.ct,
    tLabels,
    [tw, tw, tw],
    ["", "", ""],
    B,
    B.h / 1.16,
    10,
  );
  H.bgS = hudStrip(
    H.cs,
    sLabels,
    [C.w[0] * 3, C.w[0] * 4 + C.w[12], C.w[0] * 4 + C.w[12]],
    ["", "ms", "ms"],
    C,
    C.h / 1.16,
    20,
  );
  H.K.fill(-9);

  // HUD de curva y telemetría pegado justo debajo del retrovisor (mismo ancho y alto: 630x100)
  if (H.cm) {
    const mirrorW = 630;
    const mirrorH = 100;
    const mW = Math.round(mirrorW * dpr),
      mH = Math.round(mirrorH * dpr);
    H.cm.width = mW;
    H.cm.height = mH;
    H.cm.style.width = mirrorW + "px";
    H.cm.style.height = mirrorH + "px";
    H.cm.style.top = `calc(1.6vh + ${mirrorH + 4}px)`;
    H.cm.style.left = "50%";
    H.cm.style.right = "auto";
    H.cm.style.bottom = "auto";
    H.cm.style.transform = "translateX(-50%)";
    hudBuildMap(mW, mH, r);
  }

  // Panel lateral derecho en paralelo (Tabla de clasificación: Posición, Piloto, Coche, Mejor y Última vuelta)
  if (H.cp) {
    const pW = Math.round(r * 2.7),
      pH = Math.round(r * 5.2);
    H.cp.width = pW;
    H.cp.height = pH;
    H.cp.style.width = pW / dpr + "px";
    H.cp.style.height = pH / dpr + "px";
    H.cp.style.top = "1.6vh";
    H.cp.style.right = "1.6vh";
    H.cp.style.left = "auto";
    H.cp.style.bottom = "auto";
    H.cp.style.transform = "none";
  }
}

// Copia carácter del atlas a (x, y) en píxeles
function hudCh(g, A, i, x, y, q) {
  const w = A.w[i];
  g.drawImage(A.c, A.x[i], 0, w, A.h, x * q, y * q, w * q, A.h * q);
  return w;
}
// Entero alineado a la derecha sin ceros precedentes
function hudInt(g, A, v, n, x, y, q) {
  const w = A.w[0];
  for (let k = n - 1; k >= 0; k--) {
    hudCh(g, A, v % 10, x + k * w, y, q);
    v = (v / 10) | 0;
    if (v === 0) break;
  }
}
// tempo em centésimos como m:ss.cc; negativo = sem tempo (-:--.--)
function hudTime(g, A, cs, x, y) {
  if (cs > 59999) cs = 59999;
  const no = cs < 0,
    m = (cs / 6000) | 0,
    s = ((cs / 100) | 0) % 60,
    c = cs % 100;
  x += hudCh(g, A, no ? 13 : m, x, y, 1);
  x += hudCh(g, A, 10, x, y, 1);
  x += hudCh(g, A, no ? 13 : (s / 10) | 0, x, y, 1);
  x += hudCh(g, A, no ? 13 : s % 10, x, y, 1);
  x += hudCh(g, A, 11, x, y, 1);
  x += hudCh(g, A, no ? 13 : (c / 10) | 0, x, y, 1);
  hudCh(g, A, no ? 13 : c % 10, x, y, 1);
}
// Valor con un decimal en NN,N; negativo = no disponible
function hudDec(g, A, v10, x, y) {
  const w = A.w[0];
  if (v10 > 9999) v10 = 9999;
  if (v10 < 0) {
    hudCh(g, A, 13, x + w * 2, y, 1);
    hudCh(g, A, 13, x + w * 3 + A.w[12], y, 1);
    return;
  }
  hudInt(g, A, (v10 / 10) | 0, 3, x, y, 1);
  hudCh(g, A, 12, x + w * 3, y, 1);
  hudCh(g, A, v10 % 10, x + w * 3 + A.w[12], y, 1);
}

// Renderiza la columna lateral izquierda (Curva arriba, Telemetría de vuelta, Minimapa abajo)
