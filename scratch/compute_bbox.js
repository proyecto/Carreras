// compute_bbox.js
// Reads the GLB and outputs the axis-aligned bounding box (min and max) of all vertex positions.

const fs = require('fs');
const path = require('path');

const glbPath = path.resolve(__dirname, '../tracks/nurburgring-gp.glb');
const buffer = fs.readFileSync(glbPath);
let offset = 0;
function u32() { const v = buffer.readUInt32LE(offset); offset += 4; return v; }
// Header
u32(); // magic
u32(); // version
const length = u32();
let json = null;
let binStart = null, binLen = 0;
while (offset < length) {
  const chunkLen = u32();
  const chunkType = u32();
  if (chunkType === 0x4E4F534A) { // JSON
    json = JSON.parse(buffer.slice(offset, offset + chunkLen).toString());
    offset += chunkLen;
  } else if (chunkType === 0x004E4942) { // BIN\0
    binStart = offset;
    binLen = chunkLen;
    offset += chunkLen;
  } else {
    offset += chunkLen;
  }
}
if (!json) { console.error('No JSON'); process.exit(1); }
if (binStart === null) { console.error('No BIN'); process.exit(1); }
const bin = buffer.slice(binStart, binStart + binLen);
let min = [Infinity, Infinity, Infinity];
let max = [-Infinity, -Infinity, -Infinity];
const meshes = json.meshes || [];
for (const mesh of meshes) {
  for (const prim of mesh.primitives || []) {
    const posIdx = prim.attributes?.POSITION;
    if (posIdx === undefined) continue;
    const accessor = json.accessors[posIdx];
    const view = json.bufferViews[accessor.bufferView];
    const byteOffset = (accessor.byteOffset || 0) + (view.byteOffset || 0);
    const count = accessor.count;
    const dv = new DataView(bin.buffer, bin.byteOffset + byteOffset, view.byteLength);
    for (let i = 0; i < count; i++) {
      const base = i * 12; // 3 * 4 bytes
      const x = dv.getFloat32(base, true);
      const y = dv.getFloat32(base + 4, true);
      const z = dv.getFloat32(base + 8, true);
      if (x < min[0]) min[0] = x;
      if (y < min[1]) min[1] = y;
      if (z < min[2]) min[2] = z;
      if (x > max[0]) max[0] = x;
      if (y > max[1]) max[1] = y;
      if (z > max[2]) max[2] = z;
    }
  }
}
console.log(JSON.stringify({min, max}, null, 2));
