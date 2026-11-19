const fs = require('fs');

function solveLoop(segments) {
  let th = 0;
  let angSum = 0;
  let lwHeading = null, lnHeading = null;
  for (const sg of segments) {
    if (sg[0] === 'S') {
      if (sg[1] === 'Lw') lwHeading = th;
      if (sg[1] === 'Ln') lnHeading = th;
    } else {
      th += sg[2] * Math.PI / 180;
      angSum += sg[2];
    }
  }
  return {
    totalAngleDeg: angSum,
    lwDeg: lwHeading !== null ? (lwHeading * 180 / Math.PI) % 360 : null,
    lnDeg: lnHeading !== null ? (lnHeading * 180 / Math.PI) % 360 : null
  };
}

// In Nürburgring GP:
// Clockwise circuit.
// Yokohama-S: turns right (+75) -> th = 75
// Castrol-Bogen: turns left (-70) -> th = 5
// Mercedes-Arena 1: turns right (+150) -> th = 155
// Mercedes-Arena Exit: turns right (+115) -> th = 270 (-90)
// Ford-Kurve: turns right (+50) -> th = 320 (-40)
// Dunlop-Kehre: turns left (-140) -> th = 180 (heading west towards Kumho!)
// Schumacher-S 1: turns right (+40) -> th = 220
// Schumacher-S 2: turns left (-40) -> th = 180 (heading west!)
// Kumho-Kurve: turns right (+140) -> th = 320
// Bit-Kurve: turns right (+90) -> th = 410 = 50 deg
// Wait! If Kumho is the turnaround, where is the return straight?
