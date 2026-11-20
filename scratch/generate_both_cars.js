'use strict';
const fs = require('fs');
const path = require('path');
const { convertMustang2024 } = require('./convert_mustang_2024.js');
const { convertMustangBase } = require('./convert_mustang_base.js');

function f32ToB64(f32) {
  const buf = Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
  return buf.toString('base64');
}

function u32ToB64(u32) {
  const buf = Buffer.from(u32.buffer, u32.byteOffset, u32.byteLength);
  return buf.toString('base64');
}

function generateCar1() {
  console.log('Generating cars/ford-mustang-gt3-2024.js...');
  const res = convertMustang2024();

  const texBuf = fs.readFileSync('cars/ford-mustang-gt3-2024/textures/gltf_embedded_8.png');
  const atlasB64 = 'data:image/png;base64,' + texBuf.toString('base64');

  const bodyVB64 = f32ToB64(res.bodyVerts);
  const bodyIB64 = u32ToB64(res.bodyIndices);
  const glassVB64 = f32ToB64(res.glassVerts);
  const glassIB64 = u32ToB64(res.glassIndices);
  const wheelVB64 = f32ToB64(res.wheelVerts);
  const wheelIB64 = u32ToB64(res.wheelIndices);

  const fileContent = `'use strict';
// Coche: Ford Mustang GT3 (2024)
// Homologación oficial FIA GT3 / IMSA WeatherTech SportsCar Championship / FIA WEC.
// - Motor Coyote V8 5.4L atmosférico desarrollado por M-Sport, entregando ~540 CV.
// - Chasis Multimatic Motorsports con suspensión trasera con amortiguadores de vástago corto.
// - Aerodinámica avanzada en túnel de viento con splitter delantero prominente y alerón 'swan-neck'.
// - Decoración de fábrica Ford Performance Racing #64 / #65.
(() => {

const ATLAS_B64 = "${atlasB64}";

const BODY_V = "${bodyVB64}";
const BODY_I = "${bodyIB64}";
const GLASS_V = "${glassVB64}";
const GLASS_I = "${glassIB64}";
const WHEEL_V = "${wheelVB64}";
const WHEEL_I = "${wheelIB64}";

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

WGSL["mat_ford_mustang_gt3_2024"] = \`// Material Ford Mustang GT3 2024
#include mesh_vert
@group(3) @binding(0) var tAtlas: texture_2d<f32>;

fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  if (!ff) { s.normal = -s.normal; }

  let id = matId(in.mat);
  let p = in.ext.xyz;
  let uv = in.uv;

  let tx = textureSample(tAtlas, sLin, uv);

  if (id == 8u || id == 16u || id == 43u) {
    // Carrocería Ford Performance Racing y adhesivos aerodinámicos
    s.albedo = tx.rgb;
    s.metal = 0.08;
    s.rough = 0.18;
    s.coat = 0.90;
    s.ao = smoothstep(0.05, 0.45, p.y) * 0.35 + 0.65;
  } else if (id == 4u) {
    // Neumáticos de competición Michelin Pilot Sport GT slick
    s.albedo = vec3f(0.05, 0.05, 0.055);
    s.metal = 0.02;
    s.rough = 0.72;
    s.ao = 0.90;
  } else if (id == 2u) {
    // Llantas de competición forjadas Multimatic / BBS
    s.albedo = vec3f(0.18, 0.18, 0.20);
    s.metal = 0.85;
    s.rough = 0.22;
    s.coat = 0.45;
  } else if (id == 0u) {
    // Discos de freno cerámicos perforados
    s.albedo = vec3f(0.25, 0.25, 0.26);
    s.metal = 0.80;
    s.rough = 0.28;
  } else if (id == 1u) {
    // Pinzas de freno Brembo Racing azules Ford Performance
    s.albedo = vec3f(0.08, 0.28, 0.85);
    s.metal = 0.55;
    s.rough = 0.20;
    s.coat = 0.80;
  } else if (id == 9u || id == 25u) {
    // Fibra de carbono mate (splitter, difusor, interiores)
    s.albedo = vec3f(0.04, 0.04, 0.045);
    s.metal = 0.10;
    s.rough = 0.65;
    s.coat = 0.0;
  } else if (id == 47u) {
    // Ópticas LED frontales DRL
    s.albedo = vec3f(0.95, 0.95, 1.0);
    s.emissive = 0.95;
  } else if (id == 48u) {
    // Pilotos traseros LED tridimensionales Mustang
    s.albedo = vec3f(0.95, 0.05, 0.05);
    s.emissive = 0.85;
  } else if (id == 5u || id == 6u) {
    // Salidas de escape de titanio lateral / trasero
    s.albedo = vec3f(0.85, 0.75, 0.45);
    s.metal = 0.92;
    s.rough = 0.15;
  } else {
    // Piezas mecánicas, chasis, suspensión e interiores
    s.albedo = vec3f(0.06, 0.06, 0.065);
    s.metal = 0.20;
    s.rough = 0.45;
  }

  return s;
}
\`;

function loadAtlas() {
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
            genMips(tex, 'rgba8unorm-srgb');
            resolve();
          }).catch(resolve);
        } else resolve();
      };
      img.onerror = resolve;
    });
    if (R && R.pending) R.pending.push(loadPromise);
  }
  return tex;
}

const CAR = {
  id: 'ford-mustang-gt3-2024',
  name: 'Ford Mustang GT3 (2024)',
  subtitle: '2024 WEC & IMSA Spec · 5.4L Coyote V8 · 540 CV · RWD',
  specs: '1280 kg · 540 CV · Hewland 6-vel seq · RWD · Multimatic Aero',
  accent: '#0d47a1',
  physics: {
    m: 1280, Izz: 1780, L: 2.775, a: 1.390, b: 1.385, tw: 1.69, h: 0.38, R: 0.350,
    mu: 1.70, B: 11.2, C: 1.52, driveF: 0.0,
    gears: [3.10, 2.15, 1.60, 1.28, 1.06, 0.90], final: 3.50, rev: 3.1, eff: 0.96,
    cdA: 0.68, crr: 0.010, brakeF: 0.61, halfW: 1.04, front: 2.50, rear: 2.50,
    clA: 0.94, aeroSplitF: 0.40,
    torqueBase: 420, torquePeak: 260, torqueDrop: 180, torquePeakStart: 0.50, torquePeakSpan: 4.8, torqueDropRpm: 7.4,
    shiftUpRpm: 7400, shiftDownRpm: 5400, revLimitRpm: 8000, maxRpm: 8200, idleRpm: 1100,
  },
  hud: { maxKmh: 330, maxRpm: 8.5, redlineRpm: 7.8 },
  wheelbase: 2.775, trackF: 1.700, trackR: 1.676, wheelR: 0.350,
  hubs: [
    [${res.hubs[0].join(', ')}],
    [${res.hubs[1].join(', ')}],
    [${res.hubs[2].join(', ')}],
    [${res.hubs[3].join(', ')}]
  ],
  slotBody: 0, slotWheel: [0, 0, 0, 0],
  tris: 0, _t: m4(), _t2: m4(), _t3: m4(), set: null, glass: null, atlasBG: null, fam: null,
  _z4: new Float32Array(4),
  inp: new Float64Array(2),

  build() {
    const fam = CAR.fam = mkFamily('car_mustang_gt3_2024', { src: 'mat_ford_mustang_gt3_2024', noCube: true });
    CAR.slotBody = objSlot();
    for (let i = 0; i < 4; i++) CAR.slotWheel[i] = objSlot();

    const set = CAR.set = new MeshSet(fam);
    const glass = CAR.glass = new GlassSet();

    const mb = new MeshBuilder(1 << 19);
    const gl = new MeshBuilder(1 << 15);
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

  fs.writeFileSync('cars/ford-mustang-gt3-2024.js', fileContent);
  console.log('Successfully wrote cars/ford-mustang-gt3-2024.js (' + (fileContent.length / 1024 / 1024).toFixed(2) + ' MB)');
}

function generateCar2() {
  console.log('Generating cars/ford-mustang-gt3.js...');
  const res = convertMustangBase();

  const texBuf = fs.readFileSync('cars/ford-mustang-gt3/textures/000002682B2450A0_13.png');
  const atlasB64 = 'data:image/png;base64,' + texBuf.toString('base64');

  const bodyVB64 = f32ToB64(res.bodyVerts);
  const bodyIB64 = u32ToB64(res.bodyIndices);
  const glassVB64 = f32ToB64(res.glassVerts);
  const glassIB64 = u32ToB64(res.glassIndices);
  const wheelVB64 = f32ToB64(res.wheelVerts);
  const wheelIB64 = u32ToB64(res.wheelIndices);

  const fileContent = `'use strict';
// Coche: Ford Mustang GT3
// Prototipo de competición GT3 desarrollado por Ford Performance y Multimatic Motorsports.
// - Motor 5.4L V8 atmosférico con 535 CV a 8200 rpm.
// - Chasis tubular integrado con paneles de carrocería en fibra de carbono vista.
// - Suspensión de competición con reglaje rígido y máxima respuesta en curva media/rápida.
// - Transmisión secuencial Hewland de 6 velocidades con levas en el volante.
(() => {

const ATLAS_B64 = "${atlasB64}";

const BODY_V = "${bodyVB64}";
const BODY_I = "${bodyIB64}";
const GLASS_V = "${glassVB64}";
const GLASS_I = "${glassIB64}";
const WHEEL_V = "${wheelVB64}";
const WHEEL_I = "${wheelIB64}";

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

WGSL["mat_ford_mustang_gt3"] = \`// Material Ford Mustang GT3
#include mesh_vert
@group(3) @binding(0) var tAtlas: texture_2d<f32>;

fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  if (!ff) { s.normal = -s.normal; }

  let id = matId(in.mat);
  let p = in.ext.xyz;
  let uv = in.uv;

  let tx = textureSample(tAtlas, sLin, uv);

  if (id == 14u) {
    // Carrocería de competición Ford Mustang GT3
    s.albedo = tx.rgb;
    s.metal = 0.06;
    s.rough = 0.20;
    s.coat = 0.88;
    s.ao = smoothstep(0.05, 0.45, p.y) * 0.35 + 0.65;
  } else if (id == 33u) {
    // Neumáticos slick GT3 de seco
    s.albedo = vec3f(0.05, 0.05, 0.055);
    s.metal = 0.02;
    s.rough = 0.72;
    s.ao = 0.90;
  } else if (id == 11u) {
    // Llantas monobloque monotuerca GT3 grafito satinado
    s.albedo = vec3f(0.14, 0.14, 0.15);
    s.metal = 0.80;
    s.rough = 0.24;
    s.coat = 0.40;
  } else if (id == 0u) {
    // Discos de freno ventilados
    s.albedo = vec3f(0.24, 0.24, 0.25);
    s.metal = 0.82;
    s.rough = 0.26;
  } else if (id == 32u) {
    // Pinzas de freno Brembo Racing amarillas de competición
    s.albedo = vec3f(0.95, 0.75, 0.05);
    s.metal = 0.50;
    s.rough = 0.20;
    s.coat = 0.80;
  } else if (id == 18u || id == 20u || id == 38u) {
    // Habitáculo, jaula antivuelco y fibra de carbono mate
    s.albedo = vec3f(0.045, 0.045, 0.05);
    s.metal = 0.10;
    s.rough = 0.68;
    s.coat = 0.0;
  } else if (id == 35u) {
    // Ópticas LED frontales frías
    s.albedo = vec3f(0.95, 0.95, 1.0);
    s.emissive = 0.90;
  } else {
    // Elementos mecánicos auxiliares y bajos
    s.albedo = vec3f(0.08, 0.08, 0.085);
    s.metal = 0.25;
    s.rough = 0.40;
  }

  return s;
}
\`;

function loadAtlas() {
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
            genMips(tex, 'rgba8unorm-srgb');
            resolve();
          }).catch(resolve);
        } else resolve();
      };
      img.onerror = resolve;
    });
    if (R && R.pending) R.pending.push(loadPromise);
  }
  return tex;
}

const CAR = {
  id: 'ford-mustang-gt3',
  name: 'Ford Mustang GT3',
  subtitle: 'Ford Performance GT3 Racer · 5.4L V8 · Carbon Spec · RWD',
  specs: '1270 kg · 535 CV · 6-vel seq · RWD · Multimatic Carbon Aero',
  accent: '#002244',
  physics: {
    m: 1270, Izz: 1770, L: 2.780, a: 1.390, b: 1.390, tw: 1.68, h: 0.38, R: 0.355,
    mu: 1.70, B: 11.2, C: 1.52, driveF: 0.0,
    gears: [3.10, 2.15, 1.60, 1.28, 1.06, 0.90], final: 3.50, rev: 3.1, eff: 0.96,
    cdA: 0.68, crr: 0.010, brakeF: 0.61, halfW: 1.04, front: 2.50, rear: 2.50,
    clA: 0.93, aeroSplitF: 0.40,
    torqueBase: 420, torquePeak: 260, torqueDrop: 180, torquePeakStart: 0.50, torquePeakSpan: 4.8, torqueDropRpm: 7.4,
    shiftUpRpm: 7400, shiftDownRpm: 5400, revLimitRpm: 8000, maxRpm: 8200, idleRpm: 1100,
  },
  hud: { maxKmh: 330, maxRpm: 8.5, redlineRpm: 7.8 },
  wheelbase: 2.780, trackF: 1.680, trackR: 1.690, wheelR: 0.355,
  hubs: [
    [${res.hubs[0].join(', ')}],
    [${res.hubs[1].join(', ')}],
    [${res.hubs[2].join(', ')}],
    [${res.hubs[3].join(', ')}]
  ],
  slotBody: 0, slotWheel: [0, 0, 0, 0],
  tris: 0, _t: m4(), _t2: m4(), _t3: m4(), set: null, glass: null, atlasBG: null, fam: null,
  _z4: new Float32Array(4),
  inp: new Float64Array(2),

  build() {
    const fam = CAR.fam = mkFamily('car_mustang_gt3', { src: 'mat_ford_mustang_gt3', noCube: true });
    CAR.slotBody = objSlot();
    for (let i = 0; i < 4; i++) CAR.slotWheel[i] = objSlot();

    const set = CAR.set = new MeshSet(fam);
    const glass = CAR.glass = new GlassSet();

    const mb = new MeshBuilder(1 << 19);
    const gl = new MeshBuilder(1 << 15);
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

  fs.writeFileSync('cars/ford-mustang-gt3.js', fileContent);
  console.log('Successfully wrote cars/ford-mustang-gt3.js (' + (fileContent.length / 1024 / 1024).toFixed(2) + ' MB)');
}

generateCar1();
generateCar2();
