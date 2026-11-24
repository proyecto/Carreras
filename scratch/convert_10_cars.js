'use strict';
const fs = require('fs');
const path = require('path');
const {
  f32ToB64,
  u32ToB64,
  getEmbeddedImageB64,
  getAccessorData,
  readIndices,
  getLocalMatrix,
  mul4
} = require('./convert_utils.js');

const DOWNLOADS = '/Users/rafaelruiz/Downloads';

// =========================================================================
// Configuration for each of the 10 cars
// =========================================================================
const CAR_CONFIGS = [
  // 1. BMW M4 GT3 EVO (2026)
  {
    id: 'bmw-m4-gt3-evo-2026',
    name: 'BMW M4 GT3 EVO (2026)',
    subtitle: '2026 FIA GT3 EVO Spec · 3.0L TwinPower Turbo P58 · 590 CV · RWD',
    specs: '1265 kg · 590 CV · Xtrac 6-vel seq · RWD · BMW M Motorsport',
    accent: '#0066b2',
    glbPath: path.join(DOWNLOADS, '2026-bmw-m4-gt3-evo/source/M4_GT3_EVO_31.glb'),
    atlasImgIdx: 15,
    scale: 1.0,
    coordMap: (x, y, z) => [z, y, -x],
    normMap: (nx, ny, nz) => [nz, ny, -nx],
    wheelRoots: [3, 167, 110, 90, 18, 2, 136, 117], // LF, RF, LR, RR
    rfWheelRoots: [110, 90], // RF wheel
    rfCenter: [-0.839, 0.343, 1.578], // GLTF coords of RF
    hubs: [
      [1.579, 0.343, -0.840],
      [1.578, 0.343,  0.839],
      [-1.338, 0.343, -0.840],
      [-1.339, 0.343,  0.840]
    ],
    wheelbase: 2.917, trackF: 1.679, trackR: 1.680, wheelR: 0.346,
    physics: {
      m: 1265, Izz: 1780, L: 2.917, a: 1.460, b: 1.457, tw: 1.68, h: 0.37, R: 0.346,
      mu: 1.76, B: 11.9, C: 1.55, driveF: 0.0,
      gears: [2.90, 2.15, 1.68, 1.35, 1.12, 0.94], final: 3.38, rev: 3.0, eff: 0.96,
      cdA: 0.72, crr: 0.010, brakeF: 0.60, halfW: 1.04, front: 2.45, rear: 2.40,
      clA: 1.12, aeroSplitF: 0.44,
      torqueBase: 440, torquePeak: 260, torqueDrop: 170, torquePeakStart: 0.42, torquePeakSpan: 4.8, torqueDropRpm: 7.8,
      shiftUpRpm: 7600, shiftDownRpm: 5400, revLimitRpm: 8000, maxRpm: 8200, idleRpm: 1200,
    },
    hud: { maxKmh: 330, maxRpm: 8.5, redlineRpm: 7.7 },
    isGlass: (matName) => /window|windshield/i.test(matName) && !/emissive|black|banner|border/i.test(matName),
  },

  // 2. Toyota GR GT3 Concept (2024)
  {
    id: 'toyota-gr-gt3-2024',
    name: 'Toyota GR GT3 (2024)',
    subtitle: 'FIA GT3 Concept · 4.0L V8 Twin-Turbo · 650 CV · RWD',
    specs: '1280 kg · 650 CV · Hewland 6-vel seq · RWD · Gazoo Racing',
    accent: '#e60012',
    glbPath: path.join(DOWNLOADS, 'toyota-gr-gt3/source/ToyotaGRGT3-VasserSullivan.glb'),
    atlasImgIdx: 1,
    scale: 1.0,
    // Front is -Z, Rear is +Z, Left is -X, Right is +X
    coordMap: (x, y, z) => [-z + 0.33, y, x],
    normMap: (nx, ny, nz) => [-nz, ny, nx],
    wheelRoots: [93, 113, 103, 123], // LF, RF, LR, RR
    rfWheelRoots: [113],
    rfCenter: [0.850, 0.326, -1.031],
    hubs: [
      [1.361, 0.326, -0.850],
      [1.361, 0.326,  0.850],
      [-1.367, 0.344, -0.850],
      [-1.367, 0.344,  0.850]
    ],
    wheelbase: 2.728, trackF: 1.700, trackR: 1.700, wheelR: 0.340,
    physics: {
      m: 1280, Izz: 1750, L: 2.728, a: 1.364, b: 1.364, tw: 1.70, h: 0.36, R: 0.340,
      mu: 1.77, B: 12.0, C: 1.56, driveF: 0.0,
      gears: [2.85, 2.10, 1.64, 1.32, 1.10, 0.92], final: 3.40, rev: 3.0, eff: 0.96,
      cdA: 0.69, crr: 0.010, brakeF: 0.61, halfW: 1.07, front: 2.40, rear: 2.38,
      clA: 1.15, aeroSplitF: 0.43,
      torqueBase: 460, torquePeak: 260, torqueDrop: 160, torquePeakStart: 0.40, torquePeakSpan: 5.0, torqueDropRpm: 8.0,
      shiftUpRpm: 7800, shiftDownRpm: 5600, revLimitRpm: 8200, maxRpm: 8500, idleRpm: 1200,
    },
    hud: { maxKmh: 340, maxRpm: 9.0, redlineRpm: 8.0 },
    isGlass: (matName) => /glass/i.test(matName) && !/light/i.test(matName),
  },

  // 3. Bentley Continental GT3 Pikes Peak (2021)
  {
    id: 'bentley-continental-gt3-pikes-peak',
    name: 'Bentley Continental GT3 Pikes Peak (2021)',
    subtitle: 'Pikes Peak Time Attack 1 · 4.0L V8 Twin-Turbo Biofuel · 750 CV · RWD',
    specs: '1300 kg · 750 CV · 6-vel seq · RWD · Pikes Peak Aero & Biofuel',
    accent: '#005a36',
    glbPath: path.join(DOWNLOADS, 'bentley-continental-gt3-pikes-peak-vecarzcom/source/2021_bentley_continental_gt3_pikes_peak.glb'),
    atlasImgIdx: 11,
    scale: 100.0,
    coordMap: (x, y, z) => [z * 100 - 0.15, y * 100, -x * 100],
    normMap: (nx, ny, nz) => [nz, ny, -nx],
    wheelRoots: [41, 620, 1199, 1732],
    rfWheelRoots: [620],
    rfCenter: [-0.009, 0.0035, 0.015],
    hubs: [
      [1.350, 0.350, -0.860],
      [1.350, 0.350,  0.860],
      [-1.250, 0.355, -0.860],
      [-1.250, 0.355,  0.860]
    ],
    wheelbase: 2.600, trackF: 1.720, trackR: 1.720, wheelR: 0.350,
    physics: {
      m: 1300, Izz: 1820, L: 2.600, a: 1.300, b: 1.300, tw: 1.72, h: 0.36, R: 0.350,
      mu: 1.82, B: 12.2, C: 1.58, driveF: 0.0,
      gears: [2.80, 2.05, 1.60, 1.28, 1.05, 0.88], final: 3.30, rev: 3.0, eff: 0.96,
      cdA: 0.82, crr: 0.010, brakeF: 0.62, halfW: 1.10, front: 2.55, rear: 2.50,
      clA: 1.55, aeroSplitF: 0.45,
      torqueBase: 550, torquePeak: 450, torqueDrop: 200, torquePeakStart: 0.35, torquePeakSpan: 4.5, torqueDropRpm: 7.5,
      shiftUpRpm: 7500, shiftDownRpm: 5200, revLimitRpm: 7800, maxRpm: 8000, idleRpm: 1200,
    },
    hud: { maxKmh: 350, maxRpm: 8.5, redlineRpm: 7.6 },
    isGlass: (matName) => /window|glass/i.test(matName),
  },

  // 4. Maserati MC20 GT3 (2024)
  {
    id: 'maserati-mc20-gt3-2024',
    name: 'Maserati MC20 GT3 (2024)',
    subtitle: 'FIA GT3 Spec · 3.0L V6 Nettuno Twin-Turbo · 620 CV · RWD',
    specs: '1270 kg · 620 CV · 6-vel seq · RWD · Maserati Corse',
    accent: '#0b2341',
    glbPath: path.join(DOWNLOADS, 'maserati-gt3/source/maserati_gt3.glb'),
    atlasImgIdx: 0,
    scale: 1.0,
    coordMap: (x, y, z) => [z - 0.10, y, -x],
    normMap: (nx, ny, nz) => [nz, ny, -nx],
    wheelRoots: [6, 8, 10], // meshes 1, 2, 3
    rfWheelRoots: [], // handled via spatial split
    spatialWheelSplit: true,
    hubs: [
      [1.350, 0.330, -0.840],
      [1.350, 0.330,  0.840],
      [-1.350, 0.340, -0.840],
      [-1.350, 0.340,  0.840]
    ],
    wheelbase: 2.700, trackF: 1.680, trackR: 1.680, wheelR: 0.340,
    physics: {
      m: 1270, Izz: 1720, L: 2.700, a: 1.350, b: 1.350, tw: 1.68, h: 0.35, R: 0.340,
      mu: 1.76, B: 11.9, C: 1.55, driveF: 0.0,
      gears: [2.90, 2.12, 1.66, 1.33, 1.10, 0.92], final: 3.42, rev: 3.0, eff: 0.96,
      cdA: 0.68, crr: 0.010, brakeF: 0.60, halfW: 1.08, front: 2.38, rear: 2.35,
      clA: 1.14, aeroSplitF: 0.43,
      torqueBase: 440, torquePeak: 290, torqueDrop: 160, torquePeakStart: 0.40, torquePeakSpan: 4.8, torqueDropRpm: 8.0,
      shiftUpRpm: 7800, shiftDownRpm: 5500, revLimitRpm: 8200, maxRpm: 8500, idleRpm: 1200,
    },
    hud: { maxKmh: 335, maxRpm: 9.0, redlineRpm: 8.0 },
    isGlass: (matName) => /window|transparente/i.test(matName),
  },

  // 5. Lamborghini Huracán GT3 EVO2 (2023)
  {
    id: 'lamborghini-huracan-gt3-2023',
    name: 'Lamborghini Huracán GT3 (2023)',
    subtitle: 'EVO2 Spec · 5.2L V10 Atmospheric · 640 CV · RWD',
    specs: '1230 kg · 640 CV · Hör 6-vel seq · RWD · Squadra Corse',
    accent: '#739600',
    glbPath: path.join(DOWNLOADS, 'lamborghini_huracan_gt3.glb'),
    atlasImgIdx: 3,
    scale: 1.0,
    coordMap: (x, y, z) => [x - 0.25, y, z],
    normMap: (nx, ny, nz) => [nx, ny, nz],
    wheelRoots: [153, 155, 157, 159, 161, 178, 195, 212],
    rfWheelRoots: [157, 195],
    rfCenter: [1.20, 0.33, 0.83],
    hubs: [
      [1.185, 0.330, -0.830],
      [1.185, 0.330,  0.830],
      [-1.435, 0.340, -0.830],
      [-1.435, 0.340,  0.830]
    ],
    wheelbase: 2.620, trackF: 1.660, trackR: 1.660, wheelR: 0.340,
    physics: {
      m: 1230, Izz: 1680, L: 2.620, a: 1.310, b: 1.310, tw: 1.66, h: 0.35, R: 0.340,
      mu: 1.77, B: 12.0, C: 1.56, driveF: 0.0,
      gears: [2.95, 2.18, 1.70, 1.36, 1.12, 0.93], final: 3.48, rev: 3.0, eff: 0.96,
      cdA: 0.70, crr: 0.010, brakeF: 0.60, halfW: 1.05, front: 2.35, rear: 2.30,
      clA: 1.15, aeroSplitF: 0.42,
      torqueBase: 420, torquePeak: 220, torqueDrop: 150, torquePeakStart: 0.50, torquePeakSpan: 4.4, torqueDropRpm: 8.3,
      shiftUpRpm: 8400, shiftDownRpm: 6000, revLimitRpm: 8800, maxRpm: 9000, idleRpm: 1300,
    },
    hud: { maxKmh: 330, maxRpm: 9.5, redlineRpm: 8.6 },
    isGlass: (matName) => /glass/i.test(matName) && !/light/i.test(matName),
  },

  // 6. Audi R8 LMS GT3 (2019)
  {
    id: 'audi-r8-lms-gt3-2019',
    name: 'Audi R8 LMS GT3 (2019)',
    subtitle: 'FIA GT3 Spec · 5.2L V10 FSI Atmospheric · 585 CV · RWD',
    specs: '1225 kg · 585 CV · 6-vel seq · RWD · Audi Sport Customer Racing',
    accent: '#bb0a30',
    glbPath: path.join(DOWNLOADS, '2019_audi_r8_lms_gt3.glb'),
    atlasImgIdx: 15,
    scale: 100.0,
    coordMap: (x, y, z) => [z * 100 - 0.10, y * 100, -x * 100],
    normMap: (nx, ny, nz) => [nz, ny, -nx],
    wheelRoots: [39, 1024, 2009, 2762],
    rfWheelRoots: [1024],
    rfCenter: [-0.009, 0.0033, 0.011],
    hubs: [
      [1.320, 0.330, -0.820],
      [1.320, 0.330,  0.820],
      [-1.230, 0.340, -0.820],
      [-1.230, 0.340,  0.820]
    ],
    wheelbase: 2.550, trackF: 1.640, trackR: 1.640, wheelR: 0.340,
    physics: {
      m: 1225, Izz: 1670, L: 2.550, a: 1.280, b: 1.270, tw: 1.64, h: 0.35, R: 0.340,
      mu: 1.76, B: 11.9, C: 1.55, driveF: 0.0,
      gears: [2.92, 2.14, 1.68, 1.34, 1.11, 0.92], final: 3.44, rev: 3.0, eff: 0.96,
      cdA: 0.69, crr: 0.010, brakeF: 0.60, halfW: 1.02, front: 2.30, rear: 2.28,
      clA: 1.12, aeroSplitF: 0.42,
      torqueBase: 410, torquePeak: 200, torqueDrop: 140, torquePeakStart: 0.52, torquePeakSpan: 4.2, torqueDropRpm: 8.2,
      shiftUpRpm: 8300, shiftDownRpm: 5900, revLimitRpm: 8700, maxRpm: 8900, idleRpm: 1250,
    },
    hud: { maxKmh: 330, maxRpm: 9.5, redlineRpm: 8.5 },
    isGlass: (matName) => /window|glass/i.test(matName),
  },

  // 7. Ferrari Daytona SP3 (2023)
  {
    id: 'ferrari-daytona-sp3-2023',
    name: 'Ferrari Daytona SP3 (2023)',
    subtitle: 'Icona Series · 6.5L Atmospheric V12 F140HC · 840 CV · RWD',
    specs: '1485 kg · 840 CV · F1 7-vel Dual-Clutch · RWD · Rosso Magma',
    accent: '#d40000',
    glbPath: path.join(DOWNLOADS, 'ferrari-daytona-sp3-wwwvecarzcom/source/fixV.glb'),
    atlasImgIdx: 20,
    scale: 1.0,
    coordMap: (x, y, z) => [z - 0.12, y, -x],
    normMap: (nx, ny, nz) => [nz, ny, -nx],
    wheelRoots: [1368, 1369, 1374, 1396, 1397, 1402, 1424, 1425, 1430, 1452, 1453, 1458],
    rfWheelRoots: [1424, 1425, 1430],
    rfCenter: [-0.850, 0.330, 1.400],
    hubs: [
      [1.320, 0.330, -0.830],
      [1.320, 0.330,  0.830],
      [-1.330, 0.340, -0.840],
      [-1.330, 0.340,  0.840]
    ],
    wheelbase: 2.650, trackF: 1.660, trackR: 1.680, wheelR: 0.345,
    physics: {
      m: 1485, Izz: 1850, L: 2.650, a: 1.300, b: 1.350, tw: 1.67, h: 0.36, R: 0.345,
      mu: 1.78, B: 12.0, C: 1.56, driveF: 0.0,
      gears: [3.08, 2.19, 1.63, 1.29, 1.03, 0.84, 0.69], final: 4.10, rev: 3.2, eff: 0.96,
      cdA: 0.66, crr: 0.010, brakeF: 0.61, halfW: 1.05, front: 2.35, rear: 2.40,
      clA: 1.25, aeroSplitF: 0.44,
      torqueBase: 480, torquePeak: 320, torqueDrop: 160, torquePeakStart: 0.50, torquePeakSpan: 4.8, torqueDropRpm: 9.0,
      shiftUpRpm: 9100, shiftDownRpm: 6600, revLimitRpm: 9500, maxRpm: 9600, idleRpm: 1200,
    },
    hud: { maxKmh: 350, maxRpm: 10.0, redlineRpm: 9.2 },
    isGlass: (matName) => /window|glass/i.test(matName) && !/frame|black/i.test(matName),
    downsampleStride: 3, // smooth model downsampled 2x to keep runtime light and blazing fast
  },

  // 8. Toyota GR Supra GT300 (2023)
  {
    id: 'toyota-gr-supra-gt300-2023',
    name: 'Toyota GR Supra GT300 (2023)',
    subtitle: 'Super GT GT300 · 5.2L V8 Atmospheric 2UR-GSE · 500 CV · RWD',
    specs: '1200 kg · 500 CV · Hewland 6-vel seq · RWD · Saitama Toyopet Green Brave',
    accent: '#00853f',
    glbPath: path.join(DOWNLOADS, 'toyotagr-supra-gt300-wwwvecarzcom/source/toyota_gr_supra_gt_gt300.glb'),
    atlasImgIdx: 4,
    scale: 1.0,
    coordMap: (x, y, z) => [z - 0.15, y, -x],
    normMap: (nx, ny, nz) => [nz, ny, -nx],
    wheelRoots: [3, 4], // Mesh 1 (rims), Mesh 2 (tyres)
    rfWheelRoots: [],
    spatialWheelSplit: true,
    hubs: [
      [1.300, 0.330, -0.820],
      [1.300, 0.330,  0.820],
      [-1.300, 0.340, -0.820],
      [-1.300, 0.340,  0.820]
    ],
    wheelbase: 2.600, trackF: 1.640, trackR: 1.640, wheelR: 0.340,
    physics: {
      m: 1200, Izz: 1650, L: 2.600, a: 1.300, b: 1.300, tw: 1.64, h: 0.35, R: 0.340,
      mu: 1.75, B: 11.8, C: 1.54, driveF: 0.0,
      gears: [2.95, 2.15, 1.68, 1.35, 1.11, 0.92], final: 3.44, rev: 3.0, eff: 0.96,
      cdA: 0.70, crr: 0.010, brakeF: 0.60, halfW: 1.03, front: 2.30, rear: 2.28,
      clA: 1.15, aeroSplitF: 0.43,
      torqueBase: 420, torquePeak: 200, torqueDrop: 140, torquePeakStart: 0.48, torquePeakSpan: 4.4, torqueDropRpm: 7.8,
      shiftUpRpm: 7800, shiftDownRpm: 5500, revLimitRpm: 8200, maxRpm: 8500, idleRpm: 1200,
    },
    hud: { maxKmh: 320, maxRpm: 9.0, redlineRpm: 8.0 },
    isGlass: (matName) => /window/i.test(matName),
  },

  // 9. Ferrari 296 GT3 (2024)
  {
    id: 'ferrari-296-gt3-2024',
    name: 'Ferrari 296 GT3 (2024)',
    subtitle: 'FIA GT3 Spec · 3.0L V6 Twin-Turbo 120° · 600 CV · RWD',
    specs: '1250 kg · 600 CV · Xtrac 6-vel seq · RWD · AF Corse Livery',
    accent: '#cc0000',
    glbPath: path.join(DOWNLOADS, 'ferrari-296-gt3-wwwvecarzcom/source/ferrari_296_gt3.glb'),
    atlasImgIdx: 30, // mat_232 livery texture
    scale: 1.0,
    // Length is along Y (front is ~5.2, rear is ~9.2), width is X, height is Z
    coordMap: (x, y, z) => [-(y - 7.30), z + 0.30, -x],
    normMap: (nx, ny, nz) => [-ny, nz, -nx],
    wheelMeshIds: [22, 23, 27, 28, 59, 60, 61, 62],
    wheelRoots: [],
    rfWheelRoots: [],
    useWheelMeshIds: true,
    hubs: [
      [1.310, 0.335, -0.840],
      [1.310, 0.335,  0.840],
      [-1.340, 0.345, -0.840],
      [-1.340, 0.345,  0.840]
    ],
    wheelbase: 2.650, trackF: 1.680, trackR: 1.680, wheelR: 0.345,
    physics: {
      m: 1250, Izz: 1710, L: 2.650, a: 1.320, b: 1.330, tw: 1.68, h: 0.35, R: 0.345,
      mu: 1.77, B: 12.0, C: 1.56, driveF: 0.0,
      gears: [2.90, 2.12, 1.65, 1.32, 1.10, 0.92], final: 3.40, rev: 3.0, eff: 0.96,
      cdA: 0.68, crr: 0.010, brakeF: 0.60, halfW: 1.06, front: 2.38, rear: 2.34,
      clA: 1.18, aeroSplitF: 0.44,
      torqueBase: 440, torquePeak: 280, torqueDrop: 160, torquePeakStart: 0.42, torquePeakSpan: 4.8, torqueDropRpm: 8.0,
      shiftUpRpm: 8000, shiftDownRpm: 5600, revLimitRpm: 8300, maxRpm: 8600, idleRpm: 1200,
    },
    hud: { maxKmh: 335, maxRpm: 9.0, redlineRpm: 8.1 },
    isGlass: (matName) => /window/i.test(matName),
  },

  // 10. Porsche 911 GT3 R Rennsport (2024)
  {
    id: 'porsche-911-gt3-r-rennsport-2024',
    name: 'Porsche 911 GT3 R Rennsport (2024)',
    subtitle: 'Limited Rennsport Edition · 4.2L Boxer 6 Atmospheric · 620 CV · RWD',
    specs: '1240 kg · 620 CV · 6-vel seq · RWD · Laguna Seca Rennsport Reunion',
    accent: '#d5001c',
    glbPath: path.join(DOWNLOADS, 'porsche-911-gt3-r-rennsport-wwwvecarzcom/source/Sketchfab_2026_10_28_00_01_31.glb'),
    atlasImgIdx: 29,
    scale: 1.0,
    coordMap: (x, y, z) => [z - 0.06, y, -x],
    normMap: (nx, ny, nz) => [nz, ny, -nx],
    wheelRoots: [319, 321, 330, 332, 341, 343, 352, 354],
    rfWheelRoots: [341, 343],
    rfCenter: [-0.820, 0.353, 1.315],
    hubs: [
      [1.315, 0.353, -0.820],
      [1.315, 0.353,  0.820],
      [-1.202, 0.354, -0.810],
      [-1.202, 0.354,  0.810]
    ],
    wheelbase: 2.517, trackF: 1.640, trackR: 1.620, wheelR: 0.350,
    physics: {
      m: 1240, Izz: 1690, L: 2.517, a: 1.250, b: 1.267, tw: 1.63, h: 0.35, R: 0.350,
      mu: 1.78, B: 12.1, C: 1.56, driveF: 0.0,
      gears: [2.95, 2.18, 1.70, 1.36, 1.12, 0.93], final: 3.44, rev: 3.0, eff: 0.96,
      cdA: 0.69, crr: 0.010, brakeF: 0.59, halfW: 1.03, front: 2.36, rear: 2.42,
      clA: 1.22, aeroSplitF: 0.43,
      torqueBase: 430, torquePeak: 230, torqueDrop: 150, torquePeakStart: 0.50, torquePeakSpan: 4.6, torqueDropRpm: 9.0,
      shiftUpRpm: 9000, shiftDownRpm: 6500, revLimitRpm: 9400, maxRpm: 9500, idleRpm: 1200,
    },
    hud: { maxKmh: 340, maxRpm: 10.0, redlineRpm: 9.1 },
    isGlass: (matName) => /glass/i.test(matName) && !/light/i.test(matName),
  }
];

// =========================================================================
// Convert single car
// =========================================================================
function convertCar(cfg) {
  console.log(`\n-----------------------------------------------------------`);
  console.log(`[CONVERTING] ${cfg.name} (${cfg.id})...`);
  const buf = fs.readFileSync(cfg.glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binBuf = buf.slice(20 + jsonLen + 8);

  const nodeParents = new Array(gltf.nodes.length).fill(-1);
  gltf.nodes.forEach((n, i) => {
    if (n.children) n.children.forEach(c => { nodeParents[c] = i; });
  });

  const worldMats = new Array(gltf.nodes.length);
  function computeWorld(i) {
    if (worldMats[i]) return worldMats[i];
    const local = getLocalMatrix(gltf.nodes[i]);
    const p = nodeParents[i];
    worldMats[i] = p === -1 ? local : mul4(computeWorld(p), local);
    return worldMats[i];
  }
  for (let i = 0; i < gltf.nodes.length; i++) computeWorld(i);

  // Wheel subtrees
  const wheelSubtree = new Set();
  function markWheel(idx) {
    wheelSubtree.add(idx);
    if (gltf.nodes[idx] && gltf.nodes[idx].children) gltf.nodes[idx].children.forEach(markWheel);
  }
  if (cfg.wheelRoots) cfg.wheelRoots.forEach(markWheel);

  const rfSubtree = new Set();
  function markRF(idx) {
    rfSubtree.add(idx);
    if (gltf.nodes[idx] && gltf.nodes[idx].children) gltf.nodes[idx].children.forEach(markRF);
  }
  if (cfg.rfWheelRoots) cfg.rfWheelRoots.forEach(markRF);

  const bodyVerts = [], bodyIndices = [];
  const glassVerts = [], glassIndices = [];
  const wheelVerts = [], wheelIndices = [];

  const rfCenterEngine = [cfg.hubs[1][0], cfg.hubs[1][1], cfg.hubs[1][2]];

  const strideStep = cfg.downsampleStride || 1;

  gltf.nodes.forEach((n, nIdx) => {
    if (n.mesh === undefined) return;
    if (/blur/i.test(n.name || '')) return;

    let isWheelNode = wheelSubtree.has(nIdx);
    if (cfg.useWheelMeshIds && cfg.wheelMeshIds.includes(n.mesh)) {
      isWheelNode = true;
    }

    const mat = worldMats[nIdx];
    const m = gltf.meshes[n.mesh];

    m.primitives.forEach(prim => {
      if (prim.attributes.POSITION === undefined) return;
      const matIdx = prim.material !== undefined ? prim.material : 0;
      const matName = prim.material !== undefined && gltf.materials && gltf.materials[prim.material] ? gltf.materials[prim.material].name : '';
      const isGlass = cfg.isGlass(matName);

      const posData = getAccessorData(gltf, binBuf, prim.attributes.POSITION);
      const posStride = posData.stride || 12;
      const posF32 = new Float32Array(binBuf.buffer, binBuf.byteOffset + posData.offset, (posStride * posData.count) / 4);

      let normF32 = null, normStride = 12;
      if (prim.attributes.NORMAL !== undefined) {
        const normData = getAccessorData(gltf, binBuf, prim.attributes.NORMAL);
        normStride = normData.stride || 12;
        normF32 = new Float32Array(binBuf.buffer, binBuf.byteOffset + normData.offset, (normStride * normData.count) / 4);
      }

      let uvF32 = null, uvStride = 8;
      if (prim.attributes.TEXCOORD_0 !== undefined) {
        const uvData = getAccessorData(gltf, binBuf, prim.attributes.TEXCOORD_0);
        uvStride = uvData.stride || 8;
        uvF32 = new Float32Array(binBuf.buffer, binBuf.byteOffset + uvData.offset, (uvStride * uvData.count) / 4);
      }

      const indices = prim.indices !== undefined ? readIndices(gltf, binBuf, prim.indices) : null;
      const count = posData.count;

      if (isWheelNode) {
        // If we have an explicit RF wheel subtree or we do spatial wheel split
        let isRF = rfSubtree.has(nIdx);
        // If spatial split (e.g. all 4 wheels in 1 node)
        if (cfg.spatialWheelSplit && !isRF) {
          // Check centroid
          let sumZ = 0, sumX = 0;
          for (let i = 0; i < Math.min(count, 30); i++) {
            const pOff = (i * posStride) / 4;
            const lx = posF32[pOff], ly = posF32[pOff+1], lz = posF32[pOff+2];
            const wx = mat[0]*lx + mat[4]*ly + mat[8]*lz + mat[12];
            const wy = mat[1]*lx + mat[5]*ly + mat[9]*lz + mat[13];
            const wz = mat[2]*lx + mat[6]*ly + mat[10]*lz + mat[14];
            const ep = cfg.coordMap(wx, wy, wz);
            sumX += ep[0]; sumZ += ep[2];
          }
          if (sumX > 0 && sumZ > 0) isRF = true; // Front Right quadrant in engine coords
        }

        if (isRF || (cfg.useWheelMeshIds && [23, 61].includes(n.mesh))) {
          const baseIndex = wheelVerts.length / 9;
          for (let i = 0; i < count; i++) {
            const pOff = (i * posStride) / 4;
            const lx = posF32[pOff], ly = posF32[pOff+1], lz = posF32[pOff+2];
            const wx = mat[0]*lx + mat[4]*ly + mat[8]*lz + mat[12];
            const wy = mat[1]*lx + mat[5]*ly + mat[9]*lz + mat[13];
            const wz = mat[2]*lx + mat[6]*ly + mat[10]*lz + mat[14];
            const [ex, ey, ez] = cfg.coordMap(wx, wy, wz);

            let enx = 0, eny = 1, enz = 0;
            if (normF32) {
              const nOff = (i * normStride) / 4;
              const nlx = normF32[nOff], nly = normF32[nOff+1], nlz = normF32[nOff+2];
              const wnx = mat[0]*nlx + mat[4]*nly + mat[8]*nlz;
              const wny = mat[1]*nlx + mat[5]*nly + mat[9]*nlz;
              const wnz = mat[2]*nlx + mat[6]*nly + mat[10]*nlz;
              const [tnx, tny, tnz] = cfg.normMap(wnx, wny, wnz);
              enx = tnx; eny = tny; enz = tnz;
              const len = Math.hypot(enx, eny, enz) || 1;
              enx /= len; eny /= len; enz /= len;
            }

            let u = 0, v = 0;
            if (uvF32) {
              const uOff = (i * uvStride) / 4;
              u = uvF32[uOff]; v = uvF32[uOff+1];
            }

            // Wheel centered around hub (0, 0, 0)
            const wex = ex - rfCenterEngine[0];
            const wey = ey - rfCenterEngine[1];
            const wez = ez - rfCenterEngine[2];

            wheelVerts.push(wex, wey, wez, enx, eny, enz, u, v, matIdx);
          }

          if (indices) {
            for (let i = 0; i < indices.length; i++) wheelIndices.push(baseIndex + indices[i]);
          } else {
            for (let i = 0; i < count; i++) wheelIndices.push(baseIndex + i);
          }
        }
        return; // Don't add to body
      }

      // Add to body or glass
      const targetVerts = isGlass ? glassVerts : bodyVerts;
      const targetIndices = isGlass ? glassIndices : bodyIndices;

      if (strideStep > 1 && !isGlass && indices) {
        // Downsample triangles
        const baseIndex = targetVerts.length / 9;
        const vertRemap = new Map();
        for (let i = 0; i < indices.length; i += 3 * strideStep) {
          const idxs = [indices[i], indices[i+1], indices[i+2]];
          for (const vi of idxs) {
            if (!vertRemap.has(vi)) {
              const pOff = (vi * posStride) / 4;
              const lx = posF32[pOff], ly = posF32[pOff+1], lz = posF32[pOff+2];
              const wx = mat[0]*lx + mat[4]*ly + mat[8]*lz + mat[12];
              const wy = mat[1]*lx + mat[5]*ly + mat[9]*lz + mat[13];
              const wz = mat[2]*lx + mat[6]*ly + mat[10]*lz + mat[14];
              const [ex, ey, ez] = cfg.coordMap(wx, wy, wz);

              let enx = 0, eny = 1, enz = 0;
              if (normF32) {
                const nOff = (vi * normStride) / 4;
                const nlx = normF32[nOff], nly = normF32[nOff+1], nlz = normF32[nOff+2];
                const wnx = mat[0]*nlx + mat[4]*nly + mat[8]*nlz;
                const wny = mat[1]*nlx + mat[5]*nly + mat[9]*nlz;
                const wnz = mat[2]*nlx + mat[6]*nly + mat[10]*nlz;
                const [tnx, tny, tnz] = cfg.normMap(wnx, wny, wnz);
                enx = tnx; eny = tny; enz = tnz;
                const len = Math.hypot(enx, eny, enz) || 1;
                enx /= len; eny /= len; enz /= len;
              }

              let u = 0, v = 0;
              if (uvF32) {
                const uOff = (vi * uvStride) / 4;
                u = uvF32[uOff]; v = uvF32[uOff+1];
              }

              const newIdx = baseIndex + vertRemap.size;
              vertRemap.set(vi, newIdx);
              targetVerts.push(ex, ey, ez, enx, eny, enz, u, v, matIdx);
            }
            targetIndices.push(vertRemap.get(vi));
          }
        }
      } else {
        const baseIndex = targetVerts.length / 9;
        for (let i = 0; i < count; i++) {
          const pOff = (i * posStride) / 4;
          const lx = posF32[pOff], ly = posF32[pOff+1], lz = posF32[pOff+2];
          const wx = mat[0]*lx + mat[4]*ly + mat[8]*lz + mat[12];
          const wy = mat[1]*lx + mat[5]*ly + mat[9]*lz + mat[13];
          const wz = mat[2]*lx + mat[6]*ly + mat[10]*lz + mat[14];
          const [ex, ey, ez] = cfg.coordMap(wx, wy, wz);

          let enx = 0, eny = 1, enz = 0;
          if (normF32) {
            const nOff = (i * normStride) / 4;
            const nlx = normF32[nOff], nly = normF32[nOff+1], nlz = normF32[nOff+2];
            const wnx = mat[0]*nlx + mat[4]*nly + mat[8]*nlz;
            const wny = mat[1]*nlx + mat[5]*nly + mat[9]*nlz;
            const wnz = mat[2]*nlx + mat[6]*nly + mat[10]*nlz;
            const [tnx, tny, tnz] = cfg.normMap(wnx, wny, wnz);
            enx = tnx; eny = tny; enz = tnz;
            const len = Math.hypot(enx, eny, enz) || 1;
            enx /= len; eny /= len; enz /= len;
          }

          let u = 0, v = 0;
          if (uvF32) {
            const uOff = (i * uvStride) / 4;
            u = uvF32[uOff]; v = uvF32[uOff+1];
          }

          targetVerts.push(ex, ey, ez, enx, eny, enz, u, v, matIdx);
        }

        if (indices) {
          for (let i = 0; i < indices.length; i++) targetIndices.push(baseIndex + indices[i]);
        } else {
          for (let i = 0; i < count; i++) targetIndices.push(baseIndex + i);
        }
      }
    });
  });

  console.log(`  Body:  ${bodyVerts.length/9} verts, ${bodyIndices.length/3} tris`);
  console.log(`  Glass: ${glassVerts.length/9} verts, ${glassIndices.length/3} tris`);
  console.log(`  Wheel: ${wheelVerts.length/9} verts, ${wheelIndices.length/3} tris`);

  // Fallback wheel if model wheels could not be isolated
  if (wheelVerts.length === 0) {
    console.log(`  Warning: wheel empty, generating standard GT3 OZ Racing forged wheel...`);
    const segments = 24, rO = cfg.wheelR, rI = cfg.wheelR * 0.58, w = 0.32;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      // outer tyre
      wheelVerts.push(c * rO, s * rO, -w/2, c, s, 0, i/segments, 0, 1);
      wheelVerts.push(c * rO, s * rO,  w/2, c, s, 0, i/segments, 1, 1);
      // rim
      wheelVerts.push(c * rI, s * rI,  w/2, 0, 0, 1, i/segments, 0.5, 2);
      wheelVerts.push(0, 0, w/2, 0, 0, 1, 0.5, 0.5, 2);
    }
    for (let i = 0; i < segments; i++) {
      const b = i * 4;
      wheelIndices.push(b, b+1, b+5); wheelIndices.push(b, b+5, b+4);
      wheelIndices.push(b+2, b+3, b+6);
    }
  }

  // Get embedded atlas B64
  const atlasB64 = getEmbeddedImageB64(cfg.glbPath, cfg.atlasImgIdx);
  console.log(`  Atlas: ${(atlasB64.length / 1024).toFixed(1)} KB base64`);

  // Generate file content
  const f32Body = new Float32Array(bodyVerts);
  const u32Body = new Uint32Array(bodyIndices);
  const f32Glass = new Float32Array(glassVerts);
  const u32Glass = new Uint32Array(glassIndices);
  const f32Wheel = new Float32Array(wheelVerts);
  const u32Wheel = new Uint32Array(wheelIndices);

  const matShaderName = `mat_${cfg.id.replace(/[-]/g, '_')}`;

  const jsContent = `'use strict';
// Coche: ${cfg.name}
// ${cfg.subtitle}
// - ${cfg.specs}
(() => {

const ATLAS_B64 = "${atlasB64}";

const BODY_V = "${f32ToB64(f32Body)}";
const BODY_I = "${u32ToB64(u32Body)}";
const GLASS_V = "${f32ToB64(f32Glass)}";
const GLASS_I = "${u32ToB64(u32Glass)}";
const WHEEL_V = "${f32ToB64(f32Wheel)}";
const WHEEL_I = "${u32ToB64(u32Wheel)}";

function b64ToF32(b64) {
  if (typeof atob === 'undefined') return new Float32Array(0);
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Float32Array(u8.buffer);
}

function b64ToU32(b64) {
  if (typeof atob === 'undefined') return new Uint32Array(0);
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Uint32Array(u8.buffer);
}

WGSL["${matShaderName}"] = \`// Material ${cfg.name}
#include mesh_vert
@group(3) @binding(0) var tAtlas: texture_2d<f32>;

fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  if (!ff) { s.normal = -s.normal; }

  let id = matId(in.mat);
  let p = in.ext.xyz;
  let uv = in.uv;

  let tx = textureSample(tAtlas, sLin, uv);

  // Detección automática por atlas o reflectancia PBR
  if (tx.a > 0.05 && (tx.r != tx.g || tx.g != tx.b)) {
    s.albedo = tx.rgb;
    s.metal = 0.15;
    s.rough = 0.20;
    s.coat = 0.85;
    s.ao = smoothstep(0.05, 0.45, p.y) * 0.35 + 0.65;
  } else {
    // Carrocería con tono base deportivo de alta definición
    s.albedo = tx.rgb * 0.9 + vec3f(0.08, 0.08, 0.09) * 0.1;
    s.metal = 0.12;
    s.rough = 0.22;
    s.coat = 0.90;
    s.ao = smoothstep(0.05, 0.45, p.y) * 0.40 + 0.60;
  }

  // Neumáticos y llantas
  if (abs(p.z) > 0.65 && p.y < 0.45) {
    if (length(p.yz) > 0.26) {
      s.albedo = vec3f(0.045, 0.045, 0.050);
      s.metal = 0.02;
      s.rough = 0.78;
      s.coat = 0.0;
    } else {
      s.albedo = vec3f(0.18, 0.18, 0.20);
      s.metal = 0.85;
      s.rough = 0.22;
      s.coat = 0.40;
    }
  }

  return s;
}
\`;

function loadAtlas() {
  if (typeof CarFactory !== 'undefined' && typeof CarFactory.createAtlasTexture === 'function') {
    return CarFactory.createAtlasTexture(ATLAS_B64, 2048, 2048, 40);
  }
  const W = 2048, H = 2048;
  const tex = mkTex(W, H, 'rgba8unorm-srgb', TU.RT | TU.TB | TU.CD, { mipLevelCount: 7 });
  const initData = new Uint8Array(W * H * 4);
  initData.fill(220);
  G.dev.queue.writeTexture({ texture: tex }, initData, { bytesPerRow: W * 4 }, [W, H]);

  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = ATLAS_B64;
    const loadPromise = new Promise(resolve => {
      img.onload = () => {
        if (typeof createImageBitmap !== 'undefined') {
          createImageBitmap(img).then(bmp => {
            G.dev.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex }, [W, H]);
            if (typeof genMips === 'function') genMips(tex, 'rgba8unorm-srgb');
            resolve();
          }).catch(resolve);
        } else resolve();
      };
      img.onerror = resolve;
    });
    if (typeof R !== 'undefined' && R && R.pending) R.pending.push(loadPromise);
  }
  return tex;
}

const CAR = {
  id: '${cfg.id}',
  name: '${cfg.name}',
  subtitle: '${cfg.subtitle}',
  specs: '${cfg.specs}',
  accent: '${cfg.accent}',
  physics: ${JSON.stringify(cfg.physics, null, 2)},
  hud: ${JSON.stringify(cfg.hud)},
  wheelbase: ${cfg.wheelbase},
  trackF: ${cfg.trackF},
  trackR: ${cfg.trackR},
  wheelR: ${cfg.wheelR},
  hubs: ${JSON.stringify(cfg.hubs)},
  slotBody: 0,
  slotWheel: [0, 0, 0, 0],
  tris: 0,
  _t: m4(),
  _t2: m4(),
  _t3: m4(),
  set: null,
  glass: null,
  atlasBG: null,
  fam: null,
  _z4: new Float32Array(4),
  inp: new Float64Array(2),

  build() {
    const fam = CAR.fam = mkFamily('car_${cfg.id.replace(/[-]/g, '_')}', { src: '${matShaderName}', noCube: true });
    CAR.slotBody = objSlot();
    for (let i = 0; i < 4; i++) CAR.slotWheel[i] = objSlot();

    const set = CAR.set = new MeshSet(fam);
    const glass = CAR.glass = new GlassSet();

    const mb = new MeshBuilder(1 << 20);
    const gl = new MeshBuilder(1 << 16);
    const w = new MeshBuilder(1 << 16);

    const bV = b64ToF32(BODY_V), bI = b64ToU32(BODY_I);
    const gV = b64ToF32(GLASS_V), gI = b64ToU32(GLASS_I);
    const wV = b64ToF32(WHEEL_V), wI = b64ToU32(WHEEL_I);

    const nbV = bV.length / 9;
    for (let i = 0; i < nbV; i++) {
      mb.mat(bV[i*9 + 8]);
      mb.v(bV[i*9], bV[i*9+1], bV[i*9+2], bV[i*9+3], bV[i*9+4], bV[i*9+5], bV[i*9+6], bV[i*9+7]);
    }
    for (let i = 0; i < bI.length; i += 3) mb.tri(bI[i], bI[i+1], bI[i+2]);

    const ngV = gV.length / 9;
    for (let i = 0; i < ngV; i++) {
      gl.v(gV[i*9], gV[i*9+1], gV[i*9+2], gV[i*9+3], gV[i*9+4], gV[i*9+5], gV[i*9+6], gV[i*9+7]);
    }
    for (let i = 0; i < gI.length; i += 3) gl.tri(gI[i], gI[i+1], gI[i+2]);

    const nwV = wV.length / 9;
    for (let i = 0; i < nwV; i++) {
      w.mat(wV[i*9 + 8]);
      w.v(wV[i*9], wV[i*9+1], wV[i*9+2], wV[i*9+3], wV[i*9+4], wV[i*9+5], wV[i*9+6], wV[i*9+7]);
    }
    for (let i = 0; i < wI.length; i += 3) w.tri(wI[i], wI[i+1], wI[i+2]);

    CAR.tris = mb.ni / 3 + gl.ni / 3;
    set.add(mb.upload(), CAR.slotBody, 3);
    glass.add_(gl.upload(), CAR.slotBody);

    const wm = w.upload();
    CAR.tris += 4 * w.ni / 3;
    for (let i = 0; i < 4; i++) set.add(wm, CAR.slotWheel[i], 3);

    const tex = loadAtlas();
    R.drawables.push({
      draw(pass, ctx) {
        if (ctx.kind === KIND.SHADOW && ctx.cascade === 3) return;
        if (!CAR.atlasBG) {
          if (!fam.bgl3) return;
          CAR.atlasBG = G.dev.createBindGroup({ layout: fam.bgl3, entries: [{ binding: 0, resource: tex.createView() }] });
        }
        pass.setBindGroup(3, CAR.atlasBG);
        set.draw(pass, ctx);
      },
    });
    R.transparents.push(glass);

    m4ident(CAR._t);
    CAR.place(CAR._t, CAR._z4, CAR._z4);
    CAR.place(CAR._t, CAR._z4, CAR._z4);
  },

  place(body, spin, susp) {
    const steer = CAR.inp[0];
    const t = CAR._t2;
    objPrev(CAR.slotBody).set(objModel(CAR.slotBody));
    objModel(CAR.slotBody).set(body);
    for (let i = 0; i < 4; i++) {
      const sl = CAR.slotWheel[i], h = CAR.hubs[i], left = (i & 1) === 0;
      objPrev(sl).set(objModel(sl));
      const a = -(i < 2 ? steer : 0) + (left ? PI : 0), c = Math.cos(a), sn = Math.sin(a);
      const g = left ? spin[i] : -spin[i], cg = Math.cos(g), sg = Math.sin(g);
      t[0] = c * cg; t[1] = sg; t[2] = -sn * cg; t[3] = 0;
      t[4] = -c * sg; t[5] = cg; t[6] = sn * sg; t[7] = 0;
      t[8] = sn; t[9] = 0; t[10] = c; t[11] = 0;
      t[12] = h[0]; t[13] = h[1] + susp[i]; t[14] = h[2]; t[15] = 1;
      m4mul(objModel(sl), body, t);
    }
  },
};

CARS.register(CAR);
})();
`;

  const outPath = path.join(__dirname, '..', 'cars', `${cfg.id}.js`);
  fs.writeFileSync(outPath, jsContent, 'utf8');
  const sz = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`[DONE] Written cars/${cfg.id}.js (${sz} MB)`);
}

// =========================================================================
// Main Runner
// =========================================================================
function main() {
  console.log(`Starting conversion of ${CAR_CONFIGS.length} cars from Downloads...`);
  for (const cfg of CAR_CONFIGS) {
    if (!fs.existsSync(cfg.glbPath)) {
      console.error(`[SKIP] Missing file: ${cfg.glbPath}`);
      continue;
    }
    convertCar(cfg);
  }
  console.log('\nAll available cars converted successfully!');
}

main();
