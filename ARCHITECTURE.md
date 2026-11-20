# Arquitectura del Sistema · Carreras WebGPU

Simulador de conducción de alto rendimiento construido en **JavaScript moderno y WebGPU**, sin librerías externas de runtime, optimizado para ejecutarse a 60–120 FPS estables con **cero asignaciones de memoria por frame** (Zero-Allocation Loop).

---

## 1. Principios de Diseño

1. **Cero Dependencias de Runtime**: Motor gráfico, simulación física, síntesis de audio procedural y renderizado de interfaz implementados directamente sobre APIs web nativas (WebGPU, Web Audio API, Canvas 2D).
1. **Cero Asignaciones por Frame (Zero-Allocation Loop)**: Los bucles de simulación física (`game/physics.js`) y renderizado gráfico (`engine/renderer.js`) reutilizan búferes tipados preasignados (`Float32Array`, `Int32Array`). No se generan objetos temporales en el heap para evitar pausas del recolector de basura (GC).
1. **Paso Físico Fijo a 120 Hz**: La física se integra a una frecuencia constante de 120 Hz (`dt = 1/120 s`), independientemente de la tasa de refresco del monitor, asegurando reproducibilidad y estabilidad numérica estricta.
1. **Offline-First & Auto-contenido**: Todos los modelos 3D y texturas atlas están codificados de forma compacta en base64 en cada módulo de vehículo, garantizando que el proyecto funcione localmente sin descargas externas.
1. **Arquitectura Basada en Patrones de Diseño Formales**: Todos los subsistemas del motor siguen patrones de diseño canónicos (GoF) centralizados en `engine/patterns.js`.

---


## 2. Patrones de Diseño Aplicados (`engine/patterns.js`)

El motor implementa formalmente los principales patrones de diseño de software:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PATRONES DE DISEÑO DEL MOTOR                          │
├──────────────────────┬────────────────────────┬─────────────────────────────┤
│ Patrón               │ Implementación         │ Responsabilidad             │
├──────────────────────┼────────────────────────┼─────────────────────────────┤
│ 1. Singleton         │ GameEngineContext      │ Estado global y ciclo reloj │
│                      │ EventBusSingleton      │ Bus central de mensajería   │
│                      │ VehicleCatalog         │ Registro único de bólidos   │
│                      │ TrackCatalog           │ Registro único de circuitos │
├──────────────────────┼────────────────────────┼─────────────────────────────┤
│ 2. Factory           │ VehicleFactory         │ Creación de estados físicos │
│                      │ DrawableFactory        │ Creación de pases WebGPU    │
│                      │ RivalCarFactory        │ Configuración de rival IA   │
├──────────────────────┼────────────────────────┼─────────────────────────────┤
│ 3. Interface         │ InterfaceValidator     │ Validación estricta de      │
│                      │ (IVehicle, ITrack,     │ contratos de datos y métodos│
│                      │  IInputSource, IState) │ en tiempo de ejecución      │
├──────────────────────┼────────────────────────┼─────────────────────────────┤
│ 4. Adapter           │ KeyboardInputAdapter   │ Adapta DOM a bitmask        │
│                      │ GamepadInputAdapter    │ Adapta Gamepad API a inputs │
│                      │ StorageAdapter         │ Adapta localStorage con RAM │
├──────────────────────┼────────────────────────┼─────────────────────────────┤
│ 5. Proxy             │ CarAssetProxy          │ Carga perezosa de mallas    │
│                      │ I18nProxy              │ Fallback de idiomas         │
│                      │ PhysicsStateProxy      │ Telemetría segura para HUD  │
├──────────────────────┼────────────────────────┼─────────────────────────────┤
│ 6. Bridge            │ VehicleRenderBridge    │ Desacopla física 120 Hz de  │
│                      │                        │ renderizado WebGPU          │
├──────────────────────┼────────────────────────┼─────────────────────────────┤
│ 7. Observer          │ EventBus (Pub/Sub)     │ Eventos de vuelta, récord,  │
│                      │                        │ colisiones y estado         │
├──────────────────────┼────────────────────────┼─────────────────────────────┤
│ 8. Iterator          │ TrackWaypointIterator  │ Recorrido de trazada        │
│                      │ CatalogIterator        │ Filtrado de vehículos       │
├──────────────────────┼────────────────────────┼─────────────────────────────┤
│ 9. State             │ GameStateManager       │ Ciclo de vida (Inicio,      │
│                      │ (StateInicio, Juego...)│ Juego, Pausa, Bench, Replay)│
├──────────────────────┼────────────────────────┼─────────────────────────────┤
│ 10. Template Method  │ SimulationLoopTemplate │ Esqueleto invariable de     │
│                      │ (RaceSimulationLoop)   │ pasos de tick de simulación │
├──────────────────────┼────────────────────────┼─────────────────────────────┤
│ 11. Strategy         │ AIDrivingStrategy      │ Trazada, adelantamiento, etc│
│                      │ CameraStrategy         │ Persecución, capó, TV       │
└──────────────────────┴────────────────────────┴─────────────────────────────┘
```

---

## 3. Pipeline Gráfico WebGPU

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

### Características de Renderizado Clave

- **Reverse-Z infinito**: Búfer de profundidad en formato `depth32float` con 1.0 en plano cercano y 0.0 en el infinito, maximizando la precisión logarítmica y eliminando el z-fighting en distancias de hasta 10 km.
- **Transparencias Dual-Pass (`engine/forward.js`)**:
  - `GLASS_MUL`: Multiplica el color del fondo por el tinte del cristal (`dst * tint`).
  - `GLASS_ADD`: Suma reflejos Fresnel del entorno y especulares solares (`dst + spec + env`).
- **Antialiasing Temporal (TAA)**: Matriz de proyección con jitter subpíxel Halton(2,3), recorte de varianza en espacio comprimido YCoCg y rechazo de ghosting mediante velocidad dilatada en vecindades 3x3.
- **Mapeo Tonal AgX**: Curva cinematográfica que preserva altas luces saturadas sin virajes tonales indeseados.

---


## 4. Modelo Físico del Vehículo (`game/physics.js`)

Simulación física de 4 ruedas con modelo de dos grados de libertad lateral y acoplamiento longitudinal:

- **Adherencia de Neumáticos (Fórmula Mágica de Pacejka)**:
  $$F_y = \mu \cdot F_z \cdot \sin\left(C \cdot \arctan\left(B \cdot \alpha - E \cdot (B \cdot \alpha - \arctan(B \cdot \alpha))\right)\right)$$
  Donde $\alpha$ es el ángulo de deriva lateral, $B$ es la rigidez y $C$ el factor de forma.
- **Elipse de Fricción**: Combina demanda longitudinal (tracción/frenada) y lateral (giro) respetando el límite circular $\sqrt{F_x^2 + F_y^2} \le \mu \cdot F_z$.
- **Transferencia Dinámica de Carga**:
  - Longitudinal: $\Delta F_z = \frac{m \cdot a_x \cdot h}{L}$
  - Lateral: $\Delta F_z = \frac{m \cdot a_y \cdot h}{tw}$
- **Downforce Aerodinámico**: Generación de sustentación negativa $F_{\text{down}} = \frac{1}{2} \rho \cdot c_l A \cdot v^2$ repartida porcentualmente entre eje delantero y trasero.
- **Colisiones entre Vehículos**: Detección basada en círculos orientados en ejes delantero y trasero con resolución elasto-plástica, intercambio de cantidad de movimiento y transferencia de momento angular (par de guiñada).

---

## 5. Simulación de Rival IA (`game/ai.js`)

- **Búsqueda y Seguimiento de Trazada Óptima**: Controlador proporcional-derivativo (PD) con horizonte de predicción adaptativo según velocidad.
- **Gestión Proactiva de Frenada**: Detección anticipada de curvas con frenada regresiva modulada para evitar bloqueos.
- **Evitación de Colisiones**: Desplazamiento lateral dinámico ante la proximidad del vehículo del jugador.
- **Soporte de Modelos Reales**: El rival utiliza cualquiera de los 13 vehículos disponibles de forma aleatoria o seleccionable.

---

## 6. Arquitectura Multijugador P2P WebRTC (`game/network.js`, `server.js`)

Sistema multijugador peer-to-peer de dos jugadores de ultra-baja latencia (15–35 ms) con cero dependencias de runtime:

- **Canal de Datos No Confiable (UDP a 60 Hz)**: Utiliza `RTCDataChannel` con `{ ordered: false, maxRetransmits: 0 }` para replicar el estado del vehículo en un búfer binario de 48 bytes (`Float32Array(12)`: posición $x, y, z$, guiñada, velocidades locales $v_x, v_y$, dirección, RPM, marcha, coordenadas de pista $s, d$, y timestamp).
- **Canal Confiable de Eventos**: Sincronización de emparejamiento (handshake), modelos de coche, reinicio conjunto de carrera y ping de red.
- **Predicción y Extrapolación (Dead Reckoning)**: El bólido remoto se extrapola cinemáticamente entre paquetes de red con filtro complementario de suavizado, eliminando el jitter sin introducir retardo en el volante del jugador local (0 ms input lag).
- **Servidor de Señalización Nativo (`server.js`)**: Servidor HTTP y WebSocket de 180 líneas en Node.js puro que empareja a los dos peers en menos de 100 ms para negociar el SDP antes de ceder el control al túnel P2P directo.

---

## 7. Suite de Pruebas Automatizadas

El proyecto cuenta con 651 pruebas automatizadas ejecutables en Node.js:

```bash
node tests/run_all.js
```

Sub-suites disponibles:

- `test_shaders.js`: Valida integridad sintáctica de WGSL, llaves y uniformes.
- `test_cars.js`: Valida integridad geométrica, rangos físicos, bujes y calibración de HUD de los 13 coches.
- `test_tracks.js`: Valida anchura, continuidad de bucle, cotas topográficas y cámaras de los circuitos.
- `test_physics.js`: Simula 10 segundos de física a 120 Hz para cada coche con aceleración, frenada a fondo, paso por curva lateral y marcha atrás (0 NaNs garantizados).
- `test_controls.js`: Valida el gestor de controles, persistencia en storage y reasignación de teclas.
- `test_rival.js`: Valida la IA rival, seguimiento de línea de carrera y respuesta ante colisiones.
- `test_patterns.js`: Valida el funcionamiento de los 11 patrones de diseño implementados.
- `test_network.js`: Valida el protocolo binario de telemetría a 60 Hz, extrapolación Dead Reckoning y eventos de red.
