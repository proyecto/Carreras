'use strict';
WGSL["veg_common"] = `// Vegetación — animación de viento y utilidades comunes.
#include palette
const VEG_D0 = 90.0;   // Inicio/fin de transición malla → impostor (m)
const VEG_D1 = 112.0;
const VEG_U0 = 60.0;   // Sotobosque se atenúa entre U0 y U1
const VEG_U1 = 80.0;
const VEG_NT = 6.0;
const VEG_L0 = 26.0;   // Hojas individuales se atenúan entre L0 y L1
const VEG_L1 = 38.0;
// LOD por tamaño en pantalla: compensado por factor de zoom de la cámara.
// Distancias de transición escaladas por zoom.
fn vegZoom() -> f32 { return clamp(F.post.y * 2.0, 0.3, 1.25); }
// troca malha → impostor: cada árvore tem o seu limiar dentro da faixa [D0, D1] e uma janela pontilhada curta (5 m),
// en cada instante solo pocos árboles transicionan (evitando un tramado simultáneo en toda la masa boscosa)
// (conmutación neta sin bandas tramadas: se evita que una copa híbrida malla/impostor degrade la estética visual
// contra o céu onde as duas silhuetas não coincidem; uma árvore por vez trocando a ~100 m não se percebe)
fn vegFade(dEff: f32, seed: f32, d0: f32, d1: f32) -> f32 { let a = mix(d0, d1, fract(seed * 7.31 + 0.13)); return step(a, dEff); }
// Oscilación de viento en árbol: base, vector relativo al suelo,
// peso de rama (0 tronco .. 1 punta), oscilación de hojas y fase.
fn vegWind(base: vec3f, rel: vec3f, w: f32, fl: f32, ph: f32, time: f32) -> vec3f {
  let W = vec3f(F.wind.x, 0.0, F.wind.y); let S = F.wind.z; let X = vec3f(-F.wind.y, 0.0, F.wind.x);
  let p0 = base.x * 0.031 + base.z * 0.047;
  let gust = 0.55 + 0.45 * sin(time * 0.43 + p0) * sin(time * 0.71 + p0 * 1.7 + 1.3);
  let hb = rel.y * 0.05;
  var d = W * (hb * hb) * (0.16 + 0.34 * gust + 0.07 * sin(time * 1.31 + p0 * 3.0));
  let p1 = p0 * 5.0 + dot(rel, vec3f(0.37, 0.29, 0.41));
  d += (W * (0.35 * gust + 0.65 * sin(time * 1.7 + p1)) + X * 0.6 * sin(time * 2.3 + p1 * 1.3) + vec3f(0.0, 0.45, 0.0) * sin(time * 2.9 + p1 * 0.7)) * (w * w * 0.16);
  let p2 = ph * 40.0 + dot(rel, vec3f(2.1, 1.7, 2.6));
  d += (X * sin(time * 6.3 + p2) + vec3f(0.0, 0.7, 0.0) * sin(time * 7.9 + p2 * 1.4) + W * 0.5 * sin(time * 5.1 + p2 * 0.6)) * (fl * 0.035 * (0.5 + 0.8 * gust));
  return d * S;
}
// Dither estocástico temporal por píxel para bordes alfa y transiciones de LOD (integrado por TAA).

fn vegNoise(px: vec2f) -> f32 { return hash21(px + vec2f(F.misc.y * 17.13, F.misc.y * 31.71)); }
// Cobertura alfa suave de 1 píxel sin escalones de texel
fn vegCover(a: f32, thr: f32) -> f32 { return sat((a - thr) / clamp(fwidth(a), 0.02, 0.7) + 0.5); }
// Variación tonal por árbol: del verde esmeralda al oliva y tonos ocres/secos.

fn vegTint(seed: f32) -> vec3f {
  let a = fract(seed * 13.37 + 0.21); let b = fract(seed * 5.71 + 0.63); let l = fract(seed * 29.3 + 0.4);
  var c = mix(vec3f(0.72, 0.76, 0.62), vec3f(1.18, 1.0, 0.54), a * a * (3.0 - 2.0 * a));   // garrafa ↔ oliva-amarelado
  c = mix(c, vec3f(0.64, 0.68, 0.56), smoothstep(0.74, 0.92, b));                           // copas muy umbrías (~20%)
  c = mix(c, vec3f(1.3, 1.06, 0.56), smoothstep(0.11, 0.03, b) * 0.7);                    // amareladas (~8%)
  c = mix(c, vec3f(1.55, 0.74, 0.42), smoothstep(0.972, 0.995, a) * 0.8);                  // secas/avermelhadas (raras)
  return c * (0.8 + 0.42 * l);
}
// Tonalidad por arquetipo botánico
const VEG_SP = array<vec3f, 9>(vec3f(0.92, 0.94, 0.86), vec3f(1.06, 1.0, 0.78), vec3f(0.88, 0.9, 0.88), vec3f(1.12, 1.06, 0.66), vec3f(1.0, 1.06, 0.72),
  vec3f(1.0, 1.0, 0.74), vec3f(0.94, 0.96, 0.78), vec3f(1.0, 1.1, 0.7), vec3f(1.1, 1.04, 0.66));
fn vegTintA(seed: f32, arch: f32) -> vec3f { return vegTint(seed) * VEG_SP[u32(clamp(arch, 0.0, 8.0))]; }
const VEG_H = array<f32, 9>(20.5, 12.6, 27.9, 11.7, 8.5, 3.7, 1.8, 0.5, 1.2);   // Altura por arquetipo (m)
#ifdef PASS_SHADOW
// Proyección de sombras de árboles en cascadas de luz.

fn vegShadowCull(base: vec3f, h: f32) -> bool {
  let slot = P.camPos.w; if (slot > 3.5) { return false; }
  let lp = P.viewProj * vec4f(base + vec3f(0.0, h * 0.5, 0.0), 1.0);
  let inv = length(vec3f(P.viewProj[0][0], P.viewProj[1][0], P.viewProj[2][0]));   // 1 / raio da cascata
  let m = (h * 0.75 + 5.0) * inv;
  return abs(lp.x) > 1.0 + m || abs(lp.y) > 1.0 + m || lp.z > 1.02 || lp.z < -0.08;
}
// en cascadas 0 y 1 solo los árboles próximos al frustum usan malla; los lejanos proyectan desde impostores
// (cuja sombra já chega difusa) usam o cartão
fn vegShadowMesh(base: vec3f, fade: f32) -> bool {
  let slot = P.camPos.w; if (slot > 2.5 || fade >= 0.5) { return false; }
  let lp = P.viewProj * vec4f(base, 1.0);
  let inv = length(vec3f(P.viewProj[0][0], P.viewProj[1][0], P.viewProj[2][0]));
  let zr = 1.0 / max(length(vec3f(P.viewProj[0][2], P.viewProj[1][2], P.viewProj[2][2])), 1e-6);   // profundidade total da caixa (m)
  return abs(lp.x) < 1.0 + 20.0 * inv && abs(lp.y) < 1.0 + 20.0 * inv && (1.0 - lp.z) * zr < 2.0 / inv + 75.0;
}
#endif
`;
WGSL["veg_bake"] = `// Vegetación — horneado de impostores ortográficos en 8 azimuts.
struct BU { vp: mat4x4f }
@group(0) @binding(0) var<uniform> U: BU; // @dyn
@group(0) @binding(1) var tLeaf: texture_2d<f32>;
@group(0) @binding(2) var sLeaf: sampler;
@group(0) @binding(3) var tNoise: texture_2d<f32>;
struct VIn { @location(0) pos: vec3f, @location(1) nrm: vec4f, @location(2) uv: vec2f, @location(3) mat: vec4u, @location(4) col: vec4f }
struct V2F { @builtin(position) pos: vec4f, @location(0) nrm: vec3f, @location(1) uv: vec2f, @location(2) @interpolate(flat) mat: u32, @location(3) col: vec4f }
@vertex fn vs(in: VIn) -> V2F {
  var o: V2F; o.pos = U.vp * vec4f(in.pos, 1.0); o.nrm = in.nrm.xyz; o.uv = in.uv; o.mat = in.mat.x | (in.mat.z << 16u); o.col = in.col; return o;
}
struct BOut { @location(0) a: vec4f, @location(1) n: vec4f }
@fragment fn fs(in: V2F) -> BOut {
  var o: BOut; let n = normalize(in.nrm);
  if ((in.mat & 255u) == 1u) {
    let t = textureSample(tLeaf, sLeaf, in.uv);
    if (t.a < 0.25) { discard; }
    o.a = vec4f(t.rgb * in.col.rgb * mix(1.0, in.col.a, 0.75), smoothstep(0.25, 0.6, t.a));
    o.n = vec4f(n * 0.5 + 0.5, 1.0);
  } else {
    let bt = (in.mat >> 16u) & 255u;
    // casca: estrias verticais com contraste (o tronco do impostor não pode ler liso e claro)
    let k = (0.3 + 0.75 * smoothstep(0.3, 0.75, textureSample(tNoise, sLeaf, in.uv * vec2f(0.55, 0.11)).b)) * (0.7 + 0.5 * textureSample(tNoise, sLeaf, in.uv * vec2f(0.21, 0.07)).r);
    o.a = vec4f(in.col.rgb * k * 0.56 * mix(1.0, in.col.a, 0.75), 1.0);
    o.n = vec4f(n * 0.5 + 0.5, 0.0);
  }
  return o;
}
`;
WGSL["veg_tree"] = `// Vegetação — malhas de árvore/sub-bosque instanciadas (perto). Troca pontilhada para impostor ao longe.
#include veg_common
struct VIn { @location(0) pos: vec3f, @location(1) nrm: vec4f, @location(2) uv: vec2f, @location(3) mat: vec4u, @location(4) col: vec4f, @location(5) i0: vec4f, @location(6) i1: vec4f }
@group(3) @binding(0) var tLeaf: texture_2d<f32>;
@group(3) @binding(1) var sLeaf: sampler;
fn vert(in: VIn) -> VSOut {
  var o: VSOut;
  let base = in.i0.xyz; let s = in.i0.w; let c = in.i1.x; let sn = in.i1.y;
  let lp = in.pos * s; let rel = vec3f(lp.x * c - lp.z * sn, lp.y, lp.x * sn + lp.z * c);
  let ln = in.nrm.xyz; o.nrm = vec3f(ln.x * c - ln.z * sn, ln.y, ln.x * sn + ln.z * c);
  let d = distance(base.xz, F.camPos.xz) * vegZoom();   // distância efetiva (com o zoom da lente)
  let under = in.i1.w >= VEG_NT;
  var fade = vegFade(d, in.i1.z, VEG_D0, VEG_D1);
  if (under) { fade = vegFade(d, in.i1.z, VEG_U0, VEG_U1); }
  let fl = f32(in.mat.w) / 255.0; let ph = f32(in.mat.y) / 255.0;
  let t = F.wind.w;
  var wp = base + rel + vegWind(base, rel, in.nrm.w, fl, ph, t);
  var pp = base + rel + vegWind(base, rel, in.nrm.w, fl, ph, t - F.misc.x);
#ifdef PASS_SHADOW
  if ((!under && !vegShadowMesh(base, fade)) || fade >= 0.5 || vegShadowCull(base, VEG_H[u32(in.i1.w)] * s)) { wp = base; pp = base; }
#else
  if (fade >= 1.0) { wp = base; pp = base; }
#endif
  o.wpos = wp; o.pwpos = pp; o.uv = in.uv;
  o.mat = in.mat.x | (in.mat.y << 8u) | (in.mat.z << 16u) | (in.mat.w << 24u);
  let tint = vegTintA(in.i1.z, in.i1.w);
  // en proximidad, las hojas individuales cubren los quads: estos forman el núcleo sombreado de la copa
  let inner = select(1.0, mix(0.78, 1.0, smoothstep(VEG_L0 * 0.8, VEG_L1 * 1.5, d)), !under && in.i1.w != 3.0);
  o.col = vec4f(in.col.rgb * select(vec3f(1.0), tint * inner, in.mat.x == 1u), in.col.a);
  o.ext = vec4f(fade, in.i1.z, rel.y, d);
  return o;
}
fn leafAlpha(uv: vec2f) -> f32 { return textureSample(tLeaf, sLeaf, uv).a; }
fn surfAlpha(in: V2F) -> f32 {
  if (matId(in.mat) != 1u) { return 1.0; }
  return leafAlpha(in.uv) * 0.84;   // sombra ligeramente calada: pequeños intersticios de luz entre hojas
}
fn surf(in: V2F, ff: bool) -> Surface {
  let nz = vegNoise(in.pos.xy);
  // fração mantida do fragmento: troca de LOD (complementar ao impostor), sumiço perto da lente e cobertura da borda da folha,
  // tudo num único teste estocástico por pixel
  var keep = 1.0 - in.ext.x;
  let dcam = distance(in.wpos, F.camPos.xyz);
  // folhagem muito perto da lente some aos poucos (não vira polígono chapado na frente de uma câmera de TV)
  keep *= sat((dcam - 1.0) / 2.2);
  var s = surfDefault(normalize(in.nrm));
  if (matId(in.mat) == 1u) {
    let t = textureSample(tLeaf, sLeaf, in.uv);
    keep *= vegCover(t.a, 0.5);   // umbral elevado: copa más aireada (ramas y cielo visibles entre follaje)
    // quad próximo a la lente: se desvanece gradualmente preservando las hojas individuales
    if (in.ext.w < VEG_D0) { keep *= sat((dcam - 3.0) / 5.0); }
    if (keep <= nz) { discard; }
    let ao = in.col.a;
    // iluminación volumétrica en copa: normal volumétrica modulada por el plano del quad y microrrelieve foliar
    // para cada tufo pegar o sol de um jeito (massas claras e escuras em vez de mancha chapada)
    var geo = normalize(cross(dpdx(in.wpos), dpdy(in.wpos))); if (dot(geo, s.normal) < 0.0) { geo = -geo; }
    let dn = textureSample(tNoise, sLin, in.uv * 3.0 + in.ext.y * 13.0).rg - 0.5;
    let lum0 = dot(t.rgb, vec3f(0.3, 0.6, 0.1));
    s.normal = normalize(mix(s.normal, geo, 0.2) + vec3f(dn.x, (lum0 - 0.25) * 0.5, dn.y) * 0.26);
    // hojas en cara opuesta de la copa (normal orientada lejos de la cámara): se aprecia el envés foliar
    // no expuesto al sol directo — solo luz transmitida. Se invierte la normal para coherencia a contraluz.
    let Vd = normalize(F.camPos.xyz - in.wpos); let nvd = dot(s.normal, Vd);
    if (nvd < 0.0) { s.normal = normalize(s.normal - Vd * (nvd * 1.7)); }
    // núcleo interior más umbrío (auto-sombra volumétrica), periferia más luminosa
    // verde forestal denso de baja saturación (tono por especie de árbol); variaciones a escala de mata
    // (ruído celular): tufos claros e escuros lado a lado dão leitura de folhagem a média distância, em vez de mancha lisa
    var lc = t.rgb * in.col.rgb * vec3f(0.57, 0.64, 0.33);   // verde natural, saturação moderada
    let cell = textureSample(tNoise, sLin, in.uv * 1.6 + in.ext.y * 7.0).b; let cell2 = textureSample(tNoise, sLin, in.uv * 0.55 + in.ext.y * 3.0).r;
    lc *= (0.74 + 0.5 * cell) * (0.78 + 0.44 * cell2);   // variação contínua (sem degrau: degraus liam como copa posterizada)
    lc = mix(lc, lc * vec3f(1.2, 1.1, 0.72), smoothstep(0.62, 0.9, cell2) * ao * 0.4);   // pontas ao sol puxam para o verde-amarelado
    // núcleo de la copa: verde umbrío no nulo (~60% del albedo exterior; resto modulado por oclusión)
    s.albedo = lc * mix(0.62, 1.0, ao * ao);
    // a corta distancia los quads forman el interior sombrío bajo las hojas geométricas
    let nearK = smoothstep(VEG_L0 * 0.8, VEG_L1 * 1.5, in.ext.w);
    // translucidez (subsurface): hojas perimetrales atravesadas por el sol adquieren tono verde vivo a contraluz
    // (o passe de luz devolve ~1,7 × sss do sol de frente: ~20% atravessa)
    s.sss = (0.26 + 0.12 * sat(-nvd * 2.0)) * (0.12 + 0.88 * ao * ao) * mix(0.45, 1.0, nearK);
    // contraluz: mirando hacia el sol, las hojas periféricas adquieren reflejo verde-dorado
    let back = smoothstep(0.15, 0.8, dot(-Vd, F.sunDir.xyz)) * ao * ao;
    s.albedo = mix(s.albedo, s.albedo * vec3f(1.28, 1.22, 0.66), back * 0.7);
    // dispersión luminosa periférica: resplandor dorado en hojas exteriores contra la fuente solar
    // (evita auto-oclusión excesiva; radiancia = albedo × emissive × 16 ≈ 25% de la luz solar directa)
    s.emissive = 0.05 * smoothstep(0.35, 0.9, dot(-Vd, F.sunDir.xyz)) * ao * ao * ao * smoothstep(1.5, 5.0, in.ext.z);
    // brillo especular: cutícula cerosa brillante en ciertas hojas; el resto mate
    s.rough = mix(0.95, 0.7, smoothstep(0.7, 0.85, cell) * ao); s.ao = max(ao, 0.58) * mix(0.88, 1.0, nearK);
    // face de trás da folha: um pouco mais clara e fosca
    if (!ff) { s.albedo *= vec3f(1.06, 1.08, 0.94); s.rough = 0.98; }
  } else {
    if (keep <= nz) { discard; }
    let bt = (in.mat >> 16u) & 255u; let N = s.normal;
    // casca em duas escalas: sulcos verticais fundos (ruído celular esticado) + placas/escamas finas; relevo pelo gradiente da altura
    var sc = vec2f(0.55, 0.11); var depth = 1.0;
    if (bt == 1u) { sc = vec2f(0.34, 0.42); depth = 0.42; } if (bt == 2u) { sc = vec2f(0.5, 1.4); depth = 0.7; }
    let wr = textureSample(tNoise, sLin, in.uv * vec2f(0.21, 0.07)).rg;
    let q = in.uv * sc + wr * 0.09; let e = 0.004;
    let q2 = in.uv * sc * vec2f(3.1, 2.3) + wr.yx * 0.05;
    let h0 = textureSample(tNoise, sLin, q).b * 0.72 + textureSample(tNoise, sLin, q2).b * 0.28;
    let hx = textureSample(tNoise, sLin, q + vec2f(e, 0.0)).b * 0.72 + textureSample(tNoise, sLin, q2 + vec2f(e * 3.1, 0.0)).b * 0.28;
    let hy = textureSample(tNoise, sLin, q + vec2f(0.0, e)).b * 0.72 + textureSample(tNoise, sLin, q2 + vec2f(0.0, e * 2.3)).b * 0.28;
    let g = vec2f(hx - h0, hy - h0) / e * 0.034 * depth;
    let dp1 = dpdx(in.wpos); let dp2 = dpdy(in.wpos); let du1 = dpdx(q); let du2 = dpdy(q);
    let p2 = cross(dp2, N); let p1 = cross(N, dp1);
    let T = p2 * du1.x + p1 * du2.x; let B = p2 * du1.y + p1 * du2.y; let im = inverseSqrt(max(max(dot(T, T), dot(B, B)), 1e-12));
    let fd = sat(1.25 - in.ext.w / 70.0);
    s.normal = normalize(N - (T * g.x + B * g.y) * im * fd);
    // sulco escuro (h0 baixo) × crista clara: contraste forte para o relevo aparecer também na sombra
    let ridge = smoothstep(0.28, 0.72, h0);
    var k = mix(1.0, mix(0.16, 1.45, ridge), 0.5 + 0.5 * depth) * (0.6 + 0.8 * wr.x);
    // vetas verticales estilizadas y oscurecimiento basal junto al suelo (humedad y tierra)
    let vein = textureSample(tNoise, sLin, in.uv * vec2f(1.9, 0.05)).g;
    k *= mix(0.68, 1.14, smoothstep(0.35, 0.62, vein)) * mix(0.5, 1.0, smoothstep(0.0, 1.8, in.ext.z));
    if (bt == 2u) { k *= 0.72 + 0.28 * smoothstep(0.08, 0.2, abs(fract(in.uv.y * 2.6) - 0.5)); }
    if (bt == 1u) { // casca lisa: manchas claras de líquen e anéis horizontais discretos
      let pt = textureSample(tNoise, sLin, in.uv * vec2f(0.33, 0.12) + 0.4).r;
      k *= mix(0.82, 1.3, smoothstep(0.5, 0.66, pt)) * (0.9 + 0.1 * smoothstep(0.1, 0.25, abs(fract(in.uv.y * 1.3 + wr.x) - 0.5)));
    }
    // musgo/liquens perto da base e nas faces voltadas para cima
    let moss = smoothstep(0.46, 0.7, wr.y + (1.0 - sat(in.ext.z * 0.2)) * 0.26 + sat(N.y) * 0.25) * 0.6;
    // variação de cor ao longo do tronco (faixas mais avermelhadas e mais cinzentas) + musgo
    let hue = textureSample(tNoise, sLin, in.uv * vec2f(0.13, 0.031) + 0.7).g;
    s.albedo = mix(in.col.rgb * mix(vec3f(1.12, 0.92, 0.78), vec3f(0.86, 0.98, 1.1), smoothstep(0.3, 0.7, hue)) * k * 0.56, vec3f(0.07, 0.1, 0.03) * (0.6 + 0.8 * h0), moss);
    s.rough = 0.88; s.ao = in.col.a * mix(1.0, 0.4 + 0.6 * ridge, depth) * mix(0.55, 1.0, smoothstep(0.0, 0.9, in.ext.z));
  }
  return s;
}
`;
WGSL["veg_leaf"] = `// Vegetação — camada de folhas individuais (só de perto): um quad por folha; contorno e nervuras calculados no shader
// a partir de (u ao longo da folha, v através), então a borda fica nítida em qualquer ampliação (sem textura borrada).
// Con la distancia cada hoja se repliega hacia su peciolo y se desvanece sin saltos bruscos.
#include veg_common
struct VIn { @location(0) pos: vec3f, @location(1) off: vec4f, @location(2) nrm: vec4f, @location(3) uvx: vec4u, @location(4) col: vec4f, @location(5) i0: vec4f, @location(6) i1: vec4f }
fn vert(in: VIn) -> VSOut {
  var o: VSOut;
  let base = in.i0.xyz; let s = in.i0.w; let c = in.i1.x; let sn = in.i1.y;
  let zoom = vegZoom();
  let lb = (in.pos - in.off.xyz * 0.6) * s;                                   // base da folha (espaço da árvore)
  let relb = vec3f(lb.x * c - lb.z * sn, lb.y, lb.x * sn + lb.z * c);
  let dl = distance(base + relb, F.camPos.xyz) * zoom;
  // cada hoja se desvanece a una distancia individual (fase alta = mayor cercanía): copa gradual de 23 a 61 m
  let rk = mix(1.6, 0.6, f32(in.uvx.z) / 255.0);
  let k = 1.0 - smoothstep(VEG_L0 * rk, VEG_L1 * rk, dl);
  let lp = (in.pos - in.off.xyz * (0.6 * (1.0 - k))) * s;
  let rel = vec3f(lp.x * c - lp.z * sn, lp.y, lp.x * sn + lp.z * c);
  let ln = in.nrm.xyz; o.nrm = vec3f(ln.x * c - ln.z * sn, ln.y, ln.x * sn + ln.z * c);
  let fl = in.nrm.w; let ph = f32(in.uvx.z) / 255.0; let t = F.wind.w;
  var wp = base + rel + vegWind(base, rel, in.off.w, fl, ph, t);
  var pp = base + rel + vegWind(base, rel, in.off.w, fl, ph, t - F.misc.x);
  if (k <= 0.0) { wp = base; pp = base; }
  o.wpos = wp; o.pwpos = pp;
  o.uv = vec2f(f32(in.uvx.x) / 255.0, f32(in.uvx.y) / 127.5 - 1.0);
  o.mat = 2u | (u32(in.col.a * 255.0 + 0.5) << 8u);
  o.col = vec4f(in.col.rgb * 2.0 * vegTintA(in.i1.z, in.i1.w), f32(in.uvx.w) / 255.0);
  o.ext = vec4f(k, in.i1.z, rel.y, dl);
  return o;
}
// meia largura da folha em u (0 = base, 1 = ponta), normalizada: > |v| = dentro
fn leafHalf(u: f32, t: u32) -> f32 {
  let uu = clamp(u, 0.0, 1.0);
  if (t == 1u) { return pow(sin(3.14159 * pow(uu, 0.6)), 0.6); }       // oval arredondada
  if (t == 2u) { return pow(sin(3.14159 * pow(uu, 0.8)), 0.85); }      // lanceolada
  return pow(sin(3.14159 * pow(uu, 0.68)), 0.75);                      // elíptica de ponta aguda
}
fn surfAlpha(in: V2F) -> f32 { return select(0.0, 1.0, leafHalf(in.uv.x, (in.mat >> 8u) & 255u) > abs(in.uv.y)); }
fn surf(in: V2F, ff: bool) -> Surface {
  let u = in.uv.x; let v = in.uv.y; let ty = (in.mat >> 8u) & 255u;
  let w = leafHalf(u, ty);
  // borda analítica com ~1 pixel de transição estocástica (o TAA resolve em borda lisa)
  let ed = (w - abs(v)) / max(fwidth(v) + fwidth(w), 1e-4);
  if (ed + 0.5 <= vegNoise(in.pos.xy + 7.0)) { discard; }
  // folhagem muito perto da lente some aos poucos
  let dcam = distance(in.wpos, F.camPos.xyz);
  if (dcam < 3.2 && vegNoise(in.pos.xy) >= sat((dcam - 1.0) / 2.2)) { discard; }
  var s = surfDefault(normalize(in.nrm));
  // envés de la hoja: orientado hacia la cámara; la luz posterior incide únicamente como dispersión subsuperficial
  let Vd = normalize(F.camPos.xyz - in.wpos); let nvd = dot(s.normal, Vd);
  if (nvd < 0.0) { s.normal = normalize(s.normal - Vd * (nvd * 1.7)); }
  let ao = in.col.a; let near = sat(1.0 - in.ext.w / 16.0);
  // nervura central clara + nervuras laterais em espinha (somem com a distância para não cintilar)
  let mid = (1.0 - smoothstep(0.035, 0.08 + fwidth(v) * 1.5, abs(v))) * 0.55;
  let vp = abs(fract(u * 7.0 - abs(v) * 1.7) - 0.5);
  let veins = (1.0 - smoothstep(0.04, 0.1 + fwidth(u) * 9.0, vp)) * 0.22 * near * smoothstep(0.06, 0.2, abs(v));
  // verde mais escuro junto à nervura e à base, pontas e bordas um pouco mais claras
  var alb = vec3f(0.062, 0.076, 0.029) * in.col.rgb * (0.78 + 0.34 * u) * (0.9 + 0.16 * sat(abs(v) / max(w, 0.05)));
  alb = mix(alb, alb * vec3f(1.55, 1.5, 1.25) + 0.004, max(mid, veins));
  // hojas con cutícula brillante y mayoría mate; translucidez en hojas periféricas
  s.rough = mix(0.92, 0.66, step(0.78, fract(in.col.a * 37.3 + in.ext.y * 11.1))); s.ao = max(ao, 0.5);
  s.sss = (0.3 + 0.12 * sat(-nvd * 2.0)) * (0.12 + 0.88 * ao * ao);
  let back = smoothstep(0.15, 0.8, dot(-Vd, F.sunDir.xyz)) * ao * ao;   // contraluz: folha atravessada pelo sol, verde-amarelada
  alb = mix(alb, alb * vec3f(1.16, 1.12, 0.78), back * 0.6);
  s.emissive = 0.05 * smoothstep(0.35, 0.9, dot(-Vd, F.sunDir.xyz)) * ao * ao * ao * smoothstep(1.5, 5.0, in.ext.z);   // luz atravessando (ver veg_tree)
  if (!ff) { alb = alb * vec3f(1.06, 1.08, 0.95) + 0.002; s.rough = 0.92; }   // envés: ligeramente más claro y difuso
  s.albedo = alb * (0.7 + 0.3 * ao);
  return s;
}
`;
WGSL["veg_imp"] = `// Vegetação — impostores: um cartão por árvore, virado para a câmera (ou para o sol nos passes de sombra),
// com atlas de 8 azimutes por arquétipo (albedo+alfa e normal+máscara de folha), iluminado no G-buffer.
#include veg_common
struct VIn { @builtin(vertex_index) vi: u32, @location(5) i0: vec4f, @location(6) i1: vec4f }
struct ImpU { a: array<vec4f, 12> }   // por arquétipo: (meia largura, altura, _, _)
@group(3) @binding(0) var tImpA: texture_2d_array<f32>;
@group(3) @binding(1) var tImpN: texture_2d_array<f32>;
@group(3) @binding(2) var sImp: sampler;
@group(3) @binding(3) var<uniform> IU: ImpU;
fn vert(in: VIn) -> VSOut {
  var o: VSOut;
  let base = in.i0.xyz; let s = in.i0.w; let c = in.i1.x; let sn = in.i1.y; let arch = in.i1.w;
  let ai = u32(arch); let dim = IU.a[min(ai, 11u)];
  let slot = P.camPos.w;
  let d = distance(base.xz, F.camPos.xz) * vegZoom();   // distância efetiva (com o zoom da lente)
  var fade = vegFade(d, in.i1.z, VEG_D0, VEG_D1);
  var kill = arch >= VEG_NT;
#ifdef PASS_GBUF
  var h = P.camPos.xz - base.xz;
  if (fade <= 0.0) { kill = true; }
#endif
#ifdef PASS_SHADOW
  var h = F.sunDir.xz;
  if (vegShadowMesh(base, fade)) { kill = true; }
  if (vegShadowCull(base, dim.y * s)) { kill = true; }
  fade = 1.0;
#endif
#ifdef PASS_CUBE
  var h = P.camPos.xz - base.xz;
  fade = 1.0;
  if (distance(base.xz, P.camPos.xz) > 700.0) { kill = true; }
#endif
  h = normalize(h);
  let right = vec3f(h.y, 0.0, -h.x);
  let cx = f32(in.vi & 1u) * 2.0 - 1.0; let cy = f32(in.vi >> 1u);
  var wp = base + right * (cx * dim.x * s) + vec3f(0.0, cy * dim.y * s, 0.0);
#ifdef PASS_SHADOW
  wp -= vec3f(F.sunDir.x, 0.0, F.sunDir.z) * (dim.x * s * 0.55);   // sesgo solar: evita auto-sombra excesiva en la copa
#endif
  if (kill) { wp = base; }
  // quadro do atlas: ângulo da direção câmera→árvore no espaço local da árvore
  let hl = vec2f(h.x * c + h.y * sn, -h.x * sn + h.y * c);
  let f = fract(atan2(hl.y, hl.x) / 6.2831853 + 1.0) * 8.0;
  o.wpos = wp; o.pwpos = wp;
  o.nrm = vec3f(c, sn, fract(f));
  o.uv = vec2f(cx * 0.5 + 0.5, 1.0 - cy);
  o.mat = ai | (u32(floor(f)) << 8u);
  o.col = vec4f(vegTintA(in.i1.z, arch), 1.0);
  o.ext = vec4f(fade, d, 0.0, 0.0);
  return o;
}
fn impLayers(in: V2F) -> vec2i {
  let f0 = (in.mat >> 8u) & 255u; let b = (in.mat & 255u) * 8u;
  return vec2i(i32(b + f0), i32(b + ((f0 + 1u) & 7u)));
}
fn surfAlpha(in: V2F) -> f32 {
  let L = impLayers(in);
  // sombra de copa con silueta foliar: canal alfa horadado por ruido celular (claros de luz interfoliares)
  // desfiada) em vez da silhueta maciça do cartão. Uma amostra só, com o amostrador simples (este passe tem muita sobreposição).
  let a = textureSampleBias(tImpA, sImp, in.uv, select(L.x, L.y, in.nrm.z > 0.5), 0.3).a + 0.06;
  let n = textureSampleLevel(tNoise, sImp, in.uv * 6.0 + f32(L.x) * 0.37, 0.0).b;
  return a * (0.52 + 0.6 * smoothstep(0.3, 0.62, n));
}
fn surf(in: V2F, ff: bool) -> Surface {
  let nz = 1.0 - vegNoise(in.pos.xy);   // complementar ao da malha: na troca de LOD cada pixel é de um ou de outro
  // mistura os dois azimutes vizinhos do atlas (a silhueta se transforma aos poucos)
  let L = impLayers(in); let t = smoothstep(0.15, 0.85, in.nrm.z);
  let a = mix(textureSample(tImpA, sImp, in.uv, L.x), textureSample(tImpA, sImp, in.uv, L.y), t);
  // quanto o atlas está ampliado na tela (lente longa): 0 = 1 texel por pixel ou menos, 1 = muito ampliado
  let tpp = max(fwidth(in.uv.x), fwidth(in.uv.y)) * 512.0; let mag = sat(1.0 - tpp);
  // ampliado, o atlas borrado vira mancha: quebra a silhueta e o tom com ruído na escala de folha
  let dn = textureSample(tNoise, sLin, in.uv * 7.0 + f32(L.x) * 0.37);
  let dn2 = textureSample(tNoise, sLin, in.uv * 19.0 + f32(L.x) * 0.11);
  // a gran distancia los mipmaps estilizan la copa: compensación de umbral alfa
  let thr = 0.5 - 0.22 * smoothstep(120.0, 600.0, in.ext.y);
  let aa = a.a + (dn.r * 0.6 + dn2.g * 0.4 - 0.5) * 0.5 * mag * smoothstep(0.05, 0.4, a.a) * (1.0 - smoothstep(0.75, 1.0, a.a));
  if (vegCover(aa, thr) * in.ext.x <= nz) { discard; }
  let nt = mix(textureSample(tImpN, sImp, in.uv, L.x), textureSample(tImpN, sImp, in.uv, L.y), t);
  var nl = nt.xyz * 2.0 - 1.0; let c = in.nrm.x; let sn = in.nrm.y;
  nl += vec3f(dn.g - 0.5, dn2.r - 0.5, dn.b - 0.5) * (0.2 + 0.3 * mag) * nt.a;
  // normales suavizadas a distancia (tratamiento de copa como volumen continuo)
  let far = smoothstep(90.0, 450.0, in.ext.y);
  nl = normalize(mix(nl, vec3f(nl.x * 0.5, abs(nl.y) * 0.5 + 0.6, nl.z * 0.5), far * 0.7));
  var s = surfDefault(normalize(vec3f(nl.x * c - nl.z * sn, nl.y, nl.x * sn + nl.z * c)));
  // inversión de normal en envés foliar contra observador para coherencia en iluminación
  let Vd = normalize(F.camPos.xyz - in.wpos); let nvd = dot(s.normal, Vd);
  if (nvd < 0.0) { s.normal = normalize(s.normal - Vd * (nvd * 1.7)); }
  // mesmo tom da malha (ver veg_tree.wgsl), com variação de massa clara/escura na escala de tufo
  // 0,69 ≈ modulación media de follaje en malla (ruido celular × núcleo sombrío) para paridad de tono
  var lc = a.rgb * mix(vec3f(0.8), in.col.rgb * vec3f(0.57, 0.64, 0.33) * 0.74, nt.a);
  // tufos claros e escuros (mesma ideia da malha), que somem ao longe
  let tuft = (0.66 + 0.68 * smoothstep(0.25, 0.8, dn.b)) * (0.8 + 0.4 * dn2.r);
  s.albedo = lc * mix(1.0, tuft, nt.a * (1.0 - 0.6 * far)) * mix(1.0, 0.85, far * nt.a);
  // translucidez mais forte na borda da silhueta (cobertura borrada baixa), menor ao longe; folhagem fosca
  let ab = textureSampleBias(tImpA, sImp, in.uv, L.x, 3.0).a;
  let edge = 1.0 - smoothstep(0.5, 0.92, ab);
  s.sss = 0.24 * nt.a * mix(0.3, 1.0, edge) * mix(1.0, 0.4, far);
  let back = smoothstep(0.15, 0.8, dot(-Vd, F.sunDir.xyz)) * edge * nt.a * (1.0 - 0.6 * far);
  s.albedo = mix(s.albedo, s.albedo * vec3f(1.28, 1.22, 0.66), back * 0.7);
  s.emissive = 0.04 * back;   // dispersión subsuperficial en contorno de copa
  s.rough = mix(0.9, 0.95, nt.a) + 0.04 * far; s.ao = mix(1.0, 0.8, far * (1.0 - edge));
  return s;
}
`;
WGSL["veg_grass"] = `// Vegetação — grama: lâminas geradas na GPU em anéis centrados na câmera (sem buffers de vértice).
// Cada instância = uma lâmina numa célula da grade (posição por hash da célula, estável no mundo).
#include veg_common
struct VIn { @builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32 }
struct GrassU { p: vec4f, q: vec4f, r: vec4f, s: vec4f, t: vec4f, u: vec4f }   // s = (porta da lente longa, meio lado do anel, centro xz) | t = (zoom, meio lado do anel anterior, centro xz do anterior)   // p = (célula m, células/bloco, blocos/lado, segmentos) | q = fades (entra0, entra1, sai0, sai1) | r = (largura, anel, origemX, origemZ em blocos)
@group(3) @binding(0) var tForest: texture_2d<f32>;
@group(3) @binding(1) var<uniform> GR: GrassU; // @dyn
@group(3) @binding(2) var tLeaf: texture_2d<f32>;
fn grassWind(xz: vec2f, time: f32) -> vec2f {
  let W = F.wind.xy; let ph = dot(xz, W) * 0.22 - time * 1.6;
  let g = 0.5 + 0.5 * sin(ph) * sin(ph * 0.37 + xz.x * 0.05 + 1.7) + 0.25 * sin(time * 3.1 + xz.x * 1.3 + xz.y * 0.9);
  return W * (0.12 + 0.3 * g) * F.wind.z + vec2f(-W.y, W.x) * 0.06 * sin(time * 2.3 + xz.y * 0.8) * F.wind.z;
}
fn vert(in: VIn) -> VSOut {
  var o: VSOut;
  let cell = GR.p.x; let bs = u32(GR.p.y); let B = u32(GR.p.z); let K = u32(GR.p.w); let ring = GR.r.y;
  let b = in.ii / (bs * bs); let l = in.ii % (bs * bs);
  let cxz = vec2f(f32((b % B) * bs + l % bs), f32((b / B) * bs + l / bs)) + GR.r.zw * f32(bs);
  let h = hash22(cxz + ring * 37.0); let h2 = hash22(cxz * 1.37 + 11.3 + ring * 5.0);
  // tufos (K = 0): tremor de até uma célula inteira para cada lado — a grade some; lâminas: tremor dentro da célula
  let xz = (cxz + select(select(h, h * 1.9 - 0.45, ring > 0.5), h * 2.4 - 0.7, K == 0u)) * cell;
  let dW = distance(xz, F.camPos.xz);
  // distância efetiva: com lente longa (câmera de TV) o gramado distante é visto ampliado — vale a distância × zoom
  let d = dW * GR.t.x;
  // cobertura deste anel (some antes da borda da grade) e do anel anterior (este aparece onde o anterior não cobre)
  let eS = max(abs(xz.x - GR.s.z), abs(xz.y - GR.s.w)) / GR.s.y; let extS = 1.0 - smoothstep(0.8, 0.97, eS);
  var extP = 0.0; if (GR.t.y > 0.0) { let eP = max(abs(xz.x - GR.t.z), abs(xz.y - GR.t.w)) / GR.t.y; extP = 1.0 - smoothstep(0.8, 0.97, eP); }
  let z = wmZone(xz);
  // a divisa aparada/rústica não é uma régua: ruído (só dentro da faixa de transição) recorta a borda em línguas e tufos soltos
  let bn = (textureSampleLevel(tNoise, sLin, xz * 0.071, 0.0).r - 0.5) * 0.9 + (h2.x - 0.5) * 0.35;
  let dEdge = z.r * 32.0 - 8.0; let tall = smoothstep(0.12, 0.6, z.b + bn * 4.0 * z.b * (1.0 - z.b));
  let forest = textureSampleLevel(tForest, sClamp, (xz - F.wm.xy + 1.0) / (vec2f(textureDimensions(tForest)) * 2.0), 0.0).r;
  let patchN = textureSampleLevel(tNoise, sLin, xz * 0.013, 0.0).rg;
  var ok = wmIn(xz) && dEdge > 1.5 && z.g < 0.485 && z.a < 0.48 && h2.y > forest * 0.75;
  // altura: segada junto a la cinta asfáltica; crecida y en matas en terreno rústico y sotobosque
  let clump = smoothstep(0.25, 0.7, patchN.x) * 0.8 + 0.35;
  // (a aparada cresce um pouco com a distância: a 40–70 m a lâmina ainda tem 3–5 pixels de altura e dá relevo ao gramado)
  var ht = mix((0.07 + 0.075 * h2.x) * (1.0 + 0.35 * sat(d / 22.0) + 0.9 * sat((d - 24.0) / 40.0)), (0.34 + 0.5 * h2.x * h2.x + 0.25 * h.y) * clump, tall);
  ht *= mix(1.0, 0.5, forest) * smoothstep(1.5, 2.7, dEdge);
  var fade = max(smoothstep(GR.q.x, GR.q.y, d), 1.0 - extP) * (1.0 - smoothstep(GR.q.z, GR.q.w, d)) * extS;
  if (K == 0u) {
    // touceiras em moitas irregulares: manchas sem tufo (ruído de baixa frequência) + falhas ao acaso
    let cl = textureSampleLevel(tNoise, sLin, xz * 0.023 + ring * 0.21, 0.0).g;
    // nos anéis distantes (encostas vistas de longe ou pela lente longa) a cobertura é quase contínua: encosta lisa lia como
    // terreno sem vegetação; de perto ficam as moitas com falhas
    let farR = step(2.5, ring);
    fade *= tall * GR.s.x * smoothstep(mix(0.3, 0.12, farR), mix(0.5, 0.3, farR), cl + (h2.x - 0.5) * 0.3);
    if (hash21(cxz * 2.71 + ring * 3.3) < mix(0.3, 0.08, farR)) { ok = false; }
  }
  if (ring > 4.5) { fade *= 1.0 - smoothstep(0.25, 0.6, tall); }   // anel distante de lâminas: só a grama aparada (a alta é das touceiras)
  ht *= fade;
  if (ht < 0.012) { ok = false; }
  // junto à pista o mapa de alturas fica até 0,3 m abaixo do acostamento (ver terrainH): a superfície visível é o máximo entre
  // o acostamento (plano da pista, caindo depois de 1,62 m) e o terreno
  let tDy = -0.3 * (1.0 - smoothstep(0.2, 2.2, dEdge)); let aDy = -0.07 * sat((dEdge - 1.62) / 0.48) - 0.48 * sat((dEdge - 2.1) / 0.5);
  let y0 = wmHeight(xz) - tDy + max(aDy, tDy);
  let base = vec3f(xz.x, y0 - 0.01, xz.y);
  if (!ok) { o.wpos = base; o.pwpos = base; o.nrm = vec3f(0.0, 1.0, 0.0); o.uv = vec2f(0.0); o.mat = 0u; o.col = vec4f(0.0); o.ext = vec4f(0.0); return o; }
  let w1 = grassWind(xz, F.wind.w); let w0 = grassWind(xz, F.wind.w - F.misc.x);
  let patchD = sat(patchN.y * 1.6 - 0.45 + h2.x * 0.3) * tall;
  if (K == 0u) {
    // tufo: cartão em pé com a touceira do atlas (muitas lâminas finas e curvas de alturas variadas)
    let cx = f32(in.vi & 1u) * 2.0 - 1.0; let cy = f32(in.vi >> 1u);
    let yawc = h.x * 6.2831853; var fw = vec2f(cos(yawc), sin(yawc));
    // gira parcialmente para a câmera (sem virar "billboard" puro)
    let tc = normalize(F.camPos.xz - xz); let sdc = normalize(mix(vec2f(-fw.y, fw.x), vec2f(-tc.y, tc.x) * sign(dot(vec2f(-fw.y, fw.x), vec2f(-tc.y, tc.x)) + 1e-4), 0.55));
    // variantes: touceira inteira ou só a metade esquerda/direita do ladrilho (três formas, espelháveis), tamanhos bem variados
    let v1 = hash21(cxz * 0.731 + 4.1 + ring); let v2 = hash21(cxz * 1.913 + 9.7);
    let cu = select(0.5, select(0.31, 0.69, v2 > 0.5), v1 < 0.6); let hu = select(0.47, 0.29, v1 < 0.6);
    let hc = ht * 1.25 * (0.45 + 1.05 * h2.y * h2.y) * select(1.0, 1.5, ring > 2.5) * select(1.0, 1.2, ring > 3.5); let wc = GR.r.x * (0.5 + 1.1 * h.y) * (0.6 + 0.5 * sat(hc)) * (hu / 0.47 * 0.8 + 0.2);
    let sway = (fw * (0.1 + 0.25 * h.y)) * hc * cy;
    o.wpos = base + vec3f(sdc.x, 0.0, sdc.y) * (cx * wc) + vec3f(0.0, hc * cy, 0.0) + vec3f(sway.x + w1.x * hc * cy, 0.0, sway.y + w1.y * hc * cy);
    o.pwpos = base + vec3f(sdc.x, 0.0, sdc.y) * (cx * wc) + vec3f(0.0, hc * cy, 0.0) + vec3f(sway.x + w0.x * hc * cy, 0.0, sway.y + w0.y * hc * cy);
    o.nrm = normalize(vec3f(fw.x * 0.25, 1.0, fw.y * 0.25));
    // pontas verdes (um pouco mais claras que a grama aparada), só as manchas secas puxam para o palha — nada de amarelo estourado
    let tipT = mix(mix(COL_GRASS * 1.25, vec3f(0.088, 0.142, 0.036), tall), vec3f(0.15, 0.15, 0.058), patchD * 0.4);
    var cc = mix(COL_GRASS_ROOT * 1.3, tipT, smoothstep(0.0, 0.9, cy)) * (0.66 + 0.6 * h.y) * mix(vec3f(0.74, 0.84, 0.86), vec3f(1.26, 1.1, 0.66), v2);   // cada touceira com o seu tom (do verde-escuro ao oliva)
    o.col = vec4f(cc, mix(0.22, 1.0, sqrt(cy)) * mix(1.0, 0.6, forest));
    // ladrilho 5 do atlas (touceira): colunas 4x2 → (1, 1)
    o.uv = vec2f((1.0 + (cu + hu * cx * select(1.0, -1.0, h2.x > 0.5))) / 4.0, (1.0 + (1.0 - cy) * 0.985 + 0.006) / 2.0);
    o.mat = 1u; o.ext = vec4f(tall, cy, 0.0, d);
    return o;
  }
  let lvl = min(in.vi >> 1u, K); let side = f32(in.vi & 1u) * 2.0 - 1.0; let tip = (in.vi >> 1u) >= K;
  let t = f32(lvl) / f32(K);
  let yaw = h.x * 6.2831853 + h2.y * 3.0; let fwd = vec2f(cos(yaw), sin(yaw)); let sd = vec2f(-fwd.y, fwd.x);
  // largura: nunca menor que ~0,9 pixel na base (alarga com a distância × zoom; lâmina subpixel cintilaria e sumiria)
  let pxw = dW * 2.0 * F.post.y / F.screen.y;
  let wid = max(GR.r.x * (0.65 + 0.7 * h2.y) * mix(1.35, 1.3, tall), pxw * 0.9) * (1.0 - 0.92 * pow(t, 1.6));   // lâminas finas (a aparada era um triângulo largo)
  let lean = (0.12 + 0.5 * h.y * h.y) * mix(1.6, 1.0, tall);
  let bend = fwd * lean; let t2 = t * t;
  var off = vec3f(sd.x, 0.0, sd.y) * (wid * select(side, 0.0, tip));
  let up = vec3f(0.0, ht * t * (1.0 - 0.18 * t2 * (lean + length(w1))), 0.0);
  let stiff = mix(0.45, 1.0, tall);
  o.wpos = base + up + off + vec3f(bend.x + w1.x * stiff, 0.0, bend.y + w1.y * stiff) * (ht * t2);
  o.pwpos = base + up + off + vec3f(bend.x + w0.x * stiff, 0.0, bend.y + w0.y * stiff) * (ht * t2);
  // normal: quase para cima, puxada pela face da lâmina e pela inclinação
  o.nrm = normalize(vec3f(fwd.x * 0.35 * side + bend.x * t, 1.0, fwd.y * 0.35 * side + bend.y * t));
  // cor: raiz escura → verde → ponta (seca na grama alta), com manchas
  let dry = patchD;
  let tipC = mix(mix(COL_GRASS * 1.25, vec3f(0.088, 0.142, 0.036), tall), vec3f(0.15, 0.15, 0.058), dry * 0.4);
  let midC = mix(COL_GRASS, COL_GRASS * vec3f(1.0, 0.95, 0.8), tall * 0.5);
  let tk = 0.35;
  // grama aparada: raiz quase da cor do gramado (o tapete de lâminas emenda com a textura do terreno em vez de ficar escuro)
  let rootC = mix(mix(COL_GRASS_ROOT, COL_GRASS, 0.7), COL_GRASS_ROOT, tall);
  var c = mix(rootC, midC, smoothstep(0.0, 0.45, t)); c = mix(c, tipC, smoothstep(tk, 1.0, t));
  c *= 0.78 + 0.44 * h.y;
  c *= mix(vec3f(0.8, 0.9, 0.86), vec3f(1.22, 1.1, 0.72), sat(patchN.x * 1.5 - 0.3 + (h2.y - 0.5) * 0.5));   // manchas de tom (verde-escuro ↔ verde-amarelado) e variação tufo a tufo
  c *= mix(0.88, 1.0, tall);   // a aparada um pouco mais escura: emenda com a textura do gramado quando as lâminas acabam
  o.col = vec4f(c, mix(mix(0.62, 0.35, tall), mix(0.86, 1.0, tall), sat(t * 1.5)) * mix(1.0, 0.6, forest));
  o.uv = vec2f(side, t); o.mat = 0u; o.ext = vec4f(tall, t, 0.0, 0.0);
  return o;
}
fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  s.albedo = in.col.rgb; s.ao = in.col.a; s.rough = 0.88; s.sss = 0.2 * in.ext.y;
  if (in.mat == 1u) {
    let t = textureSample(tLeaf, sLin, in.uv);
    if (vegCover(t.a, 0.45) <= vegNoise(in.pos.xy)) { discard; }   // borda de ~1 pixel resolvida pelo TAA (sem serrilhado de cartão)
    // a textura só modula o tom (lâmina a lâmina); a cor vem da paleta, para emendar com o terreno
    // a textura modula o tom lâmina a lâmina e marca as lâminas secas (palha) — o verde vem da paleta, para emendar com o terreno
    let dryT = sat((t.r / max(t.g, 1e-3) - 0.82) * 3.5);
    s.albedo = mix(in.col.rgb, vec3f(0.19, 0.165, 0.075) * (0.55 + 0.6 * in.ext.y), dryT * 0.85) * clamp(0.5 + lum(t.rgb) * 8.0, 0.5, 1.1); s.sss = 0.11 * in.ext.y;   // touceira ao sol não estoura para o palha
  }
  return s;
}
`;
