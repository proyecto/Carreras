"use strict";
// Sistema de mapeo de controles y teclado
let DEFAULT_CONTROLS = {};
let ACTION_BITMASKS = {};
let KEY_LABELS = {};
if (typeof require === "function") {
  const cfg = JSON.parse(
    require("fs").readFileSync("config/controls.json", "utf8"),
  );
  DEFAULT_CONTROLS = cfg.defaultControls;
  ACTION_BITMASKS = cfg.actionBitmasks;
  KEY_LABELS = cfg.keyLabels || {};
} else if (typeof fetch === "function") {
  fetch(
    "config/controls.json" +
      (typeof window !== "undefined" && window.CACHE_VERSION
        ? "?v=" + window.CACHE_VERSION
        : ""),
  )
    .then((r) => r.json())
    .then((cfg) => {
      DEFAULT_CONTROLS = cfg.defaultControls;
      ACTION_BITMASKS = cfg.actionBitmasks;
      KEY_LABELS = cfg.keyLabels || {};
      if (typeof CONTROLS !== "undefined") {
        CONTROLS.keys = JSON.parse(JSON.stringify(DEFAULT_CONTROLS));
        CONTROLS.init();
      }
      if (typeof uiRenderControls === "function") uiRenderControls();
    })
    .catch(() => {});
}

const KEYMAP = {};

const CONTROLS = {
  keys: JSON.parse(JSON.stringify(DEFAULT_CONTROLS)),
  STORAGE_KEY: "carreras_controls_v2",

  init() {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          for (const act in DEFAULT_CONTROLS) {
            if (Array.isArray(parsed[act])) {
              this.keys[act] = [parsed[act][0] || "", parsed[act][1] || ""];
            }
          }
        }
      }
    } catch (e) {}
    this.apply();
  },

  save() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.keys));
      }
    } catch (e) {}
    this.apply();
  },

  reset() {
    this.keys = JSON.parse(JSON.stringify(DEFAULT_CONTROLS));
    this.save();
  },

  apply() {
    for (const k in KEYMAP) delete KEYMAP[k];
    for (const act in ACTION_BITMASKS) {
      const mask = ACTION_BITMASKS[act];
      const list = this.keys[act];
      if (list) {
        for (const code of list) {
          if (code) KEYMAP[code] = mask;
        }
      }
    }
  },

  setKey(action, slot, code) {
    if (!this.keys[action]) return;
    if (code) {
      // Si la tecla ya estaba asignada a otra acción o ranura, la liberamos
      for (const act in this.keys) {
        for (let i = 0; i < this.keys[act].length; i++) {
          if (this.keys[act][i] === code) {
            this.keys[act][i] = "";
          }
        }
      }
    }
    this.keys[action][slot] = code || "";
    this.save();
  },

  isKey(action, code) {
    const list = this.keys[action];
    return list ? list.includes(code) : false;
  },

  formatKey(code) {
    if (!code) return "—";
    if (code.startsWith("Key")) return code.slice(3).toUpperCase();
    if (code.startsWith("Digit")) return code.slice(5);
    if (KEY_LABELS[code]) return KEY_LABELS[code];
    return code;
  },
};
CONTROLS.init();

if (typeof window !== "undefined") {
  window.CONTROLS = CONTROLS;
  window.KEYMAP = KEYMAP;
  window.DEFAULT_CONTROLS = DEFAULT_CONTROLS;
}
