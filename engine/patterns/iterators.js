(function (RootScope) {
  "use strict";
  /**
   * Iterators - Patrón Iterator
   * Implementa el protocolo iterable estándar de ES6 para recorrer
   * waypoints de pista y colecciones de vehículos/circuitos.
   */

  /**
   * TrackWaypointIterator: Implementa el protocolo Iterator estándar para recorrer
   * los waypoints de la línea de carrera de un circuito sin desbordamientos de array.
   */
  class TrackWaypointIterator {
    constructor(waypoints, cyclic = true) {
      this.waypoints = waypoints || [];
      this.cyclic = cyclic;
      this.index = 0;
    }

    [Symbol.iterator]() {
      return this;
    }

    next() {
      if (this.waypoints.length === 0) {
        return { done: true, value: undefined };
      }
      if (this.index >= this.waypoints.length) {
        if (this.cyclic) {
          this.index = 0;
        } else {
          return { done: true, value: undefined };
        }
      }
      const value = this.waypoints[this.index++];
      return { done: false, value };
    }

    reset() {
      this.index = 0;
    }
  }

  /**
   * CatalogIterator: Itera colecciones de coches o circuitos con soporte de filtrado dinámico.
   */
  class CatalogIterator {
    constructor(items, filterPredicate = null) {
      this.items = filterPredicate ? items.filter(filterPredicate) : [...items];
      this.index = 0;
    }

    [Symbol.iterator]() {
      return this;
    }

    next() {
      if (this.index < this.items.length) {
        return { done: false, value: this.items[this.index++] };
      }
      return { done: true, value: undefined };
    }
  }

  RootScope.TrackWaypointIterator = TrackWaypointIterator;
  RootScope.CatalogIterator = CatalogIterator;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      TrackWaypointIterator,
      CatalogIterator,
    };
  }
})(
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this,
);
