const fs = require('fs');
const vm = require('vm');

global.sat = x => Math.max(0, Math.min(1, x));
global.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
global.lerp = (a, b, t) => a + (b - a) * t;
global.smooth = (e0, e1, x) => 0; global.fbm = () => 0; global.PI = Math.PI; global.TRK = {};
vm.runInThisContext(fs.readFileSync('world/track-builder.js', 'utf8'));

// Putting Ln on the climb (+Z) and Lw on the back straight (-X)
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

  // Ln is on the climb (+Z)
  ['S', 'Ln', -20.0],
  ['A', 60, -35, -11.0, 'Bit-Kurve'],

  // Lw is on the back straight (-X)
  ['S', 'Lw', -6.0],

  ['A', 35, -30, -2.5, 'Veedol-Schikane 1'],
  ['A', 35, 60, -1.5, 'Veedol-Schikane 2'],
  ['A', 35, -30, -0.8, 'Veedol-Schikane 3'],

  ['A', 45, 180, -0.2, 'Coca-Cola-Kurve'],
  ['S', 265, 0.0],
];

try {
  trackBuild({ hw: 7.2, startS: -18, startD: -2.0, segments: cand });
  console.log(`SUCCESS! L=${TRK.L.toFixed(1)}m, Lw=${TRK.Lw.toFixed(1)}m, Ln=${TRK.Ln.toFixed(1)}m`);
} catch (e) {
  console.log('Error:', e.message);
}
