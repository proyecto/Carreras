const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

function getTriangles(pIdx) {
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

  const tris = [];
  for (let t = 0; t < indices.length / 3; t++) {
    const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2];
    const p0 = [f32P[i0 * 3], -f32P[i0 * 3 + 2], f32P[i0 * 3 + 1]];
    const p1 = [f32P[i1 * 3], -f32P[i1 * 3 + 2], f32P[i1 * 3 + 1]];
    const p2 = [f32P[i2 * 3], -f32P[i2 * 3 + 2], f32P[i2 * 3 + 1]];
    tris.push([p0, p1, p2]);
  }
  return tris;
}

const tris11 = getTriangles(11);
const tris13 = getTriangles(13);

console.log(`p11 triangles: ${tris11.length}`);
console.log(`p13 triangles: ${tris13.length}`);

// Let's test a slice at Z = -600 on p11 and p13
for (const [name, tris] of [['p11', tris11], ['p13', tris13]]) {
  let minX = Infinity, maxX = -Infinity, count = 0;
  for (const [p0, p1, p2] of tris) {
    const cz = (p0[2] + p1[2] + p2[2]) / 3;
    if (Math.abs(cz - (-600)) < 10) {
      count++;
      for (const pt of [p0, p1, p2]) {
        if (pt[0] < minX) minX = pt[0];
        if (pt[0] > maxX) maxX = pt[0];
      }
    }
  }
  console.log(`${name} around Z = -600: ${count} triangles, X in [${minX.toFixed(2)}, ${maxX.toFixed(2)}]`);
}
