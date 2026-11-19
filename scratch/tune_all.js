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

// Check road presence near (px, pz)
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
  for (let i = 0; i < TRK.N; i += 4) {
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

// Full draft of segments calibrated to GLB coordinates and elevations:
const candidate = [
  // 1. Recta principal: del pit (-60, 0) a (420, 0)
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 140, -8.0],

  // 2. Curva 1: Yokohama-S (derecha)
  ['A', 38, 75, -9.5, 'Yokohama-S'],
  ['S', 10, -9.5],

  // 3. Curva 2: Castrol-Bogen (curva y recta hacia Arena)
  ['A', 40, 80, -9.5, 'Yokohama-S Exit'],
  ['S', 45, -9.6],

  // 4. Mercedes-Arena (bucle cerrado)
  ['A', 30, -50, -11.0, 'Mercedes-Arena 1'],
  ['S', 50, -11.8],
  ['A', 35, 160, -12.0, 'Mercedes-Arena Loop'],
  ['S', 20, -10.5],
  ['A', 45, -80, -10.2, 'Mercedes-Arena Exit'],

  // 5. Salida de Arena hacia Ford-Kurve
  ['S', 65, -13.0],
  ['A', 45, 65, -12.0, 'Ford-Kurve'],

  // 6. Bajada pronunciada hacia Dunlop-Kehre
  ['S', 260, -25.0],
  ['A', 32, -170, -25.8, 'Dunlop-Kehre'],

  // 7. Subida hacia Schumacher-S
  ['S', 120, -32.0],
  ['A', 110, 30, -36.0, 'Schumacher-S 1'],
  ['A', 110, -30, -39.0, 'Schumacher-S 2'],
  ['S', 90, -42.5],

  // 8. Kumho-Kurve (horquilla este en el fondo del valle)
  ['A', 36, 180, -42.2, 'Kumho-Kurve'],

  // 9. Recta de regreso (Lw cierra en X)
  ['S', 'Lw', -26.0],
  ['A', 55, 75, -13.0, 'Bit-Kurve'],

  // 10. Recta antes de chicane (Ln cierra en Z)
  ['S', 'Ln', -6.0],

  // 11. Chicana Veedol (izquierda-derecha-izquierda)
  ['A', 35, -45, -3.5, 'Veedol-Schikane 1'],
  ['A', 35, 90, -2.5, 'Veedol-Schikane 2'],
  ['A', 35, -45, -1.5, 'Veedol-Schikane 3'],

  // 12. Coca-Cola-Kurve y recta final a meta
  ['A', 50, 90, -0.4, 'Coca-Cola-Kurve'],
  ['S', 120, 0.0],
];

console.log('Testing full candidate:');
const res = testSpecFull(candidate);
console.log(res);

if (!res.error) {
  console.log('\nSegment details:');
  for (let i = 0; i < TRK.segs.length; i++) {
    const sg = TRK.segs[i];
    const idx = Math.min(TRK.N - 1, Math.round(sg.s1));
    const x = TRK.x[idx], z = TRK.z[idx], y = TRK.y[idx];
    const th = Math.atan2(TRK.tz[idx], TRK.tx[idx]);
    const hit = sampleRoadNear(x, z, th);
    const status = hit ? `OK (err=${Math.abs(y-hit.y).toFixed(2)}m, lat=${hit.latOffset.toFixed(1)}m)` : 'OFF ROAD';
    console.log(`Seg ${i.toString().padStart(2)}: ${(sg.name || sg.type).padEnd(22)} s1=${sg.s1.toFixed(0).padStart(4)}m | pos=(${x.toFixed(1).padStart(6)}, ${z.toFixed(1).padStart(6)}) Y=${y.toFixed(1).padStart(5)} | ${status}`);
  }
}
