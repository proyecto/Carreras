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

// Verified key checkpoints from the GLB mesh:
const CPs = [
  { name: "Start/Finish", x: -60, z: 0.0, y: -0.22 },
  { name: "Main Straight", x: 380, z: 2.0, y: -6.80 },
  { name: "Turn 1 Apex", x: 450.8, z: 24.6, y: -9.38 },
  { name: "Turn 1 Exit", x: 437.2, z: 60.4, y: -9.69 },
  { name: "Turn 2 Castrol", x: 391.7, z: 78.3, y: -8.30 },
  { name: "Arena Entry", x: 410, z: 120, y: -10.90 },
  { name: "Arena Hairpin", x: 468.6, z: 200.3, y: -11.90 },
  { name: "Arena Exit Straight", x: 548.4, z: 77.8, y: -10.43 },
  { name: "Ford-Kurve Entry", x: 583.1, z: 18.2, y: -16.28 },
  { name: "Ford-Kurve Apex", x: 618.6, z: -22.7, y: -11.91 },
  { name: "Dunlop Hairpin", x: 796.5, z: -231.0, y: -25.01 },
  { name: "Schumacher Chicane", x: 706.2, z: -182.0, y: -19.16 },
  { name: "Kumho Far Turn", x: 1160.0, z: -175.0, y: -42.47 },
  { name: "Bit-Kurve Entry", x: 578.7, z: 68.1, y: -11.25 },
  { name: "Bit-Kurve Apex", x: 509.7, z: 60.7, y: -4.03 },
  { name: "Back Straight", x: 299.3, z: -3.8, y: -4.36 },
  { name: "Chicane Approach", x: 150, z: 1.8, y: -2.03 },
  { name: "Coca-Cola-Kurve", x: -330, z: 0.0, y: -0.39 },
  { name: "Final Straight", x: -150, z: 0.0, y: 0.33 }
];

console.log('Testing each checkpoint against GLB road mesh:');
CPs.forEach((cp, i) => {
  const y = sampleRoadY(cp.x, cp.z);
  console.log(`${i.toString().padStart(2)}: ${cp.name.padEnd(22)} (${cp.x.toFixed(1).padStart(7)}, ${cp.z.toFixed(1).padStart(7)}) -> Y: ${y ? y.toFixed(2) : 'NULL'}`);
});
