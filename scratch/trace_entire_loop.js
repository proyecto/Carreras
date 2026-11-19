const fs = require('fs');
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const { sampleRoadY } = new Function('require', s + '; return { sampleRoadY };')(require);

let x = -60, z = 0, th = 0;
const path = [{ x, z, y: sampleRoadY(x, z), th, s: 0, width: 14 }];
let totalS = 0;

for (let step = 0; step < 1200; step++) {
  let bestNext = null;
  let bestScore = -1e9;
  
  const lookahead = 6.0;
  for (let dth = -0.6; dth <= 0.6; dth += 0.05) {
    const testTh = th + dth;
    const fx = x + lookahead * Math.cos(testTh);
    const fz = z + lookahead * Math.sin(testTh);
    
    const nx = -Math.sin(testTh), nz = Math.cos(testTh);
    let minLat = 0, maxLat = 0, count = 0;
    for (let lat = -20; lat <= 20; lat += 0.5) {
      const qx = fx + lat * nx;
      const qz = fz + lat * nz;
      if (sampleRoadY(qx, qz) !== null) {
        if (count === 0 || lat < minLat) minLat = lat;
        if (count === 0 || lat > maxLat) maxLat = lat;
        count++;
      }
    }
    
    if (count >= 8) {
      const width = maxLat - minLat;
      const centerLat = (minLat + maxLat) / 2;
      const score = -(centerLat * centerLat) * 2 - Math.abs(dth) * 5;
      if (score > bestScore) {
        bestScore = score;
        bestNext = {
          x: fx + centerLat * nx,
          z: fz + centerLat * nz,
          th: testTh,
          width
        };
      }
    }
  }
  
  if (!bestNext) {
    console.log('Lost road at step ' + step + ', pos: (' + x.toFixed(1) + ', ' + z.toFixed(1) + ')');
    break;
  }
  
  const ds = Math.hypot(bestNext.x - x, bestNext.z - z);
  totalS += ds;
  x = bestNext.x;
  z = bestNext.z;
  th = Math.atan2(bestNext.z - path[path.length-1].z, bestNext.x - path[path.length-1].x);
  const y = sampleRoadY(x, z);
  path.push({ x, z, y, th, s: totalS, width: bestNext.width });
  
  if (totalS > 1500 && Math.hypot(x - (-60), z - 0) < 15) {
    console.log('SUCCESSFULLY LOOPED BACK TO START at totalS = ' + totalS.toFixed(1) + 'm after ' + step + ' steps!');
    break;
  }
}

console.log('Traced ' + path.length + ' points, total length = ' + totalS.toFixed(1) + 'm');
fs.writeFileSync('scratch/full_traced_loop.json', JSON.stringify(path, null, 2));

for (let i = 0; i < path.length; i += 20) {
  const p = path[i];
  console.log(`s=${p.s.toFixed(0).padStart(4)}m | pos=(${p.x.toFixed(1).padStart(6)}, ${p.z.toFixed(1).padStart(6)}) Y=${p.y ? p.y.toFixed(2) : 'NULL'} | w=${p.width.toFixed(1)}m | th=${(p.th*180/Math.PI).toFixed(1)} deg`);
}
const last = path[path.length - 1];
console.log(`Last point: s=${last.s.toFixed(0)}m pos=(${last.x.toFixed(1)}, ${last.z.toFixed(1)}) Y=${last.y ? last.y.toFixed(2) : 'NULL'}`);
