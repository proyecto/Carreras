(function (RootScope) {
  "use strict";
  /**
   * EventBus - Patrón Observer (Publicador / Suscriptor)
   * Desacopla la emisión de eventos de juego (vueltas, récords, colisiones,
   * cambios de estado, rebind de controles) de los módulos suscriptores (HUD, Audio, UI, Telemetría).
   */

  class EventBus {
    constructor() {
      this._listeners = new Map();
    }

    /**
     * Suscribe una función callback a un evento específico.
     * @param {string} event - Nombre del evento (ej: 'lap:complete', 'collision')
     * @param {Function} callback - Función manejadora
     * @returns {Function} Función para cancelar la suscripción
     */
    on(event, callback) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, []);
      }
      const handlers = this._listeners.get(event);
      handlers.push(callback);
      return () => this.off(event, callback);
    }

    /**
     * Suscribe un manejador que solo se ejecuta una única vez.
     */
    once(event, callback) {
      const unsub = this.on(event, (...args) => {
        unsub();
        callback(...args);
      });
      return unsub;
    }

    /**
     * Cancela la suscripción de un manejador.
     */
    off(event, callback) {
      const handlers = this._listeners.get(event);
      if (!handlers) return;
      const idx = handlers.indexOf(callback);
      if (idx !== -1) handlers.splice(idx, 1);
    }

    /**
     * Emite un evento síncrono a todos los suscriptores registrados.
     */
    emit(event, payload) {
      const handlers = this._listeners.get(event);
      if (handlers && handlers.length > 0) {
        for (let i = 0; i < handlers.length; i++) {
          try {
            handlers[i](payload);
          } catch (err) {
            console.error(`[EventBus] Error en manejador de "${event}":`, err);
          }
        }
      }
      // Soporte para oyentes globales comodín (*)
      const wildcards = this._listeners.get("*");
      if (wildcards && wildcards.length > 0) {
        for (let i = 0; i < wildcards.length; i++) {
          try {
            wildcards[i](event, payload);
          } catch (err) {
            console.error(`[EventBus] Error en comodín de "${event}":`, err);
          }
        }
      }
    }

    /**
     * Elimina todos los oyentes registrados.
     */
    clear() {
      this._listeners.clear();
    }
  }

  // Instancia única (Singleton) del EventBus
  const EventBusSingleton = new EventBus();

  RootScope.EventBus = EventBus;
  RootScope.EventBusSingleton = EventBusSingleton;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { EventBus, EventBusSingleton };
  }
})(
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this,
);
