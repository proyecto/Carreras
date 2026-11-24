'use strict';
const fs = require('fs');
const path = require('path');
const { convertMercedes, convertFerrari, convertZ4 } = require('./test_conversion.js');

function f32ToB64(f32) {
  const buf = Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
  return buf.toString('base64');
}

function u32ToB64(u32) {
  const buf = Buffer.from(u32.buffer, u32.byteOffset, u32.byteLength);
  return buf.toString('base64');
}

function getEmbeddedImageB64(glbPath, imageIndex) {
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binBuf = buf.slice(20 + jsonLen + 8);
  const img = gltf.images[imageIndex];
  const bv = gltf.bufferViews[img.bufferView];
  const imgData = binBuf.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  const mime = img.mimeType || 'image/png';
  return `data:${mime};base64,${imgData.toString('base64')}`;
}

// =========================================================================
// 1. Mercedes-AMG GT4 (2020)
// =========================================================================
function generateMercedes() {
  console.log('Generating cars/mercedes-amg-gt4-2020.js...');
  const res = convertMercedes();
  const atlasB64 = getEmbeddedImageB64('cars/mercedes-amg-gt4-wwwvecarzcom/source/mercedes_amg_gt4.glb', 10);

  const hubs = [
    [ 1.344, 0.324, -0.812], // FL
    [ 1.344, 0.324,  0.812], // FR
    [-1.287, 0.333, -0.830], // RL
    [-1.287, 0.333,  0.830]  // RR
  ];

  const content = `'use strict';
// Coche: Mercedes-AMG GT4 (2020)
// Homologación oficial SRO GT4 / IMSA Michelin Pilot Challenge / ADAC GT4 Germany.
// - Motor 4.0L V8 Biturbo M178 desarrollado por Mercedes-AMG en Affalterbach con 510 CV y 600 Nm de par.
// - Transmisión de competición secuencial de 6 velocidades montada en disposición transaxle.
// - Chasis 'Spaceframe' de aluminio y fibra de carbono optimizado para carreras de clientes (Customer Racing).
// - Aerodinámica con alerón trasero regulable de carbono y splitter frontal 'Panamericana'.
(() => {

const ATLAS_B64 = "${atlasB64}";

const BODY_V = "${f32ToB64(res.bodyVerts)}";
const BODY_I = "${u32ToB64(res.bodyIndices)}";
const GLASS_V = "${f32ToB64(res.glassVerts)}";
const GLASS_I = "${u32ToB64(res.glassIndices)}";
const WHEEL_V = "${f32ToB64(res.wheelVerts)}";
const WHEEL_I = "${u32ToB64(res.wheelIndices)}";

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

WGSL["mat_mercedes_amg_gt4_2020"] = \`// Material Mercedes-AMG GT4 2020
#include mesh_vert
@group(3) @binding(0) var tAtlas: texture_2d<f32>;

fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  if (!ff) { s.normal = -s.normal; }

  let id = matId(in.mat);
  let p = in.ext.xyz;
  let uv = in.uv;

  let tx = textureSample(tAtlas, sLin, uv);

  if (id == 13u || id == 3u) {
    // Carrocería Mercedes-AMG GT4 y parasol de competición
    s.albedo = tx.rgb;
    s.metal = 0.10;
    s.rough = 0.18;
    s.coat = 0.90;
    s.ao = smoothstep(0.05, 0.45, p.y) * 0.35 + 0.65;
  } else if (id == 60u) {
    // Neumáticos de competición Michelin Pilot Sport GT slick
    s.albedo = vec3f(0.045, 0.045, 0.05);
    s.metal = 0.02;
    s.rough = 0.75;
    s.ao = 0.90;
  } else if (id == 59u) {
    // Llantas de aleación forjadas AMG Customer Racing
    s.albedo = vec3f(0.18, 0.18, 0.20);
    s.metal = 0.82;
    s.rough = 0.22;
    s.coat = 0.45;
  } else if (id == 54u) {
    // Discos de freno cerámicos perforados ventilados
    s.albedo = vec3f(0.24, 0.24, 0.25);
    s.metal = 0.80;
    s.rough = 0.28;
  } else if (id == 27u || id == 28u || id == 49u || id == 50u) {
    // Fibra de carbono AMG Performance (splitter, alerón, difusor, interior)
    s.albedo = vec3f(0.04, 0.04, 0.045);
    s.metal = 0.08;
    s.rough = 0.60;
    s.coat = 0.0;
  } else if (id == 0u || id == 10u || id == 15u || id == 55u) {
    // Ópticas LED frontales Multibeam AMG
    s.albedo = vec3f(0.95, 0.95, 1.0);
    s.emissive = 0.92;
  } else if (id == 1u || id == 11u || id == 20u) {
    // Pilotos traseros LED estilizados AMG
    s.albedo = vec3f(0.95, 0.04, 0.04);
    s.emissive = 0.85;
  } else if (id == 2u) {
    // Escapes cromados / titanio AMG
    s.albedo = vec3f(0.85, 0.82, 0.75);
    s.metal = 0.90;
    s.rough = 0.15;
  } else {
    // Chasis, mecánica e interiores
    s.albedo = tx.rgb * 0.8 + vec3f(0.05, 0.05, 0.055) * 0.2;
    s.metal = 0.25;
    s.rough = 0.40;
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
  id: 'mercedes-amg-gt4-2020',
  name: 'Mercedes-AMG GT4',
  subtitle: '2020 GT4 Spec · 4.0L Biturbo V8 M178 · 510 CV · RWD',
  specs: '1390 kg · 510 CV · 6-vel seq · RWD · AMG Customer Racing Aero',
  accent: '#00a3e0',
  physics: {
    m: 1390, Izz: 1880, L: 2.631, a: 1.340, b: 1.291, tw: 1.67, h: 0.40, R: 0.335,
    mu: 1.68, B: 11.2, C: 1.50, driveF: 0.0,
    gears: [3.05, 2.18, 1.65, 1.32, 1.09, 0.90], final: 3.38, rev: 3.0, eff: 0.96,
    cdA: 0.69, crr: 0.010, brakeF: 0.60, halfW: 1.02, front: 2.45, rear: 2.42,
    clA: 0.88, aeroSplitF: 0.40,
    torqueBase: 450, torquePeak: 260, torqueDrop: 180, torquePeakStart: 0.42, torquePeakSpan: 4.2, torqueDropRpm: 7.0,
    shiftUpRpm: 7200, shiftDownRpm: 5000, revLimitRpm: 7600, maxRpm: 8000, idleRpm: 1000,
  },
  hud: { maxKmh: 310, maxRpm: 8.0, redlineRpm: 7.2 },
  wheelbase: 2.631, trackF: 1.670, trackR: 1.660, wheelR: 0.335,
  hubs: [
    [${hubs[0].join(', ')}],
    [${hubs[1].join(', ')}],
    [${hubs[2].join(', ')}],
    [${hubs[3].join(', ')}]
  ],
  slotBody: 0, slotWheel: [0, 0, 0, 0],
  tris: 0, _t: m4(), _t2: m4(), _t3: m4(), set: null, glass: null, atlasBG: null, fam: null,
  _z4: new Float32Array(4),
  inp: new Float64Array(2),

  build() {
    const fam = CAR.fam = mkFamily('car_mercedes_amg_gt4', { src: 'mat_mercedes_amg_gt4_2020', noCube: true });
    CAR.slotBody = objSlot();
    for (let i = 0; i < 4; i++) CAR.slotWheel[i] = objSlot();

    const set = CAR.set = new MeshSet(fam);
    const glass = CAR.glass = new GlassSet();

    const mb = new MeshBuilder(1 << 19);
    const gl = new MeshBuilder(1 << 15);
    const w = new MeshBuilder(1 << 15);

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

  fs.writeFileSync('cars/mercedes-amg-gt4-2020.js', content);
  console.log('cars/mercedes-amg-gt4-2020.js generated successfully!');
}

// =========================================================================
// 2. Ferrari 296 Challenge (2024)
// =========================================================================
function generateFerrari() {
  console.log('Generating cars/ferrari-296-challenge-2024.js...');
  const res = convertFerrari();
  const atlasB64 = getEmbeddedImageB64('cars/ferrari-296-challenge-2024-wwwvecarzcom/source/ferrari_296_challenge_gt2.glb', 7);

  const hubs = [
    [ 1.141, 0.336, -0.824], // FL
    [ 1.141, 0.336,  0.824], // FR
    [-1.466, 0.367, -0.811], // RL
    [-1.466, 0.367,  0.811]  // RR
  ];

  const content = `'use strict';
// Coche: Ferrari 296 Challenge (2024)
// Homologación oficial Ferrari Challenge Trofeo Pirelli / Gran Turismo International.
// - Motor 3.0L V6 120° Twin-Turbo F163 con 700 CV a 7.500 RPM (potencia específica récord: 234 CV/litro).
// - Transmisión secuencial F1 de doble embrague de 7 velocidades con levas de fibra de carbono.
// - Aerodinámica avanzada de circuito: genera más de 870 kg de carga aerodinámica a 250 km/h.
// - Frenos Brembo CCM-R EVO derivados de prototipos deportivos de Le Mans con pinzas de alta rigidez.
(() => {

const ATLAS_B64 = "${atlasB64}";

const BODY_V = "${f32ToB64(res.bodyVerts)}";
const BODY_I = "${u32ToB64(res.bodyIndices)}";
const GLASS_V = "${f32ToB64(res.glassVerts)}";
const GLASS_I = "${u32ToB64(res.glassIndices)}";
const WHEEL_V = "${f32ToB64(res.wheelVerts)}";
const WHEEL_I = "${u32ToB64(res.wheelIndices)}";

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

WGSL["mat_ferrari_296_challenge_2024"] = \`// Material Ferrari 296 Challenge 2024
#include mesh_vert
@group(3) @binding(0) var tAtlas: texture_2d<f32>;

fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  if (!ff) { s.normal = -s.normal; }

  let id = matId(in.mat);
  let p = in.ext.xyz;
  let uv = in.uv;

  let tx = textureSample(tAtlas, sLin, uv);

  if (id == 3u) {
    // Carrocería Rosso Corsa de competición y aerodinámica S-Duct
    s.albedo = tx.rgb;
    s.metal = 0.08;
    s.rough = 0.15;
    s.coat = 0.95;
    s.ao = smoothstep(0.05, 0.45, p.y) * 0.35 + 0.65;
  } else if (id == 26u || id == 27u || id == 1u) {
    // Decoraciones Pirelli Trofeo, dorsales y emblemas Ferrari Scuderia
    s.albedo = tx.rgb;
    s.rough = 0.25;
    s.coat = 0.50;
  } else if (id == 54u) {
    // Neumáticos de competición Pirelli P Zero slick
    s.albedo = vec3f(0.045, 0.045, 0.05);
    s.metal = 0.02;
    s.rough = 0.72;
    s.ao = 0.90;
  } else if (id == 52u) {
    // Discos de freno cerámicos Brembo CCM-R EVO
    s.albedo = vec3f(0.20, 0.20, 0.22);
    s.metal = 0.78;
    s.rough = 0.30;
  } else if (id == 49u || id == 50u) {
    // Pinzas de freno de competición Brembo rojas Ferrari
    s.albedo = vec3f(0.85, 0.06, 0.06);
    s.metal = 0.52;
    s.rough = 0.20;
    s.coat = 0.85;
  } else if (id == 51u) {
    // Tuerca monotuerca central de titanio anodizado
    s.albedo = vec3f(0.25, 0.25, 0.28);
    s.metal = 0.88;
    s.rough = 0.22;
  } else if (id == 5u || id == 12u || id == 18u || id == 48u) {
    // Fibra de carbono expuesta Ferrari (splitter frontal, alerón trasero, difusor)
    s.albedo = vec3f(0.035, 0.035, 0.04);
    s.metal = 0.12;
    s.rough = 0.55;
    s.coat = 0.0;
  } else if (id == 44u || id == 17u) {
    // Ópticas frontales LED estilo 499P Hypercar
    s.albedo = vec3f(0.95, 0.98, 1.0);
    s.emissive = 0.95;
  } else if (id == 45u || id == 32u) {
    // Barra de luz trasera LED horizontal Ferrari
    s.albedo = vec3f(0.95, 0.05, 0.05);
    s.emissive = 0.90;
  } else {
    // Habitáculo, jaula antivuelco FIA y subchasis
    s.albedo = tx.rgb * 0.7 + vec3f(0.06, 0.06, 0.065) * 0.3;
    s.metal = 0.20;
    s.rough = 0.45;
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
  id: 'ferrari-296-challenge-2024',
  name: 'Ferrari 296 Challenge',
  subtitle: '2024 Trofeo Pirelli & GT Spec · 3.0L Twin-Turbo 120° V6 · 700 CV · RWD',
  specs: '1330 kg · 700 CV · F1 7-vel doble embrague · RWD · Carbon High-Downforce Aero',
  accent: '#d40000',
  physics: {
    m: 1330, Izz: 1720, L: 2.607, a: 1.141, b: 1.466, tw: 1.65, h: 0.37, R: 0.350,
    mu: 1.76, B: 12.0, C: 1.55, driveF: 0.0,
    gears: [3.08, 2.19, 1.63, 1.29, 1.05, 0.87, 0.74], final: 3.65, rev: 3.0, eff: 0.96,
    cdA: 0.66, crr: 0.010, brakeF: 0.58, halfW: 1.01, front: 2.38, rear: 2.40,
    clA: 1.15, aeroSplitF: 0.43,
    torqueBase: 480, torquePeak: 310, torqueDrop: 210, torquePeakStart: 0.45, torquePeakSpan: 4.8, torqueDropRpm: 7.8,
    shiftUpRpm: 8200, shiftDownRpm: 5800, revLimitRpm: 8600, maxRpm: 9000, idleRpm: 1200,
  },
  hud: { maxKmh: 345, maxRpm: 9.5, redlineRpm: 8.5 },
  wheelbase: 2.607, trackF: 1.648, trackR: 1.622, wheelR: 0.350,
  hubs: [
    [${hubs[0].join(', ')}],
    [${hubs[1].join(', ')}],
    [${hubs[2].join(', ')}],
    [${hubs[3].join(', ')}]
  ],
  slotBody: 0, slotWheel: [0, 0, 0, 0],
  tris: 0, _t: m4(), _t2: m4(), _t3: m4(), set: null, glass: null, atlasBG: null, fam: null,
  _z4: new Float32Array(4),
  inp: new Float64Array(2),

  build() {
    const fam = CAR.fam = mkFamily('car_ferrari_296', { src: 'mat_ferrari_296_challenge_2024', noCube: true });
    CAR.slotBody = objSlot();
    for (let i = 0; i < 4; i++) CAR.slotWheel[i] = objSlot();

    const set = CAR.set = new MeshSet(fam);
    const glass = CAR.glass = new GlassSet();

    const mb = new MeshBuilder(1 << 19);
    const gl = new MeshBuilder(1 << 15);
    const w = new MeshBuilder(1 << 15);

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

  fs.writeFileSync('cars/ferrari-296-challenge-2024.js', content);
  console.log('cars/ferrari-296-challenge-2024.js generated successfully!');
}

// =========================================================================
// 3. BMW Z4 GT3 (2011)
// =========================================================================
function generateZ4() {
  console.log('Generating cars/bmw-z4-gt3-2011.js...');
  const res = convertZ4();
  const atlasB64 = getEmbeddedImageB64('cars/2011-bmw-z4-gt3-crowne-plaza/source/z4_gt3.glb', 17);

  const hubs = [
    [ 1.193, 0.267, -0.834], // FL
    [ 1.193, 0.267,  0.835], // FR
    [-1.283, 0.267, -0.834], // RL
    [-1.283, 0.267,  0.835]  // RR
  ];

  const content = `'use strict';
// Coche: BMW Z4 GT3 (2011)
// Homologación oficial FIA GT3 / Blancpain Endurance Series / 24H Spa & Nürburgring.
// - Motor P65B44 V8 de 4.4L atmosférico derivado del BMW M3 DTM/GTR entregando 515 CV a 8.200 RPM.
// - Transmisión secuencial Xtrac de 6 velocidades con accionamiento por levas en el volante.
// - Carrocería aligerada con paneles de polímero reforzado con fibra de carbono (CFRP) y decoración Crowne Plaza.
// - Enorme alerón posterior 'swan-neck' y ensanches de aleta con salidas de aireación en branquias.
(() => {

const ATLAS_B64 = "${atlasB64}";

const BODY_V = "${f32ToB64(res.bodyVerts)}";
const BODY_I = "${u32ToB64(res.bodyIndices)}";
const GLASS_V = "${f32ToB64(res.glassVerts)}";
const GLASS_I = "${u32ToB64(res.glassIndices)}";
const WHEEL_V = "${f32ToB64(res.wheelVerts)}";
const WHEEL_I = "${u32ToB64(res.wheelIndices)}";

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

WGSL["mat_bmw_z4_gt3_2011"] = \`// Material BMW Z4 GT3 (2011)
#include mesh_vert
@group(3) @binding(0) var tAtlas: texture_2d<f32>;

fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  if (!ff) { s.normal = -s.normal; }

  let id = matId(in.mat);
  let p = in.ext.xyz;
  let uv = in.uv;

  let tx = textureSample(tAtlas, sLin, uv);

  if (id == 25u) {
    // Carrocería BMW Motorsport Crowne Plaza Livery
    s.albedo = tx.rgb;
    s.metal = 0.10;
    s.rough = 0.20;
    s.coat = 0.85;
    s.ao = smoothstep(0.05, 0.45, p.y) * 0.35 + 0.65;
  } else if (id == 59u) {
    // Neumáticos de competición Dunlop Racing slick
    s.albedo = vec3f(0.045, 0.045, 0.05);
    s.metal = 0.02;
    s.rough = 0.75;
    s.ao = 0.90;
  } else if (id == 56u || id == 57u) {
    // Llantas BBS forjadas GT3 multirradio
    s.albedo = vec3f(0.18, 0.18, 0.20);
    s.metal = 0.85;
    s.rough = 0.22;
    s.coat = 0.40;
  } else if (id == 58u) {
    // Discos de freno de competición rayados y perforados
    s.albedo = vec3f(0.25, 0.25, 0.26);
    s.metal = 0.80;
    s.rough = 0.28;
  } else if (id == 60u || id == 61u) {
    // Pinzas de freno AP Racing azules BMW Motorsport
    s.albedo = vec3f(0.10, 0.35, 0.85);
    s.metal = 0.55;
    s.rough = 0.22;
    s.coat = 0.75;
  } else if (id == 16u) {
    // Fibra de carbono expuesta (splitter, difusor, alerón masivo Z4 GT3)
    s.albedo = vec3f(0.04, 0.04, 0.045);
    s.metal = 0.10;
    s.rough = 0.60;
    s.coat = 0.0;
  } else if (id == 10u) {
    // Ópticas frontales Angel Eyes BMW
    s.albedo = vec3f(0.95, 0.95, 1.0);
    s.emissive = 0.85;
  } else if (id == 11u) {
    // Pilotos traseros LED en L BMW
    s.albedo = vec3f(0.90, 0.05, 0.05);
    s.emissive = 0.85;
  } else if (id == 0u || id == 3u || id == 5u || id == 7u || id == 33u) {
    // Detalles cromados / aluminio
    s.albedo = vec3f(0.90, 0.90, 0.92);
    s.metal = 0.95;
    s.rough = 0.10;
  } else {
    // Cockpit, chasis y mecánica
    s.albedo = tx.rgb * 0.8 + vec3f(0.06, 0.06, 0.065) * 0.2;
    s.metal = 0.20;
    s.rough = 0.40;
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
  id: 'bmw-z4-gt3-2011',
  name: 'BMW Z4 GT3 (2011)',
  subtitle: '2011 FIA GT3 Spec · 4.4L Atmospheric V8 P65B44 · 515 CV · RWD',
  specs: '1190 kg · 515 CV · Xtrac 6-vel seq · RWD · Crowne Plaza Livery',
  accent: '#1c69d4',
  physics: {
    m: 1190, Izz: 1650, L: 2.476, a: 1.250, b: 1.226, tw: 1.67, h: 0.38, R: 0.343,
    mu: 1.73, B: 11.8, C: 1.54, driveF: 0.0,
    gears: [2.90, 2.10, 1.62, 1.30, 1.08, 0.91], final: 3.44, rev: 3.0, eff: 0.96,
    cdA: 0.70, crr: 0.010, brakeF: 0.60, halfW: 1.01, front: 2.30, rear: 2.25,
    clA: 1.05, aeroSplitF: 0.42,
    torqueBase: 400, torquePeak: 230, torqueDrop: 160, torquePeakStart: 0.48, torquePeakSpan: 4.6, torqueDropRpm: 8.0,
    shiftUpRpm: 8100, shiftDownRpm: 5800, revLimitRpm: 8500, maxRpm: 8800, idleRpm: 1200,
  },
  hud: { maxKmh: 320, maxRpm: 9.0, redlineRpm: 8.2 },
  wheelbase: 2.476, trackF: 1.669, trackR: 1.669, wheelR: 0.343,
  hubs: [
    [${hubs[0].join(', ')}],
    [${hubs[1].join(', ')}],
    [${hubs[2].join(', ')}],
    [${hubs[3].join(', ')}]
  ],
  slotBody: 0, slotWheel: [0, 0, 0, 0],
  tris: 0, _t: m4(), _t2: m4(), _t3: m4(), set: null, glass: null, atlasBG: null, fam: null,
  _z4: new Float32Array(4),
  inp: new Float64Array(2),

  build() {
    const fam = CAR.fam = mkFamily('car_bmw_z4_gt3', { src: 'mat_bmw_z4_gt3_2011', noCube: true });
    CAR.slotBody = objSlot();
    for (let i = 0; i < 4; i++) CAR.slotWheel[i] = objSlot();

    const set = CAR.set = new MeshSet(fam);
    const glass = CAR.glass = new GlassSet();

    const mb = new MeshBuilder(1 << 19);
    const gl = new MeshBuilder(1 << 15);
    const w = new MeshBuilder(1 << 15);

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

  fs.writeFileSync('cars/bmw-z4-gt3-2011.js', content);
  console.log('cars/bmw-z4-gt3-2011.js generated successfully!');
}

generateMercedes();
generateFerrari();
generateZ4();
console.log('All 3 car files generated!');
