'use strict';
// ---- 50_i18n.js
// Sistema de internacionalización del juego (español e inglés).
const I18N_CFG = (typeof window !== 'undefined' && window.__CFG_GAME_I18N)
  || (typeof require === 'function' ? (() => { try { return require('../config/game/i18n.json'); } catch { return {}; } })() : {});
const _i18nC = I18N_CFG.i18n || {};
const I18N = {
  lang: _i18nC.defaultLang ? _i18nC.defaultLang.value : 'es', // Español por defecto

  locales: {},

  async loadLocale(code) {
    if (I18N.locales[code]) return I18N.locales[code];
    if (typeof require === 'function' && typeof window === 'undefined') {
      try {
        I18N.locales[code] = require('../locales/' + code + '.json');
        return I18N.locales[code];
      } catch (e) {}
    }
    if (typeof fetch === 'function') {
      try {
        const ver = (typeof window !== 'undefined' && window.CACHE_VERSION) ? '?v=' + window.CACHE_VERSION : '';
        const res = await fetch('locales/' + code + '.json' + ver);
        if (res.ok) {
          I18N.locales[code] = await res.json();
          return I18N.locales[code];
        }
      } catch (e) {}
    }
    return null;
  },

  init() {
    let saved = null;
    try {
      if (typeof location !== 'undefined' && location.search) {
        const p = new URLSearchParams(location.search);
        if (p.has('lang')) saved = p.get('lang');
      }
      if (!saved && typeof localStorage !== 'undefined') {
        saved = localStorage.getItem(_i18nC.storageKey ? _i18nC.storageKey.value : 'race_game_lang');
      }
    } catch (e) {}

    I18N.lang = (saved === 'en' || saved === 'es') ? saved : 'es';
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = I18N.lang;
    }

    if (typeof require === 'function' && typeof window === 'undefined') {
      I18N.loadLocale('es');
      I18N.loadLocale('en');
    } else {
      Promise.all([I18N.loadLocale(I18N.lang), I18N.loadLocale(I18N.lang === 'es' ? 'en' : 'es')]).then(() => {
        if (typeof document !== 'undefined' && document.body) I18N.updateDOM();
      });
    }
  },

  async setLang(code) {
    if (code !== 'es' && code !== 'en') return;
    await I18N.loadLocale(code);
    I18N.lang = code;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('race_game_lang', code);
      }
    } catch (e) {}
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = code;
    }
    I18N.updateDOM();
  },

  t(key, params) {
    const dict = I18N.locales[I18N.lang] || I18N.locales.en || {};
    const enDict = I18N.locales.en || {};
    let val = dict[key] !== undefined ? dict[key] : (enDict[key] !== undefined ? enDict[key] : key);
    if (typeof val === 'string' && params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replaceAll('{' + k + '}', String(v));
      }
    }
    return val;
  },

  carName(c) {
    if (!c) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en || {};
    return (dict.cars && dict.cars[c.id] && dict.cars[c.id].name) || c.name;
  },

  carSub(c) {
    if (!c) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en || {};
    return (dict.cars && dict.cars[c.id] && dict.cars[c.id].subtitle) || c.subtitle || c.name;
  },

  carSpecs(c) {
    if (!c) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en || {};
    return (dict.cars && dict.cars[c.id] && dict.cars[c.id].specs) || c.specs || '';
  },

  trackName(t) {
    if (!t) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en || {};
    return (dict.tracks && dict.tracks[t.id] && dict.tracks[t.id].name) || t.name;
  },

  trackSub(t) {
    if (!t) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en || {};
    return (dict.tracks && dict.tracks[t.id] && dict.tracks[t.id].subtitle) || t.subtitle || t.name;
  },

  trackSpecs(t) {
    if (!t) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en || {};
    return (dict.tracks && dict.tracks[t.id] && dict.tracks[t.id].specs) || t.specs || '';
  },

  updateDOM() {
    if (typeof document === 'undefined') return;

    // Actualiza textos fijos con data-i18n
    const els = document.querySelectorAll('[data-i18n]');
    for (const el of els) {
      const k = el.getAttribute('data-i18n');
      if (k) el.textContent = I18N.t(k);
    }

    // Actualiza botones de idioma
    const langBtns = document.querySelectorAll('.lang-btn');
    for (const b of langBtns) {
      b.classList.toggle('active', b.getAttribute('data-lang') === I18N.lang);
    }

    // Título y subtítulo en el panel UI
    const car = (typeof CARS !== 'undefined' && CARS.active) || null;
    const trk = (typeof TRACKS !== 'undefined' && TRACKS.active) || null;
    if (car && trk) {
      const h1 = document.getElementById('ui-title');
      const sub = document.querySelector('#ui .sub');
      const carNm = I18N.carName(car);
      const trkNm = I18N.trackSub(trk);
      if (h1) h1.textContent = carNm;
      if (sub) sub.textContent = I18N.carSub(car) + ' · ' + trkNm;
      document.title = carNm + ' — ' + trkNm;
    }

    // Hint y Msg
    const msg = document.getElementById('msg');
    if (msg && msg.textContent && msg.textContent.includes('…')) msg.textContent = I18N.t('loading');
    const hint = document.getElementById('hint');
    if (hint) hint.textContent = I18N.t('hint');

    // Reconstruye selectores de coche/circuito para reflejar nombres e idiomas
    if (typeof uiBuildSelectors === 'function') uiBuildSelectors();
    if (typeof uiUpdatePrimaryBtn === 'function') uiUpdatePrimaryBtn();
    if (typeof uiRenderControls === 'function') uiRenderControls();

    // Reconstruye HUD strips (LAPS, STATS) con los rótulos traducidos
    if (typeof hudLayout === 'function' && typeof HUD !== 'undefined' && HUD.cg) hudLayout();
  },
};

I18N.init();
if (typeof window !== 'undefined') window.I18N = I18N;
