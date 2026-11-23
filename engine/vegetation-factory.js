'use strict';
// ---- engine/vegetation-factory.js
// Factoría central de vegetación (SOLID: Single Responsibility & Factory Pattern).
// Genera proceduralmente el atlas 2D de texturas foliares (con mipmaps y preservación de cobertura alfa)
// y las mallas 3D de arquetipos arbóreos (árboles, palmeras, arbustos, helechos, sotobosque).

(() => {
  const VEG_TS = 1024, VEG_TW = 4, VEG_TH = 2;   // Baldosas de 1024x1024 (diseño vectorial sobre canvas 2D)
  const VEG_NT = 6, VEG_NA = 9;   // arquetipos con impostor (árboles + arbusto grande) / total (con sotobosque)
  const VEG_BARK = [[0.135, 0.108, 0.083], [0.19, 0.172, 0.146], [0.15, 0.128, 0.1]];   // marrom rugosa, cinzenta lisa, palmeira

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
    constructor() { this.cap = 4096; this.n = 0; this._mk(); }
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

  function buildArchetypes() {
    const A = [];
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

  function buildAtlas() {
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
  }

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
