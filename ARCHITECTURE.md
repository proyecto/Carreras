# Arquitectura del Sistema · Carreras WebGPU

Simulador de conducción de alto rendimiento construido en **JavaScript puro y WebGPU**, sin librerías externas de runtime, optimizado para ejecutarse a 60–120 FPS estables con **cero asignaciones de memoria por frame** (Zero-Allocation Loop).

---

## 1. Principios de Diseño

1. **Cero Dependencias de Runtime**: Motor gráfico, simulación física, síntesis de audio y renderizado de interfaz implementados directamente sobre APIs web nativas (WebGPU, Web Audio API, Canvas 2D).
2. **Cero Asignaciones por Frame (Zero-Allocation Loop)**: Los bucles de simulación física (`game/physics.js`) y renderizado gráfico (`engine/renderer.js`) reutilizan búferes tipados preasignados (`Float32Array`, `Int32Array`). No se generan objetos temporales en el heap para evitar pausas del recolector de basura (GC).
3. **Paso Físico Fijo a 120 Hz**: La física se integra a una frecuencia constante de 120 Hz (`dt = 1/120 s`), independientemente de la tasa de refresco del monitor, asegurando reproducibilidad y estabilidad numérica.
4. **Offline-First & Auto-contenido**: Todos los modelos 3D y texturas atlas están codificados de forma compacta en base64 en cada módulo de vehículo, garantizando que el proyecto funcione localmente sin necesidad de servidores ni descargas externas.

---

## 2. Pipeline Gráfico WebGPU

El motor implementa un pipeline de renderizado diferido (**Deferred Shading**) de última generación:

```
[Malla Estática / Dinámica]
          │
          ▼
   ┌──────────────┐
   │   G-Buffer   │ ──► Albedo (RGBA8), Normales Octaédricas (RG16F), Material/Rough/Metal (RGBA8), Velocidad (RG16F)
   └──────────────┘
          │
          ▼
   ┌──────────────┐
   │ Sombra CSM   │ ──► Cascadas de sombra ortográficas con alineación a nivel de texel (Texel Snapping)
   └──────────────┘
          │
          ▼
   ┌──────────────┐
   │  Iluminación │ ──► Sol directo PBR (BRDF GGX Smith), Armónicos Esféricos SH (L2) para cielo, Cubemap IBL
   └──────────────┘
          │
          ▼
   ┌──────────────┐
   │ Transparente │ ──► Pase Forward (GlassSet): 1) Multiplicación de transmitancia + 2) Suma aditiva de reflejos
   └──────────────┘
          │
          ▼
   ┌──────────────┐
   │ Post-Proceso │ ──► TAA (reproyección bicúbica) ──► Motion Blur (McGuire) ──► Bloom ──► Tone Mapping AgX
   └──────────────┘
```

### Características de Renderizado Clave:
- **Reverse-Z infinito**: Búfer de profundidad en formato `depth32float` con 1.0 en plano cercano y 0.0 en el infinito, maximizando la precisión logarítmica y eliminando el z-fighting en distancias de hasta 10 km.
- **Transparencias Dual-Pass (`engine/forward.js`)**:
  - `GLASS_MUL`: Multiplica el color del fondo por el tinte del cristal (`dst * tint`).
  - `GLASS_ADD`: Suma reflejos Fresnel del entorno y especulares solares (`dst + spec + env`).
- **Antialiasing Temporal (TAA)**: Matriz de proyección con jitter subpíxel Halton(2,3), recorte de varianza en espacio comprimido YCoCg y rechazo de ghosting mediante velocidad dilatada en vecindades 3x3.
- **Mapeo Tonal AgX**: Curva cinematográfica que preserva altas luces saturadas sin virajes tonales indeseados.

---

## 3. Modelo Físico del Vehículo (`game/physics.js`)

Simulación física de 4 ruedas con modelo de dos grados de libertad lateral y acoplamiento longitudinal:

- **Adherencia de Neumáticos (Fórmula Mágica de Pacejka)**:
  $$F_y = \mu \cdot F_z \cdot \sin\left(C \cdot \arctan\left(B \cdot \alpha - E \cdot (B \cdot \alpha - \arctan(B \cdot \alpha))\right)\right)$$
  Donde $\alpha$ es el ángulo de deriva lateral, $B$ es la rigidez y $C$ el factor de forma.
- **Elipse de Fricción**: Combina demanda longitudinal (tracción/frenada) y lateral (giro) respetando el límite circular $\sqrt{F_x^2 + F_y^2} \le \mu \cdot F_z$.
- **Transferencia Dinámica de Carga**:
  - Longitudinal: $\Delta F_z = \frac{m \cdot a_x \cdot h}{L}$
  - Lateral: $\Delta F_z = \frac{m \cdot a_y \cdot h}{tw}$
- **Downforce Aerodinámico**: Generación de sustentación negativa $F_{\text{down}} = \frac{1}{2} \rho \cdot c_l A \cdot v^2$ repartida porcentualmente entre eje delantero y trasero.
- **Transmisión y Drivetrain**: Configuración RWD, FWD o AWD según vehículo, con curva de par motor no lineal, freno motor y control de tracción activo (TCS).

---

## 4. Guía para Desarrolladores

### Cómo añadir un coche nuevo (`engine/car-factory.js`)

1. **Crear archivo del coche en `cars/<nombre-coche>.js`**:
   ```javascript
   'use strict';
   (() => {
     WGSL['mat_mi_coche'] = `... shader WGSL ...`;
     const CAR = CarFactory.defineCar({
       id: 'mi-coche-gt3',
       name: 'Mi Coche GT3',
       subtitle: '2025 Spec · 550 CV',
       specs: '1250 kg · 550 CV · RWD',
       accent: '#e10600',
       physics: {
         m: 1250, Izz: 1680, L: 2.50, a: 1.48, b: 1.02, tw: 1.69, h: 0.38, R: 0.34,
         mu: 1.74, B: 11.8, C: 1.54, driveF: 0.0,
         idleRpm: 900, maxRpm: 8800, redlineRpm: 8200,
         gearRatios: [-3.2, 3.1, 2.2, 1.7, 1.35, 1.1, 0.92], finalDrive: 3.44,
         torqueBase: 420, torquePeak: 230, torquePeakStart: 4.8, torquePeakSpan: 2.2, torqueDrop: 45, torqueDropRpm: 8.4,
         brakeTorque: 5800, brakeBiasF: 0.62, handbrakeTorque: 4200, eff: 0.94,
         steerSpeed: 7.5, steerReturn: 12.0, steerMax: 0.58, steerSpeedSens: 0.024,
         clA: 1.85, aeroSplitF: 0.42
       },
       hud: { maxKmh: 340, maxRpm: 9.0, redlineRpm: 8.2 },
       wheelbase: 2.50, trackF: 1.69, trackR: 1.67, wheelR: 0.34,
       hubs: [
         [ 1.48, 0.34, -0.84], // Delantera izquierda
         [ 1.48, 0.34,  0.84], // Delantera derecha
         [-1.02, 0.34, -0.83], // Trasera izquierda
         [-1.02, 0.34,  0.83], // Trasera derecha
       ],
       shaderSrc: 'mat_mi_coche',
       atlasB64: 'data:image/png;base64,...',
       bodyV: '...', bodyI: '...',
       glassV: '...', glassI: '...',
       wheelV: '...', wheelI: '...'
     });
     CARS.register(CAR);
   })();
   ```
2. **Añadir el archivo a `cars/manifest.js`**:
   ```javascript
   window.CAR_LIST.push('mi-coche-gt3.js');
   ```
3. **Verificar**: Ejecutar `npm test` para certificar que cumple todos los contratos físicos y de renderizado.

---

### Cómo añadir un circuito nuevo

1. **Crear archivo en `tracks/<nombre-circuito>.js`** llamando a `TRACKS.register({...})`.
2. **Definir**:
   - `hw`: Semiancho del asfalto en metros (ej. 6.0 m).
   - `startS`, `startD`: Posición longitudinal y lateral en la parrilla de salida.
   - `naturalH(x, z, cx, cz)`: Función de relieve topográfico circundante.
   - `poses`: Poses de cámara fijas (`coche-frontal-34`, `coche-trasera-34`, `coche-lateral-baja`).
3. **Registrar en `tracks/manifest.js`**.

---

## 5. Suite de Pruebas Automatizadas

El proyecto cuenta con un sistema completo de pruebas ejecutables mediante Node.js:

```bash
npm test
```

Sub-suites disponibles:
- `npm run test:cars`: Valida integridad geométrica, rangos físicos, bujes y calibración de HUD de los 11 coches.
- `npm run test:tracks`: Valida anchura, continuidad de bucle, cotas topográficas y cámaras de los 3 circuitos.
- `npm run test:physics`: Simula 10 segundos de física a 120 Hz para cada coche con aceleración, frenada a fondo, paso por curva lateral y marcha atrás, verificando 0 NaNs y estabilidad numérica.
