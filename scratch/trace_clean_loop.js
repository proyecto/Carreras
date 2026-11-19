const fs = require('fs');
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const { sampleRoadY } = new Function('require', s + '; return { sampleRoadY };')(require);

// We want to find the road centerline around the entire loop:
// Let's write an algorithm that explores the road:
// Given a current point (x, z) on road, and heading th:
// Step forward by stepSize = 10m:
// Find all road points in a fan at distance R=10m:
// for dth in [-80 deg .. +80 deg]
// Find the center of the road strip.
function getRoadCrossSection(px, pz, th, radius = 10.0) {
  // Test forward points in fan
  const candidates = [];
  for (let dth = -Math.PI * 0.45; dth <= Math.PI * 0.45; dth += 0.05) {
    const testTh = th + dth;
    const fx = px + radius * Math.cos(testTh);
    const fz = pz + radius * Math.sin(testTh);
    
    // Perpendicular check to measure width
    const nx = -Math.sin(testTh), nz = Math.cos(testTh);
    let minLat = 0, maxLat = 0, count = 0;
    for (let lat = -15; lat <= 15; lat += 0.5) {
      const qx = fx + lat * nx;
      const qz = fz + lat * nz;
      if (sampleRoadY(qx, qz) !== null) {
        if (count === 0 || lat < minLat) minLat = lat;
        if (count === 0 || lat > maxLat) maxLat = lat;
        count++;
      }
    }
    if (count >= 10) {
      const width = maxLat - minLat;
      const centerLat = (minLat + maxLat) / 2;
      candidates.push({
        dth,
        width,
        centerLat,
        x: fx + centerLat * nx,
        z: fz + centerLat * nz,
        th: testTh,
        score: -Math.abs(centerLat) * 2 - Math.abs(dth) * 8 - Math.abs(width - 15) * 0.2
      });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

// Start on main straight:
// Avoid paddock by enforcing Z in [-10, 5] for the main straight
let x = -60, z = 0, th = 0;
const loop = [{ x, z, y: sampleRoadY(x, z), th, s: 0 }];
let totalS = 0;

for (let i = 0; i < 600; i++) {
  const next = getRoadCrossSection(x, z, th, 10.0);
  if (!next) {
    console.log('Lost road at step ' + i + ' pos: (' + x.toFixed(1) + ', ' + z.toFixed(1) + ')');
    break;
  }
  const ds = Math.hypot(next.x - x, next.z - z);
  totalS += ds;
  x = next.x;
  z = next.z;
  th = Math.atan2(z - loop[loop.length - 1].z, x - loop[loop.length - 1].x);
  const y = sampleRoadY(x, z);
  loop.push({ x, z, y, th, s: totalS, width: next.width });
  
  // Check loop completion
  if (totalS > 2000 && Math.hypot(x - (-60), z - 0) < 25) {
    console.log('LOOP COMPLETED at step ' + i + '! Length = ' + totalS.toFixed(1) + 'm');
    break;
  }
}

console.log('Total points: ' + loop.length + ', Total S: ' + totalS.toFixed(1) + 'm');
fs.writeFileSync('scratch/clean_loop.json', JSON.stringify(loop, null, 2));

for (let i = 0; i < loop.length; i += 10) {
  const p = loop[i];
  console.log(`s=${p.s.toFixed(0).padStart(4)}m | pos=(${p.x.toFixed(1).padStart(6)}, ${p.z.toFixed(1).padStart(6)}) Y=${p.y ? p.y.toFixed(2) : 'NULL'} | th=${(p.th*180/Math.PI).toFixed(0)} deg`);
}
