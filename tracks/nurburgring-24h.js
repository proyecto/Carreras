'use strict';
// Circuito: Nürburgring 24 Horas (24h Gesamstrecke) (1 archivo = 1 circuito)
// El trazado definitivo de resistencia (~8,55 km, ancho 14,0 m, hw: 7.0).
// Combina la recta principal y boxes del GP, Mercedes-Arena, el enlace con el Infierno Verde
// (Flugplatz, Schwedenkreuz, Fuchsröhre, Wehrseifen, Breidscheid, Karussell, Hohe Acht, Brünnchen, Pflanzgarten),
// la gigantesca recta de Döttinger Höhe y la chicana Veedol/NGK del circuito de Gran Premio.
(() => {
  TRACKS.register({
    id: 'nurburgring-24h',
    name: 'Nürburgring 24 Horas',
    subtitle: '24h Gesamstrecke',
    specs: '8,55 km · Resistencia 24 Horas · GP Paddock, Arena y todo el Infierno Verde',
    storageKey: 'melhor-nurburgring-24h',

    hw: 7.0, // 14,0 m de ancho para carreras de resistencia GT3
    startS: -18,
    startD: -2.0,

    pit: { s0: -120, s1: 240, wallD: 12.2, laneD0: 13.2, laneD1: 21.5, bldS0: -75, bldS1: 95, bldD0: 22.2, bldD1: 37, padD1: 61 },
    stand: { s0: -90, s1: 90, d0: -18.5, d1: -42 },

    // Segmentos: ['S', longitud, elev] o ['A', radio, ángulo° (+ derecha), elev, nombre]
    segments: [
      ['S', 351, 0.0],
      ['A', 75, 100, -5.0, 'Yokohama-S'],
      ['S', 35, -8.0],
      ['A', 85, -70, -11.0, 'Castrol-Bogen'],
      ['S', 47, -12.0],
      ['A', 55, 125, -9.0, 'Mercedes-Arena 1'],
      ['S', 39, -8.0],
      ['A', 70, -75, -6.0, 'Mercedes-Arena 2'],
      ['S', 47, -5.0],
      ['A', 85, 40, -3.0, 'Mercedes-Arena Exit'],
      ['S', 140, 0.0],
      ['A', 95, -55, 3.0, 'Nordschleife-Anbindung'],
      ['S', 94, 6.0],
      ['A', 120, 35, 10.0, 'Flugplatz 1'],
      ['A', 120, 25, 8.5, 'Flugplatz 2'],
      ['S', 117, 5.0],
      ['A', 130, -50, 2.0, 'Schwedenkreuz'],
      ['S', 109, -2.0],
      ['A', 65, 85, -6.0, 'Aremberg'],
      ['S', 187, -28.0],
      ['A', 110, -35, -24.0, 'Fuchsröhre Kompression'],
      ['A', 110, 35, -16.0, 'Fuchsröhre Aufstieg'],
      ['S', 70, -10.0],
      ['A', 60, -90, -5.0, 'Adenauer Forst 1'],
      ['A', 55, 90, -2.0, 'Adenauer Forst 2'],
      ['S', 78, 0.0],
      ['A', 95, -55, -3.0, 'Metzgesfeld 1'],
      ['A', 90, -45, -6.0, 'Metzgesfeld 2'],
      ['S', 94, -12.0],
      ['A', 85, 55, -18.0, 'Kallenhard'],
      ['S', 101, -26.0],
      ['A', 50, -120, -32.0, 'Wehrseifen'],
      ['S', 'Ln', -38.0],
      ['A', 75, 70, -42.0, 'Breidscheid'],
      ['S', 78, -34.0],
      ['A', 70, 70, -24.0, 'Ex-Mühle'],
      ['S', 94, -14.0],
      ['A', 75, 70, -6.0, 'Bergwerk'],
      ['S', 203, 8.0],
      ['A', 130, -30, 16.0, 'Kesselchen 1'],
      ['A', 130, 30, 24.0, 'Kesselchen 2'],
      ['S', 140, 30.0],
      ['A', 85, 45, 34.0, 'Steilstrecke'],
      ['S', 101, 36.0],
      ['A', 40, -180, 38.0, 'Caracciola-Karussell'],
      ['S', 78, 42.0],
      ['A', 75, 70, 45.0, 'Hohe Acht'],
      ['S', 70, 40.0],
      ['A', 80, 40, 32.0, 'Hedwigshöhe'],
      ['A', 85, -55, 26.0, 'Wippermann'],
      ['S', 78, 20.0],
      ['A', 75, 45, 14.0, 'Eschbach'],
      ['S', 70, 8.0],
      ['A', 65, 70, 4.0, 'Brünnchen 1'],
      ['A', 70, 40, 2.0, 'Brünnchen 2'],
      ['S', 'Lw', 0.0],
      ['A', 100, -45, -4.0, 'Pflanzgarten 1 Sprunghügel'],
      ['S', 94, -2.0],
      ['A', 110, 35, 0.0, 'Pflanzgarten 2'],
      ['S', 101, 2.0],
      ['A', 80, 50, 4.0, 'Schwalbenschwanz'],
      ['A', 42, -110, 5.0, 'Kleines Karussell'],
      ['S', 70, 4.0],
      ['A', 100, 60, 2.0, 'Galgenkopf 1'],
      ['A', 110, 50, 0.0, 'Galgenkopf 2'],
      ['S', 530, 0.0],
      ['A', 130, -40, 0.0, 'Antoniusbuche'],
      ['S', 109, 0.0],
      ['A', 60, 40, 0.0, 'Tiergarten 1'],
      ['A', 60, -45, 0.0, 'Tiergarten 2'],
      ['S', 101, 0.0],
      ['A', 50, -40, 4.0, 'Veedol-Schikane 1'],
      ['A', 50, 80, 2.0, 'Veedol-Schikane 2'],
      ['A', 50, -40, 1.0, 'Veedol-Schikane 3'],
      ['A', 85, 90, 0.0, 'Coca-Cola-Kurve'],
      ['S', 172, 0.0],
    ],

    // Atardecer dorado de las 24 Horas
    sun: { elDeg: 14, azDeg: 205, colorElDeg: 11 },

    // Zonas húmedas
    wet: [
      [1400, 1700, 0.85],
      [2700, 2950, 0.75],
      [4800, 5050, 0.70],
      [8100, 8300, 0.60],
    ],

    // Torres de televisión
    tvTowers: [
      [320, -1, 7.0, 6.5],
      [950, 1, 6.5, 6.0],
      [1700, -1, 7.0, 7.0],
      [2500, 1, 6.5, 6.0],
      [3300, -1, 7.0, 6.5],
      [4200, 1, 6.5, 6.0],
      [5100, -1, 7.0, 6.5],
      [6000, 1, 6.5, 6.0],
      [7100, -1, 7.0, 6.5],
      [8200, 1, 6.5, 6.0],
    ],

    // Paneles publicitarios
    billboards: [
      [220, 420, -1, 18, 7, 1.6, 1.05, false],
      [6800, 7250, 1, 25, 7, 1.6, 1.05, false],
      [6900, 7350, -1, 25, 7, 1.6, 1.05, false],
      [-110, -90, -1, 8.0, 7, 1.6, 1.05, false],
    ],

    // Pórticos publicitarios
    gantries: [340, 7050],

    // Relieve natural de la cordillera de Eifel
    naturalH(x, z, cx, cz) {
      const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz);
      const slope = (0.015 * dx - 0.02 * dz) * (1 - smooth(380, 950, r));
      const und = (fbm(x * 0.0039 + 2.0, z * 0.0039 - 3.1, 4) - 0.5) * 25 * smooth(65, 410, r);
      const ridge = 1 - Math.abs(fbm(x * 0.00082 - 1.9, z * 0.00082 + 4.0, 5) * 2 - 1);
      const peak = fbm(x * 0.0003 + 3.0, z * 0.0003 - 2.9, 4);
      const mountains = (ridge * ridge * 250 + peak * 170 - 22) * smooth(460, 2150, r) + (peak * peak * 650) * smooth(2650, 6100, r);
      return slope + und + Math.max(-13, mountains);
    },

    // Poses de cámara
    poses: [
      { nome: 'carro-frente-34', tipo: 'carro', s: 180, d: -1.0, yaw: 3.75, olho: [5.2, 1.45, -3.5], alvo: [0.1, 0.75, 0], fov: 0.5 },
      { nome: 'carro-traseira-34', tipo: 'carro', s: 180, d: -1.0, yaw: 0.61, olho: [-5.3, 1.85, 3.6], alvo: [-0.1, 0.85, 0], fov: 0.5 },
      { nome: 'carro-lateral-baixa', tipo: 'carro', s: 180, d: -1.0, yaw: 2.1, olho: [1.0, 0.65, -5.5], alvo: [0.05, 0.85, 0], fov: 0.6 },
    ],

    replayB64: null,
  });
})();
