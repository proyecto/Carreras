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
  // Niebla atmosférica: fração iluminada ao longo do raio
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
WGSL["bilat"] = `// Desenfoque bilateral sensible a la profundidad para AO y volumen.
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
WGSL["light"] = `// Pase de iluminación diferida: sol + sombras + ambiente (SH + cubemap) + reflejos en espacio de pantalla (SSR) + cielo + niebla.
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
// Oclusión analítica del coche sobre el suelo: carrocería + huella de contacto de neumáticos.
// Atenúa luz ambiental y directa bajo el vehículo.
fn carAO(wp: vec3f, n: vec3f) -> f32 {
  let lp = (F.carInv * vec4f(wp, 1.0)).xyz;
  let ln = (F.carInv * vec4f(n, 0.0)).xyz;
  if (ln.y < 0.3 || lp.y > 0.2 || lp.y < -0.6 || abs(lp.x) > 4.5 || abs(lp.z) > 3.5) { return 1.0; }
  let q = vec2f(abs(lp.x - 0.07) - 1.72, abs(lp.z) - 0.72);
  let dOut = length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0);   // Distancia con signo al rectángulo
  let h = max(0.26 - lp.y, 0.03);                                     // Altura del suelo del coche sobre el punto
  let occ = sat(1.0 - (dOut + 0.03) / (h * 3.0 + 0.3));
  // Neumáticos: oclusión de contacto
  let dw = length(vec2f((abs(lp.x) - 1.181) * 0.8, abs(lp.z) - 0.66));
  let wo = sat(1.0 - dw / 0.5);
  return 1.0 - max(occ * occ * 0.94, wo * wo * 0.9) * sat(1.5 - h * 1.2);
}
// Muestreo a media resolución con ponderación por profundidad
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
// Reflejos en espacio de pantalla (SSR) para asfalto mojado
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
        // Refinamiento por bisección
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
  let isNight = F.sunDir.w > 0.5;
  if (d <= 0.0) {
    var c = skyColor(-V);
    if (!isNight) {
      // Rayos crepusculares en niebla (solo de día)
      let hs = textureSampleLevel(tHalf, sClamp, in.uv, 0.0);
      let Tn = exp(-fogOD(F.camPos.xyz, -V, VOL_DIST));
      let fogScatter = fogSunCol(-V) * (1.0 - Tn) * (1.0 - hs.g) * 0.85;
      c = max(c * Tn - fogScatter, c * 0.4);
    }
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
  // Iluminación directa
  let nlc = sat(nl);
  var spec = fSchlick(f0, vh) * (dGGX(nh, al) * vSmith(nv, nlc, al));
  // Superficies rugosas no metálicas: atenuación de lóbulo especular rasante
  spec *= mix(1.0, 0.3 * a.a, smoothstep(0.78, 0.92, rough) * (1.0 - metal));
  var dif = diffC / PI;
  var coatAtt = 1.0;
  if (coat > 0.0) {
    let fc = fSchlick1(0.045, vh) * coat; coatAtt = 1.0 - fc;
    let ac = 0.0028;   // Barniz liso (Clearcoat)
    col += sun * nlc * fc * min(dGGX(nh, ac) * vSmith(nv, nlc, ac), 90.0);
  }
  col += sun * nlc * (dif + spec) * coatAtt;
  // Faros de xenón del vehículo (proyección frontal en carreras nocturnas)
  if (isNight) {
    let pCar = (F.carInv * vec4f(wp, 1.0)).xyz;
    if (pCar.x > 0.5 && pCar.x < 95.0) {
      let dFwd = pCar.x - 1.8;
      if (dFwd > 0.0) {
        let dLatL = pCar.z - 0.72;
        let dLatR = pCar.z + 0.72;
        let dVert = (pCar.y - 0.55) + dFwd * 0.032;
        let spread = dFwd * 0.20 + 0.85;
        let beamL = exp(-(dLatL * dLatL) / (spread * spread * 0.5)) * smoothstep(1.3, -0.6, dVert);
        let beamR = exp(-(dLatR * dLatR) / (spread * spread * 0.5)) * smoothstep(1.3, -0.6, dVert);
        let atten = 1.0 / (1.0 + dFwd * 0.05 + dFwd * dFwd * 0.0018);
        let hl = vec3f(3.2, 3.5, 4.2) * (beamL + beamR) * atten * sat(dot(N, vec3f(0.0, 1.0, 0.0)) * 0.6 + 0.4);
        col += diffC * hl * coatAtt + spec * hl * coatAtt;
      }
    }
  }
  if (sss > 0.0) {
    // Follaje: dispersión subsuperficial y transmisión
    let back = sat(dot(-N, L)) * 0.6 + sat(dot(V, -L)) * sat(-nl + 0.3) * 0.5;
    col += sun * diffC * sss * (back * 0.75 + sat(nl * 0.5 + 0.5) * 0.12) / PI * 2.0;
  }
  // Iluminación ambiental
  var hv = halfSample(in.uv, dist * dot(-V, F.camFwd.xyz)); hv.g = mix(1.0, hv.g, 0.7);
  let aoS = hv.r;
  let ao = min(a.a, aoS) * cao;
  // Luz ambiental en sombras: balanceada para evitar tonos azules excesivos
  var irr = shIrr(N);
  let sLum = max(lum(F.sunCol.rgb), 1e-4);
  let sNrm = F.sunCol.rgb / sLum;
  irr = mix(vec3f(lum(irr)), irr, 0.15) * 1.75 * pow(sNrm, vec3f(0.42));
  // Suelo mínimo de iluminación ambiental nocturna calibrado para no colapsar a negro absoluto
  irr = max(irr, select(vec3f(0.0), vec3f(0.012, 0.015, 0.022), isNight));
  col += diffC * irr * ao * coatAtt;
  let R = reflect(-V, N);
  let specOcc = sat(pow(nv + ao, exp2(-16.0 * rough - 1.0)) - 1.0 + ao);
  // Horizonte: atenuación de reflejos bajo el plano de tierra
  var env = textureSampleLevel(tEnv, sClamp, R, envMip(rough)).rgb;
  env = mix(env, vec3f(lum(env)), sat(rough * 1.2 - 0.25) * 0.7);   // Superficies rugosas atenúan saturación de reflejo
  var envC = textureSampleLevel(tEnv, sClamp, R, 0.9).rgb;
#ifdef SSR
  if (wet > 0.03 && dist < 160.0) {
    let r = ssr(wp, R, in.pos.xy, dist);
    env = mix(env, r.rgb, r.a * sat(wet * 1.15)); envC = env;
  }
#endif
  col += env * envBRDF(f0, rough, nv) * specOcc * coatAtt * mix(1.0, cao, 0.7);
  // Barniz (Clearcoat): reflejo con rugosidad superficial realista
  // Reflejo atenuado y Fresnel limitado en ángulos rasantes para evitar artefactos en carrocería
  if (coat > 0.0) { envC = mix(vec3f(lum(envC)), envC, 0.6); col += envC * min(fSchlick1(0.08, nv), 0.26) * coat * mix(specOcc, 1.0, 0.5) * 1.4; }
  // Emisivo
  col += albedo * (m.z * m.z) * 16.0;
  // Niebla y dispersión atmosférica
  let dir = -V; let od = fogOD(F.camPos.xyz, dir, dist); let T = exp(-od);
  let nearD = min(dist, VOL_DIST); let Tn = exp(-fogOD(F.camPos.xyz, dir, nearD));
  let sunIn = fogSunCol(dir) * max(0.0, (1.0 - T) - (1.0 - Tn) * (1.0 - hv.g));
  col = col * T + fogAmbCol(dir) * (1.0 - T) + sunIn;
  o.col = vec4f(col, 1.0);
  return o;
}
`;
