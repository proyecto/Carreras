'use strict';
// ---- 45_game.js
// Lógica de juego: entradas, simulación a paso fijo, cámaras y pose del coche.
const GS = {
  held: 0, keys: 0, prevKeys: 0, cam: 0, replay: null, replayOn: false, ai: false, tick60: 0, acc: 0, sub: 0, alpha: 1, cut: true,
  body: m4(), tmp: m4(), tmp2: m4(), ground: m4(), spin: new Float32Array(4), susp: new Float32Array(4),
  cx: 0, cy: 0, cz: 0, yaw: 0, steer: 0, speed: 0,                 // Estado interpolado para render
  chaseYaw: 0, chaseY: 0, chaseInit: false, hoodPos: new Float32Array(6),
  tvData: new Float32Array(64 * 4), tvN: 0, tvCur: -1, tvAim: new Float32Array(3), tvFov: 0.3, pl: new Float64Array(2),
  v3: new Float32Array(6), fxOn: true, frozen: false, freeCam: false,
  padKeys: 0, lapSeen: 0, lapMax: 0, lapNew: false,
};
// Cronómetro: LAP[0] tiempo inicio de vuelta actual, [1] última vuelta, [2] mejor vuelta, [3] estado
const LAP = new Float64Array(4);
// Entradas Gamepad API: acelerador, freno y dirección analógicos con zona muerta
const PADV = new Float64Array(3);
const KEYMAP = { KeyW: K_W, ArrowUp: K_W, KeyS: K_S, ArrowDown: K_S, KeyA: K_A, ArrowLeft: K_A, KeyD: K_D, ArrowRight: K_D, Space: K_SPACE, KeyC: K_C, KeyR: K_R, KeyV: K_V };
function onKeyDown(e) {
  if (GAME.ui && typeof UI !== 'undefined' && (UI.st === ST.INICIO || UI.st === ST.PAUSA || UI.st === ST.RESULT)) return;
  const k = KEYMAP[e.code]; if (k) { GS.held |= k; e.preventDefault(); }
}
function onKeyUp(e) { const k = KEYMAP[e.code]; if (k) { GS.held &= ~k; e.preventDefault(); } }
function onBlur() { GS.held = 0; }

// Vehículo provisional para pruebas
const CARP = {
  wheelR: VP.R, hubs: [[VP.L / 2, VP.R, -0.67], [VP.L / 2, VP.R, 0.67], [-VP.L / 2, VP.R, -0.65], [-VP.L / 2, VP.R, 0.65]], slotBody: 0, slotWheel: [0, 0, 0, 0], _t: m4(), _u: m4(),
  build() {
    const fam = R.families.test || mkFamily('test', { src: 'mat_test' }), set = new MeshSet(fam); R.drawables.push(set);
    this.slotBody = objSlot(); for (let i = 0; i < 4; i++) this.slotWheel[i] = objSlot();
    let mb = new MeshBuilder(); mb.mat(2).color(0.42, 0.6, 0.78); mb.rbox(0.1, 0.62, 0, 3.64, 0.62, 1.55, 0.12, 4); mb.rbox(-0.35, 1.15, 0, 2.1, 0.58, 1.4, 0.15, 4);
    mb.mat(1).color(0.8, 0.8, 0.82); mb.box(0, 1.56, 0, 3.2, 0.06, 0.42);
    set.add(mb.upload(), this.slotBody, 3);
    mb = new MeshBuilder(); mb.mat(0).color(0.03, 0.03, 0.03); mb.push(m4rotX(m4(), PI / 2)); mb.cyl(0, -0.08, 0, VP.R, 0.08, VP.R, 24, true, true); mb.pop();
    mb.mat(0).color(0.7, 0.7, 0.7); mb.box(0.12, 0, 0.085, 0.1, 0.3, 0.01);
    const wm = mb.upload(); for (let i = 0; i < 4; i++) set.add(wm, this.slotWheel[i], 3);
  },
  inp: new Float64Array(2),
  place(body, spin, susp) {
    const steer = this.inp[0];
    objPrev(this.slotBody).set(objModel(this.slotBody)); objModel(this.slotBody).set(body);
    for (let i = 0; i < 4; i++) {
      const h = this.hubs[i], m = objModel(this.slotWheel[i]); objPrev(this.slotWheel[i]).set(m);
      m4translate(this._t, h[0], h[1] + susp[i], h[2]); m4mul(this._t, body, this._t);
      if (i < 2) { m4rotY(this._u, -steer); m4mul(this._t, this._t, this._u); }
      m4rotZ(this._u, -spin[i]); m4mul(m, this._t, this._u);
    }
  },
};
const carObj = () => (CAR || CARP);

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
  vehicleReset(TRK.L + TRK.startS, TRK.startD, 0); GS.held = 0; GS.tick60 = 0; GS.acc = 0; GS.sub = 0; GS.keys = GS.prevKeys = 0; GS.cam = +(Q.get('cam') || 0); GS.chaseInit = false; GS.tvCur = -1; GS.cut = true;
  if (typeof fxReset === 'function') fxReset();
  GS.lapSeen = GS.lapMax = 0; LAP[0] = LAP[1] = LAP[3] = 0;
  GS.alpha = 1; gamePose(); gameCamera();
}
// Paso de física a 120 Hz; lectura de entradas a 60 Hz
function gameStep() {
  if ((GS.sub & 1) === 0) {
    const t = GS.tick60 / 60; let k;
    if (GS.replayOn && GS.tick60 < GS.replay.length) k = GS.replay[GS.tick60];
    else if (GS.ai) k = t < 0.5 ? 0 : aiKeys(t);
    else { k = GS.held; if (GS.padKeys) k = padMerge(k); }
    GS.prevKeys = GS.keys; GS.keys = k; GS.tick60++;
    const edge = k & ~GS.prevKeys;
    if ((k ^ GS.prevKeys) & K_V) { GS.cut = true; GS.chaseInit = false; }   // Mirar hacia atrás ejecuta corte instantáneo de cámara
    if (edge & K_C) { GS.cam = (GS.cam + 1) % 3; GS.cut = true; GS.chaseInit = false; GS.tvCur = -1; }
    if (edge & K_R) { // Restablece el coche al centro de la pista
      const s = VEH.s; vehicleReset(s, clamp(VEH.d, -2, 2), 0); GS.cut = true; GS.chaseInit = false;
    }
  }
  GS.sub++;
  vehicleStep(GS.keys);
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
  FR.data.set(B, FO.carMat); m4inv(T, B); FR.data.set(T, FO.carInv);
  // Ruedas: transformaciones anteriores para motion blur coherente sin dispersión angular
  if (C.slotWheel[0] !== C.slotBody) { const D2 = GS.tmp2; m4mul(D2, objPrev(C.slotBody), T); for (let i = 0; i < 4; i++) m4mul(objPrev(C.slotWheel[i]), D2, objModel(C.slotWheel[i])); }
  const f = FR.data, o = FO.car; f[o] = bp[0]; f[o + 1] = GS.speed; f[o + 2] = GS.steer; f[o + 3] = 0;
  f[FO.car2] = (GS.tick60 < 30 && GS.speed < 0.5) ? 1 : 0;   // Luces de salida en parrilla
  R.cube.pos[0] = B[4] * 1.15 + B[12]; R.cube.pos[1] = B[5] * 1.15 + B[13]; R.cube.pos[2] = B[6] * 1.15 + B[14];
}
// Rotaciones leyendo ángulo del registro ROTQ[0]
const ROTQ = new Float64Array(1);
function rotZQ(o) { const a = ROTQ[0], c = Math.cos(a), s = Math.sin(a); o.fill(0); o[0] = c; o[1] = s; o[4] = -s; o[5] = c; o[10] = 1; o[15] = 1; }
function rotXQ(o) { const a = ROTQ[0], c = Math.cos(a), s = Math.sin(a); o.fill(0); o[0] = 1; o[5] = c; o[6] = s; o[9] = -s; o[10] = c; o[15] = 1; }
function camCut() { GS.cut = true; }
function gameCamera() {
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
  if (!CAR) CARP.build();
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
