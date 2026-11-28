WGSL["cube_light"] =
  `// Iluminación directa simplificada para el cubemap ambiental.
@group(1) @binding(1) var tShadowS: texture_depth_2d;
@group(1) @binding(2) var sCmp: sampler_comparison;
fn cubeLit(s: Surface, wp: vec3f) -> vec3f {
  let L = F.sunDir.xyz; let nl = sat(dot(s.normal, L));
  let lp = F.shadowVP[3] * vec4f(wp + s.normal * 0.8, 1.0); let uv = lp.xy * vec2f(0.5, -0.5) + 0.5;
  var sh = 1.0;
  if (uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0) { sh = textureSampleCompareLevel(tShadowS, sCmp, uv, lp.z - 0.0015); }
  let dif = s.albedo * (1.0 - s.metal);
  let sh0 = F.sh[0].rgb + F.sh[1].rgb * s.normal.y;
  var col = dif * (F.sunCol.rgb * (nl * sh + s.sss * 0.25 * sh) / 3.14159 + max(sh0, vec3f(0.0)) * s.ao) + s.albedo * s.emissive * s.emissive * 16.0;
  col += mix(vec3f(0.04), s.albedo, s.metal) * max(sh0, vec3f(0.0)) * 0.6 * (1.0 - s.rough);
  // Niebla atmosférica simplificada
  let d = distance(wp, P.camPos.xyz); let T = exp(-d * F.fog.x * 0.55);
  return mix(max(F.sh[0].rgb + F.sh[1].rgb * 0.25, vec3f(0.0)) * 0.35 + F.fogCol.rgb, col, T);
}
`;
WGSL["envblur"] =
  `// Prefiltrado de mipmaps para el cubemap ambiental (sin costuras entre caras).
#include fsq
struct EB { ax: vec4f, ay: vec4f, az: vec4f, p: vec4f }
@group(0) @binding(0) var<uniform> U: EB; // @dyn
@group(0) @binding(1) var t: texture_cube<f32>;
@group(0) @binding(2) var s: sampler;
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  let q = in.uv * 2.0 - 1.0;
  let d = normalize(U.az.xyz + U.ax.xyz * q.x + U.ay.xyz * q.y);
  let up = select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(d.y) > 0.9);
  let tx = normalize(cross(up, d)); let ty = cross(d, tx);
  var acc = vec4f(0.0); let rad = U.p.x;
  for (var i = 0; i < 12; i++) {
    let r = sqrt((f32(i) + 0.5) / 12.0) * rad; let a = f32(i) * 2.39996323;
    let dd = normalize(d + (tx * cos(a) + ty * sin(a)) * r);
    let c = textureSampleLevel(t, s, dd, 0.0).rgb;
    let w = 1.0 / (1.0 + max(c.r, max(c.g, c.b)) * 0.02); acc += vec4f(c * w, w);
  }
  return vec4f(acc.rgb / acc.a, 1.0);
}
`;
WGSL["brdf"] = `// BRDF de microfacetas (GGX) y aproximaciones IBL.
fn dGGX(nh: f32, a: f32) -> f32 { let a2 = a * a; let d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (PI * d * d + 1e-7); }
fn vSmith(nv: f32, nl: f32, a: f32) -> f32 { let a2 = a * a; let gv = nl * sqrt(nv * nv * (1.0 - a2) + a2); let gl = nv * sqrt(nl * nl * (1.0 - a2) + a2); return 0.5 / (gv + gl + 1e-5); }
fn fSchlick(f0: vec3f, vh: f32) -> vec3f { let f = pow(1.0 - vh, 5.0); return f0 + (vec3f(1.0) - f0) * f; }
fn fSchlick1(f0: f32, vh: f32) -> f32 { return f0 + (1.0 - f0) * pow(1.0 - vh, 5.0); }
// BRDF ambiental preintegrada (aproximación analítica de Karis)
fn envBRDF(f0: vec3f, rough: f32, nv: f32) -> vec3f {
  let c0 = vec4f(-1.0, -0.0275, -0.572, 0.022); let c1 = vec4f(1.0, 0.0425, 1.04, -0.04);
  let r = rough * c0 + c1; let a004 = min(r.x * r.x, exp2(-9.28 * nv)) * r.x + r.y;
  let ab = vec2f(-1.04, 1.04) * a004 + r.zw;
  return f0 * ab.x + vec3f(ab.y);
}
// Irradiancia por armónicos esféricos (L2), coeficientes convolucionados con coseno
fn shIrr(n: vec3f) -> vec3f {
  return max(vec3f(0.0), F.sh[0].rgb + F.sh[1].rgb * n.y + F.sh[2].rgb * n.z + F.sh[3].rgb * n.x
    + F.sh[4].rgb * (n.x * n.y) + F.sh[5].rgb * (n.y * n.z) + F.sh[6].rgb * (3.0 * n.z * n.z - 1.0) + F.sh[7].rgb * (n.x * n.z) + F.sh[8].rgb * (n.x * n.x - n.y * n.y));
}
// Nivel de mipmap del cubemap para una rugosidad dada
fn envMip(rough: f32) -> f32 { let a = rough * rough; return clamp(log2(max(1.0, a * 1.2 * ENV_MIP_K)), 0.0, ENV_MIPS); }
`;
WGSL["shadow"] =
  `// Amostragem de sombras: 3 cascatas dinâmicas + mapa estático do mundo. Requer tShadow, tShadowS, sCmp e F.
const VOGEL_N = 8;
fn vogel(i: i32, n: i32, phi: f32) -> vec2f { let r = sqrt((f32(i) + 0.5) / f32(n)); let a = f32(i) * 2.39996323 + phi; return vec2f(cos(a), sin(a)) * r; }
fn shadowTap(c: i32, uv: vec2f, z: f32, rad: f32, phi: f32) -> f32 {
  var s = 0.0;
  // cascata próxima com mais amostras (penumbras grandes sobre o carro não mostram a trama do ruído)
  let n = select(VOGEL_N, 16, c == 0);
  for (var i = 0; i < n; i++) { s += textureSampleCompareLevel(tShadow, sCmp, uv + vogel(i, n, phi) * rad, c, z); }
  return s / f32(n);
}
fn shadowStatic(wp: vec3f, n: vec3f, phi: f32, soft: f32) -> f32 {
  let tw = F.shadowP.w;
  let lp = F.shadowVP[3] * vec4f(wp + n * tw * 1.2, 1.0);
  let uv = lp.xy * vec2f(0.5, -0.5) + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0 || lp.z > 1.0) { return 1.0; }
  var s = 0.0; let rad = soft / 4096.0;
  for (var i = 0; i < 5; i++) { s += textureSampleCompareLevel(tShadowS, sCmp, uv + vogel(i, 5, phi) * rad, lp.z - 0.0012); }
  return s / 5.0;
}
// visibilidade do sol em wp (normal n, pixel px para o ruído). nl = N·L para o viés.
fn sunShadow(wp: vec3f, n: vec3f, px: vec2f, nl: f32) -> f32 { return sunShadowK(wp, n, px, nl, 1.0); }
// rot = 0: núcleo fixo, sem rotação por pixel (para superfícies com verniz: o brilho especular amplificava o ruído em trama)
fn sunShadowK(wp: vec3f, n: vec3f, px: vec2f, nl: f32, rot: f32) -> f32 {
  let noise = ign(px, F.misc.y);
  let phi = noise * 6.2831853 * rot;
  let slope = sat(1.0 - nl);
  // percorre as cascatas da mais fina para a mais grossa; na faixa de borda de cada uma, MISTURA com a seguinte
  // (antes a troca era pontilhada por ruído e a borda da cascata aparecia como "dentes de pente" no asfalto)
  var acc = 0.0; var wAcc = 0.0;
  for (var c = 0; c < 3; c++) {
    let tw = F.shadowP[c];
    let lp = F.shadowVP[c] * vec4f(wp + n * tw * (0.6 + 2.2 * slope), 1.0);
    let uv = lp.xy * vec2f(0.5, -0.5) + 0.5;
    let e = min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y));
    if (e > 0.012 && lp.z < 1.0 && lp.z > 0.0) {
      let rad = select(select(1.6, 2.0, c == 1), 2.6, c == 0) / SHADOW_RES;
      let w = (1.0 - wAcc) * sat((e - 0.012) / 0.06);
      acc += shadowTap(c, uv, lp.z - 0.00035, rad, phi) * w; wAcc += w;
      if (wAcc > 0.999) { return acc; }
    }
  }
  return acc + (1.0 - wAcc) * shadowStatic(wp, n, phi, 1.6);
}
`;
WGSL["fog"] =
  `// Névoa exponencial em altura com dispersão do sol para a frente. Requer F e tEnv/sClamp.
fn fogOD(cam: vec3f, dir: vec3f, dist: f32) -> f32 {
  let a = F.fog.x; let b = F.fog.y; let dy = dir.y * dist;
  let base = a * exp(-b * (cam.y - F.fog.z));
  let k = b * dy;
  let f = select((1.0 - exp(-k)) / k, 1.0 - k * 0.5, abs(k) < 1e-3);
  return base * dist * f;
}
fn fogPhase(c: f32) -> f32 { let g = 0.6; let g2 = g * g; return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
fn fogSunCol(dir: vec3f) -> vec3f { return F.sunCol.rgb * (fogPhase(dot(dir, F.sunDir.xyz)) * 0.9 + 0.035) * F.fog.w; }
fn fogAmbCol(dir: vec3f) -> vec3f {
  let d = normalize(vec3f(dir.x, max(dir.y, 0.0) * 0.5 + 0.06, dir.z));
  return textureSampleLevel(tEnv, sClamp, d, ENV_MIPS - 2.0).rgb * F.fogCol.a + F.fogCol.rgb;
}
`;
