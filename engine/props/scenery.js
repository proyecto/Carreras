"use strict";
/**
 * SceneryProps - Elementos de escenografía natural, monumental y paisajística
 *
 * Incluye:
 * - createMedievalCastle: Castillo monumental en cumbre de horizonte (Burg Nürburg con torre del homenaje, almenas, muralla y torreones).
 */

const SCENERY_CFG =
  (typeof window !== "undefined" && window.__CFG_ENGINE_PROPS_SCENERY) ||
  (typeof require === "function"
    ? (() => {
        try {
          return require("../../config/engine/props/scenery.json");
        } catch {
          return {};
        }
      })()
    : {});

const SceneryProps = {
  setColor(m, r, g, b, a = 1.0) {
    if (
      typeof PropUtils !== "undefined" &&
      typeof PropUtils.setColor === "function"
    ) {
      PropUtils.setColor(m, r, g, b, a);
    } else if (m && typeof m.color === "function") {
      m.color(r, g, b, a);
    }
  },

  boxMinMax(m, u0, u1, y0, y1, v0, v1) {
    if (
      typeof PropUtils !== "undefined" &&
      typeof PropUtils.boxMinMax === "function"
    ) {
      PropUtils.boxMinMax(m, u0, u1, y0, y1, v0, v1);
    } else if (m && typeof m.box === "function") {
      const cx = (u0 + u1) * 0.5,
        cy = (y0 + y1) * 0.5,
        cz = (v0 + v1) * 0.5;
      m.box(
        cx,
        cy,
        cz,
        Math.abs(u1 - u0),
        Math.abs(y1 - y0),
        Math.abs(v1 - v0),
      );
    }
  },

  /**
   * 1. CASTILLO MEDIEVAL MONUMENTAL (Burg Nürburg)
   */
  createMedievalCastle(ctx, config = {}) {
    const { mb, S1 } = ctx;
    if (!mb) return;

    const cCfg = SCENERY_CFG.createMedievalCastle || {};
    const defP = cCfg.defaultPos
      ? cCfg.defaultPos.value
      : [1050.0, 115.0, -2150.0];
    const cx = config.x ?? defP[0],
      cz = config.z ?? defP[2],
      cy = config.y ?? defP[1];
    const cstI0 = mb.ni;

    // Torre del homenaje circular
    const kCol = cCfg.keepColor ? cCfg.keepColor.value : [0.44, 0.42, 0.4];
    const kCyl = cCfg.keepCyl ? cCfg.keepCyl.value : [6.5, 24.0, 6.0, 16];
    mb.mat(cCfg.keepMat ? cCfg.keepMat.value : 3);
    this.setColor(mb, kCol[0], kCol[1], kCol[2]);
    mb.cyl(cx, cy, cz, kCyl[0], cy + kCyl[1], kCyl[2], kCyl[3], true, true);

    // Almenas
    const bCnt = cCfg.battlementCount ? cCfg.battlementCount.value : 12;
    const bRad = cCfg.battlementRadius ? cCfg.battlementRadius.value : 6.1;
    const bHW = cCfg.battlementHalfW ? cCfg.battlementHalfW.value : 0.7;
    const bH = cCfg.battlementHeight ? cCfg.battlementHeight.value : 1.8;
    for (let i = 0; i < bCnt; i++) {
      const ang = (i / bCnt) * Math.PI * 2;
      const ax = cx + Math.cos(ang) * bRad,
        az = cz + Math.sin(ang) * bRad;
      this.boxMinMax(
        mb,
        ax - bHW,
        ax + bHW,
        cy + kCyl[1],
        cy + kCyl[1] + bH,
        az - bHW,
        az + bHW,
      );
    }

    // Mástil y bandera
    const fpCol = cCfg.flagpoleColor
      ? cCfg.flagpoleColor.value
      : [0.85, 0.85, 0.85];
    const fpCyl = cCfg.flagpoleCyl
      ? cCfg.flagpoleCyl.value
      : [0.12, 34.0, 0.06, 6];
    const flCol = cCfg.flagColor ? cCfg.flagColor.value : [0.85, 0.15, 0.12];
    const flBox = cCfg.flagBox ? cCfg.flagBox.value : [3.2, 30.5, 33.5, 0.05];
    mb.mat(cCfg.flagpoleMat ? cCfg.flagpoleMat.value : 1);
    this.setColor(mb, fpCol[0], fpCol[1], fpCol[2]);
    mb.cyl(
      cx,
      cy + kCyl[1],
      cz,
      fpCyl[0],
      cy + fpCyl[1],
      fpCyl[2],
      fpCyl[3],
      false,
      true,
    );
    mb.mat(cCfg.flagMat ? cCfg.flagMat.value : 17);
    this.setColor(mb, flCol[0], flCol[1], flCol[2]);
    this.boxMinMax(
      mb,
      cx,
      cx + flBox[0],
      cy + flBox[1],
      cy + flBox[2],
      cz - flBox[3],
      cz + flBox[3],
    );

    // Muralla almenada
    const wDims = cCfg.wallHalfDims
      ? cCfg.wallHalfDims.value
      : [22.0, 19.0, 8.5, 2.5];
    const hw_wall = wDims[0],
      hd_wall = wDims[1],
      h_wall = wDims[2],
      t_wall = wDims[3];
    const wCol = cCfg.wallColor ? cCfg.wallColor.value : [0.4, 0.38, 0.36];
    mb.mat(cCfg.keepMat ? cCfg.keepMat.value : 3);
    this.setColor(mb, wCol[0], wCol[1], wCol[2]);
    this.boxMinMax(
      mb,
      cx - hw_wall,
      cx + hw_wall,
      cy,
      cy + h_wall,
      cz - hd_wall,
      cz - hd_wall + t_wall,
    );
    this.boxMinMax(
      mb,
      cx - hw_wall,
      cx + hw_wall,
      cy,
      cy + h_wall,
      cz + hd_wall - t_wall,
      cz + hd_wall,
    );
    this.boxMinMax(
      mb,
      cx - hw_wall,
      cx - hw_wall + t_wall,
      cy,
      cy + h_wall,
      cz - hd_wall,
      cz + hd_wall,
    );
    this.boxMinMax(
      mb,
      cx + hw_wall - t_wall,
      cx + hw_wall,
      cy,
      cy + h_wall,
      cz - hd_wall,
      cz + hd_wall,
    );

    // Torreones
    const tCyl = cCfg.turretCyl ? cCfg.turretCyl.value : [3.2, 11.0, 3.0, 10];
    for (const [tx, tz] of [
      [-hw_wall, -hd_wall],
      [hw_wall, -hd_wall],
      [hw_wall, hd_wall],
      [-hw_wall, hd_wall],
    ]) {
      mb.cyl(
        cx + tx,
        cy,
        cz + tz,
        tCyl[0],
        cy + tCyl[1],
        tCyl[2],
        tCyl[3],
        true,
        true,
      );
    }
    const cS1 = cCfg.cullS1 ? cCfg.cullS1.value : [7, 5000];
    if (S1) S1.add(mb, cstI0, cS1[0], cS1[1]);
  },
};

if (typeof window !== "undefined") {
  window.SceneryProps = SceneryProps;
}
if (typeof globalThis !== "undefined") {
  globalThis.SceneryProps = SceneryProps;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SceneryProps };
}
