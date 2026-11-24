'use strict';
/**
 * PropFactory - Fachada centralizada de elementos discretos de pista y escenografía (SOLID - Facade Pattern)
 *
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
  // Helpers geométricos y cromáticos delegados
  boxMinMax(m, u0, u1, y0, y1, v0, v1) {
    if (typeof PropUtils !== 'undefined' && typeof PropUtils.boxMinMax === 'function') {
      return PropUtils.boxMinMax(m, u0, u1, y0, y1, v0, v1);
    }
    if (!m || typeof m.box !== 'function') return;
    const cx = (u0 + u1) * 0.5, cy = (y0 + y1) * 0.5, cz = (v0 + v1) * 0.5;
    m.box(cx, cy, cz, Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0));
  },

  setColor(m, r, g, b, a = 1.0) {
    if (typeof PropUtils !== 'undefined' && typeof PropUtils.setColor === 'function') {
      return PropUtils.setColor(m, r, g, b, a);
    }
    if (m && typeof m.color === 'function') {
      m.color(r, g, b, a);
    }
  },

  // 1. Paddock y meta
  createStartGantry(ctx, config) {
    if (typeof PaddockProps !== 'undefined' && typeof PaddockProps.createStartGantry === 'function') {
      return PaddockProps.createStartGantry(ctx, config);
    }
  },

  createPitBuilding(ctx, config) {
    if (typeof PaddockProps !== 'undefined' && typeof PaddockProps.createPitBuilding === 'function') {
      return PaddockProps.createPitBuilding(ctx, config);
    }
  },

  createPaddockTruck(ctx, config) {
    if (typeof PaddockProps !== 'undefined' && typeof PaddockProps.createPaddockTruck === 'function') {
      return PaddockProps.createPaddockTruck(ctx, config);
    }
  },

  createPaddockTent(ctx, config) {
    if (typeof PaddockProps !== 'undefined' && typeof PaddockProps.createPaddockTent === 'function') {
      return PaddockProps.createPaddockTent(ctx, config);
    }
  },

  // 2. Seguridad y contención en pista
  createTecproBarrier(ctx, config) {
    if (typeof TrackSafetyProps !== 'undefined' && typeof TrackSafetyProps.createTecproBarrier === 'function') {
      return TrackSafetyProps.createTecproBarrier(ctx, config);
    }
  },

  createSausageKerbs(ctx, config) {
    if (typeof TrackSafetyProps !== 'undefined' && typeof TrackSafetyProps.createSausageKerbs === 'function') {
      return TrackSafetyProps.createSausageKerbs(ctx, config);
    }
  },

  createBrakeDistanceSigns(ctx, config) {
    if (typeof TrackSafetyProps !== 'undefined' && typeof TrackSafetyProps.createBrakeDistanceSigns === 'function') {
      return TrackSafetyProps.createBrakeDistanceSigns(ctx, config);
    }
  },

  createArmcoGuardrail(ctx, config) {
    if (typeof TrackSafetyProps !== 'undefined' && typeof TrackSafetyProps.createArmcoGuardrail === 'function') {
      return TrackSafetyProps.createArmcoGuardrail(ctx, config);
    }
  },

  createWallFence(ctx, config) {
    if (typeof TrackSafetyProps !== 'undefined' && typeof TrackSafetyProps.createWallFence === 'function') {
      return TrackSafetyProps.createWallFence(ctx, config);
    }
  },

  // 3. Tribunas y graderíos
  createGrandstand(ctx, config) {
    if (typeof GrandstandProps !== 'undefined' && typeof GrandstandProps.createGrandstand === 'function') {
      return GrandstandProps.createGrandstand(ctx, config);
    }
  },

  createMercedesArenaGrandstand(ctx, config) {
    if (typeof GrandstandProps !== 'undefined' && typeof GrandstandProps.createMercedesArenaGrandstand === 'function') {
      return GrandstandProps.createMercedesArenaGrandstand(ctx, config);
    }
  },

  // 4. Paisaje y escenografía singular
  createMedievalCastle(ctx, config) {
    if (typeof SceneryProps !== 'undefined' && typeof SceneryProps.createMedievalCastle === 'function') {
      return SceneryProps.createMedievalCastle(ctx, config);
    }
  },

  // 5. Escenografía urbana F1 Las Vegas
  createVegasUrbanProps(ctx, config) {
    if (typeof UrbanContainmentProps !== 'undefined' && typeof UrbanContainmentProps.createVegasUrbanProps === 'function') {
      return UrbanContainmentProps.createVegasUrbanProps(ctx, config);
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
  module.exports = {
    PropFactory,
    buildVegasUrbanProps: (ctx) => PropFactory.createVegasUrbanProps(ctx, (ctx.TRK && ctx.TRK.spec && ctx.TRK.spec.props) || {})
  };
}
