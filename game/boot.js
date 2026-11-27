'use strict';
// Carga paralela de manifiestos, modelos, circuito e inicialización WebGPU
async function loadManifests() {
  if (typeof window !== 'undefined' && window.__manifestPromise) {
    await window.__manifestPromise;
  }
  if (typeof window !== 'undefined' && (!window.CAR_MANIFEST || window.CAR_MANIFEST.length === 0)) {
    try {
      const resC = await fetch('cars/manifest.json');
      const rawManifest = await resC.json();
      window.CAR_MANIFEST = (rawManifest || []).filter(c => c.active !== 'no' && c.active !== false);
    } catch (e) {
      console.warn('[main] Fallo al cargar cars/manifest.json:', e);
    }
    window.CAR_LIST = (window.CAR_MANIFEST || []).map(c => c.json);
    if (typeof CARS !== 'undefined') {
      for (const item of (window.CAR_MANIFEST || [])) CARS.register(item);
    }
  }
  if (typeof window !== 'undefined' && (!window.TRACK_MANIFEST || window.TRACK_MANIFEST.length === 0)) {
    try {
      const resT = await fetch('tracks/manifest.json');
      const rawT = await resT.json();
      window.TRACK_MANIFEST = (rawT || []).filter(t => t.active !== 'no' && t.active !== false);
    } catch (e) {
      console.warn('[main] Fallo al cargar tracks/manifest.json:', e);
    }
    window.TRACK_LIST = (window.TRACK_MANIFEST || []).map(t => t.json);
    for (const item of (window.TRACK_MANIFEST || [])) {
      if (typeof TrackFactory !== 'undefined' && typeof TrackFactory.register === 'function') {
        TrackFactory.register(item);
      } else if (typeof TRACKS !== 'undefined') {
        TRACKS.register(item);
      }
    }
  }
}

async function bootSimulation(autoDrive) {
  try {
    setMsg('Cargando simulación…');
    setLoadingProgress(2, 'loading_init_gpu', 'Preparando recursos…');

    const carManifest = (typeof window !== 'undefined' && window.CAR_MANIFEST) || [];
    const saved = GAME.ui ? loadSelection() : {};
    const reqCarId = (typeof Q !== 'undefined' ? Q.get('car') : null) || saved.car;
    const activeCarEntry = (typeof window !== 'undefined' && window.__activeCarEntry)
      || (reqCarId && carManifest.find(c => c.id === reqCarId))
      || carManifest[0];

    // Configuración del rival IA: habilitado por defecto salvo indicación expresa
    const rivalParam = (typeof Q !== 'undefined') ? Q.get('rival') : null;
    const rivalEnabled = rivalParam !== null
      ? (rivalParam === '1' || rivalParam === 'true')
      : (typeof window !== 'undefined' && typeof window.__rivalEnabled !== 'undefined'
        ? window.__rivalEnabled
        : (saved.rival !== false));
    GAME.rivalEnabled = rivalEnabled;

    const rivalCountParam = (typeof Q !== 'undefined') ? (parseInt(Q.get('rivals') || Q.get('rivalCount'), 10)) : null;
    const rivalCount = rivalEnabled
      ? Math.max(1, Math.min(15, rivalCountParam || (typeof window !== 'undefined' && window.__rivalCount) || saved.rivalCount || 1))
      : 0;
    GAME.rivalCount = rivalCount;

    // Selección de rivales de la parrilla
    let rivalEntries = [];
    if (rivalEnabled) {
      rivalEntries = (typeof window !== 'undefined' && window.__rivalCarEntries) || [];
      if (rivalEntries.length === 0 && carManifest.length > 0) {
        const availableRivals = carManifest.filter(c => !activeCarEntry || c.id !== activeCarEntry.id);
        const pool = availableRivals.length > 0 ? availableRivals : carManifest;
        const reqRivalCarId = (typeof Q !== 'undefined' ? Q.get('rivalCar') : null) || saved.rivalCar;
        let chosenRival = reqRivalCarId && carManifest.find(c => c.id === reqRivalCarId);
        if (!chosenRival || (activeCarEntry && chosenRival.id === activeCarEntry.id)) {
          chosenRival = pool[Math.floor(Math.random() * pool.length)];
        }
        rivalEntries = [];
        if (chosenRival) rivalEntries.push(chosenRival);
        for (let i = 0; i < pool.length && rivalEntries.length < rivalCount; i++) {
          if (pool[i].id !== chosenRival.id) rivalEntries.push(pool[i]);
        }
        for (let i = 0; i < carManifest.length && rivalEntries.length < rivalCount; i++) {
          if (!rivalEntries.some(r => r.id === carManifest[i].id)) rivalEntries.push(carManifest[i]);
        }
        if (typeof window !== 'undefined') {
          window.__rivalCarEntries = rivalEntries;
          window.__rivalCarId = chosenRival ? chosenRival.id : null;
        }
      } else if (rivalEntries.length === 0) {
        const fallbackRival = carManifest.find(c => !activeCarEntry || c.id !== activeCarEntry.id) || carManifest[0];
        if (fallbackRival) rivalEntries = [fallbackRival];
      }
    }

    const trackManifest = (typeof window !== 'undefined' && window.TRACK_MANIFEST) || [];
    const reqTrackId = (typeof Q !== 'undefined' ? Q.get('track') : null) || saved.track;
    const activeTrackEntry = (typeof window !== 'undefined' && window.__activeTrackEntry)
      || (reqTrackId && trackManifest.find(t => t.id === reqTrackId))
      || trackManifest[0];

    // Carga en PARALELO de coche activo, rivales y circuito
    const loadCarSpec = async (entry) => {
      if (!entry || (CARS.byId[entry.id] && CARS.byId[entry.id].build)) return;
      if (typeof CarFactory !== 'undefined' && typeof CarFactory.loadFromJSON === 'function') {
        await CarFactory.loadFromJSON(entry.json);
      } else {
        const res = await fetch(encodeURI(entry.json));
        const spec = await res.json();
        if (typeof CarFactory !== 'undefined' && typeof CarFactory.createFromSpec === 'function') {
          CarFactory.createFromSpec(spec);
        } else {
          CARS.register(spec);
        }
      }
    };

    const loadTrackSpec = async (entry) => {
      if (!entry || (TRACKS.byId[entry.id] && TRACKS.byId[entry.id].points)) return;
      if (typeof TrackFactory !== 'undefined' && typeof TrackFactory.loadFromJSON === 'function') {
        await TrackFactory.loadFromJSON(entry.json);
      } else {
        const res = await fetch(encodeURI(entry.json));
        const spec = await res.json();
        if (typeof TrackFactory !== 'undefined' && typeof TrackFactory.createFromSpec === 'function') {
          TrackFactory.createFromSpec(spec);
        } else {
          TRACKS.register(spec);
        }
      }
    };

    const tasks = [];
    if (activeCarEntry) tasks.push(loadCarSpec(activeCarEntry));
    for (const rEntry of rivalEntries) tasks.push(loadCarSpec(rEntry));
    if (activeTrackEntry) tasks.push(loadTrackSpec(activeTrackEntry));

    if (tasks.length > 0) {
      let done = 0;
      const total = tasks.length;
      await setLoadingProgressAsync(5, 'loading_init_gpu', `Descargando modelos y circuito (0/${total})…`);
      await Promise.all(tasks.map(p => p.then(() => {
        done++;
        const pct = 5 + Math.round((done / total) * 15);
        setLoadingProgress(pct, 'loading_init_gpu', `Descargando modelos y circuito (${done}/${total})…`);
      })));
    }

    // Selecciona el coche y circuito activos (?car=<id>&track=<id>, última selección o predeterminados)
    const activeCar = CARS.select(activeCarEntry ? activeCarEntry.id : reqCarId);
    const activeTrack = TRACKS.select(activeTrackEntry ? activeTrackEntry.id : reqTrackId);

    if (activeCar && activeTrack) {
      updateLoadingHeader(activeCar.name, activeTrack.name);
    }
    setLoadingProgress(10, 'loading_init_gpu', 'Inicializando WebGPU…');
    await new Promise(r => setTimeout(r, 16));
    GAME.rivalCount = rivalCount;

    const lapsParam = (typeof Q !== 'undefined') ? (parseInt(Q.get('laps') || Q.get('totalLaps'), 10)) : null;
    const totalLaps = Math.max(1, Math.min(50, lapsParam || (typeof window !== 'undefined' && window.__totalLaps) || saved.totalLaps || 3));
    GAME.totalLaps = totalLaps;

    if (rivalEnabled) {
      const rivalId = (typeof window !== 'undefined' && window.__rivalCarId) || (typeof Q !== 'undefined' && Q.get('rivalCar')) || saved.rivalCar;
      const rivalCar = CARS.get(rivalId);
      if (rivalCar && rivalCar !== activeCar) {
        CARS.selectRival(rivalCar.id);
      } else {
        const other = CARS.list.find(c => c.id !== activeCar.id && typeof c.build === 'function');
        if (other) CARS.selectRival(other.id);
      }
    } else {
      CARS.rival = null;
    }

    applyCarPhysics(activeCar);

    setLoadingProgress(15, 'loading_init_gpu', 'Inicializando WebGPU…');
    await gpuInit();
    await new Promise(r => setTimeout(r, 16));

    setLoadingProgress(30, 'loading_build_track', 'Generando trazado y relieve…');
    trackBuild(activeTrack); heightFieldBuild(); worldMapBuild(); aiBuild();   // aiBuild define TRK.line (trazada ideal) antes de los constructores de escena
    if (typeof hudLayout === 'function' && typeof HUD !== 'undefined' && HUD.cm) hudLayout();
    rendererInit();
    await skyInit();
    await new Promise(r => setTimeout(r, 16));

    if (GAME.mode === 'test') buildTestScene();
    if (GAME.mode === 'placeholder') { buildPlaceholderWorld(); GAME.init = () => { const p = trackPos(40, 0, new Float64Array(5)); setCamera(p[0] - 12, p[1] + 3, p[2] + 4, p[0] + 30, p[1] + 1, p[2], 0.9); R.cube.pos.set([p[0], p[1] + 1.2, p[2]]); }; }

    setLoadingProgress(45, 'loading_build_car', 'Construyendo bólido y rivales…');
    // Construye el coche activo antes del resto de la escena
    if (activeCar && typeof activeCar.build === 'function') {
      await activeCar.build();
      activeCar.built = true;
      if (GAME.mode === 'car') {
        buildTestGround();
        GAME.init = () => { setCamera(3.3, 1.25, -3.6, 0.1, 0.62, 0, 0.5); R.cube.pos.set([0, 0.9, 0]); };
        window.__car = activeCar;
      }
    }
    // Construye todos los coches rivales registrados en CARS.list
    if (rivalEnabled && CARS.list && CARS.list.length > 0) {
      const pendingRivals = CARS.list.filter(c => c && typeof c.build === 'function' && !c.built);
      for (let ri = 0; ri < pendingRivals.length; ri++) {
        const c = pendingRivals[ri];
        const pct = 45 + Math.round(((ri + 1) / Math.max(1, pendingRivals.length)) * 10);
        await setLoadingProgressAsync(pct, 'loading_build_car', `Construyendo rival ${ri + 1}/${pendingRivals.length} (${c.name || c.id})…`);
        await c.build();
        c.built = true;
      }
    }
    await new Promise(r => setTimeout(r, 16));

    setLoadingProgress(55, 'loading_build_world', 'Construyendo pista, vegetación y entorno…');
    const nBuild = BUILD.length;
    for (let i = 0; i < nBuild; i++) {
      await BUILD[i]();
      const p = 55 + Math.round(((i + 1) / Math.max(1, nBuild)) * 22);
      setLoadingProgress(p, 'loading_build_world', 'Construyendo pista, vegetación y entorno…');
      await new Promise(r => setTimeout(r, 16));
    }
    await Promise.all(R.pending);
    if (G.lastErr) throw new Error(G.lastErr);

    setLoadingProgress(80, 'loading_shadows', 'Generando mapas de sombras estáticas…');
    perfInit();
    renderStaticShadow();
    if (GAME.init) GAME.init();
    else { setCamera(6, 2.2, 7, 0, 0.6, 0, 0.9); R.cube.pos.set([0, 1.2, 0]); }

    setLoadingProgress(88, 'loading_cubemap', 'Calculando armónicos esféricos y reflejos…');
    // Inicializa el cubemap ambiental y calcula armónicos esféricos solares y de entorno
    for (let k = 0; k < 2; k++) { for (let i = 0; i < 6; i++) renderFrame(); await computeSH(); }

    if (GAME.prewarm) {
      setLoadingProgress(94, 'loading_prewarm', 'Precalentando shaders y calibrando…');
      const worst = await GAME.prewarm(); await computeSH();
      // Cadencia: a 120 Hz solo quedan 8,3 ms por frame. Si la vista más pesada no cabe con holgura, los frames se encolan
      // en la GPU y el tiempo de frame oscila; en ese caso el juego corre estable a 60 fps (un frame cada dos
      // del monitor de 120 Hz). ?hz=120 o ?hz=60 fuerza la elección.
      GAME.gpuWorstMs = worst; GAME.minFrameMs = Q.get('hz') === '120' ? 0 : (Q.get('hz') === '60' || worst > 6.2) ? 14.6 : 0;
    }
    for (let i = 0; i < 8; i++) renderFrame();
    R.cam.first = true;

    setLoadingProgress(100, 'loading_ready', '¡Listo para competir!');
    await new Promise(r => setTimeout(r, 180));

    setMsg(''); const hint = document.getElementById('hint'); if (hint) setTimeout(() => { hint.style.opacity = 0; }, 9000);
    if (GAME.ui && !UI.el) uiInit();
    GAME.ready = true;
    if (autoDrive && GAME.ui) {
      sndStart();
      uiDrive();
    }
    if (!GAME.capture) requestAnimationFrame(rafLoop);
  } catch (e) { setMsg('Error: ' + e.message); console.error(e); GAME.error = e.message; }
}

