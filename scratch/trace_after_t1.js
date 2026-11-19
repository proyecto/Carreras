// measure_t1.js
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

const pt = new Float32Array(3);
const asphaltPts = [];
[1, 13, 37].forEach(pIdx => {
  const p = gltf.meshes[1].primitives[pIdx];
  const posAcc = gltf.accessors[p.attributes.POSITION];
  const bvP = gltf.bufferViews[posAcc.bufferView];
  const f32P = new Float32Array(buf.buffer, buf.byteOffset + binOffset + (bvP.byteOffset || 0) + (posAcc.byteOffset || 0), posAcc.count * 3);
  for (let i = 0; i < posAcc.count; i++) {
    m4point(pt, model, f32P[i*3], f32P[i*3+1], f32P[i*3+2]);
    asphaltPts.push({x: pt[0], y: pt[1], z: pt[2]});
  }
});

// Let's sample the curve through Turn 1:
// Start from (420, 0) and step forward by following the density of asphalt points
let curX = 420, curZ = 0;
let dirX = 1, dirZ = 0;
const path = [{x: curX, y: -8.14, z: curZ}];

for (let s = 0; s < 40; s++) {
  // Candidate step 10m forward in direction (dirX, dirZ) with various angle offsets
  let bestPt = null;
  let maxCount = -1;
  let bestDir = {x: dirX, y: 0, z: dirZ};

  for (let a = -Math.PI/4; a <= Math.PI/2; a += Math.PI/18) {
    const cos = Math.cos(a), sin = Math.sin(a);
    const ndx = dirX * cos - dirZ * sin;
    const ndz = dirX * sin + dirZ * cos;
    const tx = curX + ndx * 12;
    const tz = curZ + ndz * 12;

    const nearby = asphaltPts.filter(p => Math.hypot(p.x - tx, p.z - tz) < 6);
    if (nearby.length > maxCount && nearby.length >= 5) {
      maxCount = nearby.length;
      const avgX = nearby.reduce((sum, p) => sum + p.x, 0) / nearby.length;
      const avgY = nearby.reduce((sum, p) => sum + p.y, 0) / nearby.length;
      const avgZ = nearby.reduce((sum, p) => sum + p.z, 0) / nearby.length;
      bestPt = {x: avgX, y: avgY, z: avgZ};
      bestDir = {x: ndx, y: 0, z: ndz};
    }
  }

  if (!bestPt) break;
  dirX = bestDir.x;
  dirZ = bestDir.z;
  curX = bestPt.x;
  curZ = bestPt.z;
  path.push(bestPt);
}

console.log('Turn 1 path points:');
path.forEach((p, i) => {
  console.log(`pt ${i.toString().padStart(2)}: (${p.x.toFixed(1).padStart(5)}, ${p.z.toFixed(1).padStart(5)}) Y=${p.y.toFixed(2).padStart(6)}m`);
});

console.log('--- Asphalt points in Turn 1 area (x in [400, 520], z in [0, 120]) ---');
const t1Pts = asphaltPts.filter(p => p.x >= 400 && p.x <= 520 && p.z >= -5 && p.z <= 120);
console.log('Count:', t1Pts.length);
// Group by X bins of 10m
for (let bx = 410; bx <= 500; bx += 10) {
  const inBin = t1Pts.filter(p => Math.abs(p.x - bx) < 5);
  if (inBin.length > 0) {
    const minZ = Math.min(...inBin.map(p=>p.z)), maxZ = Math.max(...inBin.map(p=>p.z));
    const avgY = inBin.reduce((s,p)=>s+p.y, 0)/inBin.length;
    console.log('x = ' + bx + 'm: pts=' + inBin.length + ' z=[' + minZ.toFixed(1) + ', ' + maxZ.toFixed(1) + '] Y=' + avgY.toFixed(2));
  }
}

console.log('--- After Yokohama-S apex (around x < 470, z in [60, 150]) ---');
const afterT1 = asphaltPts.filter(p => p.x >= 350 && p.x <= 480 && p.z >= 60 && p.z <= 160);
console.log('Count:', afterT1.length);
// Group by Z bins of 15m
for (let bz = 70; bz <= 150; bz += 15) {
  const inBin = afterT1.filter(p => Math.abs(p.z - bz) < 7.5);
  if (inBin.length > 0) {
    const minX = Math.min(...inBin.map(p=>p.x)), maxX = Math.max(...inBin.map(p=>p.x));
    const avgY = inBin.reduce((s,p)=>s+p.y, 0)/inBin.length;
    console.log('z = ' + bz + 'm: pts=' + inBin.length + ' X=[' + minX.toFixed(1) + ', ' + maxX.toFixed(1) + '] avgX=' + ((minX+maxX)/2).toFixed(1) + ' Y=' + avgY.toFixed(2));
  }
}
