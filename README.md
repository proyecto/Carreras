# 🏎️ Carreras WebGPU

Simulador de carreras y competición de alto rendimiento desarrollado en **JavaScript moderno y WebGPU**, sin librerías externas de runtime, optimizado para ejecutarse a 60–120 FPS estables con **cero asignaciones de memoria por frame** (*Zero-Allocation Simulation Loop*).

El simulador cuenta con físicas realistas de neumáticos (Pacejka Magic Formula), aerodinámica activa, transferencias de masas, rival controlado por Inteligencia Artificial, colisiones elasto-plásticas, iluminación diferida con sombras en cascada (CSM), TAA, motion blur cinematográfico y soporte para múltiples idiomas y reasignación de controles.

---

## 📋 Características Principales

- **Física Numérica a 120 Hz**: Integrador de paso fijo de 120 Hz desacoplado del refresco visual con simulación de 4 ruedas independientes, modelo Pacejka de deriva lateral, elipse de adherencia, transferencia longitudinal y lateral de masas y mapa de par motor con control de tracción (TCS).
- **Rival IA Competitivo**: Coche rival con trazada adaptativa, cálculo de frenada proactiva, evitación lateral y resolución física de colisiones con intercambio de cantidad de movimiento y momento angular de guiñada. El rival compite utilizando cualquiera de los 13 modelos reales de vehículos 3D.
- **Pipeline WebGPU de Última Generación**:
  - Renderizado diferido (*Deferred Shading*) con G-Buffer de 4 objetivos de color.
  - Reverse-Z infinito (`depth32float`) sin z-fighting.
  - Sombras ortográficas en cascada (CSM) con texel snapping.
  - Iluminación PBR (GGX Smith) y Armónicos Esféricos SH (L2).
  - Pases duales de cristales transparentes con Fresnel.
  - Post-proceso completo: TAA bicúbico, desenfoque de movimiento McGuire, bloom y mapeo tonal AgX.
- **Menú de Opciones y Personalización**:
  - Reasignación dinámica de controles de teclado con persistencia en `localStorage`.
  - Soporte para mandos y gamepads analógicos (Gamepad API).
  - Selector multilingüe dinámico (Español / Inglés).
  - Activación/desactivación del rival IA y selección manual o aleatoria del vehículo oponente.
- **Arquitectura de Software Formal**: 11 patrones de diseño de software (Singleton, Factory, Interfaces, Adapter, Proxy, Bridge, Observer, Iterator, State, Template Method y Strategy) centralizados en `engine/patterns.js`.
- **Cero Dependencias & Offline-First**: No requiere librerías npm ni descargas externas para jugar; todos los modelos 3D y texturas atlas están integrados en base64.

---


## 🚗 Catálogo de Vehículos (15 Modelos)

1. **Mercedes-AMG GT3 Evo (2020)**: 550 CV · V8 6.2L · Chasis de competición GT3 balanceado.
2. **Porsche 911 GT3 R (992 - 2024)**: 565 CV · Bóxer 4.2L · Suspensión delantera de doble trapecio.
3. **Ford Mustang GT3 (2024)**: 540 CV · Coyote V8 5.4L · Chasis Multimatic, alerón *swan-neck*.
4. **Ford Mustang GT3**: 535 CV · V8 5.4L atmosférico · Fibra de carbono vista y transmisión secuencial Hewland.
5. **McLaren 720S GT3 (2020)**: 500 CV · V8 4.0L Biturbo · Chasis de fibra de carbono MonoCell II.
6. **Audi R8 LMS Evo (2020)**: 585 CV · V10 5.2L FSI · Máxima velocidad punta y agilidad en curva rápida.
7. **Nissan GT-R Nismo GT3 (2018)**: 550 CV · VR38DETT V6 3.8L · Tracción y frenada ultra-estable.
8. **BMW M8 GTE (2018)**: 500 CV · P63/1 V8 4.0L Biturbo · Bólido de resistencia Le Mans / IMSA.
9. **BMW M3 Touring 24H (2026)**: 510 CV · S58 3.0L Biturbo · Proyecto especial de 24 Horas de Nürburgring.
10. **McLaren 650S GT3 (2015)**: 500 CV · V8 3.8L Biturbo · Campeón de Bathurst 12H y Blancpain GT.
11. **McLaren Ultimate Vision GT (2018)**: 1150 CV · Tracción total híbrida AWD · Concepto de máxima carga aerodinámica.
12. **Porsche 911 / 935 Turbo (1979)**: 650 CV · Bóxer Turbo Clásico · Tracción trasera salvaje y respuesta instantánea.
13. **Mercedes-AMG GT4 (2020)**: 510 CV · V8 4.0L Biturbo M178 · Transmisión transaxle secuencial de 6 velocidades y aerodinámica Customer Racing.
14. **Ferrari 296 Challenge (2024)**: 700 CV · V6 120° 3.0L Twin-Turbo (234 CV/L) · Cambio F1 doble embrague 7-vel y frenos Brembo CCM-R EVO.
15. **BMW Z4 GT3 (2011)**: 515 CV · V8 4.4L Atmosférico P65B44 a 8.200 RPM · Transmisión Xtrac secuencial y decoración Crowne Plaza.

---

## 🏁 Circuitos Disponibles

- **Nürburgring GP**: Trazado de Gran Premio de 5.148 m con 15 curvas icónicas (Horquilla Castrol, curvas en S de Schumacher, chicane NGK).
- **Spa-Francorchamps**: Trazado legendario de 7.004 m en las Ardenas con elevación real, subida de Eau Rouge / Raidillon, Pouhon y Blanchimont.
- **Las Vegas Strip Circuit**: Trazado oficial urbano nocturno de 6.201 m y 17 curvas. Carrera 100% de noche sin vegetación, rodeada por un cañón urbano de rascacielos iluminados, hoteles casino, el icónico **MSG Sphere** con pantallas LED holográficas, focos de iluminación F1 y 1,9 km a fondo por Las Vegas Boulevard (The Strip).

---

## 🎮 Controles

### Teclado (Reconfigurable en el Menú de Opciones)

| Acción | Tecla Primaria | Tecla Alternativa |
| :--- | :--- | :--- |
| **Acelerar** | `W` | `Flecha Arriba` |
| **Frenar / Marcha Atrás** | `S` | `Flecha Abajo` |
| **Girar a la Izquierda** | `A` | `Flecha Izquierda` |
| **Girar a la Derecha** | `D` | `Flecha Derecha` |
| **Freno de Mano** | `Espacio` | - |
| **Cambiar Cámara** | `C` | - |
| **Mirar Hacia Atrás** | `V` | - |
| **Restablecer Coche** | `R` | - |
| **Silenciar Audio** | `M` | - |
| **Pausa / Menú** | `Escape` | `P` |

### Mando / Gamepad

- **Dirección**: Stick Analógico Izquierdo
- **Acelerador**: Gatillo Derecho (RT / R2)
- **Freno**: Gatillo Izquierdo (LT / L2)
- **Freno de mano**: Botón A / Cruz
- **Cambiar cámara**: Botón Y / Triángulo
- **Pausa**: Botón Start / Options

---

## 🚀 Cómo Ejecutar el Proyecto

Dado que el juego utiliza WebGPU, debe servirse a través de un servidor HTTP local (no abrir directamente mediante `file://`):

```bash
# Opción 1: Servidor Node.js nativo con Señalización Multijugador P2P (Recomendado)
node server.js

# Opción 2: Python 3
python3 -m http.server 8000

# Opción 3: Node.js (npx serve)
npx serve .
```

A continuación, abra en su navegador compatible con WebGPU (Google Chrome, Microsoft Edge):

```
http://localhost:8000
```

---

## 🌐 Multijugador P2P en Tiempo Real (2 Jugadores)

El simulador cuenta con juego en red de baja latencia (**15–35 ms**) mediante **WebRTC DataChannels** (Peer-to-Peer directo, sin retraso de servidor):

- **Sin Servidor de Partida (0 € de coste)**: La física de ambos bólidos y la colisión se calcula localmente en el navegador a 120 Hz, intercambiando paquetes UDP compactos (`Float32Array` de 48 bytes a 60 Hz).
- **Cómo Jugar con un Amigo**:
  1. Inicia el servidor con `node server.js`.
  2. Haz clic en **🌐 Multijugador** en el menú principal o ve a Opciones.
  3. Haz clic en **"Crear Sala (Host)"** y copia el enlace generado (ej: `http://localhost:8000/?room=RACE-742`).
  4. Pásale el enlace a tu amigo $\to$ al abrirlo se conectan automáticamente en menos de 1 segundo.
  5. ¡Ambos bólidos compiten en pista con colisiones reales, rebufo y medidor de ping en el HUD!

### Parámetros de URL Disponibles

- `?room=<codigo-sala>`: Se une automáticamente a la sala multijugador P2P indicada (ej: `?room=RACE-742`).
- `?car=<id-coche>`: Carga directamente el coche indicado (ej: `?car=ford-mustang-gt3`).
- `?track=<id-circuito>`: Carga el circuito indicado (ej: `?track=nurburgring-gp`).
- `?rival=1` o `?rival=0`: Activa o desactiva el rival en carrera.
- `?rivalCar=<id-coche>`: Especifica qué modelo debe conducir el rival.

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una batería de 651 aserciones automáticas en Node.js que certifican shaders, modelos, físicas a 120 Hz, controles, rival IA, patrones de diseño y red multijugador:

```bash
node tests/run_all.js
```

---

## 🏛️ Patrones de Diseño (`engine/patterns.js`)

1. **Singleton**: `GameEngineContext`, `VehicleCatalog`, `TrackCatalog`, `EventBusSingleton`.
2. **Factory**: `VehicleFactory`, `DrawableFactory`, `RivalCarFactory`.
3. **Interface**: `InterfaceValidator` para validar contratos `IVehicle`, `ITrack`, `IState` e `IInputSource`.
4. **Adapter**: `KeyboardInputAdapter`, `GamepadInputAdapter`, `StorageAdapter`.
5. **Proxy**: `CarAssetProxy` (memoización lazy de buffers 3D) e `I18nProxy` (fallback de localización).
6. **Bridge**: `VehicleRenderBridge` (desacopla simulación matemática de la visualización WebGPU).
7. **Observer**: `EventBus` (Pub/Sub desacoplado para vueltas, colisiones y estado).
8. **Iterator**: `TrackWaypointIterator` (recorrido de línea de carrera) y `CatalogIterator` (filtrado de coches).
9. **State**: `GameStateManager` con clases `StateInicio`, `StateJuego`, `StatePausa`, `StateBench`, `StateReplay`, `StateResult`, `StatePose`.
10. **Template Method**: `SimulationLoopTemplate` y `RaceSimulationLoop`.
11. **Strategy**: `AIDrivingStrategies` (RacingLine, Overtake, Defensive) y `CameraStrategies` (Chase, Bonnet, TV).
