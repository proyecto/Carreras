const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

const magic = dv.getUint32(0, true);
if (magic !== 0x46546C67) {
  console.error('Not a valid GLB');
  process.exit(1);
}
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

console.log('Nodes:', gltf.nodes.map((n, i) => ({ i, name: n.name, mesh: n.mesh, rot: n.rotation, trans: n.translation })));
console.log('Meshes count:', gltf.meshes.length);

for (let mIdx = 0; mIdx < gltf.meshes.length; mIdx++) {
  const mesh = gltf.meshes[mIdx];
  console.log(`\nMesh ${mIdx} "${mesh.name}" has ${mesh.primitives.length} primitives:`);
  mesh.primitives.forEach((p, pIdx) => {
    const mat = gltf.materials[p.material];
    const posAcc = gltf.accessors[p.attributes.POSITION];
    console.log(`  p${pIdx}: mat="${mat ? mat.name : 'none'}", vcount=${posAcc.count}, min=[${posAcc.min.map(v => v.toFixed(1))}], max=[${posAcc.max.map(v => v.toFixed(1))}]`);
  });
}
