const fs = require('fs');

const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const { sampleRoadY } = new Function('require', s + '; return { sampleRoadY, getCenter };')(require);

const waypoints = [
  { name: "Start/Finish", x: -60, z: 0.0, y: -0.22 },
  { name: "Main Straight 1", x: 100, z: 0.0, y: -1.45 },
  { name: "Main Straight 2", x: 250, z: 0.0, y: -3.50 },
  { name: "Main Straight 3", x: 380, z: 2.0, y: -6.80 },
  { name: "Turn 1 Entry", x: 420, z: 5.0, y: -8.10 },
  { name: "Turn 1 Apex", x: 450.8, z: 24.6, y: -9.38 },
  { name: "Turn 1 Exit", x: 437.2, z: 60.4, y: -9.69 },
  { name: "Turn 2 Castrol", x: 391.7, z: 78.3, y: -8.30 },
  { name: "Arena Entry", x: 410, z: 120, y: -10.90 },
  { name: "Arena South", x: 444.2, z: 167.3, y: -12.18 },
  { name: "Arena Hairpin", x: 468.6, z: 200.3, y: -11.90 },
  { name: "Arena North", x: 534.4, z: 150.2, y: -10.05 },
  { name: "Arena Exit Straight", x: 548.4, z: 77.8, y: -10.43 },
  { name: "Ford-Kurve Entry", x: 583.1, z: 18.2, y: -16.28 },
  { name: "Ford-Kurve Apex", x: 618.6, z: -22.7, y: -11.91 },
  { name: "Dunlop Straight 1", x: 660, z: -55, y: -14.50 },
  { name: "Dunlop Approach", x: 717.2, z: -164.7, y: -18.31 },
  { name: "Dunlop Hairpin", x: 796.5, z: -231.0, y: -25.01 },
  { name: "Dunlop Exit", x: 739.3, z: -231.4, y: -20.08 },
  { name: "Schumacher Chicane", x: 706.2, z: -182.0, y: -19.16 },
  { name: "Return Infield", x: 629.7, z: -22.2, y: -10.94 },
  { name: "Straight to Bit", x: 578.7, z: 68.1, y: -11.25 },
  { name: "Bit-Kurve Apex", x: 509.7, z: 60.7, y: -4.03 },
  { name: "Back Straight", x: 299.3, z: -3.8, y: -4.36 },
  { name: "Chicane Approach", x: 150, z: 1.8, y: -2.03 },
  { name: "Coca-Cola-Kurve", x: 0, z: 2.2, y: -0.67 }
];

// Check all waypoints
console.log('Testing each waypoint:');
waypoints.forEach((wp, i) => {
  const y = sampleRoadY(wp.x, wp.z);
  console.log(`WP ${i.toString().padStart(2)}: ${wp.name.padEnd(22)} (${wp.x.toFixed(1).padStart(6)}, ${wp.z.toFixed(1).padStart(6)}) -> RoadY: ${y ? y.toFixed(2) : 'NULL'}`);
});
