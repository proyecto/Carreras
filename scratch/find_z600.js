const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

const p = gltf.meshes[1].primitives[13];
const posAcc = gltf.accessors[p.attributes.POSITION];
const bvP = gltf.bufferViews[posAcc.bufferView];
const f32P = new Float32Array(buf.buffer, buf.byteOffset + binOffset + (bvP.byteOffset || 0) + (posAcc.byteOffset || 0), posAcc.count * 3);

const z600 = [];
for (let i = 0; i < posAcc.count; i++) {
  const wx = f32P[i * 3];
  const wy = -f32P[i * 3 + 2];
  const wz = f32P[i * 3 + 1];
  if (Math.abs(wz - (-600)) < 5.0) {
    z600.push({ x: wx, y: wy, z: wz });
  }
}
console.log(`Vertices near Z ~ -600 (any X): ${z600.length}`);
z600.slice(0, 10).forEach(v => console.log(v));
