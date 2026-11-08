# Próximas Implementaciones — Noxus Coach

Lista simple y ordenada de las funcionalidades y mejoras a desarrollar en las siguientes etapas del proyecto.

---

## 1. Selección de Campeones (Draft Coach)
- [ ] **Detección automática de la sala de selección:** Conectar con la API del cliente de LoL (`/lol-champ-select/v1/session`) para detectar automáticamente los picks y bans en tiempo real sin intervención manual.
- [ ] **Importación automática en 1 click:** Botón para aplicar directamente las runas seleccionadas y la página de objetos recomendada a tu cliente de League of Legends.
- [ ] **Recomendación según maestría del rival:** Cruzar los datos del scouting del rival para priorizar baneos a campeones que el enemigo use frecuentemente.

---

## 2. Overlay en Partida (In-Game)
- [ ] **Arrastre y personalización del Mini-Widget de Objetos:** Permitir arrastrar el widget a cualquier esquina o posición preferida de la pantalla.
- [ ] **Alertas de oro disponible:** Aviso sonoro o visual discreto cuando acumules el oro suficiente para completar el siguiente ítem clave (ej. *"Tienes oro para Espadón"*).
- [ ] **Temporizadores de Hechizos de Invocador:** Marcadores para registrar con 1 click el uso de Destello (Flash) y Teleport de los rivales.
- [ ] **Sugerencias de Visión dinámicas:** Recomendaciones en el minimapa de dónde colocar centinelas (wards) según el minuto de la partida y el posicionamiento del jungla rival.
- [ ] **Modo Click-Through:** Opción para que el overlay sea transparente a los clics del ratón durante peleas intensas y no interfiera con el juego.

---

## 3. Estadísticas y Perfil (Scouting)
- [ ] **Carga automática de los 10 jugadores:** Sincronizar automáticamente la pantalla de carga (`Player Scouting`) con la API de Riot Games para traer el historial y las insignias de comportamiento en vivo.
- [ ] **Gráficos de rendimiento post-partida:** Análisis visual de daño infligido, oro por minuto y puntuación de visión al terminar cada partida.
- [ ] **Detección de rachas y estado anímico:** Indicadores de si un rival viene en racha de derrotas (*tilt*) o racha de victorias para ajustar la agresividad en línea.

---

## 4. Configuración y Rendimiento
- [ ] **Compatibilidad y modo seguro con Riot Vanguard:** Ajustar procesos de lectura pasiva para garantizar 100% de cumplimiento con las políticas de Riot Games.
- [ ] **Selector de resoluciones y escalas del HUD:** Adaptar automáticamente el tamaño de las fuentes y cajas según monitores 1080p, 1440p o 4K.
- [ ] **Guardado local de preferencias:** Recordar las builds fijadas, el campeón principal y la configuración gráfica entre sesiones.
