'use strict';
// ---- 32_props.js
// Elementos de pista: guardarraíles, barreras de neumáticos, muros, vallas, semáforo de salida, gradas, boxes, torre,
// puestos de comisarios, señalización, paneles de patrocinio y paddock.
const PROPS = (typeof window !== 'undefined' && window.PROPS) || { sets: [], regions: {} };
if (typeof window !== 'undefined') window.PROPS = PROPS;

function atlasBuild() {
  if (typeof AtlasFactory !== 'undefined' && typeof AtlasFactory.buildPropsAtlas === 'function') {
    return AtlasFactory.buildPropsAtlas({ regions: PROPS.regions });
  }
  return null;
}

function propsBuild() {
  const hw = TRK.hw, N = TRK.N, ds = TRK.ds, pit = TRK.pit, REG = PROPS.regions;
  const atlas = (typeof AtlasFactory !== 'undefined' && typeof AtlasFactory.buildPropsAtlas === 'function')
    ? AtlasFactory.buildPropsAtlas({ regions: REG })
    : atlasBuild();
  const fam = mkFamily('props', { src: 'mat_props' }), famDS = mkFamily('propsDS', { src: 'mat_props', cull: 'none' });
  const bg3 = G.dev.createBindGroup({ layout: fam.bgl3, entries: [{ binding: 0, resource: atlas.createView() }] });
  const S1 = new RangeSet(fam, bg3), S2 = new RangeSet(famDS, bg3);     // S1: sólidos (culling de face); S2: chapas de dupla face
  const mb = new MeshBuilder(1 << 18), md = new MeshBuilder(1 << 17);
  // Personajes (público, comisarios, mecánicos): carteles orientados verticalmente hacia la cámara
  const famP = mkFamily('crowd', { src: 'world_crowd', cull: 'none', noShadow: true });
  const SP = new RangeSet(famP, G.dev.createBindGroup({ layout: famP.bgl3, entries: [{ binding: 0, resource: atlas.createView() }] })), mp = new MeshBuilder(1 << 15);
  const fenceMB = new MeshBuilder(1 << 12), fenceR = [];
  const o5 = new Float64Array(5), mt = m4();
  const sI = s => (((Math.round(s / ds)) % N) + N) % N;
  const srOf = i => { const s = i * ds; return s > TRK.L / 2 ? s - TRK.L : s; };
  // Punto del mundo en (s, d) con la altura del terreno
  const P = (s, d) => { trackPos(s, d, o5); const y = Math.abs(d) < hw + 1.5 ? o5[1] : hfAt(o5[0], o5[2]); return [o5[0], y, o5[2], o5[3], o5[4]]; };
  // matriz local→mundo em (s,d): X = tangente, Y = cima, Z = direita; yaw extra opcional
  const frame = (s, d, yaw, yOff) => { const p = P(s, d); let tx = p[3], tz = p[4]; if (yaw) { const c = Math.cos(yaw), sn = Math.sin(yaw), a = tx * c - tz * sn, b = tx * sn + tz * c; tx = a; tz = b; } return m4basis(m4(), tx, 0, tz, 0, 1, 0, -tz, 0, tx, p[0], p[1] + (yOff || 0), p[2]); };
  const col = (m, r, g, b, a) => m.color(r, g, b, a === undefined ? 1 : a);
  // cartel del atlas: esquina inferior izquierda p, vector "derecha" r (longitud = anchura), altura h, nombre de región
  // fade = distância de sumiço pontilhado / 4 m (0 = nunca some)
  const sign = (m, px, py, pz, rx, ry, rz, h, name, fade) => {
    const r = REG[name]; m.mat(7, 0, 0, fade || 0); col(m, 1, 1, 1);
    m.quad(px, py, pz, px + rx, py + ry, pz + rz, px + rx, py + ry + h, pz + rz, px, py + h, pz, r[0], r[3], r[2], r[1]);
  };

  // ================= guard-rails =================
  // separación de la barrera por lado y muestra (NaN = sin guardarraíl en ese punto)
  const isVegas = Boolean(TRK.spec && (TRK.spec.id === 'las-vegas-strip' || TRK.spec.urban));
  const d1At = sr => { const e = sat(Math.min((sr - pit.s0) / 45, (pit.s1 - sr) / 45)); return lerp(hw + 4.5, pit.laneD1, e) + 0.8; };
  const railD = (side, i) => {
    if (isVegas) {
      return side < 0 ? -TRK.barL[i] : TRK.barR[i];
    }
    const sr = srOf(i);
    if (side < 0) return (sr > TRK.stand.s0 - 22 && sr < TRK.stand.s1 + 22) ? NaN : -TRK.barL[i];
    if (sr < pit.s0 - 40 || sr > pit.s1 + 36) return TRK.barR[i];
    if (sr < pit.s0 - 4) return lerp(TRK.barR[i], d1At(pit.s0 - 4), smooth(pit.s0 - 40, pit.s0 - 4, sr));
    if (sr < pit.bldS0) return d1At(sr);
    if (sr < pit.bldS1) return NaN;
    if (sr < pit.s1) return d1At(sr);
    return lerp(d1At(pit.s1), TRK.barR[i], smooth(pit.s1, pit.s1 + 36, sr));
  };
  PROPS.railD = railD;
  const wprof = [[0.02, -0.155], [0.045, -0.14], [0.08, -0.11], [0.08, -0.05], [0.03, -0.022], [0.005, 0], [0.03, 0.022], [0.08, 0.05], [0.08, 0.11], [0.045, 0.14], [0.02, 0.155]];
  // Extrusão do perfil ao longo do caminho usando a tangente da PISTA em cada ponto (igual nos dois lados de qualquer emenda
  // de trecho: não há costura). Faces planas por segmento do perfil: o vinco do "W" fica marcado; o fundo dos vales é mais escuro.
  const railStrip = (path, prof, yb) => {
    for (let k = 0; k < prof.length - 1; k++) {
      const pa = prof[k], pb = prof[k + 1], na = pb[1] - pa[1], nb = -(pb[0] - pa[0]), base = md.nv;
      for (let r = 0; r < path.length; r++) {
        const p = path[r], rx = -p[4], rz = p[3];   // direita da pista
        for (const pr of [pa, pb]) { col(md, 1, 1, 1, 0.42 + 0.58 * sat(Math.abs(pr[0]) / 0.08)); md.v(p[0] + rx * pr[0], p[1] + yb + pr[1], p[2] + rz * pr[0], rx * na, nb, rz * na, r * 2, pr[1]); }
      }
      for (let r = 0; r < path.length - 1; r++) { const a = base + r * 2; md.quadI(a, a + 2, a + 3, a + 1); }
    }
  };
  if (!isVegas) {
    for (const side of [-1, 1]) {
      // lado esquerdo: pista à direita do sentido de marcha (+a); lado direito: pista à esquerda (−a), perfil invertido
      const prof = side < 0 ? wprof : wprof.map(p => [-p[0], p[1]]).reverse();
      let path = [], postPts = [], hadPrev = false, joinNext = false;
      const flush = () => {
        if (path.length > 1) {
          const i0 = md.ni; md.mat(1, 0, 0, 110);
          railStrip(path, prof, 0.42); railStrip(path, prof, 0.78);
          S2.add(md, i0, 3, 630);
          // postes em "C" com calço atrás de cada lâmina e parafuso no fundo do vale (somem junto, a ~110 m)
          const j0 = mb.ni;
          for (const p of postPts) {
            mb.push(p.m); mb.mat(11, 0, 0, 28); col(mb, 1, 1, 1, 0.9); mb.box(0, 0.48, 0.085 * side, 0.07, 0.96, 0.11);
            for (const yb of [0.42, 0.78]) { mb.box(0, yb, 0.02 * side, 0.1, 0.2, 0.05); mb.mat(2, 90, 200, 28); col(mb, 0.55, 0.56, 0.58); mb.box(0, yb, -0.016 * side, 0.04, 0.04, 0.02); mb.mat(11, 0, 0, 28); col(mb, 1, 1, 1, 0.9); }
            mb.pop();
          }
          S1.add(mb, j0, 3, 162);
          // terminal redondeado ("nariz") donde el guardarraíl comienza o termina físicamente
          const t0 = mb.ni; mb.mat(1, 0, 0, 110); col(mb, 1, 1, 1);
          if (!hadPrev) { const p = path[0]; mb.cyl(p[0], p[1] + 0.24, p[2], 0.17, p[1] + 0.97, 0.17, 10, true, true); }
          if (!joinNext) { const p = path[path.length - 1]; mb.cyl(p[0], p[1] + 0.24, p[2], 0.17, p[1] + 0.97, 0.17, 10, true, true); }
          S1.add(mb, t0, 3, 630);
        }
        hadPrev = joinNext; path = []; postPts = [];
      };
      for (let i = 0; i <= N; i += 2) {
        const q = i % N, d = railD(side, q);
        if (isNaN(d)) { joinNext = false; flush(); hadPrev = false; continue; }
        const p = P(q * ds, d); path.push(p); postPts.push({ m: frame(q * ds, d) });
        if (path.length >= 36) { const last = path[path.length - 1], lp = postPts[postPts.length - 1]; joinNext = true; flush(); path.push(last); postPts.push(lp); }
      }
      joinNext = false; flush();
    }

    // ================= Barreras de neumáticos =================
    {
      const tyProf = []; for (let k = 0; k < 5; k++) { const y = k * 0.2; tyProf.push([y + 0.008, 0.262], [y + 0.05, 0.31], [y + 0.15, 0.31], [y + 0.192, 0.262]); }
      tyProf.push([1.0, 0.262], [1.0, 0.17], [0.86, 0.165]);
      const rotY = m4rotZ(m4(), PI / 2);
      for (const side of [-1, 1]) {
        const fl = side < 0 ? TRK.tyreL : TRK.tyreR, bar = side < 0 ? TRK.barL : TRK.barR;
        let acc = 0, n = 0, i0 = mb.ni, j0 = md.ni, run = 0, prev = null;
        const endChunk = () => { if (n) { S1.add(mb, i0, 3, 198); S2.add(md, j0, 7, 1200); } i0 = mb.ni; j0 = md.ni; n = 0; };
        for (let i = 0; i < N; i++) {
          if (fl[i] < 0.5) { endChunk(); run = 0; prev = null; acc = 0; continue; }
          acc += ds;
          while (acc >= 0.64) {
            acc -= 0.64; const s = i * ds - acc, d = side * (trkAt(bar, i, 0) - 0.62), p = P(s, d);
            // tinta: blocos de 6 pilhas brancas/vermelhas nos primeiros e últimos 25 m de cada barreira; resto preto
            const blk = Math.floor(run / 6) % 2, painted = (Math.floor(run / 6) % 4) < 2;
            const c = painted ? (blk ? [0.55, 0.05, 0.04] : [0.62, 0.62, 0.6]) : [0.02, 0.02, 0.02];
            mb.mat(15); col(mb, c[0], c[1], c[2], 0.85);
            mb.push(m4mul(m4(), m4translate(mt, p[0], p[1] - 0.02, p[2]), rotY)); mb.lathe(tyProf, 9); mb.pop();
            // substituto distante: tira frontal + topo, por pilha
            if (prev) {
              md.mat(12); col(md, c[0], c[1], c[2], 0.9);
              const nx = -(-p[4]) * side, nz = -(p[3]) * side;                 // normal apontando para a pista
              const ax = prev[0] + nx * 0.3, az = prev[2] + nz * 0.3, bx = p[0] + nx * 0.3, bz = p[2] + nz * 0.3;
              const cx = prev[0] - nx * 0.3, cz = prev[2] - nz * 0.3, dx = p[0] - nx * 0.3, dz = p[2] - nz * 0.3;
              const quadN = (x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, n0, n1, n2, u0, v0, u1, v1) => { const a = md.v(x0, y0, z0, n0, n1, n2, u0, v0), b = md.v(x1, y1, z1, n0, n1, n2, u1, v0), c2 = md.v(x2, y2, z2, n0, n1, n2, u1, v1), d2 = md.v(x3, y3, z3, n0, n1, n2, u0, v1); const ex = x1 - x0, ey = y1 - y0, ez = z1 - z0, fx = x3 - x0, fy = y3 - y0, fz = z3 - z0; if ((ey * fz - ez * fy) * n0 + (ez * fx - ex * fz) * n1 + (ex * fy - ey * fx) * n2 >= 0) md.quadI(a, b, c2, d2); else md.quadI(a, d2, c2, b); };
              quadN(ax, prev[1], az, bx, p[1], bz, bx, p[1] + 1.0, bz, ax, prev[1] + 1.0, az, nx, 0, nz, run, 0, run + 1, 5);
              quadN(ax, prev[1] + 1.0, az, bx, p[1] + 1.0, bz, dx, p[1] + 1.0, dz, cx, prev[1] + 1.0, cz, 0, 1, 0, run, 0.0, run + 1, 1.0);
              quadN(dx, p[1], dz, cx, prev[1], cz, cx, prev[1] + 1.0, cz, dx, p[1] + 1.0, dz, -nx, 0, -nz, run + 1, 0, run, 5);
            }
            prev = p; run++; n++;
            if (n >= 26) endChunk();
          }
        }
        endChunk();
      }
    }
  }

  // ================= muros e alambrados da reta =================
  // muro contínuo ao longo de (s0..s1) em d, com alambrado por cima (hf = altura total)
  const wallFence = (s0, s1, d, faceSide, hWall, hf, stripe) => {
    const path = []; for (let s = s0; s <= s1 + 0.01; s += 4) path.push(P(s, d));
    const t = 0.14, prof = [[-t, 0], [t, 0], [t, hWall], [-t, hWall]];
    for (let k = 0; k < path.length - 1; k += 12) {
      const seg = path.slice(k, k + 13), i0 = mb.ni;
      mb.mat(3); col(mb, 0.52, 0.51, 0.49); mb.sweep(seg.map(p => [p[0], p[1] - 0.25, p[2]]), prof.map(p => [p[0], p[1] + 0.25]), { closedProfile: true, hard: true });
      // faixa pintada no lado da pista
      if (stripe) { mb.mat(2, 128, 0); col(mb, stripe[0], stripe[1], stripe[2]); mb.sweep(seg.map(p => [p[0], p[1] + hWall * 0.42, p[2]]), faceSide > 0 ? [[t + 0.004, 0], [t + 0.004, 0.3]] : [[-t - 0.004, 0.3], [-t - 0.004, 0]], {}); }
      // postes e cabos do alambrado
      S1.add(mb, i0, 3, 900);
      const p0 = mb.ni; mb.mat(11, 0, 0, 11); col(mb, 1, 1, 1);
      for (const p of seg.slice(0, 12)) mb.cyl(p[0], p[1] + hWall, p[2], 0.035, p[1] + hf, 0.035, 6, false, true);
      for (const hh of [hWall + 0.05, hf - 0.03]) mb.tube(seg.map(p => [p[0], p[1] + hh, p[2]]), 0.02, 5);
      S1.add(mb, p0, 1, 64);
      const f0 = fenceMB.ni; let u = (k % 3) * 0.0; fenceMB.color((hf - hWall) / 25.5, 1, 1, 1);
      for (let q = 0; q < seg.length - 1; q++) {
        const a = seg[q], b = seg[q + 1], L = Math.hypot(b[0] - a[0], b[2] - a[2]);
        fenceMB.quad(a[0], a[1] + hWall, a[2], b[0], b[1] + hWall, b[2], b[0], b[1] + hf, b[2], a[0], a[1] + hf, a[2], u, 0, u + L, hf - hWall); u += L;
      }
      const m = seg[Math.floor(seg.length / 2)]; fenceR.push({ first: f0, count: fenceMB.ni - f0, x: m[0], y: m[1] + 2, z: m[2], rad: 30 });
    }
  };
  const wallEnd = (s, d, hWall, hf, dir) => {
    const i0 = mb.ni; mb.push(frame(s, d));
    // Pilar de hormigón + rampa de remate hasta el suelo + poste final de valla
    mb.mat(3); col(mb, 0.52, 0.51, 0.49); mb.box(0, (hWall - 0.38) / 2, 0, 0.48, hWall + 0.62, 0.48);
    const X = dir * 2.4, z = 0.14;
    const q4 = (p, nx, ny, nz) => { const ex = p[3] - p[0], ey = p[4] - p[1], ez = p[5] - p[2], fx = p[9] - p[0], fy = p[10] - p[1], fz = p[11] - p[2]; if ((ey * fz - ez * fy) * nx + (ez * fx - ex * fz) * ny + (ex * fy - ey * fx) * nz >= 0) mb.quad(...p); else mb.quad(p[0], p[1], p[2], p[9], p[10], p[11], p[6], p[7], p[8], p[3], p[4], p[5]); };
    q4([0, -0.5, z, X, -0.5, z, X, -0.25, z, 0, hWall, z], 0, 0, 1); q4([0, -0.5, -z, X, -0.5, -z, X, -0.25, -z, 0, hWall, -z], 0, 0, -1);
    q4([0, hWall, -z, 0, hWall, z, X, -0.25, z, X, -0.25, -z], 0, 1, 0);
    mb.mat(1); col(mb, 1, 1, 1); mb.cyl(0, hWall, 0, 0.06, hf + 0.05, 0.06, 6, false, true);
    mb.pop(); S1.add(mb, i0, 3, 900);
  };
  if (!isVegas) {
    wallFence(pit.bldS0 - 2, pit.s1 - 38, pit.wallD, -1, 1.05, 3.3, [0.05, 0.16, 0.4]);                    // muro dos boxes
    wallFence(TRK.stand.s0 - 22, TRK.stand.s1 + 22, -(hw + 3.4), 1, 1.0, 4.4, [0.62, 0.1, 0.06]);          // frente da arquibancada
    wallEnd(pit.bldS0 - 2, pit.wallD, 1.05, 3.3, -1); wallEnd(pit.s1 - 38, pit.wallD, 1.05, 3.3, 1); wallEnd(TRK.stand.s0 - 22, -(hw + 3.4), 1.0, 4.4, -1); wallEnd(TRK.stand.s1 + 22, -(hw + 3.4), 1.0, 4.4, 1);
  }

  // ================= construções na reta (coordenadas locais: u = s relativo à linha, y, v = d) =================
  // Convierte vértices locales al mundo siguiendo la rasante de la recta
  const toStraight = (m, v0) => {
    const f = m.f32;
    const isSpa = Boolean(TRK.spec && TRK.spec.id === 'spa-francorchamps');
    for (let i = v0; i < m.nv; i++) {
      const u = f[i * 9], v = f[i * 9 + 2];
      trackPos(u, 0, o5);
      if (isSpa) {
        f[i * 9] = u - 60;
        f[i * 9 + 1] += o5[1];
        f[i * 9 + 2] = v;
      } else {
        const tx = o5[3], tz = o5[4];
        const gy = Math.max(o5[1], hfAt(o5[0] - tz * v, o5[2] + tx * v));
        f[i * 9] = o5[0] - tz * v;
        f[i * 9 + 1] += gy;
        f[i * 9 + 2] = o5[2] + tx * v;
      }
    }
  };
  const Bx = (m, u0, u1, y0, y1, v0, v1) => m.box((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2, Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0));
  const rng = mkRng(77);

  // ---- figuras humanas simples (caixas): sentadas na arquibancada, em pé nos boxes ----
  const SHIRTS = [[0.6, 0.08, 0.07], [0.08, 0.2, 0.5], [0.75, 0.72, 0.68], [0.75, 0.55, 0.06], [0.1, 0.35, 0.16], [0.07, 0.07, 0.08], [0.5, 0.5, 0.52], [0.7, 0.3, 0.06], [0.35, 0.1, 0.4], [0.82, 0.82, 0.8]];
  const SKIN = [[0.55, 0.38, 0.28], [0.36, 0.23, 0.16], [0.66, 0.48, 0.37], [0.24, 0.15, 0.1]];
  const HAIR = [[0.03, 0.025, 0.02], [0.12, 0.07, 0.03], [0.3, 0.28, 0.26], [0.75, 0.1, 0.08], [0.85, 0.85, 0.82]];
  const pick = a => a[Math.floor(rng() * a.length) % a.length];
  // Figura en cartelera orientada a cámara
  // O vértice leva o centro em pos e o canto em nrm (x = lateral em m, y = altura/2 em m), escritos crus (sem normalizar).
  const figure = (x, y, z, reg, hgt, shirt, ao) => {
    const r = REG[reg], hwid = hgt * (r[2] - r[0]) * 2048 / ((r[3] - r[1]) * 1024) * 0.5, flip = rng() < 0.5, ua = flip ? r[2] : r[0], ub = flip ? r[0] : r[2], k = 0.82 + rng() * 0.3;
    mp.mat(16, Math.floor(rng() * 255), Math.floor(rng() * 255)); col(mp, shirt[0] * k, shirt[1] * k, shirt[2] * k, ao);
    const raw = (ox, oy, u, v) => { const i = mp.v(x, y, z, 0, 1, 0, u, v), q = i * 18 + 6; mp.i16[q] = Math.round(ox * 32767); mp.i16[q + 1] = Math.round(oy * 0.5 * 32767); mp.i16[q + 2] = 0; return i; };
    const a = raw(-hwid, 0, ua, r[3]), b = raw(hwid, 0, ub, r[3]), c = raw(hwid, hgt, ub, r[1]), d = raw(-hwid, hgt, ua, r[1]);
    mp.quadI(a, b, c, d);
  };
  // roupas de arquibancada: maioria em tons sóbrios (jeans, cinzas, cáqui, branco encardido, vinho), poucas cores vivas
  const CROWD = [[0.42, 0.42, 0.4], [0.5, 0.49, 0.45], [0.07, 0.09, 0.14], [0.045, 0.045, 0.05], [0.26, 0.06, 0.06], [0.1, 0.16, 0.28], [0.3, 0.26, 0.15], [0.2, 0.21, 0.22], [0.11, 0.17, 0.11],
  [0.33, 0.2, 0.1], [0.13, 0.13, 0.15], [0.28, 0.3, 0.34], [0.36, 0.33, 0.27], [0.09, 0.12, 0.2], [0.45, 0.09, 0.07], [0.4, 0.33, 0.08], [0.16, 0.1, 0.07], [0.5, 0.5, 0.48]];
  // sentada: (u, y do assento, v do encosto); a pista fica em +v
  const sitter = (u, y, v, ao) => figure(u + (rng() - 0.5) * 0.26, y - 0.1 - rng() * 0.05, v + 0.2 + (rng() - 0.5) * 0.16, 'p' + Math.floor(rng() * 16) % 16, 0.98 * (0.84 + rng() * 0.28), pick(CROWD), ao);
  // En pie en (u, y del suelo, v)
  const stander = (u, y, v, shirt, ao) => figure(u, y - 0.02, v, 's' + Math.floor(rng() * 3) % 3, 1.72 * (0.88 + rng() * 0.2), shirt, ao);

  // ---- pórtico de salida FIA ----
  const gantry = (s, dL, dR, nameReg, lights, local) => {
    if (typeof PropFactory !== 'undefined' && typeof PropFactory.createStartGantry === 'function') {
      PropFactory.createStartGantry({ mb, md, S1, S2, REG, toStraight }, { s, dL, dR, nameReg, lights, local });
    }
  };
  const gantryDL = isVegas ? -(hw + 2.2) : -7.7;
  const gantryDR = isVegas ? (pit.wallD - 0.6) : 7.05;
  gantry(0, gantryDL, gantryDR, 'name', true);

  // ---- boxes clásicos y gradas (circuitos rurales delegados a PropFactory) ----
  if (!isVegas && (!TRK.spec || typeof TRK.spec.buildProps !== 'function')) {
    if (typeof PropFactory !== 'undefined' && typeof PropFactory.createPitBuilding === 'function') {
      PropFactory.createPitBuilding({ mb, md, S1, S2, toStraight, TRK }, {
        s0: pit.bldS0,
        s1: pit.bldS1,
        d0: pit.bldD0,
        d1: pit.bldD1,
        nBays: 20
      });
    }
    if (typeof PropFactory !== 'undefined' && typeof PropFactory.createGrandstand === 'function') {
      const st = TRK.stand || { s0: -80, s1: 120, d0: -18 };
      PropFactory.createGrandstand({ mb, md, mp, S1, S2, SP, toStraight, sign, CROWD, sitter, stander }, {
        s0: st.s0,
        s1: st.s1,
        d0: st.d0,
        rng
      });
    }
  }

  // ================= objetos ao longo do circuito =================
  const at = (m, s, d, yaw, fn, yOff) => { m.push(frame(s, d, yaw, yOff)); fn(m); m.pop(); };
  // lado de fora de cada curva grande
  const corners = TRK.corners.filter(c => Math.abs(c.ang) >= 60);
  // Cámaras de TV fijas del circuito [s, lado, distancia, altura]
  const TVC = (TRK.spec && TRK.spec.tvTowers) ? TRK.spec.tvTowers : corners.map(c => [(c.s0 + c.s1) * 0.5, c.k > 0 ? -1 : 1, 6, 5.5]);
  // há câmera de TV deste lado cuja tomada passa por s? (a câmera filma de ~110 m antes dela até ~60 m depois)
  const camSees = (s, side) => TVC.some(c => { if (c[1] !== side) return false; let q = c[0] - s; q -= Math.round(q / TRK.L) * TRK.L; return q > -70 && q < 120; });
  // ---- placas de distância (150/100/50) ----
  {
    const i0 = mb.ni, k0 = md.ni;
    for (const c of corners) for (const dist of [150, 100, 50]) {
      // do lado de fora da curva; se uma câmera de TV filma por ali, a placa vai para o lado de dentro (não tapa o carro)
      const s = c.s0 - dist + 12, i = sI(s); let side = c.k > 0 ? -1 : 1; if (camSees(s, side)) { side = -side; if (camSees(s, side)) continue; } const bar = side < 0 ? TRK.barL[i] : TRK.barR[i];
      const sr = srOf(i); if (sr > pit.s0 - 45 && sr < pit.s1 + 45) continue;
      const d = side * Math.min(hw + 3.4, bar - 1.0);
      const yw = side * 0.5;      // gira a face para o lado da pista: legível do carro e das câmeras
      at(mb, s, d, yw, m => { m.mat(2, 128, 128, 75); col(m, 0.3, 0.3, 0.32); Bx(m, -0.05, 0.05, -0.3, 1.95, -0.53, -0.43); Bx(m, -0.05, 0.05, -0.3, 1.95, 0.43, 0.53); });
      at(md, s, d, yw, m => { sign(m, -0.06, 0.95, -0.62, 0, 0, 1.24, 1.0, 'd' + dist, 75); sign(m, 0.06, 0.95, 0.62, 0, 0, -1.24, 1.0, 'd' + dist, 75); });   // duas faces: as câmeras de TV nunca veem um verso em branco
    }
    S1.add(mb, i0, 3, 430); S2.add(md, k0, 3, 430);
  }
  // ---- painéis publicitários atrás das barreiras (circuitos rurais) ----
  if (!isVegas) {
    let bi = 0;
    const row = (s0, s1, side, step, w, h, y0, chev) => {
      for (let s = s0; s < s1 - w * 0.5; s += step) {
        const i = sI(s), bar = side < 0 ? TRK.barL[i] : TRK.barR[i], d = side * (bar + 1.1), i0 = mb.ni, k0 = md.ni;
        at(mb, s, d, 0, m => { m.mat(2, 128, 128, 105); col(m, 0.2, 0.21, 0.23); for (const x of [-w / 2 + 0.3, 0, w / 2 - 0.3]) { Bx(m, x - 0.07, x + 0.07, -0.6, y0 + h, side * 0.05, side * 0.19); if (x !== 0) m.tube([[x, y0 + h * 0.6, side * 0.12], [x, -0.2, side * 1.1]], 0.05, 5); } Bx(m, -w / 2, w / 2, y0 - 0.06, y0 + 0.02, side * 0.03, side * 0.11); Bx(m, -w / 2, w / 2, y0 + h - 0.02, y0 + h + 0.06, side * 0.03, side * 0.11); });
        // face voltada para a pista (normal = −lado·Z local)
        at(md, s, d, 0, m => { if (side < 0) sign(m, -w / 2, y0, 0, w, 0, 0, h, chev ? 'chev' : 'b' + (bi++ % PROPS.nBrands), 105); else sign(m, w / 2, y0, 0, -w, 0, 0, h, chev ? 'chev' : 'b' + (bi++ % PROPS.nBrands), 105); });
        S1.add(mb, i0, 3, 600); S2.add(md, k0, 7, 600);
      }
    };
    for (const c of corners) {
      const side = c.k > 0 ? -1 : 1, mid = (c.s0 + c.s1) / 2, len = c.s1 - c.s0;
      const sr = srOf(sI(mid)); if (sr > pit.s0 - 60 && sr < pit.s1 + 60) continue;
      row(mid - Math.min(len * 0.32, 30), mid + Math.min(len * 0.32, 30), side, 6.6, 6, 1.5, 1.05, false);
      row(c.s0 - 26, c.s0 - 6, side, 5.2, 5, 1.25, 1.05, true);
    }
    const extraBB = (TRK.spec && TRK.spec.billboards) ? TRK.spec.billboards : [];
    for (const b of extraBB) {
      const s0 = b[0] < 0 ? TRK.L + b[0] : b[0], s1 = b[1] < 0 ? TRK.L + b[1] : b[1];
      row(s0, s1, b[2], b[3], b[4], b[5], b[6], b[7]);
    }
  }
  // ---- pórticos publicitários extras definidos pelo circuito ----
  for (const s of ((TRK.spec && TRK.spec.gantries) ? TRK.spec.gantries : [])) {
    const v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni, i = sI(s), dL = -(TRK.barL[i] - 1.2), dR = TRK.barR[i] - 1.2, yB = 6.0, yT = 7.4;
    mb.push(frame(s, 0)); md.push(frame(s, 0));
    gantry(0, dL, dR, null, false, true);
    const wd = dR - dL - 1.2, hh = 1.3;
    for (const q of [0, 1]) {
      const nm = ['b0', 'b9'][q], x = q ? 0.58 : -0.58; md.mat(7); col(md, 1, 1, 1); const r = REG[nm], zc = (dL + dR) / 2, w2 = Math.min(wd / 2, hh * 2);
      for (const [za, zb] of [[zc - w2 * 2 - 0.2, zc - 0.2], [zc + 0.2, zc + w2 * 2 + 0.2]]) { if (q) md.quad(x, yB + 0.08, zb, x, yB + 0.08, za, x, yB + 0.08 + hh, za, x, yB + 0.08 + hh, zb, r[0], r[3], r[2], r[1]); else md.quad(x, yB + 0.08, za, x, yB + 0.08, zb, x, yB + 0.08 + hh, zb, x, yB + 0.08 + hh, za, r[0], r[3], r[2], r[1]); }
    }
    mb.pop(); md.pop(); S1.add(mb, i0, 7, 1500); S2.add(md, k0, 3, 1500);
  }
  // ---- postos de fiscal (circuitos rurais) ----
  if (!isVegas) {
    const spots = []; for (const c of TRK.corners) { spots.push([c.s0 - 8, c.k > 0 ? 1 : -1]); if (Math.abs(c.ang) > 100) spots.push([(c.s0 + c.s1) / 2, c.k > 0 ? -1 : 1]); }
    spots.push([700, 1], [1190, -1]); let pn = 0;
    for (const [s, side] of spots) {
      const i = sI(s), sr = srOf(i); if (sr > pit.s0 - 50 && sr < pit.s1 + 50) continue;
      const d = side * ((side < 0 ? TRK.barL[i] : TRK.barR[i]) + 2.2), i0 = mb.ni;
      at(mb, s, d, 0, m => {
        m.mat(3); col(m, 0.5, 0.5, 0.48); Bx(m, -1.5, 1.5, -0.8, 0.5, -1.3, 1.3); Bx(m, -0.5, 0.5, -0.8, 0.25, side * 1.3, side * 1.75);   // base + degrau
        // (a frente — mureta, janela corrida — fica do lado da pista: −side·Z)
        // paredes em chapa nervurada laranja: mureta na frente (lado da pista), fundos com porta, laterais inteiras
        m.mat(17); col(m, 0.8, 0.33, 0.05);
        Bx(m, -1.2, 1.2, 0.5, 1.45, -side * 0.95, -side * 1.02); Bx(m, -1.2, -1.13, 0.5, 2.6, -1.0, 1.0); Bx(m, 1.13, 1.2, 0.5, 2.6, -1.0, 1.0);
        Bx(m, -1.2, -0.45, 0.5, 2.6, side * 0.95, side * 1.02); Bx(m, 0.45, 1.2, 0.5, 2.6, side * 0.95, side * 1.02); Bx(m, -0.45, 0.45, 2.15, 2.6, side * 0.95, side * 1.02);
        // faixa branca, cantoneiras e esquadria da janela corrida
        m.mat(2, 128, 0); col(m, 0.86, 0.86, 0.83); Bx(m, -1.22, 1.22, 1.3, 1.46, -side * 0.94, -side * 1.04);
        m.mat(2, 110, 150); col(m, 0.2, 0.21, 0.23);
        for (const x of [-1.2, 1.2]) for (const z of [-1.0, 1.0]) Bx(m, x - 0.05, x + 0.05, 0.5, 2.6, z - 0.05, z + 0.05);
        Bx(m, -1.2, 1.2, 2.5, 2.6, -side * 0.94, -side * 1.03); Bx(m, -0.03, 0.03, 1.46, 2.5, -side * 0.95, -side * 1.01);
        Bx(m, -0.45, -0.41, 0.5, 2.15, side * 0.94, side * 1.03); Bx(m, 0.41, 0.45, 0.5, 2.15, side * 0.94, side * 1.03);
        // Cristal de cabina de comisario e interior
        m.mat(5); col(m, 1, 1, 1); if (side < 0) m.quad(-1.13, 1.46, 0.985, 1.13, 1.46, 0.985, 1.13, 2.5, 0.985, -1.13, 2.5, 0.985, 0, 0, 2.26, 1.04); else m.quad(1.13, 1.46, -0.985, -1.13, 1.46, -0.985, -1.13, 2.5, -0.985, 1.13, 2.5, -0.985, 0, 0, 2.26, 1.04);
        m.mat(2, 180, 0); col(m, 0.1, 0.1, 0.11, 0.6); Bx(m, -1.1, 1.1, 1.36, 1.42, -side * 0.5, -side * 0.93); Bx(m, 0.3, 0.75, 0.5, 1.0, -0.3, 0.15);
        m.mat(2, 100, 0); col(m, 0.7, 0.05, 0.04); m.cyl(-0.95, 0.5, side * 0.7, 0.07, 1.0, 0.07, 8, false, true);   // extintor
        // telhado em chapa clara com beiral e calha
        m.mat(17); col(m, 0.85, 0.85, 0.82); Bx(m, -1.45, 1.45, 2.6, 2.72, -1.25, 1.25);
        m.mat(2, 110, 150); col(m, 0.3, 0.31, 0.33); Bx(m, -1.47, 1.47, 2.58, 2.63, -side * 1.25, -side * 1.31);
        m.mat(2, 102, 128, 25); col(m, 0.75, 0.75, 0.2); m.cyl(-1.0, 2.72, 0, 0.02, 3.9, 0.02, 5, false, true);
        m.mat(10); col(m, 0.8, 0.7, 0.05); Bx(m, -1.0, -0.3, 3.4, 3.85, -0.01, 0.01);
        // faixa zebrada na base, voltada para a pista, e corrimão do degrau
        m.mat(2, 128, 0); for (let q = 0; q < 6; q++) { col(m, q & 1 ? 0.8 : 0.08, q & 1 ? 0.62 : 0.08, q & 1 ? 0.05 : 0.08); Bx(m, -1.5 + q * 0.5, -1.0 + q * 0.5, -0.1, 0.5, -side * 1.3, -side * 1.315); }
        m.mat(2, 110, 150, 40); col(m, 0.75, 0.6, 0.1); m.tube([[0.55, 0.3, side * 1.75], [0.55, 1.35, side * 1.75], [0.55, 1.35, side * 1.05]], 0.025, 5);
      });
      S1.add(mb, i0, 3, 600);
      // placa com o número do posto no beiral e fiscal de colete laranja ao lado da cabine
      const k0 = md.ni; at(md, s, d, 0, m => { if (side > 0) sign(m, 0.45, 2.74, -1.27, -0.9, 0, 0, 0.5, 'g' + (pn % 20), 60); else sign(m, -0.45, 2.74, 1.27, 0.9, 0, 0, 0.5, 'g' + (pn % 20), 60); }); S2.add(md, k0, 3, 240); pn++;
      const q0 = mp.ni; mp.push(frame(s, d)); stander(1.95, 0.0, -side * 0.2, [0.85, 0.36, 0.04], 0.9); if (rng() < 0.6) stander(-2.0, 0.0, -side * 0.6, [0.85, 0.36, 0.04], 0.9); mp.pop(); SP.add(mp, q0, 1, 300);
    }
  }
  // ---- Torres de cámaras de TV ----
  {
    // Cámara 0: sobre el semáforo del pórtico de salida
    { const p = P(0, -1.2); WORLD.tvCams.push({ x: p[0], y: p[1] + 9.0, z: p[2], s: 0, side: 0 }); }
    for (const [s, side, off, h, kind] of TVC) {
      const i = sI(s), d = side * ((side < 0 ? TRK.barL[i] : TRK.barR[i]) + off), p = P(s, d);
      // a lente fica 1,4 m para o lado da pista, acima do guarda-corpo: a própria torre nunca entra no quadro
      const pc = P(s, d - side * 1.4);
      WORLD.tvCams.push({ x: pc[0], y: p[1] + h + 1.8, z: pc[2], s, side });
      if (kind) continue;
      const i0 = mb.ni;
      at(mb, s, d, 0, m => {
        m.mat(1, 0, 0, 90); col(m, 1, 1, 1);
        for (const [a, b] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) m.cyl(a, -0.6, b, 0.09, h, 0.09, 6, false, false);
        m.mat(11, 0, 0, 75);
        for (let y = 0.2; y < h - 0.5; y += 1.8) for (const [a0, b0, a1, b1] of [[-0.9, -0.9, 0.9, -0.9], [0.9, -0.9, 0.9, 0.9], [0.9, 0.9, -0.9, 0.9], [-0.9, 0.9, -0.9, -0.9]]) { m.tube([[a0, y, b0], [a1, y + 1.8, b1]], 0.045, 4); m.tube([[a0, y + 1.8, b0], [a1, y + 1.8, b1]], 0.045, 4); }
        m.mat(2, 178, 0, 90); col(m, 0.35, 0.3, 0.22); Bx(m, -1.1, 1.1, h, h + 0.08, -1.1, 1.1);
        m.mat(11, 0, 0, 30); col(m, 1, 1, 1); for (const [a0, b0, a1, b1] of [[-1.05, -1.05, 1.05, -1.05], [1.05, -1.05, 1.05, 1.05], [1.05, 1.05, -1.05, 1.05], [-1.05, 1.05, -1.05, -1.05]]) { m.tube([[a0, h + 1.05, b0], [a1, h + 1.05, b1]], 0.025, 4); m.tube([[a0, h + 0.55, b0], [a1, h + 0.55, b1]], 0.02, 4); m.cyl(a0, h, b0, 0.025, h + 1.05, 0.025, 4, false, false); }
        m.mat(2, 204, 0, 90); col(m, 0.1, 0.25, 0.5); Bx(m, -1.06, 1.06, h + 0.1, h + 1.0, -side * 1.07, -side * 1.06);
      });
      S1.add(mb, i0, 3, 510);
    }
  }
  // ---- paddock: caminhões, tendas, postes de luz; cones na entrada dos boxes ----
  {
    const truck = (m, c) => {
      if (typeof PropFactory !== 'undefined' && typeof PropFactory.createPaddockTruck === 'function') {
        PropFactory.createPaddockTruck({ mb: m }, { color: c });
        return;
      }
      m.mat(2, 89, 51); col(m, c[0], c[1], c[2]); Bx(m, -6.5, 3.2, 1.25, 4.0, -1.25, 1.25);
      col(m, 0.85, 0.85, 0.85); Bx(m, 3.6, 5.9, 0.9, 3.3, -1.2, 1.2);
      m.mat(5); col(m, 1, 1, 1); m.quad(5.92, 2.0, 1.1, 5.92, 2.0, -1.1, 5.92, 3.1, -1.1, 5.92, 3.1, 1.1, 0.2, 0.2, 1.5, 1.2);
      m.mat(2, 153, 76); col(m, 0.08, 0.08, 0.09); Bx(m, -6.3, 5.6, 0.75, 1.25, -1.1, 1.1);
      m.mat(4); col(m, 0.02, 0.02, 0.02);
      for (const x of [-5.4, -4.2, 2.2, 4.9]) for (const z of [-1.22, 0.92]) { m.push(m4mul(m4(), m4translate(mt, x, 0.5, z), m4rotX(m4(), PI / 2))); m.cyl(0, 0, 0, 0.5, 0.3, 0.5, 12, true, true); m.pop(); }
    };
    const tent = (m, c) => {
      m.mat(1); col(m, 1, 1, 1); for (const [a, b] of [[-2, -2], [2, -2], [2, 2], [-2, 2]]) m.cyl(a, -0.3, b, 0.03, 2.5, 0.03, 5, false, false);
      m.mat(10); col(m, c[0], c[1], c[2]);
      const ap = [0, 3.6, 0], cs = [[-2.15, 2.5, -2.15], [2.15, 2.5, -2.15], [2.15, 2.5, 2.15], [-2.15, 2.5, 2.15]];
      for (let k = 0; k < 4; k++) {
        const a = cs[k], b = cs[(k + 1) % 4]; const e1 = [b[0] - a[0], 0, b[2] - a[2]], e2 = [ap[0] - a[0], 1.1, ap[2] - a[2]]; const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0]; const sg = ny < 0 ? -1 : 1; const i1 = m.v(a[0], a[1], a[2], nx * sg, ny * sg, nz * sg, 0, 0), i2 = m.v(b[0], b[1], b[2], nx * sg, ny * sg, nz * sg, 1, 0), i3 = m.v(ap[0], ap[1], ap[2], nx * sg, ny * sg, nz * sg, 0.5, 1); if (sg > 0) m.tri(i1, i2, i3); else m.tri(i1, i3, i2);
        m.quad(b[0], 2.2, b[2], a[0], 2.2, a[2], a[0], 2.5, a[2], b[0], 2.5, b[2]);
      }
    };
    const cols = [[0.75, 0.08, 0.06], [0.08, 0.2, 0.55], [0.85, 0.85, 0.83], [0.1, 0.1, 0.11], [0.8, 0.6, 0.05]];
    const i0 = mb.ni, k0 = md.ni;
    [[-48, 40, 0.05], [-20, 41, -0.04], [12, 39.5, 3.1], [46, 41, 0.02]].forEach(([s, d, yaw], q) => at(mb, s, d, yaw, m => truck(m, cols[q])));
    [[-34, 35.5], [-4, 35], [29, 35.5], [60, 36], [70, 43]].forEach(([s, d], q) => at(md, s, d, 0, m => tent(m, q % 2 ? [0.85, 0.85, 0.82] : [0.75, 0.1, 0.08])));
    // postes de luz altos atrás dos boxes e da arquibancada
    for (const [s, d] of [[-70, 33.5], [0, 33.5], [70, 33.5], [-95, -22], [95, -22], [140, 20]]) at(mb, s, d, 0, m => {
      const sg = d > 0 ? -1 : 1;     // lado para onde os refletores apontam (a pista)
      // fuste cônico com base, escada de marinheiro e plataforma
      m.mat(1); col(m, 1, 1, 1); m.cyl(0, -0.5, 0, 0.2, 18.2, 0.1, 10, false, true);
      m.mat(3); col(m, 0.5, 0.5, 0.48); Bx(m, -0.5, 0.5, -0.6, 0.25, -0.5, 0.5);
      m.mat(2, 128, 128); col(m, 0.2, 0.2, 0.22); Bx(m, -0.7, 0.7, 17.5, 17.58, -0.7, 0.7);
      for (const x of [-0.7, 0.7]) { m.tube([[x, 17.58, -0.7], [x, 18.5, -0.7], [x, 18.5, 0.7], [x, 17.58, 0.7]], 0.02, 4); }
      // travessas com os refletores: 2 fileiras de 4, cada um com carcaça, aba e lente redonda acesa, levemente inclinados para baixo
      for (let b = 0; b < 2; b++) {
        const yc = 18.45 + b * 0.8;
        m.mat(2, 128, 128); col(m, 0.2, 0.2, 0.22); Bx(m, -1.75, 1.75, yc - 0.34, yc - 0.28, -0.06, 0.06); Bx(m, -0.05, 0.05, 17.6, yc - 0.28, -0.05, 0.05);
        for (let a = 0; a < 4; a++) {
          const xc = (a - 1.5) * 0.9;
          m.push(m4mul(m4(), m4translate(mt, xc, yc, 0), m4rotX(m4(), sg * 0.3)));
          m.mat(2, 110, 120); col(m, 0.16, 0.17, 0.19); Bx(m, -0.34, 0.34, -0.27, 0.27, -0.16, 0.16); Bx(m, -0.37, 0.37, 0.27, 0.31, sg * -0.16, sg * 0.34);   // carcaça + aba
          Bx(m, -0.37, -0.34, -0.27, 0.27, sg * 0.16, sg * 0.3); Bx(m, 0.34, 0.37, -0.27, 0.27, sg * 0.16, sg * 0.3);
          m.mat(6, 170, 0); col(m, 1.0, 0.94, 0.82);
          m.push(m4rotX(m4(), sg * PI / 2)); m.cyl(0, 0.165, 0, 0.23, 0.175, 0.23, 14, false, true); m.pop();
          m.pop();
        }
      }
    });
    S1.add(mb, i0, 7, 1600); S2.add(md, k0, 7, 900);
    const c0 = mb.ni;
    for (let q = 0; q < 9; q++) { const s = pit.s0 + 6 + q * 4.2, e = sat((s - pit.s0) / 45), d = lerp(hw, pit.laneD0, e) - 0.25; at(mb, s, d, 0, m => { m.mat(14); col(m, 1, 1, 1); m.cyl(0, 0.02, 0, 0.13, 0.5, 0.025, 10, false, true); m.mat(2, 153, 0); col(m, 0.7, 0.14, 0.02); Bx(m, -0.17, 0.17, 0, 0.03, -0.17, 0.17); }); }
    S1.add(mb, c0, 3, 220);
  }

  // ---- Props específicas y autocontenidas del circuito activo ----
  if (TRK.spec && typeof TRK.spec.buildProps === 'function') {
    TRK.spec.buildProps({
      mb, md, mp, S1, S2, SP, TRK, hw, frame, P, col, sign, REG, Bx, gantry, figure, sitter, stander, CROWD, mkRng, toStraight
    });
  } else if (typeof buildVegasUrbanProps === 'function' && TRK.spec && (TRK.spec.urban || TRK.spec.id === 'las-vegas-strip')) {
    buildVegasUrbanProps({
      mb, md, mp, S1, S2, SP, TRK, hw, frame, P, col, sign, REG, Bx, gantry, figure, sitter, stander, CROWD, mkRng
    });
  }

  WORLD.stats.tris.props = mb.ni / 3; WORLD.stats.tris.propsDS = md.ni / 3; WORLD.stats.ranges.props = S1.r.length; WORLD.stats.ranges.propsDS = S2.r.length;
  S1.upload(mb); S2.upload(md); SP.upload(mp); R.drawables.push(S1, S2, SP); PROPS.sets = [S1, S2, SP]; WORLD.stats.tris.gente = mp.ni / 3;

  // ---- alambrado: passe de transparentes (mistura alfa analítica, sem cintilação) ----
  if (fenceMB.ni) {
    const ff = mkFwdFamily('fence', { src: 'world_fence', blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } });
    const fm = fenceMB.upload(); let fbg = null;
    WORLD.stats.tris.fence = fenceMB.ni / 3;
    R.transparents.push({
      draw(pass) {
        if (!ff.pipe) return; if (!fbg) fbg = fwdBindGroup(ff);
        const ctx = R.ctx; let set = false;     // R.ctx ainda guarda o tronco de visão do passe principal
        for (let i = 0; i < fenceR.length; i++) {
          const r = fenceR[i]; if (!(SQ[0] = r.x, SQ[1] = r.y, SQ[2] = r.z, SQ[3] = r.rad, sphereQ(ctx.planes, ctx.nPlanes))) continue;
          if (!set) { pass.setPipeline(ff.pipe); pass.setBindGroup(3, fbg); R.dyn2[0] = 0; pass.setBindGroup(2, R.objBG, R.dyn2, 0, 1); pass.setVertexBuffer(0, fm.vb); pass.setIndexBuffer(fm.ib, 'uint32'); set = true; }
          pass.drawIndexed(r.count, 1, r.first, 0, 0);
        }
      }
    });
  }
}
if (WORLD.active) queueMicrotask(() => BUILD.push(async () => {
  if (TRK.spec && TRK.spec.glb && !TRK.spec.glbFailed) return; // El circuito GLB ya incluye sus propias gradas, boxes, pantallas y vallas escaneadas
  propsBuild();
}));
