const fs = require('fs');
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const fn = new Function('require', s + '; return { sampleRoadY, getCenter };')(require);

console.log('Tracing from (750, -192) back to start:');
// Search road points starting from 750, -192
let cur = { x: 750, z: -192 };
for (let step = 0; step < 40; step++) {
  // Search in a circle of radius 25m in direction roughly towards -X or +Z
  let bestNext = null;
  let minAngleDiff = Infinity;
  for (let da = 0; da < 360; da += 10) {
    const rad = da * Math.PI / 180;
    const testX = cur.x + Math.cos(rad) * 20;
    const testZ = cur.z + Math.sin(rad) * 20;
    // Don't go back towards +X if we're heading west
    const hit = fn.getCenter(testX, testZ, 6);
    if (hit) {
      // Check if it's not the same point
      if (Math.hypot(hit.x - cur.x, hit.z - cur.z) > 12) {
        bestNext = hit;
        // Prioritize moving west / towards start (-60, 0)
        break;
      }
    }
  }
}

// Let's scan a 2D box X in [-100, 750], Z in [-250, 50]
console.log('Road points between X in [-100, 750], Z in [-250, -50]:');
for (let x = 750; x >= -100; x -= 50) {
  const pts = [];
  for (let z = -250; z <= -30; z += 2) {
    const y = fn.sampleRoadY(x, z);
    if (y !== null) pts.push({z, y});
  }
  if (pts.length > 0) {
    const minZ = pts[0].z, maxZ = pts[pts.length-1].z;
    const cz = (minZ + maxZ) / 2;
    const cy = fn.sampleRoadY(x, cz);
    console.log(`X = ${x.toString().padStart(4)}: Z=[${minZ}, ${maxZ}] (cz=${cz.toFixed(1)}, Y=${cy ? cy.toFixed(1) : '?'})`);
  }
}
