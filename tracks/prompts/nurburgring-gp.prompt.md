# MASTER PROMPT — NÜRBURGRING GP-STRECKE
## Desarrollo de un circuito de simulación 3D de máxima fidelidad

### 0. ROL Y OBJETIVO

Actúa como un equipo multidisciplinar formado por:

- Ingeniero especializado en diseño y construcción de circuitos de competición.
- Especialista en homologación FIA y seguridad de circuitos.
- Ingeniero de desarrollo de simuladores de conducción.
- Artista técnico especializado en entornos 3D de automovilismo.
- Especialista en arquitectura de circuitos, paddocks e instalaciones deportivas.
- Programador senior de JavaScript y sistemas de generación procedural de escenarios.

Tu misión es desarrollar una reproducción digital extremadamente detallada y visualmente fiel del circuito **Nürburgring GP-Strecke**, situado en Nürburg, Alemania.

No estás creando un circuito ficticio inspirado en Nürburgring. Estás reproduciendo un circuito real.

El resultado debe ser una representación convincente tanto desde la perspectiva del piloto como desde cámaras externas, retransmisiones televisivas, cámaras cinematográficas y vistas aéreas.

La prioridad es conseguir el máximo nivel de fidelidad geométrica, arquitectónica, visual y ambiental que permita el motor del simulador.

No simplifiques elementos por comodidad si pueden implementarse correctamente.

No inventes información técnica para completar apartados. Investiga, contrasta y documenta las aproximaciones.

---

# 1. REGLAS FUNDAMENTALES DEL PROYECTO

### 1.1. El simulador es propio

El código proporcionado pertenece a un simulador desarrollado específicamente para este proyecto.

No se trata de modificar Assetto Corsa, Unreal Engine, Unity, rFactor ni ningún otro simulador comercial.

Debes trabajar exclusivamente con la arquitectura existente.

### 1.2. Analiza antes de programar

Antes de escribir código:

1. Examina íntegramente el archivo `tracks/nurburgring-gp.js`.
2. Identifica las estructuras y propiedades que utiliza `TRACKS.register`.
3. Localiza cómo se construye físicamente la pista.
4. Identifica cómo se generan pianos, escapatorias, grava, barreras y muros.
5. Analiza cómo se generan edificios, gradas y elementos arquitectónicos.
6. Examina el sistema de vegetación.
7. Examina cómo se calculan las alturas del terreno.
8. Identifica cómo funcionan las coordenadas longitudinales y transversales.
9. Localiza los módulos responsables de los elementos visuales y sus shaders.
10. Comprueba qué funciones y parámetros están disponibles realmente.

Si una funcionalidad depende de otro módulo, identifica primero su API y su funcionamiento.

No inventes nombres de funciones, propiedades, shaders o estructuras que no existan.

### 1.3. Protección del proyecto

- No modifiques ningún otro circuito.
- No alteres el funcionamiento general del simulador.
- No cambies la física de los vehículos.
- No modifiques el sistema de cámaras global.
- No alteres los controles ni la interfaz.
- No introduzcas dependencias externas sin autorización.
- No elimines funcionalidades existentes.
- Mantén la compatibilidad con el resto del proyecto.
- Respeta el estilo de programación y las convenciones existentes.

El objetivo es mejorar exclusivamente el circuito Nürburgring GP y los módulos específicos que necesite.

### 1.4. Integridad del resultado

El resultado debe ser código JavaScript funcional, no una explicación de cómo podría hacerse.

No sustituyas implementaciones por pseudocódigo.

No imprimas el código por pantalla cuando se solicite generar o actualizar un archivo.

Entrega los archivos completos modificados, indicando claramente sus rutas.

---

# 2. INVESTIGACIÓN Y DOCUMENTACIÓN DEL CIRCUITO REAL

Antes de desarrollar el escenario, realiza una investigación técnica exhaustiva.

Utiliza, cuando estén disponibles:

- Documentación oficial de Nürburgring.
- Planos oficiales del circuito.
- Fotografías aéreas y satelitales.
- Fotografías tomadas desde cada curva.
- Fotografías de retransmisiones televisivas.
- Documentación de instalaciones y edificios.
- Fotografías de paddock y pit lane.
- Referencias de eventos FIA GT3.
- Imágenes de diferentes épocas para identificar elementos permanentes y temporales.

Consulta varias fuentes independientes.

Prioriza la documentación oficial y las fotografías reales frente a recreaciones de otros simuladores.

Para cada elemento importante registra:

- Descripción.
- Ubicación.
- Dimensiones conocidas.
- Materiales.
- Geometría.
- Apariencia visual.
- Estado de conservación.
- Fuente de información.
- Nivel de confianza.

Clasifica la información en:

**A. Datos confirmados:** respaldados por documentación o mediciones fiables.

**B. Datos aproximados:** dimensiones o características deducidas mediante fotografías, planos o referencias visuales.

**C. Datos desconocidos:** información que no ha podido verificarse.

No conviertas una aproximación en un dato oficial.

Cuando existan discrepancias entre fuentes, documéntalas y explica qué referencia has priorizado.

---

# 3. IDENTIDAD Y CONFIGURACIÓN GENERAL

Nombre: Nürburgring GP.

Identificador: `nurburgring-gp`.

Nombre oficial: Nürburgring Grand-Prix-Strecke.

Ubicación: Nürburg, Renania-Palatinado, Alemania.

Longitud de referencia: 5.148 metros.

Número de curvas: 15.

Sentido: horario.

Configuración: trazado completo de Gran Premio.

Entorno: paisaje natural de las montañas de Eifel.

Configuración visual:

- Entorno natural.
- Vegetación abundante.
- Bosques de coníferas y árboles caducifolios.
- Colinas y desniveles.
- Instalaciones modernas de competición.
- Arquitectura característica de Nürburgring.

El escenario debe poder representar una jornada de competición GT3 durante el día y, si el motor lo permite, diferentes condiciones de iluminación.

No conviertas el circuito en un entorno urbano ni en un escenario genérico de carreras.

---

# 4. GEOMETRÍA DE LA PISTA

Este apartado es prioritario.

La geometría debe reproducir el trazado real, no simplemente conectar puntos con curvas visualmente agradables.

### 4.1. Línea central

Utiliza los puntos existentes del archivo como geometría inicial.

Analiza:

- Posición de cada vértice.
- Distancia entre vértices.
- Curvatura local.
- Transiciones entre rectas y curvas.
- Continuidad geométrica.
- Orientación de la trazada.
- Cierre del circuito.
- Relación entre coordenadas y distancia longitudinal.

Comprueba que los valores de distancia longitudinal utilizados en `corners` y `elevKeys` corresponden realmente con la parametrización geométrica del circuito.

No modifiques los puntos originales sin justificar técnicamente la modificación.

Si detectas errores geométricos, presenta primero un diagnóstico.

### 4.2. Anchura

Anchura de referencia actual: 14,4 metros.

Valor inicial del motor:

`hw = 7.2`

No presupongas que la anchura es idéntica en todos los puntos del circuito.

Investiga posibles variaciones y determina si el motor admite anchura variable.

Si no existe esa funcionalidad, estudia cómo implementarla sin romper la compatibilidad.

### 4.3. Superficie

Investiga y reproduce las características visuales del asfalto:

- Color base.
- Variaciones de tonalidad.
- Textura superficial.
- Granulado.
- Desgaste.
- Marcas de neumáticos.
- Zonas de frenada.
- Restos de goma.
- Reparaciones.
- Juntas de pavimento.
- Diferencias entre asfalto antiguo y renovado.
- Cambios de textura entre pista y pit lane.

Evita utilizar una única textura repetida en toda la superficie.

Introduce variaciones coherentes con la ubicación y el uso de cada sector.

### 4.4. Peraltes y pendientes

Investiga la inclinación transversal de las curvas.

Reproduce:

- Peraltes positivos.
- Peraltes negativos.
- Cambios de inclinación.
- Transiciones de rasante.
- Pendientes longitudinales.
- Compresiones.
- Cambios de elevación.

No confundas la altura del terreno con la elevación de la superficie de rodadura.

La pista debe conservar continuidad y evitar escalones o discontinuidades.

---

# 5. DESARROLLO INDIVIDUAL DE LAS 15 CURVAS

Cada curva debe tratarse como un elemento individual.

No basta con aplicar pianos y escapatorias genéricos.

Para cada curva debes investigar y documentar:

1. Nombre oficial.
2. Número.
3. Posición longitudinal.
4. Sentido de giro.
5. Radio aproximado.
6. Ángulo de giro.
7. Anchura.
8. Peralte.
9. Pendiente.
10. Punto de frenada.
11. Punto de entrada.
12. Ápice.
13. Punto de salida.
14. Piano interior.
15. Piano exterior.
16. Escapatoria.
17. Barreras de protección.
18. Vegetación circundante.
19. Edificios y elementos visibles.
20. Señalización.
21. Cartelería publicitaria.
22. Referencias visuales características.

Estudia especialmente:

- Yokohama-S.
- Mercedes-Arena.
- Ford-Kurve.
- Dunlop-Kehre.
- Schumacher-S.
- Kumho-Kurve.
- Bit-Kurve.
- Veedol-Schikane.
- Coca-Cola-Kurve.

Respeta la configuración real de cada sector.

Si una curva contiene varias fases de dirección, no la representes como una curva circular única.

Las transiciones deben ser suaves y respetar la geometría real.

---

# 6. PIANOS Y BORDILLOS

Los pianos son elementos fundamentales para la fidelidad visual y la conducción.

No utilices un único modelo repetido de forma indiscriminada.

Investiga la configuración de cada curva.

Reproduce:

- Anchura realista.
- Altura sobre el asfalto.
- Perfil transversal.
- Inclinación.
- Alternancia de colores.
- Separación entre franjas.
- Material.
- Desgaste.
- Suciedad.
- Bordes de transición.
- Zonas de piano elevado.
- Bordillos disuasorios cuando existan.

Utiliza colores rojiblancos donde corresponda, respetando la disposición real.

Los pianos deben seguir la geometría de la pista y adaptarse al relieve.

Evita huecos, intersecciones incorrectas y penetraciones en el asfalto.

Los pianos deben tener geometría tridimensional real cuando el motor lo permita, no ser únicamente una textura pintada.

---

# 7. ESCAPATORIAS Y ZONAS DE SEGURIDAD

Investiga individualmente cada escapatoria.

No todas las curvas deben tener la misma solución.

Reproduce las superficies existentes:

- Asfalto.
- Grava.
- Hierba.
- Tierra.
- Hormigón.
- Zonas de transición.
- Bordillos.
- Elementos disuasorios.

La grava debe tener variación de color, textura, distribución y profundidad aparente.

Las escapatorias deben adaptarse al terreno y a la geometría de la pista.

Investiga especialmente:

- Primera frenada.
- Mercedes-Arena.
- Dunlop-Kehre.
- Schumacher-S.
- Veedol-Schikane.

No añadas grandes trampas de grava donde no existan en la realidad.

---

# 8. BARRERAS Y PROTECCIONES

Reproduce los sistemas de seguridad visibles:

- Guardarraíles metálicos.
- Armco de doble o triple onda.
- Barreras de hormigón.
- Muros de protección.
- Barreras de neumáticos.
- Sistemas de protección modernos.
- Vallas de seguridad.
- Redes de protección.
- Postes de soporte.
- Uniones metálicas.
- Elementos de anclaje.

Los elementos deben tener:

- Espesor.
- Altura.
- Material.
- Textura.
- Reflejos.
- Sombras.
- Desgaste.
- Continuidad geométrica.

Las barreras deben adaptarse a la elevación y curvatura del circuito.

No deben atravesar el terreno, los edificios ni las escapatorias.

Las protecciones deben situarse según las características reales de cada zona.

---

# 9. RECTA PRINCIPAL, PIT LANE Y BOXES

Este sector merece un tratamiento arquitectónico específico.

### 9.1. Pit lane

Reproduce fielmente:

- Entrada de boxes.
- Línea de entrada.
- Carril de circulación.
- Línea de separación.
- Limitación de velocidad.
- Señalización.
- Salida de boxes.
- Incorporación a pista.
- Pit wall.
- Elementos de seguridad.
- Marcas de pavimento.

No presupongas que el pit lane tiene una geometría perfectamente recta.

Investiga sus transiciones y su conexión con la pista.

### 9.2. Pit wall

Construye el muro de separación con:

- Altura realista.
- Material.
- Protecciones.
- Barandillas.
- Pantallas.
- Accesos.
- Puestos de observación.
- Elementos de comunicación.

### 9.3. Edificio de boxes

Investiga el edificio real de boxes de Nürburgring.

No utilices un edificio genérico de competición.

Reproduce:

- Fachada.
- Número y distribución de boxes.
- Portones.
- Ventanales.
- Plantas.
- Volúmenes.
- Cubiertas.
- Marquesinas.
- Estructuras metálicas.
- Torre de control.
- Elementos de cronometraje.
- Señalización.
- Accesos.
- Terrazas.
- Iluminación.
- Logotipos y patrocinadores.

Diferencia las zonas funcionales del edificio.

Los boxes deben tener profundidad visual y no parecer simples puertas dibujadas sobre una pared.

### 9.4. Interior de boxes

Cuando la distancia de cámara lo permita, incorpora:

- Iluminación interior.
- Equipamiento.
- Herramientas.
- Armarios.
- Neumáticos.
- Monitores.
- Estructuras de trabajo.
- Personal de competición, si existe soporte para personajes.

No generes detalles interiores que sean completamente invisibles desde cualquier cámara disponible.

---

# 10. GRADAS Y ZONAS DE ESPECTADORES

Reproduce las gradas reales, no estructuras genéricas.

Investiga:

- Ubicación.
- Longitud.
- Altura.
- Inclinación.
- Número aproximado de filas.
- Estructura de soporte.
- Materiales.
- Cubiertas.
- Escaleras.
- Accesos.
- Pasillos.
- Separaciones.
- Asientos.
- Vallas.
- Zonas de circulación.

Distingue las gradas permanentes de las estructuras temporales.

### Público

Cuando el motor lo permita:

- Grupos de espectadores.
- Distribución irregular.
- Diferentes colores de ropa.
- Zonas con mayor y menor ocupación.
- Personas de pie.
- Personas sentadas.
- Movimiento sutil.
- Banderas.

Evita repetir el mismo patrón de público de manera evidente.

### Grada principal

Investiga específicamente las gradas situadas junto a la recta principal y las estructuras de espectadores de Mercedes-Arena.

Conserva las definiciones paramétricas existentes como referencia, pero verifica sus dimensiones, orientación y posición frente a fotografías reales.

Adapta su altura a la elevación del terreno.

### 10.1. Grada Mercedes-Benz de Mercedes-Arena — elemento arquitectónico prioritario

La grada de Mercedes-Arena es una estructura arquitectónica completa y reconocible. **No debe representarse únicamente mediante su cubierta o techo.** La cubierta es solo una parte del conjunto. Si en el simulador actualmente aparece una especie de techo sin la grada debajo, el resultado es incompleto y debe corregirse.

Utiliza la fotografía de referencia proporcionada por el usuario como referencia visual directa. En ella se aprecia una grada curva, de planta aproximadamente envolvente, con una gran cubierta metálica y múltiples filas de asientos azules. La fotografía debe servir para orientar la investigación y la composición, pero no sustituye la búsqueda de otras vistas ni permite deducir dimensiones exactas por sí sola.

Modela el conjunto completo, desde el terreno hasta la parte superior de la cubierta. Debe incluir, como mínimo, los siguientes elementos:

**A. Volumen y estructura principal**
- Grada curva de gran desarrollo longitudinal, adaptada a la geometría de Mercedes-Arena.
- Estructura escalonada de hormigón o material equivalente, con la forma y los niveles que se aprecien en las referencias.
- Frente y laterales de la grada, con su espesor y volumen reales aproximados.
- Muros de contención, zócalos y cerramientos inferiores.
- Estructura portante de la cubierta.
- Pilares, apoyos, vigas y elementos de unión visibles.
- Encuentros entre la grada, la cubierta y el terreno.
- Accesos y salidas integrados en la estructura.

**B. Graderío y asientos**
- Varias filas de asientos individuales, no una superficie lisa ni una textura genérica.
- Asientos predominantemente azules donde corresponda, respetando los cambios de color observables.
- Distribución en filas curvas que sigan la planta y la inclinación del graderío.
- Pasillos, escaleras y divisiones entre sectores.
- Huecos de acceso y vomitorios cuando sean visibles.
- Barandillas y protecciones en los pasillos y bordes.
- Variación visual suficiente para que los asientos no parezcan una única textura repetida.
- La densidad, orientación y separación de los asientos deben ser coherentes con las fotografías.

**C. Cubierta**
- Gran cubierta metálica de geometría curva y voladizo pronunciado.
- Superficie superior con su forma, espesor y acabado.
- Cara inferior visible desde las cámaras bajas.
- Estructura de soporte, brazos, vigas y anclajes.
- Borde perimetral y remates.
- Sombras proyectadas sobre los asientos.
- Elementos distintivos situados sobre la cubierta, únicamente si se confirman en las referencias.

No coloques una cubierta flotante ni una placa plana sobre el terreno. Debe apoyarse de forma estructuralmente creíble y cubrir el graderío correspondiente.

**D. Fachada, rotulación e identidad**
- Banda o fascia frontal curva que separa visualmente sectores del graderío, si se confirma en las referencias.
- Rotulación Mercedes-Benz y AMG visible en la fachada de la grada, con proporciones y ubicación coherentes.
- Logotipos sin deformaciones y sin texto inventado.
- Materiales diferenciados entre hormigón, metal, asientos, paneles y cerramientos.
- Barandillas, vallas y elementos de protección perimetral.

**E. Entorno inmediato**
- Terreno y zonas verdes que rodean la grada.
- Caminos de servicio y accesos peatonales.
- Vallado perimetral y separaciones de seguridad.
- Muros, taludes y desniveles colindantes.
- Vegetación que rodea la instalación, respetando las zonas despejadas.
- Relación espacial con la pista, las escapatorias y las barreras próximas.

**F. Requisitos de modelado y colocación**
- La grada debe ocupar la posición geográfica correcta en Mercedes-Arena.
- Su planta debe seguir la curva y la orientación del circuito, no ser un bloque rectangular colocado cerca de la pista.
- La inclinación del graderío debe permitir que las filas posteriores queden progresivamente más elevadas.
- La cubierta debe tener una escala proporcionada respecto a los asientos, la pista y los edificios próximos.
- Evita que el terreno atraviese el graderío o que la grada flote sobre él.
- Evita que la cubierta o sus soportes atraviesen las filas de asientos.
- La geometría debe verse correctamente desde la pista, desde cámaras exteriores y desde una vista aérea.

**G. Estrategia de implementación**
Antes de crear geometría nueva, inspecciona cómo se genera actualmente esta grada y qué parámetros controlan su cubierta. Averigua si el código existente genera solo el techo, si el graderío está ausente o si se encuentra oculto, mal posicionado, a escala incorrecta o enterrado por el terreno.

No dupliques una grada que ya exista parcialmente. Corrige la causa real.

Si el sistema actual solo permite generar la cubierta, amplía la implementación para construir también el graderío y su estructura. Utiliza geometría procedural o módulos reutilizables si encajan con la arquitectura del simulador.

Separa, siempre que sea viable, los componentes de cubierta, estructura, asientos, pasillos, fachada y entorno para poder ajustar cada parte independientemente.

**Criterio de aceptación obligatorio:** desde una vista aérea y desde una cámara exterior debe reconocerse claramente una grada curva completa, con filas escalonadas de asientos visibles bajo la cubierta. Una cubierta aislada, aunque tenga la forma correcta, no cumple el requisito.

---

# 11. PADDOCK E INSTALACIONES

No limites el escenario al asfalto y sus alrededores inmediatos.

Investiga las instalaciones permanentes que forman parte del entorno visible del circuito.

Incluye, cuando sean relevantes:

- Paddock.
- Edificios de equipos.
- Instalaciones de competición.
- Centro de control.
- Torre de cronometraje.
- Edificios administrativos.
- Accesos.
- Aparcamientos.
- Zonas de servicio.
- Carreteras internas.
- Pasarelas.
- Puentes.
- Vallados.
- Áreas de espectadores.
- Terrazas.
- Instalaciones comerciales.

Prioriza los edificios y estructuras que sean visibles desde la pista o desde cámaras externas.

Cada estructura debe tener una posición coherente con la distribución real del recinto.

---

# 12. SEÑALIZACIÓN Y ELEMENTOS DE COMPETICIÓN

Investiga todos los elementos de señalización existentes.

Incluye:

- Carteles de frenada.
- Distancias de referencia.
- Señales de curvas.
- Señalización de boxes.
- Límites de velocidad.
- Indicaciones de entrada y salida.
- Paneles de dirección.
- Señalización de seguridad.
- Postes de comisarios.
- Paneles de banderas.
- Semáforos.
- Pórticos.
- Marcadores de posición.
- Elementos de cronometraje.

Los elementos deben estar correctamente orientados y situados.

No inventes carteles con información incorrecta.

---

# 13. PUBLICIDAD Y PATROCINADORES

La publicidad es una parte fundamental de la identidad visual de un circuito.

Investiga las marcas realmente presentes en el Nürburgring GP y su distribución.

Presta atención a:

- Vallas perimetrales.
- Carteles de frenada.
- Paneles de pista.
- Publicidad sobre edificios.
- Cartelería en boxes.
- Pórticos.
- Marquesinas.
- Torres.
- Muros.
- Elementos publicitarios de las escapatorias.

Investiga marcas como:

- BILSTEIN.
- ADAC.
- RAVENOL.
- BBS.
- MICHELIN.
- DEKRA.
- TOTAL ENERGIES.
- RECARO.
- H&R.
- ROWE.
- PUMA MOTORSPORT.
- BOSCH.

Esta lista es una referencia inicial, no una afirmación de que todas estas marcas estén presentes actualmente en todas las zonas.

Utiliza los patrocinadores que correspondan a la época y configuración visual elegidas.

Los logotipos deben conservar sus proporciones, colores y tipografía.

Evita textos inventados, logotipos deformados o marcas que no correspondan al escenario.

---

# 14. VEGETACIÓN Y PAISAJE DE EIFEL

El entorno natural debe ser reconocible como Nürburg y la región de Eifel.

No utilices una vegetación genérica de videojuego.

Investiga la vegetación local y su distribución.

### Árboles

Incluye, según las referencias reales:

- Abetos.
- Pinos.
- Hayas.
- Robles.
- Árboles caducifolios.
- Arbustos.
- Sotobosque.

### Distribución

La vegetación debe responder a la geografía del circuito.

Evita una distribución uniforme.

Reproduce:

- Bosques densos.
- Grupos aislados.
- Árboles junto a las escapatorias.
- Vegetación de fondo.
- Zonas despejadas.
- Taludes.
- Vegetación en desniveles.
- Líneas de árboles en el horizonte.

### Terreno

El terreno debe tener profundidad y variación:

- Colinas.
- Depresiones.
- Taludes.
- Cambios de pendiente.
- Elevaciones.
- Zonas boscosas.
- Áreas de hierba.
- Caminos.
- Superficies de tierra.

Evita que el terreno parezca una superficie ondulada generada con una única función sinusoidal.

La función `naturalH` actual debe analizarse y mejorarse si es necesario.

El relieve debe ser coherente con la topografía del circuito.

### Castillo de Nürburg

Investiga la visibilidad real del castillo de Nürburg desde los diferentes sectores.

Si puede representarse, debe aparecer en la posición geográfica correcta, con una escala y perspectiva coherentes.

No lo coloques simplemente donde quede bien visualmente.

---

# 15. ILUMINACIÓN Y ATMÓSFERA

El escenario debe tener una iluminación natural convincente.

Reproduce:

- Dirección solar.
- Altura solar.
- Sombras proyectadas.
- Oclusión ambiental.
- Iluminación indirecta.
- Reflejos.
- Contraste.
- Bruma atmosférica.
- Profundidad del horizonte.

Presta atención a cómo cambia la iluminación entre sectores boscosos y zonas abiertas.

Evita que los árboles y edificios proyecten sombras artificiales o incoherentes.

Mantén la compatibilidad con el sistema de iluminación existente.

Si el simulador permite diferentes horarios, prepara el circuito para soportar distintas condiciones sin duplicar innecesariamente la geometría.

---

# 16. ELEMENTOS DE RETRANSMISIÓN

Reproduce los elementos característicos de un circuito de competición televisado:

- Torres de televisión.
- Cámaras elevadas.
- Plataformas de retransmisión.
- Estructuras metálicas.
- Pórticos.
- Paneles informativos.
- Marcadores.
- Pantallas.
- Torres de iluminación.
- Posiciones de fotógrafos.
- Puestos de comisarios.

Las posiciones deben investigarse y adaptarse a la distribución real.

Las cámaras deben tener visibilidad sobre la pista y no estar bloqueadas por vegetación o edificios.

---

# 17. NIVEL DE DETALLE Y OPTIMIZACIÓN

El objetivo es conseguir el máximo detalle visual sin destruir el rendimiento del simulador.

Implementa niveles de detalle cuando el motor lo permita.

### Nivel cercano

Máxima calidad:

- Geometría detallada.
- Texturas de alta resolución.
- Materiales diferenciados.
- Pequeños elementos arquitectónicos.
- Señalización legible.
- Detalles de seguridad.
- Desgaste.

### Nivel medio

- Geometría simplificada.
- Texturas optimizadas.
- Elementos arquitectónicos principales.
- Vegetación de densidad media.

### Nivel lejano

- Siluetas.
- Vegetación simplificada.
- Edificios de baja complejidad.
- Terreno de fondo.
- Elementos de horizonte.

Evita:

- Geometría innecesariamente duplicada.
- Miles de objetos individuales cuando puedan utilizarse instancias.
- Texturas repetitivas evidentes.
- Sombras costosas innecesarias.
- Objetos invisibles desde cualquier punto de vista relevante.

No elimines detalles importantes para conseguir rendimiento sin documentar primero la decisión.

---

# 18. ARQUITECTURA DEL CÓDIGO

Respeta las estructuras del simulador.

El archivo principal debe seguir utilizando el sistema de registro existente:

`TRACKS.register({...})`

Mantén:

- Identificador.
- Nombre.
- Especificaciones.
- Coordenadas.
- Puntos.
- Curvas.
- Elevaciones.
- Parámetros de pista.
- Elementos visuales.
- Cámaras.
- Configuración ambiental.

Cuando sea necesario, distribuye la lógica en módulos independientes siguiendo la arquitectura existente.

No conviertas todo el circuito en un único bloque de código gigantesco si el motor permite una organización modular.

Cada elemento debe poder mantenerse y modificarse sin afectar a los demás.

Utiliza funciones parametrizadas para elementos repetitivos.

Separa los datos de configuración de la lógica de generación.

No introduzcas valores arbitrarios dispersos por el código.

Documenta las unidades de medida y los sistemas de coordenadas.

---

# 19. VALIDACIÓN TÉCNICA

Antes de considerar terminado el circuito, ejecuta una revisión completa.

### Geometría

- Longitud total.
- Continuidad.
- Cierre del trazado.
- Anchura.
- Radios.
- Curvaturas.
- Elevaciones.
- Peraltes.
- Posición de curvas.
- Correspondencia entre coordenadas y distancias longitudinales.

### Superficies

- Ausencia de huecos.
- Ausencia de solapamientos incorrectos.
- Pianos correctamente alineados.
- Escapatorias continuas.
- Barreras correctamente colocadas.
- Transiciones suaves.

### Entorno

- Edificios sin intersecciones.
- Gradas correctamente posicionadas.
- Vegetación sin penetraciones extrañas.
- Terreno sin discontinuidades.
- Sombras coherentes.
- Publicidad orientada correctamente.

### Funcionamiento

- El circuito carga.
- El vehículo puede recorrerlo.
- La parrilla está correctamente colocada.
- El sentido de circulación es correcto.
- La entrada y salida de boxes funcionan.
- No existen errores JavaScript.
- No se han alterado otros circuitos.

Si existe un sistema de pruebas automatizadas, utilízalo.

Si no existe, identifica las pruebas manuales necesarias.

---

# 20. METODOLOGÍA DE TRABAJO

No intentes resolver todo el circuito en una única operación sin validar los resultados.

Trabaja por fases.

### FASE 1 — Auditoría

Analiza el código y todos los módulos relacionados.

Entrega:

- Arquitectura del simulador.
- Dependencias.
- Funciones disponibles.
- Limitaciones.
- Problemas detectados.
- Inconsistencias geométricas.
- Elementos existentes.
- Elementos pendientes.

No modifiques todavía el código.

### FASE 2 — Investigación

Recopila toda la información posible del circuito real.

Entrega un documento técnico con:

- Geometría.
- Curvas.
- Superficies.
- Desniveles.
- Arquitectura.
- Instalaciones.
- Seguridad.
- Vegetación.
- Publicidad.
- Elementos ambientales.

Diferencia claramente los datos confirmados, aproximados y desconocidos.

### FASE 3 — Diseño técnico

Define cómo se implementará cada elemento en el simulador.

Indica:

- Archivo responsable.
- Función necesaria.
- Parámetros.
- Coordenadas.
- Dimensiones.
- Materiales.
- Dependencias.
- Coste computacional estimado.

### FASE 4 — Implementación

Genera los archivos JavaScript completos.

Respeta las estructuras existentes.

No sustituyas el código funcional por ejemplos incompletos.

### FASE 5 — Validación

Comprueba el resultado, identifica problemas y corrígelos.

Entrega un informe de validación.

### FASE 6 — Revisión visual

Compara el resultado con fotografías reales del circuito.

Evalúa cada sector y detecta:

- Diferencias geométricas.
- Elementos ausentes.
- Proporciones incorrectas.
- Edificios poco fieles.
- Vegetación incorrecta.
- Publicidad genérica.
- Escapatorias incorrectas.
- Elementos mal posicionados.
- Gradas incompletas, especialmente la grada Mercedes-Benz de Mercedes-Arena.
- Cubiertas sin graderío, soportes o estructura visible.
- Asientos ausentes, demasiado pequeños, planos o representados únicamente mediante una textura.
- Escaleras, pasillos, accesos o sectores del graderío ausentes.
- Desproporción entre cubierta, asientos y volumen estructural.
- Grada enterrada, flotante o mal orientada respecto a la curva.

Para la grada Mercedes-Benz, realiza una comprobación visual específica desde al menos tres puntos de vista: vista aérea, vista exterior a media altura y vista desde el entorno de la pista. Comprueba que se vean el volumen escalonado, las filas de asientos, los pasillos, la fachada y la cubierta como partes de una misma estructura.

Prepara una lista priorizada de mejoras.

---

# 21. FORMATO DE ENTREGA

Para cada fase entrega:

1. Qué has investigado.
2. Qué fuentes has utilizado.
3. Qué información has confirmado.
4. Qué aproximaciones has realizado.
5. Qué limitaciones has encontrado.
6. Qué archivos has creado o modificado.
7. Qué cambios has realizado.
8. Qué pruebas has ejecutado.
9. Qué errores quedan pendientes.

Cuando generes código:

- Entrega archivos completos.
- Mantén sus rutas.
- No omitas secciones.
- No utilices pseudocódigo.
- No sustituyas implementaciones por comentarios.
- Comprueba la sintaxis.
- Comprueba las dependencias.

---

# 22. CRITERIO FINAL DE CALIDAD

No consideres terminado el circuito simplemente porque el coche pueda dar una vuelta.

El objetivo es que una persona familiarizada con Nürburgring pueda reconocer inmediatamente el circuito.

Desde la cámara del piloto deben reconocerse las curvas, las referencias visuales, los desniveles y las instalaciones.

Desde una cámara exterior deben apreciarse la arquitectura, las escapatorias, los edificios, las gradas y el entorno natural.

Desde una vista aérea debe reconocerse la geometría real del trazado y la distribución de las instalaciones.

La calidad debe evaluarse en cinco dimensiones independientes:

1. Fidelidad geométrica.
2. Fidelidad arquitectónica.
3. Fidelidad ambiental.
4. Fidelidad visual.
5. Integridad técnica del simulador.

**La prioridad absoluta es la fidelidad al circuito real. No sacrifiques exactitud por espectacularidad, ni compatibilidad por complejidad visual.**

Comienza exclusivamente por la FASE 1: AUDITORÍA.

No escribas ni modifiques código hasta haber presentado el diagnóstico completo y haber identificado cómo funciona realmente el motor del simulador.
