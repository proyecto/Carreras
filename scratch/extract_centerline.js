const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

// Mesh 1, primitive 13 is the asphalt
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

console.log(`Loaded asphalt mesh: ${posAcc.count} vertices, ${indices.length / 3} triangles`);

// Convert raw vertices to world coords (X = x, Y = -z, Z = y)
const numV = posAcc.count;
const vx = new Float64Array(numV);
const vy = new Float64Array(numV);
const vz = new Float64Array(numV);

let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

for (let i = 0; i < numV; i++) {
  const rx = f32P[i * 3];
  const ry = f32P[i * 3 + 1];
  const rz = f32P[i * 3 + 2];
  
  const wx = rx;
  const wy = -rz;
  const wz = ry;
  
  vx[i] = wx;
  vy[i] = wy;
  vz[i] = wz;
  
  if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
  if (wy < minY) minY = wy; if (wy > maxY) maxY = wy;
  if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz;
}

console.log(`World Bounds:
  X: [${minX.toFixed(2)}, ${maxX.toFixed(2)}] (width: ${(maxX - minX).toFixed(2)}m)
  Y: [${minY.toFixed(2)}, ${maxY.toFixed(2)}] (elevation: ${(maxY - minY).toFixed(2)}m)
  Z: [${minZ.toFixed(2)}, ${maxZ.toFixed(2)}] (length: ${(maxZ - minZ).toFixed(2)}m)
`);

// Look at start/finish line region around Z = -600
const nearStart = [];
for (let i = 0; i < numV; i++) {
  if (Math.abs(vz[i] - (-600)) < 2.0 && vx[i] < -10 && vx[i] > -40) {
    nearStart.push({ x: vx[i], y: vy[i], z: vz[i] });
  }
}
nearStart.sort((a, b) => a.x - b.x);
console.log(`Start line slice at Z ~ -600: found ${nearStart.length} vertices`);
if (nearStart.length > 0) {
  console.log(`  Left edge: x=${nearStart[0].x.toFixed(2)}, y=${nearStart[0].y.toFixed(2)}, z=${nearStart[0].z.toFixed(2)}`);
  console.log(`  Right edge: x=${nearStart[nearStart.length - 1].x.toFixed(2)}, y=${nearStart[nearStart.length - 1].y.toFixed(2)}, z=${nearStart[nearStart.length - 1].z.toFixed(2)}`);
  const center = (nearStart[0].x + nearStart[nearStart.length - 1].x) / 2;
  const avgY = nearStart.reduce((s, v) => s + v.y, 0) / nearStart.length;
  console.log(`  Center: x=${center.toFixed(2)}, avgY=${avgY.toFixed(2)}, width=${(nearStart[nearStart.length - 1].x - nearStart[0].x).toFixed(2)}m`);
}
