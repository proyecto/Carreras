'use strict';
// Catálogo y metadatos de circuitos disponibles.
window.TRACK_MANIFEST = [
  {
    file: 'nurburgring-gp.js',
    id: 'nurburgring-gp',
    name: 'Nürburgring GP',
    subtitle: 'GP-Strecke',
    specs: '5,15 km · 15 curvas · Ancho FIA GT3 · Trazado oficial de Gran Premio'
  },
  {
    file: 'spa-francorchamps.js',
    id: 'spa-francorchamps',
    name: 'Spa-Francorchamps',
    subtitle: 'Circuit de Spa-Francorchamps',
    specs: '7,004 km · 19 curvas · La Source, Eau Rouge, Raidillon, Pouhon & Blanchimont'
  },
  {
    file: 'las-vegas-strip.js',
    id: 'las-vegas-strip',
    name: 'Las Vegas Strip',
    subtitle: 'Las Vegas Strip Circuit · Night GP',
    specs: '6,20 km · 17 curvas · Carrera Nocturna · The Strip & MSG Sphere',
    night: true,
    urban: true,
    noVegetation: true
  }
];

window.TRACK_LIST = window.TRACK_MANIFEST.map(t => t.file);

// Pre-registrar en TRACKS si el registro ya está disponible
if (typeof TRACKS !== 'undefined') {
  for (const item of window.TRACK_MANIFEST) {
    TRACKS.register({
      id: item.id,
      name: item.name,
      subtitle: item.subtitle,
      specs: item.specs,
      file: item.file,
      night: item.night,
      urban: item.urban,
      noVegetation: item.noVegetation
    });
  }
}
