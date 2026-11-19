const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen)));
const binOffset = 20 + jsonLen + 8;

const p = gltf.meshes[1].primitives[11];
const idxAcc = gltf.accessors[p.indices];
const bvI = gltf.bufferViews[idxAcc.bufferView];
const offI = binOffset + (bvI.byteOffset || 0) + (idxAcc.byteOffset || 0);
const indices = idxAcc.componentType === 5123
  ? new Uint16Array(buf.buffer, buf.byteOffset + offI, idxAcc.count)
  : new Uint32Array(buf.buffer, buf.byteOffset + offI, idxAcc.count);

const numTris = indices.length / 3;
const adj = Array.from({length: numTris}, () => []);
const edgeMap = new Map();

for (let t = 0; t < numTris; t++) {
  const i0 = indices[t*3], i1 = indices[t*3+1], i2 = indices[t*3+2];
  const edges = [
    Math.min(i0, i1) + '_' + Math.max(i0, i1),
    Math.min(i1, i2) + '_' + Math.max(i1, i2),
    Math.min(i2, i0) + '_' + Math.max(i2, i0)
  ];
  for (const e of edges) {
    if (edgeMap.has(e)) {
      const other = edgeMap.get(e);
      adj[t].push(other);
      adj[other].push(t);
    } else {
      edgeMap.set(e, t);
    }
  }
}

// Find connected components
const visited = new Uint8Array(numTris);
const components = [];
for (let t = 0; t < numTris; t++) {
  if (visited[t]) continue;
  const comp = [];
  const queue = [t];
  visited[t] = 1;
  while (queue.length > 0) {
    const curr = queue.pop();
    comp.push(curr);
    for (const neighbor of adj[curr]) {
      if (!visited[neighbor]) {
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
  }
  components.push(comp);
}

components.sort((a,b) => b.length - a.length);
console.log('Prim 11 connected components count:', components.length);
components.slice(0, 10).forEach((c, idx) => {
  console.log(`Comp ${idx}: ${c.length} triangles (${(c.length / numTris * 100).toFixed(1)}%)`);
});
