const fs = require('fs');

// Test walk with origin
const PI = Math.PI;
function testSpline(spec) {
  const ox = spec.origin?.x ?? -60;
  const oz = spec.origin?.z ?? 0;
  const oth = spec.origin?.yaw ?? 0;
  const def = spec.segments;

  const walk = (Lw, Ln, emit) => {
    let x = ox, z = oz, th = oth, s = 0;
    for (const sg of def) {
      const s0 = s;
      if (sg[0] === 'S') {
        const L = sg[1] === 'Lw' ? Lw : sg[1] === 'Ln' ? Ln : sg[1];
        if (emit) emit(sg, s0, L, x, z, th, 0);
        x += Math.cos(th) * L; z += Math.sin(th) * L; s += L;
      } else {
        const R = sg[1], a = sg[2] * PI / 180, L = Math.abs(a) * R, sgn = Math.sign(a);
        if (emit) emit(sg, s0, L, x, z, th, sgn / R);
        const cx = x - Math.sin(th) * R * sgn, cz = z + Math.cos(th) * R * sgn;
        th += a; x = cx + Math.sin(th) * R * sgn; z = cz - Math.cos(th) * R * sgn; s += L;
      }
    }
    return [x, z, s];
  };

  const hasLw = def.some(sg => sg[0] === 'S' && sg[1] === 'Lw');
  const hasLn = def.some(sg => sg[0] === 'S' && sg[1] === 'Ln');
  let Lw = 0, Ln = 0;
  if (hasLw && hasLn) {
    const p0 = walk(0, 0), pw = walk(1, 0), pn = walk(0, 1);
    const a = pw[0] - p0[0], b = pn[0] - p0[0], c = pw[1] - p0[1], d = pn[1] - p0[1], ex = ox - p0[0], ez = oz - p0[1], det = a * d - b * c;
    if (Math.abs(det) > 1e-6) { Lw = (ex * d - b * ez) / det; Ln = (a * ez - c * ex) / det; }
  }

  const end = walk(Lw, Ln);
  console.log(`Start: (${ox}, ${oz}), End: (${end[0].toFixed(2)}, ${end[1].toFixed(2)}), Total Length: ${end[2].toFixed(1)}m, Lw=${Lw.toFixed(1)}, Ln=${Ln.toFixed(1)}`);
}

// Load nurburgring segments
const content = fs.readFileSync('tracks/nurburgring-gp.js', 'utf8');
let segments;
eval(content.replace('TRACKS.register', 'segments = '));
testSpline({
  origin: { x: -22.84, z: -600.0, yaw: Math.PI / 2 },
  segments: segments.segments
});
