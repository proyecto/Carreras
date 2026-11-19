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

// Load dense target points
const pts = JSON.parse(fs.readFileSync('scratch/dense_road_centerline.json', 'utf8'));

function distanceToDense(x, z) {
  let minD = 1e9;
  // Subsample search
  for (let i = 0; i < pts.length; i += 4) {
    const d2 = (x - pts[i].x)**2 + (z - pts[i].z)**2;
    if (d2 < minD) minD = d2;
  }
  return Math.sqrt(minD);
}

function evaluateSegments(segments) {
  try {
    trackBuild({ hw: 7.2, startS: -18, startD: -2.0, segments });
  } catch (e) {
    return { error: e.message, cost: 1e9 };
  }

  if (TRK.Lw <= 0 || TRK.Ln <= 0) {
    return { error: `Invalid Lw/Ln: ${TRK.Lw.toFixed(1)}, ${TRK.Ln.toFixed(1)}`, cost: 1e9 };
  }

  let totalDist = 0;
  let maxDist = 0;
  let roadHits = 0;
  const step = 4;
  const count = Math.floor(TRK.N / step);

  for (let i = 0; i < TRK.N; i += step) {
    const x = TRK.x[i], z = TRK.z[i], y = TRK.y[i];
    const d = distanceToDense(x, z);
    totalDist += d;
    if (d > maxDist) maxDist = d;
    if (sampleRoadY(x, z) !== null) roadHits++;
  }

  const avgDist = totalDist / count;
  const roadPct = roadHits / count * 100;
  const cost = avgDist * 10 + (100 - roadPct) * 5 + Math.abs(TRK.L - 4180) * 0.05;

  return { cost, avgDist, maxDist, roadPct, L: TRK.L, Lw: TRK.Lw, Ln: TRK.Ln };
}

// Let's do a fast coordinate descent on segment parameters
console.log('Testing segment optimizer...');
module.exports = { evaluateSegments };
