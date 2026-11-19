const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

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
    const e1x = p1[0] - p0[0], e1y = p1[1] - p0[1], e1z = p1[2] - p0[2];
    const e2x = p2[0] - p0[0], e2y = p2[1] - p0[1], e2z = p2[2] - p0[2];
    const ny = e1z * e2x - e1x * e2z;
    if (Math.abs(ny) > 1e-4) {
      triangles.push([p0, p1, p2]);
    }
  }
}

const cellSize = 15;
const grid = new Map();
function getCellKey(cx, cz) { return `${cx}_${cz}`; }

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

// Trace loop
let curX = -22.84, curZ = -600.0;
// Forward heading: towards +Z (tangent tx = 0, tz = 1)
let tx = 0, tz = 1;
const path = [];
const stepSize = 4.0;
const maxSteps = 2000;

console.log('Tracing track from start line...');

for (let step = 0; step < maxSteps; step++) {
  const curY = sampleRoadY(curX, curZ);
  path.push({ x: curX, y: curY, z: curZ, tx, tz });

  if (step > 50) {
    const distToStart = Math.hypot(curX - (-22.84), curZ - (-600.0));
    if (distToStart < 15.0) {
      console.log(`Loop closed after ${step} steps! Total distance: ${(step * stepSize).toFixed(1)}m`);
      break;
    }
  }

  // Find lateral profile across normal: nx = -tz, nz = tx
  const nx = -tz, nz = tx;
  // Scan d from -15 to +15 in 0.5m increments
  const hits = [];
  for (let d = -16; d <= 16; d += 0.5) {
    const sx = curX + d * nx;
    const sz = curZ + d * nz;
    const sy = sampleRoadY(sx, sz);
    if (sy !== null) hits.push(d);
  }

  if (hits.length === 0) {
    console.warn(`Lost track at step ${step}: (${curX.toFixed(1)}, ${curZ.toFixed(1)})`);
    break;
  }

  // To avoid pit lane confusion at the main straight, filter contiguous band around 0
  let bestBand = [];
  let curBand = [];
  for (let i = 0; i < hits.length; i++) {
    if (curBand.length === 0 || Math.abs(hits[i] - hits[i - 1] - 0.5) < 0.1) {
      curBand.push(hits[i]);
    } else {
      if (curBand.some(d => Math.abs(d) < 3.0)) bestBand = curBand;
      curBand = [hits[i]];
    }
  }
  if (curBand.some(d => Math.abs(d) < 3.0)) bestBand = curBand;
  if (bestBand.length === 0) bestBand = hits;

  const dMin = bestBand[0];
  const dMax = bestBand[bestBand.length - 1];
  const dCenter = (dMin + dMax) / 2;

  // Center the current point laterally
  curX += dCenter * 0.5 * nx;
  curZ += dCenter * 0.5 * nz;

  // Search forward for the next heading
  // Test a fan of angles [-40 deg, +40 deg]
  let bestAngle = 0;
  let maxForwardRoad = -1;

  for (let aDeg = -45; aDeg <= 45; aDeg += 3) {
    const rad = aDeg * Math.PI / 180;
    // Rotate tangent by rad
    const rtx = tx * Math.cos(rad) - tz * Math.sin(rad);
    const rtz = tx * Math.sin(rad) + tz * Math.cos(rad);

    // Check road presence at stepSize and stepSize * 2
    const p1x = curX + rtx * stepSize;
    const p1z = curZ + rtz * stepSize;
    const p2x = curX + rtx * stepSize * 2;
    const p2z = curZ + rtz * stepSize * 2;

    const y1 = sampleRoadY(p1x, p1z);
    const y2 = sampleRoadY(p2x, p2z);

    if (y1 !== null && y2 !== null) {
      // Prioritize continuity (smaller angle changes)
      const score = 100 - Math.abs(aDeg);
      if (score > maxForwardRoad) {
        maxForwardRoad = score;
        bestAngle = rad;
      }
    }
  }

  // Update tangent
  const newTx = tx * Math.cos(bestAngle) - tz * Math.sin(bestAngle);
  const newTz = tx * Math.sin(bestAngle) + tz * Math.cos(bestAngle);
  const l = Math.hypot(newTx, newTz);
  tx = newTx / l;
  tz = newTz / l;

  // Advance
  curX += tx * stepSize;
  curZ += tz * stepSize;

  if (step % 100 === 0) {
    console.log(`Step ${step}: pos=(${curX.toFixed(1)}, ${curZ.toFixed(1)}), Y=${curY ? curY.toFixed(1) : 'null'}, width=${(dMax - dMin).toFixed(1)}m`);
  }
}
