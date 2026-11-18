'use strict';
// ---- 21_post.js
// Passes de tela cheia: meia resolução (AO + névoa), iluminação, transparentes, TAA, desfoque de movimento, bloom, saída.
const MB_TILE = 20, BLOOM_N = 6;
function postInit() {
  const dev = G.dev, T = R.tex, V = R.view, W = G.W, H = G.H, D = R.pd, P = R.post = {};
  const HDR = 'rgba16float';
  P.half = mkPost('half', {}, [HDR]); P.halfBG = bgOf(P.half, 0, [R.frameBuf, V.depth, V.gB, V.shadow, V.shadowS, R.sCmp]);
  P.blurH = mkPost('bilat', { DIR: '1,0' }, [HDR]); P.blurV = mkPost('bilat', { DIR: '0,1' }, [HDR]);
  P.blurHBG = bgOf(P.blurH, 0, [V.half[0]]); P.blurVBG = bgOf(P.blurV, 0, [V.half[1]]);
  D.half = mkPassDesc(1, null, false, 'half'); D.half.colorAttachments[0].view = V.half[0];
  D.blurH = mkPassDesc(1, null, false, 'blurH'); D.blurH.colorAttachments[0].view = V.half[1];
  D.blurV = mkPassDesc(1, null, false, 'blurV'); D.blurV.colorAttachments[0].view = V.half[2];
  P.light = mkPost('light', { SSR: '' }, [HDR]);
  P.lightBG = [0, 1].map(i => bgOf(P.light, 0, [R.frameBuf, V.gA, V.gB, V.gC, V.depth, V.shadow, V.shadowS, R.sCmp, V.half[2], V.env, V.sky, R.sClamp, R.sSky, V.hist[i]]));
  P.taa = mkPost('taa', {}, [HDR, 'rg16float']);
  P.taaBG = [0, 1].map(i => bgOf(P.taa, 0, [R.frameBuf, V.hdr, V.hist[i], V.gV, V.depth, R.sClamp]));
  D.taa = [0, 1].map(i => { const d = mkPassDesc(2, null, false, 'taa'); d.colorAttachments[0].view = V.hist[i]; d.colorAttachments[1].view = V.vel; return d; });
  // desfoque de movimento
  const tw = Math.ceil(W / MB_TILE), th = Math.ceil(H / MB_TILE);
  T.tile = [mkTex(tw, th, 'rg16float'), mkTex(tw, th, 'rg16float')]; V.tile = T.tile.map(t => t.createView());
  P.mbTile = mkPost('mbtile', { TILE: MB_TILE }, ['rg16float']); P.mbNeigh = mkPost('mbtile', { NEIGH: '', TILE: MB_TILE }, ['rg16float']);
  P.mbTileBG = bgOf(P.mbTile, 0, [V.vel]); P.mbNeighBG = bgOf(P.mbNeigh, 0, [V.tile[0]]);
  D.mbTile = mkPassDesc(1, null, false, 'mbTile'); D.mbTile.colorAttachments[0].view = V.tile[0];
  D.mbNeigh = mkPassDesc(1, null, false, 'mbNeigh'); D.mbNeigh.colorAttachments[0].view = V.tile[1];
  P.mb = mkPost('mblur', { TILE: MB_TILE }, [HDR]);
  P.mbBG = [0, 1].map(i => bgOf(P.mb, 0, [R.frameBuf, V.hist[i], V.vel, V.tile[1], V.depth, R.sClamp]));
  D.mb = mkPassDesc(1, null, false, 'mblur'); D.mb.colorAttachments[0].view = V.mb;
  // bloom
  T.bl = []; V.bl = []; D.blDown = []; D.blUp = []; P.blDownBG = []; P.blUpBG = [];
  for (let i = 0; i < BLOOM_N; i++) { T.bl[i] = mkTex(Math.max(2, W >> (i + 1)), Math.max(2, H >> (i + 1)), HDR); V.bl[i] = T.bl[i].createView(); }
  P.blFirst = mkPost('bloom', { FIRST: '' }, [HDR]); P.blDown = mkPost('bloom', {}, [HDR]);
  P.blUp = mkPost('bloom', { UP: '', UPW: '1.0' }, [{ format: HDR, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } }]);
  for (let i = 0; i < BLOOM_N; i++) {
    const d = mkPassDesc(1, null, false, 'blDown' + i); d.colorAttachments[0].view = V.bl[i]; D.blDown.push(d);
    P.blDownBG.push(bgOf(i ? P.blDown : P.blFirst, 0, [i ? V.bl[i - 1] : V.mb, R.sClamp]));
  }
  for (let i = BLOOM_N - 2; i >= 0; i--) {
    const d = mkPassDesc(1, null, false, 'blUp' + i); d.colorAttachments[0].view = V.bl[i]; d.colorAttachments[0].loadOp = 'load'; D.blUp.push(d);
    P.blUpBG.push(bgOf(P.blUp, 0, [V.bl[i + 1], R.sClamp]));
  }
  // exposição
  T.ex = [mkTex(1, 1, 'r16float'), mkTex(1, 1, 'r16float')]; V.ex = T.ex.map(t => t.createView());
  P.expo = mkPost('expo', {}, ['r16float']);
  P.expoBG = [0, 1].map(i => bgOf(P.expo, 0, [R.frameBuf, V.bl[BLOOM_N - 1], V.ex[i], R.sClamp]));
  D.expo = [0, 1].map(i => { const d = mkPassDesc(1, null, false, 'expo'); d.colorAttachments[0].view = V.ex[i]; return d; });
  P.final = mkPost('final', {}, [G.fmt]);
  P.finalBG = [0, 1].map(i => bgOf(P.final, 0, [R.frameBuf, V.mb, V.bl[0], V.ex[i], R.sClamp, V.depth]));
  D.final = mkPassDesc(1, null, false, 'final');
  // cubemap: céu + pré-filtro
  P.cubeSky = mkPost('cubesky', {}, [HDR], { depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'always' } });
  P.cubeSkyBG = dev.createBindGroup({ layout: P.cubeSky.bgls[0], entries: [{ binding: 0, resource: { buffer: R.frameBuf } }, { binding: 1, resource: { buffer: R.passBuf, size: 64 } }, { binding: 2, resource: V.sky }, { binding: 3, resource: R.sSky }] });
  P.envBlur = mkPost('envblur', {}, [HDR]);
  const eb = new Float32Array(6 * 8 * 64);
  const AX = [[0, 0, -1, 0, -1, 0, 1, 0, 0], [0, 0, 1, 0, -1, 0, -1, 0, 0], [1, 0, 0, 0, 0, 1, 0, 1, 0], [1, 0, 0, 0, 0, -1, 0, -1, 0], [1, 0, 0, 0, -1, 0, 0, 0, 1], [-1, 0, 0, 0, -1, 0, 0, 0, -1]];
  for (let f = 0; f < 6; f++) for (let m = 1; m <= ENV_MIPS; m++) {
    const o = (f * 8 + m) * 64, a = AX[f]; eb.set([a[0], a[1], a[2], 0, a[3], a[4], a[5], 0, a[6], a[7], a[8], 0, 2.6 / (ENV_RES >> m), 0, 0, 0], o);
  }
  P.envBuf = mkBuf(eb.byteLength, BU.U, eb);
  P.envBG = []; D.envMip = [];
  for (let m = 1; m <= ENV_MIPS; m++) P.envBG[m] = dev.createBindGroup({ layout: P.envBlur.bgls[0], entries: [{ binding: 0, resource: { buffer: P.envBuf, size: 64 } }, { binding: 1, resource: V.envMip[m - 1] }, { binding: 2, resource: R.sClamp }] });
  for (let f = 0; f < 6; f++) { D.envMip[f] = []; for (let m = 1; m <= ENV_MIPS; m++) { const d = mkPassDesc(1, null, false, 'envMip'); d.colorAttachments[0].view = V.envFace[f][m]; D.envMip[f][m] = d; } }
  P.dynA = new Uint32Array(1);
  P.dbg = mkPost('dbg', {}, [G.fmt]); P.dbgBuf = mkBuf(16, BU.U, new Float32Array([1, 0, 0, 0]));
}
// depuração: mostra uma textura (nome em R.view, ou 'hist0', 'half2', 'bl0'...) no lugar da imagem final
function setDebugView(name, scale, alpha) {
  if (!name) { R.dbgBG = null; return; }
  const m = /^(\w+?)(\d+)$/.exec(name); const v = R.view[name] || (m && R.view[m[1]] && R.view[m[1]][+m[2]]);
  G.dev.queue.writeBuffer(R.post.dbgBuf, 0, new Float32Array([scale || 1, alpha ? 1 : 0, 0, 0]));
  R.dbgBG = bgOf(R.post.dbg, 0, [v, R.sClamp, R.post.dbgBuf]);
}
function fsPass(enc, desc, pipe, bg) { const p = apiPass(enc, desc); p.setPipeline(pipe); p.setBindGroup(0, bg); p.draw(3); p.end(); }
function cubeSky(pass, slot) { const P = R.post; pass.setPipeline(P.cubeSky); P.dynA[0] = slot * 256; pass.setBindGroup(0, P.cubeSkyBG, P.dynA, 0, 1); pass.draw(3); }
function envMips(enc, face) {
  const P = R.post, D = R.pd;
  for (let m = 1; m <= ENV_MIPS; m++) {
    const p = apiPass(enc, D.envMip[face][m]); p.setPipeline(P.envBlur); P.dynA[0] = (face * 8 + m) * 256; p.setBindGroup(0, P.envBG[m], P.dynA, 0, 1); p.draw(3); p.end();
  }
}
function postFrame(enc) {
  const P = R.post, D = R.pd, cur = R.frameIdx & 1, prev = cur ^ 1;
  // decalques (marcas de pneu) sobre o G-buffer
  if (R.decals.length) { const p = apiPass(enc, D.decal); p.setBindGroup(0, R.globBG); R.dyn1[0] = 0; p.setBindGroup(1, R.passBG, R.dyn1, 0, 1); for (let i = 0; i < R.decals.length; i++) R.decals[i].draw(p); p.end(); }
  fsPass(enc, D.half, P.half, P.halfBG); fsPass(enc, D.blurH, P.blurH, P.blurHBG); fsPass(enc, D.blurV, P.blurV, P.blurVBG);
  fsPass(enc, D.light, P.light, P.lightBG[prev]);
  if (R.transparents.length) {
    const p = apiPass(enc, D.trans); p.setBindGroup(0, R.globBG); R.dyn1[0] = 0; p.setBindGroup(1, R.passBG, R.dyn1, 0, 1); R.dyn2[0] = 0; p.setBindGroup(2, R.objBG, R.dyn2, 0, 1);
    for (let i = 0; i < R.transparents.length; i++) R.transparents[i].draw(p); p.end();
  }
  { const p = apiPass(enc, D.taa[cur]); p.setPipeline(P.taa); p.setBindGroup(0, P.taaBG[prev]); p.draw(3); p.end(); }
  fsPass(enc, D.mbTile, P.mbTile, P.mbTileBG); fsPass(enc, D.mbNeigh, P.mbNeigh, P.mbNeighBG);
  fsPass(enc, D.mb, P.mb, P.mbBG[cur]);
  for (let i = 0; i < BLOOM_N; i++) fsPass(enc, D.blDown[i], i ? P.blDown : P.blFirst, P.blDownBG[i]);
  for (let i = 0; i < BLOOM_N - 1; i++) fsPass(enc, D.blUp[i], P.blUp, P.blUpBG[i]);
  fsPass(enc, D.expo[cur], P.expo, P.expoBG[prev]);
  D.final.colorAttachments[0].view = apiCanvasView();
  if (R.dbgBG) fsPass(enc, D.final, P.dbg, R.dbgBG); else fsPass(enc, D.final, P.final, P.finalBG[cur]);
}
R.decals = [];
