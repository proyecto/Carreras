/**
 * fix_mclaren_x2_glb.js
 *
 * El GLB del McLaren X2 tiene los buffers de índices declarados como Uint32
 * (componentType 5125) pero los datos binarios son realmente Uint16 (5123).
 * Este script reescribe el GLB corrigiendo los 3 accessors de índices:
 *   - accessor 3 (Body)
 *   - accessor 7 (Glass)
 *   - accessor 11 (Wheel)
 * cambiando componentType a 5123 y recalculando count correcto.
 * No toca ningún dato binario — solo actualiza el JSON del header GLB.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const INPUT  = path.join(__dirname, '../cars/models/mclaren-x2-2018.glb');
const OUTPUT = path.join(__dirname, '../cars/models/mclaren-x2-2018.glb');
const BACKUP = path.join(__dirname, '../cars/models/mclaren-x2-2018.glb.bak');

const buf = fs.readFileSync(INPUT);

// --- Parse GLB header ---
const magic   = buf.readUInt32LE(0);
const version = buf.readUInt32LE(4);
const length  = buf.readUInt32LE(8);
if (magic !== 0x46546c67) throw new Error('Not a GLB file');

const jsonChunkLen  = buf.readUInt32LE(12);
const jsonChunkType = buf.readUInt32LE(16);
if (jsonChunkType !== 0x4e4f534a) throw new Error('First chunk is not JSON');

const jsonStr = buf.slice(20, 20 + jsonChunkLen).toString('utf8').replace(/\0+$/, '');
const gltf = JSON.parse(jsonStr);

const binChunkOffset = 20 + jsonChunkLen;
const binChunkLen  = buf.readUInt32LE(binChunkOffset);
const binChunkType = buf.readUInt32LE(binChunkOffset + 4);
if (binChunkType !== 0x004e4942) throw new Error('Second chunk is not BIN');

const binStart = binChunkOffset + 8; // absolute byte offset in file where BIN data starts

// --- Fix index accessors ---
// Map: accessorIndex → { bufferViewIndex, vertexCount }
const indexAccessors = [
  { accIdx: 3,  bvIdx: 3,  vertexCount: gltf.accessors[0].count  }, // Body
  { accIdx: 7,  bvIdx: 7,  vertexCount: gltf.accessors[4].count  }, // Glass
  { accIdx: 11, bvIdx: 11, vertexCount: gltf.accessors[8].count  }, // Wheel
];

for (const { accIdx, bvIdx, vertexCount } of indexAccessors) {
  const acc = gltf.accessors[accIdx];
  const bv  = gltf.bufferViews[bvIdx];

  if (acc.componentType !== 5125) {
    console.log(`Accessor ${accIdx}: already NOT Uint32 (${acc.componentType}), skipping`);
    continue;
  }

  // Reinterpret as Uint16
  const dataStart = binStart + bv.byteOffset;
  const uint16Data = new Uint16Array(
    buf.buffer.slice(buf.byteOffset + dataStart, buf.byteOffset + dataStart + bv.byteLength)
  );

  const maxIdx = Math.max(...Array.from(uint16Data));
  const countRaw = uint16Data.length;
  const countValid = countRaw - (countRaw % 3); // round down to multiple of 3

  console.log(`Accessor ${accIdx}: byteLength=${bv.byteLength}, Uint16 count=${countRaw} → valid=${countValid}, maxIdx=${maxIdx}, vertexCount=${vertexCount}`);

  if (maxIdx >= vertexCount) {
    throw new Error(`Accessor ${accIdx}: maxIdx ${maxIdx} >= vertexCount ${vertexCount} even as Uint16! Cannot fix automatically.`);
  }

  // Update accessor
  acc.componentType = 5123; // Uint16
  acc.count = countValid;
  delete acc.min;
  delete acc.max;

  // byteLength in bufferView already holds the actual byte count — keep it,
  // but update to match the valid count (trim trailing dangling bytes)
  bv.byteLength = countValid * 2;
}

// --- Rebuild GLB ---
// Pad JSON to 4-byte boundary with spaces
let newJsonStr = JSON.stringify(gltf);
while (newJsonStr.length % 4 !== 0) newJsonStr += ' ';
const newJsonBuf = Buffer.from(newJsonStr, 'utf8');

// Keep the original BIN chunk exactly as-is (we did not change any binary data)
const origBinChunkFull = buf.slice(binChunkOffset); // includes chunk header (8 bytes) + data

const totalLength = 12 + 8 + newJsonBuf.length + origBinChunkFull.length;
const out = Buffer.alloc(totalLength);

// GLB header
out.writeUInt32LE(0x46546c67, 0);       // magic
out.writeUInt32LE(2, 4);                // version
out.writeUInt32LE(totalLength, 8);      // total length

// JSON chunk
out.writeUInt32LE(newJsonBuf.length, 12);  // chunk length
out.writeUInt32LE(0x4e4f534a, 16);         // chunk type JSON
newJsonBuf.copy(out, 20);

// BIN chunk (verbatim)
origBinChunkFull.copy(out, 20 + newJsonBuf.length);

// --- Write ---
fs.copyFileSync(INPUT, BACKUP);
console.log(`Backup saved to ${BACKUP}`);
fs.writeFileSync(OUTPUT, out);
console.log(`Fixed GLB written to ${OUTPUT} (${out.length} bytes, was ${buf.length} bytes)`);

// --- Verify ---
const vBuf = fs.readFileSync(OUTPUT);
const vJsonLen = vBuf.readUInt32LE(12);
const vJson = JSON.parse(vBuf.slice(20, 20 + vJsonLen).toString('utf8').replace(/\0+$/, ''));
const vBinStart = 20 + vJsonLen + 8;
let ok = true;
for (const { accIdx, bvIdx, vertexCount } of indexAccessors) {
  const acc = vJson.accessors[accIdx];
  const bv  = vJson.bufferViews[bvIdx];
  const data = new Uint16Array(vBuf.buffer.slice(vBuf.byteOffset + vBinStart + bv.byteOffset, vBuf.byteOffset + vBinStart + bv.byteOffset + bv.byteLength));
  const max = Math.max(...Array.from(data));
  const pct3 = data.length % 3;
  const pass = acc.componentType === 5123 && max < vertexCount && pct3 === 0;
  console.log(`VERIFY accessor ${accIdx}: componentType=${acc.componentType}(5123?), count=${acc.count}, max=${max}<${vertexCount}? %3=${pct3} → ${pass ? '✅ PASS' : '❌ FAIL'}`);
  if (!pass) ok = false;
}
console.log(ok ? '\n✅ All checks passed.' : '\n❌ Fix failed — check errors above.');
