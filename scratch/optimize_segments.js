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

// Measure road fit for a sequence of segments
function scoreWalk(segments) {
  let x = -60, z = 0, th = 0;
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
        const y = sampleRoadY(px, pz);
        if (y !== null) {
          hits++;
          totalDev += Math.abs(y - (sg[2] ?? 0));
        } else {
          misses++;
          totalDev += 25.0;
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
        const y = sampleRoadY(px, pz);
        if (y !== null) {
          hits++;
          totalDev += Math.abs(y - (sg[3] ?? 0));
        } else {
          misses++;
          totalDev += 25.0;
        }
      }
      th += a;
      x = cx + Math.sin(th) * R * sgn;
      z = cz - Math.cos(th) * R * sgn;
    }
  }

  return { hits, misses, pct: hits / (hits + misses) * 100, x, z, th: th * 180 / Math.PI, totalDev };
}

// Initial segments up to Yokohama-S
const confirmedSegs = [
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 140, -8.0],
  ['A', 38, 75, -9.5, 'Yokohama-S'],
];

console.log('Confirmed start:', scoreWalk(confirmedSegs));

// Step-by-step search function
function findBestNextArc(currentSegs, R_range, angle_range, elev) {
  let best = null, bestScore = Infinity;
  for (let R of R_range) {
    for (let ang of angle_range) {
      const cand = [...currentSegs, ['A', R, ang, elev, 'test']];
      const res = scoreWalk(cand);
      if (res.misses === 0 && res.totalDev < bestScore) {
        bestScore = res.totalDev;
        best = { R, ang, elev, ...res };
      }
    }
  }
  return best;
}

function findBestNextStraight(currentSegs, L_range, elev) {
  let best = null, bestScore = Infinity;
  for (let L of L_range) {
    const cand = [...currentSegs, ['S', L, elev]];
    const res = scoreWalk(cand);
    if (res.misses === 0 && res.totalDev < bestScore) {
      bestScore = res.totalDev;
      best = { L, elev, ...res };
    }
  }
  return best;
}

// Test arc after Yokohama-S
console.log('Searching next arc after Yokohama-S...');
const rRange = [25, 30, 35, 40, 45, 50, 60, 70, 80];
const aRange = [-120, -100, -90, -80, -70, -60, -50, -40, 40, 50, 60, 70, 80, 90, 100, 120];
const nextArc = findBestNextArc(confirmedSegs, rRange, aRange, -9.5);
console.log('Best next arc:', nextArc);
