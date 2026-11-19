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

// Scaled and calibrated version of official segments:
// Radii scaled down by ~0.45 - 0.55 to match GLB
// Elevations calibrated to GLB road surface:
const scaledOfficial = [
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 100, -7.5],
  ['A', 38, 100, -9.4, 'Yokohama-S'],
  ['S', 20, -9.5],
  ['A', 42, -70, -9.5, 'Castrol-Bogen'],
  ['S', 30, -10.5],
  ['A', 30, 125, -12.0, 'Mercedes-Arena 1'],
  ['S', 25, -11.0],
  ['A', 35, -75, -10.5, 'Mercedes-Arena 2'],
  ['S', 30, -10.2],
  ['A', 45, 60, -10.5, 'Mercedes-Arena Exit'],
  ['S', 120, -14.0],
  ['A', 55, 60, -12.0, 'Ford-Kurve'],
  ['S', 110, -18.0],
  ['A', 32, -120, -25.5, 'Dunlop-Kehre'],
  ['S', 150, -32.0],
  ['A', 75, 45, -36.0, 'Schumacher-S 1'],
  ['A', 75, -45, -40.0, 'Schumacher-S 2'],
  ['A', 55, 100, -42.5, 'Kumho-Kurve'],
  ['S', 'Lw', -26.0],
  ['A', 60, 90, -13.0, 'Bit-Kurve'],
  ['S', 'Ln', -6.0],
  ['A', 30, -40, -3.0, 'Veedol-Schikane 1'],
  ['A', 30, 80, -2.0, 'Veedol-Schikane 2'],
  ['A', 30, -40, -1.0, 'Veedol-Schikane 3'],
  ['A', 45, 90, -0.4, 'Coca-Cola-Kurve'],
  ['S', 130, 0.0],
];

console.log('Testing calibrated official segments:');
const res = testSpec(scaledOfficial);
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
