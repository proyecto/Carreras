const fs = require('fs');

const forward = JSON.parse(fs.readFileSync('scratch/full_traced_loop.json', 'utf8'));
console.log('Forward trace points:', forward.length);
console.log('Forward start:', forward[0]);
console.log('Forward end:', forward[forward.length - 1]);

// Let us inspect the forward trace around start:
// In trace_entire_loop.js, remember it drifted into the paddock at s=120m (pos 46.2, 35.9).
// On the main straight, the actual track is at Z = -7 .. 0!
// Let us fix the main straight points: from x = -60 to x = 400, z is in [-7, 0]!
