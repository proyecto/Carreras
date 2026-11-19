const fs = require('fs');
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const { sampleRoadY } = new Function('require', s + '; return { sampleRoadY };')(require);

// Trace from Start/Finish (-60, 0)
// On main straight (x < 390): constrain Z in [-10, 5] so we never drift into pitlane/paddock!
let x = -60, z = -1.0, th = 0;
const loop = [{ x, z, y: sampleRoadY(x, z), th, s: 0 }];
let totalS = 0;

for (let step = 0; step < 1000; step++) {
  let best = null;
  const lookahead = 7.0;
  
  for (let dth = -1.2; dth <= 1.2; dth += 0.05) {
    const testTh = th + dth;
    const fx = x + lookahead * Math.cos(testTh);
    const fz = z + lookahead * Math.sin(testTh);
    
    // Check road width perpendicular
    const nx = -Math.sin(testTh), nz = Math.cos(testTh);
    let minLat = 0, maxLat = 0, count = 0;
    for (let lat = -12; lat <= 12; lat += 0.5) {
      const qx = fx + lat * nx;
      const qz = fz + lat * nz;
      // Constraint on main straight
      if (fx < 380 && (qz > 7 || qz < -12)) continue;
      if (sampleRoadY(qx, qz) !== null) {
        if (count === 0 || lat < minLat) minLat = lat;
        if (count === 0 || lat > maxLat) maxLat = lat;
        count++;
      }
    }
    if (count >= 10) {
      const width = maxLat - minLat;
      const cLat = (minLat + maxLat) / 2;
      const score = -Math.abs(cLat) * 3 - Math.abs(dth) * 4 - Math.abs(width - 14) * 0.2;
      if (!best || score > best.score) {
        best = { x: fx + cLat * nx, z: fz + cLat * nz, th: testTh, width, score };
      }
    }
  }
  
  if (!best) {
    console.log(`Stopped at step ${step} pos: (${x.toFixed(1)}, ${z.toFixed(1)}) th: ${(th*180/Math.PI).toFixed(0)}`);
    break;
  }
  
  const ds = Math.hypot(best.x - x, best.z - z);
  totalS += ds;
  x = best.x; z = best.z;
  th = Math.atan2(z - loop[loop.length - 1].z, x - loop[loop.length - 1].x);
  const y = sampleRoadY(x, z);
  loop.push({ x, z, y, th, s: totalS, width: best.width });
  
  // Close loop back to (-60, -1)
  if (totalS > 3000 && Math.hypot(x - (-60), z - (-1)) < 15 && Math.abs(th) < 0.4) {
    console.log(`\n🎉 LOOP SUCCESSFULLY CLOSED at step ${step}! Total distance = ${totalS.toFixed(1)}m`);
    break;
  }
}

console.log(`Total loop points: ${loop.length}, Length: ${totalS.toFixed(1)}m`);
fs.writeFileSync('scratch/perfect_circuit_loop.json', JSON.stringify(loop, null, 2));

for (let i = 0; i < loop.length; i += 25) {
  const p = loop[i];
  console.log(`s=${p.s.toFixed(0).padStart(4)}m | pos=(${p.x.toFixed(1).padStart(6)}, ${p.z.toFixed(1).padStart(6)}) Y=${p.y ? p.y.toFixed(2) : 'NULL'} | th=${(p.th*180/Math.PI).toFixed(0).padStart(4)} deg`);
}
const last = loop[loop.length - 1];
console.log(`Last: s=${last.s.toFixed(0)}m pos=(${last.x.toFixed(1)}, ${last.z.toFixed(1)}) Y=${last.y ? last.y.toFixed(2) : 'NULL'} th=${(last.th*180/Math.PI).toFixed(0)} deg`);
