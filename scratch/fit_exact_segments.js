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
  for (let i = 0; i < TRK.N; i += 2) {
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

// Let's test our segment configuration:
// Total angles must sum to +360 deg:
// Curves:
// Yokohama-S: +75
// Castrol-Bogen: -70
// Arena 1: +115
// Arena 2: -50
// Arena Exit: +55
// Ford-Kurve: +50
// Dunlop-Kehre: -140
// Schumacher-S 1: +30
// Schumacher-S 2: -30
// Kumho-Kurve: +140
// Infield Curve: +70
// Bit-Kurve: +45
// Veedol 1: -35
// Veedol 2: +70
// Veedol 3: -35
// Coca-Cola: +70
// Sum: 75 - 70 + 115 - 50 + 55 + 50 - 140 + 30 - 30 + 140 + 70 + 45 - 35 + 70 - 35 + 70 = 360 deg!
const candidate = [
  // 1. Recta principal (-60 a 400) = 460m
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 120, -7.8],

  // 2. Curva 1: Yokohama-S (derecha)
  ['A', 42, 75, -9.4, 'Yokohama-S'],
  ['S', 20, -9.6],

  // 3. Curva 2: Castrol-Bogen (izquierda)
  ['A', 42, -70, -9.5, 'Castrol-Bogen'],
  ['S', 30, -10.5],

  // 4. Mercedes-Arena (bucle)
  ['A', 40, 150, -12.0, 'Mercedes-Arena Loop'],
  ['A', 35, 115, -10.5, 'Mercedes-Arena Exit'],

  // 5. Ford-Kurve
  ['S', 60, -14.0],
  ['A', 50, 50, -12.0, 'Ford-Kurve'],

  // 6. Bajada a Dunlop-Kehre
  ['S', 260, -22.0],
  ['A', 35, -140, -25.5, 'Dunlop-Kehre'],

  // 7. Schumacher-S
  ['S', 60, -29.0],
  ['A', 80, 30, -34.0, 'Schumacher-S 1'],
  ['A', 80, -30, -38.0, 'Schumacher-S 2'],
  ['S', 120, -41.0],

  // 8. Kumho-Kurve
  ['A', 45, 140, -42.5, 'Kumho-Kurve'],

  // 9. Subida de retorno a Bit-Kurve
  ['S', 'Lw', -25.0],
  ['A', 70, 70, -16.0, 'Infield Curve'],
  ['S', 90, -11.0],
  ['A', 55, 45, -6.0, 'Bit-Kurve'],

  // 10. Recta trasera hacia Veedol
  ['S', 'Ln', -3.5],

  // 11. Veedol-Schikane
  ['A', 35, -35, -2.5, 'Veedol-Schikane 1'],
  ['A', 35, 70, -1.5, 'Veedol-Schikane 2'],
  ['A', 35, -35, -0.8, 'Veedol-Schikane 3'],

  // 12. Coca-Cola-Kurve
  ['A', 55, 70, -0.2, 'Coca-Cola-Kurve'],
  ['S', 270, 0.0],
];

console.log('Testing candidate:');
const res = testSpec(candidate);
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
