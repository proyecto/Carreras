'use strict';
// ---- 50_i18n.js
// Sistema de internacionalización del juego (español e inglés).
const I18N = {
  lang: 'es', // Español por defecto

  locales: {
    en: {
      lang_name: 'English',
      loading: 'loading…',
      loading_init_gpu: 'Initializing WebGPU…',
      loading_build_track: 'Generating track geometry and terrain…',
      loading_init_renderer: 'Configuring lighting and sky…',
      loading_build_car: 'Building car models and rival…',
      loading_build_world: 'Assembling track assets and vegetation…',
      loading_shadows: 'Rendering static shadow maps…',
      loading_cubemap: 'Computing environment reflections…',
      loading_prewarm: 'Pre-warming shaders and calibrating…',
      loading_ready: 'Ready to race!',
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
      btn_options: '⚙️ Options',
      btn_multiplayer: '🌐 Multiplayer',
      btn_back: '← Back',
      options_title: 'Options',
      options_lang_title: 'Language',
      options_controls_title: 'Controls & Keyboard',
      options_controls_hint: 'Click a key button to rebind. Press any key to assign, or Esc to cancel.',
      btn_reset_controls: 'Reset to default controls',
      press_key: 'Press key…',

      options_multiplayer_title: '🌐 Real-Time P2P Multiplayer',
      options_multiplayer_hint: 'Race wheel-to-wheel with another player via direct WebRTC (15-35 ms latency, peer-to-peer without server relay).',
      net_status_idle: 'Disconnected (Single Player)',
      net_status_connecting: 'Connecting to signaling server…',
      net_status_waiting: 'Waiting for rival to join room {room}…',
      net_status_connected: 'Connected P2P with rival!',
      net_host_title: 'Create Room (Host)',
      net_host_desc: 'Generate a room and share the link with a friend.',
      btn_net_create: 'Create Room',
      net_join_title: 'Join Room',
      net_join_desc: 'Enter the room code shared by the Host.',
      btn_net_join: 'Join',
      net_share_link: 'Share link with friend:',
      btn_copy_link: '📋 Copy Link',
      link_copied: 'Copied to clipboard!',

      rival_title: 'AI Rival Car',
      rival_btn_enabled: 'Rival: Enabled',
      rival_btn_disabled: 'Rival: Disabled (Solo)',
      options_rival_title: 'AI Rival Car',
      options_rival_hint: 'Choose whether you want an AI rival competing with you on the track or practice solo. The rival is chosen at random from all available real models.',
      btn_reroll_rival: '🎲 Change rival randomly',
      rival_status_on: 'Competing on track · Random model',
      rival_status_off: 'Solo practice · Empty track',
      rival_model_label: 'Current rival: {name}',

      action_accel: 'Accelerate',
      action_brake: 'Brake / Reverse',
      action_left: 'Steer left',
      action_right: 'Steer right',
      action_handbrake: 'Handbrake',
      action_camera: 'Change camera',
      action_look_back: 'Look back (hold)',
      action_reset: 'Reset car to track',
      action_mute: 'Toggle sound',
      action_stats: 'Performance stats',
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
        'ford-mustang-gt3-2024': {
          name: 'Ford Mustang GT3 (2024)',
          subtitle: '2024 WEC & IMSA Spec · 5.4L Coyote V8 · 540 HP · RWD',
          specs: '1280 kg · 540 HP · Hewland 6-speed seq · RWD · Multimatic Aero',
        },
        'ford-mustang-gt3': {
          name: 'Ford Mustang GT3',
          subtitle: 'Ford Performance GT3 Racer · 5.4L V8 · Carbon Spec · RWD',
          specs: '1270 kg · 535 HP · 6-speed seq · RWD · Multimatic Carbon Aero',
        },
      },

      // Circuitos
      tracks: {
        'nurburgring-gp': {
          name: 'Nürburgring GP',
          subtitle: 'GP-Strecke',
          specs: '5.15 km · 15 turns · FIA GT3 width · Official Grand Prix circuit',
        },
        'spa-francorchamps': {
          name: 'Spa-Francorchamps',
          subtitle: 'Circuit de Spa-Francorchamps',
          specs: '7.004 km · 19 turns · La Source, Eau Rouge, Raidillon, Pouhon & Blanchimont',
        },
        'las-vegas-strip': {
          name: 'Las Vegas Strip',
          subtitle: 'Las Vegas Strip Circuit · Night GP',
          specs: '6.20 km · 17 turns · Night Race · The Strip & MSG Sphere',
        },
      },
    },

    es: {
      lang_name: 'Español',
      loading: 'cargando…',
      loading_init_gpu: 'Inicializando WebGPU…',
      loading_build_track: 'Generando trazado y relieve del circuito…',
      loading_init_renderer: 'Configurando iluminación y atmósfera…',
      loading_build_car: 'Construyendo bólido y rival…',
      loading_build_world: 'Montando escenario, pianos y vegetación…',
      loading_shadows: 'Generando mapas de sombras estáticas…',
      loading_cubemap: 'Calculando reflejos y armónicos esféricos…',
      loading_prewarm: 'Precalentando shaders y calibrando…',
      loading_ready: '¡Listo para competir!',
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
      btn_options: '⚙️ Opciones',
      btn_multiplayer: '🌐 Multijugador',
      btn_back: '← Volver',
      options_title: 'Opciones',
      options_lang_title: 'Idioma / Language',
      options_controls_title: 'Controles y Teclado',
      options_controls_hint: 'Haz clic en una tecla para reasignarla. Pulsa cualquier tecla para asignarla o Esc para cancelar.',
      btn_reset_controls: 'Restablecer controles predeterminados',
      press_key: 'Pulsa tecla…',

      options_multiplayer_title: '🌐 Multijugador P2P en Tiempo Real',
      options_multiplayer_hint: 'Compite rueda contra rueda con otro jugador mediante WebRTC directo (latencia 15-35 ms, sin paso por servidor).',
      net_status_idle: 'Desconectado (Modo Un Jugador)',
      net_status_connecting: 'Conectando con el servidor de señalización…',
      net_status_waiting: 'Esperando a que el rival entre en la sala {room}…',
      net_status_connected: '¡Conectado P2P con el rival!',
      net_host_title: 'Crear Sala (Host)',
      net_host_desc: 'Genera una sala y comparte el enlace directo con un amigo.',
      btn_net_create: 'Crear Sala',
      net_join_title: 'Unirse a Sala',
      net_join_desc: 'Introduce el código de sala compartido por el Host.',
      btn_net_join: 'Unirse',
      net_share_link: 'Enlace para compartir con tu amigo:',
      btn_copy_link: '📋 Copiar Enlace',
      link_copied: '¡Copiado al portapapeles!',

      rival_title: 'Coche Rival IA',
      rival_btn_enabled: 'Rival: Activado',
      rival_btn_disabled: 'Rival: Desactivado (Solo)',
      options_rival_title: 'Coche Rival IA',
      options_rival_hint: 'Elige si quieres competir contra un rival IA en pista o rodar en solitario. El coche rival se escoge al azar entre todos los modelos reales disponibles.',
      btn_reroll_rival: '🎲 Cambiar rival al azar',
      rival_status_on: 'En pista compitiendo · Modelo al azar',
      rival_status_off: 'Práctica en solitario · Pista libre',
      rival_model_label: 'Rival actual: {name}',

      action_accel: 'Acelerar',
      action_brake: 'Frenar / Marcha atrás',
      action_left: 'Girar a la izquierda',
      action_right: 'Girar a la derecha',
      action_handbrake: 'Freno de mano',
      action_camera: 'Cambiar cámara',
      action_look_back: 'Mirar hacia atrás (mantener)',
      action_reset: 'Devolver coche a pista',
      action_mute: 'Activar/desactivar sonido',
      action_stats: 'Estadísticas de rendimiento',
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
        'ford-mustang-gt3-2024': {
          name: 'Ford Mustang GT3 (2024)',
          subtitle: '2024 Spec WEC & IMSA · 5.4L Coyote V8 · 540 CV · RWD',
          specs: '1280 kg · 540 CV · Hewland 6 marchas sec · RWD · Aero Multimatic',
        },
        'ford-mustang-gt3': {
          name: 'Ford Mustang GT3',
          subtitle: 'Ford Performance GT3 · 5.4L V8 · Carbon Spec · RWD',
          specs: '1270 kg · 535 CV · 6 marchas sec · RWD · Aero Carbono Multimatic',
        },
      },

      // Circuitos
      tracks: {
        'nurburgring-gp': {
          name: 'Nürburgring GP',
          subtitle: 'GP-Strecke',
          specs: '5,15 km · 15 curvas · Ancho FIA GT3 · Trazado oficial de Gran Premio',
        },
        'spa-francorchamps': {
          name: 'Spa-Francorchamps',
          subtitle: 'Circuit de Spa-Francorchamps',
          specs: '7,004 km · 19 curvas · La Source, Eau Rouge, Raidillon, Pouhon & Blanchimont',
        },
        'las-vegas-strip': {
          name: 'Las Vegas Strip',
          subtitle: 'Las Vegas Strip Circuit · Night GP',
          specs: '6,20 km · 17 curvas · Carrera Nocturna · The Strip & MSG Sphere',
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
      I18N.lang = 'es'; // Por defecto español
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
    if (typeof uiRenderControls === 'function') uiRenderControls();

    // Reconstruye HUD strips (LAPS, STATS) con los rótulos traducidos
    if (typeof hudLayout === 'function' && typeof HUD !== 'undefined' && HUD.cg) hudLayout();
  },
};

I18N.init();
if (typeof window !== 'undefined') window.I18N = I18N;
