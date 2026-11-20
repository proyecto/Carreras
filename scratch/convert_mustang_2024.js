'use strict';
const fs = require('fs');
const path = require('path');

function convertMustang2024() {
  console.log('--- Processing Ford Mustang GT3 2024 ---');
  const glbPath = path.resolve('cars/ford-mustang-gt3-2024/source/ford_mustang_gt3_2024__www.vecarz.com.glb');
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binBuf = buf.slice(20 + jsonLen + 8);

  function getAccessorData(accIndex) {
    if (accIndex === undefined) return null;
    const acc = gltf.accessors[accIndex];
    const bv = gltf.bufferViews[acc.bufferView];
    const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const stride = bv.byteStride || 0;
    return { acc, offset, stride, count: acc.count };
  }

  // Build node world transform matrices
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

  // Identify wheel subtrees
  const wheelRootNodes = [388, 34, 18, 50]; // LF, RF, LR, RR
  const wheelSubtreeNodeSet = new Set();
  const wheelRFSubtreeNodeSet = new Set();

  function markSubtree(nodeIdx, set) {
    set.add(nodeIdx);
    const n = gltf.nodes[nodeIdx];
    if (n.children) n.children.forEach(c => markSubtree(c, set));
  }
  wheelRootNodes.forEach(rn => markSubtree(rn, wheelSubtreeNodeSet));
  markSubtree(34, wheelRFSubtreeNodeSet); // RF is wheel to isolate for WHEEL_V

  // Calculate RF wheel center
  const rfCenterGLB = [-0.849, 0.344, 1.471]; // [lx, ly, lz] in scaled meters

  // Hubs in engine coordinates [ex, ey, ez]:
  // ex = lz, ey = ly, ez = -lx
  const hubs = [
    [ 1.471, 0.344, -0.851], // FL
    [ 1.471, 0.344,  0.849], // FR
    [-1.304, 0.353, -0.839], // RL
    [-1.304, 0.353,  0.837]  // RR
  ];

  const bodyVerts = [];
  const bodyIndices = [];
  const glassVerts = [];
  const glassIndices = [];
  const wheelVerts = [];
  const wheelIndices = [];

  function readIndices(indicesAccIdx) {
    const { acc, offset } = getAccessorData(indicesAccIdx);
    const count = acc.count;
    const type = acc.componentType;
    const arr = [];
    if (type === 5123) { // UNSIGNED_SHORT
      const u16 = new Uint16Array(binBuf.buffer, binBuf.byteOffset + offset, count);
      for (let i = 0; i < count; i++) arr.push(u16[i]);
    } else if (type === 5125) { // UNSIGNED_INT
      const u32 = new Uint32Array(binBuf.buffer, binBuf.byteOffset + offset, count);
      for (let i = 0; i < count; i++) arr.push(u32[i]);
    } else if (type === 5121) { // UNSIGNED_BYTE
      const u8 = new Uint8Array(binBuf.buffer, binBuf.byteOffset + offset, count);
      for (let i = 0; i < count; i++) arr.push(u8[i]);
    }
    return arr;
  }

  // Iterate over all nodes and primitives
  gltf.nodes.forEach((n, nIdx) => {
    if (n.mesh === undefined) return;
    const m = gltf.meshes[n.mesh];
    const mat = worldMats[nIdx];
    const isWheelNode = wheelSubtreeNodeSet.has(nIdx);
    const isRFWheelNode = wheelRFSubtreeNodeSet.has(nIdx);
    const isBlurNode = /blur/i.test(n.name || '');

    if (isBlurNode) return; // Skip blur discs

    m.primitives.forEach((prim, pIdx) => {
      if (prim.attributes.POSITION === undefined) return;
      const matIdx = prim.material !== undefined ? prim.material : 0;
      const matName = prim.material !== undefined ? gltf.materials[prim.material].name : '';
      const isGlass = /glass|window/i.test(matName);

      const posData = getAccessorData(prim.attributes.POSITION);
      const posStride = posData.stride || 12;
      const posF32 = new Float32Array(binBuf.buffer, binBuf.byteOffset + posData.offset, (posStride * posData.count) / 4);

      let normF32 = null, normStride = 12;
      if (prim.attributes.NORMAL !== undefined) {
        const normData = getAccessorData(prim.attributes.NORMAL);
        normStride = normData.stride || 12;
        normF32 = new Float32Array(binBuf.buffer, binBuf.byteOffset + normData.offset, (normStride * normData.count) / 4);
      }

      let uvF32 = null, uvStride = 8;
      if (prim.attributes.TEXCOORD_0 !== undefined) {
        const uvData = getAccessorData(prim.attributes.TEXCOORD_0);
        uvStride = uvData.stride || 8;
        uvF32 = new Float32Array(binBuf.buffer, binBuf.byteOffset + uvData.offset, (uvStride * uvData.count) / 4);
      }

      const indices = prim.indices !== undefined ? readIndices(prim.indices) : null;
      const count = posData.count;

      if (isWheelNode) {
        // Only process for wheel template if it is RF wheel
        if (isRFWheelNode) {
          const baseIndex = wheelVerts.length / 9;
          for (let i = 0; i < count; i++) {
            const pOff = (i * posStride) / 4;
            const lx = posF32[pOff], ly = posF32[pOff+1], lz = posF32[pOff+2];
            // World pos scaled by 100
            const wx = (mat[0]*lx + mat[4]*ly + mat[8]*lz + mat[12]) * 100;
            const wy = (mat[1]*lx + mat[5]*ly + mat[9]*lz + mat[13]) * 100;
            const wz = (mat[2]*lx + mat[6]*ly + mat[10]*lz + mat[14]) * 100;

            // Transformed relative to wheel center in engine coords:
            // Engine coords: ex = wz, ey = wy, ez = -wx
            // Center in engine coords: cx = rfCenterGLB[2], cy = rfCenterGLB[1], cz = -rfCenterGLB[0]
            const ex = wz - rfCenterGLB[2];
            const ey = wy - rfCenterGLB[1];
            const ez = -(wx - rfCenterGLB[0]);

            let enx = 0, eny = 1, enz = 0;
            if (normF32) {
              const nOff = (i * normStride) / 4;
              const nlx = normF32[nOff], nly = normF32[nOff+1], nlz = normF32[nOff+2];
              // Transform normal (rotational part of mat)
              const wnx = mat[0]*nlx + mat[4]*nly + mat[8]*nlz;
              const wny = mat[1]*nlx + mat[5]*nly + mat[9]*nlz;
              const wnz = mat[2]*nlx + mat[6]*nly + mat[10]*nlz;
              enx = wnz;
              eny = wny;
              enz = -wnx;
              const len = Math.hypot(enx, eny, enz) || 1;
              enx /= len; eny /= len; enz /= len;
            }

            let u = 0, v = 0;
            if (uvF32) {
              const uOff = (i * uvStride) / 4;
              u = uvF32[uOff];
              v = uvF32[uOff+1];
            }

            wheelVerts.push(ex, ey, ez, enx, eny, enz, u, v, matIdx);
          }

          if (indices) {
            for (let i = 0; i < indices.length; i++) wheelIndices.push(baseIndex + indices[i]);
          } else {
            for (let i = 0; i < count; i++) wheelIndices.push(baseIndex + i);
          }
        }
        return; // Don't add wheel to car body
      }

      // Target buffer: glass or body
      const targetVerts = isGlass ? glassVerts : bodyVerts;
      const targetIndices = isGlass ? glassIndices : bodyIndices;
      const baseIndex = targetVerts.length / 9;

      for (let i = 0; i < count; i++) {
        const pOff = (i * posStride) / 4;
        const lx = posF32[pOff], ly = posF32[pOff+1], lz = posF32[pOff+2];
        const wx = (mat[0]*lx + mat[4]*ly + mat[8]*lz + mat[12]) * 100;
        const wy = (mat[1]*lx + mat[5]*ly + mat[9]*lz + mat[13]) * 100;
        const wz = (mat[2]*lx + mat[6]*ly + mat[10]*lz + mat[14]) * 100;

        // Engine coordinates: ex = wz, ey = wy, ez = -wx
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
          enx = wnz;
          eny = wny;
          enz = -wnx;
          const len = Math.hypot(enx, eny, enz) || 1;
          enx /= len; eny /= len; enz /= len;
        }

        let u = 0, v = 0;
        if (uvF32) {
          const uOff = (i * uvStride) / 4;
          u = uvF32[uOff];
          v = uvF32[uOff+1];
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

  console.log(`Body Verts: ${bodyVerts.length / 9}, Indices: ${bodyIndices.length}, Tris: ${bodyIndices.length / 3}`);
  console.log(`Glass Verts: ${glassVerts.length / 9}, Indices: ${glassIndices.length}, Tris: ${glassIndices.length / 3}`);
  console.log(`Wheel Verts: ${wheelVerts.length / 9}, Indices: ${wheelIndices.length}, Tris: ${wheelIndices.length / 3}`);
  console.log('Hubs:', JSON.stringify(hubs));

  return {
    hubs,
    bodyVerts: new Float32Array(bodyVerts),
    bodyIndices: new Uint32Array(bodyIndices),
    glassVerts: new Float32Array(glassVerts),
    glassIndices: new Uint32Array(glassIndices),
    wheelVerts: new Float32Array(wheelVerts),
    wheelIndices: new Uint32Array(wheelIndices)
  };
}

if (require.main === module) {
  const res = convertMustang2024();
  function getBounds(f32) {
    let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity, minZ=Infinity, maxZ=-Infinity;
    for (let i = 0; i < f32.length; i += 9) {
      const x = f32[i], y = f32[i+1], z = f32[i+2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    return {
      minX: minX.toFixed(3), maxX: maxX.toFixed(3),
      minY: minY.toFixed(3), maxY: maxY.toFixed(3),
      minZ: minZ.toFixed(3), maxZ: maxZ.toFixed(3),
      spanX: (maxX - minX).toFixed(3), spanY: (maxY - minY).toFixed(3), spanZ: (maxZ - minZ).toFixed(3),
      cx: ((minX + maxX)/2).toFixed(3), cy: ((minY + maxY)/2).toFixed(3), cz: ((minZ + maxZ)/2).toFixed(3)
    };
  }
  console.log("Wheel Bounds:", JSON.stringify(getBounds(res.wheelVerts)));
  console.log("Body Bounds:", JSON.stringify(getBounds(res.bodyVerts)));
}

module.exports = { convertMustang2024 };

