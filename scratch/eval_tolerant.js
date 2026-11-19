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

// Check if a point (px, pz) with heading th is on the road (searching across width +/- 6m)
function sampleRoadNear(px, pz, th) {
  const y0 = sampleRoadY(px, pz);
  if (y0 !== null) return { y: y0, latOffset: 0 };
  const nx = -Math.sin(th), nz = Math.cos(th);
  for (let d = 0.5; d <= 6.0; d += 0.5) {
    const yP = sampleRoadY(px + d * nx, pz + d * nz);
    if (yP !== null) return { y: yP, latOffset: d };
    const yM = sampleRoadY(px - d * nx, pz - d * nz);
    if (yM !== null) return { y: yM, latOffset: -d };
  }
  return null;
}

function evaluateCandidate(segments) {
  let x = -60, z = -2, th = 0;
  let totalDev = 0, hits = 0, misses = 0;

  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const sg = segments[sIdx];
    if (sg[0] === 'S') {
      const L = sg[1];
      const steps = Math.max(2, Math.round(L / 5));
      for (let i = 1; i <= steps; i++) {
        const t = (i / steps) * L;
        const px = x + Math.cos(th) * t;
        const pz = z + Math.sin(th) * t;
        const hit = sampleRoadNear(px, pz, th);
        if (hit !== null) {
          hits++;
          totalDev += Math.abs(hit.y - (sg[2] ?? 0)) + Math.abs(hit.latOffset) * 0.5;
        } else {
          misses++;
          totalDev += 50.0;
        }
      }
      x += Math.cos(th) * L;
      z += Math.sin(th) * L;
    } else {
      const R = sg[1], a = sg[2] * Math.PI / 180, L = Math.abs(a) * R, sgn = Math.sign(a);
      const cx = x - Math.sin(th) * R * sgn, cz = z + Math.cos(th) * R * sgn;
      const steps = Math.max(2, Math.round(L / 5));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const t2 = th + t * a;
        const px = cx + Math.sin(t2) * R * sgn;
        const pz = cz - Math.cos(t2) * R * sgn;
        const hit = sampleRoadNear(px, pz, t2);
        if (hit !== null) {
          hits++;
          totalDev += Math.abs(hit.y - (sg[3] ?? 0)) + Math.abs(hit.latOffset) * 0.5;
        } else {
          misses++;
          totalDev += 50.0;
        }
      }
      th += a;
      x = cx + Math.sin(th) * R * sgn;
      z = cz - Math.cos(th) * R * sgn;
    }
  }

  return { hits, misses, pct: hits / (hits + misses) * 100, x, z, th: th * 180 / Math.PI, totalDev };
}

const testSegs = [
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 140, -8.0],
  ['A', 38, 75, -9.5, 'Yokohama-S'],
];

console.log('Test start with tolerance:');
console.log(evaluateCandidate(testSegs));
