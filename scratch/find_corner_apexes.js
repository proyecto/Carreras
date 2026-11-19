const fs = require('fs');
const vm = require('vm');

const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const { sampleRoadY } = new Function('require', s + '; return { sampleRoadY };')(require);

global.sat = x => Math.max(0, Math.min(1, x));
global.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
global.lerp = (a, b, t) => a + (b - a) * t;
global.smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
global.fbm = () => 0;
global.PI = Math.PI;
global.TRK = {};
vm.runInThisContext(fs.readFileSync('world/track-builder.js', 'utf8'));

const pts = JSON.parse(fs.readFileSync('scratch/dense_road_centerline.json', 'utf8'));
console.log('Loaded', pts.length, 'centerline points.');

// Let us find the key corner vertices (peaks of curvature) in pts:
const curvatures = [];
const win = 15; // 30m window
for (let i = 0; i < pts.length; i++) {
  const pA = pts[(i - win + pts.length) % pts.length];
  const pB = pts[(i + win) % pts.length];
  const pC = pts[i];
  // Angle change
  const thA = Math.atan2(pC.z - pA.z, pC.x - pA.x);
  const thB = Math.atan2(pB.z - pC.z, pB.x - pC.x);
  let dth = thB - thA;
  while (dth > Math.PI) dth -= 2 * Math.PI;
  while (dth < -Math.PI) dth += 2 * Math.PI;
  curvatures.push({ i, s: pC.s, k: dth / (win * 4), x: pC.x, z: pC.z, y: pC.y });
}

// Find local extrema of curvature
const extrema = [];
for (let i = 1; i < curvatures.length - 1; i++) {
  const k = Math.abs(curvatures[i].k);
  if (k > 0.015) { // sharp enough curve (radius < 66m)
    if (k > Math.abs(curvatures[i-1].k) && k > Math.abs(curvatures[i+1].k)) {
      extrema.push(curvatures[i]);
    }
  }
}

console.log(`Found ${extrema.length} corner apexes:`);
extrema.forEach((e, idx) => {
  console.log(`Apex ${idx.toString().padStart(2)}: s=${e.s.toFixed(0).padStart(4)}m pos=(${e.x.toFixed(1).padStart(6)}, ${e.z.toFixed(1).padStart(6)}) Y=${e.y ? e.y.toFixed(2) : 'NULL'} | k=${(e.k*1000).toFixed(1)} (R=${Math.round(1/Math.abs(e.k))}m, ${e.k > 0 ? 'RIGHT' : 'LEFT'})`);
});
