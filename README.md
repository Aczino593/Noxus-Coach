# ⚔️ Noxus Coach — Asistente Táctico y Coach de IA In-Game para League of Legends

> **Convocatoria Oficial:** KRANKETHON SALTA GAMING + IDEA (Plan de Fomento Audiovisual 2026 – Dirección de Audiovisuales de Salta)  
> **Eje Temático:** **Track 1 — Analytics, Simulación & Coaching con IA**  
> **Repositorio Oficial:** [`https://github.com/Aczino593/Noxus-Coach`](https://github.com/Aczino593/Noxus-Coach)  
> **Documentación de Memoria y Pitch:** [docs/contexto.md](file:///c:/Users/Aczi/Documents/proyecto-Itero/docs/contexto.md)  
> **Roadmap de Próximas Implementaciones:** [docs/proximas_implementaciones.md](file:///c:/Users/Aczi/Documents/proyecto-Itero/docs/proximas_implementaciones.md)

---

## 📌 ¿Qué es Noxus Coach?

**Noxus Coach** es una plataforma integral de **analítica avanzada, simulación de draft y asistencia táctica en tiempo real** para *League of Legends*, diseñada especialmente para la comunidad competitiva y formativa de LATAM (LAS / LAN).

Combinando la ligereza y seguridad de **Tauri v2 (Rust)** con un frontend reactivo en **TypeScript**, **Vite** y **Tailwind CSS v4** bajo la estética inmersiva *Crimson Noxus*, el software opera tanto como **plataforma web de análisis** como **aplicación de escritorio con overlay in-game ultraligero** que no penaliza los FPS del jugador ni interfiere con los sistemas de seguridad de Riot Games (Vanguard / Riot Third-Party Policy).

---

## 🌟 Características Principales

```
┌────────────────────────────────────────────────────────────────────────┐
│                              NOXUS COACH                               │
├──────────────────────┬──────────────────────┬──────────────────────────┤
│    1. DRAFT COACH    │   2. OVERLAY IN-GAME │    3. PERFIL & SCOUTING  │
│  (Fase de Selección) │  (Partida en Vivo)   │   (Telemetría Riot API)  │
└──────────────────────┴──────────────────────┴──────────────────────────┘
```

### 1. 🛡️ Draft Coach & Selección de Campeones (Flujo estilo iTero)
Herramienta de simulación y asistencia en tiempo real durante la fase de selección y bloqueos:
- **Recomendaciones Inteligentes de Baneo en 3 Niveles:**
  - *Counters directos de tu campeón:* Identifica qué picks neutralizan a tu campeón (ej. si juegas Ashe: Miss Fortune, Jinx, Maokai, Tristana).
  - *Meta del carril:* Prioridades de baneo para tu línea específica (Bottom, Top, Mid, Jungla, Support).
  - *Prohibición general:* Los campeones con mayor tasa de victorias y presencia del parche actual.
- **Evaluación Táctica de la Composición 5v5:**
  - Puntuación de draft global y puntuación de la fase de carriles.
  - Métricas de Maestría, Win Rate, Sinergia promedio y Counter promedio.
  - Ratio de daño de equipo (AD % vs AP %) y cálculo de ventaja en juego temprano (*Early Game Advantage*).
- **Encuentros Carril por Carril:** Comparativa directa de los 5 enfrentamientos con índices de sinergia y counter.
- **Preparador de Builds en Draft:** Selección de runas y objetos adaptativos con el botón **«Fijar esta build»** y confirmación visual instantánea.

---

### 2. ⚡ Overlay Táctico In-Game (Atajos: `~` y `Alt + O`)
Ventana flotante de alto rendimiento que se sincroniza con el cliente de League of Legends mediante la `Live Client Data API`:

* **Pestaña `Game Data`:**
  - **Enfrentamiento en fase de líneas (Nivel 1 al 5):** Diagnóstico turno a turno con el *Estilo de Juego* recomendado (`Matón`, `Pokeo`, `All-in`), índice de *Tradeo* y nivel de *Amenaza de Muerte*.
  - **Ventaja de Escalado de Equipo:** Proyección de poder temporal dividida en *Inicio (15-26 min)*, *Juego Medio (27-32 min)* y *Juego Tardío (33+ min)*.
  - **Builds Paginadas (1/3):** Objetos de inicio (Doran + pociones), orden secuencial de compra numerado del 1 al 6 y alternativas situacionales reactivas.
  - **Matriz de Subida de Habilidades (1 al 18):** Visualización completa nivel a nivel para Q, W, E y R según la build activa.
  - **Panel lateral:** Estado del carril (0-7 min) y emparejamientos individuales del mapa.

* **Pestaña `Player Scouting`:**
  - Tarjetas de los **10 jugadores de la partida** (aliados y rivales) mostrando Nombre, `#Tag`, Rango SoloQ y LP, Win Rate general, Win Rate con el campeón e insignias de comportamiento psicológico y mecánico:
    - 🟢 *Verde:* `Visión Omnisciente`.
    - 🔵 *Cian:* `Juego agresivo en las primeras fases`, `Luchas constantes`, `A menudo haciendo ganks`, `Normalmente «Split-Pushes»`.
    - 🟣 *Púrpura:* `[Campeón] Monstruo`, `[Campeón] Jugador`, `Sin partidas recientes`.
    - 🔴 *Rojo:* `Bastante vulnerable al principio`, `Vulnerable al principio`, `Peleas muy poco frecuentes`.

* **Mini-Widget de Objetos en Esquina Inferior:**
  - Widget compacto anclado en la esquina inferior derecha.
  - Muestra el **próximo objeto a completar**, tu oro actual en mano, el oro faltante para comprarlo, casillas de verificación (`✓`) para componentes adquiridos y una tira de avance de los 6 ítems.

* **Barra de Habilidades sobre el HUD (Q-W-E-R):**
  - Indicador flotante sobre la barra de habilidades que resalta y anima en tiempo real la tecla exacta a subir al subir de nivel.

---

### 3. 📊 Perfil del Jugador y Telemetría de Cuenta
- **Conexión Oficial con Riot Games API:** Integración con endpoints `Account-v1`, `Summoner-v4`, `League-v4`, `Match-v5` y `Timeline-v5`.
- **Panel de Progreso Competitivo:** Visualización de rango actual (SoloQ y Flex), LP, porcentaje de victorias, gráfica de progresión y racha en las últimas 10 partidas.
- **Historial Completo de Partidas:** K/D/A, CS/minuto, oro por minuto, puntuación de draft y análisis de desempeño.

---

### 4. 🗺️ Herramientas Formativas Adicionales
- **Mapa Interactivo de Visión:** Localización de spots clave de centinelas defensivos, ofensivos y de control en objetivos mayores (Dragón, Barón, Buffs).
- **Preparador de Builds y Adaptación:** Catálogo completo de objetos con sugerencias contra arquetipos (Anti-Tanque, Anti-Curación, Anti-Burst, Anti-Poke).
- **Constructor de Champion Pool & Análisis del Parche 26.21:** Recomendaciones meta y tier list contextualizada.
- **Recomendador de selección local:** Lee bajo demanda los picks visibles del cliente, resume la composición rival, presenta hasta cuatro objetos situacionales con su propósito y añade alertas tácticas por campeón (por ejemplo, presión temprana, visión o engage). No selecciona, compra ni importa objetos.

---

## 🛠️ Requisitos del Sistema

* **Node.js:** Versión 18.0 o superior (recomendado Node 20 LTS).
* **npm:** Incluido con Node.js.
* **Rust & Cargo:** Requerido únicamente si deseas compilar el instalador nativo `.exe` de escritorio mediante Tauri v2.
* **League of Legends:** Cualquier versión oficial del cliente (LAN, LAS, NA, EUW, etc.).

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el Repositorio
```bash
git clone https://github.com/Aczino593/Noxus-Coach.git
cd Noxus-Coach
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar la API Key de Riot Games
Crea el archivo `.env` a partir de la plantilla:

```powershell
# En Windows PowerShell:
Copy-Item .env.example .env

# En Linux / macOS / Bash:
cp .env.example .env
```

Abre el archivo `.env` y coloca tu clave de desarrollo de Riot Games:
```env
VITE_RIOT_API_KEY=RGAPI-tu-clave-aqui
```

> **¿Cómo obtener una Riot API Key gratuita?**
> 1. Inicia sesión en el portal oficial: [developer.riotgames.com](https://developer.riotgames.com/).
> 2. En tu Dashboard principal, pulsa **Generate New API Key** (o *Regenerate*).
> 3. Copia el token generado y pégalo en el `.env`.  
> *(Las claves de desarrollo son 100% gratuitas y se renuevan con 1 clic en el portal).*

---

## 🎮 Ejecución y Pruebas

### Opción A: Modo Desarrollo Web (Ideal para evaluación rápida del Jurado)
Permite recorrer toda la aplicación, el simulador de draft, las builds y el scouting desde cualquier navegador web sin necesidad de tener League of Legends instalado:
```bash
npm run dev
```
La aplicación quedará disponible en `http://localhost:1420`.

### Opción B: Modo Aplicación de Escritorio Nativa (Tauri v2)
Lanza la aplicación de escritorio en una ventana de alto rendimiento con aceleración por hardware:
```bash
npm run tauri:dev
```

### Opción C: Compilación de Producción
* **Frontend Web Optimizado:**
  ```bash
  npm run build
  ```
* **Instalador de Escritorio (.exe para Windows):**
  ```bash
  npm run tauri:build
  ```

---

## 🧪 Cómo Probar las Funcionalidades In-Game

### Recomendador de selección local

1. Abre League of Legends y entra a una sala de selección de campeones.
2. Abre Noxus Coach y entra a **Herramientas → Recomendador de selección**.
3. Pulsa **Actualizar selección** para tomar una instantánea manual de los picks visibles. Vuelve a pulsarlo si quieres refrescarla; la app no sondea el cliente en segundo plano.
4. Si el rol no se detectó, elígelo en el menú. Revisa **Lectura táctica** para consejos preventivos por campeón y **Sugerencias de objetos** para las situaciones y el propósito de cada ítem. Son reglas heurísticas locales, no una build garantizada.

En macOS se busca el cliente en `/Applications/League of Legends.app/Contents/LoL` (también en `~/Applications`). Windows busca las carpetas habituales de Riot en los discos C:, D: y E:. Para una instalación en otra ubicación, configura `NOXUS_LEAGUE_DIR` con la carpeta `LoL` antes de iniciar Noxus Coach. En desarrollo, por ejemplo:

```bash
NOXUS_LEAGUE_DIR="/ruta/a/League of Legends.app/Contents/LoL" npm run tauri:dev
```

La integración solo solicita la sesión de selección al pulsar el botón y usa el `lockfile` local para autenticarse con el cliente en `127.0.0.1`. La función no escribe en el cliente ni accede a datos ocultos.

---

1. **Modo Demo / Navegación Inmediata:**  
   Incluso con el juego cerrado, puedes abrir la pestaña **Preparador de Builds & Draft ➔ Selección de Campeones & Bans** para probar el motor de draft, las recomendaciones de baneo, las notas de carril y la fijación de builds.
2. **Overlay en Vivo con League of Legends:**  
   - Abre League of Legends e inicia cualquier partida (Partida Normal, ARAM, Clasificatoria o la **Herramienta de Práctica**).
   - Inicia Noxus Coach. El cliente detectará automáticamente tu campeón, runas, oro, nivel y contrincantes a través de la `Live Client Data API` (`/lol-live`).
   - Presiona la tecla **`~`** (o el botón **Overlay In-Game** en la barra superior) para abrir la ventana completa.
   - Presiona **`Alt + O`** para alternar al instante entre **`Game Data`** y **`Player Scouting`**.
   - En la esquina inferior derecha verás el **Mini-Widget de Objetos**, guiándote con el siguiente objeto a comprar en base a tu oro en mano.

---

## 🏗️ Arquitectura y Stack Tecnológico

```
Noxus Coach (Frontend Vite + TS)
  ├── Live Client Poller (Sondeo pasivo a https://127.0.0.1:2999/liveclientdata)
  ├── Riot API Client (Account-v1, Summoner-v4, League-v4, Match-v5)
  ├── Draft Engine (Matriz de sinergias, counters y recomendaciones de baneo)
  └── Tauri v2 Rust Bridge (Control de ventana Always-On-Top, atajos y click-through)
```

| Capa | Tecnología | Justificación Técnica |
| :--- | :--- | :--- |
| **Framework Desktop** | [Tauri v2](https://v2.tauri.app/) (Rust) | Binario ultraligero (<15 MB), consumo de memoria <60 MB RAM y 0% de penalización de CPU frente a alternativas pesadas en Electron. |
| **Frontend Core** | [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/) | Tipado estricto, compilación instantánea y arquitectura modular basada en componentes reactivos sin sobrecarga de frameworks. |
| **Motor de Estilos** | [Tailwind CSS v4](https://tailwindcss.com/) | Estilizado atómico ultra-rápido bajo diseño temático *Crimson Noxus*. |
| **Fuentes de Datos** | Riot Developer API & Data Dragon | Integración oficial con endpoints de Riot Games, garantizando cumplimiento estricto con las políticas de terceros (*Third-Party Application Policy*). |

---

## 📁 Estructura del Proyecto y Documentación

```
proyecto-Itero/
├── docs/
│   ├── contexto.md                  # Memoria Técnica, Contexto y Documento Maestro para el Pitch
│   └── proximas_implementaciones.md # Roadmap y mejoras planificadas
├── src/
│   ├── components/                  # Vistas modulares (DraftSimulator, LiveOverlayView, ProfileView, etc.)
│   ├── data/                        # Catálogo de campeones, objetos, runas y datos mock
│   ├── lib/                         # Motores de draft, cálculo de builds, integración Riot API y Tauri
│   ├── main.ts                      # Punto de entrada y orquestación del ciclo de vida
│   └── styles.css                   # Sistema de diseño Crimson Noxus
├── src-tauri/                       # Código fuente nativo en Rust y configuración de Tauri v2
├── package.json                     # Scripts y dependencias
└── README.md                        # Documento principal para el jurado y evaluación
```

---

## 📄 Documentos para el Jurado y el Equipo

* **Para la Defensa / Pitch Deck:** Consulta [docs/contexto.md](file:///c:/Users/Aczi/Documents/proyecto-Itero/docs/contexto.md) para la justificación de mercado, la memoria técnica del Anexo I y la rúbrica de 100 puntos de la convocatoria.
* **Para el Roadmap Técnico:** Consulta [docs/proximas_implementaciones.md](file:///c:/Users/Aczi/Documents/proyecto-Itero/docs/proximas_implementaciones.md) para conocer las líneas de desarrollo previstas hacia el MVP definitivo.

---

## ⚖️ Licencia y Cumplimiento Legal

Este proyecto ha sido desarrollado con fines formativos y de investigación para la convocatoria **KRANKETHON Salta Gaming + IDEA 2026**.  
*Noxus Coach* cumple con la **Política de Aplicaciones de Terceros de Riot Games** (*Riot Games Third-Party Policy*), utilizando únicamente datos accesibles de forma pública y pasiva sin alterar archivos de memoria ni otorgar ventajas desleales durante la partida.  
*League of Legends* y *Riot Games* son marcas comerciales o marcas registradas de Riot Games, Inc.
