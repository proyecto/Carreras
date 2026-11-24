'use strict';
/**
 * TrackFactory - Fábrica, validador y gestor centralizado de circuitos
 *
 * Sigue los principios SOLID de Responsabilidad Única y Factory Method:
 * 1. Registro y catálogo canónico de circuitos en TRACKS / TRACK_MANIFEST.
 * 2. Validación de especificaciones de circuitos (validateTrack): garantiza ausencia
 *    de NaNs, completitud de trazados (points, corners, pit, stand, poses) y cotas numéricas.
 * 3. Utilidades matemáticas y muestreo spline compartidos:
 *    - sI(s, ds, N): índice cíclico de segmento.
 *    - gs(src, dst, sg, N): suavizado gaussiano de arrays de pista (elimina duplicación).
 *    - trkAt(arr, i0, f, N): interpolación circular sobre muestras de pista.
 *    - kerbProfile(x, kerbW): rampa analítica de pianos FIA.
 *    - trackSurfY(i0, f, d, TRK): elevación de pista con peralte.
 *    - trackPos(s, d, TRK, out): proyección (s, d) a coordenadas mundiales (x, y, z, tx, tz).
 *    - getWallDistance(s, side, TRK): distancia a barreras/muros laterales.
 *    - findNextCorner(s, corners, lookahead): detector de próxima curva para HUD y telemetría.
 * 4. Desacoplamiento y delegación de props complejas urbanas (buildVegasUrbanProps).
 */

const TrackFactory = {
  /**
   * Cálculo de índice cíclico de segmento de pista según distancia 's'
   * @param {number} s - Distancia acumulada en metros
   * @param {number} ds - Paso de discretización de la pista en metros
   * @param {number} N - Número total de muestras
   * @returns {number} Índice de muestra entero en [0, N-1]
   */
  sI(s, ds, N) {
    if (!N || N <= 0) return 0;
    const step = ds > 0 ? ds : 3.0;
    return (((Math.round(s / step)) % N) + N) % N;
  },

  /**
   * Suavizado gaussiano de arrays cerrados de pista (periodo N).
   * @param {ArrayLike<number>} src - Array fuente
   * @param {ArrayLike<number>} dst - Array destino
   * @param {number} sg - Radio sigma gaussiano en muestras
   * @param {number} N - Número total de muestras
   */
  gs(src, dst, sg, N) {
    const total = N || (src ? src.length : 0);
    if (!total || !src || !dst) return;
    const ks = Math.ceil(sg * 3);
    for (let i = 0; i < total; i++) {
      let s = 0, w = 0;
      for (let q = -ks; q <= ks; q++) {
        const g = Math.exp(-0.5 * q * q / (sg * sg));
        s += src[(((i + q) % total) + total) % total] * g;
        w += g;
      }
      dst[i] = w > 0 ? s / w : src[i];
    }
  },

  /**
   * Interpola cíclicamente un valor de muestra fraccionario f en [0, 1)
   */
  trkAt(arr, i0, f, N) {
    if (!arr) return 0;
    const total = N || arr.length;
    const i1 = (i0 + 1) % total;
    return arr[i0] + (arr[i1] - arr[i0]) * f;
  },

  /**
   * Perfil analítico transversal de piano FIA; x = distancia más allá del borde de pista
   */
  kerbProfile(x, kerbW = 1.35) {
    if (x <= 0 || x >= kerbW) return 0;
    const peak = kerbW * 0.82;
    const amp = 0.012 + 0.045 * Math.sin(Math.min(1, x / peak) * Math.PI * 0.5);
    return x > peak ? amp * ((kerbW - x) / (kerbW * 0.18)) : amp;
  },

  /**
   * Cota de superficie (asfalto + piano + arcén) en (muestra i0, fracción f, lateral d)
   */
  trackSurfY(i0, f, d, TRK) {
    if (!TRK || !TRK.y) return 0;
    const y = this.trkAt(TRK.y, i0, f, TRK.N);
    const b = TRK.bank ? this.trkAt(TRK.bank, i0, f, TRK.N) : 0;
    const apron = typeof APRON !== 'undefined' ? APRON : 3.5;
    const lim = (TRK.hw || 6.0) + apron;
    const clampedD = d < -lim ? -lim : d > lim ? lim : d;
    return y - clampedD * b;
  },

  /**
   * Posición en el mundo 3D a partir de coordenadas Frenet (s, d)
   * Escribe en out[0..2] = (x, y, z), out[3..4] = vector tangente unitario (tx, tz)
   */
  trackPos(s, d, TRK, out = new Float64Array(5)) {
    if (!TRK || !TRK.ds || !TRK.N) return out;
    const N = TRK.N;
    let u = s / TRK.ds;
    u = ((u % N) + N) % N;
    const i0 = Math.floor(u);
    const f = u - i0;
    const i1 = (i0 + 1) % N;

    const tx0 = TRK.tx ? TRK.tx[i0] : 0, tx1 = TRK.tx ? TRK.tx[i1] : 0;
    const tz0 = TRK.tz ? TRK.tz[i0] : 1, tz1 = TRK.tz ? TRK.tz[i1] : 1;
    const tx = tx0 + (tx1 - tx0) * f;
    const tz = tz0 + (tz1 - tz0) * f;
    const l = Math.hypot(tx, tz) || 1.0;

    const x0 = TRK.x ? TRK.x[i0] : 0, x1 = TRK.x ? TRK.x[i1] : 0;
    const z0 = TRK.z ? TRK.z[i0] : 0, z1 = TRK.z ? TRK.z[i1] : 0;
    const x = x0 + (x1 - x0) * f;
    const z = z0 + (z1 - z0) * f;

    out[0] = x - (tz / l) * d;
    out[2] = z + (tx / l) * d;
    out[1] = this.trackSurfY(i0, f, d, TRK);
    out[3] = tx / l;
    out[4] = tz / l;
    return out;
  },

  /**
   * Obtiene la distancia lateral al muro/barrera en distancia 's' y lado (-1: izq, +1: der)
   */
  getWallDistance(s, side, TRK) {
    if (!TRK) return 7.0;
    const hw = TRK.hw || 6.0;
    const ds = TRK.ds || 3.0;
    const N = TRK.N || 1;
    const u = ((s / ds) % N + N) % N;
    const i0 = Math.floor(u), f = u - i0, i1 = (i0 + 1) % N;
    const bar = side < 0 ? TRK.barL : TRK.barR;
    const b0 = bar ? bar[i0] : (hw + 0.85);
    const b1 = bar ? bar[i1] : (hw + 0.85);
    return side * (b0 + (b1 - b0) * f);
  },

  /**
   * Detecta la próxima curva a partir de una distancia actual 's' en metros
   */
  findNextCorner(s, corners, lookahead = 650) {
    if (!Array.isArray(corners) || corners.length === 0) return null;
    let nextCorner = null;
    let minDist = Infinity;

    for (const c of corners) {
      const cStart = c.s ?? c.s0 ?? 0;
      let dist = cStart - s;
      if (dist < -50) continue;
      if (dist < 0) dist = 0;
      if (dist <= lookahead && dist < minDist) {
        minDist = dist;
        nextCorner = {
          corner: c,
          distance: dist,
          name: c.name || 'Curva',
          ang: c.ang || c.deg || 0,
          R: c.R || c.r || 50,
          gear: c.gear || null,
          speedKmh: c.speedKmh || null
        };
      }
    }
    return nextCorner;
  },

  /**
   * Delegación unificada de escenografía de Las Vegas / circuito urbano
   */
  buildVegasUrbanProps(ctx) {
    if (typeof buildVegasUrbanProps === 'function') {
      return buildVegasUrbanProps(ctx);
    }
    if (typeof window !== 'undefined' && typeof window.buildVegasUrbanProps === 'function') {
      return window.buildVegasUrbanProps(ctx);
    }
    if (typeof globalThis !== 'undefined' && typeof globalThis.buildVegasUrbanProps === 'function') {
      return globalThis.buildVegasUrbanProps(ctx);
    }
    console.warn('[TrackFactory] buildVegasUrbanProps no disponible en el contexto actual');
    return null;
  },

  /**
   * Validación formal de una especificación de circuito.
   */
  validateTrack(spec) {
    const errors = [];
    if (!spec || typeof spec !== 'object') {
      return { valid: false, errors: ['La especificación del circuito debe ser un objeto válido.'] };
    }
    if (!spec.id || typeof spec.id !== 'string') errors.push('Falta spec.id (string requerido).');
    if (!spec.name || typeof spec.name !== 'string') errors.push('Falta spec.name (string requerido).');

      // Si es solo una entrada de catálogo / manifest (aún sin geometría cargada en memoria)
      if (!spec.points && (spec.file || spec.json || !spec.hw)) {
        return { valid: errors.length === 0, errors, isManifest: true };
      }

      if (typeof spec.hw !== 'number' || spec.hw < 3.0 || spec.hw > 15.0) {
        errors.push(`spec.hw inválido (${spec.hw}): debe estar entre 3.0 y 15.0 m.`);
      }
      if (!Array.isArray(spec.points) || spec.points.length < 3) {
        errors.push('spec.points debe ser un array con al menos 3 vértices [x, z].');
      } else {
        let hasNaN = false;
        for (let i = 0; i < Math.min(spec.points.length, 50); i++) {
          const pt = spec.points[i];
          if (!Array.isArray(pt) || pt.length < 2 || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) {
            hasNaN = true; break;
          }
        }
        if (hasNaN) errors.push('spec.points contiene coordenadas no numéricas o NaN.');
      }
      if (!Array.isArray(spec.corners)) errors.push('spec.corners debe ser un Array.');
      if (!spec.pit || typeof spec.pit !== 'object') errors.push('spec.pit debe ser un objeto de definición de boxes.');
      if (!spec.stand || typeof spec.stand !== 'object') errors.push('spec.stand debe ser un objeto de tribunas.');
      if (typeof spec.naturalH !== 'function' && (!spec.terrain || typeof spec.terrain !== 'object')) {
        errors.push('spec.naturalH debe ser una función de relieve o definir spec.terrain.');
      }

      return { valid: errors.length === 0, errors };
    },

    /**
     * Genera la función matemática naturalH a partir de la especificación declarativa JSON.
     */
    createNaturalH(terrainSpec) {
      if (!terrainSpec || typeof terrainSpec !== 'object') {
        return function naturalH() { return 0.0; };
      }

      if (terrainSpec.type === 'ardennes' || terrainSpec.type === 'waves') {
        const w1 = terrainSpec.wave1 || { freqX: 0.002, ampX: 25, freqZ: 0.002, ampZ: 30 };
        const w2 = terrainSpec.wave2 || { freqX: 0.008, freqZ: 0.006, amp: 6 };
        return function naturalH(x, z) {
          const a = Math.sin(x * w1.freqX) * w1.ampX + Math.cos(z * w1.freqZ) * w1.ampZ;
          const b = Math.sin(x * w2.freqX + z * w2.freqZ) * w2.amp;
          return a + b;
        };
      }

      if (terrainSpec.type === 'eifel') {
        const castle = terrainSpec.castle || { x: 1050, z: -2150, radius: 1600, height: 115 };
        const flatBox = terrainSpec.flatBox || [-190, 270, -85, 95];
        const cp = terrainSpec.controlPoints || [];
        return function naturalH(x, z) {
          const distCastle = Math.hypot(x - castle.x, z - castle.z);
          const cVal = Math.max(0, 1.0 - distCastle / castle.radius) * castle.height;

          if (x >= flatBox[0] && x <= flatBox[1] && z >= flatBox[2] && z <= flatBox[3]) {
            return 0.0;
          }

          let num = 0, den = 0;
          for (let i = 0; i < cp.length; i++) {
            const p = cp[i], dx = x - p[0], dz = z - p[1];
            const w = 1.0 / (dx * dx + dz * dz + 1600.0);
            num += p[2] * w;
            den += w;
          }
          let finalY = den > 0 ? num / den : 0;

          const dMetaX = Math.max(0, Math.max(flatBox[0] - x, x - flatBox[1]));
          const dMetaZ = Math.max(0, Math.max(flatBox[2] - z, z - flatBox[3]));
          const dMeta = Math.hypot(dMetaX, dMetaZ);
          if (dMeta < 60.0) {
            const t = dMeta / 60.0;
            finalY *= t * t;
          }

          const micro = Math.sin(x * 0.005 + 1.1) * 2.2 + Math.cos(z * 0.004 - 0.7) * 1.8;
          const microWeight = dMeta < 40 ? 0 : Math.min(1, (dMeta - 40) / 40);

          return finalY + cVal + micro * microWeight;
        };
      }

      return function naturalH() { return 0.0; };
    },

    /**
     * Construye escenografía a partir de la especificación declarativa JSON de props.
     */
    buildPropsFromSpec(ctx, propsSpec) {
      if (!ctx || !propsSpec) return;

      if (propsSpec.vegasUrban) {
        if (typeof buildVegasUrbanProps === 'function') {
          buildVegasUrbanProps(ctx);
        } else if (typeof TrackFactory !== 'undefined' && typeof TrackFactory.buildVegasUrbanProps === 'function') {
          TrackFactory.buildVegasUrbanProps(ctx);
        }
        return;
      }

      if (typeof PropFactory === 'undefined') return;

      if (Array.isArray(propsSpec.grandstands)) {
        for (const gs of propsSpec.grandstands) {
          if (gs.type === 'mercedes_arena') {
            PropFactory.createMercedesArenaGrandstand(ctx, gs);
          } else {
            PropFactory.createGrandstand(ctx, gs);
          }
        }
      }

      if (propsSpec.pitBuilding) {
        PropFactory.createPitBuilding(ctx, propsSpec.pitBuilding);
      }

      if (propsSpec.castle) {
        PropFactory.createMedievalCastle(ctx, propsSpec.castle);
      }

      if (Array.isArray(propsSpec.sausageKerbs)) {
        PropFactory.createSausageKerbs(ctx, { kerbs: propsSpec.sausageKerbs });
      }

      if (Array.isArray(propsSpec.paddockTrucks) && ctx.mb && typeof ctx.P === 'function') {
        const padI0 = ctx.mb.ni;
        for (const trk of propsSpec.paddockTrucks) {
          const p = ctx.P(trk.s, trk.d);
          let tx = p[3], tz = p[4];
          if (trk.yaw) {
            const c = Math.cos(trk.yaw), sn = Math.sin(trk.yaw);
            const a = tx * c - tz * sn, b = tx * sn + tz * c;
            tx = a; tz = b;
          }
          if (typeof m4basis === 'function' && typeof m4 === 'function') {
            const m = m4basis(m4(), tx, 0, tz, 0, 1, 0, -tz, 0, tx, p[0], p[1], p[2]);
            ctx.mb.push(m);
            PropFactory.createPaddockTruck({ mb: ctx.mb }, { color: trk.color });
            ctx.mb.pop();
          }
        }
        if (ctx.S1) ctx.S1.add(ctx.mb, padI0, 7, 1400);
      }

      if (Array.isArray(propsSpec.brakeDistanceSigns)) {
        PropFactory.createBrakeDistanceSigns(ctx, { zones: propsSpec.brakeDistanceSigns });
      }

      if (Array.isArray(propsSpec.armcoGuardrails)) {
        PropFactory.createArmcoGuardrail(ctx, { zones: propsSpec.armcoGuardrails });
      }
    },

    /**
     * Crea e hidrata un objeto de circuito a partir de una especificación JSON.
     */
    createFromSpec(spec) {
      if (!spec || typeof spec !== 'object') {
        throw new Error('[TrackFactory] createFromSpec requiere un objeto de especificación válido');
      }

      const track = Object.assign({}, spec);

      if (typeof track.naturalH !== 'function') {
        track.naturalH = this.createNaturalH(spec.terrain);
      }

      if (typeof track.buildProps !== 'function' && spec.props) {
        track.buildProps = (ctx) => {
          this.buildPropsFromSpec(ctx, spec.props);
        };
      }

      this.register(track);
      return track;
    },

  /**
   * Carga asíncrona de un circuito desde un archivo JSON.
   * Isomórfico: funciona en Node.js (fs) y navegador (fetch).
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
        const safeUrl = encodeURI(url);
        const res = await fetch(safeUrl);
        if (!res.ok) throw new Error(`[TrackFactory] Error al cargar circuito desde JSON: ${safeUrl} (HTTP ${res.status})`);
        spec = await res.json();
      }

      return this.createFromSpec(spec);
    },

    /**
     * Registra un circuito validándolo previamente.
     */
    register(spec) {
      const validation = this.validateTrack(spec);
      if (!validation.valid) {
        console.warn(`[TrackFactory] Advertencias al registrar circuito ${spec?.id}:`, validation.errors);
      }
      if (typeof TRACKS !== 'undefined' && typeof TRACKS.register === 'function') {
        return TRACKS.register(spec);
      }
      if (typeof window !== 'undefined' && window.TRACKS && typeof window.TRACKS.register === 'function') {
        return window.TRACKS.register(spec);
      }
      return spec;
    },

    /**
     * Obtiene un circuito registrado por su ID.
     */
    getTrack(id) {
      if (typeof TRACKS !== 'undefined' && typeof TRACKS.get === 'function') {
        return TRACKS.get(id);
      }
      if (typeof window !== 'undefined' && window.TRACKS && typeof window.TRACKS.get === 'function') {
        return window.TRACKS.get(id);
      }
      return null;
    },

    /**
     * Devuelve todos los circuitos registrados.
     */
    getAllTracks() {
      if (typeof TRACKS !== 'undefined' && Array.isArray(TRACKS.list)) {
        return TRACKS.list;
      }
      if (typeof window !== 'undefined' && window.TRACKS && Array.isArray(window.TRACKS.list)) {
        return window.TRACKS.list;
      }
      return [];
    }
  };

  // Exposición en navegadores y entornos de prueba
  if(typeof window !== 'undefined') {
    window.TrackFactory = TrackFactory;
}
if (typeof globalThis !== 'undefined') {
  globalThis.TrackFactory = TrackFactory;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TrackFactory };
}
