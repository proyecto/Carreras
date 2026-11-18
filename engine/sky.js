'use strict';
// ---- 22_sky.js
// Geração única das texturas de ruído e do céu; cor do sol; harmônicos esféricos do ambiente.
let SUN_EL = 17 * PI / 180, SUN_AZ = 180.5 * PI / 180;
function atmSunColor(dirY) {
  // mesma atmosfera do shader (atmos.wgsl): transmitância do sol até o chão
  const RP = 6360e3, RA = 6440e3, o = RP + 40, n = 32;
  const b = o * dirY, cc = o * o - RA * RA, t = -b + Math.sqrt(b * b - cc), dt = t / n; let oR = 0, oM = 0, oO = 0;
  for (let i = 0; i < n; i++) { const s = (i + 0.5) * dt, h = Math.sqrt(o * o + s * s + 2 * o * s * dirY) - RP; oR += Math.exp(-h / 8000) * dt; oM += Math.exp(-h / 1300) * dt; oO += Math.max(0, 1 - Math.abs(h - 25000) / 15000) * dt; }
  const BR = [5.8e-6, 13.6e-6, 33.1e-6], BO = [0.65e-6, 1.881e-6, 0.085e-6], BM = 26e-6 * 1.11;
  return [0, 1, 2].map(i => 22 * Math.exp(-(BR[i] * oR + BM * oM + BO[i] * oO)));
}
async function skyInit(progress) {
  const dev = G.dev, T = R.tex, V = R.view;
  const sunCfg = (typeof TRACKS !== 'undefined' && TRACKS.active && TRACKS.active.sun) || null;
  SUN_EL = ((sunCfg && sunCfg.elDeg != null) ? sunCfg.elDeg : 17) * PI / 180;
  SUN_AZ = ((sunCfg && sunCfg.azDeg != null) ? sunCfg.azDeg : 180.5) * PI / 180;
  const sunColEl = ((sunCfg && sunCfg.colorElDeg != null) ? sunCfg.colorElDeg : 14.5) * PI / 180;
  R.sun[0] = Math.cos(SUN_EL) * Math.cos(SUN_AZ); R.sun[1] = Math.sin(SUN_EL); R.sun[2] = Math.cos(SUN_EL) * Math.sin(SUN_AZ);
  // cor do sol: transmitância da atmosfera como se o sol estivesse um pouco mais baixo (tom mais quente), com ganho artístico
  const sc = atmSunColor(Math.sin(sunColEl)); R.sunCol[0] = sc[0] * 1.5; R.sunCol[1] = sc[1] * 1.5; R.sunCol[2] = sc[2] * 1.5;
  // ruído
  const nb = mkPost('noisebake', {}, ['rgba8unorm']);
  const ub = mkBuf(65 * 256, BU.U), ud = new Float32Array(65 * 64);
  for (let z = 0; z < 64; z++) { ud[z * 64] = (z + 0.5) / 64; ud[z * 64 + 1] = 0; } ud[64 * 64 + 1] = 1;
  dev.queue.writeBuffer(ub, 0, ud);
  const nbp = nb, nbg = dev.createBindGroup({ layout: nb.bgls[0], entries: [{ binding: 0, resource: { buffer: ub, size: 16 } }] });
  let enc = dev.createCommandEncoder();
  { const p = enc.beginRenderPass({ colorAttachments: [{ view: T.noise.createView({ baseMipLevel: 0, mipLevelCount: 1 }), loadOp: 'clear', storeOp: 'store' }] }); p.setPipeline(nbp); p.setBindGroup(0, nbg, [64 * 256]); p.draw(3); p.end(); }
  for (let z = 0; z < 64; z++) { const p = enc.beginRenderPass({ colorAttachments: [{ view: V.noise3, depthSlice: z, loadOp: 'clear', storeOp: 'store' }] }); p.setPipeline(nbp); p.setBindGroup(0, nbg, [z * 256]); p.draw(3); p.end(); }
  dev.queue.submit([enc.finish()]);
  genMips(T.noise, 'rgba8unorm');
  // céu, em faixas (para não travar a GPU num único comando longo)
  const sb = mkPost('skybake', {}, ['rgba16float']);
  const su = mkBuf(32, BU.U, new Float32Array([R.sun[0], R.sun[1], R.sun[2], 0, 0.57, 0, 0, 0]));
  const sbg = bgOf(sb, 0, [su, V.noise3, V.noise, R.sLin]);
  const strips = 16;
  for (let i = 0; i < strips; i++) {
    enc = dev.createCommandEncoder();
    const p = enc.beginRenderPass({ colorAttachments: [{ view: V.sky, loadOp: i ? 'load' : 'clear', storeOp: 'store' }] });
    p.setPipeline(sb); p.setBindGroup(0, sbg); p.setScissorRect(i * SKY_W / strips, 0, SKY_W / strips, SKY_H); p.draw(3); p.end();
    dev.queue.submit([enc.finish()]);
    await dev.queue.onSubmittedWorkDone(); if (progress) progress(i / strips);
  }
}
function halfToFloat(h) { const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 31, f = h & 1023; if (e === 0) return s * Math.pow(2, -14) * (f / 1024); if (e === 31) return f ? NaN : s * Infinity; return s * Math.pow(2, e - 15) * (1 + f / 1024); }
// lê um mip do cubemap de ambiente e projeta em SH de ordem 2 (irradiância/π)
async function computeSH() {
  const dev = G.dev, mip = 3, n = ENV_RES >> mip, bpr = Math.ceil(n * 8 / 256) * 256;
  const buf = dev.createBuffer({ size: bpr * n * 6, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const enc = dev.createCommandEncoder();
  for (let f = 0; f < 6; f++) enc.copyTextureToBuffer({ texture: R.tex.env, mipLevel: mip, origin: [0, 0, f] }, { buffer: buf, offset: f * bpr * n, bytesPerRow: bpr, rowsPerImage: n }, [n, n, 1]);
  dev.queue.submit([enc.finish()]); await buf.mapAsync(GPUMapMode.READ);
  const u16 = new Uint16Array(buf.getMappedRange()), sh = new Float64Array(27); let wsum = 0;
  const AX = [[0, 0, -1, 0, -1, 0, 1, 0, 0], [0, 0, 1, 0, -1, 0, -1, 0, 0], [1, 0, 0, 0, 0, 1, 0, 1, 0], [1, 0, 0, 0, 0, -1, 0, -1, 0], [1, 0, 0, 0, -1, 0, 0, 0, 1], [-1, 0, 0, 0, -1, 0, 0, 0, -1]];
  for (let f = 0; f < 6; f++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const qx = (x + 0.5) / n * 2 - 1, qy = (y + 0.5) / n * 2 - 1, a = AX[f];
    let dx = a[6] + a[0] * qx + a[3] * qy, dy = a[7] + a[1] * qx + a[4] * qy, dz = a[8] + a[2] * qx + a[5] * qy; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
    const w = 1 / (l * l * l); wsum += w; const o = (f * bpr * n + y * bpr) / 2 + x * 4;
    const Y = [0.282095, 0.488603 * dy, 0.488603 * dz, 0.488603 * dx, 1.092548 * dx * dy, 1.092548 * dy * dz, 0.315392 * (3 * dz * dz - 1), 1.092548 * dx * dz, 0.546274 * (dx * dx - dy * dy)];
    for (let c = 0; c < 3; c++) { const v = Math.min(halfToFloat(u16[o + c]), 50) * w; for (let k = 0; k < 9; k++) sh[k * 3 + c] += v * Y[k]; }
  }
  buf.unmap(); buf.destroy();
  const K = [0.282095, 0.488603 * 2 / 3, 0.488603 * 2 / 3, 0.488603 * 2 / 3, 1.092548 / 4, 1.092548 / 4, 0.315392 / 4, 1.092548 / 4, 0.546274 / 4], nrm = 4 * PI / wsum;
  for (let k = 0; k < 9; k++) for (let c = 0; c < 3; c++) FR.data[FR.o.sh + k * 4 + c] = sh[k * 3 + c] * nrm * K[k];
}
