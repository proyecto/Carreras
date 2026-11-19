// extract_start_grid.js
// Reads the GLB file for Nürburgring‑GP and extracts the position and rotation of a node whose name contains 'grid'.
// Output: JSON with {position:{x,y,z}, rotation:{yaw,pitch,roll}} (yaw in radians).

const fs = require('fs');
const path = require('path');

// Path to the GLB file relative to this script.
const glbPath = path.resolve(__dirname, '../tracks/nurburgring-gp.glb');
const buffer = fs.readFileSync(glbPath);
let offset = 0;
function readUint32() { const v = buffer.readUInt32LE(offset); offset += 4; return v; }
// GLB header
const magic = readUint32(); // 0x46546C67
const version = readUint32();
const length = readUint32();
let json = null;
while (offset < length) {
  const chunkLength = readUint32();
  const chunkType = readUint32();
  if (chunkType === 0x4E4F534A) { // 'JSON'
    const jsonChunk = buffer.slice(offset, offset + chunkLength).toString('utf8');
    json = JSON.parse(jsonChunk);
    break;
  }
  // skip other chunks (e.g., BIN)
  offset += chunkLength;
}
if (!json) {
  console.error('No JSON chunk found in GLB');
  process.exit(1);
}

// Helper to recursively find a node whose name contains the given substring (case‑insensitive).
function findNodeByIndex(nodes, index, namePart) {
  const node = nodes[index];
  if (node.name && node.name.toLowerCase().includes(namePart)) return node;
  if (node.children) {
    for (const childIdx of node.children) {
      const found = findNodeByIndex(nodes, childIdx, namePart);
      if (found) return found;
    }
  }
  return null;
}

const nodes = json.nodes || [];
let gridNode = null;
for (let i = 0; i < nodes.length; i++) {
  gridNode = findNodeByIndex(nodes, i, 'grid');
  if (gridNode) break;
}
if (!gridNode) {
  console.error('No node containing "grid" found in the GLB');
  process.exit(1);
}

const posArray = gridNode.translation || [0, 0, 0];
const rotArray = gridNode.rotation || [0, 0, 0, 1]; // quaternion x,y,z,w
const [x, y, z, w] = rotArray;
// Compute yaw (rotation around Y) from quaternion.
const yaw = Math.atan2(2 * (w * y + x * z), 1 - 2 * (y * y + z * z));
// Assume pitch and roll are zero for the start grid marker.
const result = {
  position: { x: posArray[0], y: posArray[1], z: posArray[2] },
  rotation: { yaw, pitch: 0, roll: 0 }
};

console.log(JSON.stringify(result, null, 2));
