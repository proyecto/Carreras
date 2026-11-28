'use strict';
/**
 * TrackSafetyProps - Sistemas de contención y seguridad en pista
 *
 * Incluye:
 * - createTecproBarrier: Barreras absorbedoras modulares Tecpro (rojo/blanco).
 * - createSausageKerbs: Bordillos disuasorios trapezoidales (sausage kerbs).
 * - createBrakeDistanceSigns: Carteles oficiales de distancia de frenada (200m..50m).
 * - createArmcoGuardrail: Guardarraíles metálicos Armco para escapatorias.
 * - createWallFence: Muros de hormigón con valla metálica (catch fencing).
 */

const TRACK_SAFETY_CFG = (typeof window !== 'undefined' && window.__CFG_ENGINE_PROPS_TRACK_SAFETY)
  || (typeof require === 'function' ? (() => { try { return require('../../config/engine/props/track-safety.json'); } catch { return {}; } })() : {});

const TrackSafetyProps = {
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
   * 1. BARRERAS ABSORBEDORAS TECPRO (F1 / FIA)
   */
  createTecproBarrier(ctx, config = {}) {
    const { mb, S1, P, getWallD } = ctx;
    if (!mb || typeof P !== 'function') return;

    const tpCfg = TRACK_SAFETY_CFG.createTecproBarrier || {};
    const sStart = config.sStart ?? 0;
    const sEnd = config.sEnd ?? 50;
    const side = config.side ?? 1;
    const offsetWall = config.offsetWall ?? (tpCfg.defaultOffsetWall ? tpCfg.defaultOffsetWall.value : 0.8);
    const bLen = config.blockLen ?? (tpCfg.defaultBlockLen ? tpCfg.defaultBlockLen.value : 1.6);
    const bH = config.blockHeight ?? (tpCfg.defaultBlockHeight ? tpCfg.defaultBlockHeight.value : 1.25);
    const bD = config.blockDepth ?? (tpCfg.defaultBlockDepth ? tpCfg.defaultBlockDepth.value : 0.65);
    const tpMat = tpCfg.mat ? tpCfg.mat.value : [2, 60, 40];
    const tpRed = tpCfg.redColor ? tpCfg.redColor.value : [0.88, 0.06, 0.06];
    const tpWht = tpCfg.whiteColor ? tpCfg.whiteColor.value : [0.95, 0.95, 0.95];

    const tpI0 = mb.ni;
    const nBlocks = Math.max(4, Math.round(Math.abs(sEnd - sStart) / bLen));
    const step = (sEnd - sStart) / nBlocks;

    for (let b = 0; b < nBlocks; b++) {
      const s0 = sStart + b * step, s1 = sStart + (b + 1) * step;
      const wallFn = typeof getWallD === 'function' ? getWallD : ((s, sd) => sd * 8.5);
      const d0 = wallFn(s0, side) - side * offsetWall;
      const d1 = wallFn(s1, side) - side * offsetWall;
      const p0 = P(s0, d0), p1 = P(s1, d1);

      const dx = p1[0] - p0[0], dz = p1[2] - p0[2];
      const segLen = Math.hypot(dx, dz);
      if (segLen < 1e-3) continue;

      const tx = dx / segLen, tz = dz / segLen;
      const inX = tz * side, inZ = -tx * side;
      const isRed = (b % 2 === 0);

      mb.mat(tpMat[0], tpMat[1], tpMat[2]);
      if (isRed) this.setColor(mb, tpRed[0], tpRed[1], tpRed[2]); else this.setColor(mb, tpWht[0], tpWht[1], tpWht[2]);

      const x0 = p0[0], y0 = p0[1], z0 = p0[2];
      const x1 = p1[0], y1 = p1[1], z1 = p1[2];
      const x0_t = x0, y0_t = y0 + bH, z0_t = z0;
      const x1_t = x1, y1_t = y1 + bH, z1_t = z1;
      const x0_b = x0 - inX * bD, y0_b = y0 + bH, z0_b = z0 - inZ * bD;
      const x1_b = x1 - inX * bD, y1_b = y1 + bH, z1_b = z1 - inZ * bD;

      if (side < 0) {
        mb.quad(x0, y0, z0, x1, y1, z1, x1_t, y1_t, z1_t, x0_t, y0_t, z0_t, 0, 0, segLen, bH);
        mb.quad(x0_t, y0_t, z0_t, x1_t, y1_t, z1_t, x1_b, y1_b, z1_b, x0_b, y0_b, z0_b, 0, 0, segLen, bD);
      } else {
        mb.quad(x1, y1, z1, x0, y0, z0, x0_t, y0_t, z0_t, x1_t, y1_t, z1_t, 0, 0, segLen, bH);
        mb.quad(x1_t, y1_t, z1_t, x0_t, y0_t, z0_t, x0_b, y0_b, z0_b, x1_b, y1_b, z1_b, 0, 0, segLen, bD);
      }
    }
    const tpCull = tpCfg.cullS1 ? tpCfg.cullS1.value : [3, 750];
    if (S1) S1.add(mb, tpI0, tpCull[0], tpCull[1]);
  },

  /**
   * 2. BORDILLOS DISUASORIOS (Sausage Kerbs)
   */
  createSausageKerbs(ctx, config = {}) {
    const { mb, S1, P, frame, TRK } = ctx;
    if (!mb || typeof P !== 'function') return;

    const skCfg = TRACK_SAFETY_CFG.createSausageKerbs || {};
    const hw = (TRK && TRK.hw) ? TRK.hw : (skCfg.defaultHalfWidth ? skCfg.defaultHalfWidth.value : 7.0);
    const kerbs = config.kerbs || [[4045, -1], [4095, 1]];
    const skI0 = mb.ni;
    const skOff = skCfg.offsetFromTrack ? skCfg.offsetFromTrack.value : 0.95;
    const skMat = skCfg.mat ? skCfg.mat.value : [2, 240, 0];
    const skCol = skCfg.color ? skCfg.color.value : [0.98, 0.85, 0.02];
    const skBox = skCfg.boxDims ? skCfg.boxDims.value : [-4.5, 4.5, 0.0, 0.075, -0.45, 0.45];

    for (const [sK, sideK] of kerbs) {
      if (typeof frame === 'function') {
        mb.push(frame(sK, sideK * (hw + skOff), 0, 0));
        mb.mat(skMat[0], skMat[1], skMat[2]);
        this.setColor(mb, skCol[0], skCol[1], skCol[2]);
        this.boxMinMax(mb, skBox[0], skBox[1], skBox[2], skBox[3], skBox[4], skBox[5]);
        mb.pop();
      }
    }
    const skCull = skCfg.cullS1 ? skCfg.cullS1.value : [7, 650];
    if (S1) S1.add(mb, skI0, skCull[0], skCull[1]);
  },

  /**
   * 3. CARTELES OFICIALES FIA DE DISTANCIA DE FRENADA (200m, 150m, 100m, 50m)
   */
  createBrakeDistanceSigns(ctx, config = {}) {
    const { mb, md, S1, S2, P, TRK } = ctx;
    if (!mb || !md || typeof P !== 'function') return;

    const brkCfg = TRACK_SAFETY_CFG.createBrakeDistanceSigns || {};
    const hw = (TRK && TRK.hw) ? TRK.hw : 7.0;
    const brkI0 = mb.ni, brkD0 = md.ni;
    const zones = config.zones || [];
    const distances = config.distances || (brkCfg.defaultDistances ? brkCfg.defaultDistances.value : [200, 150, 100, 50]);
    const latOff = brkCfg.lateralOffset ? brkCfg.lateralOffset.value : 2.4;
    const pMat = brkCfg.postMat ? brkCfg.postMat.value : 1;
    const pCol = brkCfg.postColor ? brkCfg.postColor.value : [0.76, 0.77, 0.80];
    const pCyl = brkCfg.postCyl ? brkCfg.postCyl.value : [0.07, 1.85, 6];
    const panD = brkCfg.panelDims ? brkCfg.panelDims.value : [0.65, 0.95, 0.85];
    const panMat = brkCfg.panelMat ? brkCfg.panelMat.value : [2, 240, 240];
    const panCol = brkCfg.panelColor ? brkCfg.panelColor.value : [0.96, 0.97, 0.98];
    const stMat = brkCfg.stripeMat ? brkCfg.stripeMat.value : 4;
    const stCol = brkCfg.stripeColor ? brkCfg.stripeColor.value : [0.08, 0.08, 0.10];
    const stH = brkCfg.stripeHeight ? brkCfg.stripeHeight.value : 0.08;

    for (const zone of zones) {
      const sApex = zone.sApex ?? zone.s ?? 0;
      const side = zone.side ?? -1;

      for (const dM of distances) {
        const sB = sApex - dM;
        const p = P(sB, side * (hw + latOff));
        const tx = p[3], tz = p[4];
        const inX = tz * side, inZ = -tx * side;
        const outX = -inX, outZ = -inZ;
        const x = p[0], y = p[1], z = p[2];

        // Mástil
        mb.mat(pMat);
        this.setColor(mb, pCol[0], pCol[1], pCol[2]);
        mb.cyl(x, y, z, pCyl[0], y + pCyl[1], pCyl[0], pCyl[2], true, true);

        // Panel de señal
        const bW = panD[0], bH = panD[1];
        const yB = y + panD[2];
        const pL_x = x - outX * bW, pL_z = z - outZ * bW;
        const pR_x = x + outX * bW, pR_z = z + outZ * bW;

        md.mat(panMat[0], panMat[1], panMat[2]);
        this.setColor(md, panCol[0], panCol[1], panCol[2]);
        md.quad(pL_x, yB, pL_z, pR_x, yB, pR_z, pR_x, yB + bH, pR_z, pL_x, yB + bH, pL_z);

        md.mat(stMat);
        this.setColor(md, stCol[0], stCol[1], stCol[2]);
        md.quad(pL_x, yB + bH - stH, pL_z, pR_x, yB + bH - stH, pR_z, pR_x, yB + bH, pR_z, pL_x, yB + bH, pL_z);
        md.quad(pL_x, yB, pL_z, pR_x, yB, pR_z, pR_x, yB + stH, pR_z, pL_x, yB + stH, pL_z);
      }
    }
    const brkCull = brkCfg.cull ? brkCfg.cull.value : [7, 1200];
    if (S1) S1.add(mb, brkI0, brkCull[0], brkCull[1]);
    if (S2) S2.add(md, brkD0, brkCull[0], brkCull[1]);
  },

  /**
   * 4. GUARDARRAÍL METÁLICO ARMCO BAJO PARA ESCAPATORIAS
   */
  createArmcoGuardrail(ctx, config = {}) {
    const { mb, S1, P, TRK } = ctx;
    if (!mb || typeof P !== 'function') return;

    const armCfg = TRACK_SAFETY_CFG.createArmcoGuardrail || {};
    const hw = (TRK && TRK.hw) ? TRK.hw : 7.0;
    const fiaI0 = mb.ni;
    const zones = config.zones || [];
    const segStep = armCfg.segStep ? armCfg.segStep.value : 5.0;
    const latOff = armCfg.lateralOffset ? armCfg.lateralOffset.value : 4.2;
    const aMat = armCfg.mat ? armCfg.mat.value : 1;
    const aCol = armCfg.color ? armCfg.color.value : [0.72, 0.74, 0.78];
    const rH = armCfg.railHeight ? armCfg.railHeight.value : 0.85;
    const pCyl = armCfg.postCyl ? armCfg.postCyl.value : [0.045, 0.95, 6];

    for (const [zS0, zS1, side] of zones) {
      const nSeg = Math.max(1, Math.round(Math.abs(zS1 - zS0) / segStep));
      for (let st = 0; st < nSeg; st++) {
        const s0 = zS0 + st * segStep, s1 = zS0 + (st + 1) * segStep;
        const d = side * (hw + latOff);
        const p0 = P(s0, d), p1 = P(s1, d);

        mb.mat(aMat);
        this.setColor(mb, aCol[0], aCol[1], aCol[2]);
        mb.quad(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p1[0], p1[1] + rH, p1[2], p0[0], p0[1] + rH, p0[2]);
        mb.cyl(p0[0], p0[1], p0[2], pCyl[0], p0[1] + pCyl[1], pCyl[0], pCyl[2], true, true);
      }
    }
    const aCull = armCfg.cullS1 ? armCfg.cullS1.value : [7, 1400];
    if (S1) S1.add(mb, fiaI0, aCull[0], aCull[1]);
  },

  /**
   * 5. MUROS Y VALLAS METÁLICAS DE CONTENCIÓN (Catch Fencing)
   */
  createWallFence(ctx, config = {}) {
    const { mb, fenceMB, S1, fenceR, P } = ctx;
    if (!mb || typeof P !== 'function') return;

    const wfCfg = TRACK_SAFETY_CFG.createWallFence || {};
    const s0 = config.s0 ?? 0;
    const s1 = config.s1 ?? 100;
    const d = config.d ?? 10.0;
    const faceSide = config.faceSide ?? 1;
    const hWall = config.hWall ?? (wfCfg.defaultHWall ? wfCfg.defaultHWall.value : 1.05);
    const hf = config.hf ?? (wfCfg.defaultHF ? wfCfg.defaultHF.value : 3.3);
    const stripe = config.stripe || null;

    const pStep = wfCfg.pathStep ? wfCfg.pathStep.value : 4;
    const path = [];
    for (let s = s0; s <= s1 + 0.01; s += pStep) path.push(P(s, d));
    const t = wfCfg.wallHalfThick ? wfCfg.wallHalfThick.value : 0.14, prof = [[-t, 0], [t, 0], [t, hWall], [-t, hWall]];
    const cSegs = wfCfg.chunkSegs ? wfCfg.chunkSegs.value : 12;
    const wMat = wfCfg.wallMat ? wfCfg.wallMat.value : 3;
    const wCol = wfCfg.wallColor ? wfCfg.wallColor.value : [0.52, 0.51, 0.49];
    const pCyl = wfCfg.postCyl ? wfCfg.postCyl.value : [0.035, 6];
    const tRad = wfCfg.tubeRadius ? wfCfg.tubeRadius.value : 0.02;
    const fRad = wfCfg.fenceRad ? wfCfg.fenceRad.value : 30;

    for (let k = 0; k < path.length - 1; k += cSegs) {
      const seg = path.slice(k, k + cSegs + 1), i0 = mb.ni;
      mb.mat(wMat);
      this.setColor(mb, wCol[0], wCol[1], wCol[2]);
      mb.sweep(seg.map(p => [p[0], p[1] - 0.25, p[2]]), prof.map(p => [p[0], p[1] + 0.25]), { closedProfile: true, hard: true });

      if (stripe) {
        mb.mat(2, 128, 0);
        this.setColor(mb, stripe[0], stripe[1], stripe[2]);
        mb.sweep(seg.map(p => [p[0], p[1] + hWall * 0.42, p[2]]), faceSide > 0 ? [[t + 0.004, 0], [t + 0.004, 0.3]] : [[-t - 0.004, 0.3], [-t - 0.004, 0]], {});
      }
      if (S1) S1.add(mb, i0, 3, 900);

      const p0 = mb.ni;
      mb.mat(11, 0, 0, 11);
      this.setColor(mb, 1, 1, 1);
      for (const p of seg.slice(0, cSegs)) mb.cyl(p[0], p[1] + hWall, p[2], pCyl[0], p[1] + hf, pCyl[0], pCyl[1], false, true);
      for (const hh of [hWall + 0.05, hf - 0.03]) mb.tube(seg.map(p => [p[0], p[1] + hh, p[2]]), tRad, 5);
      if (S1) S1.add(mb, p0, 1, 64);

      if (fenceMB) {
        const f0 = fenceMB.ni;
        let u = (k % 3) * 0.0;
        fenceMB.color((hf - hWall) / 25.5, 1, 1, 1);
        for (let q = 0; q < seg.length - 1; q++) {
          const a = seg[q], b = seg[q + 1], L = Math.hypot(b[0] - a[0], b[2] - a[2]);
          fenceMB.quad(a[0], a[1] + hWall, a[2], b[0], b[1] + hWall, b[2], b[0], b[1] + hf, b[2], a[0], a[1] + hf, a[2], u, 0, u + L, hf - hWall);
          u += L;
        }
        const m = seg[Math.floor(seg.length / 2)];
        if (fenceR) fenceR.push({ first: f0, count: fenceMB.ni - f0, x: m[0], y: m[1] + 2, z: m[2], rad: fRad });
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.TrackSafetyProps = TrackSafetyProps;
}
if (typeof globalThis !== 'undefined') {
  globalThis.TrackSafetyProps = TrackSafetyProps;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TrackSafetyProps };
}
