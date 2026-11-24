'use strict';
// ---- 45_game.js
// Lógica de juego: entradas, simulación a paso fijo, cámaras y pose del coche.
const GS = {
  held: 0, keys: 0, prevKeys: 0, rivalKeys: 0, cam: 0, replay: null, replayOn: false, ai: false, tick60: 0, acc: 0, sub: 0, alpha: 1, cut: true,
  body: m4(), tmp: m4(), tmp2: m4(), ground: m4(), spin: new Float32Array(4), susp: new Float32Array(4),
  cx: 0, cy: 0, cz: 0, yaw: 0, steer: 0, speed: 0,                 // Estado interpolado para render
  chaseYaw: 0, chaseY: 0, chaseInit: false, hoodPos: new Float32Array(6),
  tvData: new Float32Array(64 * 4), tvN: 0, tvCur: -1, tvAim: new Float32Array(3), tvFov: 0.3, pl: new Float64Array(2),
  v3: new Float32Array(6), fxOn: true, frozen: false, freeCam: false,
  padKeys: 0, lapSeen: 0, lapMax: 0, lapNew: false,
};
function createGsRival() {
  return {
    body: m4(), tmp: m4(), ground: m4(),
    spin: new Float32Array(4), susp: new Float32Array(4),
    cx: 0, cy: 0, cz: 0, yaw: 0, steer: 0, speed: 0,
  };
}
const GS_RIVAL = createGsRival();
const GS_RIVAL2 = createGsRival();
const GS_RIVAL3 = createGsRival();
// Cronómetro: LAP[0] tiempo inicio de vuelta actual, [1] última vuelta, [2] mejor vuelta, [3] estado
const LAP = new Float64Array(4);
// Entradas Gamepad API: acelerador, freno y dirección analógicos con zona muerta
const PADV = new Float64Array(3);

// Semáforo de salida FIA: delegado en raceDirectorInstance si está disponible
var RACE_START = (typeof raceDirectorInstance !== 'undefined') ? raceDirectorInstance : {
  active: false,
  state: 'idle',
  t: 0,
  lightsCount: 0,
  goTime: 6.0,
  doneTime: 7.8,
  lastBeep: -1,
  triggerStart() {
    this.active = true;
    this.state = 'countdown';
    this.t = 0;
    this.lightsCount = 0;
    this.lastBeep = -1;
    this.goTime = 5.0 + 0.8 + Math.random() * 1.2;
    this.doneTime = this.goTime + 1.8;
  },
  step(dt, vehicles = []) {
    if (!this.active) return;
    this.t += dt;
    if (this.state === 'countdown') {
      const curLight = Math.min(5, Math.floor(this.t));
      if (curLight !== this.lightsCount) {
        this.lightsCount = curLight;
        if (curLight > 0 && curLight !== this.lastBeep) {
          this.lastBeep = curLight;
          if (typeof sndBeep === 'function') sndBeep(480, 0.16, 0.28);
        }
      }
      if (this.t >= this.goTime) {
        this.state = 'lights_out';
        if (typeof sndBeep === 'function') sndBeep(1150, 0.38, 0.36);
        if (typeof LAP !== 'undefined') LAP[0] = performance.now() * 0.001;
      } else {
        for (let i = 0; i < vehicles.length; i++) {
          if (vehicles[i]) { vehicles[i].vx = 0; vehicles[i].vy = 0; vehicles[i].vz = 0; }
        }
      }
    } else if (this.state === 'lights_out') {
      if (this.t >= this.doneTime) {
        this.active = false;
        this.state = 'racing';
      }
    }
  }
};

const DEFAULT_CONTROLS = {
  accel: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  handbrake: ['Space', ''],
  camera: ['KeyC', ''],
  lookBack: ['KeyV', ''],
  reset: ['KeyR', ''],
  mute: ['KeyM', ''],
  stats: ['KeyH', ''],
};

const ACTION_BITMASKS = {
  accel: K_W,
  brake: K_S,
  left: K_A,
  right: K_D,
  handbrake: K_SPACE,
  camera: K_C,
  lookBack: K_V,
  reset: K_R,
};

const KEYMAP = {};

const CONTROLS = {
  keys: JSON.parse(JSON.stringify(DEFAULT_CONTROLS)),
  STORAGE_KEY: 'carreras_controls_v2',

  init() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          for (const act in DEFAULT_CONTROLS) {
            if (Array.isArray(parsed[act])) {
              this.keys[act] = [parsed[act][0] || '', parsed[act][1] || ''];
            }
          }
        }
      }
    } catch (e) { }
    this.apply();
  },

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.keys));
      }
    } catch (e) { }
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
            this.keys[act][i] = '';
          }
        }
      }
    }
    this.keys[action][slot] = code || '';
    this.save();
  },

  isKey(action, code) {
    const list = this.keys[action];
    return list ? list.includes(code) : false;
  },

  formatKey(code) {
    if (!code) return '—';
    if (code.startsWith('Key')) return code.slice(3).toUpperCase();
    if (code.startsWith('Digit')) return code.slice(5);
    if (code === 'Space') return 'Espacio';
    if (code === 'ArrowUp') return '↑';
    if (code === 'ArrowDown') return '↓';
    if (code === 'ArrowLeft') return '←';
    if (code === 'ArrowRight') return '→';
    if (code === 'Escape') return 'Esc';
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
    if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
    if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
    if (code === 'Tab') return 'Tab';
    if (code === 'Enter') return 'Enter';
    if (code === 'Backspace') return 'Backspace';
    return code;
  }
};
CONTROLS.init();

if (typeof window !== 'undefined') {
  window.CONTROLS = CONTROLS;
  window.KEYMAP = KEYMAP;
  window.DEFAULT_CONTROLS = DEFAULT_CONTROLS;
}

function onKeyDown(e) {
  if (GAME.ui && typeof UI !== 'undefined' && (UI.st === ST.INICIO || UI.st === ST.PAUSA || UI.st === ST.RESULT)) return;
  if (typeof raceDirectorInstance !== 'undefined' && raceDirectorInstance.active && raceDirectorInstance.state === 'countdown') {
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyW' || e.code === 'ArrowUp' || (typeof CONTROLS !== 'undefined' && CONTROLS.isKey('throttle', e.code))) {
      raceDirectorInstance.skipToLightsOut();
    }
  }
  const k = KEYMAP[e.code]; if (k) { GS.held |= k; e.preventDefault(); }
}
function onKeyUp(e) { const k = KEYMAP[e.code]; if (k) { GS.held &= ~k; e.preventDefault(); } }
function onBlur() { GS.held = 0; }

// Obtención del coche activo y rival utilizando exclusivamente modelos reales del catálogo cars/
const carObj = () => (CAR || (typeof CARS !== 'undefined' ? (CARS.active || CARS.list[0]) : null));
const rivalObj = () => {
  if (typeof CARS === 'undefined') return null;
  if (CARS.rival) return CARS.rival;
  if (CARS.list && CARS.list.length > 0) {
    const activeId = (CARS.active && CARS.active.id) || (CAR && CAR.id);
    const other = CARS.list.find(c => c && c.id !== activeId && typeof c.build === 'function');
    if (other) return other;
    return CARS.list[0];
  }
  return CAR || null;
};

// Instanciación de modelos para parrillas multi-coche (reutilización eficiente de buffers WebGPU)
function cloneCarModelForGrid(baseModel, instanceIndex) {
  if (!baseModel) return null;
  const isPlayerCar = (typeof CAR !== 'undefined' && baseModel === CAR) ||
                      (typeof CARS !== 'undefined' && (baseModel === CARS.active || (CARS.active && baseModel.id === CARS.active.id)));
  if (!isPlayerCar && (!instanceIndex || instanceIndex === 0)) return baseModel;

  const inst = Object.create(baseModel);
  inst.id = `${baseModel.id}_inst${instanceIndex}`;
  if (typeof objSlot === 'function') {
    inst.slotBody = objSlot();
    inst.slotWheel = [objSlot(), objSlot(), objSlot(), objSlot()];
  }
  inst.inp = new Float64Array(2);
  inst._t2 = m4();
  inst.built = true;

  if (baseModel.set && baseModel.set.items) {
    const items = baseModel.set.items;
    const len = items.length;
    for (let i = 0; i < len; i++) {
      const it = items[i];
      if (it.slot === baseModel.slotBody) {
        items.push({
          vb: it.vb, ib: it.ib, count: it.count, slot: inst.slotBody,
          flags: it.flags, cx: it.cx, cy: it.cy, cz: it.cz, r: it.r,
          maxDist: it.maxDist, wc: new Float32Array(3), on: true
        });
      } else if (baseModel.slotWheel) {
        for (let w = 0; w < 4; w++) {
          if (it.slot === baseModel.slotWheel[w]) {
            items.push({
              vb: it.vb, ib: it.ib, count: it.count, slot: inst.slotWheel[w],
              flags: it.flags, cx: it.cx, cy: it.cy, cz: it.cz, r: it.r,
              maxDist: it.maxDist, wc: new Float32Array(3), on: true
            });
            break;
          }
        }
      }
    }
  }

  if (baseModel.glass && baseModel.glass.items) {
    const items = baseModel.glass.items;
    const len = items.length;
    for (let i = 0; i < len; i++) {
      const it = items[i];
      if (it.slot === baseModel.slotBody) {
        items.push({
          vb: it.vb, ib: it.ib, count: it.count, slot: inst.slotBody,
          flags: it.flags, cx: it.cx, cy: it.cy, cz: it.cz, r: it.r,
          maxDist: it.maxDist, wc: new Float32Array(3), on: true
        });
      }
    }
  }

  inst.place = function(body, spin, susp) {
    const steer = inst.inp[0];
    const t = inst._t2;
    if (typeof objPrev === 'function' && typeof objModel === 'function') {
      objPrev(inst.slotBody).set(objModel(inst.slotBody));
      objModel(inst.slotBody).set(body);
      for (let i = 0; i < 4; i++) {
        const sl = inst.slotWheel[i], h = inst.hubs[i], left = (i & 1) === 0;
        objPrev(sl).set(objModel(sl));
        const a = -(i < 2 ? steer : 0) + (left ? Math.PI : 0), c = Math.cos(a), sn = Math.sin(a);
        const g = left ? spin[i] : -spin[i], cg = Math.cos(g), sg = Math.sin(g);
        t[0] = c * cg; t[1] = sg; t[2] = -sn * cg; t[3] = 0;
        t[4] = -c * sg; t[5] = cg; t[6] = sn * sg; t[7] = 0;
        t[8] = sn; t[9] = 0; t[10] = c; t[11] = 0;
        t[12] = h[0]; t[13] = h[1] + susp[i]; t[14] = h[2]; t[15] = 1;
        m4mul(objModel(sl), body, t);
      }
    }
  };

  return inst;
}

function poseRival(CR, VR, gsR, kr, al) {
  if (!CR || !VR || !gsR) return;
  if (!CR.built && typeof CR.build === 'function') {
    CR.build();
    CR.built = true;
  }
  if (!CR.slotBody && CR.slotBody !== 0) return;
  const PR = (CR.physics && CR.physics.VP) || VP;
  const xr = VR.px + (VR.x - VR.px) * al, zr = VR.pz + (VR.z - VR.pz) * al, yr = VR.py + (VR.y - VR.py) * al;
  let dyr = VR.yaw - VR.pyaw; if (dyr > PI) dyr -= TAU; else if (dyr < -PI) dyr += TAU; const yawr = VR.pyaw + dyr * al;
  const gpr = VR.pgPitch + (VR.gPitch - VR.pgPitch) * al, grr = VR.pgRoll + (VR.gRoll - VR.pgRoll) * al, rollr = VR.proll + (VR.roll - VR.proll) * al, pitchr = VR.ppitch + (VR.pitch - VR.ppitch) * al, heaver = VR.pheave + (VR.heave - VR.pheave) * al;
  const cr = Math.cos(yawr), sr = Math.sin(yawr), oxr = -(PR.L / 2 - PR.a);
  gsR.cx = xr + cr * oxr; gsR.cz = zr + sr * oxr; gsR.cy = yr; gsR.yaw = yawr; gsR.steer = VR.psteer + (VR.steer - VR.psteer) * al; gsR.speed = Math.sqrt(VR.vx * VR.vx + VR.vy * VR.vy);
  const BR = gsR.body, TR = gsR.tmp, GR0 = gsR.ground;
  GR0[0] = cr; GR0[1] = 0; GR0[2] = sr; GR0[3] = 0; GR0[4] = 0; GR0[5] = 1; GR0[6] = 0; GR0[7] = 0; GR0[8] = -sr; GR0[9] = 0; GR0[10] = cr; GR0[11] = 0; GR0[12] = gsR.cx; GR0[13] = gsR.cy; GR0[14] = gsR.cz; GR0[15] = 1;
  ROTQ[0] = gpr; rotZQ(TR); m4mul(GR0, GR0, TR); ROTQ[0] = -grr; rotXQ(TR); m4mul(GR0, GR0, TR);
  BR[0] = GR0[0]; BR[1] = GR0[1]; BR[2] = GR0[2]; BR[3] = 0; BR[4] = GR0[4]; BR[5] = GR0[5]; BR[6] = GR0[6]; BR[7] = 0; BR[8] = GR0[8]; BR[9] = GR0[9]; BR[10] = GR0[10]; BR[11] = 0; BR[12] = GR0[12]; BR[13] = GR0[13]; BR[14] = GR0[14]; BR[15] = 1;
  m4ident(TR); TR[13] = 0.18 + heaver; m4mul(BR, GR0, TR);
  ROTQ[0] = -pitchr; rotZQ(TR); m4mul(BR, BR, TR); ROTQ[0] = -rollr; rotXQ(TR); m4mul(BR, BR, TR);
  m4ident(TR); TR[13] = -0.18; m4mul(BR, BR, TR);
  if (CR.hubs) {
    const wheelR = CR.wheelR || PR.R;
    for (let i = 0; i < 4; i++) {
      const h = CR.hubs[i], hy = BR[1] * h[0] + BR[5] * h[1] + BR[9] * h[2] + BR[13];
      let su = VR.wy[i] + wheelR - hy; su = su < -0.09 ? -0.09 : su > 0.09 ? 0.09 : su;
      gsR.susp[i] = su; gsR.spin[i] = VR.pspin[i] + (VR.spin[i] - VR.pspin[i]) * al;
    }
  }
  if (!CR.inp) CR.inp = new Float64Array(2);
  CR.inp[0] = gsR.steer; CR.inp[1] = gsR.steer * 14;
  if (typeof CR.place === 'function') {
    CR.place(BR, gsR.spin, gsR.susp);
  }
  if (CR.slotBody !== undefined && typeof objParams === 'function') {
    const bpR = objParams(CR.slotBody);
    if (bpR) {
      bpR[0] = ((kr & K_S) && VR.gear !== 0) || ((kr & K_W) && VR.gear === 0) ? 1 : 0; bpR[1] = VR.gear === 0 ? 1 : 0; bpR[2] = 1;
    }
  }
  if (CR.slotWheel && typeof objParams === 'function') {
    for (let i = 0; i < 4; i++) {
      const w = VR.omega[i];
      const wp = objParams(CR.slotWheel[i]);
      if (wp) wp[0] = w < 0 ? -w : w;
    }
  }
}

function gameInit() {
  addEventListener('keydown', onKeyDown); addEventListener('keyup', onKeyUp); addEventListener('blur', onBlur);
  if (REPLAY_B64) {
    const bin = atob(REPLAY_B64); let n = 0; for (let i = 1; i < bin.length; i += 2) n += bin.charCodeAt(i);
    GS.replay = new Uint8Array(n); let o = 0; for (let i = 0; i < bin.length; i += 2) { const k = bin.charCodeAt(i), c = bin.charCodeAt(i + 1); for (let q = 0; q < c; q++) GS.replay[o++] = k; }
  }
  GS.replayOn = Q.has('replay') && !!GS.replay; GS.ai = Q.has('auto');
  // Cámaras de TV: torres fijas y exteriores de curvas
  if (typeof WORLD !== 'undefined' && WORLD.tvCams && WORLD.tvCams.length) {
    const q = new Float64Array(5);
    for (const c of WORLD.tvCams) {
      const o = GS.tvN++ * 4; GS.tvData[o] = ((c.s % TRK.L) + TRK.L) % TRK.L; GS.tvData[o + 1] = c.x; GS.tvData[o + 2] = c.y; GS.tvData[o + 3] = c.z;
      // Recta de meta: cámara junto al muro de boxes
      // orientada hacia el semáforo
      if (GS.tvN === 1) { trackPos(TRK.L - 95, 5.9, q); GS.tvData[o] = TRK.L - 95; GS.tvData[o + 1] = q[0]; GS.tvData[o + 2] = q[1] + 3.4; GS.tvData[o + 3] = q[2]; }
    }
  } else {
    const st = [[70, -1, 5.5], [262, -1, 4.5], [330, 1, 4], [430, -1, 4.2], [545, -1, 4.5], [640, 1, 4.5], [745, -1, 4], [860, 1, 4.5], [985, -1, 4.2], [1090, -1, 5], [1200, 1, 4], [1300, -1, 4.2], [1390, -1, 4], [1470, -1, 4.5], [1548, -1, 5.5]];
    const p = new Float64Array(5);
    for (const [s, side, h] of st) {
      const i = Math.round(s / TRK.ds) % TRK.N, bar = side < 0 ? TRK.barL[i] : TRK.barR[i]; trackPos(s, side * (bar + 2.2), p);
      const o = GS.tvN++ * 4; GS.tvData[o] = s; GS.tvData[o + 1] = p[0]; GS.tvData[o + 2] = Math.max(hfAt(p[0], p[2]), p[1]) + h; GS.tvData[o + 3] = p[2];
    }
  }
  // Colisiones con guardarraíles
  if (typeof PROPS !== 'undefined' && PROPS.railD) for (let i = 0; i < TRK.N; i++) { const l = PROPS.railD(-1, i), r = PROPS.railD(1, i); if (l === l) TRK.barL[i] = Math.abs(l); if (r === r) TRK.barR[i] = Math.abs(r); }
  sndInit();
  gameWarmup();
  gameRestart();
}
// Calentamiento JIT de la simulación para estabilizar optimizaciones en V8
function gameWarmup() {
  const fx = GS.fxOn, rp = GS.replayOn; GS.replayOn = false; GS.ai = false; RT[2] = 1 / 120;
  vehicleReset(TRK.L + TRK.startS, TRK.startD, 0);
  for (let i = 0; i < 9000; i++) {
    const ph = (i / 300) | 0, t = i / 120; let k = aiKeys(t);
    if (ph % 7 === 3) k = K_S; else if (ph % 7 === 5) k = K_W | K_D | (i % 60 < 30 ? K_SPACE : 0); else if (ph % 11 === 9) k = K_W | K_A;
    if (i % 1500 === 1499) k |= K_R; if (i % 400 === 399) k |= K_C;
    // Maniobras de prueba con entradas analógicas y digitales
    if (ph & 1) { const f = 0.3 + (i % 71) / 100; GS.padKeys = K_PAD | K_PADS | (ph % 4 === 1 ? K_V : 0) | (k & (K_W | K_S | K_SPACE | K_C | K_R)); PADV[0] = (k & K_W) ? f : 0; PADV[1] = (k & K_S) ? f : 0; PADV[2] = (((k & K_D) ? 1 : 0) - ((k & K_A) ? 1 : 0)) * f; k = i % 9 === 0 ? k & (K_A | K_D) : 0; } else GS.padKeys = 0;
    GS.held = k; GS.acc = PHYS_DT * (1 + (i % 3 === 0 ? 0.5 : 0)); gameTick(i % 4 === 0); sndControl();
    for (let q = 0; q < 3; q++) cascadeSetup(q);   // Cascadas de sombra calculadas para las cámaras
  }
  // Calentamiento de ramas en alineación de texels
  {
    const cs = R.casc, m = cs.view; lightView(m);
    const rx = m[0], ry = m[4], rz = m[8], ux = m[1], uy = m[5], uz = m[9], t0 = -m[12], s0 = -m[13];
    for (let k = 0; k < 3000; k++) {
      const sc = k < 1500 ? 0.004 : 0.9, t = t0 + (k % 1000 - 500) * sc, u = s0 + (k * 7 % 1000 - 500) * sc, x = rx * t + ux * u, y = ry * t + uy * u, z = rz * t + uz * u;
      cs.focusOn = true; cs.focus[0] = x; cs.focus[1] = y; cs.focus[2] = z; cascadeSetup(k % 3);
      cs.focusOn = false; setCamera(x, y, z, x + ux, y + uy, z + uz, 0.9); cascadeSetup(k % 3);
    }
  }
  GS.held = 0; GS.padKeys = 0; LAP[2] = 0; GS.fxOn = fx; GS.replayOn = rp; GS.ai = Q.has('auto'); RT[0] = 0; RT[2] = 1 / 60;
}
// Precalentamiento de GPU: compila variantes de pipeline y precarga texturas
async function gamePrewarm() {
  RT[2] = 1 / 60; GS.frozen = true; let worst = 0;
  for (let i = 0; i < 36; i++) {
    vehicleReset(i * TRK.L / 36, (i % 3) - 1, 0); VEH.slip.fill(1); VEH.vx = 25; for (let k = 0; k < 6; k++) fxStep(); VEH.slip.fill(0); VEH.vx = 0;   // Emisión de humo y partículas para compilar pipeline
    GS.cam = i % 3; GS.chaseInit = false; GS.tvCur = -1; GS.cut = true; gameTick(true); renderFrame(); gameTick(true); renderFrame();
    if (i >= 6) {   // Exclusión de los primeros frames de la media
      await G.dev.queue.onSubmittedWorkDone(); const t0 = performance.now();
      for (let k = 0; k < 4; k++) { gameTick(true); renderFrame(); }
      await G.dev.queue.onSubmittedWorkDone(); const ms = (performance.now() - t0) / 4; if (ms > worst) worst = ms;
    }
  }
  GS.frozen = false; gameRestart(); return worst;
}
function gameRestart() {
  const V = VEH; V.lapS = 0; V.offCount = 0; V.hits = 0; V.laps = 0; V.time = 0; V.steps = 0; V.spin.fill(0); V.susp.fill(0);
  vehicleReset(TRK.L + TRK.startS, TRK.startD, 0, VEH, VIN);
  if (GAME.rivalEnabled !== false && typeof VEH_RIVAL !== 'undefined') {
    const rivalCount = Math.max(1, Math.min(15, GAME.rivalCount || (typeof window !== 'undefined' && window.__rivalCount) || 1));
    const activeId = (CARS.active && CARS.active.id) || (CAR && CAR.id);
    const availableModels = (CARS.list && CARS.list.length > 0)
      ? CARS.list.filter(c => c && c.id !== activeId && typeof c.build === 'function')
      : [];
    const pool = availableModels.length > 0 ? availableModels : (CARS.list && CARS.list.length > 0 ? CARS.list : [rivalObj()]);

    const primaryModel = rivalObj();
    const sortedPool = [];
    if (primaryModel) sortedPool.push(primaryModel);
    for (const m of pool) {
      if (m && (!primaryModel || m.id !== primaryModel.id)) sortedPool.push(m);
    }
    const finalPool = sortedPool.length > 0 ? sortedPool : [primaryModel || CAR];

    const modelUsage = {};
    const rivals = [];
    const colors = ['#facc15', '#38bdf8', '#ef4444', '#a855f7', '#4ade80', '#fb923c', '#e879f9', '#2dd4bf'];

    for (let k = 0; k < rivalCount; k++) {
      const baseModel = finalPool[k % finalPool.length];
      const modelId = baseModel ? baseModel.id : 'rival';
      const useCount = modelUsage[modelId] || 0;
      modelUsage[modelId] = useCount + 1;
      const rModel = cloneCarModelForGrid(baseModel, useCount);

      const veh = (k === 0 && typeof VEH_RIVAL !== 'undefined') ? VEH_RIVAL
                : (k === 1 && typeof VEH_RIVAL2 !== 'undefined') ? VEH_RIVAL2
                : (k === 2 && typeof VEH_RIVAL3 !== 'undefined') ? VEH_RIVAL3
                : (typeof createVehicleState === 'function' ? createVehicleState() : {});
      const vin = (k === 0 && typeof VIN_RIVAL !== 'undefined') ? VIN_RIVAL
                : (k === 1 && typeof VIN_RIVAL2 !== 'undefined') ? VIN_RIVAL2
                : (k === 2 && typeof VIN_RIVAL3 !== 'undefined') ? VIN_RIVAL3
                : new Float64Array(3);
      const gs = (k === 0 && typeof GS_RIVAL !== 'undefined') ? GS_RIVAL
               : (k === 1 && typeof GS_RIVAL2 !== 'undefined') ? GS_RIVAL2
               : (k === 2 && typeof GS_RIVAL3 !== 'undefined') ? GS_RIVAL3
               : createGsRival();

      const rDriverName = `Rival #${k + 1}`;
      const rCarName = (rModel && (rModel.name || rModel.id)) ? (rModel.name || rModel.id) : `RIVAL #${k + 1}`;
      const rCol = (rModel && rModel.accent) ? rModel.accent : colors[k % colors.length];

      const ds = -(k + 1) * 8.0;
      const dd = ((k % 2 === 0) ? 1 : -1) * Math.min(3.2, (TRK.hw || 6) * 0.45);

      rivals.push({
        veh, vin, ds, dd, model: rModel, gs,
        name: rDriverName, driverName: rDriverName, carName: rCarName, col: rCol,
        lapStart: 0, lapSeen: 0, lastLapTime: -1, bestLapTime: -1
      });
    }

    if (typeof gridManagerInstance !== 'undefined') {
      gridManagerInstance.init(rivals);
      gridManagerInstance.resetGrid(TRK, TRK.startS, TRK.startD);
    } else {
      for (const r of rivals) {
        if (!r.veh || !r.vin) continue;
        const VR = r.veh; VR.lapS = 0; VR.offCount = 0; VR.hits = 0; VR.laps = 0; VR.time = 0; VR.steps = 0; VR.spin.fill(0); VR.susp.fill(0);
        vehicleReset(TRK.L + TRK.startS + r.ds, TRK.startD + r.dd, 0, r.veh, r.vin);
      }
    }
  } else {
    if (typeof gridManagerInstance !== 'undefined') {
      gridManagerInstance.init([]);
    }
  }
  GS.held = 0; GS.tick60 = 0; GS.acc = 0; GS.sub = 0; GS.keys = GS.prevKeys = GS.rivalKeys = GS.rivalKeys2 = GS.rivalKeys3 = 0; GS.cam = +(Q.get('cam') || 0); GS.chaseInit = false; GS.tvCur = -1; GS.cut = true;
  if (typeof fxReset === 'function') fxReset();
  GS.lapSeen = GS.lapMax = 0; LAP[0] = LAP[1] = LAP[3] = 0;
  raceStartTrigger();
  GS.alpha = 1; gamePose(); gameCamera();
}
// Paso de física a 120 Hz; lectura de entradas a 60 Hz
function gameStep() {
  const t = GS.tick60 / 60;
  if ((GS.sub & 1) === 0) {
    let k;
    if (GS.replayOn && GS.tick60 < GS.replay.length) k = GS.replay[GS.tick60];
    else if (GS.ai) k = t < 0.5 ? 0 : aiKeys(t, VEH);
    else { k = GS.held; if (GS.padKeys) k = padMerge(k); }
    GS.prevKeys = GS.keys; GS.keys = k; GS.tick60++;
    const edge = k & ~GS.prevKeys;
    if ((k ^ GS.prevKeys) & K_V) { GS.cut = true; GS.chaseInit = false; }   // Mirar hacia atrás ejecuta corte instantáneo de cámara
    if (edge & K_C) { GS.cam = (GS.cam + 1) % 3; GS.cut = true; GS.chaseInit = false; GS.tvCur = -1; }
    if (edge & K_R) { // Restablece el coche al centro de la pista
      const s = VEH.s; vehicleReset(s, clamp(VEH.d, -2, 2), 0, VEH, VIN); GS.cut = true; GS.chaseInit = false;
    }
    // Entradas IA del rival o sincronización multijugador P2P (muestreadas a 60 Hz)
    if (GAME.rivalEnabled !== false && typeof VEH_RIVAL !== 'undefined') {
      if (typeof NET !== 'undefined' && NET.connected) {
        NET.sendLocalState(VEH);
      } else {
        if (typeof gridManagerInstance !== 'undefined' && gridManagerInstance.rivals && gridManagerInstance.rivals.length) {
          gridManagerInstance.stepAi(t, RACE_START.active);
          GS.rivalKeys = gridManagerInstance.rivals[0] ? gridManagerInstance.rivals[0].keys : 0;
        } else {
          GS.rivalKeys = (t < 0.5 || RACE_START.active) ? 0 : aiKeys(t, VEH_RIVAL);
        }
      }
    }
  }
  GS.sub++;

  // Control de salida en parrilla con semáforo FIA (delegado en RaceDirector si está disponible)
  if (typeof raceDirectorInstance !== 'undefined') {
    const raceVehs = [VEH];
    if (GAME.rivalEnabled !== false && typeof VEH_RIVAL !== 'undefined') {
      raceVehs.push(VEH_RIVAL);
    }
    raceDirectorInstance.step(1 / 120, raceVehs);
  } else if (RACE_START.active) {
    const raceVehs = [VEH];
    if (GAME.rivalEnabled !== false && typeof VEH_RIVAL !== 'undefined') {
      raceVehs.push(VEH_RIVAL);
    }
    RACE_START.step(1 / 120, raceVehs);
  }

  vehicleStep(GS.keys, VEH, VIN);
  if (GAME.rivalEnabled !== false && typeof VEH_RIVAL !== 'undefined') {
    if (typeof gridManagerInstance !== 'undefined' && gridManagerInstance.rivals && gridManagerInstance.rivals.length) {
      gridManagerInstance.stepPhysics(VEH, (typeof NET !== 'undefined' && NET.connected));
    } else {
      if (typeof NET !== 'undefined' && NET.connected) {
        NET.updateRemoteVehicle(VEH_RIVAL, PHYS_DT);
      } else {
        vehicleStep(GS.rivalKeys, VEH_RIVAL, VIN_RIVAL);
      }
      vehicleCarCollide(VEH, VEH_RIVAL);
    }
  }
  if (VEH.laps !== GS.lapSeen) lapCross();
  if (GS.fxOn && typeof fxStep === 'function') fxStep();
}
// Fusión de entradas de gamepad y teclado
function padMerge(k) {
  let pk = GS.padKeys;
  if (k & (K_A | K_D)) pk &= ~K_PADS;
  if (k & (K_W | K_S)) pk &= ~K_PAD;
  if (pk & K_PAD) { VIN[0] = PADV[0]; VIN[1] = PADV[1]; }
  if (pk & K_PADS) VIN[2] = PADV[2];
  return k | pk;
}
// Paso por línea de meta: cruce en sentido correcto con interpolación de tiempo exacto
function lapCross() {
  const V = VEH;
  if (V.laps > GS.lapMax) {
    const st = V.vx * PHYS_DT, fr = st > 1e-6 ? V.s / st : 0, t = V.time - (fr < 0 ? 0 : fr > 1 ? 1 : fr) * PHYS_DT;
    if (LAP[3] === 1) { const lt = t - LAP[0]; LAP[1] = lt; if (!GS.replayOn && (LAP[2] === 0 || lt < LAP[2])) { LAP[2] = lt; GS.lapNew = true; } }
    LAP[0] = t; LAP[3] = 1; GS.lapMax = V.laps;
    if (typeof Patterns !== 'undefined' && Patterns.EventBusSingleton) {
      Patterns.EventBusSingleton.emit('lap:completed', { laps: V.laps, lapTime: LAP[1], bestLap: LAP[2] });
    }
    const totalLaps = (typeof GAME !== 'undefined' && GAME.totalLaps) ? GAME.totalLaps : null;
    if (totalLaps && V.laps >= totalLaps) {
      const rs = (typeof raceDirectorInstance !== 'undefined') ? raceDirectorInstance : (typeof RACE_START !== 'undefined' ? RACE_START : null);
      if (rs) rs.state = 'finished';
      if (typeof Patterns !== 'undefined' && Patterns.EventBusSingleton) {
        Patterns.EventBusSingleton.emit('race:finished', { totalLaps, time: V.time, bestLap: LAP[2] });
      }
    }
  }
  GS.lapSeen = V.laps;
}
// Avanza la simulación dt segundos y prepara la interpolación de render.
// Cero boxing en llamadas de funciones críticas.
function gameTick(fixed) {
  const dt = RT[2];
  if (!GS.frozen) {
    if (fixed) { const n = (dt * 120 + 0.5) | 0; for (let i = 0; i < n; i++) gameStep(); GS.alpha = 1; }
    else { GS.acc += dt; let n = 0; while (GS.acc >= PHYS_DT && n < 8) { gameStep(); GS.acc -= PHYS_DT; n++; } if (n === 8) GS.acc = 0; GS.alpha = GS.acc / PHYS_DT; }
  }
  RT[1] = dt; RT[0] += dt;
  gamePose();
  if (!GS.freeCam) gameCamera();
  if (GS.cut) { R.cam.first = true; R.debug = 1; GS.cut = false; } else R.debug = 0;
  if (GS.fxOn && typeof fxFrame === 'function') fxFrame();
  if (SND.rec) sndRecTick();
}
// Pose interpolada del coche → matrices de objetos
function gamePose() {
  const V = VEH, C = carObj(), P = VP, al = GS.alpha;
  const x = V.px + (V.x - V.px) * al, z = V.pz + (V.z - V.pz) * al, y = V.py + (V.y - V.py) * al;
  let dy = V.yaw - V.pyaw; if (dy > PI) dy -= TAU; else if (dy < -PI) dy += TAU; const yaw = V.pyaw + dy * al;
  const gp = V.pgPitch + (V.gPitch - V.pgPitch) * al, gr = V.pgRoll + (V.gRoll - V.pgRoll) * al, roll = V.proll + (V.roll - V.proll) * al, pitch = V.ppitch + (V.pitch - V.ppitch) * al, heave = V.pheave + (V.heave - V.pheave) * al;
  const c = Math.cos(yaw), s = Math.sin(yaw), ox = -(P.L / 2 - P.a);   // Origen de coordenadas en centro de batalla sobre el suelo
  GS.cx = x + c * ox; GS.cz = z + s * ox; GS.cy = y; GS.yaw = yaw; GS.steer = V.psteer + (V.steer - V.psteer) * al; GS.speed = Math.sqrt(V.vx * V.vx + V.vy * V.vy);
  const B = GS.body, T = GS.tmp, G0 = GS.ground;
  // Orientación respecto al peralte de la pista
  G0[0] = c; G0[1] = 0; G0[2] = s; G0[3] = 0; G0[4] = 0; G0[5] = 1; G0[6] = 0; G0[7] = 0; G0[8] = -s; G0[9] = 0; G0[10] = c; G0[11] = 0; G0[12] = GS.cx; G0[13] = GS.cy; G0[14] = GS.cz; G0[15] = 1;
  ROTQ[0] = gp; rotZQ(T); m4mul(G0, G0, T); ROTQ[0] = -gr; rotXQ(T); m4mul(G0, G0, T);
  // Carrocería: cabeceo y balanceo sobre la suspensión alrededor de un centro bajo
  m4ident(T); T[13] = 0.18 + heave; m4mul(B, G0, T);
  ROTQ[0] = -pitch; rotZQ(T); m4mul(B, B, T); ROTQ[0] = -roll; rotXQ(T); m4mul(B, B, T);
  m4ident(T); T[13] = -0.18; m4mul(B, B, T);
  // Recorrido de suspensión para mantener cada rueda sobre el suelo
  for (let i = 0; i < 4; i++) {
    const h = C.hubs[i], hy = B[1] * h[0] + B[5] * h[1] + B[9] * h[2] + B[13];
    let su = V.wy[i] + C.wheelR - hy; su = su < -0.09 ? -0.09 : su > 0.09 ? 0.09 : su;
    GS.susp[i] = su; GS.spin[i] = V.pspin[i] + (V.spin[i] - V.pspin[i]) * al;
  }
  C.inp[0] = GS.steer; C.inp[1] = GS.steer * 14; C.place(B, GS.spin, GS.susp);
  const bp = objParams(C.slotBody), k = GS.keys; bp[0] = ((k & K_S) && V.gear !== 0) || ((k & K_W) && V.gear === 0) ? 1 : 0; bp[1] = V.gear === 0 ? 1 : 0; bp[2] = 1;
  for (let i = 0; i < 4; i++) { const w = V.omega[i]; objParams(C.slotWheel[i])[0] = w < 0 ? -w : w; }
  if (typeof R !== 'undefined') {
    R.playerSlotBody = C.slotBody;
    R.playerSlotWheels = C.slotWheel;
  }

  // Pose e interpolación del rival IA utilizando exclusivamente el modelo real
  if (GAME.rivalEnabled !== false) {
    if (typeof gridManagerInstance !== 'undefined' && gridManagerInstance.rivals && gridManagerInstance.rivals.length) {
      gridManagerInstance.poseAll(al);
    } else {
      const rM = rivalObj();
      if (typeof VEH_RIVAL !== 'undefined' && rM) poseRival(rM, VEH_RIVAL, GS_RIVAL, GS.rivalKeys, al);
    }
  }

  FR.data.set(B, FO.carMat); m4inv(T, B); FR.data.set(T, FO.carInv);
  // Ruedas: transformaciones anteriores para motion blur coherente sin dispersión angular
  if (C.slotWheel[0] !== C.slotBody) { const D2 = GS.tmp2; m4mul(D2, objPrev(C.slotBody), T); for (let i = 0; i < 4; i++) m4mul(objPrev(C.slotWheel[i]), D2, objModel(C.slotWheel[i])); }
  const f = FR.data, o = FO.car; f[o] = bp[0]; f[o + 1] = GS.speed; f[o + 2] = GS.steer; f[o + 3] = 0;
  const rs = (typeof raceDirectorInstance !== 'undefined') ? raceDirectorInstance : (typeof RACE_START !== 'undefined' ? RACE_START : null);
  const o2 = FO.car2;
  if (rs && rs.active && rs.state === 'countdown') {
    f[o2] = rs.lightsCount;
    f[o2 + 1] = 1.0;
  } else {
    f[o2] = 0.0;
    f[o2 + 1] = 0.0;
  }
  f[o2 + 2] = 0.0; f[o2 + 3] = 0.0;
  R.cube.pos[0] = B[4] * 1.15 + B[12]; R.cube.pos[1] = B[5] * 1.15 + B[13]; R.cube.pos[2] = B[6] * 1.15 + B[14];
  const m = R.mirror;
  if (m) {
    m.eye[0] = B[0] * -1.8 + B[4] * 1.35 + B[12];
    m.eye[1] = B[1] * -1.8 + B[5] * 1.35 + B[13];
    m.eye[2] = B[2] * -1.8 + B[6] * 1.35 + B[14];
    m.target[0] = B[0] * -20.0 + B[4] * 1.25 + B[12];
    m.target[1] = B[1] * -20.0 + B[5] * 1.25 + B[13];
    m.target[2] = B[2] * -20.0 + B[6] * 1.25 + B[14];
    m.up[0] = B[4]; m.up[1] = B[5]; m.up[2] = B[6];
  }
}
// Rotaciones leyendo ángulo del registro ROTQ[0]
const ROTQ = new Float64Array(1);
function rotZQ(o) { const a = ROTQ[0], c = Math.cos(a), s = Math.sin(a); o.fill(0); o[0] = c; o[1] = s; o[4] = -s; o[5] = c; o[10] = 1; o[15] = 1; }
function rotXQ(o) { const a = ROTQ[0], c = Math.cos(a), s = Math.sin(a); o.fill(0); o[0] = 1; o[5] = c; o[6] = s; o[9] = -s; o[10] = c; o[15] = 1; }
function camCut() { GS.cut = true; }
function gameCamera() {
  if (typeof cameraSystemInstance !== 'undefined' && typeof cameraSystemInstance.updateCamera === 'function') {
    cameraSystemInstance.updateCamera(GS, VEH, RT[1], CAMQ, (GS.keys & K_V) ? -1 : 1);
    return;
  }
  const V = VEH, c = Math.cos(GS.yaw), s = Math.sin(GS.yaw), dt = RT[1], q = CAMQ, lb = (GS.keys & K_V) ? -1 : 1;   // lb = -1: mirando hacia atrás
  if (GS.cam === 0) {
    // Cámara de persecución (Chase): sigue la orientación con inercia elástica
    let tgt = GS.yaw; if (GS.speed > 4) { let sa = Math.atan2(V.vy, V.vx > 1 ? V.vx : 1); sa = sa < -0.5 ? -0.5 : sa > 0.5 ? 0.5 : sa; tgt = GS.yaw + sa * 0.55; }
    if (!GS.chaseInit) { GS.chaseYaw = tgt; GS.chaseY = GS.cy; GS.chaseInit = true; }
    let dy = tgt - GS.chaseYaw; while (dy > PI) dy -= TAU; while (dy < -PI) dy += TAU;
    GS.chaseYaw += dy * (1 - Math.exp(-dt * 5.5)); GS.chaseY += (GS.cy - GS.chaseY) * (1 - Math.exp(-dt * 7));
    const dist = 5.3 + GS.speed * 0.022, cc = Math.cos(GS.chaseYaw), ss = Math.sin(GS.chaseYaw);
    const ex = GS.cx + c * 0.2 * lb - cc * dist * lb, ez = GS.cz + s * 0.2 * lb - ss * dist * lb; let ey = GS.chaseY + 1.62 - V.gPitch * dist * 0.6;
    _gq[0] = ex; _gq[1] = ez; hfAtQ(_gq); if (ey < _gq[6] + 0.55) ey = _gq[6] + 0.55;
    let rl = -V.ay * 0.004; rl = rl < -0.05 ? -0.05 : rl > 0.05 ? 0.05 : rl;
    q[0] = ex; q[1] = ey; q[2] = ez; q[3] = GS.cx + c * 1.6 * lb; q[4] = GS.cy + 0.95 + V.gPitch * 1.6; q[5] = GS.cz + s * 1.6 * lb; q[6] = 0.93 + (GS.speed < 50 ? GS.speed : 50) * 0.0042; q[7] = rl;
  } else if (GS.cam === 1) {
    // Cámara de capó (Bonnet): anclada rígidamente a la carrocería
    const B = GS.body;
    q[0] = B[0] * 0.5 + B[4] * 1.15 + B[12]; q[1] = B[1] * 0.5 + B[5] * 1.15 + B[13]; q[2] = B[2] * 0.5 + B[6] * 1.15 + B[14];
    q[3] = B[0] * 6.5 + B[4] * 0.52 + B[12]; q[4] = B[1] * 6.5 + B[5] * 0.52 + B[13]; q[5] = B[2] * 6.5 + B[6] * 0.52 + B[14];
    q[6] = 1.0; q[7] = -(V.gRoll + V.roll) * 0.8;
    if (lb < 0) {   // Vista hacia atrás: desde el portón trasero
      q[0] = B[0] * -2.0 + B[4] * 1.05 + B[12]; q[1] = B[1] * -2.0 + B[5] * 1.05 + B[13]; q[2] = B[2] * -2.0 + B[6] * 1.05 + B[14];
      q[3] = B[0] * -9 + B[4] * 0.6 + B[12]; q[4] = B[1] * -9 + B[5] * 0.6 + B[13]; q[5] = B[2] * -9 + B[6] * 0.6 + B[14]; q[7] = -q[7];
    }
  } else {
    // Cámara de TV: cámaras fijas en borde de pista con teleobjetivo y seguimiento dinámico
    let best = GS.tvCur, bd = 1e9; const n = GS.tvN, TV = GS.tvData;
    // Selecciona la cámara más conveniente siguiendo el avance del coche
    for (let i = 0; i < n; i++) { let d = TV[i * 4] - V.s; const hl = TRK.L * 0.5; while (d > hl) d -= TRK.L; while (d < -hl) d += TRK.L; d = (d < 0 ? -d * 0.7 : d) - (i === GS.tvCur ? 14 : 0); if (d < bd) { bd = d; best = i; } }
    const cut = best !== GS.tvCur; GS.tvCur = best; const tx = TV[best * 4 + 1], ty = TV[best * 4 + 2], tz = TV[best * 4 + 3];
    const ld = 0.8 + GS.speed * 0.1, ax = GS.cx + c * ld, ay = GS.cy + 0.75, az = GS.cz + s * ld, dist = Math.sqrt((ax - tx) * (ax - tx) + (ay - ty) * (ay - ty) + (az - tz) * (az - tz));
    let fov = 2 * Math.atan(3.3 / dist); fov = fov < 0.04 ? 0.04 : fov > 0.62 ? 0.62 : fov;
    if (cut) { GS.tvAim[0] = ax; GS.tvAim[1] = ay; GS.tvAim[2] = az; GS.tvFov = fov; GS.cut = true; }
    const k = 1 - Math.exp(-dt * 16); GS.tvAim[0] += (ax - GS.tvAim[0]) * k; GS.tvAim[1] += (ay - GS.tvAim[1]) * k; GS.tvAim[2] += (az - GS.tvAim[2]) * k; GS.tvFov += (fov - GS.tvFov) * (1 - Math.exp(-dt * 3));
    q[0] = tx; q[1] = ty; q[2] = tz; q[3] = GS.tvAim[0]; q[4] = GS.tvAim[1]; q[5] = GS.tvAim[2]; q[6] = GS.tvFov; q[7] = 0;
  }
  // Sombras: con teleobjetivo de TV, las cascadas siguen al coche
  R.casc.focusOn = GS.cam === 2; if (R.casc.focusOn) { R.casc.focus[0] = GS.cx; R.casc.focus[1] = GS.cy + 0.6; R.casc.focus[2] = GS.cz; }
  setCameraQ();
}
BUILD.push(async () => {
  if (GAME.mode === 'test' || GAME.mode === 'car') return;
  if (!CAR && typeof CARS !== 'undefined') CAR = CARS.active || CARS.list[0];
  if (GAME.rivalEnabled !== false) {
    if (typeof gridManagerInstance !== 'undefined' && gridManagerInstance.rivals && gridManagerInstance.rivals.length) {
      await gridManagerInstance.buildAll();
    } else {
      const rM = rivalObj();
      if (rM && typeof rM.build === 'function' && !rM.built) {
        await rM.build();
        rM.built = true;
      }
    }
  }
  GAME.init = gameInit; GAME.tick = gameTick; GAME.prewarm = gamePrewarm;
});

// ---- 48_poses.js
// Poses fijas para verificación visual (definidas en el circuito activo vía TRACKS.active.poses).
function poseApply(i) {
  const P = POSES[i];
  if (!P) return;
  GS.fxOn = true;
  if (P.tipo === 'carro' || P.tipo === 'coche') {
    gameRestart(); vehicleReset(P.s, P.d, P.yaw); GS.frozen = true; GS.freeCam = true; GS.alpha = 1; gamePose();
    const B = GS.body, o = P.ojo || P.olho, a = P.blanco || P.alvo, q = CAMQ;
    q[0] = B[0] * o[0] + B[4] * o[1] + B[8] * o[2] + B[12]; q[1] = B[1] * o[0] + B[5] * o[1] + B[9] * o[2] + B[13]; q[2] = B[2] * o[0] + B[6] * o[1] + B[10] * o[2] + B[14];
    q[3] = B[0] * a[0] + B[4] * a[1] + B[8] * a[2] + B[12]; q[4] = B[1] * a[0] + B[5] * a[1] + B[9] * a[2] + B[13]; q[5] = B[2] * a[0] + B[6] * a[1] + B[10] * a[2] + B[14];
    q[6] = P.fov; q[7] = 0; setCameraQ(); GS.cut = true; R.casc.focusOn = false;
    RT[2] = 1 / 60; for (let k = 0; k < 60; k++) { gameTick(true); renderFrame(); }
  } else {
    GS.frozen = false; GS.freeCam = false; const was = GS.replayOn; GS.replayOn = true; gameRestart(); GS.cam = P.cam; GS.cut = true;
    const n = Math.round(P.t * 60), warm = 45; RT[2] = 1 / 60;
    for (let k = 0; k < n; k++) { const camKeep = GS.cam; gameTick(true); GS.cam = P.cam; if (k >= n - warm) renderFrame(); }
    GS.replayOn = was;
  }
}
