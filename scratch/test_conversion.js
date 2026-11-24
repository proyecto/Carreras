'use strict';
const fs = require('fs');
const path = require('path');

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

// -------------------------------------------------------------
// 1. Mercedes-AMG GT4
// -------------------------------------------------------------
function convertMercedes() {
  console.log('Converting Mercedes-AMG GT4...');
  const glbPath = 'cars/mercedes-amg-gt4-wwwvecarzcom/source/mercedes_amg_gt4.glb';
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binBuf = buf.slice(20 + jsonLen + 8);

  const scale = 100 / 86.97348022460938;

  const nodeParents = new Array(gltf.nodes.length).fill(-1);
  gltf.nodes.forEach((n, i) => {
    if (n.children) n.children.forEach(c => { nodeParents[c] = i; });
  });

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

  const worldMats = new Array(gltf.nodes.length);
  function computeWorld(i) {
    if (worldMats[i]) return worldMats[i];
    const local = getLocalMatrix(gltf.nodes[i]);
    const p = nodeParents[i];
    worldMats[i] = p === -1 ? local : mul4(computeWorld(p), local);
    return worldMats[i];
  }
  for (let i = 0; i < gltf.nodes.length; i++) computeWorld(i);

  // Wheel subtrees: LF=445+269, LR=459+273, RF=473+277, RR=487+281
  const allWheelRoots = [445, 269, 459, 273, 473, 277, 487, 281];
  const wheelSubtree = new Set();
  function mark(idx) {
    wheelSubtree.add(idx);
    if (gltf.nodes[idx].children) gltf.nodes[idx].children.forEach(mark);
  }
  allWheelRoots.forEach(mark);

  const rfWheelSubtree = new Set();
  function markRF(idx) {
    rfWheelSubtree.add(idx);
    if (gltf.nodes[idx].children) gltf.nodes[idx].children.forEach(markRF);
  }
  [473, 277].forEach(markRF);

  // RF center
  const rfCenter = [1.344, 0.324, 0.812];

  const bodyVerts = [], bodyIndices = [];
  const glassVerts = [], glassIndices = [];
  const wheelVerts = [], wheelIndices = [];

  gltf.nodes.forEach((n, nIdx) => {
    if (n.mesh === undefined) return;
    const isBlur = /blur/i.test(n.name || '');
    if (isBlur) return;

    const isWheel = wheelSubtree.has(nIdx);
    const isRF = rfWheelSubtree.has(nIdx);
    const mat = worldMats[nIdx];
    const m = gltf.meshes[n.mesh];

    m.primitives.forEach(prim => {
      if (prim.attributes.POSITION === undefined) return;
      const matIdx = prim.material !== undefined ? prim.material : 0;
      const matName = prim.material !== undefined ? gltf.materials[prim.material].name : '';
      const isGlass = /windows|windshield/i.test(matName) && !/emissive|black/i.test(matName);

      const posData = getAccessorData(gltf, binBuf, prim.attributes.POSITION);
      const posStride = posData.stride || 12;
      const posF32 = new Float32Array(binBuf.buffer, binBuf.byteOffset + posData.offset, (posStride * posData.count) / 4);

      let normF32 = null, normStride = 12;
      if (prim.attributes.NORMAL !== undefined) {
        const normData = getAccessorData(gltf, binBuf, prim.attributes.NORMAL);
        normStride = normData.stride || 12;
        normF32 = new Float32Array(binBuf.buffer, binBuf.byteOffset + normData.offset, (normStride * normData.count) / 4);
      }

      let uvF32 = null, uvStride = 8;
      if (prim.attributes.TEXCOORD_0 !== undefined) {
        const uvData = getAccessorData(gltf, binBuf, prim.attributes.TEXCOORD_0);
        uvStride = uvData.stride || 8;
        uvF32 = new Float32Array(binBuf.buffer, binBuf.byteOffset + uvData.offset, (uvStride * uvData.count) / 4);
      }

      const indices = prim.indices !== undefined ? readIndices(gltf, binBuf, prim.indices) : null;
      const count = posData.count;

      if (isWheel) {
        if (isRF) {
          const baseIndex = wheelVerts.length / 9;
          for (let i = 0; i < count; i++) {
            const pOff = (i * posStride) / 4;
            const lx = posF32[pOff], ly = posF32[pOff+1], lz = posF32[pOff+2];
            const wx = (mat[0]*lx + mat[4]*ly + mat[8]*lz + mat[12]) * scale;
            const wy = (mat[1]*lx + mat[5]*ly + mat[9]*lz + mat[13]) * scale;
            const wz = (mat[2]*lx + mat[6]*ly + mat[10]*lz + mat[14]) * scale;

            // ex = wz, ey = wy, ez = -wx
            const ex = wz - rfCenter[0];
            const ey = wy - rfCenter[1];
            const ez = -(wx - (-(rfCenter[2])));

            let enx = 0, eny = 1, enz = 0;
            if (normF32) {
              const nOff = (i * normStride) / 4;
              const nlx = normF32[nOff], nly = normF32[nOff+1], nlz = normF32[nOff+2];
              const wnx = mat[0]*nlx + mat[4]*nly + mat[8]*nlz;
              const wny = mat[1]*nlx + mat[5]*nly + mat[9]*nlz;
              const wnz = mat[2]*nlx + mat[6]*nly + mat[10]*nlz;
              enx = wnz; eny = wny; enz = -wnx;
              const len = Math.hypot(enx, eny, enz) || 1;
              enx /= len; eny /= len; enz /= len;
            }

            let u = 0, v = 0;
            if (uvF32) {
              const uOff = (i * uvStride) / 4;
              u = uvF32[uOff]; v = uvF32[uOff+1];
            }
            wheelVerts.push(ex, ey, ez, enx, eny, enz, u, v, matIdx);
          }

          if (indices) {
            for (let i = 0; i < indices.length; i++) wheelIndices.push(baseIndex + indices[i]);
          } else {
            for (let i = 0; i < count; i++) wheelIndices.push(baseIndex + i);
          }
        }
        return;
      }

      // Target buffer: glass or body
      const targetVerts = isGlass ? glassVerts : bodyVerts;
      const targetIndices = isGlass ? glassIndices : bodyIndices;
      const baseIndex = targetVerts.length / 9;

      for (let i = 0; i < count; i++) {
        const pOff = (i * posStride) / 4;
        const lx = posF32[pOff], ly = posF32[pOff+1], lz = posF32[pOff+2];
        const wx = (mat[0]*lx + mat[4]*ly + mat[8]*lz + mat[12]) * scale;
        const wy = (mat[1]*lx + mat[5]*ly + mat[9]*lz + mat[13]) * scale;
        const wz = (mat[2]*lx + mat[6]*ly + mat[10]*lz + mat[14]) * scale;

        const ex = wz;
        const ey = wy;
        const ez = -wx;

        let enx = 0, eny = 1, enz = 0;
        if (normF32) {
          const nOff = (i * normStride) / 4;
          const nlx = normF32[nOff], nly = normF32[nOff+1], nlz = normF32[nOff+2];
          const wnx = mat[0]*nlx + mat[4]*nly + mat[8]*nlz;
          const wny = mat[1]*nlx + mat[5]*nly + mat[9]*nlz;
          const wnz = mat[2]*nlx + mat[6]*nly + mat[10]*nlz;
          enx = wnz; eny = wny; enz = -wnx;
          const len = Math.hypot(enx, eny, enz) || 1;
          enx /= len; eny /= len; enz /= len;
        }

        let u = 0, v = 0;
        if (uvF32) {
          const uOff = (i * uvStride) / 4;
          u = uvF32[uOff]; v = uvF32[uOff+1];
        }
        targetVerts.push(ex, ey, ez, enx, eny, enz, u, v, matIdx);
      }

      if (indices) {
        for (let i = 0; i < indices.length; i++) targetIndices.push(baseIndex + indices[i]);
      } else {
        for (let i = 0; i < count; i++) targetIndices.push(baseIndex + i);
      }
    });
  });

  console.log(`Mercedes: Body ${bodyVerts.length/9} verts, ${bodyIndices.length/3} tris | Glass ${glassVerts.length/9} verts, ${glassIndices.length/3} tris | Wheel ${wheelVerts.length/9} verts, ${wheelIndices.length/3} tris`);
  return {
    bodyVerts: new Float32Array(bodyVerts),
    bodyIndices: new Uint32Array(bodyIndices),
    glassVerts: new Float32Array(glassVerts),
    glassIndices: new Uint32Array(glassIndices),
    wheelVerts: new Float32Array(wheelVerts),
    wheelIndices: new Uint32Array(wheelIndices),
  };
}

convertMercedes();
