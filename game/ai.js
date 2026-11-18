'use strict';
// ---- 42_ai.js
// Linha de corrida e piloto automático. O piloto só "aperta teclas" (mesma via de entrada do jogador);
// é usado fora de linha para gravar os comandos da volta roteirizada (ver trabalho/scripts/gravar_volta).
const AI = { line: null, vt: null, kline: null, enabled: false, script: null };
function aiBuild() {
  const N = TRK.N, ds = TRK.ds, hw = TRK.hw, lim = hw - 2.0;
  const o = new Float64Array(N), px = new Float64Array(N), pz = new Float64Array(N);
  const upd = i => { px[i] = TRK.x[i] - TRK.tz[i] * o[i]; pz[i] = TRK.z[i] + TRK.tx[i] * o[i]; };
  for (let i = 0; i < N; i++) upd(i);
  // minimiza a curvatura (energia da 2ª diferença) por descida de gradiente, do grosso para o fino
  for (const k of [16, 8, 4]) {
    const M = Math.floor(N / k), id = new Int32Array(M), oo = new Float64Array(M), qx = new Float64Array(M), qz = new Float64Array(M), dx = new Float64Array(M), dz = new Float64Array(M);
    for (let j = 0; j < M; j++) { id[j] = Math.round(j * N / M) % N; oo[j] = o[id[j]]; }
    const iters = k === 16 ? 9000 : k === 8 ? 3000 : 800;
    for (let it = 0; it < iters; it++) {
      for (let j = 0; j < M; j++) { const i = id[j]; qx[j] = TRK.x[i] - TRK.tz[i] * oo[j]; qz[j] = TRK.z[i] + TRK.tx[i] * oo[j]; }
      for (let j = 0; j < M; j++) { const a = (j - 1 + M) % M, b = (j + 1) % M; dx[j] = qx[a] - 2 * qx[j] + qx[b]; dz[j] = qz[a] - 2 * qz[j] + qz[b]; }
      for (let j = 0; j < M; j++) { const a = (j - 1 + M) % M, b = (j + 1) % M, i = id[j]; const gx = dx[a] - 2 * dx[j] + dx[b], gz = dz[a] - 2 * dz[j] + dz[b]; oo[j] = clamp(oo[j] - 0.05 * (gx * -TRK.tz[i] + gz * TRK.tx[i]), -lim, lim); }
    }
    for (let i = 0; i < N; i++) { const u = i * M / N, j = Math.floor(u) % M, f = u - Math.floor(u); o[i] = oo[j] + (oo[(j + 1) % M] - oo[j]) * f; }
  }
  for (let i = 0; i < N; i++) upd(i);
  // suaviza e guarda
  const line = AI.line = new Float32Array(N), kl = AI.kline = new Float32Array(N), vt = AI.vt = new Float32Array(N);
  for (let i = 0; i < N; i++) { let s = 0, w = 0; for (let q = -6; q <= 6; q++) { const g = Math.exp(-q * q / 18); s += o[(i + q + N) % N] * g; w += g; } line[i] = s / w; }
  for (let i = 0; i < N; i++) { o[i] = line[i]; upd(i); }
  TRK.line = line;
  for (let i = 0; i < N; i++) {
    const a = (i - 4 + N) % N, b = (i + 4) % N; const x1 = px[i] - px[a], z1 = pz[i] - pz[a], x2 = px[b] - px[i], z2 = pz[b] - pz[i];
    const cr = x1 * z2 - z1 * x2, l1 = Math.hypot(x1, z1), l2 = Math.hypot(x2, z2), l3 = Math.hypot(px[b] - px[a], pz[b] - pz[a]);
    kl[i] = 2 * cr / (l1 * l2 * l3 + 1e-9);
  }
  // perfil de velocidade: limite lateral, depois passes de frenagem (trás) e aceleração (frente)
  const aLat = 11.4, aBrk = 7.6, vMax = 62;
  for (let i = 0; i < N; i++) { let k = 0; for (let q = -3; q <= 3; q++) k = Math.max(k, Math.abs(kl[(i + q + N) % N])); vt[i] = Math.min(vMax, Math.sqrt(aLat / Math.max(k, 1e-4))); }
  for (let pass = 0; pass < 2; pass++) for (let i = N - 1; i >= 0; i--) { const nx = (i + 1) % N; const g = -9.81 * TRK.slope[i]; vt[i] = Math.min(vt[i], Math.sqrt(vt[nx] * vt[nx] + 2 * Math.max(2, aBrk + g) * ds)); }
}
const _ai = new Float64Array(5);
// decide as teclas deste instante a partir do estado do veículo
function aiKeys(t) {
  const V = VEH, N = TRK.N, ds = TRK.ds; let keys = 0;
  const speed = Math.hypot(V.vx, V.vy), i0 = ((Math.floor(V.s / ds) % N) + N) % N;
  // ponto de mira na linha, à frente
  const Ld = 4.5 + speed * 0.3, ia = (i0 + Math.round(Ld / ds)) % N;
  trackPos(ia * ds, AI.line[ia], _ai);
  const dx = _ai[0] - V.x, dz = _ai[2] - V.z, c = Math.cos(V.yaw), s = Math.sin(V.yaw);
  const lx = dx * c + dz * s, lz = -dx * s + dz * c, eta = Math.atan2(lz, lx);
  let want = Math.atan(2 * VP.L * Math.sin(eta) / Math.hypot(lx, lz));
  want += clamp(-V.r * 0.0 + (Math.atan2(V.vy, Math.max(V.vx, 3))) * 0.6, -0.2, 0.2);   // contra-esterço se a traseira escapa
  const err = want - V.steer, db = 0.006;
  if (err > db) keys |= K_D; else if (err < -db) keys |= K_A;
  // velocidade alvo um pouco à frente (antecipa o freio)
  let vT = 1e9; for (let q = 0; q < 6; q++) vT = Math.min(vT, AI.vt[(i0 + q * 2) % N]);
  const sc = AI.script;
  if (speed < vT - 0.3) keys |= K_W; else if (speed > vT + 1.2) keys |= K_S;
  else if (speed < vT + 0.3 && (V.steps & 1)) keys |= K_W;
  // roteiro: eventos por tempo (freio de mão, trocas de câmera)
  if (sc) for (let i = 0; i < sc.length; i++) { const e = sc[i]; if (t >= e[0] && t < e[1]) { keys |= e[2]; if (e[3]) keys &= ~e[3]; } }
  return keys;
}
