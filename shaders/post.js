'use strict';
WGSL["blit"] = `#include fsq
@group(0) @binding(0) var t: texture_2d<f32>;
@group(0) @binding(1) var s: sampler;
@fragment fn fs(in: FsV) -> @location(0) vec4f { return textureSampleLevel(t, s, in.uv, 0.0); }
`;
WGSL["bloom"] = `// Bloom: cadena de reducción progresiva (13 muestras, promedio Karis en primer nivel) y carpa 3x3 aditiva.
#include fsq
@group(0) @binding(0) var t: texture_2d<f32>;
@group(0) @binding(1) var s: sampler;
fn kw(c: vec3f) -> f32 { return 1.0 / (1.0 + max(c.r, max(c.g, c.b))); }
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  let ts = 1.0 / vec2f(textureDimensions(t)); let uv = in.uv;
#ifdef UP
  var c = textureSampleLevel(t, s, uv, 0.0).rgb * 4.0;
  c += (textureSampleLevel(t, s, uv + vec2f(ts.x, 0.0), 0.0).rgb + textureSampleLevel(t, s, uv - vec2f(ts.x, 0.0), 0.0).rgb + textureSampleLevel(t, s, uv + vec2f(0.0, ts.y), 0.0).rgb + textureSampleLevel(t, s, uv - vec2f(0.0, ts.y), 0.0).rgb) * 2.0;
  c += textureSampleLevel(t, s, uv + ts, 0.0).rgb + textureSampleLevel(t, s, uv - ts, 0.0).rgb + textureSampleLevel(t, s, uv + vec2f(ts.x, -ts.y), 0.0).rgb + textureSampleLevel(t, s, uv + vec2f(-ts.x, ts.y), 0.0).rgb;
  return vec4f(c / 16.0 * UPW, 1.0);
#else
  let a = textureSampleLevel(t, s, uv + ts * vec2f(-2.0, -2.0), 0.0).rgb; let b = textureSampleLevel(t, s, uv + ts * vec2f(0.0, -2.0), 0.0).rgb; let c = textureSampleLevel(t, s, uv + ts * vec2f(2.0, -2.0), 0.0).rgb;
  let d = textureSampleLevel(t, s, uv + ts * vec2f(-2.0, 0.0), 0.0).rgb; let e = textureSampleLevel(t, s, uv, 0.0).rgb; let f = textureSampleLevel(t, s, uv + ts * vec2f(2.0, 0.0), 0.0).rgb;
  let g = textureSampleLevel(t, s, uv + ts * vec2f(-2.0, 2.0), 0.0).rgb; let h = textureSampleLevel(t, s, uv + ts * vec2f(0.0, 2.0), 0.0).rgb; let i = textureSampleLevel(t, s, uv + ts * vec2f(2.0, 2.0), 0.0).rgb;
  let j = textureSampleLevel(t, s, uv + ts * vec2f(-1.0, -1.0), 0.0).rgb; let k = textureSampleLevel(t, s, uv + ts * vec2f(1.0, -1.0), 0.0).rgb;
  let l = textureSampleLevel(t, s, uv + ts * vec2f(-1.0, 1.0), 0.0).rgb; let m = textureSampleLevel(t, s, uv + ts * vec2f(1.0, 1.0), 0.0).rgb;
#ifdef FIRST
  let g0 = (j + k + l + m) * 0.25; let g1 = (a + b + d + e) * 0.25; let g2 = (b + c + e + f) * 0.25; let g3 = (d + e + g + h) * 0.25; let g4 = (e + f + h + i) * 0.25;
  let w0 = kw(g0) * 0.5; let w1 = kw(g1) * 0.125; let w2 = kw(g2) * 0.125; let w3 = kw(g3) * 0.125; let w4 = kw(g4) * 0.125;
  return vec4f(min((g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4), vec3f(200.0)), 1.0);
#else
  return vec4f(e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125, 1.0);
#endif
#endif
}
`;
WGSL["expo"] = `// Exposición automática: luminancia media logarítmica suavizada temporalmente.
#include fsq
#include util
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var tSmall: texture_2d<f32>;
@group(0) @binding(2) var tPrev: texture_2d<f32>;
@group(0) @binding(3) var s: sampler;
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  var acc = 0.0; var ws = 0.0;
  for (var y = 0; y < 6; y++) { for (var x = 0; x < 10; x++) {
    let uv = (vec2f(f32(x), f32(y)) + 0.5) / vec2f(10.0, 6.0);
    let w = 1.0 - 0.6 * length(uv - vec2f(0.5, 0.55));     // Mayor peso ponderado en el centro
    acc += log(max(lum(textureSampleLevel(tSmall, s, uv, 0.0).rgb), 1e-4)) * w; ws += w;
  } }
  let cur = exp(acc / ws); let prev = textureLoad(tPrev, vec2i(0), 0).r;
  let a = select(1.0 - exp(-F.misc.x / 0.9), 1.0, prev <= 0.0 || F.misc.w > 0.5);
  return vec4f(mix(prev, cur, a), 0.0, 0.0, 1.0);
}
`;
WGSL["final"] = `// Salida final: bloom, exposición, mapeo tonal AgX, nitidez, viñeteado, grano cinematográfico y dithering.
#include fsq
#include util
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var tCol: texture_2d<f32>;
@group(0) @binding(2) var tBloom: texture_2d<f32>;
@group(0) @binding(3) var tExp: texture_2d<f32>;
@group(0) @binding(4) var s: sampler;
@group(0) @binding(5) var gD: texture_depth_2d;
// AgX (aproximación polinómica) con contraste optimizado
fn agxContrast(x: vec3f) -> vec3f {
  let x2 = x * x; let x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
fn agx(c: vec3f) -> vec3f {
  let m = mat3x3f(0.842479062253094, 0.0423282422610123, 0.0423756549057051, 0.0784335999999992, 0.878468636469772, 0.0784336, 0.0792237451477643, 0.0791661274605434, 0.879142973793104);
  let mi = mat3x3f(1.19687900512017, -0.0528968517574562, -0.0529716355144438, -0.0980208811401368, 1.15190312990417, -0.0980434501171241, -0.0990297440797205, -0.0989611768448433, 1.15107367264116);
  var v = m * c;
  v = clamp(log2(max(v, vec3f(1e-10))), vec3f(-12.47393), vec3f(4.026069));
  v = (v + 12.47393) / (4.026069 + 12.47393);
  v = agxContrast(v);
  // Contraste y saturación cinematográfica
  let l = dot(v, vec3f(0.2126, 0.7152, 0.0722));
  v = pow(max(v, vec3f(0.0)), vec3f(1.12));
  v = mix(vec3f(dot(v, vec3f(0.2126, 0.7152, 0.0722))), v, 1.32);
  v = mi * v;
  return sat3(v);   // Codificación sRGB 2.2
}
fn tone(c: vec3f) -> vec3f { return agx(c); }
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  let p = vec2i(in.pos.xy); let dim = vec2i(F.screen.xy) - 1;
  let isNight = F.sunDir.w > 0.5;
  // Exposición automática adaptativa calibrada según día / noche
  let targetKey = select(0.16, 0.048, isNight);
  let lavg = clamp(textureLoad(tExp, vec2i(0), 0).r, 0.015, 3.0);
  let ex = F.misc.z * 0.094 * pow(targetKey / lavg, 0.5) / 0.16;
  var c = textureLoad(tCol, p, 0).rgb;
  // Enfoque adaptativo con 4 vecinos
  let n = textureLoad(tCol, clamp(p + vec2i(0, -1), vec2i(0), dim), 0).rgb + textureLoad(tCol, clamp(p + vec2i(0, 1), vec2i(0), dim), 0).rgb
        + textureLoad(tCol, clamp(p + vec2i(-1, 0), vec2i(0), dim), 0).rgb + textureLoad(tCol, clamp(p + vec2i(1, 0), vec2i(0), dim), 0).rgb;
  let bl = textureSampleLevel(tBloom, s, in.uv, 0.0).rgb * (1.0 / 6.0);
  let lc = lum(c); let ln = lum(n) * 0.25;
  let sharp = clamp((lc - ln) * 0.8, -0.3 * lc, 0.4 * lc);
  c = c * (1.0 + sharp / max(lc, 1e-4));
  c = mix(c, bl, select(0.055, 0.085, isNight));
  // Lens flare solar: halo y destellos proporcionales a visibilidad del disco solar (desactivado de noche)
  if (!isNight && F.sunScr.z > 0.5 && F.sunScr.x > -0.3 && F.sunScr.x < 1.3 && F.sunScr.y > -0.3 && F.sunScr.y < 1.3) {
    var vis = 0.0;
    for (var i = 0; i < 6; i++) {
      let a = f32(i) * 1.0472; let q = F.sunScr.xy + vec2f(cos(a), sin(a) * F.post.z) * 0.006 * f32(1 + (i & 1));
      if (q.x > 0.0 && q.y > 0.0 && q.x < 1.0 && q.y < 1.0) { vis += select(0.0, 1.0, textureLoad(gD, vec2i(q * F.screen.xy), 0) <= 0.0); }
    }
    vis /= 6.0;
    if (vis > 0.0) {
      let dv = (in.uv - F.sunScr.xy) * vec2f(F.post.z, 1.0); let r = length(dv); let an = atan2(dv.y, dv.x);
      let halo = 0.05 / (1.0 + pow(r / 0.045, 2.0)) + 0.012 / (1.0 + pow(r / 0.25, 2.0));
      let rays = (pow(abs(cos(an * 3.0 + 0.4)), 40.0) * 0.5 + pow(abs(cos(an * 7.0 + 1.1)), 90.0) * 0.25) * 0.05 / (1.0 + pow(r / 0.16, 2.0));
      let streak = 0.03 * exp(-abs(dv.y) * 90.0) / (1.0 + pow(abs(dv.x) / 0.3, 2.0));
      c += F.sunCol.rgb * (halo + rays + streak) * vis * 0.32;
    }
  }
  // Viñeteado óptico
  let q = (in.uv - 0.5) * vec2f(F.post.z / 1.7778, 1.0); let vg = 1.0 - smoothstep(0.35, 1.25, length(q) * 1.45) * select(0.42, 0.50, isNight);
  // Balance de blancos (no invertir tonalidad azul fría en carreras nocturnas)
  if (!isNight) {
    let sc = F.sunCol.rgb / lum(F.sunCol.rgb);
    c *= pow(sc, vec3f(-0.5));
  }
  c *= ex * vg;
  var o = tone(c);
  // Grano sutil y dithering triangular
  let h = hash22(in.pos.xy + vec2f(F.misc.y * 37.0, F.misc.y * 17.0));
  let tri = (h.x + h.y - 1.0);
  o += vec3f(tri) * (1.2 / 255.0) + (h.x - 0.5) * 0.012 * (1.0 - o) * o * 4.0 * 0.5;
  return vec4f(o, 1.0);
}
`;
WGSL["taa"] = `// Antialiasing temporal (TAA): reproyección con velocidad dilatada, recorte de varianza en YCoCg e historial bicúbico.
#include fsq
#include util
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var tCur: texture_2d<f32>;
@group(0) @binding(2) var tHist: texture_2d<f32>;
@group(0) @binding(3) var tVel: texture_2d<f32>;
@group(0) @binding(4) var gD: texture_depth_2d;
@group(0) @binding(5) var sClamp: sampler;
fn toY(c: vec3f) -> vec3f { return vec3f(dot(c, vec3f(0.25, 0.5, 0.25)), dot(c, vec3f(0.5, 0.0, -0.5)), dot(c, vec3f(-0.25, 0.5, -0.25))); }
fn fromY(c: vec3f) -> vec3f { return vec3f(c.x + c.y - c.z, c.x + c.z, c.x - c.y - c.z); }
fn tm(c: vec3f) -> vec3f { return c / (1.0 + max(c.r, max(c.g, c.b))); }
fn itm(c: vec3f) -> vec3f { return c / max(1e-4, 1.0 - max(c.r, max(c.g, c.b))); }
fn histCR(uv: vec2f) -> vec3f {
  // Catmull-Rom con 5 muestras bilineales
  let sz = F.screen.xy; let p = uv * sz; let c = floor(p - 0.5) + 0.5; let f = p - c;
  let w0 = f * (-0.5 + f * (1.0 - 0.5 * f)); let w1 = 1.0 + f * f * (-2.5 + 1.5 * f); let w2 = f * (0.5 + f * (2.0 - 1.5 * f)); let w3 = f * f * (-0.5 + 0.5 * f);
  let w12 = w1 + w2; let o12 = w2 / w12;
  let t0 = (c - 1.0) / sz; let t3 = (c + 2.0) / sz; let t12 = (c + o12) / sz;
  var r = vec4f(0.0);
  r += vec4f(tm(textureSampleLevel(tHist, sClamp, vec2f(t12.x, t0.y), 0.0).rgb), 1.0) * (w12.x * w0.y);
  r += vec4f(tm(textureSampleLevel(tHist, sClamp, vec2f(t0.x, t12.y), 0.0).rgb), 1.0) * (w0.x * w12.y);
  r += vec4f(tm(textureSampleLevel(tHist, sClamp, vec2f(t12.x, t12.y), 0.0).rgb), 1.0) * (w12.x * w12.y);
  r += vec4f(tm(textureSampleLevel(tHist, sClamp, vec2f(t3.x, t12.y), 0.0).rgb), 1.0) * (w3.x * w12.y);
  r += vec4f(tm(textureSampleLevel(tHist, sClamp, vec2f(t12.x, t3.y), 0.0).rgb), 1.0) * (w12.x * w3.y);
  return max(r.rgb / r.a, vec3f(0.0));
}
struct TOut { @location(0) col: vec4f, @location(1) vel: vec4f }
@fragment fn fs(in: FsV) -> TOut {
  let p = vec2i(in.pos.xy); let dim = vec2i(F.screen.xy) - 1;
  // Velocidad dilatada del píxel más cercano en vecindad 3x3
  var best = p; var bd = -1.0;
  for (var y = -1; y <= 1; y++) { for (var x = -1; x <= 1; x++) { let q = clamp(p + vec2i(x, y), vec2i(0), dim); let d = textureLoad(gD, q, 0); if (d > bd) { bd = d; best = q; } } }
  var vel = textureLoad(tVel, best, 0).xy;
  if (bd <= 0.0) {
    // Cielo: solo rotación de cámara
    let w = F.invViewProjJ * vec4f(in.uv.x * 2.0 - 1.0, 1.0 - in.uv.y * 2.0, 1e-6, 1.0);
    let dir = normalize(w.xyz / w.w - F.camPos.xyz);
    let pc = F.prevViewProj * vec4f(dir, 0.0); let cc = F.viewProj * vec4f(dir, 0.0);
    vel = (cc.xy / cc.w - pc.xy / pc.w) * vec2f(0.5, -0.5);
  }
  // Vecindad 3x3 en espacio YCoCg
  var m1 = vec3f(0.0); var m2 = vec3f(0.0); var cmin = vec3f(1e9); var cmax = vec3f(-1e9);
  var cur = vec3f(0.0); var wsum = 0.0; var curF = vec3f(0.0);
  for (var y = -1; y <= 1; y++) { for (var x = -1; x <= 1; x++) {
    let q = clamp(p + vec2i(x, y), vec2i(0), dim); let c = toY(tm(textureLoad(tCur, q, 0).rgb));
    m1 += c; m2 += c * c; cmin = min(cmin, c); cmax = max(cmax, c);
    // Filtro de reconstrucción centrado sin jitter
    let dd = vec2f(f32(x), f32(y)) - F.jitter.xy * vec2f(0.5, -0.5) * F.screen.xy;
    let w = exp(-2.29 * dot(dd, dd)); curF += c * w; wsum += w;
    if (x == 0 && y == 0) { cur = c; }
  } }
  curF /= wsum;
  let mu = m1 / 9.0; let sg = sqrt(max(m2 / 9.0 - mu * mu, vec3f(0.0)));
  let huv = in.uv - vel;
  var o: TOut; o.vel = vec4f(vel, 0.0, 0.0);
  if (F.misc.w > 0.5) { o.vel = vec4f(0.0); o.col = vec4f(itm(fromY(curF)), 1.0); return o; }   // Corte de cámara: reinicio de historial sin ghosting
  if (huv.x < 0.0 || huv.y < 0.0 || huv.x > 1.0 || huv.y > 1.0) { o.col = vec4f(itm(fromY(curF)), 1.0); return o; }
  var h = toY(histCR(huv));
  // Recorte de varianza (caja mu ± g*sigma)
  let vpx = length(vel * F.screen.xy);
  let g = mix(1.25, 0.9, sat(vpx / 20.0));
  let lo = max(mu - sg * g, cmin); let hi = min(mu + sg * g, cmax);
  let cc = (lo + hi) * 0.5; let ee = (hi - lo) * 0.5 + 1e-5; let dv = h - cc; let t = abs(dv) / ee; let mt = max(t.x, max(t.y, t.z));
  if (mt > 1.0) { h = cc + dv / mt; }
  // Ponderación temporal adaptativa
  var alpha = mix(0.07, 0.22, sat(vpx / 40.0));
  let lc = curF.x; let lh = h.x; let diff = abs(lc - lh) / max(lc, max(lh, 0.05)); alpha *= mix(1.0, 0.55, sat(diff * diff * 4.0) * (1.0 - sat(vpx / 6.0)));
  let r = mix(h, curF, alpha);
  o.col = vec4f(max(itm(fromY(r)), vec3f(0.0)), 1.0);
  return o;
}
`;
WGSL["mbtile"] = `// Motion blur etapa 1: velocidad máxima por tile (TILE px) y vecindad 3x3 (NEIGH).
#include fsq
@group(0) @binding(0) var t: texture_2d<f32>;
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  let p = vec2i(in.pos.xy); let dim = vec2i(textureDimensions(t)) - 1; var best = vec2f(0.0); var bm = -1.0;
#ifdef NEIGH
  for (var y = -1; y <= 1; y++) { for (var x = -1; x <= 1; x++) { let v = textureLoad(t, clamp(p + vec2i(x, y), vec2i(0), dim), 0).xy; let m = dot(v, v); if (m > bm) { bm = m; best = v; } } }
#else
  for (var y = 0; y < TILE; y += 4) { for (var x = 0; x < TILE; x += 4) { let v = textureLoad(t, clamp(p * TILE + vec2i(x + (y / 4) % 2 * 2, y + 1), vec2i(0), dim), 0).xy; let m = dot(v, v); if (m > bm) { bm = m; best = v; } } }
#endif
  return vec4f(best, 0.0, 0.0);
}
`;
WGSL["mblur"] = `// Motion blur por píxel (reconstrucción McGuire): desenfoque a lo largo del vector dominante,
// ponderando muestras por profundidad y velocidad relativa (coche nítido, entorno desenfocado).
#include fsq
#include util
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var tCol: texture_2d<f32>;
@group(0) @binding(2) var tVel: texture_2d<f32>;
@group(0) @binding(3) var tTile: texture_2d<f32>;
@group(0) @binding(4) var gD: texture_depth_2d;
@group(0) @binding(5) var sClamp: sampler;
fn linZ(d: f32) -> f32 { return F.camFwd.w / max(d, 1e-6); }
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  let p = vec2i(in.pos.xy); let sz = F.screen.xy; let dim = vec2i(sz) - 1;
  let c0 = textureLoad(tCol, p, 0).rgb;
  let k = F.post.x * 0.5;                              // Fracción de obturación
  let maxLen = 26.0 * sz.y / 1440.0;
  let noise = ign(in.pos.xy, F.misc.y);
  // Dithering para ocultar cuadrícula
  let tdim = vec2f(textureDimensions(tTile));
  let tuv = (in.pos.xy + (vec2f(noise, fract(noise * 7.31)) - 0.5) * f32(TILE) * 0.8) / (tdim * f32(TILE));
  var vmax = textureSampleLevel(tTile, sClamp, tuv, 0.0).xy * sz * k;
  let lm = length(vmax);
  if (lm < 0.6) { return vec4f(c0, 1.0); }
  if (lm > maxLen) { vmax *= maxLen / lm; }
  let lmc = min(lm, maxLen);
  var vc = textureLoad(tVel, p, 0).xy * sz * k; let lc = min(length(vc), maxLen);
  let zc = linZ(textureLoad(gD, p, 0));
  const NS = 24;
  var acc = c0 * 1.0; var ws = 1.0;
  // Ponderación del centro
  let wc = 1.0 / max(lc, 0.75); acc = c0 * wc; ws = wc;
  for (var i = 0; i < NS; i++) {
    let t = mix(-1.0, 1.0, (f32(i) + noise) / f32(NS));
    let off = vmax * t; let q = in.pos.xy + off; let qi = clamp(vec2i(q), vec2i(0), dim);
    let zs = linZ(textureLoad(gD, qi, 0)); let ls = min(length(textureLoad(tVel, qi, 0).xy * sz * k), maxLen);
    let dl = length(off);
    // Dispersión direccional según velocidad
    let fg = sat(1.0 - (zs - zc) / (0.05 * zc + 0.02)); let bg = sat(1.0 - (zc - zs) / (0.05 * zc + 0.02));
    let w = fg * sat(1.0 - dl / max(ls, 0.01)) + bg * sat(1.0 - dl / max(lc, 0.01)) + sat(1.0 - dl / max(ls, 0.01) + 0.05) * sat(1.0 - dl / max(lc, 0.01) + 0.05) * 2.0;
    let wk = w * (1.0 - 0.75 * abs(t));   // Núcleo de carpa para estela continua
    acc += textureSampleLevel(tCol, sClamp, q / sz, 0.0).rgb * wk; ws += wk;
  }
  return vec4f(acc / ws, 1.0);
}
`;
WGSL["dbg"] = `// Visualización de depuración para texturas internas.
#include fsq
struct DU { p: vec4f }
@group(0) @binding(0) var t: texture_2d<f32>;
@group(0) @binding(1) var s: sampler;
@group(0) @binding(2) var<uniform> U: DU;
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  var c = textureSampleLevel(t, s, in.uv, 0.0);
  if (U.p.y > 0.5) { c = vec4f(c.a); }
  if (any(c.rgb != c.rgb)) { return vec4f(1.0, 0.0, 1.0, 1.0); }
  return vec4f(pow(clamp(c.rgb * U.p.x, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2)), 1.0);
}
`;
