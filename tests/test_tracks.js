'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function runTracksTestSuite() {
  console.log('\n--- [TEST SUITE] Validación de Circuitos (tracks/) ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
    } else {
      failed++;
      console.error(`  ❌ FALLO: ${message}`);
    }
  }

  const root = path.resolve(__dirname, '..');
  const mathCode = fs.readFileSync(path.join(root, 'engine/math.js'), 'utf8');
  const regCode = fs.readFileSync(path.join(root, 'game/registry.js'), 'utf8');
  const trackFactoryCode = fs.readFileSync(path.join(root, 'engine/track-factory.js'), 'utf8');
  const propUtilsCode = fs.readFileSync(path.join(root, 'engine/props/prop-utils.js'), 'utf8');
  const trackSafetyCode = fs.readFileSync(path.join(root, 'engine/props/track-safety.js'), 'utf8');
  const grandstandCode = fs.readFileSync(path.join(root, 'engine/props/grandstands.js'), 'utf8');
  const paddockCode = fs.readFileSync(path.join(root, 'engine/props/paddock.js'), 'utf8');
  const sceneryCode = fs.readFileSync(path.join(root, 'engine/props/scenery.js'), 'utf8');
  const urbanContainmentCode = fs.readFileSync(path.join(root, 'engine/props/urban-containment.js'), 'utf8');
  const propFactoryCode = fs.readFileSync(path.join(root, 'engine/prop-factory.js'), 'utf8');
  const atlasFactoryCode = fs.readFileSync(path.join(root, 'engine/atlas-factory.js'), 'utf8');
  const landmarkFactoryCode = fs.readFileSync(path.join(root, 'engine/landmark-factory.js'), 'utf8');
  const vegetationFactoryCode = fs.readFileSync(path.join(root, 'engine/vegetation-factory.js'), 'utf8');
  const trackManifestData = JSON.parse(fs.readFileSync(path.join(root, 'tracks/manifest.json'), 'utf8'));

  const ctx = {
    window: {
      TRACK_MANIFEST: trackManifestData,
      TRACK_LIST: trackManifestData.map(t => t.json)
    },
    document: { createElement: () => ({ getContext: () => ({ scale() { }, fillRect() { }, strokeRect() { }, beginPath() { }, moveTo() { }, lineTo() { }, bezierCurveTo() { }, quadraticCurveTo() { }, closePath() { }, fill() { }, stroke() { }, save() { }, restore() { }, translate() { }, transform() { }, createLinearGradient: () => ({ addColorStop() { } }), createRadialGradient: () => ({ addColorStop() { } }), getImageData: () => ({ data: new Uint8Array(4) }), drawImage() { }, rect() { }, clip() { }, arc() { }, ellipse() { } }) }) },
    Float32Array,
    Uint32Array,
    Int32Array,
    Float64Array,
    Uint8Array,
    Math,
    WGSL: {},
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary')
  };
  vm.createContext(ctx);
  vm.runInContext(mathCode, ctx);
  vm.runInContext(regCode, ctx);
  vm.runInContext(trackFactoryCode, ctx);
  vm.runInContext(propUtilsCode, ctx);
  vm.runInContext(trackSafetyCode, ctx);
  vm.runInContext(grandstandCode, ctx);
  vm.runInContext(paddockCode, ctx);
  vm.runInContext(sceneryCode, ctx);
  vm.runInContext(urbanContainmentCode, ctx);
  vm.runInContext(propFactoryCode, ctx);
  vm.runInContext(atlasFactoryCode, ctx);
  vm.runInContext(landmarkFactoryCode, ctx);
  vm.runInContext(vegetationFactoryCode, ctx);
  for (const item of trackManifestData) {
    if (ctx.window.TrackFactory) ctx.window.TrackFactory.register(item);
    else if (ctx.window.TRACKS) ctx.window.TRACKS.register(item);
  }

  const trackManifest = ctx.window.TRACK_MANIFEST || [];
  assert(trackManifest.length >= 1, `Se espera al menos 1 circuito en TRACK_MANIFEST, se encontraron ${trackManifest.length}`);

  for (const m of trackManifest) {
    const legacyJsPath = path.join(root, 'tracks', `${m.id}.js`);
    assert(!fs.existsSync(legacyJsPath), `[limpieza] Archivo JS legacy eliminado con éxito: ${m.id}.js`);

    const jsonPath = path.join(root, m.json);
    assert(fs.existsSync(jsonPath), `El archivo JSON ${m.json} existe en disco`);

    const spec = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const track = ctx.TrackFactory.createFromSpec(spec);

    assert(!!track, `El circuito ${m.id} se registró correctamente en TRACKS`);
    if (!track) continue;

    // 1. Metadatos
    assert(typeof track.id === 'string' && track.id.length > 0, `[${track.id}] ID de circuito válido`);
    assert(typeof track.name === 'string' && track.name.length > 0, `[${track.id}] Nombre visible presente: "${track.name}"`);
    assert(typeof track.subtitle === 'string', `[${track.id}] Subtítulo presente`);
    assert(typeof track.specs === 'string', `[${track.id}] Ficha técnica presente`);

    // 2. Geometría y ancho
    assert(track.hw >= 4.0 && track.hw <= 8.0, `[${track.id}] Semiancho de asfalto hw en rango [4.0, 8.0]m: ${track.hw}`);
    assert(typeof track.startS === 'number', `[${track.id}] Posición de salida startS definida: ${track.startS}`);
    assert(typeof track.startD === 'number', `[${track.id}] Desviación de salida startD definida: ${track.startD}`);
    assert(typeof track.startD === 'number', `[${track.id}] Desviación de salida startD definida: ${track.startD}`);

    // 3. Elevación natural
    assert(typeof track.naturalH === 'function', `[${track.id}] Función de relieve naturalH definida`);
    if (typeof track.naturalH === 'function') {
      const h0 = track.naturalH(0, 0, 0, 0);
      const h1 = track.naturalH(100, -200, 0, 0);
      assert(Number.isFinite(h0) && Number.isFinite(h1), `[${track.id}] naturalH devuelve cotas numéricas finitas (0,0,0,0)->${h0.toFixed(2)}m`);
    }

    // 4. Poses de cámara
    assert(Array.isArray(track.poses) && track.poses.length >= 3, `[${track.id}] Tiene al menos 3 poses de cámara`);
    if (Array.isArray(track.poses)) {
      for (const pose of track.poses) {
        assert(typeof pose.nome === 'string' && pose.nome.length > 0, `[${track.id}] Pose con identificador válido: "${pose.nome}"`);
        assert(pose.tipo === 'coche' || pose.tipo === 'carro', `[${track.id}] Tipo de pose 'coche'`);
        const ojo = pose.ojo || pose.olho;
        const blanco = pose.blanco || pose.alvo;
        assert(Array.isArray(ojo) && ojo.length === 3, `[${track.id}] Posición de cámara ojo [x,y,z] válida`);
        assert(Array.isArray(blanco) && blanco.length === 3, `[${track.id}] Objetivo blanco [x,y,z] válido`);
        assert(pose.fov >= 0.2 && pose.fov <= 1.2, `[${track.id}] FOV en rango [0.2, 1.2]: ${pose.fov}`);
      }
    }

    // 5. Verificación de atmósfera y modo nocturno / urbano
    if (track.night) {
      assert(track.sun && typeof track.sun === 'object', `[${track.id}] Configuración sun presente en carrera nocturna`);
      assert(track.sun.night === true, `[${track.id}] sun.night activado para carrera nocturna`);
      assert(track.sun.elDeg > 0, `[${track.id}] Iluminación deportiva F1 overhead elDeg > 0 para iluminar pista y bólidos (${track.sun.elDeg}°)`);
      assert(track.urban === true, `[${track.id}] Modo urbano activado`);
      assert(track.noVegetation === true, `[${track.id}] Supresión de vegetación rural activada`);
    }

    console.log(`  ✓ ${track.name.padEnd(28)} [${track.id}]`);
  }

  // 6. Validación de patrocinio y escenografía de boxes (engine/atlas-factory.js + engine/landmark-factory.js + engine/prop-factory.js + world/props.js)
  const atlasFactoryPath = path.join(root, 'engine/atlas-factory.js');
  assert(fs.existsSync(atlasFactoryPath), 'Módulo separado de AtlasFactory (engine/atlas-factory.js) presente');
  const atlasCode = fs.existsSync(atlasFactoryPath) ? fs.readFileSync(atlasFactoryPath, 'utf8') : '';
  const landmarkPath = path.join(root, 'engine/landmark-factory.js');
  assert(fs.existsSync(landmarkPath), 'Módulo separado de LandmarkFactory (engine/landmark-factory.js) presente');
  const landmarkCode = fs.existsSync(landmarkPath) ? fs.readFileSync(landmarkPath, 'utf8') : '';
  const propFactoryPath = path.join(root, 'engine/prop-factory.js');
  assert(fs.existsSync(propFactoryPath), 'Módulo separado de PropFactory (engine/prop-factory.js) presente');
  assert(fs.existsSync(path.join(root, 'engine/props/track-safety.js')), 'Submódulo TrackSafetyProps presente');
  assert(fs.existsSync(path.join(root, 'engine/props/grandstands.js')), 'Submódulo GrandstandProps presente');
  assert(fs.existsSync(path.join(root, 'engine/props/paddock.js')), 'Submódulo PaddockProps presente');
  assert(fs.existsSync(path.join(root, 'engine/props/scenery.js')), 'Submódulo SceneryProps presente');
  assert(fs.existsSync(path.join(root, 'engine/props/urban-containment.js')), 'Submódulo UrbanContainmentProps presente');
  const propsBaseCode = fs.readFileSync(path.join(root, 'world/props.js'), 'utf8');
  const vegasJsonSpec = JSON.parse(fs.readFileSync(path.join(root, 'tracks/las-vegas-strip.json'), 'utf8'));
  assert(vegasJsonSpec.props && vegasJsonSpec.props.perimeterJerseyWall, 'Especificación declarativa JSON de props de Las Vegas presente');
  const propsCode = atlasCode + '\n' + landmarkCode + '\n' + propFactoryCode + '\n' + urbanContainmentCode + '\n' + trackSafetyCode + '\n' + paddockCode + '\n' + grandstandCode + '\n' + sceneryCode + '\n' + propsBaseCode;

  assert(!propsCode.includes('ARARA PNEUS') && !propsCode.includes('CIRCUITO SERRA DA MATA') && !propsCode.includes('OFICINA DO TONHO'), 'Erradicación total de textos residuales no oficiales');
  assert(propsCode.includes('HEINEKEN 0.0') && propsCode.includes('TAG HEUER') && propsCode.includes('ARAMCO') && propsCode.includes('PIRELLI'), 'Patrocinadores oficiales F1 y Las Vegas presentes en el atlas');
  assert(propsCode.includes('PADDOCK BUILDING OFICIAL F1 LAS VEGAS'), 'Modelo arquitectónico oficial de boxes / Paddock Building de Las Vegas presente');
  assert(propsBaseCode.includes('buildVegasUrbanProps'), 'props.js delega props urbanas a buildVegasUrbanProps bajo demanda');
  assert(propsCode.includes('MSG Sphere') && propsCode.includes('Planet Earth') && propsCode.includes('earthColor'), 'Modelo monumental y textura Planet Earth del MSG Sphere presente');
  assert(propsCode.includes('S2.add(md, sphI0, 7, 5000)'), 'MSG Sphere registrado en S2 sin face culling con 5000m de distancia de renderizado');
  assert(propsCode.includes('distToSph < 185.0') && propsCode.includes('s >= 2500 && s <= 3750 && side < 0'), 'Corredor de visión y exclusión de rascacielos en la plaza del MSG Sphere verificados');
  assert(propsCode.includes('High Roller') && propsCode.includes('28 Cabinas') && propsCode.includes('nRim = 56'), 'Modelo estructural completo de la noria gigante High Roller (The LINQ) presente');
  assert(propsCode.includes('S2.add(md, hrI0, 7, 5000)'), 'High Roller registrado en S2 con rango de 5000 m');
  assert(propsCode.includes('distToHR < 125.0') && propsCode.includes('s >= 820 && s <= 1140 && side < 0'), 'Corredor de visión en Koval Lane hacia High Roller verificado');

  // 7. Nuevos monumentos, contención y ambientación estricta de Las Vegas F1
  assert(propsCode.includes('Muro Jersey') && propsCode.includes('Catch Fencing'), 'Túnel de contención continuo de muro Jersey y valla metálica FIA presente');
  assert(propsCode.includes('tecproWall') && propsCode.includes('Tecpro'), 'Escapatorias urbanas de asfalto pintado y barreras Tecpro (rojo/blanco) presentes');
  assert(propsCode.includes('LAS VEGAS') && propsCode.includes('Flechas de neón rosa y azul cian'), 'Rótulo monumental LAS VEGAS y flechas neón antes de Curva 14 presentes');
  assert(propsCode.includes('MONUMENTAL LOGO F1 EN LA AZOTEA') && propsCode.includes('f1Red'), 'Logo de la F1 en LED rojo en la azotea del Paddock presente');
  assert(propsCode.includes('buildTriWingTower') && propsCode.includes('Torre Y 1') && propsCode.includes('Torre Y 2') && propsCode.includes('Torre Y 3'), 'Los tres emblemáticos edificios con forma de Y (tri-wing towers) de Las Vegas presentes');
  assert(propsCode.includes('Wynn') && propsCode.includes('Caesars Palace') && propsCode.includes('TORRE EIFFEL') && propsCode.includes('GLOBO AEROSTÁTICO') && propsCode.includes('FUENTES DEL BELLAGIO') && propsCode.includes('The Cosmopolitan'), 'Monumentos del Strip (Wynn, Caesars, Paris Torre Eiffel, Globo, Bellagio Fountains, Cosmopolitan) presentes');

  const worldShader = fs.readFileSync(path.join(root, 'shaders/world.js'), 'utf8');
  assert(worldShader.includes('Pianos técnicos oficiales Las Vegas GP') && worldShader.includes('Rosa neón') && worldShader.includes('Azul cian'), 'Pianos tricolor de Las Vegas (rosa neón, blanco puro, azul cian) presentes en el shader');

  // 8. Validación de selección y carga modular en index.html
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert(indexHtml.includes('TRACK_MANIFEST') && indexHtml.includes('tracks/manifest.json'), 'index.html carga el catálogo de circuitos desde tracks/manifest.json');
  assert(indexHtml.includes('CAR_MANIFEST') && indexHtml.includes('cars/manifest.json'), 'index.html carga el catálogo de vehículos desde cars/manifest.json');
  assert(indexHtml.includes('engine/track-factory.js'), 'index.html incluye el módulo unificado TrackFactory');

  // 9. Validación de TrackFactory (engine/track-factory.js)
  const TF = ctx.window.TrackFactory || ctx.TrackFactory;
  assert(TF && typeof TF === 'object', 'TrackFactory exportado y accesible');
  assert(typeof TF.sI === 'function', 'TrackFactory.sI definido');
  assert(TF.sI(300, 3, 100) === 0, 'TrackFactory.sI vuelta completa cíclica');
  assert(TF.sI(-3, 3, 100) === 99, 'TrackFactory.sI índice negativo cíclico correcto');
  assert(typeof TF.gs === 'function', 'TrackFactory.gs definido');
  const testArr = new Float32Array([10, 0, 0, 0, 0]);
  const smoothDst = new Float32Array(5);
  TF.gs(testArr, smoothDst, 1.0, 5);
  assert(Number.isFinite(smoothDst[0]) && smoothDst[0] > 0 && !isNaN(smoothDst[1]), 'TrackFactory.gs suavizado gaussiano válido y sin NaNs');

  assert(typeof TF.kerbProfile === 'function', 'TrackFactory.kerbProfile definido');
  assert(TF.kerbProfile(-0.5) === 0 && TF.kerbProfile(5.0) === 0, 'TrackFactory.kerbProfile fuera de rango es 0');
  assert(TF.kerbProfile(0.5) > 0, 'TrackFactory.kerbProfile en rampa devuelve elevación positiva');

  assert(typeof TF.validateTrack === 'function', 'TrackFactory.validateTrack definido');
  const validCheck = TF.validateTrack({
    id: 'test-track',
    name: 'Circuito Test',
    hw: 7.0,
    points: [[0, 0], [10, 0], [10, 10], [0, 10]],
    corners: [],
    pit: { s0: 0, s1: 100 },
    stand: { s0: 0, s1: 100, d0: 15 },
    naturalH: () => 0
  });
  assert(validCheck.valid === true, 'TrackFactory.validateTrack valida positivamente un circuito correcto');

  const invalidCheck = TF.validateTrack({ id: 'bad-track' });
  assert(invalidCheck.valid === false && invalidCheck.errors.length > 0, 'TrackFactory.validateTrack detecta errores en spec incompleto');

  assert(typeof TF.findNextCorner === 'function', 'TrackFactory.findNextCorner definido');
  const testCorners = [{ s: 200, name: 'Curva 1', ang: 45, R: 60 }, { s: 500, name: 'Curva 2', ang: -30, R: 80 }];
  const nextC = TF.findNextCorner(150, testCorners, 200);
  assert(nextC && nextC.name === 'Curva 1' && nextC.distance === 50, 'TrackFactory.findNextCorner detecta curva entrante en lookahead');

  // 10. Validación de PropFactory (engine/prop-factory.js)
  assert(indexHtml.includes('engine/prop-factory.js'), 'index.html incluye el módulo unificado PropFactory');
  const PF = ctx.window.PropFactory || ctx.PropFactory;
  assert(PF && typeof PF === 'object', 'PropFactory exportado y accesible');
  assert(typeof PF.createStartGantry === 'function', 'PropFactory.createStartGantry definido');
  assert(typeof PF.createTecproBarrier === 'function', 'PropFactory.createTecproBarrier definido');
  assert(typeof PF.createPaddockTruck === 'function', 'PropFactory.createPaddockTruck definido');
  assert(typeof PF.createPaddockTent === 'function', 'PropFactory.createPaddockTent definido');
  assert(typeof PF.createWallFence === 'function', 'PropFactory.createWallFence definido');
  assert(typeof PF.boxMinMax === 'function', 'PropFactory.boxMinMax definido');

  // Simulación mock de MeshBuilder para verificar constructores de PropFactory
  const mockMB = {
    nv: 0, ni: 0,
    mat() { }, color() { },
    box() { this.ni += 36; },
    cyl() { this.ni += 60; },
    tube() { this.ni += 48; },
    quad() { this.ni += 6; },
    push() { }, pop() { }
  };
  PF.createPaddockTruck({ mb: mockMB }, { color: [0.1, 0.2, 0.3] });
  assert(mockMB.ni > 0, 'PropFactory.createPaddockTruck genera geometría 3D');

  const prevNi = mockMB.ni;
  PF.createPaddockTent({ mb: mockMB }, { color: [1, 1, 1] });
  assert(mockMB.ni > prevNi, 'PropFactory.createPaddockTent genera geometría 3D');

  const gantryMats = [];
  const mockGantryMB = {
    nv: 0, ni: 0,
    mat(id, a, b, c) { gantryMats.push({ id, a, b, c }); },
    color() { },
    box() { this.ni += 36; },
    cyl() { this.ni += 60; },
    tube() { this.ni += 48; },
    quad() { this.ni += 6; },
    push() { }, pop() { }
  };
  PF.createStartGantry({ mb: mockGantryMB, md: mockGantryMB }, { s: 0, dL: -7.7, dR: 7.05, lights: true, local: true });
  const fiaLights = gantryMats.filter(m => m.id === 18);
  assert(fiaLights.length === 10, 'PropFactory.createStartGantry genera 10 ópticas de semáforo FIA (5 columnas x 2 lámparas)');
  assert(fiaLights.some(m => m.b === 1) && fiaLights.some(m => m.b === 5), 'Las ópticas FIA tienen indexadas sus columnas 1 a 5 para activación secuencial');

  // 11. Validación de AtlasFactory (engine/atlas-factory.js)
  assert(indexHtml.includes('engine/atlas-factory.js'), 'index.html incluye el módulo unificado AtlasFactory');
  const AF = ctx.window.AtlasFactory || ctx.AtlasFactory;
  assert(AF && typeof AF === 'object', 'AtlasFactory exportado y accesible');
  assert(typeof AF.buildPropsAtlas === 'function', 'AtlasFactory.buildPropsAtlas definido');
  assert(typeof AF.textW === 'function' && typeof AF.strokeText === 'function', 'Tipografía procedural Bézier definida en AtlasFactory');
  assert(typeof AF.personSprite === 'function' && typeof AF.personStrip === 'function', 'Generadores de multitud y comisarios definidos en AtlasFactory');

  const mockRegions = {};
  AF.buildPropsAtlas({ regions: mockRegions });
  assert(mockRegions.name && mockRegions.chev && mockRegions.boxes, 'AtlasFactory genera regiones UV de pista');
  assert(mockRegions.b0 && mockRegions.d150 && mockRegions.p0 && mockRegions.s0, 'AtlasFactory genera regiones de patrocinadores, carteles y multitud');

  // 12. Validación de LandmarkFactory (engine/landmark-factory.js)
  assert(indexHtml.includes('engine/landmark-factory.js'), 'index.html incluye el módulo unificado LandmarkFactory');
  const LF = ctx.window.LandmarkFactory || ctx.LandmarkFactory;
  assert(LF && typeof LF === 'object', 'LandmarkFactory exportado y accesible');
  assert(typeof LF.createMsgSphere === 'function', 'LandmarkFactory.createMsgSphere definido');
  assert(typeof LF.createHighRoller === 'function', 'LandmarkFactory.createHighRoller definido');
  assert(typeof LF.createTriWingTower === 'function', 'LandmarkFactory.createTriWingTower definido');
  assert(typeof LF.createEiffelTowerAndBalloon === 'function', 'LandmarkFactory.createEiffelTowerAndBalloon definido');
  assert(typeof LF.createBellagioFountains === 'function', 'LandmarkFactory.createBellagioFountains definido');
  assert(typeof LF.createVenetianResort === 'function', 'LandmarkFactory.createVenetianResort definido');
  assert(typeof LF.createStripHotels === 'function', 'LandmarkFactory.createStripHotels definido');
  assert(typeof LF.createPaddockBuildingF1 === 'function', 'LandmarkFactory.createPaddockBuildingF1 definido');

  // 13. Validación de VegetationFactory (engine/vegetation-factory.js)
  assert(indexHtml.includes('engine/vegetation-factory.js'), 'index.html incluye el módulo unificado VegetationFactory');
  const VF = ctx.window.VegetationFactory || ctx.VegetationFactory;
  assert(VF && typeof VF === 'object', 'VegetationFactory exportado y accesible');
  assert(typeof VF.buildAtlas === 'function', 'VegetationFactory.buildAtlas definido');
  assert(typeof VF.buildArchetypes === 'function', 'VegetationFactory.buildArchetypes definido');
  assert(VF.VEG_TS === 1024 && VF.VEG_TW === 4 && VF.VEG_TH === 2, 'VegetationFactory dimensiones de atlas correctas');
  assert(VF.VEG_NT === 6 && VF.VEG_NA === 9, 'VegetationFactory número de arquetipos correcto');
  assert(typeof VF.VegLeafBuf === 'function', 'VegetationFactory.VegLeafBuf definido');

  console.log(`Resultado Circuitos: ${passed} aserciones correctas, ${failed} fallos.`);
  return { passed, failed };
}

if (require.main === module) {
  const res = runTracksTestSuite();
  process.exit(res.failed > 0 ? 1 : 0);
}

module.exports = { runTracksTestSuite };
