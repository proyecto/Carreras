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
let indices = idxAcc.componentType === 5123
  ? new Uint16Array(buf.buffer, buf.byteOffset + offI, idxAcc.count)
  : new Uint32Array(buf.buffer, buf.byteOffset + offI, idxAcc.count);

const z = -600;
const inters = [];
for (let t = 0; t < indices.length / 3; t++) {
  const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2];
  const p0 = [f32P[i0 * 3], -f32P[i0 * 3 + 2], f32P[i0 * 3 + 1]];
  const p1 = [f32P[i1 * 3], -f32P[i1 * 3 + 2], f32P[i1 * 3 + 1]];
  const p2 = [f32P[i2 * 3], -f32P[i2 * 3 + 2], f32P[i2 * 3 + 1]];

  const d0 = p0[2] - z, d1 = p1[2] - z, d2 = p2[2] - z;
  if ((d0 > 0 && d1 > 0 && d2 > 0) || (d0 < 0 && d1 < 0 && d2 < 0)) continue;
  
  const edges = [[p0, p1, d0, d1], [p1, p2, d1, d2], [p2, p0, d2, d0]];
  const triPts = [];
  for (const [a, b, da, db] of edges) {
    if ((da <= 0 && db >= 0) || (da >= 0 && db <= 0)) {
      if (Math.abs(db - da) > 1e-6) {
        const frac = -da / (db - da);
        if (frac >= 0 && frac <= 1) {
          triPts.push([a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac, z]);
        }
      }
    }
  }
  if (triPts.length >= 2) {
    inters.push([triPts[0], triPts[1]]);
  }
}

console.log(`Found ${inters.length} triangle intersection segments at Z = ${z}:`);
inters.forEach(([a, b], idx) => {
  console.log(`  seg ${idx}: [${a[0].toFixed(2)}, ${a[1].toFixed(2)}] -> [${b[0].toFixed(2)}, ${b[1].toFixed(2)}]`);
});
