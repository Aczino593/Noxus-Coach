# Noxus Coach · Analítica y Coaching de League of Legends

> Aplicación de escritorio moderna orientada a la pedagogía y mejora de fundamentos para jugadores principiantes y casuales de League of Legends. Desarrollada con **Tauri v2**, **TypeScript**, **Vite** y **Tailwind CSS v4** bajo la estética inmersiva **Crimson Noxus**.

---

## Características Principales

### 1. Fundamentos Simplificados de Rendimiento
- **Semáforo de Farmeo (CS/min):** Diagnóstico instantáneo con código de color visual (Verde `> 7.0`, Amarillo `5.0 - 6.5`, Rojo `< 5.0`) y cálculo en tiempo real del **oro perdido** traducido a su equivalente en objetos.
- **Tarjetas Pedagógicas de Fundamentos:** Explicaciones claras sobre Kiting y Espaciado, Visión y Control de Oleadas.

### 2. Preparador de Builds y Objetos Reactivos
- **Selector de 5 Roles Interactivo:** Cambia dinámicamente entre `[Top]`, `[Jungla]`, `[Mid]`, `[ADC / Bot]` y `[Support]`.
- **Ruta Secuencial de 6 Objetos Finales:** Desglose paso a paso de cada objeto con costes acumulados.
- **Adaptación Dinámica frente al Rival:** Reacciona en tiempo real según el arquetipo del rival:
  - *Anti-Tanque:* Incorpora Liandry, Lord Dominik o Cuchilla Negra.
  - *Anti-Curación:* Incorpora Morello, Recordatorio Mortal, Chempunk o Cota de Espinas.
  - *Anti-Burst:* Incorpora Zhonya, Arcoescudo o Danza de la Muerte.
  - *Anti-Poke:* Incorpora Velo de la Banshee o Filo de la Noche.
- **Aviso Táctico Temprano:** Alertas de componentes baratos (Orbe del Olvido, Llamada del Verdugo, Chaleco de Zarzas) tras el primer ítem completo.
- **Consejos Pedagógicos de Matchup:** 5 consejos tácticos detallados para cualquier enfrentamiento (enfriamientos, primer back, nivel 6, ítems situacionales y condición de victoria).
- **Cobertura Total:** Perfiles de runas y builds auténticos para los 87 campeones del juego.

### 3. Radar de Ganks & Minimapa Táctico de Bot Lane
- **Semáforo de Riesgo de Gank:** Cálculo en tiempo real del nivel de peligro (`Bajo`, `Medio`, `Peligro Crítico`) basado en tiempos de jungla enemiga y posición de la oleada.
- **Minimapa Interactivo:** Visualización de rutas de entrada (Río, Tribush, Línea), zonas de control y sugerencias de wards.

### 4. Mapa de Visión de la Grieta del Invocador
- Mapa oficial en alta resolución con spots tácticos de centinelas defensivos, ofensivos y de control en objetivos neutrales (Dragón, Barón, Buffs).

### 5. Simulador de Draft & Modo Clash
- Análisis de composición de equipo, evaluación de control de masas (CC), curva de daño (Early vs Late) y sinergia grupal.

---

## Requisitos Previos

- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
- [npm](https://www.npmjs.com/) (incluido con Node.js)
- [Rust](https://www.rust-lang.org/) y herramientas C++ de compilación (únicamente si vas a compilar la app de escritorio Tauri nativa).

---

## Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   cd TU_REPOSITORIO
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar las Variables de Entorno (`.env`):**
   Copia el archivo de ejemplo:
   ```bash
   # En Windows PowerShell:
   copy .env.example .env

   # En Linux / macOS / Bash:
   cp .env.example .env
   ```

   Abre el archivo `.env` y coloca tu API Key personal de Riot Games:
   ```env
   VITE_RIOT_API_KEY=RGAPI-tu-clave-aqui
   ```

---

## ¿Cómo obtener la API Key de Riot Games?

1. Ingresa al portal oficial de desarrolladores: [Riot Games Developer Portal](https://developer.riotgames.com/).
2. Inicia sesión con tu cuenta de Riot Games / League of Legends.
3. En el **Dashboard**, verás la sección **DEVELOPMENT API KEY**.
4. Haz clic en **GENERATE NEW API KEY** (o *Re-generate*).
5. Copia la clave (formato `RGAPI-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`) y pégala en tu archivo `.env`.

>**Nota:** Las claves de desarrollo gratuitas expiran cada 24 horas. Para renovarla solo debes volver a presionar *Regenerate* en el portal oficial de Riot Games.
>
>**Modo Demostración y Consulta Local:** Permite explorar herramientas teóricas como el Mapa de Visión, el Simulador de Draft y el Planificador de Builds de inmediato, sin necesidad de ingresar una API Key activa ni tener el juego abierto, utilizando catálogos locales y datos de referencia preinstalados.

---

## Ejecución del Proyecto

### Modo Desarrollo Web (Navegador)
Para probar rápidamente la interfaz y la lógica en tu navegador:
```bash
npm run dev
```
La aplicación se abrirá en `http://localhost:1420`.

### Modo Desarrollo de Escritorio (Tauri v2)
Para correr la ventana nativa de escritorio:
```bash
npm run tauri:dev
```

### Compilar para Producción

- **Frontend Web:**
  ```bash
  npm run build
  ```
- **Instalador de Escritorio (.exe / instalador nativo):**
  ```bash
  npm run tauri:build
  ```

---

## Stack Tecnológico

- **Framework de Escritorio:** [Tauri v2](https://v2.tauri.app/) (Rust + Webview2)
- **Bundler y Dev Server:** [Vite](https://vite.dev/)
- **Lenguaje Frontend:** [TypeScript](https://www.typescriptlang.org/) (ESNext) + HTML5
- **Estilos y Diseño:** [Tailwind CSS v4](https://tailwindcss.com/) (Crimson Noxus theme)
- **APIs y Datos:** [Riot Developer API](https://developer.riotgames.com/) (Summoner-v4, Spectator-v5, Match-v5), Data Dragon y CommunityDragon
- **Iconos y Multimedia:** Lucide Icons & Riot Games Game Assets oficiales
- **Tipografía:** Inter & JetBrains Mono Variable Fonts

---

## Licencia

Este proyecto es para fines educativos y de práctica. League of Legends y Riot Games son marcas registradas de Riot Games, Inc.
