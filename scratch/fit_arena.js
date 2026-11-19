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
  for (let d = 0.5; d <= 6.5; d += 0.5) {
    const yP = sampleRoadY(px + d * nx, pz + d * nz);
    if (yP !== null) return { y: yP, latOffset: d };
    const yM = sampleRoadY(px - d * nx, pz - d * nz);
    if (yM !== null) return { y: yM, latOffset: -d };
  }
  return null;
}

function walkFrom(startX, startZ, startTh, segs) {
  let x = startX, z = startZ, th = startTh;
  let hits = 0, misses = 0;
  for (const sg of segs) {
    if (sg[0] === 'S') {
      const L = sg[1];
      const steps = Math.max(2, Math.round(L / 4));
      for (let i = 1; i <= steps; i++) {
        const t = (i / steps) * L;
        const px = x + Math.cos(th) * t;
        const pz = z + Math.sin(th) * t;
        if (sampleRoadNear(px, pz, th)) hits++;
        else misses++;
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
        if (sampleRoadNear(px, pz, t2)) hits++;
        else misses++;
      }
      th += a;
      x = cx + Math.sin(th) * R * sgn;
      z = cz - Math.cos(th) * R * sgn;
    }
  }
  return { hits, misses, pct: hits / (hits + misses) * 100, x, z, th: th * 180 / Math.PI };
}

// Start of Arena:
const arenaStartX = 396.8, arenaStartZ = 101.4, arenaStartTh = 155 * Math.PI / 180;
console.log('Target for Arena exit: (548.4, 77.8), heading towards ~-40 deg');

// Test Arena candidates:
// A (left curve into hairpin) -> S -> A (hairpin right) -> S -> A (exit left onto straight)
for (let a1 = -30; a1 <= -10; a1 += 5) {
  for (let l1 = 30; l1 <= 60; l1 += 10) {
    for (let r2 = 30; r2 <= 50; r2 += 5) {
      for (let a2 = 140; a2 <= 200; a2 += 10) {
        for (let l2 = 20; l2 <= 60; l2 += 10) {
          const test = [
            ['A', 40, a1, -10.5],
            ['S', l1, -11.5],
            ['A', r2, a2, -12.0],
            ['S', l2, -10.5],
            ['A', 45, -70, -10.5],
            ['S', 50, -13.0]
          ];
          const res = walkFrom(arenaStartX, arenaStartZ, arenaStartTh, test);
          if (res.pct > 92 && Math.hypot(res.x - 583.1, res.z - 18.2) < 20) {
            console.log(`Match! a1=${a1} l1=${l1} r2=${r2} a2=${a2} l2=${l2} -> pct=${res.pct.toFixed(1)} pos=(${res.x.toFixed(1)}, ${res.z.toFixed(1)}) th=${res.th.toFixed(1)}`);
          }
        }
      }
    }
  }
}
