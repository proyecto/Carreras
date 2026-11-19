const fs = require('fs');
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const fn = new Function('require', s + '; return { sampleRoadY, getCenter };')(require);

console.log('Road spans for X in [800, 1200]:');
for (let x = 800; x <= 1200; x += 50) {
  const roadZ = [];
  for (let z = -300; z <= 100; z += 5) {
    if (fn.sampleRoadY(x, z) !== null) roadZ.push(z);
  }
  // group spans
  const spans = [];
  let cur = [];
  for (const z of roadZ) {
    if (cur.length === 0 || z - cur[cur.length-1] <= 10) cur.push(z);
    else { spans.push(cur); cur = [z]; }
  }
  if (cur.length > 0) spans.push(cur);
  const desc = spans.map(sp => 'Z=' + sp[0] + '..' + sp[sp.length-1] + ' (c=' + ((sp[0]+sp[sp.length-1])/2).toFixed(1) + ')').join(' | ');
  console.log(`X = ${x}: ${desc}`);
}
