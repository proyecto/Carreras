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

// Sample near
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
    return { error: e.message };
  }

  let totalDev = 0, maxDev = 0, hits = 0, misses = 0;
  for (let i = 0; i < TRK.N; i += 3) {
    const x = TRK.x[i], z = TRK.z[i], y = TRK.y[i];
    const th = Math.atan2(TRK.tz[i], TRK.tx[i]);
    const hit = sampleRoadNear(x, z, th);
    if (hit === null) {
      misses++;
    } else {
      hits++;
      const d = Math.abs(y - hit.y) + Math.abs(hit.latOffset) * 0.3;
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

// Clockwise segments summing to exactly +360 deg:
const segmentsClockwise = [
  // Recta de meta (-60 a 420)
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 80, -6.8],

  // T1: Yokohama-S (derecha)
  ['A', 42, 60, -8.5, 'Yokohama-S'],
  ['S', 15, -9.2],

  // T2: Castrol-Bogen (izquierda)
  ['A', 40, -45, -9.5, 'Castrol-Bogen'],
  ['S', 30, -10.5],

  // T3-T4: Mercedes-Arena (horquilla derecha)
  ['A', 36, 145, -12.0, 'Mercedes-Arena Loop'],
  ['S', 25, -10.8],
  ['A', 42, -50, -10.5, 'Mercedes-Arena Exit'],

  // T5: Ford-Kurve
  ['S', 65, -14.0],
  ['A', 50, 70, -12.0, 'Ford-Kurve'],

  // Bajada a Dunlop-Kehre
  ['S', 260, -22.0],
  ['A', 30, 130, -25.5, 'Dunlop-Kehre'],

  // Salida Dunlop / Schumacher-S
  ['S', 80, -21.0],
  ['A', 70, -40, -18.0, 'Schumacher-S 1'],
  ['A', 70, 40, -14.0, 'Schumacher-S 2'],
  ['S', 60, -11.0],

  // Bit-Kurve
  ['A', 48, 80, -8.0, 'Bit-Kurve'],
  ['S', 'Lw', -5.0],

  // Recta de retorno
  ['S', 'Ln', -3.5],

  // Veedol-Schikane
  ['A', 35, -35, -2.5, 'Veedol-Schikane 1'],
  ['A', 35, 70, -1.5, 'Veedol-Schikane 2'],
  ['A', 35, -35, -0.8, 'Veedol-Schikane 3'],

  // Coca-Cola-Kurve
  ['A', 55, 90, -0.2, 'Coca-Cola-Kurve'],
  ['S', 60, 0.0],
];

// Check angle sum
let sumAng = 0;
for (const sg of segmentsClockwise) {
  if (sg[0] === 'A') sumAng += sg[2];
}
console.log('Total angle sum of curves:', sumAng, 'deg (must be 360)');

console.log('Testing clockwise candidate:');
const res = testSpec(segmentsClockwise);
console.log(res);

if (!res.error) {
  console.log('\nSegment details:');
  for (let i = 0; i < TRK.segs.length; i++) {
    const sg = TRK.segs[i];
    const idx = Math.min(TRK.N - 1, Math.round(sg.s1));
    const x = TRK.x[idx], z = TRK.z[idx], y = TRK.y[idx];
    const th = Math.atan2(TRK.tz[idx], TRK.tx[idx]);
    const hit = sampleRoadNear(x, z, th);
    const status = hit ? `OK (yErr=${Math.abs(y-hit.y).toFixed(2)}m, lat=${hit.latOffset.toFixed(1)}m)` : 'OFF ROAD';
    console.log(`Seg ${i.toString().padStart(2)}: ${(sg.name || sg.type).padEnd(24)} s1=${sg.s1.toFixed(0).padStart(4)}m | pos=(${x.toFixed(1).padStart(6)}, ${z.toFixed(1).padStart(6)}) Y=${y.toFixed(1).padStart(5)} | ${status}`);
  }
}
