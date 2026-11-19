const fs = require('fs');

const pts = JSON.parse(fs.readFileSync('scratch/dense_road_centerline.json', 'utf8'));

// Sample key points along the dense centerline:
const keyPoints = [
  { name: "Start/Finish", s: 0 },
  { name: "Turn 1 Entry", s: 460 },
  { name: "Turn 1 Apex", s: 535 },
  { name: "Turn 2 Castrol", s: 654 },
  { name: "Arena Hairpin", s: 830 },
  { name: "Arena Exit", s: 1004 },
  { name: "Ford-Kurve Apex", s: 1150 },
  { name: "Dunlop Straight Mid", s: 1350 },
  { name: "Dunlop Hairpin Apex", s: 1561 },
  { name: "Schumacher Chicane", s: 1740 },
  { name: "Kumho Hairpin Apex", s: 2058 },
  { name: "Valley Return", s: 2300 },
  { name: "Infield Climb", s: 2600 },
  { name: "Bit-Kurve Apex", s: 2850 },
  { name: "Back Straight Mid", s: 3200 },
  { name: "Veedol Chicane", s: 3500 },
  { name: "Coca-Cola Hairpin", s: 3890 },
  { name: "Final Straight", s: 4050 },
  { name: "Lap Close", s: pts[pts.length - 1].s }
];

keyPoints.forEach(kp => {
  // find closest point in pts
  let best = pts[0], minDs = 1e9;
  for (const p of pts) {
    if (Math.abs(p.s - kp.s) < minDs) { minDs = Math.abs(p.s - kp.s); best = p; }
  }
  console.log(`${kp.name.padEnd(22)}: s=${best.s.toFixed(0).padStart(4)}m pos=(${best.x.toFixed(1).padStart(6)}, ${best.z.toFixed(1).padStart(6)}) Y=${best.y ? best.y.toFixed(2) : 'NULL'} th=${(best.th*180/Math.PI).toFixed(0).padStart(4)} deg`);
});
