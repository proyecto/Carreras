const fs = require('fs');
const vm = require('vm');

global.sat = x => Math.max(0, Math.min(1, x));
global.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
global.lerp = (a, b, t) => a + (b - a) * t;
global.smooth = (e0, e1, x) => 0; global.fbm = () => 0; global.PI = Math.PI; global.TRK = {};
vm.runInThisContext(fs.readFileSync('world/track-builder.js', 'utf8'));

const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const { sampleRoadY } = new Function('require', s + '; return { sampleRoadY };')(require);

function sampleRoadNear(px, pz, th) {
  const y0 = sampleRoadY(px, pz);
  if (y0 !== null) return { y: y0, latOffset: 0 };
  const nx = -Math.sin(th), nz = Math.cos(th);
  for (let d = 0.5; d <= 7.0; d += 0.5) {
    const yP = sampleRoadY(px + d * nx, pz + d * nz);
    if (yP !== null) return { y: yP, latOffset: d };
    const yM = sampleRoadY(px - d * nx, pz - d * nz);
    if (yM !== null) return { y: yM, latOffset: -d };
  }
  return null;
}

let bestScore = -1e9;
let bestResult = null;

for (let sFord = 40; sFord <= 80; sFord += 10) {
  for (let sDunlop = 320; sDunlop <= 400; sDunlop += 15) {
    for (let sVal = 100; sVal <= 200; sVal += 20) {
      for (let sFin = 200; sFin <= 300; sFin += 20) {
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

          ['S', sFord, -14.0],
          ['A', 50, 50, -12.0, 'Ford-Kurve'],

          ['S', sDunlop, -22.0],
          ['A', 32, -140, -25.5, 'Dunlop-Kehre'],

          ['S', 60, -26.0],
          ['A', 45, -145, -28.0, 'Dunlop Link'],
          ['S', 120, -32.0],

          ['A', 80, 25, -35.0, 'Schumacher-S 1'],
          ['A', 80, -25, -38.0, 'Schumacher-S 2'],
          ['S', sVal, -41.0],

          ['A', 35, 180, -42.5, 'Kumho-Kurve'],

          ['S', 'Ln', -20.0],
          ['A', 60, -35, -11.0, 'Bit-Kurve'],

          ['S', 'Lw', -6.0],

          ['A', 35, -30, -2.5, 'Veedol-Schikane 1'],
          ['A', 35, 60, -1.5, 'Veedol-Schikane 2'],
          ['A', 35, -30, -0.8, 'Veedol-Schikane 3'],

          ['A', 45, 180, -0.2, 'Coca-Cola-Kurve'],
          ['S', sFin, 0.0],
        ];

        try {
          trackBuild({ hw: 7.2, startS: -18, startD: -2.0, segments: cand });
          if (TRK.Lw > 200 && TRK.Ln > 50) {
            let hits = 0;
            const count = Math.floor(TRK.N / 4);
            for (let i = 0; i < TRK.N; i += 4) {
              const hit = sampleRoadNear(TRK.x[i], TRK.z[i], Math.atan2(TRK.tz[i], TRK.tx[i]));
              if (hit !== null) hits++;
            }
            const pct = hits / count * 100;
            if (pct > bestScore) {
              bestScore = pct;
              bestResult = { pct, L: TRK.L, Lw: TRK.Lw, Ln: TRK.Ln, sFord, sDunlop, sVal, sFin };
              console.log(`Found candidate: pct=${pct.toFixed(1)}% L=${TRK.L.toFixed(0)}m Lw=${TRK.Lw.toFixed(0)}m Ln=${TRK.Ln.toFixed(0)}m`);
            }
          }
        } catch (e) {}
      }
    }
  }
}

console.log('BEST RESULT:', bestResult);
