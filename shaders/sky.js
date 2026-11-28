'use strict';
WGSL["atmos"] = `// Atmósfera (dispersión Rayleigh + Mie + ozono) y nubes volumétricas para horneado del cielo.
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
// Radiancia del cielo en dirección d (observador a 'alt' m), hasta tmax. Devuelve rgb + transmitancia media.
fn atmosphere(d: vec3f, sun: vec3f, alt: f32, tmax: f32) -> vec4f {
  let o = vec3f(0.0, RP + alt, 0.0);
  var t1 = raySphere(o, d, RA).y; let tg = raySphere(o, d, RP - 400.0); if (tg.x > 0.0) { t1 = min(t1, tg.x); }
  t1 = min(t1, tmax);
  const N = 28; var sumR = vec3f(0.0); var sumM = vec3f(0.0); var od = vec3f(0.0); var tp = 0.0;
  for (var i = 0; i < N; i++) {
    // Muestras más densas cerca del observador
    let f1 = f32(i + 1) / f32(N); let tn = t1 * f1 * f1; let dt = tn - tp; let p = o + d * (tp + dt * 0.5); tp = tn;
    let h = length(p) - RP; let dn = dens(h); od += dn * dt;
    let ods = optDepth(p, sun, 6); let shadow = step(raySphere(p, sun, RP - 2000.0).x, 0.0) + step(1e19, raySphere(p, sun, RP - 2000.0).x);
    let tr = transm(od + ods) * sat(shadow);
    sumR += tr * dn.x * dt; sumM += tr * dn.y * dt;
  }
  let c = dot(d, sun);
  // Término isotrópico adicional ≈ dispersión múltiple
  let ms = (BR * sumR + vec3f(BM) * sumM) * 0.035;
  let col = SUN_I * (BR * sumR * phR(c) + vec3f(BM) * sumM * (phM(c, GM) * 0.85 + phM(c, 0.2) * 0.15) + ms);
  let tt = transm(od);
  return vec4f(col, (tt.x + tt.y + tt.z) / 3.0);
}
`;
WGSL["skybake"] = `// Genera el cielo estático al atardecer (atmósfera + cúmulos volumétricos + cirros) en una textura
// u = azimut, v = elevación (no lineal, mayor resolución en el horizonte). Alfa = transmitancia de nubes.
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
  // Despeja el cielo alrededor del sol y sobre el circuito
  let dp = normalize(p + vec3f(0.0, 200.0, 0.0)); let cs = dot(dp, U.sun.xyz);
  c -= 0.14 * smoothstep(0.93, 0.998, cs);
  c -= 0.05 * smoothstep(8000.0, 1500.0, length(p.xz));
  return c;
}
fn cloudDens(p: vec3f, h: f32, fine: bool) -> f32 {
  let hn = (h - CB) / (CT - CB);
  if (hn <= 0.0 || hn >= 1.0) { return 0.0; }
  let cov = coverage(p);
  let thr = 1.0 - U.p.x;                      // Umbral de cobertura
  let cv = sat((cov - thr) / 0.16);
  if (cv <= 0.0) { return 0.0; }
  // Perfil vertical: base plana, cúspide más alta donde la cobertura es mayor
  let top = mix(0.35, 1.0, cv);
  let prof = sat(hn / 0.07) * sat((top - hn) / (top * 0.55));
  let base = textureSampleLevel(tN3, sRep, p / vec3f(6100.0, 4700.0, 6100.0) + vec3f(0.13, 0.0, 0.71), 0.0);
  var d = sat((base.r * 0.75 + base.g * 0.25) * prof - (1.0 - cv) * 0.62) / (1.0 - (1.0 - cv) * 0.62 + 1e-3);
  d = sat(d * 1.9);
  if (d <= 0.0) { return 0.0; }
  if (fine) {
    // Erosión en dos escalas con dominio perturbado por ruido
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
  if (U.sun.w < -0.5) {
    // Cielo nocturno de Gran Premio: bóveda azul marino profundo, luna, estrellas y resplandor urbano en el horizonte
    let ndy = sat(d.y);
    var nightSky = mix(vec3f(0.0022, 0.0028, 0.0062), vec3f(0.0005, 0.0007, 0.0016), pow(ndy, 0.5));
    // Resplandor urbano de Las Vegas en el horizonte
    nightSky += vec3f(0.016, 0.009, 0.026) * pow(1.0 - ndy, 8.0);
    // Campo de estrellas titilantes
    let starSeed = fract(sin(dot(floor(d * 420.0), vec3f(12.9898, 78.233, 45.164))) * 43758.5453);
    if (starSeed > 0.992 && d.y > 0.04) {
      let twinkle = sin(starSeed * 628.0) * 0.35 + 0.65;
      nightSky += vec3f(2.6, 2.8, 3.2) * pow((starSeed - 0.992) / 0.008, 2.2) * twinkle;
    }
    // Luna en el cielo nocturno
    let moonDir = normalize(vec3f(0.35, 0.65, 0.67));
    let cosMoon = dot(d, moonDir);
    let moonDisc = smoothstep(0.9985, 0.9994, cosMoon);
    let moonHalo = pow(sat(cosMoon), 160.0) * 0.45 + pow(sat(cosMoon), 24.0) * 0.04;
    nightSky += vec3f(3.2, 3.4, 3.8) * moonDisc + vec3f(0.18, 0.22, 0.35) * moonHalo;
    return vec4f(nightSky, 0.0);
  }
  let full = atmosphere(d, sun, alt, 1e9);
  var col = full.rgb; var Tc = 1.0;
  if (d.y > 0.004) {
    let o = vec3f(0.0, RP + alt, 0.0);
    // Cirros altos (capa 2D a 9.5 km)
    let tci = raySphere(o, d, RP + 9500.0).y; let pc = d * tci;
    let ci1 = textureSampleLevel(tN2, sRep, vec2f(pc.x * 0.92 + pc.z * 0.39, (-pc.x * 0.39 + pc.z * 0.92) * 2.1) / 70000.0, 0.0).r;
    let ci2 = textureSampleLevel(tN2, sRep, pc.xz / 210000.0 + 0.5, 0.0).g;
    let ci = smoothstep(0.56, 0.9, ci1 * 0.7 + ci2 * 0.55) * 0.22 * smoothstep(0.0, 0.14, d.y);
    let sunHi = SUN_I * transm(optDepth(vec3f(0.0, RP + 9500.0, 0.0), sun, 8));
    let cph = phM(dot(d, sun), 0.6) * 2.2 + 0.11;
    let nearC = atmosphere(d, sun, alt, tci);
    col = mix(col, nearC.rgb + nearC.a * (sunHi * cph + vec3f(0.10, 0.14, 0.22)), ci);
    // Cúmulos volumétricos
    let t0 = raySphere(o, d, RP + CB).y; let t1 = min(raySphere(o, d, RP + CT).y, 90000.0);
    if (t1 > t0) {
      const NS = 96; let dt = (t1 - t0) / f32(NS);
      let jit = hash21(in.pos.xy);
      var S = vec3f(0.0); var tw = 0.0; var ww = 0.0;
      let cs = dot(d, sun);
      let ph = mix(phM(cs, 0.82), phM(cs, -0.25), 0.3) ;
      // Color del sol a la altitud de las nubes
      let pm = d * mix(t0, t1, 0.4);
      let sunC = SUN_I * transm(optDepth(pm + vec3f(0.0, RP, 0.0), sun, 8));
      for (var i = 0; i < NS; i++) {
        if (Tc < 0.01) { break; }
        let t = t0 + (f32(i) + jit) * dt; let p = d * t; let h = altOf(p);
        let dn = cloudDens(p, h, true);
        if (dn > 0.0) {
          // Profundidad óptica hacia el sol
          var od = 0.0; var ls = 70.0; var lp = p;
          for (var k = 0; k < 6; k++) { lp += sun * ls; od += cloudDens(lp, altOf(lp), false) * ls; ls *= 1.7; }
          let sig = dn * 0.02; let hn = (h - CB) / (CT - CB);
          // Dispersión múltiple aproximada (octavas)
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
WGSL["skyfn"] = `// Consulta al cielo precalculado + disco solar.
fn skyUV(d: vec3f) -> vec2f {
  let el = asin(clamp(d.y, -1.0, 1.0)); let az = atan2(d.z, d.x);
  let t = pow(sat((el - SKY_EL0) / SKY_ELR), 1.0 / 1.5);
  return vec2f(az / (2.0 * PI), 1.0 - t);
}
fn skyColor(d: vec3f) -> vec3f {
  let uv = skyUV(d);
  // Gradientes explícitos para evitar costuras de atan2 en u = ±0.5
  let s = textureSampleLevel(tSky, sSky, uv, 0.0);
  var c = s.rgb;
  let isNight = F.sunDir.w > 0.5;
  if (!isNight) {
    let cs = dot(d, F.sunDir.xyz);
    // Disco solar con oscurecimiento hacia el limbo + halo (solo de día)
    let disc = smoothstep(0.99987, 0.99993, cs);
    c += F.sunCol.rgb * (disc * 420.0 + pow(sat(cs), 900.0) * 6.0 + pow(sat(cs), 90.0) * 0.5) * s.a;
  }
  return c;
}
`;
WGSL["cubesky"] = `// Cielo en cubemap de entorno (sin disco solar directo).
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
  // Bajo el horizonte: color medio del terreno (ciudad iluminada de noche o campo de día)
  let isNight = F.sunDir.w > 0.5;
  let groundNight = vec3f(0.004, 0.005, 0.008) * F.sunCol.rgb + vec3f(0.002, 0.0025, 0.0035);
  let groundDay = vec3f(0.035, 0.05, 0.02) * F.sunCol.rgb * 0.6 + vec3f(0.01, 0.014, 0.02);
  c = mix(c, select(groundDay, groundNight, isNight), smoothstep(0.0, -0.05, d.y));
  return vec4f(c, 1.0);
}
`;
