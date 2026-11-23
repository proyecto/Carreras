'use strict';
// ---- shaders/car-uno.js
// Shader WGSL de materiales para el Fiat Uno Mille EP 1996 (con escalera en el techo).
// Pintura metalizada con barniz, plásticos, gomas, neumáticos, tapacubos, ópticas, etc.

(() => {
  const _WGSL = typeof WGSL !== 'undefined' ? WGSL : ((typeof window !== 'undefined' && window.WGSL) || (typeof globalThis !== 'undefined' && globalThis.WGSL) || {});
  if (typeof window !== 'undefined') window.WGSL = _WGSL;
  if (typeof globalThis !== 'undefined') globalThis.WGSL = _WGSL;

  _WGSL["mat_car"] = `// Materiales del coche (Fiat Uno Mille EP): pintura metalizada con barniz, plásticos, gomas, neumáticos, tapacubos, ópticas...
// id (mat.x): 1 pintura | 2 plástico negro | 3 goma | 4 neumático | 5 tapacubos | 6 acero | 7 cromado | 8 interior | 9 lente opaca
//             10 aluminio | 11 cincha | 12 decal atlas | 13 fondo | 14 reflector faro | 15 espejo | 16 rejilla
//             17 pintura lisa brilhante (capacete; a=1 preto vítreo)
// O.p0 chasis: x = freno, y = marcha atrás, z = faros. O.p0.x ruedas = vel. angular.
#include mesh_vert
@group(3) @binding(0) var tAtlas: texture_2d<f32>;
const PAINT_COL = vec3f(0.168, 0.275, 0.425);   // azul-claro metálico de estúdio: mais escuro e acinzentado (o sol do jogo é forte)
fn carBulgeW(x: f32) -> f32 { return 0.055 * smoothstep(-0.15, 0.25, x) - 0.036 * smoothstep(-1.15, -1.42, x); }
fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  let id = matId(in.mat); let pa = matA(in.mat) * 255.0;
  let lp = in.ext.xyz;
  s.albedo = in.col.rgb;
  switch (id) {
    case 1u: {   // Pintura metalizada con barniz brillante
      // Escamas metalizadas: ruido procedural 3D en espacio de chasis
      // (ruído 2D com mips, projetado pelos três eixos do carro: com a distância ou em ângulo rasante os mips levam à média
      //  e o floco some sozinho — o ruído 3D sem mips virava uma trama diagonal no capô)
      let nO = normalize((vec4f(s.normal, 0.0) * O.model).xyz); let wt = abs(nO) / (abs(nO.x) + abs(nO.y) + abs(nO.z));
      let fl = textureSample(tNoise, sLin, lp.zy * 23.0).a * wt.x + textureSample(tNoise, sLin, lp.xz * 23.0).a * wt.y + textureSample(tNoise, sLin, lp.xy * 23.0).a * wt.z - 0.5;
      s.albedo = PAINT_COL * (1.0 + 0.08 * fl); s.metal = 0.58; s.rough = 0.3 + 0.04 * fl; s.coat = 1.0;
      // Pestañas de recortes junto al suelo: oscurecidas
      { let under = (1.0 - smoothstep(0.31, 0.345, lp.y)) * smoothstep(1.4, 1.5, abs(lp.x)); s.albedo = mix(s.albedo, vec3f(0.01), under); s.coat *= 1.0 - under; s.metal *= 1.0 - under; s.rough = mix(s.rough, 0.95, under); }
      if (pa > 0.5) { let low = max(1.0 - smoothstep(0.2, 0.26, lp.y), (1.0 - smoothstep(0.54, 0.6, lp.y)) * smoothstep(1.2, 1.3, abs(lp.x))); s.albedo = mix(s.albedo, vec3f(0.012), low); s.coat *= 1.0 - low; s.metal *= 1.0 - low; s.rough = mix(s.rough, 0.9, low); }
      if (pa < 0.5) {
        var d = abs(in.uv.x);
        // Tapa de depósito de combustible (lado izquierdo)
        if (lp.z < -0.5) { d = min(d, abs(length(vec2f(lp.x + 1.04, lp.y - 0.715)) - 0.062)); }
        // Ranura entre paneles: hendidura oscura de ~4 mm con sombra suave
        // quando fica menor que o pixel, some por cobertura em vez de engrossar
        let w = max(fwidth(d), 1e-5); let hw = 0.002;
        let line = sat((hw - d) / w + 0.5) * min(1.0, 2.0 * hw / w);
        let halo = (1.0 - smoothstep(hw, hw + 0.007, d)) * sat(0.0035 / w);
        s.albedo *= 1.0 - 0.22 * halo; s.ao = min(s.ao, 1.0 - 0.4 * halo);
        // faixa lateral mais escura entre os dois vincos + friso fino escuro na borda de cima + soleira sombreada
        let side = step(in.uv.y, 0.4);
        // (nas fotos de estúdio tudo abaixo do friso é um tom mais escuro)
        let band = smoothstep(0.215, 0.25, lp.y) * (1.0 - smoothstep(0.575, 0.59, lp.y)) * side;
        s.albedo *= 1.0 - 0.3 * band; s.rough += 0.03 * band;
        let wy = max(fwidth(lp.y), 1e-5);
        // Moldura lateral protectora de goma
        let sx = smoothstep(-0.83, -0.80, lp.x) * (1.0 - smoothstep(0.80, 0.83, lp.x));
        let sdy = lp.y - 0.607; let strip = sat((0.025 - abs(sdy)) / wy + 0.5) * min(1.0, 0.05 / wy) * side * sx;
        { let upS = normalize((O.model * vec4f(0.0, 1.0, 0.0, 0.0)).xyz); let eb = smoothstep(0.014, 0.024, abs(sdy)) * strip; s.normal = normalize(s.normal + upS * sign(sdy) * eb * 0.8); }
        // Talonera inferior en negro mate
        let sill = (1.0 - smoothstep(0.222, 0.234, lp.y)) * side;
        s.albedo = mix(s.albedo, vec3f(0.014), sill * 0.92); s.coat *= 1.0 - sill; s.metal *= 1.0 - sill; s.rough = mix(s.rough, 0.85, sill); s.ao = min(s.ao, 1.0 - 0.3 * sill);
        // Nervadura horizontal del portón trasero
        if (lp.x < -1.5 && in.uv.y > 0.66) {
          let t = (lp.y - 0.836) / 0.007; let upW = normalize((O.model * vec4f(0.0, 1.0, 0.0, 0.0)).xyz);
          s.normal = normalize(s.normal + upW * (t * exp(-t * t) * 0.55) * (1.0 - smoothstep(0.44, 0.48, abs(lp.z))));
          // Hueco de matrícula con bisel sombreado
          let q = abs(vec2f(lp.z, lp.y - 0.717)) - vec2f(0.203, 0.064); let pr = length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - 0.014;
          let stepb = 1.0 - smoothstep(0.0, 0.007, abs(pr));
          s.albedo *= 1.0 - 0.3 * stepb - 0.07 * (1.0 - smoothstep(-0.004, 0.0, pr)); s.ao = min(s.ao, 1.0 - 0.5 * stepb);
        }
        var black = max(line, strip); var lvShade = 1.0;
        if (in.uv.y > 0.66) {
          let zz = lp.z / 0.72; let xe = lp.x - carBulgeW(lp.x) * (1.0 - zz * zz);
          // Rejilla plástica en la base del parabrisas
          let cowl = smoothstep(0.6, 0.61, xe) * (1.0 - smoothstep(0.741, 0.745, xe));
          black = max(black, cowl);
          // Rejilla de ventilación en capó
          let lz = lp.z / 0.021; let cz = fract(lz) - 0.5; let slot = smoothstep(0.3, 0.42, abs(cz) * 2.0);
          let lin = smoothstep(0.843, 0.846, xe) * (1.0 - smoothstep(0.876, 0.879, xe)) * (1.0 - smoothstep(0.218, 0.222, abs(lp.z)));
          let lv = (1.0 - slot) * lin;
          // Bisel de aletas con normal orientada para reflejo y sombra
          let rightW = normalize((O.model * vec4f(0.0, 0.0, 1.0, 0.0)).xyz); let fwdW = normalize((O.model * vec4f(1.0, 0.0, 0.0, 0.0)).xyz);
          let bev = smoothstep(0.22, 0.36, abs(cz) * 2.0) * (1.0 - smoothstep(0.44, 0.58, abs(cz) * 2.0)) * lin;
          let endb = (smoothstep(0.836, 0.845, xe) * (1.0 - smoothstep(0.845, 0.851, xe)) - smoothstep(0.871, 0.877, xe) * (1.0 - smoothstep(0.877, 0.886, xe))) * (1.0 - slot) * (1.0 - smoothstep(0.218, 0.222, abs(lp.z)));
          s.normal = normalize(s.normal - rightW * sign(cz) * bev * 0.7 + fwdW * endb * 0.6);
          s.ao = min(s.ao, 1.0 - 0.35 * bev); s.ao = min(s.ao, 1.0 - 0.7 * lv);   // El fondo de ranuras no refleja cielo ni sol directo
          lvShade = mix(1.0, mix(0.3, 1.1, sat(cz * 2.6 + 0.5)) * mix(0.5, 1.0, sat((xe - 0.846) / 0.03)), lin);   // solo dentro de las aletas (la base del parabrisas queda lisa)
          // pé dos dois vincos longitudinais: linha de sombra fina que acompanha o ressalto
          let zc = 0.515 - 0.145 * sat((xe - 0.72) / 1.03);
          let hx = smoothstep(0.78, 0.9, xe) * (1.0 - smoothstep(1.68, 1.76, xe));
          // Nervadura del capó con resalte y sombra (a face do degrau pega o céu de um lado e
          // Sombra fina en la base del nervio del capó
          let dz = abs(lp.z) - zc; let wz = max(fwidth(lp.z), 1e-5);
          let face = (1.0 - smoothstep(0.004, 0.0085, abs(dz))) * hx;
          let foot = (1.0 - smoothstep(0.003, 0.02 + 2.0 * wz, abs(dz - 0.013))) * hx;   // faixa de sombra larga e suave (lê a 1 m em ângulo rasante, sem tracejar)
          let crest = (1.0 - smoothstep(0.003, 0.016 + 2.0 * wz, abs(dz + 0.012))) * hx;
          s.normal = normalize(s.normal + rightW * sign(lp.z) * (face * 1.0 + foot * 0.3));
          s.albedo *= (1.0 - 0.5 * foot) * (1.0 + 0.2 * crest); s.ao = min(s.ao, 1.0 - 0.6 * foot);
          s.coat *= 1.0 - 0.8 * foot; s.rough = mix(s.rough, 0.7, foot);   // Atenuación de barniz en hendiduras para marcar sombras
          black = max(black, lv);
        }
        s.albedo = mix(s.albedo, vec3f(0.016) * lvShade, black); s.coat *= 1.0 - black; s.rough = mix(s.rough, 0.95, black); s.metal *= 1.0 - black; s.ao = min(s.ao, 1.0 - line * 0.6);
      }
    }
    case 2u: {   // plástico preto: granulado finíssimo (quase liso a 3 m), arestas vivas, um pouco de difuso para ler na sombra
      let g = textureSample(tNoise, sLin, lp.xz * 57.0 + lp.yy * 43.0).b;
      let g2 = textureSample(tNoise, sLin, lp.zy * 131.0 + lp.xx * 97.0).a;
      s.albedo = in.col.rgb * vec3f(0.96, 1.0, 1.05) * (0.2 + 0.13 * g + 0.09 * g2); s.rough = select(0.94 + 0.05 * g2, 0.4, pa > 0.5); s.ao = 0.38 + 0.2 * g2; s.metal = select(0.0, 0.55, pa > 0.5);
    }
    case 3u: { s.albedo = in.col.rgb * vec3f(0.96, 1.0, 1.05) * 1.0; s.rough = 0.84; s.ao = 0.6; s.metal = 0.5; }
    case 4u: {   // Neumáticos de turismo
      let r = length(lp.xy); let ang = atan2(lp.y, lp.x);
      let blur = sat(O.p0.x / 25.0);
      if (pa < 0.5) {
        // banda: lamelas finas e discretas, só entre os ombros (os sulcos longitudinais são geometria)
        let lane = floor((lp.z + 0.055) / 0.022);
        let k = fract(ang / 6.2831853 * 118.0 + lane * 0.5);
        let sipe = (1.0 - smoothstep(0.05, 0.1, abs(k - 0.5))) * (1.0 - blur) * (1.0 - smoothstep(0.03, 0.038, abs(lp.z)));
        s.albedo = in.col.rgb * vec3f(0.96, 1.0, 1.05) * 0.5 * (1.0 - 0.5 * sipe); s.ao = 0.45 - 0.2 * sipe; s.rough = 0.95; s.metal = 0.0;
      } else {
        // flanco liso: dois frisos concêntricos e poucas inscrições pequenas em relevo suave
        let ring = (1.0 - smoothstep(0.0006, 0.0014, abs(r - 0.243))) + (1.0 - smoothstep(0.0006, 0.0014, abs(r - 0.196)));
        let tb = smoothstep(0.2075, 0.209, r) * (1.0 - smoothstep(0.2185, 0.22, r));
        let win = step(0.55, textureSampleLevel(tNoise, sLin, vec2f(ang * 0.33, 0.61), 0.0).r);
        let st = smoothstep(0.3, 0.45, abs(fract(ang * 58.0) - 0.5)) * step(0.35, textureSampleLevel(tNoise, sLin, vec2f(ang * 9.3, 0.37), 0.0).a);
        let letters = tb * win * st * (1.0 - blur);
        // Flanco de neumático con nervaduras radiales realistas
        let ribs = (0.5 + 0.5 * sin(ang * 150.0)) * smoothstep(0.222, 0.226, r) * (1.0 - smoothstep(0.238, 0.242, r)) * (1.0 - blur) * sat(1.0 - fwidth(ang) * 150.0 * 0.4);
        let band2 = smoothstep(0.247, 0.249, r) * (1.0 - smoothstep(0.256, 0.258, r));
        s.albedo = in.col.rgb * vec3f(0.96, 1.0, 1.05) * 0.5 * (1.0 + 1.8 * letters + 0.8 * ring * (1.0 - blur) + 0.35 * ribs + 0.3 * band2); s.rough = 0.9 - 0.2 * letters; s.ao = 0.5 - 0.15 * ribs + 0.25 * letters; s.metal = 0.0;
      }
    }
    case 5u: {   // calota prateada
      let r = length(lp.xy);
      s.albedo = in.col.rgb; s.metal = 0.75; s.rough = 0.36; s.coat = 0.25;
      if (pa > 0.5) {
        // disco de desenfoque: cubre las ranuras por punteado conforme la rueda gira (media radial: anillo de ranuras más oscuro)
        let cov = smoothstep(9.0, 34.0, O.p0.x);
        if (ign(in.pos.xy, F.misc.y) >= cov) { discard; }
        let ringd = 1.0 - smoothstep(0.016, 0.03, abs(r - 0.123));
        let rim = 1.0 - smoothstep(0.001, 0.003, abs(r - 0.156)); let hub = 1.0 - smoothstep(0.016, 0.024, r); let bolts = 1.0 - smoothstep(0.005, 0.01, abs(r - 0.058));
        let streak = 0.5 + 0.5 * sin(atan2(lp.y, lp.x) * 16.0);   // resto de las 16 ranuras, casi atenuadas por el giro
        s.albedo = in.col.rgb * (1.0 - 0.5 * ringd * (0.85 + 0.15 * streak) - 0.35 * rim - 0.4 * hub - 0.22 * bolts); s.rough = 0.42; s.coat = 0.15; s.ao = 1.0 - 0.35 * ringd;
        return s;
      }
      let far = smoothstep(0.004, 0.011, fwidth(r)) * (1.0 - smoothstep(0.019, 0.026, abs(r - 0.123)));
      s.albedo *= 1.0 - 0.3 * far;
      let c = 1.0 - smoothstep(0.0012, 0.0024, abs(r - 0.031));
      // emblema central: cinco barras inclinadas em baixo-relevo
      let q = lp.x + lp.y * 0.3;
      let bars = (1.0 - smoothstep(0.2, 0.3, abs(fract(q / 0.0078 + 0.5) - 0.5))) * step(abs(lp.y), 0.0155) * step(abs(q), 0.0195) * (1.0 - sat(O.p0.x / 20.0));
      s.albedo *= 1.0 - 0.5 * bars; s.rough += 0.1 * bars;
      // reborde exterior y sombra suave hacia el interior de las ranuras
      s.albedo *= 1.0 - 0.3 * (1.0 - smoothstep(0.001, 0.0025, abs(r - 0.156)));
      // cinco rebaixos de parafuso em volta do centro
      let a5 = atan2(lp.y, lp.x) / 6.2831853 * 5.0; let da = (a5 - round(a5)) / 5.0 * 6.2831853 * r;
      let dimple = 1.0 - smoothstep(0.006, 0.008, length(vec2f(da, r - 0.058)));
      s.albedo *= 1.0 - 0.5 * c - 0.6 * dimple; s.ao = 1.0 - 0.5 * dimple;
    }
    case 6u: { s.metal = 0.5; s.rough = select(0.45, 0.6, pa > 0.5); }
    case 7u: { s.metal = 1.0; s.rough = select(0.07, 0.26, pa > 0.5); if (pa > 1.5) { s.metal = 0.72; s.rough = 0.3; } }   // a=2: cromado claro acetinado (emblema)
    case 8u: {   // interior
      s.rough = 0.92;
      // Revestimiento interior tras los parachoques
      { let under = (1.0 - smoothstep(0.56, 0.62, lp.y)) * smoothstep(1.2, 1.3, abs(lp.x)); s.albedo = mix(s.albedo, vec3f(0.006), under); }
      if ((pa > 1.5 && pa < 2.5) || pa > 3.5) { let w = sin(lp.z * 900.0) * sin(lp.x * 900.0 + lp.y * 900.0); s.albedo = in.col.rgb * (1.0 + 0.1 * w); }
      if (pa > 3.5) {
        // bancos: gomos horizontais com costura (sulco escuro) a cada ~8 cm
        let k = (fract(lp.y / 0.082 + 0.3 * lp.x) - 0.5) * 0.082; let seam = 1.0 - smoothstep(0.0025, 0.008, abs(k));
        s.albedo *= (1.0 - 0.5 * seam) * (0.86 + 0.14 * cos(k / 0.082 * 6.2831853)); s.ao = 1.0 - 0.4 * seam;
      }
      if (pa > 2.5 && pa < 3.5) { s.rough = 0.55; }
    }
    case 9u: {   // Ópticas traseras e intermitentes con prismas sobre reflector
      s.rough = 0.38; s.coat = 0.0;
      let rib = 0.86 + 0.14 * sin(lp.y * 6.2831853 / 0.0042);
      if (pa < 1.5) {
        // Piloto trasero: intermitente ámbar, freno rojo rubí y marcha atrás blanca
        let v = in.uv.y; let u = in.uv.x; let br = sat(O.p0.x);
        // Albedo oscuro calibrado para luz solar; freno iluminado vía emisivo rojo
        var c = mix(vec3f(0.17, 0.003, 0.002), vec3f(0.2, 0.004, 0.002), br); var e = mix(0.03, 0.66, br);
        if (v > 0.66) { c = vec3f(0.19, 0.05, 0.002); e = 0.006; }
        else if (v < 0.2 && u < 0.36) { c = mix(vec3f(0.1, 0.1, 0.098), vec3f(1.0, 1.0, 0.95), sat(O.p0.y)); e = 0.004 + sat(O.p0.y) * 0.5; }   // ré: pequeno retângulo interno
        // divisórias em relevo entre as seções (horizontais) e uma vertical a 1/3 da largura: barras escuras com chanfro
        let fy = max(fwidth(v), 1e-4); let fu = max(fwidth(u), 1e-4);
        let dh = min(abs(v - 0.66), select(9.0, abs(v - 0.2), u < 0.36)); let dvv = select(9.0, abs(u - 0.36), v < 0.2);
        // moldura escura fina em volta da lente (bordas de cima, de baixo e interna)
        let vh = (0.5 - abs(v - 0.5)) ; let edge = max(sat(1.0 - (vh - 0.0) / max(0.028, fy)), sat(1.0 - u / max(0.03, fu)));
        let k = sat(max(max(sat(1.0 - dh / max(0.02, fy)), sat(1.0 - dvv / max(0.014, fu))), edge));
        // prismas: pirâmides de ~4,5 mm que dobram a normal (brilhos pontuais do sol) e dão claro/escuro por célula
        let cell = vec2f(lp.z, lp.y) / 0.0045; var pc = fract(cell) - 0.5; pc.x = 0.0;   // lente frisada: nervuras horizontais finas
        let fade = sat(1.0 - fwidth(cell.y) * 1.4);   // some antes de virar serrilhado
        let rightW = normalize((O.model * vec4f(0.0, 0.0, 1.0, 0.0)).xyz); let upW = normalize((O.model * vec4f(0.0, 1.0, 0.0, 0.0)).xyz);
        s.normal = normalize(s.normal + (rightW * pc.x + upW * pc.y) * 0.45 * fade * (1.0 - k));
        let prism = mix(1.0, 0.62 + 0.76 * (1.0 - 2.0 * max(abs(pc.x), abs(pc.y))), fade);
        let depth = 0.8 + 0.2 * sin(u * 7.0 + v * 2.5);   // degradê do refletor atrás da lente
        s.albedo = mix(c * prism * depth, vec3f(0.006), k); s.emissive = e * (1.0 - k) * mix(1.0, 0.8 + 0.4 * (1.0 - 2.0 * max(abs(pc.x), abs(pc.y))), fade);
        s.rough = mix(0.62, 0.8, k);   // lente pouco especular: ao sol continua vermelha/âmbar, sem lavar para rosa
      } else {
        // Intermitentes: lente ámbar translúcida
        let fl2 = 0.5 + 0.5 * sin(in.uv.x * 6.2831853 / 0.0075); let fadeP = sat(1.0 - fwidth(in.uv.x) / 0.0075 * 2.0);
        let gy = 1.0 - 0.45 * abs((lp.y - 0.693) / 0.062);
        s.albedo = in.col.rgb * vec3f(0.9, 0.62, 0.3) * mix(1.0, 0.74 + 0.4 * fl2, fadeP) * gy * (0.9 + 0.1 * rib); s.rough = 0.3; s.coat = 0.7; s.emissive = 0.03;   // lente lisa translúcida, só com frisos horizontais finos
      }
    }
    case 10u: {  // alumínio da escada
      let n = textureSample(tNoise, sLin, vec2f(lp.x * 0.7, (lp.y + lp.z) * 30.0)).r;
      s.albedo = in.col.rgb * (0.94 + 0.08 * n); s.metal = 0.55; s.rough = 0.5 + 0.1 * n;
      if (pa > 0.5) { let k = sin(lp.z * 900.0); s.rough = 0.55; s.albedo *= 0.9 + 0.1 * k; }
      else if (abs(abs(lp.z) - 0.205) > 0.0105 && lp.x > -1.97 && lp.x < 1.21) {
        // extremidade rebitada de cada degrau, visível nas faces laterais das longarinas
        let kx = (fract((lp.x + 1.78) / 0.28 + 0.5) - 0.5) * 0.28; let d = length(vec2f(kx, lp.y - 1.515));
        let ring = smoothstep(0.0215, 0.0195, d) * smoothstep(0.0135, 0.0155, d); let core = 1.0 - smoothstep(0.012, 0.014, d);
        s.albedo *= 1.0 - 0.55 * ring - 0.2 * core; s.ao = 1.0 - 0.5 * ring;
      }
    }
    case 11u: {  // cinta de poliéster
      let w = sin((lp.z + lp.y) * 1800.0) * sin(lp.x * 1800.0);
      s.albedo = in.col.rgb * (0.9 + 0.12 * w); s.rough = 0.8;
    }
    case 12u: {  // decalque (placa / emblemas)
      let t = textureSample(tAtlas, sLin, in.uv);
      if (pa > 0.5 && t.a < 0.5) { discard; }
      s.albedo = t.rgb * select(0.7, 1.0, pa > 0.5); s.rough = select(0.62, 0.28, pa > 0.5); s.metal = select(0.0, 0.4, pa > 0.5); s.coat = select(0.0, 0.6, pa > 0.5);
    }
    case 13u: { s.rough = 1.0; s.ao = 0.3; s.metal = 0.9; }
    case 14u: {  // Reflector de faros: parábola plateada con bombilla halógena
      let u = in.uv.x; let v = in.uv.y;
      // gradação: mais claro no centro (em volta do bulbo), escurecendo para as bordas e para baixo; facetas verticais em colunas
      let rightW = normalize((O.model * vec4f(0.0, 0.0, 1.0, 0.0)).xyz);
      let fz = sin(lp.z * 6.2831853 / 0.013); let ffade = sat(1.0 - fwidth(lp.z) / 0.013 * 2.5);
      s.normal = normalize(s.normal + rightW * fz * 0.12 * ffade);
      let rr = length(vec2f(u * 0.85, v));
      let grad = mix(1.0, 0.36, smoothstep(0.1, 1.05, rr)) * mix(0.72, 1.0, smoothstep(-1.0, 0.3, v));
      let facet = mix(1.0, 0.86 + 0.14 * fz, ffade);
      s.albedo = vec3f(0.74, 0.75, 0.77) * grad * facet; s.metal = 0.25; s.rough = 0.32; s.ao = 1.0;
      s.emissive = 0.105 * grad;   // Reflector en sombra con iluminación interior propia
      if (pa > 0.5) {
        // bulbo claro (a > 0,5) e sua capa prateada na ponta (a > 1,5): discretos, sem ponto preto
        s.normal = normalize(in.nrm);
        if (pa > 1.5) { s.metal = 0.3; s.albedo = vec3f(0.5, 0.5, 0.51); s.rough = 0.35; s.emissive = 0.06; }
        else { s.metal = 0.2; s.albedo = vec3f(0.8, 0.79, 0.74); s.rough = 0.25; s.emissive = 0.09 + O.p0.z * 0.1; }
      }
    }
    case 15u: {   // Retrovisores: reflejo fijo tintado
      let g = sat((lp.y - 0.965) / 0.082);
      let ground = vec3f(0.03, 0.03, 0.032); let trees = vec3f(0.018, 0.03, 0.014); let sky = mix(vec3f(0.2, 0.25, 0.3), vec3f(0.1, 0.16, 0.26), sat((g - 0.52) / 0.48));
      var c = mix(ground, trees, smoothstep(0.36, 0.42, g)); c = mix(c, sky, smoothstep(0.5, 0.56, g));
      s.albedo = c; s.metal = 0.0; s.rough = 0.5; s.coat = 0.25; s.emissive = 0.045;
    }
    case 16u: {  // láminas en el fondo de las hendiduras: casi negras
      let k = fract(lp.y / select(0.0105, 0.0175, pa > 0.5));
      s.albedo = in.col.rgb * mix(0.1, 1.0, smoothstep(0.25, 0.5, k)); s.rough = 0.92; s.metal = 0.3; s.ao = mix(0.2, 0.7, smoothstep(0.25, 0.5, k));
    }
    case 17u: { s.rough = select(0.42, 0.3, pa > 0.5); s.coat = select(0.3, 0.35, pa > 0.5); }   // capacete (pintura) / viseira escura lisa, sem espelhar zebras
    default: {}
  }
  return s;
}
`;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mat_car: _WGSL["mat_car"] };
  }
})();
