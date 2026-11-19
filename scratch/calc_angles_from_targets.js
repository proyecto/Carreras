const fs = require('fs');

const s = fs.readFileSync('scratch/check_full_targets.js', 'utf8');
const { targets } = new Function('require', s + '; return { targets };')(require);

console.log('Calculating angles and distances along waypoints:');
let totalDist = 0;
let prevTh = 0;
let totalAngle = 0;

for (let i = 0; i < targets.length - 1; i++) {
  const p1 = targets[i], p2 = targets[i+1];
  const dx = p2.x - p1.x, dz = p2.z - p1.z;
  const d = Math.hypot(dx, dz);
  totalDist += d;
  const th = Math.atan2(dz, dx);
  let dth = th - prevTh;
  while (dth > Math.PI) dth -= 2 * Math.PI;
  while (dth < -Math.PI) dth += 2 * Math.PI;
  totalAngle += dth;
  prevTh = th;
  console.log(`${i.toString().padStart(2)} -> ${(i+1).toString().padStart(2)}: dist=${d.toFixed(1).padStart(5)}m | th=${(th*180/Math.PI).toFixed(0).padStart(4)} deg | turn=${(dth*180/Math.PI).toFixed(0).padStart(4)} deg | ${p1.name} -> ${p2.name}`);
}

console.log(`\nTotal distance: ${totalDist.toFixed(1)}m, Total turn angle: ${(totalAngle*180/Math.PI).toFixed(1)} deg`);
