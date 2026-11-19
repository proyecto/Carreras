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
  for (let d = 0.5; d <= 7.0; d += 0.5) {
    const yP = sampleRoadY(px + d * nx, pz + d * nz);
    if (yP !== null) return { y: yP, latOffset: d };
    const yM = sampleRoadY(px - d * nx, pz - d * nz);
    if (yM !== null) return { y: yM, latOffset: -d };
  }
  return null;
}

// Evaluate a full segment definition
function evalTrack(segments) {
  const spec = { hw: 7.2, startS: -18, startD: -2.0, segments };
  try {
    trackBuild(spec);
  } catch (e) {
    return { score: 1e9, pct: 0, err: e.message };
  }

  // Check Lw and Ln are positive and reasonable
  if (TRK.Lw < 10 || TRK.Lw > 800 || TRK.Ln < 10 || TRK.Ln > 800) {
    return { score: 1e8, pct: 0, err: 'Bad Lw/Ln: ' + TRK.Lw.toFixed(1) + ', ' + TRK.Ln.toFixed(1) };
  }

  let totalErr = 0;
  let hits = 0, misses = 0;
  const step = 4;
  for (let i = 0; i < TRK.N; i += step) {
    const x = TRK.x[i], z = TRK.z[i], y = TRK.y[i];
    const th = Math.atan2(TRK.tz[i], TRK.tx[i]);
    const hit = sampleRoadNear(x, z, th);
    if (hit === null) {
      misses++;
      totalErr += 100.0;
    } else {
      hits++;
      const vertErr = Math.abs(y - hit.y);
      const latErr = Math.abs(hit.latOffset);
      totalErr += vertErr * 2.0 + latErr * 1.0;
    }
  }

  const pct = hits / (hits + misses) * 100;
  return {
    score: totalErr,
    pct,
    lapLength: TRK.L,
    hits,
    misses,
    Lw: TRK.Lw,
    Ln: TRK.Ln,
    avgErr: hits > 0 ? totalErr / (hits + misses) : 999
  };
}

// Baseline candidate that closes the loop
let bestSegs = [
  // 1. Recta principal
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 80, -6.8],

  // 2. Turn 1 (Yokohama-S)
  ['A', 38, 75, -8.5, 'Yokohama-S'],
  ['S', 12, -9.5],
  ['A', 40, 80, -9.6, 'Yokohama-S Exit'],
  ['S', 45, -9.0],

  // 3. Mercedes-Arena Loop
  ['S', 20, -10.5],
  ['A', 35, 125, -12.0, 'Mercedes-Arena 1'],
  ['S', 25, -11.0],
  ['A', 45, -75, -10.5, 'Mercedes-Arena 2'],
  ['S', 30, -10.2],

  // 4. Ford-Kurve
  ['S', 65, -13.0],
  ['A', 45, 65, -12.0, 'Ford-Kurve'],

  // 5. Bajada Dunlop
  ['S', 250, -22.0],
  ['A', 30, -120, -25.5, 'Dunlop-Kehre'],

  // 6. Subida Schumacher-S
  ['S', 120, -32.0],
  ['A', 80, 45, -36.0, 'Schumacher-S 1'],
  ['A', 80, -45, -40.0, 'Schumacher-S 2'],
  ['A', 50, 100, -42.5, 'Kumho-Kurve'],

  // 7. Retorno
  ['S', 'Lw', -25.0],
  ['A', 60, 90, -13.0, 'Bit-Kurve'],
  ['S', 'Ln', -6.0],

  // 8. Chicana y Coca-Cola
  ['A', 30, -40, -3.0, 'Veedol-Schikane 1'],
  ['A', 30, 80, -2.0, 'Veedol-Schikane 2'],
  ['A', 30, -40, -1.0, 'Veedol-Schikane 3'],
  ['A', 50, 90, -0.4, 'Coca-Cola-Kurve'],
  ['S', 120, 0.0],
];

console.log('Initial score:');
let current = evalTrack(bestSegs);
console.log(current);

// Coordinate descent / random perturbation optimizer
let bestScore = current.score;
console.log(`Starting optimization from score: ${bestScore.toFixed(1)}, pct: ${current.pct.toFixed(1)}%`);

for (let iter = 0; iter < 1000; iter++) {
  // Pick a random segment to mutate
  const sgIdx = Math.floor(Math.random() * bestSegs.length);
  const sg = bestSegs[sgIdx];
  const copy = JSON.parse(JSON.stringify(bestSegs));

  if (sg[0] === 'S') {
    if (sg[1] !== 'Lw' && sg[1] !== 'Ln') {
      // Mutate length or elevation
      if (Math.random() < 0.6) {
        const dL = (Math.random() - 0.5) * 10;
        copy[sgIdx][1] = Math.max(10, Math.round(sg[1] + dL));
      } else {
        const dY = (Math.random() - 0.5) * 1.5;
        copy[sgIdx][2] = Number((sg[2] + dY).toFixed(2));
      }
    }
  } else {
    // Mutate radius, angle, or elevation
    const r = Math.random();
    if (r < 0.4) {
      const dR = (Math.random() - 0.5) * 6;
      copy[sgIdx][1] = Math.max(20, Math.round(sg[1] + dR));
    } else if (r < 0.7) {
      const dA = (Math.random() - 0.5) * 6;
      copy[sgIdx][2] = Math.round(sg[2] + dA);
    } else {
      const dY = (Math.random() - 0.5) * 1.5;
      copy[sgIdx][3] = Number((sg[3] + dY).toFixed(2));
    }
  }

  const res = evalTrack(copy);
  if (res.score < bestScore) {
    bestScore = res.score;
    bestSegs = copy;
    console.log(`[Iter ${iter}] New best: score=${bestScore.toFixed(1)}, pct=${res.pct.toFixed(1)}%, L=${res.lapLength.toFixed(0)}m, Lw=${res.Lw.toFixed(0)}, Ln=${res.Ln.toFixed(0)}`);
  }
}

fs.writeFileSync('scratch/best_optimized_segs.json', JSON.stringify(bestSegs, null, 2));
console.log('Saved scratch/best_optimized_segs.json');
