const fs = require('fs');
const s = fs.readFileSync('scratch/test_checkpoints.js', 'utf8');
const { sampleRoadY } = new Function('require', s + '; return { sampleRoadY };')(require);

// Guided tracer that follows the exact known sequence of checkpoints:
const targets = [
  { name: "Start/Finish", x: -60, z: 0 },
  { name: "Main Straight Mid", x: 150, z: 0 },
  { name: "Main Straight End", x: 380, z: 0 },
  { name: "Turn 1 Entry", x: 410, z: 5 },
  { name: "Turn 1 Apex", x: 450, z: 25 },
  { name: "Turn 1 Exit", x: 437, z: 60 },
  { name: "Turn 2 Castrol", x: 391, z: 78 },
  { name: "Arena Entry", x: 410, z: 120 },
  { name: "Arena South", x: 444, z: 167 },
  { name: "Arena Hairpin", x: 470, z: 200 },
  { name: "Arena North", x: 535, z: 150 },
  { name: "Arena Exit Straight", x: 549, z: 78 },
  { name: "Ford-Kurve Entry", x: 582, z: 18 },
  { name: "Ford-Kurve Apex", x: 618, z: -23 },
  { name: "Dunlop Straight 1", x: 660, z: -45 },
  { name: "Dunlop Straight 2", x: 700, z: -80 },
  { name: "Dunlop Approach", x: 725, z: -150 },
  { name: "Dunlop Hairpin Entry", x: 740, z: -225 },
  { name: "Dunlop Hairpin Apex", x: 796, z: -231 },
  { name: "Dunlop Hairpin Exit", x: 760, z: -215 },
  { name: "Schumacher Approach", x: 800, z: -200 },
  { name: "Valley Straight 1", x: 880, z: -188 },
  { name: "Valley Straight 2", x: 960, z: -186 },
  { name: "Valley Straight 3", x: 1040, z: -195 },
  { name: "Kumho Entry", x: 1110, z: -205 },
  { name: "Kumho Hairpin Apex", x: 1160, z: -175 },
  { name: "Kumho Return Exit", x: 1110, z: -150 },
  { name: "Valley Return 1", x: 1040, z: -150 },
  { name: "Valley Return 2", x: 960, z: -150 },
  { name: "Valley Return 3", x: 880, z: -135 },
  { name: "Infield Climb 1", x: 800, z: -45 },
  { name: "Infield Climb 2", x: 720, z: -15 },
  { name: "Infield Climb 3", x: 640, z: 25 },
  { name: "Bit-Kurve Entry", x: 580, z: 70 },
  { name: "Bit-Kurve Apex", x: 510, z: 60 },
  { name: "Back Straight 1", x: 420, z: 35 },
  { name: "Back Straight 2", x: 300, z: -3 },
  { name: "Chicane Approach", x: 180, z: 0 },
  { name: "Veedol Chicane Entry", x: 140, z: 0 },
  { name: "Veedol Chicane Apex", x: 80, z: 0 },
  { name: "Coca-Cola Entry", x: -250, z: 0 },
  { name: "Coca-Cola Hairpin", x: -330, z: 0 },
  { name: "Straight Return 1", x: -250, z: 0 },
  { name: "Straight Return 2", x: -150, z: 0 },
  { name: "Start/Finish Return", x: -60, z: 0 },
];

console.log('Testing all targets on GLB road mesh:');
targets.forEach((t, i) => {
  const y = sampleRoadY(t.x, t.z);
  console.log(`${i.toString().padStart(2)}: ${t.name.padEnd(24)} (${t.x.toString().padStart(5)}, ${t.z.toString().padStart(5)}) -> Y: ${y ? y.toFixed(2) : 'NULL'}`);
});
