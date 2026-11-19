// list_glb_nodes.js
// Reads the GLB file and prints all node names with their indices.

const fs = require('fs');
const path = require('path');

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
  offset += chunkLength; // skip other chunks
}
if (!json) {
  console.error('JSON chunk not found');
  process.exit(1);
}
const nodes = json.nodes || [];
console.log('Total nodes:', nodes.length);
nodes.forEach((node, i) => {
  if (node.name) {
    console.log(i, node.name);
  }
});
