'use strict';
const fs = require('fs');
const path = require('path');

function convertMustangBase() {
  console.log('--- Processing Ford Mustang GT3 (Base) ---');
  const glbPath = path.resolve('cars/ford-mustang-gt3/source/Ford Mustang GT3.glb');
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

  function readIndices(indicesAccIdx) {
    const { acc, offset } = getAccessorData(indicesAccIdx);
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

  // Model 2 offsets in GLB coords to center wheelbase at (0, 0, 0)
  // Wheelbase center in Z: (3.285 + 0.505) / 2 = 1.895
  // Lateral center in X: (-0.71 + 0.98) / 2 = 0.135
  const centerOffsetX = 0.135;
  const centerOffsetZ = 1.895;

  // Front Right (FR) wheel center in GLB:
  // Note: in Model 2, Z ~ 0.505 is FRONT and Z ~ 3.285 is REAR.
  // Right is X ~ 0.98 and Left is X ~ -0.71.
  const frWheelCenterGLB = [0.980, 0.405, 0.505];

  // Engine hubs:
  // ex = centerOffsetZ - lz (Front is +X, Rear is -X)
  // ey = ly (Up is +Y)
  // ez = lx - centerOffsetX (Left is -Z, Right is +Z)
  // FL: lx = -0.71, ly = 0.395, lz = 0.505 -> [ 1.390, 0.395, -0.845]
  // FR: lx =  0.98, ly = 0.405, lz = 0.505 -> [ 1.390, 0.405,  0.845]
  // RL: lx = -0.71, ly = 0.450, lz = 3.285 -> [-1.390, 0.450, -0.845]
  // RR: lx =  0.98, ly = 0.465, lz = 3.285 -> [-1.390, 0.465,  0.845]
  const hubs = [
    [ 1.390, 0.395, -0.845],
    [ 1.390, 0.405,  0.845],
    [-1.390, 0.450, -0.845],
    [-1.390, 0.465,  0.845]
  ];

  const bodyVerts = [];
  const bodyIndices = [];
  const glassVerts = [];
  const glassIndices = [];
  const wheelVerts = [];
  const wheelIndices = [];

  // Wheel prims identified earlier:
  // In Model 2:
  // Front wheels (Z ~ 0.5):
  //   Tires: prim 70 (FR), 71 (FL)
  //   Rims: prim 26 (FR), 25 (FL)
  //   Centers: prim 1 (FR), 0 (FL)
  //   Nuts: prim 6 (FR), 5 (FL)
  //   Discs/logos: prim 17, 78 (FR), 16, 79 (FL)
  // Rear wheels (Z ~ 3.28):
  //   Tires: prim 68 (RR), 69 (RL)
  //   Rims: prim 29 (RR), 28 (RL)
  //   Centers: prim 3 (RR), 2 (RL)
  //   Nuts: prim 8 (RR), 7 (RL)
  //   Discs/logos: prim 19, 76 (RR), 18, 77 (RL)
  const wheelPrimsAll = new Set([
    70, 71, 26, 25, 1, 0, 6, 5, 17, 78, 16, 79,
    68, 69, 29, 28, 3, 2, 8, 7, 19, 76, 18, 77
  ]);

  // Front-Right (FR) primitives to extract wheel template:
  const wheelFRPrims = new Set([70, 26, 1, 6, 17, 78]);

  let primGlobalIdx = 0;
  gltf.nodes.forEach((n, nIdx) => {
    if (n.mesh === undefined) return;
    const m = gltf.meshes[n.mesh];
    const mat = getLocalMatrix(n);

    m.primitives.forEach((prim) => {
      const pIdx = primGlobalIdx++;
      if (prim.attributes.POSITION === undefined) return;
      const matIdx = prim.material !== undefined ? prim.material : 0;
      const matName = prim.material !== undefined ? gltf.materials[prim.material].name : '';
      const isGlass = /window|glass/i.test(matName);
      const isWheelPart = wheelPrimsAll.has(pIdx);
      const isFRWheelPart = wheelFRPrims.has(pIdx);

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

      if (isWheelPart) {
        if (isFRWheelPart) {
          const baseIndex = wheelVerts.length / 9;
          for (let i = 0; i < count; i++) {
            const pOff = (i * posStride) / 4;
            const lx = posF32[pOff], ly = posF32[pOff+1], lz = posF32[pOff+2];
            const wx = mat[0]*lx + mat[4]*ly + mat[8]*lz + mat[12];
            const wy = mat[1]*lx + mat[5]*ly + mat[9]*lz + mat[13];
            const wz = mat[2]*lx + mat[6]*ly + mat[10]*lz + mat[14];

            // Centered around FR wheel center in engine coords:
            // ex = frWheelCenterGLB[2] - wz
            // ey = wy - frWheelCenterGLB[1]
            // ez = wx - frWheelCenterGLB[0]
            const ex = frWheelCenterGLB[2] - wz;
            const ey = wy - frWheelCenterGLB[1];
            const ez = wx - frWheelCenterGLB[0];

            let enx = 0, eny = 1, enz = 0;
            if (normF32) {
              const nOff = (i * normStride) / 4;
              const nlx = normF32[nOff], nly = normF32[nOff+1], nlz = normF32[nOff+2];
              const wnx = mat[0]*nlx + mat[4]*nly + mat[8]*nlz;
              const wny = mat[1]*nlx + mat[5]*nly + mat[9]*nlz;
              const wnz = mat[2]*nlx + mat[6]*nly + mat[10]*nlz;
              enx = -wnz;
              eny = wny;
              enz = wnx;
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
        return; // Don't add to car body
      }

      // Add to body or glass
      const targetVerts = isGlass ? glassVerts : bodyVerts;
      const targetIndices = isGlass ? glassIndices : bodyIndices;
      const baseIndex = targetVerts.length / 9;

      for (let i = 0; i < count; i++) {
        const pOff = (i * posStride) / 4;
        const lx = posF32[pOff], ly = posF32[pOff+1], lz = posF32[pOff+2];
        const wx = mat[0]*lx + mat[4]*ly + mat[8]*lz + mat[12];
        const wy = mat[1]*lx + mat[5]*ly + mat[9]*lz + mat[13];
        const wz = mat[2]*lx + mat[6]*ly + mat[10]*lz + mat[14];

        // Engine coords: Front is +X, Rear is -X, Left is -Z, Right is +Z
        const ex = centerOffsetZ - wz;
        const ey = wy;
        const ez = wx - centerOffsetX;

        let enx = 0, eny = 1, enz = 0;
        if (normF32) {
          const nOff = (i * normStride) / 4;
          const nlx = normF32[nOff], nly = normF32[nOff+1], nlz = normF32[nOff+2];
          const wnx = mat[0]*nlx + mat[4]*nly + mat[8]*nlz;
          const wny = mat[1]*nlx + mat[5]*nly + mat[9]*nlz;
          const wnz = mat[2]*nlx + mat[6]*nly + mat[10]*nlz;
          enx = -wnz;
          eny = wny;
          enz = wnx;
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
  const res = convertMustangBase();
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

module.exports = { convertMustangBase };
