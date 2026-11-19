const fs = require('fs');

// We know the required headings at key straight sections:
// 1. Main Straight: th = 0 deg
// 2. Castrol Exit: th = 5 deg
// 3. Ford Approach (after Arena): th = 270 deg (-90 deg)
//    Turn through Arena = 270 - 5 = +265 deg!
// 4. Dunlop Downhill (after Ford): th = 320 deg (-40 deg)
//    Turn through Ford-Kurve = 320 - 270 = +50 deg!
// 5. Dunlop Kehre Exit:
//    Heading of Dunlop Kehre exit:
//    In calc_angles_from_targets:
//    Dunlop Approach was th = -70 deg (= 290 deg)
//    Dunlop Hairpin Exit was th = 156 deg
//    Turn through Dunlop = 156 - 290 = -134 deg (LEFT turn)!
// 6. Schumacher Chicane / Valley Approach: th = 9 deg
//    Turn from 156 to 9 = -147 deg!
// 7. Valley Straight: th = 0 deg
// 8. Kumho Hairpin:
//    Kumho Approach is th = 0 deg.
//    Kumho Return is th = 180 deg.
//    Turn through Kumho = 180 - 0 = +180 deg (RIGHT turn)!
// 9. Valley Return Straight: th = 180 deg
// 10. Infield Climb / Bit-Kurve:
//    Bit-Kurve Exit is Back Straight with th = 180 deg!
//    Turn through Infield + Bit = 180 - 180 = 0 deg! (or S-curve)
// 11. Coca-Cola-Kurve:
//    Back Straight is th = 180 deg.
//    Main Straight is th = 0 deg (or 360 deg).
//    Turn through Coca-Cola = 360 - 180 = +180 deg (RIGHT turn)!

console.log('Verifying total angle sum of circuit:');
const turns = [
  { name: 'Yokohama-S', a: 75 },
  { name: 'Castrol-Bogen', a: -70 },
  { name: 'Arena Loop + Exit', a: 265 },
  { name: 'Ford-Kurve', a: 50 },
  { name: 'Dunlop-Kehre', a: -140 },
  { name: 'Schumacher Chicane', a: -145 }, // or links Dunlop to valley
  { name: 'Kumho-Kurve', a: 180 },
  { name: 'Bit-Kurve S', a: -35 + 35 },
  { name: 'Veedol Chicane', a: -30 + 60 - 30 },
  { name: 'Coca-Cola-Kurve', a: 180 }
];

let sum = 0;
turns.forEach(t => {
  sum += t.a;
  console.log(`${t.name.padEnd(24)}: turn=${t.a.toString().padStart(4)} deg | cum=${sum.toString().padStart(4)} deg`);
});
console.log(`Total angle: ${sum} deg`);
