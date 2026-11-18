'use strict';
// Coche: Fiat Uno Mille EP 1996 (con escalera en el techo)
// Todo lo específico de este coche (shader, física, geometría y atlas) vive en este único archivo.
(() => {

WGSL["mat_car"] = `// Materiales del coche (Fiat Uno Mille EP): pintura metalizada con barniz, plásticos, gomas, neumáticos, tapacubos, ópticas...
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
          lvShade = mix(1.0, mix(0.3, 1.1, sat(cz * 2.6 + 0.5)) * mix(0.5, 1.0, sat((xe - 0.846) / 0.03)), lin);   // só dentro das aletas (a base do para-brisa fica lisa)
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
        // disco de borrão: cobre os rasgos por pontilhado conforme a roda gira (média radial: anel dos rasgos mais escuro)
        let cov = smoothstep(9.0, 34.0, O.p0.x);
        if (ign(in.pos.xy, F.misc.y) >= cov) { discard; }
        let ringd = 1.0 - smoothstep(0.016, 0.03, abs(r - 0.123));
        let rim = 1.0 - smoothstep(0.001, 0.003, abs(r - 0.156)); let hub = 1.0 - smoothstep(0.016, 0.024, r); let bolts = 1.0 - smoothstep(0.005, 0.01, abs(r - 0.058));
        let streak = 0.5 + 0.5 * sin(atan2(lp.y, lp.x) * 16.0);   // resto dos 16 rasgos, quase apagado pelo giro
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
      // friso na borda e sombra suave para dentro dos rasgos
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
// (uv.x = x + z: coordenada ao longo da frente/lateral) — frisos verticais finos e um degradê de refletor por trás
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
    case 16u: {  // palhetas no fundo das fendas: quase pretas
      let k = fract(lp.y / select(0.0105, 0.0175, pa > 0.5));
      s.albedo = in.col.rgb * mix(0.1, 1.0, smoothstep(0.25, 0.5, k)); s.rough = 0.92; s.metal = 0.3; s.ao = mix(0.2, 0.7, smoothstep(0.25, 0.5, k));
    }
    case 17u: { s.rough = select(0.42, 0.3, pa > 0.5); s.coat = select(0.3, 0.35, pa > 0.5); }   // capacete (pintura) / viseira escura lisa, sem espelhar zebras
    default: {}
  }
  return s;
}
`;

// ---- 30_car_a_shape.js
// Fiat Uno Mille EP 1996 (2 portas) — forma da carroceria como superfície paramétrica única (metade direita, z >= 0).
// Referencial do carro: origem no chão sob o centro do entre-eixos; X frente, Y cima, Z direita. Unidades: metros.
// Superficie paramétrica P(u,v): u longitudinal (frontal → zaga), v transversal
// (soleira → cintura → coluna → canto do teto) e atravessa o topo até o plano de simetria.
const CS = {
  XF: 1.876, XR: -1.692,          // extremos do perfil em "coordenadas de borda" (o centro avança/recua por abaulamento)
  YS: 0.19,                       // soleira
  AXF: 1.181, AXR: -1.181, WR: 0.281,
  TH_S: Math.sin(19.5 * PI / 180), TH_C: Math.cos(19.5 * PI / 180),
  VF: [0, 0.36, 0.42, 0.60, 0.68, 1],
  ARCH_R: 0.318, ARCH_Y: 0.295,
};
const csq = x => x * x;
function csmin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function csmax(a, b, k) { return -csmin(-a, -b, k); }
// perfil superior no plano de borda: capô, para-brisa, teto, vigia, tampa, frente
function carYT(x) {
  const fascia = 0.765 - 4.3 * (x - 1.752);
  const hood = 0.96 - 0.1806 * (x - 0.672) + 0.012 * (1 - csq((x - 1.21) / 0.54));
  const wind = 0.96 - 0.81 * (x - 0.672);
  const a = x + 0.35, roof = 1.445 - (a > 0 ? 0.26 * a * a : 0.041 * a * a) + (x > 0.2 ? 6 * csq(x - 0.2) : 0);
  const hatch = 0.93 + 1.78 * (x + 1.585);
  const tail = 0.93 + 6.2 * (x + 1.585);
  let y = csmax(hood, wind, 0.02);
  y = csmin(y, roof, 0.035); y = csmin(y, hatch, 0.06); y = csmin(y, tail, 0.05); y = csmin(y, fascia, 0.05);
  return y;
}
// Curvatura en planta: abombamiento central respecto a extremos
function carBulge(x) { return 0.055 * smooth(-0.15, 0.25, x) - 0.036 * smooth(-1.15, -1.42, x); }
function carCrown(x) { return 0.02 * smooth(0.62, 0.9, x) * smooth(1.8, 1.7, x) + 0.032 * smooth(0.2, -0.1, x) * smooth(-1.5, -1.3, x); }
function carYtop(x, z) {
  const zz = z / 0.72, xi = carBulge(x) * (1 - zz * zz);
  let y = carYT(x - xi) - carCrown(x) * zz * zz;
  // ressalto central do capô (dois vincos que convergem para a frente)
  if (x > 0.6) {
    // (posição medida na foto de frente: ~0,51 m do eixo junto ao para-brisa, ~0,37 m na frente; degrau de 9 mm com aresta viva)
    const zc = 0.515 - 0.145 * sat((x - 0.72) / 1.03);
    y += 0.0095 * (1 - smooth(zc - 0.0065, zc + 0.0065, z)) * smooth(0.77, 0.9, x - xi) * smooth(1.78, 1.70, x - xi);
  }
  return y;
}
function carWPlan(x) {
  const t = sat((x - 0.55) / 1.3), t2 = sat((-0.85 - x) / 0.82);
  return 0.774 - 0.082 * t * t - 0.05 * t2 * t2;
}
// Lateral inferior: semiancho en función de la altura
function carZL(x, y) {
  let z = carWPlan(x);
  const d = y - 0.63; z -= d < 0 ? 0.03 * csq(d / 0.43) : 0.022 * csq(d / 0.30);
  z -= 0.003 * smooth(0.44, 0.53, y) * (1 - smooth(0.585, 0.675, y));   // Transiciones suaves sin distorsión especular
  if (y < 0.25) z -= 0.03 * csq((0.25 - y) / 0.06);
  const df = Math.hypot(x - CS.AXF, y - CS.ARCH_Y) - CS.ARCH_R, dr = Math.hypot(x - CS.AXR, y - CS.ARCH_Y) - CS.ARCH_R, da = Math.min(df, dr);
  if (da < 0.3) z += 0.0024 * Math.exp(-csq((da - 0.01) / 0.1));
  return z;
}
function carBeltN(x) { return 0.922 + 0.005 * (0.67 - x); }
function carR2(x) {
  // raio do canto superior: ombro do capô, coluna A, teto, coluna C, canto traseiro, canto dianteiro
  let r = 0.045;
  r = lerp(r, 0.024, smooth(-0.05, 0.2, x));       // coluna A
  r = lerp(r, 0.013, smooth(0.6, 0.8, x));         // ombro do para-lama
  r = lerp(r, 0.04, smooth(1.66, 1.76, x));        // canto dianteiro
  r = lerp(r, 0.032, smooth(-1.3, -1.4, x));       // coluna C
  r = lerp(r, 0.045, smooth(-1.56, -1.62, x));     // canto traseiro
  return r;
}
// parâmetros da seção em x (cache pequeno: o patch consulta a mesma estação várias vezes)
const _stCache = []; let _stNext = 0;
for (let i = 0; i < 8; i++) _stCache.push({ x: NaN, yB: 0, zB: 0, dAz: 0, LA: 0, LB: 0, zE: 0, yE: 0, dCy: 0, r1: 0, r2: 0, b: new Float64Array(6) });
function carStation(x) {
  for (let i = 0; i < 8; i++) if (_stCache[i].x === x) return _stCache[i];
  const st = _stCache[_stNext]; _stNext = (_stNext + 1) & 7; st.x = x;
  const bn = carBeltN(x);
  // topo da parede sem a coluna: y = Ytop(x, zL(x, y))
  let y = bn; for (let k = 0; k < 4; k++) y = carYtop(x, carZL(x, Math.min(y, bn + 0.2)));
  if (y <= bn) { st.yB = y; st.LB = 0; }
  else {
    st.yB = bn; const zb = carZL(x, bn); let t = (carYtop(x, zb) - bn) / CS.TH_C;
    for (let k = 0; k < 5; k++) t = (carYtop(x, zb - t * CS.TH_S) - bn) / CS.TH_C;
    st.LB = Math.max(t, 0);
  }
  st.zB = carZL(x, st.yB); st.dAz = (carZL(x, st.yB) - carZL(x, st.yB - 0.004)) / 0.004;
  st.LA = st.yB - CS.YS;
  st.zE = st.zB - st.LB * CS.TH_S; st.yE = st.yB + st.LB * CS.TH_C;
  st.dCy = -(carYtop(x, st.zE) - carYtop(x, st.zE - 0.004)) / 0.004;   // dy/dq (q = zE - z)
  st.r1 = 0.010; st.r2 = carR2(x);
  const b = st.b, h = st.LB * 0.5; b[0] = 0; b[1] = st.LA - st.r1; b[2] = st.LA + Math.min(st.r1, h); b[3] = st.LA + st.LB - Math.min(st.r2, h); b[4] = st.LA + st.LB + st.r2; b[5] = st.LA + st.LB + st.zE;
  return st;
}
function carG(d, r) { return d <= -r || d >= r ? 0 : d < 0 ? (r + d) * (r + d) / (4 * r) : (r - d) * (r - d) / (4 * r); }
// ponto da pele: x (estação), v (0..1), off (deslocamento ao longo da normal; + para fora). out = [x,y,z]
function carSkin(x, v, off, out) {
  const st = carStation(x), VF = CS.VF, b = st.b;
  let k = 0; while (k < 4 && v > VF[k + 1]) k++;
  const s = b[k] + (b[k + 1] - b[k]) * (v - VF[k]) / (VF[k + 1] - VF[k]);
  let z, y, tz, ty;   // ponto bruto e tangente
  const s1 = st.LA, s2 = st.LA + st.LB;
  if (s <= s1) { y = CS.YS + s; z = carZL(x, y); tz = (carZL(x, y + 0.002) - carZL(x, y - 0.002)) / 0.004; ty = 1; }
  else if (s <= s2) { const t = s - s1; z = st.zB - t * CS.TH_S; y = st.yB + t * CS.TH_C; tz = -CS.TH_S; ty = CS.TH_C; }
  else { z = st.zE - (s - s2); y = carYtop(x, z); tz = -1; ty = -(carYtop(x, z + 0.002) - carYtop(x, z - 0.002)) / 0.004; }
  // cantos arredondados (filete parabólico exato do filtro de caixa)
  const d1z = -CS.TH_S - st.dAz, d1y = CS.TH_C - 1, d2z = -1 + CS.TH_S, d2y = st.dCy - CS.TH_C;
  const g1 = carG(s - s1, st.r1), g2 = carG(s - s2, st.r2);
  z += d1z * g1 + d2z * g2; y += d1y * g1 + d2y * g2;
  let px = x;
  if (off) {
    const e1 = s - s1, e2 = s - s2;
    const h1 = e1 <= -st.r1 ? 0 : e1 >= st.r1 ? 0 : (e1 < 0 ? (st.r1 + e1) : -(st.r1 - e1)) / (2 * st.r1);
    const h2 = e2 <= -st.r2 ? 0 : e2 >= st.r2 ? 0 : (e2 < 0 ? (st.r2 + e2) : -(st.r2 - e2)) / (2 * st.r2);
    // derivada dos filetes: g' = (r+d)/(2r) para d<0, -(r-d)/(2r) para d>0 — soma à tangente bruta só dentro da zona
    let Tz = tz, Ty = ty;
    if (s > s1 && e1 < st.r1) { /* já do lado B: tangente bruta = dB */ }
    Tz += d1z * h1 + d2z * h2; Ty += d1y * h1 + d2y * h2;
    // normal no plano da seção (para fora): (ty, -tz) em (z, y)
    let nz = Ty, ny = -Tz; const l = 1 / Math.hypot(nz, ny); nz *= l; ny *= l;
    // inclinação ao longo de x (só relevante no topo): dY/dx
    const yx = (carYtop(x + 0.003, Math.max(z, 0)) - carYtop(x - 0.003, Math.max(z, 0))) / 0.006;
    let nx = -yx * Math.max(ny, 0) * Math.max(ny, 0); const l2 = 1 / Math.hypot(nx, ny, nz);
    px += nx * l2 * off; y += ny * l2 * off; z += nz * l2 * off;
  }
  out[0] = px; out[1] = y; out[2] = z;
}
// tabela u <-> x por comprimento de arco do perfil (u = 0 na frente, 1 atrás)
const CAR_UT = { n: 800, x: null, s: null, L: 0 };
function carShapeInit() {
  const n = CAR_UT.n, xs = CAR_UT.x = new Float64Array(n + 1), ss = CAR_UT.s = new Float64Array(n + 1);
  let px = CS.XF, py = carYT(px), acc = 0;
  for (let i = 0; i <= n; i++) {
    const x = CS.XF + (CS.XR - CS.XF) * i / n, y = carYT(x); acc += Math.hypot(x - px, y - py); px = x; py = y; xs[i] = x; ss[i] = acc;
  }
  CAR_UT.L = acc;
}
function carXofU(u) {
  const T = CAR_UT, s = sat(u) * T.L; let lo = 0, hi = T.n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.s[m] <= s) lo = m; else hi = m; }
  const f = (s - T.s[lo]) / Math.max(1e-9, T.s[hi] - T.s[lo]); return T.x[lo] + (T.x[hi] - T.x[lo]) * f;
}
function carUofX(x) {
  const T = CAR_UT, f = sat((x - CS.XF) / (CS.XR - CS.XF)) * T.n, i = Math.min(T.n - 1, Math.floor(f));
  return (T.s[i] + (T.s[i + 1] - T.s[i]) * (f - i)) / T.L;
}
// Función de superficie para MeshBuilder.patch
function carSkinFn(off) { return (u, v, out) => carSkin(carXofU(u), v, off || 0, out); }

// ---------- campos de recorte (negativo = dentro do elemento) ----------
function carArchF(P) {
  return Math.min(Math.hypot(P[0] - CS.AXF, P[1] - CS.ARCH_Y), Math.hypot(P[0] - CS.AXR, P[1] - CS.ARCH_Y)) - CS.ARCH_R;
}
// janelas laterais em vista lateral (x, y): máximos suaves de semiplanos
const CW = { apx: 0, apy: 0, anx: 0, any: 0, cpx: 0, cpy: 0, cnx: 0, cny: 0, roofA: 0, roofB: 0, roofC: 0 };
function carWindowsInit() {
  // linha da coluna A: pelos cantos superiores da parede em duas estações do para-brisa
  const a = carStation(0.60), ax = 0.60, ay = a.yE, b = carStation(0.20), bx = 0.20, by = b.yE;
  let nx = -(by - ay), ny = (bx - ax); let l = Math.hypot(nx, ny); nx /= l; ny /= l; if (ny > 0) { nx = -nx; ny = -ny; }   // normal apontando para baixo/trás (dentro da janela)
  CW.apx = ax; CW.apy = ay; CW.anx = nx; CW.any = ny;
  const c = carStation(-1.40), cx = -1.40, cy = c.yE, d = carStation(-1.54), dx = -1.54, dy = d.yE;
  nx = -(dy - cy); ny = (dx - cx); l = Math.hypot(nx, ny); nx /= l; ny /= l; if (nx < 0) { nx = -nx; ny = -ny; }             // normal apontando para a frente
  CW.cpx = cx; CW.cpy = cy; CW.cnx = nx; CW.cny = ny;
}
function carRoofEdgeY(x) { return carStation(clamp(x, -1.33, 0.1)).yE; }
function carWinDoor(P) {
  const x = P[0], y = P[1];
  const bottom = (carBeltN(x) + 0.014) - y;
  const top = y - (carRoofEdgeY(x) - 0.04);
  const front = 0.062 - ((x - CW.apx) * CW.anx + (y - CW.apy) * CW.any);
  const rear = (-0.345 - 0.04 * (y - 0.95)) - x;
  return csmax(csmax(bottom, top, 0.03), csmax(front, rear, 0.03), 0.035);
}
function carWinQuarter(P) {
  const x = P[0], y = P[1];
  const bottom = (carBeltN(x) + 0.014) - y;
  const top = y - (carRoofEdgeY(x) - 0.04);
  const front = x - (-0.455 - 0.04 * (y - 0.95));
  const rear = 0.098 - ((x - CW.cpx) * CW.cnx + (y - CW.cpy) * CW.cny);
  return csmax(csmax(bottom, top, 0.03), csmax(front, rear, 0.03), 0.035);
}
// para-brisa: sobre a superfície do topo, em coordenadas (x deslocado pelo abaulamento, z)
function carXe(P) { const zz = P[2] / 0.72; return P[0] - carBulge(P[0]) * (1 - zz * zz); }
function carWindshield(P) {
  const xe = carXe(P), st = carStation(P[0]);
  const lo = xe - 0.648, hi = 0.162 - xe, side = P[2] - (st.zE - 0.047);
  return P[0] < 0 ? 1 : csmax(csmax(lo, hi, 0.03), side, 0.06);
}
function carHatchGlass(P) {
  const st = carStation(P[0]), y = P[1];
  const lo = 1.0 - y, hi = y - 1.352, side = P[2] - (st.zE - 0.072);
  return P[0] > -1.2 ? 1 : csmax(csmax(lo, hi, 0.03), side, 0.06);
}
function carRRect(a, b, ha, hb, r) { const qa = Math.abs(a) - ha + r, qb = Math.abs(b) - hb + r; return Math.hypot(Math.max(qa, 0), Math.max(qb, 0)) + Math.min(Math.max(qa, qb), 0) - r; }
const CL = { hlZ0: 0.378, hlZ1: 0.607, lY: 0.693, lH: 0.062, clZ: 0.6135, clX: 1.735 };   // Faro principal + intermitente ámbar lateral envolvente
function carHeadlight(P) { return carRRect(P[2] - (CL.hlZ0 + CL.hlZ1) / 2, P[1] - CL.lY, (CL.hlZ1 - CL.hlZ0) / 2, CL.lH, 0.012); }
function carCornerLamp(P, v) {
  const g = v > 0.64 ? CL.clZ - P[2] : CL.clX - P[0];
  return Math.max(Math.abs(P[1] - CL.lY) - CL.lH, g);
}
function carGrille(P) {
  const z = P[2], y = P[1];
  return carRRect(z, y - 0.694, 0.356, 0.0475, 0.008);   // abertura única; a barra central na cor do carro é uma peça à parte
}
const CT = { z0: 0.497, y0: 0.584, y1: 0.822 };   // Piloto trasero envolvente
function carTailLamp(P, v) {
  // Cara trasera + solapa lateral
  // face traseira + dobra de largura constante (~5,5 cm) pela lateral, paralela à aresta traseira inclinada
  return Math.max(carRRect(0, P[1] - (CT.y0 + CT.y1) / 2, 1, (CT.y1 - CT.y0) / 2, 0.012), CT.z0 - P[2], P[0] - (-1.585 + (P[1] - 0.93) / 6.2 + 0.055));
}
// ---------- distância às linhas de junção (portas, capô, tampa) — vai em uv.x e vira linha escura no shader ----------
const CSEAM = { door: null };
function carSeamInit() {
  const p = [[0.74, 0.215], [0.74, 0.92], [0.722, 0.95]];
  for (let x = 0.66; x >= -0.41; x -= 0.045) p.push([x, carStation(x).yE - (x > 0.1 ? 0.03 : 0.024)]);
  p.push([-0.418, carStation(-0.418).yE - 0.024]); p.push([-0.418, 0.215]); p.push([0.74, 0.215]);
  CSEAM.door = p;
}
function carSegDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, t = sat(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); }
// distância ASSINADA à junção mais próxima: união (mínimo) das regiões porta, capô e tampa — negativa dentro.
// (interpola certo entre vértices; o shader desenha a linha onde |d| ≈ 0)
function carSeam(P, v) {
  const x = P[0], y = P[1], z = P[2]; let d = 1;
  if (v < 0.66 && x > -0.7 && x < 1.0) {
    const p = CSEAM.door; let m = 1e9, inside = false;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1]; m = Math.min(m, carSegDist(x, y, a[0], a[1], b[0], b[1]));
      if ((a[1] > y) !== (b[1] > y) && x < a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])) inside = !inside;
    }
    d = Math.min(d, inside ? -m : m);
  }
  if (v > 0.6) {
    const xe = carXe(P), st = carStation(x);
    if (xe > 0.5) d = Math.min(d, Math.max(z - (st.zE - 0.058), 0.745 - xe, xe - 1.742));     // capô
    if (x < -1.1) {   // Portón trasero con bisagras en techo
      const zs = lerp(CT.z0 - 0.014, st.zE - 0.05, smooth(CT.y1 + 0.006, CT.y1 + 0.07, y));
      d = Math.min(d, Math.max(z - zs, 0.565 - y, x + 1.315));
    }
  }
  return d;
}

// ---- 30_car_b_body.js
// Carrocería: chapa, gomas, cristales y ópticas recortados de superficie paramétrica.
const CM = { PAINT: 1, PLASTIC: 2, RUBBER: 3, TIRE: 4, HUBCAP: 5, STEEL: 6, CHROME: 7, INTERIOR: 8, LENS: 9, ALU: 10, STRAP: 11, DECAL: 12, UNDER: 13, REFLECTOR: 14, MIRROR: 15, GRILLE: 16, GLOSS: 17 };
const _cuv = [0, 0];
// Parche paramétrico de superficie
function carSub(mb, off, x0, x1, va, vb, cell, opts) {
  const u0 = carUofX(x0), u1 = carUofX(x1);
  opts.nu = Math.max(2, Math.ceil((u1 - u0) * CAR_UT.L / cell)); opts.nv = Math.max(2, Math.ceil((vb - va) * 3.2 / cell)); opts.flip = opts.flip === undefined ? true : opts.flip;
  mb.patch(carSkinFn(off), u0, u1, va, vb, opts);
}
function carBuildBody(mb, gl) {
  const seamUV = (u, v, P) => { _cuv[0] = carSeam(P, v); _cuv[1] = v; return _cuv; };
  const plainUV = (u, v, P) => { _cuv[0] = 1; _cuv[1] = v; return _cuv; };
  const v0 = mb.nv, i0 = mb.ni, gv0 = gl.nv, gi0 = gl.ni;
  // --- pintura ---
  // dois trechos da mesma pele (emenda numa linha da grade): embaixo a aba dos recortes (caixas de roda) é na cor do carro;
  // Pestañas interiores oscurecidas
  const paintField = (u, v, P) => {
    let f = 1;
    if (v < 0.42) f = carArchF(P);
    else if (v < 0.66) f = Math.min(carWinDoor(P), carWinQuarter(P));
    if (v > 0.6) { f = Math.min(f, carWindshield(P), carHatchGlass(P)); if (P[0] > 1.6) f = Math.min(f, carHeadlight(P), carGrille(P)); }
    // atrás dos para-choques a pele é removida (a borda vertical do corte cai dentro da caixa de roda: nenhuma lasca à vista)
    f = Math.min(f, Math.max(CS.AXF - P[0], P[1] - 0.586), Math.max(P[0] - CS.AXR, P[1] - 0.556));
    return -f;
  };
  const VS = 64 / 152;
  mb.mat(CM.PAINT).color(1, 1, 1);
  mb.patch(carSkinFn(0), 0, 1, 0, VS, { nu: 384, nv: 64, flip: true, uv: seamUV, rim: 0.016, rimMat: m => m.mat(CM.PAINT, 255), field: paintField });
  mb.mat(CM.PAINT).color(1, 1, 1);
  mb.patch(carSkinFn(0), 0, 1, VS, 1, { nu: 384, nv: 100, flip: true, uv: seamUV, rim: 0.016, rimMat: m => m.mat(CM.RUBBER).color(0.018, 0.018, 0.02), field: paintField });
  // --- borrachas das janelas (anel preto sobre a borda do recorte) ---
  const band = (fn, a, b) => (u, v, P) => { const f = fn(P, v); return Math.max(f - b, a - f); };
  mb.mat(CM.RUBBER).color(0.02, 0.02, 0.02);
  carSub(mb, 0.0015, 0.74, -0.39, 0.40, 0.64, 0.012, { field: band(carWinDoor, -0.012, 0.003), uv: plainUV });
  carSub(mb, 0.0015, -0.41, -1.58, 0.40, 0.64, 0.012, { field: band(carWinQuarter, -0.012, 0.003), uv: plainUV });
  carSub(mb, 0.0015, 0.80, 0.02, 0.60, 1, 0.012, { field: band(carWindshield, -0.014, 0.004), uv: plainUV });
  carSub(mb, 0.0015, -1.27, -1.62, 0.60, 1, 0.012, { field: band(carHatchGlass, -0.014, 0.004), uv: plainUV });
  carSub(mb, 0.0012, 1.86, 1.70, 0.62, 1, 0.006, { field: band(carHeadlight, -0.0035, 0.002), uv: plainUV });
  // Ópticas superpuestas: intermitentes y pilotos traseros
  mb.mat(CM.LENS, 2).color(0.62, 0.3, 0.05);
  carSub(mb, 0.002, 1.84, 1.70, 0.25, 0.86, 0.006, { field: (u, v, P) => carCornerLamp(P, v), uv: (u, v, P) => { _cuv[0] = P[0] + P[2]; _cuv[1] = P[1]; return _cuv; }, rim: 0.004 });
  // Piloto trasero enrasado con moldura perimetral oscura
  mb.mat(CM.LENS, 1).color(0.75, 0.03, 0.02);
  carSub(mb, 0.0025, -1.48, -1.688, 0.12, 0.94, 0.007, { field: (u, v, P) => carTailLamp(P, v) - 0.003, uv: (u, v, P) => { _cuv[0] = (P[2] - CT.z0) / (0.74 - CT.z0); _cuv[1] = (P[1] - CT.y0) / (CT.y1 - CT.y0); return _cuv; }, rim: 0.0025 });
  // pisca lateral no para-lama
  mb.mat(CM.LENS, 2).color(0.5, 0.17, 0.012);
  carSub(mb, 0.003, 0.86, 0.74, 0.2, 0.36, 0.005, { field: (u, v, P) => carRRect(P[0] - 0.797, P[1] - 0.745, 0.026, 0.011, 0.004), uv: plainUV, rim: 0.003 });
  // Manilla vertical negra y cerradura
  mb.mat(CM.PLASTIC).color(0.03, 0.03, 0.03);
  carSub(mb, 0.004, -0.30, -0.42, 0.2, 0.37, 0.005, { field: (u, v, P) => carRRect(P[0] + 0.366, P[1] - 0.862, 0.02, 0.055, 0.008), uv: plainUV, rim: 0.004 });
  // fundo das fendas da grade (palhetas pretas)
  mb.mat(CM.GRILLE).color(0.012, 0.012, 0.013);
  carSub(mb, -0.024, 1.86, 1.70, 0.62, 1, 0.012, { field: (u, v, P) => carRRect(P[2], P[1] - 0.694, 0.372, 0.055, 0.005), uv: plainUV });
  // Barra central de calandra en color carrocería
  mb.mat(CM.PAINT, 255).color(1, 1, 1);
  mb.patch((u, v, o) => { o[0] = carTopX(u, v, false) - 0.003; o[1] = v; o[2] = u; }, 0, 0.3565, 0.6845, 0.7045, { nu: 24, nv: 2, flip: true, uv: plainUV });
  mb.quad(carTopX(0.3565, 0.6845, false) - 0.003, 0.6845, 0.3565, carTopX(0, 0.6845, false) - 0.003, 0.6845, 0, carTopX(0, 0.6845, false) - 0.02, 0.6845, 0, carTopX(0.3565, 0.6845, false) - 0.02, 0.6845, 0.3565);
  mb.quad(carTopX(0, 0.7045, false) - 0.003, 0.7045, 0, carTopX(0.3565, 0.7045, false) - 0.003, 0.7045, 0.3565, carTopX(0.3565, 0.7045, false) - 0.02, 0.7045, 0.3565, carTopX(0, 0.7045, false) - 0.02, 0.7045, 0);
  // Revestimiento interior: paneles oscuros y techo claro
  const inner = (u, v, P) => -(Math.min(carWinDoor(P), carWinQuarter(P), v > 0.55 ? Math.min(carWindshield(P), carHatchGlass(P)) : 1) - 0.014);
  mb.mat(CM.INTERIOR).color(0.075, 0.078, 0.085);
  carSub(mb, -0.03, 0.80, -1.63, 0.03, 0.60, 0.026, { field: inner, uv: plainUV, flip: false });
  mb.mat(CM.INTERIOR, 1).color(0.2, 0.2, 0.195);
  carSub(mb, -0.03, 0.80, -1.63, 0.60, 1, 0.026, { field: inner, uv: plainUV, flip: false });
  // --- Cristales ---
  gl.mat(0).color(0.83, 0.915, 0.88);
  const glz = fn => (u, v, P) => fn(P, v) + 0.008;
  carSub(gl, -0.005, 0.74, -0.39, 0.40, 0.64, 0.02, { field: glz(carWinDoor), uv: plainUV });
  carSub(gl, -0.005, -0.41, -1.58, 0.40, 0.64, 0.02, { field: glz(carWinQuarter), uv: plainUV });
  carSub(gl, -0.005, 0.80, 0.02, 0.60, 1, 0.02, { field: glz(carWindshield), uv: plainUV });
  carSub(gl, -0.005, -1.27, -1.62, 0.60, 1, 0.02, { field: glz(carHatchGlass), uv: plainUV });
  gl.mat(1).color(0.93, 0.95, 0.95);
  carSub(gl, -0.003, 1.86, 1.70, 0.62, 1, 0.012, { field: (u, v, P) => carHeadlight(P) + 0.002, uv: (u, v, P) => { _cuv[0] = P[2]; _cuv[1] = P[1]; return _cuv; } });
  mb.mirror(v0, i0, 2); gl.mirror(gv0, gi0, 2);
}

// ---- 30_car_c_parts.js
// Componentes del coche: parachoques, pasos de rueda, faros, espejos, limpiaparabrisas, baca con escalera, ruedas, volante.
// polilinha 2D com cantos arredondados (filete parabólico): pts = [[a,b,raio]...]; at(s) → [a, b, ta, tb]
function carPath(pts) {
  const n = pts.length, cum = [0], dir = [];
  for (let i = 0; i < n - 1; i++) { const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy); cum.push(cum[i] + l); dir.push([dx / l, dy / l]); }
  const L = cum[n - 1];
  return {
    L, at(s, o) {
      s = clamp(s, 0, L); let k = 0; while (k < n - 2 && s > cum[k + 1]) k++;
      const t = s - cum[k]; let a = pts[k][0] + dir[k][0] * t, b = pts[k][1] + dir[k][1] * t, ta = dir[k][0], tb = dir[k][1];
      for (let i = 1; i < n - 1; i++) {
        const r = pts[i][2] || 0; if (!r) continue; const d = s - cum[i]; if (d <= -r || d >= r) continue;
        const g = d < 0 ? (r + d) * (r + d) / (4 * r) : (r - d) * (r - d) / (4 * r), h = d < 0 ? (r + d) / (2 * r) : -(r - d) / (2 * r);
        const ex = dir[i][0] - dir[i - 1][0], ey = dir[i][1] - dir[i - 1][1];
        a += ex * g; b += ey * g; ta += ex * h; tb += ey * h;
      }
      o[0] = a; o[1] = b; o[2] = ta; o[3] = tb; return o;
    }
  };
}
// Cota x de superficie frontal o trasera
function carTopX(z, y, rear) {
  let a = rear ? -1.76 : 1.6, b = rear ? -1.35 : 1.95;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2, f = carYtop(m, z) - y; if ((f > 0) === !rear) a = m; else b = m; }
  return (a + b) / 2;
}
const _cp = new Float64Array(4), _cq = new Float64Array(4);
function carBumper(mb, path, prof, sign, field, nu, nv, sC, side, yTop, taper) {
  // sign: +1 normal para fora = (tz, -tx) (frente), -1 = (-tz, tx) (traseira)
  // side: fator do ressalto na lateral; taper: quanto a borda inferior sobe ao chegar na caixa de roda
  mb.patch((u, v, o) => {
    const sp = u * path.L; path.at(sp, _cp); prof.at(v * prof.L, _cq);
    const l = 1 / Math.hypot(_cp[2], _cp[3]), nx = _cp[3] * l * sign, nz = -_cp[2] * l * sign;
    const k = _cq[0] > 0 ? lerp(1, side, smooth(sC - 0.06, sC + 0.14, sp)) : 1;
    const hk = 1 - taper * smooth(sC + 0.05, path.L, sp);
    o[0] = _cp[0] + nx * _cq[0] * k; o[1] = yTop - (yTop - _cq[1]) * hk; o[2] = _cp[1] + nz * _cq[0] * k;
  }, 0, 1, 0, 1, { nu, nv, flip: sign < 0, field, rim: 0.02, uv: (u, v, P) => { _cuv[0] = P[2]; _cuv[1] = P[1]; return _cuv; } });
}
function carBuildParts(mb, gl) {
  const v0 = mb.nv, i0 = mb.ni, gv0 = gl.nv, gi0 = gl.ni;
  // ================= para-choques (plástico preto texturizado) =================
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.021);
  // Parachoques delantero bajo ópticas
  const fPath = carPath([[1.869, 0], [1.862, 0.30, 0.15], [1.838, 0.56, 0.12], [1.822, 0.686, 0.07], [1.70, 0.702, 0.06], [1.49, 0.722, 0.1], [1.25, 0.742]]);
  // perfil: borda superior saliente (lábio), face, friso rebaixado, saia
  const fProf = carPath([[-0.09, 0.600], [0.026, 0.598, 0.004], [0.034, 0.590, 0.004], [0.034, 0.574, 0.004], [0.029, 0.568, 0.004], [0.029, 0.474, 0.003], [0.023, 0.470, 0.003], [0.023, 0.458, 0.003], [0.029, 0.454, 0.003], [0.028, 0.340, 0.012], [0.006, 0.308, 0.008], [-0.07, 0.300]]);
  const fSC = 0.30 + 0.261 + 0.127;
  carBumper(mb, fPath, fProf, 1, (u, v, P) => {
    let f = carArchF(P) - 0.004;
    // entradas de ar laterais, fenda acima da placa e rebaixo da placa
    if (P[0] > 1.78) f = Math.min(f, carRRect(P[2] - 0.45, P[1] - 0.386, 0.15, 0.026, 0.01), carRRect(P[2], P[1] - 0.538, 0.21, 0.0075, 0.006), carRRect(P[2], P[1] - 0.476, 0.212, 0.072, 0.008), carRRect(P[2], P[1] - 0.352, 0.19, 0.03, 0.01));   // + entrada de ar central abaixo da placa
    return -f;
  }, 150, 46, fSC, 0.3, 0.600, 0.3);
  const rPath = carPath([[-1.692, 0], [-1.688, 0.30, 0.15], [-1.674, 0.58, 0.1], [-1.657, 0.70, 0.07], [-1.60, 0.722, 0.05], [-1.49, 0.735, 0.1], [-1.26, 0.751]]);
  const rProf = carPath([[-0.09, 0.572], [0.023, 0.570, 0.004], [0.031, 0.562, 0.004], [0.031, 0.547, 0.004], [0.026, 0.541, 0.004], [0.026, 0.468, 0.003], [0.02, 0.464, 0.003], [0.02, 0.452, 0.003], [0.026, 0.448, 0.003], [0.025, 0.376, 0.014], [0.006, 0.346, 0.008], [-0.07, 0.338]]);
  carBumper(mb, rPath, rProf, -1, (u, v, P) => -(carArchF(P) - 0.004), 124, 42, 0.30 + 0.28 + 0.121, 0.4, 0.572, 0.22);
  // fundo das entradas de ar dianteiras (palhetas)
  mb.mat(CM.GRILLE, 1).color(0.008, 0.008, 0.009);
  mb.quad(1.862, 0.33, 0.62, 1.862, 0.33, 0, 1.862, 0.425, 0, 1.862, 0.425, 0.62);
  mb.quad(1.876, 0.522, 0.23, 1.876, 0.522, 0, 1.876, 0.552, 0, 1.876, 0.552, 0.23);
  // fundo do rebaixo da placa
  mb.mat(CM.PLASTIC).color(0.016, 0.016, 0.017);
  mb.quad(1.886, 0.396, 0.222, 1.886, 0.396, 0, 1.886, 0.556, 0, 1.886, 0.556, 0.222);
  // ================= caixas de roda e fundo =================
  mb.mat(CM.UNDER).color(0.006, 0.006, 0.007);
  for (const ax of [CS.AXF, CS.AXR]) {
    const R0 = CS.ARCH_R + 0.006, N = 28, zo = carZL(ax, 0.55) - 0.012, zi = 0.33;
    for (let i = 0; i < N; i++) {
      // Revestimiento inferior a cota de parachoques
      const aS = ax > 0 ? 12 : -18, aE = ax > 0 ? 198 : 163;
      const a0 = (aS + (aE - aS) * i / N) * PI / 180, a1 = (aS + (aE - aS) * (i + 1) / N) * PI / 180;
      const x0 = ax + Math.cos(a0) * R0, y0 = CS.ARCH_Y + Math.sin(a0) * R0, x1 = ax + Math.cos(a1) * R0, y1 = CS.ARCH_Y + Math.sin(a1) * R0;
      const a = mb.v(x0, y0, zo, -Math.cos(a0), -Math.sin(a0), 0, 0, 0), b = mb.v(x0, y0, zi, -Math.cos(a0), -Math.sin(a0), 0, 0, 1), c = mb.v(x1, y1, zi, -Math.cos(a1), -Math.sin(a1), 0, 1, 1), d = mb.v(x1, y1, zo, -Math.cos(a1), -Math.sin(a1), 0, 1, 0);
      mb.quadI(a, d, c, b);
    }
    mb.quad(ax - 0.33, 0.25, zi, ax + 0.33, 0.25, zi, ax + 0.33, 0.66, zi, ax - 0.33, 0.66, zi);
  }
  // fechamentos sob os para-choques (escuros) + assoalho por baixo (meio carro; espelhado depois)
  mb.quad(1.56, 0.2, 0.56, 1.56, 0.2, 0, 1.56, 0.42, 0, 1.56, 0.42, 0.56);
  mb.quad(-1.33, 0.2, 0, -1.33, 0.2, 0.56, -1.33, 0.42, 0.56, -1.33, 0.42, 0);
  // Fondo plano elevado bajo voladizos
  mb.quad(1.56, 0.42, 0, 1.86, 0.42, 0, 1.86, 0.42, 0.72, 1.56, 0.42, 0.72);
  mb.quad(-1.68, 0.42, 0, -1.33, 0.42, 0, -1.33, 0.42, 0.74, -1.68, 0.42, 0.74);
  // Suelo plano entre pasos de rueda
  // aparecia como um risco fino horizontal na calota)
  mb.quad(-0.84, 0.2, 0, 0.84, 0.2, 0, 0.84, 0.2, 0.705, -0.84, 0.2, 0.705);
  mb.quad(0.84, 0.2, 0, 1.56, 0.2, 0, 1.56, 0.2, 0.5, 0.84, 0.2, 0.5);
  mb.quad(-1.33, 0.2, 0, -0.84, 0.2, 0, -0.84, 0.2, 0.5, -1.33, 0.2, 0.5);
  // ================= Faro: reflector cromado tras la lente =================
  {
    const z0 = CL.hlZ0 + 0.003, z1 = CL.hlZ1 - 0.003, y0 = CL.lY - CL.lH + 0.003, y1 = CL.lY + CL.lH - 0.003, D = 0.062;
    const zc = (z0 + z1) / 2, yc = (y0 + y1) / 2, hz = (z1 - z0) / 2, hy = (y1 - y0) / 2;
    const dep = (a, b) => 0.006 + D * Math.pow(Math.max(0, (1 - a * a * a * a) * (1 - b * b * b * b)), 0.6);
    mb.mat(CM.REFLECTOR).color(0.9, 0.9, 0.92);
    mb.patch((u, v, o) => { const z = zc + u * hz, y = yc + v * hy, d = dep(u, v), x = carTopX(z, y, false); o[0] = x - d * 0.97; o[1] = y - d * 0.2; o[2] = z; }, -1, 1, -1, 1, { nu: 22, nv: 12, flip: true, uv: (u, v, P) => { _cuv[0] = u; _cuv[1] = v; return _cuv; } });
    // lâmpada (pequena, no fundo da cuba)
    const xb = carTopX(zc, yc, false) - (dep(0, 0) - 0.012) * 0.97, ybb = yc - (dep(0, 0) - 0.012) * 0.2;
    // Bombilla con casquillo cromado en el centro de la parábola
    mb.push(m4translate(m4(), xb, ybb, zc)); mb.push(m4rotZ(m4(), -PI / 2 + 0.2));
    mb.mat(CM.REFLECTOR, 1).color(1, 0.95, 0.8); mb.cyl(0, -0.012, 0, 0.0105, 0.024, 0.0095, 12, false, true);
    mb.mat(CM.REFLECTOR, 2).color(0.85, 0.85, 0.86); mb.cyl(0, -0.012, 0, 0.016, -0.007, 0.014, 14, false, true);   // colar prateado (o cromado refletia escuro: virava ponto preto)
    mb.mat(CM.REFLECTOR, 2).color(0.6, 0.6, 0.6); mb.cyl(0, 0.022, 0, 0.0105, 0.029, 0.007, 12, false, true);   // Capuchón plateado antideslumbrante
    mb.pop(); mb.pop();
  }
  // ================= retrovisores externos: carcaça retangular, braço sanfonado, base na porta =================
  mb.mat(CM.PLASTIC).color(0.013, 0.013, 0.014);
  mb.push(m4translate(m4(), 0.566, 1.004, 0.905)); mb.push(m4rotY(m4(), 0.14));
  mb.rbox(0, 0, 0, 0.078, 0.108, 0.185, 0.024, 5);
  mb.mat(CM.MIRROR).color(0.62, 0.64, 0.67);
  mb.quad(-0.0395, -0.041, -0.078, -0.0395, -0.041, 0.078, -0.0395, 0.041, 0.078, -0.0395, 0.041, -0.078);
  mb.pop(); mb.pop();
  mb.mat(CM.RUBBER).color(0.012, 0.012, 0.013);
  mb.push(m4translate(m4(), 0.576, 0.994, 0.742)); mb.push(m4rotY(m4(), -PI / 2));
  { const pr = []; for (let i = 0; i <= 12; i++) pr.push([i * 0.006, 0.031 + (i & 1 ? 0.006 : 0) - i * 0.0004]); mb.lathe(pr, 18); }
  mb.pop(); mb.pop();
  mb.mat(CM.PLASTIC).color(0.013, 0.013, 0.014);
  mb.rbox(0.596, 0.994, 0.742, 0.13, 0.085, 0.02, 0.008, 2);
  // ================= interior (metade direita; espelhado) =================
  mb.mat(CM.INTERIOR).color(0.05, 0.05, 0.055);
  mb.quad(-0.86, 0.235, 0.72, 0.85, 0.235, 0.72, 0.85, 0.235, 0, -0.86, 0.235, 0);
  mb.quad(-1.33, 0.235, 0.5, -0.86, 0.235, 0.5, -0.86, 0.235, 0, -1.33, 0.235, 0);   // ao lado das rodas traseiras o carpete é estreito (o plano inteiro atravessava a calota: risco fino horizontal)
  mb.quad(-1.63, 0.45, 0.72, -1.33, 0.45, 0.72, -1.33, 0.45, 0, -1.63, 0.45, 0);                         // assoalho do porta-malas (acima do fundo elevado)                       // assoalho (carpete)
  mb.quad(0.82, 0.2, 0, 0.82, 0.2, 0.72, 0.82, 0.93, 0.72, 0.82, 0.93, 0);                               // parede corta-fogo
  mb.mat(CM.INTERIOR, 3).color(0.045, 0.045, 0.05);
  mb.rbox(0.60, 0.80, 0.34, 0.40, 0.22, 0.70, 0.05, 4);                                                  // painel
  mb.rbox(0.45, 0.52, 0.05, 0.3, 0.34, 0.12, 0.03, 2);                                                   // console
  mb.mat(CM.INTERIOR, 3).color(0.075, 0.075, 0.082); mb.rbox(0.62, 0.915, 0.34, 0.34, 0.024, 0.69, 0.01, 2);              // tampo do painel (mais claro)
  mb.mat(CM.GRILLE).color(0.02, 0.02, 0.022);                                                                              // saídas de ar (palhetas)
  mb.box(0.397, 0.862, 0.615, 0.008, 0.045, 0.1); mb.box(0.397, 0.862, 0.09, 0.008, 0.045, 0.1);
  mb.mat(CM.INTERIOR, 3).color(0.03, 0.03, 0.034); mb.rbox(0.396, 0.775, 0.34, 0.012, 0.085, 0.3, 0.005, 2);               // tampa do porta-luvas / rádio
  // banco dianteiro
  const seat = (x, z, w, color) => {
    mb.mat(CM.INTERIOR, 4).color(color[0], color[1], color[2]);
    mb.rbox(x, 0.43, z, 0.5, 0.15, w, 0.055, 4);
    mb.push(m4translate(m4(), x - 0.26, 0.47, z)); mb.push(m4rotZ(m4(), 0.33)); mb.rbox(0, 0.3, 0, 0.13, 0.6, w - 0.02, 0.055, 4);
    mb.color(color[0] * 1.9, color[1] * 1.9, color[2] * 2.1); mb.rbox(0.058, 0.3, 0, 0.03, 0.46, w - 0.2, 0.012, 2); mb.pop(); mb.pop();   // inserto de tecido claro no encosto
    mb.rbox(x + 0.02, 0.498, z, 0.36, 0.03, w - 0.2, 0.012, 2);                                                                          // e no assento
  };
  seat(-0.03, 0.345, 0.5, [0.07, 0.072, 0.08]);
  mb.push(m4translate(m4(), -0.29, 0.47, 0.345)); mb.push(m4rotZ(m4(), 0.33));
  mb.mat(CM.INTERIOR, 2).color(0.065, 0.067, 0.075); mb.rbox(0.005, 0.71, 0, 0.1, 0.17, 0.25, 0.04, 4);
  mb.mat(CM.STEEL).color(0.3, 0.3, 0.3); mb.cyl(0, 0.58, -0.06, 0.006, 0.64, 0.006, 6); mb.cyl(0, 0.58, 0.06, 0.006, 0.64, 0.006, 6);
  mb.pop(); mb.pop();
  // banco traseiro (inteiriço) e tampão
  mb.mat(CM.INTERIOR, 4).color(0.07, 0.072, 0.08);
  mb.rbox(-0.93, 0.45, 0.31, 0.46, 0.15, 0.62, 0.055, 4);
  mb.push(m4translate(m4(), -1.16, 0.5, 0.31)); mb.push(m4rotZ(m4(), 0.36)); mb.rbox(0, 0.25, 0, 0.12, 0.52, 0.62, 0.05, 4); mb.pop(); mb.pop();
  mb.mat(CM.INTERIOR).color(0.04, 0.04, 0.045); mb.box(-1.40, 0.925, 0.3, 0.28, 0.02, 0.6);
  // ================= rack de teto (pés) =================
  mb.mat(CM.STEEL).color(0.03, 0.03, 0.032);
  for (const xb of [CRK.x0, CRK.x1]) {
    const st = carStation(xb);
    mb.rbox(xb, st.yE + 0.045, st.zE - 0.035, 0.075, 0.07, 0.06, 0.012, 2);
    mb.push(m4translate(m4(), xb, st.yE - 0.012, st.zE + 0.012)); mb.push(m4rotX(m4(), 0.34)); mb.box(0, 0, 0, 0.06, 0.07, 0.006); mb.pop(); mb.pop();
  }
  mb.mirror(v0, i0, 2); gl.mirror(gv0, gi0, 2);
  // ======================= Componentes asimétricos =======================
  // barras do rack + escada + cintas
  mb.mat(CM.STEEL).color(0.035, 0.035, 0.038);
  for (const xb of [CRK.x0, CRK.x1]) mb.rbox(xb, CRK.barY, 0, 0.036, 0.028, 1.2, 0.006, 2);
  carLadder(mb);
  // limpadores
  carWipers(mb);
  // escapamento: silencioso transversal (aço fosco) + ponteira curta saindo para trás, como na foto
  mb.mat(CM.STEEL, 1).color(0.03, 0.03, 0.032);
  mb.push(m4translate(m4(), -1.43, 0.272, 0.0)); mb.push(m4rotX(m4(), PI / 2)); mb.cyl(0, 0, 0, 0.062, 0.34, 0.062, 20, true, true); mb.pop(); mb.pop();
  mb.mat(CM.STEEL, 1).color(0.035, 0.035, 0.038);
  mb.tube([[-1.44, 0.268, -0.2], [-1.56, 0.26, -0.2], [-1.705, 0.256, -0.2]], 0.019, 10);   // ponteira curta, escura, reta para trás
  // volante: coluna fixa
  mb.mat(CM.INTERIOR, 3).color(0.04, 0.04, 0.045);
  mb.tube([[0.36, 0.875, -0.36], [0.56, 0.80, -0.36]], 0.03, 10);
  mb.rbox(0.47, 0.925, -0.36, 0.2, 0.07, 0.32, 0.03, 3);        // capela dos instrumentos
  // retrovisor interno, alavanca de câmbio, freio de mão
  mb.rbox(0.23, 1.29, 0, 0.025, 0.055, 0.2, 0.012, 2); mb.tube([[0.24, 1.29, 0], [0.2, 1.35, 0]], 0.008, 6);
  mb.tube([[0.2, 0.42, 0.0], [0.17, 0.6, 0.0]], 0.01, 6); mb.rbox(0.168, 0.62, 0, 0.045, 0.045, 0.045, 0.02, 3);
  mb.rbox(-0.12, 0.40, 0, 0.3, 0.05, 0.04, 0.015, 2);
  // Piloto: torso, brazos al volante y casco
  {
    const zd = -0.345;
    mb.mat(CM.INTERIOR, 2).color(0.2, 0.028, 0.03);   // macacão vermelho-escuro
    mb.push(m4translate(m4(), -0.245, 0.50, zd)); mb.push(m4rotZ(m4(), 0.30));
    mb.rbox(0.085, 0.27, 0, 0.2, 0.54, 0.36, 0.08, 4);                 // tronco
    mb.rbox(0.085, 0.50, 0, 0.17, 0.1, 0.44, 0.045, 3);                // ombros
    mb.pop(); mb.pop();
    mb.rbox(0.02, 0.535, zd, 0.44, 0.13, 0.34, 0.06, 3);               // coxas
    for (const sg of [-1, 1]) mb.tube([[-0.26, 0.97, zd + sg * 0.2], [-0.02, 0.86, zd + sg * 0.215], [0.275, 0.93, -0.36 + sg * 0.165]], 0.043, 8);   // braços
    mb.mat(CM.INTERIOR, 3).color(0.02, 0.02, 0.022);
    for (const sg of [-1, 1]) mb.rbox(0.285, 0.935, -0.36 + sg * 0.17, 0.085, 0.07, 0.075, 0.03, 2);   // luvas
    mb.rbox(-0.275, 1.035, zd, 0.1, 0.07, 0.11, 0.03, 2);              // pescoço
    // cinto de segurança diagonal (ombro esquerdo → quadril direito), à frente do tronco
    mb.mat(CM.INTERIOR, 3).color(0.012, 0.012, 0.013);
    mb.sweep([[-0.262, 1.0, zd - 0.15], [-0.15, 0.82, zd - 0.02], [-0.085, 0.63, zd + 0.15]], [[-0.022, 0.004], [0.022, 0.004], [0.022, -0.004], [-0.022, -0.004]], { closedProfile: true, hard: true, up: [1, 0.3, 0] });
    mb.mat(CM.GLOSS).color(0.05, 0.052, 0.058);   // Casco integral grafito visto por cristal; mono rojo oscuro
    mb.rbox(-0.262, 1.168, zd, 0.25, 0.25, 0.228, 0.112, 7);          // casco
    mb.rbox(-0.236, 1.092, zd, 0.186, 0.105, 0.206, 0.05, 5);         // queixeira (rente ao casco)
    mb.mat(CM.GLOSS, 1).color(0.01, 0.011, 0.014);
    mb.rbox(-0.2, 1.178, zd, 0.13, 0.08, 0.233, 0.034, 5);        // viseira: faixa escura que envolve a frente e os lados do casco
  }
  // emblema dianteiro: cinco barras cromadas inclinadas sobrepostas ao centro da grade (ocupam a altura das duas fendas)
  {
    const y = 0.694, x = carTopX(0, y, false), xu = carTopX(0, y + 0.02, false), sl = (xu - x) / 0.02, l = Math.hypot(1, sl);
    const B = m4basis(m4(), 0, 0, -1, sl / l, 1 / l, 0, 1 / l, -sl / l, 0, x + 0.002, y, 0);
    mb.mat(CM.CHROME, 2).color(0.93, 0.93, 0.95); mb.push(B);
    const sh = m4(); sh[4] = 0.3;
    mb.push(sh); for (let i = 0; i < 5; i++) mb.rbox((i - 2) * 0.0165, 0, 0.004, 0.0072, 0.09, 0.008, 0.002, 2); mb.pop(); mb.pop();
  }
  // placas e emblemas traseiros (decalques do atlas)
  carDecals(mb);
}
const CRK = { x0: 0.0, x1: -0.98, barY: 1.47, railZ: 0.205, lx0: -1.98, lx1: 1.22 };
function carLadder(mb) {
  const yb = CRK.barY + 0.014, h = 0.062, yc = yb + h / 2, L = CRK.lx1 - CRK.lx0, xc = (CRK.lx0 + CRK.lx1) / 2;
  // longarinas (perfil retangular) e ponteiras de borracha
  for (const s of [-1, 1]) {
    mb.mat(CM.ALU).color(0.86, 0.87, 0.88); mb.rbox(xc, yc, s * CRK.railZ, L, h, 0.024, 0.004, 1);
    mb.mat(CM.RUBBER).color(0.02, 0.02, 0.02);
    mb.rbox(CRK.lx0 - 0.012, yc, s * CRK.railZ, 0.04, h + 0.008, 0.034, 0.006, 1); mb.rbox(CRK.lx1 + 0.012, yc, s * CRK.railZ, 0.04, h + 0.008, 0.034, 0.006, 1);
  }
  // degraus
  mb.mat(CM.ALU, 1).color(0.88, 0.89, 0.9);
  const n = 11, sp = 0.28, xs = xc - (n - 1) * sp / 2;
  mb.push(m4rotX(m4(), PI / 2));
  for (let i = 0; i < n; i++) mb.cyl(xs + i * sp, -CRK.railZ - 0.0135, -yc, 0.017, CRK.railZ + 0.0135, 0.017, 14, true, true);
  mb.pop();
  // cintas com catraca, uma em cada barra
  for (const xb of [CRK.x0, CRK.x1]) {
    const z0 = CRK.railZ + 0.0165, y0 = CRK.barY - 0.0165, y1 = yb + h + 0.0025, r = 0.008, path = [];
    const corner = (cz, cy, a0) => { for (let k = 0; k <= 4; k++) { const a = a0 + k * PI / 8; path.push([xb, cy + Math.sin(a) * r, cz + Math.cos(a) * r]); } };
    corner(z0 - r, y1 - r, 0); corner(-z0 + r, y1 - r, PI / 2); corner(-z0 + r, y0 + r, PI); corner(z0 - r, y0 + r, 1.5 * PI);
    mb.mat(CM.STRAP).color(0.85, 0.28, 0.02);
    mb.sweep(path, [[-0.0013, -0.019], [0.0013, -0.019], [0.0013, 0.019], [-0.0013, 0.019]], { closed: true, closedProfile: true, hard: true, up: [1, 0, 0], vScale: 0.02 });
    // catraca e sobra da cinta
    mb.mat(CM.CHROME, 1).color(0.62, 0.62, 0.64); mb.rbox(xb, y1 + 0.011, 0.07, 0.052, 0.02, 0.085, 0.004, 1);
    mb.rbox(xb, y1 + 0.028, 0.1, 0.04, 0.012, 0.07, 0.004, 1);
    mb.mat(CM.STRAP).color(0.85, 0.28, 0.02); mb.box(xb, y1 + 0.004, -0.06, 0.036, 0.004, 0.14);
  }
}
function carWipers(mb) {
  const wip = (zp, z1, xe0, lift) => {
    // braço do pivô até o meio da palheta; palheta deitada na base do para-brisa
    const P = (z, xe) => { const zz = z / 0.72, x = xe + carBulge(xe) * (1 - zz * zz); return [x, carYtop(x, z) + 0.016, z]; };
    mb.mat(CM.RUBBER).color(0.015, 0.015, 0.015);
    const zm = (zp + z1) / 2, a = P(zp, 0.69), m = P(zm + (z1 - zp) * 0.1, xe0 - lift * 0.5);
    mb.rbox(a[0], a[1] - 0.004, a[2], 0.03, 0.022, 0.03, 0.008, 2);
    mb.sweep([a, [(a[0] + m[0]) / 2, (a[1] + m[1]) / 2 + 0.006, (a[2] + m[2]) / 2], m], [[-0.006, -0.003], [0.006, -0.003], [0.006, 0.003], [-0.006, 0.003]], { closedProfile: true, hard: true });
    const pts = []; for (let k = 0; k <= 8; k++) { const z = lerp(zp + (z1 - zp) * 0.12, z1, k / 8); pts.push(P(z, lerp(xe0, xe0 - lift, k / 8))); }
    mb.sweep(pts, [[-0.007, -0.008], [0.007, -0.008], [0.004, 0.006], [-0.004, 0.006]], { closedProfile: true, hard: true });
  };
  wip(0.30, -0.22, 0.655, 0.03); wip(-0.24, -0.66, 0.655, 0.05);
  // limpador traseiro
  mb.mat(CM.RUBBER).color(0.015, 0.015, 0.015);
  const PR = (z, y) => { const x = carTopX(z, y, true); return [x - 0.016, y + 0.006, z]; };
  const a = PR(0.02, 0.975), b = PR(-0.2, 1.01);
  mb.rbox(a[0], a[1], a[2], 0.03, 0.03, 0.03, 0.008, 2);
  mb.sweep([a, b], [[-0.005, -0.003], [0.005, -0.003], [0.005, 0.003], [-0.005, 0.003]], { closedProfile: true, hard: true });
  const pts = []; for (let k = 0; k <= 6; k++) pts.push(PR(lerp(0.0, -0.4, k / 6), 1.015 + 0.012 * k / 6));
  mb.sweep(pts, [[-0.006, -0.006], [0.006, -0.006], [0.003, 0.006], [-0.003, 0.006]], { closedProfile: true, hard: true });
}
// regiões do atlas (u0, v0, u1, v1)
const CAT = { plate: [0, 0, 0.5, 0.332], fiat: [0.5, 0, 0.75, 0.16], mille: [0.5, 0.18, 0.95, 0.4] };
function carDecals(mb) {
  // Quad sobre superficie delantera/trasera
  const dq = (reg, zc, y0, w, h, rear, lift) => {
    const P = (z, y) => { const x = rear ? carTopX(z, y, true) - lift : lift; return [x, y, z]; };
    const s = rear ? 1 : -1, a = P(zc - s * w / 2, y0), b = P(zc + s * w / 2, y0), c = P(zc + s * w / 2, y0 + h), d = P(zc - s * w / 2, y0 + h);
    mb.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2], reg[0], reg[3], reg[2], reg[1]);
  };
  mb.mat(CM.DECAL).color(1, 1, 1);
  dq(CAT.plate, 0, 0.652, 0.40, 0.13, true, 0.006);
  dq(CAT.plate, 0, 0.411, 0.40, 0.13, false, 1.8885);
  mb.mat(CM.DECAL, 1).color(1, 1, 1);
  dq(CAT.fiat, -0.40, 0.925, 0.145, 0.046, true, 0.003);
  dq(CAT.mille, 0.37, 0.932, 0.175, 0.043, true, 0.003);
  // moldura preta das placas e fechadura da tampa
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.02);
  const lk = [carTopX(0.33, 0.7, true) - 0.006, 0.7, 0.33];
  mb.rbox(lk[0], lk[1], lk[2], 0.014, 0.036, 0.11, 0.006, 2);
}
// ---------- atlas de emblemas e placa (canvas 2D por caminhos; letras em traços) ----------
const CGLYPH = {
  F: [[[0, 0], [0, 1], [0.75, 1]], [[0, 0.52], [0.55, 0.52]]], I: [[[0.2, 0], [0.2, 1]]], A: [[[0, 0], [0.4, 1], [0.8, 0]], [[0.15, 0.36], [0.65, 0.36]]], T: [[[0, 1], [0.8, 1]], [[0.4, 1], [0.4, 0]]],
  M: [[[0, 0], [0, 1], [0.45, 0.3], [0.9, 1], [0.9, 0]]], i: [[[0.12, 0], [0.12, 0.6]], [[0.12, 0.84], [0.12, 0.88]]], l: [[[0.12, 0], [0.12, 1]]],
  e: [[[0.06, 0.32], [0.62, 0.32], [0.6, 0.48], [0.46, 0.62], [0.24, 0.62], [0.09, 0.48], [0.06, 0.28], [0.13, 0.09], [0.3, 0], [0.5, 0.02], [0.62, 0.12]]],
  E: [[[0.72, 0], [0, 0], [0, 1], [0.72, 1]], [[0, 0.52], [0.52, 0.52]]], P: [[[0, 0], [0, 1], [0.52, 1], [0.72, 0.88], [0.72, 0.62], [0.52, 0.5], [0, 0.5]]],
  U: [[[0, 1], [0, 0.25], [0.14, 0.05], [0.4, 0], [0.66, 0.05], [0.8, 0.25], [0.8, 1]]], N: [[[0, 0], [0, 1], [0.8, 0], [0.8, 1]]],
  O: [[[0.4, 0], [0.14, 0.08], [0, 0.3], [0, 0.7], [0.14, 0.92], [0.4, 1], [0.66, 0.92], [0.8, 0.7], [0.8, 0.3], [0.66, 0.08], [0.4, 0]]],
  1: [[[0.12, 0.74], [0.42, 1], [0.42, 0]]], 9: [[[0.7, 0.62], [0.55, 0.46], [0.3, 0.46], [0.1, 0.6], [0.1, 0.85], [0.3, 1], [0.52, 1], [0.7, 0.85], [0.7, 0.3], [0.55, 0.05], [0.3, 0], [0.12, 0.1]]],
  6: [[[0.66, 0.9], [0.5, 1], [0.3, 1], [0.12, 0.82], [0.1, 0.3], [0.25, 0.03], [0.5, 0], [0.68, 0.15], [0.7, 0.4], [0.52, 0.56], [0.3, 0.56], [0.12, 0.42]]],
  '-': [[[0.1, 0.48], [0.5, 0.48]]],
};
const CADV = { I: 0.45, i: 0.3, l: 0.3, M: 1.12, '-': 0.6, 1: 0.7, e: 0.82 };
function carText(g, txt, x, y, h, lw, skew) {
  g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const ch of txt) {
    const gl = CGLYPH[ch];
    if (gl) for (const st of gl) { g.beginPath(); st.forEach((p, i) => { const px = x + (p[0] + (skew || 0) * p[1]) * h * 0.72, py = y - p[1] * h; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); }
    x += (CADV[ch] || 1.0) * h * 0.72 + lw * 0.6;
  }
  return x;
}
function carAtlas() {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  // Placa de matrícula histórica
  g.fillStyle = '#b9bcbc'; g.fillRect(0, 0, 512, 170); g.strokeStyle = '#1a1a1a'; g.lineWidth = 6; g.strokeRect(5, 5, 502, 160);
  g.fillStyle = '#9fa3a3'; g.fillRect(150, 12, 212, 26); g.strokeStyle = '#222'; carText(g, 'UNO Mille', 178, 34, 17, 2.4, 0);
  g.strokeStyle = '#141414'; carText(g, 'UNO-1996', 30, 146, 76, 11, 0);
  g.fillStyle = '#777'; g.beginPath(); g.arc(28, 24, 6, 0, TAU); g.arc(484, 24, 6, 0, TAU); g.fill();
  // emblema FIAT: quatro losangos azuis com letras prateadas
  for (let i = 0; i < 4; i++) {
    const x = 518 + i * 60; g.fillStyle = '#16327a'; g.beginPath(); g.moveTo(x + 10, 6); g.lineTo(x + 58, 6); g.lineTo(x + 48, 74); g.lineTo(x, 74); g.closePath(); g.fill();
    g.strokeStyle = '#e4e8ec'; carText(g, 'FIAT'[i], x + 13 + (i === 1 ? 7 : 0), 66, 52, 12.5, 0.14);
  }
  // "Mille EP": Mille em cinza-escuro itálico, EP em vermelho
  // "Mille" em letra cursiva ligada (curvas), "EP" em itálico vermelho
  const SCR = {
    M: [1.02, [0, 0, 0.03, 0.62, 0.17, 1.0], [0.25, 0.5, 0.34, 0.08], [0.43, 0.62, 0.57, 1.0], [0.63, 0.5, 0.7, 0.1], [0.77, -0.05, 0.98, 0.13]],
    i: [0.36, [0, 0.13, 0.1, 0.32, 0.14, 0.62], [0.1, 0.2, 0.17, 0.06], [0.23, -0.03, 0.36, 0.13]],
    l: [0.36, [0, 0.13, 0.2, 0.5, 0.2, 0.9], [0.18, 1.07, 0.12, 0.9], [0.06, 0.5, 0.14, 0.08], [0.2, -0.03, 0.36, 0.13]],
    e: [0.5, [0, 0.13, 0.25, 0.3, 0.31, 0.48], [0.3, 0.67, 0.18, 0.62], [0.04, 0.5, 0.1, 0.2], [0.19, -0.05, 0.47, 0.15]],
  };
  let xs = 526; const hs = 84, sk = 0.3, ys = 190, T = (x, y) => [xs + (x + sk * y) * hs, ys - y * hs];
  g.strokeStyle = '#1c1e22'; g.lineWidth = 10; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const ch of 'Mille') {
    const d = SCR[ch]; g.beginPath(); let p = T(d[1][0], d[1][1]); g.moveTo(p[0], p[1]);
    let c = T(d[1][2], d[1][3]), e = T(d[1][4], d[1][5]); g.quadraticCurveTo(c[0], c[1], e[0], e[1]);
    for (let k = 2; k < d.length; k++) { c = T(d[k][0], d[k][1]); e = T(d[k][2], d[k][3]); g.quadraticCurveTo(c[0], c[1], e[0], e[1]); }
    g.stroke();
    if (ch === 'i') { const q = T(0.17, 0.86); g.beginPath(); g.arc(q[0], q[1], 6, 0, TAU); g.fillStyle = '#1c1e22'; g.fill(); }
    xs += d[0] * hs;
  }
  const xe = xs + 4;
  g.strokeStyle = '#d0281a'; carText(g, 'EP', xe + 20, 190, 86, 16, 0.24);
  const im = g.getImageData(0, 0, W, H);
  const tex = mkTex(W, H, 'rgba8unorm-srgb', TU.RT | TU.TB | TU.CD, { mipLevelCount: 6 });
  G.dev.queue.writeTexture({ texture: tex }, im.data, { bytesPerRow: W * 4 }, [W, H]);
  genMips(tex, 'rgba8unorm-srgb');
  return tex;
}
// ---------- roda (eixo Z local; face externa em +Z) ----------
function carBuildWheel(mb, mbBlur) {
  mb.push(m4rotY(m4(), -PI / 2));    // X local do torno → +Z
  mb.push(m4translate(m4(), -0.015, 0, 0));   // Rueda desplazada al interior del paso de rueda
  const R = CAR.wheelR, hw = 0.0725, seg = 72;
  // flanco interno, banda com sulcos, flanco externo
  const tj = [0.5, 1];
  mb.mat(CM.TIRE, 255).color(0.02, 0.02, 0.021);
  mb.lathe([[-0.058, 0.168], [-0.066, 0.18], [-0.0735, 0.205], [-0.074, 0.228], [-0.071, 0.25], [-0.066, 0.264, 0.5, 1]], seg);
  mb.lathe([[0.066, 0.264, 0.5, -1], [0.071, 0.25], [0.074, 0.228], [0.0735, 0.205], [0.066, 0.18], [0.058, 0.168]], seg);
  mb.mat(CM.TIRE, 0);
  const tread = [[-0.066, 0.264, 0.5, 1], [-0.061, 0.2745], [-0.052, 0.2795]];
  const groove = (x) => { tread.push([x - 0.0045, R], [x - 0.0036, R - 0.0065], [x + 0.0036, R - 0.0065], [x + 0.0045, R]); };
  tread.push([-0.041, R]); groove(-0.033); groove(-0.011); groove(0.011); groove(0.033); tread.push([0.041, R]);
  tread.push([0.052, 0.2795], [0.061, 0.2745], [0.066, 0.264, 0.5, -1]);
  mb.lathe(tread, seg);
  // aro de aço: borda aparente, fundo atrás da calota, lado interno
  mb.mat(CM.STEEL, 1).color(0.035, 0.035, 0.038);
  mb.lathe([[0.058, 0.168], [0.062, 0.171], [0.064, 0.168], [0.062, 0.164], [0.04, 0.16], [0.03, 0.13], [0.03, 0.0]], 40);
  mb.lathe([[-0.02, 0.0], [-0.02, 0.1], [-0.05, 0.158], [-0.06, 0.166], [-0.058, 0.168]], 32);
  // calota prateada com 14 rasgos radiais
  mb.mat(CM.HUBCAP).color(0.62, 0.63, 0.65);
  const NS = 16, prof = r => { const t = r / 0.166; return 0.0715 - 0.021 * t * t - 0.004 * smooth(0.028, 0.036, r) + 0.004 * smooth(0.06, 0.09, r) - 0.004 * smooth(0.15, 0.166, r); };
  mb.patch((u, v, o) => { const a = u * TAU, r = v * 0.1665; o[0] = prof(r); o[1] = r * Math.cos(a); o[2] = r * Math.sin(a); }, 0, 1.003, 0.0, 1, {   // 1.003: sobrepõe a emenda angular (sem fresta)
    nu: 210, nv: 30, flip: true, rim: 0.018, rimMat: m => m.mat(CM.STEEL, 1).color(0.03, 0.03, 0.03),
    uv: (u, v, P) => { _cuv[0] = u; _cuv[1] = v; return _cuv; },
    field: (u, v, P) => { const r = v * 0.1665, da = (u * NS - Math.round(u * NS)) / NS * TAU, t = r * Math.sin(da), q = Math.max(Math.abs(r - 0.123) - 0.019, 0); return -(Math.hypot(t, q) - 0.0082); }
  });
  // Disco de desenfoque rotacional en malla independiente
  const bm = mbBlur || mb; if (mbBlur) { bm.push(m4rotY(m4(), -PI / 2)); bm.push(m4translate(m4(), -0.015, 0, 0)); }
  bm.mat(CM.HUBCAP, 1).color(0.62, 0.63, 0.65);
  bm.patch((u, v, o) => { const a = u * TAU, r = 0.036 + v * 0.127; o[0] = prof(r) + 0.002; o[1] = r * Math.cos(a); o[2] = r * Math.sin(a); }, 0, 1, 0, 1, { nu: 56, nv: 8, flip: true, uv: (u, v, P) => { _cuv[0] = u; _cuv[1] = v; return _cuv; } });
  if (mbBlur) { bm.pop(); bm.pop(); }
  mb.pop(); mb.pop();
}
// ---------- volante (eixo da coluna = X local) ----------
function carBuildSteer(mb) {
  mb.mat(CM.INTERIOR, 3).color(0.035, 0.035, 0.038);
  const ring = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; ring.push([0, 0.185 * Math.cos(a), 0.185 * Math.sin(a)]); }
  mb.tube(ring, 0.0135, 10, { closed: true, up: [1, 0, 0] });
  mb.rbox(-0.035, -0.01, 0, 0.05, 0.1, 0.16, 0.025, 3);
  mb.rbox(-0.02, 0.0, 0.1, 0.022, 0.03, 0.17, 0.008, 1); mb.rbox(-0.02, 0.0, -0.1, 0.022, 0.03, 0.17, 0.008, 1); mb.rbox(-0.02, -0.1, 0, 0.022, 0.17, 0.035, 0.008, 1);
  m4translate(CAR._t, 0.345, 0.885, -0.36); m4rotZ(CAR._t2, 158 * PI / 180); m4mul(CAR.steerMat, CAR._t, CAR._t2);
}

// ---- 30_car_d_main.js
// Montaje del coche, contrato con el juego (CAR) y registro en CARS.
const CAR = {
  id: 'uno-mille-1996',
  name: 'Uno con escalera',
  subtitle: 'Fiat Uno Mille EP 1996',
  specs: '900 kg · 5 marchas · FWD · Escalera en el techo',
  accent: '#4a7eb8',
  physics: {
    m: 900, Izz: 1250, L: 2.362, a: 0.96, b: 1.402, tw: 1.33, h: 0.5, R: 0.281,
    mu: 1.42, B: 9.5, C: 1.42, driveF: 1.0,
    gears: [3.91, 2.16, 1.48, 1.12, 0.9], final: 4.07, rev: 3.9, eff: 0.9,
    cdA: 0.62, crr: 0.014, brakeF: 0.64, halfW: 0.78, front: 1.92, rear: 1.72,
    clA: 0.02, aeroSplitF: 0.50,
    // Curva de par motor (N·m): un Mille más potente que el de fábrica
    torqueBase: 180, torquePeak: 118, torqueDrop: 110, torquePeakStart: 0.6, torquePeakSpan: 5.4, torqueDropRpm: 6.0,
    shiftUpRpm: 6250, shiftDownRpm: 5350, revLimitRpm: 6500, maxRpm: 6700, idleRpm: 900,
  },
  hud: { maxKmh: 200, maxRpm: 7, redlineRpm: 6.25 },
  wheelbase: 2.362, trackF: 1.34, trackR: 1.30, wheelR: 0.281,
  hubs: [[1.181, 0.281, -0.67], [1.181, 0.281, 0.67], [-1.181, 0.281, -0.65], [-1.181, 0.281, 0.65]],
  slotBody: 0, slotWheel: [0, 0, 0, 0], slotSteer: 0,
  steerMat: m4(), tris: 0, _t: m4(), _t2: m4(), _t3: m4(), set: null, glass: null, atlasBG: null, fam: null,
  build() {
    carShapeInit(); carWindowsInit(); carSeamInit();
    const fam = CAR.fam = mkFamily('car', { src: 'mat_car', noCube: true });
    CAR.slotBody = objSlot(); for (let i = 0; i < 4; i++) CAR.slotWheel[i] = objSlot(); CAR.slotSteer = objSlot();
    const set = CAR.set = new MeshSet(fam), glass = CAR.glass = new GlassSet();
    const mb = new MeshBuilder(1 << 17), gl = new MeshBuilder(1 << 14);
    carBuildBody(mb, gl);
    if (typeof carBuildParts === 'function') carBuildParts(mb, gl);
    CAR.tris = mb.ni / 3 + gl.ni / 3;
    set.add(mb.upload(), CAR.slotBody, 3); glass.add_(gl.upload(), CAR.slotBody);
    if (typeof carBuildWheel === 'function') {
      const w = new MeshBuilder(1 << 15), wb = new MeshBuilder(1 << 11); carBuildWheel(w, wb); const wm = w.upload(), wbm = wb.upload(); CAR.tris += 4 * (w.ni + wb.ni) / 3;
      for (let i = 0; i < 4; i++) { set.add(wm, CAR.slotWheel[i], 3); set.add(wbm, CAR.slotWheel[i], 1); }   // disco de borrão: só no passe principal
    }
    if (typeof carBuildSteer === 'function') { const s = new MeshBuilder(1 << 12); carBuildSteer(s); CAR.tris += s.ni / 3; set.add(s.upload(), CAR.slotSteer, 3); }
    const tex = typeof carAtlas === 'function' ? carAtlas() : mkTex(4, 4, 'rgba8unorm-srgb');
    // Drawable: enlaza atlas en grupo 3
    R.drawables.push({ draw(pass, ctx) {
      if (ctx.kind === KIND.SHADOW && ctx.cascade === 3) return;
      if (!CAR.atlasBG) { if (!fam.bgl3) return; CAR.atlasBG = G.dev.createBindGroup({ layout: fam.bgl3, entries: [{ binding: 0, resource: tex.createView() }] }); }
      pass.setBindGroup(3, CAR.atlasBG); set.draw(pass, ctx);
    } });
    R.transparents.push(glass);
    m4ident(CAR._t); CAR.place(CAR._t, CAR._z4, CAR._z4); CAR.place(CAR._t, CAR._z4, CAR._z4);
  },
  _z4: new Float32Array(4),
  // escreve as matrizes de todos os slots (e guarda as anteriores para os vetores de movimento). Sem alocação.
  // steer (ângulo das rodas dianteiras, + = direita) e ângulo do volante vêm de CAR.inp[0..1]: nenhum número passa por
  // argumento (o V8 poria cada um em caixa na heap a cada chamada).
  inp: new Float64Array(2),
  place(body, spin, susp) {
    const steer = CAR.inp[0], steerWheelAngle = CAR.inp[1];
    const t = CAR._t2, t2 = CAR._t3;
    objPrev(CAR.slotBody).set(objModel(CAR.slotBody)); objModel(CAR.slotBody).set(body);
    for (let i = 0; i < 4; i++) {
      const s = CAR.slotWheel[i], h = CAR.hubs[i], left = (i & 1) === 0;
      objPrev(s).set(objModel(s));
      // Cinemática de rueda: traslación suspensión * dirección * rotación
      const a = -(i < 2 ? steer : 0) + (left ? PI : 0), c = Math.cos(a), sn = Math.sin(a);
      const g = left ? spin[i] : -spin[i], cg = Math.cos(g), sg = Math.sin(g);
      // Ry(a) * Rz(g)
      t[0] = c * cg; t[1] = sg; t[2] = -sn * cg; t[3] = 0;
      t[4] = -c * sg; t[5] = cg; t[6] = sn * sg; t[7] = 0;
      t[8] = sn; t[9] = 0; t[10] = c; t[11] = 0;
      t[12] = h[0]; t[13] = h[1] + susp[i]; t[14] = h[2]; t[15] = 1;
      m4mul(objModel(s), body, t);
    }
    objPrev(CAR.slotSteer).set(objModel(CAR.slotSteer));
    const ca = Math.cos(-steerWheelAngle), sa = Math.sin(-steerWheelAngle); t2.fill(0); t2[0] = 1; t2[5] = ca; t2[6] = sa; t2[9] = -sa; t2[10] = ca; t2[15] = 1;
    m4mul(t, CAR.steerMat, t2); m4mul(objModel(CAR.slotSteer), body, t);
  },
};
CARS.register(CAR);
})();
