'use strict';
// Atlas procedural de vegetación (hojas, agujas, corteza)
window.buildVegAtlas = function() {
    const TS = VEG_TS, W = TS * VEG_TW, H = TS * VEG_TH;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const rnd = mkRng(90210);
    const rr = (a, b) => a + (b - a) * rnd();
    const hsl = (h, s, l, a) => `hsla(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%,${a === undefined ? 1 : a})`;

    const leaf = (x, y, ang, len, wid, hue, sat, lig, tipk) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      const k = tipk || 0.72;
      g.fillStyle = hsl(hue, sat, lig);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.25, -wid * 1.15, len * k, -wid * 0.9, len, 0); g.bezierCurveTo(len * k, wid * 0.9, len * 0.25, wid * 1.15, 0, 0); g.fill();
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
          const dk = rnd() < 0.32 ? -10 : 0;
          leaf(px, py, a + s2 * rr(0.55, 1.2) + (P.droop || 0) * 0.5 * Math.cos(a), L, L * P.leafW * rr(0.85, 1.15), P.hue + rr(-10, 9) + (rnd() < 0.06 ? -30 : 0), P.sat + rr(-8, 8), P.lig + rr(-5, 6) + dk, P.tipk);
        }
      }
      leaf(px, py, a + rr(-0.2, 0.2), P.leafL * 1.05, P.leafL * P.leafW, P.hue + rr(-8, 8), P.sat, P.lig + rr(-3, 6), P.tipk);
    };

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
    // 2: hoja de palmera
    tile(2, () => {
      const n = 46; let px = 256, py = 506;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = 256 + Math.sin(t * 1.1) * 14, y = 506 - t * 496;
        if (i) stem(px, py, x, y, 5 * (1 - t) + 1.2, 70, 26); px = x; py = y;
        if (i < 2) continue;
        const L = (60 + 170 * Math.sin(Math.min(1, t * 1.25) * PI * 0.62)) * rr(0.85, 1.1) * (1 - t * t * 0.55);
        for (let s = -1; s <= 1; s += 2) {
          const a = -PI / 2 + s * (1.25 - t * 0.55) + rr(-0.08, 0.08);
          g.strokeStyle = hsl(88 + rr(-5, 5), 40 + rr(-4, 4), 25 + rr(-2, 3)); g.lineWidth = rr(8.5, 11.5) * (1 - t * 0.35); g.lineCap = 'round';
          const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L + L * 0.22;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * L * 0.55, y + Math.sin(a) * L * 0.55 - 6, ex, ey); g.stroke();
          g.strokeStyle = hsl(96, 34, 34, 0.22); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * L * 0.55, y + Math.sin(a) * L * 0.55 - 6, ex, ey); g.stroke();
        }
      }
    });
    // 3: fronda de helecho
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
    // 4: roseta de hojas palmadas
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
    // 5: franja de hierba
    tile(5, () => {
      const blade = (x0, L, w, a, bend, dry, lig) => {
        const x1 = x0 + Math.cos(a) * L * 0.55, y1 = 508 + Math.sin(a) * L * 0.55, x2 = x0 + Math.cos(a) * L + bend, y2 = 508 + Math.sin(a) * L + Math.abs(bend) * 0.45;
        const gr = g.createLinearGradient(x0, 508, x2, y2); const h = dry ? 52 + rr(-8, 8) : 82 + rr(-14, 14), sa = dry ? 34 : 40, l = lig + rr(-5, 6);
        gr.addColorStop(0, hsl(h + 14, sa, l - 10)); gr.addColorStop(0.55, hsl(h, sa, l + 2)); gr.addColorStop(1, hsl(dry ? h - 4 : h - 26, sa - 4, l + (dry ? 20 : 13)));
        g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w / 2, 508); g.quadraticCurveTo(x1 - w * 0.4, y1, x2, y2); g.quadraticCurveTo(x1 + w * 0.4, y1, x0 + w / 2, 508); g.fill();
        return [x2, y2, a];
      };
      for (let k = 0; k < 150; k++) blade(rr(14, 498), rr(70, 190), rr(3.5, 6), -PI / 2 + rr(-0.42, 0.42), rr(-22, 22), rnd() < 0.1, 19);
      for (let k = 0; k < 120; k++) blade(rr(18, 494), rr(170, 340), rr(3.5, 6.5), -PI / 2 + rr(-0.32, 0.32), rr(-55, 55), rnd() < 0.16, 24);
      for (let k = 0; k < 46; k++) blade(rr(30, 482), rr(320, 480), rr(3, 5.5), -PI / 2 + rr(-0.22, 0.22), rr(-80, 80), rnd() < 0.22, 27);
      for (let k = 0; k < 9; k++) {
        const e = blade(rr(60, 452), rr(380, 470), 2.4, -PI / 2 + rr(-0.12, 0.12), rr(-28, 28), true, 30);
        g.fillStyle = hsl(46 + rr(-6, 6), 38, 34 + rr(-4, 6)); for (let q = 0; q < 7; q++) { g.beginPath(); g.ellipse(e[0] + rr(-3, 3), e[1] + q * 5 - 4, 2.2, 5.5, rr(-0.5, 0.5), 0, TAU); g.fill(); }
      }
    });
    // 6: masa dispersa de hojas estrechas y colgantes
    tile(6, () => cluster({ depth: 2, step: 15, stemW: 1.3, branchP: 0.5, leafL: 25, leafW: 0.19, perNode: 3, leafP: 0.66, hue: 88, sat: 27, lig: 25, tipk: 0.58, droop: 1 }, 5, 2.3, 330, 450));
    // 7: hojas grandes y brillantes en abanico (arbusto)
    tile(7, () => {
      for (let k = 0; k < 44; k++) {
        const a = -PI / 2 + rr(-1.15, 1.15), r0 = rr(20, 300) * (1 - Math.abs(a + PI / 2) * 0.3), x = 256 + Math.cos(a) * r0, y = 500 + Math.sin(a) * r0, L = rr(80, 140);
        stem(256, 506, x, y, 2, 60, 18);
        leaf(x, y, a + rr(-0.5, 0.5), L, L * 0.26, 112 + rr(-12, 10), 36, 19 + rr(-5, 8), 0.66);
      }
    });

    // Lectura de pixels y pirámide de mipmaps preservando cobertura alfa
    const img = g.getImageData(0, 0, W, H).data;
    let cur = new Float32Array(W * H * 4);
    const s2l = new Float32Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; s2l[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    const l2s = v => Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
    for (let i = 0; i < W * H; i++) { const a = img[i * 4 + 3] / 255; cur[i * 4] = s2l[img[i * 4]] * a; cur[i * 4 + 1] = s2l[img[i * 4 + 1]] * a; cur[i * 4 + 2] = s2l[img[i * 4 + 2]] * a; cur[i * 4 + 3] = a; }
    const levels = Math.log2(TS) + 1 - 2;
    const tex = G.dev.createTexture({ size: [W, H], format: 'rgba8unorm-srgb', usage: TU.TB | TU.CD, mipLevelCount: levels });
    const coverage = (buf, w, h, scale) => { let c = 0; for (let i = 0; i < w * h; i++) if (buf[i * 4 + 3] * scale >= 0.5) c++; return c / (w * h); };
    const cov0 = coverage(cur, W, H, 1);

    const pyr = [{ d: cur, w: W, h: H }];
    while (pyr[pyr.length - 1].h > 1) {
      const s0 = pyr[pyr.length - 1], nw = s0.w >> 1, nh = s0.h >> 1, nx = new Float32Array(nw * nh * 4), c0 = s0.d, w0 = s0.w;
      for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
        const o = (y * nw + x) * 4, a = (y * 2 * w0 + x * 2) * 4, b = a + 4, c = a + w0 * 4, d = c + 4;
        for (let k = 0; k < 4; k++) nx[o + k] = (c0[a + k] + c0[b + k] + c0[c + k] + c0[d + k]) * 0.25;
      }
      pyr.push({ d: nx, w: nw, h: nh });
    }

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

    const a0 = new Float32Array(W * H), a1 = new Float32Array(W * H), KB = [0.0625, 0.25, 0.375, 0.25, 0.0625];
    for (let i = 0; i < W * H; i++) a0[i] = cur[i * 4 + 3];
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -2; k <= 2; k++) { const xx = x + k < 0 ? 0 : x + k >= W ? W - 1 : x + k; v += a0[y * W + xx] * KB[k + 2]; } a1[y * W + x] = v; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -2; k <= 2; k++) { const yy = y + k < 0 ? 0 : y + k >= H ? H - 1 : y + k; v += a1[yy * W + x] * KB[k + 2]; } a0[y * W + x] = v; }
    }

    for (let m = 0; m < levels; m++) {
      const s0 = pyr[m], w = s0.w, h = s0.h, c0 = s0.d, f = fillc[m]; let scale = 1;
      if (m > 0) {
        let lo = 0.5, hi = 6; for (let it = 0; it < 12; it++) { scale = (lo + hi) / 2; if (coverage(c0, w, h, scale) < cov0) lo = scale; else hi = scale; }
      }
      const out = new Uint8Array(w * h * 4);
      for (let i = 0; i < w * h; i++) { out[i * 4] = l2s(f[i * 3]); out[i * 4 + 1] = l2s(f[i * 3 + 1]); out[i * 4 + 2] = l2s(f[i * 3 + 2]); out[i * 4 + 3] = Math.round(255 * Math.min(1, (m === 0 ? a0[i] : c0[i * 4 + 3]) * scale)); }
      G.dev.queue.writeTexture({ texture: tex, mipLevel: m }, out, { bytesPerRow: w * 4 }, [w, h]);
    }
    return tex;
};
