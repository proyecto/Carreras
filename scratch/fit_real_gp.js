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

// Baseline candidate based on our exact checkpoint coordinates:
const candidate = [
  // Recta principal desde meta (-60, 0) hasta T1 (400, 0) = 460m
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 120, -7.8],

  // Turn 1 (Yokohama-S)
  ['A', 42, 75, -9.4, 'Yokohama-S'],
  ['S', 20, -9.6],

  // Turn 2 (Castrol-Bogen)
  ['A', 42, -70, -9.5, 'Castrol-Bogen'],
  ['S', 30, -10.5],

  // Mercedes-Arena
  ['A', 36, 110, -12.0, 'Mercedes-Arena 1'],
  ['S', 20, -11.0],
  ['A', 40, -60, -10.5, 'Mercedes-Arena 2'],
  ['S', 20, -10.2],
  ['A', 45, 60, -10.5, 'Mercedes-Arena Exit'],

  // Ford-Kurve
  ['S', 65, -14.0],
  ['A', 50, 65, -12.0, 'Ford-Kurve'],

  // Bajada hacia Dunlop-Kehre
  ['S', 150, -18.0],
  ['A', 36, -140, -25.5, 'Dunlop-Kehre'],

  // Schumacher-S hacia el valle
  ['S', 90, -29.0],
  ['A', 80, 40, -34.0, 'Schumacher-S 1'],
  ['A', 80, -40, -38.0, 'Schumacher-S 2'],

  // Kumho-Kurve (horquilla este en el fondo del valle)
  ['A', 55, 140, -42.5, 'Kumho-Kurve'],

  // Subida de retorno hacia Bit-Kurve
  ['S', 'Lw', -20.0],
  ['A', 60, 90, -8.0, 'Bit-Kurve'],

  // Recta de retorno hacia Veedol
  ['S', 'Ln', -4.0],

  // Veedol-Schikane
  ['A', 35, -40, -2.5, 'Veedol-Schikane 1'],
  ['A', 35, 80, -1.5, 'Veedol-Schikane 2'],
  ['A', 35, -40, -0.8, 'Veedol-Schikane 3'],

  // Coca-Cola-Kurve
  ['A', 55, 90, -0.2, 'Coca-Cola-Kurve'],
  ['S', 270, 0.0],
];

console.log('Evaluating candidate...');
const res = evaluate(candidate);
console.log('Result:', res);

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
