'use strict';
// ---- engine/vegetation-factory.js
// Factoría central de vegetación (SOLID: Single Responsibility & Factory Pattern).
// Genera proceduralmente el atlas 2D de texturas foliares (con mipmaps y preservación de cobertura alfa)
// y las mallas 3D de arquetipos arbóreos (árboles, palmeras, arbustos, helechos, sotobosque).

(() => {
  const VEG_CFG = (typeof window !== 'undefined' && window.__CFG_ENGINE_VEGETATION_FACTORY)
    || (typeof require === 'function' ? (() => { try { return require('../config/engine/vegetation-factory.json'); } catch { return {}; } })() : {});
  const _vfC = VEG_CFG.vegetationFactory || {};
  const VEG_TS = _vfC.tileSize ? _vfC.tileSize.value : 1024;
  const VEG_TW = _vfC.tileCols ? _vfC.tileCols.value : 4;
  const VEG_TH = _vfC.tileRows ? _vfC.tileRows.value : 2;
  const VEG_NT = _vfC.impostorTypes ? _vfC.impostorTypes.value : 6;
  const VEG_NA = _vfC.totalArchetypes ? _vfC.totalArchetypes.value : 9;
  const VEG_BARK = _vfC.barkColors ? _vfC.barkColors.value : [[0.135, 0.108, 0.083], [0.19, 0.172, 0.146], [0.15, 0.128, 0.1]];

  // Capa de hojas individuales (visión cercana): un quad por hoja, silueta y nervaduras analíticas en el shader.
  // Vértice (32 bytes): pos f32x3 | off snorm16x4 (canto - base da folha, em 0,6 m; w = peso de balanço) | normal snorm8x4 (w = tremor)
  //                     | uint8x4 (u, v, fase, AO) | unorm8x4 (tinta rgb, tipo de folha)
  const VEG_LEAF_LAYOUT = { arrayStride: 32, attributes: [
    { shaderLocation: 0, offset: 0, format: 'float32x3' },
    { shaderLocation: 1, offset: 12, format: 'snorm16x4' },
    { shaderLocation: 2, offset: 20, format: 'snorm8x4' },
    { shaderLocation: 3, offset: 24, format: 'uint8x4' },
    { shaderLocation: 4, offset: 28, format: 'unorm8x4' }
  ]};

  class VegLeafBuf {
    constructor() { this.cap = _vfC.leafBufCap ? _vfC.leafBufCap.value : 4096; this.n = 0; this._mk(); }
    _mk() { const b = new ArrayBuffer(this.cap * 4 * 32); if (this.u8) new Uint8Array(b).set(this.u8); this.buf = b; this.f32 = new Float32Array(b); this.i16 = new Int16Array(b); this.i8 = new Int8Array(b); this.u8 = new Uint8Array(b); }
    // folha: base b, eixo ax (unitário), lado sd (unitário), normal nl, comprimento L, meia largura hw
    add(b, ax, sd, nl, L, hw, sway, ph, ao, tint, type) {
      if (this.n >= this.cap) { this.cap *= 2; this._mk(); }
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
        const L = sz * rr(0.75, 1.25), o = (P.scat || sz * 0.35) * (0.4 + 0.6 * rnd()); const cj = rr(0.93, 1.07); C.tint = [BT[0] * cj, BT[1] * cj, BT[2] * rr(0.94, 1.04)];
        const cb = [b[0] - dir[0] * L * 0.15 + rr(-o, o), b[1] - dir[1] * L * 0.15 + rr(-o, o) * 0.6, b[2] - dir[2] * L * 0.15 + rr(-o, o)];
        vegCard(mb, cb, dir, side, L, L * P.aspect, P.tiles[Math.floor(rnd() * P.tiles.length)], C, w, rnd, q % 3 === 0 ? P.droop : 0, q % 3 === 0 ? 2 : 1);
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
          const tn = [C.tint[0] * lj, C.tint[1] * lj, C.tint[2] * rq(0.92, 1.06)];
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

  let VEG_ARCHETYPES_CFG = null;
  if (typeof fetch === 'function') {
    fetch('config/vegetation-archetypes.json' + (typeof window !== 'undefined' && window.CACHE_VERSION ? '?v=' + window.CACHE_VERSION : ''))
      .then(r => r.json()).then(d => { VEG_ARCHETYPES_CFG = d; }).catch(() => {});
  }

  function buildArchetypes() {
    const A = [];
    const trees = (VEG_ARCHETYPES_CFG && VEG_ARCHETYPES_CFG.trees) || [];
    if (trees.length >= 4) {
      A.push(vegGenTree(trees[0].params, trees[0].seed));
      A.push(vegGenTree(trees[1].params, trees[1].seed));
      A.push(vegGenTree(trees[2].params, trees[2].seed));
      A.push(vegGenPalm(41));
      A.push(vegGenTree(trees[3].params, trees[3].seed));
    }
    A.push(vegGenBush(59));
    A.push(vegGenUnder(0, 61)); A.push(vegGenUnder(1, 67)); A.push(vegGenUnder(2, 71));
    return A;
  }

  const buildAtlas = () => window.buildVegAtlas();

  const VegetationFactory = {
    VEG_TS,
    VEG_TW,
    VEG_TH,
    VEG_NT,
    VEG_NA,
    VEG_LEAF_LAYOUT,
    VEG_BARK,
    VegLeafBuf,
    vegTileUV,
    vegTube,
    vegCard,
    vegGenTree,
    vegGenPalm,
    vegGenUnder,
    vegGenBush,
    buildArchetypes,
    buildAtlas,
  };

  if (typeof window !== 'undefined') window.VegetationFactory = VegetationFactory;
  if (typeof globalThis !== 'undefined') globalThis.VegetationFactory = VegetationFactory;
  if (typeof module !== 'undefined' && module.exports) module.exports = { VegetationFactory, VegLeafBuf };
})();
