'use strict';
/**
 * SceneryProps - Elementos de escenografía natural, monumental y paisajística
 *
 * Incluye:
 * - createMedievalCastle: Castillo monumental en cumbre de horizonte (Burg Nürburg con torre del homenaje, almenas, muralla y torreones).
 */

const SceneryProps = {
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
   * 1. CASTILLO MEDIEVAL MONUMENTAL (Burg Nürburg)
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
  }
};

if (typeof window !== 'undefined') {
  window.SceneryProps = SceneryProps;
}
if (typeof globalThis !== 'undefined') {
  globalThis.SceneryProps = SceneryProps;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SceneryProps };
}
