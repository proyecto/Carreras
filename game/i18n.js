'use strict';
// ---- 50_i18n.js
// Sistema de internacionalización del juego (inglés por defecto, español y portugués).
const I18N = {
  lang: 'en', // Inglés por defecto

  locales: {
    en: {
      lang_name: 'English',
      loading: 'loading…',
      hint: 'W accelerate · S brake/reverse · A/D steer · Space handbrake · C camera · R reset to track',
      legend_car: 'Car',
      legend_track: 'Track',
      legend_lang: 'Language',
      badge_current: 'Current',
      badge_best: 'Best ',
      btn_start: 'Start',
      btn_continue: 'Continue',
      btn_resume_driving: 'Resume driving',
      btn_apply_race: 'Apply & Race',
      btn_bench: 'Benchmark',
      btn_repeat_bench: 'Rerun benchmark',
      tag_bench: 'Benchmark: 60 s scripted lap · Esc cancels',
      tag_replay: 'Replay lap · R takes the wheel · Esc menu',
      tag_pose: 'Pose {n} · {name} · 1 to {total} switch · Esc resumes driving',
      hud_timer_labels: ['LAP', 'LAST', 'BEST'],
      hud_stats_labels: ['FPS', 'FRAME', 'GPU'],
      bench_calculating: '<h2>Benchmark · calculating…</h2>',
      bench_title: '<h2>Benchmark · 60 s scripted lap · {w}×{h}</h2>',
      bench_avg: 'average (ms)',
      bench_p99: '99th percentile (ms)',
      bench_max: 'maximum (ms)',
      bench_frame_time: 'Frame time',
      bench_gpu_time: 'GPU time',
      bench_unavailable: 'unavailable in this browser',
      bench_summary: '{over} of {total} frames exceeded 16.7 ms interval{gpuOver} · {fps} frames per second',
      bench_gpu_over: ' · {n} exceeded 16.7 ms on GPU',

      // Controles
      controls_summary: 'Controls and shortcuts',
      controls_keyboard: 'Keyboard',
      controls_gamepad: 'Gamepad',
      controls_tools: 'Tools',
      ctrl_w: 'accelerate',
      ctrl_s: 'brake and reverse',
      ctrl_ad: 'steer',
      ctrl_space: 'handbrake',
      ctrl_c: 'change camera',
      ctrl_v: 'look back',
      ctrl_r: 'reset car to track',
      ctrl_esc: 'pause and open menu',
      gp_rt: 'Right trigger',
      gp_lt: 'Left trigger',
      gp_stick: 'Left stick',
      gp_rb: 'RB (hold)',
      gp_start: 'open menu',
      tool_m: 'toggle sound',
      tool_h: 'performance stats',
      tool_b: 'benchmark (60 s lap)',
      tool_f: 'watch replay lap',
      tool_poses: 'fixed camera poses',
      tool_footer: 'Automatic transmission · Lap times start upon crossing the finish line',

      // Coches
      cars: {
        'porsche-911-1979': {
          name: 'Porsche 911 / 935 Turbo',
          subtitle: '1979 Porsche 935 Slantnose · Flat-6 Twin-Turbo · RWD',
          specs: '1025 kg · 750 HP · Aero Downforce · Rear Engine · RWD',
        },
        'uno-mille-1996': {
          name: 'Uno with Ladder',
          subtitle: 'Fiat Uno Mille EP 1996',
          specs: '900 kg · 5 gears · FWD · Roof ladder',
        },
        'mclaren-x2-2018': {
          name: 'McLaren Ultimate Vision GT',
          subtitle: '2018 Vision Gran Turismo Concept · 4.0L Twin-Turbo V8 Hybrid · AWD',
          specs: '1000 kg · 1150 HP · Ground Effect Aero · Active Aero · AWD',
        },
        'bmw-m8-gte-2018': {
          name: 'BMW M8 GTE',
          subtitle: '2018 Le Mans & IMSA Endurance Racer · 4.0L Twin-Turbo V8 · RWD',
          specs: '1220 kg · 600 HP · Le Mans Aero Spec · Xtrac 6-speed seq · RWD',
        },
        'mercedes-amg-gt3-2020': {
          name: 'Mercedes-AMG GT3 Evo',
          subtitle: '2020 GT3 Spec · 6.2L Naturally Aspirated V8 · RWD',
          specs: '1285 kg · 550 HP · Hewland 6-speed seq · RWD · GT3 Evo Aero',
        },
        'porsche-992-gt3-r-2024': {
          name: 'Porsche 911 GT3 R (992)',
          subtitle: '2024 GT3 & 24h Nürburgring Spec · 4.2L Flat-6 Boxer · RWD',
          specs: '1250 kg · 565 HP · 9250 RPM · Swan-Neck Aero · RWD',
        },
        'nissan-gtr-gt3-2018': {
          name: 'Nissan GT-R Nismo GT3',
          subtitle: '2018 GT3 Spec · 3.8L Twin-Turbo V6 VR38DETT · RWD',
          specs: '1290 kg · 550 HP · Hewland 6-speed seq · RWD · Nismo Aero',
        },
      },

      // Circuitos
      tracks: {
        'nurburgring-gp': {
          name: 'Nürburgring GP',
          subtitle: 'GP-Strecke',
          specs: '5.15 km · 16 turns · FIA GT3 width · Official Grand Prix circuit',
        },
        'nurburgring-nordschleife': {
          name: 'Nürburgring Nordschleife',
          subtitle: 'The Green Hell',
          specs: '6.86 km · The Green Hell · Flugplatz, Fuchsröhre, Karussell & Döttinger Höhe',
        },
        'nurburgring-24h': {
          name: 'Nürburgring 24 Hours',
          subtitle: '24h Combined Course',
          specs: '8.55 km · 24h Endurance · GP Paddock, Arena & the entire Green Hell',
        },
      },
    },

    es: {
      lang_name: 'Español',
      loading: 'cargando…',
      hint: 'W acelera · S frena/marcha atrás · A/D gira · Espacio freno de mano · C cámara · R volver a pista',
      legend_car: 'Coche',
      legend_track: 'Circuito',
      legend_lang: 'Idioma',
      badge_current: 'Actual',
      badge_best: 'Mejor ',
      btn_start: 'Empezar',
      btn_continue: 'Continuar',
      btn_resume_driving: 'Volver a conducir',
      btn_apply_race: 'Aplicar y correr',
      btn_bench: 'Benchmark',
      btn_repeat_bench: 'Repetir benchmark',
      tag_bench: 'Benchmark: vuelta grabada de 60 s · Esc cancela',
      tag_replay: 'Repetición · R toma el volante · Esc menú',
      tag_pose: 'Pose {n} · {name} · 1 a {total} cambian · Esc vuelve a conducir',
      hud_timer_labels: ['VUELTA', 'ÚLTIMA', 'MEJOR'],
      hud_stats_labels: ['FPS', 'CUADRO', 'GPU'],
      bench_calculating: '<h2>Benchmark · calculando…</h2>',
      bench_title: '<h2>Benchmark · vuelta grabada de 60 s · {w}×{h}</h2>',
      bench_avg: 'media (ms)',
      bench_p99: 'percentil 99 (ms)',
      bench_max: 'máximo (ms)',
      bench_frame_time: 'Tiempo de cuadro',
      bench_gpu_time: 'Tiempo de GPU',
      bench_unavailable: 'no disponible en este navegador',
      bench_summary: '{over} de {total} cuadros superaron 16,7 ms de intervalo{gpuOver} · {fps} cuadros por segundo',
      bench_gpu_over: ' · {n} superaron 16,7 ms en GPU',

      // Controles
      controls_summary: 'Controles y atajos',
      controls_keyboard: 'Teclado',
      controls_gamepad: 'Mando',
      controls_tools: 'Herramientas',
      ctrl_w: 'acelera',
      ctrl_s: 'frena y da marcha atrás',
      ctrl_ad: 'gira',
      ctrl_space: 'freno de mano',
      ctrl_c: 'cambia la cámara',
      ctrl_v: 'mira hacia atrás',
      ctrl_r: 'devuelve el coche a pista',
      ctrl_esc: 'pausa y abre este menú',
      gp_rt: 'Gatillo derecho',
      gp_lt: 'Gatillo izquierdo',
      gp_stick: 'Stick izquierdo',
      gp_rb: 'RB (mantener)',
      gp_start: 'abre este menú',
      tool_m: 'activa y desactiva el sonido',
      tool_h: 'estadísticas de rendimiento',
      tool_b: 'benchmark (vuelta de 60 s)',
      tool_f: 'ver repetición grabada',
      tool_poses: 'poses de cámara fijas',
      tool_footer: 'Cambio automático · La vuelta cuenta al cruzar la línea de meta',

      // Coches
      cars: {
        'porsche-911-1979': {
          name: 'Porsche 911 / 935 Turbo',
          subtitle: '1979 Porsche 935 Slantnose · Flat-6 Twin-Turbo · RWD',
          specs: '1025 kg · 750 CV · Carga Aerodinámica · Motor trasero · RWD',
        },
        'uno-mille-1996': {
          name: 'Uno con escalera',
          subtitle: 'Fiat Uno Mille EP 1996',
          specs: '900 kg · 5 marchas · FWD · Escalera en el techo',
        },
        'mclaren-x2-2018': {
          name: 'McLaren Ultimate Vision GT',
          subtitle: '2018 Concepto Vision Gran Turismo · 4.0L V8 Twin-Turbo Híbrido · AWD',
          specs: '1000 kg · 1150 CV · Efecto Suelo · Aero Activa · AWD',
        },
        'bmw-m8-gte-2018': {
          name: 'BMW M8 GTE',
          subtitle: '2018 Prototipo Le Mans & IMSA · 4.0L V8 Twin-Turbo · RWD',
          specs: '1220 kg · 600 CV · Aero Spec Le Mans · Xtrac 6 marchas secuencial · RWD',
        },
        'mercedes-amg-gt3-2020': {
          name: 'Mercedes-AMG GT3 Evo',
          subtitle: '2020 Spec GT3 · 6.2L V8 Atmosférico · RWD',
          specs: '1285 kg · 550 CV · Transeje Hewland 6 marchas · RWD · Aero GT3 Evo',
        },
        'porsche-992-gt3-r-2024': {
          name: 'Porsche 911 GT3 R (992)',
          subtitle: '2024 Spec 24h Nürburgring & GT3 · 4.2L Flat-6 Bóxer · RWD',
          specs: '1250 kg · 565 CV · 9250 RPM · Aerodinámica Swan-Neck · RWD',
        },
        'nissan-gtr-gt3-2018': {
          name: 'Nissan GT-R Nismo GT3',
          subtitle: '2018 Spec GT3 · 3.8L Twin-Turbo V6 VR38DETT · RWD',
          specs: '1290 kg · 550 CV · Hewland 6 marchas sec · RWD · Aero Nismo',
        },
      },

      // Circuitos
      tracks: {
        'nurburgring-gp': {
          name: 'Nürburgring GP',
          subtitle: 'GP-Strecke',
          specs: '5,15 km · 16 curvas · Ancho FIA GT3 · Trazado oficial de Gran Premio',
        },
        'nurburgring-nordschleife': {
          name: 'Nürburgring Nordschleife',
          subtitle: 'El Infierno Verde',
          specs: '6,86 km · El Infierno Verde · Flugplatz, Fuchsröhre, Karussell y Döttinger Höhe',
        },
        'nurburgring-24h': {
          name: 'Nürburgring 24 Horas',
          subtitle: '24h Gesamstrecke',
          specs: '8,55 km · Resistencia 24 Horas · GP Paddock, Arena y todo el Infierno Verde',
        },
      },
    },

    pt: {
      lang_name: 'Português',
      loading: 'carregando…',
      hint: 'W acelera · S freia/ré · A/D faz curvas · Espaço freio de mão · C câmera · R volta à pista',
      legend_car: 'Carro',
      legend_track: 'Circuito',
      legend_lang: 'Idioma',
      badge_current: 'Atual',
      badge_best: 'Melhor ',
      btn_start: 'Começar',
      btn_continue: 'Continuar',
      btn_resume_driving: 'Voltar a dirigir',
      btn_apply_race: 'Aplicar e correr',
      btn_bench: 'Benchmark',
      btn_repeat_bench: 'Repetir benchmark',
      tag_bench: 'Benchmark: volta roteirizada de 60 s · Esc cancela',
      tag_replay: 'Volta roteirizada · R assume o volante · Esc menu',
      tag_pose: 'Pose {n} · {name} · 1 a {total} trocam · Esc volta a dirigir',
      hud_timer_labels: ['VOLTA', 'ÚLTIMA', 'MELHOR'],
      hud_stats_labels: ['QPS', 'QUADRO', 'GPU'],
      bench_calculating: '<h2>Benchmark · calculando…</h2>',
      bench_title: '<h2>Benchmark · volta roteirizada de 60 s · {w}×{h}</h2>',
      bench_avg: 'média (ms)',
      bench_p99: 'percentil 99 (ms)',
      bench_max: 'máximo (ms)',
      bench_frame_time: 'Tempo de quadro',
      bench_gpu_time: 'Tempo de GPU',
      bench_unavailable: 'indisponível neste navegador',
      bench_summary: '{over} de {total} quadros passaram de 16,7 ms de intervalo{gpuOver} · {fps} quadros por segundo',
      bench_gpu_over: ' · {n} passaram de 16,7 ms de GPU',

      // Controles
      controls_summary: 'Controles e atalhos',
      controls_keyboard: 'Teclado',
      controls_gamepad: 'Controle',
      controls_tools: 'Ferramentas',
      ctrl_w: 'acelera',
      ctrl_s: 'freia e dá ré',
      ctrl_ad: 'faz curvas',
      ctrl_space: 'freio de mão',
      ctrl_c: 'troca a câmera',
      ctrl_v: 'olha para trás',
      ctrl_r: 'devolve o carro à pista',
      ctrl_esc: 'pausa e abre este menu',
      gp_rt: 'Gatillo direito',
      gp_lt: 'Gatillo esquerdo',
      gp_stick: 'Analógico esquerdo',
      gp_rb: 'RB (segurar)',
      gp_start: 'abre este menu',
      tool_m: 'liga e desliga o som',
      tool_h: 'estatísticas de desempenho',
      tool_b: 'benchmark (volta de 60 s)',
      tool_f: 'assistir à volta roteirizada',
      tool_poses: 'poses fixas',
      tool_footer: 'Câmbio automático · a volta conta ao cruzar a linha de largada',

      // Coches
      cars: {
        'porsche-911-1979': {
          name: 'Porsche 911 / 935 Turbo',
          subtitle: '1979 Porsche 935 Slantnose · Flat-6 Twin-Turbo · RWD',
          specs: '1025 kg · 750 CV · Aero Downforce · Motor traseiro · RWD',
        },
        'uno-mille-1996': {
          name: 'Uno com escada',
          subtitle: 'Fiat Uno Mille EP 1996',
          specs: '900 kg · 5 marchas · FWD · Escada no teto',
        },
        'mclaren-x2-2018': {
          name: 'McLaren Ultimate Vision GT',
          subtitle: '2018 Conceito Vision Gran Turismo · 4.0L V8 Twin-Turbo Híbrido · AWD',
          specs: '1000 kg · 1150 CV · Efeito Solo · Aero Ativa · AWD',
        },
        'bmw-m8-gte-2018': {
          name: 'BMW M8 GTE',
          subtitle: '2018 Protótipo Le Mans & IMSA · 4.0L V8 Twin-Turbo · RWD',
          specs: '1220 kg · 600 CV · Aero Spec Le Mans · Xtrac 6 marchas sequencial · RWD',
        },
        'mercedes-amg-gt3-2020': {
          name: 'Mercedes-AMG GT3 Evo',
          subtitle: '2020 Spec GT3 · 6.2L V8 Aspirado · RWD',
          specs: '1285 kg · 550 CV · Transaxle Hewland 6 marchas · RWD · Aero GT3 Evo',
        },
        'porsche-992-gt3-r-2024': {
          name: 'Porsche 911 GT3 R (992)',
          subtitle: '2024 Spec 24h Nürburgring & GT3 · 4.2L Flat-6 Boxer · RWD',
          specs: '1250 kg · 565 CV · 9250 RPM · Aerodinâmica Swan-Neck · RWD',
        },
        'nissan-gtr-gt3-2018': {
          name: 'Nissan GT-R Nismo GT3',
          subtitle: '2018 Spec GT3 · 3.8L Twin-Turbo V6 VR38DETT · RWD',
          specs: '1290 kg · 550 CV · Hewland 6 marchas seq · RWD · Aero Nismo',
        },
      },

      // Circuitos
      tracks: {
        'nurburgring-gp': {
          name: 'Nürburgring GP',
          subtitle: 'GP-Strecke',
          specs: '5,15 km · 16 curvas · Largura FIA GT3 · Traçado oficial de Grande Prêmio',
        },
        'nurburgring-nordschleife': {
          name: 'Nürburgring Nordschleife',
          subtitle: 'Inferno Verde',
          specs: '6,86 km · O Inferno Verde · Flugplatz, Fuchsröhre, Karussell e Döttinger Höhe',
        },
        'nurburgring-24h': {
          name: 'Nürburgring 24 Horas',
          subtitle: '24h Gesamstrecke',
          specs: '8,55 km · Resistência 24 Horas · GP Paddock, Arena e todo o Inferno Verde',
        },
      },
    },
  },

  init() {
    let saved = null;
    try {
      if (typeof location !== 'undefined' && location.search) {
        const p = new URLSearchParams(location.search);
        if (p.has('lang')) saved = p.get('lang');
      }
      if (!saved && typeof localStorage !== 'undefined') {
        saved = localStorage.getItem('race_game_lang');
      }
    } catch (e) {}

    if (saved && I18N.locales[saved]) {
      I18N.lang = saved;
    } else {
      I18N.lang = 'en'; // Por defecto siempre inglés
    }
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = I18N.lang;
    }
    if (typeof document !== 'undefined' && document.body) {
      I18N.updateDOM();
    }
  },

  setLang(code) {
    if (!I18N.locales[code]) return;
    I18N.lang = code;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('race_game_lang', code);
      }
    } catch (e) {}
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = code;
    }
    I18N.updateDOM();
  },

  t(key, params) {
    const dict = I18N.locales[I18N.lang] || I18N.locales.en;
    let val = dict[key] !== undefined ? dict[key] : (I18N.locales.en[key] || key);
    if (typeof val === 'string' && params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replaceAll('{' + k + '}', String(v));
      }
    }
    return val;
  },

  carName(c) {
    if (!c) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en;
    return (dict.cars[c.id] && dict.cars[c.id].name) || c.name;
  },

  carSub(c) {
    if (!c) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en;
    return (dict.cars[c.id] && dict.cars[c.id].subtitle) || c.subtitle || c.name;
  },

  carSpecs(c) {
    if (!c) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en;
    return (dict.cars[c.id] && dict.cars[c.id].specs) || c.specs || '';
  },

  trackName(t) {
    if (!t) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en;
    return (dict.tracks[t.id] && dict.tracks[t.id].name) || t.name;
  },

  trackSub(t) {
    if (!t) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en;
    return (dict.tracks[t.id] && dict.tracks[t.id].subtitle) || t.subtitle || t.name;
  },

  trackSpecs(t) {
    if (!t) return '';
    const dict = I18N.locales[I18N.lang] || I18N.locales.en;
    return (dict.tracks[t.id] && dict.tracks[t.id].specs) || t.specs || '';
  },

  updateDOM() {
    if (typeof document === 'undefined') return;

    // Actualiza textos fijos con data-i18n
    const els = document.querySelectorAll('[data-i18n]');
    for (const el of els) {
      const k = el.getAttribute('data-i18n');
      if (k) el.textContent = I18N.t(k);
    }

    // Actualiza botones de idioma
    const langBtns = document.querySelectorAll('.lang-btn');
    for (const b of langBtns) {
      b.classList.toggle('active', b.getAttribute('data-lang') === I18N.lang);
    }

    // Título y subtítulo en el panel UI
    const car = (typeof CARS !== 'undefined' && CARS.active) || null;
    const trk = (typeof TRACKS !== 'undefined' && TRACKS.active) || null;
    if (car && trk) {
      const h1 = document.getElementById('ui-title');
      const sub = document.querySelector('#ui .sub');
      const carNm = I18N.carName(car);
      const trkNm = I18N.trackSub(trk);
      if (h1) h1.textContent = carNm;
      if (sub) sub.textContent = I18N.carSub(car) + ' · ' + trkNm;
      document.title = carNm + ' — ' + trkNm;
    }

    // Hint y Msg
    const msg = document.getElementById('msg');
    if (msg && msg.textContent && msg.textContent.includes('…')) msg.textContent = I18N.t('loading');
    const hint = document.getElementById('hint');
    if (hint) hint.textContent = I18N.t('hint');

    // Reconstruye selectores de coche/circuito para reflejar nombres e idiomas
    if (typeof uiBuildSelectors === 'function') uiBuildSelectors();
    if (typeof uiUpdatePrimaryBtn === 'function') uiUpdatePrimaryBtn();

    // Reconstruye HUD strips (LAPS, STATS) con los rótulos traducidos
    if (typeof hudLayout === 'function' && typeof HUD !== 'undefined' && HUD.cg) hudLayout();
  },
};

I18N.init();
if (typeof window !== 'undefined') window.I18N = I18N;
