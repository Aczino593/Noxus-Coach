# Documento de Contexto y Guía Maestra de Documentación — **NOXUS COACH**
**Convocatoria:** KRANKETHON SALTA GAMING + IDEA (Plan de Fomento Audiovisual 2026 – Dirección de Audiovisuales de Salta)  
**Eje Temático (Anexo I):** **Track 1 — Analytics, Simulación & Coaching con IA**  
**Repositorio Oficial:** `https://github.com/Aczino593/Noxus-Coach`

---

## 1. Propósito de este Documento (Para el Equipo de Documentación y Pitch)

Este archivo (`docs/contexto.md`) reúne toda la información técnica, funcional, estratégica y reglamentaria de **Noxus Coach** para redactar:
1. **La Documentación Técnica y Memoria del Proyecto** (exigida en el **Anexo I** y **Artículo 10** de las Bases y Condiciones).
2. **El Documento de Presentación (Pitch Deck)** y el **Roadmap de Desarrollo Post-KRANKETHON (Noviembre 2026 – Junio 2027)**.
3. **El Guion de la Demo en Vivo** para la defensa ante el Comité Evaluador el **14 de noviembre de 2026** en el marco de **Salta Gaming**.

---

## 2. Resumen Ejecutivo de las Bases y Condiciones (Lo que debemos cumplir sí o sí)

### 2.1. Fechas Clave (Artículos 2º, 8º, 10º, 11º y 26º)
| Hito | Fecha | Descripción |
| :--- | :--- | :--- |
| **Instancia Presencial** | 2 al 4 de noviembre de 2026 | Ideación, arquitectura inicial y validación en Salta. |
| **Etapa de Desarrollo Libre** | 5 al 8 de noviembre de 2026 | Desarrollo remoto y seguimiento por Discord de Salta Gaming. |
| **Cierre y Entrega Final** | **9 de noviembre de 2026** | Entrega de los 3 entregables obligatorios (Repositorio, Enlace de Acceso y Documento de Pitch + Roadmap). |
| **Pitch ante el Jurado y Premiación** | **14 de noviembre de 2026** | Defensa en vivo ante el Comité Evaluador en Salta Gaming. |
| **Entrega Final del MVP y Rendición** | **Hasta el 30 de junio de 2027** | En caso de resultar beneficiarios del fondo (pozo total de hasta **$4.400.000 ARS**). |

### 2.2. Los 3 Entregables Obligatorios del 9 de Noviembre (Artículo 10º + Anexo I)
1. **Enlace al Repositorio Digital (GitHub):**  
   - URL: `https://github.com/Aczino593/Noxus-Coach`
   - Código estructurado y con instrucciones claras de instalación y ejecución en el `README.md` (**vale 15 puntos** en la rúbrica del jurado).
2. **Enlace de Acceso a una Versión Funcional / Demostrable:**  
   - **Vista Web en Vercel (Para inspección rápida de Diseño UX/UI y paneles analíticos):** Permite al jurado recorrer desde cualquier navegador la interfaz, el buscador de invocadores, el preparador de builds y el mapa interactivo de visión.
   - **Aplicación de Escritorio / Ejecución Local con League of Legends (Para la Demo Funcional In-Game):** Conecta en tiempo real con el cliente de League of Legends (`Live Client Data API`) cuando el jugador entra a una partida o herramienta de práctica, desplegando el **Overlay In-Game** (indicador de qué habilidad subir arriba de Q/W/E/R, camino de objetos sincronizado con la tienda del juego, detección del matchup y pestaña temporal de dónde wardear).
3. **Documento de Presentación (Pitch) + Documentación Técnica & Roadmap (Anexo I):**  
   - **Obligatorio según Anexo I (pág. 13):**
     - **Investigación previa del Estado del Arte** (comparativa con Mobalytics, Porofessor, iTero, RiftKit).
     - **Arquitectura de datos e innovación técnica** (cómo procesamos la telemetría de Riot Games y generamos recomendaciones tácticas en tiempo real).
     - **Roadmap detallado post-KRANKETHON** que identifique explícitamente:
       1. **Cuellos de botella actuales.**
       2. **Optimización de infraestructura.**
       3. **Ruta de evolución del producto hacia el MVP (Junio 2027).**

### 2.3. Cómo nos va a calificar el Jurado (Anexo II — Tabla de 100 Puntos)
Para que la documentación y el Pitch sumen el máximo puntaje posible, cada sección debe responder directamente a estos **5 criterios**:

1. **Innovación e Idea de Negocio (20 pts):**  
   Originalidad de la propuesta, diferenciación frente a apps extranjeras, claridad en la propuesta de valor, mercado objetivo (LATAM / LAS / LAN) y modelo de sostenibilidad.
2. **Funcionalidad y Complejidad Técnica (25 pts):**  
   Estabilidad de la demo en vivo (MVP funcional conectándose a una partida de League of Legends), integración con APIs oficiales de Riot Games (`Account-V1`, `Summoner-V4`, `League-V4`, `Match-V5`, `Timeline-V5`, `Data Dragon`, `Live Client Data`), motores de recomendación de Draft, Builds y Visión.
3. **Prolijidad y Calidad del Repositorio (15 pts):**  
   Buenas prácticas de ingeniería, TypeScript estricto, arquitectura modular limpia e instrucciones claras en el repositorio.
4. **Diseño UX / UI y Experiencia de Usuario (20 pts):**  
   Navegación intuitiva, estética oscura inmersiva inspirada en el ecosistema de esports (Noxus Dark UI) y un **Overlay In-Game** limpio y no intrusivo.
5. **Pitch, Presentación y Roadmap (20 pts):**  
   Capacidad de síntesis, claridad para responder preguntas del jurado y planificación técnica/presupuestaria realista hacia junio de 2027.

> **Nota Reglamentaria Importante (Artículo 21º inc. b):**  
> En la diapositiva final del Pitch, en la documentación y en la sección de créditos del MVP debe incluirse la leyenda:  
> ***"Con el apoyo de Secretaría de Cultura de la Provincia de Salta, Plan de Fomento IDEA – Impulso al Desarrollo Audiovisual y Salta Gaming"***.

---

## 3. ¿Qué es NOXUS COACH? (Propuesta de Valor y Problema que Resuelve)

### 3.1. El Problema
En **League of Legends**, la gran mayoría de los jugadores de habla hispana (especialmente en los servidores de **LAS** y **LAN**) pierden partidas no por falta de habilidad mecánica, sino por **errores de macrojuego, falta de visión en momentos clave, armado de objetos (builds) estático y malas decisiones en la selección de campeones (Draft)**:
- Las herramientas actuales del mercado (**Mobalytics, Porofessor, Blitz, iTero**) presentan tres grandes limitaciones para el jugador y los equipos amateur de nuestra región:
  1. **Sobrecarga visual y alto consumo de recursos:** Dependen de entornos pesados como *Overwolf*, que consumen mucha memoria RAM y reducen los FPS en computadoras de gama media/baja.
  2. **Estadísticas crudas sin diagnóstico pedagógico:** Te dicen *"tu Vision Score fue 18"*, pero **no te muestran sobre el mapa actualizado en qué arbusto exacto debías colocar un Ward de Control (Pink) ni en qué minuto te emboscó el jungla rival por no tener visión**.
  3. **Barrera idiomática y desconexión entre Pre-Game, In-Game y Post-Game:** Herramientas de IA de draft como *iTero* están en inglés y separadas del análisis de visión post-partida y del overlay ligero en partida.

### 3.2. Nuestra Solución: NOXUS COACH
**Noxus Coach** es una aplicación integral de **Analytics, Simulación Predictiva de Draft y Coaching Táctico en Tiempo Real** para League of Legends (enmarcada en el **Track 1** de la KRANKETHON). Acompaña al jugador en las **3 fases críticas de una partida**:

1. **PRE-PARTIDA (Preparador de Builds, Draft AI & Análisis de Parche):**  
   Recomienda qué campeón elegir según la composición aliada y enemiga (con sinergia, counter-pick y equilibrio de daño AD/AP), ofrece **4 rutas de armado estilo Mobalytics** (*Most Popular, Highest WR, Alternative, Off-Meta*) e incluye análisis de impacto del parche y gestión de *Champion Pool*.
2. **EN PARTIDA (Overlay In-Game conectado en vivo a League of Legends):**  
   Al entrar a una partida (o herramienta de práctica), detecta automáticamente tu campeón, tu nivel, tus compras en la tienda y los campeones enemigos, mostrando **3 indicadores fundamentales y ultraligeros**:
   - **Indicador arriba de las habilidades (`Q / W / E / R`):** Se ubica en la parte inferior central sobre el HUD de LoL e ilumina qué habilidad subir en cada nivel (`1 a 18`).
   - **Camino de objetos compacto (solo iconos):** Marca automáticamente con un tilde (`✓`) los objetos que vas comprando en la tienda del juego y resalta cuál es el siguiente objeto a armar.
   - **Pestaña temporal de visión ("Dónde Wardear"):** Aparece por 10 segundos en las ventanas clave de la partida indicando con un recorte del mapa en qué arbusto colocar el centinela según tu línea, y luego se oculta sola para no estorbar.
3. **POST-PARTIDA (Perfil, Tracking de Jugadores, Analizador de Ganks/Invasiones y Mapa Táctico):**  
   Analiza el historial real mediante la API de Riot Games, incluye un **buscador con autocompletado inteligente de perfiles**, compara el rendimiento por rol contra el promedio de tu liga y reconstruye sobre el **mapa actualizado de la Grieta del Invocador** cada muerte temprana por gank o invasión de jungla.

---

## 4. Investigación del Estado del Arte (Requisito del Anexo I)

Para la sección **"Estado del Arte"** de la documentación técnica, esta tabla resume nuestra investigación frente a las herramientas líderes del mercado:

| Característica / Plataforma | **Mobalytics** | **Porofessor.gg** | **iTero (Draft AI)** | **RiftKit / Map Tools** | **NOXUS COACH (Nuestra Solución)** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Motor de Recomendación de Draft (Sinergia + Counter + Composición)** | Parcial | Básico | Sí (Inglés / Pago) | No | **Sí (100% en Español e integrado con el Overlay)** |
| **Variantes de Builds por Campeón (Most Popular, Highest WR, Alternative, Off-Meta)** | Sí | Solo 1-2 | No | No | **Sí (4 Presets dinámicos + adaptación anti-tanque/anti-curación)** |
| **Overlay In-Game ligero sin depender de Overwolf** | No (Usa Overwolf) | No (Usa Overwolf) | App separada | No tiene | **Sí (Arquitectura híbrida Web + Tauri v2 ultraligera)** |
| **Diagnóstico de Ganks e Invasiones en las 3 Líneas + Jungla con Coordenadas** | No | No | No | No | **Sí (Reconstruye el vector de gank sobre el mapa real actualizado)** |
| **Mapa Interactivo Season 14/15+ con 12 Campamentos, 60 Wards y Timings** | No | No | No | Solo pizarra manual | **Sí (60 spots por rol/lado, regla de 4 CS, Pinks y líneas de visión)** |
| **Autocompletado de Perfiles y Tracking Rápido Multi-Región (LAS/LAN/BR/NA/EUW/KR)** | Sí | Sí | No | No | **Sí (Buscador instantáneo con rango, LP y sugerencias)** |

---

## 5. Módulos y Funcionalidades Desarrolladas en la Aplicación

### Módulo 1: Overlay In-Game Conectado en Vivo a League of Legends
- **Qué hace:**
  - Se conecta en tiempo real a la **Live Client Data API (`127.0.0.1:2999`)** de League of Legends apenas el jugador entra a una partida o herramienta de práctica.
  - Detecta automáticamente el campeón propio, los campeones rivales, el nivel actual del jugador, los puntos asignados a cada habilidad, el oro disponible y los objetos comprados en la tienda.
  - Despliega **3 indicadores esenciales y no intrusivos**:
    1. **Indicador sobre las Habilidades (`Q · W · E · R`):** Ubicado encima de la barra de habilidades del juego, resalta con una alerta visual (`▲ SUBIR`) qué tecla subir en el nivel actual según el orden óptimo del campeón.
    2. **Camino de Objetos Compacto (Solo Iconos):** Secuencia visual de iconos (`Inicial ➔ Botas ➔ Core 1 ➔ Core 2 ➔ Core 3...`) que tilda automáticamente (`✓`) los objetos ya comprados en la partida y avisa cuando tienes el oro suficiente en bolsa para comprar el siguiente.
    3. **Pestaña Temporal de Visión ("Dónde Wardear" - 10s):** Notificación emergente de corta duración (10 segundos con barra de progreso) que muestra un recorte del mapa actualizado indicando dónde colocar el centinela en las ventanas críticas de gank (`01:15`, `02:30`, `04:30+`) y se cierra sola automáticamente.

### Módulo 2: Preparador de Builds, Runas, Draft Coach IA y Análisis de Parche
- **Qué hace:**
  - **4 Opciones de Builds y Runas estilo Mobalytics:** Para todos los campeones del juego (sincronizados con Riot Data Dragon), genera 4 configuraciones con su tasa de victoria:
    1. **Most Popular (Meta 1):** El estándar más jugado del parche.
    2. **Highest WR (Meta 2):** La variante de mayor tasa de victoria para maximizar ventaja.
    3. **Alternative:** Variante adaptativa de utilidad o supervivencia.
    4. **Off-Meta (Antimeta):** Árbol de runas y armado alternativo.
  - **Adaptación Reactiva al Equipo Enemigo:** Si en el simulador de Draft se cargan rivales con tanques, curación excesiva, daño mágico (AP) o asesinos físicos (AD), el motor adapta los objetos situacionales (*Cortacuras*, *Penetración %*, *Zhonya / Velo del Hada*) y explica cada ajuste.
  - **Recomendador Inteligente de Campeón por Línea (Estilo iTero):** Analiza los aliados y enemigos seleccionados y sugiere los mejores campeones para tu rol evaluando *Counter directo*, *Sinergia aliada* y *Balance de daño*.
  - **Análisis de Parche:** Evalúa cómo los *Buffs*, *Nerfs* y ajustes de objetos del parche impactan directamente en el *Champion Pool* del jugador.

### Módulo 3: Perfil del Invocador, Telemetría Riot API y Buscador con Autocompletado
- **Qué hace:**
  - Conecta con los endpoints oficiales de **Riot Games** (`Account-V1`, `Summoner-V4`, `League-V4`, `Match-V5` y `Match-V5 Timeline`) para regiones como `LAS`, `LAN`, `BR`, `NA`, `EUW` y `KR`.
  - **Buscador con sugerencias en vivo (`PROFILES`):** Al escribir el nombre de un jugador, despliega una lista de perfiles sugeridos con icono de invocador, región, emblema de rango y división (ej. `E1`, `S3`, `D2`) sin obligar a recordar el `#TAG` exacto.
  - **Rendimiento por Rol, Champion Pool y Estadísticas:** Muestra *Solo/Dúo* y *Flexible*, Winrate global, KDA, CS/min, Visión/min, gráfico radar comparativo contra el promedio de cada liga (`Hierro` a `Challenger`), curvas de **Oro, Experiencia (XP) y CS del minuto 0 al 30**, gestión de *Champion Pool* y tabla de enfrentamientos (*Matchups*).

### Módulo 4: Analizador Táctico de Ganks, Visión e Invasiones (Detalle de Partida)
- **Qué hace:**
  - En el detalle de cada partida jugada, permite inspeccionar a cualquiera de los **5 roles** (`Top`, `Jungla`, `Mid`, `ADC`, `Support`).
  - Detecta las **muertes tempranas (minutos 00:00 a 14:00)** ocasionadas por ganks en las **3 líneas (`Top`, `Mid`, `Bot`)** o por **invasiones a campamentos en la `Jungla`**.
  - Muestra sobre el **mapa actualizado de League of Legends** la posición exacta de la baja, la trayectoria desde el arbusto de entrada y cuántos segundos de reacción (`2-4 seg`) habría dado colocar un *Ward de Control (Pink)* a tiempo.

### Módulo 5: Mapa Interactivo de Visión, Campamentos y Enciclopedia de Control de Mapa
- **Qué hace:**
  - Incorpora el **mapa actualizado de la Grieta del Invocador** con zoom táctico por sectores (`Mapa 100%`, `Zoom Top`, `Zoom Mid`, `Zoom Bot`, `Zoom Jungla`).
  - **16 Marcadores de Jungla y Objetivos:** Incluye los **6 campamentos del Lado Azul** (`Gromp`, `Buff Azul`, `Lobos`, `Dagarracos`, `Buff Rojo`, `Rocosos`), los **6 campamentos del Lado Rojo** (`Rocosos`, `Buff Rojo`, `Dagarracos`, `Lobos`, `Buff Azul`, `Gromp`) y los **4 objetivos del río** (`Larvas / Barón`, `Escurridizo Norte`, `Dragón Elemental`, `Escurridizo Sur`).
  - **60 Puntos de Visión Profesionales:** Filtrables por Lado (`Azul` / `Rojo`), Rol y Tipo de centinela, con el minuto exacto recomendado, rutas de gank, líneas de visión (Defensiva, Neutra y Ofensiva), plantas (*Frutos del Vidente*) y una **Enciclopedia Interactiva en 4 pestañas** (Regla de los 4 CS, Guía de Pinks, Control de Objetivos y Líneas de Visión).

---

## 6. Arquitectura Técnica y Stack Tecnológico (Para la Memoria Técnica)

- **Frontend & Motor Analítico:** TypeScript 5.7 (Tipado estricto), Vite 6.4, Tailwind CSS, visualización vectorial SVG generada dinámicamente.
- **Cliente de Escritorio Nativo (Overlay):** **Tauri v2 + Rust**, que reemplaza a motores pesados como Electron/Overwolf reduciendo el consumo de memoria RAM en más de un **80%** y permitiendo ventanas transparentes *always-on-top* sobre el juego.
- **Integración de Datos y APIs:**
  - **Riot Live Client Data API (`https://127.0.0.1:2999/liveclientdata/allgamedata`):** Lectura en tiempo real durante la partida del campeón activo, nivel, habilidades, oro, inventario de objetos y lista de jugadores.
  - **League Client LCU API (`lockfile`):** Detección local de la sesión del cliente de League of Legends.
  - **Riot Games Regional & Platform APIs:** `Account-V1`, `Summoner-V4`, `League-V4`, `Match-V5` y `Match-V5 Timeline`.
  - **Riot Data Dragon CDN:** Sincronización de iconos de campeones, objetos, runas y hechizos en español.
  - **Despliegue Web en Vercel:** Configurado con proxy Serverless para permitir la visualización inmediata del diseño UX/UI y los módulos analíticos desde el navegador.

---

## 7. Cuellos de Botella, Optimización de Infraestructura y Roadmap hacia el MVP (Requisito Expreso del Anexo I)

> **Importante para la Documentación:**  
> El **Anexo I (pág. 13)** solicita textualmente: *"Toda propuesta deberá incluir una investigación previa del estado del arte y un roadmap detallado que identifique cuellos de botella, optimización de infraestructura y la ruta de evolución del producto post-KRANKETHON"*.

### 7.1. Identificación de Cuellos de Botella Actuales
1. **Límites de Tasa (Rate Limits) de la API de Desarrollo de Riot Games:**  
   Las claves de desarrollo (*Development API Keys*) caducan cada 24 horas y limitan la cantidad de consultas simultáneas al hidratar historiales con *Timelines* completos.
2. **Ausencia de Coordenadas `(x, y)` en el evento `WARD_PLACED` de Match-V5:**  
   La API pública `Match-V5 Timeline` entrega las coordenadas exactas `(x, y)` de cada muerte (`CHAMPION_KILL`), pero omite las coordenadas exactas en los eventos `WARD_PLACED` (solo reporta el jugador, el tipo de ward y el segundo).
3. **Certificados SSL Locales Autofirmados del Cliente de LoL:**  
   La API en vivo del juego (`127.0.0.1:2999`) utiliza un certificado autofirmado local de Riot que requiere ser intermediado por el proceso nativo de escritorio (Tauri/Node) para evitar bloqueos de seguridad del navegador.

### 7.2. Plan de Optimización de Infraestructura (Post-KRANKETHON)
1. **Backend Propio con Caché Distribuido (Redis + PostgreSQL) y Riot Production Key:**  
   Implementar un servicio backend en la nube que administre la **Production API Key** de Riot Games, almacenando en caché las partidas ya consultadas y pre-calculando estadísticas regionales de **LAS y LAN** para reducir en más de un **90%** las llamadas repetidas a Riot.
2. **Módulo de Visión por Computadora (Computer Vision) Ligero en el Cliente Tauri:**  
   Para registrar con precisión milimétrica dónde se colocan los centinelas en vivo y detectar apariciones fugaces del jungla enemigo en el minimapa, se integrará en Rust un lector ligero de la región del minimapa con **ONNX / YOLOv8-nano cuantizado en local**, con un impacto menor al 2% de CPU.
3. **Conector Nativo LCU + Live Client en Rust 100% Autónomo:**  
   Empaquetar dentro del binario de Rust (Tauri) el sondeo directo tanto del `lockfile` del cliente (para importar runas y builds en 1 clic durante la selección de campeones) como de `127.0.0.1:2999` (para el Overlay en partida sin requerir servidor local adicional).

### 7.3. Roadmap de Desarrollo hacia el MVP Final (Noviembre 2026 – Junio 2027)
Alineado con el plazo oficial del **Artículo 26º (30 de junio de 2027)** y los **gastos elegibles del Artículo 23º**:

- **Fase 1 — Consolidación del Cliente Tauri y Conector LCU/Live Client (Noviembre – Diciembre 2026):**
  - Gestión y aprobación de la *Production API Key* ante Riot Games.
  - Integración 100% nativa en Rust del detector de *Champ Select* (LCU API), auto-importación de runas/objetos al cliente de LoL y perfeccionamiento del Overlay transparente *click-through*.
- **Fase 2 — Infraestructura Cloud, Base de Datos Regional y Motor Predictivo IA (Enero – Febrero 2027):**
  - Despliegue de base de datos PostgreSQL + Redis en la nube para indexar estadísticas reales del parche en los servidores **LAS y LAN**.
  - Entrenamiento del motor predictivo de probabilidades de victoria en Draft (*Win Probability Engine*).
- **Fase 3 — Computer Vision en Minimapa y Alertas Tácticas Inteligentes (Marzo – Abril 2027):**
  - Implementación del detector óptico de minimapa (ONNX Runtime) para rastrear rotaciones enemigas y activar las pestañas emergentes de visión de forma dinámica según los movimientos reales de la partida.
- **Fase 4 — Beta Cerrada con Equipos de Esports de Salta, Optimización UX y Entrega Final del MVP (Mayo – Junio 2027):**
  - Pruebas de validación y experiencia de usuario con jugadores y equipos locales en el marco de **Salta Gaming**.
  - Empaquetado del instalador firmado para Windows (`.msi` / `.exe`), memoria técnica final y rendición ante la Dirección de Audiovisuales (**antes del 30 de junio de 2027**).

### 7.4. Encuadre de Presupuesto según Gastos Elegibles (Artículos 22º, 23º y 24º)
De acuerdo con el **Artículo 23º** (y respetando el **Artículo 24º** que excluye la compra de equipamiento/hardware), los fondos del beneficio se destinan exclusivamente a:
1. **Inciso a) Honorarios y Servicios Profesionales Técnicos (65%):** Desarrollo de software (Frontend, Backend/Rust Tauri, IA/Computer Vision), diseño UX/UI y testing QA.
2. **Inciso b) Licencias, Suscripciones y Servicios Tecnológicos Cloud (25%):** Servidores cloud, bases de datos gestionadas (PostgreSQL + Redis), almacenamiento, certificados de firma de código para Windows y servicios de API.
3. **Inciso c) Recursos Digitales y Servicios de Prueba y Validación (10%):** Testeo estructurado de experiencia de usuario (UX) con jugadores de esports locales, recursos gráficos y validación del MVP.

---

## 8. Estructura Sugerida para el Pitch del 14 de Noviembre (Guía de Diapositivas)

1. **Portada:**  
   *Noxus Coach — Tu Analista Táctico y Coach de IA en Tiempo Real para League of Legends.* (Track 1: Analytics, Simulación & Coaching con IA).
2. **El Problema:**  
   Perdemos partidas por malas decisiones en el Draft, builds estáticas y muertes por falta de visión temprana. Las apps actuales basadas en Overwolf son pesadas, bajan los FPS y no enseñan dónde wardear ni por qué sufriste un gank.
3. **La Solución (Noxus Coach en 3 Fases):**  
   - **Pre-Game:** Preparador de Builds (4 variantes Mobalytics) + Recomendador de Campeón por composición.
   - **In-Game:** Overlay ligero que detecta la partida en vivo y muestra qué habilidad subir arriba de Q/W/E/R, el camino de objetos sincronizado con la tienda y una pestaña temporal de 10 segundos que indica dónde wardear.
   - **Post-Game:** Buscador con autocompletado + Analizador de Ganks e Invasiones sobre el mapa actualizado.
4. **Demo Funcional en Vivo:**  
   - Mostrar la interfaz general y el diseño en la versión Web (Vercel) y el Mapa de Visión actualizado.
   - Entrar a una **Partida de Entrenamiento en League of Legends** y mostrar cómo el **Overlay In-Game** detecta automáticamente el campeón, marca qué habilidad subir arriba de `Q / W / E / R`, actualiza el camino de objetos al comprar en la tienda y despliega la pestaña temporal indicando dónde wardear.
5. **Estado del Arte y Diferenciación Competitiva:**  
   Comparativa frente a Mobalytics, Porofessor e iTero (bajo consumo con Tauri/Rust, diagnóstico espacial sobre el mapa actual y enfoque 100% en español para LATAM).
6. **Modelo de Sostenibilidad y Mercado Objetivo:**  
   Modelo *Freemium* para jugadores individuales de LATAM + licencias *B2B* para academias de esports, clubes y torneos regionales.
7. **Arquitectura Técnica y Roadmap hacia Junio 2027:**  
   Resolución de cuellos de botella (Riot Production Key + Caché Redis + Computer Vision en minimapa con ONNX + LCU Auto-Import) y las 4 etapas de ejecución hasta junio de 2027.
8. **Equipo y Cierre Institucional:**  
   Presentación del equipo e inclusión de la leyenda reglamentaria: *"Con el apoyo de Secretaría de Cultura de la Provincia de Salta, Plan de Fomento IDEA y Salta Gaming"*.
