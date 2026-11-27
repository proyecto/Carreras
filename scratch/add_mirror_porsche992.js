/**
 * add_mirror_porsche992.js
 * Separa los triángulos de los espejos retrovisores (interior y laterales)
 * del nodo Body de porsche-992-gt3-r-2024.glb a un nodo "Mirror" con UVs [0..1]
 * para proyectar la textura del retrovisor digital.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const GLB_PATH = path.join(__dirname, '../cars/models/porsche-992-gt3-r-2024.glb');
const BAK_PATH = GLB_PATH + '.bak_mirror';

if (!fs.existsSync(BAK_PATH)) {
  fs.copyFileSync(GLB_PATH, BAK_PATH);
}
const buf = fs.readFileSync(BAK_PATH);

const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8').replace(/\0+$/, ''));
const binOffset = 20 + jsonLen + 8;
const binBuf = buf.slice(binOffset);

const getF32 = (accIdx) => {
  const acc = gltf.accessors[accIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const off = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  return new Float32Array(binBuf.buffer, binBuf.byteOffset + off, acc.count * (acc.type === 'VEC3' ? 3 : 2));
};

const pos = getF32(0);
const nrm = getF32(1);
const uv  = getF32(2);
const idxAcc = gltf.accessors[3];
const bvI = gltf.bufferViews[idxAcc.bufferView];
const offI = (bvI.byteOffset || 0) + (idxAcc.byteOffset || 0);
const idx = idxAcc.componentType === 5123
  ? new Uint16Array(binBuf.buffer, binBuf.byteOffset + offI, idxAcc.count)
  : new Uint32Array(binBuf.buffer, binBuf.byteOffset + offI, idxAcc.count);

const bodyIdx = [];
const mirrorGroups = { interior: [], left: [], right: [] };

for (let t = 0; t < idx.length; t += 3) {
  const i0 = idx[t], i1 = idx[t+1], i2 = idx[t+2];
  const cx = (pos[i0*3] + pos[i1*3] + pos[i2*3]) / 3;
  const cy = (pos[i0*3+1] + pos[i1*3+1] + pos[i2*3+1]) / 3;
  const cz = (pos[i0*3+2] + pos[i1*3+2] + pos[i2*3+2]) / 3;
  const nx = (nrm[i0*3] + nrm[i1*3] + nrm[i2*3]) / 3;

  if (nx < -0.6) {
    if (cx > 0.0 && cx < 0.9 && cy > 0.95 && cy < 1.25 && Math.abs(cz) < 0.20) {
      mirrorGroups.interior.push(i0, i1, i2);
      continue;
    }
    if (cx > 0.2 && cx < 0.9 && cy > 0.65 && cy < 1.00 && cz < -0.80) {
      mirrorGroups.left.push(i0, i1, i2);
      continue;
    }
    if (cx > 0.2 && cx < 0.9 && cy > 0.65 && cy < 1.00 && cz > 0.80) {
      mirrorGroups.right.push(i0, i1, i2);
      continue;
    }
  }
  bodyIdx.push(i0, i1, i2);
}

// Construir geometría del nodo Mirror con UVs proyectadas [0..1] por cada espejo
const mPos = [], mNrm = [], mUv = [], mIdx = [];
let vCount = 0;

for (const [name, tris] of Object.entries(mirrorGroups)) {
  if (tris.length === 0) continue;
  let minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const vi of tris) {
    const y = pos[vi*3+1], z = pos[vi*3+2];
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const spanZ = Math.max(0.01, maxZ - minZ);
  const spanY = Math.max(0.01, maxY - minY);
  const remap = new Map();
  for (const vi of tris) {
    let nv = remap.get(vi);
    if (nv === undefined) {
      nv = vCount++;
      remap.set(vi, nv);
      mPos.push(pos[vi*3], pos[vi*3+1], pos[vi*3+2]);
      mNrm.push(nrm[vi*3], nrm[vi*3+1], nrm[vi*3+2]);
      const u = (pos[vi*3+2] - minZ) / spanZ;
      const v = 1.0 - (pos[vi*3+1] - minY) / spanY;
      mUv.push(u, v);
    }
    mIdx.push(nv);
  }
  console.log(`Mirror [${name}]: ${tris.length / 3} tris, Z[${minZ.toFixed(3)},${maxZ.toFixed(3)}] Y[${minY.toFixed(3)},${maxY.toFixed(3)}]`);
}

// Actualizar bufferView de índices del Body
const newBodyIdxBuf = idxAcc.componentType === 5123
  ? Buffer.from(new Uint16Array(bodyIdx).buffer)
  : Buffer.from(new Uint32Array(bodyIdx).buffer);
newBodyIdxBuf.copy(binBuf, offI);
idxAcc.count = bodyIdx.length;
bvI.byteLength = newBodyIdxBuf.length;

// Añadir buffers del nodo Mirror al final de binBuf
const align4 = (b) => {
  const rem = b.length % 4;
  return rem === 0 ? b : Buffer.concat([b, Buffer.alloc(4 - rem)]);
};

const mPosBuf = Buffer.from(new Float32Array(mPos).buffer);
const mNrmBuf = Buffer.from(new Float32Array(mNrm).buffer);
const mUvBuf  = Buffer.from(new Float32Array(mUv).buffer);
const mIdxBuf = Buffer.from(new Uint16Array(mIdx).buffer);

const chunks = [align4(binBuf)];
let curOff = chunks[0].length;

const addBV = (b) => {
  const idxBV = gltf.bufferViews.length;
  gltf.bufferViews.push({ buffer: 0, byteOffset: curOff, byteLength: b.length });
  const ab = align4(b);
  chunks.push(ab);
  curOff += ab.length;
  return idxBV;
};

const bvMPos = addBV(mPosBuf);
const bvMNrm = addBV(mNrmBuf);
const bvMUv  = addBV(mUvBuf);
const bvMIdx = addBV(mIdxBuf);

const accBase = gltf.accessors.length;
gltf.accessors.push(
  { bufferView: bvMPos, byteOffset: 0, componentType: 5126, count: vCount, type: 'VEC3' },
  { bufferView: bvMNrm, byteOffset: 0, componentType: 5126, count: vCount, type: 'VEC3' },
  { bufferView: bvMUv,  byteOffset: 0, componentType: 5126, count: vCount, type: 'VEC2' },
  { bufferView: bvMIdx, byteOffset: 0, componentType: 5123, count: mIdx.length, type: 'SCALAR' }
);

const matIdx = gltf.materials.length;
gltf.materials.push({ name: 'Mirror' });

const meshIdx = gltf.meshes.length;
gltf.meshes.push({
  name: 'MirrorMesh',
  primitives: [{
    attributes: { POSITION: accBase, NORMAL: accBase + 1, TEXCOORD_0: accBase + 2 },
    indices: accBase + 3,
    material: matIdx
  }]
});

const nodeIdx = gltf.nodes.length;
gltf.nodes.push({ name: 'Mirror', mesh: meshIdx });
if (gltf.scenes && gltf.scenes[0] && Array.isArray(gltf.scenes[0].nodes)) {
  gltf.scenes[0].nodes.push(nodeIdx);
}

const fullBin = Buffer.concat(chunks);
gltf.buffers[0].byteLength = fullBin.length;

let newJsonStr = JSON.stringify(gltf);
while (newJsonStr.length % 4 !== 0) newJsonStr += ' ';
const newJsonBuf = Buffer.from(newJsonStr, 'utf8');

const totalLen = 12 + 8 + newJsonBuf.length + 8 + fullBin.length;
const out = Buffer.alloc(totalLen);
out.writeUInt32LE(0x46546c67, 0);
out.writeUInt32LE(2, 4);
out.writeUInt32LE(totalLen, 8);
out.writeUInt32LE(newJsonBuf.length, 12);
out.writeUInt32LE(0x4e4f534a, 16);
newJsonBuf.copy(out, 20);
out.writeUInt32LE(fullBin.length, 20 + newJsonBuf.length);
out.writeUInt32LE(0x004e4942, 20 + newJsonBuf.length + 4);
fullBin.copy(out, 20 + newJsonBuf.length + 8);

fs.writeFileSync(GLB_PATH, out);
console.log('Updated', GLB_PATH, 'with Mirror node (' + (mIdx.length / 3) + ' tris).');
