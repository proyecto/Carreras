'use strict';
const fs = require('fs');
const path = require('path');

function f32ToB64(f32) {
  const buf = Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
  return buf.toString('base64');
}

function u32ToB64(u32) {
  const buf = Buffer.from(u32.buffer, u32.byteOffset, u32.byteLength);
  return buf.toString('base64');
}

function getEmbeddedImageB64(glbPath, imageIndex) {
  if (imageIndex === undefined || imageIndex < 0) return '';
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binBuf = buf.slice(20 + jsonLen + 8);
  if (!gltf.images || !gltf.images[imageIndex]) return '';
  const img = gltf.images[imageIndex];
  const bv = gltf.bufferViews[img.bufferView];
  const imgData = binBuf.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  const mime = img.mimeType || 'image/png';
  return `data:${mime};base64,${imgData.toString('base64')}`;
}

function getAccessorData(gltf, binBuf, accIndex) {
  if (accIndex === undefined) return null;
  const acc = gltf.accessors[accIndex];
  const bv = gltf.bufferViews[acc.bufferView];
  const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const stride = bv.byteStride || 0;
  return { acc, offset, stride, count: acc.count };
}

function readIndices(gltf, binBuf, indicesAccIdx) {
  const { acc, offset } = getAccessorData(gltf, binBuf, indicesAccIdx);
  const count = acc.count;
  const type = acc.componentType;
  const arr = [];
  if (type === 5123) {
    const u16 = new Uint16Array(binBuf.buffer, binBuf.byteOffset + offset, count);
    for (let i = 0; i < count; i++) arr.push(u16[i]);
  } else if (type === 5125) {
    const u32 = new Uint32Array(binBuf.buffer, binBuf.byteOffset + offset, count);
    for (let i = 0; i < count; i++) arr.push(u32[i]);
  } else if (type === 5121) {
    const u8 = new Uint8Array(binBuf.buffer, binBuf.byteOffset + offset, count);
    for (let i = 0; i < count; i++) arr.push(u8[i]);
  }
  return arr;
}

function getLocalMatrix(n) {
  if (n.matrix) return [...n.matrix];
  const t = n.translation || [0, 0, 0];
  const r = n.rotation || [0, 0, 0, 1];
  const s = n.scale || [1, 1, 1];
  const qx = r[0], qy = r[1], qz = r[2], qw = r[3];
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  const sx = s[0], sy = s[1], sz = s[2];
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1
  ];
}

function mul4(a, b) {
  const r = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let ro = 0; ro < 4; ro++) {
      r[c*4 + ro] = a[ro] * b[c*4] + a[4 + ro] * b[c*4 + 1] + a[8 + ro] * b[c*4 + 2] + a[12 + ro] * b[c*4 + 3];
    }
  }
  return r;
}

module.exports = {
  f32ToB64,
  u32ToB64,
  getEmbeddedImageB64,
  getAccessorData,
  readIndices,
  getLocalMatrix,
  mul4
};
