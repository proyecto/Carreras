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
  const savedCam = (typeof loadSelection === 'function') ? (loadSelection().cam || 0) : 0;
  GS.held = 0; GS.tick60 = 0; GS.acc = 0; GS.sub = 0; GS.keys = GS.prevKeys = GS.rivalKeys = GS.rivalKeys2 = GS.rivalKeys3 = 0; GS.cam = Q.get('cam') !== null ? +Q.get('cam') : savedCam; GS.chaseInit = false; GS.tvCur = -1; GS.cut = true;
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
    if (edge & K_C) { GS.cam = (GS.cam + 1) % 4; GS.cut = true; GS.chaseInit = false; GS.tvCur = -1; }
    if (edge & K_GEAR_UP) { const maxG = (typeof P !== 'undefined' && P.gears) ? P.gears.length : 6; if (VEH.gear < maxG) VEH.gear++; }
    if (edge & K_GEAR_DN) { if (VEH.gear > 0) VEH.gear--; }
    if (edge & K_TC) { VEH.tcLevel = ((VEH.tcLevel !== undefined ? VEH.tcLevel : 3) + 1) % 6; }
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
