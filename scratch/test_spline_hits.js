const fs = require('fs');

// We have fast_sampler logic
const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

const roadPrimIndices = [13, 11, 37, 9, 32, 10]; // all track surface primitives
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
    triangles.push([p0, p1, p2]);
  }
}

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
      let list = grid.get(k);
      if (!list) { list = []; grid.set(k, list); }
      list.push(idx);
    }
  }
});

function sampleRoadY(qx, qz) {
  const cx = Math.floor(qx / cellSize);
  const cz = Math.floor(qz / cellSize);
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
      if (y < 80 && (bestY === null || y > bestY)) {
        bestY = y;
      }
    }
  }
  return bestY;
}

// Generate points from spline
const PI = Math.PI;
const ox = -22.84, oz = -600.0, oth = PI / 2;
const content = fs.readFileSync('tracks/nurburgring-gp.js', 'utf8');
let trackSpec;
eval(content.replace('TRACKS.register', 'trackSpec = '));
const def = trackSpec.segments;

const walk = (Lw, Ln, emit) => {
  let x = ox, z = oz, th = oth, s = 0;
  for (const sg of def) {
    const s0 = s;
    if (sg[0] === 'S') {
      const L = sg[1] === 'Lw' ? Lw : sg[1] === 'Ln' ? Ln : sg[1];
      if (emit) emit(sg, s0, L, x, z, th, 0);
      x += Math.cos(th) * L; z += Math.sin(th) * L; s += L;
    } else {
      const R = sg[1], a = sg[2] * PI / 180, L = Math.abs(a) * R, sgn = Math.sign(a);
      if (emit) emit(sg, s0, L, x, z, th, sgn / R);
      const cx = x - Math.sin(th) * R * sgn, cz = z + Math.cos(th) * R * sgn;
      th += a; x = cx + Math.sin(th) * R * sgn; z = cz - Math.cos(th) * R * sgn; s += L;
    }
  }
  return [x, z, s];
};

const p0 = walk(0, 0), pw = walk(1, 0), pn = walk(0, 1);
const a = pw[0] - p0[0], b = pn[0] - p0[0], c = pw[1] - p0[1], d = pn[1] - p0[1], ex = ox - p0[0], ez = oz - p0[1], det = a * d - b * c;
const Lw = (ex * d - b * ez) / det, Ln = (a * ez - c * ex) / det;

const sampled = [];
walk(Lw, Ln, (sg, s0, L, x, z, th, k) => {
  const n = Math.max(1, Math.round(L / 2));
  for (let i = 0; i < n; i++) {
    const t = i / n * L;
    if (k === 0) sampled.push({ name: sg[4] || '', s: s0 + t, x: x + Math.cos(th) * t, z: z + Math.sin(th) * t });
    else {
      const R = 1 / Math.abs(k), sgn = Math.sign(k), cx = x - Math.sin(th) * R * sgn, cz = z + Math.cos(th) * R * sgn, t2 = th + t * k;
      sampled.push({ name: sg[4] || '', s: s0 + t, x: cx + Math.sin(t2) * R * sgn, z: cz - Math.cos(t2) * R * sgn });
    }
  }
});

let hitCount = 0;
let missing = [];
for (let i = 0; i < sampled.length; i += 10) {
  const pt = sampled[i];
  const y = sampleRoadY(pt.x, pt.z);
  if (y !== null) {
    hitCount++;
  } else {
    missing.push(pt);
  }
}
console.log(`Spline points sampled: ${sampled.length}. Every 10th checked: ${Math.floor(sampled.length / 10)}, Hits on GLB mesh: ${hitCount}, Misses: ${missing.length}`);
if (missing.length > 0) {
  console.log('Sample misses:', missing.slice(0, 5));
}
