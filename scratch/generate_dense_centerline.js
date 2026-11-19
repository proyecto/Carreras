const fs = require('fs');
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const { sampleRoadY } = new Function('require', s + '; return { sampleRoadY };')(require);

const sT = fs.readFileSync('scratch/check_full_targets.js', 'utf8');
const { targets } = new Function('require', sT + '; return { targets };')(require);

// Waypoint-guided tracer
// Between targets[targetIdx] and targets[targetIdx+1], trace with stepSize ~2m
const loop = [];
let totalS = 0;

for (let tIdx = 0; tIdx < targets.length - 1; tIdx++) {
  const pA = targets[tIdx], pB = targets[tIdx+1];
  const segDist = Math.hypot(pB.x - pA.x, pB.z - pA.z);
  const nSteps = Math.max(1, Math.round(segDist / 2.0));
  
  for (let step = 0; step < nSteps; step++) {
    const f = step / nSteps;
    const qx = pA.x + (pB.x - pA.x) * f;
    const qz = pA.z + (pB.z - pA.z) * f;
    const dirX = (pB.x - pA.x) / segDist;
    const dirZ = (pB.z - pA.z) / segDist;
    const th = Math.atan2(dirZ, dirX);
    const nx = -dirZ, nz = dirX;
    
    // Find exact lateral road center around (qx, qz)
    let minLat = 0, maxLat = 0, count = 0;
    for (let lat = -12; lat <= 12; lat += 0.5) {
      const rx = qx + lat * nx, rz = qz + lat * nz;
      if (sampleRoadY(rx, rz) !== null) {
        if (count === 0 || lat < minLat) minLat = lat;
        if (count === 0 || lat > maxLat) maxLat = lat;
        count++;
      }
    }
    
    let cx = qx, cz = qz, width = 14;
    if (count >= 6) {
      width = maxLat - minLat;
      const cLat = (minLat + maxLat) / 2;
      cx = qx + cLat * nx;
      cz = qz + cLat * nz;
    }
    
    const y = sampleRoadY(cx, cz);
    if (loop.length > 0) {
      totalS += Math.hypot(cx - loop[loop.length - 1].x, cz - loop[loop.length - 1].z);
    }
    loop.push({ x: cx, z: cz, y, th, s: totalS, width });
  }
}

// Add final closing point
const last = targets[targets.length - 1];
totalS += Math.hypot(last.x - loop[loop.length - 1].x, last.z - loop[loop.length - 1].z);
loop.push({ x: last.x, z: last.z, y: sampleRoadY(last.x, last.z), th: 0, s: totalS, width: 14 });

console.log(`Successfully generated dense road centerline: ${loop.length} points, total length = ${totalS.toFixed(1)}m`);

let validY = 0;
loop.forEach(p => { if (p.y !== null) validY++; });
console.log(`Valid road surface hits: ${validY}/${loop.length} (${(validY/loop.length*100).toFixed(1)}%)`);

fs.writeFileSync('scratch/dense_road_centerline.json', JSON.stringify(loop, null, 2));

// Print profile around the track every 150m
for (let i = 0; i < loop.length; i += 75) {
  const p = loop[i];
  console.log(`s=${p.s.toFixed(0).padStart(4)}m | pos=(${p.x.toFixed(1).padStart(6)}, ${p.z.toFixed(1).padStart(6)}) Y=${p.y ? p.y.toFixed(2) : 'NULL'} | w=${p.width.toFixed(1)}m | th=${(p.th*180/Math.PI).toFixed(0).padStart(4)} deg`);
}
