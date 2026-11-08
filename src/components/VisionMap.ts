import { createView } from '../lib/view';
import { esc, icon, roleIcon } from '../lib/ui';
import { mapImg } from '../lib/assets';
import { ROLES, ROLE_LABEL, type Role } from '../types';
import {
  WARD_TYPE_CONFIG,
  getVisionSpots,
  type VisionSpot,
  type WardType,
} from '../data/visionSpots';

type MapZoom = 'full' | 'top' | 'mid' | 'bot' | 'jungle';

interface State {
  role: Role;
  side: 'blue' | 'red';
  selectedSpotId: string | null;
  filterType: WardType | 'all';
  showVisionRadius: boolean;
  showGankRoutes: boolean;
  showJungleCamps: boolean;
  zoom: MapZoom;
}

const ZOOM_TRANSFORM: Record<MapZoom, { label: string; style: string }> = {
  full: { label: 'Mapa 100%', style: 'transform: scale(1) translate(0%, 0%);' },
  top: { label: 'Zoom Top', style: 'transform: scale(1.75) translate(18%, 18%);' },
  mid: { label: 'Zoom Mid', style: 'transform: scale(1.65) translate(0%, 0%);' },
  bot: { label: 'Zoom Bot', style: 'transform: scale(1.75) translate(-18%, -18%);' },
  jungle: { label: 'Zoom Jungla', style: 'transform: scale(1.55) translate(8%, -4%);' },
};

interface CampMarker {
  id: string;
  label: string;
  spawn: string;
  left: number;
  top: number;
  color: string;
}

const JUNGLE_CAMP_MARKERS: CampMarker[] = [
  { id: 'void', label: 'Larvas / Barón', spawn: '05:00 / 20:00', left: 34.0, top: 30.8, color: '#a855f7' },
  { id: 'dragon', label: 'Dragón Elemental', spawn: '05:00', left: 65.8, top: 68.8, color: '#f97316' },
  { id: 'blue_b', label: 'Buff Azul (Azul)', spawn: '01:30', left: 26.8, top: 46.2, color: '#38bdf8' },
  { id: 'gromp_b', label: 'Gromp (Azul)', spawn: '01:42', left: 15.8, top: 43.2, color: '#38bdf8' },
  { id: 'wolves_b', label: 'Lobos (Azul)', spawn: '01:30', left: 27.5, top: 56.5, color: '#38bdf8' },
  { id: 'raptors_b', label: 'Dagarracos (Azul)', spawn: '01:30', left: 47.2, top: 63.5, color: '#ef4444' },
  { id: 'red_b', label: 'Buff Rojo (Azul)', spawn: '01:30', left: 51.8, top: 72.2, color: '#ef4444' },
  { id: 'krugs_b', label: 'Rocosos (Azul)', spawn: '01:42', left: 56.5, top: 82.0, color: '#ef4444' },
  { id: 'blue_r', label: 'Buff Azul (Rojo)', spawn: '01:30', left: 73.0, top: 53.5, color: '#38bdf8' },
  { id: 'red_r', label: 'Buff Rojo (Rojo)', spawn: '01:30', left: 48.2, top: 27.5, color: '#ef4444' },
  { id: 'raptors_r', label: 'Dagarracos (Rojo)', spawn: '01:30', left: 52.5, top: 36.2, color: '#ef4444' },
];

/**
 * Rutas actualizadas del mapa actual (Season 14+):
 * Muestran los nuevos pasillos de gank e invasión por rol.
 */
const GANK_ROUTES_BY_ROLE: Record<Role, { label: string; points: string; color: string }[]> = {
  top: [
    { label: 'Gank por Río Superior (Pixel Bush)', points: '34,31 23,24.5 17,18', color: '#ff2e4d' },
    { label: 'Gank por Nuevo Tribush Superior', points: '48,27.5 31,20.5 23,14', color: '#facc15' },
    { label: 'Dive por Gromp / Torre Azul', points: '26,46 17.5,36.5 10.5,29', color: '#38bdf8' },
  ],
  jungle: [
    { label: 'Invasión Río Norte ➔ Buff Azul', points: '42,39 34.5,44.5 26.8,46.2', color: '#ff2e4d' },
    { label: 'Invasión Río Sur ➔ Buff Rojo', points: '58,61 55.2,63.5 51.8,72.2', color: '#facc15' },
    { label: 'Contra-jungla a Dagarracos', points: '50,49 52.5,36.2 48.2,27.5', color: '#38bdf8' },
  ],
  mid: [
    { label: 'Gank Lateral Río Norte', points: '34,31 42.5,42.8 49.5,49.5', color: '#ff2e4d' },
    { label: 'Gank Lateral Río Sur', points: '65.8,68.8 57.2,56.8 50.5,50.5', color: '#facc15' },
    { label: 'Flanqueo por Rampa de Dagarracos', points: '52.5,36.2 55.5,42 50,49', color: '#38bdf8' },
  ],
  adc: [
    { label: 'Gank por Río Inferior (Pixel Bush)', points: '65.8,68.8 76.8,75 83.5,82.5', color: '#ff2e4d' },
    { label: 'Gank por Nuevo Pasillo Rojo (Bot)', points: '73,53.5 79,68 85,78', color: '#facc15' },
    { label: 'Emboscada por Tribush Azul', points: '58,68 69.2,79.5 74,88', color: '#38bdf8' },
  ],
  support: [
    { label: 'Rotación Roam Bot ➔ Mid', points: '76.8,75 65.8,68.8 57.2,56.8 50,50', color: '#38bdf8' },
    { label: 'Invasión Profunda a Buff Azul Rojo', points: '76.8,75 74,61 73,53.5', color: '#facc15' },
    { label: 'Gank Rival por Tribush Inferior', points: '65.8,68.8 69.2,79.5 76,86', color: '#ff2e4d' },
  ],
};

function renderRoutesSvg(role: Role, showRoutes: boolean, showCamps: boolean): string {
  const routes = showRoutes ? GANK_ROUTES_BY_ROLE[role] : [];
  const camps = showCamps ? JUNGLE_CAMP_MARKERS : [];

  return `
  <svg viewBox="0 0 100 100" class="absolute inset-0 w-full h-full pointer-events-none z-5">
    <defs>
      <marker id="rk-arrow-red" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
        <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#ff2e4d"/>
      </marker>
      <marker id="rk-arrow-gold" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
        <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#facc15"/>
      </marker>
      <marker id="rk-arrow-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
        <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#38bdf8"/>
      </marker>
    </defs>

    ${routes
      .map((r) => {
        const marker =
          r.color === '#ff2e4d'
            ? 'url(#rk-arrow-red)'
            : r.color === '#facc15'
              ? 'url(#rk-arrow-gold)'
              : 'url(#rk-arrow-blue)';
        return `
        <polyline points="${r.points}" fill="none" stroke="#000000" stroke-opacity="0.65" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="${r.points}" fill="none" stroke="${r.color}" stroke-width="0.75" stroke-dasharray="1.6 1.1" stroke-linecap="round" stroke-linejoin="round" marker-end="${marker}"/>`;
      })
      .join('')}

    ${camps
      .map(
        (c) => `
      <g transform="translate(${c.left} ${c.top})">
        <circle r="1.7" fill="#08090ce6" stroke="${c.color}" stroke-width="0.45"/>
        <circle r="0.7" fill="${c.color}"/>
        <text x="0" y="3.1" fill="#f8fafc" font-size="1.85" font-weight="700" text-anchor="middle" style="paint-order:stroke;stroke:#08090c;stroke-width:0.7px">${esc(c.label)}</text>
      </g>`,
      )
      .join('')}
  </svg>`;
}

function wardPin(spot: VisionSpot, isSelected: boolean, showRadius: boolean): string {
  const cfg = WARD_TYPE_CONFIG[spot.type];
  const color = cfg.color;

  return `
  <button type="button"
          class="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-10"
          style="top: ${spot.top}%; left: ${spot.left}%;"
          data-action="selectSpot"
          data-id="${spot.id}"
          data-tip="${esc(spot.zoneName)} (${esc(spot.minuteRecommended)})"
          aria-label="${esc(spot.zoneName)}: ${esc(spot.minuteRecommended)}">

    <!-- Radio de visión real sobre la Grieta (estilo RiftKit) -->
    ${
      showRadius && isSelected
        ? `<span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-dashed pointer-events-none transition-all"
                 style="border-color: ${color}; background: radial-gradient(circle, ${color}2e 0%, ${color}08 70%, transparent 100%);"></span>`
        : ''
    }

    <!-- Anillo de pulso animado -->
    <span class="absolute -inset-2 rounded-full opacity-60 animate-ping pointer-events-none"
          style="background-color: ${color}; animation-duration: ${isSelected ? '1.4s' : '2.8s'};"></span>

    <!-- Cuerpo del Pin -->
    <span class="relative flex items-center justify-center rounded-full border-2 transition-transform duration-200 shadow-md ${
      isSelected
        ? 'w-7 h-7 scale-125 border-white shadow-[0_0_16px_4px] ring-2 ring-white/50'
        : 'w-6 h-6 hover:scale-115 border-[#0b0c10]'
    }"
          style="background-color: ${color}; box-shadow: 0 0 12px ${color};">
      <span class="text-[#0b0c10] font-black text-[10px] leading-none select-none">
        ${spot.type === 'control' ? 'P' : spot.type === 'deep' ? 'D' : 'W'}
      </span>
    </span>

    <!-- Indicador de minuto en hover o activo -->
    <span class="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold text-white bg-[#0b0c10]/90 border border-line-strong whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity ${
      isSelected ? '!opacity-100 border-white/60 shadow-xs' : ''
    }">
      ${esc(spot.minuteRecommended)}
    </span>
  </button>`;
}

function sidePanel(spot: VisionSpot | null, spots: VisionSpot[], role: Role): string {
  if (!spot) {
    return `
    <div class="card p-6 flex flex-col items-center justify-center text-center h-full min-h-[380px] text-ink-dim">
      <div class="w-12 h-12 rounded-full bg-crimson/10 border border-crimson/20 grid place-items-center text-crimson mb-3">
        ${icon('eye', 24)}
      </div>
      <h4 class="font-bold text-ink text-[15px]">Selecciona un Punto de Visión</h4>
      <p class="text-[12px] max-w-[280px] mt-1.5 leading-relaxed">
        Haz clic en cualquiera de los pines interactivos del mapa para consultar el minuto exacto y el consejo táctico.
      </p>
    </div>`;
  }

  const cfg = WARD_TYPE_CONFIG[spot.type];
  const routes = GANK_ROUTES_BY_ROLE[role];

  return `
  <div class="card p-5 flex flex-col justify-between h-full space-y-4">
    <div class="space-y-4">
      <!-- Encabezado del Punto -->
      <div class="border-b border-line pb-3.5">
        <div class="flex items-center justify-between gap-2">
          <span class="chip" style="color: ${cfg.color}; border-color: ${cfg.color}55; background: ${cfg.bg}">
            ${icon(spot.type === 'control' ? 'target' : spot.type === 'deep' ? 'compass' : 'eye', 12)}
            ${cfg.label}
          </span>
          <span class="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
            ${ROLE_LABEL[spot.role]} · Lado ${spot.side === 'blue' ? 'Azul' : 'Rojo'}
          </span>
        </div>
        <h3 class="text-[17px] font-extrabold text-ink mt-2 leading-tight">
          ${esc(spot.zoneName)}
        </h3>
        <p class="text-[12px] font-semibold text-crimson mt-0.5">
          ${esc(spot.title)}
        </p>
      </div>

      <!-- Minuto exacto recomendado -->
      <div class="card-inset p-3.5 border border-dashed border-crimson/40 bg-crimson/5 flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-xl bg-crimson/20 border border-crimson/30 grid place-items-center text-crimson flex-none">
          ${icon('clock', 20)}
        </div>
        <div>
          <div class="text-[10.5px] text-ink-mute uppercase tracking-wider font-bold">Momento Óptimo para Plantar</div>
          <div class="num text-[20px] font-extrabold text-ink leading-tight">
            ${esc(spot.minuteRecommended)}
          </div>
        </div>
      </div>

      <!-- Consejo Táctico Pedagógico -->
      <div class="card-inset p-3.5 space-y-2">
        <div class="flex items-center gap-2 text-ink text-[12.5px] font-bold">
          <span class="text-gold">${icon('spark', 15)}</span> Consejo Táctico
        </div>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          ${esc(spot.tacticalAdvice)}
        </p>
      </div>

      <!-- ¿Qué hacer si ves al rival? -->
      <div class="p-3.5 rounded-xl border border-line-strong bg-canvas flex items-start gap-2.5">
        <span class="text-crimson flex-none mt-0.5">${icon('zap', 15)}</span>
        <div class="text-[11.5px] leading-snug">
          <strong class="text-ink font-semibold">Respuesta Táctica Inmediata:</strong>
          <p class="text-ink-dim mt-1">${esc(spot.counterAction)}</p>
        </div>
      </div>

      <!-- Leyenda de Rutas de Gank S14+ del Rol -->
      <div class="card-inset p-3 space-y-1.5">
        <div class="text-[10.5px] font-bold uppercase tracking-wider text-ink-mute">Rutas de Gank / Invasión en Mapa Actual</div>
        ${routes
          .map(
            (r) => `
          <div class="flex items-center gap-2 text-[11.5px] text-ink-dim">
            <span class="w-3 h-0.5 rounded-full flex-none" style="background:${r.color}"></span>
            <span>${esc(r.label)}</span>
          </div>`,
          )
          .join('')}
      </div>
    </div>

    <!-- Lista rápida de puntos del rol actual -->
    <div class="border-t border-line pt-3">
      <div class="text-[11px] font-bold text-ink-mute uppercase tracking-wider mb-2">
        Puntos de este rol (${spots.length})
      </div>
      <div class="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
        ${spots
          .map((s) => {
            const active = s.id === spot.id;
            const sCfg = WARD_TYPE_CONFIG[s.type];
            return `
          <button class="flex items-center justify-between p-2 rounded-lg text-left text-[11.5px] transition-colors ${
            active ? 'bg-surface-2 border border-line-strong text-white font-bold' : 'hover:bg-surface-2/60 text-ink-dim'
          }"
                  data-action="selectSpot" data-id="${s.id}">
            <div class="flex items-center gap-2 truncate">
              <span class="w-2 h-2 rounded-full flex-none" style="background-color: ${sCfg.color}"></span>
              <span class="truncate">${esc(s.zoneName)}</span>
            </div>
            <span class="num text-[11px] font-mono text-ink-mute ml-2 flex-none">${esc(s.minuteRecommended)}</span>
          </button>`;
          })
          .join('')}
      </div>
    </div>
  </div>`;
}

export function mountVisionMap(root: HTMLElement) {
  const view = createView<State>({
    root,
    state: {
      role: 'top',
      side: 'blue',
      selectedSpotId: null,
      filterType: 'all',
      showVisionRadius: true,
      showGankRoutes: true,
      showJungleCamps: false,
      zoom: 'full',
    },
    render: (s) => {
      const allRoleSpots = getVisionSpots(s.role, s.side);
      const visibleSpots =
        s.filterType === 'all' ? allRoleSpots : allRoleSpots.filter((sp) => sp.type === s.filterType);

      const activeSpot =
        (s.selectedSpotId && visibleSpots.find((p) => p.id === s.selectedSpotId)) ||
        visibleSpots[0] ||
        allRoleSpots[0] ||
        null;

      return `
      <div class="space-y-4">
        <!-- Barra de Control: Selector de Rol + Toggle Lado Azul/Rojo + Filtro de Tipo -->
        <div class="card p-4 flex flex-wrap items-center justify-between gap-4">
          <!-- Selector de Rol -->
          <div class="flex items-center gap-3">
            <span class="eyebrow text-crimson">Posición:</span>
            <div class="flex items-center gap-1.5">
              ${ROLES.map((r) => {
                const active = r === s.role;
                return `
                <button class="pill !h-9 !px-3 !gap-2 text-[12px] ${
                  active ? '!border-crimson !bg-crimson/15 text-white font-bold shadow-xs' : ''
                }"
                        data-action="setRole" data-role="${r}" aria-pressed="${active}">
                  ${roleIcon(r, 16)}
                  <span>${ROLE_LABEL[r]}</span>
                </button>`;
              }).join('')}
            </div>
          </div>

          <!-- Selector de Lado (Azul / Rojo) -->
          <div class="flex items-center gap-3">
            <span class="eyebrow text-ink-mute">Lado de Mapa:</span>
            <div class="inline-flex rounded-lg p-1 bg-canvas border border-line-strong">
              <button class="px-3.5 py-1 rounded-md text-[12px] font-bold transition-all flex items-center gap-1.5 ${
                s.side === 'blue'
                  ? 'bg-[#4c8dff]/20 text-[#4c8dff] border border-[#4c8dff]/50 shadow-xs'
                  : 'text-ink-dim hover:text-ink'
              }"
                      data-action="setSide" data-side="blue">
                <span class="w-2 h-2 rounded-full bg-[#4c8dff]"></span> Lado Azul
              </button>
              <button class="px-3.5 py-1 rounded-md text-[12px] font-bold transition-all flex items-center gap-1.5 ${
                s.side === 'red'
                  ? 'bg-crimson/20 text-crimson border border-crimson/50 shadow-xs'
                  : 'text-ink-dim hover:text-ink'
              }"
                      data-action="setSide" data-side="red">
                <span class="w-2 h-2 rounded-full bg-crimson"></span> Lado Rojo
              </button>
            </div>
          </div>

          <!-- Leyenda y Filtro de Ward Type -->
          <div class="flex items-center gap-2">
            <button class="chip ${s.filterType === 'all' ? '!border-ink text-white font-bold' : ''}"
                    data-action="setFilter" data-type="all">
              Todos (${allRoleSpots.length})
            </button>
            <button class="chip" style="color: #facc15; border-color: ${s.filterType === 'trinket' ? '#facc15' : '#facc1544'}; background: ${s.filterType === 'trinket' ? '#facc1522' : 'transparent'}"
                    data-action="setFilter" data-type="trinket">
              <i class="w-2 h-2 rounded-full bg-[#facc15]"></i> Trinket
            </button>
            <button class="chip" style="color: #ff2e4d; border-color: ${s.filterType === 'control' ? '#ff2e4d' : '#ff2e4d44'}; background: ${s.filterType === 'control' ? '#ff2e4d22' : 'transparent'}"
                    data-action="setFilter" data-type="control">
              <i class="w-2 h-2 rounded-full bg-crimson"></i> Pink (Control)
            </button>
            <button class="chip" style="color: #38bdf8; border-color: ${s.filterType === 'deep' ? '#38bdf8' : '#38bdf844'}; background: ${s.filterType === 'deep' ? '#38bdf822' : 'transparent'}"
                    data-action="setFilter" data-type="deep">
              <i class="w-2 h-2 rounded-full bg-[#38bdf8]"></i> Deep Ward
            </button>
          </div>
        </div>

        <!-- Contenedor Principal: Mapa RiftKit a la izquierda + Panel Lateral a la derecha -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <!-- Columna Izquierda: Mapa Actualizado de la Grieta del Invocador con Capas Tácticas -->
          <div class="lg:col-span-7 xl:col-span-8 card p-4 flex flex-col items-center space-y-3">
            <!-- Barra de Herramientas del Mapa (Capas RiftKit + Zoom por Sector) -->
            <div class="w-full max-w-[640px] flex flex-wrap items-center justify-between gap-2 pb-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" class="chip cursor-pointer ${s.showVisionRadius ? 'chip-gold font-bold' : 'opacity-70'}" data-action="toggleLayer" data-layer="vision">
                  ${icon('eye', 11)} Radio de Visión
                </button>
                <button type="button" class="chip cursor-pointer ${s.showGankRoutes ? 'chip-crimson font-bold' : 'opacity-70'}" data-action="toggleLayer" data-layer="routes">
                  ${icon('compass', 11)} Rutas Gank / Invasión
                </button>
                <button type="button" class="chip cursor-pointer ${s.showJungleCamps ? 'chip-win font-bold' : 'opacity-70'}" data-action="toggleLayer" data-layer="camps">
                  ${icon('target', 11)} Campamentos Jungla
                </button>
              </div>
              <div class="flex items-center gap-1 rounded-lg border border-line bg-canvas p-0.5">
                ${(['full', 'top', 'mid', 'bot', 'jungle'] as MapZoom[])
                  .map(
                    (z) => `
                  <button type="button" class="px-2 py-0.5 rounded text-[10.5px] font-bold transition-colors ${
                    s.zoom === z ? 'bg-crimson text-white' : 'text-ink-mute hover:text-ink'
                  }" data-action="setZoom" data-zoom="${z}">
                    ${ZOOM_TRANSFORM[z].label}
                  </button>`,
                  )
                  .join('')}
              </div>
            </div>

            <div class="relative w-full max-w-[640px] aspect-square rounded-2xl overflow-hidden border border-line-strong shadow-2xl bg-[#08090c]">
              <div class="w-full h-full relative transition-transform duration-300 ease-out origin-center" style="${ZOOM_TRANSFORM[s.zoom].style}">
                <!-- Textura oficial actualizada de la Grieta del Invocador (Mapa-lol-actualizado.jpg) -->
                <img src="${mapImg()}"
                     alt="Grieta del Invocador — Mapa Oficial Actualizado"
                     class="w-full h-full object-cover select-none"
                     draggable="false" />

                <!-- Capas SVG de Rutas de Gank / Invasión y Campamentos (Estilo RiftKit) -->
                ${renderRoutesSvg(s.role, s.showGankRoutes, s.showJungleCamps)}

                <!-- PINES ACTIVOS SOBRE EL MAPA -->
                ${visibleSpots.map((spot) => wardPin(spot, spot.id === activeSpot?.id, s.showVisionRadius)).join('')}
              </div>

              <!-- Etiquetas discretas de Base -->
              <div class="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-wider text-[#4c8dff] pointer-events-none select-none bg-[#0b0c10]/85 px-2 py-0.5 rounded border border-[#4c8dff]/40 z-20">
                Base Azul
              </div>
              <div class="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider text-crimson pointer-events-none select-none bg-[#0b0c10]/85 px-2 py-0.5 rounded border border-crimson/40 z-20">
                Base Roja
              </div>
            </div>

            <div class="flex items-center justify-between w-full max-w-[640px] px-2 text-[11px] text-ink-mute">
              <span>Mapa actualizado con los nuevos muros de Río, Pixel Bushes y pasillos de Gank.</span>
              <span>Mostrando <strong>${visibleSpots.length}</strong> spots de ${ROLE_LABEL[s.role]}</span>
            </div>
          </div>

          <!-- Columna Derecha: Tarjeta Lateral de Detalle Táctico -->
          <div class="lg:col-span-5 xl:col-span-4 h-full">
            ${sidePanel(activeSpot, allRoleSpots, s.role)}
          </div>
        </div>
      </div>`;
    },
    actions: {
      setRole: ({ data }) => {
        const role = data.role as Role;
        return { role, selectedSpotId: null };
      },
      setSide: ({ data }) => {
        const side = data.side as 'blue' | 'red';
        return { side, selectedSpotId: null };
      },
      setFilter: ({ data }) => {
        const filterType = data.type as WardType | 'all';
        return { filterType };
      },
      selectSpot: ({ data }) => {
        const id = data.id as string;
        return { selectedSpotId: id };
      },
      setZoom: ({ data }) => {
        const zoom = data.zoom as MapZoom;
        return { zoom };
      },
      toggleLayer: ({ data, state }) => {
        const layer = data.layer;
        if (layer === 'vision') return { showVisionRadius: !state.showVisionRadius };
        if (layer === 'routes') return { showGankRoutes: !state.showGankRoutes };
        if (layer === 'camps') return { showJungleCamps: !state.showJungleCamps };
      },
    },
  });

  return view;
}
