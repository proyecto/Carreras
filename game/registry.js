'use strict';
// ---- registry.js
// Registro central de coches (CARS) y circuitos (TRACKS).
// Para añadir un coche nuevo: crea un archivo en cars/ que llame a CARS.register({...}) e inclúyelo en index.html.
// Para añadir un circuito nuevo: crea un archivo en tracks/ que llame a TRACKS.register({...}) e inclúyelo en index.html.
// Selección por URL soportada: ?car=<id>&track=<id> (con persistencia opcional en localStorage).

let CAR = null;
let POSES = [];
let REPLAY_B64 = null;

const SEL_KEY = 'carreras-sel';
function loadSelection() {
  try {
    const raw = localStorage.getItem(SEL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function saveSelection(carId, trackId, extra = {}) {
  try {
    const cur = loadSelection();
    const merged = Object.assign({}, cur, { car: carId, track: trackId }, extra);
    localStorage.setItem(SEL_KEY, JSON.stringify(merged));
  } catch (e) { /* almacenamiento local no disponible */ }
}

const CARS = {
  list: [],
  byId: {},
  active: null,
  rival: null,

  register(def) {
    if (!def || !def.id) throw new Error('Coche inválido: falta el campo id.');
    if (this.byId[def.id]) {
      Object.assign(this.byId[def.id], def);
      return this.byId[def.id];
    }
    this.list.push(def);
    this.byId[def.id] = def;
    return def;
  },

  get(id) {
    return (id && this.byId[id]) || this.list[0] || null;
  },

  select(id) {
    this.active = this.get(id);
    CAR = this.active;
    return this.active;
  },

  selectRival(id) {
    this.rival = (id && this.byId[id]) || null;
    return this.rival;
  },
};

const TRACKS = {
  list: [],
  byId: {},
  active: null,

  register(def) {
    if (!def || !def.id) throw new Error('Circuito inválido: falta el campo id.');
    if (this.byId[def.id]) {
      Object.assign(this.byId[def.id], def);
      return this.byId[def.id];
    }
    this.list.push(def);
    this.byId[def.id] = def;
    return def;
  },

  get(id) {
    return (id && this.byId[id]) || this.list[0] || null;
  },

  select(id) {
    this.active = this.get(id);
    POSES = (this.active && this.active.poses) ? this.active.poses : [];
    REPLAY_B64 = (this.active && this.active.replayB64) ? this.active.replayB64 : null;
    return this.active;
  },
};

if (typeof window !== 'undefined') {
  window.CARS = CARS;
  window.TRACKS = TRACKS;
}
