'use strict';
// ---- 33_veg_a_atlas.js
// Vegetación — atlas de follaje procedural generado por canvas 2D con mipmaps de cobertura alfa.
// 8 celdas de textura (4x2): 0 rama de hojas anchas | 1 rama densa de hojas pequeñas | 2 hoja de palmera | 3 fronda de helecho
//                            4 hoja palmada grande   | 5 mata de hierba             | 6 rama dispersa     | 7 hojas grandes brillantes (arbusto)
const VEG_TS = 1024, VEG_TW = 4, VEG_TH = 2;   // Baldosas de 1024x1024 (diseño vectorial sobre canvas 2D)
function vegAtlasBuild() {
  const TS = VEG_TS, W = TS * VEG_TW, H = TS * VEG_TH;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const rnd = mkRng(90210);
  const rr = (a, b) => a + (b - a) * rnd();
  const hsl = (h, s, l, a) => `hsla(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%,${a === undefined ? 1 : a})`;
  // Hoja individual a lo largo de +x: longitud len, semiancho wid
  const leaf = (x, y, ang, len, wid, hue, sat, lig, tipk) => {
    g.save(); g.translate(x, y); g.rotate(ang);
    const k = tipk || 0.72;
    g.fillStyle = hsl(hue, sat, lig);
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.25, -wid * 1.15, len * k, -wid * 0.9, len, 0); g.bezierCurveTo(len * k, wid * 0.9, len * 0.25, wid * 1.15, 0, 0); g.fill();
    // Semiplano iluminado y nervadura central
    g.fillStyle = hsl(hue + 6, sat + 4, lig + 7, 0.55);
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.25, -wid * 1.15, len * k, -wid * 0.9, len, 0); g.closePath(); g.fill();
    g.strokeStyle = hsl(hue + 12, sat - 6, lig + 16, 0.75); g.lineWidth = Math.max(1, wid * 0.09);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.96, 0); g.stroke();
    g.lineWidth = Math.max(0.6, wid * 0.04); g.strokeStyle = hsl(hue + 10, sat - 6, lig + 11, 0.4);
    for (let i = 1; i < 6; i++) { const t = i / 6.5; g.beginPath(); g.moveTo(len * t, 0); g.lineTo(len * (t + 0.14), -wid * 0.8 * (1 - t * 0.6)); g.moveTo(len * t, 0); g.lineTo(len * (t + 0.14), wid * 0.8 * (1 - t * 0.6)); g.stroke(); }
    g.restore();
  };
  const stem = (x0, y0, x1, y1, w, h, l) => { g.strokeStyle = hsl(h || 30, 28, l || 20); g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const tile = (i, fn) => { g.save(); g.beginPath(); g.rect((i % VEG_TW) * TS + 3, Math.floor(i / VEG_TW) * TS + 3, TS - 6, TS - 6); g.clip(); g.translate((i % VEG_TW) * TS, Math.floor(i / VEG_TW) * TS); g.scale(TS / 512, TS / 512); fn(); g.restore(); };
  // rama recursiva con hojas alternas pequeñas. ang = dirección (rad, -PI/2 = hacia arriba)
  const twig = (x, y, ang, len, depth, P) => {
    const n = Math.max(2, Math.round(len / P.step)); let px = x, py = y, a = ang;
    for (let i = 1; i <= n; i++) {
      a += rr(-0.13, 0.13) + (P.droop || 0) * Math.cos(a) * 0.06;
      const nx = px + Math.cos(a) * len / n, ny = py + Math.sin(a) * len / n;
      stem(px, py, nx, ny, Math.max(1, P.stemW * (depth + 0.6) * (1 - i / n * 0.6)), 26, 15);
      px = nx; py = ny;
      const side = i % 2 ? 1 : -1, t = i / n;
      if (depth > 0 && i > 1 && i < n && rnd() < P.branchP) twig(px, py, a + side * rr(0.55, 1.0), len * rr(0.36, 0.56) * (1 - t * 0.45), depth - 1, P);
      if (i < 2 && depth === P.depth) continue;
      for (let q = 0; q < P.perNode; q++) {
        if (rnd() > P.leafP) continue;
        const s2 = q % 2 ? -side : side, L = P.leafL * rr(0.7, 1.2);
        const dk = rnd() < 0.32 ? -10 : 0;   // parte de las hojas en sombra (capa posterior)
        leaf(px, py, a + s2 * rr(0.55, 1.2) + (P.droop || 0) * 0.5 * Math.cos(a), L, L * P.leafW * rr(0.85, 1.15), P.hue + rr(-10, 9) + (rnd() < 0.06 ? -30 : 0), P.sat + rr(-8, 8), P.lig + rr(-5, 6) + dk, P.tipk);
      }
    }
    leaf(px, py, a + rr(-0.2, 0.2), P.leafL * 1.05, P.leafL * P.leafW, P.hue + rr(-8, 8), P.sat, P.lig + rr(-3, 6), P.tipk);
  };
  // massa de folhagem em leque a partir da base: 3 camadas (fundo escuro e cheio → frente clara e rala) dão profundidade
  // y una silueta irregular pero compacta (sin ramas desnudas en estrella).
  const cluster = (P, nTw, fan, lenMin, lenMax) => {
    for (let layer = 0; layer < 3; layer++) {
      const Q = Object.assign({}, P, { lig: P.lig + [-12, -3, 6][layer], sat: P.sat + [-8, 0, 4][layer], leafP: P.leafP * [0.9, 0.85, 0.7][layer], hue: P.hue + [6, 0, -4][layer] });
      for (let k = 0; k < nTw; k++) {
        const u = (k + rr(0.1, 0.9)) / nTw - 0.5, a = -PI / 2 + u * fan;
        twig(256 + u * 70 + rr(-10, 10), 502, a, rr(lenMin * (layer === 2 ? 0.55 : 0.8), lenMax) * (1 - 0.42 * Math.abs(u) * 2), P.depth, Q);
      }
    }
  };
  // 0: masa de hojas anchas
  tile(0, () => cluster({ depth: 2, step: 13, stemW: 1.5, branchP: 0.55, leafL: 20, leafW: 0.42, perNode: 3, leafP: 0.8, hue: 96, sat: 36, lig: 22, tipk: 0.66 }, 6, 2.5, 330, 455));
  // 1: masa densa de hojas menudas
  tile(1, () => cluster({ depth: 2, step: 10.5, stemW: 1.2, branchP: 0.5, leafL: 14.5, leafW: 0.42, perNode: 3, leafP: 0.8, hue: 102, sat: 35, lig: 20, tipk: 0.62 }, 7, 2.6, 330, 460));
  // 2: folha de palmeira (ráquis de baixo para cima, folíolos longos e caídos)
  tile(2, () => {
    const n = 46; let px = 256, py = 506;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = 256 + Math.sin(t * 1.1) * 14, y = 506 - t * 496;
      if (i) stem(px, py, x, y, 5 * (1 - t) + 1.2, 70, 26); px = x; py = y;
      if (i < 2) continue;
      const L = (60 + 170 * Math.sin(Math.min(1, t * 1.25) * PI * 0.62)) * rr(0.85, 1.1) * (1 - t * t * 0.55);
      for (let s = -1; s <= 1; s += 2) {
        const a = -PI / 2 + s * (1.25 - t * 0.55) + rr(-0.08, 0.08);
        g.strokeStyle = hsl(88 + rr(-5, 5), 40 + rr(-4, 4), 25 + rr(-2, 3)); g.lineWidth = rr(8.5, 11.5) * (1 - t * 0.35); g.lineCap = 'round';   // Folíolos anchos: fronda como lámina continua
        const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L + L * 0.22;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * L * 0.55, y + Math.sin(a) * L * 0.55 - 6, ex, ey); g.stroke();
        g.strokeStyle = hsl(96, 34, 34, 0.22); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * L * 0.55, y + Math.sin(a) * L * 0.55 - 6, ex, ey); g.stroke();
      }
    }
  });
  // 3: fronde de samambaia (bipinada)
  tile(3, () => {
    const n = 30; let px = 256, py = 506;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = 256 + Math.sin(t * 2.2) * 10, y = 506 - t * 494;
      if (i) stem(px, py, x, y, 3.2 * (1 - t) + 1, 80, 24); px = x; py = y;
      if (i < 2) continue;
      const L = 190 * Math.pow(Math.sin(Math.min(1, 0.12 + t * 0.95) * PI), 0.75) * (1 - t * 0.5) * rr(0.9, 1.05);
      for (let s = -1; s <= 1; s += 2) {
        const a = -PI / 2 + s * (1.32 - t * 0.35), m = Math.max(4, Math.round(L / 11));
        for (let q = 1; q <= m; q++) {
          const u = q / m, qx = x + Math.cos(a) * L * u, qy = y + Math.sin(a) * L * u, l2 = 17 * (1 - u * 0.75) + 3;
          leaf(qx, qy, a + 1.25, l2, l2 * 0.3, 104 + rr(-8, 8), 42, 27 + rr(-5, 6), 0.6);
          leaf(qx, qy, a - 1.25, l2, l2 * 0.3, 104 + rr(-8, 8), 42, 27 + rr(-5, 6), 0.6);
        }
        g.strokeStyle = hsl(90, 30, 22); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
      }
    }
  });
  // 4: roseta de hojas palmadas (lóbulos finos), hojas pequeñas en pecíolos en dos capas
  tile(4, () => {
    const pal = (cx, cy, R, rot, dl) => {
      stem(256, 506, cx, cy, 3, 55, 24 + dl);
      for (let k = 0; k < 11; k++) { const a = rot + (k - 5) * 0.52, L = R * (1 - Math.abs(k - 5) * 0.06) * rr(0.85, 1.1); leaf(cx, cy, a, L, L * 0.13, 90 + rr(-8, 6), 32, 25 + dl + rr(-3, 4), 0.55); }
    };
    for (let layer = 0; layer < 2; layer++) for (let k = 0; k < 9; k++) {
      const a = -PI / 2 + rr(-1.15, 1.15), r0 = rr(120, 400) * (1 - Math.abs(a + PI / 2) * 0.28);
      pal(256 + Math.cos(a) * r0, 504 + Math.sin(a) * r0, rr(62, 92), a + rr(-0.5, 0.5), layer ? 3 : -7);
    }
  });
  // 5: franja de hierba (briznas finas enraizadas en toda la anchura, alturas variadas, puntas curvadas, algunas
  //    secas cor de palha e algumas com espiga). Qualquer janela horizontal do ladrilho é uma touceira — sem forma de leque.
  tile(5, () => {
    const blade = (x0, L, w, a, bend, dry, lig) => {
      const x1 = x0 + Math.cos(a) * L * 0.55, y1 = 508 + Math.sin(a) * L * 0.55, x2 = x0 + Math.cos(a) * L + bend, y2 = 508 + Math.sin(a) * L + Math.abs(bend) * 0.45;
      const gr = g.createLinearGradient(x0, 508, x2, y2); const h = dry ? 52 + rr(-8, 8) : 82 + rr(-14, 14), sa = dry ? 34 : 40, l = lig + rr(-5, 6);
      gr.addColorStop(0, hsl(h + 14, sa, l - 10)); gr.addColorStop(0.55, hsl(h, sa, l + 2)); gr.addColorStop(1, hsl(dry ? h - 4 : h - 26, sa - 4, l + (dry ? 20 : 13)));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w / 2, 508); g.quadraticCurveTo(x1 - w * 0.4, y1, x2, y2); g.quadraticCurveTo(x1 + w * 0.4, y1, x0 + w / 2, 508); g.fill();
      return [x2, y2, a];
    };
    // camada de fundo: baixa, densa e escura (base do tufo); depois médias; por fim poucas lâminas altas e hastes com espiga
    for (let k = 0; k < 150; k++) blade(rr(14, 498), rr(70, 190), rr(3.5, 6), -PI / 2 + rr(-0.42, 0.42), rr(-22, 22), rnd() < 0.1, 19);
    for (let k = 0; k < 120; k++) blade(rr(18, 494), rr(170, 340), rr(3.5, 6.5), -PI / 2 + rr(-0.32, 0.32), rr(-55, 55), rnd() < 0.16, 24);
    for (let k = 0; k < 46; k++) blade(rr(30, 482), rr(320, 480), rr(3, 5.5), -PI / 2 + rr(-0.22, 0.22), rr(-80, 80), rnd() < 0.22, 27);
    for (let k = 0; k < 9; k++) {
      const e = blade(rr(60, 452), rr(380, 470), 2.4, -PI / 2 + rr(-0.12, 0.12), rr(-28, 28), true, 30);
      g.fillStyle = hsl(46 + rr(-6, 6), 38, 34 + rr(-4, 6)); for (let q = 0; q < 7; q++) { g.beginPath(); g.ellipse(e[0] + rr(-3, 3), e[1] + q * 5 - 4, 2.2, 5.5, rr(-0.5, 0.5), 0, TAU); g.fill(); }
    }
  });
  // 6: masa más dispersa de hojas estrechas y colgantes
  tile(6, () => cluster({ depth: 2, step: 15, stemW: 1.3, branchP: 0.5, leafL: 25, leafW: 0.19, perNode: 3, leafP: 0.66, hue: 88, sat: 27, lig: 25, tipk: 0.58, droop: 1 }, 5, 2.3, 330, 450));
  // 7: hojas grandes y brillantes en abanico (arbusto)
  tile(7, () => {
    for (let k = 0; k < 44; k++) {
      const a = -PI / 2 + rr(-1.15, 1.15), r0 = rr(20, 300) * (1 - Math.abs(a + PI / 2) * 0.3), x = 256 + Math.cos(a) * r0, y = 500 + Math.sin(a) * r0, L = rr(80, 140);
      stem(256, 506, x, y, 2, 60, 18);
      leaf(x, y, a + rr(-0.5, 0.5), L, L * 0.26, 112 + rr(-12, 10), 36, 19 + rr(-5, 8), 0.66);
    }
  });
  // --- lê os pixels, dilata a cor para as áreas transparentes e gera mips preservando a cobertura ---
  const img = g.getImageData(0, 0, W, H).data;
  let cur = new Float32Array(W * H * 4);           // cor linear pré-multiplicada + alfa
  const s2l = new Float32Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; s2l[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  const l2s = v => Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
  for (let i = 0; i < W * H; i++) { const a = img[i * 4 + 3] / 255; cur[i * 4] = s2l[img[i * 4]] * a; cur[i * 4 + 1] = s2l[img[i * 4 + 1]] * a; cur[i * 4 + 2] = s2l[img[i * 4 + 2]] * a; cur[i * 4 + 3] = a; }
  const levels = Math.log2(TS) + 1 - 2;            // até ladrilhos de 4 px
  const tex = G.dev.createTexture({ size: [W, H], format: 'rgba8unorm-srgb', usage: TU.TB | TU.CD, mipLevelCount: levels });
  const coverage = (buf, w, h, scale) => { let c = 0; for (let i = 0; i < w * h; i++) if (buf[i * 4 + 3] * scale >= 0.5) c++; return c / (w * h); };
  const cov0 = coverage(cur, W, H, 1);
  // pirâmide completa (pré-multiplicada) até 1 px de altura
  const pyr = [{ d: cur, w: W, h: H }];
  while (pyr[pyr.length - 1].h > 1) {
    const s0 = pyr[pyr.length - 1], nw = s0.w >> 1, nh = s0.h >> 1, nx = new Float32Array(nw * nh * 4), c0 = s0.d, w0 = s0.w;
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      const o = (y * nw + x) * 4, a = (y * 2 * w0 + x * 2) * 4, b = a + 4, c = a + w0 * 4, d = c + 4;
      for (let k = 0; k < 4; k++) nx[o + k] = (c0[a + k] + c0[b + k] + c0[c + k] + c0[d + k]) * 0.25;
    }
    pyr.push({ d: nx, w: nw, h: nh });
  }
  // cor preenchida: onde o alfa é baixo, usa a cor do nível mais grosso (já preenchido)
  const fillc = new Array(pyr.length);
  for (let m = pyr.length - 1; m >= 0; m--) {
    const s0 = pyr[m], n = s0.w * s0.h, f = new Float32Array(n * 3), up = m < pyr.length - 1 ? fillc[m + 1] : null, uw = up ? pyr[m + 1].w : 0, uh = up ? pyr[m + 1].h : 0;
    for (let y = 0; y < s0.h; y++) for (let x = 0; x < s0.w; x++) {
      const i = y * s0.w + x, a = s0.d[i * 4 + 3];
      let r = 0.06, g2 = 0.115, b = 0.03;
      if (up) { const q = (Math.min(uh - 1, y >> 1) * uw + Math.min(uw - 1, x >> 1)) * 3; r = up[q]; g2 = up[q + 1]; b = up[q + 2]; }
      if (a > 1e-3) { const k = Math.min(1, a * 4); r = r + (Math.min(1, s0.d[i * 4] / a) - r) * k; g2 = g2 + (Math.min(1, s0.d[i * 4 + 1] / a) - g2) * k; b = b + (Math.min(1, s0.d[i * 4 + 2] / a) - b) * k; }
      f[i * 3] = r; f[i * 3 + 1] = g2; f[i * 3 + 2] = b;
    }
    fillc[m] = f;
  }
  // alfa do nível 0 suavizado (gaussiana separável, ~2 texels): o contorno em 0,5 fica liso quando a textura é ampliada
  // (lente longa das câmeras de TV); com alfa binário o recorte saía em degraus do tamanho do texel
  const a0 = new Float32Array(W * H), a1 = new Float32Array(W * H), KB = [0.0625, 0.25, 0.375, 0.25, 0.0625];
  for (let i = 0; i < W * H; i++) a0[i] = cur[i * 4 + 3];
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -2; k <= 2; k++) { const xx = x + k < 0 ? 0 : x + k >= W ? W - 1 : x + k; v += a0[y * W + xx] * KB[k + 2]; } a1[y * W + x] = v; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -2; k <= 2; k++) { const yy = y + k < 0 ? 0 : y + k >= H ? H - 1 : y + k; v += a1[yy * W + x] * KB[k + 2]; } a0[y * W + x] = v; }
  }
  for (let m = 0; m < levels; m++) {
    const s0 = pyr[m], w = s0.w, h = s0.h, c0 = s0.d, f = fillc[m]; let scale = 1;
    if (m > 0) { // busca binária do ganho de alfa que mantém a cobertura do nível 0
      let lo = 0.5, hi = 6; for (let it = 0; it < 12; it++) { scale = (lo + hi) / 2; if (coverage(c0, w, h, scale) < cov0) lo = scale; else hi = scale; }
    }
    const out = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) { out[i * 4] = l2s(f[i * 3]); out[i * 4 + 1] = l2s(f[i * 3 + 1]); out[i * 4 + 2] = l2s(f[i * 3 + 2]); out[i * 4 + 3] = Math.round(255 * Math.min(1, (m === 0 ? a0[i] : c0[i * 4 + 3]) * scale)); }
    G.dev.queue.writeTexture({ texture: tex, mipLevel: m }, out, { bytesPerRow: w * 4 }, [w, h]);
  }
  return tex;
}

// ---- 33_veg_b_trees.js
// Vegetación — generación procedimental de mallas (árboles, palmera, arbusto, helecho, hierba).
// Formato de vértice (VLAYOUT): normal.w = oscilación de la rama | mat = (id: 0 corteza / 1 hoja, fase, tipo de corteza, temblor) | color.a = AO
const VEG_NT = 6, VEG_NA = 9;   // arquetipos con impostor (árboles + arbusto grande) / total (con sotobosque)
// Capa de hojas individuales (visión cercana): un quad por hoja, silueta y nervaduras analíticas en el shader.
// Vértice (32 bytes): pos f32x3 | off snorm16x4 (canto - base da folha, em 0,6 m; w = peso de balanço) | normal snorm8x4 (w = tremor)
//                     | uint8x4 (u, v, fase, AO) | unorm8x4 (tinta rgb, tipo de folha)
const VEG_LEAF_LAYOUT = { arrayStride: 32, attributes: [
  { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'snorm16x4' }, { shaderLocation: 2, offset: 20, format: 'snorm8x4' },
  { shaderLocation: 3, offset: 24, format: 'uint8x4' }, { shaderLocation: 4, offset: 28, format: 'unorm8x4' }] };
class VegLeafBuf {
  constructor() { this.cap = 4096; this.n = 0; this._mk(); }
  _mk() { const b = new ArrayBuffer(this.cap * 4 * 32); if (this.u8) new Uint8Array(b).set(this.u8); this.buf = b; this.f32 = new Float32Array(b); this.i16 = new Int16Array(b); this.i8 = new Int8Array(b); this.u8 = new Uint8Array(b); }
  // folha: base b, eixo ax (unitário), lado sd (unitário), normal nl, comprimento L, meia largura hw
  add(b, ax, sd, nl, L, hw, sway, ph, ao, tint, type) {
    if (this.n >= this.cap) { this.cap *= 2; this._mk(); }
    const q = Math.sign;
    for (let k = 0; k < 4; k++) {
      const u = k >> 1, v = (k & 1) * 2 - 1, i = this.n * 4 + k, ox = ax[0] * L * u + sd[0] * hw * v, oy = ax[1] * L * u + sd[1] * hw * v, oz = ax[2] * L * u + sd[2] * hw * v;
      this.f32[i * 8] = b[0] + ox; this.f32[i * 8 + 1] = b[1] + oy; this.f32[i * 8 + 2] = b[2] + oz;
      const c = x => Math.round(clamp(x / 0.6, -1, 1) * 32767);
      this.i16[i * 16 + 6] = c(ox); this.i16[i * 16 + 7] = c(oy); this.i16[i * 16 + 8] = c(oz); this.i16[i * 16 + 9] = Math.round(clamp(sway, 0, 1) * 32767);
      // normal com dobra na nervura: as duas metades inclinam para lados opostos (folha em calha)
      const nx = nl[0] + sd[0] * v * 0.32, ny = nl[1] + sd[1] * v * 0.32, nz = nl[2] + sd[2] * v * 0.32, l = Math.hypot(nx, ny, nz) || 1;
      this.i8[i * 32 + 20] = Math.round(nx / l * 127); this.i8[i * 32 + 21] = Math.round(ny / l * 127); this.i8[i * 32 + 22] = Math.round(nz / l * 127); this.i8[i * 32 + 23] = Math.round((0.35 + 0.65 * u) * 127);
      this.u8[i * 32 + 24] = u * 255; this.u8[i * 32 + 25] = (v + 1) * 127.5; this.u8[i * 32 + 26] = ph; this.u8[i * 32 + 27] = Math.round(sat(ao) * 255);
      this.u8[i * 32 + 28] = Math.round(sat(tint[0] * 0.5) * 255); this.u8[i * 32 + 29] = Math.round(sat(tint[1] * 0.5) * 255); this.u8[i * 32 + 30] = Math.round(sat(tint[2] * 0.5) * 255); this.u8[i * 32 + 31] = type;
    }
    this.n++;
  }
  upload() {
    const n = this.n, idx = new Uint32Array(n * 6);
    // reordena por fase creciente: el shader hace desvanecer las hojas de fase alta a menor distancia; para un bloque lejano
    // basta dibujar el inicio del buffer (la densidad foliar disminuye con la distancia sin coste de CPU ni artefactos visuales)
    const ord = new Uint32Array(n); for (let i = 0; i < n; i++) ord[i] = i;
    const ph = this.u8, key = i => ph[i * 4 * 32 + 26]; ord.sort((a, b) => key(a) - key(b));
    const src = new Uint8Array(this.buf.slice(0, n * 4 * 32)), dst = new Uint8Array(this.buf);
    for (let i = 0; i < n; i++) dst.set(src.subarray(ord[i] * 128, ord[i] * 128 + 128), i * 128);
    for (let i = 0; i < n; i++) { const a = i * 4; idx.set([a, a + 1, a + 3, a, a + 3, a + 2], i * 6); }
    return { vb: mkBuf(n * 4 * 32, BU.V, new Uint8Array(this.buf, 0, n * 4 * 32)), ib: mkBuf(idx.byteLength, BU.I, idx), count: n * 6, n };
  }
}
function vegTileUV(t) { return [(t % VEG_TW) / VEG_TW, Math.floor(t / VEG_TW) / VEG_TH, 1 / VEG_TW, 1 / VEG_TH]; }
const _vn = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const _vx = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// tubo ao longo de pontos; rad(i) raio no ponto i; pesos de balanço w0→w1
function vegTube(mb, pts, rad, seg, w0, w1, barkType, vOff) {
  const n = pts.length, base = mb.nv; let len = vOff || 0;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], t = _vn([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    const ref = Math.abs(t[1]) > 0.92 ? [1, 0, 0] : [0, 1, 0], s = _vn(_vx(t, ref)), u = _vx(s, t), r = rad(i), p = pts[i];
    if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]);
    mb.weight(w0 + (w1 - w0) * i / (n - 1)); mb.mat(0, 0, barkType, 0);
    // seção com lóbulos (sapopemas/caneluras) que giram devagar ao longo do tronco: silhueta irregular em vez de cilindro
    const lob = barkType === 0 ? 0.085 : barkType === 1 ? 0.035 : 0, ph = (vOff || 0) * 1.7;
    for (let k = 0; k <= seg; k++) {
      const an = k / seg * TAU, c = Math.cos(an), sn = Math.sin(an), nx = s[0] * c + u[0] * sn, ny = s[1] * c + u[1] * sn, nz = s[2] * c + u[2] * sn;
      const rk = r * (1 + lob * (Math.sin(an * 3 + ph + len * 0.35) + 0.6 * Math.sin(an * 5 + 1.3 - len * 0.22 + ph)));
      mb.v(p[0] + nx * rk, p[1] + ny * rk, p[2] + nz * rk, nx, ny, nz, k / seg * Math.max(1, Math.round(r * 6)), len);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) { const a = base + i * (seg + 1) + k; mb.quadI(a, a + seg + 1, a + seg + 2, a + 1); }
}
// cartão de folhagem com 2 segmentos (base → meio → ponta), curvado por 'droop'. C = {c:[x,y,z], r, h} para normal esférica e AO
function vegCard(mb, b, dir, side, L, Wd, tile, C, w, rnd, droop, segs) {
  const uv = vegTileUV(tile), nrm = _vn(_vx(side, dir)), ph = Math.floor(rnd() * 255); segs = segs || 2;
  const base = mb.nv;
  for (let j = 0; j <= segs; j++) {
    const t = j / segs, dr = -(droop || 0) * t * t * L;
    const cx = b[0] + dir[0] * L * t, cy = b[1] + dir[1] * L * t + dr, cz = b[2] + dir[2] * L * t;
    for (let k = -1; k <= 1; k += 2) {
      const px = cx + side[0] * Wd * 0.5 * k, py = cy + side[1] * Wd * 0.5 * k, pz = cz + side[2] * Wd * 0.5 * k;
      const ex = (px - C.c[0]) / C.r, ey = (py - C.c[1]) / C.r, ez = (pz - C.c[2]) / C.r, d = Math.hypot(ex, ey, ez);
      const ao = (0.3 + 0.7 * Math.pow(sat(d), 1.7)) * (0.72 + 0.28 * sat(py / C.h)), kc = 0.6 + 0.4 * ao;
      mb.color(C.tint[0] * kc, C.tint[1] * kc, C.tint[2] * kc, ao);
      mb.weight(Math.min(1, w + 0.2 * t)); mb.mat(1, ph, 0, Math.round(lerp(50, 255, t)));
      const dl = d || 1, fs = (nrm[0] * ex + nrm[1] * ey + nrm[2] * ez) < 0 ? -0.2 : 0.2;   // normal do cartão virada para fora da copa
      mb.v(px, py, pz, ex / dl + nrm[0] * fs, ey / dl + 0.35 + nrm[1] * fs, ez / dl + nrm[2] * fs, uv[0] + (k > 0 ? uv[2] : 0), uv[1] + uv[3] * (1 - t));
    }
  }
  for (let j = 0; j < segs; j++) { const a = base + j * 2; mb.quadI(a, a + 1, a + 3, a + 2); }
}
const VEG_BARK = [[0.135, 0.108, 0.083], [0.19, 0.172, 0.146], [0.15, 0.128, 0.1]];   // marrom rugosa, cinzenta lisa, palmeira
function vegGenTree(P, seed) {
  const mb = new MeshBuilder(4096), rnd = mkRng(seed), rr = (a, b) => a + (b - a) * rnd(), LB = new VegLeafBuf(), rl = mkRng(seed * 7 + 3), rq = (a, b) => a + (b - a) * rl();
  mb.leaves = LB;
  const up = [0, 1, 0], H = P.H, la = rr(0, TAU), nT = P.trunkSeg || 9, tp = [];
  for (let i = 0; i <= nT; i++) { const t = i / nT; tp.push([Math.cos(la) * P.lean * H * t * t + Math.sin(t * 4.3 + seed) * P.wob * t, H * t, Math.sin(la) * P.lean * H * t * t + Math.cos(t * 3.7 + seed * 1.3) * P.wob * t]); }
  // raio do tronco: quase cilíndrico até a copa (leve afinamento), afina dentro da copa; alargamento curto na base (raízes)
  const c0 = P.crown0, fl = P.flare === undefined ? 0.38 : P.flare;
  const tR = t => P.r0 * (1 + fl * Math.exp(-t * H / (P.r0 * 1.8))) * (t < c0 ? 1 - 0.28 * t / c0 : 0.72 * Math.pow(Math.max(0.02, 1 - (t - c0) / (1 - c0)), 0.7)) + 0.025;
  const tAt = t => { const f = sat(t) * nT, i = Math.min(nT - 1, Math.floor(f)), u = f - i; return [lerp(tp[i][0], tp[i + 1][0], u), lerp(tp[i][1], tp[i + 1][1], u), lerp(tp[i][2], tp[i + 1][2], u)]; };
  const bc = VEG_BARK[P.bark]; mb.color(bc[0], bc[1], bc[2], 1);
  vegTube(mb, tp, i => tR(i / nT), P.trunkRad || 8, 0, 0.12, P.bark, 0);
  const top = tAt(1), C = { c: [top[0] * 0.6, H * (P.crown0 + (1 - P.crown0) * 0.6) + P.card * 0.3, top[2] * 0.6], r: H * P.bLen[0] * 0.9 + P.card, h: H + P.card, tint: [1, 1, 1] };
  let BT = [1, 1, 1];   // tono de la rama actual
  const newBT = () => { const y = rnd(); BT = y < 0.16 ? [1.14, 1.08, 0.84] : y > 0.86 ? [0.84, 0.9, 0.88] : [rr(0.93, 1.07), rr(0.95, 1.05), rr(0.86, 1.0)]; };
  const cards = (b, d, n, w, sz) => {
    for (let q = 0; q < n; q++) {
      const sp = P.spread || 0.9;
      let dir = _vn([d[0] * 0.8 + rr(-sp, sp), d[1] * 0.8 + rr(-sp * 0.5, sp), d[2] * 0.8 + rr(-sp, sp)]);
      let side = _vn(_vx(dir, _vn([rr(-0.8, 0.8), rr(0.2, 1), rr(-0.8, 0.8)])));
      const L = sz * rr(0.75, 1.25), o = (P.scat || sz * 0.35) * (0.4 + 0.6 * rnd()); const cj = rr(0.93, 1.07); C.tint = [BT[0] * cj, BT[1] * cj, BT[2] * rr(0.94, 1.04)];   // Tono de la rama completa (masas), no hoja por hoja
      const cb = [b[0] - dir[0] * L * 0.15 + rr(-o, o), b[1] - dir[1] * L * 0.15 + rr(-o, o) * 0.6, b[2] - dir[2] * L * 0.15 + rr(-o, o)];
      vegCard(mb, cb, dir, side, L, L * P.aspect, P.tiles[Math.floor(rnd() * P.tiles.length)], C, w, rnd, q % 3 === 0 ? P.droop : 0, q % 3 === 0 ? 2 : 1);
      // Hojas individuales alrededor del plano; las del núcleo interior oscuro se omiten
      const cn = _vn(_vx(side, dir)), nL = P.leafN || 0, Wd = L * P.aspect;
      for (let e = 0; e < nL; e++) {
        const t = rq(0.12, 1.08), lt = rq(-0.56, 0.56), no = rq(-0.22, 0.22) * L;
        const lb = [cb[0] + dir[0] * L * t + side[0] * Wd * lt + cn[0] * no, cb[1] + dir[1] * L * t + side[1] * Wd * lt + cn[1] * no - (q % 3 === 0 ? P.droop * t * t * L : 0), cb[2] + dir[2] * L * t + side[2] * Wd * lt + cn[2] * no];
        const ex = (lb[0] - C.c[0]) / C.r, ey = (lb[1] - C.c[1]) / C.r, ez = (lb[2] - C.c[2]) / C.r, dd = Math.hypot(ex, ey, ez) || 1;
        const ao = (0.3 + 0.7 * Math.pow(sat(dd), 1.7)) * (0.72 + 0.28 * sat(lb[1] / C.h));
        if (ao < 0.42 && rl() < 0.75) continue;
        const out = [ex / dd, ey / dd, ez / dd];
        let ax = _vn([dir[0] * 0.45 + out[0] * 0.55 + rq(-0.7, 0.7), dir[1] * 0.3 + out[1] * 0.3 + rq(-0.55, 0.45) - (P.leafDroop || 0.25), dir[2] * 0.45 + out[2] * 0.55 + rq(-0.7, 0.7)]);
        let nl = _vn([out[0] * 0.5 + rq(-0.5, 0.5), 0.8 + out[1] * 0.3 + rq(-0.3, 0.3), out[2] * 0.5 + rq(-0.5, 0.5)]);
        const sd = _vn(_vx(ax, nl)); nl = _vx(sd, ax);
        const ll = P.leafL * rq(0.72, 1.25), lj = rq(0.9, 1.1);
        const tn = [C.tint[0] * lj, C.tint[1] * lj, C.tint[2] * rq(0.92, 1.06)];   // la hoja hereda el tono de su rama (variación sutil en masa foliar)
        LB.add(lb, ax, sd, nl, ll, ll * (P.leafAsp || 0.42) * 0.5, Math.min(1, w + 0.1), Math.floor(rl() * 255), ao, tn, P.leafType || 0);
      }
    }
  };
  for (let k = 0; k < P.nB; k++) {
    const u = (k + rr(0.2, 0.8)) / P.nB, t = P.crown0 + (1 - P.crown0) * Math.pow(u, 0.85), az = k * 2.39996 + rr(-0.3, 0.3);
    const el = lerp(P.bAng[0], P.bAng[1], u) * PI / 180, L = H * lerp(P.bLen[0], P.bLen[1], u) * rr(0.8, 1.2);
    let d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)], p = tAt(t); const pts = [p], dirs = [d], nS = 4;
    for (let j = 0; j < nS; j++) { p = [p[0] + d[0] * L / nS, p[1] + d[1] * L / nS, p[2] + d[2] * L / nS]; pts.push(p); d = _vn([d[0] + rr(-0.12, 0.12), d[1] + P.upCurve * 0.22 + rr(-0.08, 0.08), d[2] + rr(-0.12, 0.12)]); dirs.push(d); }
    const r0 = Math.min(tR(t) * 0.6, 0.02 + L * 0.022);
    mb.color(bc[0], bc[1], bc[2], 0.8); vegTube(mb, pts, i => lerp(r0, 0.035, i / nS), P.brRad || 5, 0.12, 0.9, P.bark, k);
    newBT(); cards(p, d, P.tipCards, 0.9, P.card);
    for (let s = 0; s < P.sub; s++) {
      const f = 0.3 + 0.62 * (s + rr(0.1, 0.9)) / P.sub, fi = f * nS, i0 = Math.min(nS - 1, Math.floor(fi)), fu = fi - i0;
      const o = [lerp(pts[i0][0], pts[i0 + 1][0], fu), lerp(pts[i0][1], pts[i0 + 1][1], fu), lerp(pts[i0][2], pts[i0 + 1][2], fu)], bd = dirs[i0];
      const perp = _vn(_vx(bd, up)), sg = s % 2 ? 1 : -1;
      let sd = _vn([bd[0] * 0.55 + perp[0] * sg * rr(0.6, 1.0), bd[1] * 0.55 + rr(-0.05, 0.55), bd[2] * 0.55 + perp[2] * sg * rr(0.6, 1.0)]);
      const sl = L * rr(0.3, 0.5) * (1 - f * 0.35), e1 = [o[0] + sd[0] * sl * 0.5, o[1] + sd[1] * sl * 0.5, o[2] + sd[2] * sl * 0.5];
      sd = _vn([sd[0], sd[1] + P.upCurve * 0.2, sd[2]]); const e2 = [e1[0] + sd[0] * sl * 0.5, e1[1] + sd[1] * sl * 0.5, e1[2] + sd[2] * sl * 0.5];
      const rs = lerp(r0, 0.035, f) * 0.6;
      mb.color(bc[0], bc[1], bc[2], 0.7); vegTube(mb, [o, e1, e2], i => lerp(rs, 0.02, i / 2), 3, 0.12 + 0.78 * f, 1, P.bark, s);
      cards(e2, sd, P.subCards, 0.95, P.card * 0.92);
      if (P.midCards) cards(e1, sd, P.midCards, 0.8, P.card * 0.8);
    }
  }
  cards(top, up, P.topCards || 3, 0.6, P.card);
  return mb;
}
function vegGenPalm(seed) {
  const mb = new MeshBuilder(2048), rnd = mkRng(seed), rr = (a, b) => a + (b - a) * rnd(), H = 9.5, tp = [], nT = 10, la = rr(0, TAU);
  for (let i = 0; i <= nT; i++) { const t = i / nT; tp.push([Math.cos(la) * 1.3 * t * t, H * t, Math.sin(la) * 1.3 * t * t]); }
  const bc = VEG_BARK[2]; mb.color(bc[0], bc[1], bc[2], 1);
  vegTube(mb, tp, i => 0.17 * (1 + 0.5 * Math.exp(-i * 0.9)) - 0.04 * i / nT, 7, 0, 0.25, 2, 0);
  const top = tp[nT], C = { c: [top[0], H + 0.4, top[2]], r: 3.6, h: H + 2.5, tint: [1, 1, 1] }, uv = vegTileUV(2), nF = 19;
  for (let k = 0; k < nF; k++) {
    const u = k / (nF - 1), az = k * 2.39996 + rr(-0.2, 0.2), el = lerp(1.25, -0.25, Math.pow(u, 0.8)) + rr(-0.1, 0.1), L = rr(3.3, 4.1) * (0.8 + 0.2 * Math.sin(u * PI)), Wd = 1.45, nS = 5;
    let d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)], p = [top[0], top[1] - 0.1, top[2]]; const base = mb.nv, ph = Math.floor(rnd() * 255);
    const dead = u > 0.9 ? 0.6 : 1; C.tint = [rr(0.9, 1.1) / dead, rr(0.92, 1.05) * dead, rr(0.8, 1) * dead];
    for (let j = 0; j <= nS; j++) {
      const t = j / nS, side = _vn(_vx(d, [0, 1, 0])), n = _vn(_vx(side, d));
      for (let q = -1; q <= 1; q++) {
        // q = -1 borda esquerda, 0 ráquis, +1 borda direita; as bordas caem (folíolos pendentes)
        const fall = Math.abs(q) * Wd * (0.16 + 0.22 * t);
        const px = p[0] + side[0] * Wd * 0.5 * q - n[0] * fall, py = p[1] + side[1] * Wd * 0.5 * q - Math.abs(n[1]) * fall, pz = p[2] + side[2] * Wd * 0.5 * q - n[2] * fall;
        const ao = (q === 0 ? 0.5 : 0.75) + 0.25 * t, kc = 0.7 + 0.3 * ao;
        mb.color(C.tint[0] * kc, C.tint[1] * kc, C.tint[2] * kc, ao); mb.weight(0.25 + 0.75 * t); mb.mat(1, ph, 0, Math.round(lerp(30, 255, t) * (q === 0 ? 0.5 : 1)));
        mb.v(px, py, pz, n[0] * 0.5 + d[0] * 0.3 + side[0] * q * 0.5, Math.abs(n[1]) * 0.6 + 0.5, n[2] * 0.5 + d[2] * 0.3 + side[2] * q * 0.5, uv[0] + uv[2] * (0.5 + 0.5 * q), uv[1] + uv[3] * (1 - t));
      }
      p = [p[0] + d[0] * L / nS, p[1] + d[1] * L / nS, p[2] + d[2] * L / nS]; d = _vn([d[0], d[1] - 0.2 - 0.16 * j, d[2]]);
    }
    for (let j = 0; j < nS; j++) { const a = base + j * 3; mb.quadI(a, a + 1, a + 4, a + 3); mb.quadI(a + 1, a + 2, a + 5, a + 4); }
  }
  return mb;
}
// sotobosque: kind 0 arbusto, 1 helecho, 2 mata de hierba
function vegGenUnder(kind, seed) {
  const mb = new MeshBuilder(512), rnd = mkRng(seed), rr = (a, b) => a + (b - a) * rnd();
  const n = kind === 0 ? 18 : kind === 1 ? 11 : 15;
  const C = { c: [0, kind === 0 ? 0.8 : 0.3, 0], r: kind === 0 ? 1.5 : 1.1, h: kind === 0 ? 2.2 : 1.4, tint: [1, 1, 1] };
  for (let k = 0; k < n; k++) {
    const az = k * 2.39996 + rr(-0.3, 0.3), el = kind === 0 ? rr(0.35, 1.35) : kind === 1 ? rr(0.5, 1.0) : rr(1.0, 1.45);
    const dir = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)], side = _vn(_vx(dir, [0, 1, 0]));
    const L = kind === 0 ? rr(1.2, 1.9) : kind === 1 ? rr(0.9, 1.3) : rr(0.6, 1.45), Wd = kind === 0 ? L * 0.95 : kind === 1 ? L * 0.42 : rr(0.7, 1.1);
    const tk = kind === 0 ? 0.72 : 0.9; C.tint = [rr(0.85, 1.1) * tk, rr(0.9, 1.06) * tk, rr(0.8, 1) * tk];
    const off = kind === 0 ? rr(0, 0.5) : 0.05;
    vegCard(mb, [Math.cos(az) * off, kind === 0 ? rr(0.05, 0.5) : 0.02, Math.sin(az) * off], dir, side, L, Wd, kind === 0 ? (k % 3 ? 7 : 1) : kind === 1 ? 3 : 5, C, 0.35, rnd, kind === 0 ? 0.12 : kind === 1 ? 0.55 : 0.3, 3);
  }
  return mb;
}
// arbusto grande / muda (com impostor): vários caules finos e copa baixa e cheia — cobre a borda da mata e as encostas
function vegGenBush(seed) {
  const mb = new MeshBuilder(1024), rnd = mkRng(seed), rr = (a, b) => a + (b - a) * rnd(), LB = new VegLeafBuf(); mb.leaves = LB;
  const bc = VEG_BARK[0], C = { c: [0, 1.5, 0], r: 2.1, h: 3.4, tint: [1, 1, 1] };
  for (let k = 0; k < 6; k++) {
    const az = k * 2.39996 + rr(-0.4, 0.4), el = rr(0.75, 1.35), L = rr(1.5, 2.9), d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
    const p0 = [Math.cos(az) * 0.12, 0, Math.sin(az) * 0.12], p1 = [p0[0] + d[0] * L * 0.5, d[1] * L * 0.5, p0[2] + d[2] * L * 0.5], p2 = [p1[0] + d[0] * L * 0.5, p1[1] + d[1] * L * 0.45 + 0.15, p1[2] + d[2] * L * 0.5];
    mb.color(bc[0], bc[1], bc[2], 0.75); vegTube(mb, [p0, p1, p2], i => 0.045 - 0.014 * i, 4, 0.1, 0.8, 0, k);
    for (const [pt, n, w] of [[p1, 3, 0.5], [p2, 6, 0.85]]) for (let q = 0; q < n; q++) {
      const dir = _vn([d[0] * 0.5 + rr(-1, 1), d[1] * 0.4 + rr(-0.3, 0.9), d[2] * 0.5 + rr(-1, 1)]), side = _vn(_vx(dir, _vn([rr(-0.8, 0.8), rr(0.2, 1), rr(-0.8, 0.8)])));
      const L2 = rr(0.85, 1.35), cb = [pt[0] + rr(-0.35, 0.35), pt[1] + rr(-0.3, 0.3), pt[2] + rr(-0.35, 0.35)]; C.tint = [rr(0.8, 1.05), rr(0.88, 1.06), rr(0.75, 0.98)];
      vegCard(mb, cb, dir, side, L2, L2 * 0.98, [7, 1, 0, 1][Math.floor(rnd() * 4)], C, w, rnd, 0.12, 2);
      for (let e = 0; e < 22; e++) {
        const t = rr(0.15, 1.05), lb = [cb[0] + dir[0] * L2 * t + side[0] * L2 * rr(-0.5, 0.5), cb[1] + dir[1] * L2 * t + side[1] * L2 * rr(-0.5, 0.5), cb[2] + dir[2] * L2 * t + side[2] * L2 * rr(-0.5, 0.5)];
        const ex = lb[0] / C.r, ey = (lb[1] - C.c[1]) / C.r, ez = lb[2] / C.r, dd = Math.hypot(ex, ey, ez) || 1, ao = 0.35 + 0.65 * sat(dd) * (0.7 + 0.3 * sat(lb[1] / C.h));
        let ax = _vn([dir[0] * 0.4 + ex / dd * 0.6 + rr(-0.7, 0.7), rr(-0.6, 0.4), dir[2] * 0.4 + ez / dd * 0.6 + rr(-0.7, 0.7)]), nl = _vn([ex / dd * 0.5 + rr(-0.5, 0.5), 0.9, ez / dd * 0.5 + rr(-0.5, 0.5)]);
        const sd = _vn(_vx(ax, nl)); nl = _vx(sd, ax); const ll = rr(0.09, 0.16);
        LB.add(lb, ax, sd, nl, ll, ll * 0.27, w, Math.floor(rnd() * 255), ao, [rr(0.8, 1.15), rr(0.9, 1.12), rr(0.75, 1.0)], 0);
      }
    }
  }
  return mb;
}
function vegArchetypes() {
  const A = [];
  // cartões menores e bem mais numerosos que na 1ª versão: copa cheia, silhueta orgânica, sem "estrelas" grandes
  // 0: grande, copa larga
  A.push(vegGenTree({ H: 15, r0: 0.46, lean: 0.03, wob: 0.35, crown0: 0.36, nB: 11, bLen: [0.5, 0.26], bAng: [14, 70], upCurve: 1, sub: 5, tipCards: 10, subCards: 12, midCards: 6, topCards: 15, card: 0.9, scat: 0.9, aspect: 0.95, droop: 0.12, tiles: [0, 1, 0], bark: 0, leafN: 13, leafL: 0.155, leafAsp: 0.46, leafType: 0 }, 11));
  // 1: média arredondada e densa
  A.push(vegGenTree({ H: 8.5, r0: 0.25, lean: 0.05, wob: 0.25, crown0: 0.3, nB: 9, bLen: [0.56, 0.3], bAng: [16, 74], upCurve: 1, sub: 4, tipCards: 10, subCards: 10, midCards: 4, topCards: 12, card: 0.755, scat: 0.75, aspect: 0.98, droop: 0.1, tiles: [1, 1, 0], bark: 0, brRad: 4, leafN: 15, leafL: 0.11, leafAsp: 0.52, leafType: 1 }, 23));
  // 2: alta e esguia, copa no topo
  A.push(vegGenTree({ H: 23, r0: 0.3, lean: 0.015, wob: 0.2, crown0: 0.6, nB: 9, bLen: [0.24, 0.13], bAng: [22, 66], upCurve: 1.3, sub: 3, tipCards: 10, subCards: 10, midCards: 3, topCards: 12, card: 0.873, scat: 0.85, aspect: 0.95, droop: 0.2, tiles: [6, 0, 6], bark: 1, flare: 0.3, leafN: 13, leafL: 0.175, leafAsp: 0.2, leafType: 2, leafDroop: 0.75 }, 37));
  // 3: palmeira
  A.push(vegGenPalm(41));
  // 4: arbolillo de sotobosque (rosetas de hojas palmadas, tronco estilizado)
  A.push(vegGenTree({ H: 6, r0: 0.09, lean: 0.06, wob: 0.15, crown0: 0.55, nB: 5, bLen: [0.4, 0.25], bAng: [35, 70], upCurve: 1.4, sub: 0, tipCards: 13, subCards: 0, midCards: 0, topCards: 13, card: 0.703, scat: 0.6, aspect: 0.98, droop: 0.2, spread: 1.1, tiles: [4], bark: 1, flare: 0.25, trunkRad: 6, brRad: 4, leafN: 8, leafL: 0.21, leafAsp: 0.3, leafType: 2 }, 53));
  // 5: arbusto grande / muda
  A.push(vegGenBush(59));
  A.push(vegGenUnder(0, 61)); A.push(vegGenUnder(1, 67)); A.push(vegGenUnder(2, 71));
  return A;
}

// ---- 33_veg_c_sys.js
// Vegetación — distribución de instancias, impostores precomputados en inicialización y renderizado (malla cercana, impostor lejano).
const VEG = {
  on: true, onMesh: true, onLeaf: true, onImp: true, onShadow: true, onGrass: true, onCube: true,
  CELL: 64, SUP: 256, NC: 52, NS: 13, x0: 0, z0: 0, n: 0, nTrees: 0,
  inst: null, cellStart: null, cellCount: null, cellY: null, supStart: null, supCount: null, supY: null,
  meshes: [], leafMeshes: [], dims: new Float32Array(48), zoom: 1, stats: { meshDraws: 0, impDraws: 0, meshInst: 0, meshTris: 0, leafDraws: 0, leafInst: 0, leafTris: 0 },
};
const VEG_INST = { arrayStride: 32, stepMode: 'instance', attributes: [{ shaderLocation: 5, offset: 0, format: 'float32x4' }, { shaderLocation: 6, offset: 16, format: 'float32x4' }] };

function vegPlace() {
  const rnd = mkRng(4711), V = VEG, half = V.NC * V.CELL / 2; V.x0 = TRK.cx - half; V.z0 = TRK.cz - half;
  let cap = 1 << 17, data = new Float32Array(cap * 8), keys = new Uint32Array(cap), n = 0;
  const push = (x, y, z, s, rot, seed, arch) => {
    const cx = Math.floor((x - V.x0) / V.CELL), cz = Math.floor((z - V.z0) / V.CELL); if (cx < 0 || cz < 0 || cx >= V.NC || cz >= V.NC) return;
    if (n >= cap) { cap *= 2; const d2 = new Float32Array(cap * 8); d2.set(data); data = d2; const k2 = new Uint32Array(cap); k2.set(keys); keys = k2; }
    const o = n * 8; data[o] = x; data[o + 1] = y; data[o + 2] = z; data[o + 3] = s; data[o + 4] = Math.cos(rot); data[o + 5] = Math.sin(rot); data[o + 6] = seed; data[o + 7] = arch;
    const s16 = (Math.floor((z - V.z0) / 16) & 3) * 4 + (Math.floor((x - V.x0) / 16) & 3);   // subcelda de 16 m dentro de la celda (hojas individuales)
    keys[n++] = ((((cz >> 2) * V.NS + (cx >> 2)) * 16 + (cz & 3) * 4 + (cx & 3)) * VEG_NA + arch) * 16 + s16;
  };
  // câmeras de TV (lente longa): nada de copa perto da torre nem nas linhas de visada entre a câmera e o trecho de pista
  // que ela cobre (de 160 m antes a 60 m depois da torre) — senão uma arvoreta a 25 m tapa o carro inteiro.
  const tv = [];
  if (typeof WORLD !== 'undefined' && WORLD.tvCams) for (const c of WORLD.tvCams) {
    const t = { x: c.x, z: c.z, pts: [] }, q = new Float64Array(5);
    for (let ds = -160; ds <= 60; ds += 8) { trackPos(c.s + ds, 0, q); t.pts.push(q[0], q[2]); }
    tv.push(t);
  }
  const nearTV = (x, z, r, rl) => {
    for (const c of tv) {
      const dx = x - c.x, dz = z - c.z, d2 = dx * dx + dz * dz; if (d2 > 215 * 215) continue; if (d2 < r * r) return true;
      for (let k = 0; k < c.pts.length; k += 2) {
        const ex = c.pts[k] - c.x, ez = c.pts[k + 1] - c.z, l2 = ex * ex + ez * ez, t = clamp((dx * ex + dz * ez) / l2, 0, 1), px = dx - ex * t, pz = dz - ez * t;
        if (px * px + pz * pz < rl * rl) return true;
      }
    }
    return false;
  };
  const loc0 = new Float64Array(4);
  const inHF = (x, z) => x > HF.x0 + 1 && z > HF.z0 + 1 && x < HF.x0 + HF.w - 2 && z < HF.z0 + HF.h - 2;
  // árboles: retícula con perturbación; densidad según masa boscosa; más dispersos y corpulentos a lo lejos
  const g = 5.6, ng = Math.floor(2 * half / g);
  for (let gz = 0; gz < ng; gz++) for (let gx = 0; gx < ng; gx++) {
    const x = V.x0 + (gx + rnd()) * g, z = V.z0 + (gz + rnd()) * g, r1 = rnd(), r2 = rnd(), r3 = rnd(), r4 = rnd(), r5 = rnd();
    const dc = Math.hypot(x - TRK.cx, z - TRK.cz); if (dc > half - 30) continue;
    const far = smooth(600, 1450, dc); if (r1 > lerp(0.92, 0.36, far)) continue;
    const f = forestAt(x, z); if (f < 0.03 || r2 > f * 1.15) continue;
    const pn = vnoise(x * 0.017 + 5.1, z * 0.017 - 2.3), edge = 1 - smooth(0.35, 0.9, f);
    // pesos: 0 grande, 1 média, 2 alta, 3 palmeira, 4 arvoreta
    // (na borda da mata as espécies se misturam: nenhuma passa de ~1/3 — antes a arvoreta dominava e a borda lia como parede homogênea)
    const w0 = 0.2 * (1 - edge * 0.35) + far * 0.2, w1 = 0.3, w2 = 0.16 + edge * 0.06 + far * 0.1, w3 = (0.06 + 0.3 * smooth(0.62, 0.8, pn) + edge * 0.05) * (1 - far), w4 = (0.24 + edge * 0.12) * (1 - far);   // mais arvoretas (copa a meia altura): fecham o vão entre o sub-bosque e as copas altas
    let q = r3 * (w0 + w1 + w2 + w3 + w4), arch = 0; if ((q -= w0) > 0) { arch = 1; if ((q -= w1) > 0) { arch = 2; if ((q -= w2) > 0) { arch = 3; if ((q -= w3) > 0) arch = 4; } } }
    if (dc < 700 && nearTV(x, z, 22, arch < 3 ? 6.5 : 4)) continue;
    const y = (inHF(x, z) ? hfAt(x, z) : terrainH(x, z)) - lerp(0.25, 1.6, far);
    push(x, y, z, lerp(0.68, 1.38, r4 * r4 * (3 - 2 * r4)) * (1 + far * 0.3), r5 * TAU, rnd(), arch);
  }
  // arbustos grandes y matorrales (arquetipo 5, con impostor): pueblan el sotobosque, los linderos del bosque y los claros,
  // Colinas con relieve y vegetación variada para evitar aspecto plano
  const gb = 3.3, nb = Math.floor(2 * half / gb);
  for (let gz = 0; gz < nb; gz++) for (let gx = 0; gx < nb; gx++) {
    const x = V.x0 + (gx + rnd()) * gb, z = V.z0 + (gz + rnd()) * gb, r1 = rnd(), r2 = rnd(), r3 = rnd();
    const dc = Math.hypot(x - TRK.cx, z - TRK.cz); if (dc > 780) continue;
    const td = trackFarDist(x, z);
    let p;
    if (td < 60) {
      trackLocate(x, z, -1, loc0); const d = loc0[1], ad = Math.abs(d), bar = trkAt(d < 0 ? TRK.barL : TRK.barR, loc0[2], loc0[3]);
      if (ad < bar + 4.5) continue; const zn = zoneAt(loc0[2], loc0[3], d); if (zn !== ZONE.ROUGH && zn !== ZONE.GRASS) continue;
      // faixa livre junto aos boxes/arquibancada (forestAt já zera lá): sem arbusto solto no paddock
      const sr = loc0[0] > TRK.L / 2 ? loc0[0] - TRK.L : loc0[0];
      if ((d > 0 && sr > TRK.pit.s0 - 30 && sr < TRK.pit.s1 + 30 && ad < TRK.pit.padD1 + 8) || (d < 0 && sr > TRK.stand.s0 - 25 && sr < TRK.stand.s1 + 25 && ad < -TRK.stand.d1 + 12)) continue;
    }
    const f = forestAt(x, z), pn = vnoise(x * 0.045 + 9.1, z * 0.045 + 4.4);
    // Laderas y claros abiertos: matorrales y arbustos en manchas variadas
    p = 0.46 * smooth(0.18, 0.62, pn) * (1 - smooth(0.05, 0.3, f)) + 0.5 * smooth(0.02, 0.3, f) * (1 - 0.3 * smooth(0.5, 1, f)) + 0.16 * f;
    if (r1 > p * (1 - 0.5 * smooth(450, 780, dc))) continue;
    if (dc < 700 && nearTV(x, z, 16, 2.6)) continue;
    const y = (inHF(x, z) ? hfAt(x, z) : terrainH(x, z)) - 0.12;
    push(x, y, z, lerp(0.5, 1.4 + 0.6 * smooth(0.3, 0.9, f), Math.pow(r2, 1.6)), r3 * TAU, rnd(), 5);   // dentro da mata, mudas mais altas
  }
  V.nTrees = n;
  // sotobosque próximo a la pista (inspección cercana): arbustos en los lindes, helechos en el interior y matas de hierba rústica
  const loc = new Float64Array(4), gu = 1.9;
  for (let z0 = HF.z0 + 2; z0 < HF.z0 + HF.h - 3; z0 += gu) for (let x0 = HF.x0 + 2; x0 < HF.x0 + HF.w - 3; x0 += gu) {
    const x = x0 + rnd() * gu, z = z0 + rnd() * gu, r1 = rnd(), r2 = rnd(), r3 = rnd();
    if (trackFarDist(x, z) > 100) continue;
    trackLocate(x, z, -1, loc); const d = loc[1], ad = Math.abs(d), bar = trkAt(d < 0 ? TRK.barL : TRK.barR, loc[2], loc[3]);
    if (ad < bar + 2.2 || ad > 105) continue;
    const zn = zoneAt(loc[2], loc[3], d); if (zn !== ZONE.GRASS && zn !== ZONE.ROUGH) continue;
    if (nearTV(x, z, 9, 0.0)) continue;
    const f = forestAt(x, z), y = hfAt(x, z) - 0.04;
    const pB = 0.5 * smooth(0.02, 0.3, f) * (1 - 0.5 * smooth(0.6, 1, f)), pF = 0.36 * smooth(0.3, 0.9, f), pC = 0.08 + 0.2 * smooth(0.0, 0.15, f) * (1 - smooth(0.3, 0.6, f));
    if (r1 < pB) push(x, y, z, lerp(0.6, 1.35, r2), r3 * TAU, rnd(), 6);
    else if (r1 < pB + pF) push(x, y, z, lerp(0.7, 1.3, r2), r3 * TAU, rnd(), 7);
    else if (r1 < pB + pF + pC) push(x, y, z, lerp(0.6, 1.15, r2), r3 * TAU, rnd(), 8);
  }
  // ordena por supercélula → célula → arquétipo
  const srt = new Float64Array(n), idx = new Uint32Array(n);   // ordenação nativa: chave * 2^20 + índice
  for (let i = 0; i < n; i++) srt[i] = keys[i] * 1048576 + i;
  srt.sort(); for (let i = 0; i < n; i++) idx[i] = srt[i] % 1048576;
  const inst = V.inst = new Float32Array(n * 8); V.n = n;
  const nCell = V.NC * V.NC, nSup = V.NS * V.NS;
  V.subStart = new Uint32Array(nCell * VEG_NA * 16); V.subCount = new Uint16Array(nCell * VEG_NA * 16);
  V.cellStart = new Uint32Array(nCell * VEG_NA); V.cellCount = new Uint32Array(nCell * VEG_NA); V.cellY = new Float32Array(nCell); const cn = new Uint32Array(nCell);
  V.supStart = new Uint32Array(nSup); V.supCount = new Uint32Array(nSup); V.supY = new Float32Array(nSup);
  for (let i = 0; i < n; i++) {
    const s = idx[i]; inst.set(data.subarray(s * 8, s * 8 + 8), i * 8);
    const k = keys[s] >>> 4, s16 = keys[s] & 15, arch = k % VEG_NA, cs = Math.floor(k / VEG_NA), sup = cs >> 4, sub = cs & 15;
    const cx = (sup % V.NS) * 4 + (sub & 3), cz = Math.floor(sup / V.NS) * 4 + (sub >> 2), c = cz * V.NC + cx;
    if (!V.cellCount[c * VEG_NA + arch]) V.cellStart[c * VEG_NA + arch] = i; V.cellCount[c * VEG_NA + arch]++;
    const sq = (c * VEG_NA + arch) * 16 + s16; if (!V.subCount[sq]) V.subStart[sq] = i; V.subCount[sq]++;
    if (!V.supCount[sup]) V.supStart[sup] = i; V.supCount[sup]++;
    V.cellY[c] += data[s * 8 + 1]; cn[c]++; V.supY[sup] += data[s * 8 + 1];
  }
  for (let c = 0; c < nCell; c++) if (cn[c]) V.cellY[c] /= cn[c];
  for (let s = 0; s < nSup; s++) if (V.supCount[s]) V.supY[s] /= V.supCount[s];
  V.instBuf = mkBuf(inst.byteLength, BU.V, inst);
  // copia de árboles ordenada desde la posición del sol hacia el fondo (por supercelda), para los quads en los pases de sombra:
  // com o sol baixo as copas se empilham em espaço de luz; desenhar da frente para trás deixa o teste de profundidade descartar o resto
  const sx = R.sun[0], sz = R.sun[2], sup = new Uint32Array(n), s2 = new Float64Array(n);
  let m = 0;
  for (let i = 0; i < n; i++) {
    if (inst[i * 8 + 7] >= VEG_NT) continue; const cx = Math.floor((inst[i * 8] - V.x0) / V.SUP), cz = Math.floor((inst[i * 8 + 2] - V.z0) / V.SUP); sup[i] = cz * V.NS + cx;
    const dq = clamp(Math.round(32768 - (inst[i * 8] * sx + inst[i * 8 + 2] * sz) * 8), 0, 65535);   // maior profundidade para o sol primeiro
    s2[m++] = (sup[i] * 65536 + dq) * 1048576 + i;
  }
  const ss = s2.subarray(0, m); ss.sort(); const ids = new Uint32Array(m); for (let i = 0; i < m; i++) ids[i] = ss[i] % 1048576;
  const inst2 = new Float32Array(m * 8); V.sunStart = new Uint32Array(nSup); V.sunCount = new Uint32Array(nSup);
  for (let i = 0; i < m; i++) { const q = ids[i]; inst2.set(inst.subarray(q * 8, q * 8 + 8), i * 8); const sp = sup[q]; if (!V.sunCount[sp]) V.sunStart[sp] = i; V.sunCount[sp]++; }
  V.instSunBuf = mkBuf(inst2.byteLength, BU.V, inst2);
  // supercélulas na ordem do sol
  V.sunOrder = new Uint16Array(nSup); for (let i = 0; i < nSup; i++) V.sunOrder[i] = i;
  V.sunOrder.sort((a, b) => ((b % V.NS) * sx + Math.floor(b / V.NS) * sz) - ((a % V.NS) * sx + Math.floor(a / V.NS) * sz));
}

function vegBakeImpostors(cpu) {
  const dev = G.dev, S = 512, layers = VEG_NT * 8, V = VEG;
  const mips = 8;
  V.texA = dev.createTexture({ size: [S, S, layers], format: 'rgba8unorm-srgb', usage: TU.RT | TU.TB, mipLevelCount: mips });
  V.texN = dev.createTexture({ size: [S, S, layers], format: 'rgba8unorm', usage: TU.RT | TU.TB, mipLevelCount: mips });
  const msA = dev.createTexture({ size: [S, S], format: 'rgba8unorm-srgb', usage: TU.RT, sampleCount: 4 }), msN = dev.createTexture({ size: [S, S], format: 'rgba8unorm', usage: TU.RT, sampleCount: 4 });
  const msD = dev.createTexture({ size: [S, S], format: 'depth32float', usage: TU.RT, sampleCount: 4 });
  const code = wgslPP('veg_bake', SH_DEFS), mod = mkShader('veg_bake', SH_DEFS), bgls = reflectBGLs(code);
  const pipe = dev.createRenderPipeline({
    layout: dev.createPipelineLayout({ bindGroupLayouts: bgls }), vertex: { module: mod, entryPoint: 'vs', buffers: [VLAYOUT] },
    fragment: { module: mod, entryPoint: 'fs', targets: [{ format: 'rgba8unorm-srgb' }, { format: 'rgba8unorm' }] },
    primitive: { cullMode: 'none' }, depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: 4, alphaToCoverageEnabled: true },
  });
  const ub = new Float32Array(layers * 64), view = m4(), proj = m4(), vp = m4(), el = 8 * PI / 180;
  for (let a = 0; a < VEG_NA; a++) {
    const f = cpu[a].f32; let r = 0, h = 0; for (let i = 0; i < cpu[a].nv; i++) { r = Math.max(r, Math.hypot(f[i * 9], f[i * 9 + 2])); h = Math.max(h, f[i * 9 + 1]); }
    V.dims[a * 4] = r * 1.03; V.dims[a * 4 + 1] = h * 1.03;
  }
  for (let a = 0; a < VEG_NT; a++) for (let k = 0; k < 8; k++) {
    const th = k * PI / 4, R = V.dims[a * 4], H = V.dims[a * 4 + 1], cy = H / 2, D = 100;
    m4lookAt(view, Math.cos(el) * Math.cos(th) * D, cy + Math.sin(el) * D, Math.cos(el) * Math.sin(th) * D, 0, cy, 0, 0, 1, 0);
    m4ortho(proj, -R, R, -H / 2, H / 2, D - 40, D + 40); m4mul(vp, proj, view); ub.set(vp, (a * 8 + k) * 64);
  }
  const ubuf = mkBuf(ub.byteLength, BU.U, ub);
  const bg = dev.createBindGroup({ layout: bgls[0], entries: [{ binding: 0, resource: { buffer: ubuf, size: 64 } }, { binding: 1, resource: V.leafView }, { binding: 2, resource: V.sLeaf }, { binding: 3, resource: R.view.noise }] });
  const enc = dev.createCommandEncoder();
  for (let a = 0; a < VEG_NT; a++) for (let k = 0; k < 8; k++) {
    const L = a * 8 + k, lv = t => t.createView({ dimension: '2d', baseArrayLayer: L, arrayLayerCount: 1, baseMipLevel: 0, mipLevelCount: 1 });
    const p = enc.beginRenderPass({
      colorAttachments: [{ view: msA.createView(), resolveTarget: lv(V.texA), loadOp: 'clear', storeOp: 'discard', clearValue: { r: 0.05, g: 0.1, b: 0.03, a: 0 } },
      { view: msN.createView(), resolveTarget: lv(V.texN), loadOp: 'clear', storeOp: 'discard', clearValue: { r: 0.5, g: 0.85, b: 0.5, a: 1 } }],
      depthStencilAttachment: { view: msD.createView(), depthLoadOp: 'clear', depthStoreOp: 'discard', depthClearValue: 1 },
    });
    p.setPipeline(pipe); p.setBindGroup(0, bg, [L * 256]); p.setVertexBuffer(0, V.meshes[a].vb); p.setIndexBuffer(V.meshes[a].ib, 'uint32'); p.drawIndexed(V.meshes[a].count); p.end();
  }
  dev.queue.submit([enc.finish()]);
  genMips(V.texA, 'rgba8unorm-srgb', layers); genMips(V.texN, 'rgba8unorm', layers);
  msA.destroy(); msN.destroy(); msD.destroy();
}

const vegDrawable = {
  draw(pass, ctx) {
    const V = VEG; if (!V.on || !V.n) return;
    const kind = ctx.kind, shadow = kind === KIND.SHADOW; if (shadow && !V.onShadow) return; if (kind === KIND.CUBE && !V.onCube) return;
    const camx = R.cam.pos[0], camz = R.cam.pos[2], NA = VEG_NA, NC = V.NC, CELL = V.CELL, st = V.stats;
    if (kind === KIND.GBUF) { st.meshDraws = 0; st.impDraws = 0; st.meshInst = 0; st.meshTris = 0; st.leafDraws = 0; st.leafInst = 0; st.leafTris = 0; }
    // LOD por tamanho na tela: com lente longa (câmera de TV) as distâncias de troca crescem na mesma proporção do zoom
    let zoom = Math.tan(R.cam.fovy * 0.5) * 2; zoom = zoom < 0.3 ? 0.3 : zoom > 1.25 ? 1.25 : zoom; V.zoom = zoom;
    // --- mallas poligonales (cercanas) ---
    const pm = V.famTree.pipe[kind];
    if (pm && V.onMesh && (kind === KIND.GBUF || (shadow && ctx.cascade < 2))) {
      pass.setPipeline(pm); pass.setBindGroup(3, V.bgTree); pass.setVertexBuffer(1, V.instBuf);
      const ccx = Math.floor((camx - V.x0) / CELL), ccz = Math.floor((camz - V.z0) / CELL);
      // nas sombras só importam os lançadores perto da cascata: alcance menor (menos vértices processados)
      let rng = (shadow ? 96 : 114) / zoom; if (rng > 620) rng = 620; const rc = ((rng / CELL) | 0) + 1, rng2 = rng * rng;
      for (let a = 0; a < NA; a++) {
        let set = false; const ur = 82 / zoom, m = V.meshes[a], ru = a >= VEG_NT ? (ur < 620 ? ur : 620) : rng, ru2 = ru * ru;
        for (let dz = -rc; dz <= rc; dz++) for (let dx = -rc; dx <= rc; dx++) {
          const cx = ccx + dx, cz = ccz + dz; if (cx < 0 || cz < 0 || cx >= NC || cz >= NC) continue;
          const c = cz * NC + cx, cnt = V.cellCount[c * NA + a]; if (!cnt) continue;
          const mx = V.x0 + cx * CELL, mz = V.z0 + cz * CELL;
          const ex = camx < mx ? mx - camx : camx > mx + CELL ? camx - mx - CELL : 0, ez = camz < mz ? mz - camz : camz > mz + CELL ? camz - mz - CELL : 0;
          if (ex * ex + ez * ez > ru2) continue;
          if (!(SQ[0] = mx + CELL / 2, SQ[1] = V.cellY[c] + 10, SQ[2] = mz + CELL / 2, SQ[3] = 62, sphereQ(ctx.planes, ctx.nPlanes))) continue;
          if (!set) { pass.setVertexBuffer(0, m.vb); pass.setIndexBuffer(m.ib, 'uint32'); set = true; }
          pass.drawIndexed(m.count, cnt, 0, 0, V.cellStart[c * NA + a]);
          if (kind === KIND.GBUF) { st.meshDraws++; st.meshInst += cnt; st.meshTris += cnt * m.count / 3; }
        }
      }
    }
    // --- hojas individuales (muy cercanas): por subcelda de 16 m ---
    const pl = V.famLeaf.pipe[kind];
    if (pl && V.onMesh && V.onLeaf && kind === KIND.GBUF) {
      pass.setPipeline(pl); pass.setVertexBuffer(1, V.instBuf);
      let rl = 62 / zoom; if (rl > 230) rl = 230; const S16 = 16, rs = ((rl / S16) | 0) + 1, scx = Math.floor((camx - V.x0) / S16), scz = Math.floor((camz - V.z0) / S16), n16 = NC * 4;
      for (let a = 0; a < VEG_NT; a++) {
        const m = V.leafMeshes[a]; if (!m) continue; let set = false;
        for (let dz = -rs; dz <= rs; dz++) for (let dx = -rs; dx <= rs; dx++) {
          const sx = scx + dx, sz = scz + dz; if (sx < 0 || sz < 0 || sx >= n16 || sz >= n16) continue;
          const c = (sz >> 2) * NC + (sx >> 2), q = (c * NA + a) * 16 + (sz & 3) * 4 + (sx & 3), cnt = V.subCount[q]; if (!cnt) continue;
          const mx = V.x0 + sx * S16, mz = V.z0 + sz * S16;
          const ex = camx < mx ? mx - camx : camx > mx + S16 ? camx - mx - S16 : 0, ez = camz < mz ? mz - camz : camz > mz + S16 ? camz - mz - S16 : 0;
          const d2 = ex * ex + ez * ez; if (d2 > rl * rl) continue;
          // fracción foliar aún visible a esta distancia (en el shader de hoja, las de fase alta se atenúan antes)
          let fr = 1.6 - Math.sqrt(d2) * zoom / 38; if (fr <= 0.02) continue; if (fr > 1) fr = 1;
          if (!(SQ[0] = mx + 8, SQ[1] = V.cellY[c] + 10, SQ[2] = mz + 8, SQ[3] = 28, sphereQ(ctx.planes, ctx.nPlanes))) continue;
          if (!set) { pass.setVertexBuffer(0, m.vb); pass.setIndexBuffer(m.ib, 'uint32'); set = true; }
          pass.drawIndexed(((m.n * fr) | 0) * 6, cnt, 0, 0, V.subStart[q]);
          st.leafDraws++; st.leafInst += cnt; st.leafTris += cnt * ((m.n * fr) | 0) * 2;
        }
      }
    }
    // --- impostores billboard (lejanos), en anillos de superceldas: de frente hacia atrás ---
    const pi = V.famImp.pipe[kind]; if (!pi || !V.onImp) return;
    pass.setPipeline(pi); pass.setBindGroup(3, V.bgImp);
    if (shadow) {
      pass.setVertexBuffer(0, V.instSunBuf); const NS = V.NS, SUP = V.SUP, stat = ctx.cascade === 3;
      for (let q = 0; q < NS * NS; q++) {
        const s = V.sunOrder[q], cnt = V.sunCount[s]; if (!cnt) continue;
        const sx = s % NS, sz = (s - sx) / NS, x = V.x0 + (sx + 0.5) * SUP, z = V.z0 + (sz + 0.5) * SUP;
        if (!stat) { const dx = x - camx, dz = z - camz; if (dx * dx + dz * dz > 640 * 640) continue; if (!(SQ[0] = x, SQ[1] = V.supY[s] + 12, SQ[2] = z, SQ[3] = 215, sphereQ(ctx.planes, ctx.nPlanes))) continue; }
        pass.draw(4, cnt, 0, V.sunStart[s]);
      }
      return;
    }
    pass.setVertexBuffer(0, V.instBuf);
    const NS = V.NS, SUP = V.SUP, scx = clamp(Math.floor((camx - V.x0) / SUP), 0, NS - 1), scz = clamp(Math.floor((camz - V.z0) / SUP), 0, NS - 1);
    const all = shadow && ctx.cascade === 3, maxR = all || kind === KIND.GBUF ? NS : 3;
    for (let r = 0; r < maxR; r++) for (let dz = -r; dz <= r; dz++) {
      const stp = (dz === -r || dz === r) ? 1 : 2 * r;
      for (let dx = -r; dx <= r; dx += stp || 1) {
        const sx = (all ? 0 : scx) + dx, sz = (all ? 0 : scz) + dz; if (sx < 0 || sz < 0 || sx >= NS || sz >= NS) continue;
        const s = sz * NS + sx, cnt = V.supCount[s]; if (!cnt) continue;
        if (!all && !(SQ[0] = V.x0 + (sx + 0.5) * SUP, SQ[1] = V.supY[s] + 12, SQ[2] = V.z0 + (sz + 0.5) * SUP, SQ[3] = 215, sphereQ(ctx.planes, ctx.nPlanes))) continue;
        pass.draw(4, cnt, 0, V.supStart[s]); if (kind === KIND.GBUF) st.impDraws++;
      }
    }
  }
};

// BUILD se declara en 90_main.js: registra en microtarea que corre antes del bucle de construcción
queueMicrotask(() => BUILD.push(async () => {
  if (GAME.mode === 'test' || GAME.mode === 'car' || Q.has('noveg') || (typeof TRK !== 'undefined' && TRK.spec && TRK.spec.glb && !TRK.spec.glbFailed)) return;
  const V = VEG, dev = G.dev;
  V.leafTex = vegAtlasBuild(); V.leafView = V.leafTex.createView(); R.view.vegLeaf = V.leafView;
  V.sLeaf = dev.createSampler({ minFilter: 'linear', magFilter: 'linear', mipmapFilter: 'linear', maxAnisotropy: 8 });
  V.sImp = dev.createSampler({ minFilter: 'linear', magFilter: 'linear', mipmapFilter: 'linear', maxAnisotropy: 4 });
  const cpu = vegArchetypes(); V.meshes = cpu.map(m => m.upload());
  V.leafMeshes = cpu.map(m => (m.leaves && m.leaves.n) ? m.leaves.upload() : null);
  V.famLeaf = mkFamily('vegLeaf', { src: 'veg_leaf', buffers: [VEG_LEAF_LAYOUT, VEG_INST], alpha: true, cull: 'none', noCube: true, noShadow: true });
  // viés de sombra inclinado maior: cartões grandes e planos quase paralelos ao sol baixo se auto-sombreavam em hachura diagonal
  V.famTree = mkFamily('vegTree', { src: 'veg_tree', buffers: [VLAYOUT, VEG_INST], alpha: true, cull: 'none', noCube: true, shadowBias: 24, shadowSlope: 7 });
  V.famImp = mkFamily('vegImp', { src: 'veg_imp', buffers: [VEG_INST], alpha: true, cull: 'none', topology: 'triangle-strip', shadowBias: 4 });
  vegBakeImpostors(cpu);
  V.viewA = V.texA.createView({ dimension: '2d-array' }); V.viewN = V.texN.createView({ dimension: '2d-array' });
  V.dimBuf = mkBuf(192, BU.U, V.dims);
  V.bgTree = dev.createBindGroup({ layout: V.famTree.bgl3, entries: [{ binding: 0, resource: V.leafView }, { binding: 1, resource: V.sLeaf }] });
  V.bgImp = dev.createBindGroup({ layout: V.famImp.bgl3, entries: [{ binding: 0, resource: V.viewA }, { binding: 1, resource: V.viewN }, { binding: 2, resource: V.sImp }, { binding: 3, resource: { buffer: V.dimBuf } }] });
  vegPlace();
  R.drawables.push(vegDrawable); R.veg = V;
  if (typeof grassBuild === 'function') grassBuild();
}));

// ---- 33_veg_d_grass.js
// Vegetación — hierba en anillos concéntricos (GPU). Culling por bloque en CPU con cero asignaciones por fotograma.
const GRASS = {
  // anel: célula (m), células por bloco, blocos por lado, segmentos, [entra0, entra1, sai0, sai1] em DISTÂNCIA EFETIVA
  // (distância à câmera × zoom da lente: 1 m efetivo = o que a câmera de perseguição vê a 1 m), largura base, anel anterior
  // (o anel aparece onde o anterior não cobre: fora da área dele ou além do seu alcance).
  // Los anillos se centran en el PUNTO DE INTERÉS: junto a la cámara en persecución/capó, o sobre el coche en cámaras de TV
  // (a lente longa enquadra um gramado a 30–400 m da câmera: é lá que as lâminas precisam existir).
  // K = 0: anillo de matas de hierba (quad con textura de hierba del atlas: decenas de briznas finas por quad)
  rings: [
    { cell: 0.075, bs: 36, B: 10, K: 3, q: [-1, -0.5, 7.2, 11.2], w: 0.0095, prev: -1 },   // primeiro plano: lâminas finas e densas (178/m²)
    { cell: 0.13, bs: 40, B: 12, K: 2, q: [7.5, 10.5, 26, 31.5], w: 0.017, prev: 0 },      // lâminas (59/m²), aparada e alta
    { cell: 0.38, bs: 48, B: 10, K: 0, q: [9, 16, 64, 82], w: 0.36, prev: 1 },
    // anel de touceiras grandes e esparsas: encostas distantes
    { cell: 0.6, bs: 48, B: 14, K: 0, q: [58, 80, 225, 268], w: 0.8, prev: 2 },
    // Anillo para teleobjetivos: matas más allá del anillo previo para fondo detallado
    { cell: 0.9, bs: 64, B: 14, K: 0, q: [215, 262, 480, 545], w: 1.1, prev: 3, tele: 1 },
    // lâminas largas e esparsas (17/m², um triângulo cada) além do anel 1: o gramado junto à pista tem relevo até ~70 m,
    // Transición suave entre manto denso y textura plana
    { cell: 0.24, bs: 40, B: 16, K: 1, q: [23, 30, 58, 74], w: 0.03, prev: 1 },
  ],
  u: new Float32Array(6 * 64), dyn: new Uint32Array(1), blades: 0, cx: new Float64Array(6), cz: new Float64Array(6),
};
function grassBuild() {
  const dev = G.dev, V = VEG;
  // máscara de mata (2 m/texel) na área dos mapas do mundo
  const fw = Math.ceil(HF.w / 2), fh = Math.ceil(HF.h / 2), fd = new Uint8Array(fw * fh);
  for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) fd[j * fw + i] = Math.round(255 * forestAt(HF.x0 + i * 2, HF.z0 + j * 2));
  const ft = mkTex(fw, fh, 'r8unorm', TU.TB | TU.CD); dev.queue.writeTexture({ texture: ft }, fd, { bytesPerRow: fw }, [fw, fh]);
  GRASS.fam = mkFamily('vegGrass', { src: 'veg_grass', buffers: [], cull: 'none', topology: 'triangle-strip', noShadow: true, noCube: true });
  GRASS.buf = mkBuf(GRASS.u.byteLength, BU.U);
  GRASS.bg = dev.createBindGroup({ layout: GRASS.fam.bgl3, entries: [{ binding: 0, resource: ft.createView() }, { binding: 1, resource: { buffer: GRASS.buf, size: 96 } }, { binding: 2, resource: V.leafView }] });
  R.drawables.push({
    draw(pass, ctx) {
      if (ctx.kind !== KIND.GBUF || !V.onGrass) return; const pipe = GRASS.fam.pipe[0]; if (!pipe) return;
      const camx = R.cam.pos[0], camy = R.cam.pos[1], camz = R.cam.pos[2], u = GRASS.u; GRASS.blades = 0;
      // Fuera del área de mapas no hay hierba
      if (camx < WM.x0 - 80 || camz < WM.z0 - 80 || camx > WM.x0 + WM.sx + 80 || camz > WM.z0 + WM.sz + 80) return;
      // zoom da lente (1 = câmera de perseguição) e ponto de interesse
      let zfac = Math.tan(R.cam.fovy * 0.5) * 2; if (zfac > 1.3) zfac = 1.3;
      const f = FR.data, px = f[FO.carMat + 12], pz = f[FO.carMat + 14], ddx = px - camx, ddz = pz - camz, dcc = Math.sqrt(ddx * ddx + ddz * ddz);
      let wf = (dcc - 12) / 18; wf = wf < 0 ? 0 : wf > 1 ? 1 : wf;
      const fx = R.cam.fwd[0], fz = R.cam.fwd[2];
      // o anel de lente longa entra aos poucos conforme o zoom fecha (sem estalo na troca)
      let zf = (0.62 - zfac) * 5; zf = zf < 0 ? 0 : zf > 1 ? 1 : zf; const nr = GRASS.rings.length;
      for (let r = 0; r < GRASS.rings.length; r++) {
        const g = GRASS.rings[r], bsz = g.cell * g.bs, o = r * 64, half = bsz * g.B * 0.5;
        // Centro: cámara (orientado hacia el campo de visión) -> coche
        const ccx = camx + fx * half * 0.35 * (1 - wf) + ddx * wf, ccz = camz + fz * half * 0.35 * (1 - wf) + ddz * wf;
        const obx = Math.floor(ccx / bsz) - g.B / 2, obz = Math.floor(ccz / bsz) - g.B / 2; GRASS.cx[r] = (obx + g.B / 2) * bsz; GRASS.cz[r] = (obz + g.B / 2) * bsz;
        u[o] = g.cell; u[o + 1] = g.bs; u[o + 2] = g.B; u[o + 3] = g.K; u[o + 4] = g.q[0]; u[o + 5] = g.q[1]; u[o + 6] = g.q[2]; u[o + 7] = g.q[3];
        u[o + 8] = g.w; u[o + 9] = r; u[o + 10] = obx; u[o + 11] = obz;
        u[o + 12] = g.tele ? zf : 1; u[o + 13] = half; u[o + 14] = GRASS.cx[r]; u[o + 15] = GRASS.cz[r];
        const pv = g.prev; u[o + 16] = zfac; u[o + 17] = pv >= 0 ? GRASS.rings[pv].cell * GRASS.rings[pv].bs * GRASS.rings[pv].B * 0.5 : 0; u[o + 18] = pv >= 0 ? GRASS.cx[pv] : 0; u[o + 19] = pv >= 0 ? GRASS.cz[pv] : 0;
      }
      G.dev.queue.writeBuffer(GRASS.buf, 0, u);
      pass.setPipeline(pipe);
      for (let r = 0; r < nr; r++) {
        const g = GRASS.rings[r]; if (g.tele && zf <= 0) continue;
        const bsz = g.cell * g.bs, o = r * 64, ox = u[o + 10], oz = u[o + 11], B = g.B, per = g.bs * g.bs, nv = g.K ? 2 * g.K + 1 : 4, rad = bsz * 0.7072 + 1.2;
        const pv = g.prev, ph = pv >= 0 ? u[o + 17] * 0.8 : 0, pcx = u[o + 18], pcz = u[o + 19], qin = g.q[0], qout = g.q[3];
        GRASS.dyn[0] = r * 256; pass.setBindGroup(3, GRASS.bg, GRASS.dyn, 0, 1);
        for (let bz = 0; bz < B; bz++) {
          let run = -1;
          for (let bx = 0; bx <= B; bx++) {
            let vis = false;
            if (bx < B) {
              const x = (ox + bx + 0.5) * bsz, z = (oz + bz + 0.5) * bsz, dx = x - camx, dz = z - camz, d = Math.sqrt(dx * dx + dz * dz);
              // Bloque fuera de alcance o cubierto por anillo previo: no se dibuja
              let ok = (d - rad) * zfac < qout;
              if (ok && pv >= 0 && (d + rad) * zfac < qin) { const ex = x - pcx, ez = z - pcz, ax = ex < 0 ? -ex : ex, az = ez < 0 ? -ez : ez; if ((ax > az ? ax : az) + bsz * 0.5 < ph) ok = false; }
              // Bloques fuera del mapa no tienen hierba
              if (ok && x > HF.x0 + 2 && z > HF.z0 + 2 && x < HF.x0 + HF.w - 3 && z < HF.z0 + HF.h - 3) vis = (SQ[0] = x, SQ[1] = (_gq[0] = x, _gq[1] = z, hfAtQ(_gq), _gq[6]) + 0.3, SQ[2] = z, SQ[3] = rad, sphereQ(ctx.planes, ctx.nPlanes));
            }
            if (vis && run < 0) run = bx;
            else if (!vis && run >= 0) { pass.draw(nv, (bx - run) * per, 0, (bz * B + run) * per); GRASS.blades += (bx - run) * per; run = -1; }
          }
        }
      }
    }
  });
}
