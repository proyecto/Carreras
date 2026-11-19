const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

const testPoints = [
  [-22.84, -600.0],
  [-22.84, -580.0],
  [-22.84, -550.0],
  [-22.84, -500.0],
  [-22.84, -400.0],
  [-22.84, -300.0],
  [-22.84, -200.0],
  [-22.84, -100.0],
  [-22.84, 0.0],
  [-22.84, 100.0],
];

console.log('Raycasting down from Y = 100 at track center X = -22.84 along main straight...');

for (const [qx, qz] of testPoints) {
  let bestY = -Infinity;
  let hitPrim = -1;
  let hitMat = '';

  gltf.meshes[1].primitives.forEach((p, pIdx) => {
    const mat = gltf.materials[p.material];
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

      // Check 2D triangle contains (qx, qz)
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
        // Point in triangle! Compute Y
        const y = p0[1] + u * (p2[1] - p0[1]) + v * (p1[1] - p0[1]);
        if (y < 80 && y > bestY) { // Ignore bridges above 80m
          bestY = y;
          hitPrim = pIdx;
          hitMat = mat.name;
        }
      }
    }
  });

  console.log(`Pos (${qx.toFixed(2)}, ${qz.toFixed(2)}) -> Y = ${bestY.toFixed(3)}m (prim ${hitPrim}: ${hitMat})`);
}
