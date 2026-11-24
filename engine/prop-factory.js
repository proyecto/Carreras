'use strict';
/**
 * PropFactory - Fábrica centralizada de elementos discretos de pista y escenografía
 * PropFactory - Fachada centralizada de elementos discretos de pista y escenografía (SOLID - Facade Pattern)
 *
 * Sigue los principios SOLID de Responsabilidad Única y Factory Method:
 * 1. Sistemas de contención y seguridad:
 *    - createWallFence: Muros de hormigón (Jersey o plano) con valla metálica FIA (catch fencing).
 *    - createTecproBarrier: Bloques absorbedores modulares Tecpro en rojo/blanco.
 *    - createTyreBarrier: Pilas de neumáticos amortiguadores.
 *    - createArmcoGuardrail: Guardarraíl metálico bajo de escapatorias con postes.
 *    - createSausageKerbs: Bordillos disuasorios trapezoidales de chicanes.
 * 2. Estructuras de circuito y público:
 *    - createStartGantry: Pórtico de salida con celosía espacial, cartel y semáforo FIA de 5 luces.
 *    - createGrandstand: Grada/tribuna escalonada con asientos, pasillos, marquesina y público.
 *    - createMercedesArenaGrandstand: Gran graderío monumental radial con palcos VIP y cubierta en voladizo.
 *    - createPitBuilding: Edificio oficial de boxes con garajes, terraza VIP, torre de control y pit wall.
 *    - createMedievalCastle: Castillo monumental en cumbre de horizonte (Bergfried, murallas, almenas y bandera).
 * 3. Logística de Paddock y señalización:
 *    - createPaddockTruck: Camión trailer de competición con tractora, remolque y librea de equipo.
 *    - createPaddockTent: Carpas de hospitalidad de paddock.
 *    - createBrakeDistanceSigns: Carteles oficiales FIA de distancia de frenada (200m, 150m, 100m, 50m).
 * Implementa el Patrón Fachada delegando en submódulos especializados de responsabilidad única (SRP):
 * - PropUtils (engine/props/prop-utils.js): Utilidades geométricas y de color compartidas.
 * - TrackSafetyProps (engine/props/track-safety.js): Tecpro, Sausage Kerbs, Frenada, Armco, Muros/Vallas.
 * - GrandstandProps (engine/props/grandstands.js): Tribunas estándar y Mercedes-Benz Arena.
 * - PaddockProps (engine/props/paddock.js): Pórticos de salida, Pit Building, camiones y carpas.
 * - SceneryProps (engine/props/scenery.js): Castillo medieval (Burg Nürburg).
 * - UrbanContainmentProps (engine/props/urban-containment.js): Contención urbana, túnel Jersey y escenografía Las Vegas F1.
 */

// Resolución modular en entornos Node.js / CommonJS
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    if (typeof PropUtils === 'undefined') {
      const u = require('./props/prop-utils.js');
      if (u.PropUtils) globalThis.PropUtils = u.PropUtils;
    }
    if (typeof TrackSafetyProps === 'undefined') {
      const ts = require('./props/track-safety.js');
      if (ts.TrackSafetyProps) globalThis.TrackSafetyProps = ts.TrackSafetyProps;
    }
    if (typeof GrandstandProps === 'undefined') {
      const gs = require('./props/grandstands.js');
      if (gs.GrandstandProps) globalThis.GrandstandProps = gs.GrandstandProps;
    }
    if (typeof PaddockProps === 'undefined') {
      const pd = require('./props/paddock.js');
      if (pd.PaddockProps) globalThis.PaddockProps = pd.PaddockProps;
    }
    if (typeof SceneryProps === 'undefined') {
      const sc = require('./props/scenery.js');
      if (sc.SceneryProps) globalThis.SceneryProps = sc.SceneryProps;
    }
    if (typeof UrbanContainmentProps === 'undefined') {
      const uc = require('./props/urban-containment.js');
      if (uc.UrbanContainmentProps) globalThis.UrbanContainmentProps = uc.UrbanContainmentProps;
    }
  } catch (e) {
    // Entorno de ejecución sin CommonJS o empaquetador dinámico
  }
}

const PropFactory = {
  /**
   * Helper caja delimitada por coordenadas mínimas y máximas
   */
  // Helpers geométricos y cromáticos delegados
  boxMinMax(m, u0, u1, y0, y1, v0, v1) {
    if (typeof PropUtils !== 'undefined' && typeof PropUtils.boxMinMax === 'function') {
      return PropUtils.boxMinMax(m, u0, u1, y0, y1, v0, v1);
    }
    if (!m || typeof m.box !== 'function') return;
    const cx = (u0 + u1) * 0.5;
    const cy = (y0 + y1) * 0.5;
    const cz = (v0 + v1) * 0.5;
    const sx = Math.abs(u1 - u0);
    const sy = Math.abs(y1 - y0);
    const sz = Math.abs(v1 - v0);
    m.box(cx, cy, cz, sx, sy, sz);
    const cx = (u0 + u1) * 0.5, cy = (y0 + y1) * 0.5, cz = (v0 + v1) * 0.5;
    m.box(cx, cy, cz, Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0));
  },

  /**
   * Helper para asignar color RGBA
   */
  setColor(m, r, g, b, a = 1.0) {
    if (typeof PropUtils !== 'undefined' && typeof PropUtils.setColor === 'function') {
      return PropUtils.setColor(m, r, g, b, a);
    }
    if (m && typeof m.color === 'function') {
      m.color(r, g, b, a);
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
      // 1. Paddock y meta
      createStartGantry(ctx, config) {
        if (typeof PaddockProps !== 'undefined' && typeof PaddockProps.createStartGantry === 'function') {
          return PaddockProps.createStartGantry(ctx, config);
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
       * 2. BARRERAS ABSORBEDORAS TECPRO (F1 / FIA)
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
          createPitBuilding(ctx, config) {
            if (typeof PaddockProps !== 'undefined' && typeof PaddockProps.createPitBuilding === 'function') {
              return PaddockProps.createPitBuilding(ctx, config);
            }
            if (S1) S1.add(mb, tpI0, 3, 750);
          },

          /**
           * 3. GRADA ESCALONADA (Haupttribüne / Grandstand Estándar)
           */
          createGrandstand(ctx, config = {}) {
            const { mb, md, mp, S1, S2, SP, toStraight, sign, CROWD, sitter, stander } = ctx;
            if (!mb || !md) return;

            const u0 = config.s0 ?? -90, u1 = config.s1 ?? 135, vF = config.d0 ?? -15.5;
            const nRow = config.nRows ?? 22, run = config.run ?? 0.85, rise = config.rise ?? 0.42, yF = config.yF ?? 1.25;
            const vB = vF - 1.0 - nRow * run, yB = yF + nRow * rise;
            const nSec = config.nSec ?? 6, aisle = config.aisle ?? 2.4;
            const secW = (u1 - u0 - (nSec + 1) * aisle) / nSec;
            const seatCols = config.seatColors || [[0.78, 0.12, 0.12], [0.94, 0.94, 0.95]];
            const rnd = typeof config.rng === 'function' ? config.rng : Math.random;

            for (let sec = 0; sec < nSec; sec++) {
              const a = u0 + aisle + sec * (secW + aisle), c = a + secW;
              const v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni;

              // Huellas y contrahuellas de hormigón
              for (let r = 0; r < nRow; r++) {
                const v = vF - 1.0 - r * run, y = yF + r * rise, ao = 1.0 - 0.35 * (r / nRow);
                mb.mat(3);
                this.setColor(mb, 0.52, 0.53, 0.54, ao);
                mb.quad(a, y, v, c, y, v, c, y + rise, v, a, y + rise, v);
                mb.quad(a, y + rise, v, c, y + rise, v, c, y + rise, v - run, a, y + rise, v - run);

                const sTone = seatCols[(sec + r) % seatCols.length];
                md.mat(8);
                this.setColor(md, sTone[0], sTone[1], sTone[2], ao);
                md.quad(a, y + rise + 0.38, v - 0.22, c, y + rise + 0.38, v - 0.22, c, y + rise + 0.38, v - 0.72, a, y + rise + 0.38, v - 0.72, 0, 0, c - a, 0.5);
                md.quad(a, y + rise + 0.38, v - 0.72, c, y + rise + 0.38, v - 0.72, c, y + rise + 0.82, v - 0.74, a, y + rise + 0.82, v - 0.74, 0, 0, c - a, 0.44);
              }

              // Público en las gradas
              if (mp && SP && typeof sitter === 'function' && config.withCrowd !== false) {
                const pv0 = mp.nv, pi0 = mp.ni;
                for (let r = 0; r < nRow; r++) {
                  const v = vF - 1.0 - r * run, y = yF + r * rise;
                  const occ = 0.75 + 0.2 * Math.sin((r + 1) / (nRow + 1) * Math.PI);
                  for (let x = a + 0.4; x < c - 0.4; x += 0.55) {
                    if (rnd() < occ) {
                      const crowdColor = (CROWD && CROWD.length) ? CROWD[Math.floor(rnd() * CROWD.length)] : [0.85, 0.2, 0.1];
                      if (rnd() < 0.12 && typeof stander === 'function') {
                        stander(x + (rnd() - 0.5) * 0.2, y + rise + 0.05, v - 0.45, crowdColor, 0.95);
                      } else {
                        sitter(x, y + rise + 0.38, v - 0.72, 0.95);
                      }
                    }
                  }
                }
                if (typeof toStraight === 'function') toStraight(mp, pv0);
                SP.add(mp, pi0, 1, 950);
              }

              // Escaleras laterales de acceso
              for (const [x0, x1] of sec === 0 ? [[a - aisle, a], [c, c + aisle]] : [[c, c + aisle]]) {
                mb.mat(3);
                this.setColor(mb, 0.65, 0.65, 0.66, 0.9);
                for (let r = 0; r < nRow; r++) {
                  const v = vF - 1.0 - r * run, y = yF + r * rise;
                  mb.quad(x0, y, v, x1, y, v, x1, y + rise, v, x0, y + rise, v);
                  mb.quad(x0, y + rise, v, x1, y + rise, v, x1, y + rise, v - run, x0, y + rise, v - run);
                }
                mb.mat(2, 102, 153);
                this.setColor(mb, 0.8, 0.8, 0.82);
                mb.tube([[(x0 + x1) / 2, yF + 0.95, vF - 1.0], [(x0 + x1) / 2, yB + 0.95, vB]], 0.035, 5);
              }

              // Murete frontal con rótulo de patrocinio
              const ea = sec === 0 ? u0 : a - aisle / 2, ec = sec === nSec - 1 ? u1 : c + aisle / 2;
              mb.mat(3);
              this.setColor(mb, 0.60, 0.60, 0.62);
              this.boxMinMax(mb, ea, ec, -0.5, yF + 0.9, vF - 1.0, vF - 0.75);
              if (typeof sign === 'function') {
                const nm = ['name', 'b0', 'b5', 'b2', 'b7', 'name'][sec % 6];
                sign(md, ea + 2, 0.25, vF - 0.73, ec - ea - 4, 0, 0, 1.4, nm);
              }

              // Pared trasera
              mb.mat(3);
              this.setColor(mb, 0.48, 0.48, 0.50);
              mb.quad(ec, -0.5, vB - 0.3, ea, -0.5, vB - 0.3, ea, yB + 5.8, vB - 0.3, ec, yB + 5.8, vB - 0.3);
              mb.quad(ea, yB, vB, ec, yB, vB, ec, yB + 5.8, vB, ea, yB + 5.8, vB);

              // Marquesina superior en voladizo
              if (config.withRoof !== false) {
                const yr0 = yB + 6.0, yr1 = yB + 3.8, vr1 = vF - 0.2;
                md.mat(9);
                this.setColor(md, 0.72, 0.74, 0.76);
                md.quad(ec, yr0, vB - 0.8, ea, yr0, vB - 0.8, ea, yr1, vr1, ec, yr1, vr1, 0, 0, ec - ea, vr1 - vB + 0.8);

                mb.mat(2, 128, 128);
                this.setColor(mb, 0.22, 0.24, 0.26);
                for (const x of [ea + 0.4, (ea + ec) / 2, ec - 0.4]) {
                  this.boxMinMax(mb, x - 0.22, x + 0.22, -0.5, yr0 - 0.1, vB - 0.3, vB + 0.15);
                  const bm = mb.nv;
                  this.boxMinMax(mb, x - 0.12, x + 0.12, -0.5, 0.0, 0, 1);
                  for (let q = bm; q < mb.nv; q++) {
                    const t = mb.f32[q * 9 + 2], top = mb.f32[q * 9 + 1] > -0.25;
                    mb.f32[q * 9 + 2] = (vB - 0.3) + (vr1 - vB) * t;
                    mb.f32[q * 9 + 1] = (yr0 + (yr1 - yr0) * t) - (top ? 0.06 : (0.95 - 0.65 * t));
                  }
                }
              }

              if (typeof toStraight === 'function') {
                toStraight(mb, v0);
                toStraight(md, w0);
              }
              if (S1) S1.add(mb, i0, 7, 2400);
              if (S2) S2.add(md, k0, 7, 2400);
              createPaddockTruck(ctx, config) {
                if (typeof PaddockProps !== 'undefined' && typeof PaddockProps.createPaddockTruck === 'function') {
                  return PaddockProps.createPaddockTruck(ctx, config);
                }
              },

              /**
               * 4. GRADA MONUMENTAL MERCEDES-ARENA (Radial con palcos VIP y cubierta en voladizo)
               */
              createMercedesArenaGrandstand(ctx, config = {}) {
                const { mb, md, mp, S1, S2, SP, P, CROWD, sitter, stander } = ctx;
                if (!mb || !md || typeof P !== 'function') return;

                const arenaS0 = config.s0 ?? 865, arenaS1 = config.s1 ?? 1055;
                const dS_arena = config.step ?? 5.5;
                const nS_arena = Math.round((arenaS1 - arenaS0) / dS_arena);
                const colSeatMercedesBlue = [0.06, 0.28, 0.76];
                const colFasciaBlack = [0.08, 0.08, 0.10];
                const colRoofWhite = [0.93, 0.94, 0.96];
                const colSteelDark = [0.18, 0.20, 0.24];
                const colChrome = [0.95, 0.96, 0.98];
                const rnd = typeof config.rng === 'function' ? config.rng : Math.random;

                let mbI0 = mb.ni, mdI0 = md.ni, mpI0 = mp ? mp.ni : 0;

                for (let seg = 0; seg < nS_arena; seg++) {
                  const sA = arenaS0 + seg * dS_arena, sB = arenaS0 + (seg + 1) * dS_arena;
                  const isAisle = (seg % 5 === 0);

                  const pA_base = P(sA, -25.0), pB_base = P(sB, -25.0);
                  const yBaseA = pA_base[1], yBaseB = pB_base[1];

                  // Muro frontal blanco bajo con valla de seguridad FIA transparente
                  {
                    const pA_w = P(sA, -24.8), pB_w = P(sB, -24.8);
                    mb.mat(3);
                    this.setColor(mb, 0.94, 0.95, 0.96);
                    mb.quad(pA_w[0], yBaseA, pA_w[2], pB_w[0], yBaseB, pB_w[2], pB_w[0], yBaseB + 0.85, pB_w[2], pA_w[0], yBaseA + 0.85, pA_w[2]);
                    md.mat(2, 240, 240);
                    this.setColor(md, 0.08, 0.25, 0.65);
                    md.quad(pA_w[0], yBaseA + 0.12, pA_w[2], pB_w[0], yBaseB + 0.12, pB_w[2], pB_w[0], yBaseB + 0.72, pB_w[2], pA_w[0], yBaseA + 0.72, pA_w[2]);

                    mb.mat(1);
                    this.setColor(mb, 0.72, 0.74, 0.78);
                    mb.cyl(pA_w[0], yBaseA + 0.85, pA_w[2], 0.04, yBaseA + 2.5, 0.035, 5, true, true);
                    mb.tube([[pA_w[0], yBaseA + 1.45, pA_w[2]], [pB_w[0], yBaseB + 1.45, pB_w[2]]], 0.009, 3);
                    mb.tube([[pA_w[0], yBaseA + 1.95, pA_w[2]], [pB_w[0], yBaseB + 1.95, pB_w[2]]], 0.009, 3);
                    mb.tube([[pA_w[0], yBaseA + 2.45, pA_w[2]], [pB_w[0], yBaseB + 2.45, pB_w[2]]], 0.009, 3);
                  }

                  // Graderío inferior (Lower Bowl): 10 filas
                  const nLowRows = 10, lowRun = 0.88, lowRise = 0.42;
                  for (let r = 0; r < nLowRows; r++) {
                    const dFront = -(25.2 + r * lowRun), dBack = -(25.2 + (r + 1) * lowRun);
                    const y0A = yBaseA + r * lowRise, y1A = y0A + lowRise;
                    const y0B = yBaseB + r * lowRise, y1B = y0B + lowRise;

                    const pA_f = P(sA, dFront), pB_f = P(sB, dFront);
                    const pA_b = P(sA, dBack), pB_b = P(sB, dBack);

                    mb.mat(3);
                    this.setColor(mb, 0.62, 0.63, 0.65, 1.0 - 0.2 * (r / nLowRows));
                    mb.quad(pA_f[0], y0A, pA_f[2], pB_f[0], y0B, pB_f[2], pB_f[0], y1B, pB_f[2], pA_f[0], y1A, pA_f[2]);
                    mb.quad(pA_f[0], y1A, pA_f[2], pB_f[0], y1B, pB_f[2], pB_b[0], y1B, pB_b[2], pA_b[0], y1A, pA_b[2]);

                    if (!isAisle) {
                      md.mat(8);
                      this.setColor(md, colSeatMercedesBlue[0], colSeatMercedesBlue[1], colSeatMercedesBlue[2]);
                      const pA_sf = P(sA, dFront - 0.12), pB_sf = P(sB, dFront - 0.12);
                      const pA_sb = P(sA, dBack + 0.12), pB_sb = P(sB, dBack + 0.12);
                      md.quad(pA_sf[0], y1A + 0.35, pA_sf[2], pB_sf[0], y1B + 0.35, pB_sf[2], pB_sb[0], y1B + 0.35, pB_sb[2], pA_sb[0], y1A + 0.35, pA_sb[2]);
                      md.quad(pA_sb[0], y1A + 0.35, pA_sb[2], pB_sb[0], y1B + 0.35, pB_sb[2], pB_sb[0], y1B + 0.75, pB_sb[2], pA_sb[0], y1A + 0.75, pA_sb[2]);

                      if (mp && SP && typeof sitter === 'function' && rnd() < 0.72) {
                        const pMid_s = P((sA + sB) * 0.5, (dFront + dBack) * 0.5);
                        const yMid = (y1A + y1B) * 0.5;
                        const crowdColor = (CROWD && CROWD.length) ? CROWD[Math.floor(rnd() * CROWD.length)] : [0.8, 0.2, 0.2];
                        if (rnd() < 0.18 && typeof stander === 'function') {
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
                  const yMidBotA = yBaseA + nLowRows * lowRise, yMidBotB = yBaseB + nLowRows * lowRise;
                  const yMidTopA = yMidBotA + 3.8, yMidTopB = yMidBotB + 3.8;

                  const pA_mf = P(sA, dMidFront), pB_mf = P(sB, dMidFront);
                  const pA_mb = P(sA, dMidBack), pB_mb = P(sB, dMidBack);

                  mb.mat(2, 40, 30);
                  this.setColor(mb, colFasciaBlack[0], colFasciaBlack[1], colFasciaBlack[2]);
                  mb.quad(pA_mf[0], yMidBotA, pA_mf[2], pB_mf[0], yMidBotB, pB_mf[2], pB_mf[0], yMidBotB + 1.25, pB_mf[2], pA_mf[0], yMidBotA + 1.25, pA_mf[2]);

                  // Ventanales VIP
                  mb.mat(5);
                  this.setColor(mb, 1, 1, 1);
                  mb.quad(pA_mf[0], yMidBotA + 1.25, pA_mf[2], pB_mf[0], yMidBotB + 1.25, pB_mf[2], pB_mf[0], yMidTopB, pB_mf[2], pA_mf[0], yMidTopA, pA_mf[2]);

                  // Graderío superior (Upper Bowl): 12 filas
                  const nUpRows = 12, upRun = 0.85, upRise = 0.52;
                  for (let r = 0; r < nUpRows; r++) {
                    const dFront = dMidBack - r * upRun, dBack = dMidBack - (r + 1) * upRun;
                    const y0A = yMidTopA + r * upRise, y1A = y0A + upRise;
                    const y0B = yMidTopB + r * upRise, y1B = y0B + upRise;

                    const pA_uf = P(sA, dFront), pB_uf = P(sB, dFront);
                    const pA_ub = P(sA, dBack), pB_ub = P(sB, dBack);

                    mb.mat(3);
                    this.setColor(mb, 0.58, 0.59, 0.61);
                    mb.quad(pA_uf[0], y0A, pA_uf[2], pB_uf[0], y0B, pB_uf[2], pB_uf[0], y1B, pB_uf[2], pA_uf[0], y1A, pA_uf[2]);
                    mb.quad(pA_uf[0], y1A, pA_uf[2], pB_uf[0], y1B, pB_uf[2], pB_ub[0], y1B, pB_ub[2], pA_ub[0], y1A, pA_ub[2]);

                    if (!isAisle) {
                      md.mat(8);
                      this.setColor(md, colSeatMercedesBlue[0], colSeatMercedesBlue[1], colSeatMercedesBlue[2]);
                      const pA_sf = P(sA, dFront - 0.12), pB_sf = P(sB, dFront - 0.12);
                      const pA_sb = P(sA, dBack + 0.12), pB_sb = P(sB, dBack + 0.12);
                      md.quad(pA_sf[0], y1A + 0.35, pA_sf[2], pB_sf[0], y1B + 0.35, pB_sf[2], pB_sb[0], y1B + 0.35, pB_sb[2], pA_sb[0], y1A + 0.35, pA_sb[2]);
                      md.quad(pA_sb[0], y1A + 0.35, pA_sb[2], pB_sb[0], y1B + 0.35, pB_sb[2], pB_sb[0], y1B + 0.75, pB_sb[2], pA_sb[0], y1A + 0.75, pA_sb[2]);
                    }
                  }

                  // Cubierta en voladizo (cantilever canopy)
                  const dRoofBack = dMidBack - nUpRows * upRun - 1.5;
                  const dRoofTip = -(25.0 - 1.5);
                  const yRoofBackA = yMidTopA + nUpRows * upRise + 6.8;
                  const yRoofBackB = yMidTopB + nUpRows * upRise + 6.8;
                  const yRoofTipA = yRoofBackA - 3.2;
                  const yRoofTipB = yRoofBackB - 3.2;

                  const pA_rb = P(sA, dRoofBack), pB_rb = P(sB, dRoofBack);
                  const pA_rt = P(sA, dRoofTip), pB_rt = P(sB, dRoofTip);

                  md.mat(9);
                  this.setColor(md, colRoofWhite[0], colRoofWhite[1], colRoofWhite[2]);
                  md.quad(pA_rb[0], yRoofBackA, pA_rb[2], pB_rb[0], yRoofBackB, pB_rb[2], pB_rt[0], yRoofTipB, pB_rt[2], pA_rt[0], yRoofTipA, pA_rt[2]);

                  // Vigas y columnas en V
                  mb.mat(2, 120, 140);
                  this.setColor(mb, colSteelDark[0], colSteelDark[1], colSteelDark[2]);
                  mb.tube([[pA_rb[0], yRoofBackA - 0.25, pA_rb[2]], [pA_rt[0], yRoofTipA - 0.25, pA_rt[2]]], 0.16, 6);
                  mb.cyl(pA_rb[0], yBaseA, pA_rb[2], 0.38, yRoofBackA, 0.32, 10, true, true);
                  createPaddockTent(ctx, config) {
                    if (typeof PaddockProps !== 'undefined' && typeof PaddockProps.createPaddockTent === 'function') {
                      return PaddockProps.createPaddockTent(ctx, config);
                    }

                    // Estrella monumental de Mercedes-Benz 3D en la cima central
                    {
                      const sCenter = (arenaS0 + arenaS1) * 0.5;
                      const dRoofBackC = -48.0;
                      const pCenter = P(sCenter, dRoofBackC);
                      const yStarCenter = pCenter[1] + 25.5;

                      mb.mat(1);
                      this.setColor(mb, colChrome[0], colChrome[1], colChrome[2]);
                      const rRing = 4.2;
                      const nRingPts = 24;
                      const ringPts = [];
                      for (let i = 0; i <= nRingPts; i++) {
                        const ang = (i / nRingPts) * Math.PI * 2;
                        ringPts.push([pCenter[0], yStarCenter + Math.sin(ang) * rRing, pCenter[2] + Math.cos(ang) * rRing]);
                      }
                      mb.tube(ringPts, 0.14, 8);

                      for (let arm = 0; arm < 3; arm++) {
                        const ang = arm * (Math.PI * 2 / 3) + Math.PI * 0.5;
                        const tipX = pCenter[0], tipY = yStarCenter + Math.sin(ang) * (rRing - 0.15), tipZ = pCenter[2] + Math.cos(ang) * (rRing - 0.15);
                        mb.tube([[pCenter[0], yStarCenter, pCenter[2]], [tipX, tipY, tipZ]], 0.18, 6);
                      }
                    }

                    if (S1 && mb.ni > mbI0) S1.add(mb, mbI0, 7, 2600);
                    if (S2 && md.ni > mdI0) S2.add(md, mdI0, 7, 2600);
                    if (mp && SP && mp.ni > mpI0) SP.add(mp, mpI0, 1, 1400);
                  },

                  /**
                   * 5. EDIFICIO OFICIAL DE BOXES Y TORRE DE CONTROL
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
                      // 2. Seguridad y contención en pista
                      createTecproBarrier(ctx, config) {
                        if (typeof TrackSafetyProps !== 'undefined' && typeof TrackSafetyProps.createTecproBarrier === 'function') {
                          return TrackSafetyProps.createTecproBarrier(ctx, config);
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
                       * 6. CASTILLO MEDIEVAL MONUMENTAL (Burg Nürburg)
                       */
                      createMedievalCastle(ctx, config = {}) {
                        const { mb, S1 } = ctx;
                        if (!mb) return;

                        const cx = config.x ?? 1050.0, cz = config.z ?? -2150.0, cy = config.y ?? 115.0;
                        const cstI0 = mb.ni;

                        // Torre del homenaje circular
                        mb.mat(3);
                        this.setColor(mb, 0.44, 0.42, 0.40);
                        mb.cyl(cx, cy, cz, 6.5, cy + 24.0, 6.0, 16, true, true);

                        // Almenas
                        for (let i = 0; i < 12; i++) {
                          const ang = (i / 12) * Math.PI * 2;
                          const ax = cx + Math.cos(ang) * 6.1, az = cz + Math.sin(ang) * 6.1;
                          this.boxMinMax(mb, ax - 0.7, ax + 0.7, cy + 24.0, cy + 25.8, az - 0.7, az + 0.7);
                          createSausageKerbs(ctx, config) {
                            if (typeof TrackSafetyProps !== 'undefined' && typeof TrackSafetyProps.createSausageKerbs === 'function') {
                              return TrackSafetyProps.createSausageKerbs(ctx, config);
                            }

                            // Mástil y bandera
                            mb.mat(1);
                            this.setColor(mb, 0.85, 0.85, 0.85);
                            mb.cyl(cx, cy + 24.0, cz, 0.12, cy + 34.0, 0.06, 6, false, true);
                            mb.mat(17);
                            this.setColor(mb, 0.85, 0.15, 0.12);
                            this.boxMinMax(mb, cx, cx + 3.2, cy + 30.5, cy + 33.5, cz - 0.05, cz + 0.05);

                            // Muralla almenada
                            const hw_wall = 22.0, hd_wall = 19.0, h_wall = 8.5;
                            mb.mat(3);
                            this.setColor(mb, 0.40, 0.38, 0.36);
                            this.boxMinMax(mb, cx - hw_wall, cx + hw_wall, cy, cy + h_wall, cz - hd_wall, cz - hd_wall + 2.5);
                            this.boxMinMax(mb, cx - hw_wall, cx + hw_wall, cy, cy + h_wall, cz + hd_wall - 2.5, cz + hd_wall);
                            this.boxMinMax(mb, cx - hw_wall, cx - hw_wall + 2.5, cy, cy + h_wall, cz - hd_wall, cz + hd_wall);
                            this.boxMinMax(mb, cx + hw_wall - 2.5, cx + hw_wall, cy, cy + h_wall, cz - hd_wall, cz + hd_wall);

                            // Torreones
                            for (const [tx, tz] of [[-hw_wall, -hd_wall], [hw_wall, -hd_wall], [hw_wall, hd_wall], [-hw_wall, hd_wall]]) {
                              mb.cyl(cx + tx, cy, cz + tz, 3.2, cy + 11.0, 3.0, 10, true, true);
                            }
                            if (S1) S1.add(mb, cstI0, 7, 5000);
                          },

                          /**
                           * 7. BORDILLOS DISUASORIOS (Sausage Kerbs)
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
                              createBrakeDistanceSigns(ctx, config) {
                                if (typeof TrackSafetyProps !== 'undefined' && typeof TrackSafetyProps.createBrakeDistanceSigns === 'function') {
                                  return TrackSafetyProps.createBrakeDistanceSigns(ctx, config);
                                }
                                if (S1) S1.add(mb, skI0, 7, 650);
                              },

                              /**
                               * 8. CARTELES OFICIALES FIA DE DISTANCIA DE FRENADA (200m, 150m, 100m, 50m)
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
                                  createArmcoGuardrail(ctx, config) {
                                    if (typeof TrackSafetyProps !== 'undefined' && typeof TrackSafetyProps.createArmcoGuardrail === 'function') {
                                      return TrackSafetyProps.createArmcoGuardrail(ctx, config);
                                    }
                                    if (S1) S1.add(mb, brkI0, 7, 1200);
                                    if (S2) S2.add(md, brkD0, 7, 1200);
                                  },

                                  /**
                                   * 9. GUARDARRAÍL METÁLICO ARMCO BAJO PARA ESCAPATORIAS
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
                                      createWallFence(ctx, config) {
                                        if (typeof TrackSafetyProps !== 'undefined' && typeof TrackSafetyProps.createWallFence === 'function') {
                                          return TrackSafetyProps.createWallFence(ctx, config);
                                        }
                                        if (S1) S1.add(mb, fiaI0, 7, 1400);
                                      },

                                      /**
                                       * 10. CAMIÓN TRANSPORTER DE PADDOCK
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
                                          // 3. Tribunas y graderíos
                                          createGrandstand(ctx, config) {
                                            if (typeof GrandstandProps !== 'undefined' && typeof GrandstandProps.createGrandstand === 'function') {
                                              return GrandstandProps.createGrandstand(ctx, config);
                                            }
                                          },

                                          /**
                                           * 11. CARPA DE HOSPITALIDAD DE PADDOCK
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
                                              createMercedesArenaGrandstand(ctx, config) {
                                                if (typeof GrandstandProps !== 'undefined' && typeof GrandstandProps.createMercedesArenaGrandstand === 'function') {
                                                  return GrandstandProps.createMercedesArenaGrandstand(ctx, config);
                                                }
                                              },

                                              /**
                                               * 12. MUROS Y VALLAS METÁLICAS DE CONTENCIÓN (Catch Fencing)
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
                                                  // 4. Paisaje y escenografía singular
                                                  createMedievalCastle(ctx, config) {
                                                    if (typeof SceneryProps !== 'undefined' && typeof SceneryProps.createMedievalCastle === 'function') {
                                                      return SceneryProps.createMedievalCastle(ctx, config);
                                                    }
                                                  },

                                                  /**
                                                   * 15. ESCENOGRAFÍA URBANA COMPLETA DE LAS VEGAS STRIP F1 (SOLID)
                                                   * Túnel de contención Jersey + Catch Fencing FIA, escapatorias Tecpro, Paddock F1,
                                                   * Torres Tri-Wing, MSG Sphere, High Roller, Strip Hotels, Cañón de Rascacielos y Farolas F1.
                                                   */
                                                  createVegasUrbanProps(ctx, config = {}) {
                                                    const { mb, md, mp, S1, S2, SP, TRK, hw, frame, P, col, sign, REG, Bx, gantry, figure, sitter, stander, CROWD, mkRng } = ctx;
                                                    if (!mb || !TRK) return;
                                                    const rnd = typeof mkRng === 'function' ? mkRng(777) : Math.random;
                                                    const PI = Math.PI, PI2 = PI * 2;
                                                    const sI = s => (((Math.round(s / TRK.ds)) % TRK.N) + TRK.N) % TRK.N;
                                                    const locQ = new Float64Array(6);

                                                    const colorFn = typeof col === 'function' ? col : ((m, r, g, b, a = 1.0) => this.setColor(m, r, g, b, a));
                                                    const bxFn = typeof Bx === 'function' ? Bx : ((m, u0, u1, y0, y1, v0, v1) => this.boxMinMax(m, u0, u1, y0, y1, v0, v1));

                                                    // Asegurar registro de colisionadores físicos de edificios
                                                    if (!TRK.buildingColliders) TRK.buildingColliders = [];

                                                    // Helper para registrar un OBB (Oriented Bounding Box) en TRK.buildingColliders
                                                    const addBuildingCollider = (cx, cz, halfW, halfD, tx, tz, nx, nz) => {
                                                      const rx = Math.abs(tx * halfW) + Math.abs(nx * halfD);
                                                      const rz = Math.abs(tz * halfW) + Math.abs(nz * halfD);
                                                      TRK.buildingColliders.push({
                                                        cx, cz, hw: halfW, hd: halfD, tx, tz, nx, nz,
                                                        minX: cx - rx, maxX: cx + rx, minZ: cz - rz, maxZ: cz + rz
                                                      });
                                                    };

                                                    // =========================================================================
                                                    // 1. SISTEMA DE VALLADO CONTINUO Y TÚNEL DE CONTENCIÓN EN LÍNEA (Muro Jersey + Catch Fencing)
                                                    // =========================================================================
                                                    const wallStep = config.perimeterJerseyWall?.step || 4.0;
                                                    const nSegs = Math.round(TRK.L / wallStep);
                                                    const dS = TRK.L / nSegs;

                                                    const getWallD = (s, side) => {
                                                      const u = ((s / TRK.ds) % TRK.N + TRK.N) % TRK.N;
                                                      const i0 = Math.floor(u), f = u - i0, i1 = (i0 + 1) % TRK.N;
                                                      const bar = side < 0 ? TRK.barL : TRK.barR;
                                                      const b0 = bar ? bar[i0] : (hw + 0.85), b1 = bar ? bar[i1] : (hw + 0.85);
                                                      return side * (b0 + (b1 - b0) * f);
                                                    };

                                                    const th = 0.42; // Espesor del muro Jersey hacia el exterior

                                                    if (md) {
                                                      for (const side of [-1, 1]) {
                                                        let i0MB = mb.ni, j0MD = md.ni, count = 0;
                                                        const flushWall = () => {
                                                          if (count > 0) {
                                                            if (S1) S1.add(mb, i0MB, 3, 750);
                                                            if (S2) S2.add(md, j0MD, 7, 950);
                                                            i0MB = mb.ni; j0MD = md.ni; count = 0;
                                                          }
                                                        };

                                                        for (let st = 0; st < nSegs; st++) {
                                                          const s0 = st * dS, s1 = (st + 1) * dS;
                                                          const d0 = getWallD(s0, side), d1 = getWallD(s1, side);
                                                          const p0 = P(s0, d0), p1 = P(s1, d1);

                                                          const dx = p1[0] - p0[0], dz = p1[2] - p0[2];
                                                          const segLen = Math.hypot(dx, dz);
                                                          if (segLen < 1e-3) continue;

                                                          const tx = dx / segLen, tz = dz / segLen;
                                                          const inX = tz * side, inZ = -tx * side;
                                                          const outX = -inX, outZ = -inZ;

                                                          const x0 = p0[0], y0 = p0[1], z0 = p0[2];
                                                          const x1 = p1[0], y1 = p1[1], z1 = p1[2];
                                                          const x0_t = p0[0], y0_t = p0[1] + 1.0, z0_t = p0[2];
                                                          const x1_t = p1[0], y1_t = p1[1] + 1.0, z1_t = p1[2];

                                                          const x0_tb = x0_t + outX * th, y0_tb = y0_t, z0_tb = z0_t + outZ * th;
                                                          const x1_tb = x1_t + outX * th, y1_tb = y1_t, z1_tb = z1_t + outZ * th;
                                                          const x0_bb = x0 + outX * th, y0_bb = y0 - 0.25, z0_bb = z0 + outZ * th;
                                                          const x1_bb = x1 + outX * th, y1_bb = y1 - 0.25, z1_bb = z1 + outZ * th;

                                                          // Cara frontal de hormigón del muro Jersey
                                                          mb.mat(2, 90, 80); colorFn(mb, 0.74, 0.75, 0.77);
                                                          if (side < 0) {
                                                            mb.quad(x0, y0 - 0.25, z0, x1, y1 - 0.25, z1, x1_t, y1_t, z1_t, x0_t, y0_t, z0_t, 0, 0, segLen, 1.25);
                                                          } else {
                                                            mb.quad(x1, y1 - 0.25, z1, x0, y0 - 0.25, z0, x0_t, y0_t, z0_t, x1_t, y1_t, z1_t, 0, 0, segLen, 1.25);
                                                          }

                                                          // Paneles de publicidad oficial F1
                                                          const sponsorIdx = Math.floor(st / 4 + (side > 0 ? 6 : 0)) % 12;
                                                          const brandKey = 'b' + sponsorIdx;
                                                          const rBan = (REG && REG[brandKey]) ? REG[brandKey] : (REG && REG['b0'] ? REG['b0'] : null);
                                                          if (rBan) {
                                                            md.mat(7, 0, 0); colorFn(md, 1, 1, 1);
                                                            const offF = 0.015;
                                                            const bx0 = x0 + inX * offF, bz0 = z0 + inZ * offF;
                                                            const bx1 = x1 + inX * offF, bz1 = z1 + inZ * offF;
                                                            if (side < 0) {
                                                              md.quad(bx0, y0 + 0.12, bz0, bx1, y1 + 0.12, bz1, bx1, y1 + 0.88, bz1, bx0, y0 + 0.88, bz0, rBan[0], rBan[3], rBan[2], rBan[1]);
                                                            } else {
                                                              md.quad(bx1, y1 + 0.12, bz1, bx0, y0 + 0.12, bz0, bx0, y0 + 0.88, bz0, bx1, y1 + 0.88, bz1, rBan[2], rBan[3], rBan[0], rBan[1]);
                                                            }
                                                          }

                                                          // Banda reflectora amarilla
                                                          mb.mat(11, 0, 0); colorFn(mb, 0.96, 0.82, 0.12);
                                                          const yMid0 = y0 + 0.62, yMid1 = y1 + 0.62;
                                                          if (side < 0) {
                                                            mb.quad(x0 + inX * 0.005, yMid0, z0 + inZ * 0.005, x1 + inX * 0.005, yMid1, z1 + inZ * 0.005, x1 + inX * 0.005, yMid1 + 0.12, z1 + inZ * 0.005, x0 + inX * 0.005, yMid0 + 0.12, z0 + inZ * 0.005, 0, 0, segLen, 0.12);
                                                          } else {
                                                            mb.quad(x1 + inX * 0.005, yMid1, z1 + inZ * 0.005, x0 + inX * 0.005, yMid0, z0 + inZ * 0.005, x0 + inX * 0.005, yMid0 + 0.12, z0 + inZ * 0.005, x1 + inX * 0.005, yMid1 + 0.12, z1 + inZ * 0.005, 0, 0, segLen, 0.12);
                                                          }

                                                          // Coronación superior biselada
                                                          mb.mat(2, 90, 80); colorFn(mb, 0.68, 0.69, 0.71);
                                                          mb.quad(x0_t, y0_t, z0_t, x1_t, y1_t, z1_t, x1_tb, y1_tb, z1_tb, x0_tb, y0_tb, z0_tb, 0, 0, segLen, th);

                                                          // Cara posterior exterior
                                                          mb.mat(2, 80, 80); colorFn(mb, 0.58, 0.59, 0.62);
                                                          mb.quad(x1_tb, y1_tb, z1_tb, x0_tb, y0_tb, z0_tb, x0_bb, y0_bb, z0_bb, x1_bb, y1_bb, z1_bb, 0, 0, segLen, 1.25);

                                                          // Postes verticales de acero negro
                                                          mb.mat(11, 0, 0, 110); colorFn(mb, 0.12, 0.13, 0.15);
                                                          mb.cyl(p0[0], p0[1] + 1.0, p0[2], 0.045, p0[1] + 4.5, 0.045, 6, false, true);
                                                          const armTipX = p0[0] + inX * 0.42, armTipY = p0[1] + 4.65, armTipZ = p0[2] + inZ * 0.42;
                                                          mb.tube([[p0[0], p0[1] + 4.45, p0[2]], [armTipX, armTipY, armTipZ]], 0.035, 5);

                                                          // Valla metálica negra FIA Catch Fencing (3,5 m)
                                                          md.mat(7, 0, 0); colorFn(md, 0.12, 0.13, 0.15, 0.68);
                                                          if (side < 0) {
                                                            md.quad(x0, y0 + 1.0, z0, x1, y1 + 1.0, z1, x1, y1 + 4.5, z1, x0, y0 + 4.5, z0, 0, 0, segLen, 3.5);
                                                          } else {
                                                            md.quad(x1, y1 + 1.0, z1, x0, y0 + 1.0, z0, x0, y0 + 4.5, z0, x1, y1 + 4.5, z1, 0, 0, segLen, 3.5);
                                                          }

                                                          // Cables tensores
                                                          md.mat(11, 0, 0); colorFn(md, 0.42, 0.44, 0.46);
                                                          for (const ch of [1.8, 2.7, 3.6, 4.4]) {
                                                            if (side < 0) {
                                                              md.quad(x0, y0 + ch, z0, x1, y1 + ch, z1, x1, y1 + ch + 0.03, z1, x0, y0 + ch + 0.03, z0, 0, 0, segLen, 1);
                                                            } else {
                                                              md.quad(x1, y1 + ch, z1, x0, y0 + ch, z0, x0, y0 + ch + 0.03, z0, x1, y1 + ch + 0.03, z1, 0, 0, segLen, 1);
                                                            }
                                                          }

                                                          count++;
                                                          if (count >= 24) flushWall();
                                                        }
                                                        flushWall();
                                                      }
                                                      // 5. Escenografía urbana F1 Las Vegas
                                                      createVegasUrbanProps(ctx, config) {
                                                        if (typeof UrbanContainmentProps !== 'undefined' && typeof UrbanContainmentProps.createVegasUrbanProps === 'function') {
                                                          return UrbanContainmentProps.createVegasUrbanProps(ctx, config);
                                                        }

                                                        // Muro divisor de boxes (Pit Wall)
                                                        if (TRK.pit && md) {
                                                          const pwStep = 4.0;
                                                          const nPwSegs = Math.round((TRK.pit.s1 - TRK.pit.s0) / pwStep);
                                                          const dPwS = (TRK.pit.s1 - TRK.pit.s0) / nPwSegs;
                                                          const pwI0 = mb.ni, pwfI0 = md.ni;

                                                          for (let st = 0; st < nPwSegs; st++) {
                                                            const s0 = TRK.pit.s0 + st * dPwS, s1 = TRK.pit.s0 + (st + 1) * dPwS;
                                                            const p0 = P(s0, TRK.pit.wallD), p1 = P(s1, TRK.pit.wallD);
                                                            const dx = p1[0] - p0[0], dz = p1[2] - p0[2];
                                                            const segLen = Math.hypot(dx, dz);
                                                            if (segLen < 1e-3) continue;
                                                            const tx = dx / segLen, tz = dz / segLen;
                                                            const inX = tz, inZ = -tx;

                                                            mb.mat(2, 90, 80); colorFn(mb, 0.74, 0.75, 0.77);
                                                            mb.quad(p1[0], p1[1] - 0.25, p1[2], p0[0], p0[1] - 0.25, p0[2], p0[0], p0[1] + 1.05, p0[2], p1[0], p1[1] + 1.05, p1[2], 0, 0, segLen, 1.3);

                                                            const pBrandKey = 'b' + (st % 12);
                                                            const rPitBan = (REG && REG[pBrandKey]) ? REG[pBrandKey] : (REG && REG['b0'] ? REG['b0'] : null);
                                                            if (rPitBan) {
                                                              md.mat(7, 0, 0); colorFn(md, 1, 1, 1);
                                                              const bx0 = p0[0] + inX * 0.015, bz0 = p0[2] + inZ * 0.015;
                                                              const bx1 = p1[0] + inX * 0.015, bz1 = p1[2] + inZ * 0.015;
                                                              md.quad(bx1, p1[1] + 0.12, bz1, bx0, p0[1] + 0.12, bz0, bx0, p0[1] + 0.88, bz0, bx1, p1[1] + 0.88, bz1, rPitBan[2], rPitBan[3], rPitBan[0], rPitBan[1]);
                                                            }

                                                            mb.mat(11); colorFn(mb, 0.15, 0.16, 0.18);
                                                            mb.cyl(p0[0], p0[1] + 1.05, p0[2], 0.045, p0[1] + 3.8, 0.045, 6, false, true);

                                                            md.mat(7); colorFn(md, 0.18, 0.18, 0.20, 0.65);
                                                            md.quad(p1[0], p1[1] + 1.05, p1[2], p0[0], p0[1] + 1.05, p0[2], p0[0], p0[1] + 3.75, p0[2], p1[0], p1[1] + 3.75, p1[2], 0, 0, segLen, 2.7);
                                                          }
                                                          if (S1) S1.add(mb, pwI0, 3, 500);
                                                          if (S2) S2.add(md, pwfI0, 7, 700);
                                                        }

                                                        // =========================================================================
                                                        // 2. ESCAPATORIAS URBANAS ASFALTADAS CON BARRERAS TECPRO
                                                        // =========================================================================
                                                        const tecproWall = (sStart, sEnd, side, offsetWall) => {
                                                          const tpI0 = mb.ni;
                                                          const bLen = 1.6, bH = 1.25, bD = 0.65;
                                                          const nBlocks = Math.max(4, Math.round(Math.abs(sEnd - sStart) / bLen));
                                                          const step = (sEnd - sStart) / nBlocks;

                                                          for (let b = 0; b < nBlocks; b++) {
                                                            const s0 = sStart + b * step, s1 = sStart + (b + 1) * step;
                                                            const d0 = getWallD(s0, side) - side * offsetWall, d1 = getWallD(s1, side) - side * offsetWall;
                                                            const p0 = P(s0, d0), p1 = P(s1, d1);
                                                            const dx = p1[0] - p0[0], dz = p1[2] - p0[2];
                                                            const segLen = Math.hypot(dx, dz);
                                                            if (segLen < 1e-3) continue;

                                                            const tx = dx / segLen, tz = dz / segLen;
                                                            const inX = tz * side, inZ = -tx * side;
                                                            const isRed = (b % 2 === 0);

                                                            mb.mat(2, 60, 40);
                                                            if (isRed) colorFn(mb, 0.88, 0.06, 0.06); else colorFn(mb, 0.95, 0.95, 0.95);

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
                                                        };

                                                        // A. Curva 1 (Koval Hairpin, s = 80..160, exterior derecha):
                                                        {
                                                          const ro1I0 = mb.ni;
                                                          for (let s = 80; s <= 160; s += 8) {
                                                            const m = frame(s, hw + 7.0, 0, 0);
                                                            mb.push(m);
                                                            mb.mat(2, 40, 60); colorFn(mb, 0.05, 0.35, 0.95);
                                                            bxFn(mb, -4.0, 4.0, 0.01, 0.04, -3.5, 3.5);
                                                            mb.mat(11); colorFn(mb, 0.96, 0.96, 0.98);
                                                            for (let lx = -3.0; lx <= 3.0; lx += 3.0) {
                                                              bxFn(mb, lx - 0.15, lx + 0.15, 0.041, 0.045, -3.4, 3.4);
                                                            }
                                                            mb.pop();
                                                          }
                                                          if (S1) S1.add(mb, ro1I0, 3, 850);
                                                          tecproWall(95, 145, 1, 0.45);

                                                          const hnkI0 = mb.ni;
                                                          for (let s = 112; s <= 138; s += 8) {
                                                            const m = frame(s, hw + 13.9, 0, 0);
                                                            mb.push(m);
                                                            mb.mat(2, 60, 40); colorFn(mb, 0.0, 0.48, 0.2);
                                                            bxFn(mb, -4.0, 4.0, 1.15, 3.85, -0.1, 0.1);
                                                            if (REG && (REG['heineken'] || REG['b0']) && typeof sign === 'function') {
                                                              sign(mb, -3.9, 1.25, -0.12, 7.8, 0, 0, 2.5, REG['heineken'] ? 'heineken' : 'b0', 0);
                                                            }
                                                            mb.pop();
                                                          }
                                                          if (S1) S1.add(mb, hnkI0, 3, 750);
                                                        }

                                                        // B. Curva 5 (Frenada hacia la Esfera, s = 1880..2010, exterior izquierda):
                                                        {
                                                          const ro5I0 = mb.ni;
                                                          for (let s = 1880; s <= 2010; s += 8) {
                                                            const m = frame(s, -(hw + 7.0), 0, 0);
                                                            mb.push(m);
                                                            const ph = ((s - 1880) / 24) | 0;
                                                            mb.mat(2, 50, 70);
                                                            if (ph % 3 === 0) colorFn(mb, 0.0, 0.88, 1.0);
                                                            else if (ph % 3 === 1) colorFn(mb, 1.0, 0.05, 0.58);
                                                            else colorFn(mb, 0.10, 0.10, 0.12);
                                                            bxFn(mb, -4.0, 4.0, 0.01, 0.04, -3.5, 3.5);
                                                            mb.pop();
                                                          }
                                                          if (S1) S1.add(mb, ro5I0, 3, 850);
                                                          tecproWall(1900, 1980, -1, 0.45);
                                                        }

                                                        // C. Curva 12 (Entrada al Strip, s = 3300..3430, exterior derecha):
                                                        {
                                                          const ro12I0 = mb.ni;
                                                          for (let s = 3300; s <= 3430; s += 8) {
                                                            const m = frame(s, hw + 7.0, 0, 0);
                                                            mb.push(m);
                                                            mb.mat(2, 40, 60); colorFn(mb, 0.06, 0.18, 0.42);
                                                            bxFn(mb, -4.0, 4.0, 0.01, 0.04, -3.5, 3.5);
                                                            mb.mat(11); colorFn(mb, 0.0, 0.88, 1.0);
                                                            bxFn(mb, -1.8, 1.8, 0.041, 0.045, -0.5, 0.5);
                                                            mb.pop();
                                                          }
                                                          if (S1) S1.add(mb, ro12I0, 3, 850);
                                                          tecproWall(3320, 3400, 1, 0.45);
                                                        }

                                                        // D. Curva 14 (Final del Strip, s = 5010..5190, exterior derecha):
                                                        {
                                                          const ro14I0 = mb.ni;
                                                          for (let s = 5010; s <= 5190; s += 8) {
                                                            const m = frame(s, hw + 7.5, 0, 0);
                                                            mb.push(m);
                                                            mb.mat(2, 30, 40); colorFn(mb, 0.08, 0.14, 0.28);
                                                            bxFn(mb, -4.0, 4.0, 0.01, 0.04, -4.2, 4.2);
                                                            mb.pop();
                                                          }
                                                          if (S1) S1.add(mb, ro14I0, 3, 850);
                                                          tecproWall(5040, 5160, 1, 0.45);

                                                          // E. Pintura monumental en el asfalto antes de Curva 14 (s = 4940):
                                                          // Rótulo monumental "LAS VEGAS" y Flechas de neón rosa y azul cian
                                                          const mDecal = frame(4940, 0.0, 0, 0.02);
                                                          const lvI0 = mb.ni;
                                                          mb.push(mDecal);
                                                          mb.mat(2, 20, 20); colorFn(mb, 0.06, 0.06, 0.08);
                                                          bxFn(mb, -18.0, 18.0, 0.01, 0.025, -(hw - 0.5), hw - 0.5);
                                                          mb.mat(6, 255, 0); colorFn(mb, 1.0, 0.95, 0.85);
                                                          for (let u = -10.0; u <= 10.0; u += 2.5) {
                                                            bxFn(mb, u - 0.8, u + 0.8, 0.026, 0.035, -3.5, 3.5);
                                                          }
                                                          mb.mat(6, 250, 0); colorFn(mb, 1.0, 0.12, 0.65);
                                                          bxFn(mb, 2.0, 14.0, 0.035, 0.045, -hw + 1.5, -hw + 3.2);
                                                          mb.mat(6, 250, 0); colorFn(mb, 0.0, 0.88, 1.0);
                                                          bxFn(mb, 4.0, 16.0, 0.035, 0.045, -hw + 3.6, -hw + 5.2);
                                                          mb.pop();
                                                          if (S1) S1.add(mb, lvI0, 7, 650);
                                                        }

                                                        // =========================================================================
                                                        // 3. PADDOCK BUILDING OFICIAL F1 LAS VEGAS Y ARQUITECTURA SINGULAR
                                                        // =========================================================================
                                                        if (typeof LandmarkFactory !== 'undefined') {
                                                          if (typeof LandmarkFactory.createPaddockBuildingF1 === 'function') {
                                                            LandmarkFactory.createPaddockBuildingF1({ ...ctx, addCollider: addBuildingCollider, rnd });
                                                          }

                                                          function buildTriWingTower(cx, cy, cz, h, wingLen, wingWid, yaw, facadeMat, wallColor, winColor, crownColor) {
                                                            if (typeof LandmarkFactory.createTriWingTower === 'function') {
                                                              LandmarkFactory.createTriWingTower(ctx, {
                                                                cx, cy, cz, h, wingLen, wingWid, yaw, facadeMat, wallColor, winColor, crownColor,
                                                                addCollider: addBuildingCollider
                                                              });
                                                            }
                                                          }

                                                          // Torres Y: Torre Y 1 (The Venetian), Torre Y 2 (The Mirage), Torre Y 3 (Caesars)
                                                          buildTriWingTower(-560.0, 0.0, -1450.0, 185.0, 52.0, 20.0, 0.35, 2, [0.82, 0.76, 0.62], [1.0, 0.94, 0.75], [1.0, 0.85, 0.3]);
                                                          buildTriWingTower(-820.0, 0.0, -550.0, 142.0, 44.0, 18.0, 0.82, 2, [0.72, 0.62, 0.38], [1.0, 0.90, 0.65], [1.0, 0.65, 0.1]);
                                                          buildTriWingTower(-520.0, 0.0, -220.0, 156.0, 48.0, 19.0, -0.45, 2, [0.85, 0.78, 0.68], [0.95, 0.92, 1.0], [0.2, 0.85, 1.0]);

                                                          // MSG Sphere
                                                          const spherePos = (TRK.spec && TRK.spec.spherePos) || [-750.0, 0.0, -1410.0];
                                                          const sphR = (TRK.spec && TRK.spec.sphereR) || 64.0;
                                                          if (typeof LandmarkFactory.createMsgSphere === 'function') {
                                                            LandmarkFactory.createMsgSphere(ctx, { pos: spherePos, radius: sphR });
                                                          }

                                                          // High Roller
                                                          const hrPos = (TRK.spec && TRK.spec.highRollerPos) || [90.0, 0.0, -900.0];
                                                          if (typeof LandmarkFactory.createHighRoller === 'function') {
                                                            LandmarkFactory.createHighRoller(ctx, { pos: hrPos });
                                                          }

                                                          // The Venetian & Campanario
                                                          if (typeof LandmarkFactory.createVenetianResort === 'function') {
                                                            LandmarkFactory.createVenetianResort({ ...ctx, addCollider: addBuildingCollider });
                                                          }

                                                          // Strip Hotels, Paris Eiffel Tower & Bellagio Fountains
                                                          if (typeof LandmarkFactory.createStripHotels === 'function') {
                                                            LandmarkFactory.createStripHotels({ ...ctx, addCollider: addBuildingCollider });
                                                          }
                                                          if (typeof LandmarkFactory.createEiffelTowerAndBalloon === 'function') {
                                                            LandmarkFactory.createEiffelTowerAndBalloon({ ...ctx, addCollider: addBuildingCollider });
                                                          }
                                                          if (typeof LandmarkFactory.createBellagioFountains === 'function') {
                                                            LandmarkFactory.createBellagioFountains({ ...ctx, addCollider: addBuildingCollider });
                                                          }
                                                        }

                                                        // =========================================================================
                                                        // 4. CAÑÓN URBANO DE RASCACIELOS CONTINUO (ZONA NO-BUILD ZONE >= 16M / >= 22M)
                                                        // =========================================================================
                                                        const stepS = config.urbanCanyon?.step || 40;
                                                        const nSteps = Math.floor(TRK.L / stepS);
                                                        const sphPosRef = (TRK.spec && TRK.spec.spherePos) || [-750.0, 0.0, -1410.0];
                                                        const hrPosRef = (TRK.spec && TRK.spec.highRollerPos) || [90.0, 0.0, -900.0];
                                                        const sphCX = sphPosRef[0], sphCZ = sphPosRef[2];
                                                        const hrCX = hrPosRef[0], hrCZ = hrPosRef[2];

                                                        for (let st = 0; st < nSteps; st++) {
                                                          const s = st * stepS;
                                                          for (const side of [-1, 1]) {
                                                            if (s >= 2100 && s <= 3750 && side < 0) continue;
                                                            if (s >= 800 && s <= 1200 && side < 0) continue;
                                                            if (s >= 4500 && s <= 4900 && side > 0) continue;
                                                            if (s >= 4000 && s <= 4350) continue;
                                                            if (TRK.pit && s >= TRK.pit.bldS0 - 30 && s <= TRK.pit.bldS1 + 35 && side > 0) continue;
                                                            if (TRK.stand && s >= TRK.stand.s0 - 30 && s <= TRK.stand.s1 + 30 && side < 0) continue;

                                                            const w = 24.0 + rnd() * 14.0;
                                                            const depth = 20.0 + rnd() * 10.0;
                                                            const h = 55.0 + rnd() * 85.0;

                                                            const isUpperLeftCurve = (s >= 2500 && s <= 3350);
                                                            const minRequiredDist = isUpperLeftCurve ? 22.0 : 16.0;

                                                            let curD = side * Math.max(minRequiredDist + depth * 0.5, getWallD(s, side) + side * (depth * 0.5 + 2.0));
                                                            let valid = false;
                                                            let finalX = 0, finalZ = 0, finalTx = 0, finalTz = 0, finalNx = 0, finalNz = 0;

                                                            for (let attempt = 0; attempt < 4; attempt++) {
                                                              const pC = P(s, curD);
                                                              finalX = pC[0]; finalZ = pC[2];
                                                              finalTx = pC[3]; finalTz = pC[4];
                                                              finalNx = -finalTz; finalNz = finalTx;

                                                              const halfW = w * 0.5, halfD = depth * 0.5;
                                                              const testCorners = [
                                                                [-halfW, -halfD], [halfW, -halfD],
                                                                [-halfW, halfD], [halfW, halfD],
                                                                [0, -halfD], [0, halfD],
                                                                [-halfW, 0], [halfW, 0]
                                                              ];

                                                              let minObservedDist = Infinity;
                                                              for (const [lu, lv] of testCorners) {
                                                                const wx = finalX + finalTx * lu + finalNx * lv;
                                                                const wz = finalZ + finalTz * lu + finalNz * lv;
                                                                locQ[0] = wx; locQ[1] = wz;
                                                                if (typeof trackLocateQ === 'function') {
                                                                  trackLocateQ(-1, locQ);
                                                                  const dCenterline = Math.abs(locQ[3]);
                                                                  if (dCenterline < minObservedDist) minObservedDist = dCenterline;
                                                                } else {
                                                                  minObservedDist = minRequiredDist;
                                                                }
                                                              }

                                                              if (minObservedDist >= minRequiredDist) {
                                                                valid = true;
                                                                break;
                                                              } else {
                                                                const pushAmount = (minRequiredDist - minObservedDist) + 1.5;
                                                                curD += side * pushAmount;
                                                                if (Math.abs(curD) > 55.0) break;
                                                              }
                                                            }

                                                            if (!valid) continue;

                                                            const distToSph = Math.hypot(finalX - sphCX, finalZ - sphCZ);
                                                            const distToHR = Math.hypot(finalX - hrCX, finalZ - hrCZ);
                                                            if (distToSph < 185.0 && s >= 2500 && s <= 3750 && side < 0) continue;
                                                            if (distToHR < 125.0 && s >= 820 && s <= 1140 && side < 0) continue;

                                                            const m = frame(s, curD, 0, 0);
                                                            const bI0 = mb.ni;
                                                            mb.push(m);
                                                            mb.mat(2, 60, 100); colorFn(mb, 0.16 + rnd() * 0.18, 0.17 + rnd() * 0.18, 0.20 + rnd() * 0.22);
                                                            bxFn(mb, -w * 0.5, w * 0.5, 0, h, -depth * 0.5, depth * 0.5);

                                                            const nFl = Math.floor(h / 4.2);
                                                            for (let fl = 2; fl < nFl; fl += 2) {
                                                              mb.mat(6, 170, 0); colorFn(mb, 1.0, 0.94, 0.78);
                                                              bxFn(mb, -w * 0.46, w * 0.46, fl * 4.2, fl * 4.2 + 2.2, -depth * 0.52, -depth * 0.48);
                                                            }

                                                            const neonC = [[1.0, 0.15, 0.65], [0.1, 0.92, 1.0], [1.0, 0.85, 0.25], [0.75, 0.25, 1.0]][st % 4];
                                                            mb.mat(6, 255, 0); colorFn(mb, neonC[0], neonC[1], neonC[2]);
                                                            bxFn(mb, -w * 0.52, w * 0.52, h - 1.2, h, -depth * 0.53, -depth * 0.47);
                                                            mb.pop();
                                                            if (S1) S1.add(mb, bI0, 7, 2800);

                                                            addBuildingCollider(finalX, finalZ, w * 0.5, depth * 0.5, finalTx, finalTz, finalNx, finalNz);
                                                          }
                                                        }

                                                        // =========================================================================
                                                        // 5. FAROLAS F1 CADA 35M Y PUENTES PEATONALES CON PANTALLAS LED
                                                        // =========================================================================
                                                        const floodStep = config.streetLights?.step || 35;
                                                        const nFloods = Math.floor(TRK.L / floodStep);
                                                        for (let f = 0; f < nFloods; f++) {
                                                          const s = f * floodStep;
                                                          for (const side of [-1, 1]) {
                                                            const wallD = getWallD(s, side);
                                                            const d = wallD + side * 1.6;
                                                            const pM = P(s, d);
                                                            const tx = pM[3], tz = pM[4];
                                                            const inX = tz * side, inZ = -tx * side;
                                                            const xM = pM[0], yM = pM[1], zM = pM[2];
                                                            const flI0 = mb.ni;

                                                            mb.mat(1); colorFn(mb, 0.85, 0.86, 0.90);
                                                            mb.cyl(xM, yM, zM, 0.22, yM + 15.5, 0.12, 8, true, true);

                                                            mb.mat(2, 80, 80); colorFn(mb, 0.55, 0.56, 0.58);
                                                            mb.cyl(xM, yM - 0.2, zM, 0.45, yM + 0.45, 0.42, 8, true, true);

                                                            const armEndX = xM + inX * 4.0, armEndY = yM + 15.2, armEndZ = zM + inZ * 4.0;
                                                            mb.tube([[xM, yM + 15.2, zM], [armEndX, armEndY, armEndZ]], 0.08, 6);
                                                            mb.tube([[xM, yM + 13.8, zM], [xM + inX * 2.2, yM + 15.2, zM + inZ * 2.2]], 0.05, 5);

                                                            for (let q = 0; q < 4; q++) {
                                                              const t = 1.6 + q * 0.75;
                                                              const fx = xM + inX * t, fy = yM + 15.0, fz = zM + inZ * t;
                                                              mb.mat(2, 120, 140); colorFn(mb, 0.14, 0.15, 0.17);
                                                              mb.box(fx, fy, fz, 0.45, 0.35, 0.45);
                                                              mb.mat(6, 255, 0); colorFn(mb, 1.0, 0.98, 0.94);
                                                              mb.box(fx, fy - 0.16, fz, 0.40, 0.04, 0.40);
                                                            }

                                                            if (S1) S1.add(mb, flI0, 7, 1800);
                                                          }
                                                        }

                                                        // Puentes peatonales cerrados
                                                        const bridges = config.pedestrianBridges || [0, 800, 1750, 3600, 4250, 4800, 5600];
                                                        for (const gS of bridges) {
                                                          const mB = frame(gS, 0.0, 0, 0);
                                                          const pbI0 = mb.ni;
                                                          mb.push(mB);
                                                          const bridgeW = hw + 3.8;
                                                          mb.mat(11); colorFn(mb, 0.22, 0.24, 0.26);
                                                          mb.cyl(-bridgeW, 0, 0, 0.65, 8.5, 0.65, 8, true, true);
                                                          mb.cyl(bridgeW, 0, 0, 0.65, 8.5, 0.65, 8, true, true);

                                                          mb.mat(2, 60, 80); colorFn(mb, 0.15, 0.16, 0.18);
                                                          bxFn(mb, -2.5, 2.5, 6.5, 9.8, -bridgeW, bridgeW);

                                                          mb.mat(6, 200, 0); colorFn(mb, 0.9, 0.95, 1.0);
                                                          bxFn(mb, -2.6, -2.4, 7.2, 8.8, -(bridgeW - 0.5), bridgeW - 0.5);
                                                          bxFn(mb, 2.4, 2.6, 7.2, 8.8, -(bridgeW - 0.5), bridgeW - 0.5);

                                                          mb.mat(6, 255, 0); colorFn(mb, 0.0, 0.88, 1.0);
                                                          bxFn(mb, -2.7, -2.5, 6.6, 9.6, -6.5, 6.5);
                                                          mb.pop();
                                                          if (S1) S1.add(mb, pbI0, 7, 2400);
                                                        }
                                                      }
                                                    };

                                                    if (typeof window !== 'undefined') {
                                                      window.PropFactory = PropFactory;
                                                      window.buildVegasUrbanProps = (ctx) => PropFactory.createVegasUrbanProps(ctx, (ctx.TRK && ctx.TRK.spec && ctx.TRK.spec.props) || {});
                                                    }
                                                    if (typeof globalThis !== 'undefined') {
                                                      globalThis.PropFactory = PropFactory;
                                                      globalThis.buildVegasUrbanProps = (ctx) => PropFactory.createVegasUrbanProps(ctx, (ctx.TRK && ctx.TRK.spec && ctx.TRK.spec.props) || {});
                                                    }
                                                    if (typeof module !== 'undefined' && module.exports) {
                                                      module.exports = { PropFactory, buildVegasUrbanProps: (ctx) => PropFactory.createVegasUrbanProps(ctx, (ctx.TRK && ctx.TRK.spec && ctx.TRK.spec.props) || {}) };
                                                      module.exports = {
                                                        PropFactory,
                                                        buildVegasUrbanProps: (ctx) => PropFactory.createVegasUrbanProps(ctx, (ctx.TRK && ctx.TRK.spec && ctx.TRK.spec.props) || {})
                                                      };
                                                    }
