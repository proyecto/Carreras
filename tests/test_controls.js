"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function runControlsTestSuite() {
  console.log(
    "\n--- [TEST SUITE] Validación de Controles y Rebinding (game/game.js) ---",
  );
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

  const root = path.resolve(__dirname, "..");
  const physicsCode = fs.readFileSync(
    path.join(root, "game", "physics.js"),
    "utf-8",
  );
  const gameCode = fs.readFileSync(
    path.join(root, "game", "controls.js"),
    "utf-8",
  );

  // Crear contexto VM
  const mockStorage = {};
  const ctx = {
    console,
    Math,
    Float32Array,
    Float64Array,
    Int32Array,
    Uint8Array,
    JSON,
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    m4: () => new Float32Array(16),
    m4mul: () => {},
    m4rotX: () => {},
    m4rotY: () => {},
    m4rotZ: () => {},
    m4translate: () => {},
    objSlot: () => 0,
    objPrev: () => new Float32Array(16),
    objModel: () => new Float32Array(16),
    mkFamily: () => ({}),
    MeshBuilder: function () {
      this.mat = () => this;
      this.color = () => this;
      this.rbox = () => this;
      this.box = () => this;
      this.cyl = () => this;
      this.push = () => this;
      this.pop = () => this;
      this.upload = () => ({});
    },
    MeshSet: function () {
      this.add = () => {};
    },
    R: { families: {}, drawables: [] },
    VP: { R: 0.33, L: 2.6 },
    PI: Math.PI,
    Q: new Map(),
    REPLAY_B64: "",
    GAME: {},
    BUILD: [],
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => {
        mockStorage[k] = String(v);
      },
      removeItem: (k) => {
        delete mockStorage[k];
      },
    },
  };

  vm.createContext(ctx);
  vm.runInContext(physicsCode + "\n" + gameCode, ctx);
  vm.runInContext(
    "this.CONTROLS = CONTROLS; this.KEYMAP = KEYMAP; this.K_W = K_W; this.K_S = K_S; this.K_A = K_A; this.K_D = K_D; this.K_SPACE = K_SPACE;",
    ctx,
  );

  const CONTROLS = ctx.CONTROLS;
  const KEYMAP = ctx.KEYMAP;
  const K_W = ctx.K_W;
  const K_S = ctx.K_S;
  const K_A = ctx.K_A;
  const K_D = ctx.K_D;
  const K_SPACE = ctx.K_SPACE;

  assert(CONTROLS !== undefined, "CONTROLS debe estar definido en el entorno");
  assert(typeof CONTROLS.init === "function", "CONTROLS.init debe ser función");
  assert(
    typeof CONTROLS.setKey === "function",
    "CONTROLS.setKey debe ser función",
  );
  assert(
    typeof CONTROLS.reset === "function",
    "CONTROLS.reset debe ser función",
  );

  // 1. Valores por defecto
  assert(
    CONTROLS.keys.accel[0] === "KeyW" && CONTROLS.keys.accel[1] === "ArrowUp",
    "Acelerar por defecto: KeyW y ArrowUp",
  );
  assert(KEYMAP["KeyW"] === K_W, 'KEYMAP["KeyW"] debe mapear a K_W');
  assert(KEYMAP["ArrowUp"] === K_W, 'KEYMAP["ArrowUp"] debe mapear a K_W');
  assert(KEYMAP["KeyS"] === K_S, 'KEYMAP["KeyS"] debe mapear a K_S');
  assert(KEYMAP["Space"] === K_SPACE, 'KEYMAP["Space"] debe mapear a K_SPACE');

  // 2. Formato de nombres de teclas
  assert(CONTROLS.formatKey("KeyW") === "W", "formatKey(KeyW) -> W");
  assert(CONTROLS.formatKey("ArrowUp") === "↑", "formatKey(ArrowUp) -> ↑");
  assert(
    CONTROLS.formatKey("Space") === "Espacio",
    "formatKey(Space) -> Espacio",
  );
  assert(CONTROLS.formatKey("") === "—", 'formatKey("") -> —');

  // 3. Reasignar tecla (Rebind)
  CONTROLS.setKey("accel", 0, "KeyI");
  assert(
    CONTROLS.keys.accel[0] === "KeyI",
    "Acelerar ranura 0 debe ser KeyI tras reasignar",
  );
  assert(KEYMAP["KeyI"] === K_W, 'KEYMAP["KeyI"] debe ser K_W');
  assert(
    KEYMAP["KeyW"] === undefined,
    'KEYMAP["KeyW"] antiguo debe quedar eliminado',
  );

  // 4. Resolución de conflicto (reasignar una tecla ya usada a otra acción)
  // Por ejemplo, asignar 'KeyI' a 'brake' ranura 0:
  CONTROLS.setKey("brake", 0, "KeyI");
  assert(CONTROLS.keys.brake[0] === "KeyI", "Freno ranura 0 debe ser KeyI");
  assert(
    CONTROLS.keys.accel[0] === "",
    "Acelerar ranura 0 debe haberse liberado para evitar conflictos",
  );
  assert(KEYMAP["KeyI"] === K_S, 'KEYMAP["KeyI"] debe ser ahora K_S');

  // 5. Restablecer controles (Reset)
  CONTROLS.reset();
  assert(
    CONTROLS.keys.accel[0] === "KeyW",
    "Tras reset, Acelerar ranura 0 vuelve a ser KeyW",
  );
  assert(
    CONTROLS.keys.brake[0] === "KeyS",
    "Tras reset, Freno ranura 0 vuelve a ser KeyS",
  );
  assert(KEYMAP["KeyW"] === K_W, 'KEYMAP["KeyW"] vuelve a ser K_W');

  // 6. Comprobación de atajos de interfaz (mute y stats)
  assert(
    CONTROLS.isKey("mute", "KeyM") === true,
    "isKey(mute, KeyM) debe ser true",
  );
  assert(
    CONTROLS.isKey("stats", "KeyH") === true,
    "isKey(stats, KeyH) debe ser true",
  );
  assert(
    CONTROLS.isKey("stats", "KeyZ") === false,
    "isKey(stats, KeyZ) debe ser false",
  );

  console.log(`  ✓ Gestor de Controles verificado [${passed} asserts OK]`);
  console.log(
    `Resultado Controles: ${passed} aserciones correctas, ${failed} fallos.`,
  );
  return { passed, failed };
}

module.exports = { runControlsTestSuite };
if (require.main === module) {
  runControlsTestSuite();
}
