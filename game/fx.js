'use strict';
// ---- 44_fx.js
// Efeitos: marcas de pneu (decalque em anel de quads) e fumaça/poeira (partículas em CPU, instanciadas). Tudo pré-alocado.
const SK_N = 4096, PT_N = 900;
const FX = {
  sk: new Float32Array(SK_N * 6 * 5), skHead: 0, skLo: 1e9, skHi: -1, skBuf: null, skPipe: null,
  last: new Float32Array(4 * 8), active: new Uint8Array(4),
  p: new Float32Array(PT_N * 12), pAlive: 0, pNext: 0, inst: new Float32Array(PT_N * 12), pBuf: null, pFam: null, pBG: null, seed: new Uint32Array([7]),
};
function fxInit() {
  FX.skBuf = mkBuf(FX.sk.byteLength, BU.V);
  const code = wgslPP('skid', SH_DEFS), mod = mkShader('skid', SH_DEFS), bgls = reflectBGLs(code); bgls[0] = R.bgl0;
  const none = { format: 'rgba16float', writeMask: 0 };
  R.pending.push(G.dev.createRenderPipelineAsync({
    layout: G.dev.createPipelineLayout({ bindGroupLayouts: [bgls[0], bgls[1]] }),
    vertex: { module: mod, entryPoint: 'vs', buffers: [{ arrayStride: 20, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x2' }] }] },
    fragment: { module: mod, entryPoint: 'fs', targets: [{ format: 'rgba8unorm-srgb', blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } }, none, { format: 'rgba8unorm', writeMask: 0 }] },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'greater-equal', depthBias: 6, depthBiasSlopeScale: 2 },
  }).then(p => { FX.skPipe = p; }));
  R.decals.push({ draw(pass) { if (!FX.skPipe) return; pass.setPipeline(FX.skPipe); pass.setVertexBuffer(0, FX.skBuf); pass.draw(SK_N * 6); } });
  FX.pBuf = mkBuf(FX.inst.byteLength, BU.V);
  FX.pFam = mkFwdFamily('particles', {
    src: 'particles', cull: 'none',
    buffers: [{ arrayStride: 48, stepMode: 'instance', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }, { shaderLocation: 1, offset: 16, format: 'float32x4' }, { shaderLocation: 2, offset: 32, format: 'float32x4' }] }],
    blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } },
  });
  R.transparents.push({ draw(pass) { if (!FX.pFam.pipe || !FX.pAlive) return; if (!FX.pBG) FX.pBG = fwdBindGroup(FX.pFam); pass.setPipeline(FX.pFam.pipe); pass.setBindGroup(3, FX.pBG); pass.setVertexBuffer(0, FX.pBuf); pass.draw(6, FX.pAlive); } });
}
function fxReset() { FX.sk.fill(0); FX.skLo = 0; FX.skHi = SK_N * 30; FX.skHead = 0; FX.active.fill(0); FX.p.fill(0); FX.pAlive = 0; FX.pNext = 0; FX.seed[0] = 7; }
// inteiro pseudoaleatório 0..65535 (inteiros pequenos não vão para a heap)
function fxRnd() { const s = FX.seed; let x = s[0]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; s[0] = x; return (s[0] >>> 8) & 0xffff; }
// por passo de física: estende as marcas e emite partículas nas rodas que derrapam
function fxStep() {
  const V = VEH, L = FX.last;
  for (let i = 0; i < 4; i++) {
    const sl = V.slip[i], zone = V.wzone[i], hard = zone === ZONE.ASPHALT || zone === ZONE.KERB || zone === ZONE.PIT;
    const x = V.wx[i], y = V.wy[i] + 0.012, z = V.wz[i], o = i * 8;
    if ((zone === ZONE.ASPHALT || zone === ZONE.PIT) && sl > 0.5) {
      if (!FX.active[i]) { FX.active[i] = 1; L[o] = x; L[o + 1] = y; L[o + 2] = z; L[o + 6] = 0; L[o + 7] = 0; }
      else {
        const dx = x - L[o], dz = z - L[o + 2], d = Math.sqrt(dx * dx + dz * dz);
        if (d > 0.14) {
          const nx = -dz / d * 0.082, nz = dx / d * 0.082, a = Math.min(1, (sl - 0.5) * 2.4) * 0.8;
          const hadPrev = L[o + 7] > 0, pnx = hadPrev ? L[o + 3] : nx, pnz = hadPrev ? L[o + 4] : nz, pa = L[o + 6];
          const b = FX.skHead * 30; FX.skHead = (FX.skHead + 1) % SK_N;
          const S = FX.sk, ax = L[o] - pnx, az = L[o + 2] - pnz, bx = L[o] + pnx, bz = L[o + 2] + pnz, py = L[o + 1];
          S[b] = ax; S[b + 1] = py; S[b + 2] = az; S[b + 3] = pa; S[b + 4] = -1;
          S[b + 5] = bx; S[b + 6] = py; S[b + 7] = bz; S[b + 8] = pa; S[b + 9] = 1;
          S[b + 10] = x + nx; S[b + 11] = y; S[b + 12] = z + nz; S[b + 13] = a; S[b + 14] = 1;
          S[b + 15] = ax; S[b + 16] = py; S[b + 17] = az; S[b + 18] = pa; S[b + 19] = -1;
          S[b + 20] = x + nx; S[b + 21] = y; S[b + 22] = z + nz; S[b + 23] = a; S[b + 24] = 1;
          S[b + 25] = x - nx; S[b + 26] = y; S[b + 27] = z - nz; S[b + 28] = a; S[b + 29] = -1;
          if (b < FX.skLo) FX.skLo = b; if (b + 30 > FX.skHi) FX.skHi = b + 30;
          L[o] = x; L[o + 1] = y; L[o + 2] = z; L[o + 3] = nx; L[o + 4] = nz; L[o + 6] = a; L[o + 7] = 1;
        }
      }
    } else FX.active[i] = 0;
    // partículas
    const speed = Math.sqrt(V.vx * V.vx + V.vy * V.vy);
    const rate = hard ? (sl > 0.62 ? (sl - 0.62) * 1.0 * Math.min(1, speed * 0.1) : 0) : Math.min(1, speed / 14) * 0.3;
    for (let rep = 0; rep < 2; rep++) if (rate > 0 && fxRnd() < rate * (rep ? 0.6 : 1) * 65536) {
      const q = FX.pNext * 12, p = FX.p, K = 1 / 65536; FX.pNext = (FX.pNext + 1) % PT_N;
      const c = Math.cos(V.yaw), s = Math.sin(V.yaw), wvx = V.vx * c - V.vy * s, wvz = V.vx * s + V.vy * c;
      p[q] = x + ((fxRnd() * K) - 0.5) * 0.25; p[q + 1] = y + 0.08; p[q + 2] = z + ((fxRnd() * K) - 0.5) * 0.25;
      p[q + 3] = wvx * 0.18 + ((fxRnd() * K) - 0.5) * 1.1; p[q + 4] = 0.5 + (fxRnd() * K) * 0.7; p[q + 5] = wvz * 0.18 + ((fxRnd() * K) - 0.5) * 1.1;
      p[q + 6] = 0; p[q + 7] = hard ? 0.8 + (fxRnd() * K) * 0.9 : 0.8 + (fxRnd() * K) * 0.7; p[q + 8] = 0.16 + (fxRnd() * K) * 0.14; p[q + 9] = (fxRnd() * K) * 6.28; p[q + 10] = hard ? 0 : (zone === ZONE.GRAVEL ? 1 : 2); p[q + 11] = (fxRnd() * K);
    }
  }
}
// por quadro: integra as partículas e envia os buffers alterados
function fxFrame() {
  const dt = RT[1];
  if (FX.skHi > FX.skLo) { G.dev.queue.writeBuffer(FX.skBuf, FX.skLo * 4, FX.sk, FX.skLo, FX.skHi - FX.skLo); FX.skLo = 1e9; FX.skHi = -1; }
  const p = FX.p, o = FX.inst; let n = 0;
  for (let i = 0; i < PT_N; i++) {
    const q = i * 12, life = p[q + 7]; if (life <= 0) continue;
    const age = p[q + 6] + dt; if (age >= life) { p[q + 7] = 0; continue; }
    p[q + 6] = age; const k = Math.exp(-dt * 1.6);
    p[q + 3] = p[q + 3] * k + R.wind[0] * 0.6 * dt; p[q + 5] = p[q + 5] * k + R.wind[1] * 0.6 * dt; p[q + 4] = p[q + 4] * Math.exp(-dt * 0.9) + 0.25 * dt;
    p[q] += p[q + 3] * dt; p[q + 1] += p[q + 4] * dt; p[q + 2] += p[q + 5] * dt;
    const t = age / life, kind = p[q + 10], w = n * 12;
    o[w] = p[q]; o[w + 1] = p[q + 1] + p[q + 8] * 0.5; o[w + 2] = p[q + 2]; o[w + 3] = p[q + 8] * (1 + Math.sqrt(t) * (kind === 0 ? 3.4 : 3.2));
    const a = Math.min(1, t * 45) * Math.pow(1 - t, 1.6) * (kind === 0 ? 0.5 : 0.42) / (1 + t * 2.2);
    if (kind === 0) { o[w + 4] = 0.5; o[w + 5] = 0.52; o[w + 6] = 0.55; } else if (kind === 1) { o[w + 4] = 0.55; o[w + 5] = 0.48; o[w + 6] = 0.38; } else { o[w + 4] = 0.5; o[w + 5] = 0.44; o[w + 6] = 0.33; }
    o[w + 7] = a; o[w + 8] = p[q + 9] + t * 0.8; o[w + 9] = p[q + 11]; n++;
  }
  FX.pAlive = n;
  if (n) G.dev.queue.writeBuffer(FX.pBuf, 0, o, 0, n * 12);
}
BUILD.push(async () => { if (GAME.mode !== 'test' && GAME.mode !== 'car') fxInit(); });
