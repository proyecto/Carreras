'use strict';
// ---- 40_vehicle.js
// Física de vehículos: modelo de 4 ruedas con transferencia de carga, elipse de rozamiento,
// tracción delantera/trasera/total, transmisión automática/secuencial, freno de mano, peralte y colisiones.
// Paso fijo a 120 Hz (1/120 s). Cero asignaciones de memoria durante simulación.
const PHYS_DT = 1 / 120;
const K_W = 1, K_S = 2, K_A = 4, K_D = 8, K_SPACE = 16, K_C = 32, K_R = 64, K_V = 128, K_PAD = 256, K_PADS = 512, K_GEAR_UP = 1024, K_GEAR_DN = 2048, K_TC = 4096;
// Entradas analógicas del mando: VIN[0] acelerador 0..1, VIN[1] freno 0..1, VIN[2] dirección -1..1.
// Registro digital de entradas idéntico para teclado y vueltas guiadas.
const VIN = new Float64Array(3);
const VIN_RIVAL = new Float64Array(3);
const VIN_RIVAL2 = new Float64Array(3);
const VIN_RIVAL3 = new Float64Array(3);
const VP = {
  m: 900, Izz: 1250, L: 2.362, a: 0.96, b: 1.402, tw: 1.33, h: 0.5, R: 0.281,
  mu: 1.42, B: 9.5, C: 1.42, driveF: 1.0,
  gears: [3.91, 2.16, 1.48, 1.12, 0.9], final: 4.07, rev: 3.9, eff: 0.9,
  cdA: 0.62, crr: 0.014, brakeF: 0.64, halfW: 0.78, front: 1.92, rear: 1.72,
  clA: 0.0, aeroSplitF: 0.40,
  torqueBase: 180, torquePeak: 118, torqueDrop: 110, torquePeakStart: 0.6, torquePeakSpan: 5.4, torqueDropRpm: 6.0,
  shiftUpRpm: 6250, shiftDownRpm: 5350, revLimitRpm: 6500, maxRpm: 6700, idleRpm: 900,
};

function createVehicleState() {
  return {
    x: 0, z: 0, yaw: 0, vx: 0, vy: 0, r: 0,                  // Posición del CG en el plano, orientación, velocidades locales (longitudinal, lateral) y guiñada
    steer: 0, rpm: 900, gear: 1, throttle: 0, brake: 0, hand: 0,
    ax: 0, ay: 0,                                              // Aceleraciones filtradas en chasis
    roll: 0, rollV: 0, pitch: 0, pitchV: 0, heave: 0, heaveV: 0,
    y: 0, gPitch: 0, gRoll: 0,                                 // Altura e inclinación del suelo bdajo el coche (filtradas)
    spin: new Float32Array(4), omega: new Float32Array(4), susp: new Float32Array(4),
    slip: new Float32Array(4),                                 // Intensidad de derrape por rueda 0..1 (humo y marcas de neumático)
    wx: new Float32Array(4), wy: new Float32Array(4), wz: new Float32Array(4), wzone: new Uint8Array(4), whint: new Int32Array(4).fill(-1),
    fz: new Float32Array(4), hint: -1, s: 0, d: 0, zone: 0, lapS: 0, lastS: 0, laps: 0, maxOff: 0, offCount: 0, hits: 0, time: 0, steps: 0,
    ctl: new Float32Array(2),                                  // Salida de audio: acelerador y freno efectivos del último paso
    // Estado anterior para interpolación de render
    px: 0, pz: 0, pyaw: 0, py: 0, proll: 0, ppitch: 0, pheave: 0, pgPitch: 0, pgRoll: 0, psteer: 0, pspin: new Float32Array(4), psusp: new Float32Array(4),
  };
}

const VEH = createVehicleState();
const VEH_RIVAL = createVehicleState();
const VEH_RIVAL2 = createVehicleState();
const VEH_RIVAL3 = createVehicleState();
const _vl = new Float64Array(4), _vp = new Float64Array(5);
// Posiciones locales de las ruedas (x avance, z anchura): FL, FR, RL, RR
const WLX = [VP.a, VP.a, -VP.b, -VP.b], WLZ = [-VP.tw / 2, VP.tw / 2, -VP.tw / 2, VP.tw / 2];

// Aplica parámetros físicos del coche activo (CARS.active.physics) en VP, WLX y WLZ.
function applyCarPhysics(car) {
  if (!car || !car.physics) return;
  VP.clA = 0.0;
  VP.aeroSplitF = 0.40;
  Object.assign(VP, car.physics);
  WLX[0] = VP.a; WLX[1] = VP.a; WLX[2] = -VP.b; WLX[3] = -VP.b;
  WLZ[0] = -VP.tw / 2; WLZ[1] = VP.tw / 2; WLZ[2] = -VP.tw / 2; WLZ[3] = VP.tw / 2;
}

function engineTorque(rpm) { // Curva de par motor (N·m) a partir de VP
  const P = VP, x = rpm / 1000;
  const t = P.torqueBase + P.torquePeak * Math.sin(clamp((x - P.torquePeakStart) / P.torquePeakSpan, 0, 1) * PI) - Math.max(0, x - P.torqueDropRpm) * P.torqueDrop;
  return Math.max(0, t);
}
// Consulta de cota de suelo sin boxing: entrada _gq[0]=x, _gq[1]=z; salida _gq[8]=altura; devuelve tipo de zona.
// wi = índice de rueda (-1 para el centro de gravedad)
const _gq = new Float64Array(12);
function groundQ(wi, veh = VEH) {
  const q = _gq, V = veh;
  trackLocateQ(wi >= 0 ? V.whint[wi] : V.hint, q);
  if (q[3] > 90 || q[3] < -90) trackLocateQ(-1, q);
  const i0 = q[4] | 0, f = q[5], d = q[3], ad = d < 0 ? -d : d, i1 = (i0 + 1) % TRK.N;
  if (wi >= 0) V.whint[wi] = i0; else { V.hint = i0; V.s = q[2]; V.d = d; }
  const zone = zoneAtQ(q), lim = TRK.hw + APRON;
  const ty = TRK.y[i0] + (TRK.y[i1] - TRK.y[i0]) * f - (d < -lim ? -lim : d > lim ? lim : d) * (TRK.bank[i0] + (TRK.bank[i1] - TRK.bank[i0]) * f);
  let y = ty;
  if (ad <= lim - 0.4) {
    if (zone === ZONE.KERB) { const kx = ad - TRK.hw; if (kx > 0 && kx < KERB_W) y += 0.012 + 0.045 * Math.sin(Math.min(1, kx / (KERB_W * 0.82)) * PI * 0.5) * (kx > KERB_W * 0.82 ? (KERB_W - kx) / (KERB_W * 0.18) : 1) + 0.012 * Math.sin(q[2] * 5.2); }
  } else {
    hfAtQ(q); let e = (ad - (lim - 0.4)) / 1.2; e = e < 0 ? 0 : e > 1 ? 1 : e; y = ty + (q[6] - ty) * e;
    if (zone === ZONE.GRAVEL) y -= 0.045;
  }
  q[8] = y; return zone;
}
// Versión de conveniencia para pruebas y utilidades
function groundAt(x, z, wi, veh = VEH) { _gq[0] = x; _gq[1] = z; _vl[3] = groundQ(wi, veh); return _gq[8]; }
// Coeficientes de fricción (ZMU) y resistencia al avance por rozamiento/hundimiento (ZDRAG) por superficie:
// 0: ASPHALT  - Agarre 100%, resistencia nominal de rodadura
// 1: KERB     - Agarre 94% (hormigón pintado; permite abrir radio R de curva pero con vibración rumble y pérdida de tracción al abusar)
// 2: GRASS    - Agarre 38% (baja adherencia en hierba, patinaje severo y pérdida de fuerza lateral)
// 3: GRAVEL   - Agarre 26% (piedra suelta, resistencia masiva de arrastre 0.52 G + arado hidrodinámico que frena el coche)
// 4: ROUGH    - Agarre 34% (tierra y arena fuera de límites)
// 5: PIT      - Agarre 98% (carril de boxes limpio)
// 6: CONCRETE - Agarre 88% (asfalto pintado de escapatorias urbanas)
const ZMU = [1.0, 0.94, 0.38, 0.26, 0.34, 0.98, 0.88];
const ZDRAG = [0, 0.012, 0.075, 0.52, 0.14, 0, 0.008];

function vehicleReset(s, d, heading, veh = VEH, vin = VIN) {
  const V = veh; trackPos(s, d, _vp);
  V.x = _vp[0]; V.z = _vp[2]; V.yaw = Math.atan2(_vp[4], _vp[3]) + (heading || 0);
  V.vx = V.vy = V.r = 0; V.steer = 0; V.rpm = 900; V.gear = 1; V.ax = V.ay = 0; V.roll = V.rollV = V.pitch = V.pitchV = V.heave = V.heaveV = 0;
  V.hint = -1; V.whint.fill(-1); V.omega.fill(0); V.slip.fill(0);
  vin[0] = 0; vin[1] = 0; vin[2] = 0;
  _gq[0] = V.x; _gq[1] = V.z; groundQ(-1, V); V.y = _gq[8]; V.gPitch = 0; V.gRoll = 0; V.lastS = V.s;
  for (let k = 0; k < 6; k++) vehicleGround(1, V);
  vehicleSavePrev(V);
}
function vehicleSavePrev(veh = VEH) {
  const V = veh; V.px = V.x; V.pz = V.z; V.pyaw = V.yaw; V.py = V.y; V.proll = V.roll; V.ppitch = V.pitch; V.pheave = V.heave; V.pgPitch = V.gPitch; V.pgRoll = V.gRoll; V.psteer = V.steer;
  V.pspin.set(V.spin); V.psusp.set(V.susp);
}
// Muestrea cota de suelo en las 4 ruedas; actualiza balanceo y cabeceo del chasis
function vehicleGround(k, veh = VEH) {
  const V = veh, c = Math.cos(V.yaw), s = Math.sin(V.yaw);
  for (let i = 0; i < 4; i++) {
    const wx = V.x + c * WLX[i] - s * WLZ[i], wz = V.z + s * WLX[i] + c * WLZ[i];
    V.wx[i] = wx; V.wz[i] = wz; _gq[0] = wx; _gq[1] = wz; V.wzone[i] = groundQ(i, V); V.wy[i] = _gq[8];
  }
  const yF = (V.wy[0] + V.wy[1]) / 2, yR = (V.wy[2] + V.wy[3]) / 2, yL = (V.wy[0] + V.wy[2]) / 2, yRt = (V.wy[1] + V.wy[3]) / 2;
  const gy = (yF * VP.b + yR * VP.a) / VP.L, gp = Math.atan2(yF - yR, VP.L), gr = Math.atan2(yRt - yL, VP.tw);
  V.y += (gy - V.y) * k; V.gPitch += (gp - V.gPitch) * k; V.gRoll += (gr - V.gRoll) * k;
  _gq[0] = V.x; _gq[1] = V.z; V.zone = groundQ(-1, V);
}
function vehicleStep(keys, veh = VEH, vin = VIN) {
  const V = veh, P = VP, dt = PHYS_DT, g = 9.81;
  vehicleSavePrev(V);
  // Entrada progressiva analógica/digital:
  // Teclado: rampa progressiva con ataque suave y retorno rápido para acelerador y freno
  if (!(keys & K_PAD)) {
    const tgtThr = (keys & K_W) ? 1.0 : 0.0;
    const tgtBrk = (keys & K_S) ? 1.0 : 0.0;
    const thrRate = (tgtThr > vin[0] ? 3.2 : 8.0) * dt;
    vin[0] += Math.min(thrRate, Math.max(-thrRate, tgtThr - vin[0]));
    const brkRate = (tgtBrk > vin[1] ? 3.6 : 10.0) * dt;
    vin[1] += Math.min(brkRate, Math.max(-brkRate, tgtBrk - vin[1]));
  }
  const thr = vin[0], brk = vin[1], hand = (keys & K_SPACE) ? 1 : 0;
  const speed = Math.sqrt(V.vx * V.vx + V.vy * V.vy);
  // --- dirección digital progresiva con sensibilidad a la velocidad y respuesta no lineal
  if (!(keys & K_PADS)) {
    const rawSteer = ((keys & K_D) ? 1.0 : 0.0) - ((keys & K_A) ? 1.0 : 0.0);
    let sInRate = 3.2;
    if (rawSteer === 0) sInRate = 4.8;
    else if (Math.sign(rawSteer) !== Math.sign(vin[2]) && vin[2] !== 0) sInRate = 5.5;
    vin[2] += Math.min(sInRate * dt, Math.max(-sInRate * dt, rawSteer - vin[2]));
  }
  const sIn = vin[2];
  const sInProg = (keys & K_PADS) ? sIn : (Math.sign(sIn) * Math.pow(Math.abs(sIn), 1.25));
  const sMax = Math.min(0.60, Math.max(0.024, 0.60 / (1 + speed * 0.08 + speed * speed * 0.0028)));
  // teclado: dirección digital progresiva; control: volante sigue la palanca
  const sTgt = sInProg * sMax;
  const sRate = ((keys & K_PADS) ? 2.8 + 6.0 * sMax : sIn !== 0 && Math.sign(sTgt - V.steer) === Math.sign(sIn) ? 2.2 + 3.0 * sMax : 3.8 + 2.0 * sMax) * dt;
  V.steer += Math.min(sRate, Math.max(-sRate, sTgt - V.steer));
  // --- Transmisión, régimen de motor y marcha atrás
  let reverse = false, throttle = thr, brake = brk;
  if (V.gear === 0) { // Marcha atrás engranada
    reverse = true; throttle = brk; brake = thr;
    if (thr && V.vx > -0.5) { V.gear = 1; reverse = false; throttle = thr; brake = brk; }
  } else if (brk && !thr && V.vx < 0.6) { V.gear = 0; reverse = true; throttle = brk; brake = 0; }
  const df = P.driveF, dr = 1 - df;
  const wheelSpd = ((V.omega[0] + V.omega[1]) * df + (V.omega[2] + V.omega[3]) * dr) * 0.5;
  let ratio = reverse ? -P.rev * P.final : P.gears[V.gear - 1] * P.final;
  let rpm = Math.abs(wheelSpd * ratio) * 9.5493;
  if (!reverse) {
    const isManual = (typeof VEH !== 'undefined' && V === VEH && typeof GAME !== 'undefined' && GAME.manualGearbox);
    if (!isManual) {
      if (rpm > P.shiftUpRpm && V.gear < P.gears.length) { V.gear++; }
      else if (V.gear > 1 && Math.abs(wheelSpd * P.gears[V.gear - 2] * P.final) * 9.5493 < P.shiftDownRpm) V.gear--;
    }
    ratio = P.gears[V.gear - 1] * P.final; rpm = Math.abs(wheelSpd * ratio) * 9.5493;
  }
  const rpmE = Math.min(P.maxRpm, Math.max(P.idleRpm, Math.max(rpm, 1100 + throttle * 1900 * Math.min(1, Math.max(0, 1 - speed / 6)))));   // Deslizamiento de embrague en salida desde parado
  V.rpm += (rpmE - V.rpm) * 0.25;
  const ex = rpmE / 1000, ek = (ex - P.torquePeakStart) / P.torquePeakSpan, eT = P.torqueBase + P.torquePeak * Math.sin((ek < 0 ? 0 : ek > 1 ? 1 : ek) * PI) - (ex > P.torqueDropRpm ? (ex - P.torqueDropRpm) * P.torqueDrop : 0);   // = engineTorque(rpmE), embutido
  let Tdrive = throttle * (eT > 0 ? eT : 0) * ratio * P.eff;                  // Par total transmitido a los ejes
  if (rpm > P.revLimitRpm) Tdrive = 0;
  if (reverse && V.vx < -11) Tdrive = 0;
  // Sistema de control de tracción (TCS) modulado según la adherencia física real y nivel (0=OFF, 1..5)
  const tcLvl = (V.tcLevel !== undefined) ? V.tcLevel : 3;
  const tcMult = tcLvl === 0 ? 99 : (1.22 - tcLvl * 0.04);
  const driveMuF = P.mu * (ZMU[V.wzone[0]] + ZMU[V.wzone[1]]) * 0.5;
  const driveMuR = P.mu * (ZMU[V.wzone[2]] + ZMU[V.wzone[3]]) * 0.5;
  const maxDriveGrip = (P.driveF === 1.0
    ? (V.fz[0] + V.fz[1]) * driveMuF
    : P.driveF === 0.0
      ? (V.fz[2] + V.fz[3]) * driveMuR
      : ((V.fz[0] + V.fz[1]) * driveMuF + (V.fz[2] + V.fz[3]) * driveMuR) * 0.5) * tcMult;
  const maxTdrive = maxDriveGrip * P.R;
  if (Tdrive > maxTdrive) Tdrive = maxTdrive;
  Tdrive -= (1 - throttle) * 0.012 * rpmE * Math.sign(wheelSpd) * Math.abs(ratio) * 0.1;   // Freno motor
  // --- Carga vertical por rueda (peso estático + transferencia longitudinal/lateral + carga aerodinámica)
  const W = P.m * g, dFx = P.m * V.ax * P.h / P.L, dFy = P.m * V.ay * P.h / P.tw;
  const cosg = Math.cos(V.gPitch);
  // Downforce aerodinámico: F_down = 0.5 * rho * clA * v^2 (repartido entre ejes delantero y trasero)
  const aeroDown = 0.5 * 1.2 * (P.clA || 0) * V.vx * V.vx;
  const aSplit = P.aeroSplitF !== undefined ? P.aeroSplitF : 0.40;
  const dFzAeroF = aeroDown * aSplit * 0.5;
  const dFzAeroR = aeroDown * (1 - aSplit) * 0.5;
  V.fz[0] = Math.max(60, (W * P.b / P.L * cosg - dFx) * 0.5 + dFy * 0.56 + dFzAeroF);
  V.fz[1] = Math.max(60, (W * P.b / P.L * cosg - dFx) * 0.5 - dFy * 0.56 + dFzAeroF);
  V.fz[2] = Math.max(60, (W * P.a / P.L * cosg + dFx) * 0.5 + dFy * 0.44 + dFzAeroR);
  V.fz[3] = Math.max(60, (W * P.a / P.L * cosg + dFx) * 0.5 - dFy * 0.44 + dFzAeroR);
  // --- Fuerzas de neumáticos (curvas de fricción Pacejka)
  let Fx = 0, Fy = 0, Mz = 0; const cs = Math.cos(V.steer), sn = Math.sin(V.steer);
  const lw0 = Math.min(1, Math.max(0, (speed - 0.4) / 1.8));
  const lowW = (lw0 * lw0 * (3 - 2 * lw0));
  for (let i = 0; i < 4; i++) {
    const front = i < 2, zone = V.wzone[i], mu = P.mu * ZMU[zone], cap = mu * V.fz[i];
    // Velocidad del parche de contacto en coordenadas del chasis
    const vxw = V.vx - V.r * WLZ[i], vyw = V.vy + V.r * WLX[i];
    // En coordenadas de la rueda
    const vl = front ? vxw * cs + vyw * sn : vxw, vt = front ? -vxw * sn + vyw * cs : vyw;
    // longitudinal: demanda de tração/freio limitada pelo atrito
    let fxd = 0, locked = false, spinning = false;
    const tdShare = (front ? df : dr) * 0.5;
    if (tdShare > 0) fxd += Tdrive * tdShare / P.R;
    const bdem = brake * P.m * g * 1.25 * (front ? P.brakeF : 1 - P.brakeF) * 0.5;
    const dirL = Math.abs(vl) > 0.25 ? Math.sign(vl) : (Math.abs(fxd) > 1 ? 0 : Math.sign(vl) * Math.abs(vl) / 0.25);
    fxd -= bdem * dirL;
    if (!front && hand) { fxd = -cap * 0.92 * dirL; locked = Math.abs(vl) > 0.3; }
    const dragVFactor = Math.min(1, Math.abs(vl) / 0.35);
    const plowDrag = zone === ZONE.GRAVEL ? 0.28 * Math.min(2.0, Math.abs(vl) / 12.0) : 0;
    fxd -= (P.crr + (ZDRAG[zone] + plowDrag) * dragVFactor) * V.fz[i] * dirL;
    let fx = fxd, latCap;
    if (locked) { latCap = cap * 0.38; }
    else if (Math.abs(fxd) > cap * 0.985) {
      if (tdShare > 0 && Math.abs(Tdrive) * tdShare / P.R > bdem && throttle) { fx = Math.sign(fxd) * cap * 0.9; spinning = true; latCap = cap * 0.78; }   // patina com retenção lateral de diferencial autoblocante (LSD)
      else { fx = Math.sign(fxd) * cap * 0.97; latCap = cap * 0.65; }                                                             // ABS / frenada límite con estabilidad direccional
    } else {
      const fNorm = Math.min(1, Math.abs(fx) / Math.max(1, cap));
      latCap = cap * Math.max(0.48, Math.sqrt(Math.max(0, 1 - fNorm * fNorm)));
    }
    // lateral: Pacejka simplificado; em baixa velocidade mistura com amortecimento viscoso (estável parado)
    const alpha = Math.atan2(vt, Math.max(Math.abs(vl), 1.2));
    let fy = -cap * Math.sin(P.C * Math.atan(P.B * alpha));
    fy = fy * lowW + (1 - lowW) * (-vt * P.m * 0.25 / 0.07);
    fy = Math.min(latCap, Math.max(-latCap, fy));
    // derrapagem para efeitos
    const sl = Math.max(spinning ? 0.55 + 0.45 * Math.min(1, Math.max(0, 1 - Math.abs(vl) / 14)) : 0, locked ? Math.min(1, Math.max(0, Math.abs(vl) / 4)) : 0, Math.min(1, Math.max(0, (Math.abs(alpha) - 0.13) / 0.16)) * Math.min(1, Math.max(0, speed / 6)), (brake && Math.abs(fxd) > cap * 0.985) ? 0.35 * Math.min(1, Math.max(0, speed / 8)) : 0);
    V.slip[i] += (((zone === ZONE.ASPHALT || zone === ZONE.KERB || zone === ZONE.PIT) ? sl : sl * 0.6 + Math.min(1, Math.max(0, speed / 10)) * 0.5) - V.slip[i]) * 0.3;
    // rotação visual da roda
    let wT = vl / P.R;
    if (spinning) wT = Math.max(wT, Math.min(rpmE / 9.5493 / Math.abs(ratio), wT + 34)) * Math.sign(ratio);
    if (locked) wT = 0;
    V.omega[i] += (wT - V.omega[i]) * (locked ? 0.5 : 0.35);
    V.spin[i] += V.omega[i] * dt;
    // para o referencial do corpo
    const fbx = front ? fx * cs - fy * sn : fx, fby = front ? fx * sn + fy * cs : fy;
    Fx += fbx; Fy += fby; Mz += WLX[i] * fby - WLZ[i] * fbx;
  }
  // estabilidade aerodinâmica e amortecimento de guinada do chassi (efeito de deriva do alerón traseiro/difusor)
  Mz -= (0.5 * 1.2 * (0.8 + (P.clA || 0) * 0.4) * P.L * P.L * Math.abs(V.vx) + P.m * 1.8) * V.r;
  // arrasto, gravidade nas rampas
  Fx -= 0.5 * 1.2 * P.cdA * V.vx * Math.abs(V.vx);
  Fx -= P.m * g * Math.sin(V.gPitch); Fy -= P.m * g * Math.sin(V.gRoll);
  // integra (referencial do corpo girante)
  const axb = Fx / P.m, ayb = Fy / P.m;
  V.vx += (axb + V.r * V.vy) * dt; V.vy += (ayb - V.r * V.vx) * dt; V.r += Mz / P.Izz * dt;
  if (speed < 0.25 && !throttle && Math.abs(Tdrive) < 30) { V.vx *= 0.9; V.vy *= 0.8; V.r *= 0.8; }
  V.ax += (axb - V.ax) * 0.18; V.ay += (ayb - V.ay) * 0.18;
  const c = Math.cos(V.yaw), s = Math.sin(V.yaw);
  V.x += (V.vx * c - V.vy * s) * dt; V.z += (V.vx * s + V.vy * c) * dt; V.yaw += V.r * dt;
  // Contacto con suelo y colisión con barreras
  vehicleGround(0.35, V);
  vehicleCollide(V);
  // Cinemática de la carrocería sobre la suspensión: balanceo lateral, hundimiento en frenada y cabeceo
  const kR = 78, cR = 9.5; const rollT = Math.min(0.062, Math.max(-0.062, V.ay * 0.0058)), pitchT = Math.min(0.03, Math.max(-0.03, -V.ax * (V.ax < 0 ? 0.0034 : 0.003)));
  V.rollV += ((rollT - V.roll) * kR - V.rollV * cR) * dt; V.roll += V.rollV * dt;
  V.pitchV += ((pitchT - V.pitch) * kR * 1.15 - V.pitchV * cR) * dt; V.pitch += V.pitchV * dt;
  // Vibración en pianos y fuera de pista
  let rough = 0; for (let i = 0; i < 4; i++) rough += V.wzone[i] === ZONE.KERB ? 0.5 : (V.wzone[i] === ZONE.GRAVEL || V.wzone[i] === ZONE.ROUGH || V.wzone[i] === ZONE.GRASS) ? 1 : 0;
  const hT = rough > 0 ? Math.sin(V.time * 61) * 0.004 * rough * Math.min(1, Math.max(0, speed / 8)) : 0;
  V.heaveV += ((hT - V.heave) * 220 - V.heaveV * 14) * dt; V.heave += V.heaveV * dt;
  // estatísticas da volta
  V.ctl[0] = throttle; V.ctl[1] = brake;
  V.time += dt; V.steps++;
  let ds = V.s - V.lastS; if (ds < -TRK.L / 2) { ds += TRK.L; V.laps++; } else if (ds > TRK.L / 2) { ds -= TRK.L; V.laps--; }
  V.lapS += ds; V.lastS = V.s;
  let off = 0; for (let i = 0; i < 4; i++) if (V.wzone[i] !== ZONE.ASPHALT && V.wzone[i] !== ZONE.KERB && V.wzone[i] !== ZONE.PIT) off++;
  if (off > 0) V.offCount++;
}

// colisão com as barreiras laterais: testa os 4 cantos, empurra de volta e reflete a velocidade
function vehicleCollide(veh = VEH) {
  const V = veh, P = VP, c = Math.cos(V.yaw), s = Math.sin(V.yaw);
  for (let k = 0; k < 4; k++) {
    const lx = k < 2 ? P.front : -P.rear, lz = (k & 1) ? P.halfW : -P.halfW;
    const cx = V.x + c * lx - s * lz, cz = V.z + s * lx + c * lz;
    _gq[0] = cx; _gq[1] = cz; trackLocateQ(V.hint, _gq);
    const d = _gq[3], i0 = _gq[4] | 0, f = _gq[5], i1 = (i0 + 1) % TRK.N;
    const bar = d < 0 ? TRK.barL : TRK.barR;
    let b0 = bar ? bar[i0] : (TRK.hw + 1.25), b1 = bar ? bar[i1] : (TRK.hw + 1.25);
    if (isNaN(b0) || b0 < 1.0) b0 = TRK.hw + 1.25;
    if (isNaN(b1) || b1 < 1.0) b1 = TRK.hw + 1.25;
    const lim = b0 + (b1 - b0) * f - 0.25;
    const pen = (d < 0 ? -d : d) - lim;
    if (pen > 0) {
      // normal da barreira (aponta para a pista) = -sinal(d) * normal lateral da pista
      const tx = TRK.tx[i0] + (TRK.tx[i1] - TRK.tx[i0]) * f, tz = TRK.tz[i0] + (TRK.tz[i1] - TRK.tz[i0]) * f, sg = d < 0 ? 1 : -1, nx = -tz * sg, nz = tx * sg;
      V.x += nx * pen; V.z += nz * pen;
      // velocidade do mundo
      let wvx = V.vx * c - V.vy * s, wvz = V.vx * s + V.vy * c; const vn = wvx * nx + wvz * nz;
      if (vn < 0) {
        wvx -= nx * vn * 1.35; wvz -= nz * vn * 1.35; const tgx = -nz, tgz = nx, vt = wvx * tgx + wvz * tgz; wvx -= tgx * vt * 0.15; wvz -= tgz * vt * 0.15;
        V.vx = wvx * c + wvz * s; V.vy = -wvx * s + wvz * c;
        // torque de guinada pelo impacto no canto
        const rx = c * lx - s * lz, rz = s * lx + c * lz; V.r += (rx * nz - rz * nx) * (-vn) * 0.08; V.r *= 0.65; V.hits++;
      }
    }
  }

  // Garantía de solidez infranqueable: verificación del centro de masa contra el vallado perimetral
  _gq[0] = V.x; _gq[1] = V.z; trackLocateQ(V.hint, _gq);
  const cd = _gq[3], ci0 = _gq[4] | 0, cf = _gq[5], ci1 = (ci0 + 1) % TRK.N;
  const cbar = cd < 0 ? TRK.barL : TRK.barR;
  let cb0 = cbar ? cbar[ci0] : (TRK.hw + 1.25), cb1 = cbar ? cbar[ci1] : (TRK.hw + 1.25);
  if (isNaN(cb0) || cb0 < 1.0) cb0 = TRK.hw + 1.25;
  if (isNaN(cb1) || cb1 < 1.0) cb1 = TRK.hw + 1.25;
  const maxCenterD = Math.max(1.0, cb0 + (cb1 - cb0) * cf - P.halfW - 0.05);
  const cpen = (cd < 0 ? -cd : cd) - maxCenterD;
  if (cpen > 0) {
    const ctx = TRK.tx[ci0] + (TRK.tx[ci1] - TRK.tx[ci0]) * cf, ctz = TRK.tz[ci0] + (TRK.tz[ci1] - TRK.tz[ci0]) * cf;
    const csg = cd < 0 ? 1 : -1, cnx = -ctz * csg, cnz = ctx * csg;
    V.x += cnx * cpen;
    V.z += cnz * cpen;
    let wvx = V.vx * c - V.vy * s, wvz = V.vx * s + V.vy * c;
    const cvn = wvx * cnx + wvz * cnz;
    if (cvn < 0) {
      wvx -= cnx * cvn * 1.35; wvz -= cnz * cvn * 1.35;
      const ctgx = -cnz, ctgz = cnx, cvt = wvx * ctgx + wvz * ctgz;
      wvx -= ctgx * cvt * 0.20; wvz -= ctgz * cvt * 0.20;
      V.vx = wvx * c + wvz * s; V.vy = -wvx * s + wvz * c;
    }
    V.hits++;
  }

  // Colisión física sólida contra edificios y rascacielos (TRK.buildingColliders):
  if (TRK.buildingColliders && TRK.buildingColliders.length > 0) {
    const blds = TRK.buildingColliders;
    const vx0 = V.x - 3.2, vx1 = V.x + 3.2, vz0 = V.z - 3.2, vz1 = V.z + 3.2;
    for (let b = 0; b < blds.length; b++) {
      const bc = blds[b];
      if (vx1 < bc.minX || vx0 > bc.maxX || vz1 < bc.minZ || vz0 > bc.maxZ) continue;
      for (let k = 0; k < 4; k++) {
        const lx = k < 2 ? P.front : -P.rear, lz = (k & 1) ? P.halfW : -P.halfW;
        const cx = V.x + c * lx - s * lz, cz = V.z + s * lx + c * lz;
        if (cx < bc.minX || cx > bc.maxX || cz < bc.minZ || cz > bc.maxZ) continue;
        const dx = cx - bc.cx, dz = cz - bc.cz;
        const localU = dx * bc.tx + dz * bc.tz;
        const localV = dx * bc.nx + dz * bc.nz;
        const penU = bc.hw - Math.abs(localU);
        const penV = bc.hd - Math.abs(localV);
        if (penU > 0 && penV > 0) {
          const pushU = penU < penV;
          const pen = pushU ? penU : penV;
          const sgn = pushU ? Math.sign(localU || 1) : Math.sign(localV || 1);
          const nxHit = pushU ? (bc.tx * sgn) : (bc.nx * sgn);
          const nzHit = pushU ? (bc.tz * sgn) : (bc.nz * sgn);
          V.x += nxHit * (pen + 0.02);
          V.z += nzHit * (pen + 0.02);
          let wvx = V.vx * c - V.vy * s, wvz = V.vx * s + V.vy * c;
          const vn = wvx * nxHit + wvz * nzHit;
          if (vn < 0) {
            wvx -= nxHit * vn * 1.35;
            wvz -= nzHit * vn * 1.35;
            const tgx = -nzHit, tgz = nxHit, vt = wvx * tgx + wvz * tgz;
            wvx -= tgx * vt * 0.2;
            wvz -= tgz * vt * 0.2;
            V.vx = wvx * c + wvz * s;
            V.vy = -wvx * s + wvz * c;
            V.r *= 0.5;
            V.hits++;
          }
          break;
        }
      }
    }
  }
}

// Colisión física precisa entre dos vehículos en pista (modelo elasto-plástico de doble círculo axial)
function vehicleCarCollide(v1, v2) {
  if (!v1 || !v2) return;
  const dx = v2.x - v1.x, dz = v2.z - v1.z;
  const distSq = dx * dx + dz * dz;
  if (distSq > 32 || distSq < 1e-6) return; // Distancia mayor a ~5.6m: no hay contacto posible

  const c1 = Math.cos(v1.yaw), s1 = Math.sin(v1.yaw);
  const c2 = Math.cos(v2.yaw), s2 = Math.sin(v2.yaw);
  const rCol = 0.96; // Radio de cada esfera/círculo de colisión
  const dCol = rCol * 2;
  const offsets = [1.05, -1.05]; // Centros aproximados de los ejes delantero y trasero

  for (let i = 0; i < 2; i++) {
    const o1 = offsets[i];
    const x1 = v1.x + c1 * o1, z1 = v1.z + s1 * o1;
    for (let j = 0; j < 2; j++) {
      const o2 = offsets[j];
      const x2 = v2.x + c2 * o2, z2 = v2.z + s2 * o2;
      const cx = x2 - x1, cz = z2 - z1;
      const cDistSq = cx * cx + cz * cz;
      if (cDistSq < dCol * dCol && cDistSq > 1e-4) {
        const dist = Math.sqrt(cDistSq);
        const pen = dCol - dist;
        const nx = cx / dist, nz = cz / dist;

        // Separación posicional directa (50% cada vehículo para evitar solapamiento)
        v1.x -= nx * pen * 0.5; v1.z -= nz * pen * 0.5;
        v2.x += nx * pen * 0.5; v2.z += nz * pen * 0.5;

        // Velocidades en el mundo de cada punto de impacto
        const wvx1 = v1.vx * c1 - v1.vy * s1 - v1.r * (s1 * o1);
        const wvz1 = v1.vx * s1 + v1.vy * c1 + v1.r * (c1 * o1);
        const wvx2 = v2.vx * c2 - v2.vy * s2 - v2.r * (s2 * o2);
        const wvz2 = v2.vx * s2 + v2.vy * c2 + v2.r * (c2 * o2);

        // Velocidad relativa normal
        const relVn = (wvx2 - wvx1) * nx + (wvz2 - wvz1) * nz;
        if (relVn < 0) { // Se están acercando
          const rest = 0.22; // Coeficiente de restitución (impacto de chapa GT)
          const impulse = -(1 + rest) * relVn * 0.5;

          const impX = nx * impulse, impZ = nz * impulse;
          // Impulso lineal
          const v1x = (wvx1 - impX), v1z = (wvz1 - impZ);
          const v2x = (wvx2 + impX), v2z = (wvz2 + impZ);

          v1.vx = v1x * c1 + v1z * s1; v1.vy = -v1x * s1 + v1z * c1;
          v2.vx = v2x * c2 + v2z * s2; v2.vy = -v2x * s2 + v2z * c2;

          // Par de guiñada por el punto excéntrico de colisión
          const torq1 = (c1 * o1 * nz - s1 * o1 * nx) * impulse;
          const torq2 = (c2 * o2 * nz - s2 * o2 * nx) * impulse;
          v1.r -= torq1 * 0.001;
          v2.r += torq2 * 0.001;

          v1.hits++; v2.hits++;
          if (typeof Patterns !== 'undefined' && Patterns.EventBusSingleton) {
            Patterns.EventBusSingleton.emit('collision:vehicle', { impulse, relVn });
          }
        }
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.VEH = VEH;
  window.VEH_RIVAL = VEH_RIVAL;
  window.VEH_RIVAL2 = VEH_RIVAL2;
  window.VEH_RIVAL3 = VEH_RIVAL3;
  window.VIN = VIN;
  window.VIN_RIVAL = VIN_RIVAL;
  window.VIN_RIVAL2 = VIN_RIVAL2;
  window.VIN_RIVAL3 = VIN_RIVAL3;
  window.createVehicleState = createVehicleState;
  window.vehicleCarCollide = vehicleCarCollide;
}
