'use strict';
// Parser binario GLB 2.0 (Adapter a formato de mallas del motor)
const GLBParser = {
  parseGLB(buf) {
    const dv = new DataView(buf);
    const magic = dv.getUint32(0, true);
    if (magic !== 0x46546C67) {
      throw new Error('[CarFactory.parseGLB] Archivo no es un binario GLB válido.');
    }
    const jsonLen = dv.getUint32(12, true);
    const jsonBytes = new Uint8Array(buf, 20, jsonLen);
    const decoder = (typeof TextDecoder !== 'undefined') ? new TextDecoder() : { decode: b => Buffer.from(b).toString('utf8') };
    const gltf = JSON.parse(decoder.decode(jsonBytes));
    const binOffset = 20 + jsonLen + 8;

    const bodyParts = { v: [], i: [] };
    const glassParts = { v: [], i: [] };
    const wheelParts = { v: [], i: [] };

    let embeddedImageBlob = null;
    if (gltf.images && gltf.images.length > 0 && typeof Blob !== 'undefined') {
      const img = gltf.images[0];
      if (img.bufferView !== undefined) {
        const bv = gltf.bufferViews[img.bufferView];
        const byteOff = binOffset + (bv.byteOffset || 0);
        const imgData = new Uint8Array(buf, byteOff, bv.byteLength);
        embeddedImageBlob = new Blob([imgData], { type: img.mimeType || 'image/png' });
      }
    }

    if (gltf.nodes && gltf.meshes) {
      for (const node of gltf.nodes) {
        if (node.mesh === undefined) continue;
        const mesh = gltf.meshes[node.mesh];
        if (!mesh || !mesh.primitives) continue;

        const isWheelNode = node.name && /wheel|llanta|rueda/i.test(node.name);
        const isGlassNode = node.name && /glass|cristal|window/i.test(node.name);

        for (const p of mesh.primitives) {
          if (p.attributes.POSITION === undefined) continue;
          const posAcc = gltf.accessors[p.attributes.POSITION];
          const nrmAcc = p.attributes.NORMAL !== undefined ? gltf.accessors[p.attributes.NORMAL] : null;
          const uvAcc = p.attributes.TEXCOORD_0 !== undefined ? gltf.accessors[p.attributes.TEXCOORD_0] : null;
          const idxAcc = p.indices !== undefined ? gltf.accessors[p.indices] : null;

          const bvP = gltf.bufferViews[posAcc.bufferView];
          const f32P = new Float32Array(buf, binOffset + (bvP.byteOffset || 0) + (posAcc.byteOffset || 0), posAcc.count * 3);

          let f32N = null;
          if (nrmAcc) {
            const bvN = gltf.bufferViews[nrmAcc.bufferView];
            f32N = new Float32Array(buf, binOffset + (bvN.byteOffset || 0) + (nrmAcc.byteOffset || 0), nrmAcc.count * 3);
          }

          let f32UV = null;
          if (uvAcc) {
            const bvU = gltf.bufferViews[uvAcc.bufferView];
            f32UV = new Float32Array(buf, binOffset + (bvU.byteOffset || 0) + (uvAcc.byteOffset || 0), uvAcc.count * 2);
          }

          let indices = null;
          if (idxAcc) {
            const bvI = gltf.bufferViews[idxAcc.bufferView];
            const iOffset = binOffset + (bvI.byteOffset || 0) + (idxAcc.byteOffset || 0);
            if (idxAcc.componentType === 5123) {
              indices = new Uint16Array(buf, iOffset, idxAcc.count);
            } else if (idxAcc.componentType === 5125) {
              indices = new Uint32Array(buf, iOffset, idxAcc.count);
            }
          }

          const mat = gltf.materials && p.material !== undefined ? gltf.materials[p.material] : null;
          const matName = (mat && mat.name) || '';
          let matId = 8; // Carrocería / pintura por defecto

          if (/mirror|retrovisor|espejo/i.test(node.name || '') || /mirror|retrovisor|espejo/i.test(matName)) {
            matId = 10;
          } else if (isGlassNode || /glass|cristal|window|windshield/i.test(matName)) {
            matId = 0;
          } else if (isWheelNode || /wheel|rim|tire|llanta|neumatico/i.test(matName)) {
            matId = /tire|neumatico/i.test(matName) ? 4 : 2;
          } else if (/carbon/i.test(matName)) {
            matId = 9;
          } else if (/light|headlight|faro/i.test(matName)) {
            matId = 47;
          } else if (/brake/i.test(matName)) {
            matId = 0;
          }

          const target = (isGlassNode || /glass|cristal/i.test(matName)) ? glassParts :
                         (isWheelNode || /wheel|llanta/i.test(matName)) ? wheelParts : bodyParts;

          const baseVIdx = target.v.length / 9;
          const count = posAcc.count;
          for (let k = 0; k < count; k++) {
            const px = f32P[k * 3], py = f32P[k * 3 + 1], pz = f32P[k * 3 + 2];
            const nx = f32N ? f32N[k * 3] : 0, ny = f32N ? f32N[k * 3 + 1] : 1, nz = f32N ? f32N[k * 3 + 2] : 0;
            const u = f32UV ? f32UV[k * 2] : 0, v = f32UV ? f32UV[k * 2 + 1] : 0;
            target.v.push(px, py, pz, nx, ny, nz, u, v, matId);
          }

          if (indices) {
            for (let k = 0; k < indices.length; k++) {
              target.i.push(baseVIdx + indices[k]);
            }
          } else {
            for (let k = 0; k < count; k++) {
              target.i.push(baseVIdx + k);
            }
          }
        }
      }
    }

    // Centrado automático y estandarización del mesh de rueda en el origen (0, 0, 0)
    // Garantiza que CAR.place() posicione las ruedas exactamente en sus ejes/hubs
    if (wheelParts.v.length > 0) {
      let wMinX = Infinity, wMaxX = -Infinity;
      let wMinY = Infinity, wMaxY = -Infinity;
      let wMinZ = Infinity, wMaxZ = -Infinity;
      for (let k = 0; k < wheelParts.v.length; k += 9) {
        const x = wheelParts.v[k], y = wheelParts.v[k + 1], z = wheelParts.v[k + 2];
        if (x < wMinX) wMinX = x; if (x > wMaxX) wMaxX = x;
        if (y < wMinY) wMinY = y; if (y > wMaxY) wMaxY = y;
        if (z < wMinZ) wMinZ = z; if (z > wMaxZ) wMaxZ = z;
      }
      const cx = (wMinX + wMaxX) * 0.5;
      const cy = (wMinY + wMaxY) * 0.5;
      const cz = (wMinZ + wMaxZ) * 0.5;
      if (Math.abs(cx) > 0.001 || Math.abs(cy) > 0.001 || Math.abs(cz) > 0.001) {
        for (let k = 0; k < wheelParts.v.length; k += 9) {
          wheelParts.v[k]     -= cx;
          wheelParts.v[k + 1] -= cy;
          wheelParts.v[k + 2] -= cz;
        }
      }
    }

    return {
      bodyV: new Float32Array(bodyParts.v),
      bodyI: new Uint32Array(bodyParts.i),
      glassV: glassParts.v.length ? new Float32Array(glassParts.v) : null,
      glassI: glassParts.i.length ? new Uint32Array(glassParts.i) : null,
      wheelV: wheelParts.v.length ? new Float32Array(wheelParts.v) : null,
      wheelI: wheelParts.i.length ? new Uint32Array(wheelParts.i) : null,
      embeddedImageBlob
    };
  },

  /**
   * Carga asíncrona de geometría 3D desde un archivo GLB.
   * Soporta ejecución isomórfica en navegador (fetch) y Node.js (fs).
   */
};
if (typeof window !== "undefined") window.GLBParser = GLBParser;
if (typeof module !== "undefined" && module.exports) module.exports = GLBParser;
