'use strict';
// Diccionario global de shaders WGSL (ensamblados por wgslPP en engine/gpu.js).
const WGSL = {};

WGSL["util"] = `// Funciones utilitarias y struct Frame.
#include frame
const PI = 3.14159265;
fn sat(x: f32) -> f32 { return clamp(x, 0.0, 1.0); }
fn sat3(x: vec3f) -> vec3f { return clamp(x, vec3f(0.0), vec3f(1.0)); }
fn sq(x: f32) -> f32 { return x * x; }
fn lum(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn hash11(p: f32) -> f32 { var x = fract(p * 0.1031); x *= x + 33.33; x *= x + x; return fract(x); }
fn hash21(p: vec2f) -> f32 { var p3 = fract(vec3f(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
fn hash22(p: vec2f) -> vec2f { var p3 = fract(vec3f(p.xyx) * vec3f(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
fn hash31(p: vec3f) -> f32 { var p3 = fract(p * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
fn hash33(p: vec3f) -> vec3f { var p3 = fract(p * vec3f(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
// Ruido de gradiente intercalado (Interleaved Gradient Noise, optimizado para TAA)
fn ign(px: vec2f, frame: f32) -> f32 { let p = px + 5.588238 * frame; return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }
fn remap(x: f32, a: f32, b: f32) -> f32 { return sat((x - a) / (b - a)); }
// Normal codificada en octaedro
fn octEnc(n: vec3f) -> vec2f { let p = n.xy / (abs(n.x) + abs(n.y) + abs(n.z)); let s = vec2f(select(-1.0, 1.0, p.x >= 0.0), select(-1.0, 1.0, p.y >= 0.0)); return select((1.0 - abs(p.yx)) * s, p, n.z >= 0.0); }
fn octDec(e: vec2f) -> vec3f { var n = vec3f(e, 1.0 - abs(e.x) - abs(e.y)); let t = sat(-n.z); n.x += select(t, -t, n.x >= 0.0); n.y += select(t, -t, n.y >= 0.0); return normalize(n); }
// Perturba la normal n por un gradiente de altura (dhdx, dhdz en el plano del mundo) para superficies casi horizontales
fn bumpXZ(n: vec3f, g: vec2f) -> vec3f { return normalize(n - vec3f(g.x, 0.0, g.y) + n * dot(n, vec3f(g.x, 0.0, g.y))); }
// Base tangente a partir de la normal
fn tbn(n: vec3f) -> mat3x3f { let s = select(-1.0, 1.0, n.z >= 0.0); let a = -1.0 / (s + n.z); let b = n.x * n.y * a; return mat3x3f(vec3f(1.0 + s * n.x * n.x * a, s * b, -s * n.x), vec3f(b, s + n.y * n.y * a, -n.y), n); }
`;
WGSL["fsq"] = `struct FsV { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> FsV {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return FsV(vec4f(p * 2.0 - 1.0, 0.0, 1.0), vec2f(p.x, 1.0 - p.y));
}
`;
WGSL["common"] = `// Común a familias de geometría: utilidades + bindings globales del grupo 0.
#include util
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var sLin: sampler;     // Trilineal, repeat, anisotrópico
@group(0) @binding(2) var sClamp: sampler;   // Lineal, clamp
@group(0) @binding(3) var tNoise: texture_2d<f32>;   // Ruido tileable 512²: R,G = FBM de valor (2 semillas), B = celular, A = ruido blanco
@group(0) @binding(4) var tNoise3: texture_3d<f32>;  // Ruido 3D 64³ tileable: R = FBM Perlin, G = Worley FBM, B = Worley fino, A = Perlin fino
@group(0) @binding(5) var tHeight: texture_2d<f32>;  // Altura del terreno (m), 1 m/texel alrededor del circuito
@group(0) @binding(6) var tZone: texture_2d<f32>;    // Zonas de superficie del circuito
// Mapas del mundo: F.wm = (x0, z0, tamañoX, tamañoZ) en metros
fn wmIn(xz: vec2f) -> bool { let p = xz - F.wm.xy; return p.x >= 0.0 && p.y >= 0.0 && p.x <= F.wm.z && p.y <= F.wm.w; }
fn wmHeight(xz: vec2f) -> f32 { return textureSampleLevel(tHeight, sClamp, (xz - F.wm.xy + 0.5) / vec2f(textureDimensions(tHeight)), 0.0).r; }
fn wmZone(xz: vec2f) -> vec4f { if (!wmIn(xz)) { return vec4f(1.0, 0.0, 1.0, 0.0); } return textureSampleLevel(tZone, sClamp, ((xz - F.wm.xy) * 2.0 + 0.5) / vec2f(textureDimensions(tZone)), 0.0); }
`;
WGSL["gbuf"] = `// Interfaz entre familias de materiales y passes de geometría (G-buffer).
struct Pass { viewProj: mat4x4f, camPos: vec4f, p: vec4f }
@group(1) @binding(0) var<uniform> P: Pass; // @dyn

struct VSOut { wpos: vec3f, pwpos: vec3f, nrm: vec3f, uv: vec2f, mat: u32, col: vec4f, ext: vec4f }
struct V2F {
  @builtin(position) pos: vec4f,
  @location(0) wpos: vec3f,
  @location(1) nrm: vec3f,
  @location(2) uv: vec2f,
  @location(3) @interpolate(flat) mat: u32,   // 4 bytes: id | a<<8 | b<<16 | c<<24
  @location(4) col: vec4f,
  @location(5) ext: vec4f,
#ifdef PASS_GBUF
  @location(6) cur: vec4f,
  @location(7) prv: vec4f,
#endif
}
struct Surface {
  albedo: vec3f,    // linear
  normal: vec3f,    // mundo, normalizada
  rough: f32,
  metal: f32,
  ao: f32,          // oclusão do material (1 = sem)
  emissive: f32,    // radiância emitida = albedo * emissive * 16
  coat: f32,        // verniz 0..1 (camada dielétrica lisa por cima)
  sss: f32,         // translucidez (folhagem) 0..1
  wet: f32,         // filme de água 0..1 (liga reflexo em espaço de tela)
}
fn surfDefault(n: vec3f) -> Surface { var s: Surface; s.albedo = vec3f(0.5); s.normal = n; s.rough = 0.6; s.metal = 0.0; s.ao = 1.0; s.emissive = 0.0; s.coat = 0.0; s.sss = 0.0; s.wet = 0.0; return s; }
fn matId(m: u32) -> u32 { return m & 255u; }
fn matA(m: u32) -> f32 { return f32((m >> 8u) & 255u) / 255.0; }
fn matB(m: u32) -> f32 { return f32((m >> 16u) & 255u) / 255.0; }
fn matC(m: u32) -> f32 { return f32((m >> 24u) & 255u) / 255.0; }
`;
WGSL["entry"] = `// Puntos de entrada por pase, generados en torno a vert()/surf() de la familia.
@vertex fn vs(in: VIn) -> V2F {
  let o = vert(in);
  var r: V2F;
  r.pos = P.viewProj * vec4f(o.wpos, 1.0);
  r.wpos = o.wpos; r.nrm = o.nrm; r.uv = o.uv; r.mat = o.mat; r.col = o.col; r.ext = o.ext;
#ifdef PASS_GBUF
  r.cur = F.viewProj * vec4f(o.wpos, 1.0);
  r.prv = F.prevViewProj * vec4f(o.pwpos, 1.0);
#endif
  return r;
}
#ifdef PASS_GBUF
struct GOut { @location(0) a: vec4f, @location(1) b: vec4f, @location(2) c: vec4f, @location(3) v: vec4f }
@fragment fn fs(in: V2F, @builtin(front_facing) ff: bool) -> GOut {
  let s = surf(in, ff);
  var o: GOut;
  o.a = vec4f(s.albedo, s.ao);
  o.b = vec4f(octEnc(s.normal), s.rough, s.metal);
  o.c = vec4f(s.coat, s.sss, sqrt(sat(s.emissive)), s.wet);
  let v = (in.cur.xy / in.cur.w - in.prv.xy / in.prv.w) * vec2f(0.5, -0.5);
  o.v = vec4f(v, 0.0, 0.0);
  return o;
}
#endif
#ifdef PASS_SHADOW
#ifdef ALPHA
@fragment fn fs(in: V2F, @builtin(front_facing) ff: bool) { if (surfAlpha(in) < 0.5) { discard; } }
#endif
#endif
#ifdef PASS_CUBE
#include cube_light
@fragment fn fs(in: V2F, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  let s = surf(in, ff);
  return vec4f(cubeLit(s, in.wpos), 1.0);
}
#endif
`;
WGSL["entry_fwd"] = `// Puntos de entrada para familias directas (pase forward de transparencias): define vert() y shade().
@vertex fn vs(in: VIn) -> V2F {
  let o = vert(in);
  var r: V2F;
  r.pos = P.viewProj * vec4f(o.wpos, 1.0);
  r.wpos = o.wpos; r.nrm = o.nrm; r.uv = o.uv; r.mat = o.mat; r.col = o.col; r.ext = o.ext;
  return r;
}
@fragment fn fs(in: V2F, @builtin(front_facing) ff: bool) -> @location(0) vec4f { return shade(in, ff); }
`;
WGSL["fwd_common"] = `// Recursos de iluminación para familias directas (transparentes): grupo 3.
@group(3) @binding(0) var tEnv: texture_cube<f32>;
@group(3) @binding(1) var tShadow: texture_depth_2d_array;
@group(3) @binding(2) var tShadowS: texture_depth_2d;
@group(3) @binding(3) var sCmp: sampler_comparison;
@group(3) @binding(4) var gD: texture_depth_2d;
#include brdf
#include shadow
#include fog
`;
WGSL["mesh_vert"] = `// Vértice estándar para mallas de MeshBuilder con transformación de objeto.
struct Obj { model: mat4x4f, prevModel: mat4x4f, p0: vec4f, p1: vec4f, p2: vec4f, p3: vec4f }
@group(2) @binding(0) var<uniform> O: Obj; // @dyn
struct VIn { @location(0) pos: vec3f, @location(1) nrm: vec4f, @location(2) uv: vec2f, @location(3) mat: vec4u, @location(4) col: vec4f }
fn vert(in: VIn) -> VSOut {
  var o: VSOut;
  o.wpos = (O.model * vec4f(in.pos, 1.0)).xyz;
  o.pwpos = (O.prevModel * vec4f(in.pos, 1.0)).xyz;
  o.nrm = (O.model * vec4f(in.nrm.xyz, 0.0)).xyz;
  o.uv = in.uv;
  o.mat = in.mat.x | (in.mat.y << 8u) | (in.mat.z << 16u) | (in.mat.w << 24u);
  o.col = in.col;
  o.ext = vec4f(in.pos, in.nrm.w);   // Posición local + peso libre
  return o;
}
`;
WGSL["noisebake"] = `// Genera texturas de ruido tileables (una sola vez en inicialización).
#include fsq
struct NB { p: vec4f }   // x = fatia z (0..1) para 3D, y = modo
@group(0) @binding(0) var<uniform> U: NB; // @dyn
fn h3(p: vec3f) -> vec3f { var q = vec3f(dot(p, vec3f(127.1, 311.7, 74.7)), dot(p, vec3f(269.5, 183.3, 246.1)), dot(p, vec3f(113.5, 271.9, 124.6))); return fract(sin(q) * 43758.5453); }
fn wrp(p: vec3f, per: f32) -> vec3f { return p - per * floor(p / per); }
// Ruido de gradiente periódico
fn gnoise(p: vec3f, per: f32) -> f32 {
  let i = floor(p); let f = fract(p); let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  var r = 0.0; var acc = array<f32, 8>();
  for (var k = 0; k < 8; k++) {
    let o = vec3f(f32(k & 1), f32((k >> 1) & 1), f32((k >> 2) & 1));
    let g = normalize(h3(wrp(i + o, per)) * 2.0 - 1.0);
    acc[k] = dot(g, f - o);
  }
  let x0 = mix(acc[0], acc[1], u.x); let x1 = mix(acc[2], acc[3], u.x); let x2 = mix(acc[4], acc[5], u.x); let x3 = mix(acc[6], acc[7], u.x);
  return mix(mix(x0, x1, u.y), mix(x2, x3, u.y), u.z) * 0.9 + 0.5;
}
// Ruido Worley periódico (1 - distancia al punto más cercano)
fn worley(p: vec3f, per: f32) -> f32 {
  let i = floor(p); let f = fract(p); var d = 1.0;
  for (var z = -1; z <= 1; z++) { for (var y = -1; y <= 1; y++) { for (var x = -1; x <= 1; x++) {
    let o = vec3f(f32(x), f32(y), f32(z)); let q = h3(wrp(i + o, per)) + o - f; d = min(d, dot(q, q));
  } } }
  return 1.0 - sqrt(d);
}
fn gfbm(p: vec3f, per: f32, oct: i32) -> f32 { var a = 0.5; var s = 0.0; var n = 0.0; var q = p; var pp = per; for (var i = 0; i < oct; i++) { s += a * gnoise(q, pp); n += a; q *= 2.0; pp *= 2.0; a *= 0.5; } return s / n; }
fn wfbm(p: vec3f, per: f32) -> f32 { return worley(p, per) * 0.625 + worley(p * 2.0, per * 2.0) * 0.25 + worley(p * 4.0, per * 4.0) * 0.125; }
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  if (U.p.y < 0.5) {
    // 3D: R = perlin-worley (forma base de nuvem), G = worley fbm médio, B = worley fbm fino, A = perlin fbm
    let p = vec3f(in.uv, U.p.x);
    let pf = gfbm(p * 4.0, 4.0, 5); let w1 = wfbm(p * 4.0, 4.0); let w2 = wfbm(p * 8.0, 8.0); let w3 = wfbm(p * 16.0, 16.0);
    let pw = saturate((pf - (1.0 - w1) * 0.55) / (1.0 - (1.0 - w1) * 0.55));
    return vec4f(pw, w2, w3, pf);
  }
  // 2D 512²: R,G = fbm (2 sementes), B = celular, A = ruído branco
  let p = vec3f(in.uv, 0.37);
  let a = gfbm(p * 8.0, 8.0, 6); let b = gfbm(p * 8.0 + vec3f(3.0, 5.0, 2.31), 8.0, 6);
  let c = worley(vec3f(in.uv * 24.0, 0.5), 24.0);
  let d = fract(sin(dot(floor(in.uv * 512.0), vec2f(12.9898, 78.233))) * 43758.5453);
  return vec4f(a, b, c, d);
}
`;
WGSL["palette"] = `// Paleta compartida (albedo lineal) — terreno, vegetación y props.
const COL_GRASS = vec3f(0.105, 0.165, 0.042);       // Césped cortado
const COL_GRASS_TALL = vec3f(0.165, 0.2, 0.06);     // Puntas de hierba alta (seca)
const COL_GRASS_ROOT = vec3f(0.04, 0.07, 0.018);    // Base de hierba / suelo sombreado
const COL_FOREST = vec3f(0.036, 0.072, 0.02);       // Copas de bosque
const COL_DIRT = vec3f(0.12, 0.085, 0.055);
const COL_GRAVEL = vec3f(0.34, 0.3, 0.24);
const COL_ASPHALT = vec3f(0.046, 0.046, 0.05);
`;
