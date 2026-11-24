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

    const s = config.s ?? 0;
    const dL = config.dL ?? -7.7;
    const dR = config.dR ?? 7.05;
    const nameReg = config.nameReg || 'name';
    const lights = config.lights !== false;
    const local = config.local || false;

    const v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni;
    const yB = config.yBottom ?? 6.1, yT = config.yTop ?? 7.3, hwB = 0.5;
    const mt = typeof m4 === 'function' ? m4() : new Float32Array(16);

    for (const d of [dL, dR]) {
      mb.mat(2, 120, 70);
      this.setColor(mb, 0.17, 0.25, 0.36);
      for (const [a, b] of [[-0.42, -0.42], [0.42, -0.42], [0.42, 0.42], [-0.42, 0.42]]) {
        mb.cyl(s + a, 0, d + b, 0.095, yT, 0.095, 10, false, true);
      }
      for (let y = 0.5; y < yB; y += 0.95) {
        for (const [a0, b0, a1, b1] of [[-0.42, -0.42, 0.42, -0.42], [0.42, -0.42, 0.42, 0.42], [0.42, 0.42, -0.42, 0.42], [-0.42, 0.42, -0.42, -0.42]]) {
          mb.tube([[s + a0, y, d + b0], [s + a1, y + 0.95, d + b1]], 0.05, 6);
          mb.tube([[s + a0, y, d + b0], [s + a1, y, d + b1]], 0.045, 6);
        }
      }
      mb.mat(2, 130, 60);
      this.setColor(mb, 0.11, 0.16, 0.24);
      for (let y = 0.5; y <= yB + 0.01; y += 0.95) {
        for (const [a, b] of [[-0.42, -0.42], [0.42, -0.42], [0.42, 0.42], [-0.42, 0.42]]) {
          mb.box(s + a, y, d + b, 0.2, 0.14, 0.2);
        }
      }
      this.boxMinMax(mb, s - 0.62, s + 0.62, 0.33, 0.4, d - 0.62, d + 0.62);
      mb.mat(3);
      this.setColor(mb, 0.3, 0.3, 0.29);
      this.boxMinMax(mb, s - 0.8, s + 0.8, -0.4, 0.35, d - 0.8, d + 0.8);
      mb.mat(1);
      this.setColor(mb, 1, 1, 1);
      for (const [a2, b2] of [[-0.54, -0.54], [0.54, -0.54], [0.54, 0.54], [-0.54, 0.54], [0, -0.56], [0, 0.56], [-0.56, 0], [0.56, 0]]) {
        mb.cyl(s + a2, 0.4, d + b2, 0.028, 0.47, 0.028, 6, false, true);
      }
    }

    mb.mat(2, 120, 70);
    this.setColor(mb, 0.17, 0.25, 0.36);
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
      this.setColor(md, 1, 1, 1);
      md.quad(s - hwB - 0.07, yB - 0.1, dL + 0.3, s - hwB - 0.07, yB - 0.1, dR - 0.3, s - hwB - 0.07, yT + 0.1, dR - 0.3, s - hwB - 0.07, yT + 0.1, dL + 0.3, r[0], r[3], r[2], r[1]);
      md.quad(s + hwB + 0.07, yB - 0.1, dR - 0.3, s + hwB + 0.07, yB - 0.1, dL + 0.3, s + hwB + 0.07, yT + 0.1, dL + 0.3, s + hwB + 0.07, yT + 0.1, dR - 0.3, r[0], r[3], r[2], r[1]);
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
      for (let k = 0; k < 5; k++) {
        for (const y of [5.2, 5.55]) {
          mb.push(typeof m4mul === 'function' ? m4mul(m4(), m4translate(mt, s - hwB - 0.46, y, -2.0 + k), rotZ) : mt);
          mb.mat(2, 150, 60);
          this.setColor(mb, 0.02, 0.02, 0.022);
          mb.cyl(0, 0, 0, 0.185, 0.2, 0.195, 16, false, false);
          mb.cyl(0, 0, 0, 0.17, 0.2, 0.18, 16, false, false);
          mb.mat(18, 255, k + 1, 0);
          this.setColor(mb, 1.0, 0.02, 0.01);
          mb.cyl(0, 0, 0, 0.165, 0.04, 0.145, 16, false, true);
          mb.pop();
        }
      }
    }

    if (!local) {
      if (typeof toStraight === 'function') {
        toStraight(mb, v0);
        toStraight(md, w0);
      }
      if (S1) S1.add(mb, i0, 3, 900);
      if (S2) S2.add(md, k0, 5, 1500);
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

      mb.mat(3);
      this.setColor(mb, 0.62, 0.63, 0.64);
      this.boxMinMax(mb, a - 0.22, a + 0.22, -0.5, hG, vF - 0.15, vF + 0.35);
      if (b === nBay - 1) this.boxMinMax(mb, c - 0.22, c + 0.22, -0.5, hG, vF - 0.15, vF + 0.35);

      const teamCol = [
        [0.12, 0.45, 0.95],
        [0.98, 0.85, 0.05],
        [0.85, 0.12, 0.12],
        [0.10, 0.68, 0.35]
      ][b % 4];
      mb.mat(17);
      this.setColor(mb, teamCol[0], teamCol[1], teamCol[2]);
      this.boxMinMax(mb, a, c, hG, hS, vF - 0.12, vF + 0.35);

      const dp = 7.5, x0 = a + 0.25, x1 = c - 0.25;
      mb.mat(3);
      this.setColor(mb, 0.38, 0.38, 0.39, 0.8);
      mb.quad(x0, 0.02, vF + dp, x1, 0.02, vF + dp, x1, 0.02, vF, x0, 0.02, vF);
      mb.quad(x1, 0, vF + dp, x0, 0, vF + dp, x0, hG, vF + dp, x1, hG, vF + dp);
      mb.quad(x0, 0, vF + dp, x0, 0, vF, x0, hG, vF, x0, hG, vF + dp);
      mb.quad(x1, 0, vF, x1, 0, vF + dp, x1, hG, vF + dp, x1, hG, vF);

      if (!closed) {
        mb.mat(2, 110, 150);
        this.setColor(mb, teamCol[0] * 0.8, teamCol[1] * 0.8, teamCol[2] * 0.8);
        this.boxMinMax(mb, x0 + 0.4, x0 + 1.6, 0.0, 1.05, vF + dp - 1.1, vF + dp - 0.4);
        mb.mat(4);
        this.setColor(mb, 0.02, 0.02, 0.02);
        mb.cyl(x1 - 0.6, 0, vF + 1.2, 0.32, 0.85, 0.32, 10, false, true);
      } else {
        mb.mat(13);
        this.setColor(mb, 0.70, 0.72, 0.74);
        mb.quad(x1, 0, vF + 0.1, x0, 0, vF + 0.1, x0, hG, vF + 0.1, x1, hG, vF + 0.1);
      }
    }

    // Planta superior y barandillas acristaladas
    mb.mat(3);
    this.setColor(mb, 0.58, 0.58, 0.59);
    this.boxMinMax(mb, u0, u1, hS, hS + 0.35, vF - 1.8, vB);
    mb.mat(5);
    this.setColor(mb, 1, 1, 1);
    mb.quad(u1, hS + 0.35, vF - 1.75, u0, hS + 0.35, vF - 1.75, u0, hS + 1.45, vF - 1.75, u1, hS + 1.45, vF - 1.75);
    mb.quad(u1, hS + 0.35, vF + 1.0, u0, hS + 0.35, vF + 1.0, u0, hT, vF + 1.0, u1, hT, vF + 1.0);

    // Torre de Control (Rennleitung)
    const tu0 = u0 - 8.5, tu1 = u0 + 4.5, tv0 = vF - 3.5, tv1 = vF + 4.5;
    mb.mat(3);
    this.setColor(mb, 0.35, 0.36, 0.38);
    this.boxMinMax(mb, tu0, tu1, 0, 18.5, tv0, tv1);
    mb.mat(5);
    this.setColor(mb, 1, 1, 1);
    mb.quad(tu1 + 1.2, 14.5, tv0 - 1.2, tu0 - 1.2, 14.5, tv0 - 1.2, tu0 - 1.2, 18.0, tv0 - 1.2, tu1 + 1.2, 18.0, tv0 - 1.2);
    mb.mat(1, 0, 0, 80);
    this.setColor(mb, 0.9, 0.9, 0.9);
    mb.cyl((tu0 + tu1) * 0.5, 18.5, (tv0 + tv1) * 0.5, 0.12, 26.5, 0.04, 6, false, true);

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

    mb.mat(2, 89, 51);
    this.setColor(mb, c[0], c[1], c[2]);
    this.boxMinMax(mb, -6.5, 3.2, 1.25, 4.0, -1.25, 1.25);

    this.setColor(mb, 0.88, 0.88, 0.88);
    this.boxMinMax(mb, 3.6, 5.9, 0.9, 3.3, -1.2, 1.2);

    mb.mat(5);
    this.setColor(mb, 1, 1, 1);
    mb.quad(5.92, 2.0, 1.1, 5.92, 2.0, -1.1, 5.92, 3.1, -1.1, 5.92, 3.1, 1.1, 0.2, 0.2, 1.5, 1.2);

    mb.mat(2, 153, 76);
    this.setColor(mb, 0.08, 0.08, 0.09);
    this.boxMinMax(mb, -6.3, 5.6, 0.75, 1.25, -1.1, 1.1);

    mb.mat(4);
    this.setColor(mb, 0.02, 0.02, 0.02);
    for (const x of [-5.4, -4.2, 2.2, 4.9]) {
      for (const z of [-1.22, 0.92]) {
        if (typeof m4mul === 'function' && typeof m4translate === 'function') {
          mb.push(m4mul(m4(), m4translate(mt, x, 0.5, z), rotX));
          mb.cyl(0, 0, 0, 0.5, 0.3, 0.5, 12, true, true);
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
    mb.quad(-3.5, 2.5, 3.5, 3.5, 2.5, 3.5, 0, 4.0, 0, 0, 4.0, 0);
    mb.quad(3.5, 2.5, 3.5, 3.5, 2.5, -3.5, 0, 4.0, 0, 0, 4.0, 0);
    mb.quad(3.5, 2.5, -3.5, -3.5, 2.5, -3.5, 0, 4.0, 0, 0, 4.0, 0);
    mb.quad(-3.5, 2.5, -3.5, -3.5, 2.5, 3.5, 0, 4.0, 0, 0, 4.0, 0);

    mb.mat(1, 0, 0, 80);
    this.setColor(mb, 1, 1, 1);
    for (const x of [-3.4, 3.4]) {
      for (const z of [-3.4, 3.4]) {
        mb.cyl(x, 0, z, 0.05, 2.5, 0.05, 6, false, false);
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
