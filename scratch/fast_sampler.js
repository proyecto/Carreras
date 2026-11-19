const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

// Collect road primitives. Road surfaces: p13, p11, p37, p9
const roadPrimIndices = [13, 11, 37, 9];
const triangles = [];

for (const pIdx of roadPrimIndices) {
  const p = gltf.meshes[1].primitives[pIdx];
  const posAcc = gltf.accessors[p.attributes.POSITION];
  const bvP = gltf.bufferViews[posAcc.bufferView];
  const f32P = new Float32Array(buf.buffer, buf.byteOffset + binOffset + (bvP.byteOffset || 0) + (posAcc.byteOffset || 0), posAcc.count * 3);

  const idxAcc = gltf.accessors[p.indices];
  const bvI = gltf.bufferViews[idxAcc.bufferView];
  const offI = binOffset + (bvI.byteOffset || 0) + (idxAcc.byteOffset || 0);
  const indices = idxAcc.componentType === 5123
    ? new Uint16Array(buf.buffer, buf.byteOffset + offI, idxAcc.count)
    : new Uint32Array(buf.buffer, buf.byteOffset + offI, idxAcc.count);

  for (let t = 0; t < indices.length / 3; t++) {
    const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2];
    const p0 = [f32P[i0 * 3], -f32P[i0 * 3 + 2], f32P[i0 * 3 + 1]];
    const p1 = [f32P[i1 * 3], -f32P[i1 * 3 + 2], f32P[i1 * 3 + 1]];
    const p2 = [f32P[i2 * 3], -f32P[i2 * 3 + 2], f32P[i2 * 3 + 1]];
    
    // Normal in Y
    const e1x = p1[0] - p0[0], e1y = p1[1] - p0[1], e1z = p1[2] - p0[2];
    const e2x = p2[0] - p0[0], e2y = p2[1] - p0[1], e2z = p2[2] - p0[2];
    const ny = e1z * e2x - e1x * e2z;
    // Only keep triangles facing upwards (normal Y > 0)
    if (Math.abs(ny) > 1e-4) {
      triangles.push([p0, p1, p2]);
    }
  }
}

console.log(`Total road triangles collected: ${triangles.length}`);

// Function to sample road height at (x, z)
// Spatial hash grid for fast triangle lookup
const cellSize = 20;
const grid = new Map();

function getCellKey(cx, cz) {
  return `${cx}_${cz}`;
}

triangles.forEach((tri, idx) => {
  const [p0, p1, p2] = tri;
  const minX = Math.min(p0[0], p1[0], p2[0]);
  const maxX = Math.max(p0[0], p1[0], p2[0]);
  const minZ = Math.min(p0[2], p1[2], p2[2]);
  const maxZ = Math.max(p0[2], p1[2], p2[2]);

  const cx0 = Math.floor(minX / cellSize), cx1 = Math.floor(maxX / cellSize);
  const cz0 = Math.floor(minZ / cellSize), cz1 = Math.floor(maxZ / cellSize);

  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cz = cz0; cz <= cz1; cz++) {
      const k = getCellKey(cx, cz);
      let list = grid.get(k);
      if (!list) { list = []; grid.set(k, list); }
      list.push(idx);
    }
  }
});

console.log(`Spatial grid cells: ${grid.size}`);

function sampleRoadY(qx, qz) {
  const cx = Math.floor(qx / cellSize);
  const cz = Math.floor(qz / cellSize);
  const list = grid.get(getCellKey(cx, cz));
  if (!list) return null;

  let bestY = null;
  for (const triIdx of list) {
    const [p0, p1, p2] = triangles[triIdx];
    const v0x = p2[0] - p0[0], v0z = p2[2] - p0[2];
    const v1x = p1[0] - p0[0], v1z = p1[2] - p0[2];
    const v2x = qx - p0[0], v2z = qz - p0[2];

    const dot00 = v0x * v0x + v0z * v0z;
    const dot01 = v0x * v1x + v0z * v1z;
    const dot02 = v0x * v2x + v0z * v2z;
    const dot11 = v1x * v1x + v1z * v1z;
    const dot12 = v1x * v2x + v1z * v2z;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    if (u >= -1e-4 && v >= -1e-4 && (u + v) <= 1 + 1e-4) {
      const y = p0[1] + u * (p2[1] - p0[1]) + v * (p1[1] - p0[1]);
      if (y < 80 && (bestY === null || y > bestY)) {
        bestY = y;
      }
    }
  }
  return bestY;
}

// Test sampleRoadY at start line
console.log(`sampleRoadY(-22.84, -600): ${sampleRoadY(-22.84, -600)}`);
console.log(`sampleRoadY(-22.84, -400): ${sampleRoadY(-22.84, -400)}`);
console.log(`sampleRoadY(-22.84, 0): ${sampleRoadY(-22.84, 0)}`);
console.log(`sampleRoadY(-22.84, 100): ${sampleRoadY(-22.84, 100)}`);
