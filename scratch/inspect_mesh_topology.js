const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

const p = gltf.meshes[1].primitives[13];
const posAcc = gltf.accessors[p.attributes.POSITION];
const idxAcc = gltf.accessors[p.indices];

const bvP = gltf.bufferViews[posAcc.bufferView];
const f32P = new Float32Array(buf.buffer, buf.byteOffset + binOffset + (bvP.byteOffset || 0) + (posAcc.byteOffset || 0), posAcc.count * 3);

const bvI = gltf.bufferViews[idxAcc.bufferView];
const offI = binOffset + (bvI.byteOffset || 0) + (idxAcc.byteOffset || 0);
let indices;
if (idxAcc.componentType === 5123) {
  indices = new Uint16Array(buf.buffer, buf.byteOffset + offI, idxAcc.count);
} else {
  indices = new Uint32Array(buf.buffer, buf.byteOffset + offI, idxAcc.count);
}

const numTris = indices.length / 3;
console.log(`Asphalt mesh: ${posAcc.count} vertices, ${numTris} triangles`);

// Let's inspect vertex degrees and triangle edges
const edgeMap = new Map();
function addEdge(a, b, tri) {
  const k = a < b ? `${a}_${b}` : `${b}_${a}`;
  let list = edgeMap.get(k);
  if (!list) { list = []; edgeMap.set(k, list); }
  list.push(tri);
}

for (let t = 0; t < numTris; t++) {
  const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2];
  addEdge(i0, i1, t);
  addEdge(i1, i2, t);
  addEdge(i2, i0, t);
}

let boundaryEdges = 0, manifoldEdges = 0, nonManifold = 0;
for (const [k, tris] of edgeMap.entries()) {
  if (tris.length === 1) boundaryEdges++;
  else if (tris.length === 2) manifoldEdges++;
  else nonManifold++;
}
console.log(`Edges: boundary=${boundaryEdges}, manifold=${manifoldEdges}, nonManifold=${nonManifold}`);
