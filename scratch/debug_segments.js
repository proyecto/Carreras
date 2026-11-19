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

trackBuild({ hw: 7.2, startS: -18, startD: -2.0, segments: candidate1 });

for (let i = 0; i < TRK.segs.length; i++) {
  const sg = TRK.segs[i];
  const idx = Math.min(TRK.N - 1, Math.round(sg.s1));
  const x = TRK.x[idx], z = TRK.z[idx], y = TRK.y[idx];
  const roadY = sampleRoadY(x, z);
  const status = roadY !== null ? `OK (roadY=${roadY.toFixed(2)}, err=${Math.abs(y-roadY).toFixed(2)})` : 'OFF ROAD';
  console.log(`Seg ${i.toString().padStart(2)}: ${sg.name || sg.type.padEnd(8)} s1=${sg.s1.toFixed(0).padStart(4)}m | pos=(${x.toFixed(1).padStart(6)}, ${z.toFixed(1).padStart(6)}) | ${status}`);
}
