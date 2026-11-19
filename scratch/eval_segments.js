const fs = require('fs');
const vm = require('vm');

// Load GLB triangles
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const { sampleRoadY } = new Function('require', s + '; return { sampleRoadY };')(require);

// Setup trackBuild environment
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

// Test candidate spec
function evaluateSegments(segments) {
  const spec = {
    hw: 7.2,
    startS: -18,
    startD: -2.0,
    segments
  };

  try {
    trackBuild(spec);
  } catch (e) {
    return { error: e.message, score: Infinity };
  }

  // Sample every 5 meters along TRK
  let maxDev = 0;
  let totalDev = 0;
  let sampleCount = 0;
  let missingCount = 0;

  for (let i = 0; i < TRK.N; i += 5) {
    const x = TRK.x[i], z = TRK.z[i], y = TRK.y[i];
    const roadY = sampleRoadY(x, z);
    if (roadY === null) {
      missingCount++;
      totalDev += 50.0; // heavy penalty for being off the road mesh
    } else {
      const vertErr = Math.abs(y - roadY);
      totalDev += vertErr;
      if (vertErr > maxDev) maxDev = vertErr;
    }
    sampleCount++;
  }

  const avgDev = totalDev / sampleCount;
  const onTrackPercent = (sampleCount - missingCount) / sampleCount * 100;
  return {
    lapLength: TRK.L,
    avgDev,
    maxDev,
    onTrackPercent,
    missingCount,
    sampleCount,
    Lw: TRK.Lw,
    Ln: TRK.Ln
  };
}

// Current segments in nurburgring-gp.js
const currentSegs = [
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 140, -8.0],
  ['A', 75, 100, -10.5, 'Yokohama-S'],
  ['S', 45, -8.0],
  ['A', 85, -70, -11.0, 'Castrol-Bogen'],
  ['S', 60, -12.0],
  ['A', 55, 125, -9.0, 'Mercedes-Arena 1'],
  ['S', 50, -8.0],
  ['A', 70, -75, -6.0, 'Mercedes-Arena 2'],
  ['S', 60, -5.0],
  ['A', 85, 60, -3.0, 'Mercedes-Arena Exit'],
  ['S', 240, 0.0],
  ['A', 110, 60, 2.0, 'Ford-Kurve'],
  ['S', 220, 4.0],
  ['A', 65, -120, 0.0, 'Dunlop-Kehre'],
  ['S', 320, 6.0],
  ['A', 160, 45, 12.0, 'Schumacher-S 1'],
  ['A', 160, -45, 18.0, 'Schumacher-S 2'],
  ['A', 120, 100, 22.0, 'Kumho-Kurve'],
  ['S', 'Lw', 20.0],
  ['A', 130, 90, 14.0, 'Bit-Kurve'],
  ['S', 'Ln', 8.0],
  ['A', 50, -40, 4.0, 'Veedol-Schikane 1'],
  ['A', 50, 80, 2.0, 'Veedol-Schikane 2'],
  ['A', 50, -40, 1.0, 'Veedol-Schikane 3'],
  ['A', 85, 90, 0.0, 'Coca-Cola-Kurve'],
  ['S', 280, 0.0],
];

console.log('Evaluating current segments in tracks/nurburgring-gp.js:');
const res = evaluateSegments(currentSegs);
console.log(res);
