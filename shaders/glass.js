"use strict";
WGSL["glass"] =
  `// Cristales y ópticas transparentes (pase de transparencia hacia adelante). Dos dibujos por malla:
//   GLASS_MUL: multiplica el fondo por la transmitancia coloreada; GLASS_ADD: suma reflejo de entorno + brillo solar.
// material: id 0 = cristal de ventanillas (color de vértice = tinte), 1 = lente transparente estriada (faros)
#include mesh_vert
#include fwd_common
fn shade(in: V2F, ff: bool) -> vec4f {
  var N = normalize(in.nrm); if (!ff) { N = -N; }
  let V = normalize(F.camPos.xyz - in.wpos);
  let id = matId(in.mat);
  var milk = 0.0;
  var flute = 1.0;
  if (id == 1u) {
    // Lente de faro: cristal claro con estrías verticales sutiles para desviar reflejos
    let zd = normalize((O.model * vec4f(0.0, 0.0, 1.0, 0.0)).xyz);
    let k = sin(in.ext.z * 6.2831853 / 0.0085); let kf = sat(1.0 - fwidth(in.ext.z) / 0.0085 * 2.5);
    N = normalize(N + zd * k * 0.16 * kf);
    flute = mix(0.96, 0.9 + 0.1 * k * k, kf);
  }
  let nv = max(dot(N, V), 1e-3);
  // Parabrisas y luneta trasera reflejan más cielo que los cristales laterales
  let nO = normalize((vec4f(N, 0.0) * O.model).xyz);
  let ws = smoothstep(0.3, 0.6, abs(nO.x));   // 1 = parabrisas / luneta
  let f0w = mix(0.08, 0.17, ws);
  let fr = min(fSchlick1(select(f0w, 0.06, id == 1u), nv), 0.6);   // Coeficiente Fresnel
#ifdef GLASS_MUL
  // Transmitancia de cristal: tinte neutro con leve degradado superior en parabrisas
  var base = select(mix(vec3f(0.84, 0.875, 0.86), vec3f(0.75, 0.805, 0.78), ws), in.col.rgb, id == 1u);
  if (id != 1u && nO.x > 0.3) { base *= mix(vec3f(1.0), vec3f(0.5, 0.66, 0.62), smoothstep(1.3, 1.4, in.ext.y)); }
  let tint = base * (1.0 - fr) * (1.0 - milk) * flute;
  return vec4f(tint, 1.0);
#else
  let R = reflect(-V, N);
  var env = textureSampleLevel(tEnv, sClamp, R, select(1.2, 0.3, id == 1u)).rgb;
  env = mix(vec3f(lum(env)), env, 0.65);
  // Reflejo ambiental: el gradiente del cielo se mantiene visible en el cristal
  if (id != 1u) { let up = sat(R.y * 0.5 + 0.5); env = max(env, shIrr(normalize(R + vec3f(0.0, 0.5, 0.0))) * mix(0.25, 0.75, up)); }
  let L = F.sunDir.xyz; let H = normalize(L + V); let nl = sat(dot(N, L));
  let sh = sunShadow(in.wpos, N, in.pos.xy, nl);
  let spec = F.sunCol.rgb * nl * sh * fr * min(dGGX(sat(dot(N, H)), 0.003) * vSmith(nv, nl, 0.003), 14.0);
  var c = env * fr + spec;
  c += (shIrr(N) + F.sunCol.rgb * nl * sh / PI) * milk;
  if (!ff) { c *= 0.35; }
  return vec4f(c, 0.0);
#endif
}
`;
