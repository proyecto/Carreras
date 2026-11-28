'use strict';
// ---- 52_ui.js
// Interfaz de usuario interactiva (GAME.ui): inicio, pausa, benchmark, repetición guiada,
// poses fijas y soporte para gamepad.

const ST = { INICIO: 0, JUEGO: 1, JOGO: 1, PAUSA: 2, BENCH: 3, REPLAY: 4, FITA: 4, RESULT: 5, POSE: 6 };
const UI = {
  st: ST.INICIO, back: ST.JOGO, el: null, stage: null, tag: null, res: null,
  b0: null, b1: null, bOpt: null, bOptBack: null, bResetControls: null,
  pMain: null, pOpt: null, listeningKey: null,
  bench: null, benchN: 0, padPrev: 0, padN: 0, pose: -1, stats: false, warm: false, selCar: '', selTrack: '',
  selRival: true, selRivalCar: '', selRivalCount: 1
};
const $ = id => document.getElementById(id);

function uiInit() {
  UI.el = $('ui'); UI.stage = $('stage'); UI.tag = $('tag'); UI.res = $('res'); UI.b0 = $('b0'); UI.b1 = $('b1');
  UI.pMain = $('panel-main'); UI.pOpt = $('panel-options');
  UI.bOpt = $('b-opt'); UI.bOptBack = $('b-opt-back'); UI.bResetControls = $('b-reset-controls');

  if (UI.bOpt) UI.bOpt.onclick = () => uiShowOptions(true);
  if (UI.bOptBack) UI.bOptBack.onclick = () => uiShowOptions(false);
  if (UI.bResetControls) {
    UI.bResetControls.onclick = () => {
      if (typeof CONTROLS !== 'undefined') CONTROLS.reset();
      uiRenderControls();
    };
  }

  // Conectar botones de idioma
  const langBtns = document.querySelectorAll('.lang-btn');
  for (const b of langBtns) {
    b.onclick = () => {
      const code = b.getAttribute('data-lang');
      if (typeof I18N !== 'undefined') I18N.setLang(code);
    };
  }
  if (typeof I18N !== 'undefined') I18N.updateDOM();

  const car = CARS.active, trk = TRACKS.active;
  if (car && trk) {
    const h1 = $('ui-title'), sub = UI.el.querySelector('.sub');
    const carNm = (typeof I18N !== 'undefined') ? I18N.carName(car) : car.name;
    const trkNm = (typeof I18N !== 'undefined') ? I18N.trackSub(trk) : (trk.subtitle || trk.name);
    if (h1) h1.textContent = carNm;
    if (sub) sub.textContent = ((typeof I18N !== 'undefined') ? I18N.carSub(car) : (car.subtitle || car.name)) + ' · ' + trkNm;
    document.title = carNm + ' — ' + trkNm;
  }
  const saved = (typeof loadSelection === 'function') ? loadSelection() : {};
  const camSel = document.getElementById('opt-camera-select');
  if (camSel) camSel.value = String(saved.cam !== undefined ? saved.cam : 0);
  const gbSel = document.getElementById('opt-gearbox-select');
  const gbVal = (saved.gearbox === 'manual') ? 'manual' : 'auto';
  if (gbSel) gbSel.value = gbVal;
  if (typeof GAME !== 'undefined') GAME.manualGearbox = (gbVal === 'manual');
  UI.selRival = (typeof GAME !== 'undefined' && typeof GAME.rivalEnabled !== 'undefined')
    ? (GAME.rivalEnabled !== false)
    : ((typeof window !== 'undefined' && typeof window.__rivalEnabled !== 'undefined')
      ? window.__rivalEnabled
      : (saved.rival !== false));
  UI.selRivalCar = (CARS.rival ? CARS.rival.id : ((typeof window !== 'undefined' && window.__rivalCarId) || saved.rivalCar || ''));
  UI.selRivalCount = (typeof GAME !== 'undefined' && GAME.rivalCount)
    ? GAME.rivalCount
    : ((typeof window !== 'undefined' && window.__rivalCount) || saved.rivalCount || 1);
  UI.selTotalLaps = (typeof GAME !== 'undefined' && GAME.totalLaps)
    ? GAME.totalLaps
    : ((typeof window !== 'undefined' && window.__totalLaps) || saved.totalLaps || 3);
  uiBuildSelectors();
  uiUpdateRivalDOM();
  uiUpdateLapsDOM();
  hudInit(); uiWarmup();
  uiSetupNetworkListeners();
  if (typeof NET !== 'undefined') NET.init();
  try { const b = +localStorage.getItem(uiStorageKey()); if (b > 20 && b < 600) LAP[2] = b; } catch (e) { /* sin almacenamiento local: mejor vuelta en sesión */ }
  UI.b0.onclick = async () => {
    if (!GAME.ready) {
      saveSelection();
      UI.el.style.display = 'none';
      if (typeof bootSimulation === 'function') {
        await bootSimulation(true);
      }
      return;
    }
    if (uiSelectionChanged()) { uiApplySelection(true); return; }
    if (UI.st === ST.INICIO) { sndStart(); uiDrive(); } else uiResume();
  };
  UI.b1.onclick = () => benchStart();
  addEventListener('keydown', uiKey);
  document.addEventListener('visibilitychange', () => { if (document.hidden && (UI.st === ST.JOGO || UI.st === ST.FITA || UI.st === ST.BENCH)) uiPause(); });
  addEventListener('gamepadconnected', padCount); addEventListener('gamepaddisconnected', padCount);
  const h = $('hint'); if (h) h.style.display = 'none';

  const autoPlay = typeof Q !== 'undefined' && Q.get('play') === '1';
  if (autoPlay) {
    try {
      const p = new URLSearchParams(location.search);
      p.delete('play');
      const qs = p.toString() ? '?' + p.toString() : '';
      history.replaceState(null, '', location.pathname + qs);
    } catch (e) { }
    sndStart();
    uiDrive();
  } else {
    uiSet(ST.INICIO);
  }
}
// Cambio de estado: muestra/oculta menús, HUD y pausa sonido
function uiSet(st) {
  if (typeof Patterns !== 'undefined' && Patterns.EventBusSingleton) {
    Patterns.EventBusSingleton.emit('state:changed', { to: st });
  }
  const menu = st === ST.INICIO || st === ST.PAUSA || st === ST.RESULT;
  UI.st = st; UI.el.style.display = menu ? 'flex' : 'none'; UI.el.className = st === ST.INICIO ? 'ini' : '';
  if (UI.stage) UI.stage.inert = menu;
  if (menu) {
    uiShowOptions(false);
    uiBuildSelectors();
    uiUpdateRivalDOM();
  }
  uiUpdatePrimaryBtn();
  UI.b1.style.display = (st === ST.INICIO || !GS.replay) ? 'none' : '';
  UI.b1.textContent = st === ST.RESULT ? ((typeof I18N !== 'undefined') ? I18N.t('btn_repeat_bench') : 'Rerun benchmark') : ((typeof I18N !== 'undefined') ? I18N.t('btn_bench') : 'Benchmark');
  UI.res.style.display = st === ST.RESULT ? 'block' : 'none';
  UI.tag.textContent = st === ST.BENCH ? ((typeof I18N !== 'undefined') ? I18N.t('tag_bench') : 'Benchmark: 60 s scripted lap · Esc cancels') : st === ST.FITA ? ((typeof I18N !== 'undefined') ? I18N.t('tag_replay') : 'Replay lap · R takes the wheel · Esc menu') : st === ST.POSE ? ((typeof I18N !== 'undefined') ? I18N.t('tag_pose', { n: UI.pose + 1, name: POSES[UI.pose].nome, total: POSES.length }) : ('Pose ' + (UI.pose + 1) + ' · ' + POSES[UI.pose].nome + ' · 1 to ' + POSES.length + ' switch · Esc resumes driving')) : '';
  UI.tag.style.display = UI.tag.textContent ? 'block' : 'none';
  hudShow(st === ST.JOGO || st === ST.FITA || (st === ST.PAUSA && UI.back !== ST.BENCH));
  sndRun(st === ST.JOGO || st === ST.FITA || st === ST.BENCH);
  if (menu) UI.b0.focus(); else UI.b0.blur();
  _lastT = 0;
}
function uiPause() { if (UI.st === ST.BENCH) benchStop(); UI.back = UI.st === ST.FITA ? ST.FITA : ST.JOGO; uiSet(ST.PAUSA); }
function uiResume() {
  if (UI.st === ST.RESULT || UI.st === ST.POSE) uiDrive(); else if (UI.st === ST.PAUSA) uiSet(UI.back);
}
// Regreso a pista: coche en grid y simulación activa
function uiDrive() { GS.frozen = false; GS.freeCam = false; GS.replayOn = false; gameRestart(); uiSet(ST.JOGO); }
function uiReplay() { if (!GS.replay) return; GS.frozen = false; GS.freeCam = false; GS.replayOn = true; gameRestart(); uiSet(ST.FITA); }
function uiPose(i) { if (!POSES[i]) return; if (UI.st === ST.BENCH) benchStop(); UI.pose = i; poseApply(i); GS.replayOn = false; uiSet(ST.POSE); }
function uiKey(e) {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const c = e.code, st = UI.st;

  // Si estamos esperando una pulsación para reasignar tecla
  if (UI.listeningKey) {
    if (c === 'Escape') {
      UI.listeningKey = null;
    } else {
      if (typeof CONTROLS !== 'undefined') {
        CONTROLS.setKey(UI.listeningKey.action, UI.listeningKey.slot, c);
      }
      UI.listeningKey = null;
    }
    uiRenderControls();
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // Si el panel de opciones está visible
  if (UI.pOpt && UI.pOpt.style.display !== 'none') {
    if (c === 'Escape') {
      uiShowOptions(false);
      e.preventDefault();
    }
    return;
  }

  if (typeof CONTROLS !== 'undefined' && CONTROLS.isKey('mute', c)) { sndMute(!SND.mute); return; }
  if (typeof CONTROLS !== 'undefined' && CONTROLS.isKey('stats', c)) { UI.stats = !UI.stats; hudStats(UI.stats); if (st !== ST.BENCH) perfAttach(UI.stats, 12); return; }
  if (st === ST.INICIO) return;                                   // En pantalla de inicio el botón inicia el juego y audio
  if (c === 'Escape') { if (st === ST.JOGO || st === ST.FITA || st === ST.BENCH) uiPause(); else uiResume(); e.preventDefault(); }
  else if (c === 'KeyB') benchStart();
  else if (c === 'KeyF') uiReplay();
  else if (c === 'KeyR' && st === ST.FITA) uiDrive();
  else if (c.length === 6 && c.startsWith('Digit') && c[5] >= '1' && c[5] <= '6') uiPose(+c[5] - 1);
}
// ---- Benchmark: vuelta guiada de 60 s midiendo frametime y tiempo GPU
function benchStart() {
  if (!GS.replay || UI.st === ST.INICIO) return;
  GS.frozen = false; GS.freeCam = false; GS.replayOn = true; gameRestart(); UI.bench = null; UI.benchN++;
  UI.res.innerHTML = (typeof I18N !== 'undefined') ? I18N.t('bench_calculating') : '<h2>Benchmark · calculating…</h2>';
  perfAttach(true, 1); perfStart(); uiSet(ST.BENCH);
}
function benchStop() { PERF.rec = false; perfAttach(UI.stats, 12); GS.replayOn = false; }
function benchEnd() {
  const id = UI.benchN; PERF.rec = false; uiSet(ST.RESULT);
  setTimeout(() => {   // Espera las últimas lecturas de GPU
    if (id !== UI.benchN || UI.st !== ST.RESULT) return;
    const r = perfReport(), stat = a => { a = a.slice(5).filter(x => x > 0).sort((p, q) => p - q); const n = a.length; return n ? { n, media: a.reduce((p, q) => p + q, 0) / n, p99: a[Math.min(n - 1, Math.round(0.99 * (n - 1)))], max: a[n - 1], acima: a.filter(x => Math.round(x * 10) > 167).length } : null; };
    const q = stat(r.raf), g = PERF.qs ? stat(r.gpu) : null, f = x => x.toFixed(2).replace('.', ',');
    benchStop(); gameRestart();
    UI.bench = { frames: r.n, frame_ms: q, gpu_ms: g, fps: q ? 1000 / q.media : 0, sobre_16_7: q ? q.acima : 0, gpu_sobre_16_7: g ? g.acima : null, tick: 3600, resolucion: G.W + '×' + G.H };
    const row = (n, s) => '<tr><th>' + n + '</th>' + (s ? '<td>' + f(s.media) + '</td><td>' + f(s.p99) + '</td><td>' + f(s.max) + '</td>' : '<td colspan=3>' + ((typeof I18N !== 'undefined') ? I18N.t('bench_unavailable') : 'unavailable') + '</td>') + '</tr>';
    const title = (typeof I18N !== 'undefined') ? I18N.t('bench_title', { w: G.W, h: G.H }) : ('<h2>Benchmark · ' + G.W + '×' + G.H + '</h2>');
    const thAvg = (typeof I18N !== 'undefined') ? I18N.t('bench_avg') : 'avg (ms)';
    const thP99 = (typeof I18N !== 'undefined') ? I18N.t('bench_p99') : '99th percentile (ms)';
    const thMax = (typeof I18N !== 'undefined') ? I18N.t('bench_max') : 'max (ms)';
    const lblFrame = (typeof I18N !== 'undefined') ? I18N.t('bench_frame_time') : 'Frame time';
    const lblGPU = (typeof I18N !== 'undefined') ? I18N.t('bench_gpu_time') : 'GPU time';
    const summary = q ? ((typeof I18N !== 'undefined') ? I18N.t('bench_summary', {
      over: q.acima,
      total: q.n,
      gpuOver: g ? I18N.t('bench_gpu_over', { n: g.acima }) : '',
      fps: f(1000 / q.media)
    }) : (q.acima + ' of ' + q.n + ' frames')) : '';
    UI.res.innerHTML = title + '<table><tr><th></th><th>' + thAvg + '</th><th>' + thP99 + '</th><th>' + thMax + '</th></tr>' + row(lblFrame, q) + row(lblGPU, g) + '</table><p>' + summary + '</p>';
  }, 400);
}
// ---- Gamepad API (estándar). Solo se consulta si hay mando conectado.
function padCount() { let n = 0; const l = navigator.getGamepads ? navigator.getGamepads() : []; for (let i = 0; i < l.length; i++) if (l[i] && l[i].connected) n++; UI.padN = n; if (!n) { GS.padKeys = 0; UI.padPrev = 0; } }
// Aislado para evitar allocations en el loop principal.
const PADR = new Float64Array(3), PADB = new Int32Array(1);
function apiGamepad() {
  const l = navigator.getGamepads(); let p = null;
  for (let i = 0; i < l.length; i++) { const g = l[i]; if (g && g.connected && (!p || (g.mapping === 'standard' && p.mapping !== 'standard'))) p = g; }
  if (!p) { PADB[0] = -1; return; }
  const b = p.buttons, n = b.length; let m = 0; for (let i = 0; i < n && i < 16; i++) if (b[i].pressed) m |= 1 << i;
  PADB[0] = m; PADR[0] = n > 7 ? b[7].value : 0; PADR[1] = n > 6 ? b[6].value : 0; PADR[2] = p.axes.length ? p.axes[0] : 0;
}
// Traduce lectura del mando a entradas analógicas y digitales
function padPoll() { apiGamepad(); padApply(); }
function padApply() {
  const m = PADB[0]; if (m < 0) { GS.padKeys = 0; return; }
  let k = K_PAD | K_PADS, x = PADR[2]; const rt = PADR[0], lt = PADR[1], ax = x < 0 ? -x : x;
  PADV[0] = rt < 0.04 ? 0 : rt; PADV[1] = lt < 0.04 ? 0 : lt;
  if (ax < 0.12) x = 0; else { const u = (ax - 0.12) / 0.88; x = (x < 0 ? -1 : 1) * u * (0.45 + 0.55 * u); }   // Zona muerta + curva suave progresiva
  PADV[2] = x;
  if (rt > 0.06) k |= K_W; if (lt > 0.06) k |= K_S;
  if (m & 1) k |= K_SPACE; if (m & 8) k |= K_C; if (m & 4) k |= K_R; if (m & 32) k |= K_V;
  GS.padKeys = k;
  const edge = m & ~UI.padPrev; UI.padPrev = m;
  if (edge & 516) padMenu(edge);
}
// Botones de menú del gamepad: Start abre/cierra; X toma el control
function padMenu(edge) {
  if (UI.warm) return;
  if (edge & 512) { if (UI.st === ST.JOGO || UI.st === ST.FITA || UI.st === ST.BENCH) uiPause(); else if (UI.st !== ST.INICIO) uiResume(); }
  else if (UI.st === ST.FITA) uiDrive();
}
// Calentamiento JIT de funciones de interfaz (control, panel, estadísticas)
function uiWarmup() {
  const H = HUD, g = H.g, t = H.t, s = H.s, sc = document.createElement('canvas'); sc.width = sc.height = 4; const x = sc.getContext('2d'), V = H.V, rt3 = RT[3];
  const po = PERF.on; UI.warm = true; H.g = H.t = H.s = x; PERF.on = true;
  for (let i = 0; i < 6000; i++) {
    PADB[0] = i % 97 === 0 ? -1 : (i * 7919) & 0xffff; PADR[0] = (i % 50) / 49; PADR[1] = (i % 31) / 60; PADR[2] = Math.sin(i * 0.7); padApply();
    if (i % 2) continue;
    V[0] = (i * 7) % 2100; V[1] = (i * 13) % 7400; V[2] = i % 6; V[3] = (i * 331) % 70000; V[4] = i % 5 ? (i * 17) % 9000 : -1; V[5] = i % 3 ? (i * 19) % 9000 : -1; hudDraw(); hudRead();
    RT[3] = 300 + i % 300; PERF.live[0] = i % 4 ? i % 40 : 0; hudStatsFrame();
  }
  H.g = g; H.t = t; H.s = s; H.K.fill(-9); H.acc.fill(0); RT[3] = rt3; PERF.live[0] = 0; GS.padKeys = 0; UI.padPrev = 0; PADB[0] = -1; PERF.on = po; UI.warm = false;
}
// Invocado al inicio de cada frame; devuelve true si el juego está pausado en menú
function uiFrame() {
  if (UI.padN) padPoll();
  const st = UI.st;
  return st === ST.INICIO || st === ST.PAUSA || st === ST.RESULT || st === ST.POSE;
}
// Invocado tras simular y renderizar el frame
function uiAfter() {
  const st = UI.st;
  if (st === ST.BENCH) { if (GS.tick60 >= 3600) benchEnd(); }
  else {
    if (st === ST.FITA && GS.tick60 >= GS.replay.length) { GS.replayOn = false; uiSet(ST.JOGO); }
    if (HUD.vis) hudFrame();
    if (GS.lapNew) { GS.lapNew = false; try { localStorage.setItem(uiStorageKey(), LAP[2].toFixed(3)); } catch (e) { /* idem */ } }
  }
  if (HUD.stats) hudStatsFrame();
  sndFrame();
}

if (typeof window !== 'undefined') {
  window.uiToggleRival = uiToggleRival;
  window.uiChangeRivalCount = uiChangeRivalCount;
  window.uiChangeTotalLaps = uiChangeTotalLaps;
  window.uiUpdateLapsDOM = uiUpdateLapsDOM;
  window.uiRerollRival = uiRerollRival;
  window.uiUpdateRivalDOM = uiUpdateRivalDOM;
}
