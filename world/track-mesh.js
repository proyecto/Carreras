"use strict";
// ---- 31_world.js
// Escenario: terreno estático en quadtree (denso junto a la pista, grueso lejos) y cinta de pista (asfalto, pianos, arcén).
// Todo estático: sin cambios bruscos de LOD en tiempo de ejecución.
const TRACK_MESH_CFG = (typeof window !== 'undefined' && window.__CFG_WORLD_TRACK_MESH)
  || (typeof require === 'function' ? (() => { try { return require('../config/world/track-mesh.json'); } catch { return {}; } })() : {});
const _tmC = TRACK_MESH_CFG.WORLD || {};
const WORLD = {
  active: !["test", "car", "placeholder"].includes(Q.get("scene") || "game"),
  line: null, // Desviación lateral de la trazada por muestra (usa TRK.line si existe)
  // Tramos mojados definidos por el circuito activo
  wet: [],
  tvCams: [], // preenchido em 32_props.js: {x, y, z, s} (posições sugeridas das câmeras de TV)
  stats: { tris: {}, ranges: {} },
  cnt: new Int32Array(6), // Contadores de diagnóstico [draws, triángulos]
  canopyStart: _tmC.canopyStart ? _tmC.canopyStart.value : 320,
  canopyEnd: _tmC.canopyEnd ? _tmC.canopyEnd.value : 900, // Distancia en que el sotobosque transiciona a textura de copa
};
// Conjunto de rangos de índices con esfera envolvente para frustum culling por pass.
// flags: 1 principal, 2 sombra, 4 cubemap. maxDist: distancia de desvanecimiento.
class RangeSet {
  constructor(fam, bg3) {
    this.fam = fam;
    this.bg3 = bg3 || null;
    this.r = [];
    this.vb = null;
    this.ib = null;
  }
  // Registra como rango los índices generados desde i0
  add(mb, i0, flags, maxDist) {
    if (mb.ni <= i0) return;
    let x0 = 1e9,
      y0 = 1e9,
      z0 = 1e9,
      x1 = -1e9,
      y1 = -1e9,
      z1 = -1e9;
    const f = mb.f32,
      ix = mb.idx;
    for (let i = i0; i < mb.ni; i++) {
      const v = ix[i] * 9,
        x = f[v],
        y = f[v + 1],
        z = f[v + 2];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
    this.r.push({
      first: i0,
      count: mb.ni - i0,
      x: (x0 + x1) / 2,
      y: (y0 + y1) / 2,
      z: (z0 + z1) / 2,
      rad: Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2,
      flags: flags === undefined ? 7 : flags,
      maxDist: maxDist || 1e9,
    });
  }
  // registra a faixa de índices [i0, i1)
  addRange(mb, i0, i1, flags, maxDist) {
    if (i1 <= i0) return;
    let x0 = 1e9,
      y0 = 1e9,
      z0 = 1e9,
      x1 = -1e9,
      y1 = -1e9,
      z1 = -1e9;
    const f = mb.f32,
      ix = mb.idx;
    for (let i = i0; i < i1; i++) {
      const v = ix[i] * 9,
        x = f[v],
        y = f[v + 1],
        z = f[v + 2];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
    this.r.push({
      first: i0,
      count: i1 - i0,
      x: (x0 + x1) / 2,
      y: (y0 + y1) / 2,
      z: (z0 + z1) / 2,
      rad: Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2,
      flags: flags === undefined ? 7 : flags,
      maxDist: maxDist || 1e9,
    });
  }
  upload(mb) {
    const m = mb.upload();
    this.vb = m.vb;
    this.ib = m.ib;
    return m;
  }
  draw(pass, ctx) {
    const pipe = this.fam.pipe[ctx.kind];
    if (!pipe || !this.vb) return;
    const bit = 1 << ctx.kind,
      rs = this.r,
      stat = ctx.kind === 1 && ctx.cascade === 3;
    let set = false;
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i];
      if (!(r.flags & bit)) continue;
      if (
        !((SQ[0] = r.x),
        (SQ[1] = r.y),
        (SQ[2] = r.z),
        (SQ[3] = r.rad),
        sphereQ(ctx.planes, ctx.nPlanes))
      )
        continue;
      if (!stat) {
        const dx = r.x - ctx.cx,
          dy = r.y - ctx.cy,
          dz = r.z - ctx.cz,
          md = r.maxDist + r.rad;
        if (dx * dx + dy * dy + dz * dz > md * md) continue;
      }
      if (!set) {
        pass.setPipeline(pipe);
        R.dyn2[0] = 0;
        pass.setBindGroup(2, R.objBG, R.dyn2, 0, 1);
        if (this.bg3) pass.setBindGroup(3, this.bg3);
        pass.setVertexBuffer(0, this.vb);
        pass.setIndexBuffer(this.ib, "uint32");
        set = true;
      }
      pass.drawIndexed(r.count, 1, r.first, 0, 0);
      WORLD.cnt[ctx.kind * 2]++;
      WORLD.cnt[ctx.kind * 2 + 1] += r.count / 3;
    }
  }
}
// constantes do circuito repassadas aos shaders
function worldDefs() {
  const trk =
    (typeof TRK !== "undefined" && TRK.spec) ||
    (typeof TRACKS !== "undefined" && TRACKS.active) ||
    null;
  const p = TRK.pit,
    f = (v) => v.toFixed(3);
  const d = {
    TRK_HW: f(TRK.hw),
    TRK_LEN: f(TRK.L),
    KERB_WID: f(KERB_W),
    PIT_S0: f(p.s0),
    PIT_S1: f(p.s1),
    PIT_WALL: f(p.wallD),
    PIT_L0: f(p.laneD0),
    PIT_L1: f(p.laneD1),
    PIT_B0: f(p.bldS0),
    PIT_B1: f(p.bldS1),
    PIT_BD: f(p.bldD0),
    CANOPY_A: f(WORLD.canopyStart),
    CANOPY_B: f(WORLD.canopyEnd),
  };
  if (trk && (trk.urban || trk.id === "las-vegas-strip")) d.URBAN = "1";
  return d;
}

// ---------- terreno ----------
function terrainBuild() {
  const NQ = 16,
    ROOT = 16384,
    MINS = 16;
  const rx0 = Math.round(TRK.cx / 16) * 16 - ROOT / 2,
    rz0 = Math.round(TRK.cz / 16) * 16 - ROOT / 2;
  const X = TRK.x,
    Z = TRK.z,
    NT = TRK.N;
  // distância da caixa (centro, meio lado) ao eixo da pista
  const tcx = (TRK.bx0 + TRK.bx1) / 2,
    tcz = (TRK.bz0 + TRK.bz1) / 2,
    thx = (TRK.bx1 - TRK.bx0) / 2,
    thz = (TRK.bz1 - TRK.bz0) / 2;
  const distBox = (cx, cz, h) => {
    const bx = Math.max(Math.abs(cx - tcx) - h - thx, 0),
      bz = Math.max(Math.abs(cz - tcz) - h - thz, 0),
      lower = Math.hypot(bx, bz);
    if (lower > h * 8) return lower;
    let m = 1e18;
    for (let i = 0; i < NT; i += 3) {
      const dx = Math.max(Math.abs(X[i] - cx) - h, 0),
        dz = Math.max(Math.abs(Z[i] - cz) - h, 0),
        d = dx * dx + dz * dz;
      if (d < m) m = d;
    }
    return Math.sqrt(m);
  };
  const splitCache = new Map();
  const split = (x, z, size) => {
    if (size <= MINS) return false;
    if (size > 4096) return true;
    const key = x + "," + z + "," + size;
    let v = splitCache.get(key);
    if (v === undefined) {
      v =
        distBox(x + size / 2, z + size / 2, size / 2) <
        size * (size >= 256 ? 3.4 : 2.0);
      /* nodos lejanos más refinados: la silueta montañosa no muestra facetas */ splitCache.set(
        key,
        v,
      );
    }
    return v;
  };
  const leaves = [];
  const rec = (x, z, size) => {
    if (split(x, z, size)) {
      const h = size / 2;
      rec(x, z, h);
      rec(x + h, z, h);
      rec(x, z + h, h);
      rec(x + h, z + h, h);
    } else leaves.push(x, z, size);
  };
  rec(rx0, rz0, ROOT);
  // tamanho da folha que contém um ponto
  const sizeAt = (px, pz) => {
    if (px < rx0 || pz < rz0 || px >= rx0 + ROOT || pz >= rz0 + ROOT) return 0;
    let x = rx0,
      z = rz0,
      size = ROOT;
    while (split(x, z, size)) {
      const h = size / 2;
      if (px >= x + h) x += h;
      if (pz >= z + h) z += h;
      size = h;
    }
    return size;
  };
  const hx1 = HF.x0 + HF.w - 1,
    hz1 = HF.z0 + HF.h - 1;
  const H = (px, pz) =>
    px >= HF.x0 &&
    pz >= HF.z0 &&
    px <= hx1 &&
    pz <= hz1 &&
    Number.isInteger(px) &&
    Number.isInteger(pz)
      ? HF.d[(pz - HF.z0) * HF.w + (px - HF.x0)]
      : terrainH(px, pz);
  const mb = new MeshBuilder(1 << 19),
    rs = WORLD.terrain;
  const W = NQ + 3,
    hg = new Float32Array(W * W);
  // ordena los nodos por cuadrícula espacial para generar franjas contiguas
  const nL = leaves.length / 3,
    order = [];
  for (let i = 0; i < nL; i++) order.push(i);
  const bucketOf = (i) => {
    const s = leaves[i * 3 + 2],
      b = s >= 256 ? s : s >= 64 ? 512 : 128;
    return (
      b +
      ":" +
      Math.floor(leaves[i * 3] / b) +
      ":" +
      Math.floor(leaves[i * 3 + 1] / b)
    );
  };
  const bk = order.map(bucketOf);
  order.sort((a, b) => (bk[a] < bk[b] ? -1 : bk[a] > bk[b] ? 1 : 0));
  let cur = null,
    i0 = 0;
  for (const li of order) {
    if (bk[li] !== cur) {
      if (cur !== null) rs.add(mb, i0, 7);
      cur = bk[li];
      i0 = mb.ni;
    }
    const x = leaves[li * 3],
      z = leaves[li * 3 + 1],
      size = leaves[li * 3 + 2],
      st = size / NQ;
    for (let j = -1; j <= NQ + 1; j++)
      for (let i = -1; i <= NQ + 1; i++)
        hg[(j + 1) * W + i + 1] = H(x + i * st, z + j * st);
    // vizinhos mais grossos: alturas da borda seguem a aresta do vizinho (sem rachaduras)
    const nb = [
      sizeAt(x - 1, z + size / 2),
      sizeAt(x + size + 1, z + size / 2),
      sizeAt(x + size / 2, z - 1),
      sizeAt(x + size / 2, z + size + 1),
    ];
    const snap = (i, j, alongX, ns) => {
      const cst = ns / NQ,
        t = alongX ? x + i * st : z + j * st,
        t0 = Math.floor(t / cst) * cst;
      if (t0 === t) return;
      const a = alongX ? H(t0, z + j * st) : H(x + i * st, t0),
        b = alongX ? H(t0 + cst, z + j * st) : H(x + i * st, t0 + cst);
      hg[(j + 1) * W + i + 1] = a + ((b - a) * (t - t0)) / cst;
    };
    for (let q = 1; q < NQ; q++) {
      if (nb[0] > size) snap(0, q, false, nb[0]);
      if (nb[1] > size) snap(NQ, q, false, nb[1]);
      if (nb[2] > size) snap(q, 0, true, nb[2]);
      if (nb[3] > size) snap(q, NQ, true, nb[3]);
    }
    const base = mb.nv;
    for (let j = 0; j <= NQ; j++)
      for (let i = 0; i <= NQ; i++) {
        const k = (j + 1) * W + i + 1,
          px = x + i * st,
          pz = z + j * st;
        mb.color(forestAt(px, pz), 1, 1, 1);
        mb.v(
          px,
          hg[k],
          pz,
          hg[k - 1] - hg[k + 1],
          2 * st,
          hg[k - W] - hg[k + W],
          px,
          pz,
        );
      }
    for (let j = 0; j < NQ; j++)
      for (let i = 0; i < NQ; i++) {
        const a = base + j * (NQ + 1) + i,
          b = a + 1,
          c = a + NQ + 2,
          d = a + NQ + 1;
        // diagonal alternada: menos artefato direcional
        if ((i + j) & 1) {
          mb.tri(a, d, c);
          mb.tri(a, c, b);
        } else {
          mb.tri(a, d, b);
          mb.tri(b, d, c);
        }
      }
  }
  rs.add(mb, i0, 7);
  WORLD.stats.tris.terrain = mb.ni / 3;
  WORLD.stats.ranges.terrain = rs.r.length;
  rs.upload(mb);
}

// ---------- trajetória aproximada (só para a faixa de borracha, se o jogo não fornecer TRK.line) ----------
function worldLine() {
  if (TRK.line) return TRK.line;
  const N = TRK.N,
    k = TRK.k,
    a = new Float32Array(N),
    b = new Float32Array(N),
    out = new Float32Array(N);
  const gs = (src, dst, sg) => {
    const ks = Math.ceil(sg * 3);
    for (let i = 0; i < N; i++) {
      let s = 0,
        w = 0;
      for (let q = -ks; q <= ks; q++) {
        const g = Math.exp((-0.5 * q * q) / (sg * sg));
        s += src[(i + q + N * 4) % N] * g;
        w += g;
      }
      dst[i] = s / w;
    }
  };
  gs(k, a, 9);
  gs(k, b, 42);
  for (let i = 0; i < N; i++)
    out[i] = clamp((a[i] * 1.6 - b[i] * 2.3) * 110, -1, 1) * (TRK.hw - 1.5);
  gs(out, a, 6);
  return a;
}

// ---------- faixa da pista ----------
function ribbonBuild() {
  const N = TRK.N,
    hw = TRK.hw,
    ds = TRK.ds,
    mb = new MeshBuilder(1 << 17),
    rs = WORLD.ribbon;
  const line = (WORLD.line = worldLine());
  // presença de zebra suavizada (rampa nas pontas)
  const sm = (src) => {
    const o = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let q = -2; q <= 2; q++) s += src[(i + q + N) % N];
      o[i] = s / 5;
    }
    return o;
  };
  const kL = sm(TRK.kerbL),
    kR = sm(TRK.kerbR);
  // Zonas de frenada (marcas de neumático en asfalto): donde cae la velocidad objetivo
  const brk = new Float32Array(N);
  if (typeof AI !== "undefined" && AI.vt) {
    const t = new Float32Array(N);
    for (let i = 0; i < N; i++)
      t[i] = sat(((AI.vt[i] - AI.vt[(i + 4) % N]) / (4 * ds)) * 3.2);
    for (let i = 0; i < N; i++) {
      let a = 0;
      for (let q = -5; q <= 5; q++) a += t[(i + q + N) % N];
      brk[i] = a / 11;
    }
  }
  const wetAt = (s) => {
    let w = 0;
    for (const z of WORLD.wet)
      w = Math.max(w, z[2] * Math.min(1, (s - z[0]) / 14, (z[1] - s) / 14));
    return Math.max(0, w);
  };
  // columnas: [x más allá del borde (o d absoluto para asfalto), dy fijo, tipo] tipo: 0 asfalto, 1 piano/bordillo, 2 arcén
  const kx = [KERB_W, 1.28, 1.066, 0.8, 0.53, 0.27, 0.03, 0];
  const strips = [];
  for (const side of [-1, 1]) {
    strips.push({
      mat: 2,
      side,
      cols: [
        [APRON, -0.55],
        [APRON - 0.5, -0.07],
        [1.62, 0],
        [KERB_W, 0],
      ].map((c) => ({ x: c[0], dy: c[1] })),
    });
    strips.push({ mat: 1, side, cols: kx.map((x) => ({ x, kerb: true })) });
  }
  strips.push({
    mat: 0,
    side: 0,
    cols: [-hw, -hw * 0.5, 0, hw * 0.5, hw].map((d) => ({ d })),
  });
  const P = new Float32Array(3 * 8 * 64),
    CH = 48;
  for (let c0 = 0; c0 < N; c0 += CH) {
    const c1 = Math.min(N, c0 + CH),
      rows = c1 - c0 + 1,
      i0 = mb.ni;
    for (const st of strips) {
      const nc = st.cols.length;
      // posições
      for (let r = 0; r < rows; r++) {
        const i = (c0 + r) % N,
          tx = TRK.tx[i],
          tz = TRK.tz[i],
          rx = -tz,
          rz = tx,
          pres = st.side < 0 ? kL[i] : kR[i];
        for (let c = 0; c < nc; c++) {
          const col = st.cols[c];
          let d,
            dy = 0;
          if (st.side === 0) d = col.d;
          else {
            d = st.side * (hw + col.x);
            dy = col.kerb
              ? col.x >= KERB_W
                ? 0
                : kerbProfile(col.x) * pres
              : col.dy;
          }
          const o = (r * nc + c) * 3;
          P[o] = TRK.x[i] + rx * d;
          P[o + 2] = TRK.z[i] + rz * d;
          P[o + 1] =
            TRK.y[i] -
            clamp(d, -(hw + APRON), hw + APRON) * TRK.bank[i] +
            dy +
            0.0;
        }
      }
      const base = mb.nv;
      mb.mat(st.mat);
      for (let r = 0; r < rows; r++) {
        const i = (c0 + r) % N,
          s = (c0 + r) * ds,
          pres = st.side < 0 ? kL[i] : st.side > 0 ? kR[i] : 0;
        mb.color(
          (line[i] / hw) * 0.5 + 0.5,
          wetAt(i * ds),
          sat(Math.abs(TRK.k[i]) * 40),
          pres,
        );
        if (st.mat === 0) mb.mat(0, Math.round(brk[i] * 255));
        for (let c = 0; c < nc; c++) {
          const o = (r * nc + c) * 3,
            ra = Math.max(0, r - 1),
            rb = Math.min(rows - 1, r + 1),
            ca = Math.max(0, c - 1),
            cb = Math.min(nc - 1, c + 1);
          const oa = (ra * nc + c) * 3,
            ob = (rb * nc + c) * 3,
            oc = (r * nc + ca) * 3,
            od = (r * nc + cb) * 3;
          const ax = P[ob] - P[oa],
            ay = P[ob + 1] - P[oa + 1],
            az = P[ob + 2] - P[oa + 2],
            bx = P[od] - P[oc],
            by = P[od + 1] - P[oc + 1],
            bz = P[od + 2] - P[oc + 2];
          let nx = ay * bz - az * by,
            ny = az * bx - ax * bz,
            nz = ax * by - ay * bx;
          if (ny < 0) {
            nx = -nx;
            ny = -ny;
            nz = -nz;
          }
          const col = st.cols[c],
            d = st.side === 0 ? col.d : st.side * (hw + col.x);
          if (st.mat === 2) {
            // Arcén: a normal vai da normal da pista (junto à zebra) à normal do terreno logo depois dele,
            // para a luz rasante não denunciar a emenda entre a faixa e o terreno
            const w = c === 3 ? 0 : c === 2 ? 0.55 : 1;
            if (w > 0) {
              const qx = TRK.x[i] + -TRK.tz[i] * st.side * (hw + APRON + 1.2),
                qz = TRK.z[i] + TRK.tx[i] * st.side * (hw + APRON + 1.2);
              const tnx = hfAt(qx - 1, qz) - hfAt(qx + 1, qz),
                tnz = hfAt(qx, qz - 1) - hfAt(qx, qz + 1),
                tl = 1 / Math.hypot(tnx, 2, tnz),
                l0 = 1 / Math.hypot(nx, ny, nz);
              nx = nx * l0 * (1 - w) + tnx * tl * w;
              ny = ny * l0 * (1 - w) + 2 * tl * w;
              nz = nz * l0 * (1 - w) + tnz * tl * w;
            }
          }
          mb.v(P[o], P[o + 1], P[o + 2], nx, ny, nz, s, d);
        }
      }
      for (let r = 0; r < rows - 1; r++)
        for (let c = 0; c < nc - 1; c++) {
          const a = base + r * nc + c,
            b = a + 1,
            cc = a + nc + 1,
            d = a + nc;
          // columnas en orden creciente de d (lado izquierdo y asfalto) o decreciente (lado derecho: x crece hacia el exterior)
          const dA =
              st.side === 0 ? st.cols[c].d : st.side * (hw + st.cols[c].x),
            dB =
              st.side === 0
                ? st.cols[c + 1].d
                : st.side * (hw + st.cols[c + 1].x);
          if (dA < dB) mb.quadI(a, b, cc, d);
          else mb.quadI(a, d, cc, b);
        }
    }
    rs.add(mb, i0, 7);
  }
  WORLD.stats.tris.ribbon = mb.ni / 3;
  WORLD.stats.ranges.ribbon = rs.r.length;
  rs.upload(mb);
}

function worldBuild() {
  WORLD.wet = TRK.spec && TRK.spec.wet ? TRK.spec.wet : [];
  const defs = worldDefs();
  WORLD.terrain = new RangeSet(
    mkFamily("terrain", {
      src: "mat_terrain",
      defs,
      shadowBias: 4,
      shadowSlope: 3,
    }),
  );
  WORLD.ribbon = new RangeSet(
    mkFamily("track", { src: "mat_track", defs, noShadow: true }),
  );
  terrainBuild();
  ribbonBuild();
  R.drawables.push(WORLD.terrain, WORLD.ribbon);
  if (GAME.mode === "world") {
    GAME.init = () => {
      const p = trackPos(-40, -1.5, new Float64Array(5)),
        q = trackPos(40, 0, new Float64Array(5));
      setCamera(p[0], p[1] + 1.6, p[2], q[0], q[1] + 0.8, q[2], 1.0);
      R.cube.pos.set([q[0], q[1] + 1.2, q[2]]);
    };
    // Pose de cámara relativa a la pista: ojo en (s,d,altura) mirando hacia (s2,d2,altura2)
    window.__cap.trackCam = (s, d, h, s2, d2, h2, fov) => {
      const p = trackPos(s, d, new Float64Array(5)),
        q = trackPos(s2, d2, new Float64Array(5));
      const py = Math.max(p[1], hfAt(p[0], p[2])) + h;
      setCamera(p[0], py, p[2], q[0], q[1] + h2, q[2], fov || 1.0);
      R.cube.pos.set([q[0], q[1] + 1.2, q[2]]);
      return [p[0], py, p[2]];
    };
  }
}
window.__world = WORLD;
window.__trackPos = trackPos; // Auxiliares de depuración para los scripts de captura
if (WORLD.active)
  queueMicrotask(() =>
    BUILD.push(async () => {
      if (TRK.spec && TRK.spec.glb && typeof TrackGLB !== "undefined") {
        try {
          await TrackGLB.load(TRK.spec.glb, TRK.spec.glbOptions);
          return;
        } catch (e) {
          console.warn(
            "Aviso: no se pudo cargar el circuito GLB, usando generador procedural:",
            e,
          );
          TRK.spec.glbFailed = true;
        }
      }
      worldBuild();
    }),
  );
