'use strict';
// ---- 90_main.js
// Inicialización, bucle principal y API de captura.
const msgEl = document.getElementById('msg');
const loadingBarEl = document.getElementById('loading-bar');
const loadingProgressBarEl = document.getElementById('loading-progressbar');
const loadingStatusEl = document.getElementById('loading-status');
const loadingPercentEl = document.getElementById('loading-percent');
const loadingCarTrackEl = document.getElementById('loading-car-track');

let _currentLoadingPercent = 0;

function setLoadingProgress(percent, statusKey, fallbackText) {
  if (percent !== undefined && percent !== null) {
    _currentLoadingPercent = Math.min(100, Math.max(0, percent));
    if (loadingBarEl) loadingBarEl.style.width = _currentLoadingPercent + '%';
    if (loadingProgressBarEl) loadingProgressBarEl.setAttribute('aria-valuenow', String(Math.round(_currentLoadingPercent)));
    if (loadingPercentEl) loadingPercentEl.textContent = Math.round(_currentLoadingPercent) + '%';
  }
  let txt = fallbackText || statusKey || '';
  if (statusKey && typeof I18N !== 'undefined') {
    txt = I18N.t(statusKey, null) || fallbackText || statusKey;
  }
  if (loadingStatusEl && txt) {
    loadingStatusEl.textContent = txt;
  }
}

function updateLoadingHeader(carName, trackName) {
  if (!loadingCarTrackEl) return;
  if (carName && trackName) {
    loadingCarTrackEl.textContent = `${carName} · ${trackName}`;
  } else if (carName) {
    loadingCarTrackEl.textContent = carName;
  }
}

const setMsg = t => {
  if (!msgEl) return;
  if (!t) {
    setLoadingProgress(100, 'loading_ready', '¡Listo!');
    msgEl.classList.add('hidden');
    setTimeout(() => {
      if (msgEl.classList.contains('hidden')) {
        msgEl.style.display = 'none';
      }
    }, 350);
  } else {
    msgEl.style.display = 'flex';
    msgEl.classList.remove('hidden');
    if (typeof t === 'string' && t.startsWith('Error:')) {
      if (loadingStatusEl) loadingStatusEl.textContent = t;
      if (loadingBarEl) loadingBarEl.style.background = '#e62020';
      const box = msgEl.querySelector('.loading-box');
      if (box) {
        let errEl = box.querySelector('.loading-error');
        if (!errEl) {
          errEl = document.createElement('div');
          errEl.className = 'loading-error';
          box.appendChild(errEl);
        }
        errEl.textContent = t;
      }
    } else {
      setLoadingProgress(_currentLoadingPercent, null, t);
    }
  }
};
// Suelo de pruebas (asfalto) para modos de visualización aislada: ?scene=test, ?scene=car
function buildTestGround() {
  const fam = R.families.test || mkFamily('test', { src: 'mat_test' });
  const set = new MeshSet(fam); R.drawables.push(set);
  const mb = new MeshBuilder(); mb.mat(4).color(0.2, 0.2, 0.2); mb.quad(-300, 0, 300, 300, 0, 300, 300, 0, -300, -300, 0, -300);
  set.add(mb.upload(), 0, 7); return set;
}
// Mundo provisional para pruebas aisladas
function buildPlaceholderWorld() {
  const fam = R.families.test || mkFamily('test', { src: 'mat_test' });
  const set = new MeshSet(fam); R.drawables.push(set);
  const st = 2, w = Math.floor((HF.w - 1) / st), h = Math.floor((HF.h - 1) / st), loc = new Float64Array(4);
  const cols = [[0.05, 0.05, 0.055], [0.5, 0.1, 0.1], [0.105, 0.165, 0.042], [0.34, 0.3, 0.24], [0.08, 0.12, 0.035], [0.07, 0.07, 0.075], [0.3, 0.3, 0.3]];
  const mb = new MeshBuilder(1 << 18); mb.mat(5);
  for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) {
    const x = HF.x0 + i * st, z = HF.z0 + j * st, y = hfAt(x, z);
    const nx = hfAt(x - 1, z) - hfAt(x + 1, z), nz = hfAt(x, z - 1) - hfAt(x, z + 1);
    let c = cols[4]; if (trackFarDist(x, z) < 70) { trackLocate(x, z, -1, loc); c = cols[zoneAt(loc[2], loc[3], loc[1])]; }
    mb.color(c[0], c[1], c[2]); mb.v(x, y + (c === cols[0] ? 0.3 : 0), z, nx, 2, nz, x, z);
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const a = j * (w + 1) + i; mb.quadI(a, a + w + 1, a + w + 2, a + 1); }
  set.add(mb.upload(), 0, 7);
}
function buildTestScene() {
  const set = buildTestGround();
  const mb = new MeshBuilder();
  const gl = new GlassSet(); R.transparents.push(gl);
  const g = new MeshBuilder(); g.mat(0).color(0.75, 0.9, 0.85); g.quad(-1, 0, 4, 1, 0, 4, 1, 1.5, 4, -1, 1.5, 4); gl.add_(g.upload(), 0);
  mb.mat(0).color(0.7, 0.2, 0.15); mb.box(0, 0.5, 0, 1, 1, 1);
  mb.mat(2).color(0.35, 0.55, 0.75); mb.rbox(2.5, 0.6, 0, 1.6, 1.2, 1.2, 0.3, 6);
  mb.mat(1).color(0.9, 0.9, 0.92); mb.cyl(-2.5, 0, 0, 0.5, 1.6, 0.3, 32, true, true);
  mb.mat(0).color(0.8, 0.8, 0.8); mb.tube([[-4, 0.2, 2], [-2, 1.2, 2.5], [0, 0.4, 3], [2, 1.5, 2.5], [4, 0.3, 2]], 0.06, 12);
  mb.mat(0).color(0.3, 0.6, 0.2); for (let i = 0; i < 40; i++) { const a = i * 2.4, r = 8 + i * 1.5; mb.cyl(Math.cos(a) * r, 0, Math.sin(a) * r, 0.3, 6 + (i % 5), 0.2, 10, false, true); }
  mb.mat(3).color(1, 0.2, 0.1); mb.box(0, 1.2, 0, 0.3, 0.3, 0.3);
  set.add(mb.upload(), 0, 7);
}
async function main() {
  try {
    // 0. Espera o carga asíncrona de los manifiestos JSON
    if (typeof window !== 'undefined' && window.__manifestPromise) {
      await window.__manifestPromise;
    }
    if (typeof window !== 'undefined' && (!window.CAR_MANIFEST || window.CAR_MANIFEST.length === 0)) {
      try {
        const resC = await fetch('cars/manifest.json');
        window.CAR_MANIFEST = await resC.json();
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
        window.TRACK_MANIFEST = await resT.json();
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

    const carManifest = (typeof window !== 'undefined' && window.CAR_MANIFEST) || [];
    const saved = GAME.ui ? loadSelection() : {};
    const reqCarId = (typeof Q !== 'undefined' ? Q.get('car') : null) || saved.car;
    const activeCarEntry = (typeof window !== 'undefined' && window.__activeCarEntry)
      || (reqCarId && carManifest.find(c => c.id === reqCarId))
      || carManifest[0];

    // Carga asíncrona de la especificación JSON pura del vehículo activo si no está inicializado
    if (activeCarEntry && (!CARS.byId[activeCarEntry.id] || !CARS.byId[activeCarEntry.id].build)) {
      setLoadingProgress(3, 'loading_init_gpu', 'Cargando especificación del vehículo…');
      if (typeof CarFactory !== 'undefined' && typeof CarFactory.loadFromJSON === 'function') {
        await CarFactory.loadFromJSON(activeCarEntry.json);
      } else {
        const res = await fetch(encodeURI(activeCarEntry.json));
        const spec = await res.json();
        if (typeof CarFactory !== 'undefined' && typeof CarFactory.createFromSpec === 'function') {
          CarFactory.createFromSpec(spec);
        } else {
          CARS.register(spec);
        }
      }
    }

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

    // Carga asíncrona de especificaciones JSON puras para los rivales de la parrilla
    if (rivalEnabled) {
      let rivalEntries = (typeof window !== 'undefined' && window.__rivalCarEntries) || [];
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
      }

      const loadRivalJSON = async (jsonUrl) => {
        if (typeof CarFactory !== 'undefined' && typeof CarFactory.loadFromJSON === 'function') {
          return await CarFactory.loadFromJSON(jsonUrl);
        }
        const res = await fetch(encodeURI(jsonUrl));
        const spec = await res.json();
        if (typeof CarFactory !== 'undefined' && typeof CarFactory.createFromSpec === 'function') {
          return CarFactory.createFromSpec(spec);
        }
        return CARS.register(spec);
      };

      if (rivalEntries.length > 0) {
        for (const rEntry of rivalEntries) {
          if (rEntry && (!CARS.byId[rEntry.id] || !CARS.byId[rEntry.id].build)) {
            await loadRivalJSON(rEntry.json);
          }
        }
      } else {
        const fallbackRival = carManifest.find(c => !activeCarEntry || c.id !== activeCarEntry.id) || carManifest[0];
        if (fallbackRival && (!CARS.byId[fallbackRival.id] || !CARS.byId[fallbackRival.id].build)) {
          await loadRivalJSON(fallbackRival.json);
        }
      }
    }

    // Carga asíncrona de especificación JSON pura del circuito activo si no está inicializado
    const trackManifest = (typeof window !== 'undefined' && window.TRACK_MANIFEST) || [];
    const reqTrackId = (typeof Q !== 'undefined' ? Q.get('track') : null) || saved.track;
    const activeTrackEntry = (typeof window !== 'undefined' && window.__activeTrackEntry)
      || (reqTrackId && trackManifest.find(t => t.id === reqTrackId))
      || trackManifest[0];

    if (activeTrackEntry && (!TRACKS.byId[activeTrackEntry.id] || !TRACKS.byId[activeTrackEntry.id].points)) {
      setLoadingProgress(5, 'loading_build_track', 'Cargando trazado del circuito…');
      if (typeof TrackFactory !== 'undefined' && typeof TrackFactory.loadFromJSON === 'function') {
        await TrackFactory.loadFromJSON(activeTrackEntry.json);
      } else {
        const res = await fetch(encodeURI(activeTrackEntry.json));
        const spec = await res.json();
        if (typeof TrackFactory !== 'undefined' && typeof TrackFactory.createFromSpec === 'function') {
          TrackFactory.createFromSpec(spec);
        } else {
          TRACKS.register(spec);
        }
      }
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
      for (const c of CARS.list) {
        if (c && typeof c.build === 'function' && !c.built) {
          await c.build();
          c.built = true;
        }
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
    if (GAME.ui) uiInit();
    GAME.ready = true;
    if (!GAME.capture) requestAnimationFrame(rafLoop);
  } catch (e) { setMsg('Error: ' + e.message); console.error(e); GAME.error = e.message; }
}
let _lastT = 0;
function rafLoop(t) {
  if (GAME.minFrameMs > 0 && _lastT && t - _lastT < GAME.minFrameMs) { requestAnimationFrame(rafLoop); return; }   // Bloqueo a 60 Hz en monitores de alta frecuencia
  if (GAME.ui && uiFrame()) { _lastT = 0; requestAnimationFrame(rafLoop); return; }   // Menú abierto: la simulación y sonido pausan
  let dt = _lastT ? (t - _lastT) / 1000 : 1 / 60; RT[3] = dt * 1000; if (dt > 0.05) dt = 0.05; _lastT = t;
  if (PERF.rec) perfFrameTimes(t);
  RT[2] = dt;
  if (GAME.tick) GAME.tick(false); else { RT[1] = dt; RT[0] += dt; }
  renderFrame();
  if (GAME.ui) uiAfter();
  if (PERF.rec) perfJsTime();
  requestAnimationFrame(rafLoop);
}
// --- API de captura y verificación ---
let _cap2d = null;
window.__cap = {
  ready: () => GAME.ready, error: () => GAME.error || G.lastErr || null,
  cam(ex, ey, ez, tx, ty, tz, fov) { if (typeof GS !== 'undefined') { GS.freeCam = true; GS.cut = true; } setCamera(ex, ey, ez, tx, ty, tz, fov); },
  // Avanza n frames con dt fijo y renderiza cada uno
  frames(n, dt) {
    dt = dt || 1 / 60; RT[2] = dt;
    for (let i = 0; i < n; i++) {
      if (GAME.ui && uiFrame()) continue;   // Bucle de pruebas con paso fijo
      RT[3] = dt * 1000; if (GAME.tick) GAME.tick(true); else { RT[1] = dt; RT[0] += dt; } if (!this.noRender) renderFrame();
      if (GAME.ui) uiAfter();
    }
    if (this.noRender) return;
    // Copia el frame a canvas 2D para captura
    if (!_cap2d) { _cap2d = document.createElement('canvas'); _cap2d.width = G.W; _cap2d.height = G.H; }
    _cap2d.getContext('2d').drawImage(G.canvas, 0, 0);
  },
  shot(type, q) { return _cap2d.toDataURL(type || 'image/png', q); },
  // Aplica la pose i y prepara el frame
  pose(i) { poseApply(i); if (!_cap2d) { _cap2d = document.createElement('canvas'); _cap2d.width = G.W; _cap2d.height = G.H; } _cap2d.getContext('2d').drawImage(G.canvas, 0, 0); return POSES[i].nome; },
  poses() { return POSES.map(p => p.nome); },
  // Medición de intervalos entre frames
  rafLog(n) { const a = new Float32Array(n); let i = 0, last = 0; const f = t => { if (last) a[i++] = t - last; last = t; if (i < n) requestAnimationFrame(f); else window.__rafLog = Array.from(a); }; requestAnimationFrame(f); },
  perfStart() { perfStart(); }, perfReport() { return perfReport(); }, restart() { gameRestart(); },
  // Vista de cámaras de TV hacia la pista
  tvView(i) { const o = i * 4, p = trackPos(GS.tvData[o] - 30, 0, new Float64Array(5)); GS.freeCam = true; GS.frozen = true; GS.cut = true; setCamera(GS.tvData[o + 1], GS.tvData[o + 2], GS.tvData[o + 3], p[0], p[1] + 0.8, p[2], 0.5); return GS.tvN; },
  cadencia() { return { piorVistaMs: GAME.gpuWorstMs, minFrameMs: GAME.minFrameMs, hz: GAME.minFrameMs > 0 ? 60 : 'monitor' }; },
  // Estado del juego para pruebas
  // Audio: procesa controles de simulación a 60 Hz
  somGravar(n) { SND.rec = new Int32Array(n * 16); SND.recN = 0; },
  somVolta(n) { this.somGravar(n); GS.frozen = false; GS.freeCam = false; GS.replayOn = true; gameRestart(); RT[2] = 1 / 60; for (let i = 0; i < n; i++) GAME.tick(true); return SND.recN; },
  somRender(mix, mudoDe, pausaDe) { return sndOffline(mix === undefined ? 63 : mix, mudoDe === undefined ? -1 : mudoDe, pausaDe === undefined ? -1 : pausaDe); },
  somPcm(i0, n) { const u = new Uint8Array(SND.pcm.buffer, i0 * 2, Math.min(n, SND.pcm.length - i0) * 2); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); },
  somCtl() { return Array.from(SND.rec.subarray(0, SND.recN * 16)); },
  // Nivel pico de audio en tiempo real
  somNivel() { if (!SND.node) return null; if (!SND.an) { SND.an = SND.ctx.createAnalyser(); SND.an.fftSize = 2048; SND.node.connect(SND.an); SND.anBuf = new Float32Array(2048); } SND.an.getFloatTimeDomainData(SND.anBuf); let p = 0; for (const v of SND.anBuf) p = Math.max(p, Math.abs(v)); return p; },
  // Estado de la interfaz para pruebas
  ui() { return { ligada: GAME.ui, estado: GAME.ui ? Object.keys(ST)[UI.st] : null, menu: GAME.ui && UI.el.style.display !== 'none', painel: HUD.vis, stats: HUD.stats, mudo: SND.mute, som: SND.ctx ? SND.ctx.state : 'nenhum', somOk: SND.ok, somVia: SND.P ? 'AudioWorklet' : SND.node ? 'ScriptProcessor' : null, tempoAudio: SND.ctx ? SND.ctx.currentTime : 0, pose: UI.pose, bench: UI.bench, pad: UI.padN, replay: GS.replayOn, gpuTempo: G.hasTS, perfOn: PERF.on, gpuVivo: PERF.live[0] }; },
  state() { const V = VEH; return { rpm: V.rpm, thr: V.ctl[0], brk: V.ctl[1], keys: GS.keys, volta: LAP[3] === 1 ? V.time - LAP[0] : 0, ultima: LAP[1], melhor: LAP[2], voltas: V.laps, tempo: V.time, camPos: Array.from(R.cam.pos), camFwd: Array.from(R.cam.fwd), x: V.x, z: V.z, y: V.y, yaw: V.yaw, speed: Math.hypot(V.vx, V.vy), vx: V.vx, steer: V.steer, s: V.s, d: V.d, gear: V.gear, cam: GS.cam, lapS: V.lapS, off: V.offCount, hits: V.hits, tick: GS.tick60, zone: V.zone, brake: objParams(carObj().slotBody)[0], slip: Array.from(V.slip), particles: FX.pAlive, roll: V.roll, pitch: V.pitch, spin: V.spin[0] }; },
  dbg(name, scale, alpha) { setDebugView(name, scale, alpha); },
  R, G, GAME, TRK, GS, VEH, FX, RT, renderFrame, SND, HUD, UI, PERF, LAP, CARS, TRACKS,
};
main();
