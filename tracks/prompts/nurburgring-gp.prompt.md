# Prompt de Generación: Nürburgring GP-Strecke (FIA GT3)

> **Instrucción de uso:**  
> Cuando solicites *"Regenera el circuito de Nürburgring"* o desees modificar algún parámetro de este escenario, el asistente aplicará estricta y fielmente las directrices de este archivo sobre `tracks/nurburgring-gp.js` y `world/props.js` (o su módulo correspondiente), sin alterar ningún otro circuito del juego.

---

## 1. IDENTIDAD Y CONFIGURACIÓN GENERAL
- **Nombre:** Nürburgring GP
- **Identificador (`id`):** `nurburgring-gp`
- **Subtítulo:** GP-Strecke · Nürburg, Alemania
- **Longitud:** 5,148 km (15 curvas oficiales de Gran Premio FIA)
- **Sentido:** Horario
- **Modo:** Clásico diurno / atardecer con vegetación natural (`night: false`, `urban: false`, `noVegetation: false`)
- **Entorno:** Paisaje de colinas de las montañas de Eifel, sotobosque espeso y bosques de abetos y hayas.

---

## 2. PERFIL MÉTRICO DE PISTA Y ARCENES
- **Ancho útil de asfalto:** 14,4 m simétrico (`hw = 7.2`).
- **Pianos (Kerbs):** Pianos FIA GT3 estándar rojiblancos de 1,2 m de ancho en interiores y salidas de curva.
- **Escapatorias:** Combinación de arcenes de asfalto y amplias trampas de grava profunda (`gravel`) en curvas críticas:
  * Frenada de Yokohama-S (T1): Trampa de grava exterior.
  * Curva de horquilla Dunlop-Kehre (T7): Gran lecho de grava exterior.
  * Schumacher-S (T8-T9): Escapatoria de asfalto y grava rápida.
  * Veedol-Schikane (T13-T14): Pianos pronunciados con bordillo disuasorio y asfalto exterior.
- **Barreras perimetrales:**
  * Guardarraíles metálicos de doble y triple onda (Armco) a 8,5 m - 12,0 m del eje.
  * Muros de neumáticos amortiguadores (filas de 4 a 6 neumáticos) en zonas de alto impacto.

---

## 3. RECTA PRINCIPAL, BOXES Y GRADAS
- **Pit Lane (Lado derecho, marcha normal):**
  * Muro del Pit Wall a $d = 12.5\text{ m}$.
  * Carril de boxes entre $d = 13.5\text{ m}$ y $22.0\text{ m}$.
  * Edificio de boxes oficial (estilo Nürburgring moderno con torre de cronometraje, visera gris y 20 boxes) entre $s = -75\text{ m}$ y $+95\text{ m}$, $d = [22.8, 38.0]\text{ m}$.
- **Haupttribüne (Grada principal Mercedes-Benz / T4a):**
  * Ubicada en el lado izquierdo de la recta de meta ($s = [-90, 135]\text{ m}$, $d = [-42.0, -15.5]\text{ m}$).
  * Estructura de gradas escalonadas de 22 filas con asientos en tonos sobrios (azul marino, gris, beige) y marquesina metálica superior.
  * Altura calculada adaptativa sobre la cota del terreno (`hfAt`) para garantizar visibilidad directa desde la parrilla de salida sin quedar hundida en el relieve.
  * Público variado en gradas y terrazas.
- **Pórtico de meta:**
  * Cruzando la pista a $s = 0\text{ m}$ con el rótulo "NÜRBURGRING GP-STRECKE" y semáforos de salida.

---

## 4. VEGETACIÓN Y ELEMENTOS DEL PAISAJE
- **Vegetación:** Carga activa de `shaders/vegetation.js` y `world/vegetation.js`.
- Bosques frondosos en el exterior de las curvas Mercedes-Arena, Dunlop y Coca-Cola-Kurve.
- Silueta lejana del Castillo de Nürburg (*Nürburg Castle*) en lo alto de la colina de Eifel visible desde los sectores elevados.
- **Patrocinadores del atlas de Nürburgring:**
  * BILSTEIN, ADAC, RAVENOL, BBS, MICHELIN, DEKRA, TOTAL ENERGIES, RECARO, H&R SPRINGS, ROWE MOTOR OIL, PUMA MOTORSPORT, BOSCH.
