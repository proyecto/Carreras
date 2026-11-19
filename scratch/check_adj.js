const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen)));
const binOffset = 20 + jsonLen + 8;

// Check primitive 11 (Object6521) adjacency
const p = gltf.meshes[1].primitives[11];
const posAcc = gltf.accessors[p.attributes.POSITION];
const bvP = gltf.bufferViews[posAcc.bufferView];
const f32P = new Float32Array(buf.buffer, buf.byteOffset + binOffset + (bvP.byteOffset || 0) + (posAcc.byteOffset || 0), posAcc.count * 3);
const idxAcc = gltf.accessors[p.indices];
const bvI = gltf.bufferViews[idxAcc.bufferView];
const offI = binOffset + (bvI.byteOffset || 0) + (idxAcc.byteOffset || 0);
const indices = idxAcc.componentType === 5123
  ? new Uint16Array(buf.buffer, buf.byteOffset + offI, idxAcc.count)
  : new Uint32Array(buf.buffer, buf.byteOffset + offI, idxAcc.count);

console.log('Prim 11 vertex count:', posAcc.count, 'indices:', indices.length);

// Count shared vertices
const edgeMap = new Map();
let sharedEdges = 0;
for (let t = 0; t < indices.length / 3; t++) {
  const i0 = indices[t*3], i1 = indices[t*3+1], i2 = indices[t*3+2];
  const e = [
    Math.min(i0, i1) + '_' + Math.max(i0, i1),
    Math.min(i1, i2) + '_' + Math.max(i1, i2),
    Math.min(i2, i0) + '_' + Math.max(i2, i0)
  ];
  for (const ed of e) {
    if (edgeMap.has(ed)) sharedEdges++;
    else edgeMap.set(ed, t);
  }
}
console.log('Unique edges:', edgeMap.size, 'shared edges:', sharedEdges);
