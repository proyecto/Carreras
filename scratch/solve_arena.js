const fs = require('fs');
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const { sampleRoadY } = new Function('require', s + '; return { sampleRoadY };')(require);

// Let's simulate geometry forward from Start/Finish (-60, 0)
// until Mercedes-Arena Exit (548.4, 77.8)
function walkForward(segs) {
  let x = -60, z = 0, th = 0, s = 0;
  const path = [{ x, z, th, s }];
  for (const sg of segs) {
    if (sg[0] === 'S') {
      const L = sg[1];
      const n = Math.max(1, Math.round(L));
      for (let i = 1; i <= n; i++) {
        const t = i / n * L;
        path.push({ x: x + Math.cos(th) * t, z: z + Math.sin(th) * t, th, s: s + t });
      }
      x += Math.cos(th) * L; z += Math.sin(th) * L; s += L;
    } else {
      const R = sg[1], a = sg[2] * Math.PI / 180, L = Math.abs(a) * R, sgn = Math.sign(a);
      const cx = x - Math.sin(th) * R * sgn, cz = z + Math.cos(th) * R * sgn;
      const n = Math.max(1, Math.round(L));
      for (let i = 1; i <= n; i++) {
        const t = (i / n * a);
        path.push({
          x: cx + Math.sin(th + t) * R * sgn,
          z: cz - Math.cos(th + t) * R * sgn,
          th: th + t,
          s: s + (i / n * L)
        });
      }
      th += a; x = cx + Math.sin(th) * R * sgn; z = cz - Math.cos(th) * R * sgn; s += L;
    }
  }
  return { x, z, th, s, path };
}

function evaluatePath(path) {
  let hits = 0;
  for (const p of path) {
    const y = sampleRoadY(p.x, p.z);
    if (y !== null) hits++;
    else {
      // try lateral offset
      const nx = -Math.sin(p.th), nz = Math.cos(p.th);
      let found = false;
      for (let d = 0.5; d <= 6.0; d += 0.5) {
        if (sampleRoadY(p.x + d*nx, p.z + d*nz) !== null || sampleRoadY(p.x - d*nx, p.z - d*nz) !== null) {
          hits++; found = true; break;
        }
      }
    }
  }
  return hits / path.length * 100;
}

// Let's test combinations of Arena parameters
let bestPct = 0;
let bestCandidate = null;

for (let rT1 = 38; rT1 <= 44; rT1 += 2) {
  for (let aT1 = 70; aT1 <= 85; aT1 += 5) {
    for (let sT1 = 15; sT1 <= 30; sT1 += 5) {
      for (let rT2 = 36; rT2 <= 44; rT2 += 2) {
        for (let aT2 = -80; aT2 <= -60; aT2 += 5) {
          for (let sT2 = 20; sT2 <= 40; sT2 += 5) {
            for (let rAr = 32; rAr <= 40; rAr += 2) {
              for (let aAr = 110; aAr <= 135; aAr += 5) {
                const segs = [
                  ['S', 180, -1.6],
                  ['S', 160, -4.0],
                  ['S', 120, -7.8],
                  ['A', rT1, aT1, -9.4],
                  ['S', sT1, -9.6],
                  ['A', rT2, aT2, -9.5],
                  ['S', sT2, -10.5],
                  ['A', rAr, aAr, -12.0],
                ];
                const res = walkForward(segs);
                // We want end point to be near Arena Hairpin (468.6, 200.3)
                const distToHairpin = Math.hypot(res.x - 468.6, res.z - 200.3);
                if (distToHairpin < 15) {
                  const pct = evaluatePath(res.path);
                  if (pct > bestPct) {
                    bestPct = pct;
                    bestCandidate = { segs, pct, distToHairpin, endPos: [res.x, res.z], th: res.th * 180 / Math.PI };
                    console.log(`New best: pct=${pct.toFixed(1)}% dist=${distToHairpin.toFixed(1)}m pos=(${res.x.toFixed(1)}, ${res.z.toFixed(1)}) th=${(res.th*180/Math.PI).toFixed(0)}`);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

console.log('Final Best Candidate:');
console.log(JSON.stringify(bestCandidate, null, 2));
