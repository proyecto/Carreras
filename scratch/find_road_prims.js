const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

console.log('Analyzing primitives at start straight (Z ~ -600, X ~ -30..0)...');

gltf.meshes[1].primitives.forEach((p, idx) => {
  const mat = gltf.materials[p.material];
  const pbr = mat.pbrMetallicRoughness;
  let texName = 'none';
  if (pbr && pbr.baseColorTexture) {
    const t = gltf.textures[pbr.baseColorTexture.index];
    const img = gltf.images[t.source];
    texName = img ? img.name : 'tex-' + t.source;
  }
  
  const posAcc = gltf.accessors[p.attributes.POSITION];
  const bvP = gltf.bufferViews[posAcc.bufferView];
  const f32P = new Float32Array(buf.buffer, buf.byteOffset + binOffset + (bvP.byteOffset || 0) + (posAcc.byteOffset || 0), posAcc.count * 3);
  
  let matches = 0;
  for (let i = 0; i < posAcc.count; i++) {
    const wx = f32P[i * 3];
    const wy = -f32P[i * 3 + 2];
    const wz = f32P[i * 3 + 1];
    if (wz >= -620 && wz <= -580 && wx >= -35 && wx <= -10 && wy >= 60 && wy <= 70) {
      matches++;
    }
  }
  if (matches > 0) {
    console.log(`p${idx}: mat="${mat.name}" tex="${texName}" count=${posAcc.count}, matches=${matches}`);
  }
});
