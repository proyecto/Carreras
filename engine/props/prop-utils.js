'use strict';
/**
 * PropUtils - Utilidades geométricas y de color compartidas para props
 */
const PropUtils = {
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
  }
};

if (typeof window !== 'undefined') {
  window.PropUtils = PropUtils;
}
if (typeof globalThis !== 'undefined') {
  globalThis.PropUtils = PropUtils;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PropUtils };
}
