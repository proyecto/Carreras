const fs = require('fs');

// Global mock environment for track-builder
global.TRK = {};
global.PI = Math.PI;
global.sat = x => Math.max(0, Math.min(1, x));
global.clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const tbCode = fs.readFileSync('world/track-builder.js', 'utf8');
eval(tbCode);

console.log('trackBuild loaded successfully! Type:', typeof trackBuild);
