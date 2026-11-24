(function (RootScope) {
  'use strict';
  /**
   * Strategies - Patrón Strategy (Estrategias de Conducción IA y Cámaras)
   * Desacopla los algoritmos intercambiables de navegación de la IA y puntos de vista de cámara.
   */

  /**
   * Estrategias de Conducción para la IA Rival
   */
  const AIDrivingStrategies = {
    RacingLine: {
      name: 'RacingLine',
      calculateTarget(currentPos, trackSpline, lateralOffset) {
        return { targetOffset: lateralOffset, speedMultiplier: 1.0 };
      }
    },
    Overtake: {
      name: 'Overtake',
      calculateTarget(currentPos, trackSpline, lateralOffset) {
        return { targetOffset: lateralOffset > 0 ? -1.8 : 1.8, speedMultiplier: 1.05 };
      }
    },
    Defensive: {
      name: 'Defensive',
      calculateTarget(currentPos, trackSpline, lateralOffset) {
        return { targetOffset: 0.0, speedMultiplier: 0.98 };
      }
    }
  };

  /**
   * Estrategias de Cámara
   */
  const CameraStrategies = {
    Chase: { id: 0, name: 'Chase' },
    Bonnet: { id: 1, name: 'Bonnet' },
    TV: { id: 2, name: 'TV' }
  };

  RootScope.AIDrivingStrategies = AIDrivingStrategies;
  RootScope.CameraStrategies = CameraStrategies;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      AIDrivingStrategies,
      CameraStrategies
    };
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
