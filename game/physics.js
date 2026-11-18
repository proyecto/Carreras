'use strict';
// ---- 40_vehicle.js
// Física do veículo (sem biblioteca): modelo plano de 4 rodas com transferência de carga, elipse de atrito,
// tração dianteira, câmbio automático, freio de mão, relevo/inclinação da pista e colisão com barreiras.
// Passo fixo de 1/120 s. Nenhuma alocação durante a simulação.
const PHYS_DT = 1 / 120;
const K_W = 1, K_S = 2, K_A = 4, K_D = 8, K_SPACE = 16, K_C = 32, K_R = 64, K_V = 128, K_PAD = 256, K_PADS = 512;
// Entrada analógica do controle: VIN[0] acelerador 0..1, VIN[1] freio 0..1 (valem quando as teclas trazem K_PAD), VIN[2] direção -1..1 (K_PADS).
// As teclas gravadas da volta roteirizada nunca trazem esses bits: a via digital fica exatamente como era.
const VIN = new Float64Array(3);
const VP = {
  m: 900, Izz: 1250, L: 2.362, a: 0.96, b: 1.402, tw: 1.33, h: 0.5, R: 0.281,
  mu: 1.42, B: 9.5, C: 1.42, driveF: 1.0,
  gears: [3.91, 2.16, 1.48, 1.12, 0.9], final: 4.07, rev: 3.9, eff: 0.9,
  cdA: 0.62, crr: 0.014, brakeF: 0.64, halfW: 0.78, front: 1.92, rear: 1.72,
  clA: 0.0, aeroSplitF: 0.40,
  torqueBase: 180, torquePeak: 118, torqueDrop: 110, torquePeakStart: 0.6, torquePeakSpan: 5.4, torqueDropRpm: 6.0,
  shiftUpRpm: 6250, shiftDownRpm: 5350, revLimitRpm: 6500, maxRpm: 6700, idleRpm: 900,
};
const VEH = {
  x: 0, z: 0, yaw: 0, vx: 0, vy: 0, r: 0,                  // posição do CG no plano, direção, velocidades no corpo (frente, direita), guinada
  steer: 0, rpm: 900, gear: 1, throttle: 0, brake: 0, hand: 0,
  ax: 0, ay: 0,                                              // acelerações filtradas (corpo)
  roll: 0, rollV: 0, pitch: 0, pitchV: 0, heave: 0, heaveV: 0,
  y: 0, gPitch: 0, gRoll: 0,                                 // altura e inclinação do chão sob o carro (filtradas)
  spin: new Float32Array(4), omega: new Float32Array(4), susp: new Float32Array(4),
  slip: new Float32Array(4),                                 // intensidade de derrapagem por roda 0..1 (fumaça/marcas)
  wx: new Float32Array(4), wy: new Float32Array(4), wz: new Float32Array(4), wzone: new Uint8Array(4), whint: new Int32Array(4).fill(-1),
  fz: new Float32Array(4), hint: -1, s: 0, d: 0, zone: 0, lapS: 0, lastS: 0, laps: 0, maxOff: 0, offCount: 0, hits: 0, time: 0, steps: 0,
  ctl: new Float32Array(2),                                  // saída para o som: acelerador e freio efetivos do último passo
  // estado anterior (para interpolar a renderização)
  px: 0, pz: 0, pyaw: 0, py: 0, proll: 0, ppitch: 0, pheave: 0, pgPitch: 0, pgRoll: 0, psteer: 0, pspin: new Float32Array(4), psusp: new Float32Array(4),
};
const _vl = new Float64Array(4), _vp = new Float64Array(5);
// posições locais das rodas (x frente, z direita): FL, FR, RL, RR
const WLX = [VP.a, VP.a, -VP.b, -VP.b], WLZ = [-VP.tw / 2, VP.tw / 2, -VP.tw / 2, VP.tw / 2];

// Aplica os parâmetros físicos do coche ativo (CARS.active.physics) em VP, WLX e WLZ.
function applyCarPhysics(car) {
  if (!car || !car.physics) return;
  VP.clA = 0.0;
  VP.aeroSplitF = 0.40;
  Object.assign(VP, car.physics);
  WLX[0] = VP.a; WLX[1] = VP.a; WLX[2] = -VP.b; WLX[3] = -VP.b;
  WLZ[0] = -VP.tw / 2; WLZ[1] = VP.tw / 2; WLZ[2] = -VP.tw / 2; WLZ[3] = VP.tw / 2;
}

function engineTorque(rpm) { // curva de torque (N·m) a partir de VP
  const P = VP, x = rpm / 1000;
  const t = P.torqueBase + P.torquePeak * Math.sin(clamp((x - P.torquePeakStart) / P.torquePeakSpan, 0, 1) * PI) - Math.max(0, x - P.torqueDropRpm) * P.torqueDrop;
  return Math.max(0, t);
}
// consulta do chão sem números por argumento/retorno: entrada _gq[0]=x, _gq[1]=z; saída _gq[8]=altura; devolve a zona (inteiro).
// wi = índice da roda (dica de busca em VEH.whint) ou -1 para o CG.
const _gq = new Float64Array(12);
function groundQ(wi) {
  const q = _gq, V = VEH;
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
    if (zone === ZONE.GRAVEL) y -= 0.03;
  }
  q[8] = y; return zone;
}
// versão de conveniência (geração/testes)
function groundAt(x, z, wi) { _gq[0] = x; _gq[1] = z; _vl[3] = groundQ(wi); return _gq[8]; }
const ZMU = [1.0, 0.96, 0.76, 0.60, 0.50, 0.95, 0.90], ZDRAG = [0, 0.005, 0.025, 0.12, 0.08, 0, 0];

function vehicleReset(s, d, heading) {
  const V = VEH; trackPos(s, d, _vp);
  V.x = _vp[0]; V.z = _vp[2]; V.yaw = Math.atan2(_vp[4], _vp[3]) + (heading || 0);
  V.vx = V.vy = V.r = 0; V.steer = 0; V.rpm = 900; V.gear = 1; V.ax = V.ay = 0; V.roll = V.rollV = V.pitch = V.pitchV = V.heave = V.heaveV = 0;
  V.hint = -1; V.whint.fill(-1); V.omega.fill(0); V.slip.fill(0);
  VIN[0] = 0; VIN[1] = 0; VIN[2] = 0;
  _gq[0] = V.x; _gq[1] = V.z; groundQ(-1); V.y = _gq[8]; V.gPitch = 0; V.gRoll = 0; V.lastS = V.s;
  for (let k = 0; k < 6; k++) vehicleGround(1);
  vehicleSavePrev();
}
function vehicleSavePrev() {
  const V = VEH; V.px = V.x; V.pz = V.z; V.pyaw = V.yaw; V.py = V.y; V.proll = V.roll; V.ppitch = V.pitch; V.pheave = V.heave; V.pgPitch = V.gPitch; V.pgRoll = V.gRoll; V.psteer = V.steer;
  V.pspin.set(V.spin); V.psusp.set(V.susp);
}
// amostra o chão nas 4 rodas; atualiza altura/inclinação do corpo (filtradas com fator k)
function vehicleGround(k) {
  const V = VEH, c = Math.cos(V.yaw), s = Math.sin(V.yaw);
  for (let i = 0; i < 4; i++) {
    const wx = V.x + c * WLX[i] - s * WLZ[i], wz = V.z + s * WLX[i] + c * WLZ[i];
    V.wx[i] = wx; V.wz[i] = wz; _gq[0] = wx; _gq[1] = wz; V.wzone[i] = groundQ(i); V.wy[i] = _gq[8];
  }
  const yF = (V.wy[0] + V.wy[1]) / 2, yR = (V.wy[2] + V.wy[3]) / 2, yL = (V.wy[0] + V.wy[2]) / 2, yRt = (V.wy[1] + V.wy[3]) / 2;
  const gy = (yF * VP.b + yR * VP.a) / VP.L, gp = Math.atan2(yF - yR, VP.L), gr = Math.atan2(yRt - yL, VP.tw);
  V.y += (gy - V.y) * k; V.gPitch += (gp - V.gPitch) * k; V.gRoll += (gr - V.gRoll) * k;
  _gq[0] = V.x; _gq[1] = V.z; V.zone = groundQ(-1);
}
function vehicleStep(keys) {
  const V = VEH, P = VP, dt = PHYS_DT, g = 9.81;
  vehicleSavePrev();
  // Entrada progressiva analógica/digital:
  // Teclado: rampa progressiva con ataque suave y retorno rápido para acelerador y freno
  if (!(keys & K_PAD)) {
    const tgtThr = (keys & K_W) ? 1.0 : 0.0;
    const tgtBrk = (keys & K_S) ? 1.0 : 0.0;
    const thrRate = (tgtThr > VIN[0] ? 3.2 : 8.0) * dt;
    VIN[0] += Math.min(thrRate, Math.max(-thrRate, tgtThr - VIN[0]));
    const brkRate = (tgtBrk > VIN[1] ? 3.6 : 10.0) * dt;
    VIN[1] += Math.min(brkRate, Math.max(-brkRate, tgtBrk - VIN[1]));
  }
  const thr = VIN[0], brk = VIN[1], hand = (keys & K_SPACE) ? 1 : 0;
  const speed = Math.sqrt(V.vx * V.vx + V.vy * V.vy);
  // --- dirección digital progresiva con sensibilidad a la velocidad y respuesta no lineal
  if (!(keys & K_PADS)) {
    const rawSteer = ((keys & K_D) ? 1.0 : 0.0) - ((keys & K_A) ? 1.0 : 0.0);
    let sInRate = 3.2;
    if (rawSteer === 0) sInRate = 4.8;
    else if (Math.sign(rawSteer) !== Math.sign(VIN[2]) && VIN[2] !== 0) sInRate = 5.5;
    VIN[2] += Math.min(sInRate * dt, Math.max(-sInRate * dt, rawSteer - VIN[2]));
  }
  const sIn = VIN[2];
  const sInProg = (keys & K_PADS) ? sIn : (Math.sign(sIn) * Math.pow(Math.abs(sIn), 1.25));
  const sMax = Math.min(0.60, Math.max(0.024, 0.60 / (1 + speed * 0.08 + speed * speed * 0.0028)));
  // teclado: dirección digital progresiva; control: volante sigue la palanca
  const sTgt = sInProg * sMax;
  const sRate = ((keys & K_PADS) ? 2.8 + 6.0 * sMax : sIn !== 0 && Math.sign(sTgt - V.steer) === Math.sign(sIn) ? 2.2 + 3.0 * sMax : 3.8 + 2.0 * sMax) * dt;
  V.steer += Math.min(sRate, Math.max(-sRate, sTgt - V.steer));
  // --- marcha, motor, ré
  let reverse = false, throttle = thr, brake = brk;
  if (V.gear === 0) { // ré engatada
    reverse = true; throttle = brk; brake = thr;
    if (thr && V.vx > -0.5) { V.gear = 1; reverse = false; throttle = thr; brake = brk; }
  } else if (brk && !thr && V.vx < 0.6) { V.gear = 0; reverse = true; throttle = brk; brake = 0; }
  const df = P.driveF, dr = 1 - df;
  const wheelSpd = ((V.omega[0] + V.omega[1]) * df + (V.omega[2] + V.omega[3]) * dr) * 0.5;
  let ratio = reverse ? -P.rev * P.final : P.gears[V.gear - 1] * P.final;
  let rpm = Math.abs(wheelSpd * ratio) * 9.5493;
  if (!reverse) {
    if (rpm > P.shiftUpRpm && V.gear < P.gears.length) { V.gear++; }
    else if (V.gear > 1 && Math.abs(wheelSpd * P.gears[V.gear - 2] * P.final) * 9.5493 < P.shiftDownRpm) V.gear--;
    ratio = P.gears[V.gear - 1] * P.final; rpm = Math.abs(wheelSpd * ratio) * 9.5493;
  }
  const rpmE = Math.min(P.maxRpm, Math.max(P.idleRpm, Math.max(rpm, 1100 + throttle * 1900 * Math.min(1, Math.max(0, 1 - speed / 6)))));   // embreagem patinando na saída
  V.rpm += (rpmE - V.rpm) * 0.25;
  const ex = rpmE / 1000, ek = (ex - P.torquePeakStart) / P.torquePeakSpan, eT = P.torqueBase + P.torquePeak * Math.sin((ek < 0 ? 0 : ek > 1 ? 1 : ek) * PI) - (ex > P.torqueDropRpm ? (ex - P.torqueDropRpm) * P.torqueDrop : 0);   // = engineTorque(rpmE), embutido
  let Tdrive = throttle * (eT > 0 ? eT : 0) * ratio * P.eff;                  // torque total nas rodas dianteiras
  if (rpm > P.revLimitRpm) Tdrive = 0;
  if (reverse && V.vx < -11) Tdrive = 0;
  // Sistema de control de tracción (TCS) activo para teclado / competición: modula el exceso de par al límite de agarre
  const maxDriveGrip = (P.driveF === 1.0 ? (V.fz[0] + V.fz[1]) : P.driveF === 0.0 ? (V.fz[2] + V.fz[3]) : (V.fz[0] + V.fz[1] + V.fz[2] + V.fz[3])) * P.mu * 1.08;
  const maxTdrive = maxDriveGrip * P.R;
  if (Tdrive > maxTdrive) Tdrive = maxTdrive;
  Tdrive -= (1 - throttle) * 0.012 * rpmE * Math.sign(wheelSpd) * Math.abs(ratio) * 0.1;   // freio-motor
  // --- carga vertical por roda (peso estático + transferência longitudinal/lateral + downforce aerodinâmico)
  const W = P.m * g, dFx = P.m * V.ax * P.h / P.L, dFy = P.m * V.ay * P.h / P.tw;
  const cosg = Math.cos(V.gPitch);
  // Downforce aerodinâmico: F_down = 0.5 * rho * clA * v^2 (repartido entre os eixos dianteiro e traseiro)
  const aeroDown = 0.5 * 1.2 * (P.clA || 0) * V.vx * V.vx;
  const aSplit = P.aeroSplitF !== undefined ? P.aeroSplitF : 0.40;
  const dFzAeroF = aeroDown * aSplit * 0.5;
  const dFzAeroR = aeroDown * (1 - aSplit) * 0.5;
  V.fz[0] = Math.max(60, (W * P.b / P.L * cosg - dFx) * 0.5 + dFy * 0.56 + dFzAeroF);
  V.fz[1] = Math.max(60, (W * P.b / P.L * cosg - dFx) * 0.5 - dFy * 0.56 + dFzAeroF);
  V.fz[2] = Math.max(60, (W * P.a / P.L * cosg + dFx) * 0.5 + dFy * 0.44 + dFzAeroR);
  V.fz[3] = Math.max(60, (W * P.a / P.L * cosg + dFx) * 0.5 - dFy * 0.44 + dFzAeroR);
  // --- forças dos pneus
  let Fx = 0, Fy = 0, Mz = 0; const cs = Math.cos(V.steer), sn = Math.sin(V.steer);
  const lw0 = Math.min(1, Math.max(0, (speed - 0.4) / 1.8));
  const lowW = (lw0 * lw0 * (3 - 2 * lw0));
  for (let i = 0; i < 4; i++) {
    const front = i < 2, zone = V.wzone[i], mu = P.mu * ZMU[zone], cap = mu * V.fz[i];
    // velocidade do ponto de contato no referencial do corpo
    const vxw = V.vx - V.r * WLZ[i], vyw = V.vy + V.r * WLX[i];
    // no referencial da roda
    const vl = front ? vxw * cs + vyw * sn : vxw, vt = front ? -vxw * sn + vyw * cs : vyw;
    // longitudinal: demanda de tração/freio limitada pelo atrito
    let fxd = 0, locked = false, spinning = false;
    const tdShare = (front ? df : dr) * 0.5;
    if (tdShare > 0) fxd += Tdrive * tdShare / P.R;
    const bdem = brake * P.m * g * 1.25 * (front ? P.brakeF : 1 - P.brakeF) * 0.5;
    const dirL = Math.abs(vl) > 0.25 ? Math.sign(vl) : (Math.abs(fxd) > 1 ? 0 : Math.sign(vl) * Math.abs(vl) / 0.25);
    fxd -= bdem * dirL;
    if (!front && hand) { fxd = -cap * 0.92 * dirL; locked = Math.abs(vl) > 0.3; }
    fxd -= (P.crr + ZDRAG[zone]) * V.fz[i] * dirL;
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
  // chão e colisão
  vehicleGround(0.35);
  vehicleCollide();
  // movimento da carroceria sobre a suspensão: rolagem nas curvas, mergulho na freada, agachamento na arrancada
  const kR = 78, cR = 9.5; const rollT = Math.min(0.062, Math.max(-0.062, V.ay * 0.0058)), pitchT = Math.min(0.03, Math.max(-0.03, -V.ax * (V.ax < 0 ? 0.0034 : 0.003)));
  V.rollV += ((rollT - V.roll) * kR - V.rollV * cR) * dt; V.roll += V.rollV * dt;
  V.pitchV += ((pitchT - V.pitch) * kR * 1.15 - V.pitchV * cR) * dt; V.pitch += V.pitchV * dt;
  // vibração nas zebras / fora da pista
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
function vehicleCollide() {
  const V = VEH, P = VP, c = Math.cos(V.yaw), s = Math.sin(V.yaw);
  for (let k = 0; k < 4; k++) {
    const lx = k < 2 ? P.front : -P.rear, lz = (k & 1) ? P.halfW : -P.halfW;
    const cx = V.x + c * lx - s * lz, cz = V.z + s * lx + c * lz;
    _gq[0] = cx; _gq[1] = cz; trackLocateQ(V.hint, _gq);
    const d = _gq[3], i0 = _gq[4] | 0, f = _gq[5], i1 = (i0 + 1) % TRK.N, bar = d < 0 ? TRK.barL : TRK.barR, lim = bar[i0] + (bar[i1] - bar[i0]) * f - 0.25, pen = (d < 0 ? -d : d) - lim;
    if (pen > 0 && pen < 6) {
      // normal da barreira (aponta para a pista) = -sinal(d) * normal lateral da pista
      const tx = TRK.tx[i0] + (TRK.tx[i1] - TRK.tx[i0]) * f, tz = TRK.tz[i0] + (TRK.tz[i1] - TRK.tz[i0]) * f, sg = d < 0 ? 1 : -1, nx = -tz * sg, nz = tx * sg;
      V.x += nx * pen; V.z += nz * pen;
      // velocidade do mundo
      let wvx = V.vx * c - V.vy * s, wvz = V.vx * s + V.vy * c; const vn = wvx * nx + wvz * nz;
      if (vn < 0) {
        wvx -= nx * vn * 1.25; wvz -= nz * vn * 1.25; const tgx = -nz, tgz = nx, vt = wvx * tgx + wvz * tgz; wvx -= tgx * vt * 0.12; wvz -= tgz * vt * 0.12;
        V.vx = wvx * c + wvz * s; V.vy = -wvx * s + wvz * c;
        // torque de guinada pelo impacto no canto
        const rx = c * lx - s * lz, rz = s * lx + c * lz; V.r += (rx * nz - rz * nx) * (-vn) * 0.08; V.r *= 0.70; V.hits++;
      }
    }
  }
}
