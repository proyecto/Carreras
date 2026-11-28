"use strict";
// ---- 33_track_glb.js
// Cargador y renderizador nativo WebGPU para circuitos 3D en formato GLB.
// Extrae geometría, submallas y texturas embebidas con streaming directo
// hacia búferes y texturas de GPU, integrándose con el G-Buffer y sombreado PBR diferido.

(() => {
  // 1. Shaders WGSL para superficies del circuito 3D
  WGSL["mat_glb_track"] =
    `// Material para mallas 3D de circuitos reales escaneados (asfalto, pianos, escapatorias, gradas, vallas, árboles)
#include mesh_vert
@group(3) @binding(0) var tDiff: texture_2d<f32>;

fn surf(in: V2F, ff: bool) -> Surface {
  let tex = textureSample(tDiff, sLin, in.uv);
  if (tex.a < 0.35) {
    discard;
  }
  var s = surfDefault(normalize(in.nrm));
  s.albedo = tex.rgb;
  
  let id = matId(in.mat);
  if (id == 1u) {
    // Asfalto
    s.rough = 0.82;
    s.metal = 0.01;
  } else if (id == 2u) {
    // Metales / guardarraíles / vallas
    s.rough = 0.35;
    s.metal = 0.65;
  } else if (id == 3u) {
    // Pianos y señalización
    s.rough = 0.55;
    s.metal = 0.02;
  } else if (id == 4u) {
    // Árboles y vegetación (subsurface sss ligero)
    s.rough = 0.90;
    s.metal = 0.0;
    s.sss = 0.25;
  } else {
    // Escenografía general / edificios / gradas / vehículos
    s.rough = 0.75;
    s.metal = 0.03;
  }
  s.ao = 1.0;
  return s;
}
`;

  const TrackGLB = {
    fam: null,
    active: null,
    cache: new Map(),

    /**
     * Inicializa la familia de materiales para circuitos 3D GLB.
     */
    initFamily() {
      if (this.fam) return this.fam;
      if (typeof mkFamily !== "function") return null;
      this.fam = mkFamily("glb_track", {
        src: "mat_glb_track",
        cull: "none",
        noShadow: true,
      });
      return this.fam;
    },

    /**
     * Carga y procesa un archivo GLB de circuito y lo conecta al grafo de render de WebGPU.
     */
    async load(url, options = {}) {
      if (this.cache.has(url)) {
        const cached = this.cache.get(url);
        this.bindDrawable(cached, options);
        return cached;
      }

      if (typeof setMsg === "function") {
        const txt =
          typeof I18N !== "undefined" ? I18N.t("loading") : "Loading 3D track…";
        setMsg(txt);
      }

      const safeUrl = encodeURI(url);
      const res = await fetch(safeUrl);
      if (!res.ok)
        throw new Error(
          "No se pudo cargar el circuito 3D: " +
            safeUrl +
            " (HTTP " +
            res.status +
            ")",
        );
      const buf = await res.arrayBuffer();

      const dv = new DataView(buf);
      const magic = dv.getUint32(0, true);
      if (magic !== 0x46546c67)
        throw new Error("Archivo no es un binario GLB válido.");
      const jsonLen = dv.getUint32(12, true);
      const jsonBytes = new Uint8Array(buf, 20, jsonLen);
      const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));
      const binOffset = 20 + jsonLen + 8;

      const fam = this.initFamily();

      // Textura blanca por defecto para materiales sin imagen
      const defTex = mkTex(4, 4, "rgba8unorm-srgb", TU.RT | TU.TB | TU.CD);
      const white = new Uint8Array(4 * 4 * 4).fill(255);
      G.dev.queue.writeTexture(
        { texture: defTex },
        white,
        { bytesPerRow: 16 },
        [4, 4],
      );
      const defBG = G.dev.createBindGroup({
        layout: fam.bgl3,
        entries: [{ binding: 0, resource: defTex.createView() }],
      });

      // Decodificar todas las texturas embebidas con createImageBitmap
      const texBGs = new Map();
      if (gltf.images && gltf.images.length) {
        for (let i = 0; i < gltf.images.length; i++) {
          const img = gltf.images[i];
          if (img.bufferView === undefined) continue;
          try {
            const bv = gltf.bufferViews[img.bufferView];
            const byteOff = binOffset + (bv.byteOffset || 0);
            const imgData = new Uint8Array(buf, byteOff, bv.byteLength);
            const blob = new Blob([imgData], {
              type: img.mimeType || "image/png",
            });
            const bmp = await createImageBitmap(blob);
            const w = bmp.width,
              h = bmp.height;
            const mips = Math.min(6, Math.floor(Math.log2(Math.max(w, h))) + 1);
            const tex = mkTex(w, h, "rgba8unorm-srgb", TU.RT | TU.TB | TU.CD, {
              mipLevelCount: mips,
            });
            G.dev.queue.copyExternalImageToTexture(
              { source: bmp },
              { texture: tex },
              [w, h],
            );
            if (typeof genMips === "function") genMips(tex, "rgba8unorm-srgb");
            const bg = G.dev.createBindGroup({
              layout: fam.bgl3,
              entries: [{ binding: 0, resource: tex.createView() }],
            });
            texBGs.set(i, bg);
          } catch (e) {
            console.warn(
              "Error decodificando textura " + i + " (" + img.name + "):",
              e,
            );
          }
        }
      }

      // Procesar TODOS los nodos de la escena con mallas 3D
      const sceneIdx = gltf.scene !== undefined ? gltf.scene : 0;
      const rootNodeIndices = (gltf.scenes &&
        gltf.scenes[sceneIdx] &&
        gltf.scenes[sceneIdx].nodes) || [0, 1];

      const primitives = [];
      let rootRotation = null;

      for (const nodeIdx of rootNodeIndices) {
        const node = gltf.nodes[nodeIdx];
        if (!node || node.mesh === undefined) continue;
        if (!rootRotation && node.rotation) rootRotation = node.rotation;

        const mesh = gltf.meshes[node.mesh];
        if (!mesh || !mesh.primitives) continue;

        for (const p of mesh.primitives) {
          if (p.attributes.POSITION === undefined) continue;
          const posAcc = gltf.accessors[p.attributes.POSITION];
          const nrmAcc =
            p.attributes.NORMAL !== undefined
              ? gltf.accessors[p.attributes.NORMAL]
              : null;
          const uvAcc =
            p.attributes.TEXCOORD_0 !== undefined
              ? gltf.accessors[p.attributes.TEXCOORD_0]
              : null;
          const idxAcc =
            p.indices !== undefined ? gltf.accessors[p.indices] : null;

          const bvP = gltf.bufferViews[posAcc.bufferView];
          const f32P = new Float32Array(
            buf,
            binOffset + (bvP.byteOffset || 0) + (posAcc.byteOffset || 0),
            posAcc.count * 3,
          );

          let f32N = null;
          if (nrmAcc) {
            const bvN = gltf.bufferViews[nrmAcc.bufferView];
            f32N = new Float32Array(
              buf,
              binOffset + (bvN.byteOffset || 0) + (nrmAcc.byteOffset || 0),
              nrmAcc.count * 3,
            );
          }

          let f32UV = null;
          if (uvAcc) {
            const bvU = gltf.bufferViews[uvAcc.bufferView];
            f32UV = new Float32Array(
              buf,
              binOffset + (bvU.byteOffset || 0) + (uvAcc.byteOffset || 0),
              uvAcc.count * 2,
            );
          }

          // Clasificación semántica de material por nombre
          const mat = gltf.materials[p.material];
          const matName = (mat && mat.name) || "";
          let matId = 0;
          if (
            matName.includes("Part2") ||
            matName.includes("6121") ||
            matName.includes("asphalt")
          ) {
            matId = 1; // asfalto
          } else if (
            matName.includes("Union") ||
            matName.includes("Object921") ||
            matName.includes("guard")
          ) {
            matId = 2; // metal / guardarraíl / valla
          } else if (
            matName.includes("Esdanurburgring") ||
            matName.includes("2821") ||
            matName.includes("kerb")
          ) {
            matId = 3; // pianos y bordillos
          } else if (
            matName.includes("pinewall") ||
            matName.includes("pine") ||
            matName.includes("tree")
          ) {
            matId = 4; // árboles y vegetación
          }

          // Intercalar vértices en formato estándar de 36 bytes (VLAYOUT)
          const nv = posAcc.count;
          const vbuf = new ArrayBuffer(nv * 36);
          const f32 = new Float32Array(vbuf);
          const i16 = new Int16Array(vbuf);
          const u8 = new Uint8Array(vbuf);

          for (let i = 0; i < nv; i++) {
            const f = i * 9,
              s = i * 18,
              b8 = i * 36;
            f32[f] = f32P[i * 3];
            f32[f + 1] = f32P[i * 3 + 1];
            f32[f + 2] = f32P[i * 3 + 2];

            if (f32N) {
              i16[s + 6] = Math.round(f32N[i * 3] * 32767);
              i16[s + 7] = Math.round(f32N[i * 3 + 1] * 32767);
              i16[s + 8] = Math.round(f32N[i * 3 + 2] * 32767);
            } else {
              i16[s + 7] = 32767;
            }
            i16[s + 9] = 0;

            if (f32UV) {
              f32[f + 5] = f32UV[i * 2];
              f32[f + 6] = f32UV[i * 2 + 1];
            }

            u8[b8 + 28] = matId;
            u8[b8 + 32] = 255;
            u8[b8 + 33] = 255;
            u8[b8 + 34] = 255;
            u8[b8 + 35] = 255;
          }

          const vb = mkBuf(nv * 36, BU.V, new Uint8Array(vbuf));

          // Búfer de índices
          let ib = null,
            indexCount = 0,
            indexFormat = "uint16";
          if (idxAcc) {
            const bvI = gltf.bufferViews[idxAcc.bufferView];
            const off =
              binOffset + (bvI.byteOffset || 0) + (idxAcc.byteOffset || 0);
            indexCount = idxAcc.count;
            if (idxAcc.componentType === 5123) {
              const rawIdx = new Uint16Array(buf, off, idxAcc.count);
              ib = mkBuf(idxAcc.count * 2, BU.I, rawIdx);
              indexFormat = "uint16";
            } else {
              const rawIdx = new Uint32Array(buf, off, idxAcc.count);
              ib = mkBuf(idxAcc.count * 4, BU.I, rawIdx);
              indexFormat = "uint32";
            }
          }

          // Obtener bind group de la textura del material
          let bg = defBG;
          if (
            mat &&
            mat.pbrMetallicRoughness &&
            mat.pbrMetallicRoughness.baseColorTexture
          ) {
            const tIdx = mat.pbrMetallicRoughness.baseColorTexture.index;
            const tex = gltf.textures[tIdx];
            if (tex && tex.source !== undefined && texBGs.has(tex.source)) {
              bg = texBGs.get(tex.source);
            }
          }

          primitives.push({ vb, ib, count: indexCount, indexFormat, bg });
        }
      }

      const trackObj = {
        url,
        rotation: rootRotation,
        primitives,
        fam,
      };

      this.cache.set(url, trackObj);
      this.bindDrawable(trackObj, options);
      return trackObj;
    },

    /**
     * Enlaza el circuito cargado al grafo de dibujado de WebGPU con transformación de posicionamiento.
     */
    bindDrawable(trackObj, options = {}) {
      const slot = objSlot();
      const model = objModel(slot);
      const prev = objPrev(slot);

      // 1. Matriz de orientación de nodo glTF (conversión de ejes Z-up a Y-up)
      const mNode = m4();
      m4ident(mNode);
      if (trackObj.rotation) {
        const q = trackObj.rotation;
        const x2 = q[0] + q[0],
          y2 = q[1] + q[1],
          z2 = q[2] + q[2];
        const xx = q[0] * x2,
          xy = q[0] * y2,
          xz = q[0] * z2;
        const yy = q[1] * y2,
          yz = q[1] * z2,
          zz = q[2] * z2;
        const wx = q[3] * x2,
          wy = q[3] * y2,
          wz = q[3] * z2;
        mNode[0] = 1 - (yy + zz);
        mNode[1] = xy + wz;
        mNode[2] = xz - wy;
        mNode[3] = 0;
        mNode[4] = xy - wz;
        mNode[5] = 1 - (xx + zz);
        mNode[6] = yz + wx;
        mNode[7] = 0;
        mNode[8] = xz + wy;
        mNode[9] = yz - wx;
        mNode[10] = 1 - (xx + yy);
        mNode[11] = 0;
        mNode[12] = 0;
        mNode[13] = 0;
        mNode[14] = 0;
        mNode[15] = 1;
      }

      // 2. Transformación al mundo del juego (rotación yaw + traslación espacial)
      if (options.transform) {
        const t = options.transform;
        const mRot = m4(),
          mTrans = m4(),
          mXf = m4();
        m4rotY(mRot, t.yaw || 0);
        m4translate(
          mTrans,
          t.pos ? t.pos[0] : 0,
          t.pos ? t.pos[1] : 0,
          t.pos ? t.pos[2] : 0,
        );
        m4mul(mXf, mTrans, mRot); // Traslación * Rotación
        m4mul(model, mXf, mNode); // (Traslación * Rotación) * Nodo
      } else {
        model.set(mNode);
      }

      prev.set(model);

      const fam = trackObj.fam;
      const prims = trackObj.primitives;

      R.drawables.push({
        draw(pass, ctx) {
          // El circuito estático no interfiere en el pase de sombras dinámicas en cascada
          if (ctx.kind === KIND.SHADOW) return;
          const pipe = fam.pipe[ctx.kind];
          if (!pipe) return;

          pass.setPipeline(pipe);
          R.dyn2[0] = slot * 256;
          pass.setBindGroup(2, R.objBG, R.dyn2, 0, 1);

          for (let i = 0; i < prims.length; i++) {
            const p = prims[i];
            if (p.bg) pass.setBindGroup(3, p.bg);
            pass.setVertexBuffer(0, p.vb);
            pass.setIndexBuffer(p.ib, p.indexFormat);
            pass.drawIndexed(p.count);
          }
        },
      });
    },
  };

  if (typeof window !== "undefined") {
    window.TrackGLB = TrackGLB;
  }
})();
