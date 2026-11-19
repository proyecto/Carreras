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

function testSpec(segments) {
  const spec = {
    hw: 7.2,
    startS: -18,
    startD: -2.0,
    segments
  };

  try {
    trackBuild(spec);
  } catch (e) {
    console.error('trackBuild error:', e);
    return null;
  }

  let totalDev = 0, maxDev = 0, hits = 0, misses = 0;
  for (let i = 0; i < TRK.N; i += 5) {
    const x = TRK.x[i], z = TRK.z[i], y = TRK.y[i];
    const roadY = sampleRoadY(x, z);
    if (roadY === null) {
      misses++;
    } else {
      hits++;
      const d = Math.abs(y - roadY);
      totalDev += d;
      if (d > maxDev) maxDev = d;
    }
  }

  const pct = hits / (hits + misses) * 100;
  console.log(`Lap length: ${TRK.L.toFixed(1)}m | On track: ${pct.toFixed(1)}% (${hits}/${hits+misses}) | Avg Y err: ${(totalDev/hits).toFixed(2)}m | Max Y err: ${maxDev.toFixed(2)}m | Lw: ${TRK.Lw.toFixed(1)} | Ln: ${TRK.Ln.toFixed(1)}`);
  return { pct, L: TRK.L, Lw: TRK.Lw, Ln: TRK.Ln };
}

const candidate1 = [
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 140, -8.0],
  ['A', 38, 75, -9.5, 'Yokohama-S'],
  ['S', 15, -9.5],
  ['A', 45, -85, -9.6, 'Castrol-Bogen'],
  ['S', 45, -10.9],
  ['A', 42, 150, -11.9, 'Mercedes-Arena 1'],
  ['S', 20, -11.0],
  ['A', 50, -60, -10.5, 'Mercedes-Arena Exit'],
  ['S', 65, -16.0],
  ['A', 55, 65, -12.0, 'Ford-Kurve'],
  ['S', 270, -25.0],
  ['A', 32, -165, -26.0, 'Dunlop-Kehre'],
  ['S', 130, -34.0],
  ['A', 120, 30, -37.0, 'Schumacher-S 1'],
  ['A', 120, -30, -40.0, 'Schumacher-S 2'],
  ['S', 90, -42.5],
  ['A', 38, 180, -42.0, 'Kumho-Kurve'],
  ['S', 'Lw', -25.0],
  ['A', 65, 75, -13.0, 'Bit-Kurve'],
  ['S', 'Ln', -4.0],
  ['A', 35, -45, -3.0, 'Veedol 1'],
  ['A', 35, 90, -2.0, 'Veedol 2'],
  ['A', 35, -45, -1.0, 'Veedol 3'],
  ['A', 55, 90, 0.0, 'Coca-Cola-Kurve'],
  ['S', 120, 0.0],
];

console.log('Testing candidate 1:');
testSpec(candidate1);
