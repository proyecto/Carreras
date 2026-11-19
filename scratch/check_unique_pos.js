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

// Group positions within 1mm (0.001m)
const posMap = new Map();
for (let i = 0; i < posAcc.count; i++) {
  const wx = Math.round(f32P[i * 3] * 100) / 100;
  const wy = Math.round(-f32P[i * 3 + 2] * 100) / 100;
  const wz = Math.round(f32P[i * 3 + 1] * 100) / 100;
  const k = `${wx},${wy},${wz}`;
  posMap.set(k, (posMap.get(k) || 0) + 1);
}
console.log(`Total vertices: ${posAcc.count}, Unique 3D points (1cm resolution): ${posMap.size}`);
