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
  try {
    trackBuild({ hw: 7.2, startS: -18, startD: -2.0, segments });
    return { L: TRK.L, Lw: TRK.Lw, Ln: TRK.Ln };
  } catch (e) {
    return { error: e.message };
  }
}

// Check with 80 deg turn between Lw and Ln:
const cand = [
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 120, -7.8],

  ['A', 42, 75, -9.4, 'Yokohama-S'],
  ['S', 20, -9.6],

  ['A', 42, -70, -9.5, 'Castrol-Bogen'],
  ['S', 30, -10.5],

  ['A', 40, 150, -12.0, 'Mercedes-Arena Loop'],
  ['A', 35, 115, -10.5, 'Mercedes-Arena Exit'],

  ['S', 60, -14.0],
  ['A', 50, 50, -12.0, 'Ford-Kurve'],

  ['S', 370, -22.0],
  ['A', 32, -140, -25.5, 'Dunlop-Kehre'],

  ['S', 60, -26.0],
  ['A', 45, -145, -28.0, 'Dunlop Link'],
  ['S', 120, -32.0],

  ['A', 80, 25, -35.0, 'Schumacher-S 1'],
  ['A', 80, -25, -38.0, 'Schumacher-S 2'],
  ['S', 150, -41.0],

  ['A', 35, 180, -42.5, 'Kumho-Kurve'],

  // Lw before Bit-Kurve
  ['S', 'Lw', -25.0],
  ['A', 60, 80, -11.0, 'Bit-Kurve'],

  // Ln after Bit-Kurve
  ['S', 'Ln', -6.0],

  ['A', 35, -30, -2.5, 'Veedol-Schikane 1'],
  ['A', 35, 60, -1.5, 'Veedol-Schikane 2'],
  ['A', 35, -30, -0.8, 'Veedol-Schikane 3'],

  ['A', 45, 65, -0.2, 'Coca-Cola-Kurve'],
  ['S', 265, 0.0],
];

let sum = 0;
for (const s of cand) {
  if (s[0] === 'A') sum += s[2];
}
console.log('Total curve angle sum:', sum, 'deg');

const res = testSpec(cand);
console.log('Result:', res);
