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

    const sStart = config.sStart ?? 0;
    const sEnd = config.sEnd ?? 50;
    const side = config.side ?? 1;
    const offsetWall = config.offsetWall ?? 0.8;
    const bLen = config.blockLen ?? 1.6, bH = config.blockHeight ?? 1.25, bD = config.blockDepth ?? 0.65;

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

      mb.mat(2, 60, 40);
      if (isRed) this.setColor(mb, 0.88, 0.06, 0.06); else this.setColor(mb, 0.95, 0.95, 0.95);

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
    if (S1) S1.add(mb, tpI0, 3, 750);
  },

  /**
   * 2. BORDILLOS DISUASORIOS (Sausage Kerbs)
   */
  createSausageKerbs(ctx, config = {}) {
    const { mb, S1, P, frame, TRK } = ctx;
    if (!mb || typeof P !== 'function') return;

    const hw = (TRK && TRK.hw) ? TRK.hw : 7.0;
    const kerbs = config.kerbs || [[4045, -1], [4095, 1]];
    const skI0 = mb.ni;

    for (const [sK, sideK] of kerbs) {
      if (typeof frame === 'function') {
        mb.push(frame(sK, sideK * (hw + 0.95), 0, 0));
        mb.mat(2, 240, 0);
        this.setColor(mb, 0.98, 0.85, 0.02);
        this.boxMinMax(mb, -4.5, 4.5, 0.0, 0.075, -0.45, 0.45);
        mb.pop();
      }
    }
    if (S1) S1.add(mb, skI0, 7, 650);
  },

  /**
   * 3. CARTELES OFICIALES FIA DE DISTANCIA DE FRENADA (200m, 150m, 100m, 50m)
   */
  createBrakeDistanceSigns(ctx, config = {}) {
    const { mb, md, S1, S2, P, TRK } = ctx;
    if (!mb || !md || typeof P !== 'function') return;

    const hw = (TRK && TRK.hw) ? TRK.hw : 7.0;
    const brkI0 = mb.ni, brkD0 = md.ni;
    const zones = config.zones || [];
    const distances = config.distances || [200, 150, 100, 50];

    for (const zone of zones) {
      const sApex = zone.sApex ?? zone.s ?? 0;
      const side = zone.side ?? -1;

      for (const dM of distances) {
        const sB = sApex - dM;
        const p = P(sB, side * (hw + 2.4));
        const tx = p[3], tz = p[4];
        const inX = tz * side, inZ = -tx * side;
        const outX = -inX, outZ = -inZ;
        const x = p[0], y = p[1], z = p[2];

        // Mástil
        mb.mat(1);
        this.setColor(mb, 0.76, 0.77, 0.80);
        mb.cyl(x, y, z, 0.07, y + 1.85, 0.07, 6, true, true);

        // Panel de señal
        const bW = 0.65, bH = 0.95;
        const yB = y + 0.85;
        const pL_x = x - outX * bW, pL_z = z - outZ * bW;
        const pR_x = x + outX * bW, pR_z = z + outZ * bW;

        md.mat(2, 240, 240);
        this.setColor(md, 0.96, 0.97, 0.98);
        md.quad(pL_x, yB, pL_z, pR_x, yB, pR_z, pR_x, yB + bH, pR_z, pL_x, yB + bH, pL_z);

        md.mat(4);
        this.setColor(md, 0.08, 0.08, 0.10);
        md.quad(pL_x, yB + bH - 0.08, pL_z, pR_x, yB + bH - 0.08, pR_z, pR_x, yB + bH, pR_z, pL_x, yB + bH, pL_z);
        md.quad(pL_x, yB, pL_z, pR_x, yB, pR_z, pR_x, yB + 0.08, pR_z, pL_x, yB + 0.08, pL_z);
      }
    }
    if (S1) S1.add(mb, brkI0, 7, 1200);
    if (S2) S2.add(md, brkD0, 7, 1200);
  },

  /**
   * 4. GUARDARRAÍL METÁLICO ARMCO BAJO PARA ESCAPATORIAS
   */
  createArmcoGuardrail(ctx, config = {}) {
    const { mb, S1, P, TRK } = ctx;
    if (!mb || typeof P !== 'function') return;

    const hw = (TRK && TRK.hw) ? TRK.hw : 7.0;
    const fiaI0 = mb.ni;
    const zones = config.zones || [];

    for (const [zS0, zS1, side] of zones) {
      const segStep = 5.0;
      const nSeg = Math.max(1, Math.round(Math.abs(zS1 - zS0) / segStep));
      for (let st = 0; st < nSeg; st++) {
        const s0 = zS0 + st * segStep, s1 = zS0 + (st + 1) * segStep;
        const d = side * (hw + 4.2);
        const p0 = P(s0, d), p1 = P(s1, d);

        mb.mat(1);
        this.setColor(mb, 0.72, 0.74, 0.78);
        mb.quad(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p1[0], p1[1] + 0.85, p1[2], p0[0], p0[1] + 0.85, p0[2]);
        mb.cyl(p0[0], p0[1], p0[2], 0.045, p0[1] + 0.95, 0.045, 6, true, true);
      }
    }
    if (S1) S1.add(mb, fiaI0, 7, 1400);
  },

  /**
   * 5. MUROS Y VALLAS METÁLICAS DE CONTENCIÓN (Catch Fencing)
   */
  createWallFence(ctx, config = {}) {
    const { mb, fenceMB, S1, fenceR, P } = ctx;
    if (!mb || typeof P !== 'function') return;

    const s0 = config.s0 ?? 0;
    const s1 = config.s1 ?? 100;
    const d = config.d ?? 10.0;
    const faceSide = config.faceSide ?? 1;
    const hWall = config.hWall ?? 1.05;
    const hf = config.hf ?? 3.3;
    const stripe = config.stripe || null;

    const path = [];
    for (let s = s0; s <= s1 + 0.01; s += 4) path.push(P(s, d));
    const t = 0.14, prof = [[-t, 0], [t, 0], [t, hWall], [-t, hWall]];

    for (let k = 0; k < path.length - 1; k += 12) {
      const seg = path.slice(k, k + 13), i0 = mb.ni;
      mb.mat(3);
      this.setColor(mb, 0.52, 0.51, 0.49);
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
      for (const p of seg.slice(0, 12)) mb.cyl(p[0], p[1] + hWall, p[2], 0.035, p[1] + hf, 0.035, 6, false, true);
      for (const hh of [hWall + 0.05, hf - 0.03]) mb.tube(seg.map(p => [p[0], p[1] + hh, p[2]]), 0.02, 5);
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
        if (fenceR) fenceR.push({ first: f0, count: fenceMB.ni - f0, x: m[0], y: m[1] + 2, z: m[2], rad: 30 });
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
