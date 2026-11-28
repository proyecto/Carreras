"use strict";
/**
 * GrandstandProps - Graderíos, tribunas escalonadas y estadios para público
 *
 * Incluye:
 * - createGrandstand: Grada/tribuna escalonada estándar con asientos, pasillos y marquesina.
 * - createMercedesArenaGrandstand: Gran graderío radial monumental Mercedes-Benz Arena con palcos VIP.
 */

let GRANDSTANDS_CFG = null;
if (typeof fetch === "function") {
  fetch(
    "config/grandstands.json" +
      (typeof window !== "undefined" && window.CACHE_VERSION
        ? "?v=" + window.CACHE_VERSION
        : ""),
  )
    .then((r) => r.json())
    .then((d) => {
      GRANDSTANDS_CFG = d;
    })
    .catch(() => {});
}

const GrandstandProps = {
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
   * 1. GRADA ESCALONADA (Haupttribüne / Grandstand Estándar)
   */
  createGrandstand(ctx, config = {}) {
    const { mb, md, mp, S1, S2, SP, toStraight, sign, CROWD, sitter, stander } =
      ctx;
    if (!mb || !md) return;

    const def = (GRANDSTANDS_CFG && GRANDSTANDS_CFG.standard) || {};
    const u0 = config.s0 ?? (def.s0 ? def.s0.value : -90),
      u1 = config.s1 ?? (def.s1 ? def.s1.value : 135),
      vF = config.d0 ?? (def.d0 ? def.d0.value : -15.5);
    const nRow = config.nRows ?? (def.nRows ? def.nRows.value : 22),
      run = config.run ?? (def.run ? def.run.value : 0.85),
      rise = config.rise ?? (def.rise ? def.rise.value : 0.42),
      yF = config.yF ?? (def.yF ? def.yF.value : 1.25);
    const vB = vF - 1.0 - nRow * run,
      yB = yF + nRow * rise;
    const nSec = config.nSec ?? (def.nSec ? def.nSec.value : 6),
      aisle = config.aisle ?? (def.aisle ? def.aisle.value : 2.4);
    const secW = (u1 - u0 - (nSec + 1) * aisle) / nSec;
    const seatCols =
      config.seatColors ||
      (def.seatColors
        ? def.seatColors.value
        : [
            [0.78, 0.12, 0.12],
            [0.94, 0.94, 0.95],
          ]);
    const seatCfg = (GRANDSTANDS_CFG && GRANDSTANDS_CFG.seat) || {};
    const sH = seatCfg.height ? seatCfg.height.value : 0.38;
    const sF = seatCfg.frontOffset ? seatCfg.frontOffset.value : 0.22;
    const sB = seatCfg.backOffset ? seatCfg.backOffset.value : 0.72;
    const sBY = seatCfg.backTopY ? seatCfg.backTopY.value : 0.82;
    const sBZ = seatCfg.backTopZ ? seatCfg.backTopZ.value : 0.74;
    const matCfg = (GRANDSTANDS_CFG && GRANDSTANDS_CFG.materials) || {};
    const crdCfg = (GRANDSTANDS_CFG && GRANDSTANDS_CFG.crowd) || {};
    const cConc = matCfg.concrete ? matCfg.concrete.value : [0.52, 0.53, 0.54];
    const cStair = matCfg.stairs
      ? matCfg.stairs.value
      : [0.65, 0.65, 0.66, 0.9];
    const cRail = matCfg.handrail ? matCfg.handrail.value : [0.8, 0.8, 0.82];
    const cWall = matCfg.frontWall ? matCfg.frontWall.value : [0.6, 0.6, 0.62];
    const crBase = crdCfg.baseOcc ? crdCfg.baseOcc.value : 0.75;
    const crWave = crdCfg.waveOcc ? crdCfg.waveOcc.value : 0.2;
    const crStep = crdCfg.spacing ? crdCfg.spacing.value : 0.55;
    const crStand = crdCfg.standProb ? crdCfg.standProb.value : 0.12;
    const crDist = crdCfg.maxDist ? crdCfg.maxDist.value : 950;
    const crDefCol = crdCfg.defaultColor
      ? crdCfg.defaultColor.value
      : [0.85, 0.2, 0.1];
    const sponsors = crdCfg.sponsors
      ? crdCfg.sponsors.value
      : ["name", "b0", "b5", "b2", "b7", "name"];
    const rnd = typeof config.rng === "function" ? config.rng : Math.random;

    for (let sec = 0; sec < nSec; sec++) {
      const a = u0 + aisle + sec * (secW + aisle),
        c = a + secW;
      const v0 = mb.nv,
        i0 = mb.ni,
        w0 = md.nv,
        k0 = md.ni;

      // Huellas y contrahuellas de hormigón
      for (let r = 0; r < nRow; r++) {
        const v = vF - 1.0 - r * run,
          y = yF + r * rise,
          ao = 1.0 - 0.35 * (r / nRow);
        mb.mat(3);
        this.setColor(mb, cConc[0], cConc[1], cConc[2], ao);
        mb.quad(a, y, v, c, y, v, c, y + rise, v, a, y + rise, v);
        mb.quad(
          a,
          y + rise,
          v,
          c,
          y + rise,
          v,
          c,
          y + rise,
          v - run,
          a,
          y + rise,
          v - run,
        );

        const sTone = seatCols[(sec + r) % seatCols.length];
        md.mat(8);
        this.setColor(md, sTone[0], sTone[1], sTone[2], ao);
        md.quad(
          a,
          y + rise + sH,
          v - sF,
          c,
          y + rise + sH,
          v - sF,
          c,
          y + rise + sH,
          v - sB,
          a,
          y + rise + sH,
          v - sB,
          0,
          0,
          c - a,
          sB - sF,
        );
        md.quad(
          a,
          y + rise + sH,
          v - sB,
          c,
          y + rise + sH,
          v - sB,
          c,
          y + rise + sBY,
          v - sBZ,
          a,
          y + rise + sBY,
          v - sBZ,
          0,
          0,
          c - a,
          sBY - sH,
        );
      }

      // Público en las gradas
      if (
        mp &&
        SP &&
        typeof sitter === "function" &&
        config.withCrowd !== false
      ) {
        const pv0 = mp.nv,
          pi0 = mp.ni;
        const crMargin = crdCfg.marginX ? crdCfg.marginX.value : 0.4;
        const crJitter = crdCfg.standJitter ? crdCfg.standJitter.value : 0.2;
        const crStY = crdCfg.standYOffset ? crdCfg.standYOffset.value : 0.05;
        const crStZ = crdCfg.standZOffset ? crdCfg.standZOffset.value : 0.45;
        const crScale = crdCfg.scale ? crdCfg.scale.value : 0.95;
        for (let r = 0; r < nRow; r++) {
          const v = vF - 1.0 - r * run,
            y = yF + r * rise;
          const occ =
            crBase + crWave * Math.sin(((r + 1) / (nRow + 1)) * Math.PI);
          for (let x = a + crMargin; x < c - crMargin; x += crStep) {
            if (rnd() < occ) {
              const crowdColor =
                CROWD && CROWD.length
                  ? CROWD[Math.floor(rnd() * CROWD.length)]
                  : crDefCol;
              if (rnd() < crStand && typeof stander === "function") {
                stander(
                  x + (rnd() - 0.5) * crJitter,
                  y + rise + crStY,
                  v - crStZ,
                  crowdColor,
                  crScale,
                );
              } else {
                sitter(x, y + rise + sH, v - sB, crScale);
              }
            }
          }
        }
        if (typeof toStraight === "function") toStraight(mp, pv0);
        SP.add(mp, pi0, 1, crDist);
      }

      // Escaleras laterales de acceso
      for (const [x0, x1] of sec === 0
        ? [
            [a - aisle, a],
            [c, c + aisle],
          ]
        : [[c, c + aisle]]) {
        mb.mat(3);
        this.setColor(mb, cStair[0], cStair[1], cStair[2], cStair[3]);
        for (let r = 0; r < nRow; r++) {
          const v = vF - 1.0 - r * run,
            y = yF + r * rise;
          mb.quad(x0, y, v, x1, y, v, x1, y + rise, v, x0, y + rise, v);
          mb.quad(
            x0,
            y + rise,
            v,
            x1,
            y + rise,
            v,
            x1,
            y + rise,
            v - run,
            x0,
            y + rise,
            v - run,
          );
        }
        mb.mat(2, 102, 153);
        this.setColor(mb, cRail[0], cRail[1], cRail[2]);
        const railCfg = (GRANDSTANDS_CFG && GRANDSTANDS_CFG.handrail) || {};
        const rH = railCfg.height ? railCfg.height.value : 0.95;
        const rRad = railCfg.radius ? railCfg.radius.value : 0.035;
        const rSeg = railCfg.segments ? railCfg.segments.value : 5;
        mb.tube(
          [
            [(x0 + x1) / 2, yF + rH, vF - 1.0],
            [(x0 + x1) / 2, yB + rH, vB],
          ],
          rRad,
          rSeg,
        );
      }

      // Murete frontal con rótulo de patrocinio
      const ea = sec === 0 ? u0 : a - aisle / 2,
        ec = sec === nSec - 1 ? u1 : c + aisle / 2;
      mb.mat(3);
      this.setColor(mb, cWall[0], cWall[1], cWall[2]);
      const fwCfg = (GRANDSTANDS_CFG && GRANDSTANDS_CFG.frontWall) || {};
      const fwBaseY = fwCfg.baseY ? fwCfg.baseY.value : -0.5;
      const fwTop = fwCfg.topOffset ? fwCfg.topOffset.value : 0.9;
      const fwBack = fwCfg.backOffset ? fwCfg.backOffset.value : 1.0;
      const fwFront = fwCfg.frontOffset ? fwCfg.frontOffset.value : 0.75;
      this.boxMinMax(
        mb,
        ea,
        ec,
        fwBaseY,
        yF + fwTop,
        vF - fwBack,
        vF - fwFront,
      );
      if (typeof sign === "function") {
        const nm = sponsors[sec % sponsors.length];
        sign(md, ea + 2, 0.25, vF - 0.73, ec - ea - 4, 0, 0, 1.4, nm);
      }

      // Pared trasera
      const bwCfg = (GRANDSTANDS_CFG && GRANDSTANDS_CFG.backWall) || {};
      const bwCol = bwCfg.color ? bwCfg.color.value : [0.48, 0.48, 0.5];
      const bwH = bwCfg.height ? bwCfg.height.value : 5.8;
      const bwT = bwCfg.thickness ? bwCfg.thickness.value : 0.3;
      mb.mat(3);
      this.setColor(mb, bwCol[0], bwCol[1], bwCol[2]);
      mb.quad(
        ec,
        fwBaseY,
        vB - bwT,
        ea,
        fwBaseY,
        vB - bwT,
        ea,
        yB + bwH,
        vB - bwT,
        ec,
        yB + bwH,
        vB - bwT,
      );
      mb.quad(ea, yB, vB, ec, yB, vB, ec, yB + bwH, vB, ea, yB + bwH, vB);

      // Marquesina superior en voladizo
      const cpCfg = (GRANDSTANDS_CFG && GRANDSTANDS_CFG.canopy) || {};
      const cpMaxD = cpCfg.maxDist ? cpCfg.maxDist.value : 2400;
      if (config.withRoof !== false) {
        const cpBackH = cpCfg.backHeight ? cpCfg.backHeight.value : 6.0;
        const cpFrontH = cpCfg.frontHeight ? cpCfg.frontHeight.value : 3.8;
        const cpInset = cpCfg.frontInset ? cpCfg.frontInset.value : 0.2;
        const cpOver = cpCfg.backOverhang ? cpCfg.backOverhang.value : 0.8;
        const cpRoofC = cpCfg.roofColor
          ? cpCfg.roofColor.value
          : [0.72, 0.74, 0.76];
        const cpSteelC = cpCfg.steelColor
          ? cpCfg.steelColor.value
          : [0.22, 0.24, 0.26];
        const yr0 = yB + cpBackH,
          yr1 = yB + cpFrontH,
          vr1 = vF - cpInset;
        md.mat(9);
        this.setColor(md, cpRoofC[0], cpRoofC[1], cpRoofC[2]);
        md.quad(
          ec,
          yr0,
          vB - cpOver,
          ea,
          yr0,
          vB - cpOver,
          ea,
          yr1,
          vr1,
          ec,
          yr1,
          vr1,
          0,
          0,
          ec - ea,
          vr1 - vB + cpOver,
        );

        mb.mat(2, 128, 128);
        this.setColor(mb, cpSteelC[0], cpSteelC[1], cpSteelC[2]);
        for (const x of [ea + 0.4, (ea + ec) / 2, ec - 0.4]) {
          this.boxMinMax(
            mb,
            x - 0.22,
            x + 0.22,
            fwBaseY,
            yr0 - 0.1,
            vB - bwT,
            vB + 0.15,
          );
          const bm = mb.nv;
          this.boxMinMax(mb, x - 0.12, x + 0.12, fwBaseY, 0.0, 0, 1);
          for (let q = bm; q < mb.nv; q++) {
            const t = mb.f32[q * 9 + 2],
              top = mb.f32[q * 9 + 1] > -0.25;
            mb.f32[q * 9 + 2] = vB - bwT + (vr1 - vB) * t;
            mb.f32[q * 9 + 1] =
              yr0 + (yr1 - yr0) * t - (top ? 0.06 : 0.95 - 0.65 * t);
          }
        }
      }

      if (typeof toStraight === "function") {
        toStraight(mb, v0);
        toStraight(md, w0);
      }
      if (S1) S1.add(mb, i0, 7, cpMaxD);
      if (S2) S2.add(md, k0, 7, cpMaxD);
    }
  },

  /**
   * 2. GRADA MONUMENTAL MERCEDES-ARENA (Radial con palcos VIP y cubierta en voladizo)
   */
  createMercedesArenaGrandstand(ctx, config = {}) {
    const { mb, md, mp, S1, S2, SP, P, CROWD, sitter, stander } = ctx;
    if (!mb || !md || typeof P !== "function") return;

    const maCfg = (GRANDSTANDS_CFG && GRANDSTANDS_CFG.mercedesArena) || {};
    const arenaS0 = config.s0 ?? (maCfg.s0 ? maCfg.s0.value : 865),
      arenaS1 = config.s1 ?? (maCfg.s1 ? maCfg.s1.value : 1055);
    const dS_arena = config.step ?? (maCfg.step ? maCfg.step.value : 5.5);
    const nS_arena = Math.round((arenaS1 - arenaS0) / dS_arena);
    const colSeatMercedesBlue = maCfg.seatBlue
      ? maCfg.seatBlue.value
      : [0.06, 0.28, 0.76];
    const colFasciaBlack = maCfg.fasciaBlack
      ? maCfg.fasciaBlack.value
      : [0.08, 0.08, 0.1];
    const colRoofWhite = maCfg.roofWhite
      ? maCfg.roofWhite.value
      : [0.93, 0.94, 0.96];
    const colSteelDark = maCfg.steelDark
      ? maCfg.steelDark.value
      : [0.18, 0.2, 0.24];
    const colChrome = maCfg.chrome ? maCfg.chrome.value : [0.95, 0.96, 0.98];
    const rnd = typeof config.rng === "function" ? config.rng : Math.random;

    let mbI0 = mb.ni,
      mdI0 = md.ni,
      mpI0 = mp ? mp.ni : 0;

    for (let seg = 0; seg < nS_arena; seg++) {
      const sA = arenaS0 + seg * dS_arena,
        sB = arenaS0 + (seg + 1) * dS_arena;
      const isAisle = seg % 5 === 0;

      const pA_base = P(sA, -25.0),
        pB_base = P(sB, -25.0);
      const yBaseA = pA_base[1],
        yBaseB = pB_base[1];

      // Muro frontal blanco bajo con valla de seguridad FIA transparente
      {
        const fiaD = maCfg.fiaWallD ? maCfg.fiaWallD.value : -24.8;
        const fiaH = maCfg.fiaWallHeight ? maCfg.fiaWallHeight.value : 0.85;
        const fiaWC = maCfg.fiaWallColor
          ? maCfg.fiaWallColor.value
          : [0.94, 0.95, 0.96];
        const fiaSC = maCfg.fiaStripeColor
          ? maCfg.fiaStripeColor.value
          : [0.08, 0.25, 0.65];
        const fiaFC = maCfg.fiaFenceColor
          ? maCfg.fiaFenceColor.value
          : [0.72, 0.74, 0.78];
        const fiaTop = maCfg.fiaFenceTop ? maCfg.fiaFenceTop.value : 2.5;
        const fiaCables = maCfg.fiaCableHeights
          ? maCfg.fiaCableHeights.value
          : [1.45, 1.95, 2.45];
        const pA_w = P(sA, fiaD),
          pB_w = P(sB, fiaD);
        mb.mat(3);
        this.setColor(mb, fiaWC[0], fiaWC[1], fiaWC[2]);
        mb.quad(
          pA_w[0],
          yBaseA,
          pA_w[2],
          pB_w[0],
          yBaseB,
          pB_w[2],
          pB_w[0],
          yBaseB + fiaH,
          pB_w[2],
          pA_w[0],
          yBaseA + fiaH,
          pA_w[2],
        );
        md.mat(2, 240, 240);
        this.setColor(md, fiaSC[0], fiaSC[1], fiaSC[2]);
        md.quad(
          pA_w[0],
          yBaseA + 0.12,
          pA_w[2],
          pB_w[0],
          yBaseB + 0.12,
          pB_w[2],
          pB_w[0],
          yBaseB + fiaH - 0.13,
          pB_w[2],
          pA_w[0],
          yBaseA + fiaH - 0.13,
          pA_w[2],
        );

        mb.mat(1);
        this.setColor(mb, fiaFC[0], fiaFC[1], fiaFC[2]);
        mb.cyl(
          pA_w[0],
          yBaseA + fiaH,
          pA_w[2],
          0.04,
          yBaseA + fiaTop,
          0.035,
          5,
          true,
          true,
        );
        for (const ch of fiaCables) {
          mb.tube(
            [
              [pA_w[0], yBaseA + ch, pA_w[2]],
              [pB_w[0], yBaseB + ch, pB_w[2]],
            ],
            0.009,
            3,
          );
        }
      }

      // Graderío inferior (Lower Bowl): 10 filas
      const nLowRows = 10,
        lowRun = 0.88,
        lowRise = 0.42;
      for (let r = 0; r < nLowRows; r++) {
        const dFront = -(25.2 + r * lowRun),
          dBack = -(25.2 + (r + 1) * lowRun);
        const y0A = yBaseA + r * lowRise,
          y1A = y0A + lowRise;
        const y0B = yBaseB + r * lowRise,
          y1B = y0B + lowRise;

        const pA_f = P(sA, dFront),
          pB_f = P(sB, dFront);
        const pA_b = P(sA, dBack),
          pB_b = P(sB, dBack);

        mb.mat(3);
        this.setColor(mb, 0.62, 0.63, 0.65, 1.0 - 0.2 * (r / nLowRows));
        mb.quad(
          pA_f[0],
          y0A,
          pA_f[2],
          pB_f[0],
          y0B,
          pB_f[2],
          pB_f[0],
          y1B,
          pB_f[2],
          pA_f[0],
          y1A,
          pA_f[2],
        );
        mb.quad(
          pA_f[0],
          y1A,
          pA_f[2],
          pB_f[0],
          y1B,
          pB_f[2],
          pB_b[0],
          y1B,
          pB_b[2],
          pA_b[0],
          y1A,
          pA_b[2],
        );

        if (!isAisle) {
          md.mat(8);
          this.setColor(
            md,
            colSeatMercedesBlue[0],
            colSeatMercedesBlue[1],
            colSeatMercedesBlue[2],
          );
          const pA_sf = P(sA, dFront - 0.12),
            pB_sf = P(sB, dFront - 0.12);
          const pA_sb = P(sA, dBack + 0.12),
            pB_sb = P(sB, dBack + 0.12);
          md.quad(
            pA_sf[0],
            y1A + 0.35,
            pA_sf[2],
            pB_sf[0],
            y1B + 0.35,
            pB_sf[2],
            pB_sb[0],
            y1B + 0.35,
            pB_sb[2],
            pA_sb[0],
            y1A + 0.35,
            pA_sb[2],
          );
          md.quad(
            pA_sb[0],
            y1A + 0.35,
            pA_sb[2],
            pB_sb[0],
            y1B + 0.35,
            pB_sb[2],
            pB_sb[0],
            y1B + 0.75,
            pB_sb[2],
            pA_sb[0],
            y1A + 0.75,
            pA_sb[2],
          );

          if (mp && SP && typeof sitter === "function" && rnd() < 0.72) {
            const pMid_s = P((sA + sB) * 0.5, (dFront + dBack) * 0.5);
            const yMid = (y1A + y1B) * 0.5;
            const crowdColor =
              CROWD && CROWD.length
                ? CROWD[Math.floor(rnd() * CROWD.length)]
                : [0.8, 0.2, 0.2];
            if (rnd() < 0.18 && typeof stander === "function") {
              stander(pMid_s[0], yMid + 0.05, pMid_s[2], crowdColor, 0.95);
            } else {
              sitter(pMid_s[0], yMid + 0.35, pMid_s[2], 0.95);
            }
          }
        }
      }

      // Balcón y Fascia intermedia VIP
      const dMidFront = -(25.2 + nLowRows * lowRun);
      const dMidBack = dMidFront - 3.2;
      const yMidBotA = yBaseA + nLowRows * lowRise,
        yMidBotB = yBaseB + nLowRows * lowRise;
      const yMidTopA = yMidBotA + 3.8,
        yMidTopB = yMidBotB + 3.8;

      const pA_mf = P(sA, dMidFront),
        pB_mf = P(sB, dMidFront);
      const pA_mb = P(sA, dMidBack),
        pB_mb = P(sB, dMidBack);

      mb.mat(2, 40, 30);
      this.setColor(
        mb,
        colFasciaBlack[0],
        colFasciaBlack[1],
        colFasciaBlack[2],
      );
      mb.quad(
        pA_mf[0],
        yMidBotA,
        pA_mf[2],
        pB_mf[0],
        yMidBotB,
        pB_mf[2],
        pB_mf[0],
        yMidBotB + 1.25,
        pB_mf[2],
        pA_mf[0],
        yMidBotA + 1.25,
        pA_mf[2],
      );

      // Ventanales VIP
      mb.mat(5);
      this.setColor(mb, 1, 1, 1);
      mb.quad(
        pA_mf[0],
        yMidBotA + 1.25,
        pA_mf[2],
        pB_mf[0],
        yMidBotB + 1.25,
        pB_mf[2],
        pB_mf[0],
        yMidTopB,
        pB_mf[2],
        pA_mf[0],
        yMidTopA,
        pA_mf[2],
      );

      // Graderío superior (Upper Bowl): 12 filas
      const nUpRows = 12,
        upRun = 0.85,
        upRise = 0.52;
      for (let r = 0; r < nUpRows; r++) {
        const dFront = dMidBack - r * upRun,
          dBack = dMidBack - (r + 1) * upRun;
        const y0A = yMidTopA + r * upRise,
          y1A = y0A + upRise;
        const y0B = yMidTopB + r * upRise,
          y1B = y0B + upRise;

        const pA_uf = P(sA, dFront),
          pB_uf = P(sB, dFront);
        const pA_ub = P(sA, dBack),
          pB_ub = P(sB, dBack);

        mb.mat(3);
        const cConcLight =
          GRANDSTANDS_CFG &&
          GRANDSTANDS_CFG.materials &&
          GRANDSTANDS_CFG.materials.concreteLight
            ? GRANDSTANDS_CFG.materials.concreteLight.value
            : [0.58, 0.59, 0.61];
        this.setColor(mb, cConcLight[0], cConcLight[1], cConcLight[2]);
        mb.quad(
          pA_uf[0],
          y0A,
          pA_uf[2],
          pB_uf[0],
          y0B,
          pB_uf[2],
          pB_uf[0],
          y1B,
          pB_uf[2],
          pA_uf[0],
          y1A,
          pA_uf[2],
        );
        mb.quad(
          pA_uf[0],
          y1A,
          pA_uf[2],
          pB_uf[0],
          y1B,
          pB_uf[2],
          pB_ub[0],
          y1B,
          pB_ub[2],
          pA_ub[0],
          y1A,
          pA_ub[2],
        );

        if (!isAisle) {
          md.mat(8);
          this.setColor(
            md,
            colSeatMercedesBlue[0],
            colSeatMercedesBlue[1],
            colSeatMercedesBlue[2],
          );
          const pA_sf = P(sA, dFront - 0.12),
            pB_sf = P(sB, dFront - 0.12);
          const pA_sb = P(sA, dBack + 0.12),
            pB_sb = P(sB, dBack + 0.12);
          md.quad(
            pA_sf[0],
            y1A + 0.35,
            pA_sf[2],
            pB_sf[0],
            y1B + 0.35,
            pB_sf[2],
            pB_sb[0],
            y1B + 0.35,
            pB_sb[2],
            pA_sb[0],
            y1A + 0.35,
            pA_sb[2],
          );
          md.quad(
            pA_sb[0],
            y1A + 0.35,
            pA_sb[2],
            pB_sb[0],
            y1B + 0.35,
            pB_sb[2],
            pB_sb[0],
            y1B + 0.75,
            pB_sb[2],
            pA_sb[0],
            y1A + 0.75,
            pA_sb[2],
          );
        }
      }

      // Cubierta en voladizo (cantilever canopy)
      const maOver = maCfg.roofOverhang ? maCfg.roofOverhang.value : 1.5;
      const maBackH = maCfg.roofBackHeight ? maCfg.roofBackHeight.value : 6.8;
      const maDrop = maCfg.roofDrop ? maCfg.roofDrop.value : 3.2;
      const dRoofBack = dMidBack - nUpRows * upRun - maOver;
      const dRoofTip = -(25.0 - maOver);
      const yRoofBackA = yMidTopA + nUpRows * upRise + maBackH;
      const yRoofBackB = yMidTopB + nUpRows * upRise + maBackH;
      const yRoofTipA = yRoofBackA - maDrop;
      const yRoofTipB = yRoofBackB - maDrop;

      const pA_rb = P(sA, dRoofBack),
        pB_rb = P(sB, dRoofBack);
      const pA_rt = P(sA, dRoofTip),
        pB_rt = P(sB, dRoofTip);

      md.mat(9);
      this.setColor(md, colRoofWhite[0], colRoofWhite[1], colRoofWhite[2]);
      md.quad(
        pA_rb[0],
        yRoofBackA,
        pA_rb[2],
        pB_rb[0],
        yRoofBackB,
        pB_rb[2],
        pB_rt[0],
        yRoofTipB,
        pB_rt[2],
        pA_rt[0],
        yRoofTipA,
        pA_rt[2],
      );

      // Vigas y columnas en V
      mb.mat(2, 120, 140);
      this.setColor(mb, colSteelDark[0], colSteelDark[1], colSteelDark[2]);
      const beamDrop = maCfg.beamDrop ? maCfg.beamDrop.value : 0.25;
      const beamR = maCfg.beamRadius ? maCfg.beamRadius.value : 0.16;
      const pilBaseR = maCfg.pillarBaseR ? maCfg.pillarBaseR.value : 0.38;
      const pilTopR = maCfg.pillarTopR ? maCfg.pillarTopR.value : 0.32;
      mb.tube(
        [
          [pA_rb[0], yRoofBackA - beamDrop, pA_rb[2]],
          [pA_rt[0], yRoofTipA - beamDrop, pA_rt[2]],
        ],
        beamR,
        6,
      );
      mb.cyl(
        pA_rb[0],
        yBaseA,
        pA_rb[2],
        pilBaseR,
        yRoofBackA,
        pilTopR,
        10,
        true,
        true,
      );
    }

    // Estrella monumental de Mercedes-Benz 3D en la cima central
    {
      const sCenter = (arenaS0 + arenaS1) * 0.5;
      const dRoofBackC = maCfg.starD ? maCfg.starD.value : -48.0;
      const pCenter = P(sCenter, dRoofBackC);
      const yStarCenter =
        pCenter[1] + (maCfg.starHeight ? maCfg.starHeight.value : 25.5);

      mb.mat(1);
      this.setColor(mb, colChrome[0], colChrome[1], colChrome[2]);
      const rRing = maCfg.starRadius ? maCfg.starRadius.value : 4.2;
      const nRingPts = maCfg.starSegments ? maCfg.starSegments.value : 24;
      const ringTubeR = maCfg.starRingRadius
        ? maCfg.starRingRadius.value
        : 0.14;
      const armTubeR = maCfg.starArmRadius ? maCfg.starArmRadius.value : 0.18;
      const ringPts = [];
      for (let i = 0; i <= nRingPts; i++) {
        const ang = (i / nRingPts) * Math.PI * 2;
        ringPts.push([
          pCenter[0],
          yStarCenter + Math.sin(ang) * rRing,
          pCenter[2] + Math.cos(ang) * rRing,
        ]);
      }
      mb.tube(ringPts, ringTubeR, 8);

      for (let arm = 0; arm < 3; arm++) {
        const ang = arm * ((Math.PI * 2) / 3) + Math.PI * 0.5;
        const tipX = pCenter[0],
          tipY = yStarCenter + Math.sin(ang) * (rRing - 0.15),
          tipZ = pCenter[2] + Math.cos(ang) * (rRing - 0.15);
        mb.tube(
          [
            [pCenter[0], yStarCenter, pCenter[2]],
            [tipX, tipY, tipZ],
          ],
          armTubeR,
          6,
        );
      }
    }

    const maMaxD = maCfg.maxDist ? maCfg.maxDist.value : 2600;
    const maCrowdD = maCfg.crowdMaxDist ? maCfg.crowdMaxDist.value : 1400;
    if (S1 && mb.ni > mbI0) S1.add(mb, mbI0, 7, maMaxD);
    if (S2 && md.ni > mdI0) S2.add(md, mdI0, 7, maMaxD);
    if (mp && SP && mp.ni > mpI0) SP.add(mp, mpI0, 1, maCrowdD);
  },
};

if (typeof window !== "undefined") {
  window.GrandstandProps = GrandstandProps;
}
if (typeof globalThis !== "undefined") {
  globalThis.GrandstandProps = GrandstandProps;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GrandstandProps };
}
