'use strict';
// ---- 02_mesh.js
// Constructor de mallas procedurales (usado solo durante inicialización).
// Vértice (36 bytes): pos f32x3 | normal snorm16x4 (w = peso libre, ej. balanceo viento) | uv f32x2 | mat u8x4 | color unorm8x4
const VSTRIDE = 36;
const VLAYOUT = {
  arrayStride: VSTRIDE, attributes: [
    { shaderLocation: 0, offset: 0, format: 'float32x3' },
    { shaderLocation: 1, offset: 12, format: 'snorm16x4' },
    { shaderLocation: 2, offset: 20, format: 'float32x2' },
    { shaderLocation: 3, offset: 28, format: 'uint8x4' },
    { shaderLocation: 4, offset: 32, format: 'unorm8x4' },
  ]
};
const _fd0 = new Float64Array(3), _fd1 = new Float64Array(3), _fd2 = new Float64Array(3), _fd3 = new Float64Array(3);

class MeshBuilder {
  constructor(cap) {
    this.cap = cap || 4096; this.nv = 0; this.ni = 0; this.icap = this.cap * 3;
    this.buf = new ArrayBuffer(this.cap * VSTRIDE);
    this.f32 = new Float32Array(this.buf); this.i16 = new Int16Array(this.buf); this.u8 = new Uint8Array(this.buf);
    this.idx = new Uint32Array(this.icap);
    this.m = [0, 0, 0, 0]; this.c = [255, 255, 255, 255]; this.w = 0;
    this.xf = null; this.xfStack = []; this.flipW = false;
  }
  _growV() { this.cap *= 2; const nb = new ArrayBuffer(this.cap * VSTRIDE); new Uint8Array(nb).set(this.u8); this.buf = nb; this.f32 = new Float32Array(nb); this.i16 = new Int16Array(nb); this.u8 = new Uint8Array(nb); }
  _growI() { this.icap *= 2; const ni = new Uint32Array(this.icap); ni.set(this.idx); this.idx = ni; }
  mat(id, a, b, c) { this.m[0] = id; this.m[1] = a || 0; this.m[2] = b || 0; this.m[3] = c || 0; return this; }
  color(r, g, b, a) { this.c[0] = Math.round(sat(r) * 255); this.c[1] = Math.round(sat(g) * 255); this.c[2] = Math.round(sat(b) * 255); this.c[3] = Math.round(sat(a === undefined ? 1 : a) * 255); return this; }
  weight(w) { this.w = w; return this; }
  // Pila de transformaciones (afines). det < 0 invierte el devanado de los triángulos.
  push(mx) { this.xfStack.push(this.xf); this.xf = this.xf ? m4mul(m4(), this.xf, mx) : new Float32Array(mx); this._det(); return this; }
  pop() { this.xf = this.xfStack.pop(); this._det(); return this; }
  _det() { const m = this.xf; this.flipW = !!m && (m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5])) < 0; }
  v(px, py, pz, nx, ny, nz, u, vv) {
    if (this.nv >= this.cap) this._growV();
    const m = this.xf;
    if (m) {
      const x = m[0] * px + m[4] * py + m[8] * pz + m[12], y = m[1] * px + m[5] * py + m[9] * pz + m[13], z = m[2] * px + m[6] * py + m[10] * pz + m[14];
      const a = m[0] * nx + m[4] * ny + m[8] * nz, b = m[1] * nx + m[5] * ny + m[9] * nz, c = m[2] * nx + m[6] * ny + m[10] * nz;
      px = x; py = y; pz = z; nx = a; ny = b; nz = c;
    }
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const i = this.nv++, f = i * 9, s = i * 18, b8 = i * 36;
    this.f32[f] = px; this.f32[f + 1] = py; this.f32[f + 2] = pz;
    this.i16[s + 6] = Math.round(nx * 32767); this.i16[s + 7] = Math.round(ny * 32767); this.i16[s + 8] = Math.round(nz * 32767); this.i16[s + 9] = Math.round(clamp(this.w, -1, 1) * 32767);
    this.f32[f + 5] = u || 0; this.f32[f + 6] = vv || 0;
    this.u8[b8 + 28] = this.m[0]; this.u8[b8 + 29] = this.m[1]; this.u8[b8 + 30] = this.m[2]; this.u8[b8 + 31] = this.m[3];
    this.u8[b8 + 32] = this.c[0]; this.u8[b8 + 33] = this.c[1]; this.u8[b8 + 34] = this.c[2]; this.u8[b8 + 35] = this.c[3];
    return i;
  }
  tri(a, b, c) { if (this.ni + 3 > this.icap) this._growI(); if (this.flipW) { const t = b; b = c; c = t; } this.idx[this.ni++] = a; this.idx[this.ni++] = b; this.idx[this.ni++] = c; }
  quadI(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  // Quad plano con normal de cara; vértices en sentido antihorario visto desde fuera
  quad(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, u0, v0, u1, v1) {
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az, e2x = dx - ax, e2y = dy - ay, e2z = dz - az;
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    u0 = u0 || 0; v0 = v0 || 0; u1 = u1 === undefined ? 1 : u1; v1 = v1 === undefined ? 1 : v1;
    const a = this.v(ax, ay, az, nx, ny, nz, u0, v0), b = this.v(bx, by, bz, nx, ny, nz, u1, v0), c = this.v(cx, cy, cz, nx, ny, nz, u1, v1), d = this.v(dx, dy, dz, nx, ny, nz, u0, v1);
    this.quadI(a, b, c, d);
  }
  // Caja centrada (caras planas). UV en metros.
  box(cx, cy, cz, sx, sy, sz) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    this.quad(x1, y0, z0, x1, y1, z0, x1, y1, z1, x1, y0, z1, 0, 0, sy, sz); this.quad(x0, y0, z1, x0, y1, z1, x0, y1, z0, x0, y0, z0, 0, 0, sy, sz);
    this.quad(x0, y1, z0, x0, y1, z1, x1, y1, z1, x1, y1, z0, 0, 0, sz, sx); this.quad(x0, y0, z1, x0, y0, z0, x1, y0, z0, x1, y0, z1, 0, 0, sz, sx);
    this.quad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, 0, 0, sx, sy); this.quad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0, 0, 0, sx, sy);
  }
  // Caja con esquinas redondeadas (superficie suave): radio r, seg subdivisiones por esquina
  rbox(cx, cy, cz, sx, sy, sz, r, seg) {
    seg = seg || 3; r = Math.min(r, sx / 2, sy / 2, sz / 2);
    const hx = sx / 2 - r, hy = sy / 2 - r, hz = sz / 2 - r, n = seg * 2 + 2;
    // Esfera cúbica desplazada: cada cara es una cuadrícula; dirección normalizada * r + desplazamiento de esquina
    const face = (ax, ay, az, ux, uy, uz, vx, vy, vz) => {
      const base = this.nv;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const ti = i < n / 2 ? (i / (n / 2 - 1)) * 0.5 : 0.5 + ((i - n / 2) / (n / 2 - 1)) * 0.5;
        const tj = j < n / 2 ? (j / (n / 2 - 1)) * 0.5 : 0.5 + ((j - n / 2) / (n / 2 - 1)) * 0.5;
        // Ángulo en la esquina: mitad inferior de -45°..0 y mitad superior 0..45° colapsados en esquinas
        const su = i < n / 2 ? -1 : 1, sv = j < n / 2 ? -1 : 1;
        const au = i < n / 2 ? (1 - ti * 2) : (ti * 2 - 1), av = j < n / 2 ? (1 - tj * 2) : (tj * 2 - 1);
        const tu = Math.tan(au * PI / 4) * su, tv = Math.tan(av * PI / 4) * sv;
        let dx = ax + ux * tu + vx * tv, dy = ay + uy * tu + vy * tv, dz = az + uz * tu + vz * tv;
        const l = 1 / Math.hypot(dx, dy, dz); dx *= l; dy *= l; dz *= l;
        const ox = (ax + ux * su + vx * sv), oy = (ay + uy * su + vy * sv), oz = (az + uz * su + vz * sv);
        const px = cx + ox * hx + dx * r, py = cy + oy * hy + dy * r, pz = cz + oz * hz + dz * r;
        this.v(px, py, pz, dx, dy, dz, px * ux + py * uy + pz * uz, px * vx + py * vy + pz * vz);
      }
      for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = base + j * n + i; this.quadI(a, a + 1, a + n + 1, a + n); }
    };
    face(1, 0, 0, 0, 1, 0, 0, 0, 1); face(-1, 0, 0, 0, 0, 1, 0, 1, 0); face(0, 1, 0, 0, 0, 1, 1, 0, 0);
    face(0, -1, 0, 1, 0, 0, 0, 0, 1); face(0, 0, 1, 1, 0, 0, 0, 1, 0); face(0, 0, -1, 0, 1, 0, 1, 0, 0);
  }
  // Cilindro/cono a lo largo de Y local: de y0 (radio r0) a y1 (radio r1)
  cyl(cx, y0, cz, r0, y1, r1, seg, cap0, cap1) {
    const base = this.nv, sl = (r0 - r1) / (y1 - y0);
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * TAU, c = Math.cos(a), s = Math.sin(a);
      this.v(cx + c * r0, y0, cz + s * r0, c, sl, s, i / seg, 0); this.v(cx + c * r1, y1, cz + s * r1, c, sl, s, i / seg, 1);
    }
    for (let i = 0; i < seg; i++) { const a = base + i * 2; this.quadI(a, a + 1, a + 3, a + 2); }
    const cap = (y, r, ny) => {
      const b = this.nv; this.v(cx, y, cz, 0, ny, 0, 0.5, 0.5);
      for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; this.v(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r, 0, ny, 0, 0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5); }
      for (let i = 0; i < seg; i++) { if (ny > 0) this.tri(b, b + 2 + i, b + 1 + i); else this.tri(b, b + 1 + i, b + 2 + i); }
    };
    if (cap0) cap(y0, r0, -1); if (cap1) cap(y1, r1, 1);
  }
  // Revolución alrededor del eje X local: perfil = [[x, r], ...] (normales suaves; repetir puntos para arista viva)
  lathe(profile, seg, closedLoop) {
    const base = this.nv, n = profile.length;
    for (let j = 0; j < n; j++) {
      const p = profile[j], pa = profile[Math.max(0, j - 1)], pb = profile[Math.min(n - 1, j + 1)];
      let tx = pb[0] - pa[0], tr = pb[1] - pa[1];
      if (p[2] !== undefined) { tx = p[2]; tr = p[3]; } // tangente explícita
      let nx = -tr, nr = tx; const l = Math.hypot(nx, nr) || 1; nx /= l; nr /= l;
      for (let i = 0; i <= seg; i++) {
        const a = i / seg * TAU, c = Math.cos(a), s = Math.sin(a);
        this.v(p[0], p[1] * c, p[1] * s, nx, nr * c, nr * s, i / seg, j / (n - 1));
      }
    }
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < seg; i++) { const a = base + j * (seg + 1) + i; this.quadI(a, a + 1, a + seg + 2, a + seg + 1); }
  }
  // Barre un perfil 2D cerrado o abierto a lo largo de una trayectoria 3D. path: [[x,y,z],...]; prof: [[a,b],...] en el plano (lateral, arriba)
  // up: vector de referencia. closedPath cierra el bucle. Normales de perfil suaves, salvo hard=true (caras planas).
  sweep(path, prof, opts) {
    opts = opts || {}; const up = opts.up || [0, 1, 0], n = path.length, np = prof.length, closedP = !!opts.closedProfile, hard = !!opts.hard;
    const frames = [];
    for (let i = 0; i < n; i++) {
      const a = path[opts.closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = path[opts.closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; let l = 1 / (Math.hypot(tx, ty, tz) || 1); tx *= l; ty *= l; tz *= l;
      let sx = ty * up[2] - tz * up[1], sy = tz * up[0] - tx * up[2], sz = tx * up[1] - ty * up[0]; l = 1 / (Math.hypot(sx, sy, sz) || 1); sx *= l; sy *= l; sz *= l;
      const ux = sy * tz - sz * ty, uy = sz * tx - sx * tz, uz = sx * ty - sy * tx;
      frames.push([sx, sy, sz, ux, uy, uz]);
    }
    const cnt = closedP ? np : np - 1; const rows = opts.closed ? n + 1 : n;
    const emit = (k0, k1) => { // franja para el segmento de perfil k0->k1 (hard) o todos (suave)
      const base = this.nv; const ks = hard ? [k0, k1] : null; const m = hard ? 2 : (closedP ? np + 1 : np);
      for (let r = 0; r < rows; r++) {
        const i = r % n, p = path[i], f = frames[i]; let dist = opts.vScale ? r * opts.vScale : r / (rows - 1);
        for (let q = 0; q < m; q++) {
          const k = hard ? ks[q] : q % np; const pr = prof[k]; let na, nb;
          if (hard) { const pa = prof[k0], pb = prof[k1]; na = pb[1] - pa[1]; nb = -(pb[0] - pa[0]); }
          else { const pa = prof[closedP ? (k - 1 + np) % np : Math.max(0, k - 1)], pb = prof[closedP ? (k + 1) % np : Math.min(np - 1, k + 1)]; na = pb[1] - pa[1]; nb = -(pb[0] - pa[0]); }
          this.v(p[0] + f[0] * pr[0] + f[3] * pr[1], p[1] + f[1] * pr[0] + f[4] * pr[1], p[2] + f[2] * pr[0] + f[5] * pr[1],
            f[0] * na + f[3] * nb, f[1] * na + f[4] * nb, f[2] * na + f[5] * nb, q / (m - 1), dist);
        }
      }
      for (let r = 0; r < rows - 1; r++) for (let q = 0; q < m - 1; q++) { const a = base + r * m + q; this.quadI(a, a + m, a + m + 1, a + 1); }
    };
    if (hard) for (let k = 0; k < cnt; k++) emit(k, (k + 1) % np); else emit();
  }
  // Tubo cilíndrico a lo largo de una trayectoria
  tube(path, r, seg, opts) {
    const prof = []; for (let i = 0; i < seg; i++) { const a = i / seg * TAU; prof.push([Math.cos(a) * r, Math.sin(a) * r]); }
    this.sweep(path, prof, Object.assign({ closedProfile: true }, opts || {}));
  }
  // Superficie paramétrica P=fn(u,v,out) en [u0,u1]x[v0,v1], con recorte por campo escalar field(u,v,P) < 0 = conservar
  // (marching squares: borde nítido en nivel cero). opts: nu,nv, field, flip, rim (profundidad del reborde en el corte),
  // rimMat (fn invocada antes de emitir el reborde), uv(u,v,P)->[u,v], eps (paso de diferencia finita)
  patch(fn, u0, u1, v0, v1, opts) {
    const nu = opts.nu, nv = opts.nv, field = opts.field, flip = !!opts.flip, eps = opts.eps || 1e-3;
    const du = (u1 - u0) / nu, dv = (v1 - v0) / nv, W = nu + 1;
    const P = _fd0, Pa = _fd1, Pb = _fd2, N = _fd3;
    const sv = field ? new Float32Array(W * (nv + 1)) : null;
    const vi = new Int32Array(W * (nv + 1)).fill(-1), eh = new Int32Array(W * (nv + 1)).fill(-1), ev = new Int32Array(W * (nv + 1)).fill(-1);
    const eu = eps * (u1 - u0), evv = eps * (v1 - v0);
    const nrm = (u, v) => {
      const ua = Math.max(u0, u - eu), ub = Math.min(u1, u + eu), va = Math.max(v0, v - evv), vb = Math.min(v1, v + evv);
      fn(ua, v, Pa); fn(ub, v, Pb); const ax = Pb[0] - Pa[0], ay = Pb[1] - Pa[1], az = Pb[2] - Pa[2];
      fn(u, va, Pa); fn(u, vb, Pb); const bx = Pb[0] - Pa[0], by = Pb[1] - Pa[1], bz = Pb[2] - Pa[2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; if (flip) { nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz) || 1; N[0] = nx / l; N[1] = ny / l; N[2] = nz / l;
    };
    const emit = (u, v) => {
      fn(u, v, P); const px = P[0], py = P[1], pz = P[2]; nrm(u, v);
      let tu = u, tv = v; if (opts.uv) { const t = opts.uv(u, v, P); tu = t[0]; tv = t[1]; }
      return this.v(px, py, pz, N[0], N[1], N[2], tu, tv);
    };
    if (field) for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const u = u0 + i * du, v = v0 + j * dv; fn(u, v, P); sv[j * W + i] = field(u, v, P); }
    const gv = (i, j) => { const k = j * W + i; if (vi[k] < 0) vi[k] = emit(u0 + i * du, v0 + j * dv); return vi[k]; };
    // Cruce en arista entre (i,j) y vecino (horizontal: i+1; vertical: j+1), refinado por bisección
    const cross = (i, j, horiz) => {
      const k = j * W + i; const cache = horiz ? eh : ev; if (cache[k] >= 0) return cache[k];
      const sa = sv[k], sb = horiz ? sv[k + 1] : sv[k + W]; let ta = 0, tb = 1, fa = sa, fb = sb, t = sa / (sa - sb);
      for (let it = 0; it < 6; it++) {
        const u = u0 + (i + (horiz ? t : 0)) * du, v = v0 + (j + (horiz ? 0 : t)) * dv; fn(u, v, P); const f = field(u, v, P);
        if (Math.abs(f) < 1e-5) break;
        if ((f < 0) === (fa < 0)) { ta = t; fa = f; } else { tb = t; fb = f; }
        t = ta + (tb - ta) * fa / (fa - fb);
      }
      return cache[k] = emit(u0 + (i + (horiz ? t : 0)) * du, v0 + (j + (horiz ? 0 : t)) * dv);
    };
    const poly = new Int32Array(8), isX = new Uint8Array(8); const rims = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      if (!field) { const a = gv(i, j), b = gv(i + 1, j), c = gv(i + 1, j + 1), d = gv(i, j + 1); if (flip) this.quadI(a, d, c, b); else this.quadI(a, b, c, d); continue; }
      const k = j * W + i, s0 = sv[k] < 0, s1 = sv[k + 1] < 0, s2 = sv[k + W + 1] < 0, s3 = sv[k + W] < 0;
      if (!(s0 || s1 || s2 || s3)) continue;
      if (s0 && s1 && s2 && s3) { const a = gv(i, j), b = gv(i + 1, j), c = gv(i + 1, j + 1), d = gv(i, j + 1); if (flip) this.quadI(a, d, c, b); else this.quadI(a, b, c, d); continue; }
      let n = 0;
      if (s0) { isX[n] = 0; poly[n++] = gv(i, j); } if (s0 !== s1) { isX[n] = 1; poly[n++] = cross(i, j, true); }
      if (s1) { isX[n] = 0; poly[n++] = gv(i + 1, j); } if (s1 !== s2) { isX[n] = 1; poly[n++] = cross(i + 1, j, false); }
      if (s2) { isX[n] = 0; poly[n++] = gv(i + 1, j + 1); } if (s2 !== s3) { isX[n] = 1; poly[n++] = cross(i, j + 1, true); }
      if (s3) { isX[n] = 0; poly[n++] = gv(i, j + 1); } if (s3 !== s0) { isX[n] = 1; poly[n++] = cross(i, j, false); }
      for (let q = 1; q < n - 1; q++) { if (flip) this.tri(poly[0], poly[q + 1], poly[q]); else this.tri(poly[0], poly[q], poly[q + 1]); }
      if (opts.rim) for (let q = 0; q < n; q++) { const q2 = (q + 1) % n; if (isX[q] && isX[q2]) rims.push(flip ? poly[q2] : poly[q], flip ? poly[q] : poly[q2]); }
    }
    if (opts.rim && rims.length) {
      if (opts.rimMat) opts.rimMat(this);
      const d = opts.rim, f = this.f32, s16 = this.i16;
      for (let q = 0; q < rims.length; q += 2) {
        const a = rims[q], b = rims[q + 1];
        const ax = f[a * 9], ay = f[a * 9 + 1], az = f[a * 9 + 2], bx = f[b * 9], by = f[b * 9 + 1], bz = f[b * 9 + 2];
        const anx = s16[a * 18 + 6] / 32767, any = s16[a * 18 + 7] / 32767, anz = s16[a * 18 + 8] / 32767;
        const bnx = s16[b * 18 + 6] / 32767, bny = s16[b * 18 + 7] / 32767, bnz = s16[b * 18 + 8] / 32767;
        const ex = bx - ax, ey = by - ay, ez = bz - az;
        // Normal del reborde = e × n (apunta hacia fuera). Las posiciones ya están en espacio final: escritura directa.
        const rx = ey * anz - ez * any, ry = ez * anx - ex * anz, rz = ex * any - ey * anx;
        const sx = this.xf; this.xf = null;
        const i0 = this.v(ax, ay, az, rx, ry, rz, 0, 0), i1 = this.v(ax - anx * d, ay - any * d, az - anz * d, rx, ry, rz, 0, 1);
        const i2 = this.v(bx - bnx * d, by - bny * d, bz - bnz * d, rx, ry, rz, 1, 1), i3 = this.v(bx, by, bz, rx, ry, rz, 1, 0);
        this.xf = sx;
        this.tri(i0, i1, i2); this.tri(i0, i2, i3);
      }
    }
  }
  // Refleja (en plano de coordenadas) vértices/índices añadidos desde (v0,i0): axis 0=x,1=y,2=z
  mirror(v0, i0, axis) {
    const nvEnd = this.nv, niEnd = this.ni, off = nvEnd - v0;
    for (let i = v0; i < nvEnd; i++) {
      if (this.nv >= this.cap) this._growV();
      const d = this.nv++; this.u8.copyWithin(d * VSTRIDE, i * VSTRIDE, (i + 1) * VSTRIDE);
      this.f32[d * 9 + axis] = -this.f32[d * 9 + axis]; this.i16[d * 18 + 6 + axis] = -this.i16[d * 18 + 6 + axis];
    }
    for (let i = i0; i < niEnd; i += 3) { if (this.ni + 3 > this.icap) this._growI(); this.idx[this.ni++] = this.idx[i] + off; this.idx[this.ni++] = this.idx[i + 2] + off; this.idx[this.ni++] = this.idx[i + 1] + off; }
  }
  // Añade otra malla (con la transformación actual aplicada)
  append(o) {
    const base = this.nv;
    for (let i = 0; i < o.nv; i++) {
      const f = i * 9, s = i * 18, b = i * 36;
      this.m[0] = o.u8[b + 28]; this.m[1] = o.u8[b + 29]; this.m[2] = o.u8[b + 30]; this.m[3] = o.u8[b + 31];
      this.c[0] = o.u8[b + 32]; this.c[1] = o.u8[b + 33]; this.c[2] = o.u8[b + 34]; this.c[3] = o.u8[b + 35];
      this.w = o.i16[s + 9] / 32767;
      this.v(o.f32[f], o.f32[f + 1], o.f32[f + 2], o.i16[s + 6], o.i16[s + 7], o.i16[s + 8], o.f32[f + 5], o.f32[f + 6]);
    }
    for (let i = 0; i < o.ni; i += 3) this.tri(base + o.idx[i], base + o.idx[i + 1], base + o.idx[i + 2]);
  }
  bounds() {
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9; const f = this.f32;
    for (let i = 0; i < this.nv; i++) { const x = f[i * 9], y = f[i * 9 + 1], z = f[i * 9 + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    return { min: [x0, y0, z0], max: [x1, y1, z1], c: [cx, cy, cz], r: Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 };
  }
  // Sube los búferes a GPU. Devuelve {vb, ib, count, bounds}
  upload() {
    const vb = mkBuf(this.nv * VSTRIDE, BU.V, new Uint8Array(this.buf, 0, this.nv * VSTRIDE));
    const ib = mkBuf(this.ni * 4, BU.I, new Uint32Array(this.idx.buffer, 0, this.ni));
    return { vb, ib, count: this.ni, nv: this.nv, bounds: this.bounds() };
  }
}
