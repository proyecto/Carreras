'use strict';
// ---- 00_math.js
// Matemática sem alocação: tudo escreve em parâmetros de saída (Float32Array pré-alocados).
const PI = Math.PI, TAU = Math.PI * 2;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;
const smooth = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fract = x => x - Math.floor(x);
const sign = x => x < 0 ? -1 : 1;
const wrapPi = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };

function m4() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
function m4ident(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; }
function m4copy(o, a) { o.set(a); return o; }
function m4mul(o, a, b) { // o = a*b (coluna-maior); o pode ser a ou b
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  for (let i = 0; i < 4; i++) {
    const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
    o[i * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
    o[i * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
    o[i * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
    o[i * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
  }
  return o;
}
// Projeção com Z invertido e plano distante no infinito (profundidade = near / distância).
function m4persp(o, fovy, aspect, near) {
  const f = 1 / Math.tan(fovy / 2);
  o.fill(0); o[0] = f / aspect; o[5] = f; o[11] = -1; o[14] = near; return o;
}
// Projeção de cubemap/normal com far finito e z em [0,1]
function m4perspStd(o, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  o.fill(0); o[0] = f / aspect; o[5] = f; o[10] = far / (near - far); o[11] = -1; o[14] = near * far / (near - far); return o;
}
function m4ortho(o, l, r, b, t, n, f) {
  o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = 1 / (n - f);
  o[12] = (l + r) / (l - r); o[13] = (t + b) / (b - t); o[14] = n / (n - f); o[15] = 1; return o;
}
function m4lookAt(o, ex, ey, ez, tx, ty, tz, ux, uy, uz) {
  let zx = ex - tx, zy = ey - ty, zz = ez - tz; let l = 1 / Math.sqrt(zx * zx + zy * zy + zz * zz); zx *= l; zy *= l; zz *= l;
  let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx; l = 1 / Math.sqrt(xx * xx + xy * xy + xz * xz); xx *= l; xy *= l; xz *= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
  o[12] = -(xx * ex + xy * ey + xz * ez); o[13] = -(yx * ex + yy * ey + yz * ez); o[14] = -(zx * ex + zy * ey + zz * ez); o[15] = 1; return o;
}
// variante sem argumentos numéricos (não gera números em caixa na chamada): v[0..2] olho, v[3..5] alvo, v[6..8] cima
function m4lookAtV(o, v) {
  const ex = v[0], ey = v[1], ez = v[2], ux = v[6], uy = v[7], uz = v[8];
  let zx = ex - v[3], zy = ey - v[4], zz = ez - v[5]; let l = 1 / Math.sqrt(zx * zx + zy * zy + zz * zz); zx *= l; zy *= l; zz *= l;
  let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx; l = 1 / Math.sqrt(xx * xx + xy * xy + xz * xz); xx *= l; xy *= l; xz *= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
  o[12] = -(xx * ex + xy * ey + xz * ez); o[13] = -(yx * ex + yy * ey + yz * ez); o[14] = -(zx * ex + zy * ey + zz * ez); o[15] = 1; return o;
}
function m4inv(o, m) {
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
    a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
    b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
    b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; d = 1 / d;
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d;
  o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d;
  o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d;
  o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d;
  o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d; return o;
}
function m4translate(o, x, y, z) { m4ident(o); o[12] = x; o[13] = y; o[14] = z; return o; }
function m4scale(o, x, y, z) { m4ident(o); o[0] = x; o[5] = y; o[10] = z; return o; }
function m4rotX(o, a) { m4ident(o); const c = Math.cos(a), s = Math.sin(a); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o; }
function m4rotY(o, a) { m4ident(o); const c = Math.cos(a), s = Math.sin(a); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; }
function m4rotZ(o, a) { m4ident(o); const c = Math.cos(a), s = Math.sin(a); o[0] = c; o[1] = s; o[4] = -s; o[5] = c; return o; }
// matriz a partir de base ortonormal (colunas X,Y,Z) + posição
function m4basis(o, xx, xy, xz, yx, yy, yz, zx, zy, zz, px, py, pz) {
  o[0] = xx; o[1] = xy; o[2] = xz; o[3] = 0; o[4] = yx; o[5] = yy; o[6] = yz; o[7] = 0; o[8] = zx; o[9] = zy; o[10] = zz; o[11] = 0;
  o[12] = px; o[13] = py; o[14] = pz; o[15] = 1; return o;
}
// transforma ponto; escreve em o[oi..oi+2]
function m4point(o, oi, m, x, y, z) {
  o[oi] = m[0] * x + m[4] * y + m[8] * z + m[12]; o[oi + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]; o[oi + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
}
function m4dir(o, oi, m, x, y, z) {
  o[oi] = m[0] * x + m[4] * y + m[8] * z; o[oi + 1] = m[1] * x + m[5] * y + m[9] * z; o[oi + 2] = m[2] * x + m[6] * y + m[10] * z;
}
// planos do frustum (6×4) a partir de viewProj; normalizados, apontando para dentro. Z invertido infinito: sem plano far.
function frustumPlanes(o, m, nPlanes) {
  for (let i = 0; i < nPlanes; i++) {
    let a, b, c, d;
    if (i === 0) { a = m[3] + m[0]; b = m[7] + m[4]; c = m[11] + m[8]; d = m[15] + m[12]; }
    else if (i === 1) { a = m[3] - m[0]; b = m[7] - m[4]; c = m[11] - m[8]; d = m[15] - m[12]; }
    else if (i === 2) { a = m[3] + m[1]; b = m[7] + m[5]; c = m[11] + m[9]; d = m[15] + m[13]; }
    else if (i === 3) { a = m[3] - m[1]; b = m[7] - m[5]; c = m[11] - m[9]; d = m[15] - m[13]; }
    else if (i === 4) { a = m[3] - m[2]; b = m[7] - m[6]; c = m[11] - m[10]; d = m[15] - m[14]; }   // near (z invertido: z<=w)
    else { a = m[2]; b = m[6]; c = m[10]; d = m[14]; }
    const l = 1 / Math.sqrt(a * a + b * b + c * c); o[i * 4] = a * l; o[i * 4 + 1] = b * l; o[i * 4 + 2] = c * l; o[i * 4 + 3] = d * l;
  }
}
// teste esfera × planos sem números por argumento: a esfera vem do registrador SQ = [x, y, z, raio]
const SQ = new Float64Array(4);
function sphereQ(pl, n) {
  const x = SQ[0], y = SQ[1], z = SQ[2], r = SQ[3];
  for (let i = 0; i < n; i++) if (pl[i * 4] * x + pl[i * 4 + 1] * y + pl[i * 4 + 2] * z + pl[i * 4 + 3] < -r) return false;
  return true;
}
function sphereInFrustum(pl, n, x, y, z, r) {
  for (let i = 0; i < n; i++) if (pl[i * 4] * x + pl[i * 4 + 1] * y + pl[i * 4 + 2] * z + pl[i * 4 + 3] < -r) return false;
  return true;
}
// RNG determinístico
function mkRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash2(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
// ruído de valor 2D suave + fbm (CPU, para geração)
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct, lac, gain) {
  let a = 0.5, s = 0, n = 0; lac = lac || 2; gain = gain || 0.5;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x, y); n += a; x = x * lac + 17.3; y = y * lac - 9.1; a *= gain; }
  return s / n;
}
function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
