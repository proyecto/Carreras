# Prompt de Generación: Circuito Urbano Nocturno Las Vegas Strip (F1)

> **Instrucción de uso:**  
> Cuando solicites *"Regenera el circuito de Las Vegas"* o desees modificar algún parámetro de este escenario, el asistente aplicará estricta y fielmente las directrices de este archivo sobre `tracks/las-vegas-strip.js` y `world/props-vegas.js`, sin alterar ningún otro circuito del juego.

---

## 1. IDENTIDAD Y CONFIGURACIÓN GENERAL
- **Nombre:** Las Vegas Strip Circuit · Night GP
- **Identificador (`id`):** `las-vegas-strip`
- **Longitud:** 6,20 km (5,8 km computacionales en spline)
- **Sentido:** Antihorario (17 curvas oficiales de Gran Premio de F1)
- **Modo:** Urbano nocturno (`night: true`, `urban: true`, `noVegetation: true`)
- **Iluminación global:** Cielo 100% negro estrellado, iluminación artificial deportiva F1 con farolas LED de haz vertical que bañan el asfalto.

---

## 2. PERFIL MÉTRICO DE PISTA Y ARCENES
- **Ancho útil de asfalto:** 14,0 m en general (`hw = 7.0`); ampliado a 15,0 m en recta principal de meta (`hw = 7.5`).
- **Pianos (Kerbs):** 1,0 m de ancho adicional a ambos lados en vértices y salidas de curva.
  * Rectas y curvas rápidas: Pianos oficiales F1 rojiblancos.
  * Chicanes técnicas (Curvas 14 a 17): Pianos tricolor oficiales de Las Vegas con franjas alternas en rosa neón (`#ff1493`), blanco puro (`#f8f8f8`) y azul cian (`#00e5ff`).
- **Arcenes (Asphalt Verges):**
  * Rectas estándar: 1,5 m de arcén entre la línea blanca y el muro (muro a 8,5 m del eje).
  * Curvas rápidas y chicanes: 2,5 m a 3,5 m de arcén (muro a 10,5 m - 11,5 m del eje).
  * Curva superior izquierda (Sands Ave, $s \approx 2500..3350$ m): 4,0 m de arcén (muro a 11,0 m del eje).

---

## 3. SISTEMA DE CONTENCIÓN Y COLISIONES (PRIORIDAD MÁXIMA)
- **Túnel de contención cerrado continuo:** Barrera continua a ambos lados de todo el trazado (6,2 km) sin huecos abiertos al exterior.
- **Geometría del muro perimetral:**
  * Muro bajo de hormigón tipo Jersey (1,0 m de alto) con chaflán frontal.
  * Valla metálica superior FIA (catch fencing) de 3,5 m de altura (altura total: 4,5 m).
  * Postes verticales de refuerzo cada 4,0 m.
  * Paneles de patrocinadores oficiales (**Heineken 0.0, TAG Heuer, Aramco, Pirelli, Rolex, DHL**) orientados estrictamente hacia el interior de la pista.
  * Farolas de pista situadas 1,6 m detrás del vallado apuntando al asfalto.
- **Físicas y colisiones:**
  * Todo el perímetro está registrado como collider sólido e infranqueable.
  * Cortes en el muro únicamente permitidos en:
    a) Entrada y salida del Pit Lane.
    b) Bocas de las 4 escapatorias asfaltadas.

---

## 4. ESCAPATORIAS (RUN-OFF AREAS) EN CURVAS CRÍTICAS
Asfalto pintado cerrado al fondo por barreras de absorción Tecpro (bloques rojos y blancos de 1,2 m de grosor):
- **Curva 1 (Final de recta de meta, 90° izquierda):**
  * Escapatoria frontal recta de 14,0 m de ancho x 45,0 m de longitud.
  * Suelo pintado en azul eléctrico con líneas blancas.
  * Fondo cerrado con barreras Tecpro y gran cartel publicitario verde Heineken 0.0.
- **Curva 5 (Frenada hacia la Esfera, 90° derecha):**
  * Escapatoria frontal recta con asfalto decorado en cian, magenta y negro, cerrada al fondo con Tecpro.
- **Curva 12 (Entrada al Strip, 90° izquierda):**
  * Escapatoria frontal recta de 14,0 m de ancho x 40,0 m de largo en azul/negro con flechas direccionales y cierre Tecpro.
- **Curva 14 (Final de la recta del Strip, frenada chicane):**
  * Escapatoria larga y recta de 15,0 m de ancho x 65,0 m de largo siguiendo el vector del Strip, cerrada con doble barrera Tecpro.
  * Rótulo en el asfalto 30 m antes del vértice con el texto monumental "LAS VEGAS" y flechas de neón rosa/cian apuntando al interior del giro.

---

## 5. RECTA PRINCIPAL, PADDOCK Y GRADA DE META
- **Pit Wall:** Situado a 7,5 m a la derecha del eje central con pantallas de señalización y puestos de comisarios.
- **Carril de boxes (Pit Lane):** 12,0 m de ancho adicional a la derecha del Pit Wall (entre 7,5 m y 19,5 m del eje). Línea rápida pintada con franja verde/cian de Aramco.
- **Paddock Building oficial:** Situado a 19,5 m a la derecha del eje, longitud 280 m, altura 14 m (3 plantas en negro mate con 20 garajes, brazos aéreos de pit stop y logo monumental F1 en LED rojo iluminando la azotea).
- **Grada Principal:** Situada a 14,0 m a la izquierda del eje, 200 m de longitud, diseño escalonado abierto hacia la pista con 20 filas de asientos rojos y azules, público con ropa de colores, marquesina superior y cerchas de iluminación.
- **Pórtico de salida:** Sobre la línea de meta ($s = 0$) con semáforos LED oficiales de salida.

---

## 6. MONUMENTOS Y SILUETA DEL STRIP (FUERA DEL VALLADO)
- **Sector 1 (Curvas 5 a 9):**
  * **MSG Sphere:** Esfera monumental (180 m de diámetro) con textura fotorrealista *Planet Earth* (océanos azules y continentes iluminados), visible a 5000 m.
  * **High Roller (The LINQ):** Noria gigante de 78 m de radio con 28 cabinas panorámicas e iluminación de neón púrpura/cian.
  * **The Venetian / Palazzo:** Complejo renacentista con campanario de San Marcos y torre tri-wing en tono dorado.
- **Gran Recta del Strip (entre Curvas 12 y 14):**
  * **Lado derecho:** Torres curvas de cristal bronce (Wynn y Encore) al inicio, seguidas por Caesars Palace (columnatas romanas clásicas blancas).
  * **Lado izquierdo:** Réplica iluminada de la Torre Eiffel (165 m) y globo aerostático gigante de neón de Paris Las Vegas.
  * **Zona final (Curvas 13-14, lado derecho):** Grada VIP frente al lago de las Fuentes del Bellagio (140 x 65 m) con chorros de agua verticales iluminados que se disparan hasta 75 m de altura.
  * **Al fondo de la recta:** Torres gemelas de The Cosmopolitan con tiras de luces LED horizontales azules.
- **Tres Hoteles en forma de 'Y' (Tri-Wing Towers):** The Venetian/Palazzo, The Mirage y Caesars Palace Tower, colocados con más de 90 m de separación de cualquier tramo del circuito.

---

## 7. ZONA DE EXCLUSIÓN DE EDIFICIOS (NO-BUILD ZONE)
- Ningún vértice de ningún edificio o elemento decorativo puede situarse a menos de **16,0 metros perpendiculares** del eje de la pista en general.
- En la curva superior izquierda de Sands Ave ($s \in [2500, 3350]$ m), la distancia mínima obligatoria es de **22,0 metros perpendiculares**.
- Todos los edificios y monumentos tienen colliders físicos OBB registrados para evitar que el vehículo los atraviese en caso de impacto.
