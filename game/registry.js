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
function saveSelection(carId, trackId) {
  try {
    localStorage.setItem(SEL_KEY, JSON.stringify({ car: carId, track: trackId }));
  } catch (e) { /* armazenamento local indisponível */ }
}

const CARS = {
  list: [],
  byId: {},
  active: null,

  register(def) {
    if (!def || !def.id) throw new Error('Coche inválido: falta el campo id.');
    if (this.byId[def.id]) throw new Error('Coche duplicado: ' + def.id);
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
};

const TRACKS = {
  list: [],
  byId: {},
  active: null,

  register(def) {
    if (!def || !def.id) throw new Error('Circuito inválido: falta el campo id.');
    if (this.byId[def.id]) throw new Error('Circuito duplicado: ' + def.id);
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
