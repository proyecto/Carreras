const fs = require('fs');

const buf = fs.readFileSync('tracks/nurburgring-gp.glb');
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
const binOffset = 20 + jsonLen + 8;

if (!fs.existsSync('scratch/textures')) fs.mkdirSync('scratch/textures', { recursive: true });

gltf.images.forEach((img, i) => {
  if (img.bufferView === undefined) return;
  const bv = gltf.bufferViews[img.bufferView];
  const off = binOffset + (bv.byteOffset || 0);
  const data = new Uint8Array(buf.buffer, buf.byteOffset + off, bv.byteLength);
  const ext = img.mimeType === 'image/jpeg' ? 'jpg' : 'png';
  fs.writeFileSync(`scratch/textures/${i}_${img.name}.${ext}`, data);
  console.log(`Saved ${i}_${img.name}.${ext} (${data.length} bytes)`);
});
