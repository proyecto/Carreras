'use strict';
// Catálogo y metadatos de circuitos disponibles.
window.TRACK_MANIFEST = [
  {
    id: 'nurburgring-gp',
    name: 'Nürburgring GP',
    subtitle: 'GP-Strecke',
    specs: '5,15 km · 15 curvas · Ancho FIA GT3 · Trazado oficial de Gran Premio',
    json: 'tracks/nurburgring-gp.json'
  },
  {
    id: 'spa-francorchamps',
    name: 'Spa-Francorchamps',
    subtitle: 'Circuit de Spa-Francorchamps',
    specs: '7,004 km · 19 curvas · La Source, Eau Rouge, Raidillon, Pouhon & Blanchimont',
    json: 'tracks/spa-francorchamps.json'
  },
  {
    id: 'las-vegas-strip',
    name: 'Las Vegas Strip',
    subtitle: 'Las Vegas Strip Circuit · Night GP',
    specs: '6,20 km · 17 curvas · Carrera Nocturna · The Strip & MSG Sphere',
    night: true,
    urban: true,
    noVegetation: true,
    json: 'tracks/las-vegas-strip.json'
  }
];

window.TRACK_LIST = window.TRACK_MANIFEST.map(t => t.json);

// Pre-registrar en TrackFactory / TRACKS si el registro ya está disponible
if (typeof TrackFactory !== 'undefined' && typeof TrackFactory.register === 'function') {
  for (const item of window.TRACK_MANIFEST) {
    TrackFactory.register({
      id: item.id,
      name: item.name,
      subtitle: item.subtitle,
      specs: item.specs,
      json: item.json,
      night: item.night,
      urban: item.urban,
      noVegetation: item.noVegetation
    });
  }
} else if (typeof TRACKS !== 'undefined') {
  for (const item of window.TRACK_MANIFEST) {
    TRACKS.register({
      id: item.id,
      name: item.name,
      subtitle: item.subtitle,
      specs: item.specs,
      json: item.json,
      night: item.night,
      urban: item.urban,
      noVegetation: item.noVegetation
    });
  }
}
