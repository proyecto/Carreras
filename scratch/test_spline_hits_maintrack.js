const trackSpec = {"id":"nurburgring-gp","name":"Nürburgring GP","subtitle":"GP-Strecke","specs":"5,15 km · 16 curvas · Ancho FIA GT3 · Trazado oficial de Gran Premio","storageKey":"mejor-nurburgring-gp","glb":"tracks/nurburgring-gp.glb","glbOptions":{"transform":{"yaw":1.5707963267948966,"pos":[580.5,-65.03,-24.52]}},"hw":7.2,"startS":-18,"startD":-2,"pit":{"s0":-120,"s1":240,"wallD":12.5,"laneD0":13.5,"laneD1":22,"bldS0":-75,"bldS1":95,"bldD0":22.8,"bldD1":38,"padD1":62},"stand":{"s0":-90,"s1":90,"d0":-18.5,"d1":-42},"segments":[["S",730,0],["A",75,100,-5,"Yokohama-S"],["S",45,-8],["A",85,-70,-11,"Castrol-Bogen"],["S",60,-12],["A",55,125,-9,"Mercedes-Arena 1"],["S",50,-8],["A",70,-75,-6,"Mercedes-Arena 2"],["S",60,-5],["A",85,60,-3,"Mercedes-Arena Exit"],["S",240,0],["A",110,60,2,"Ford-Kurve"],["S",220,4],["A",65,-120,0,"Dunlop-Kehre"],["S",320,6],["A",160,45,12,"Schumacher-S 1"],["A",160,-45,18,"Schumacher-S 2"],["A",120,100,22,"Kumho-Kurve"],["S","Lw",20],["A",130,90,14,"Bit-Kurve"],["S","Ln",8],["A",50,-40,4,"Veedol-Schikane 1"],["A",50,80,2,"Veedol-Schikane 2"],["A",50,-40,1,"Veedol-Schikane 3"],["A",85,90,0,"Coca-Cola-Kurve"],["S",280,0]],"sun":{"elDeg":32,"azDeg":145,"colorElDeg":28},"wet":[[1550,1750,0.85],[3650,3850,0.7]],"tvTowers":[[320,-1,7,6.5],[820,1,6.5,6],[1350,-1,7,6],[1850,1,7,6.5],[2450,-1,7,6],[3150,1,6.5,6],[4200,-1,7,6.5],[4850,1,7,6]],"billboards":[[220,450,-1,18,7,1.6,1.05,false],[1950,2250,1,24,7,1.6,1.05,false],[3400,3650,-1,20,7,1.6,1.05,false],[-110,-90,-1,8,7,1.6,1.05,false]],"gantries":[380,2600],"poses":[{"nome":"coche-frontal-34","tipo":"coche","s":180,"d":-1,"yaw":3.75,"ojo":[5.2,1.45,-3.5],"blanco":[0.1,0.75,0],"fov":0.5},{"nome":"coche-trasera-34","tipo":"coche","s":180,"d":-1,"yaw":0.61,"ojo":[-5.3,1.85,3.6],"blanco":[-0.1,0.85,0],"fov":0.5},{"nome":"coche-lateral-baja","tipo":"coche","s":180,"d":-1,"yaw":2.1,"ojo":[1,0.65,-5.5],"blanco":[0.05,0.85,0],"fov":0.6}],"replayB64":null};
const fs = require('fs');

// We have fast_sampler logic
const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

const roadPrimIndices = [0, 1, 13, 11, 37, 9, 32, 10]; // all track surface primitives
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
const ox = -36.54, oz = -600.0, oth = PI / 2;
/* replaced */
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
