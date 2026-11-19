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
const mNode = m4(); m4ident(mNode);
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

const roadPrims = [11, 12, 13, 14, 16, 27, 33, 37, 39];
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
    const len = Math.hypot(e1y * e2z - e1z * e2y, ny, e1x * e2y - e1y * e2x);
    if (len > 1e-5 && (ny / len) > 0.6) {
      triangles.push([
        [pt0[0], pt0[1], pt0[2]],
        [pt1[0], pt1[1], pt1[2]],
        [pt2[0], pt2[1], pt2[2]]
      ]);
    }
  }
});

const cellSize = 10;
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

// Function to find the road centerline given an approximate point (qx, qz) and tangent (tx, tz)
function snapToCenterline(qx, qz, tx, tz) {
  const nx = -tz, nz = tx;
  const hits = [];
  for (let d = -16; d <= 16; d += 0.2) {
    const sx = qx + d * nx, sz = qz + d * nz;
    const y = sampleRoadY(sx, sz);
    if (y !== null) hits.push(d);
  }
  if (hits.length === 0) return null;
  // find contiguous band around 0
  let bestBand = [];
  let curBand = [];
  for (let i = 0; i < hits.length; i++) {
    if (curBand.length === 0 || Math.abs(hits[i] - hits[i - 1] - 0.2) < 0.05) {
      curBand.push(hits[i]);
    } else {
      if (curBand.some(d => Math.abs(d) < 3.0)) bestBand = curBand;
      curBand = [hits[i]];
    }
  }
  if (curBand.some(d => Math.abs(d) < 3.0)) bestBand = curBand;
  if (bestBand.length === 0) bestBand = hits;
  const minD = bestBand[0], maxD = bestBand[bestBand.length - 1];
  const centerD = (minD + maxD) / 2;
  const cx = qx + centerD * nx, cz = qz + centerD * nz;
  const cy = sampleRoadY(cx, cz);
  return { x: cx, y: cy, z: cz, width: maxD - minD };
}

// Interactive step-by-step trace:
// Follow from (curX, curZ) with direction steering
let curX = -60, curZ = -2.0;
let tx = 1, tz = 0;
const path = [];

for (let s = 0; s < 5500; s += 2) {
  const snapped = snapToCenterline(curX, curZ, tx, tz);
  if (!snapped) {
    console.log(`Lost road at s=${s}m, pos=(${curX.toFixed(1)}, ${curZ.toFixed(1)})`);
    break;
  }
  curX = snapped.x;
  curZ = snapped.z;
  path.push({ s, x: curX, y: snapped.y, z: curZ, width: snapped.width, tx, tz });

  if (s > 500 && Math.hypot(curX - (-60), curZ - (-2.0)) < 6.0) {
    console.log(`SUCCESS! Loop completed at s=${s}m!`);
    break;
  }

  // Look ahead at 5m to determine steering:
  // Test angles from -35 deg to +35 deg
  let bestAngle = 0;
  let maxForwardRoad = -1;
  const lookDist = 5.0;

  for (let aDeg = -30; aDeg <= 30; aDeg += 2) {
    const rad = aDeg * Math.PI / 180;
    const testTx = tx * Math.cos(rad) - tz * Math.sin(rad);
    const testTz = tx * Math.sin(rad) + tz * Math.cos(rad);
    const testX = curX + testTx * lookDist;
    const testZ = curZ + testTz * lookDist;
    const hit = snapToCenterline(testX, testZ, testTx, testTz);
    if (hit) {
      // Prioritize continuity and proper road width (~12-16m)
      const widthScore = 15 - Math.abs(hit.width - 14);
      const score = 50 + widthScore - Math.abs(aDeg) * 1.5;
      if (score > maxForwardRoad) {
        maxForwardRoad = score;
        bestAngle = rad;
      }
    }
  }

  if (maxForwardRoad < 0) {
    console.log(`No valid forward direction at s=${s}m, pos=(${curX.toFixed(1)}, ${curZ.toFixed(1)})`);
    break;
  }

  const newTx = tx * Math.cos(bestAngle) - tz * Math.sin(bestAngle);
  const newTz = tx * Math.sin(bestAngle) + tz * Math.cos(bestAngle);
  const len = Math.hypot(newTx, newTz);
  tx = newTx / len;
  tz = newTz / len;

  curX += tx * 2.0;
  curZ += tz * 2.0;

  if (s % 200 === 0) {
    console.log(`s=${s.toString().padStart(4)}m | pos=(${curX.toFixed(1).padStart(6)}, ${curZ.toFixed(1).padStart(6)}) | Y=${snapped.y.toFixed(2).padStart(6)} | w=${snapped.width.toFixed(1)}m | hdg=${(Math.atan2(tz, tx)*180/Math.PI).toFixed(0)}deg`);
  }
}

fs.writeFileSync('scratch/snapped_path.json', JSON.stringify(path, null, 2));
console.log(`Saved ${path.length} points.`);
