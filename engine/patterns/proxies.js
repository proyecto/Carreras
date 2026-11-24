(function (RootScope) {
  'use strict';
  /**
   * Proxies & Bridges - Patrones Proxy y Bridge
   * - CarAssetProxy: Carga perezosa y memoización de buffers de mallas 3D.
   * - I18nProxy: Resolución de traducciones y fallbacks de idioma.
   * - VehicleRenderBridge: Desacopla la física a 120Hz del renderizado gráfico WebGPU.
   */

  const getBus = () => (RootScope.EventBusSingleton || (typeof require !== 'undefined' ? require('./event-bus.js').EventBusSingleton : null));

  /**
   * CarAssetProxy: Proxy virtual que retrasa la descompresión y decodificación
   * de buffers Float32/Uint32 en base64 hasta el momento exacto en que se necesita
   * renderizar el vehículo en pista, liberando memoria caché cuando no se usa.
   */
  class CarAssetProxy {
    constructor(carDescriptor) {
      this._target = carDescriptor;
      this._cache = new Map();
    }

    get id() { return this._target.id; }
    get name() { return this._target.name; }
    get physics() { return this._target.physics; }
    get hubs() { return this._target.hubs; }
    get wheelR() { return this._target.wheelR; }

    getBuffer(bufferKey, decoderFn) {
      if (this._cache.has(bufferKey)) {
        return this._cache.get(bufferKey);
      }
      const rawData = this._target[bufferKey];
      if (!rawData) return null;
      const decoded = decoderFn(rawData);
      this._cache.set(bufferKey, decoded);
      return decoded;
    }

build() {
  return this._target.build();
}

place(body, spin, susp) {
  return this._target.place(body, spin, susp);
}

clearCache() {
  this._cache.clear();
}
  }

/**
 * I18nProxy: Proxy dinámico con resolución de fallbacks automáticos para textos localizados.
 */
class I18nProxy {
  constructor(dictionary, defaultLang = 'es') {
    this._dict = dictionary || {};
    this._currentLang = defaultLang;
  }

setLanguage(lang) {
  this._currentLang = lang;
  const bus = getBus();
  if (bus) bus.emit('i18n:language_changed', lang);
}

getLanguage() {
  return this._currentLang;
}

  t(key, replacements = null) {
    const currentTable = this._dict[this._currentLang];
    const esTable = this._dict['es'];
    const enTable = this._dict['en'];

      let text = (currentTable && currentTable[key]) ||
        (esTable && esTable[key]) ||
        (enTable && enTable[key]) ||
        key;

      if (replacements && typeof replacements === 'object') {
        for (const [k, v] of Object.entries(replacements)) {
          text = text.replace(new RegExp(`{${k}}`, 'g'), v);
        }
      }
      return text;
    }
  }

  /**
   * VehicleRenderBridge: Desacopla la física del vehículo (espacio de simulación, coordenadas,
   * integración matemática a 120 Hz) del backend de renderizado gráfico WebGPU (matrices 4x4,
   * ranuras de objetos MeshSet, sombras y shaders).
   */
  class VehicleRenderBridge {
  constructor(carModel, physicsState) {
    this.carModel = carModel;
    this.physics = physicsState;
    this._transformMatrix = new Float32Array(16);
    this._wheelMatrix = new Float32Array(16);
  }

      syncToRenderer(interpolatedBodyMat, spinArray, suspArray, steerAngle) {
        if (!this.carModel || typeof this.carModel.place !== 'function') return;
        if (this.carModel.inp) {
          this.carModel.inp[0] = steerAngle;
          this.carModel.inp[1] = steerAngle * 14;
        }
        this.carModel.place(interpolatedBodyMat, spinArray, suspArray);
      }
    }

    RootScope.CarAssetProxy = CarAssetProxy;
    RootScope.I18nProxy = I18nProxy;
    RootScope.VehicleRenderBridge = VehicleRenderBridge;

    if (typeof module !== 'undefined' && module.exports) {
      module.exports = {
        CarAssetProxy,
        I18nProxy,
        VehicleRenderBridge
      };
    }
  })(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
