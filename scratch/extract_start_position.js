// extract_start_position.js
// Parses the GLB file and computes a simple start position based on the bounding box of all mesh vertices.
// Heuristic: choose the vertex with the smallest Z coordinate (most "forward" direction) as the start grid.
// Output: JSON {position:{x,y,z}, rotation:{yaw:0,pitch:0,roll:0}}

const fs = require('fs');
const path = require('path');

const glbPath = path.resolve(__dirname, '../tracks/nurburgring-gp.glb');
const buffer = fs.readFileSync(glbPath);
let offset = 0;
function readUint32() { const v = buffer.readUInt32LE(offset); offset += 4; return v; }
function readUint8() { const v = buffer.readUInt8(offset); offset += 1; return v; }

// GLB header (12 bytes)
const magic = readUint32(); // 0x46546C67
const version = readUint32();
const length = readUint32();
let json = null;
let binaryChunkStart = null;
let binaryChunkLength = 0;
while (offset < length) {
  const chunkLength = readUint32();
  const chunkType = readUint32();
  if (chunkType === 0x4E4F534A) { // 'JSON'
    const jsonChunk = buffer.slice(offset, offset + chunkLength).toString('utf8');
    json = JSON.parse(jsonChunk);
    offset += chunkLength;
  } else if (chunkType === 0x004E4942) { // 'BIN\0'
    binaryChunkStart = offset;
    binaryChunkLength = chunkLength;
    offset += chunkLength;
  } else {
    // Skip unknown chunk
    offset += chunkLength;
  }
}
if (!json) {
  console.error('No JSON chunk found');
  process.exit(1);
}
if (binaryChunkStart === null) {
  console.error('No binary chunk found');
  process.exit(1);
}
const binary = buffer.slice(binaryChunkStart, binaryChunkStart + binaryChunkLength);

function getFloat32(view, offset) {
  return view.getFloat32(offset, true); // little-endian
}

let minZ = Infinity;
let startPos = { x: 0, y: 0, z: 0 };

// Iterate meshes and their primitives
const meshes = json.meshes || [];
for (const mesh of meshes) {
  const primitives = mesh.primitives || [];
  for (const prim of primitives) {
    const positionAccessorIdx = prim.attributes?.POSITION;
    if (positionAccessorIdx === undefined) continue;
    const accessor = json.accessors[positionAccessorIdx];
    const bufferView = json.bufferViews[accessor.bufferView];
    const stride = accessor.byteStride || 0; // not always present; we compute from type
    const componentSize = 4; // FLOAT (5126)
    const numComponents = accessor.type === 'VEC3' ? 3 : 0;
    const count = accessor.count;
    const byteOffset = (accessor.byteOffset || 0) + (bufferView.byteOffset || 0);
    const view = new DataView(binary.buffer, binary.byteOffset + byteOffset, bufferView.byteLength);
    for (let i = 0; i < count; i++) {
      const base = i * numComponents * componentSize;
      const x = view.getFloat32(base, true);
      const y = view.getFloat32(base + 4, true);
      const z = view.getFloat32(base + 8, true);
      if (z < minZ) {
        minZ = z;
        startPos = { x, y, z };
      }
    }
  }
}
if (minZ === Infinity) {
  console.error('No POSITION data found');
  process.exit(1);
}

const result = {
  position: startPos,
  rotation: { yaw: 0, pitch: 0, roll: 0 }
};
console.log(JSON.stringify(result, null, 2));
