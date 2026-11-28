WGSL["world_crowd"] = `// Gente (público, equipes, fiscais): cartões com figura recortada do atlas que giram em torno do eixo vertical para encarar
// a câmera — silhueta humana inteira de qualquer ângulo. pos = pé da figura; nrm.x = canto lateral (m), nrm.y = altura/2 (m).
// atlas: R sombreamento, G máscara da camisa (cor do vértice), B máscara de cabelo/calça, A recorte. mat.y = tom de pele, mat.z = cabelo.
struct VIn { @location(0) pos: vec3f, @location(1) nrm: vec4f, @location(2) uv: vec2f, @location(3) mat: vec4u, @location(4) col: vec4f }
@group(3) @binding(0) var tAtlas: texture_2d<f32>;
fn vert(in: VIn) -> VSOut {
  var o: VSOut;
  let tc = P.camPos.xyz - in.pos; let th = normalize(vec3f(tc.x, 0.0, tc.z) + vec3f(1e-5, 0.0, 0.0));
  let right = vec3f(th.z, 0.0, -th.x);
  o.wpos = in.pos + right * in.nrm.x + vec3f(0.0, in.nrm.y * 2.0, 0.0);
  o.pwpos = o.wpos;
  // corpo arredondado: a normal gira de um lado ao outro do cartão (cilindro) e aponta um pouco para cima —
  // o sol baixo ilumina um lado da figura e deixa o outro na sombra
  o.nrm = normalize(th * 0.72 + right * sign(in.nrm.x) * 0.85 + vec3f(0.0, 0.42, 0.0));
  o.uv = in.uv; o.mat = in.mat.x | (in.mat.y << 8u) | (in.mat.z << 16u) | (in.mat.w << 24u); o.col = in.col; o.ext = vec4f(0.0);
  return o;
}
fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  let t = textureSampleBias(tAtlas, sLin, in.uv, -0.6);
  // recorte com borda de ~1 pixel: converte o alfa em cobertura pela derivada e sorteia só nessa faixa (o TAA resolve suave)
  let aw = max(fwidth(t.a) * 1.2, 0.04); let cov = sat((t.a - 0.5) / aw + 0.5);
#ifdef PASS_GBUF
  if (cov < ign(in.pos.xy, F.misc.y) * 0.98 + 0.01) { discard; }
#else
  if (t.a < 0.5) { discard; }
#endif
  let skin = mix(vec3f(0.5, 0.33, 0.24), vec3f(0.17, 0.1, 0.07), matA(in.mat));
  let hair = mix(vec3f(0.02, 0.016, 0.013), vec3f(0.32, 0.27, 0.22), smoothstep(0.55, 1.0, matB(in.mat)));
  var c = mix(skin, hair, smoothstep(0.3, 0.6, t.b)); c = mix(c, in.col.rgb, smoothstep(0.3, 0.6, t.g));
  // dobras e manchas de tecido (ruído por figura), sombreamento desenhado e base mais escura: nada de cor chapada
  let fold = textureSample(tNoise, sLin, in.uv * vec2f(46.0, 21.0) + vec2f(matA(in.mat), matB(in.mat)) * 3.7);
  let cloth = smoothstep(0.3, 0.6, t.g) + smoothstep(0.3, 0.6, t.b) * 0.5;
  s.albedo = c * (0.1 + 1.05 * t.r * t.r) * (1.0 - cloth * (0.3 * fold.r + 0.14 * fold.b - 0.1)); s.rough = 0.9; s.ao = in.col.a * (0.55 + 0.45 * t.r); s.sss = 0.06;
  return s;
}
`;
WGSL["world_fence"] = `// Alambrada (pase forward de transparentes): malla metálica romboidal analítica sin aliasing.
// UV en metros; hilos nítidos de cerca y opacidad suave de lejos.
#include mesh_vert
#include fwd_common
fn wireCov(x: f32, w: f32) -> f32 {
  let f = max(fwidth(x), 1e-4);
  let c = min(clamp((w + f * 0.5 - abs(fract(x) - 0.5)) / f, 0.0, 1.0), 2.0 * w / f);
  return mix(c, 2.0 * w, smoothstep(0.5, 1.2, f));
}
fn shade(in: V2F, ff: bool) -> vec4f {
  let u = in.uv.x / 0.06; let v = in.uv.y / 0.06;
  let ca = wireCov(u + v, 0.021); let cb = wireCov(u - v, 0.021);
  var alpha = 1.0 - (1.0 - ca) * (1.0 - cb);
  // de longe, postes (a cada 4 m) e cabos são desenhados aqui, com cobertura analítica; de perto são geometria
  let dcam = distance(F.camPos.xyz, in.wpos); let farK = smoothstep(44.0, 61.0, dcam);
  let post = wireCov(in.uv.x / 4.0 + 0.5, 0.009) * farK;
  let hh = in.col.r * 25.5;                                  // altura da tela em metros (cor.r do vértice)
  let fy = max(fwidth(in.uv.y), 1e-4);
  let cab = max(clamp((0.02 + fy * 0.5 - abs(in.uv.y - 0.05)) / fy, 0.0, min(1.0, 0.04 / fy)), clamp((0.02 + fy * 0.5 - abs(in.uv.y - hh + 0.03)) / fy, 0.0, min(1.0, 0.04 / fy))) * farK;
  alpha = 1.0 - (1.0 - alpha) * (1.0 - post) * (1.0 - cab);
  var N = normalize(in.nrm); if (!ff) { N = -N; }
  let V = F.camPos.xyz - in.wpos; let dist = length(V); let dir = -V / dist;
  // arame cilíndrico: iluminação média, sem depender da normal do plano
  let sh = sunShadow(in.wpos, N, in.pos.xy, 0.5);
  // arame galvanizado escurecido pelo tempo: fio escuro contra o fundo (uma tela clara vira película leitosa sobre tudo atrás)
  let alb = vec3f(0.075, 0.08, 0.085);
  var col = alb * (F.sunCol.rgb * sh * 0.16 + shIrr(vec3f(0.0, 1.0, 0.0)) * 0.5);
  let T = exp(-fogOD(F.camPos.xyz, dir, dist));
  col = col * T + fogAmbCol(dir) * (1.0 - T) * 0.5;
  // nada de plano translúcido colado na lente: some a menos de ~2,5 m
  return vec4f(col, alpha * smoothstep(0.7, 2.6, dist));
}
`;
WGSL["mat_test"] = `// Materiais genéricos de teste (será substituído pelos materiais do cenário).
#include mesh_vert
fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  let id = matId(in.mat);
  s.albedo = in.col.rgb;
  if (id == 1u) { s.metal = 1.0; s.rough = 0.25; }
  else if (id == 2u) { s.metal = 0.6; s.rough = 0.4; s.coat = 1.0; }
  else if (id == 3u) { s.emissive = 0.5; }
  else if (id == 4u) {
    let n = textureSample(tNoise, sLin, in.wpos.xz * 0.05).r;
    let w = smoothstep(0.45, 0.55, n);
    s.albedo = mix(vec3f(0.06), vec3f(0.025), w); s.rough = mix(0.85, 0.04, w); s.wet = w;
    let g = textureSample(tNoise, sLin, in.wpos.xz * 2.0).rg - 0.5;
    s.normal = bumpXZ(s.normal, g * 0.5 * (1.0 - w));
  }
  else if (id == 5u) { s.rough = 0.9; }
  return s;
}
`;
WGSL["skid"] = `// Marcas de frenada y derrape: calcomanías oscuras sobre albedo del G-buffer.
#include common
#include gbuf
struct SIn { @location(0) pos: vec3f, @location(1) au: vec2f }
struct SOut { @builtin(position) pos: vec4f, @location(0) au: vec2f, @location(1) wp: vec3f }
@vertex fn vs(in: SIn) -> SOut { var o: SOut; o.pos = P.viewProj * vec4f(in.pos, 1.0); o.au = in.au; o.wp = in.pos; return o; }
struct DOut { @location(0) a: vec4f, @location(1) b: vec4f, @location(2) c: vec4f }
@fragment fn fs(in: SOut) -> DOut {
  let u = abs(in.au.y);
  let n = textureSample(tNoise, sLin, in.wp.xz * vec2f(3.1, 3.1)).r;
  let edge = 1.0 - smoothstep(0.62, 1.0, u);
  // faixas dos sulcos + granulação do asfalto por baixo
  let rib = 0.72 + 0.28 * smoothstep(0.1, 0.25, abs(fract(u * 2.5 + 0.25) - 0.5));
  let al = sat(in.au.x) * edge * rib * (0.55 + 0.7 * n);
  var o: DOut; o.a = vec4f(vec3f(0.014), sat(al) * 0.62); o.b = vec4f(0.0); o.c = vec4f(0.0); return o;
}
`;
WGSL["particles"] = `// Humo de neumático y polvo: partículas orientadas a cámara con soft-depth.
#include fwd_common
struct VIn {
  @builtin(vertex_index) vi: u32,
  @location(0) pos: vec4f,     // xyz centro, w tamanho
  @location(1) col: vec4f,     // rgb, alfa
  @location(2) misc: vec4f,    // rotação, semente, -, -
}
fn vert(in: VIn) -> VSOut {
  var o: VSOut;
  let k = in.vi % 6u; let cx = select(-1.0, 1.0, k == 1u || k == 2u || k == 4u); let cy = select(-1.0, 1.0, k == 2u || k == 4u || k == 5u);
  let right = F.invView[0].xyz; let up = F.invView[1].xyz;
  let c = cos(in.misc.x); let s = sin(in.misc.x); let q = vec2f(cx * c - cy * s, cx * s + cy * c);
  o.wpos = in.pos.xyz + (right * q.x + up * q.y) * in.pos.w;
  o.pwpos = o.wpos; o.nrm = vec3f(0.0, 1.0, 0.0); o.uv = vec2f(cx, cy); o.mat = 0u;
  // luz no centro do cartão
  let lp = F.shadowVP[1] * vec4f(in.pos.xyz, 1.0); let suv = lp.xy * vec2f(0.5, -0.5) + 0.5;
  // Sombra suavizada (4 muestras) para evitar parpadeos al cruzar bordes de sombra
  var sh = 1.0;
  if (suv.x > 0.02 && suv.y > 0.02 && suv.x < 0.98 && suv.y < 0.98) {
    sh = 0.0; let e = 14.0 / SHADOW_RES;
    sh += textureSampleCompareLevel(tShadow, sCmp, suv + vec2f(e, e), 1, lp.z - 0.002); sh += textureSampleCompareLevel(tShadow, sCmp, suv + vec2f(-e, e), 1, lp.z - 0.002);
    sh += textureSampleCompareLevel(tShadow, sCmp, suv + vec2f(e, -e), 1, lp.z - 0.002); sh += textureSampleCompareLevel(tShadow, sCmp, suv + vec2f(-e, -e), 1, lp.z - 0.002);
    sh *= 0.25;
  }
  let V = normalize(F.camPos.xyz - in.pos.xyz);
  let ph = 0.55 + 0.45 * pow(sat(dot(-V, F.sunDir.xyz) * 0.5 + 0.5), 3.0) * 2.2;
  let amb = max(F.sh[0].rgb + F.sh[1].rgb * 0.5, vec3f(0.0));
  o.col = vec4f(in.col.rgb * (F.sunCol.rgb * (0.15 + 0.85 * sh) * ph / PI + amb * 1.2), in.col.a);
  o.ext = vec4f(in.misc.y, 0.0, 0.0, 0.0);
  return o;
}
fn shade(in: V2F, ff: bool) -> vec4f {
  let r = length(in.uv);
  // dos niveles de ruido con desplazamiento por semilla: bordes rasgados y núcleo con relieve
  let sd = vec2f(in.ext.x * 7.3, in.ext.x * 3.1);
  let n = textureSampleLevel(tNoise, sLin, in.uv * 0.19 + sd, 1.0);
  let n2 = textureSampleLevel(tNoise, sLin, in.uv * 0.47 - sd * 1.7, 0.0);
  // novelos com borda desfiada: o ruído corrói a densidade (sem isto as partículas somadas viram um véu uniforme)
  let dens = smoothstep(1.0, 0.35, r) * sat(0.85 - r * 0.9 + (n.r - 0.5) * 2.3 + (n2.g - 0.5) * 1.1);
  var a = smoothstep(0.1, 0.62, dens) * in.col.a;
  // volume falso: normal de uma esfera amassada pelo ruído, iluminada pelo sol em espaço de câmera
  let nz = sqrt(max(0.0, 1.0 - min(r * r, 1.0)));
  let N = normalize(vec3f(in.uv + (n.rg - 0.5) * 0.9, nz + 0.35));
  let Lv = (F.view * vec4f(F.sunDir.xyz, 0.0)).xyz;
  let wrap = sat(dot(N, Lv) * 0.5 + 0.5);
  let lit = mix(0.3, 1.3, wrap * wrap) * (0.7 + 0.6 * n2.r) * mix(0.72, 1.0, sat(in.uv.y * 0.5 + 0.5));   // base da nuvem mais escura (auto-sombra)
  // borda suave contra a geometria e perto da lente
  let zs = F.camFwd.w / max(textureLoad(gD, vec2i(in.pos.xy), 0), 1e-6); let zf = F.camFwd.w / in.pos.z;
  a *= smoothstep(0.0, 1.1, zs - zf) * smoothstep(1.2, 7.0, zf);
  return vec4f(in.col.rgb * lit * a, a);
}
`;
