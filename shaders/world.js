'use strict';
WGSL["world_ground"] = `// Material do chão (terreno e acostamento da pista usam a mesma função → emenda invisível).
// grama aparada / rústica, terra, brita, concreto e pit lane, chão de mata e, de longe, copa de floresta.
#include palette
fn grHash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
// marcas pintadas do pit lane (reta principal corre em +X com z = d, s = x + 60)
fn pitPaint(sr: f32, d: f32, aa: f32) -> f32 {
  var m = 0.0;
  let inB = step(PIT_B0 - 6.0, sr) * step(sr, PIT_B1 + 6.0);
  // linha da faixa rápida e linha junto ao muro
  m = max(m, (1.0 - smoothstep(0.05, 0.05 + aa, abs(d - (PIT_L0 + 0.35)))) * inB);
  m = max(m, (1.0 - smoothstep(0.06, 0.06 + aa, abs(d - 12.9))) * inB);
  // limites de velocidade (faixas transversais) na entrada e na saída
  let cross = min(abs(sr - (PIT_B0 - 6.0)), abs(sr - (PIT_B1 + 6.0)));
  m = max(m, (1.0 - smoothstep(0.15, 0.15 + aa, cross)) * step(PIT_L0 + 0.3, d) * step(d, PIT_L1 - 0.2));
  // vagas em frente às garagens: marcas em T a cada 7 m
  let u = (sr - PIT_B0) / 7.0; let fu = abs(fract(u) - 0.5) * 7.0;
  let tee = max((1.0 - smoothstep(0.05, 0.05 + aa, abs(fu - 3.5))) * step(13.4, d) * step(d, 16.6),
                (1.0 - smoothstep(0.05, 0.05 + aa, abs(d - 13.4))) * step(2.3, fu));
  m = max(m, tee * inB * step(PIT_B0, sr) * step(sr, PIT_B1));
  return m;
}
fn groundSurf(wpos: vec3f, Ng: vec3f, forest: f32) -> Surface {
  var s = surfDefault(Ng);
  let xz = wpos.xz;
#ifdef PASS_CUBE
  let dist = distance(wpos, P.camPos.xyz);
#else
  let dist = distance(wpos, F.camPos.xyz);
#endif
  let z = wmZone(xz);
  let adist = z.r * 32.0 - 8.0;
  let nA = textureSample(tNoise, sLin, xz * 0.0137);
  let nB = textureSample(tNoise, sLin, vec2f(xz.x * 0.8 - xz.y * 0.6, xz.x * 0.6 + xz.y * 0.8) * 0.083);
  let nC = textureSample(tNoise, sLin, xz * 0.61 + nA.rg * 0.2);
  let nD = (textureSample(tNoise, sLin, vec2f(xz.x * 0.6 + xz.y * 0.8, -xz.x * 0.8 + xz.y * 0.6) * 4.7) + textureSample(tNoise, sLin, vec2f(xz.x * 0.966 - xz.y * 0.259, xz.x * 0.259 + xz.y * 0.966) * 3.31 + 0.37)) * 0.5;
  let near = 1.0 - smoothstep(20.0, 110.0, dist);
  let near2 = 1.0 - smoothstep(4.0, 30.0, dist);
  // ---- grama ----
  var g = mix(COL_GRASS_ROOT * 1.7, COL_GRASS, 0.3 + 0.7 * nC.r);
  g *= 0.78 + 0.44 * nB.r;
  let dry = smoothstep(0.48, 0.7, nA.g * 0.65 + nB.g * 0.35);
  g = mix(g, COL_GRASS_TALL * vec3f(1.05, 0.93, 0.62), dry * 0.4);
  // faixas de corte (grama aparada junto à pista): leve alternância de tom
  let mow = smoothstep(0.35, 0.65, fract(adist / 3.2 + nB.r * 0.25));
  g *= mix(1.0, 0.9 + 0.2 * mow, (1.0 - z.b) * step(adist, 23.0));
  let gt = mix(COL_GRASS * 0.85, COL_GRASS_TALL, 0.25 + 0.6 * nB.g) * (0.66 + 0.6 * nC.g);
  g = mix(g, gt, z.b);
  // manchas de ~3-6 m (trevo mais escuro, capim mais seco) e fibra fina das folhas (os mips levam à média ao longe)
  let nE = textureSample(tNoise, sLin, vec2f(xz.x * 0.342 + xz.y * 0.94, -xz.x * 0.94 + xz.y * 0.342) * 0.177 + 0.3);
  g = mix(g, g * vec3f(0.62, 0.8, 0.6), smoothstep(0.5, 0.68, nE.r) * 0.7);
  g *= 0.8 + 0.4 * nA.b;
  g = mix(g, g * vec3f(1.22, 1.12, 0.8), smoothstep(0.55, 0.75, nE.g) * 0.4 * (1.0 - z.b * 0.5));
  g *= 1.0 + (nD.b - 0.5) * 0.5 + (nD.a - 0.5) * 0.22;
  // lâminas: fibras alongadas em três direções (ruído esticado ~7:1). De perto o gramado lê como folhas, com sombra entre elas;
  // os mips levam à média ao longe, sem trocar o tom.
  let bq = xz + (nC.rg - 0.5) * 0.25;
  let b1 = textureSample(tNoise, sLin, vec2f(bq.x * 9.3, bq.y * 1.3));
  let b2 = textureSample(tNoise, sLin, vec2f((bq.x * 0.5 + bq.y * 0.866) * 8.1, (-bq.x * 0.866 + bq.y * 0.5) * 1.15) + 0.31);
  let b3 = textureSample(tNoise, sLin, vec2f((bq.x * 0.5 - bq.y * 0.866) * 10.4, (bq.x * 0.866 + bq.y * 0.5) * 1.45) + 0.67);
  let bq2 = bq * 2.3 + 0.37;
  let b4 = textureSample(tNoise, sLin, vec2f((bq2.x * 0.966 + bq2.y * 0.259) * 9.0, (-bq2.x * 0.259 + bq2.y * 0.966) * 1.2));
  let b5 = textureSample(tNoise, sLin, vec2f((bq2.x * 0.259 - bq2.y * 0.966) * 9.6, (bq2.x * 0.966 + bq2.y * 0.259) * 1.3) + 0.53);
  let blade = max(smoothstep(0.5, 0.7, max(b1.r, max(b2.g, b3.r))), smoothstep(0.55, 0.72, max(b4.g, b5.r)) * 0.8);
  let tuft = smoothstep(0.35, 0.7, nD.b);                              // tufos: moitas mais claras/escuras de ~10 cm
  g *= (0.56 + 0.66 * blade) * (0.84 + 0.32 * tuft);
  var alb = g; var rough = 0.9;
  var grad = (nC.rg - 0.5) * 1.1 * near + (nD.rg - 0.5) * 2.0 * near2
    + (vec2f(b1.r - 0.5, 0.0) * 2.8 + vec2f(0.5, 0.866) * (b2.g - 0.5) * 2.4 + vec2f(0.5, -0.866) * (b3.r - 0.5) * 2.4 + vec2f(0.966, -0.259) * (b4.g - 0.5) * 1.2 + vec2f(0.259, 0.966) * (b5.r - 0.5) * 1.2) * near2;
  var ao = (0.72 + 0.28 * nC.r * (0.6 + 0.4 * nD.b)) * (0.58 + 0.42 * blade);
  var sss = 0.25;
  // terra batida: junto ao asfalto e manchas ralas
  let dirtE = (1.0 - smoothstep(0.05, 0.75, adist + (nC.b - 0.5) * 0.7 + (nD.r - 0.5) * 0.25)) * step(-0.5, adist);
  let bald = smoothstep(0.7, 0.82, nB.b * 0.5 + nA.r * 0.6) * 0.6 * (1.0 - z.b * 0.5);
  let dirt = max(dirtE * 0.85, bald);
  let dcol = COL_DIRT * (0.65 + 0.7 * nC.g) * (0.85 + 0.3 * nD.a);
  alb = mix(alb, dcol, dirt); sss *= 1.0 - dirt;
  // ---- chão de mata e copa distante ----
  let fo = smoothstep(0.2, 0.6, forest);
  if (fo > 0.0) {
    let litter = mix(vec3f(0.05, 0.04, 0.026), COL_FOREST * 1.3, nC.g * 0.55 + nB.r * 0.25) * (0.7 + 0.5 * nD.r);
    alb = mix(alb, litter, fo * 0.85); ao *= mix(1.0, 0.7, fo);
#ifndef PASS_CUBE
    let cf = smoothstep(CANOPY_A, CANOPY_B, dist) * smoothstep(0.3, 0.6, forest + (nB.r - 0.5) * 0.2);
    if (cf > 0.0) {
      // copas: ruído celular (≈ 8 m por copa) + variação de espécie
      let cuv = xz / 190.0 + (nB.rg - 0.5) * 0.012;
      let e = 0.0012;
      let c0 = textureSample(tNoise, sLin, cuv).b; let cx = textureSample(tNoise, sLin, cuv + vec2f(e, 0.0)).b; let cz = textureSample(tNoise, sLin, cuv + vec2f(0.0, e)).b;
      let far2 = smoothstep(1500.0, 5000.0, dist);
      var cc = COL_FOREST * (0.55 + 1.0 * c0) * (0.75 + 0.5 * nA.r);
      cc = mix(cc, vec3f(0.075, 0.085, 0.022) * (0.6 + c0), smoothstep(0.55, 0.75, nB.g) * 0.55);
      cc = mix(cc, COL_FOREST * 1.05 * (0.8 + 0.4 * nA.r), far2);
      alb = mix(alb, cc, cf); rough = mix(rough, 0.82, cf); sss = mix(sss, 0.45, cf);
      ao = mix(ao, 0.55 + 0.45 * c0, cf * (1.0 - far2));
      grad = mix(grad, vec2f(c0 - cx, c0 - cz) * (1.0 - far2) * 55.0, cf);
    }
#endif
  }
  // ---- brita ----
  let gw = max(fwidth(z.g) * 1.2, 0.004);
  let gm = smoothstep(0.5 - gw, 0.5 + gw, z.g + (nC.b - 0.5) * 0.012);
  if (gm > 0.0) {
    let wq = xz + (nA.rg - 0.5) * 2.4 + (nC.rg - 0.5) * 0.22;      // domínio torcido: a textura fina não repete em ladrilho
    let st = (textureSample(tNoise, sLin, wq * 2.9) + textureSample(tNoise, sLin, vec2f(xz.x * 0.342 - xz.y * 0.94, xz.x * 0.94 + xz.y * 0.342) * 2.13 + 0.61)) * 0.5;
    let st2 = textureSample(tNoise, sLin, vec2f(xz.x * 0.8 - xz.y * 0.6, xz.x * 0.6 + xz.y * 0.8) * 0.21 + 0.5);
    // sulcos do rastelo: finos (45 cm) de perto e leiras largas (1,6 m) que se leem de longe; somem antes de serrilhar
    let rk = xz.y * 13.96 + (nB.r + nA.g) * 9.0; let rkf = 0.0; let rake = 0.0;   // (sem sulcos paralelos de rastelo: liam como estrias)
    // (sem leiras periódicas largas: cruzadas com os sulcos finos formavam um padrão de losangos)
    let fur = textureSample(tNoise, sLin, vec2f(xz.x * 0.011 + nA.g * 0.2, xz.y * 0.29 + nB.r * 0.3));   // leiras irregulares, sem período
    let rake2 = (fur.r - 0.5) * 2.0; let rkf2 = 1.0;
    // marcas de pneu/trator: faixas sinuosas mais escuras (brita revolvida, úmida por baixo)
    let tq = vec2f(xz.x * 0.94 + xz.y * 0.34, -xz.x * 0.34 + xz.y * 0.94);
    let trk = textureSample(tNoise, sLin, vec2f(tq.x * 0.0047 + nA.r * 0.12, tq.y * 0.031 + nB.g * 0.1));
    let ruts = smoothstep(0.6, 0.72, trk.r) * (1.0 - smoothstep(0.72, 0.84, trk.r));
    // pedras maiores esparsas (claras e escuras)
    let peb = textureSample(tNoise, sLin, wq * 0.83 + 0.21);
    let big = smoothstep(0.72, 0.86, peb.b);
    var gc = COL_GRAVEL * (0.62 + 0.76 * st.b) * (0.86 + 0.28 * st2.r) * (0.97 + 0.05 * rake + 0.035 * rake2);
    gc = mix(gc, gc * vec3f(1.08, 0.98, 0.86), nB.g);
    gc = mix(gc, gc * vec3f(0.78, 0.8, 0.84), smoothstep(0.5, 0.7, st2.g) * 0.5);            // manchas acinzentadas
    gc = mix(gc, gc * mix(0.82, 1.3, smoothstep(0.35, 0.65, peb.a)), big * 0.6);
    // pedrisco: seixos de ~8 mm e ~22 mm (canal celular), cada um com tom próprio e sombra na junta
    let gr1 = textureSample(tNoise, sLin, wq * 5.3 + 0.11);
    let gr2 = textureSample(tNoise, sLin, vec2f(xz.x * 0.8 + xz.y * 0.6, -xz.x * 0.6 + xz.y * 0.8) * 1.9 + 0.43);
    gc *= (0.74 + 0.42 * smoothstep(0.25, 0.85, gr1.b)) * (0.84 + 0.26 * smoothstep(0.3, 0.85, gr2.b)) * (0.92 + 0.16 * gr1.a);
    // manchas largas (brita mais fina/úmida, areia) que se leem de longe
    gc *= (0.74 + 0.5 * nA.r) * (0.86 + 0.28 * nB.b) * (1.0 - 0.3 * ruts);
    alb = mix(alb, gc, gm); rough = mix(rough, 0.95, gm); sss *= 1.0 - gm;
    let gg = (st.rg - 0.5) * 2.0 * near2 + ((gr1.rg - 0.5) * 2.4 + (gr2.rg - 0.5) * 1.6) * near2 + (peb.rg - 0.5) * 1.2 * near + vec2f(0.0, cos(rk) * 0.2 * rkf) + (fur.rg - 0.5) * 0.5 + (trk.rg - 0.5) * 0.5 * ruts;
    grad = mix(grad, gg, gm);
    ao = mix(ao, (0.72 + 0.28 * st.b) * (0.9 + 0.1 * rake2) * (1.0 - 0.25 * ruts) * (0.72 + 0.28 * smoothstep(0.2, 0.7, gr1.b)), gm);
  }
  // ---- concreto / pit lane ----
  let cw = max(fwidth(z.a) * 1.2, 0.004);
  let cm = smoothstep(0.5 - cw, 0.5 + cw, z.a);
  if (cm > 0.0) {
    let d = xz.y; let sr = xz.x + 60.0;
    let lane = step(0.0, d) * (1.0 - smoothstep(PIT_L1 + 0.1, PIT_L1 + 0.35, d));
    // placas de concreto com juntas
    let sl = xz / 5.0; let jf = abs(fract(sl) - 0.5); let jd = (0.5 - max(jf.x, jf.y)) * 5.0;
    let joint = 1.0 - smoothstep(0.012, 0.012 + max(fwidth(jd), 0.004), jd);
    let tone = 0.85 + 0.3 * grHash(floor(sl));
    var cc = vec3f(0.3, 0.29, 0.27) * tone * (0.82 + 0.3 * nC.r) * (0.9 + 0.2 * nD.a * near2);
    cc = mix(cc, cc * 0.45, smoothstep(0.62, 0.8, nB.b * 0.6 + nC.g * 0.5) * 0.7);   // manchas
    cc = mix(cc, vec3f(0.03), joint * 0.8 * near);
    var la = COL_ASPHALT * 1.5 * (0.8 + 0.4 * nC.r) * (0.75 + 0.5 * nD.a * near2);
    la = mix(la, la * 0.5, smoothstep(0.6, 0.8, nB.r) * 0.6);
    let aa = max(fwidth(d), 0.002) * 1.2;
    let paint = pitPaint(sr, d, aa) * lane * (0.75 + 0.25 * smoothstep(0.3, 0.5, nD.b));
    la = mix(la, vec3f(0.62, 0.62, 0.6), paint);
    let pc = mix(cc, la, lane);
    alb = mix(alb, pc, cm); rough = mix(rough, mix(0.7, 0.86, lane) - paint * 0.2, cm); sss *= 1.0 - cm;
    grad = mix(grad, (nD.rg - 0.5) * mix(0.25, 0.9, lane) * near2, cm); ao = mix(ao, 1.0 - joint * 0.4, cm);
  }
  s.albedo = alb; s.rough = rough; s.ao = ao; s.sss = sss * 0.6;
  s.normal = bumpXZ(Ng, grad);
  return s;
}
`;
WGSL["mat_terrain"] = `// Terreno: malha estática, material do chão compartilhado. cor.r do vértice = densidade de mata.
#include mesh_vert
#include world_ground
fn surf(in: V2F, ff: bool) -> Surface { return groundSurf(in.wpos, normalize(in.nrm), in.col.r); }
`;
WGSL["mat_track"] = `// Faixa da pista. uv = (s, d). cor do vértice: r = trajetória (afastamento/hw*0.5+0.5), g = zona molhada, b = curva, a = presença de zebra.
// material: 0 asfalto, 1 zebra (vira chão onde não há zebra), 2 acostamento (chão)
#include mesh_vert
#include world_ground
fn aaLine(x: f32, halfW: f32, aa: f32) -> f32 { return 1.0 - smoothstep(halfW - aa, halfW + aa, abs(x)); }
fn asphaltSurf(in: V2F) -> Surface {
  var sf = surfDefault(normalize(in.nrm));
  let Ng = sf.normal;
  let s = in.uv.x; let d = in.uv.y; let xz = in.wpos.xz;
#ifdef PASS_CUBE
  let dist = distance(in.wpos, P.camPos.xyz);
#else
  let dist = distance(in.wpos, F.camPos.xyz);
#endif
  let near = 1.0 - smoothstep(15.0, 80.0, dist); let near2 = 1.0 - smoothstep(3.0, 22.0, dist);
  let aaD = max(fwidth(d), 0.0015); let aaS = max(fwidth(s), 0.0015);
  let n1 = textureSample(tNoise, sLin, xz * 0.0293);
  let n2 = textureSample(tNoise, sLin, vec2f(xz.x * 0.8 - xz.y * 0.6, xz.x * 0.6 + xz.y * 0.8) * 0.33);
  // agregado: duas escalas, cada uma com duas amostras giradas (sem grade periódica). Não há corte por distância:
  // os mips levam o grão à média sozinhos, então o tom de perto e de longe é o mesmo.
  let n3 = (textureSample(tNoise, sLin, xz * 0.93) + textureSample(tNoise, sLin, vec2f(xz.x * 0.342 - xz.y * 0.94, xz.x * 0.94 + xz.y * 0.342) * 0.71 + 0.41)) * 0.5;
  let n4 = (textureSample(tNoise, sLin, vec2f(xz.x * 0.6 + xz.y * 0.8, -xz.x * 0.8 + xz.y * 0.6) * 3.1) + textureSample(tNoise, sLin, vec2f(xz.x * 0.966 + xz.y * 0.259, -xz.x * 0.259 + xz.y * 0.966) * 2.37 + 0.23)) * 0.5;
  // ---- recapeamentos: trechos com tons diferentes, emenda transversal entre eles ----
  let secLen = 52.0; let sqv = (s + (n1.r - 0.5) * 1.6 + (n2.r - 0.5) * 0.35) / secLen; let sec = floor(sqv);   // emenda sinuosa, não uma reta
  let h1 = hash11(sec * 1.37 + 3.1); let h0 = hash11((sec - 1.0) * 1.37 + 3.1);
  var tone = 0.86 + 0.3 * h1;
  // remendo de meia pista em alguns trechos
  let hp = hash11(sec * 7.9 + 1.7);
  let patchOn = step(0.62, hp); let pe = (hp - 0.62) * 9.0 - 1.7 + (n2.r - 0.5) * 0.08 + (n1.g - 0.5) * 0.7;      // borda lateral do remendo
  let fs = fract(sqv) * secLen;
  let p1 = 30.0 + 14.0 * h1;
  let inPatch = patchOn * smoothstep(-aaD - 0.06, aaD + 0.06, d - pe) * smoothstep(-aaS - 0.06, aaS + 0.06, fs - 6.0) * (1.0 - smoothstep(-aaS - 0.06, aaS + 0.06, fs - p1));
  tone = mix(tone, 0.82 + 0.26 * h0, inPatch);
  // emendas: linhas de piche finas, irregulares e interrompidas (nunca um risco preto contínuo)
  let brk = smoothstep(0.3, 0.55, n2.b) * (0.5 + 0.5 * n1.a);                 // falhas ao longo da linha
  let seamT = min(fs, secLen - fs) + (n2.r - 0.5) * 0.05;
  var tar = aaLine(seamT, 0.011, aaS) * 0.7 * brk;
  let pEdge = patchOn * max(aaLine(d - pe, 0.006, aaD) * step(6.0, fs) * step(fs, p1), max(aaLine(fs - 6.0 + (n2.g - 0.5) * 0.04, 0.006, aaS), aaLine(fs - p1 + (n2.g - 0.5) * 0.04, 0.006, aaS)) * step(pe, d));
  tar = max(tar, pEdge * 0.45 * brk);
  // junta longitudinal no eixo: quase apagada, só em trechos
  tar = max(tar, aaLine(d - 0.12 - (n1.g - 0.5) * 0.25, 0.005, aaD) * 0.3 * smoothstep(0.5, 0.7, n1.r) * brk);
  // trincas seladas: pedaços curtos de linhas sinuosas, só onde o asfalto é mais velho
  let cv = n1.b * 0.55 + n2.g * 0.45 - 0.5; let cw = max(fwidth(cv), 1e-4);
  let old = smoothstep(0.55, 0.85, h1) * (1.0 - inPatch);
  let crack = (1.0 - smoothstep(0.0, cw * 0.9 + 0.0003, abs(cv))) * old * smoothstep(0.52, 0.66, n1.r) * smoothstep(0.45, 0.6, n2.r);
  tar = max(tar, crack * 0.75);
  tar *= 1.0 - smoothstep(25.0, 90.0, dist) * 0.7;
  // ---- base: agregado ----
  // base: asfalto cinza-escuro neutro (albedo ≈ 0,055) com manchas de 3–6 m e de 15–20 m; o mesmo tom ao sol e na sombra
  let nM = textureSample(tNoise, sLin, vec2f(xz.x * 0.8 + xz.y * 0.6, -xz.x * 0.6 + xz.y * 0.8) * 0.0061 + 0.27);
  var alb = vec3f(0.083, 0.081, 0.078) * tone * (0.74 + 0.52 * n2.r) * (0.66 + 0.68 * n1.r) * (0.76 + 0.48 * nM.g);
  // manchas de média escala que sobrevivem à distância e à lente longa: óleo/piche (0,5–2 m) e áreas mais gastas e claras
  let stain = smoothstep(0.6, 0.76, n2.b * 0.55 + n3.g * 0.5);
  let dust = smoothstep(0.58, 0.8, n2.g * 0.6 + n1.b * 0.5);
  alb *= (1.0 - 0.42 * stain) * (1.0 + 0.34 * dust);
  // ---- micro-detalhe: agregado de 3–8 mm com contraste de albedo BAIXO (±8%). A cara de asfalto vem do relevo fino
  // (normal) com brilho rasante suave e da variação de média escala, não de pintas claras e escuras.
  let stones = smoothstep(0.58, 0.8, n4.b);
  let n5 = textureSample(tNoise, sLin, xz * 9.7 + 0.13);                                                  // células de ~4 mm
  let n6 = textureSample(tNoise, sLin, vec2f(xz.x * 0.6 + xz.y * 0.8, -xz.x * 0.8 + xz.y * 0.6) * 5.9 + 0.19);   // células de ~7 mm
  let grain = (n5.b - 0.55) + (n6.b - 0.55) * 0.8;
  alb *= 1.0 + grain * 0.085 + (n3.b - 0.5) * 0.05;
  let cav = smoothstep(-0.3, 0.2, grain);                                   // cavidades entre os grãos
  let pale = smoothstep(0.8, 0.94, n5.b) * smoothstep(0.5, 0.7, n6.b);      // raras pedrinhas claras expostas
  alb = mix(alb, alb * 1.5 + 0.01, pale * 0.35);
  // rugosidade 0,76–0,9: agregado polido (manchas gastas, pedras expostas) brilha um pouco sob luz rasante
  var rough = 0.88 - 0.05 * stones - 0.05 * smoothstep(0.45, 0.75, n1.g) - 0.06 * stain + 0.02 * cav;
  // ---- borracha na trajetória ----
  let lineD = (in.col.r * 2.0 - 1.0) * TRK_HW; let dl = d - lineD;
  let streak = 0.55 + 0.45 * textureSample(tNoise, sLin, vec2f(d * 0.9, s * 0.012)).r;
  // a borracha não é uma faixa de tinta: largura e intensidade variam ao longo da pista (forte nas freadas e saídas de curva —
  // in.col.b —, falhada nas retas), com manchas que somem e voltam
  let along = textureSample(tNoise, sLin, vec2f(s * 0.0043, 0.31)); let along2 = textureSample(tNoise, sLin, vec2f(s * 0.021, 0.77));
  let rsig = 1.35 * (0.6 + 0.7 * along.g);
  let rint = (0.16 + 0.84 * in.col.b) * (0.35 + 0.65 * smoothstep(0.3, 0.62, along.r)) * (0.6 + 0.4 * along2.b);
  let rub = exp(-dl * dl / (2.0 * rsig * rsig)) * rint * streak;
  // dois sulcos de roda mais marcados
  let rutG = exp(-sq(abs(dl) - 0.68) / 0.09);
  let ruts = rutG * rint * streak;
  let rb = sat(rub * 1.05 + ruts * 0.5);
  alb = mix(alb, alb * vec3f(0.2, 0.2, 0.215), rb);
  rough = mix(rough, 0.95, rb);
  // marcas de frenagem antes das curvas (byte a do material = intensidade): pares de riscos escuros, descontínuos
  let bz = matA(in.mat);
  if (bz > 0.01) {
    let bn = textureSample(tNoise, sLin, vec2f(d * 1.7, s * 0.021 + 0.4));
    let bn2 = textureSample(tNoise, sLin, vec2f(d * 0.35 + 0.3, s * 0.006));
    let off = (bn2.g - 0.5) * 1.6;                                     // cada frenagem um pouco deslocada
    let pair = exp(-sq(abs(dl - off) - 0.68) / 0.012) + 0.6 * exp(-sq(abs(dl + off * 0.7 - 0.9) - 0.66) / 0.014);
    let bm = sat(pair * smoothstep(0.42, 0.6, bn.r) * (0.4 + 0.6 * smoothstep(0.35, 0.65, bn2.r)) * bz * 1.3);
    alb = mix(alb, alb * 0.26, bm); rough = mix(rough, 0.95, bm);
  }
  // desgaste claro (polido) fora da trajetória
  let wear = smoothstep(0.5, 0.8, n2.b * 0.5 + n1.g * 0.6) * 0.22 * (1.0 - rb);
  alb = mix(alb, alb * 1.3 + 0.006, wear); rough = mix(rough, 0.77, wear);
  // piche das emendas e trincas: cinza-escuro, um pouco mais liso
  alb = mix(alb, alb * 0.38 + vec3f(0.004), tar); rough = mix(rough, 0.74, tar);
  {
    let dn = textureSample(tNoise, sLin, vec2f(s * 0.0037 + 0.21, d * 0.045)).g * 0.6 + n1.b * 0.4;
    let dampG = smoothstep(0.6, 0.74, dn) * (1.0 - smoothstep(0.0, 0.2, in.col.g));
    alb = mix(alb, alb * 0.72, dampG); rough = mix(rough, 0.88, dampG * 0.6);
  }
  // borda do asfalto irregular: terra e grama invadindo os últimos centímetros (a divisa não é uma reta limpa)
  {
    let eN = abs(d) - TRK_HW + 0.1 + (n2.g - 0.5) * 0.34 + (n3.r - 0.5) * 0.12 + (n1.a - 0.5) * 0.16;
    let dirt = smoothstep(-0.05, 0.03, eN);
    let dcol = mix(vec3f(0.085, 0.068, 0.045), COL_GRASS * 0.9, smoothstep(0.02, 0.12, eN) * (0.4 + 0.6 * n3.g)) * (0.7 + 0.6 * n4.g);
    alb = mix(alb, dcol, dirt * 0.9); rough = mix(rough, 0.95, dirt);
  }
  // ---- pintura ----
  let chip = 0.72 + 0.28 * smoothstep(0.25, 0.55, n3.b + (n2.g - 0.5) * 0.6);
  var paint = aaLine(abs(d) - (TRK_HW - 0.23), 0.09, aaD) * chip;
  // linha de largada: xadrez de 3 fileiras
  var sw = s; if (sw > TRK_LEN * 0.5) { sw -= TRK_LEN; }
  let inSF = aaLine(sw, 0.6, aaS) * step(abs(d), TRK_HW - 0.34);
  let chk = step(0.5, fract(floor((sw + 0.6) / 0.4) * 0.5 + floor((d + 20.0) / 0.4) * 0.5 + 0.25));
  // vagas do grid (10), alternando os lados a cada 8 m
  let q = (-11.9 - sw) / 8.0; let k = floor(q + 0.02); let u = (q - k) * 8.0;
  let dc = d - select(1.6, -1.6, (i32(k) & 1) == 0);
  let slot = max(aaLine(u - 0.07, 0.07, aaS) * step(abs(dc), 1.25), aaLine(abs(dc) - 1.19, 0.06, aaD) * step(u, 1.35) * step(0.0, u)) * step(0.0, k) * step(k, 9.0);
  paint = max(paint, slot * chip);
  {
    let on = step(0.0, k) * step(k, 9.0);
    let ob = textureSample(tNoise, sLin, vec2f(u * 0.21 + k * 0.37, dc * 0.3 + 0.11));
    let oil = on * sat(exp(-(sq(u - 2.3) / 1.6 + sq(dc) / 0.45)) * 1.5 - 0.25 + (ob.r - 0.5) * 0.9);
    let drip = on * smoothstep(0.72, 0.8, ob.b) * exp(-sq(dc) / 0.8) * step(0.8, u) * step(u, 5.5) * 0.7;
    let om = sat(max(oil, drip));
    alb = mix(alb, alb * 0.5, om); rough = mix(rough, 0.62, om);
  }
  let white = vec3f(0.66, 0.66, 0.63) * (0.8 + 0.2 * n2.r);
  alb = mix(alb, white * mix(1.0, 0.45, rb * 0.8), paint * 0.95 * (1.0 - 0.75 * smoothstep(-0.02, 0.04, abs(d) - TRK_HW + 0.1 + (n2.g - 0.5) * 0.34 + (n3.r - 0.5) * 0.12 + (n1.a - 0.5) * 0.16)));
  alb = mix(alb, mix(vec3f(0.02), white, chk), inSF);
  rough = mix(rough, 0.55, max(paint, inSF) * 0.8);
  // ---- microrelevo ----
  var grad = (n3.rg - 0.5) * 0.14 * near + (n4.rg - 0.5) * 0.4 * near2 + (n2.rg - 0.5) * 0.04 * near + ((n5.rg - 0.5) * 0.75 + (n6.rg - 0.5) * 0.55) * near2;
  grad *= 1.0 - 0.6 * max(paint, tar);
  rough += 0.05 * (1.0 - near2);            // longe: o relevo que some vira rugosidade
  var N = bumpXZ(Ng, grad);
  // ---- trechos molhados ----
  var wet = 0.0;
  if (in.col.g > 0.001) {
    // "profundidade" da água: depressões de baixa frequência + sulcos das rodas + beira da pista; borda orgânica por ruído fino
    let lo = textureSample(tNoise, sLin, vec2f(s * 0.0125 + 0.37, d * 0.062)).r * 0.56 + textureSample(tNoise, sLin, vec2f(s * 0.031, d * 0.11 + 0.4)).g * 0.24 + textureSample(tNoise, sLin, xz * 0.047 + 0.13).r * 0.2;
    let fine = (n2.r - 0.5) * 0.02 + (n3.r - 0.5) * 0.035 + (n4.r - 0.5) * 0.012;    // a borda segue o agregado: nítida e irregular, não uma máscara mole
    let edge = smoothstep(2.4, 5.2, abs(d)) * 0.05 + rutG * 0.085;      // a água junta nos trilhos de roda e na beira
    let lvl = lo + fine + edge - mix(0.78, 0.665, in.col.g);
    // seco → úmido (halo largo, escurece e alisa um pouco) → filme d'água → lâmina. Tudo em rampas largas: sem borda dura.
    let lw = fwidth(lvl) * 0.75;                                        // largura de 1 pixel em unidades do nível
    let damp = smoothstep(-0.09, -0.035, lvl);
    let film = smoothstep(-0.05 - lw, 0.02 + lw, lvl);
    let pud = smoothstep(0.015 - lw, 0.07 + lw, lvl);
    alb = mix(alb, alb * 0.8, damp);
    alb = mix(alb, alb * 0.55, pud);                                       // água sobre asfalto escuro: fundo mais escuro, nada leitoso
    rough = mix(rough, 0.6, damp * 0.8); rough = mix(rough, 0.36, film); rough = mix(rough, 0.09, pud * pud);
    // normal: o filme ainda segue o agregado; a lâmina é plana, com ondulação leve do vento
    let rp = (textureSampleLevel(tNoise, sLin, xz * 0.31 + 0.17, 1.0).rg - 0.5) * 0.016 + (textureSampleLevel(tNoise, sLin, xz * 0.11 + 0.4, 0.0).rg - 0.5) * 0.014;
    N = normalize(mix(N, bumpXZ(Ng, grad * 0.35), film));
    N = normalize(mix(N, bumpXZ(Ng, rp), pud));
    // reflexo em espaço de tela entra aos poucos com o filme e fica total na lâmina
    wet = film * 0.2 + pud * 0.7;
  }
  sf.albedo = alb; sf.rough = rough; sf.normal = N; sf.wet = wet;
  sf.ao = (1.0 - tar * 0.3) * mix(1.0, 0.84 + 0.16 * cav, 1.0 - wet);
  return sf;
}
fn kerbSurf(in: V2F) -> Surface {
  var sf = surfDefault(normalize(in.nrm));
  let s = in.uv.x; let x = abs(in.uv.y) - TRK_HW;       // 0 na borda do asfalto .. KERB_WID
#ifdef PASS_CUBE
  let dist = distance(in.wpos, P.camPos.xyz);
#else
  let dist = distance(in.wpos, F.camPos.xyz);
#endif
  let near = 1.0 - smoothstep(6.0, 40.0, dist);
  let n1 = textureSample(tNoise, sLin, in.wpos.xz * 0.11);
  let n2 = textureSample(tNoise, sLin, in.wpos.xz * 0.9); let n3 = textureSample(tNoise, sLin, in.wpos.xz * 6.1);
  let aaS = max(fwidth(s), 0.002);
  let ph = s / 5.0; let f = fract(ph);
  let red = smoothstep(0.5 - aaS / 5.0, 0.5 + aaS / 5.0, abs(f - 0.5) * 2.0);   // 2,5 m vermelho / 2,5 m branco
  var alb = mix(vec3f(0.5, 0.5, 0.48), vec3f(0.3, 0.005, 0.004), red);         // vermelho escuro saturado, tinta fosca
  alb *= 0.8 + 0.28 * n2.r;
  // ---- dentes transversais (ranhuras de 30 cm): relevo com sombra própria. A amplitude cai suavemente com o tamanho do
  // dente na tela (fwidth), então de longe ou em ângulo rasante não sobra padrão para fazer moiré.
  let PER = 0.3;
  let fw = fwidth(s) / PER;
  let tf = 1.0 - smoothstep(0.1, 0.34, fw);
  let inK = smoothstep(0.08, 0.3, x) * (1.0 - smoothstep(1.02, 1.16, x));
  let saw = fract(s / PER);
  // perfil: rampa longa subindo (0..0,78) e face curta descendo (0,78..1), com transições alargadas pelo tamanho do pixel
  let e = clamp(fw * 1.2, 0.02, 0.2);
  let back = smoothstep(0.78 - e, 0.78 + e, saw) * (1.0 - smoothstep(1.0 - e, 1.0, saw));
  let tnx = (0.22 * (1.0 - back) - 0.95 * back) * 0.42 * tf * inK;
  let ts = normalize(dpdx(in.wpos) * dpdy(s) - dpdy(in.wpos) * dpdx(s) + vec3f(1e-9, 0.0, 0.0));
  let tdir = normalize(cross(sf.normal, ts));
  // sombra própria na face de trás do dente + sujeira/borracha acumulada no pé de cada dente
  let foot = (1.0 - smoothstep(0.0, 0.16 + e, saw)) * tf * inK;
  alb *= 1.0 - 0.3 * back * tf * inK - 0.22 * foot * (0.5 + 0.5 * n2.g);
  // junta entre os blocos de concreto (a cada 1,25 m)
  let jl = 1.0 - smoothstep(0.012, 0.012 + aaS, min(fract(s / 1.25), 1.0 - fract(s / 1.25)) * 1.25);
  alb = mix(alb, vec3f(0.05), jl * 0.7 * (1.0 - smoothstep(30.0, 90.0, dist)));
  // sujeira: terra no lado de fora, escorridos e manchas de média escala
  let grime = smoothstep(0.5, 1.25, x) * (0.3 + 0.5 * n2.g) + smoothstep(0.55, 0.8, n1.r) * 0.35;
  alb = mix(alb, vec3f(0.1, 0.085, 0.06), sat(grime) * 0.55);
  // tinta gasta: lascas mostrando o concreto
  let chip = smoothstep(0.6, 0.78, n3.b * 0.6 + n2.g * 0.55);
  alb = mix(alb, vec3f(0.24, 0.235, 0.22), chip * 0.75);
  // borracha dos pneus: riscos escuros no lado da pista, mais fortes nas curvas (in.col.b)
  let streak = textureSample(tNoise, sLin, vec2f(x * 2.3, s * 0.035)).r;
  let rub = (1.0 - smoothstep(0.05, 0.95, x)) * (0.25 + 0.75 * smoothstep(0.35, 0.6, streak)) * (0.35 + 0.65 * in.col.b) * (0.5 + 0.5 * n1.g);
  alb = mix(alb, alb * 0.2 + vec3f(0.006), sat(rub) * 0.85);
  sf.albedo = alb; sf.rough = 0.9 - 0.06 * sat(rub);
  sf.normal = normalize(sf.normal - tdir * tnx + vec3f(n3.r - 0.5, 0.0, n3.g - 0.5) * 0.22 * near);
  sf.ao = 1.0 - 0.3 * back * tf * inK - 0.15 * foot;
  return sf;
}
fn surf(in: V2F, ff: bool) -> Surface {
  let id = matId(in.mat);
  if (id == 0u) { return asphaltSurf(in); }
  if (id == 1u && in.col.a > 0.5) { return kerbSurf(in); }
  return groundSurf(in.wpos, normalize(in.nrm), 0.0);
}
`;
WGSL["mat_props"] = `// Materiais dos adereços do circuito (barreiras, construções, placas). cor.a do vértice = oclusão de ambiente assada.
// id: 1 aço galvanizado | 2 pintura (a = rugosidade, b = metal) | 3 concreto | 4 pneu (cor = tinta) | 5 vidro de fachada
//     6 emissivo (a = intensidade) | 7 placa (atlas) | 8 assentos | 9 telha ondulada | 10 lona | 11 poste (some ao longe)
//     (ids 1, 2 e 11: byte c = distância de sumiço pontilhado / 4 m; 0 = nunca some)
//     12 muro de pneus distante (substituto) | 13 porta de enrolar | 14 cone | 15 pneus próximos (somem ao longe)
//     18 lâmpada do semáforo de largada (acesa com F.car2.x)
//     17 chapa nervurada pintada   (gente — público, equipes, fiscais — fica na família world_crowd)
#include mesh_vert
#include palette
@group(3) @binding(0) var tAtlas: texture_2d<f32>;
fn camDist(wp: vec3f) -> f32 {
#ifdef PASS_CUBE
  return distance(wp, P.camPos.xyz);
#else
  return distance(wp, F.camPos.xyz);
#endif
}
fn surf(in: V2F, ff: bool) -> Surface {
  var N = normalize(in.nrm); if (!ff) { N = -N; }
  var s = surfDefault(N);
  let id = matId(in.mat); let wp = in.wpos; let dist = camDist(wp);
  let near = 1.0 - smoothstep(8.0, 60.0, dist);
  // ruído em superfícies de qualquer orientação: projeção inclinada
  let pu = wp.xz + wp.yy * vec2f(0.71, -0.53);
  let n1 = textureSample(tNoise, sLin, pu * 0.19);
  let n2 = textureSample(tNoise, sLin, pu * 2.3);
  s.ao = in.col.a;
  var bump = vec3f(0.0);
#ifdef PASS_GBUF
  // sumiço pontilhado de peças finas: byte c do material = distância de início / 4 m (termina a 1,4x)
  let fd = f32((in.mat >> 24u) & 255u) * 4.0;
  if (fd > 0.0 && (id == 1u || id == 2u || id == 11u || id == 7u || id == 17u)) { if (smoothstep(fd, fd * 1.4, dist) > ign(in.pos.xy, F.misc.y) * 0.98 + 0.01) { discard; } }
#endif
  if (id == 1u || id == 11u) {
    let rust = smoothstep(0.66, 0.82, n1.b * 0.55 + n2.r * 0.45) * 0.55;
    s.albedo = mix(vec3f(0.5, 0.52, 0.54) * (0.8 + 0.35 * n1.r), vec3f(0.16, 0.08, 0.04), rust);
    s.metal = select(0.9, 0.55, id == 11u) * (1.0 - rust); s.rough = 0.42 + 0.2 * n2.g + rust * 0.3; if (id == 11u) { s.albedo *= 0.55; }
    // escorridos de sujeira
    let streak = textureSample(tNoise, sLin, vec2f(pu.x * 1.3, wp.y * 0.12)).r;
    s.albedo *= 0.75 + 0.3 * streak;
    // sujeira acumulada: poeira de terra e borracha em manchas de média escala, mais forte perto do chão
    let hgA = wp.y - wmHeight(wp.xz);
    let dirtM = sat(smoothstep(0.5, 0.78, n1.g * 0.6 + n2.b * 0.5) * 0.7 + (1.0 - smoothstep(0.15, 0.7, hgA)) * 0.45);
    s.albedo = mix(s.albedo, vec3f(0.13, 0.11, 0.085) * (0.7 + 0.5 * n2.r), dirtM * 0.6); s.rough = mix(s.rough, 0.85, dirtM * 0.7); s.metal *= 1.0 - dirtM * 0.6;
  } else if (id == 2u) {
    // pintura: variação de tom, escorridos verticais de sujeira e lascas/desgaste finos (nada de cor chapada)
    let streak = textureSample(tNoise, sLin, vec2f(pu.x * 1.1, wp.y * 0.09)).g;
    let chip = smoothstep(0.7, 0.84, n2.b * 0.6 + n1.g * 0.5) * near;
    var c = in.col.rgb * (0.8 + 0.3 * n1.r) * (0.94 + 0.12 * n2.a * near) * (0.8 + 0.3 * streak);
    c = mix(c, c * 0.5 + vec3f(0.02, 0.018, 0.015), chip * 0.6);
    // desgaste em escala de metros (tinta desbotada/raspada) e respingo de sujeira junto ao chão
    let wearM = smoothstep(0.52, 0.8, textureSample(tNoise, sLin, vec2f(pu.x * 0.31, wp.y * 0.6)).b * 0.6 + n1.b * 0.5);
    c = mix(c, c * 0.62 + vec3f(0.07, 0.068, 0.062), wearM * 0.5);
    let hgP = wp.y - wmHeight(wp.xz);
    c = mix(c, vec3f(0.1, 0.085, 0.065) * (0.7 + 0.5 * n2.g), (1.0 - smoothstep(0.05, 0.6, hgP)) * (0.3 + 0.5 * n1.r) * step(hgP, 3.0));
    s.albedo = c;
    s.rough = 0.22 + matA(in.mat) * 0.7 + 0.1 * n2.g + chip * 0.2; s.metal = matB(in.mat) * (1.0 - chip * 0.5);
    bump = (vec3f(n2.r, n2.g, n2.b) - 0.5) * 0.06 * near;
  } else if (id == 3u) {
    let streak = textureSample(tNoise, sLin, vec2f(pu.x * 0.9, wp.y * 0.07)).g;
    // concreto: tom quase uniforme de perto (nada de manchas de ruído); a leitura vem das juntas, dos painéis e dos escorridos
    var c = in.col.rgb * (0.92 + 0.12 * n1.r) * (0.97 + 0.06 * n2.a * near);
    c *= 0.84 + 0.2 * streak;
    // juntas de fôrma
    let jx = abs(fract(dot(wp.xz, vec2f(0.7071, 0.7071)) / 3.4) - 0.5) * 3.4; let jy = abs(fract(wp.y / 1.25) - 0.5) * 1.25;
    let jw = max(fwidth(wp.y) + fwidth(wp.x) + fwidth(wp.z), 0.006);
    let j = (1.0 - smoothstep(0.012, 0.012 + jw * 1.2, min(jx, jy))) * (1.0 - smoothstep(60.0, 220.0, dist));
    // cada painel de fôrma com um tom; faixa suja junto ao chão e escorrido escuro sob as bordas
    let cell = floor(vec2f(dot(wp.xz, vec2f(0.7071, 0.7071)) / 3.4, wp.y / 1.25));
    c *= 0.84 + 0.26 * fract(sin(dot(cell, vec2f(12.9898, 78.233))) * 43758.5453);
    // intempérie em escala de metros: manchas de umidade/fuligem e faixas horizontais mais claras (lixiviado)
    let wth = textureSample(tNoise, sLin, vec2f(pu.x * 0.043, wp.y * 0.11));
    c *= 0.8 + 0.34 * smoothstep(0.3, 0.72, wth.g); c = mix(c, c * vec3f(0.86, 0.9, 0.84), smoothstep(0.62, 0.8, wth.r) * 0.6);
    // furos dos tirantes da fôrma (dois por painel) e manchas de umidade escorrendo das juntas horizontais
    let fx = fract(dot(wp.xz, vec2f(0.7071, 0.7071)) / 3.4); let fy = fract(wp.y / 1.25);
    let hd = length(vec2f((abs(fx - 0.5) - 0.3) * 3.4, (fy - 0.5) * 1.25));
    let hole = (1.0 - smoothstep(0.028, 0.028 + jw * 1.2, hd)) * (1.0 - smoothstep(40.0, 120.0, dist));
    let drip = smoothstep(0.55, 0.8, textureSample(tNoise, sLin, vec2f(pu.x * 2.1, 0.37)).b) * (1.0 - fy) * (1.0 - fy);
    c *= 1.0 - 0.3 * drip;
    let hgC = wp.y - wmHeight(wp.xz);
    c = mix(c, c * 0.5 + vec3f(0.03, 0.026, 0.02), (1.0 - smoothstep(0.03, 0.55, hgC)) * (0.35 + 0.5 * n1.g) * step(hgC, 3.0));
    s.albedo = mix(c, c * 0.4, max(j * 0.8, hole * 0.8)); s.rough = 0.74 + 0.2 * wth.g; s.ao *= 1.0 - max(j * 0.4, hole * 0.5);
    bump = (vec3f(n2.r, n2.g, n2.b) - 0.5) * 0.1 * near;
  } else if (id == 4u || id == 15u || id == 12u) {
    var fade = smoothstep(150.0, 190.0, dist);
#ifdef PASS_GBUF
    let th = ign(in.pos.xy, F.misc.y) * 0.98 + 0.01;
    if (id == 15u && fade > th) { discard; }
    if (id == 12u && fade <= th) { discard; }
#endif
    let painted = smoothstep(0.08, 0.2, max(in.col.r, max(in.col.g, in.col.b)));
    let chip = smoothstep(0.5, 0.72, n2.b * 0.6 + n1.g * 0.5);
    var c = mix(vec3f(0.022, 0.022, 0.024) * (0.7 + 0.8 * n2.r), in.col.rgb * (0.75 + 0.3 * n1.r), painted * (1.0 - chip * 0.55));
    // poeira nas faces de cima
    c = mix(c, vec3f(0.11, 0.09, 0.065), sat(N.y) * 0.5 * (0.5 + 0.5 * n1.b));
    // cada pilha com um tom (tinta nova, desbotada ou quase gasta) e sujeira de terra na base
    let pid = floor(wp.xz / 0.66); let ph2 = fract(sin(dot(pid, vec2f(127.1, 311.7))) * 43758.5453);
    c *= 0.62 + 0.6 * ph2; c = mix(c, vec3f(dot(c, vec3f(0.33))), 0.45 * step(0.6, ph2));
    let hgT = wp.y - wmHeight(wp.xz);
    c = mix(c, vec3f(0.1, 0.085, 0.06) * (0.7 + 0.5 * n2.r), (1.0 - smoothstep(0.0, 0.5, hgT)) * 0.55);
    s.albedo = c; s.rough = 0.82;
    if (id == 15u) {
      // pilha de 5 pneus (revolução; uv.y percorre o perfil: 4 pontos por pneu): fresta escura entre os pneus, ombro mais claro,
      // riscos da banda de rodagem e o furo central no topo
      let idx = in.uv.y * 22.0; let g = fract((idx + 0.5) * 0.25);
      let gap = (1.0 - smoothstep(0.0, 0.17, min(g, 1.0 - g))) * step(idx, 19.6);
      s.albedo *= 1.0 - 0.8 * gap; s.ao *= 1.0 - 0.85 * gap;
      let tread = smoothstep(0.3, 0.45, abs(fract(in.uv.x * 26.0) - 0.5)) * smoothstep(0.3, 0.42, g) * (1.0 - smoothstep(0.58, 0.7, g)) * near;
      s.albedo *= 1.0 - 0.35 * tread * step(idx, 19.6);
      let hole = smoothstep(19.9, 20.6, idx);
      s.albedo *= 1.0 - 0.75 * hole; s.ao *= 1.0 - 0.7 * hole;
    }
    if (id == 12u) {
      // substituto: relevo falso das pilhas (uv.x = índice da pilha, uv.y = altura em pneus)
      let f = fract(in.uv.x); let g = fract(in.uv.y);
      let tang = normalize(cross(vec3f(0.0, 1.0, 0.0), N) + vec3f(1e-6, 0.0, 0.0));
      let lat = (f - 0.5) * 1.7;
      s.normal = normalize(N * sqrt(max(0.05, 1.0 - lat * lat)) + tang * lat * step(N.y, 0.5));
      let gap = (1.0 - smoothstep(0.0, 0.2, min(f, 1.0 - f))) * 0.85 + (1.0 - smoothstep(0.0, 0.2, min(g, 1.0 - g))) * 0.7 * step(N.y, 0.5);
      s.ao *= 1.0 - sat(gap) * 0.9; s.albedo *= 1.0 - 0.75 * sat(gap);
      // cada pneu com brilho próprio no flanco (faixa clara no meio da altura) e tom levemente diferente
      let tid = floor(vec2f(in.uv.x, in.uv.y)); let th2 = fract(sin(dot(tid, vec2f(12.9898, 78.233))) * 43758.5453);
      s.albedo *= (0.78 + 0.4 * th2) * (0.85 + 0.3 * smoothstep(0.25, 0.5, g) * (1.0 - smoothstep(0.5, 0.75, g)));
      if (N.y > 0.5) { let hole = 1.0 - smoothstep(0.1, 0.2, abs(fract(in.uv.y) - 0.5)); let hole2 = 1.0 - smoothstep(0.12, 0.26, abs(f - 0.5)); s.albedo *= 1.0 - 0.8 * hole * hole2; s.ao *= 1.0 - 0.7 * hole * hole2; }
    }
  } else if (id == 5u) {
    // vidro de fachada refletivo, em módulos de 1,75 x 3,3 m (uv em metros): caixilhos de alumínio, travessa, painel cego
    // (spandrel) na base de cada módulo, tom azulado que clareia para o alto (céu refletido) e varia de vidro para vidro,
    // persianas em alguns. Nada de retângulo preto: o vidro tem cor própria além do reflexo do ambiente.
    let fx = fract(in.uv.x / 1.75); let fy = fract(in.uv.y / 3.3);
    let mx = abs(fx - 0.5) * 1.75; let my = abs(fy - 0.5) * 3.3;
    let aa = max(fwidth(in.uv.x) + fwidth(in.uv.y), 0.004);
    let frame = max(1.0 - smoothstep(0.04, 0.04 + aa, min(mx, my)), 1.0 - smoothstep(0.025, 0.025 + aa, abs(fy - 0.26) * 3.3));
    let pc = floor(vec2f(in.uv.x / 1.75, in.uv.y / 3.3)); let ph = fract(sin(dot(pc, vec2f(12.9898, 78.233))) * 43758.5453);
    let span = step(fy, 0.26);                                                     // painel cego na base do módulo
    let blind = (1.0 - span) * step(0.7, ph) * step(1.0 - (0.2 + 0.5 * fract(ph * 7.3)), fy);
    let slat = 0.85 + 0.15 * sin(in.uv.y * 78.0) * (1.0 - smoothstep(0.2, 0.7, fwidth(in.uv.y * 78.0)));
    var gc = mix(vec3f(0.06, 0.085, 0.12), vec3f(0.26, 0.36, 0.48), smoothstep(0.26, 1.0, fy) * (0.6 + 0.4 * n1.g)) * (0.75 + 0.5 * ph);
    gc = mix(gc, vec3f(0.5, 0.49, 0.44) * slat, blind * 0.75);
    gc = mix(gc, vec3f(0.17, 0.21, 0.27) * (0.85 + 0.3 * n1.r), span);
    s.albedo = mix(gc, vec3f(0.46, 0.48, 0.5) * (0.85 + 0.25 * n2.r), frame);
    let glassy = (1.0 - frame) * (1.0 - blind) * (1.0 - span);
    s.metal = mix(0.25, 0.62, glassy) + frame * 0.5; s.rough = mix(0.42, 0.07 + 0.05 * ph, glassy); s.coat = glassy;
    s.normal = normalize(N + vec3f(ph - 0.5, 0.0, fract(ph * 3.7) - 0.5) * 0.02 * glassy);   // cada vidro levemente fora de prumo
    s.ao *= 1.0 - 0.25 * frame;
  } else if (id == 6u) {
    s.albedo = in.col.rgb; s.emissive = matA(in.mat); s.rough = 0.3;
  } else if (id == 7u) {
    if (ff) {
      let t = textureSampleBias(tAtlas, sLin, in.uv, -0.8);
      s.albedo = t.rgb * (0.82 + 0.2 * n1.r) * (0.95 + 0.08 * n2.a * near); s.rough = 0.42;
    } else {
      // verso da placa: chapa galvanizada com quadro de travessas e montantes (desenhado no shader, em metros do mundo)
      let tg = normalize(cross(vec3f(0.0, 1.0, 0.0), N) + vec3f(1e-5, 0.0, 0.0)); let a = dot(wp, tg);
      let aw = max(fwidth(wp.y) + fwidth(a), 0.004);
      let ry = abs(fract(wp.y / 0.7 + 0.2) - 0.5) * 0.7; let rx = abs(fract(a / 1.2) - 0.5) * 1.2;
      let fr = max(1.0 - smoothstep(0.03, 0.03 + aw, ry), 1.0 - smoothstep(0.025, 0.025 + aw, rx));
      let sh = max(1.0 - smoothstep(0.03, 0.1, ry), 1.0 - smoothstep(0.025, 0.09, rx)) * (1.0 - fr);       // sombra junto ao quadro
      let rust = smoothstep(0.62, 0.8, n1.b * 0.5 + n2.r * 0.5);
      var c = vec3f(0.34, 0.36, 0.38) * (0.78 + 0.35 * n1.r) * (0.9 + 0.2 * textureSample(tNoise, sLin, vec2f(a * 1.1, wp.y * 0.1)).g);
      c = mix(c, vec3f(0.2, 0.11, 0.06), rust * 0.45);
      c = mix(c, vec3f(0.5, 0.52, 0.54) * (0.85 + 0.25 * n2.g), fr);
      s.albedo = c * (1.0 - 0.45 * sh); s.rough = mix(0.55, 0.38, fr); s.metal = mix(0.6, 0.85, fr) * (1.0 - rust * 0.5); s.ao *= 1.0 - 0.35 * sh;
    }
  } else if (id == 8u) {
    let u = fract(in.uv.x / 0.52); let aa = max(fwidth(in.uv.x / 0.52), 0.004);
    let gap = 1.0 - smoothstep(0.045, 0.045 + aa, min(u, 1.0 - u));
    s.albedo = mix(in.col.rgb * (0.85 + 0.2 * n1.r), vec3f(0.035), gap * (1.0 - smoothstep(60.0, 140.0, dist)) + 0.12 * smoothstep(60.0, 140.0, dist));
    s.rough = 0.42; s.ao *= 1.0 - gap * 0.4;
  } else if (id == 9u) {
    let ph = in.uv.y / 0.19 * 6.2832; let aa = fwidth(in.uv.y / 0.19);
    let k = 1.0 - smoothstep(0.25, 0.9, aa);
    s.albedo = in.col.rgb * (0.82 + 0.25 * n1.r) * (1.0 + 0.1 * sin(ph) * k);
    s.metal = 0.55; s.rough = 0.48; s.ao *= 1.0 - 0.18 * (0.5 - 0.5 * sin(ph)) * k;
    bump = vec3f(0.0);
  } else if (id == 10u) {
    s.albedo = in.col.rgb * (0.85 + 0.2 * n1.r); s.rough = 0.8; s.sss = 0.5;
  } else if (id == 13u) {
    let ph = wp.y / 0.11 * 6.2832; let k = 1.0 - smoothstep(0.2, 0.8, fwidth(wp.y / 0.11));
    s.albedo = in.col.rgb * (0.85 + 0.2 * n1.r) * (1.0 + 0.08 * sin(ph) * k);
    s.normal = normalize(N + vec3f(0.0, cos(ph) * 0.35 * k, 0.0)); s.rough = 0.5; s.metal = 0.35;
  } else if (id == 14u) {
    let band = step(0.45, in.uv.y) * step(in.uv.y, 0.68);
    s.albedo = mix(vec3f(0.75, 0.16, 0.02), vec3f(0.7), band) * (0.85 + 0.2 * n2.r); s.rough = 0.55;
  } else if (id == 18u) {
    // lâmpada do semáforo de largada: vermelha acesa enquanto o carro espera no grid (F.car2.x = 1), apagada depois
    // apagada: lente vermelho-escura lisa (reflete o céu); acesa: vermelho saturado emissivo, mais quente no centro
    let on = F.car2.x;
    s.albedo = mix(vec3f(0.05, 0.004, 0.003), in.col.rgb, on); s.emissive = matA(in.mat) * on; s.rough = mix(0.12, 0.3, on); s.coat = 1.0 - on;
  } else if (id == 17u) {
    // chapa metálica nervurada pintada (revestimento de fachadas e pilares): nervuras verticais, emendas de painel, escorridos
    let tg = normalize(cross(vec3f(0.0, 1.0, 0.0), N) + vec3f(1e-5, 0.0, 0.0)); let a = dot(wp, tg);
    let ph = a / 0.22 * 6.2832; let k = 1.0 - smoothstep(0.2, 0.8, fwidth(a / 0.22));
    let aw = max(fwidth(a) + fwidth(wp.y), 0.004);
    let seam = max(1.0 - smoothstep(0.012, 0.012 + aw, abs(fract(a / 2.2) - 0.5) * 2.2), 1.0 - smoothstep(0.012, 0.012 + aw, abs(fract(wp.y / 3.0 + 0.15) - 0.5) * 3.0));
    let streak = textureSample(tNoise, sLin, vec2f(a * 0.9, wp.y * 0.06)).g;
    var c = in.col.rgb * (0.82 + 0.22 * n1.r) * (0.78 + 0.34 * streak) * (1.0 + 0.07 * sin(ph) * k);
    c = mix(c, c * 0.35, seam * 0.8);
    s.albedo = c; s.rough = 0.36 + 0.2 * n2.g; s.metal = 0.45; s.ao *= 1.0 - seam * 0.3 - 0.12 * (0.5 - 0.5 * sin(ph)) * k;
    s.normal = normalize(N + tg * cos(ph) * 0.3 * k);
  } else {
    s.albedo = in.col.rgb;
  }
  if (dot(bump, bump) > 0.0) { s.normal = normalize(s.normal + bump); }
  return s;
}
`;
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
WGSL["world_fence"] = `// Alambrado (passe de transparentes): malha de arame em losango com cobertura analítica (sem serrilhado nem cintilação).
// uv em metros. De perto aparecem os fios; de longe vira um véu de opacidade constante.
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
WGSL["skid"] = `// Marcas de pneu: decalque escuro sobre o albedo do G-buffer.
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
WGSL["particles"] = `// Fumaça de pneu e poeira: cartões voltados para a câmera, iluminados por vértice, com borda suave contra a profundidade.
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
  // sombra suavizada (4 amostras espalhadas) para a nuvem não piscar ao cruzar a borda de uma sombra
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
  // dois níveis de ruído deslocados pela semente: bordas rasgadas e miolo com relevo
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
