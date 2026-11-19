const fs = require('fs');
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const { sampleRoadY } = new Function('require', s + '; return { sampleRoadY };')(require);

function walk(segs) {
  let x = -60, z = 0, th = 0;
  for (const sg of segs) {
    if (sg[0] === 'S') {
      const L = sg[1];
      x += Math.cos(th) * L; z += Math.sin(th) * L;
    } else {
      const R = sg[1], a = sg[2] * Math.PI / 180, sgn = Math.sign(a);
      const cx = x - Math.sin(th) * R * sgn, cz = z + Math.cos(th) * R * sgn;
      th += a; x = cx + Math.sin(th) * R * sgn; z = cz - Math.cos(th) * R * sgn;
    }
    const y = sampleRoadY(x, z);
    console.log(`${(sg[4] || sg[0]).padEnd(20)}: pos=(${x.toFixed(1).padStart(6)}, ${z.toFixed(1).padStart(6)}) th=${(th*180/Math.PI).toFixed(0).padStart(4)} deg | RoadY: ${y ? y.toFixed(2) : 'OFF'}`);
  }
}

const testSegs = [
  ['S', 180, -1.6],
  ['S', 160, -4.0],
  ['S', 120, -7.8, 0, 'Main Straight End'],
  ['A', 42, 75, -9.4, 'Yokohama-S'],
  ['S', 20, -9.6],
  ['A', 42, -70, -9.5, 'Castrol-Bogen'],
  ['S', 30, -10.5],
  ['A', 40, 150, -12.0, 'Arena Loop'],
  ['A', 35, 115, -10.5, 'Arena Exit'],
  ['S', 60, -12.0, 0, 'Straight to Ford'],
  ['A', 50, 50, -12.0, 'Ford-Kurve'],
  ['S', 370, -22.0, 0, 'Downhill to Dunlop'],
  ['A', 36, -140, -25.5, 'Dunlop-Kehre'],
];

console.log('Testing geometry walk:');
walk(testSegs);
