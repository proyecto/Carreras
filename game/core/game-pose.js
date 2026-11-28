'use strict';
// Pose de vehículos en pista y actualización de cámara
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
  } else if (GS.cam === 3) {
    // Cámara Cockpit: interior del habitáculo (asiento del piloto, lado izquierdo)
    const B = GS.body;
    const ex = -0.15, ey = 0.96, ez = -0.34;
    const tx = 8.0 * lb, ty = 0.85, tz = -0.34;
    q[0] = B[0] * ex + B[4] * ey + B[8] * ez + B[12];
    q[1] = B[1] * ex + B[5] * ey + B[9] * ez + B[13];
    q[2] = B[2] * ex + B[6] * ey + B[10] * ez + B[14];
    q[3] = B[0] * tx + B[4] * ty + B[8] * tz + B[12];
    q[4] = B[1] * tx + B[5] * ty + B[9] * tz + B[13];
    q[5] = B[2] * tx + B[6] * ty + B[10] * tz + B[14];
    q[6] = 1.05; q[7] = -(V.gRoll + V.roll) * 0.8 * lb;
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
