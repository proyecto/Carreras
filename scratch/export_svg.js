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

// All asphalt road primitives:
const roadPrims = [11, 12, 13, 14, 16, 27, 33, 37, 39];
const linesSVG = [];
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
      linesSVG.push(`<polygon points="${pt0[0].toFixed(1)},${pt0[2].toFixed(1)} ${pt1[0].toFixed(1)},${pt1[2].toFixed(1)} ${pt2[0].toFixed(1)},${pt2[2].toFixed(1)}" fill="#444" stroke="#555" stroke-width="0.2"/>`);
    }
  }
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-450 -300 1700 700" width="1700" height="700">
  <rect x="-450" y="-300" width="1700" height="700" fill="#111"/>
  ${linesSVG.join('\n  ')}
</svg>`;

fs.writeFileSync('scratch/track_mesh.svg', svg);
console.log(`Wrote scratch/track_mesh.svg with ${linesSVG.length} road triangles.`);
