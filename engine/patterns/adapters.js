(function (RootScope) {
  "use strict";
  /**
   * Adapters - Patrón Adapter (Entrada y Almacenamiento)
   * Adapta APIs del navegador (localStorage, KeyboardEvent, Gamepad API)
   * a las interfaces limpias e independientes requeridas por el motor de simulación.
   */
  const ADAPTERS_CFG =
    (typeof window !== "undefined" && window.__CFG_ENGINE_PATTERNS_ADAPTERS) ||
    (typeof require === "function"
      ? (() => {
          try {
            return require("../../config/engine/patterns/adapters.json");
          } catch {
            return {};
          }
        })()
      : {});

  /**
   * StorageAdapter: Adapta localStorage con fallback automático en memoria
   * para guardar controles, tiempos récord y opciones sin fallos de cuota o seguridad.
   */
  class StorageAdapter {
    constructor() {
      this._memory = new Map();
      this._hasLocalStorage = false;
      try {
        if (typeof localStorage !== "undefined") {
          const stCfg = ADAPTERS_CFG.StorageAdapter || {};
          const tKey = stCfg.testKey ? stCfg.testKey.value : "__test__";
          const tVal = stCfg.testValue ? stCfg.testValue.value : "1";
          localStorage.setItem(tKey, tVal);
          localStorage.removeItem(tKey);
          this._hasLocalStorage = true;
        }
      } catch {
        this._hasLocalStorage = false;
      }
    }

    getItem(key) {
      if (this._hasLocalStorage) {
        try {
          return localStorage.getItem(key);
        } catch {
          // Fallback a memoria
        }
      }
      return this._memory.has(key) ? this._memory.get(key) : null;
    }

    setItem(key, value) {
      const str = String(value);
      if (this._hasLocalStorage) {
        try {
          localStorage.setItem(key, str);
          return;
        } catch {
          // Si falla cuota, guardar en memoria
        }
      }
      this._memory.set(key, str);
    }

    removeItem(key) {
      if (this._hasLocalStorage) {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignorar
        }
      }
      this._memory.delete(key);
    }

    getJSON(key, defaultValue = null) {
      const val = this.getItem(key);
      if (!val) return defaultValue;
      try {
        return JSON.parse(val);
      } catch {
        return defaultValue;
      }
    }

    setJSON(key, value) {
      try {
        this.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.warn(
          `[StorageAdapter] Error al serializar JSON para ${key}:`,
          err,
        );
      }
    }
  }

  const StorageAdapterSingleton = new StorageAdapter();

  /**
   * KeyboardInputAdapter: Adapta eventos de teclado del navegador al bitmask del simulador.
   */
  class KeyboardInputAdapter {
    constructor(keyBindings = null) {
      const kbCfg = ADAPTERS_CFG.KeyboardInputAdapter || {};
      this.bindings =
        keyBindings ||
        (kbCfg.defaultBindings
          ? kbCfg.defaultBindings.value
          : {
              forward: ["KeyW", "ArrowUp"],
              brake: ["KeyS", "ArrowDown"],
              steerLeft: ["KeyA", "ArrowLeft"],
              steerRight: ["KeyD", "ArrowRight"],
              handbrake: ["Space", ""],
              gearUp: ["KeyE", "KeyX"],
              gearDown: ["KeyQ", "KeyZ"],
              camera: ["KeyC", ""],
              pause: ["Escape", "KeyP"],
            });
      this.activeKeys = new Set();
    }

    handleKeyDown(code) {
      this.activeKeys.add(code);
    }

    handleKeyUp(code) {
      this.activeKeys.delete(code);
    }

    pollBitmask() {
      let mask = 0;
      const kbCfg = ADAPTERS_CFG.KeyboardInputAdapter || {};
      const bm = kbCfg.bitmask
        ? kbCfg.bitmask.value
        : {
            forward: 1,
            brake: 2,
            steerLeft: 4,
            steerRight: 8,
            handbrake: 16,
            gearUp: 32,
            gearDown: 64,
            camera: 128,
            pause: 256,
          };
      const has = (action) => {
        const keys = this.bindings[action];
        if (!keys) return false;
        return keys.some((k) => k && this.activeKeys.has(k));
      };

      if (has("forward")) mask |= bm.forward;
      if (has("brake")) mask |= bm.brake;
      if (has("steerLeft")) mask |= bm.steerLeft;
      if (has("steerRight")) mask |= bm.steerRight;
      if (has("handbrake")) mask |= bm.handbrake;
      if (has("gearUp")) mask |= bm.gearUp;
      if (has("gearDown")) mask |= bm.gearDown;
      if (has("camera")) mask |= bm.camera;
      if (has("pause")) mask |= bm.pause;
      return mask;
    }
  }

  /**
   * GamepadInputAdapter: Adapta el API navigator.getGamepads a la entrada analógica del motor.
   */
  class GamepadInputAdapter {
    constructor(deadzone = null) {
      const gpCfg = ADAPTERS_CFG.GamepadInputAdapter || {};
      this.deadzone =
        deadzone !== null
          ? deadzone
          : gpCfg.defaultDeadzone
            ? gpCfg.defaultDeadzone.value
            : 0.08;
      this._steerAxis = gpCfg.steerAxis ? gpCfg.steerAxis.value : 0;
      this._throttleBtn = gpCfg.throttleButton ? gpCfg.throttleButton.value : 7;
      this._brakeBtn = gpCfg.brakeButton ? gpCfg.brakeButton.value : 6;
      this._handbrakeBtn = gpCfg.handbrakeButton
        ? gpCfg.handbrakeButton.value
        : 0;
    }

    poll() {
      if (typeof navigator === "undefined" || !navigator.getGamepads) {
        return {
          connected: false,
          steer: 0,
          throttle: 0,
          brake: 0,
          handbrake: 0,
        };
      }
      const gps = navigator.getGamepads();
      if (!gps || !gps[0]) {
        return {
          connected: false,
          steer: 0,
          throttle: 0,
          brake: 0,
          handbrake: 0,
        };
      }
      const gp = gps[0];
      let steer =
        gp.axes && gp.axes.length > this._steerAxis
          ? gp.axes[this._steerAxis]
          : 0;
      if (Math.abs(steer) < this.deadzone) steer = 0;

      let throttle = 0;
      let brake = 0;
      if (gp.buttons) {
        if (gp.buttons[this._throttleBtn])
          throttle =
            gp.buttons[this._throttleBtn].value !== undefined
              ? gp.buttons[this._throttleBtn].value
              : gp.buttons[this._throttleBtn].pressed
                ? 1
                : 0;
        if (gp.buttons[this._brakeBtn])
          brake =
            gp.buttons[this._brakeBtn].value !== undefined
              ? gp.buttons[this._brakeBtn].value
              : gp.buttons[this._brakeBtn].pressed
                ? 1
                : 0;
      }

      const handbrake =
        gp.buttons &&
        gp.buttons[this._handbrakeBtn] &&
        gp.buttons[this._handbrakeBtn].pressed
          ? 1
          : 0;
      return { connected: true, steer, throttle, brake, handbrake };
    }
  }

  RootScope.StorageAdapter = StorageAdapter;
  RootScope.StorageAdapterSingleton = StorageAdapterSingleton;
  RootScope.KeyboardInputAdapter = KeyboardInputAdapter;
  RootScope.GamepadInputAdapter = GamepadInputAdapter;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      StorageAdapter,
      StorageAdapterSingleton,
      KeyboardInputAdapter,
      GamepadInputAdapter,
    };
  }
})(
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this,
);
