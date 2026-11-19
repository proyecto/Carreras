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
  for (let d = 0.5; d <= 6.5; d += 0.5) {
    const yP = sampleRoadY(px + d * nx, pz + d * nz);
    if (yP !== null) return { y: yP, latOffset: d };
    const yM = sampleRoadY(px - d * nx, pz - d * nz);
    if (yM !== null) return { y: yM, latOffset: -d };
  }
  return null;
}

function testSpecFull(segments) {
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
      const d = Math.abs(y - hit.y) + Math.abs(hit.latOffset) * 0.4;
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

// Complete calibrated segments
const segments = [
  // 1. Recta de meta
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 80, -6.8],

  // 2. Curva 1: Yokohama-S (derecha)
  ['A', 40, 75, -8.5, 'Yokohama-S'],
  ['S', 12, -9.5],
  ['A', 40, 80, -9.6, 'Yokohama-S Exit'],
  ['S', 45, -9.0],

  // 3. Mercedes-Arena (bucle a la izquierda)
  ['S', 20, -10.5],
  ['A', 70, -115, -11.5, 'Mercedes-Arena Loop'],
  ['S', 55, -10.5],

  // 4. Ford-Kurve
  ['S', 50, -14.0],
  ['A', 50, 45, -12.0, 'Ford-Kurve'],

  // 5. Bajada a Dunlop-Kehre
  ['S', 250, -22.0],
  ['A', 28.5, -180, -25.5, 'Dunlop-Kehre'],

  // 6. Subida hacia chicane interior
  ['S', 60, -20.0],
  ['A', 60, 45, -19.0, 'Schumacher Chicane 1'],
  ['A', 60, -45, -15.0, 'Schumacher Chicane 2'],
  ['S', 80, -11.0],

  // 7. Horquilla interior hacia Bit-Kurve
  ['A', 45, 90, -11.0, 'Infield Curve'],
  ['S', 'Lw', -8.0],
  ['A', 55, -90, -4.5, 'Bit-Kurve'],

  // 8. Recta trasera antes de chicane
  ['S', 'Ln', -3.5],

  // 9. Veedol-Schikane
  ['A', 35, -45, -2.5, 'Veedol-Schikane 1'],
  ['A', 35, 90, -1.5, 'Veedol-Schikane 2'],
  ['A', 35, -45, -0.8, 'Veedol-Schikane 3'],

  // 10. Coca-Cola-Kurve y entrada a recta principal
  ['A', 55, 90, -0.2, 'Coca-Cola-Kurve'],
  ['S', 60, 0.0],
];

console.log('Evaluating complete circuit:');
const res = testSpecFull(segments);
console.log(res);

if (!res.error) {
  console.log('\nSegment status:');
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
