'use strict';
// ---- 23_forward.js
// Famílias diretas (passe de transparentes sobre o HDR, profundidade só leitura): vidro, partículas.
// def: { src (define VIn, vert(), shade()), blend, defs, buffers, cull, topology }
function mkFwdFamily(name, def) {
  const fam = { name, def, pipe: null };
  const defs = Object.assign({}, SH_DEFS, def.defs || {}); defs.PASS_FWD = '';
  WGSL['__fwd_' + name] = `#include common\n#include gbuf\n#include ${def.src}\n#include entry_fwd\n`;
  const code = wgslPP('__fwd_' + name, defs), mod = mkShader('__fwd_' + name, defs), bgls = reflectBGLs(code);
  bgls[0] = R.bgl0; bgls[2] = R.bgl2; fam.bgls = bgls;
  R.pending.push(G.dev.createRenderPipelineAsync({
    label: name, layout: G.dev.createPipelineLayout({ bindGroupLayouts: bgls }),
    vertex: { module: mod, entryPoint: 'vs', buffers: def.buffers || [VLAYOUT] },
    fragment: { module: mod, entryPoint: 'fs', targets: [{ format: 'rgba16float', blend: def.blend }] },
    primitive: { topology: def.topology || 'triangle-list', cullMode: def.cull || 'none', frontFace: 'ccw' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: def.depthCompare || 'greater-equal' },
  }).then(p => { fam.pipe = p; }));
  return fam;
}
// bind group de iluminação (grupo 3) compartilhado pelas famílias diretas
function fwdBindGroup(fam) {
  const V = R.view;
  return G.dev.createBindGroup({ layout: fam.bgls[3], entries: [{ binding: 0, resource: V.env }, { binding: 1, resource: V.shadow }, { binding: 2, resource: V.shadowS }, { binding: 3, resource: R.sCmp }, { binding: 4, resource: V.depth }] });
}
// Conjunto de vidros: cada malha é desenhada duas vezes (multiplica, depois soma).
class GlassSet {
  constructor() {
    this.mul = mkFwdFamily('glassMul', { src: 'glass', defs: { GLASS_MUL: '' }, blend: { color: { srcFactor: 'dst', dstFactor: 'zero' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } });
    this.add = mkFwdFamily('glassAdd', { src: 'glass', defs: { GLASS_ADD: '' }, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } });
    this.items = []; this.bg = null;
  }
  add_(mesh, slot) { this.items.push({ vb: mesh.vb, ib: mesh.ib, count: mesh.count, slot: slot || 0 }); }
  draw(pass) {
    if (!this.mul.pipe || !this.add.pipe) return;
    if (!this.bg) this.bg = fwdBindGroup(this.mul);
    pass.setBindGroup(3, this.bg);
    for (let k = 0; k < 2; k++) {
      pass.setPipeline(k ? this.add.pipe : this.mul.pipe);
      for (let i = 0; i < this.items.length; i++) { const it = this.items[i]; R.dyn2[0] = it.slot * 256; pass.setBindGroup(2, R.objBG, R.dyn2, 0, 1); pass.setVertexBuffer(0, it.vb); pass.setIndexBuffer(it.ib, 'uint32'); pass.drawIndexed(it.count); }
    }
  }
}
