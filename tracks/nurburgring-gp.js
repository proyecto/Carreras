'use strict';
// Circuito: Nürburgring GP-Strecke (1 archivo = 1 circuito)
// Trazado oficial de Gran Premio (~5,15 km) con 14,4 m de pista (hw: 7.2) para carreras de GT3 y F1.
// Incluye Yokohama-S, Mercedes-Arena, Ford-Kurve, Dunlop-Kehre, Schumacher-S, Kumho y la chicana Veedol/NGK.
(() => {
  TRACKS.register({
    id: 'nurburgring-gp',
    name: 'Nürburgring GP',
    subtitle: 'GP-Strecke',
    specs: '5,15 km · 16 curvas · Ancho FIA GT3 · Trazado oficial de Gran Premio',
    storageKey: 'melhor-nurburgring-gp',

    hw: 7.2, // Pista ancha de 14,4 m para GT3
    startS: -18,
    startD: -2.0,

    pit: { s0: -120, s1: 240, wallD: 12.5, laneD0: 13.5, laneD1: 22.0, bldS0: -75, bldS1: 95, bldD0: 22.8, bldD1: 38, padD1: 62 },
    stand: { s0: -90, s1: 90, d0: -18.5, d1: -42 },

    // Segmentos: ['S', longitud, elev] o ['A', radio, ángulo° (+ derecha), elev, nombre]
    segments: [
      ['S', 730, 0.0],
      ['A', 75, 100, -5.0, 'Yokohama-S'],
      ['S', 45, -8.0],
      ['A', 85, -70, -11.0, 'Castrol-Bogen'],
      ['S', 60, -12.0],
      ['A', 55, 125, -9.0, 'Mercedes-Arena 1'],
      ['S', 50, -8.0],
      ['A', 70, -75, -6.0, 'Mercedes-Arena 2'],
      ['S', 60, -5.0],
      ['A', 85, 60, -3.0, 'Mercedes-Arena Exit'],
      ['S', 240, 0.0],
      ['A', 110, 60, 2.0, 'Ford-Kurve'],
      ['S', 220, 4.0],
      ['A', 65, -120, 0.0, 'Dunlop-Kehre'],
      ['S', 320, 6.0],
      ['A', 160, 45, 12.0, 'Schumacher-S 1'],
      ['A', 160, -45, 18.0, 'Schumacher-S 2'],
      ['A', 120, 100, 22.0, 'Kumho-Kurve'],
      ['S', 'Lw', 20.0],
      ['A', 130, 90, 14.0, 'Bit-Kurve'],
      ['S', 'Ln', 8.0],
      ['A', 50, -40, 4.0, 'Veedol-Schikane 1'],
      ['A', 50, 80, 2.0, 'Veedol-Schikane 2'],
      ['A', 50, -40, 1.0, 'Veedol-Schikane 3'],
      ['A', 85, 90, 0.0, 'Coca-Cola-Kurve'],
      ['S', 280, 0.0],
    ],

    // Sol despejado de media tarde para GP
    sun: { elDeg: 32, azDeg: 145, colorElDeg: 28 },

    // Zonas húmedas
    wet: [
      [1550, 1750, 0.85],
      [3650, 3850, 0.70]
    ],

    // Torres de televisión
    tvTowers: [
      [320, -1, 7, 6.5],
      [820, 1, 6.5, 6.0],
      [1350, -1, 7, 6.0],
      [1850, 1, 7, 6.5],
      [2450, -1, 7, 6.0],
      [3150, 1, 6.5, 6.0],
      [4200, -1, 7, 6.5],
      [4850, 1, 7, 6.0],
    ],

    // Paneles publicitarios
    billboards: [
      [220, 450, -1, 18, 7, 1.6, 1.05, false],
      [1950, 2250, 1, 24, 7, 1.6, 1.05, false],
      [3400, 3650, -1, 20, 7, 1.6, 1.05, false],
      [-110, -90, -1, 8.0, 7, 1.6, 1.05, false],
    ],

    // Pórticos publicitarios
    gantries: [380, 2600],

    // Relieve natural de la cordillera de Eifel
    naturalH(x, z, cx, cz) {
      const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz);
      const slope = (0.015 * dx - 0.02 * dz) * (1 - smooth(350, 900, r));
      const und = (fbm(x * 0.0042 + 2.1, z * 0.0042 - 3.4, 4) - 0.5) * 24 * smooth(70, 420, r);
      const ridge = 1 - Math.abs(fbm(x * 0.00085 - 1.8, z * 0.00085 + 4.2, 5) * 2 - 1);
      const peak = fbm(x * 0.00032 + 3.1, z * 0.00032 - 2.7, 4);
      const eifelPeaks = (ridge * ridge * 240 + peak * 160 - 25) * smooth(480, 2100, r) + (peak * peak * 620) * smooth(2600, 6000, r);
      return slope + und + Math.max(-12, eifelPeaks);
    },

    // Poses de cámara fijas (teclas 1 a 3)
    poses: [
      { nome: 'carro-frente-34', tipo: 'carro', s: 180, d: -1.0, yaw: 3.75, olho: [5.2, 1.45, -3.5], alvo: [0.1, 0.75, 0], fov: 0.5 },
      { nome: 'carro-traseira-34', tipo: 'carro', s: 180, d: -1.0, yaw: 0.61, olho: [-5.3, 1.85, 3.6], alvo: [-0.1, 0.85, 0], fov: 0.5 },
      { nome: 'carro-lateral-baixa', tipo: 'carro', s: 180, d: -1.0, yaw: 2.1, olho: [1.0, 0.65, -5.5], alvo: [0.05, 0.85, 0], fov: 0.6 },
    ],

    replayB64: null,
  });
})();
