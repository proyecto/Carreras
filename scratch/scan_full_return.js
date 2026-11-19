const fs = require('fs');
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const fn = new Function('require', s + '; return { sampleRoadY, getCenter };')(require);

// Let's sample a grid along the loop to find the exact trajectory
// We want to know: from Kumho-Kurve (around X=1150, Z=-180), where does the road lead back to start?
console.log('Tracing road from X=1200 down to X=-60 along Z in [-250, 50]:');
for (let x = 1150; x >= -60; x -= 50) {
  const roadZ = [];
  for (let z = -250; z <= 50; z += 2) {
    if (fn.sampleRoadY(x, z) !== null) roadZ.push(z);
  }
  // group into road ribbons (clusters with gap > 10m)
  const ribbons = [];
  let cur = [];
  for (const z of roadZ) {
    if (cur.length === 0 || z - cur[cur.length-1] <= 6) cur.push(z);
    else { ribbons.push(cur); cur = [z]; }
  }
  if (cur.length > 0) ribbons.push(cur);

  const desc = ribbons.map(r => {
    const cz = (r[0] + r[r.length-1]) / 2;
    const cy = fn.sampleRoadY(x, cz);
    return `Z=${cz.toFixed(1)} (Y=${cy ? cy.toFixed(1) : '?'}, w=${(r[r.length-1]-r[0]).toFixed(0)})`;
  }).join(' | ');

  console.log(`X = ${x.toString().padStart(4)}: ${desc}`);
}
