'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function runTracksTestSuite() {
  console.log('\n--- [TEST SUITE] Validación de Circuitos (tracks/) ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
    } else {
      failed++;
      console.error(`  ❌ FALLO: ${message}`);
    }
  }

  const root = path.resolve(__dirname, '..');
  const mathCode = fs.readFileSync(path.join(root, 'engine/math.js'), 'utf8');
  const regCode = fs.readFileSync(path.join(root, 'game/registry.js'), 'utf8');
  const manifest = fs.readFileSync(path.join(root, 'tracks/manifest.js'), 'utf8');

  const ctx = {
    window: {},
    document: { createElement: () => ({ getContext: () => ({}) }) },
    Float32Array,
    Uint32Array,
    Int32Array,
    Float64Array,
    Uint8Array,
    Math,
    WGSL: {},
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary')
  };
  vm.createContext(ctx);
  vm.runInContext(mathCode, ctx);
  vm.runInContext(regCode, ctx);
  vm.runInContext(manifest, ctx);

  const trackList = ctx.window.TRACK_LIST || [];
  assert(trackList.length >= 1, `Se espera al menos 1 circuito en TRACK_LIST, se encontraron ${trackList.length}`);

  for (const trackFile of trackList) {
    const filePath = path.join(root, 'tracks', trackFile);
    assert(fs.existsSync(filePath), `El archivo ${trackFile} existe en disco`);

    const trackCode = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(trackCode, ctx);

    const tracksObj = ctx.window.TRACKS || ctx.TRACKS;
    const allTracks = tracksObj && Array.isArray(tracksObj.list) ? tracksObj.list : [];
    const track = allTracks.find(t => trackCode.includes(`id: '${t.id}'`) || trackCode.includes(`id: "${t.id}"`));

    assert(!!track, `El circuito ${trackFile} se registró correctamente en TRACKS`);
    if (!track) continue;

    // 1. Metadatos
    assert(typeof track.id === 'string' && track.id.length > 0, `[${track.id}] ID de circuito válido`);
    assert(typeof track.name === 'string' && track.name.length > 0, `[${track.id}] Nombre visible presente: "${track.name}"`);
    assert(typeof track.subtitle === 'string', `[${track.id}] Subtítulo presente`);
    assert(typeof track.specs === 'string', `[${track.id}] Ficha técnica presente`);

    // 2. Geometría y ancho
    assert(track.hw >= 4.0 && track.hw <= 8.0, `[${track.id}] Semiancho de asfalto hw en rango [4.0, 8.0]m: ${track.hw}`);
    assert(typeof track.startS === 'number', `[${track.id}] Posición de salida startS definida: ${track.startS}`);
    assert(typeof track.startD === 'number', `[${track.id}] Desviación de salida startD definida: ${track.startD}`);

    // 3. Elevación natural
    assert(typeof track.naturalH === 'function', `[${track.id}] Función de relieve naturalH definida`);
    if (typeof track.naturalH === 'function') {
      const h0 = track.naturalH(0, 0, 0, 0);
      const h1 = track.naturalH(100, -200, 0, 0);
      assert(Number.isFinite(h0) && Number.isFinite(h1), `[${track.id}] naturalH devuelve cotas numéricas finitas (0,0,0,0)->${h0.toFixed(2)}m`);
    }

    // 4. Poses de cámara
    assert(Array.isArray(track.poses) && track.poses.length >= 3, `[${track.id}] Tiene al menos 3 poses de cámara`);
    if (Array.isArray(track.poses)) {
      for (const pose of track.poses) {
        assert(typeof pose.nome === 'string' && pose.nome.length > 0, `[${track.id}] Pose con identificador válido: "${pose.nome}"`);
        assert(pose.tipo === 'coche' || pose.tipo === 'carro', `[${track.id}] Tipo de pose 'coche'`);
        const ojo = pose.ojo || pose.olho;
        const blanco = pose.blanco || pose.alvo;
        assert(Array.isArray(ojo) && ojo.length === 3, `[${track.id}] Posición de cámara ojo [x,y,z] válida`);
        assert(Array.isArray(blanco) && blanco.length === 3, `[${track.id}] Objetivo blanco [x,y,z] válido`);
        assert(pose.fov >= 0.2 && pose.fov <= 1.2, `[${track.id}] FOV en rango [0.2, 1.2]: ${pose.fov}`);
      }
    }

    console.log(`  ✓ ${track.name.padEnd(28)} [${track.id}]`);
  }

  console.log(`Resultado Circuitos: ${passed} aserciones correctas, ${failed} fallos.`);
  return { passed, failed };
}

if (require.main === module) {
  const res = runTracksTestSuite();
  process.exit(res.failed > 0 ? 1 : 0);
}

module.exports = { runTracksTestSuite };
