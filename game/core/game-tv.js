"use strict";
// Cámaras de TV en borde de pista
BUILD.push(async () => {
  if (GAME.mode === "test" || GAME.mode === "car") return;
  if (!CAR && typeof CARS !== "undefined") CAR = CARS.active || CARS.list[0];
  if (GAME.rivalEnabled !== false) {
    if (
      typeof gridManagerInstance !== "undefined" &&
      gridManagerInstance.rivals &&
      gridManagerInstance.rivals.length
    ) {
      await gridManagerInstance.buildAll();
    } else {
      const rM = rivalObj();
      if (rM && typeof rM.build === "function" && !rM.built) {
        await rM.build();
        rM.built = true;
      }
    }
  }
  GAME.init = gameInit;
  GAME.tick = gameTick;
  GAME.prewarm = gamePrewarm;
});

// ---- 48_poses.js
// Poses fijas para verificación visual (definidas en el circuito activo vía TRACKS.active.poses).
function poseApply(i) {
  const P = POSES[i];
  if (!P) return;
  GS.fxOn = true;
  if (P.tipo === "carro" || P.tipo === "coche") {
    gameRestart();
    vehicleReset(P.s, P.d, P.yaw);
    GS.frozen = true;
    GS.freeCam = true;
    GS.alpha = 1;
    gamePose();
    const B = GS.body,
      o = P.ojo || P.olho,
      a = P.blanco || P.alvo,
      q = CAMQ;
    q[0] = B[0] * o[0] + B[4] * o[1] + B[8] * o[2] + B[12];
    q[1] = B[1] * o[0] + B[5] * o[1] + B[9] * o[2] + B[13];
    q[2] = B[2] * o[0] + B[6] * o[1] + B[10] * o[2] + B[14];
    q[3] = B[0] * a[0] + B[4] * a[1] + B[8] * a[2] + B[12];
    q[4] = B[1] * a[0] + B[5] * a[1] + B[9] * a[2] + B[13];
    q[5] = B[2] * a[0] + B[6] * a[1] + B[10] * a[2] + B[14];
    q[6] = P.fov;
    q[7] = 0;
    setCameraQ();
    GS.cut = true;
    R.casc.focusOn = false;
    RT[2] = 1 / 60;
    for (let k = 0; k < 60; k++) {
      gameTick(true);
      renderFrame();
    }
  } else {
    GS.frozen = false;
    GS.freeCam = false;
    const was = GS.replayOn;
    GS.replayOn = true;
    gameRestart();
    GS.cam = P.cam;
    GS.cut = true;
    const n = Math.round(P.t * 60),
      warm = 45;
    RT[2] = 1 / 60;
    for (let k = 0; k < n; k++) {
      const camKeep = GS.cam;
      gameTick(true);
      GS.cam = P.cam;
      if (k >= n - warm) renderFrame();
    }
    GS.replayOn = was;
  }
}
