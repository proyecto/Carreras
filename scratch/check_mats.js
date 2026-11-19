const fs = require('fs');
const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));

gltf.materials.forEach((m, i) => {
  const pbr = m.pbrMetallicRoughness;
  let texName = 'none';
  if (pbr && pbr.baseColorTexture) {
    const t = gltf.textures[pbr.baseColorTexture.index];
    const img = gltf.images[t.source];
    texName = img ? img.name : 'tex-' + t.source;
  }
  console.log(`Mat ${i}: "${m.name}", tex: "${texName}"`);
});
