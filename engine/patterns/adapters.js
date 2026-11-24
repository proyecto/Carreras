(function (RootScope) {
  'use strict';
  /**
   * Adapters - Patrón Adapter (Entrada y Almacenamiento)
   * Adapta APIs del navegador (localStorage, KeyboardEvent, Gamepad API)
   * a las interfaces limpias e independientes requeridas por el motor de simulación.
   */

  /**
   * StorageAdapter: Adapta localStorage con fallback automático en memoria
   * para guardar controles, tiempos récord y opciones sin fallos de cuota o seguridad.
   */
  class StorageAdapter {
    constructor() {
      this._memory = new Map();
      this._hasLocalStorage = false;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('__test__', '1');
          localStorage.removeItem('__test__');
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
        console.warn(`[StorageAdapter] Error al serializar JSON para ${key}:`, err);
      }
    }
  }

  const StorageAdapterSingleton = new StorageAdapter();

  /**
   * KeyboardInputAdapter: Adapta eventos de teclado del navegador al bitmask del simulador.
   */
  class KeyboardInputAdapter {
    constructor(keyBindings = null) {
      this.bindings = keyBindings || {
        forward: ['KeyW', 'ArrowUp'],
        brake: ['KeyS', 'ArrowDown'],
        steerLeft: ['KeyA', 'ArrowLeft'],
        steerRight: ['KeyD', 'ArrowRight'],
        handbrake: ['Space', ''],
        gearUp: ['KeyE', 'KeyX'],
        gearDown: ['KeyQ', 'KeyZ'],
        camera: ['KeyC', ''],
        pause: ['Escape', 'KeyP']
      };
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
      const has = (action) => {
        const keys = this.bindings[action];
        if (!keys) return false;
        return keys.some(k => k && this.activeKeys.has(k));
      };

      if (has('forward')) mask |= 1;       // K_W
      if (has('brake')) mask |= 2;         // K_S
      if (has('steerLeft')) mask |= 4;     // K_A
      if (has('steerRight')) mask |= 8;    // K_D
      if (has('handbrake')) mask |= 16;    // K_SPACE
      if (has('gearUp')) mask |= 32;       // K_E
      if (has('gearDown')) mask |= 64;     // K_Q
      if (has('camera')) mask |= 128;      // K_C
      if (has('pause')) mask |= 256;       // K_ESC
      return mask;
    }
  }

  /**
   * GamepadInputAdapter: Adapta el API navigator.getGamepads a la entrada analógica del motor.
   */
  class GamepadInputAdapter {
    constructor(deadzone = 0.08) {
      this.deadzone = deadzone;
    }

    poll() {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) {
        return { connected: false, steer: 0, throttle: 0, brake: 0, handbrake: 0 };
      }
      const gps = navigator.getGamepads();
      if (!gps || !gps[0]) {
        return { connected: false, steer: 0, throttle: 0, brake: 0, handbrake: 0 };
      }
      const gp = gps[0];
      let steer = gp.axes && gp.axes.length > 0 ? gp.axes[0] : 0;
      if (Math.abs(steer) < this.deadzone) steer = 0;

      let throttle = 0;
      let brake = 0;
      if (gp.buttons) {
        if (gp.buttons[7]) throttle = gp.buttons[7].value !== undefined ? gp.buttons[7].value : (gp.buttons[7].pressed ? 1 : 0);
        if (gp.buttons[6]) brake = gp.buttons[6].value !== undefined ? gp.buttons[6].value : (gp.buttons[6].pressed ? 1 : 0);
      }

      const handbrake = (gp.buttons && gp.buttons[0] && gp.buttons[0].pressed) ? 1 : 0;
      return { connected: true, steer, throttle, brake, handbrake };
    }
  }

  RootScope.StorageAdapter = StorageAdapter;
  RootScope.StorageAdapterSingleton = StorageAdapterSingleton;
  RootScope.KeyboardInputAdapter = KeyboardInputAdapter;
  RootScope.GamepadInputAdapter = GamepadInputAdapter;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      StorageAdapter,
      StorageAdapterSingleton,
      KeyboardInputAdapter,
      GamepadInputAdapter
    };
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
