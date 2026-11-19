// trace_all_turns.js
// Follows the road from the start line and detects the exact trajectory:
// centerline coordinates, distances, curve directions, radii, and elevations.

const fs = require('fs');

function m4() { return new Float32Array(16); }
function m4ident(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; }
function m4rotY(o, a) { m4ident(o); const c = Math.cos(a), s = Math.sin(a); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; }
function m4translate(o, x, y, z) { m4ident(o); o[12] = x; o[13] = y; o[14] = z; return o; }
function m4mul(o, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  const res = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
    res[i * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
    res[i * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
    res[i * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
    res[i * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
  }
  o.set(res);
  return o;
}
function m4point(o, m, x, y, z) {
  o[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
  o[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
  o[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  return o;
}

const mNode = m4();
m4ident(mNode);
const q = [ 0.7071068286895752, 0, 0, 0.7071068286895752 ];
const x2 = q[0] + q[0], y2 = q[1] + q[1], z2 = q[2] + q[2];
const xx = q[0] * x2, xy = q[0] * y2, xz = q[0] * z2;
const yy = q[1] * y2, yz = q[1] * z2, zz = q[2] * z2;
const wx = q[3] * x2, wy = q[3] * y2, wz = q[3] * z2;
mNode[0] = 1 - (yy + zz); mNode[1] = xy + wz; mNode[2] = xz - wy; mNode[3] = 0;
mNode[4] = xy - wz; mNode[5] = 1 - (xx + zz); mNode[6] = yz + wx; mNode[7] = 0;
mNode[8] = xz + wy; mNode[9] = yz - wx; mNode[10] = 1 - (xx + yy); mNode[11] = 0;
mNode[12] = 0; mNode[13] = 0; mNode[14] = 0; mNode[15] = 1;

const t = { yaw: Math.PI / 2, pos: [580.5, -65.03, -12.50] };
const mRot = m4(), mTrans = m4(), mXf = m4(), model = m4();
m4rotY(mRot, t.yaw || 0);
m4translate(mTrans, t.pos[0], t.pos[1], t.pos[2]);
m4mul(mXf, mTrans, mRot);
m4mul(model, mXf, mNode);

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen)));
const binOffset = 20 + jsonLen + 8;

// All road and kerb primitives:
const roadPrims = [0, 1, 7, 10, 11, 13, 21, 25, 37, 39];
const triangles = [];
const pt0 = new Float32Array(3), pt1 = new Float32Array(3), pt2 = new Float32Array(3);

roadPrims.forEach(pIdx => {
  const p = gltf.meshes[1].primitives[pIdx];
  const posAcc = gltf.accessors[p.attributes.POSITION];
  const bvP = gltf.bufferViews[posAcc.bufferView];
  const f32P = new Float32Array(buf.buffer, buf.byteOffset + binOffset + (bvP.byteOffset || 0) + (posAcc.byteOffset || 0), posAcc.count * 3);
  const idxAcc = gltf.accessors[p.indices];
  if (!idxAcc) return;
  const bvI = gltf.bufferViews[idxAcc.bufferView];
  const offI = binOffset + (bvI.byteOffset || 0) + (idxAcc.byteOffset || 0);
  const indices = idxAcc.componentType === 5123
    ? new Uint16Array(buf.buffer, buf.byteOffset + offI, idxAcc.count)
    : new Uint32Array(buf.buffer, buf.byteOffset + offI, idxAcc.count);

  for (let t = 0; t < indices.length / 3; t++) {
    const i0 = indices[t*3], i1 = indices[t*3+1], i2 = indices[t*3+2];
    m4point(pt0, model, f32P[i0*3], f32P[i0*3+1], f32P[i0*3+2]);
    m4point(pt1, model, f32P[i1*3], f32P[i1*3+1], f32P[i1*3+2]);
    m4point(pt2, model, f32P[i2*3], f32P[i2*3+1], f32P[i2*3+2]);

    const e1x = pt1[0] - pt0[0], e1y = pt1[1] - pt0[1], e1z = pt1[2] - pt0[2];
    const e2x = pt2[0] - pt0[0], e2y = pt2[1] - pt0[1], e2z = pt2[2] - pt0[2];
    const ny = e1z * e2x - e1x * e2z;
    const nx = e1y * e2z - e1z * e2y;
    const nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-5 && (ny / len) > 0.4) {
      triangles.push([
        [pt0[0], pt0[1], pt0[2]],
        [pt1[0], pt1[1], pt1[2]],
        [pt2[0], pt2[1], pt2[2]]
      ]);
    }
  }
});

console.log(`Loaded ${triangles.length} road triangles.`);

const cellSize = 15;
const grid = new Map();
triangles.forEach((tri, idx) => {
  const [p0, p1, p2] = tri;
  const cx0 = Math.floor(Math.min(p0[0], p1[0], p2[0]) / cellSize);
  const cx1 = Math.floor(Math.max(p0[0], p1[0], p2[0]) / cellSize);
  const cz0 = Math.floor(Math.min(p0[2], p1[2], p2[2]) / cellSize);
  const cz1 = Math.floor(Math.max(p0[2], p1[2], p2[2]) / cellSize);
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cz = cz0; cz <= cz1; cz++) {
      const k = `${cx}_${cz}`;
      let l = grid.get(k);
      if (!l) { l = []; grid.set(k, l); }
      l.push(idx);
    }
  }
});

function sampleRoadY(qx, qz) {
  const cx = Math.floor(qx / cellSize), cz = Math.floor(qz / cellSize);
  const list = grid.get(`${cx}_${cz}`);
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
      if (bestY === null || y > bestY) bestY = y;
    }
  }
  return bestY;
}

// Trace the path starting from start line
let curX = -60, curZ = 0;
let tx = 1, tz = 0; // forward along +X
const stepSize = 5.0;
const recordedPoints = [];

console.log('Tracing centerline...');
for (let step = 0; step < 1200; step++) {
  const y = sampleRoadY(curX, curZ);
  recordedPoints.push({ x: curX, y: y ?? 0, z: curZ, s: step * stepSize, heading: Math.atan2(tz, tx) });

  // Normal to road: (-tz, tx)
  const nx = -tz, nz = tx;
  // Scan laterally across the road (-12m to +12m) to find road center
  let minD = null, maxD = null;
  for (let d = -14; d <= 14; d += 0.5) {
    const sx = curX + d * nx, sz = curZ + d * nz;
    if (sampleRoadY(sx, sz) !== null) {
      if (minD === null) minD = d;
      maxD = d;
    }
  }
  if (minD !== null && maxD !== null) {
    const centerD = (minD + maxD) / 2;
    // Nudge curX, curZ toward centerD
    curX += centerD * nx * 0.4;
    curZ += centerD * nz * 0.4;
  }

  // Look ahead to find best direction
  let bestAngle = 0;
  let maxScore = -1;
  // Test angles around current tangent (-60 deg to +60 deg)
  for (let da = -Math.PI / 3; da <= Math.PI / 3; da += Math.PI / 36) {
    const c = Math.cos(da), s = Math.sin(da);
    const testTx = tx * c - tz * s;
    const testTz = tx * s + tz * c;
    const testX = curX + testTx * stepSize;
    const testZ = curZ + testTz * stepSize;
    const hitY = sampleRoadY(testX, testZ);
    if (hitY !== null) {
      // Prioritize continuity (smaller angle changes)
      const score = 100 - Math.abs(da) * 50;
      if (score > maxScore) {
        maxScore = score;
        bestAngle = da;
      }
    }
  }

  if (maxScore < 0) {
    console.log(`Lost track at s = ${(step * stepSize).toFixed(1)}m, pos = (${curX.toFixed(1)}, ${curZ.toFixed(1)})`);
    break;
  }

  const c = Math.cos(bestAngle), s = Math.sin(bestAngle);
  const nextTx = tx * c - tz * s;
  const nextTz = tx * s + tz * c;
  const l = Math.hypot(nextTx, nextTz);
  tx = nextTx / l;
  tz = nextTz / l;

  curX += tx * stepSize;
  curZ += tz * stepSize;

  if (step > 60 && Math.hypot(curX - (-60), curZ - 0) < 15.0) {
    console.log(`Loop closed successfully at step ${step}! Total length: ${(step * stepSize).toFixed(1)}m`);
    break;
  }
}

console.log(`Recorded ${recordedPoints.length} points.`);
// Print key waypoints every 100m
for (let i = 0; i < recordedPoints.length; i += 20) {
  const p = recordedPoints[i];
  console.log(`s = ${p.s.toFixed(0).padStart(4)}m | pos = (${p.x.toFixed(1).padStart(6)}, ${p.z.toFixed(1).padStart(6)}) | Y = ${p.y.toFixed(2).padStart(6)}m | heading = ${(p.heading * 180 / Math.PI).toFixed(1)} deg`);
}
