'use strict';
// ---- 20_renderer.js
// Núcleo do renderizador diferido: recursos, uniformes de quadro, famílias de material e o grafo de passes.
const SHADOW_RES = 2048, SHADOW_S_RES = 4096, ENV_RES = 512, ENV_MIPS = 7, SKY_W = 4096, SKY_H = 1024, VOL_DIST = 220;
const SKY_EL0 = -0.14, SKY_ELR = PI / 2 + 0.14;
const SH_DEFS = { SHADOW_RES: SHADOW_RES + '.0', ENV_MIPS: ENV_MIPS + '.0', ENV_MIP_K: (ENV_RES * 2 / (PI * 1.5)).toFixed(2), VOL_DIST: VOL_DIST + '.0', SKY_EL0: SKY_EL0.toFixed(5), SKY_ELR: SKY_ELR.toFixed(5) };
const KIND = { GBUF: 0, SHADOW: 1, CUBE: 2 };

// ---- struct Frame: lista de campos gera o WGSL e os deslocamentos ----
const FRAME_FIELDS = [
  ['viewProj', 'm'], ['viewProjJ', 'm'], ['prevViewProj', 'm'], ['invViewProjJ', 'm'], ['view', 'm'], ['invView', 'm'], ['projJ', 'm'], ['invProjJ', 'm'],
  ['shadowVP', 'm4'], ['carInv', 'm'], ['carMat', 'm'],
  ['camPos', 'v'], ['camFwd', 'v'], ['sunDir', 'v'], ['sunCol', 'v'], ['screen', 'v'], ['jitter', 'v'], ['misc', 'v'], ['wind', 'v'],
  ['fog', 'v'], ['fogCol', 'v'], ['shadowP', 'v'], ['shadowSplit', 'v'], ['car', 'v'], ['car2', 'v'], ['post', 'v'], ['wm', 'v'], ['sunScr', 'v'], ['sh', 'v9'],
];
const FR = { o: {}, data: null, size: 0 };
(function () {
  let off = 0, w = 'struct Frame {\n';
  for (const [n, t] of FRAME_FIELDS) {
    FR.o[n] = off;
    if (t === 'm') { w += `  ${n}: mat4x4f,\n`; off += 16; } else if (t === 'm4') { w += `  ${n}: array<mat4x4f, 4>,\n`; off += 64; }
    else if (t === 'v') { w += `  ${n}: vec4f,\n`; off += 4; } else if (t === 'v9') { w += `  ${n}: array<vec4f, 9>,\n`; off += 36; }
  }
  WGSL.frame = w + '}\n'; FR.size = off * 4; FR.data = new Float32Array(off);
})();
const frSet4 = (n, a, b, c, d) => { const o = FR.o[n], f = FR.data; f[o] = a; f[o + 1] = b; f[o + 2] = c; f[o + 3] = d; };
const frMat = (n, m, idx) => FR.data.set(m, FR.o[n] + (idx || 0) * 16);

// ---- reflexão de bind groups a partir do WGSL (layouts explícitos; bindings não usados não quebram) ----
const _bglCache = {};
function reflectBGLs(code) {
  const groups = [];
  const re = /@group\((\d+)\)\s*@binding\((\d+)\)\s*var(<uniform>)?\s+(\w+)\s*:\s*([\w<>, ]+);(.*)/g; let m;
  while ((m = re.exec(code))) {
    const g = +m[1], b = +m[2], ty = m[5].trim(), e = { binding: b, visibility: 3 };
    if (m[3]) e.buffer = { type: 'uniform', hasDynamicOffset: /@dyn/.test(m[6]) };
    else if (ty === 'sampler') e.sampler = { type: 'filtering' };
    else if (ty === 'sampler_comparison') e.sampler = { type: 'comparison' };
    else {
      const t = {}; e.texture = t;
      t.sampleType = ty.includes('depth') ? 'depth' : ty.includes('<u32>') ? 'uint' : 'float';
      t.viewDimension = ty.includes('cube') ? 'cube' : ty.includes('_3d') ? '3d' : ty.includes('2d_array') ? '2d-array' : '2d';
    }
    (groups[g] = groups[g] || []).push(e);
  }
  const out = [];
  for (let g = 0; g < groups.length; g++) { const en = groups[g] || []; en.sort((a, b) => a.binding - b.binding); const key = JSON.stringify(en); out.push(_bglCache[key] || (_bglCache[key] = G.dev.createBindGroupLayout({ entries: en }))); }
  return out;
}
// pipeline de tela cheia com layout refletido
function mkPost(name, defs, targets, extra) {
  defs = Object.assign({}, SH_DEFS, defs || {});
  const code = wgslPP(name, defs), mod = mkShader(name, defs), bgls = reflectBGLs(code);
  const pipe = G.dev.createRenderPipeline(Object.assign({
    label: name, layout: G.dev.createPipelineLayout({ bindGroupLayouts: bgls }),
    vertex: { module: mod, entryPoint: 'vs' },
    fragment: { module: mod, entryPoint: 'fs', targets: targets.map(t => typeof t === 'string' ? { format: t } : t) },
  }, extra || {}));
  pipe.bgls = bgls; return pipe;
}
const bgOf = (pipe, g, res) => G.dev.createBindGroup({ layout: pipe.bgls[g], entries: res.map((r, i) => ({ binding: i, resource: r instanceof GPUBuffer ? { buffer: r } : r })) });

const R = {
  drawables: [], transparents: [], families: {}, frameIdx: 0, ready: false,
  objData: new Float32Array(64 * 64), objCount: 1, passData: new Float32Array(16 * 64),
  ctx: { kind: 0, planes: new Float32Array(24), nPlanes: 4, cx: 0, cy: 0, cz: 0, cascade: 0, lod: 1 },
  dyn1: new Uint32Array(1), dyn2: new Uint32Array(1),
  cam: { view: m4(), proj: m4(), projJ: m4(), vp: m4(), vpJ: m4(), prevVp: m4(), inv: m4(), tmp: m4(), pos: new Float32Array(3), fwd: new Float32Array(3), fovy: 1, near: 0.1, first: true },
  sun: new Float32Array([-0.83, 0.26, -0.5]), sunCol: new Float32Array([1, 0.7, 0.4]),
  casc: { vp: [m4(), m4(), m4(), m4()], splits: [12, 40, 130], texel: new Float32Array(4), view: m4(), tmp: m4(), focusOn: false, focus: new Float32Array(3) },
  cube: { pos: new Float32Array(3), cur: new Float32Array(3), face: 0, vp: m4(), view: m4(), proj: m4() },
  wind: new Float32Array([0.8, 0.6, 1.0]),   // direção (x,z) e força do vento; F.wind.w = tempo, F.misc.x = dt
  fog: new Float32Array([0.0008, 1 / 55, 0, 0.05]), fogCol: new Float32Array([0, 0, 0, 1.0]),
  exposure: 1, debug: 0, noJitter: false, timing: null, pending: [],
};

// Slots de uniforme de objeto (256 bytes cada: model, prevModel, 4 vec4 de parâmetros). Slot 0 = identidade.
// As vistas são criadas uma vez por slot: objModel/objPrev/objParams não alocam.
const _objViews = [];
function _objMk(i) { _objViews[i] = [R.objData.subarray(i * 64, i * 64 + 16), R.objData.subarray(i * 64 + 16, i * 64 + 32), R.objData.subarray(i * 64 + 32, i * 64 + 48)]; m4ident(_objViews[i][0]); m4ident(_objViews[i][1]); }
_objMk(0);
function objSlot() { const i = R.objCount++; if (i >= 64) throw new Error('slots de objeto esgotados'); _objMk(i); return i; }
const objModel = i => _objViews[i][0];
const objPrev = i => _objViews[i][1];
const objParams = i => _objViews[i][2];

// ---- famílias de material ----
// def: { src: nome do wgsl (define VIn, vert(), surf() e opcionalmente surfAlpha()), buffers: [layouts de vértice], alpha, cull, defs, noCube, noShadow, topology }
function mkFamily(name, def) {
  const fam = { name, def, pipe: [null, null, null], bgl3: null };
  const kinds = [['PASS_GBUF', 0], ['PASS_SHADOW', 1], ['PASS_CUBE', 2]];
  for (const [kdef, k] of kinds) {
    if ((k === 1 && def.noShadow) || (k === 2 && def.noCube)) continue;
    const defs = Object.assign({}, SH_DEFS, def.defs || {}); defs[kdef] = ''; if (def.alpha) defs.ALPHA = '';
    WGSL['__fam_' + name] = `#include common\n#include gbuf\n#include ${def.src}\n#include entry\n`;
    const code = wgslPP('__fam_' + name, defs), mod = mkShader('__fam_' + name, defs), bgls = reflectBGLs(code);
    bgls[0] = R.bgl0; bgls[2] = R.bgl2;
    if (bgls[3]) fam.bgl3 = bgls[3];
    const d = {
      label: name + kdef, layout: G.dev.createPipelineLayout({ bindGroupLayouts: bgls }),
      vertex: { module: mod, entryPoint: 'vs', buffers: def.buffers || [VLAYOUT] },
      primitive: { topology: def.topology || 'triangle-list', cullMode: def.cull || 'back', frontFace: 'ccw' },
    };
    if (k === 0) {
      d.fragment = { module: mod, entryPoint: 'fs', targets: [{ format: 'rgba8unorm-srgb' }, { format: 'rgba16float' }, { format: 'rgba8unorm' }, { format: 'rg16float' }] };
      d.depthStencil = { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'greater' };
    } else if (k === 1) {
      if (def.alpha) d.fragment = { module: mod, entryPoint: 'fs', targets: [] };
      d.depthStencil = { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less', depthBias: def.shadowBias === undefined ? 2 : def.shadowBias, depthBiasSlopeScale: def.shadowSlope === undefined ? 2.0 : def.shadowSlope };
      d.primitive.cullMode = def.shadowCull || def.cull || 'back';
      if (G.dev.features.has('depth-clip-control')) d.primitive.unclippedDepth = true;
    } else {
      d.fragment = { module: mod, entryPoint: 'fs', targets: [{ format: 'rgba16float' }] };
      d.depthStencil = { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' };
      d.primitive.frontFace = 'cw';   // faces do cubo são renderizadas espelhadas em Y
    }
    R.pending.push(G.dev.createRenderPipelineAsync(d).then(p => { fam.pipe[k] = p; }));
  }
  R.families[name] = fam; return fam;
}
// Conjunto de malhas estáticas/dinâmicas de uma família com vértice padrão. item: {mesh, slot, flags}
// flags: 1 = principal, 2 = sombra, 4 = cubo. maxDist: distância máxima (sombra/cubo usam 0.6x)
class MeshSet {
  constructor(fam) { this.fam = fam; this.items = []; }
  add(mesh, slot, flags, maxDist) {
    const b = mesh.bounds; const it = { vb: mesh.vb, ib: mesh.ib, count: mesh.count, slot: slot || 0, flags: flags === undefined ? 7 : flags, cx: b.c[0], cy: b.c[1], cz: b.c[2], r: b.r, maxDist: maxDist || 1e9, wc: new Float32Array(3), on: true };
    this.items.push(it); return it;
  }
  draw(pass, ctx) {
    const pipe = this.fam.pipe[ctx.kind]; if (!pipe) return;
    const bit = 1 << ctx.kind; let set = false;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i]; if (!(it.flags & bit) || !it.on) continue;
      const m = R.objData, o = it.slot * 64;
      const x = m[o] * it.cx + m[o + 4] * it.cy + m[o + 8] * it.cz + m[o + 12], y = m[o + 1] * it.cx + m[o + 5] * it.cy + m[o + 9] * it.cz + m[o + 13], z = m[o + 2] * it.cx + m[o + 6] * it.cy + m[o + 10] * it.cz + m[o + 14];
      const pl = ctx.planes, np = ctx.nPlanes, rr = it.r; let vis = true;   // teste esfera × planos embutido (sem números em argumentos)
      for (let k = 0; k < np; k++) if (pl[k * 4] * x + pl[k * 4 + 1] * y + pl[k * 4 + 2] * z + pl[k * 4 + 3] < -rr) { vis = false; break; }
      if (!vis) continue;
      const dx = x - ctx.cx, dy = y - ctx.cy, dz = z - ctx.cz, md = it.maxDist + it.r; if (dx * dx + dy * dy + dz * dz > md * md) continue;
      if (!set) { pass.setPipeline(pipe); set = true; }
      R.dyn2[0] = it.slot * 256; pass.setBindGroup(2, R.objBG, R.dyn2, 0, 1);
      pass.setVertexBuffer(0, it.vb); pass.setIndexBuffer(it.ib, 'uint32'); pass.drawIndexed(it.count);
    }
  }
}

function rendererInit() {
  const dev = G.dev, W = G.W, H = G.H, hw = W >> 1, hh = H >> 1;
  R.sLin = dev.createSampler({ minFilter: 'linear', magFilter: 'linear', mipmapFilter: 'linear', addressModeU: 'repeat', addressModeV: 'repeat', addressModeW: 'repeat', maxAnisotropy: 8 });
  R.sClamp = dev.createSampler({ minFilter: 'linear', magFilter: 'linear', mipmapFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
  R.sSky = dev.createSampler({ minFilter: 'linear', magFilter: 'linear', addressModeU: 'repeat', addressModeV: 'clamp-to-edge' });
  R.sCmp = dev.createSampler({ compare: 'less-equal', minFilter: 'linear', magFilter: 'linear' });
  R.sNear = dev.createSampler({});
  R.frameBuf = mkBuf(FR.size, BU.U); R.objBuf = mkBuf(64 * 256, BU.U); R.passBuf = mkBuf(16 * 256, BU.U);
  // alvos
  const T = R.tex = {};
  T.gA = mkTex(W, H, 'rgba8unorm-srgb'); T.gB = mkTex(W, H, 'rgba16float'); T.gC = mkTex(W, H, 'rgba8unorm'); T.gV = mkTex(W, H, 'rg16float'); T.depth = mkTex(W, H, 'depth32float');
  T.hdr = mkTex(W, H, 'rgba16float'); T.hist = [mkTex(W, H, 'rgba16float'), mkTex(W, H, 'rgba16float')]; T.vel = mkTex(W, H, 'rg16float');
  T.mb = mkTex(W, H, 'rgba16float');
  T.half = [mkTex(hw, hh, 'rgba16float'), mkTex(hw, hh, 'rgba16float'), mkTex(hw, hh, 'rgba16float')];
  T.shadow = dev.createTexture({ size: [SHADOW_RES, SHADOW_RES, 3], format: 'depth32float', usage: TU.RT | TU.TB });
  T.shadowS = mkTex(SHADOW_S_RES, SHADOW_S_RES, 'depth32float');
  T.env = dev.createTexture({ size: [ENV_RES, ENV_RES, 6], format: 'rgba16float', usage: TU.RT | TU.TB | TU.CS, mipLevelCount: ENV_MIPS + 1 });
  T.envDepth = mkTex(ENV_RES, ENV_RES, 'depth32float');
  T.sky = mkTex(SKY_W, SKY_H, 'rgba16float');
  T.noise = mkTex(512, 512, 'rgba8unorm', TU.RT | TU.TB, { mipLevelCount: 10 });
  T.noise3 = dev.createTexture({ size: [64, 64, 64], dimension: '3d', format: 'rgba8unorm', usage: TU.RT | TU.TB });
  const V = R.view = {};
  for (const k of ['gA', 'gB', 'gC', 'gV', 'depth', 'hdr', 'vel', 'mb', 'shadowS', 'sky', 'noise', 'envDepth']) V[k] = T[k].createView();
  V.hist = T.hist.map(t => t.createView()); V.half = T.half.map(t => t.createView());
  V.shadow = T.shadow.createView({ dimension: '2d-array' }); V.shadowL = [0, 1, 2].map(i => T.shadow.createView({ dimension: '2d', baseArrayLayer: i, arrayLayerCount: 1 }));
  V.env = T.env.createView({ dimension: 'cube' }); V.noise3 = T.noise3.createView({ dimension: '3d' });
  V.envFace = []; for (let f = 0; f < 6; f++) { V.envFace[f] = []; for (let m = 0; m <= ENV_MIPS; m++) V.envFace[f][m] = T.env.createView({ dimension: '2d', baseArrayLayer: f, arrayLayerCount: 1, baseMipLevel: m, mipLevelCount: 1 }); }
  V.envMip = []; for (let m = 0; m <= ENV_MIPS; m++) V.envMip[m] = T.env.createView({ dimension: 'cube', baseMipLevel: m, mipLevelCount: 1 });
  // bind groups globais das famílias (layouts explícitos equivalentes aos refletidos)
  const famCode = wgslPP('__probe', SH_DEFS), bg = reflectBGLs(famCode);
  R.bgl0 = bg[0]; R.bgl1 = bg[1]; R.bgl2 = bg[2];
  R.globBG = dev.createBindGroup({ layout: bg[0], entries: [{ binding: 0, resource: { buffer: R.frameBuf } }, { binding: 1, resource: R.sLin }, { binding: 2, resource: R.sClamp }, { binding: 3, resource: V.noise }, { binding: 4, resource: V.noise3 }, { binding: 5, resource: WM.height.createView() }, { binding: 6, resource: WM.zone.createView() }] });
  R.passBG = dev.createBindGroup({ layout: bg[1], entries: [{ binding: 0, resource: { buffer: R.passBuf, size: 96 } }] });
  R.objBG = dev.createBindGroup({ layout: bg[2], entries: [{ binding: 0, resource: { buffer: R.objBuf, size: 192 } }] });
  const cubeCode = wgslPP('__probe', Object.assign({ PASS_CUBE: '' }, SH_DEFS)), cbg = reflectBGLs(cubeCode);
  R.passBGCube = dev.createBindGroup({ layout: cbg[1], entries: [{ binding: 0, resource: { buffer: R.passBuf, size: 96 } }, { binding: 1, resource: V.shadowS }, { binding: 2, resource: R.sCmp }] });
  // descritores de passe
  const D = R.pd = {};
  D.gbuf = mkPassDesc(4, 'clear', true, 'gbuf'); D.gbuf.colorAttachments[0].view = V.gA; D.gbuf.colorAttachments[1].view = V.gB; D.gbuf.colorAttachments[2].view = V.gC; D.gbuf.colorAttachments[3].view = V.gV; D.gbuf.depthStencilAttachment.view = V.depth;
  D.shadow = [0, 1, 2].map(i => { const d = mkPassDesc(0, 'clear1', true, 'shadow' + i); d.depthStencilAttachment.view = V.shadowL[i]; return d; });
  D.shadowS = mkPassDesc(0, 'clear1', true, 'shadowS'); D.shadowS.depthStencilAttachment.view = V.shadowS;
  D.cube = [0, 1, 2, 3, 4, 5].map(f => { const d = mkPassDesc(1, 'clear1', true, 'cube' + f); d.colorAttachments[0].view = V.envFace[f][0]; d.depthStencilAttachment.view = V.envDepth; return d; });
  D.light = mkPassDesc(1, null, false, 'light'); D.light.colorAttachments[0].view = V.hdr;
  D.trans = mkPassDesc(1, 'ro', false, 'trans'); D.trans.colorAttachments[0].view = V.hdr; D.trans.depthStencilAttachment.view = V.depth;
  D.decal = mkPassDesc(3, 'ro', false, 'decal'); D.decal.colorAttachments[0].view = V.gA; D.decal.colorAttachments[1].view = V.gB; D.decal.colorAttachments[2].view = V.gC; D.decal.depthStencilAttachment.view = V.depth;
  postInit();
  R.submitArr = [null];
}
WGSL.__probe = '#include common\n#include gbuf\n#include mesh_vert\n#ifdef PASS_CUBE\n#include cube_light\n#endif\n';

// ---- câmera e uniformes do quadro ----
// CAMQ: registrador da câmera [olho xyz, alvo xyz, fov vertical, rolagem]. setCameraQ() lê dele (sem números por argumento).
const CAMQ = new Float64Array(8), _lk = new Float64Array(9);
function setCamera(ex, ey, ez, tx, ty, tz, fovy, roll) { CAMQ[0] = ex; CAMQ[1] = ey; CAMQ[2] = ez; CAMQ[3] = tx; CAMQ[4] = ty; CAMQ[5] = tz; CAMQ[6] = fovy; CAMQ[7] = roll || 0; setCameraQ(); }
function setCameraQ() {
  const c = R.cam, q = CAMQ, v = _lk, roll = q[7];
  let fx = q[3] - q[0], fy = q[4] - q[1], fz = q[5] - q[2]; const l = 1 / Math.sqrt(fx * fx + fy * fy + fz * fz); fx *= l; fy *= l; fz *= l;
  v[0] = q[0]; v[1] = q[1]; v[2] = q[2]; v[3] = q[3]; v[4] = q[4]; v[5] = q[5]; v[6] = 0; v[7] = 1; v[8] = 0;
  if (roll !== 0) { // inclina o "para cima" em torno do eixo de visada
    let rx = -fz, rz = fx; const rl = 1 / Math.sqrt(rx * rx + rz * rz); rx *= rl; rz *= rl;
    const cr = Math.cos(roll), sr = Math.sin(roll); v[6] = rx * sr; v[7] = cr; v[8] = rz * sr;
  }
  m4lookAtV(c.view, v);
  c.pos[0] = q[0]; c.pos[1] = q[1]; c.pos[2] = q[2]; c.fovy = q[6]; c.fwd[0] = fx; c.fwd[1] = fy; c.fwd[2] = fz;
}
const JIT = new Float32Array(16); for (let i = 0; i < 8; i++) { JIT[i * 2] = halton(i + 1, 2) - 0.5; JIT[i * 2 + 1] = halton(i + 1, 3) - 0.5; }
const FO = FR.o;
function frameUniforms() {
  const c = R.cam, W = G.W, H = G.H, f = FR.data, o = FO;
  c.prevVp.set(c.vp);
  // projeção com Z invertido e far infinito
  const p = c.proj, fl = 1 / Math.tan(c.fovy / 2); p.fill(0); p[0] = fl * H / W; p[5] = fl; p[11] = -1; p[14] = c.near;
  m4mul(c.vp, p, c.view);
  if (c.first) { c.prevVp.set(c.vp); c.first = false; }
  const ji = (R.frameIdx % 8) * 2, js = R.noJitter ? 0 : 1, jx = JIT[ji] * js, jy = JIT[ji + 1] * js;
  f[o.jitter + 2] = f[o.jitter]; f[o.jitter + 3] = f[o.jitter + 1]; f[o.jitter] = jx * 2 / W; f[o.jitter + 1] = jy * 2 / H;
  c.projJ.set(p); c.projJ[8] = -jx * 2 / W; c.projJ[9] = -jy * 2 / H;
  m4mul(c.vpJ, c.projJ, c.view);
  f.set(c.vp, o.viewProj); f.set(c.vpJ, o.viewProjJ); f.set(c.prevVp, o.prevViewProj);
  m4inv(c.inv, c.vpJ); f.set(c.inv, o.invViewProjJ);
  f.set(c.view, o.view); m4inv(c.tmp, c.view); f.set(c.tmp, o.invView); f.set(c.projJ, o.projJ); m4inv(c.tmp, c.projJ); f.set(c.tmp, o.invProjJ);
  let k = o.camPos; f[k] = c.pos[0]; f[k + 1] = c.pos[1]; f[k + 2] = c.pos[2]; f[k + 3] = RT[0];
  k = o.camFwd; f[k] = c.fwd[0]; f[k + 1] = c.fwd[1]; f[k + 2] = c.fwd[2]; f[k + 3] = c.near;
  k = o.sunDir; f[k] = R.sun[0]; f[k + 1] = R.sun[1]; f[k + 2] = R.sun[2]; f[k + 3] = 0;
  k = o.sunCol; f[k] = R.sunCol[0]; f[k + 1] = R.sunCol[1]; f[k + 2] = R.sunCol[2]; f[k + 3] = 1;
  k = o.screen; f[k] = W; f[k + 1] = H; f[k + 2] = 1 / W; f[k + 3] = 1 / H;
  k = o.misc; f[k] = RT[1]; f[k + 1] = R.frameIdx % 64; f[k + 2] = R.exposure; f[k + 3] = R.debug;
  k = o.shadowP; f[k] = R.casc.texel[0]; f[k + 1] = R.casc.texel[1]; f[k + 2] = R.casc.texel[2]; f[k + 3] = R.casc.texel[3];
  k = o.shadowSplit; f[k] = R.casc.splits[0]; f[k + 1] = R.casc.splits[1]; f[k + 2] = R.casc.splits[2]; f[k + 3] = 0;
  k = o.fog; f[k] = R.fog[0]; f[k + 1] = R.fog[1]; f[k + 2] = R.fog[2]; f[k + 3] = R.fog[3];
  k = o.fogCol; f[k] = R.fogCol[0]; f[k + 1] = R.fogCol[1]; f[k + 2] = R.fogCol[2]; f[k + 3] = R.fogCol[3];
  k = o.wind; f[k] = R.wind[0]; f[k + 1] = R.wind[1]; f[k + 2] = R.wind[2]; f[k + 3] = RT[0];
  k = o.wm; f[k] = WM.x0; f[k + 1] = WM.z0; f[k + 2] = WM.sx; f[k + 3] = WM.sz;
  // posição do sol na tela (uv) para o brilho de lente; z = 1 se está à frente da câmera
  { const m = c.vp, sx = R.sun[0], sy = R.sun[1], sz = R.sun[2], cw = m[3] * sx + m[7] * sy + m[11] * sz;
    k = o.sunScr; if (cw > 1e-4) { f[k] = (m[0] * sx + m[4] * sy + m[8] * sz) / cw * 0.5 + 0.5; f[k + 1] = 0.5 - (m[1] * sx + m[5] * sy + m[9] * sz) / cw * 0.5; f[k + 2] = 1; } else { f[k] = -5; f[k + 1] = -5; f[k + 2] = 0; } f[k + 3] = 0; }
  const dtc = RT[1] > 1e-4 ? RT[1] : 1e-4;
  k = o.post; f[k] = (1 / 120) / dtc; f[k + 1] = Math.tan(c.fovy / 2); f[k + 2] = W / H; f[k + 3] = 0;
}
// ---- cascatas de sombra (estáveis: esfera envolvente + encaixe em texel) ----
const _cs = new Float32Array(3), _sv = new Float64Array(9);
function lightView(o) { const v = _sv; v[0] = R.sun[0]; v[1] = R.sun[1]; v[2] = R.sun[2]; v[3] = 0; v[4] = 0; v[5] = 0; v[6] = 0; v[7] = 1; v[8] = 0; m4lookAtV(o, v); }
function orthoInto(o, l, r, b, t, n, f) { o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = 1 / (n - f); o[12] = (l + r) / (l - r); o[13] = (t + b) / (b - t); o[14] = n / (n - f); o[15] = 1; }
function cascadeSetup(i) {
  const c = R.cam, cs = R.casc, n = i === 0 ? c.near : cs.splits[i - 1], fa = cs.splits[i];
  if (cs.focusOn) { cascadeFocus(i); return; }
  const th = Math.tan(c.fovy / 2), tw = th * G.W / G.H;
  // esfera envolvente do tronco [n, fa]
  const k2 = 1 + th * th + tw * tw; let cd = 0.5 * (fa + n) * k2; let rad;
  if (cd > fa) { cd = fa; rad = fa * Math.sqrt(th * th + tw * tw); } else { const a = fa - cd, b = fa * Math.sqrt(th * th + tw * tw); rad = Math.sqrt(a * a + b * b); }
  rad = ((rad * 16 + 0.999999) | 0) / 16;
  const px = c.pos[0] + c.fwd[0] * cd, py = c.pos[1] + c.fwd[1] * cd, pz = c.pos[2] + c.fwd[2] * cd;
  lightView(cs.view);
  // centro em espaço de luz, encaixado na grade de texels
  const m = cs.view; let lx = m[0] * px + m[4] * py + m[8] * pz + m[12], ly = m[1] * px + m[5] * py + m[9] * pz + m[13]; const lz = m[2] * px + m[6] * py + m[10] * pz + m[14];
  const tex = 2 * rad / SHADOW_RES; const qx = lx / tex, qy = ly / tex; lx = (qx >= 0 ? (qx + 0.5) | 0 : -((0.5 - qx) | 0)) * tex; ly = (qy >= 0 ? (qy + 0.5) | 0 : -((0.5 - qy) | 0)) * tex;
  const o = cs.tmp, l = lx - rad, r = lx + rad, b = ly - rad, t = ly + rad, nn = -lz - 105, ff = -lz + rad + 30;   // lançadores até 105 m na direção do sol (árvore de 28 m com sol a 17° projeta ~90 m)
  o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = 1 / (nn - ff); o[12] = (l + r) / (l - r); o[13] = (t + b) / (b - t); o[14] = nn / (nn - ff); o[15] = 1;
  m4mul(cs.vp[i], o, cs.view); cs.texel[i] = tex;
  FR.data.set(cs.vp[i], FO.shadowVP + i * 16);
}
// Modo foco (câmera de TV com lente longa): as cascatas viram esferas concêntricas em volta do alvo (o carro), para a sombra
// ter resolução onde a lente está olhando, a qualquer distância da câmera.
const FOCUS_R = [9, 30, 105];
function cascadeFocus(i) {
  const cs = R.casc, rad = FOCUS_R[i], px = cs.focus[0], py = cs.focus[1], pz = cs.focus[2];
  lightView(cs.view);
  const m = cs.view; let lx = m[0] * px + m[4] * py + m[8] * pz + m[12], ly = m[1] * px + m[5] * py + m[9] * pz + m[13]; const lz = m[2] * px + m[6] * py + m[10] * pz + m[14];
  const tex = 2 * rad / SHADOW_RES; const qx = lx / tex, qy = ly / tex; lx = (qx >= 0 ? (qx + 0.5) | 0 : -((0.5 - qx) | 0)) * tex; ly = (qy >= 0 ? (qy + 0.5) | 0 : -((0.5 - qy) | 0)) * tex;
  const o = cs.tmp, l = lx - rad, r = lx + rad, b = ly - rad, t = ly + rad, nn = -lz - 105, ff = -lz + rad + 30;
  o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = 1 / (nn - ff); o[12] = (l + r) / (l - r); o[13] = (t + b) / (b - t); o[14] = nn / (nn - ff); o[15] = 1;
  m4mul(cs.vp[i], o, cs.view); cs.texel[i] = tex;
  FR.data.set(cs.vp[i], FO.shadowVP + i * 16);
}
function staticShadowSetup() {
  const cs = R.casc, rad = 1250;
  lightView(cs.view);
  m4point(_cs, 0, cs.view, TRK.cx, 20, TRK.cz);
  orthoInto(cs.tmp, _cs[0] - rad, _cs[0] + rad, _cs[1] - rad * 0.62, _cs[1] + rad * 0.62, -_cs[2] - 2600, -_cs[2] + 2600);
  m4mul(cs.vp[3], cs.tmp, cs.view); cs.texel[3] = 2 * rad / SHADOW_S_RES;
  frMat('shadowVP', cs.vp[3], 3);
}
function setPass(slot, vp, pos) { const p = R.passData, o = slot * 64; p.set(vp, o); p[o + 16] = pos[0]; p[o + 17] = pos[1]; p[o + 18] = pos[2]; p[o + 19] = slot; }
function ctxFrom(kind, vp, nPlanes, pos, cascade) { const c = R.ctx; c.kind = kind; frustumPlanes(c.planes, vp, nPlanes); c.nPlanes = nPlanes; c.cx = pos[0]; c.cy = pos[1]; c.cz = pos[2]; c.cascade = cascade; return c; }
function drawAll(pass, ctx, slot, bg1) { drawRange(pass, ctx, slot, bg1, 0, R.drawables.length); }
function drawRange(pass, ctx, slot, bg1, i0, i1) {
  pass.setBindGroup(0, R.globBG); R.dyn1[0] = slot * 256; pass.setBindGroup(1, bg1, R.dyn1, 0, 1); R.dyn2[0] = 0; pass.setBindGroup(2, R.objBG, R.dyn2, 0, 1);
  const d = R.drawables; for (let i = i0; i < i1; i++) d[i].draw(pass, ctx);
}
// faces do cubemap: direções (alvo, cima) na convenção WebGPU/D3D
const CUBE_DIRS = new Float32Array([1, 0, 0, 0, -1, 0, -1, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 1, 0, -1, 0, 0, 0, -1, 0, 0, 1, 0, -1, 0, 0, 0, -1, 0, -1, 0]);
function cubeSetup(f) {
  const c = R.cube, d = CUBE_DIRS, v = _sv, x = c.cur[0], y = c.cur[1], z = c.cur[2], o = f * 6;
  v[0] = x; v[1] = y; v[2] = z; v[3] = x + d[o]; v[4] = y + d[o + 1]; v[5] = z + d[o + 2]; v[6] = d[o + 3]; v[7] = d[o + 4]; v[8] = d[o + 5];
  m4lookAtV(c.view, v);
  // perspectiva 90°, near 0.3, far 4000, espelhada em Y
  const p = c.proj, n = 0.3, fa = 4000; p.fill(0); p[0] = 1; p[5] = -1; p[10] = fa / (n - fa); p[11] = -1; p[14] = n * fa / (n - fa);
  m4mul(c.vp, p, c.view);
}

// ---- quadro ----
// Os únicos objetos criados por quadro são os que a API WebGPU obriga a criar (codificador, passes, buffer de comandos,
// textura/vista do canvas); ficam isolados nestas quatro funções para a medição de alocação poder separá-los.
function apiEncoder() { return G.dev.createCommandEncoder(); }
function apiPass(enc, desc) { return enc.beginRenderPass(desc); }
function apiFinish(enc) { return enc.finish(); }
function apiCanvasView() { return G.ctx.getCurrentTexture().createView(); }
function renderFrame() {
  const dev = G.dev, c = R.cam, D = R.pd;
  frameUniforms();
  for (let i = 0; i < 3; i++) cascadeSetup(i);
  setPass(0, c.vpJ, c.pos);
  for (let i = 0; i < 3; i++) setPass(1 + i, R.casc.vp[i], c.pos);
  // uma face do cubemap de ambiente por quadro (ciclo completo a cada 6 quadros)
  // duas faces do cubemap de ambiente por quadro, cada uma na posição atual do carro (ciclo completo a cada 3 quadros)
  const face = (R.frameIdx * 2) % 6; R.cube.cur.set(R.cube.pos);
  for (let k = 0; k < 2; k++) { cubeSetup(face + k); setPass(5 + face + k, R.cube.vp, R.cube.cur); m4inv(R.cube.view, R.cube.vp); R.passData.set(R.cube.view, (11 + k) * 64); }
  dev.queue.writeBuffer(R.frameBuf, 0, FR.data);
  dev.queue.writeBuffer(R.passBuf, 0, R.passData, 0, 13 * 64);
  dev.queue.writeBuffer(R.objBuf, 0, R.objData, 0, R.objCount * 64);
  for (let i = 0; i < R.preFrame.length; i++) R.preFrame[i]();
  const enc = apiEncoder();
  // sombras
  for (let i = 0; i < 3; i++) {
    const p = apiPass(enc, D.shadow[i]);
    drawAll(p, ctxFrom(KIND.SHADOW, R.casc.vp[i], 6, c.pos, i), 1 + i, R.passBG); p.end();
  }
  // faces do cubemap de ambiente
  for (let k = 0; k < 2; k++) {
    const f = face + k; cubeSetup(f);
    const p = apiPass(enc, D.cube[f]);
    cubeSky(p, 11 + k);
    drawAll(p, ctxFrom(KIND.CUBE, R.cube.vp, 6, R.cube.cur, 0), 5 + f, R.passBGCube); p.end();
    envMips(enc, f);
  }
  // G-buffer
  {
    const p = apiPass(enc, D.gbuf);
    drawAll(p, ctxFrom(KIND.GBUF, c.vpJ, 5, c.pos, 0), 0, R.passBG); p.end();
  }
  postFrame(enc);
  perfResolve(enc);
  R.submitArr[0] = apiFinish(enc); dev.queue.submit(R.submitArr);
  perfAfterSubmit();
  R.frameIdx++;
}
R.preFrame = [];
// renderiza o mapa de sombras estático do mundo (uma vez, depois que todas as malhas estáticas existem)
function renderStaticShadow() {
  const ctr = new Float32Array([TRK.cx, 0, TRK.cz]);
  staticShadowSetup(); setPass(4, R.casc.vp[3], ctr);
  G.dev.queue.writeBuffer(R.frameBuf, 0, FR.data); G.dev.queue.writeBuffer(R.passBuf, 0, R.passData, 0, 12 * 64);
  G.dev.queue.writeBuffer(R.objBuf, 0, R.objData, 0, R.objCount * 64);
  const enc = G.dev.createCommandEncoder(); const p = enc.beginRenderPass(R.pd.shadowS);
  drawAll(p, ctxFrom(KIND.SHADOW, R.casc.vp[3], 4, ctr, 3), 4, R.passBG); p.end();
  G.dev.queue.submit([enc.finish()]);
}
