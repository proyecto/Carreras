'use strict';
// Factoría de vehículos (definición, registro y carga)
const CAR_FACTORY_CFG = (typeof window !== 'undefined' && window.__CFG_ENGINE_CAR_FACTORY)
  || (typeof require === 'function' ? (() => { try { return require('../config/engine/car-factory.json'); } catch { return {}; } })() : {});
const _cfCfg = CAR_FACTORY_CFG.CarFactory || {};
const CarFactory = {
  /**
   * Decodificador canónico base64 a Uint8Array compatible con Browser (atob) y Node (Buffer).
   */
  _decodeB64(b64) {
    if (!b64) return new Uint8Array(0);
    if (typeof atob === 'function') {
      const bin = atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(b64, 'base64'));
    }
    return new Uint8Array(0);
  },

  /**
   * Decodifica una cadena base64 en Float32Array (para vértices).
   */
  b64ToF32(b64) {
    const bytes = CarFactory._decodeB64(b64);
    return new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4));
  },

  /**
   * Decodifica una cadena base64 en Uint32Array (para índices).
   */
  b64ToU32(b64) {
    const bytes = CarFactory._decodeB64(b64);
    return new Uint32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4));
  },

  /**
   * Decodifica una cadena base64 en Uint16Array (para índices compactos de 16 bits).
   */
  b64ToU16(b64) {
    const bytes = CarFactory._decodeB64(b64);
    return new Uint16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  },

  /**
   * Crea un atlas de texturas GPU con precarga asíncrona y generación de mipmaps.
   * Acepta base64 data URI o URLs de imagen tradicionales.
   */
  createAtlasTexture(atlasSource, W = (_cfCfg.defaultAtlasW ? _cfCfg.defaultAtlasW.value : 2048), H = (_cfCfg.defaultAtlasH ? _cfCfg.defaultAtlasH.value : 2048), defaultColor = (_cfCfg.defaultAtlasColor ? _cfCfg.defaultAtlasColor.value : 40)) {
    if (typeof mkTex !== 'function') return null;
    const mips = _cfCfg.atlasMipLevels ? _cfCfg.atlasMipLevels.value : 7;
    const tex = mkTex(W, H, 'rgba8unorm-srgb', TU.RT | TU.TB | TU.CD, { mipLevelCount: mips });
    const initData = new Uint8Array(W * H * 4);
    initData.fill(defaultColor);
    if (typeof G !== 'undefined' && G.dev && G.dev.queue) {
      G.dev.queue.writeTexture({ texture: tex }, initData, { bytesPerRow: W * 4 }, [W, H]);
    }

    if (typeof Image !== 'undefined' && atlasSource) {
      const img = new Image();
      if (typeof atlasSource === 'string' && !atlasSource.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
        const ver = (typeof window !== 'undefined' && window.CACHE_VERSION) ? window.CACHE_VERSION : 'racing_mirror_f1_v23';
        img.src = atlasSource + (atlasSource.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(ver);
      } else {
        img.src = atlasSource;
      }
      img.onload = () => {
        if (typeof createImageBitmap !== 'undefined') {
          createImageBitmap(img).then(bmp => {
            if (typeof G !== 'undefined' && G.dev && G.dev.queue) {
              G.dev.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex }, [W, H]);
            }
            if (typeof genMips === 'function') genMips(tex, 'rgba8unorm-srgb');
          }).catch(() => {
            CarFactory._writeImageFallback(img, tex, W, H);
          });
        } else {
          CarFactory._writeImageFallback(img, tex, W, H);
        }
      };
    }
    return tex;
  },

  _writeImageFallback(img, tex, W, H) {
    if (typeof document !== 'undefined') {
      const cvs = document.createElement('canvas');
      cvs.width = W; cvs.height = H;
      const ctx2d = cvs.getContext('2d');
      ctx2d.drawImage(img, 0, 0);
      const id = ctx2d.getImageData(0, 0, W, H);
      if (typeof G !== 'undefined' && G.dev && G.dev.queue) {
        G.dev.queue.writeTexture({ texture: tex }, id.data, { bytesPerRow: W * 4 }, [W, H]);
      }
      if (typeof genMips === 'function') genMips(tex, 'rgba8unorm-srgb');
    }
  },

  /**
   * Genera un objeto de vehículo listo para registrar en CARS.register(car).
   */
  defineCar(config) {
    const {
      id,
      name,
      subtitle,
      specs,
      accent = '#ffffff',
      physics,
      hud,
      wheelbase,
      trackF,
      trackR,
      wheelR = 0.34,
      cockpitCam = null,
      hubs,
      shaderSrc = 'mat_car_default',
      atlasB64,
      onCustomBuild = null,
      onCustomPlace = null,
      autoRegister = true,
    } = config;

    const glbUrl = config.glbUrl || (typeof config.model === 'string' && config.model.endsWith('.glb') ? config.model : null);
    const textureUrl = config.textureUrl || (typeof config.texture === 'string' && !config.texture.startsWith('data:') ? config.texture : null);

    let bodyV = config.bodyV || null;
    let bodyI = config.bodyI || null;
    let glassV = config.glassV || null;
    let glassI = config.glassI || null;
    let wheelV = config.wheelV || null;
    let wheelI = config.wheelI || null;

    if (config.model && typeof config.model === 'object') {
      if (!bodyV && config.model.bodyV) bodyV = config.model.bodyV;
      if (!bodyI && config.model.bodyI) bodyI = config.model.bodyI;
      if (!glassV && config.model.glassV) glassV = config.model.glassV;
      if (!glassI && config.model.glassI) glassI = config.model.glassI;
      if (!wheelV && config.model.wheelV) wheelV = config.model.wheelV;
      if (!wheelI && config.model.wheelI) wheelI = config.model.wheelI;
    }

    // Validación básica del contrato
    if (!id || !name || !physics || !hud || !hubs) {
      throw new Error(`[CarFactory] Error al definir el coche: campos obligatorios ausentes en ${id || 'desconocido'}`);
    }

    const CAR = Object.assign({
      slotBody: 0,
      slotWheel: [0, 0, 0, 0],
      slotSteer: 0,
      steerMat: (typeof m4 === 'function') ? m4() : new Float32Array(16),
      tris: 0,
      _t: (typeof m4 === 'function') ? m4() : new Float32Array(16),
      _t2: (typeof m4 === 'function') ? m4() : new Float32Array(16),
      _t3: (typeof m4 === 'function') ? m4() : new Float32Array(16),
      set: null,
      glass: null,
      atlasBG: null,
      fam: null,
      _z4: new Float32Array(4),
      inp: new Float64Array(2),
    }, config, {
      id,
      name,
      subtitle: subtitle || name,
      specs: specs || '',
      accent,
      physics,
      hud,
      wheelbase: wheelbase !== undefined ? wheelbase : (hubs ? Math.abs(hubs[0][0] - hubs[2][0]) : 2.6),
      trackF: trackF !== undefined ? trackF : (hubs ? Math.abs(hubs[1][2] - hubs[0][2]) : 1.7),
      trackR: trackR !== undefined ? trackR : (hubs ? Math.abs(hubs[3][2] - hubs[2][2]) : 1.7),
      wheelR: wheelR !== undefined ? wheelR : (physics && physics.R ? physics.R : 0.34),
      cockpitCam,
      hubs,
    });

    CAR.build = async function() {
        if (glbUrl && (!bodyV || !bodyI)) {
          try {
            const glbData = await CarFactory.loadGLB(glbUrl);
            if (glbData) {
              bodyV = glbData.bodyV;
              bodyI = glbData.bodyI;
              glassV = glbData.glassV;
              glassI = glbData.glassI;
              wheelV = glbData.wheelV;
              wheelI = glbData.wheelI;
            }
          } catch (err) {
            console.warn(`[CarFactory] Advertencia al cargar GLB (${glbUrl}):`, err);
          }
        }

        const famName = `car_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        const actualShader = (typeof WGSL !== 'undefined' && shaderSrc && WGSL[shaderSrc]) ? shaderSrc : 'mat_car_default';
        const fam = CAR.fam = mkFamily(famName, { src: actualShader, noCube: true });
        CAR.slotBody = objSlot();
        for (let i = 0; i < 4; i++) CAR.slotWheel[i] = objSlot();

        const set = CAR.set = new MeshSet(fam);
        const glass = CAR.glass = new GlassSet();

        const mb = new MeshBuilder(1 << 19);
        const gl = new MeshBuilder(1 << 15);
        const w = new MeshBuilder(1 << 15);

        // Subida de carrocería principal
        if (bodyV && bodyI) {
          const bV = typeof bodyV === 'string' ? CarFactory.b64ToF32(bodyV) : bodyV;
          const bI = typeof bodyI === 'string' ? CarFactory.b64ToU32(bodyI) : bodyI;
          const nbV = bV.length / 9;
          for (let i = 0; i < nbV; i++) {
            mb.mat(bV[i * 9 + 8]);
            mb.v(bV[i*9], bV[i*9+1], bV[i*9+2], bV[i*9+3], bV[i*9+4], bV[i*9+5], bV[i*9+6], bV[i*9+7]);
          }
          for (let i = 0; i < bI.length; i += 3) mb.tri(bI[i], bI[i+1], bI[i+2]);
        }

        // Subida de cristales (transparencias)
        if (glassV && glassI) {
          const gV = typeof glassV === 'string' ? CarFactory.b64ToF32(glassV) : glassV;
          const gI = typeof glassI === 'string' ? CarFactory.b64ToU32(glassI) : glassI;
          const ngV = gV.length / 9;
          for (let i = 0; i < ngV; i++) {
            const mat = gV[i * 9 + 8];
            gl.mat(mat === 18 ? 1 : 0); // 1 = lente de faro, 0 = cristal estándar
            gl.v(gV[i*9], gV[i*9+1], gV[i*9+2], gV[i*9+3], gV[i*9+4], gV[i*9+5], gV[i*9+6], gV[i*9+7]);
          }
          for (let i = 0; i < gI.length; i += 3) gl.tri(gI[i], gI[i+1], gI[i+2]);
        }

        // Subida de rueda estándar
        if (wheelV && wheelI) {
          const wV = typeof wheelV === 'string' ? CarFactory.b64ToF32(wheelV) : wheelV;
          const wI = typeof wheelI === 'string' ? CarFactory.b64ToU32(wheelI) : wheelI;
          const nwV = wV.length / 9;
          for (let i = 0; i < nwV; i++) {
            w.mat(wV[i * 9 + 8]);
            w.v(wV[i*9], wV[i*9+1], wV[i*9+2], wV[i*9+3], wV[i*9+4], wV[i*9+5], wV[i*9+6], wV[i*9+7]);
          }
          for (let i = 0; i < wI.length; i += 3) w.tri(wI[i], wI[i+1], wI[i+2]);
        }

        // Hook para personalizaciones adicionales del modelo
        if (typeof onCustomBuild === 'function') {
          onCustomBuild({ CAR, fam, set, glass, mb, gl, w });
        }

        CAR.tris = (mb.ni / 3) + (gl.ni / 3);
        set.add(mb.upload(), CAR.slotBody, 3);

        if (gl.ni > 0) {
          glass.add_(gl.upload(), CAR.slotBody);
          R.transparents.push(glass);
        }

        const wm = w.upload();
        CAR.tris += 4 * (w.ni / 3);
        for (let i = 0; i < 4; i++) set.add(wm, CAR.slotWheel[i], 3);

        const tex = CarFactory.createAtlasTexture(atlasB64 || textureUrl);
        R.drawables.push({
          draw(pass, ctx) {
            if (ctx.kind === KIND.SHADOW && ctx.cascade === 3) return;
            if (!CAR.atlasBG) {
              if (!fam.bgl3) return;
              CAR.atlasBG = G.dev.createBindGroup({ layout: fam.bgl3, entries: [{ binding: 0, resource: tex.createView() }] });
            }
            pass.setBindGroup(3, CAR.atlasBG);
            set.draw(pass, ctx);
          },
        });

        m4ident(CAR._t);
        CAR.place(CAR._t, CAR._z4, CAR._z4);
        CAR.place(CAR._t, CAR._z4, CAR._z4);
        console.log(`[${name}] Modelo inicializado con éxito. Triángulos: ${CAR.tris}`);
      };

      /**
       * Cinemática de suspensión, dirección y rotación de ruedas.
       * Implementada en un único paso matricial directo sin allocations intermedias.
       */
      CAR.place = function(body, spin, susp) {
        const steer = CAR.inp[0];
        const t = CAR._t2;
        objPrev(CAR.slotBody).set(objModel(CAR.slotBody));
        objModel(CAR.slotBody).set(body);

        const PI_VAL = typeof PI !== 'undefined' ? PI : Math.PI;

        for (let i = 0; i < 4; i++) {
          const sl = CAR.slotWheel[i], h = CAR.hubs[i], left = (i & 1) === 0;
          objPrev(sl).set(objModel(sl));

          const a = -(i < 2 ? steer : 0) + (left ? PI_VAL : 0);
          const c = Math.cos(a), sn = Math.sin(a);
          const g = (spin && spin[i] !== undefined) ? (left ? spin[i] : -spin[i]) : 0;
          const cg = Math.cos(g), sg = Math.sin(g);

          t[0] = c * cg;   t[1] = sg;  t[2] = -sn * cg; t[3] = 0;
          t[4] = -c * sg;  t[5] = cg;  t[6] = sn * sg;  t[7] = 0;
          t[8] = sn;       t[9] = 0;   t[10] = c;       t[11] = 0;
          t[12] = h[0];    t[13] = h[1] + (susp ? susp[i] : 0); t[14] = h[2]; t[15] = 1;

          m4mul(objModel(sl), body, t);
        }

        if (typeof onCustomPlace === 'function') {
          onCustomPlace({ CAR, body, spin, susp });
        }
      };

    if (autoRegister && typeof CARS !== 'undefined' && typeof CARS.register === 'function') {
      CARS.register(CAR);
    }

    return CAR;
  },

  /**
   * Crea un vehículo a partir de un objeto de especificación declarativa (JSON o plain JS object).
   * Estandariza la carga sin boilerplate.
   */
  createFromSpec(spec) {
    if (!spec || typeof spec !== 'object') {
      throw new Error('[CarFactory] createFromSpec requiere un objeto de especificación válido');
    }

    let glbUrl = null;
    let bodyV = null, bodyI = null, glassV = null, glassI = null, wheelV = null, wheelI = null;
    if (typeof spec.model === 'string') {
      if (spec.model.endsWith('.glb')) glbUrl = spec.model;
    } else if (spec.model && typeof spec.model === 'object') {
      glbUrl = spec.model.glbUrl || null;
      bodyV = spec.model.bodyV || null;
      bodyI = spec.model.bodyI || null;
      glassV = spec.model.glassV || null;
      glassI = spec.model.glassI || null;
      wheelV = spec.model.wheelV || null;
      wheelI = spec.model.wheelI || null;
    }

    let atlasB64 = null;
    let textureUrl = null;
    if (typeof spec.texture === 'string') {
      if (spec.texture.startsWith('data:')) atlasB64 = spec.texture;
      else textureUrl = spec.texture;
    } else if (spec.texture && typeof spec.texture === 'object') {
      atlasB64 = spec.texture.atlasB64 || null;
      textureUrl = spec.texture.url || spec.texture.atlasUrl || null;
    }

    const hubs = spec.hubs || [
      [1.40, 0.35, -0.85],
      [1.40, 0.35, 0.85],
      [-1.30, 0.35, -0.85],
      [-1.30, 0.35, 0.85]
    ];
    const fl = hubs[0], fr = hubs[1], rl = hubs[2], rr = hubs[3];
    const inferredWheelbase = Math.abs(fl[0] - rl[0]);
    const inferredTrackF = Math.abs(fr[2] - fl[2]);
    const inferredTrackR = Math.abs(rr[2] - rl[2]);

    const config = {
      id: spec.id,
      name: spec.name,
      subtitle: spec.subtitle || spec.name,
      specs: spec.specs || '',
      accent: spec.accent || '#ffffff',
      physics: spec.physics,
      hud: spec.hud || { maxKmh: 300, maxRpm: 8.0, redlineRpm: 7.2 },
      wheelbase: spec.wheelbase !== undefined ? spec.wheelbase : inferredWheelbase,
      trackF: spec.trackF !== undefined ? spec.trackF : inferredTrackF,
      trackR: spec.trackR !== undefined ? spec.trackR : inferredTrackR,
      wheelR: spec.wheelR !== undefined ? spec.wheelR : (spec.physics && spec.physics.R ? spec.physics.R : 0.34),
      cockpitCam: spec.cockpitCam || null,
      hubs,
      shaderSrc: spec.shaderSrc || 'mat_car_default',
      atlasB64,
      textureUrl,
      glbUrl,
      model: spec.model,
      texture: spec.texture,
      bodyV,
      bodyI,
      glassV,
      glassI,
      wheelV,
      wheelI,
      autoRegister: spec.autoRegister !== false
    };

    return CarFactory.defineCar(config);
  },

  /**
   * Parser nativo WebGPU de binarios GLB para coches.
   * Separa carrocería, transparencias y ruedas según semántica de nodos y materiales.
   */
  parseGLB(buf) { return GLBParser.parseGLB(buf); },

  async loadGLB(url) {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const nodeFs = require('fs');
        const nodePath = require('path');
        const cleanPath = url.replace(/^[a-zA-Z]+:\/\/[^/]+/, '');
        const filePath = nodePath.isAbsolute(cleanPath) ? cleanPath : nodePath.resolve(process.cwd(), cleanPath);
        if (nodeFs.existsSync(filePath)) {
          const buf = nodeFs.readFileSync(filePath);
          return CarFactory.parseGLB(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
        }
      } catch (e) {
        // Fallback a fetch
      }
    }
    const version = (typeof window !== 'undefined' && window.CACHE_VERSION) ? window.CACHE_VERSION : 'racing_mirror_f1_v23';
    const safeUrl = encodeURI(url);
    const busterUrl = safeUrl + (safeUrl.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(version);
    const res = await fetch(busterUrl);
    if (!res.ok) throw new Error(`[CarFactory] Error al cargar modelo GLB: ${safeUrl} (HTTP ${res.status})`);
    const buf = await res.arrayBuffer();
    return CarFactory.parseGLB(buf);
  },

  /**
   * Carga asíncrona de una especificación JSON de vehículo.
   * Soporta ejecución isomórfica en navegador (fetch) y Node.js (fs).
   */
  async loadFromJSON(url) {
    let spec = null;
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const nodeFs = require('fs');
        const nodePath = require('path');
        const cleanPath = url.replace(/^[a-zA-Z]+:\/\/[^/]+/, '');
        const filePath = nodePath.isAbsolute(cleanPath) ? cleanPath : nodePath.resolve(process.cwd(), cleanPath);
        if (nodeFs.existsSync(filePath)) {
          spec = JSON.parse(nodeFs.readFileSync(filePath, 'utf8'));
        }
      } catch (e) {
        // Fallback a fetch
      }
    }
    if (!spec) {
      const version = (typeof window !== 'undefined' && window.CACHE_VERSION) ? window.CACHE_VERSION : 'racing_mirror_f1_v23';
      const safeUrl = encodeURI(url);
      const busterUrl = safeUrl + (safeUrl.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(version);
      const res = await fetch(busterUrl);
      if (!res.ok) throw new Error(`[CarFactory] Error al cargar especificación de coche: ${safeUrl} (HTTP ${res.status})`);
      spec = await res.json();
    }

    if (spec.model && typeof spec.model === 'string' && spec.model.endsWith('.glb')) {
      const glbPath = (spec.model.startsWith('http') || spec.model.startsWith('/'))
        ? spec.model
        : (url.includes('://') ? new URL(spec.model, url).href : spec.model);
      try {
        const glbData = await CarFactory.loadGLB(glbPath);
        spec.model = glbData;
      } catch (err) {
        console.warn(`[CarFactory] Advertencia: No se pudo precargar la geometría GLB (${glbPath}):`, err);
      }
    }

    return CarFactory.createFromSpec(spec);
  }
};

// Funciones globales canónicas para retrocompatibilidad directa con vehículos modulares (DRY)
function b64ToF32(b64) { return CarFactory.b64ToF32(b64); }
function b64ToU32(b64) { return CarFactory.b64ToU32(b64); }
function b64ToU16(b64) { return CarFactory.b64ToU16(b64); }

if (typeof window !== 'undefined') {
  window.CarFactory = CarFactory;
  window.b64ToF32 = b64ToF32;
  window.b64ToU32 = b64ToU32;
  window.b64ToU16 = b64ToU16;
}
if (typeof globalThis !== 'undefined') {
  globalThis.CarFactory = CarFactory;
  globalThis.b64ToF32 = b64ToF32;
  globalThis.b64ToU32 = b64ToU32;
  globalThis.b64ToU16 = b64ToU16;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CarFactory, b64ToF32, b64ToU32, b64ToU16 };
}
