(function (RootScope) {
  "use strict";
  /**
   * Strategies - Patrón Strategy (Estrategias de Conducción IA y Cámaras)
   * Desacopla los algoritmos intercambiables de navegación de la IA y puntos de vista de cámara.
   */

  const STRAT_CFG =
    (typeof window !== "undefined" &&
      window.__CFG_ENGINE_PATTERNS_STRATEGIES) ||
    (typeof require === "function"
      ? (() => {
          try {
            return require("../../config/engine/patterns/strategies.json");
          } catch {
            return {};
          }
        })()
      : {});
  const aiStratCfg = STRAT_CFG.AIDrivingStrategies || {};

  /**
   * Estrategias de Conducción para la IA Rival
   */
  const AIDrivingStrategies = {
    RacingLine: {
      name: "RacingLine",
      calculateTarget(currentPos, trackSpline, lateralOffset) {
        const mult =
          aiStratCfg.RacingLine && aiStratCfg.RacingLine.speedMultiplier
            ? aiStratCfg.RacingLine.speedMultiplier.value
            : 1.0;
        return { targetOffset: lateralOffset, speedMultiplier: mult };
      },
    },
    Overtake: {
      name: "Overtake",
      calculateTarget(currentPos, trackSpline, lateralOffset) {
        const ov = aiStratCfg.Overtake || {};
        const off = ov.lateralOffset ? ov.lateralOffset.value : 1.8;
        const mult = ov.speedMultiplier ? ov.speedMultiplier.value : 1.05;
        return {
          targetOffset: lateralOffset > 0 ? -off : off,
          speedMultiplier: mult,
        };
      },
    },
    Defensive: {
      name: "Defensive",
      calculateTarget(currentPos, trackSpline, lateralOffset) {
        const df = aiStratCfg.Defensive || {};
        const off = df.targetOffset ? df.targetOffset.value : 0.0;
        const mult = df.speedMultiplier ? df.speedMultiplier.value : 0.98;
        return { targetOffset: off, speedMultiplier: mult };
      },
    },
  };

  /**
   * Estrategias de Cámara
   */
  const CameraStrategies = {
    Chase: { id: 0, name: "Chase" },
    Bonnet: { id: 1, name: "Bonnet" },
    TV: { id: 2, name: "TV" },
  };

  RootScope.AIDrivingStrategies = AIDrivingStrategies;
  RootScope.CameraStrategies = CameraStrategies;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      AIDrivingStrategies,
      CameraStrategies,
    };
  }
})(
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this,
);
