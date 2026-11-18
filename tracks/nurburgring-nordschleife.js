'use strict';
// Circuito: Nürburgring Nordschleife ("El Infierno Verde") (1 archivo = 1 circuito)
// El trazado de montaña más legendario y desafiante del automovilismo (~6,86 km, ancho 13,6 m, hw: 6.8).
// Incluye Flugplatz, Schwedenkreuz, Fuchsröhre (-28m), Wehrseifen, Breidscheid (-42m), Bergwerk,
// Kesselchen, el mítico peralte de hormigón de Caracciola-Karussell (-180°), Hohe Acht (+45m), Brünnchen,
// Pflanzgarten y la interminable recta de velocidad punta de Döttinger Höhe (+300 km/h).
(() => {
  TRACKS.register({
    id: 'nurburgring-nordschleife',
    name: 'Nürburgring Nordschleife',
    subtitle: 'Infierno Verde',
    specs: '6,86 km · El Infierno Verde · Flugplatz, Fuchsröhre, Karussell y Döttinger Höhe',
    storageKey: 'melhor-nurburgring-nordschleife',

    hw: 6.8, // 13,6 m de ancho de asfalto para GT3
    startS: -16,
    startD: -1.8,

    pit: { s0: -110, s1: 220, wallD: 12.0, laneD0: 13.0, laneD1: 21.0, bldS0: -70, bldS1: 90, bldD0: 21.8, bldD1: 36, padD1: 58 },
    stand: { s0: -80, s1: 80, d0: -17.5, d1: -38 },

    // Segmentos: ['S', longitud, elev] o ['A', radio, ángulo° (+ derecha), elev, nombre]
    segments: [
      ['S', 168, 0.0],
      ['A', 70, 45, 1.5, 'Hatzenbach 1'],
      ['A', 70, -55, 3.0, 'Hatzenbach 2'],
      ['A', 75, 50, 4.5, 'Hatzenbach 3'],
      ['S', 70, 6.0],
      ['A', 120, 35, 10.0, 'Flugplatz 1'],
      ['A', 120, 25, 8.5, 'Flugplatz 2'],
      ['S', 105, 5.0],
      ['A', 130, -50, 2.0, 'Schwedenkreuz'],
      ['S', 98, -2.0],
      ['A', 65, 85, -6.0, 'Aremberg'],
      ['S', 168, -28.0],
      ['A', 110, -35, -24.0, 'Fuchsröhre Kompression'],
      ['A', 110, 35, -16.0, 'Fuchsröhre Aufstieg'],
      ['S', 63, -10.0],
      ['A', 60, -90, -5.0, 'Adenauer Forst 1'],
      ['A', 55, 90, -2.0, 'Adenauer Forst 2'],
      ['S', 70, 0.0],
      ['A', 95, -55, -3.0, 'Metzgesfeld 1'],
      ['A', 90, -45, -6.0, 'Metzgesfeld 2'],
      ['S', 84, -12.0],
      ['A', 85, 55, -18.0, 'Kallenhard'],
      ['S', 91, -26.0],
      ['A', 50, -125, -32.0, 'Wehrseifen'],
      ['S', 'Ln', -38.0],
      ['A', 75, 70, -42.0, 'Breidscheid'],
      ['S', 70, -34.0],
      ['A', 70, 70, -24.0, 'Ex-Mühle'],
      ['S', 84, -14.0],
      ['A', 75, 75, -6.0, 'Bergwerk'],
      ['S', 182, 8.0],
      ['A', 130, -30, 16.0, 'Kesselchen 1'],
      ['A', 130, 30, 24.0, 'Kesselchen 2'],
      ['S', 126, 30.0],
      ['A', 85, 40, 34.0, 'Steilstrecke'],
      ['S', 91, 36.0],
      ['A', 40, -180, 38.0, 'Caracciola-Karussell'],
      ['S', 70, 42.0],
      ['A', 75, 70, 45.0, 'Hohe Acht'],
      ['S', 63, 40.0],
      ['A', 80, 40, 32.0, 'Hedwigshöhe'],
      ['A', 85, -55, 26.0, 'Wippermann'],
      ['S', 70, 20.0],
      ['A', 75, 45, 14.0, 'Eschbach'],
      ['S', 63, 8.0],
      ['A', 65, 70, 4.0, 'Brünnchen 1'],
      ['A', 70, 40, 2.0, 'Brünnchen 2'],
      ['S', 'Lw', 0.0],
      ['A', 100, -45, -4.0, 'Pflanzgarten 1 Sprunghügel'],
      ['S', 84, -2.0],
      ['A', 110, 35, 0.0, 'Pflanzgarten 2'],
      ['S', 91, 2.0],
      ['A', 80, 50, 4.0, 'Schwalbenschwanz'],
      ['A', 42, -110, 5.0, 'Kleines Karussell'],
      ['S', 63, 4.0],
      ['A', 100, 60, 2.0, 'Galgenkopf 1'],
      ['A', 110, 50, 0.0, 'Galgenkopf 2'],
      ['S', 525, 0.0],
      ['A', 130, -40, 0.0, 'Antoniusbuche'],
      ['S', 98, 0.0],
      ['A', 60, 40, 0.0, 'Tiergarten 1'],
      ['A', 60, -45, 0.0, 'Tiergarten 2'],
      ['S', 91, 0.0],
      ['A', 55, 115, 0.0, 'Hohenrain-Schikane'],
      ['S', 70, 0.0],
    ],

    // Sol matutino bajo entre la niebla del bosque de Eifel
    sun: { elDeg: 18, azDeg: 120, colorElDeg: 16 },

    // Zonas húmedas en las sombras profundas del bosque (Fuchsröhre y Breidscheid)
    wet: [
      [1250, 1550, 0.90],
      [2350, 2600, 0.80],
      [4200, 4450, 0.65],
    ],

    // Torres de televisión
    tvTowers: [
      [260, -1, 6.5, 6.0],
      [780, 1, 6.5, 6.0],
      [1350, -1, 7.0, 7.0],
      [2050, 1, 6.5, 6.0],
      [2700, -1, 7.0, 6.5],
      [3450, 1, 6.5, 6.0],
      [4300, -1, 7.0, 6.5],
      [5100, 1, 6.5, 6.0],
      [5900, -1, 7.0, 6.5],
      [6500, 1, 6.5, 6.0],
    ],

    // Paneles publicitarios
    billboards: [
      [200, 400, -1, 18, 7, 1.6, 1.05, false],
      [5200, 5650, 1, 25, 7, 1.6, 1.05, false],
      [5300, 5750, -1, 25, 7, 1.6, 1.05, false],
      [-100, -80, -1, 8.0, 7, 1.6, 1.05, false],
    ],

    // Pórticos publicitarios (en T13 y en la colosal recta de Döttinger Höhe)
    gantries: [280, 5450],

    // Relieve montañoso alpino de Eifel
    naturalH(x, z, cx, cz) {
      const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz);
      const slope = (0.016 * dx - 0.022 * dz) * (1 - smooth(380, 950, r));
      const und = (fbm(x * 0.0038 + 1.9, z * 0.0038 - 2.8, 4) - 0.5) * 26 * smooth(60, 400, r);
      const ridge = 1 - Math.abs(fbm(x * 0.0008 - 2.1, z * 0.0008 + 3.8, 5) * 2 - 1);
      const peak = fbm(x * 0.00028 + 2.8, z * 0.00028 - 3.1, 4);
      const mountains = (ridge * ridge * 260 + peak * 180 - 20) * smooth(450, 2200, r) + (peak * peak * 680) * smooth(2700, 6200, r);
      return slope + und + Math.max(-14, mountains);
    },

    // Poses de cámara
    poses: [
      { nome: 'coche-frontal-34', tipo: 'coche', s: 170, d: -1.0, yaw: 3.75, ojo: [5.0, 1.40, -3.4], blanco: [0.1, 0.75, 0], fov: 0.5 },
      { nome: 'coche-trasera-34', tipo: 'coche', s: 170, d: -1.0, yaw: 0.61, ojo: [-5.1, 1.80, 3.5], blanco: [-0.1, 0.85, 0], fov: 0.5 },
      { nome: 'coche-lateral-baja', tipo: 'coche', s: 170, d: -1.0, yaw: 2.1, ojo: [1.0, 0.65, -5.3], blanco: [0.05, 0.85, 0], fov: 0.6 },
    ],

    replayB64: null,
  });
})();
