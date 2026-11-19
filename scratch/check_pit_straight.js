const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

gltf.meshes[1].primitives.forEach((p, idx) => {
  const mat = gltf.materials[p.material];
  const posAcc = gltf.accessors[p.attributes.POSITION];
  const bvP = gltf.bufferViews[posAcc.bufferView];
  const f32P = new Float32Array(buf.buffer, buf.byteOffset + binOffset + (bvP.byteOffset || 0) + (posAcc.byteOffset || 0), posAcc.count * 3);
  
  let countInRegion = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < posAcc.count; i++) {
    const wx = f32P[i * 3];
    const wy = -f32P[i * 3 + 2];
    const wz = f32P[i * 3 + 1];
    if (wz >= -660 && wz <= -550 && wx >= -60 && wx <= 30) {
      countInRegion++;
      if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
      if (wy < minY) minY = wy; if (wy > maxY) maxY = wy;
      if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz;
    }
  }
  if (countInRegion > 0) {
    const pbr = mat.pbrMetallicRoughness;
    let texName = '';
    if (pbr && pbr.baseColorTexture) {
      const t = gltf.textures[pbr.baseColorTexture.index];
      const img = gltf.images[t.source];
      texName = img ? img.name : '';
    }
    console.log(`p${idx}: mat="${mat.name}" tex="${texName}" inRegion=${countInRegion}/${posAcc.count}, X=[${minX.toFixed(1)}, ${maxX.toFixed(1)}], Y=[${minY.toFixed(1)}, ${maxY.toFixed(1)}], Z=[${minZ.toFixed(1)}, ${maxZ.toFixed(1)}]`);
  }
});
