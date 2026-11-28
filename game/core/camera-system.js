"use strict";
/**
 * ============================================================================
 * SISTEMA Y ESTRATEGIAS DE CÁMARA (game/camera-system.js)
 * ============================================================================
 * Patrón: STRATEGY
 * Responsabilidad Única (SRP):
 * - Cálculo cinemático de posiciones de cámara (ojo, objetivo, FOV y alabeo).
 * - Desacopla la lógica de cámara del bucle de física y del renderizador WebGPU.
 */

const CAM_CFG =
  (typeof window !== "undefined" && window.__CFG_GAME_CORE_CAMERA_SYSTEM) ||
  (typeof require === "function"
    ? (() => {
        try {
          return require("../../config/game/core/camera-system.json");
        } catch {
          return {};
        }
      })()
    : {});
const _chaseC = CAM_CFG.ChaseCameraStrategy || {};

class ChaseCameraStrategy {
  constructor() {
    this.id = 0;
    this.name = "Chase";
  }

  update(gs, veh, dt, q, lb) {
    const c = Math.cos(gs.yaw),
      s = Math.sin(gs.yaw);
    let tgt = gs.yaw;
    const sMin = _chaseC.slipMinSpeed ? _chaseC.slipMinSpeed.value : 4;
    const sCl = _chaseC.slipClamp ? _chaseC.slipClamp.value : 0.5;
    const sFac = _chaseC.slipYawFactor ? _chaseC.slipYawFactor.value : 0.55;
    if (gs.speed > sMin) {
      let sa = Math.atan2(veh.vy, veh.vx > 1 ? veh.vx : 1);
      sa = sa < -sCl ? -sCl : sa > sCl ? sCl : sa;
      tgt = gs.yaw + sa * sFac;
    }
    if (!gs.chaseInit) {
      gs.chaseYaw = tgt;
      gs.chaseY = gs.cy;
      gs.chaseInit = true;
    }
    let dy = tgt - gs.chaseYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    gs.chaseYaw +=
      dy *
      (1 -
        Math.exp(
          -dt * (_chaseC.yawSmoothRate ? _chaseC.yawSmoothRate.value : 5.5),
        ));
    gs.chaseY +=
      (gs.cy - gs.chaseY) *
      (1 -
        Math.exp(-dt * (_chaseC.ySmoothRate ? _chaseC.ySmoothRate.value : 7)));

    const dist =
      (_chaseC.baseDist ? _chaseC.baseDist.value : 5.3) +
      gs.speed *
        (_chaseC.speedDistFactor ? _chaseC.speedDistFactor.value : 0.022);
    const cc = Math.cos(gs.chaseYaw),
      ss = Math.sin(gs.chaseYaw);
    const ex = gs.cx + c * 0.2 * lb - cc * dist * lb;
    const ez = gs.cz + s * 0.2 * lb - ss * dist * lb;
    let ey =
      gs.chaseY +
      (_chaseC.eyeHeight ? _chaseC.eyeHeight.value : 1.62) -
      veh.gPitch *
        dist *
        (_chaseC.pitchFactor ? _chaseC.pitchFactor.value : 0.6);

    const minClr = _chaseC.minGroundClearance
      ? _chaseC.minGroundClearance.value
      : 0.55;
    if (typeof _gq !== "undefined" && typeof hfAtQ === "function") {
      _gq[0] = ex;
      _gq[1] = ez;
      hfAtQ(_gq);
      if (ey < _gq[6] + minClr) ey = _gq[6] + minClr;
    }

    let rl = -veh.ay * (_chaseC.rollFactor ? _chaseC.rollFactor.value : 0.004);
    const maxR = _chaseC.maxRoll ? _chaseC.maxRoll.value : 0.05;
    rl = rl < -maxR ? -maxR : rl > maxR ? maxR : rl;

    q[0] = ex;
    q[1] = ey;
    q[2] = ez;
    q[3] = gs.cx + c * 1.6 * lb;
    q[4] = gs.cy + 0.95 + veh.gPitch * 1.6;
    q[5] = gs.cz + s * 1.6 * lb;
    q[6] = 0.93 + (gs.speed < 50 ? gs.speed : 50) * 0.0042;
    q[7] = rl;
  }
}

class BonnetCameraStrategy {
  constructor() {
    this.id = 1;
    this.name = "Bonnet";
  }

  update(gs, veh, dt, q, lb) {
    const B = gs.body;
    q[0] = B[0] * 0.5 + B[4] * 1.15 + B[12];
    q[1] = B[1] * 0.5 + B[5] * 1.15 + B[13];
    q[2] = B[2] * 0.5 + B[6] * 1.15 + B[14];
    q[3] = B[0] * 6.5 + B[4] * 0.52 + B[12];
    q[4] = B[1] * 6.5 + B[5] * 0.52 + B[13];
    q[5] = B[2] * 6.5 + B[6] * 0.52 + B[14];
    q[6] = 1.0;
    q[7] = -(veh.gRoll + veh.roll) * 0.8;

    if (lb < 0) {
      // Vista hacia atrás desde portón trasero
      q[0] = B[0] * -2.0 + B[4] * 1.05 + B[12];
      q[1] = B[1] * -2.0 + B[5] * 1.05 + B[13];
      q[2] = B[2] * -2.0 + B[6] * 1.05 + B[14];
      q[3] = B[0] * -9.0 + B[4] * 0.6 + B[12];
      q[4] = B[1] * -9.0 + B[5] * 0.6 + B[13];
      q[5] = B[2] * -9.0 + B[6] * 0.6 + B[14];
      q[7] = -q[7];
    }
  }
}

class TvCameraStrategy {
  constructor() {
    this.id = 2;
    this.name = "TV";
  }

  update(gs, veh, dt, q, lb) {
    const c = Math.cos(gs.yaw),
      s = Math.sin(gs.yaw);
    let best = gs.tvCur,
      bd = 1e9;
    const n = gs.tvN,
      TV = gs.tvData;

    for (let i = 0; i < n; i++) {
      let d = TV[i * 4] - veh.s;
      const hl = TRK.L * 0.5;
      while (d > hl) d -= TRK.L;
      while (d < -hl) d += TRK.L;
      d = (d < 0 ? -d * 0.7 : d) - (i === gs.tvCur ? 14 : 0);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }

    const cut = best !== gs.tvCur;
    gs.tvCur = best;
    const tx = TV[best * 4 + 1],
      ty = TV[best * 4 + 2],
      tz = TV[best * 4 + 3];
    const ld = 0.8 + gs.speed * 0.1;
    const ax = gs.cx + c * ld,
      ay = gs.cy + 0.75,
      az = gs.cz + s * ld;
    const dist = Math.sqrt(
      (ax - tx) * (ax - tx) + (ay - ty) * (ay - ty) + (az - tz) * (az - tz),
    );

    let fov = 2 * Math.atan(3.3 / dist);
    fov = fov < 0.04 ? 0.04 : fov > 0.62 ? 0.62 : fov;

    if (cut) {
      gs.tvAim[0] = ax;
      gs.tvAim[1] = ay;
      gs.tvAim[2] = az;
      gs.tvFov = fov;
      gs.cut = true;
    }

    const k = 1 - Math.exp(-dt * 16);
    gs.tvAim[0] += (ax - gs.tvAim[0]) * k;
    gs.tvAim[1] += (ay - gs.tvAim[1]) * k;
    gs.tvAim[2] += (az - gs.tvAim[2]) * k;
    gs.tvFov += (fov - gs.tvFov) * (1 - Math.exp(-dt * 3));

    q[0] = tx;
    q[1] = ty;
    q[2] = tz;
    q[3] = gs.tvAim[0];
    q[4] = gs.tvAim[1];
    q[5] = gs.tvAim[2];
    q[6] = gs.tvFov;
    q[7] = 0;
  }
}

class CockpitCameraStrategy {
  update(gs, veh, dt, q, lb) {
    const B = gs.body;
    const activeCar =
      typeof CARS !== "undefined" && CARS.active ? CARS.active : null;
    const cam = activeCar && activeCar.cockpitCam ? activeCar.cockpitCam : null;
    const ex = cam ? cam[0] : -0.15;
    const ey = cam ? cam[1] : 0.96;
    const ez = cam ? cam[2] : -0.34;
    const tx = 8.0 * lb,
      ty = ey - 0.11,
      tz = ez;
    q[0] = B[0] * ex + B[4] * ey + B[8] * ez + B[12];
    q[1] = B[1] * ex + B[5] * ey + B[9] * ez + B[13];
    q[2] = B[2] * ex + B[6] * ey + B[10] * ez + B[14];
    q[3] = B[0] * tx + B[4] * ty + B[8] * tz + B[12];
    q[4] = B[1] * tx + B[5] * ty + B[9] * tz + B[13];
    q[5] = B[2] * tx + B[6] * ty + B[10] * tz + B[14];
    q[6] = 1.05;
    q[7] = -(veh.gRoll + veh.roll);
  }
}

class CameraSystem {
  constructor() {
    this.strategies = [
      new ChaseCameraStrategy(),
      new BonnetCameraStrategy(),
      new TvCameraStrategy(),
      new CockpitCameraStrategy(),
    ];
  }

  update(gs, veh, dt, camQ) {
    const lb = gs.keys & (typeof K_V !== "undefined" ? K_V : 16) ? -1 : 1;
    const strat = this.strategies[gs.cam] || this.strategies[0];
    strat.update(gs, veh, dt, camQ, lb);

    // Ajuste de sombras cascada para teleobjetivo TV
    if (typeof R !== "undefined" && R.casc) {
      R.casc.focusOn = gs.cam === 2;
      if (R.casc.focusOn) {
        R.casc.focus[0] = gs.cx;
        R.casc.focus[1] = gs.cy + 0.6;
        R.casc.focus[2] = gs.cz;
      }
    }

    if (typeof setCameraQ === "function") {
      setCameraQ();
    }
  }

  updateCamera(gs, veh, dt, camQ, lb) {
    const strat = this.strategies[gs.cam] || this.strategies[0];
    strat.update(
      gs,
      veh,
      dt,
      camQ,
      lb !== undefined
        ? lb
        : gs.keys & (typeof K_V !== "undefined" ? K_V : 16)
          ? -1
          : 1,
    );

    if (typeof R !== "undefined" && R.casc) {
      R.casc.focusOn = gs.cam === 2;
      if (R.casc.focusOn) {
        R.casc.focus[0] = gs.cx;
        R.casc.focus[1] = gs.cy + 0.6;
        R.casc.focus[2] = gs.cz;
      }
    }

    if (typeof setCameraQ === "function") {
      setCameraQ();
    }
  }
}

const cameraSystemInstance = new CameraSystem();

if (typeof window !== "undefined") {
  window.ChaseCameraStrategy = ChaseCameraStrategy;
  window.BonnetCameraStrategy = BonnetCameraStrategy;
  window.TvCameraStrategy = TvCameraStrategy;
  window.CameraSystem = CameraSystem;
  window.cameraSystemInstance = cameraSystemInstance;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ChaseCameraStrategy,
    BonnetCameraStrategy,
    TvCameraStrategy,
    CameraSystem,
    cameraSystemInstance,
  };
}
