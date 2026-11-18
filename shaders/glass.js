'use strict';
WGSL["glass"] = `// Vidros e lentes (passe de transparentes). Dois desenhos por malha:
//   GLASS_MUL: multiplica o fundo pela transmitância colorida;  GLASS_ADD: soma reflexo do ambiente + brilho do sol.
// material: id 0 = vidro de janela (cor do vértice = tinta), 1 = lente transparente canelada (farol)
#include mesh_vert
#include fwd_common
fn shade(in: V2F, ff: bool) -> vec4f {
  var N = normalize(in.nrm); if (!ff) { N = -N; }
  let V = normalize(F.camPos.xyz - in.wpos);
  let id = matId(in.mat);
  var milk = 0.0;
  var flute = 1.0;
  if (id == 1u) {
    // lente do farol: vidro claro com estrias verticais sutis (só desviam de leve o reflexo); sem véu leitoso nem faixas
    let zd = normalize((O.model * vec4f(0.0, 0.0, 1.0, 0.0)).xyz);
    let k = sin(in.ext.z * 6.2831853 / 0.0085); let kf = sat(1.0 - fwidth(in.ext.z) / 0.0085 * 2.5);
    N = normalize(N + zd * k * 0.16 * kf);
    flute = mix(0.96, 0.9 + 0.1 * k * k, kf);
  }
  let nv = max(dot(N, V), 1e-3);
  // para-brisa e vigia (normal ao longo do carro) refletem um pouco mais o céu que os vidros laterais
  let nO = normalize((vec4f(N, 0.0) * O.model).xyz);
  let ws = smoothstep(0.3, 0.6, abs(nO.x));   // 1 = para-brisa/vigia
  let f0w = mix(0.08, 0.17, ws);
  let fr = min(fSchlick1(select(f0w, 0.06, id == 1u), nv), 0.6);   // janelas um pouco acima do vidro real (reflexo do céu legível); lente do farol como vidro comum
#ifdef GLASS_MUL
  // transmitância: tinta quase neutra, levemente esverdeada e CONSTANTE com o ângulo (a potência por ângulo saturava em verde
  // quando se olhava em ângulo rasante através de dois vidros)
  // para-brisa e vigia um pouco mais escuros (fumê esverdeado, ~0,78) que os laterais; faixa degradê no topo do para-brisa
  var base = select(mix(vec3f(0.84, 0.875, 0.86), vec3f(0.75, 0.805, 0.78), ws), in.col.rgb, id == 1u);
  if (id != 1u && nO.x > 0.3) { base *= mix(vec3f(1.0), vec3f(0.5, 0.66, 0.62), smoothstep(1.3, 1.4, in.ext.y)); }
  let tint = base * (1.0 - fr) * (1.0 - milk) * flute;
  return vec4f(tint, 1.0);
#else
  let R = reflect(-V, N);
  var env = textureSampleLevel(tEnv, sClamp, R, select(1.2, 0.3, id == 1u)).rgb;
  env = mix(vec3f(lum(env)), env, 0.65);
  // piso de reflexo: o gradiente do céu (da luz ambiente) aparece no vidro mesmo quando o cubemap local está escuro
  if (id != 1u) { let up = sat(R.y * 0.5 + 0.5); env = max(env, shIrr(normalize(R + vec3f(0.0, 0.5, 0.0))) * mix(0.25, 0.75, up)); }   // reflexo sem cores espúrias (zebra/placas viravam manchas vermelhas e verdes no vidro)
  let L = F.sunDir.xyz; let H = normalize(L + V); let nl = sat(dot(N, L));
  let sh = sunShadow(in.wpos, N, in.pos.xy, nl);
  let spec = F.sunCol.rgb * nl * sh * fr * min(dGGX(sat(dot(N, H)), 0.003) * vSmith(nv, nl, 0.003), 14.0);
  var c = env * fr + spec;
  // espalhamento leitoso da lente
  c += (shIrr(N) + F.sunCol.rgb * nl * sh / PI) * milk;
  if (!ff) { c *= 0.35; }
  return vec4f(c, 0.0);
#endif
}
`;
