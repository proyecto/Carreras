'use strict';
// ---- 47_perf.js
// Medición de rendimiento: consultas de tiempo de GPU por render pass + registro de frametime.
// Con ?perf las consultas permanecen activadas. En el juego interactivo solo se activan
// durante el benchmark o cuando las estadísticas están activas (perfAttach); fuera de eso los render passes
// se ejecutan sin overhead de timestamp queries. Las promesas de mapAsync son la única asignación temporal.
const PERF_CFG = (typeof window !== 'undefined' && window.__CFG_ENGINE_PERF)
  || (typeof require === 'function' ? (() => { try { return require('../config/engine/perf.json'); } catch { return {}; } })() : {});
const _pCfg = PERF_CFG.PERF || {};
const PERF = {
  on: false, qs: null, resolve: null, pool: [], names: [], n: 0, cap: _pCfg.cap ? _pCfg.cap.value : 16384, count: 0,
  gpu: null, span: null, cpu: null, raf: null, perPass: null, lastRaf: 0, t0: 0, pendingIdx: -1,
  rec: false, every: 1, live: new Float32Array(1), tw: null,
};
function perfInit() {
  if (!Q.has('perf') && !GAME.ui) return;
  PERF.raf = new Float32Array(PERF.cap); PERF.cpu = new Float32Array(PERF.cap); PERF.gpu = new Float32Array(PERF.cap); PERF.span = new Float32Array(PERF.cap);   // el frametime se registra incluso sin timestamp queries de GPU
  if (!G.hasTS) return;
  const dev = G.dev, D = R.pd, list = [];
  const add = (name, descs) => { const i = list.length; list.push(name); for (const d of descs) d.timestampWrites = { querySet: null, beginningOfPassWriteIndex: i * 2, endOfPassWriteIndex: i * 2 + 1 }; PERF._d.push(...descs); };
  PERF._d = [];
  add('shadow0', [D.shadow[0]]); add('shadow1', [D.shadow[1]]); add('shadow2', [D.shadow[2]]); add('cube', D.cube);
  for (let m = 1; m <= ENV_MIPS; m++) add('envMip' + m, D.envMip.map(f => f[m]));
  add('gbuf', [D.gbuf]); add('decal', [D.decal]); add('half', [D.half]); add('blurH', [D.blurH]); add('blurV', [D.blurV]); add('light', [D.light]); add('trans', [D.trans]);
  add('taa', D.taa); add('mbTile', [D.mbTile]); add('mbNeigh', [D.mbNeigh]); add('mblur', [D.mb]);
  D.blDown.forEach((d, i) => add('blDown' + i, [d])); D.blUp.forEach((d, i) => add('blUp' + i, [d])); add('expo', D.expo); add('final', [D.final]);
  PERF.names = list; PERF.n = list.length;
  PERF.qs = dev.createQuerySet({ type: 'timestamp', count: PERF.n * 2 });
  for (const d of PERF._d) d.timestampWrites.querySet = PERF.qs;
  PERF.resolve = dev.createBuffer({ size: PERF.n * 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
  const poolSz = _pCfg.poolSize ? _pCfg.poolSize.value : 6;
  const spikeMs = _pCfg.spikeThresholdMs ? _pCfg.spikeThresholdMs.value : 14;
  const maxSpk = _pCfg.maxSpikes ? _pCfg.maxSpikes.value : 24;
  for (let i = 0; i < poolSz; i++) {
    const b = { buf: dev.createBuffer({ size: PERF.n * 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }), free: true, frame: 0, cb: null };
    b.cb = () => {
      // En GPUs de tile (Apple Silicon) los intervalos de passes adyacentes se solapan (el vertex stage del
      // siguiente comienza antes del fragment stage del anterior). Por ello: tiempo de frame = último fin - primer inicio,
      // y el coste de cada pass = avance del instante de fin respecto al pass anterior.
      const a = new BigUint64Array(b.buf.getMappedRange()); let lo = 0, hi = 0, first = true, prevEnd = 0; const k = b.frame, tRef = Number(a[0]);   // a[0] = inicio de cascada 0 (primer pass de cada frame)
      for (let i = 0; i < PERF.n; i++) {
        const t0 = Number(a[i * 2]), t1 = Number(a[i * 2 + 1]); if (t1 <= t0 || t0 === 0 || t0 < tRef) continue;   // passes no ejecutados en este frame conservan marcas anteriores
        if (first) { lo = t0; prevEnd = t0; first = false; }
        if (t0 < lo) lo = t0; if (t1 > hi) hi = t1;
        if (t1 > prevEnd) { PERF.perPass[i] += (t1 - prevEnd) * 1e-6; prevEnd = t1; }
        PERF.own[i] += (t1 - t0) * 1e-6; PERF.beg[i] += (t0 - tRef) * 1e-6;
      }
      if (k < PERF.cap) { PERF.gpu[k] = (hi - lo) * 1e-6; }
      PERF.live[0] = (hi - lo) * 1e-6;
      // Diagnóstico: guarda inicio/fin de cada pass (relativos al inicio del frame) de frames lentos
      if ((hi - lo) * 1e-6 > spikeMs && PERF.nSpike < maxSpk) { const o = PERF.nSpike++ * (PERF.n * 2 + 1); PERF.spike[o] = k; for (let i = 0; i < PERF.n * 2; i++) { const t = Number(a[i]); PERF.spike[o + 1 + i] = t >= tRef ? (t - lo) * 1e-6 : -1; } }
      PERF.done++; b.buf.unmap(); b.free = true;
    };
    PERF.pool.push(b);
  }
  PERF.tw = PERF._d.map(d => d.timestampWrites);
  PERF.perPass = new Float64Array(PERF.n); PERF.done = 0; PERF.on = true; PERF.own = new Float64Array(PERF.n); PERF.beg = new Float64Array(PERF.n); PERF.nSpike = 0; PERF.spike = new Float32Array(24 * (PERF.n * 2 + 1));
  if (!Q.has('perf')) perfAttach(false);
}
// Activa/desactiva consultas de tiempo en passes. every = 1 mide cada frame; N = uno cada N.
function perfAttach(on, every) {
  if (!PERF.qs) return; PERF._d.forEach((d, i) => { d.timestampWrites = on ? PERF.tw[i] : undefined; });
  PERF.on = on; PERF.every = every || 1; PERF.pendingIdx = -1; PERF.live[0] = 0;
}
// Invocado dentro de renderFrame antes de finish(): resuelve timestamps a un búfer libre
function perfResolve(enc) {
  if (!PERF.on) return;
  PERF.pendingIdx = -1;
  if (PERF.every > 1 && R.frameIdx % PERF.every !== 0) return;
  for (let i = 0; i < PERF.pool.length; i++) if (PERF.pool[i].free) { PERF.pendingIdx = i; break; }
  if (PERF.pendingIdx < 0) return;
  enc.resolveQuerySet(PERF.qs, 0, PERF.n * 2, PERF.resolve, 0);
  enc.copyBufferToBuffer(PERF.resolve, 0, PERF.pool[PERF.pendingIdx].buf, 0, PERF.n * 16);
}
function perfAfterSubmit() {
  if (!PERF.rec) { if (PERF.every > 1 && PERF.pendingIdx >= 0) perfMap(PERF.cap); return; }   // Estadísticas en vivo: lectura periódica
  const k = PERF.count; if (k >= PERF.cap) return;
  if (PERF.pendingIdx >= 0) perfMap(k);
  PERF.count++;
}
function perfMap(k) { const b = PERF.pool[PERF.pendingIdx]; b.free = false; b.frame = k; PERF.pendingIdx = -1; b.buf.mapAsync(GPUMapMode.READ).then(b.cb); }
function perfFrameTimes(tRaf) {
  if (!PERF.rec) return; const k = PERF.count; if (k >= PERF.cap) return;
  PERF.raf[k] = PERF.lastRaf ? tRaf - PERF.lastRaf : 0; PERF.lastRaf = tRaf; PERF.t0 = performance.now();
}
function perfJsTime() { if (PERF.rec && PERF.count > 0 && PERF.count <= PERF.cap) PERF.cpu[PERF.count - 1] = performance.now() - PERF.t0; }
function perfStart() { if (PERF.own) { PERF.own.fill(0); PERF.beg.fill(0); PERF.perPass.fill(0); } PERF.nSpike = 0; PERF.count = 0; PERF.done = 0; PERF.lastRaf = 0; PERF.gpu.fill(0); PERF.rec = true; }
function perfReport() {
  PERF.rec = false; const n = PERF.count, per = {};
  for (let i = 0; i < PERF.n; i++) per[PERF.names[i]] = PERF.perPass[i] / Math.max(1, PERF.done);
  const spikes = []; for (let q = 0; q < PERF.nSpike; q++) { const o = q * (PERF.n * 2 + 1), e = { frame: PERF.spike[o], passes: [] }; for (let i = 0; i < PERF.n; i++) { const t0 = PERF.spike[o + 1 + i * 2], t1 = PERF.spike[o + 2 + i * 2]; if (t0 >= 0) e.passes.push([PERF.names[i], +t0.toFixed(2), +t1.toFixed(2)]); } spikes.push(e); }
  const own = {}; for (let i = 0; i < PERF.n; i++) own[PERF.names[i]] = [+(PERF.beg[i] / Math.max(1, PERF.done)).toFixed(3), +(PERF.own[i] / Math.max(1, PERF.done)).toFixed(3)];
  return { own, spikes, n, done: PERF.done, gpu: Array.from(PERF.gpu.subarray(0, n)), span: Array.from(PERF.span.subarray(0, n)), raf: Array.from(PERF.raf.subarray(0, n)), cpu: Array.from(PERF.cpu.subarray(0, n)), per };
}
