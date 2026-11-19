const fs = require('fs');
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const fn = new Function('require', s + '; return { sampleRoadY, getCenter };')(require);

console.log('Finding road between Ford-Kurve (618, -23) and Dunlop (796, -231):');
for (let x = 620; x <= 800; x += 20) {
  const roadZ = [];
  for (let z = -250; z <= 0; z += 2) {
    if (fn.sampleRoadY(x, z) !== null) roadZ.push(z);
  }
  if (roadZ.length > 0) {
    // group spans
    const spans = [];
    let cur = [];
    for (const z of roadZ) {
      if (cur.length === 0 || z - cur[cur.length-1] <= 4) cur.push(z);
      else { spans.push(cur); cur = [z]; }
    }
    if (cur.length > 0) spans.push(cur);
    const desc = spans.map(sp => 'Z=' + sp[0] + '..' + sp[sp.length-1] + ' (c=' + ((sp[0]+sp[sp.length-1])/2).toFixed(1) + ')').join(' | ');
    console.log(`X = ${x}: ${desc}`);
  }
}

console.log('\nFinding road between Dunlop (740, -235) and Kumho/Bit:');
for (let x = 600; x <= 850; x += 25) {
  const roadZ = [];
  for (let z = -300; z <= 100; z += 5) {
    if (fn.sampleRoadY(x, z) !== null) roadZ.push(z);
  }
  console.log(`X = ${x}: road Z values count=${roadZ.length}, min=${roadZ[0]}, max=${roadZ[roadZ.length-1]}`);
}
