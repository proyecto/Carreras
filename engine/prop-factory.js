'use strict';
/**
 * PropFactory - Fábrica centralizada de elementos discretos de pista y escenografía
 *
 * Responsabilidades (Single Responsibility & Factory Pattern):
 * 1. Fabricación de sistemas de contención y seguridad:
 *    - createWallFence: Muros continuos de hormigón (Jersey/plano) con valla FIA (catch fencing).
 *    - createTecproBarrier: Bloques absorbedores Tecpro modulares en rojo/blanco.
 *    - createTyreBarrier: Pilas de neumáticos amortiguadores.
 *    - createGuardRailStrip: Extrusión de guardarraíl de acero bivalvo tipo W con postes.
 * 2. Fabricación de estructuras de circuito:
 *    - createStartGantry: Pórtico de salida con celosía espacial, cartel y semáforo FIA de 5 luces.
 *    - createGrandstand: Grada/tribuna escalonada con asientos, pasillos, visera y público.
 *    - createPitBuilding: Edificio modular de garajes y boxes con terrazas.
 * 3. Fabricación de mobiliario de paddock y señalización:
 *    - createPaddockTruck: Camión trailer de equipo de competición (livery personalizable).
 *    - createPaddockTent: Carpas de hospitalidad de equipos.
 *    - createBillboard: Vallas publicitarias y paneles de patrocinio del atlas.
 */

const PropFactory = {
  /**
   * Helper caja delimitada por coordenadas mínimas y máximas
   */
  boxMinMax(m, u0, u1, y0, y1, v0, v1) {
    if (!m || typeof m.box !== 'function') return;
    const cx = (u0 + u1) * 0.5;
    const cy = (y0 + y1) * 0.5;
    const cz = (v0 + v1) * 0.5;
    const sx = Math.abs(u1 - u0);
    const sy = Math.abs(y1 - y0);
    const sz = Math.abs(v1 - v0);
    m.box(cx, cy, cz, sx, sy, sz);
  },

  /**
   * Helper para asignar color RGBA
   */
  setColor(m, r, g, b, a = 1.0) {
    if (m && typeof m.color === 'function') {
      m.color(r, g, b, a);
    }
  },

  /**
   * 1. PÓRTICO DE SALIDA Y SEMÁFORO FIA
   * Estructura tridimensional de celosía que cruza la pista en s=0 con semáforo y patrocinio.
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

    // Columnas de celosía a izquierda y derecha
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
      // Nodos de unión y zapata de hormigón
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

    // Viga-cajón de celosía
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

    // Lona de patrocinio en ambas caras
    if (REG && REG[nameReg]) {
      const r = REG[nameReg];
      md.mat(7);
      this.setColor(md, 1, 1, 1);
      md.quad(s - hwB - 0.07, yB - 0.1, dL + 0.3, s - hwB - 0.07, yB - 0.1, dR - 0.3, s - hwB - 0.07, yT + 0.1, dR - 0.3, s - hwB - 0.07, yT + 0.1, dL + 0.3, r[0], r[3], r[2], r[1]);
      md.quad(s + hwB + 0.07, yB - 0.1, dR - 0.3, s + hwB + 0.07, yB - 0.1, dL + 0.3, s + hwB + 0.07, yT + 0.1, dL + 0.3, s + hwB + 0.07, yT + 0.1, dR - 0.3, r[0], r[3], r[2], r[1]);
    }

    // Semáforo de salida FIA de 5 luces rojas
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
          mb.cyl(0, 0, 0, 0.165, 0.2, 0.175, 14, false, false);
          mb.cyl(0, 0, 0, 0.15, 0.2, 0.16, 14, false, false);
          mb.mat(18, 80, 0);
          this.setColor(mb, 0.9, 0.012, 0.004);
          mb.cyl(0, 0, 0, 0.14, 0.035, 0.12, 14, false, true);
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
   * 2. BARRERAS ABSORBEDORAS TECPRO (F1 / FIA)
   * Bloques modulares alternados de color rojo y blanco con cinchas de amortiguación.
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
   * 3. CAMIÓN TRANSPORTER DE PADDOCK
   * Vehículo tractor + remolque articulado de escudería con ruedas y librea.
   */
  createPaddockTruck(ctx, config = {}) {
    const { mb } = ctx;
    if (!mb) return;

    const c = config.color || [0.08, 0.32, 0.75];
    const mt = typeof m4 === 'function' ? m4() : new Float32Array(16);
    const rotX = typeof m4rotX === 'function' ? m4rotX(m4(), Math.PI * 0.5) : new Float32Array(16);

    // Remolque / Caja
    mb.mat(2, 89, 51);
    this.setColor(mb, c[0], c[1], c[2]);
    this.boxMinMax(mb, -6.5, 3.2, 1.25, 4.0, -1.25, 1.25);

    // Cabina tractora
    this.setColor(mb, 0.88, 0.88, 0.88);
    this.boxMinMax(mb, 3.6, 5.9, 0.9, 3.3, -1.2, 1.2);

    // Parabrisas
    mb.mat(5);
    this.setColor(mb, 1, 1, 1);
    mb.quad(5.92, 2.0, 1.1, 5.92, 2.0, -1.1, 5.92, 3.1, -1.1, 5.92, 3.1, 1.1, 0.2, 0.2, 1.5, 1.2);

    // Chasis bajo y faldones
    mb.mat(2, 153, 76);
    this.setColor(mb, 0.08, 0.08, 0.09);
    this.boxMinMax(mb, -6.3, 5.6, 0.75, 1.25, -1.1, 1.1);

    // Ruedas gemelas (4 ejes)
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

    // Postes estructurales
    mb.mat(1, 0, 0, 80);
    this.setColor(mb, 1, 1, 1);
    for (const x of [-3.4, 3.4]) {
      for (const z of [-3.4, 3.4]) {
        mb.cyl(x, 0, z, 0.05, 2.5, 0.05, 6, false, false);
      }
    }
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

      // Franja de advertencia pintada
      if (stripe) {
        mb.mat(2, 128, 0);
        this.setColor(mb, stripe[0], stripe[1], stripe[2]);
        mb.sweep(seg.map(p => [p[0], p[1] + hWall * 0.42, p[2]]), faceSide > 0 ? [[t + 0.004, 0], [t + 0.004, 0.3]] : [[-t - 0.004, 0.3], [-t - 0.004, 0]], {});
      }
      if (S1) S1.add(mb, i0, 3, 900);

      // Postes metálicos de la valla
      const p0 = mb.ni;
      mb.mat(11, 0, 0, 11);
      this.setColor(mb, 1, 1, 1);
      for (const p of seg.slice(0, 12)) mb.cyl(p[0], p[1] + hWall, p[2], 0.035, p[1] + hf, 0.035, 6, false, true);
      for (const hh of [hWall + 0.05, hf - 0.03]) mb.tube(seg.map(p => [p[0], p[1] + hh, p[2]]), 0.02, 5);
      if (S1) S1.add(mb, p0, 1, 64);

      // Malla de tela metálica transparente
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

// Exposición global y modular
if (typeof window !== 'undefined') {
  window.PropFactory = PropFactory;
}
if (typeof globalThis !== 'undefined') {
  globalThis.PropFactory = PropFactory;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PropFactory };
}
