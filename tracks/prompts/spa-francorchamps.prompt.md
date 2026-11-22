# Prompt de Generación: Circuit de Spa-Francorchamps (FIA WEC / GT3)

> **Instrucción de uso:**  
> Cuando solicites *"Regenera el circuito de Spa-Francorchamps"* o desees modificar algún parámetro de este escenario, el asistente aplicará estricta y fielmente las directrices de este archivo sobre `tracks/spa-francorchamps.js` y `world/props.js` (o su módulo correspondiente), sin alterar ningún otro circuito del juego.

---

## 1. IDENTIDAD Y CONFIGURACIÓN GENERAL
- **Nombre:** Spa-Francorchamps
- **Identificador (`id`):** `spa-francorchamps`
- **Subtítulo:** Circuit de Spa-Francorchamps · Stavelot, Bélgica
- **Longitud:** 7,004 km (19 curvas míticas)
- **Sentido:** Horario
- **Modo:** Clásico diurno con vegetación natural (`night: false`, `urban: false`, `noVegetation: false`)
- **Entorno:** Cordillera de las Ardenas con densos pinares, fuertes desniveles orográficos (> 100 m de desnivel entre la bajada a Eau Rouge y la cima de Les Combes) y climatología mixta con sectores húmedos.

---

## 2. PERFIL MÉTRICO DE PISTA Y CURVAS EMBLEMÁTICAS
- **Ancho útil de asfalto:** 14,0 m general (`hw = 7.0`); ampliado en Eau Rouge / Raidillon y frenada de La Source.
- **Pianos (Kerbs):** Pianos FIA amarillos y rojos tradicionales de 1,2 m - 1,5 m de ancho con resaltes para disuadir cortes de pista.
- **Curvas míticas modeladas con precisión milimétrica:**
  * **La Source (T1):** Horquilla cerrada a derechas con escapatoria exterior de asfalto pintado.
  * **Eau Rouge & Raidillon (T2-T4):** Compresión vertical extrema a 40 metros de elevación con cambio de rasante ciego hacia la recta Kemmel.
  * **Kemmel Straight:** Larga recta en subida con guardarraíles dobles y postes de luz altos.
  * **Les Combes & Malmedy (T5-T7):** Chicane técnica con escapatoria de grava.
  * **Bruxelles / Rivage (T8):** Horquilla peraltada descendente de 180°.
  * **Pouhon (T10-T11):** Doble curva ultra-rápida a izquierdas en descenso.
  * **Blanchimont (T17-T18):** Curvas a izquierdas a fondo antes de la frenada de Bus Stop.
  * **Bus Stop Chicane (T19-T20):** Chicane cerrada previa a la línea de meta.

---

## 3. RECTA PRINCIPAL, PIT LANE Y GRADAS
- **Recta de salida:** Situada entre Bus Stop y La Source.
- **Pit Lane oficial F1 / Resistencia (Lado derecho):**
  * Muro del Pit Wall a $d = 12.0\text{ m}$.
  * Edificio de boxes moderno de 2 plantas con terrazas VIP y boxes abiertos.
- **Grada principal de Spa (Lado izquierdo):**
  * Ubicada en $s = [-80, 120]\text{ m}$, $d = [-45.0, -18.0]\text{ m}$.
  * Grada escalonada con marquesina y estructura de hormigón/acero vista, adaptada a la rasante de subida hacia La Source.
  * Gradas repletas de público con camisetas y banderas de competición.
- **Pórtico de meta:**
  * Cruzando la pista a $s = 0\text{ m}$ con el rótulo oficial "SPA-FRANCORCHAMPS" y cronometraje.

---

## 4. PAISAJE ARDENÉS Y PATROCINADORES
- **Vegetación:** Carga activa de `shaders/vegetation.js` y `world/vegetation.js`.
- Bosques masivos de abetos y robles que flanquean Kemmel Straight, Pouhon y Stavelot.
- **Patrocinadores oficiales del atlas de Spa:**
  * ROLEX, TOTAL ENERGIES, PIRELLI, MOOBLUZ, DHL, ARAMCO, SPA-FRANCORCHAMPS, TAG HEUER, HEINEKEN 0.0, MICHELIN, AWS, LIQUI MOLY.
