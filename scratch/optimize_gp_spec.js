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

function evaluate(segments) {
  const spec = {
    hw: 7.2,
    startS: -18,
    startD: -2.0,
    segments
  };

  try {
    trackBuild(spec);
  } catch (e) {
    return { error: e.message, pct: 0 };
  }

  let totalDev = 0, maxDev = 0, hits = 0, misses = 0;
  for (let i = 0; i < TRK.N; i += 2) {
    const x = TRK.x[i], z = TRK.z[i], y = TRK.y[i];
    const th = Math.atan2(TRK.tz[i], TRK.tx[i]);
    const hit = sampleRoadNear(x, z, th);
    if (hit === null) {
      misses++;
    } else {
      hits++;
      const d = Math.abs(y - hit.y) + Math.abs(hit.latOffset) * 0.25;
      totalDev += d;
      if (d > maxDev) maxDev = d;
    }
  }

  const pct = hits / (hits + misses) * 100;
  return {
    pct,
    lapLength: TRK.L,
    hits,
    misses,
    Lw: TRK.Lw,
    Ln: TRK.Ln,
    avgDev: hits > 0 ? totalDev / hits : 999,
    maxDev
  };
}

// We need curve angles to sum to +360 deg:
// Let's define the base template:
// Lw is on the return straight (heading ~180 deg, west)
// Ln is on the approach to Coca-Cola (heading ~270 deg or angled)
function makeSpec(p) {
  return [
    // 1. Recta principal (-60 a 400) = 460m
    ['S', 180, -1.6],
    ['S', 160, -4.0],
    ['S', p.sMain3, -7.8],

    // 2. Turn 1 (Yokohama-S)
    ['A', p.rT1, p.aT1, -9.4, 'Yokohama-S'],
    ['S', p.sT1Exit, -9.6],

    // 3. Turn 2 (Castrol-Bogen)
    ['A', p.rT2, p.aT2, -9.5, 'Castrol-Bogen'],
    ['S', p.sT2Exit, -10.5],

    // 4. Mercedes-Arena Loop
    ['A', p.rAr1, p.aAr1, -12.0, 'Mercedes-Arena 1'],
    ['S', p.sArMid, -11.0],
    ['A', p.rAr2, p.aAr2, -10.5, 'Mercedes-Arena 2'],
    ['S', p.sArExit, -10.2],
    ['A', p.rArExit, p.aArExit, -10.5, 'Mercedes-Arena Exit'],

    // 5. Ford-Kurve
    ['S', p.sFordEntry, -14.0],
    ['A', p.rFord, p.aFord, -12.0, 'Ford-Kurve'],

    // 6. Dunlop-Kehre
    ['S', p.sDunlopEntry, -18.0],
    ['A', p.rDunlop, p.aDunlop, -25.5, 'Dunlop-Kehre'],

    // 7. Schumacher-S
    ['S', p.sSchu1, -29.0],
    ['A', p.rSchu1, p.aSchu1, -34.0, 'Schumacher-S 1'],
    ['A', p.rSchu2, p.aSchu2, -38.0, 'Schumacher-S 2'],

    // 8. Kumho-Kurve (lowest hairpin loop)
    ['A', p.rKumho, p.aKumho, -42.5, 'Kumho-Kurve'],

    // 9. Subida de retorno a Bit-Kurve
    ['S', 'Lw', -20.0],
    ['A', p.rBit, p.aBit, -8.0, 'Bit-Kurve'],

    // 10. Recta hacia Veedol
    ['S', 'Ln', -4.0],

    // 11. Veedol-Schikane
    ['A', p.rVee1, p.aVee1, -2.5, 'Veedol-Schikane 1'],
    ['A', p.rVee2, p.aVee2, -1.5, 'Veedol-Schikane 2'],
    ['A', p.rVee3, p.aVee3, -0.8, 'Veedol-Schikane 3'],

    // 12. Coca-Cola-Kurve
    ['A', p.rCoca, p.aCoca, -0.2, 'Coca-Cola-Kurve'],
    ['S', p.sFinish, 0.0],
  ];
}

module.exports = { evaluate, makeSpec };
