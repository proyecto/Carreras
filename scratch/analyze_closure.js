const fs = require('fs');
const vm = require('vm');

const s2 = fs.readFileSync('scratch/test_det_solve.js', 'utf8');
const { cand } = new Function('require', s2 + '; return { cand };')(require);

const def = cand;
const walk = (Lw, Ln) => {
  let x = -60, z = 0, th = 0, s = 0;
  for (const sg of def) {
    if (sg[0] === 'S') {
      const L = sg[1] === 'Lw' ? Lw : sg[1] === 'Ln' ? Ln : sg[1];
      x += Math.cos(th) * L; z += Math.sin(th) * L; s += L;
    } else {
      const R = sg[1], a = sg[2] * Math.PI / 180, sgn = Math.sign(a);
      const cx = x - Math.sin(th) * R * sgn, cz = z + Math.cos(th) * R * sgn;
      th += a; x = cx + Math.sin(th) * R * sgn; z = cz - Math.cos(th) * R * sgn; s += Math.abs(a) * R;
    }
  }
  return [x, z, s];
};

const p0 = walk(0, 0), pw = walk(1, 0), pn = walk(0, 1);
console.log('p0:', p0[0].toFixed(1), p0[1].toFixed(1));
console.log('pw - p0 (Lw unit vec):', (pw[0] - p0[0]).toFixed(3), (pw[1] - p0[1]).toFixed(3));
console.log('pn - p0 (Ln unit vec):', (pn[0] - p0[0]).toFixed(3), (pn[1] - p0[1]).toFixed(3));
console.log('target - p0 (needed delta):', (-60 - p0[0]).toFixed(1), (0 - p0[1]).toFixed(1));
