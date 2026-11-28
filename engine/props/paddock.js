'use strict';
/**
 * PaddockProps - Estructuras de boxes, paddock, hospitalities y pórticos de meta
 *
 * Incluye:
 * - createStartGantry: Pórtico de salida con celosía espacial, cartel y semáforo FIA.
 * - createPitBuilding: Edificio oficial de boxes con garajes, terraza VIP y torre de control.
 * - createPaddockTruck: Camión trailer de competición con tractora y remolque con librea.
 * - createPaddockTent: Carpas de hospitalidad de paddock.
 */

let PADDOCK_CFG = null;
if (typeof fetch === 'function') {
  fetch('config/paddock.json' + (typeof window !== 'undefined' && window.CACHE_VERSION ? '?v=' + window.CACHE_VERSION : ''))
    .then(r => r.json()).then(d => { PADDOCK_CFG = d; }).catch(() => { });
}

const PaddockProps = {
  setColor(m, r, g, b, a = 1.0) {
    if (typeof PropUtils !== 'undefined' && typeof PropUtils.setColor === 'function') {
      PropUtils.setColor(m, r, g, b, a);
    } else if (m && typeof m.color === 'function') {
      m.color(r, g, b, a);
    }
  },

  boxMinMax(m, u0, u1, y0, y1, v0, v1) {
    if (typeof PropUtils !== 'undefined' && typeof PropUtils.boxMinMax === 'function') {
      PropUtils.boxMinMax(m, u0, u1, y0, y1, v0, v1);
    } else if (m && typeof m.box === 'function') {
      const cx = (u0 + u1) * 0.5, cy = (y0 + y1) * 0.5, cz = (v0 + v1) * 0.5;
      m.box(cx, cy, cz, Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0));
    }
  },

  /**
   * 1. PÓRTICO DE SALIDA Y SEMÁFORO FIA
   */
  createStartGantry(ctx, config = {}) {
    const { mb, md, S1, S2, REG, toStraight } = ctx;
    if (!mb || !md) return;

    const gCfg = ((typeof window !== 'undefined' && window.__CFG_PADDOCK) || PADDOCK_CFG).gantry;
    const s = config.s ?? gCfg.s.value;
    const dL = config.dL ?? gCfg.dL.value;
    const dR = config.dR ?? gCfg.dR.value;
    const nameReg = config.nameReg || 'name';
    const lights = config.lights !== false;
    const local = config.local || false;

    const v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni;
    const yB = config.yBottom ?? gCfg.yBottom.value, yT = config.yTop ?? gCfg.yTop.value, hwB = gCfg.beamHalfWidth.value;
    const mt = typeof m4 === 'function' ? m4() : new Float32Array(16);

    const twCol = gCfg.towerColor.value;
    for (const d of [dL, dR]) {
      const twJCol = gCfg.towerJointColor.value;
      const plCol = gCfg.plinthColor.value;
      const twHW = gCfg.towerHalfW.value;
      const twStep = gCfg.towerStepY.value;
      const twPostR = gCfg.towerPostR.value;
      mb.mat(2, 120, 70);
      this.setColor(mb, twCol[0], twCol[1], twCol[2]);
      for (const [a, b] of [[-twHW, -twHW], [twHW, -twHW], [twHW, twHW], [-twHW, twHW]]) {
        mb.cyl(s + a, 0, d + b, twPostR, yT, twPostR, 10, false, true);
      }
      for (let y = 0.5; y < yB; y += twStep) {
        for (const [a0, b0, a1, b1] of [[-twHW, -twHW, twHW, -twHW], [twHW, -twHW, twHW, twHW], [twHW, twHW, -twHW, twHW], [-twHW, twHW, -twHW, -twHW]]) {
          mb.tube([[s + a0, y, d + b0], [s + a1, y + twStep, d + b1]], 0.05, 6);
          mb.tube([[s + a0, y, d + b0], [s + a1, y, d + b1]], 0.045, 6);
        }
      }
      mb.mat(2, 130, 60);
      this.setColor(mb, twJCol[0], twJCol[1], twJCol[2]);
      for (let y = 0.5; y <= yB + 0.01; y += twStep) {
        for (const [a, b] of [[-twHW, -twHW], [twHW, -twHW], [twHW, twHW], [-twHW, twHW]]) {
          mb.box(s + a, y, d + b, 0.2, 0.14, 0.2);
        }
      }
      this.boxMinMax(mb, s - 0.62, s + 0.62, 0.33, 0.4, d - 0.62, d + 0.62);
      mb.mat(3);
      this.setColor(mb, plCol[0], plCol[1], plCol[2]);
      this.boxMinMax(mb, s - 0.8, s + 0.8, -0.4, 0.35, d - 0.8, d + 0.8);
      mb.mat(1);
      this.setColor(mb, 1, 1, 1);
      const boltOffs = gCfg.anchorBoltOffsets ? gCfg.anchorBoltOffsets.value : [[-0.54, -0.54], [0.54, -0.54], [0.54, 0.54], [-0.54, 0.54], [0, -0.56], [0, 0.56], [-0.56, 0], [0.56, 0]];
      const boltCyl = gCfg.anchorBoltCyl ? gCfg.anchorBoltCyl.value : [0.4, 0.028, 0.47, 6];
      for (const [a2, b2] of boltOffs) {
        mb.cyl(s + a2, boltCyl[0], d + b2, boltCyl[1], boltCyl[2], boltCyl[1], boltCyl[3], false, true);
      }
    }

    mb.mat(2, 120, 70);
    this.setColor(mb, twCol[0], twCol[1], twCol[2]);
    for (const a of [-hwB, hwB]) {
      for (const y of [yB, yT]) mb.tube([[s + a, y, dL], [s + a, y, dR]], 0.085, 8);
    }
    const nb = Math.max(2, Math.round(Math.abs(dR - dL) / 1.25));
    for (let k = 0; k <= nb; k++) {
      const d = dL + (dR - dL) * (k / nb);
      const d2 = dL + (dR - dL) * (Math.min(1, (k + 1) / nb));
      for (const a of [-hwB, hwB]) {
        mb.tube([[s + a, yB, d], [s + a, yT, d]], 0.045, 5);
        if (k < nb) mb.tube([[s + a, k & 1 ? yT : yB, d], [s + a, k & 1 ? yB : yT, d2]], 0.045, 5);
      }
      mb.tube([[s - hwB, yT, d], [s + hwB, yT, d]], 0.045, 5);
      mb.tube([[s - hwB, yB, d], [s + hwB, yB, d]], 0.045, 5);
      if (k < nb) mb.tube([[s - hwB, yT, d], [s + hwB, yT, d2]], 0.035, 4);
    }

    if (REG && REG[nameReg]) {
      const r = REG[nameReg];
      md.mat(7);
      const bnC = gCfg.bannerColor ? gCfg.bannerColor.value : [1, 1, 1];
      const bnO = gCfg.bannerOffsets ? gCfg.bannerOffsets.value : [0.07, 0.1, 0.3];
      this.setColor(md, bnC[0], bnC[1], bnC[2]);
      md.quad(s - hwB - bnO[0], yB - bnO[1], dL + bnO[2], s - hwB - bnO[0], yB - bnO[1], dR - bnO[2], s - hwB - bnO[0], yT + bnO[1], dR - bnO[2], s - hwB - bnO[0], yT + bnO[1], dL + bnO[2], r[0], r[3], r[2], r[1]);
      md.quad(s + hwB + bnO[0], yB - bnO[1], dR - bnO[2], s + hwB + bnO[0], yB - bnO[1], dL + bnO[2], s + hwB + bnO[0], yT + bnO[1], dL + bnO[2], s + hwB + bnO[0], yT + bnO[1], dR - bnO[2], r[0], r[3], r[2], r[1]);
    }

    if (lights) {
      mb.mat(2, 153, 51);
      this.setColor(mb, 0.03, 0.03, 0.035);
      this.boxMinMax(mb, s - hwB - 0.45, s - hwB - 0.2, 5.0, 5.75, -2.6, 2.6);
      for (const d of [-2.6, 2.6]) mb.tube([[s - hwB - 0.32, 5.7, d * 0.9], [s - hwB, yB, d * 0.9]], 0.03, 4);
      this.boxMinMax(mb, s - hwB - 0.75, s - hwB - 0.45, 5.75, 5.8, -2.7, 2.7);
      mb.mat(2, 128, 128);
      this.setColor(mb, 0.7, 0.7, 0.68);
      this.boxMinMax(mb, s - hwB - 0.47, s - hwB - 0.45, 4.96, 5.0, -2.64, 2.64);
      for (const z of [-2.62, 2.62]) this.boxMinMax(mb, s - hwB - 0.47, s - hwB - 0.45, 5.0, 5.75, z - 0.02, z + 0.02);

      const rotZ = typeof m4rotZ === 'function' ? m4rotZ(m4(), Math.PI * 0.5) : new Float32Array(16);
      const lCnt = gCfg.lightCount ? gCfg.lightCount.value : 5;
      const lRowsY = gCfg.lightRowsY ? gCfg.lightRowsY.value : [5.2, 5.55];
      const lXOff = gCfg.lightXOffset ? gCfg.lightXOffset.value : 0.46;
      const lZ0 = gCfg.lightZStart ? gCfg.lightZStart.value : -2.0;
      const lHMat = gCfg.lightHousingMat ? gCfg.lightHousingMat.value : [2, 150, 60];
      const lHCol = gCfg.lightHousingColor ? gCfg.lightHousingColor.value : [0.02, 0.02, 0.022];
      const lCol = gCfg.lightColor ? gCfg.lightColor.value : [1.0, 0.02, 0.01];
      const lSegs = gCfg.lightSegs ? gCfg.lightSegs.value : 16;
      const lOut = gCfg.lightOuterCyl ? gCfg.lightOuterCyl.value : [0.185, 0.2, 0.195];
      const lIn = gCfg.lightInnerCyl ? gCfg.lightInnerCyl.value : [0.17, 0.2, 0.18];
      const lLens = gCfg.lightLensCyl ? gCfg.lightLensCyl.value : [0.165, 0.04, 0.145];
      for (let k = 0; k < lCnt; k++) {
        for (const y of lRowsY) {
          mb.push(typeof m4mul === 'function' ? m4mul(m4(), m4translate(mt, s - hwB - lXOff, y, lZ0 + k), rotZ) : mt);
          mb.mat(lHMat[0], lHMat[1], lHMat[2]);
          this.setColor(mb, lHCol[0], lHCol[1], lHCol[2]);
          mb.cyl(0, 0, 0, lOut[0], lOut[1], lOut[2], lSegs, false, false);
          mb.cyl(0, 0, 0, lIn[0], lIn[1], lIn[2], lSegs, false, false);
          mb.mat(18, 255, k + 1, 0);
          this.setColor(mb, lCol[0], lCol[1], lCol[2]);
          mb.cyl(0, 0, 0, lLens[0], lLens[1], lLens[2], lSegs, false, true);
          mb.pop();
        }
      }
    }

    if (!local) {
      if (typeof toStraight === 'function') {
        toStraight(mb, v0);
        toStraight(md, w0);
      }
      const cS1 = gCfg.cullS1 ? gCfg.cullS1.value : [3, 900];
      const cS2 = gCfg.cullS2 ? gCfg.cullS2.value : [5, 1500];
      if (S1) S1.add(mb, i0, cS1[0], cS1[1]);
      if (S2) S2.add(md, k0, cS2[0], cS2[1]);
    }
  },

  /**
   * 2. EDIFICIO OFICIAL DE BOXES Y TORRE DE CONTROL
   */
  createPitBuilding(ctx, config = {}) {
    const { mb, md, S1, S2, toStraight, TRK } = ctx;
    if (!mb || !md) return;

    const pit = (TRK && TRK.pit) ? TRK.pit : {};
    const u0 = config.s0 ?? (pit.bldS0 ?? -75);
    const u1 = config.s1 ?? (pit.bldS1 ?? 95);
    const vF = config.d0 ?? (pit.bldD0 ?? 22.8);
    const vB = config.d1 ?? (pit.bldD1 ?? 38.0);
    const nBay = config.nBays ?? 33;
    const bw = (u1 - u0) / nBay;
    const hG = config.hGarage ?? 4.2, hS = config.hFirstFloor ?? 5.2, hT = config.hTotal ?? 9.8;
    const v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni;
    const rnd = typeof config.rng === 'function' ? config.rng : Math.random;

    for (let b = 0; b < nBay; b++) {
      const a = u0 + b * bw, c = a + bw, closed = rnd() < 0.25;

      const pbCfg = ((typeof window !== 'undefined' && window.__CFG_PADDOCK) || PADDOCK_CFG).pitBuilding;
      const colC = pbCfg.columnColor.value;
      const colD = pbCfg.columnDims.value;
      mb.mat(3);
      this.setColor(mb, colC[0], colC[1], colC[2]);
      this.boxMinMax(mb, a - colD[0], a + colD[0], colD[1], hG, vF + colD[2], vF + colD[3]);
      if (b === nBay - 1) this.boxMinMax(mb, c - colD[0], c + colD[0], colD[1], hG, vF + colD[2], vF + colD[3]);

      const tCols = pbCfg.teamColors.value;
      const teamCol = tCols[b % tCols.length];
      const fDepth = pbCfg.fasciaDepth.value;
      mb.mat(pbCfg.fasciaMat.value);
      this.setColor(mb, teamCol[0], teamCol[1], teamCol[2]);
      this.boxMinMax(mb, a, c, hG, hS, vF + fDepth[0], vF + fDepth[1]);

      const dp = pbCfg.bayDepth.value;
      const bMarg = pbCfg.bayWallMargin.value;
      const x0 = a + bMarg, x1 = c - bMarg;
      const intC = pbCfg.interiorColor.value;
      mb.mat(pbCfg.interiorMat.value);
      this.setColor(mb, intC[0], intC[1], intC[2], intC[3]);
      mb.quad(x0, 0.02, vF + dp, x1, 0.02, vF + dp, x1, 0.02, vF, x0, 0.02, vF);
      mb.quad(x1, 0, vF + dp, x0, 0, vF + dp, x0, hG, vF + dp, x1, hG, vF + dp);
      mb.quad(x0, 0, vF + dp, x0, 0, vF, x0, hG, vF, x0, hG, vF + dp);
      mb.quad(x1, 0, vF, x1, 0, vF + dp, x1, hG, vF + dp, x1, hG, vF);

      if (!closed) {
        const cabM = pbCfg.cabinetMat.value;
        const cabS = pbCfg.cabinetColorScale.value;
        const cabB = pbCfg.cabinetBox.value;
        const tsC = pbCfg.tireStackColor.value;
        const tsCyl = pbCfg.tireStackCyl.value;
        mb.mat(cabM[0], cabM[1], cabM[2]);
        this.setColor(mb, teamCol[0] * cabS, teamCol[1] * cabS, teamCol[2] * cabS);
        this.boxMinMax(mb, x0 + cabB[0], x0 + cabB[1], cabB[2], cabB[3], vF + dp - cabB[4], vF + dp - cabB[5]);
        mb.mat(pbCfg.tireStackMat.value);
        this.setColor(mb, tsC[0], tsC[1], tsC[2]);
        mb.cyl(x1 - tsCyl[0], 0, vF + tsCyl[1], tsCyl[2], tsCyl[3], tsCyl[2], tsCyl[4], false, true);
      } else {
        const shC = pbCfg.shutterColor.value;
        const shO = pbCfg.shutterOffset.value;
        mb.mat(pbCfg.shutterMat.value);
        this.setColor(mb, shC[0], shC[1], shC[2]);
        mb.quad(x1, 0, vF + shO, x0, 0, vF + shO, x0, hG, vF + shO, x1, hG, vF + shO);
      }
    }

    // Planta superior y barandillas acristaladas
    const pbCfg = ((typeof window !== 'undefined' && window.__CFG_PADDOCK) || PADDOCK_CFG).pitBuilding;
    const pbSlabC = pbCfg.slabColor.value;
    const pbSlabT = pbCfg.slabThickness.value;
    const pbTerIn = pbCfg.terraceInset.value;
    const pbRailIn = pbCfg.railGlassInset.value;
    const pbRailTop = pbCfg.railTopOffset.value;
    const pbFacOff = pbCfg.facadeOffset.value;
    mb.mat(3);
    this.setColor(mb, pbSlabC[0], pbSlabC[1], pbSlabC[2]);
    this.boxMinMax(mb, u0, u1, hS, hS + pbSlabT, vF - pbTerIn, vB);
    mb.mat(5);
    this.setColor(mb, 1, 1, 1);
    mb.quad(u1, hS + pbSlabT, vF - pbRailIn, u0, hS + pbSlabT, vF - pbRailIn, u0, hS + pbRailTop, vF - pbRailIn, u1, hS + pbRailTop, vF - pbRailIn);
    mb.quad(u1, hS + pbSlabT, vF + pbFacOff, u0, hS + pbSlabT, vF + pbFacOff, u0, hT, vF + pbFacOff, u1, hT, vF + pbFacOff);

    // Torre de Control (Rennleitung)
    const ctCfg = ((typeof window !== 'undefined' && window.__CFG_PADDOCK) || PADDOCK_CFG).controlTower;
    const tu0 = u0 + ctCfg.u0Offset.value, tu1 = u0 + ctCfg.u1Offset.value, tv0 = vF + ctCfg.v0Offset.value, tv1 = vF + ctCfg.v1Offset.value;
    const ctCol = ctCfg.color.value, ctH = ctCfg.height.value, antC = ctCfg.antennaColor.value, antH = ctCfg.antennaHeight.value;
    mb.mat(3);
    this.setColor(mb, ctCol[0], ctCol[1], ctCol[2]);
    this.boxMinMax(mb, tu0, tu1, 0, ctH, tv0, tv1);
    mb.mat(5);
    this.setColor(mb, 1, 1, 1);
    mb.quad(tu1 + 1.2, 14.5, tv0 - 1.2, tu0 - 1.2, 14.5, tv0 - 1.2, tu0 - 1.2, 18.0, tv0 - 1.2, tu1 + 1.2, 18.0, tv0 - 1.2);
    mb.mat(1, 0, 0, 80);
    this.setColor(mb, antC[0], antC[1], antC[2]);
    mb.cyl((tu0 + tu1) * 0.5, ctH, (tv0 + tv1) * 0.5, 0.12, antH, 0.04, 6, false, true);

    if (typeof toStraight === 'function') {
      toStraight(mb, v0);
      toStraight(md, w0);
    }
    if (S1) S1.add(mb, i0, 7, 2600);
    if (S2) S2.add(md, k0, 7, 1200);
  },

  /**
   * 3. CAMIÓN TRANSPORTER DE PADDOCK
   */
  createPaddockTruck(ctx, config = {}) {
    const { mb } = ctx;
    if (!mb) return;

    const c = config.color || [0.08, 0.32, 0.75];
    const mt = typeof m4 === 'function' ? m4() : new Float32Array(16);
    const rotX = typeof m4rotX === 'function' ? m4rotX(m4(), Math.PI * 0.5) : new Float32Array(16);

    const trkCfg = (PADDOCK_CFG && PADDOCK_CFG.truck) || {};
    const tb = trkCfg.trailerBox ? trkCfg.trailerBox.value : [-6.5, 3.2, 1.25, 4.0, -1.25, 1.25];
    const cb = trkCfg.cabBox ? trkCfg.cabBox.value : [3.6, 5.9, 0.9, 3.3, -1.2, 1.2];
    const chb = trkCfg.chassisBox ? trkCfg.chassisBox.value : [-6.3, 5.6, 0.75, 1.25, -1.1, 1.1];
    const cabC = trkCfg.cabColor ? trkCfg.cabColor.value : [0.88, 0.88, 0.88];
    const chsC = trkCfg.chassisColor ? trkCfg.chassisColor.value : [0.08, 0.08, 0.09];
    const tireC = trkCfg.tireColor ? trkCfg.tireColor.value : [0.02, 0.02, 0.02];
    const wXs = trkCfg.wheelX ? trkCfg.wheelX.value : [-5.4, -4.2, 2.2, 4.9];
    const wZs = trkCfg.wheelZ ? trkCfg.wheelZ.value : [-1.22, 0.92];
    const wR = trkCfg.wheelRadius ? trkCfg.wheelRadius.value : 0.5;
    const wW = trkCfg.wheelWidth ? trkCfg.wheelWidth.value : 0.3;

    const bMat = trkCfg.bodyMat ? trkCfg.bodyMat.value : [2, 89, 51];
    mb.mat(bMat[0], bMat[1], bMat[2]);
    this.setColor(mb, c[0], c[1], c[2]);
    this.boxMinMax(mb, tb[0], tb[1], tb[2], tb[3], tb[4], tb[5]);

    this.setColor(mb, cabC[0], cabC[1], cabC[2]);
    this.boxMinMax(mb, cb[0], cb[1], cb[2], cb[3], cb[4], cb[5]);

    const ws = trkCfg.windshield ? trkCfg.windshield.value : [5.92, 2.0, 3.1, 1.1];
    const wsC = trkCfg.windshieldColor ? trkCfg.windshieldColor.value : [1, 1, 1];
    mb.mat(5);
    this.setColor(mb, wsC[0], wsC[1], wsC[2]);
    mb.quad(ws[0], ws[1], ws[3], ws[0], ws[1], -ws[3], ws[0], ws[2], -ws[3], ws[0], ws[2], ws[3], 0.2, 0.2, 1.5, 1.2);

    const chsMat = trkCfg.chassisMat ? trkCfg.chassisMat.value : [2, 153, 76];
    mb.mat(chsMat[0], chsMat[1], chsMat[2]);
    this.setColor(mb, chsC[0], chsC[1], chsC[2]);
    this.boxMinMax(mb, chb[0], chb[1], chb[2], chb[3], chb[4], chb[5]);

    const wSegs = trkCfg.wheelSegs ? trkCfg.wheelSegs.value : 12;
    mb.mat(4);
    this.setColor(mb, tireC[0], tireC[1], tireC[2]);
    for (const x of wXs) {
      for (const z of wZs) {
        if (typeof m4mul === 'function' && typeof m4translate === 'function') {
          mb.push(m4mul(m4(), m4translate(mt, x, wR, z), rotX));
          mb.cyl(0, 0, 0, wR, wW, wR, wSegs, true, true);
          mb.pop();
        }
      }
    }
  },

  /**
   * 4. CARPA DE HOSPITALIDAD DE PADDOCK
   */
  createPaddockTent(ctx, config = {}) {
    const { mb } = ctx;
    if (!mb) return;

    const c = config.color || [0.95, 0.95, 0.95];
    mb.mat(10);
    this.setColor(mb, c[0], c[1], c[2]);
    const tCfg = (PADDOCK_CFG && PADDOCK_CFG.tent) || {};
    const tHS = tCfg.halfSize ? tCfg.halfSize.value : 3.5;
    const tEH = tCfg.eaveHeight ? tCfg.eaveHeight.value : 2.5;
    const tPH = tCfg.peakHeight ? tCfg.peakHeight.value : 4.0;
    mb.quad(-tHS, tEH, tHS, tHS, tEH, tHS, 0, tPH, 0, 0, tPH, 0);
    mb.quad(tHS, tEH, tHS, tHS, tEH, -tHS, 0, tPH, 0, 0, tPH, 0);
    mb.quad(tHS, tEH, -tHS, -tHS, tEH, -tHS, 0, tPH, 0, 0, tPH, 0);
    mb.quad(-tHS, tEH, -tHS, -tHS, tEH, tHS, 0, tPH, 0, 0, tPH, 0);

    mb.mat(1, 0, 0, 80);
    this.setColor(mb, 1, 1, 1);
    const pOff = tCfg.poleOffset ? tCfg.poleOffset.value : 3.4;
    const pRad = tCfg.poleRadius ? tCfg.poleRadius.value : 0.05;
    for (const x of [-pOff, pOff]) {
      for (const z of [-pOff, pOff]) {
        mb.cyl(x, 0, z, pRad, tEH, pRad, 6, false, false);
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.PaddockProps = PaddockProps;
}
if (typeof globalThis !== 'undefined') {
  globalThis.PaddockProps = PaddockProps;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PaddockProps };
}
