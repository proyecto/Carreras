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

// All asphalt road primitives
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

console.log(`Loaded ${triangles.length} road triangles.`);

// Rasterize into 1m grid
const minX = -450, maxX = 1250, minZ = -300, maxZ = 400;
const scale = 1.0; // 1 meter per cell
const W = Math.round((maxX - minX) * scale);
const H = Math.round((maxZ - minZ) * scale);
const mask = new Uint8Array(W * H);
const yGrid = new Float32Array(W * H);

console.log(`Rasterizing into ${W}x${H} grid...`);

// Rasterize each triangle
function edgeFunc(ax, ay, bx, by, cx, cy) {
  return (cx - ax) * (by - ay) - (cy - ay) * (bx - ax);
}

for (const [p0, p1, p2] of triangles) {
  const x0 = (p0[0] - minX) * scale, z0 = (p0[2] - minZ) * scale;
  const x1 = (p1[0] - minX) * scale, z1 = (p1[2] - minZ) * scale;
  const x2 = (p2[0] - minX) * scale, z2 = (p2[2] - minZ) * scale;

  const bMinX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
  const bMaxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
  const bMinZ = Math.max(0, Math.floor(Math.min(z0, z1, z2)));
  const bMaxZ = Math.min(H - 1, Math.ceil(Math.max(z0, z1, z2)));

  // Triangle area for interpolation
  const area = edgeFunc(x0, z0, x1, z1, x2, z2);
  if (Math.abs(area) < 1e-5) continue;

  for (let z = bMinZ; z <= bMaxZ; z++) {
    for (let x = bMinX; x <= bMaxX; x++) {
      const px = x + 0.5, pz = z + 0.5;
      const w0 = edgeFunc(x1, z1, x2, z2, px, pz);
      const w1 = edgeFunc(x2, z2, x0, z0, px, pz);
      const w2 = edgeFunc(x0, z0, x1, z1, px, pz);

      if ((area > 0 && w0 >= 0 && w1 >= 0 && w2 >= 0) ||
          (area < 0 && w0 <= 0 && w1 <= 0 && w2 <= 0)) {
        const idx = z * W + x;
        mask[idx] = 1;
        const b0 = w0 / area, b1 = w1 / area, b2 = w2 / area;
        const y = b0 * p0[1] + b1 * p1[1] + b2 * p2[1];
        if (yGrid[idx] === 0 || y > yGrid[idx]) {
          yGrid[idx] = y;
        }
      }
    }
  }
}

let roadCells = 0;
for (let i = 0; i < mask.length; i++) if (mask[i]) roadCells++;
console.log(`Rasterized: ${roadCells} road cells (${(roadCells / (W * H) * 100).toFixed(2)}% of map).`);

// Compute Distance Transform (distance to boundary inside road)
const dist = new Float32Array(W * H);
const INF = 1e6;
for (let i = 0; i < W * H; i++) dist[i] = mask[i] ? INF : 0;

// 2-pass distance transform (Chamfer metric)
for (let z = 1; z < H; z++) {
  for (let x = 1; x < W - 1; x++) {
    const idx = z * W + x;
    if (dist[idx] > 0) {
      dist[idx] = Math.min(
        dist[idx],
        dist[idx - 1] + 1,
        dist[idx - W] + 1,
        dist[idx - W - 1] + 1.414,
        dist[idx - W + 1] + 1.414
      );
    }
  }
}

for (let z = H - 2; z >= 0; z--) {
  for (let x = W - 2; x >= 1; x--) {
    const idx = z * W + x;
    if (dist[idx] > 0) {
      dist[idx] = Math.min(
        dist[idx],
        dist[idx + 1] + 1,
        dist[idx + W] + 1,
        dist[idx + W + 1] + 1.414,
        dist[idx + W - 1] + 1.414
      );
    }
  }
}

let maxD = 0;
for (let i = 0; i < W * H; i++) if (dist[i] > maxD) maxD = dist[i];
console.log(`Max road distance from edge: ${maxD.toFixed(1)}m (expected ~7m for 14m road).`);

// Trace centerline along the distance ridge!
// Start at start line: X = -60, Z = -2
let currX = -60, currZ = -2.0;
let dirX = 1, dirZ = 0;
const stepM = 2.0;
const centerline = [];

console.log('Tracing ridge of distance transform...');
for (let step = 0; step < 3000; step++) {
  const gx = Math.round((currX - minX) * scale);
  const gz = Math.round((currZ - minZ) * scale);
  const idx = gz * W + gx;
  const dVal = (gx >= 0 && gx < W && gz >= 0 && gz < H) ? dist[idx] : 0;
  const yVal = (gx >= 0 && gx < W && gz >= 0 && gz < H) ? yGrid[idx] : 0;

  centerline.push({
    s: step * stepM,
    x: currX,
    y: yVal,
    z: currZ,
    width: dVal * 2
  });

  if (step > 150 && Math.hypot(currX - (-60), currZ - (-2.0)) < 8.0) {
    console.log(`Centerline loop completed at step ${step}! Total lap length: ${(step * stepM).toFixed(1)}m`);
    break;
  }

  // Look ahead in arc of directions [-45 deg, +45 deg] at radius stepM
  let bestDir = {x: dirX, z: dirZ};
  let bestScore = -Infinity;

  for (let aDeg = -50; aDeg <= 50; aDeg += 2) {
    const a = aDeg * Math.PI / 180;
    const c = Math.cos(a), s = Math.sin(a);
    const ndx = dirX * c - dirZ * s;
    const ndz = dirX * s + dirZ * c;

    const testX = currX + ndx * stepM;
    const testZ = currZ + ndz * stepM;

    const tgx = Math.round((testX - minX) * scale);
    const tgz = Math.round((testZ - minZ) * scale);

    if (tgx >= 0 && tgx < W && tgz >= 0 && tgz < H) {
      const td = dist[tgz * W + tgx];
      // Score: high distance from edge (center of road) + penalty for sharp turns
      const score = td * 10 - Math.abs(aDeg) * 0.15;
      if (score > bestScore) {
        bestScore = score;
        bestDir = {x: ndx, z: ndz};
      }
    }
  }

  dirX = bestDir.x;
  dirZ = bestDir.z;
  currX += dirX * stepM;
  currZ += dirZ * stepM;

  if (step % 100 === 0) {
    console.log(`Step ${step} (${(step * stepM).toFixed(0)}m): pos=(${currX.toFixed(1)}, ${currZ.toFixed(1)}), Y=${yVal.toFixed(2)}, dist=${dVal.toFixed(1)}m`);
  }
}

fs.writeFileSync('scratch/perfect_centerline.json', JSON.stringify(centerline, null, 2));
console.log(`Saved ${centerline.length} centerline points to scratch/perfect_centerline.json.`);
