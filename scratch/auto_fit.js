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

function scoreCandidate(segments) {
  let x = -60, z = 0, th = 0;
  let totalDev = 0, hits = 0, misses = 0;

  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const sg = segments[sIdx];
    if (sg[0] === 'S') {
      const L = sg[1];
      const steps = Math.max(2, Math.round(L / 4));
      for (let i = 1; i <= steps; i++) {
        const t = (i / steps) * L;
        const px = x + Math.cos(th) * t;
        const pz = z + Math.sin(th) * t;
        const y = sampleRoadY(px, pz);
        if (y !== null) {
          hits++;
          totalDev += Math.abs(y - (sg[2] ?? 0));
        } else {
          misses++;
          totalDev += 50.0;
        }
      }
      x += Math.cos(th) * L;
      z += Math.sin(th) * L;
    } else {
      const R = sg[1], a = sg[2] * Math.PI / 180, L = Math.abs(a) * R, sgn = Math.sign(a);
      const cx = x - Math.sin(th) * R * sgn, cz = z + Math.cos(th) * R * sgn;
      const steps = Math.max(2, Math.round(L / 4));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const t2 = th + t * a;
        const px = cx + Math.sin(t2) * R * sgn;
        const pz = cz - Math.cos(t2) * R * sgn;
        const y = sampleRoadY(px, pz);
        if (y !== null) {
          hits++;
          totalDev += Math.abs(y - (sg[3] ?? 0));
        } else {
          misses++;
          totalDev += 50.0;
        }
      }
      th += a;
      x = cx + Math.sin(th) * R * sgn;
      z = cz - Math.cos(th) * R * sgn;
    }
  }

  return { hits, misses, pct: hits / (hits + misses) * 100, x, z, th: th * 180 / Math.PI, totalDev };
}

// Function to find best segment
function findBestStep(baseSegs, isArc, params) {
  let best = null, bestScore = Infinity;
  if (isArc) {
    const { rMin, rMax, rStep, aMin, aMax, aStep, elev, name } = params;
    for (let R = rMin; R <= rMax; R += rStep) {
      for (let a = aMin; a <= aMax; a += aStep) {
        const testSeg = ['A', R, a, elev, name || ''];
        const res = scoreCandidate([...baseSegs, testSeg]);
        if (res.misses === 0 && res.totalDev < bestScore) {
          bestScore = res.totalDev;
          best = { seg: testSeg, ...res };
        }
      }
    }
  } else {
    const { lMin, lMax, lStep, elev } = params;
    for (let L = lMin; L <= lMax; L += lStep) {
      const testSeg = ['S', L, elev];
      const res = scoreCandidate([...baseSegs, testSeg]);
      if (res.misses === 0 && res.totalDev < bestScore) {
        bestScore = res.totalDev;
        best = { seg: testSeg, ...res };
      }
    }
  }
  return best;
}

// Build segments sequentially
const segs = [
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 80, -6.5],
];

console.log('--- Step 1: Turn 1 Entry ---');
let step = findBestStep(segs, true, { rMin: 40, rMax: 80, rStep: 5, aMin: 20, aMax: 50, aStep: 5, elev: -8.5, name: 'Yokohama-S Entry' });
console.log('Result:', step ? step.seg : 'FAILED', step ? `pos=(${step.x.toFixed(1)}, ${step.z.toFixed(1)}) th=${step.th.toFixed(1)}` : '');
if (step) segs.push(step.seg);

console.log('--- Step 2: Turn 1 Apex ---');
step = findBestStep(segs, true, { rMin: 30, rMax: 60, rStep: 5, aMin: 30, aMax: 70, aStep: 5, elev: -9.5, name: 'Yokohama-S Apex' });
console.log('Result:', step ? step.seg : 'FAILED', step ? `pos=(${step.x.toFixed(1)}, ${step.z.toFixed(1)}) th=${step.th.toFixed(1)}` : '');
if (step) segs.push(step.seg);

console.log('--- Step 3: Turn 1 Exit Straight ---');
step = findBestStep(segs, false, { lMin: 10, lMax: 60, lStep: 5, elev: -9.5 });
console.log('Result:', step ? step.seg : 'FAILED', step ? `pos=(${step.x.toFixed(1)}, ${step.z.toFixed(1)}) th=${step.th.toFixed(1)}` : '');
if (step) segs.push(step.seg);

console.log('--- Step 4: Turn 2 (Castrol-Bogen) ---');
step = findBestStep(segs, true, { rMin: 30, rMax: 70, rStep: 5, aMin: -100, aMax: -40, aStep: 5, elev: -9.8, name: 'Castrol-Bogen' });
console.log('Result:', step ? step.seg : 'FAILED', step ? `pos=(${step.x.toFixed(1)}, ${step.z.toFixed(1)}) th=${step.th.toFixed(1)}` : '');
if (step) segs.push(step.seg);

console.log('--- Step 5: Arena Straight ---');
step = findBestStep(segs, false, { lMin: 20, lMax: 80, lStep: 5, elev: -10.5 });
console.log('Result:', step ? step.seg : 'FAILED', step ? `pos=(${step.x.toFixed(1)}, ${step.z.toFixed(1)}) th=${step.th.toFixed(1)}` : '');
if (step) segs.push(step.seg);

console.log('Current total segments:');
console.log(JSON.stringify(segs, null, 2));
