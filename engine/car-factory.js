'use strict';
// ---- 25_car_factory.js
// Factoría y patrón Builder para registro y ciclo de vida de vehículos.
// Estandariza la carga de búferes base64, atlas de texturas, shaders WGSL,
// colocación cinemática de ruedas (place) y render pass hacia adelante (GlassSet).

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
   */
  createAtlasTexture(atlasB64, W = 2048, H = 2048, defaultColor = 40) {
    const tex = mkTex(W, H, 'rgba8unorm-srgb', TU.RT | TU.TB | TU.CD, { mipLevelCount: 7 });
    const initData = new Uint8Array(W * H * 4);
    initData.fill(defaultColor);
    G.dev.queue.writeTexture({ texture: tex }, initData, { bytesPerRow: W * 4 }, [W, H]);

    if (typeof Image !== 'undefined' && atlasB64) {
      const img = new Image();
      img.src = atlasB64;
      img.onload = () => {
        if (typeof createImageBitmap !== 'undefined') {
          createImageBitmap(img).then(bmp => {
            G.dev.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex }, [W, H]);
            if (typeof genMips === 'function') genMips(tex, 'rgba8unorm-srgb');
          }).catch(() => {
            const cvs = document.createElement('canvas');
            cvs.width = W; cvs.height = H;
            const ctx2d = cvs.getContext('2d');
            ctx2d.drawImage(img, 0, 0);
            const id = ctx2d.getImageData(0, 0, W, H);
            G.dev.queue.writeTexture({ texture: tex }, id.data, { bytesPerRow: W * 4 }, [W, H]);
            if (typeof genMips === 'function') genMips(tex, 'rgba8unorm-srgb');
          });
        }
      };
    }
    return tex;
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
      wheelR = 0.33,
      hubs,
      shaderSrc,
      atlasB64,
      bodyV,
      bodyI,
      glassV = null,
      glassI = null,
      wheelV,
      wheelI,
      onCustomBuild = null,
    } = config;

    // Validación básica del contrato
    if (!id || !name || !physics || !hud || !hubs) {
      throw new Error(`[CarFactory] Error al definir el coche: campos obligatorios ausentes en ${id || 'desconocido'}`);
    }

    const CAR = {
      id,
      name,
      subtitle: subtitle || name,
      specs: specs || '',
      accent,
      physics,
      hud,
      wheelbase,
      trackF,
      trackR,
      wheelR,
      hubs,

      slotBody: 0,
      slotWheel: [0, 0, 0, 0],
      tris: 0,
      _t: m4(),
      _t2: m4(),
      _t3: m4(),
      set: null,
      glass: null,
      atlasBG: null,
      fam: null,
      _z4: new Float32Array(4),
      inp: new Float64Array(2),

      build() {
        const famName = `car_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        const fam = CAR.fam = mkFamily(famName, { src: shaderSrc, noCube: true });
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

        CAR.tris = (mb.ni / 3) + (gl.ni / 3);
        set.add(mb.upload(), CAR.slotBody, 3);

        if (gl.ni > 0) {
          glass.add_(gl.upload(), CAR.slotBody);
          R.transparents.push(glass);
        }

        const wm = w.upload();
        CAR.tris += 4 * (w.ni / 3);
        for (let i = 0; i < 4; i++) set.add(wm, CAR.slotWheel[i], 3);

        // Hook para personalizaciones adicionales del modelo
        if (typeof onCustomBuild === 'function') {
          onCustomBuild({ CAR, fam, set, glass, mb, gl, w });
        }

        const tex = CarFactory.createAtlasTexture(atlasB64);
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
      },

      place(body, spin, susp) {
        const steer = CAR.inp[0];
        const t = CAR._t2;
        objPrev(CAR.slotBody).set(objModel(CAR.slotBody));
        objModel(CAR.slotBody).set(body);

        for (let i = 0; i < 4; i++) {
          const h = CAR.hubs[i];
          const isFront = i < 2;
          const isLeft = (i % 2) === 0;

          m4ident(t);
          t[12] = h[0];
          t[13] = h[1] + (susp ? susp[i] : 0);
          t[14] = h[2];

          // Giro de dirección en tren delantero
          if (isFront && steer) {
            const cs = Math.cos(steer), ss = Math.sin(steer);
            const m = CAR._t3;
            m4ident(m);
            m[0] = cs; m[2] = -ss;
            m[8] = ss; m[10] = cs;
            m4mul(t, t, m);
          }

          // Rotación angular de la rueda sobre su eje
          const ang = spin ? spin[i] : 0;
          if (ang) {
            const cr = Math.cos(ang), sr = Math.sin(ang);
            const m = CAR._t3;
            m4ident(m);
            m[5] = cr; m[6] = sr;
            m[9] = -sr; m[10] = cr;
            m4mul(t, t, m);
          }

          // Rueda derecha invertida para mantener orientación de llanta
          if (!isLeft) {
            const m = CAR._t3;
            m4ident(m);
            m[0] = -1;
            m[8] = -1;
            m4mul(t, t, m);
          }

          const wSlot = CAR.slotWheel[i];
          objPrev(wSlot).set(objModel(wSlot));
          m4mul(objModel(wSlot), body, t);
        }
      }
    };

    return CAR;
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
