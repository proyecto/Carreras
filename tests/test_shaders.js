'use strict';
// ---- test_shaders.js
// Verificación integral de módulos y pipelines de shaders WGSL.
// Comprueba resolución de includes, preprocesador wgslPP y balance de llaves.

const fs = require('fs');
const vm = require('vm');

function runShaderTests() {
  console.log('\n--- [TEST SUITE] Validación de Shaders WGSL (shaders/) ---');
  let asserts = 0;
  const assert = (cond, msg) => {
    asserts++;
    if (!cond) throw new Error(`[FALLO ASSERT] ${msg}`);
  };

  const ctx = vm.createContext({
    window: {},
    location: { search: '' },
    navigator: { webdriver: false },
    URLSearchParams: class { get() { return null; } has() { return false; } },
    GPUBufferUsage: { VERTEX: 1, INDEX: 2, UNIFORM: 4, STORAGE: 8, COPY_DST: 16 },
    GPUTextureUsage: { RENDER_ATTACHMENT: 1, TEXTURE_BINDING: 2, COPY_DST: 4, STORAGE_BINDING: 8 },
    G: { dev: { createBindGroupLayout: o => o } }
  });

  const files = [
    'shaders/core.js', 'shaders/lighting.js', 'shaders/post.js', 'shaders/world.js', 'shaders/vegetation.js', 'shaders/glass.js',
    'engine/math.js', 'engine/gpu.js', 'engine/mesh.js', 'engine/renderer.js', 'engine/forward.js', 'world/track-glb.js'
  ];

  let code = '';
  for (const f of files) {
    let s = fs.readFileSync(f, 'utf8');
    if (f === 'shaders/core.js') s = s.replace('const WGSL = {};', 'var WGSL = {}; globalThis.WGSL = WGSL;');
    code += s + '\n;\n';
  }
  vm.runInContext(code, ctx);

  const pipelines = [
    { name: 'light', defs: { SSR: '' } },
    { name: 'half', defs: {} },
    { name: 'bilat (H)', defs: { DIR: '1,0' }, key: 'bilat' },
    { name: 'bilat (V)', defs: { DIR: '0,1' }, key: 'bilat' },
    { name: 'taa', defs: {} },
    { name: 'mbtile', defs: { TILE: 20 } },
    { name: 'mbneigh', defs: { NEIGH: '', TILE: 20 }, key: 'mbtile' },
    { name: 'mblur', defs: { TILE: 20 } },
    { name: 'bloom_first', defs: { FIRST: '' }, key: 'bloom' },
    { name: 'bloom_down', defs: {}, key: 'bloom' },
    { name: 'expo', defs: {} },
    { name: 'final', defs: {} },
    { name: 'cubesky', defs: {} },
    { name: 'envblur', defs: {} },
    { name: 'dbg', defs: {} },
    { name: '__fwd_glassMul', defs: { GLASS_MUL: '', PASS_FWD: '' }, setup: () => { ctx.WGSL['__fwd_glassMul'] = '#include common\n#include gbuf\n#include glass\n#include entry_fwd\n'; } },
    { name: '__fwd_glassAdd', defs: { GLASS_ADD: '', PASS_FWD: '' }, setup: () => { ctx.WGSL['__fwd_glassAdd'] = '#include common\n#include gbuf\n#include glass\n#include entry_fwd\n'; } },
    { name: '__fam_glb_track (GBUF)', defs: { PASS_GBUF: '' }, key: '__fam_glb_track', setup: () => { ctx.WGSL['__fam_glb_track'] = '#include common\n#include gbuf\n#include mat_glb_track\n#include entry\n'; } },
    { name: '__fam_glb_track (Shadow)', defs: { PASS_SHADOW: '' }, key: '__fam_glb_track', setup: () => { ctx.WGSL['__fam_glb_track'] = '#include common\n#include gbuf\n#include mat_glb_track\n#include entry\n'; } }
  ];

  for (const p of pipelines) {
    if (p.setup) p.setup();
    const key = p.key || p.name;
    const defs = Object.assign({}, ctx.SH_DEFS, p.defs);
    const wgsl = vm.runInContext(`wgslPP(${JSON.stringify(key)}, ${JSON.stringify(defs)})`, ctx);

    assert(typeof wgsl === 'string' && wgsl.length > 50, `Pipeline ${p.name} generó código WGSL válido`);

    // Comprobar balance de llaves
    let braces = 0;
    for (const c of wgsl) {
      if (c === '{') braces++;
      if (c === '}') braces--;
    }
    assert(braces === 0, `Pipeline ${p.name} tiene llaves balanceadas ({}) [balance=${braces}]`);

    // Comprobar que no hay restos de etiquetas #include sin procesar
    assert(!wgsl.includes('#include'), `Pipeline ${p.name} resolvió todos los #include`);
    assert(!wgsl.includes('#ifdef'), `Pipeline ${p.name} resolvió todos los bloques condicionales`);

    console.log(`  ✓ Pipeline ${p.name.padEnd(20)} [${wgsl.split('\n').length} líneas | braces OK]`);
  }

  console.log(`Resultado Shaders: ${asserts} aserciones correctas, 0 fallos.`);
  return { asserts, passed: true };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runShaderTests };
}

if (require.main === module) {
  try {
    runShaderTests();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
