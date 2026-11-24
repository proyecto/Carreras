# Guía de Creación e Integración de Coches (Data-Driven)

En el simulador **Carreras WebGPU**, los coches utilizan una arquitectura guiada por datos (*Data-Driven*). Ya no es necesario escribir código imperativo de renderizado WebGPU, vinculación de búferes, cálculos matriciales de cinemática de ruedas o shaders repetitivos. Todo se gestiona automáticamente a través de `CarFactory`.

---

## 🏎️ Cómo añadir un coche nuevo en 3 sencillos pasos

### Paso 1: Crea la especificación del coche (`cars/mi-coche.json` o `cars/mi-coche.spec.js`)

Puedes copiar y modificar la plantilla base de [car.template.json](file:///Users/rafaelruiz/Documents/proyectos/Carreras/cars/car.template.json):

```json
{
  "id": "mi-coche-gt3",
  "name": "Mi Coche GT3",
  "subtitle": "2024 GT3 Spec · 4.0L V8 · 550 CV · RWD",
  "specs": "1250 kg · 550 CV · Secuencial 6-vel · RWD",
  "accent": "#ff3300",
  "physics": {
    "m": 1250,
    "Izz": 1650,
    "L": 2.50,
    "a": 1.45,
    "b": 1.05,
    "tw": 1.68,
    "h": 0.38,
    "R": 0.340,
    "mu": 1.72,
    "B": 11.5,
    "C": 1.52,
    "driveF": 0.0,
    "gears": [2.90, 2.10, 1.62, 1.30, 1.08, 0.90],
    "final": 3.55,
    "rev": 3.10,
    "eff": 0.96,
    "cdA": 0.65,
    "crr": 0.010,
    "brakeF": 0.58,
    "halfW": 1.02,
    "front": 2.45,
    "rear": 2.50,
    "clA": 0.96,
    "aeroSplitF": 0.38,
    "torqueBase": 380,
    "torquePeak": 210,
    "torqueDrop": 160,
    "torquePeakStart": 0.55,
    "torquePeakSpan": 4.5,
    "torqueDropRpm": 8.5,
    "shiftUpRpm": 8500,
    "shiftDownRpm": 6500,
    "revLimitRpm": 9000,
    "maxRpm": 9200,
    "idleRpm": 1200
  },
  "hud": {
    "maxKmh": 330,
    "maxRpm": 10.0,
    "redlineRpm": 8.8
  },
  "wheelbase": 2.50,
  "trackF": 1.70,
  "trackR": 1.68,
  "wheelR": 0.340,
  "hubs": [
    [1.30, 0.35, -0.84],
    [1.30, 0.35, 0.84],
    [-1.20, 0.35, -0.84],
    [-1.20, 0.35, 0.84]
  ],
  "model": "cars/models/mi-coche.glb",
  "texture": "cars/textures/mi-coche-atlas.png"
}
```

> [!TIP]
> Si deseas definirlo en formato JS para no requerir servidor HTTP local (`file://`), puedes crear `cars/mi-coche.js` envolviendo la especificación en:
>
> ```javascript
> 'use strict';
> (() => {
>   CarFactory.createFromSpec({
>     id: 'mi-coche-gt3',
>     name: 'Mi Coche GT3',
>     /* ... resto de parámetros de física y geometría ... */
>   });
> })();
> ```

---

### Paso 2: Modelo 3D y Texturas

`CarFactory` soporta los siguientes formatos de geometría:

1. **Modelo GLB (`.glb`)**: Exportado directamente desde Blender con mallas nombradas `body` (carrocería), `glass` (cristales) y `wheel` (ruedas).
2. **Búferes de vértices e índices**: Puedes pasar arrays de vértices o cadenas Base64 en `bodyV`, `bodyI`, `glassV`, `glassI`, `wheelV`, `wheelI`.
3. **Textura Atlas**: Imagen PNG o WebP, o cadena Data URI.

Si no defines un shader específico, `CarFactory` asigna automáticamente el material PBR universal `mat_car_default` con sombreado de carrocería lacada, llantas metálicas, neumáticos mates e interior de fibra de carbono.

---


### Paso 3: Regístralo en el catálogo (`cars/manifest.json`)

Añade una entrada al array de `cars/manifest.json`:

```json
{
  "id": "mi-coche-gt3",
  "name": "Mi Coche GT3",
  "subtitle": "2024 GT3 Spec · 4.0L V8 · 550 CV · RWD",
  "specs": "1250 kg · 550 CV · Secuencial 6-vel · RWD",
  "accent": "#ff3300",
  "json": "cars/mi-coche-gt3.json",
  "model": "cars/models/mi-coche-gt3.glb",
  "texture": "cars/textures/mi-coche-gt3.png"
}
```

¡Listo! El vehículo aparecerá automáticamente en el selector de coches, en la parrilla de rivales IA, en la física a 120 Hz y en el sistema de telemetría y HUD.
