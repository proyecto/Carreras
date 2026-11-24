'use strict';
// Catálogo y metadatos de coches disponibles.
// Cada entrada define la ficha visual para el menú de selección sin tener que cargar los megabytes de mallas y texturas 3D.
window.CAR_MANIFEST = [
  {
    file: 'ford-mustang-gt3-2024.js',
    id: 'ford-mustang-gt3-2024',
    name: 'Ford Mustang GT3 (2024)',
    subtitle: '2024 WEC & IMSA Spec · 5.4L Coyote V8 · 540 CV · RWD',
    specs: '1280 kg · 540 CV · Hewland 6-vel seq · RWD · Multimatic Aero',
    accent: '#0d47a1'
  },
  {
    file: 'ford-mustang-gt3.js',
    id: 'ford-mustang-gt3',
    name: 'Ford Mustang GT3',
    subtitle: 'Ford Performance GT3 Racer · 5.4L V8 · Carbon Spec · RWD',
    specs: '1270 kg · 535 CV · 6-vel seq · RWD · Multimatic Carbon Aero',
    accent: '#002244'
  },
  {
    file: 'porsche-911-1979.js',
    id: 'porsche-911-1979',
    name: 'Porsche 911 / 935 Turbo',
    subtitle: '1979 Porsche 935 Slantnose · Flat-6 Twin-Turbo · RWD',
    specs: '1040 kg · 750 CV · Moby Dick Aero · Chasis Gr.5 Competición · RWD',
    accent: '#e8251e'
  },
  {
    file: 'mclaren-x2-2018.js',
    id: 'mclaren-x2-2018',
    name: 'McLaren Ultimate Vision GT',
    subtitle: '2018 Vision Gran Turismo Concept · 4.0L Twin-Turbo V8 Hybrid · AWD',
    specs: '1000 kg · 1150 CV · Ground Effect Aero · Active Aero · AWD',
    accent: '#ff6600'
  },
  {
    file: 'bmw-m8-gte-2018.js',
    id: 'bmw-m8-gte-2018',
    name: 'BMW M8 GTE',
    subtitle: '2018 Le Mans & IMSA Endurance Racer · 4.0L Twin-Turbo V8 · RWD',
    specs: '1220 kg · 600 CV · Le Mans Aero Spec · Xtrac 6-speed seq · RWD',
    accent: '#1c69d4'
  },
  {
    file: 'mercedes-amg-gt3-2020.js',
    id: 'mercedes-amg-gt3-2020',
    name: 'Mercedes-AMG GT3 Evo',
    subtitle: '2020 GT3 Spec · 6.2L V8 atmosférico M159 · 550 CV',
    specs: '1285 kg · 550 CV · Hewland 6-vel seq · RWD · Shark Nose Aero',
    accent: '#c0c0c0'
  },
  {
    file: 'porsche-992-gt3-r-2024.js',
    id: 'porsche-992-gt3-r-2024',
    name: 'Porsche 911 GT3 R (992)',
    subtitle: '2024 GT3 Spec · Manthey Grello #91 · 4.2L Flat-6 · 565 CV',
    specs: '1250 kg · 565 CV · Secuencial 6-vel · RWD · Manthey Aero',
    accent: '#f5c500'
  },
  {
    file: 'nissan-gtr-gt3-2018.js',
    id: 'nissan-gtr-gt3-2018',
    name: 'Nissan GT-R Nismo GT3',
    subtitle: '2018 GT3 Spec · 3.8L Twin-Turbo V6 VR38DETT · RWD',
    specs: '1290 kg · 550 CV · Hewland 6-vel seq · RWD · Nismo Aero',
    accent: '#e60012'
  },
  {
    file: 'mclaren-720s-gt3-2020.js',
    id: 'mclaren-720s-gt3-2020',
    name: 'McLaren 720S GT3',
    subtitle: '2020 GT3 Spec · 4.0L Twin-Turbo V8 M840T · RWD',
    specs: '1220 kg · 500 CV · 6-vel seq · RWD · MonoCage II Aero',
    accent: '#ff8000'
  },
  {
    file: 'audi-r8-lms-evo-2020.js',
    id: 'audi-r8-lms-evo-2020',
    name: 'Audi R8 LMS Evo',
    subtitle: '2020 GT3 Spec · 5.2L Naturally-Aspirated V10 · RWD',
    specs: '1225 kg · 585 CV · 6-vel seq · RWD · Audi Sport Aero',
    accent: '#e60000'
  },
  {
    file: 'bmw-m3-touring-2026.js',
    id: 'bmw-m3-touring-2026',
    name: 'BMW M3 Touring 24H',
    subtitle: '2026 24H Nürburgring Spec · 3.0L Twin-Turbo I6 S58 · RWD',
    specs: '1560 kg · 530 CV · 8-vel M Steptronic · RWD · Shell Helix Aero',
    accent: '#ffcc00'
  },
  {
    file: 'mclaren-650s-gt3-2015.js',
    id: 'mclaren-650s-gt3-2015',
    name: 'McLaren 650S GT3',
    subtitle: '2015 GT3 Spec · 3.8L Twin-Turbo V8 M838T · RWD',
    specs: '1240 kg · 500 CV · 6-vel seq · RWD · MonoCell Aero',
    accent: '#ff5500'
  },
  {
    file: 'mercedes-amg-gt4-2020.js',
    id: 'mercedes-amg-gt4-2020',
    name: 'Mercedes-AMG GT4',
    subtitle: '2020 GT4 Spec · 4.0L Biturbo V8 M178 · 510 CV · RWD',
    specs: '1390 kg · 510 CV · 6-vel seq · RWD · AMG Customer Racing Aero',
    accent: '#00a3e0'
  },
  {
    file: 'ferrari-296-challenge-2024.js',
    id: 'ferrari-296-challenge-2024',
    name: 'Ferrari 296 Challenge',
    subtitle: '2024 Trofeo Pirelli & GT Spec · 3.0L Twin-Turbo 120° V6 · 700 CV · RWD',
    specs: '1330 kg · 700 CV · F1 7-vel doble embrague · RWD · Carbon High-Downforce Aero',
    accent: '#d40000'
  },
  {
    file: 'bmw-z4-gt3-2011.js',
    id: 'bmw-z4-gt3-2011',
    name: 'BMW Z4 GT3 (2011)',
    subtitle: '2011 FIA GT3 Spec · 4.4L Atmospheric V8 P65B44 · 515 CV · RWD',
    specs: '1190 kg · 515 CV · Xtrac 6-vel seq · RWD · Crowne Plaza Livery',
    accent: '#1c69d4'
  },
  {
    file: 'bmw-m4-gt3-evo-2026.js',
    id: 'bmw-m4-gt3-evo-2026',
    name: 'BMW M4 GT3 EVO (2026)',
    subtitle: '2026 FIA GT3 EVO Spec · 3.0L TwinPower Turbo P58 · 590 CV · RWD',
    specs: '1265 kg · 590 CV · Xtrac 6-vel seq · RWD · BMW M Motorsport',
    accent: '#0066b2'
  },
  {
    file: 'toyota-gr-gt3-2024.js',
    id: 'toyota-gr-gt3-2024',
    name: 'Toyota GR GT3 (2024)',
    subtitle: 'FIA GT3 Concept · 4.0L V8 Twin-Turbo · 650 CV · RWD',
    specs: '1280 kg · 650 CV · Hewland 6-vel seq · RWD · Gazoo Racing',
    accent: '#e60012'
  },
  {
    file: 'bentley-continental-gt3-pikes-peak.js',
    id: 'bentley-continental-gt3-pikes-peak',
    name: 'Bentley Continental GT3 Pikes Peak',
    subtitle: 'Pikes Peak Time Attack 1 · 4.0L V8 Twin-Turbo Biofuel · 750 CV · RWD',
    specs: '1300 kg · 750 CV · 6-vel seq · RWD · Pikes Peak Aero & Biofuel',
    accent: '#005a36'
  },
  {
    file: 'maserati-mc20-gt3-2024.js',
    id: 'maserati-mc20-gt3-2024',
    name: 'Maserati MC20 GT3 (2024)',
    subtitle: 'FIA GT3 Spec · 3.0L V6 Nettuno Twin-Turbo · 620 CV · RWD',
    specs: '1270 kg · 620 CV · 6-vel seq · RWD · Maserati Corse',
    accent: '#0b2341'
  },
  {
    file: 'lamborghini-huracan-gt3-2023.js',
    id: 'lamborghini-huracan-gt3-2023',
    name: 'Lamborghini Huracán GT3 (2023)',
    subtitle: 'EVO2 Spec · 5.2L V10 Atmospheric · 640 CV · RWD',
    specs: '1230 kg · 640 CV · Hör 6-vel seq · RWD · Squadra Corse',
    accent: '#739600'
  },
  {
    file: 'audi-r8-lms-gt3-2019.js',
    id: 'audi-r8-lms-gt3-2019',
    name: 'Audi R8 LMS GT3 (2019)',
    subtitle: 'FIA GT3 Spec · 5.2L V10 FSI Atmospheric · 585 CV · RWD',
    specs: '1225 kg · 585 CV · 6-vel seq · RWD · Audi Sport Customer Racing',
    accent: '#bb0a30'
  },
  {
    file: 'ferrari-daytona-sp3-2023.js',
    id: 'ferrari-daytona-sp3-2023',
    name: 'Ferrari Daytona SP3 (2023)',
    subtitle: 'Icona Series · 6.5L Atmospheric V12 F140HC · 840 CV · RWD',
    specs: '1485 kg · 840 CV · F1 7-vel Dual-Clutch · RWD · Rosso Magma',
    accent: '#d40000'
  },
  {
    file: 'toyota-gr-supra-gt300-2023.js',
    id: 'toyota-gr-supra-gt300-2023',
    name: 'Toyota GR Supra GT300 (2023)',
    subtitle: 'Super GT GT300 · 5.2L V8 Atmospheric 2UR-GSE · 500 CV · RWD',
    specs: '1200 kg · 500 CV · Hewland 6-vel seq · RWD · Green Brave Livery',
    accent: '#00853f'
  },
  {
    file: 'ferrari-296-gt3-2024.js',
    id: 'ferrari-296-gt3-2024',
    name: 'Ferrari 296 GT3 (2024)',
    subtitle: 'FIA GT3 Spec · 3.0L V6 Twin-Turbo 120° · 600 CV · RWD',
    specs: '1250 kg · 600 CV · Xtrac 6-vel seq · RWD · AF Corse Livery',
    accent: '#cc0000'
  },
  {
    file: 'porsche-911-gt3-r-rennsport-2024.js',
    id: 'porsche-911-gt3-r-rennsport-2024',
    name: 'Porsche 911 GT3 R Rennsport',
    subtitle: 'Limited Rennsport Edition · 4.2L Boxer 6 Atmospheric · 620 CV · RWD',
    specs: '1240 kg · 620 CV · 6-vel seq · RWD · Laguna Seca Rennsport Reunion',
    accent: '#d5001c'
  }
];

// Compatibilidad con CAR_LIST para tests y scripts
window.CAR_LIST = window.CAR_MANIFEST.map(c => c.file);

// Registrar metadatos en CARS si el registro ya está disponible
if (typeof CARS !== 'undefined') {
  for (const item of window.CAR_MANIFEST) {
    CARS.register({
      id: item.id,
      name: item.name,
      subtitle: item.subtitle,
      specs: item.specs,
      accent: item.accent,
      file: item.file
    });
  }
}
