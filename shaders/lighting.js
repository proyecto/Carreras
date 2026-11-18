'use strict';
WGSL["atmos"] = `// Atmosfera (espalhamento simples Rayleigh + Mie + ozônio) e nuvens volumétricas, avaliadas na geração do céu.
const RP = 6360e3; const RA = 6440e3;
const BR = vec3f(5.8e-6, 13.6e-6, 33.1e-6); const HR = 8000.0;
const BM = 26e-6; const HM = 1300.0; const GM = 0.78;
const BO = vec3f(0.65e-6, 1.881e-6, 0.085e-6);
const SUN_I = 22.0;
fn raySphere(o: vec3f, d: vec3f, r: f32) -> vec2f { let b = dot(o, d); let c = dot(o, o) - r * r; let h = b * b - c; if (h < 0.0) { return vec2f(1e20, -1e20); } let s = sqrt(h); return vec2f(-b - s, -b + s); }
fn dens(h: f32) -> vec3f { return vec3f(exp(-h / HR), exp(-h / HM), max(0.0, 1.0 - abs(h - 25000.0) / 15000.0)); }
fn optDepth(o: vec3f, d: vec3f, n: i32) -> vec3f {
  let t = raySphere(o, d, RA).y; let dt = t / f32(n); var od = vec3f(0.0);
  for (var i = 0; i < n; i++) { let p = o + d * (f32(i) + 0.5) * dt; od += dens(length(p) - RP) * dt; }
  return od;
}
fn transm(od: vec3f) -> vec3f { return exp(-(BR * od.x + vec3f(BM * 1.11) * od.y + BO * od.z)); }
fn phR(c: f32) -> f32 { return 3.0 / (16.0 * PI) * (1.0 + c * c); }
fn phM(c: f32, g: f32) -> f32 { let g2 = g * g; return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
// radiância do céu na direção d (observador a 'alt' m), até a distância tmax (ou infinito). Retorna rgb + transmitância média.
fn atmosphere(d: vec3f, sun: vec3f, alt: f32, tmax: f32) -> vec4f {
  let o = vec3f(0.0, RP + alt, 0.0);
  var t1 = raySphere(o, d, RA).y; let tg = raySphere(o, d, RP - 400.0); if (tg.x > 0.0) { t1 = min(t1, tg.x); }
  t1 = min(t1, tmax);
  const N = 28; var sumR = vec3f(0.0); var sumM = vec3f(0.0); var od = vec3f(0.0); var tp = 0.0;
  for (var i = 0; i < N; i++) {
    // amostras mais densas perto do observador
    let f1 = f32(i + 1) / f32(N); let tn = t1 * f1 * f1; let dt = tn - tp; let p = o + d * (tp + dt * 0.5); tp = tn;
    let h = length(p) - RP; let dn = dens(h); od += dn * dt;
    let ods = optDepth(p, sun, 6); let shadow = step(raySphere(p, sun, RP - 2000.0).x, 0.0) + step(1e19, raySphere(p, sun, RP - 2000.0).x);
    let tr = transm(od + ods) * sat(shadow);
    sumR += tr * dn.x * dt; sumM += tr * dn.y * dt;
  }
  let c = dot(d, sun);
  // termo isotrópico extra ≈ espalhamento múltiplo
  let ms = (BR * sumR + vec3f(BM) * sumM) * 0.035;
  let col = SUN_I * (BR * sumR * phR(c) + vec3f(BM) * sumM * (phM(c, GM) * 0.85 + phM(c, 0.2) * 0.15) + ms);
  let tt = transm(od);
  return vec4f(col, (tt.x + tt.y + tt.z) / 3.0);
}
`;
WGSL["skybake"] = `// Gera o céu estático de fim de tarde (atmosfera + cúmulos volumétricos + cirros) numa textura
// u = azimute, v = elevação (não linear, mais resolução perto do horizonte). Alfa = transmitância das nuvens.
#include fsq
#include util
#include atmos
struct SB { sun: vec4f, p: vec4f }   // p.x = cobertura, p.y = semente
@group(0) @binding(0) var<uniform> U: SB;
@group(0) @binding(1) var tN3: texture_3d<f32>;
@group(0) @binding(2) var tN2: texture_2d<f32>;
@group(0) @binding(3) var sRep: sampler;
const CB = 1700.0; const CT = 3500.0;
fn skyDirFromUV(uv: vec2f) -> vec3f {
  let t = 1.0 - uv.y; let el = SKY_EL0 + SKY_ELR * pow(t, 1.5); let az = uv.x * 2.0 * PI;
  return vec3f(cos(el) * cos(az), sin(el), cos(el) * sin(az));
}
fn coverage(p: vec3f) -> f32 {
  let q = p.xz + vec2f(31000.0, -17000.0);
  let a = textureSampleLevel(tN2, sRep, q / 61000.0, 0.0).r;
  let b = textureSampleLevel(tN2, sRep, vec2f(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 23000.0 + 0.37, 0.0).g;
  var c = a * 0.62 + b * 0.38;
  // abre o céu em volta do sol e um pouco acima do circuito
  let dp = normalize(p + vec3f(0.0, 200.0, 0.0)); let cs = dot(dp, U.sun.xyz);
  c -= 0.14 * smoothstep(0.93, 0.998, cs);
  c -= 0.05 * smoothstep(8000.0, 1500.0, length(p.xz));
  return c;
}
fn cloudDens(p: vec3f, h: f32, fine: bool) -> f32 {
  let hn = (h - CB) / (CT - CB);
  if (hn <= 0.0 || hn >= 1.0) { return 0.0; }
  let cov = coverage(p);
  let thr = 1.0 - U.p.x;                      // limiar de cobertura
  let cv = sat((cov - thr) / 0.16);
  if (cv <= 0.0) { return 0.0; }
  // perfil vertical: base plana, topo mais alto onde a cobertura é maior
  let top = mix(0.35, 1.0, cv);
  let prof = sat(hn / 0.07) * sat((top - hn) / (top * 0.55));
  let base = textureSampleLevel(tN3, sRep, p / vec3f(6100.0, 4700.0, 6100.0) + vec3f(0.13, 0.0, 0.71), 0.0);
  var d = sat((base.r * 0.75 + base.g * 0.25) * prof - (1.0 - cv) * 0.62) / (1.0 - (1.0 - cv) * 0.62 + 1e-3);
  d = sat(d * 1.9);
  if (d <= 0.0) { return 0.0; }
  if (fine) {
    // erosão em duas escalas, com a posição torcida por ruído (bordas desfiadas em vez de bolhas lisas)
    let wq = p + (base.gba - 0.5) * 520.0;
    let det = textureSampleLevel(tN3, sRep, wq / 1250.0 + vec3f(0.3, 0.6, 0.1), 0.0);
    let det2 = textureSampleLevel(tN3, sRep, wq / 410.0 + vec3f(0.7, 0.2, 0.5), 0.0);
    let e = (det.b * 0.55 + det.g * 0.45) * 0.44 + (det2.b * 0.6 + det2.a * 0.4) * 0.2;
    let k = e * (1.0 - d * 0.55) * mix(1.0, 0.7, sat(hn * 2.0 - 0.2));
    d = sat((d - k) / (1.0 - k + 1e-3));
    d = d * d * (3.0 - 2.0 * d);
  }
  return d;
}
fn altOf(p: vec3f) -> f32 { return length(p + vec3f(0.0, RP, 0.0)) - RP; }
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  let d = skyDirFromUV(in.uv); let sun = U.sun.xyz; let alt = 40.0;
  let full = atmosphere(d, sun, alt, 1e9);
  var col = full.rgb; var Tc = 1.0;
  if (d.y > 0.004) {
    let o = vec3f(0.0, RP + alt, 0.0);
    // cirros altos (camada 2D a 9,5 km)
    let tci = raySphere(o, d, RP + 9500.0).y; let pc = d * tci;
    let ci1 = textureSampleLevel(tN2, sRep, vec2f(pc.x * 0.92 + pc.z * 0.39, (-pc.x * 0.39 + pc.z * 0.92) * 2.1) / 70000.0, 0.0).r;
    let ci2 = textureSampleLevel(tN2, sRep, pc.xz / 210000.0 + 0.5, 0.0).g;
    let ci = smoothstep(0.56, 0.9, ci1 * 0.7 + ci2 * 0.55) * 0.22 * smoothstep(0.0, 0.14, d.y);
    let sunHi = SUN_I * transm(optDepth(vec3f(0.0, RP + 9500.0, 0.0), sun, 8));
    let cph = phM(dot(d, sun), 0.6) * 2.2 + 0.11;
    let nearC = atmosphere(d, sun, alt, tci);
    col = mix(col, nearC.rgb + nearC.a * (sunHi * cph + vec3f(0.10, 0.14, 0.22)), ci);
    // cúmulos
    let t0 = raySphere(o, d, RP + CB).y; let t1 = min(raySphere(o, d, RP + CT).y, 90000.0);
    if (t1 > t0) {
      const NS = 96; let dt = (t1 - t0) / f32(NS);
      let jit = hash21(in.pos.xy);
      var S = vec3f(0.0); var tw = 0.0; var ww = 0.0;
      let cs = dot(d, sun);
      let ph = mix(phM(cs, 0.82), phM(cs, -0.25), 0.3) ;
      // cor do sol na altitude das nuvens (uma vez por pixel)
      let pm = d * mix(t0, t1, 0.4);
      let sunC = SUN_I * transm(optDepth(pm + vec3f(0.0, RP, 0.0), sun, 8));
      for (var i = 0; i < NS; i++) {
        if (Tc < 0.01) { break; }
        let t = t0 + (f32(i) + jit) * dt; let p = d * t; let h = altOf(p);
        let dn = cloudDens(p, h, true);
        if (dn > 0.0) {
          // profundidade óptica em direção ao sol
          var od = 0.0; var ls = 70.0; var lp = p;
          for (var k = 0; k < 6; k++) { lp += sun * ls; od += cloudDens(lp, altOf(lp), false) * ls; ls *= 1.7; }
          let sig = dn * 0.02; let hn = (h - CB) / (CT - CB);
          // espalhamento múltiplo aproximado (oitavas)
          let e = od * 0.02;
          let lsun = sunC * (exp(-e) * ph + 0.5 * exp(-e * 0.3) * mix(ph, 0.08, 0.55) + 0.28 * exp(-e * 0.09) * 0.08);
          let powder = 1.0 - exp(-e * 2.0 - sig * 60.0);
          let amb = mix(vec3f(0.30, 0.34, 0.44), vec3f(0.50, 0.64, 0.95), sat(hn * 1.2)) * 0.34 * SUN_I * 0.05 * (0.6 + 0.4 * exp(-e * 0.6));
          let L = lsun * mix(0.55, 1.0, powder) * 3.2 + amb;
          let a = 1.0 - exp(-sig * dt);
          S += Tc * a * L; tw += Tc * a * t; ww += Tc * a; Tc *= 1.0 - a;
        }
      }
      if (ww > 0.0) {
        let tm = tw / ww; let near = atmosphere(d, sun, alt, tm);
        col = col * Tc + near.rgb * (1.0 - Tc) + near.a * S;
      }
    }
  }
  return vec4f(col, Tc);
}
`;
WGSL["skyfn"] = `// Consulta ao céu pré-gerado + disco solar. Requer tSky, sSky, F.
fn skyUV(d: vec3f) -> vec2f {
  let el = asin(clamp(d.y, -1.0, 1.0)); let az = atan2(d.z, d.x);
  let t = pow(sat((el - SKY_EL0) / SKY_ELR), 1.0 / 1.5);
  return vec2f(az / (2.0 * PI), 1.0 - t);
}
fn skyColor(d: vec3f) -> vec3f {
  let uv = skyUV(d);
  // gradientes explícitos: evita a costura do atan2 em u = ±0.5
  let s = textureSampleLevel(tSky, sSky, uv, 0.0);
  var c = s.rgb;
  let cs = dot(d, F.sunDir.xyz);
  // disco solar com escurecimento de borda + halo
  let disc = smoothstep(0.99987, 0.99993, cs);
  c += F.sunCol.rgb * (disc * 420.0 + pow(sat(cs), 900.0) * 6.0 + pow(sat(cs), 90.0) * 0.5) * s.a;
  return c;
}
`;
WGSL["cubesky"] = `// Céu no cubemap de ambiente (sem o disco solar: o brilho especular do sol vem da luz direta).
#include fsq
#include util
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var<uniform> P: CP; // @dyn
@group(0) @binding(2) var tSky: texture_2d<f32>;
@group(0) @binding(3) var sSky: sampler;
struct CP { inv: mat4x4f }
#include skyfn
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  let w = P.inv * vec4f(in.uv.x * 2.0 - 1.0, 1.0 - in.uv.y * 2.0, 1.0, 1.0);
  let w0 = P.inv * vec4f(in.uv.x * 2.0 - 1.0, 1.0 - in.uv.y * 2.0, 0.0, 1.0);
  let d = normalize(w.xyz / w.w - w0.xyz / w0.w);
  let uv = skyUV(d);
  var c = textureSampleLevel(tSky, sSky, uv, 0.0).rgb;
  // abaixo do horizonte: cor média do chão (o terreno real é desenhado por cima)
  c = mix(c, vec3f(0.035, 0.05, 0.02) * F.sunCol.rgb * 0.6 + vec3f(0.01, 0.014, 0.02), smoothstep(0.0, -0.05, d.y));
  return vec4f(c, 1.0);
}
`;
WGSL["cube_light"] = `// Iluminação direta simplificada para o cubemap de ambiente (sombra só do mapa estático).
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
  // névoa de distância simples
  let d = distance(wp, P.camPos.xyz); let T = exp(-d * F.fog.x * 0.55);
  return mix(max(F.sh[0].rgb + F.sh[1].rgb * 0.25, vec3f(0.0)) * 0.35 + F.fogCol.rgb, col, T);
}
`;
WGSL["envblur"] = `// Pré-filtra os mips do cubemap de ambiente: cada nível borra o anterior com amostras em disco (sem costuras entre faces).
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
WGSL["brdf"] = `// BRDF de microfacetas (GGX) e aproximações de IBL.
fn dGGX(nh: f32, a: f32) -> f32 { let a2 = a * a; let d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (PI * d * d + 1e-7); }
fn vSmith(nv: f32, nl: f32, a: f32) -> f32 { let a2 = a * a; let gv = nl * sqrt(nv * nv * (1.0 - a2) + a2); let gl = nv * sqrt(nl * nl * (1.0 - a2) + a2); return 0.5 / (gv + gl + 1e-5); }
fn fSchlick(f0: vec3f, vh: f32) -> vec3f { let f = pow(1.0 - vh, 5.0); return f0 + (vec3f(1.0) - f0) * f; }
fn fSchlick1(f0: f32, vh: f32) -> f32 { return f0 + (1.0 - f0) * pow(1.0 - vh, 5.0); }
// BRDF de ambiente pré-integrada (aprox. analítica de Karis)
fn envBRDF(f0: vec3f, rough: f32, nv: f32) -> vec3f {
  let c0 = vec4f(-1.0, -0.0275, -0.572, 0.022); let c1 = vec4f(1.0, 0.0425, 1.04, -0.04);
  let r = rough * c0 + c1; let a004 = min(r.x * r.x, exp2(-9.28 * nv)) * r.x + r.y;
  let ab = vec2f(-1.04, 1.04) * a004 + r.zw;
  return f0 * ab.x + vec3f(ab.y);
}
// irradiância por harmônicos esféricos (L2), coeficientes já convoluídos com o cosseno
fn shIrr(n: vec3f) -> vec3f {
  return max(vec3f(0.0), F.sh[0].rgb + F.sh[1].rgb * n.y + F.sh[2].rgb * n.z + F.sh[3].rgb * n.x
    + F.sh[4].rgb * (n.x * n.y) + F.sh[5].rgb * (n.y * n.z) + F.sh[6].rgb * (3.0 * n.z * n.z - 1.0) + F.sh[7].rgb * (n.x * n.z) + F.sh[8].rgb * (n.x * n.x - n.y * n.y));
}
// nível de mip do cubemap de ambiente para uma rugosidade
fn envMip(rough: f32) -> f32 { let a = rough * rough; return clamp(log2(max(1.0, a * 1.2 * ENV_MIP_K)), 0.0, ENV_MIPS); }
`;
WGSL["shadow"] = `// Amostragem de sombras: 3 cascatas dinâmicas + mapa estático do mundo. Requer tShadow, tShadowS, sCmp e F.
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
WGSL["fog"] = `// Névoa exponencial em altura com dispersão do sol para a frente. Requer F e tEnv/sClamp.
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
WGSL["half"] = `// Meia resolução: oclusão de ambiente em espaço de tela (r) + visibilidade média do sol na névoa (g) + z linear (b).
#include fsq
#include util
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var gD: texture_depth_2d;
@group(0) @binding(2) var gB: texture_2d<f32>;
@group(0) @binding(3) var tShadow: texture_depth_2d_array;
@group(0) @binding(4) var tShadowS: texture_depth_2d;
@group(0) @binding(5) var sCmp: sampler_comparison;
fn viewPos(px: vec2f, d: f32) -> vec3f {
  let uv = px * F.screen.zw;
  let p = F.invProjJ * vec4f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, d, 1.0); return p.xyz / p.w;
}
fn fogSigma(y: f32) -> f32 { return F.fog.x * exp(-F.fog.y * (y - F.fog.z)); }
fn sunVis1(wp: vec3f) -> f32 {
  for (var c = 1; c < 3; c++) {
    let lp = F.shadowVP[c] * vec4f(wp, 1.0); let uv = lp.xy * vec2f(0.5, -0.5) + 0.5;
    if (uv.x > 0.01 && uv.y > 0.01 && uv.x < 0.99 && uv.y < 0.99 && lp.z < 1.0) { return textureSampleCompareLevel(tShadow, sCmp, uv, c, lp.z - 0.0006); }
  }
  let lp = F.shadowVP[3] * vec4f(wp, 1.0); let uv = lp.xy * vec2f(0.5, -0.5) + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { return 1.0; }
  return textureSampleCompareLevel(tShadowS, sCmp, uv, lp.z - 0.001);
}
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  let fp = floor(in.pos.xy) * 2.0 + 0.5;               // pixel de resolução cheia correspondente
  let pxi = vec2i(fp); let dim = vec2i(F.screen.xy) - 1;
  let d = textureLoad(gD, pxi, 0);
  let noise = ign(in.pos.xy, F.misc.y);
  var ao = 1.0; var zl = 30000.0;
  if (d > 0.0) {
    let P = viewPos(fp, d); zl = -P.z;
    let N = (F.view * vec4f(octDec(textureLoad(gB, pxi, 0).xy), 0.0)).xyz;
    let R = clamp(zl * 0.11, 0.35, 1.6);                // raio em metros, cresce com a distância
    let ps = F.screen.y * 0.5 / F.post.y;
    let rpx = clamp(R * ps / zl, 5.0, 96.0);
    var occ = 0.0; const NS = 14;
    for (var i = 0; i < NS; i++) {
      let r = (f32(i) + 0.5 + noise * 0.5) / f32(NS); let a = (f32(i) * 2.39996 + noise * 6.2832);
      let sp = fp + vec2f(cos(a), sin(a)) * rpx * r;
      let si = clamp(vec2i(sp), vec2i(0), dim);
      let S = viewPos(vec2f(si) + 0.5, textureLoad(gD, si, 0));
      let v = S - P; let vv = dot(v, v); let vn = dot(v, N);
      occ += max(0.0, vn - 0.015 * zl * 0.2 - 0.004) / (vv + 0.0006) * sat(1.0 - vv / (R * R));
    }
    ao = sat(1.0 - occ * (2.0 * 0.11 / f32(NS)) * 4.6);
  }
  // névoa: fração iluminada ao longo do raio
  let wpp = F.invViewProjJ * vec4f(fp.x * F.screen.z * 2.0 - 1.0, 1.0 - fp.y * F.screen.w * 2.0, max(d, 1e-5), 1.0);
  let wp = wpp.xyz / wpp.w; let cam = F.camPos.xyz; let dv = wp - cam; let dist = length(dv); let dir = dv / dist;
  let tMax = min(dist, VOL_DIST); const NV = 20; var wsum = 1e-6; var vsum = 0.0; var T = 1.0; var tp = 0.0;
  let j2 = fract(noise + 0.618 * f32(pxi.x & 1) + 0.31 * f32(pxi.y & 1));
  for (var i = 0; i < NV; i++) {
    let f1 = (f32(i) + 1.0) / f32(NV); let tn = tMax * f1 * f1; let dt = tn - tp; let t = tp + dt * j2; tp = tn;
    let p = cam + dir * t; let sg = fogSigma(p.y);
    let w = sg * T * dt; T *= exp(-sg * dt);
    vsum += w * sunVis1(p); wsum += w;
  }
  return vec4f(ao, vsum / wsum, min(zl, 30000.0), 1.0);
}
`;
WGSL["bilat"] = `// Borrão separável sensível à profundidade para (ao, vol); b = z linear passa direto.
#include fsq
@group(0) @binding(0) var t: texture_2d<f32>;
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  let p = vec2i(in.pos.xy); let dim = vec2i(textureDimensions(t)) - 1;
  let c = textureLoad(t, p, 0); var acc = c.rg; var ws = 1.0;
  for (var i = -4; i <= 4; i++) {
    if (i == 0) { continue; }
    let q = clamp(p + vec2i(DIR) * i, vec2i(0), dim); let s = textureLoad(t, q, 0);
    let w = exp(-f32(i * i) / 10.0) * exp(-abs(s.b - c.b) / (0.03 * c.b + 0.03) * 2.0);
    acc += s.rg * w; ws += w;
  }
  return vec4f(acc / ws, c.b, 1.0);
}
`;
WGSL["light"] = `// Passe de iluminação diferida: sol + sombras + ambiente (SH + cubemap) + reflexo em espaço de tela + céu + névoa.
#include fsq
#include util
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var gA: texture_2d<f32>;
@group(0) @binding(2) var gB: texture_2d<f32>;
@group(0) @binding(3) var gC: texture_2d<f32>;
@group(0) @binding(4) var gD: texture_depth_2d;
@group(0) @binding(5) var tShadow: texture_depth_2d_array;
@group(0) @binding(6) var tShadowS: texture_depth_2d;
@group(0) @binding(7) var sCmp: sampler_comparison;
@group(0) @binding(8) var tHalf: texture_2d<f32>;
@group(0) @binding(9) var tEnv: texture_cube<f32>;
@group(0) @binding(10) var tSky: texture_2d<f32>;
@group(0) @binding(11) var sClamp: sampler;
@group(0) @binding(12) var sSky: sampler;
@group(0) @binding(13) var tHist: texture_2d<f32>;
#include brdf
#include shadow
#include fog
#include skyfn

fn worldAt(uv: vec2f, d: f32) -> vec3f { let p = F.invViewProjJ * vec4f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, d, 1.0); return p.xyz / p.w; }
// oclusão analítica do carro sobre o chão: caixa arredondada da carroceria + contato de cada pneu.
// Escurece a luz ambiente debaixo e em volta do carro (e um pouco a direta, junto aos pneus).
fn carAO(wp: vec3f, n: vec3f) -> f32 {
  let lp = (F.carInv * vec4f(wp, 1.0)).xyz;
  let ln = (F.carInv * vec4f(n, 0.0)).xyz;
  if (ln.y < 0.3 || lp.y > 0.2 || lp.y < -0.6 || abs(lp.x) > 4.5 || abs(lp.z) > 3.5) { return 1.0; }
  let q = vec2f(abs(lp.x - 0.07) - 1.72, abs(lp.z) - 0.72);
  let dOut = length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0);   // distância assinada ao retângulo
  let h = max(0.26 - lp.y, 0.03);                                     // altura do assoalho sobre o ponto (com piso: sem divisão por ~0)
  let occ = sat(1.0 - (dOut + 0.03) / (h * 3.0 + 0.3));
  // pneus: mancha curta e forte em volta de cada área de contato
  let dw = length(vec2f((abs(lp.x) - 1.181) * 0.8, abs(lp.z) - 0.66));
  let wo = sat(1.0 - dw / 0.5);
  return 1.0 - max(occ * occ * 0.94, wo * wo * 0.9) * sat(1.5 - h * 1.2);
}
// amostra o alvo de meia resolução (ao, vol, z linear) com pesos de profundidade (sem vazar em silhuetas)
fn halfSample(uv: vec2f, z: f32) -> vec2f {
  let hs = F.screen.xy * 0.5; let p = uv * hs - 0.5; let b = floor(p); let f = p - b;
  var acc = vec2f(0.0); var wsum = 0.0;
  for (var i = 0; i < 4; i++) {
    let o = vec2f(f32(i & 1), f32(i >> 1));
    let t = textureLoad(tHalf, clamp(vec2i(b + o), vec2i(0), vec2i(hs) - 1), 0);
    let wb = mix(1.0 - f.x, f.x, o.x) * mix(1.0 - f.y, f.y, o.y);
    let w = wb / (1e-3 + abs(t.b - z) / (0.02 * z + 0.02)) + 1e-5;
    acc += t.rg * w; wsum += w;
  }
  return acc / wsum;
}
#ifdef SSR
// reflexo em espaço de tela para superfícies molhadas: marcha no mundo, testa contra a profundidade, lê o quadro anterior
fn ssr(wp: vec3f, R: vec3f, px: vec2f, dist: f32) -> vec4f {
  let noise = ign(px, F.misc.y + 3.0);
  var stepLen = 0.03 + dist * 0.008; var t = stepLen * (0.4 + noise); var tPrev = 0.0;
  var hit = false; var hp = wp;
  for (var i = 0; i < 48; i++) {
    let p = wp + R * t; let c = F.viewProjJ * vec4f(p, 1.0);
    if (c.w <= 0.01) { break; }
    let uv = c.xy / c.w * vec2f(0.5, -0.5) + 0.5;
    if (uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0) { break; }
    let zs = F.camFwd.w / max(textureLoad(gD, vec2i(uv * F.screen.xy), 0), 1e-6);
    if (c.w > zs + 0.03) {
      if (c.w < zs + 0.6 + stepLen * 2.5) {
        // refino por bisseção
        var a = tPrev; var b = t;
        for (var k = 0; k < 5; k++) {
          let m = (a + b) * 0.5; let q = wp + R * m; let cq = F.viewProjJ * vec4f(q, 1.0); let uq = cq.xy / cq.w * vec2f(0.5, -0.5) + 0.5;
          let zq = F.camFwd.w / max(textureLoad(gD, vec2i(uq * F.screen.xy), 0), 1e-6);
          if (cq.w > zq + 0.03) { b = m; } else { a = m; }
        }
        hp = wp + R * b; hit = true;
      }
      break;
    }
    tPrev = t; stepLen *= 1.1; t += stepLen;
  }
  if (!hit) { return vec4f(0.0); }
  let pc = F.prevViewProj * vec4f(hp, 1.0); let huv = pc.xy / pc.w * vec2f(0.5, -0.5) + 0.5;
  let e = min(min(huv.x, huv.y), min(1.0 - huv.x, 1.0 - huv.y));
  let fade = smoothstep(0.0, 0.06, e);
  let c = textureSampleLevel(tHist, sClamp, huv, 0.0).rgb;
  return vec4f(min(c, vec3f(40.0)), fade);
}
#endif
struct LOut { @location(0) col: vec4f }
@fragment fn fs(in: FsV) -> LOut {
  let px = vec2i(in.pos.xy);
  let d = textureLoad(gD, px, 0);
  let wpFar = worldAt(in.uv, max(d, 1e-6));
  let V = normalize(F.camPos.xyz - wpFar);
  var o: LOut;
  if (d <= 0.0) {
    var c = skyColor(-V);
    // raios de luz na névoa também sobre o céu
    let hs = textureSampleLevel(tHalf, sClamp, in.uv, 0.0);
    let Tn = exp(-fogOD(F.camPos.xyz, -V, VOL_DIST));
    c = c * mix(1.0, Tn, 0.0) - fogSunCol(-V) * (1.0 - Tn) * (1.0 - hs.g) * 0.85;
    o.col = vec4f(max(c, vec3f(0.0)), 1.0); return o;
  }
  let a = textureLoad(gA, px, 0); let b = textureLoad(gB, px, 0); let m = textureLoad(gC, px, 0);
  let wp = wpFar; let N = octDec(b.xy);
  let albedo = a.rgb; let rough = max(b.z, 0.035); let metal = b.w; let coat = m.x; let sss = m.y; let wet = m.w;
  let L = F.sunDir.xyz; let H = normalize(L + V);
  let nl = dot(N, L); let nv = max(dot(N, V), 1e-3); let nh = sat(dot(N, H)); let vh = sat(dot(V, H));
  let dist = distance(F.camPos.xyz, wp);
  var sh = 0.0;
  if (nl > -0.3 || sss > 0.0) { sh = sunShadowK(wp, N * select(1.0, 0.25, sss > 0.0), in.pos.xy, nl, select(1.0, 0.0, coat > 0.5)); }
  let cao = carAO(wp, N);
  let sun = F.sunCol.rgb * sh * mix(1.0, cao, 0.7);
  let f0 = mix(vec3f(0.04), albedo, metal); let diffC = albedo * (1.0 - metal);
  let al = rough * rough;
  var col = vec3f(0.0);
  // direto
  let nlc = sat(nl);
  var spec = fSchlick(f0, vh) * (dGGX(nh, al) * vSmith(nv, nlc, al));
  // superfícies ásperas não metálicas (asfalto, tinta fosca da zebra, grama): o lóbulo largo do GGX sob sol rasante lavava a cor
  // em bege/rosa; atenua o especular direto delas (com as cavidades do material)
  spec *= mix(1.0, 0.3 * a.a, smoothstep(0.78, 0.92, rough) * (1.0 - metal));
  var dif = diffC / PI;
  var coatAtt = 1.0;
  if (coat > 0.0) {
    let fc = fSchlick1(0.045, vh) * coat; coatAtt = 1.0 - fc;
    let ac = 0.0028;   // verniz liso
    col += sun * nlc * fc * min(dGGX(nh, ac) * vSmith(nv, nlc, ac), 90.0);
  }
  col += sun * nlc * (dif + spec) * coatAtt;
  if (sss > 0.0) {
    // folhagem: luz que atravessa a folha + envolvimento
    let back = sat(dot(-N, L)) * 0.6 + sat(dot(V, -L)) * sat(-nl + 0.3) * 0.5;
    col += sun * diffC * sss * (back * 0.75 + sat(nl * 0.5 + 0.5) * 0.12) / PI * 2.0;
  }
  // ambiente
  var hv = halfSample(in.uv, dist * dot(-V, F.camFwd.xyz)); hv.g = mix(1.0, hv.g, 0.7);
  let aoS = hv.r;
  let ao = min(a.a, aoS) * cao;
  // luz do céu nas sombras: um pouco dessaturada e reforçada (rebote difuso do cenário que o SH não capta)
  var irr = shIrr(N); irr = mix(vec3f(lum(irr)), irr, 0.15) * 1.75 * pow(F.sunCol.rgb / lum(F.sunCol.rgb), vec3f(0.42));   // quase neutra e levemente quente: a sombra não fica azul-marinho depois do balanço de branco
  col += diffC * irr * ao * coatAtt;
  let R = reflect(-V, N);
  let specOcc = sat(pow(nv + ao, exp2(-16.0 * rough - 1.0)) - 1.0 + ao);
  // horizonte: reflexo abaixo do chão perde energia
  var env = textureSampleLevel(tEnv, sClamp, R, envMip(rough)).rgb;
  env = mix(env, vec3f(lum(env)), sat(rough * 1.2 - 0.25) * 0.7);   // superfícies ásperas não devolvem o azul saturado do céu
  var envC = textureSampleLevel(tEnv, sClamp, R, 0.9).rgb;
#ifdef SSR
  if (wet > 0.03 && dist < 160.0) {
    let r = ssr(wp, R, in.pos.xy, dist);
    env = mix(env, r.rgb, r.a * sat(wet * 1.15)); envC = env;
  }
#endif
  col += env * envBRDF(f0, rough, nv) * specOcc * coatAtt * mix(1.0, cao, 0.7);
  // verniz: reflexo do ambiente levemente borrado (verniz real tem casca de laranja)
  // (reflexo um pouco dessaturado e Fresnel limitado em ângulo rasante: zebras não viram faixas rosa na lataria nem o capô vira espelho)
  if (coat > 0.0) { envC = mix(vec3f(lum(envC)), envC, 0.6); col += envC * min(fSchlick1(0.08, nv), 0.26) * coat * mix(specOcc, 1.0, 0.5) * 1.4; }
  // emissivo
  col += albedo * (m.z * m.z) * 16.0;
  // névoa
  let dir = -V; let od = fogOD(F.camPos.xyz, dir, dist); let T = exp(-od);
  let nearD = min(dist, VOL_DIST); let Tn = exp(-fogOD(F.camPos.xyz, dir, nearD));
  let sunIn = fogSunCol(dir) * max(0.0, (1.0 - T) - (1.0 - Tn) * (1.0 - hv.g));
  col = col * T + fogAmbCol(dir) * (1.0 - T) + sunIn;
  o.col = vec4f(col, 1.0);
  return o;
}
`;
