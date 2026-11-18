'use strict';
// Circuito: Circuit de Spa-Francorchamps (1 archivo = 1 circuito)
// Trazado oficial de Gran Premio (~7,004 km) con 14,0 m de pista (hw: 7.0) para carreras de GT3 y F1.
// Incluye La Source, el legendario Eau Rouge y Raidillon, la recta de Kemmel, Les Combes,
// Rivage, Pouhon, Blanchimont y la chicana Bus Stop.
(() => {
  TRACKS.register({
    id: 'spa-francorchamps',
    name: 'Spa-Francorchamps',
    subtitle: 'Circuit de Spa-Francorchamps',
    specs: '7,004 km · 19 curvas · La Source, Eau Rouge, Raidillon, Blanchimont & Bus Stop',
    storageKey: 'mejor-spa-francorchamps',

    glb: 'tracks/spa.glb',
    glbOptions: {
      transform: {
        yaw: -1.156888,
        pos: [741.386, -21.2, 15.63]
      }
    },

    hw: 7.0, // Pista ancha de 14,0 m para GT3
    startS: -18,
    startD: -2.0,

    pit: { s0: -150, s1: 300, wallD: 12.0, laneD0: 13.0, laneD1: 22.0, bldS0: -100, bldS1: 150, bldD0: 22.5, bldD1: 38, padD1: 60 },
    stand: { s0: -80, s1: 120, d0: -18.0, d1: -45 },

    // Segmentos: ['S', longitud, elev] o ['A', radio, ángulo° (+ derecha), elev, nombre]
    segments: [
      ['S', 300, 0.0],
      ['A', 40, 150, -8.6, 'La Source'],
      ['S', 520, -14.2],
      ['A', 160, -30, -21.2, 'Eau Rouge'],
      ['A', 160, 40, 5.0, 'Raidillon 1'],
      ['A', 180, -10, 35.0, 'Raidillon 2'],
      ['S', 'Lw', 35.0, 'Kemmel'],
      ['A', 85, 80, 38.0, 'Les Combes 1'],
      ['A', 85, -75, 36.0, 'Les Combes 2'],
      ['A', 90, 45, 35.0, 'Malmedy'],
      ['S', 180, 10.0],
      ['A', 60, 160, -47.0, 'Rivage'],
      ['S', 120, -49.0],
      ['A', 80, -80, -50.0, "Speaker's Corner"],
      ['S', 150, -45.0],
      ['A', 140, -85, -35.0, 'Pouhon 1'],
      ['A', 130, -65, -30.0, 'Pouhon 2'],
      ['S', 220, -30.0],
      ['A', 85, 85, -29.8, 'Pif-Paf 1'],
      ['A', 85, -80, -28.0, 'Pif-Paf 2'],
      ['S', 140, -15.0],
      ['A', 95, 140, 0.0, 'Campus / Stavelot'],
      ['A', 110, 75, 2.3, 'Paul Frère'],
      ['S', 'Ln', -2.0],
      ['A', 260, -20, -5.1, 'Blanchimont 1'],
      ['S', 180, 0.0],
      ['A', 240, -15, 3.7, 'Blanchimont 2'],
      ['S', 260, 2.0],
      ['A', 35, 95, 1.0, 'Bus Stop 1'],
      ['A', 35, -90, 0.0, 'Bus Stop 2'],
      ['A', 60, 40, 0.0],
      ['S', 180, 0.0]
    ],

    // Relieve natural del valle de las Ardenas
    naturalH(x, z, cx, cz) {
      const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz);
      const slope = (0.012 * dx - 0.025 * dz) * (1 - smooth(400, 1100, r));
      const und = (fbm(x * 0.0038 + 1.7, z * 0.0038 - 2.8, 4) - 0.5) * 32 * smooth(80, 500, r);
      const ridge = 1 - Math.abs(fbm(x * 0.00075 - 2.1, z * 0.00075 + 3.8, 5) * 2 - 1);
      const peak = fbm(x * 0.00028 + 2.5, z * 0.00028 - 1.9, 4);
      const ardennesPeaks = (ridge * ridge * 280 + peak * 190 - 30) * smooth(500, 2400, r) + (peak * peak * 700) * smooth(2800, 7000, r);
      return slope + und + Math.max(-15, ardennesPeaks);
    },

    // Poses de cámara fijas (teclas 1 a 3)
    poses: [
      { nome: 'coche-frontal-34', tipo: 'coche', s: 180, d: -1.0, yaw: 3.75, ojo: [5.2, 1.45, -3.5], blanco: [0.1, 0.75, 0], fov: 0.5 },
      { nome: 'coche-trasera-34', tipo: 'coche', s: 180, d: -1.0, yaw: 0.61, ojo: [-5.3, 1.85, 3.6], blanco: [-0.1, 0.85, 0], fov: 0.5 },
      { nome: 'coche-lateral-baja', tipo: 'coche', s: 180, d: -1.0, yaw: 2.1, ojo: [1.0, 0.65, -5.5], blanco: [0.05, 0.85, 0], fov: 0.6 },
    ],

    replayB64: null,
  });
})();
