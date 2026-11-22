# Sistema de Prompts de Generación de Circuitos

Este directorio almacena los **prompts maestros de generación** de cada uno de los escenarios de competición.

## Archivos disponibles
- [las-vegas-strip.prompt.md](file:///Users/rafaelruiz/Documents/proyectos/Carreras/tracks/prompts/las-vegas-strip.prompt.md): Circuito urbano nocturno de F1 de Las Vegas (6,2 km).
- [nurburgring-gp.prompt.md](file:///Users/rafaelruiz/Documents/proyectos/Carreras/tracks/prompts/nurburgring-gp.prompt.md): Circuito clásico de Gran Premio de Nürburgring en las colinas de Eifel (5,15 km).
- [spa-francorchamps.prompt.md](file:///Users/rafaelruiz/Documents/proyectos/Carreras/tracks/prompts/spa-francorchamps.prompt.md): Circuito mítico de Spa-Francorchamps en el bosque de las Ardenas (7,0 km).

## ¿Cómo utilizarlos?
1. **Modificación de especificaciones:** Puedes abrir y editar cualquier archivo `.prompt.md` directamente (cambiar medidas, colores de pianos, escapatorias, añadir monumentos o ajustar el edificio de boxes).
2. **Regeneración guiada:** Cuando quieras aplicar los cambios o reconstruir un escenario, dile al asistente en el chat:
   > *"Regenera el circuito de Las Vegas usando su prompt"*  
   > o  
   > *"Regenera Nürburgring con su prompt"*
3. **Aislamiento modular estricto:** Los cambios aplicados a un circuito se limitan a sus archivos específicos (`tracks/<id>.js` y su módulo de props correspondiente), sin tocar ni afectar al resto de circuitos.
