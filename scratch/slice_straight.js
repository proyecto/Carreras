const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

const p = gltf.meshes[1].primitives[13];
const posAcc = gltf.accessors[p.attributes.POSITION];
const idxAcc = gltf.accessors[p.indices];

const bvP = gltf.bufferViews[posAcc.bufferView];
const f32P = new Float32Array(buf.buffer, buf.byteOffset + binOffset + (bvP.byteOffset || 0) + (posAcc.byteOffset || 0), posAcc.count * 3);

const bvI = gltf.bufferViews[idxAcc.bufferView];
const offI = binOffset + (bvI.byteOffset || 0) + (idxAcc.byteOffset || 0);
let indices = idxAcc.componentType === 5123
  ? new Uint16Array(buf.buffer, buf.byteOffset + offI, idxAcc.count)
  : new Uint32Array(buf.buffer, buf.byteOffset + offI, idxAcc.count);

// Convert all triangles to world coords
const triangles = [];
for (let t = 0; t < indices.length / 3; t++) {
  const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2];
  const p0 = [f32P[i0 * 3], -f32P[i0 * 3 + 2], f32P[i0 * 3 + 1]];
  const p1 = [f32P[i1 * 3], -f32P[i1 * 3 + 2], f32P[i1 * 3 + 1]];
  const p2 = [f32P[i2 * 3], -f32P[i2 * 3 + 2], f32P[i2 * 3 + 1]];
  triangles.push([p0, p1, p2]);
}

// Function to find intersection of mesh with plane:
// plane through point `P` with normal `N` (in 2D or 3D)
// Let's test cross-sections at Z = -600, -500, -400, -300, -200, -100, 0, 100
for (let z = -600; z <= 100; z += 100) {
  const segs = [];
  for (const [p0, p1, p2] of triangles) {
    const pts = [p0, p1, p2];
    const d0 = p0[2] - z, d1 = p1[2] - z, d2 = p2[2] - z;
    // Check if triangle crosses plane z = const
    if ((d0 > 0 && d1 > 0 && d2 > 0) || (d0 < 0 && d1 < 0 && d2 < 0)) continue;
    
    // Find intersection points of triangle edges with plane z
    const inters = [];
    const edges = [[p0, p1, d0, d1], [p1, p2, d1, d2], [p2, p0, d2, d0]];
    for (const [a, b, da, db] of edges) {
      if ((da <= 0 && db >= 0) || (da >= 0 && db <= 0)) {
        if (Math.abs(db - da) > 1e-6) {
          const t = -da / (db - da);
          if (t >= 0 && t <= 1) {
            inters.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z]);
          }
        }
      }
    }
    if (inters.length >= 2) {
      segs.push(inters);
    }
  }
  // Filter segments near the main straight (X between -40 and 0)
  const trackInters = [];
  for (const [pt1, pt2] of segs) {
    if (pt1[0] > -40 && pt1[0] < 0 && pt2[0] > -40 && pt2[0] < 0) {
      trackInters.push(pt1, pt2);
    }
  }
  if (trackInters.length > 0) {
    let minX = Infinity, maxX = -Infinity, avgY = 0;
    for (const pt of trackInters) {
      if (pt[0] < minX) minX = pt[0];
      if (pt[0] > maxX) maxX = pt[0];
      avgY += pt[1];
    }
    avgY /= trackInters.length;
    console.log(`Z = ${z}: X in [${minX.toFixed(2)}, ${maxX.toFixed(2)}] (width: ${(maxX - minX).toFixed(2)}m), Center X: ${((minX + maxX) / 2).toFixed(2)}, Y: ${avgY.toFixed(2)}`);
  }
}
