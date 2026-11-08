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
type GuideTab = 'timings' | 'pinks' | 'objectives' | 'visionlines';

interface State {
  role: Role;
  side: 'blue' | 'red';
  selectedSpotId: string | null;
  filterType: WardType | 'all';
  showVisionRadius: boolean;
  showGankRoutes: boolean;
  showJungleCamps: boolean;
  showControlLines: boolean;
  zoom: MapZoom;
  guideTab: GuideTab;
}

const ZOOM_TRANSFORM: Record<MapZoom, { label: string; style: string }> = {
  full: { label: 'Mapa 100%', style: 'transform: scale(1) translate(0%, 0%);' },
  top: { label: 'Zoom Top', style: 'transform: scale(1.75) translate(18%, 18%);' },
  mid: { label: 'Zoom Mid', style: 'transform: scale(1.65) translate(0%, 0%);' },
  bot: { label: 'Zoom Bot', style: 'transform: scale(1.75) translate(-18%, -18%);' },
  jungle: { label: 'Zoom Jungla', style: 'transform: scale(1.55) translate(4%, 0%);' },
};

interface CampMarker {
  id: string;
  label: string;
  timer: string;
  left: number;
  top: number;
  color: string;
  side: 'blue' | 'red' | 'river';
}

/**
 * Los 16 puntos completos de la Grieta del Invocador sobre Mapa-lol-actualizado.jpg:
 * - 6 Campamentos del Lado Azul (Gromp, Buff Azul, Lobos, Dagarracos, Buff Rojo, Rocosos)
 * - 6 Campamentos del Lado Rojo (Rocosos, Buff Rojo, Dagarracos, Lobos, Buff Azul, Gromp/Sapo)
 * - 4 Objetivos del Río (Larvas/Barón, Escurridizo Norte, Dragón Elemental, Escurridizo Sur)
 */
const JUNGLE_CAMP_MARKERS: CampMarker[] = [
  // Objetivos de Río (4)
  { id: 'void', label: 'Larvas / Barón', timer: '06:00 / 20:00', left: 34.0, top: 30.8, color: '#a855f7', side: 'river' },
  { id: 'scuttle_top', label: 'Escurridizo Norte', timer: '03:30 (+2:30)', left: 30.2, top: 35.5, color: '#2dd4bf', side: 'river' },
  { id: 'dragon', label: 'Dragón Elemental', timer: '05:00 (+5:00)', left: 65.8, top: 68.8, color: '#f97316', side: 'river' },
  { id: 'scuttle_bot', label: 'Escurridizo Sur', timer: '03:30 (+2:30)', left: 69.5, top: 64.2, color: '#2dd4bf', side: 'river' },

  // Lado Azul — 6 Campamentos Completos
  { id: 'gromp_b', label: 'Gromp (Azul)', timer: '01:42 (+2:15)', left: 15.8, top: 43.2, color: '#38bdf8', side: 'blue' },
  { id: 'blue_b', label: 'Buff Azul (Azul)', timer: '01:30 (+5:00)', left: 26.8, top: 46.2, color: '#38bdf8', side: 'blue' },
  { id: 'wolves_b', label: 'Lobos (Azul)', timer: '01:30 (+2:15)', left: 27.5, top: 56.5, color: '#38bdf8', side: 'blue' },
  { id: 'raptors_b', label: 'Dagarracos (Azul)', timer: '01:30 (+2:15)', left: 47.2, top: 63.5, color: '#ef4444', side: 'blue' },
  { id: 'red_b', label: 'Buff Rojo (Azul)', timer: '01:30 (+5:00)', left: 51.8, top: 72.2, color: '#ef4444', side: 'blue' },
  { id: 'krugs_b', label: 'Rocosos (Azul)', timer: '01:42 (+2:15)', left: 56.5, top: 82.0, color: '#ef4444', side: 'blue' },

  // Lado Rojo — 6 Campamentos Completos (Rocosos, Buff Rojo, Dagarracos, Lobos, Buff Azul y Gromp/Sapo)
  { id: 'krugs_r', label: 'Rocosos (Rojo)', timer: '01:42 (+2:15)', left: 43.8, top: 18.2, color: '#ef4444', side: 'red' },
  { id: 'red_r', label: 'Buff Rojo (Rojo)', timer: '01:30 (+5:00)', left: 48.2, top: 27.5, color: '#ef4444', side: 'red' },
  { id: 'raptors_r', label: 'Dagarracos (Rojo)', timer: '01:30 (+2:15)', left: 52.5, top: 36.2, color: '#ef4444', side: 'red' },
  { id: 'wolves_r', label: 'Lobos (Rojo)', timer: '01:30 (+2:15)', left: 72.2, top: 43.2, color: '#38bdf8', side: 'red' },
  { id: 'blue_r', label: 'Buff Azul (Rojo)', timer: '01:30 (+5:00)', left: 73.0, top: 53.5, color: '#38bdf8', side: 'red' },
  { id: 'gromp_r', label: 'Gromp / Sapo (Rojo)', timer: '01:42 (+2:15)', left: 84.0, top: 56.8, color: '#38bdf8', side: 'red' },
];

/** Plantas de Visión (Frutos del Vidente / Scryer's Bloom) para revelar objetivos sin hacer facecheck */
const SCRYER_BLOOMS = [
  { label: 'Fruto Visión (Río Norte)', left: 36.5, top: 40.5, targetX: 34.0, targetY: 30.8 },
  { label: 'Fruto Visión (Top Rojo)', left: 42.5, top: 24.5, targetX: 31.0, targetY: 20.5 },
  { label: 'Fruto Visión (Río Sur)', left: 63.5, top: 59.5, targetX: 65.8, targetY: 68.8 },
  { label: 'Fruto Visión (Bot Azul)', left: 57.5, top: 75.5, targetX: 69.2, targetY: 79.5 },
];

interface GankRoute {
  label: string;
  timing: string;
  points: string;
  labelPos: [number, number];
  color: string;
}

/**
 * Rutas actualizadas del mapa actual con su ventana de minuto exacto.
 */
const GANK_ROUTES_BY_ROLE: Record<Role, GankRoute[]> = {
  top: [
    { label: 'Gank Full-Clear por Pixel Bush Río', timing: '03:15', points: '30.2,35.5 22.8,24.5 16.5,18.0', labelPos: [23.5, 27.8], color: '#ff2e4d' },
    { label: 'Gank por Tribush Superior', timing: '02:40 / 04:15', points: '48.2,27.5 30.8,20.5 22.5,14.5', labelPos: [36.0, 20.0], color: '#facc15' },
    { label: 'Dive Trasero por Gromp / Rocosos', timing: '05:30+', points: '26.8,46.2 17.5,36.2 10.5,29.5', labelPos: [18.0, 39.5], color: '#38bdf8' },
  ],
  jungle: [
    { label: 'Invasión Río Norte ➔ Buff Azul', timing: '01:25 / 06:50', points: '42.0,39.0 34.5,44.5 26.8,46.2', labelPos: [35.5, 42.0], color: '#ff2e4d' },
    { label: 'Invasión Río Sur ➔ Buff Azul Rojo', timing: '06:50', points: '65.8,68.8 64.5,56.0 73.0,53.5', labelPos: [66.5, 59.0], color: '#facc15' },
    { label: 'Raptor Ward & Robo de Dagarracos', timing: '01:20 / 04:00', points: '49.5,49.5 52.5,36.2 48.2,27.5', labelPos: [54.5, 39.5], color: '#38bdf8' },
  ],
  mid: [
    { label: 'Gank Nivel 3 / Transición Norte', timing: '02:35', points: '34.0,34.0 42.5,42.8 49.0,49.0', labelPos: [39.5, 38.5], color: '#ff2e4d' },
    { label: 'Gank Soporte / Jungla Río Sur', timing: '03:20 / 05:30', points: '65.8,65.0 57.2,56.8 51.0,51.0', labelPos: [60.5, 61.5], color: '#facc15' },
    { label: 'Flanqueo por Rampa de Dagarracos', timing: '04:30+', points: '52.5,36.2 55.2,42.0 50.5,48.5', labelPos: [57.5, 43.0], color: '#38bdf8' },
  ],
  adc: [
    { label: 'Gank Post Full-Clear por Río Bot', timing: '03:15', points: '69.5,64.2 76.8,75.0 83.2,82.5', labelPos: [73.5, 71.5], color: '#ff2e4d' },
    { label: 'Gank por Nuevo Pasillo Bot Rojo', timing: '03:30+', points: '73.0,53.5 83.2,68.5 86.0,78.0', labelPos: [81.5, 64.5], color: '#facc15' },
    { label: 'Dive 4v2 por Tribush Defensivo Azul', timing: '05:45+', points: '58.0,68.0 69.2,79.5 73.5,87.5', labelPos: [64.5, 82.0], color: '#38bdf8' },
  ],
  support: [
    { label: 'Roam de Base ➔ Larvas del Vacío', timing: '05:45', points: '25.0,75.0 42.5,56.0 34.0,30.8', labelPos: [38.0, 52.0], color: '#38bdf8' },
    { label: 'Setup de Visión Profunda a Dragón', timing: '04:30', points: '76.8,75.0 65.8,68.8 78.0,55.2', labelPos: [73.5, 60.5], color: '#facc15' },
    { label: 'Emboscada por Tribush Inferior', timing: '03:15', points: '65.8,68.8 69.2,79.5 76.5,86.0', labelPos: [68.0, 76.5], color: '#ff2e4d' },
  ],
};

function renderTacticalSvg(
  role: Role,
  side: 'blue' | 'red',
  showRoutes: boolean,
  showCamps: boolean,
  showControlLines: boolean,
): string {
  const routes = showRoutes ? GANK_ROUTES_BY_ROLE[role] : [];
  const camps = showCamps ? JUNGLE_CAMP_MARKERS : [];

  // Líneas de frente de visión (Defensiva, Río Neutral y Profunda Ofensiva)
  const controlLinesSvg = showControlLines
    ? side === 'blue'
      ? `
        <!-- Línea de Control de Río Neutral -->
        <polyline points="18,18 34,31 50,50 66,69 84,84" fill="none" stroke="#facc15" stroke-width="0.55" stroke-dasharray="1.8 1.4" opacity="0.8"/>
        <!-- Línea de Visión Profunda (Cuando ganas línea) -->
        <polyline points="31,20 48,27.5 55,42 73,53.5 83,68.5" fill="none" stroke="#38bdf8" stroke-width="0.6" stroke-dasharray="1.2 1.2" opacity="0.85"/>
        <!-- Línea de Visión Defensiva (Cuando vas perdiendo) -->
        <polyline points="17.5,36.2 26.8,46.2 44,55 51.8,72.2 69.2,79.5" fill="none" stroke="#ff2e4d" stroke-width="0.55" stroke-dasharray="1.2 1.2" opacity="0.8"/>
        ${SCRYER_BLOOMS.map(
          (b) => `
          <g transform="translate(${b.left} ${b.top})">
            <circle r="1.4" fill="#10b98133" stroke="#10b981" stroke-width="0.4"/>
            <circle r="0.55" fill="#10b981"/>
            <line x1="0" y1="0" x2="${b.targetX - b.left}" y2="${b.targetY - b.top}" stroke="#10b981" stroke-width="0.35" stroke-dasharray="0.8 0.8" opacity="0.75"/>
          </g>`,
        ).join('')}
      `
      : `
        <!-- Línea de Control de Río Neutral -->
        <polyline points="18,18 34,31 50,50 66,69 84,84" fill="none" stroke="#facc15" stroke-width="0.55" stroke-dasharray="1.8 1.4" opacity="0.8"/>
        <!-- Línea de Visión Profunda para Lado Rojo -->
        <polyline points="17.5,36.2 26.8,46.2 44.5,58 51.8,72.2 69.2,79.5" fill="none" stroke="#38bdf8" stroke-width="0.6" stroke-dasharray="1.2 1.2" opacity="0.85"/>
        <!-- Línea de Visión Defensiva para Lado Rojo -->
        <polyline points="30.8,20.5 48.2,27.5 55,42 73,53.5 84,56.8" fill="none" stroke="#ff2e4d" stroke-width="0.55" stroke-dasharray="1.2 1.2" opacity="0.8"/>
        ${SCRYER_BLOOMS.map(
          (b) => `
          <g transform="translate(${b.left} ${b.top})">
            <circle r="1.4" fill="#10b98133" stroke="#10b981" stroke-width="0.4"/>
            <circle r="0.55" fill="#10b981"/>
            <line x1="0" y1="0" x2="${b.targetX - b.left}" y2="${b.targetY - b.top}" stroke="#10b981" stroke-width="0.35" stroke-dasharray="0.8 0.8" opacity="0.75"/>
          </g>`,
        ).join('')}
      `
    : '';

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

    ${controlLinesSvg}

    ${routes
      .map((r) => {
        const marker =
          r.color === '#ff2e4d'
            ? 'url(#rk-arrow-red)'
            : r.color === '#facc15'
              ? 'url(#rk-arrow-gold)'
              : 'url(#rk-arrow-blue)';
        const [lx, ly] = r.labelPos;
        return `
        <polyline points="${r.points}" fill="none" stroke="#000000" stroke-opacity="0.7" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="${r.points}" fill="none" stroke="${r.color}" stroke-width="0.75" stroke-dasharray="1.6 1.1" stroke-linecap="round" stroke-linejoin="round" marker-end="${marker}"/>
        <g transform="translate(${lx} ${ly})">
          <rect x="-4.8" y="-1.6" width="9.6" height="3.0" rx="0.8" fill="#08090ce6" stroke="${r.color}" stroke-width="0.28"/>
          <text x="0" y="0.55" fill="${r.color}" font-size="1.65" font-weight="800" text-anchor="middle">${esc(r.timing)}</text>
        </g>`;
      })
      .join('')}

    ${camps
      .map(
        (c) => `
      <g transform="translate(${c.left} ${c.top})">
        <circle r="1.65" fill="#08090ce6" stroke="${c.color}" stroke-width="0.45"/>
        <circle r="0.68" fill="${c.color}"/>
        <text x="0" y="3.05" fill="#f8fafc" font-size="1.72" font-weight="700" text-anchor="middle" style="paint-order:stroke;stroke:#08090c;stroke-width:0.75px">${esc(c.label)}</text>
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

    <!-- Radio de visión real sobre la Grieta -->
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
          <div class="text-[10.5px] text-ink-mute uppercase tracking-wider font-bold">Ventana Óptima para Plantar</div>
          <div class="num text-[20px] font-extrabold text-ink leading-tight">
            Minuto ${esc(spot.minuteRecommended)}
          </div>
        </div>
      </div>

      <!-- Consejo Táctico Pedagógico -->
      <div class="card-inset p-3.5 space-y-2">
        <div class="flex items-center gap-2 text-ink text-[12.5px] font-bold">
          <span class="text-gold">${icon('spark', 15)}</span> Análisis Táctico del Spot
        </div>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          ${esc(spot.tacticalAdvice)}
        </p>
      </div>

      <!-- ¿Qué hacer si ves al rival? -->
      <div class="p-3.5 rounded-xl border border-line-strong bg-canvas flex items-start gap-2.5">
        <span class="text-crimson flex-none mt-0.5">${icon('zap', 15)}</span>
        <div class="text-[11.5px] leading-snug">
          <strong class="text-ink font-semibold">Respuesta Inmediata:</strong>
          <p class="text-ink-dim mt-1">${esc(spot.counterAction)}</p>
        </div>
      </div>

      <!-- Leyenda de Rutas de Gank S14/S15 del Rol -->
      <div class="card-inset p-3 space-y-1.5">
        <div class="text-[10.5px] font-bold uppercase tracking-wider text-ink-mute">Rutas y Timings de Gank (${ROLE_LABEL[role]})</div>
        ${routes
          .map(
            (r) => `
          <div class="flex items-center justify-between gap-2 text-[11.5px]">
            <div class="flex items-center gap-2 text-ink-dim truncate">
              <span class="w-3 h-1 rounded-full flex-none" style="background:${r.color}"></span>
              <span class="truncate">${esc(r.label)}</span>
            </div>
            <span class="num font-mono text-[10.5px] font-bold" style="color:${r.color}">${esc(r.timing)}</span>
          </div>`,
          )
          .join('')}
      </div>
    </div>

    <!-- Lista rápida de los 6 puntos del rol actual -->
    <div class="border-t border-line pt-3">
      <div class="text-[11px] font-bold text-ink-mute uppercase tracking-wider mb-2">
        Spots de ${ROLE_LABEL[role]} (${spots.length})
      </div>
      <div class="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
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

/**
 * Enciclopedia Táctica de Control de Mapa, Timings de Gank, Uso de Pinks y Objetivos.
 */
function renderMapControlKnowledgeBase(activeTab: GuideTab): string {
  const tabs: { id: GuideTab; label: string }[] = [
    { id: 'timings', label: '1. Timings de Gank & Tracking (Regla 4 CS)' },
    { id: 'pinks', label: '2. Guía Maestra de Pinks (75g)' },
    { id: 'objectives', label: '3. Control de Objetivos (Larvas, Dragón, Barón)' },
    { id: 'visionlines', label: '4. Líneas de Visión & Plantas' },
  ];

  let content = '';
  if (activeTab === 'timings') {
    content = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <article class="card-inset p-4 space-y-2 border-l-2 border-crimson">
        <div class="flex items-center justify-between">
          <span class="chip chip-crimson font-bold">02:25 – 02:45</span>
          <span class="text-[11px] font-bold text-ink-mute">Gank Nivel 3 (3 Campamentos)</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">Alerta contra Junglas de Presión Temprana</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          Campeones como <b>Lee Sin, Jarvan IV, Elise, Xin Zhao o Shaco</b> suelen limpiar solo 3 campamentos (12 CS en el marcador) e ir directo a una línea. Si enfrentas uno de ellos, coloca tu Trinket al <b>02:25</b> en lugar de esperar al minuto 3.
        </p>
      </article>

      <article class="card-inset p-4 space-y-2 border-l-2 border-gold">
        <div class="flex items-center justify-between">
          <span class="chip chip-gold font-bold">03:10 – 03:30</span>
          <span class="text-[11px] font-bold text-ink-mute">Gank Post Full-Clear (6 Campamentos)</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">La Ventana Estándar del Meta Actual</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          El 80% de los junglas completan sus 6 campamentos (24 CS) entre el <b>03:12 y 03:25</b>, justo antes de que aparezcan los dos <b>Escurridizos (03:30)</b>. Nunca pelees en tu línea al minuto 03:15 si no tienes visión del Pixel Bush del río.
        </p>
      </article>

      <article class="card-inset p-4 space-y-2 border-l-2 border-[#38bdf8]">
        <div class="flex items-center justify-between">
          <span class="chip font-bold" style="color:#38bdf8;border-color:#38bdf855">Tracking Pro</span>
          <span class="text-[11px] font-bold text-ink-mute">Leash 01:38 & Conteo de CS</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">Cómo Saber Dónde Está el Jungla sin Verlo</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          • <b>Cada campamento vale exactamente 4 CS:</b> Si el jungla rival asoma con 12 CS hizo 3 campamentos; con 16 CS hizo 4; con 24 CS limpió toda su jungla.<br/>
          • <b>Reaparición:</b> Campamentos menores cada <b>2:15 min</b> · Buffs Azul/Rojo cada <b>5:00 min</b>.
        </p>
      </article>
    </div>`;
  } else if (activeTab === 'pinks') {
    content = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <article class="card-inset p-4 space-y-2 border-l-2 border-win">
        <div class="flex items-center justify-between">
          <span class="chip chip-win font-bold">Pink con Prioridad</span>
          <span class="text-[11px] font-bold text-ink-mute">Cuando tú empujas la línea</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">Pixel Bush de Río o Arbusto Adelantado</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          Solo planta un Pink en el río si tienes prioridad de oleada para poder defenderlo cuando el rival intente romperlo. Si el enemigo se acerca a golpear tu Pink (requiere 4 golpes), castígalo con una rotación completa de habilidades.
        </p>
      </article>

      <article class="card-inset p-4 space-y-2 border-l-2 border-gold">
        <div class="flex items-center justify-between">
          <span class="chip chip-gold font-bold">Pink Defensivo</span>
          <span class="text-[11px] font-bold text-ink-mute">Cuando te empujan bajo torre</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">Tribush Propio y Entradas de Buff</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          Si estás perdiendo la línea, <b>no pongas Pinks en el río</b> (los perderás gratis). Colócalos en tu <b>Tribush defensivo</b> o en la <b>entrada de tu Buff Azul/Rojo</b> para detectar dives 3v1/4v2 e invasiones a tu jungla.
        </p>
      </article>

      <article class="card-inset p-4 space-y-2 border-l-2 border-crimson">
        <div class="flex items-center justify-between">
          <span class="chip chip-crimson font-bold">Regla de Foso</span>
          <span class="text-[11px] font-bold text-ink-mute">Dragón, Larvas y Barón</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">Cómo Cegar el Foso (Y Qué NO Hacer)</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          Planta un Pink en el centro del foso antes de iniciar cualquier objetivo épico. <b>Importante:</b> cuando un centinela amarillo enemigo queda desactivado por tu Pink, <b>no lo golpees mientras haces el objetivo</b>, porque al golpearlo le devuelves 3 segundos de visión al enemigo.
        </p>
      </article>
    </div>`;
  } else if (activeTab === 'objectives') {
    content = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <article class="card-inset p-4 space-y-2 border-l-2 border-[#a855f7]">
        <div class="flex items-center justify-between">
          <span class="chip font-bold" style="color:#a855f7;border-color:#a855f755">Min 06:00 & 14:00</span>
          <span class="text-[11px] font-bold text-ink-mute">Foso Superior</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">Larvas del Vacío (06:00) y Heraldo (14:00)</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          Al <b>05:35</b>, Top y Mid deben empujar su oleada y el Support debe rotar desde base hacia el río norte. Asegurar las Larvas otorga daño verdadero progresivo contra torres. A las <b>14:00</b> desaparecen las larvas y aparece el Heraldo de la Grieta.
        </p>
      </article>

      <article class="card-inset p-4 space-y-2 border-l-2 border-[#f97316]">
        <div class="flex items-center justify-between">
          <span class="chip font-bold" style="color:#f97316;border-color:#f9731655">Min 05:00 (+5:00)</span>
          <span class="text-[11px] font-bold text-ink-mute">Foso Inferior</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">Protocolo de Dragón Elemental ("1 Minuto Antes")</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          1. <b>Min -1:00:</b> Vuelve a base, compra ítems y recarga 3 wards + 2 Pinks.<br/>
          2. <b>Min -0:40:</b> Empuja las oleadas de Mid y Bot.<br/>
          3. <b>Min -0:25:</b> Entra con Lente del Oráculo al río y pon un Deep Ward en la entrada del Buff Azul/Rojo enemigo.
        </p>
      </article>

      <article class="card-inset p-4 space-y-2 border-l-2 border-gold">
        <div class="flex items-center justify-between">
          <span class="chip chip-gold font-bold">Min 20:00+</span>
          <span class="text-[11px] font-bold text-ink-mute">Late Game</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">La Trampa de Barón ("Baron Bait")</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          Con el río superior completamente a oscuras para el rival, no siempre tienes que terminar el Barón: espera escondido en el arbusto del río o detrás del muro de Red/Blue a que el rival camine a revisar sin visión y gana la pelea 5v4.
        </p>
      </article>
    </div>`;
  } else {
    content = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <article class="card-inset p-4 space-y-2 border-l-2 border-[#38bdf8]">
        <div class="flex items-center justify-between">
          <span class="chip font-bold" style="color:#38bdf8;border-color:#38bdf855">Línea Azul (Mapa)</span>
          <span class="text-[11px] font-bold text-ink-mute">Cuando vas ganando</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">Línea de Visión Ofensiva (Jungla Profunda)</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          Cuando tiras una Torre de Tier 1, los wards en el río ya no bastan. Adelanta todos tus centinelas a los <b>cruces de campamentos enemigos (Azul/Lobos y Rojo/Dagarracos)</b> para robarles toda la jungla y asfixiar su oro.
        </p>
      </article>

      <article class="card-inset p-4 space-y-2 border-l-2 border-crimson">
        <div class="flex items-center justify-between">
          <span class="chip chip-crimson font-bold">Línea Roja (Mapa)</span>
          <span class="text-[11px] font-bold text-ink-mute">Cuando vas perdiendo</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">Línea de Visión Defensiva (Anti-Pick)</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          Si perdiste tus torres exteriores, <b>prohibido caminar solo al río</b>. Coloca wards en las 4 entradas de tu propia jungla y usa el Trinket Azul para farmear tus campamentos y oleadas laterales sin morir cazado.
        </p>
      </article>

      <article class="card-inset p-4 space-y-2 border-l-2 border-win">
        <div class="flex items-center justify-between">
          <span class="chip chip-win font-bold">Puntos Verdes (Mapa)</span>
          <span class="text-[11px] font-bold text-ink-mute">Frutos del Vidente</span>
        </div>
        <h4 class="font-bold text-ink text-[13.5px]">Uso de Plantas de Visión (Scryer's Bloom)</h4>
        <p class="text-[12px] text-ink-dim leading-relaxed">
          Golpea los Frutos del Vidente apuntando en diagonal hacia el foso de Dragón o Barón antes de entrar al río: revelan campeones escondidos y descubren centinelas invisibles enemigos para que los limpies sin gastar tu Lente del Oráculo.
        </p>
      </article>
    </div>`;
  }

  return `
  <section class="card p-5 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
      <div>
        <div class="eyebrow text-gold">Enciclopedia Táctica de la Grieta</div>
        <h3 class="text-[16px] font-extrabold text-ink mt-0.5">Guía de Ganks, Pinks, Tracking de Jungla y Control de Mapa</h3>
      </div>
      <div class="flex flex-wrap gap-1.5">
        ${tabs
          .map(
            (t) => `
          <button type="button" class="pill !h-8 !px-3 text-[11.5px] ${
            activeTab === t.id ? '!border-gold !bg-gold/15 !text-gold font-bold' : ''
          }" data-action="setGuideTab" data-tab="${t.id}">
            ${esc(t.label)}
          </button>`,
          )
          .join('')}
      </div>
    </div>
    ${content}
  </section>`;
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
      showJungleCamps: true,
      showControlLines: false,
      zoom: 'full',
      guideTab: 'timings',
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
            <div class="w-full max-w-[650px] flex flex-wrap items-center justify-between gap-2 pb-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" class="chip cursor-pointer ${s.showVisionRadius ? 'chip-gold font-bold' : 'opacity-70'}" data-action="toggleLayer" data-layer="vision">
                  ${icon('eye', 11)} Radio Visión
                </button>
                <button type="button" class="chip cursor-pointer ${s.showGankRoutes ? 'chip-crimson font-bold' : 'opacity-70'}" data-action="toggleLayer" data-layer="routes">
                  ${icon('compass', 11)} Rutas Gank + Timings
                </button>
                <button type="button" class="chip cursor-pointer ${s.showJungleCamps ? 'chip-win font-bold' : 'opacity-70'}" data-action="toggleLayer" data-layer="camps">
                  ${icon('target', 11)} 16 Campamentos (Azul/Rojo)
                </button>
                <button type="button" class="chip cursor-pointer ${s.showControlLines ? '!border-[#38bdf8] !text-[#38bdf8] font-bold' : 'opacity-70'}" data-action="toggleLayer" data-layer="lines">
                  ${icon('spark', 11)} Líneas Control & Plantas
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

            <div class="relative w-full max-w-[650px] aspect-square rounded-2xl overflow-hidden border border-line-strong shadow-2xl bg-[#08090c]">
              <div class="w-full h-full relative transition-transform duration-300 ease-out origin-center" style="${ZOOM_TRANSFORM[s.zoom].style}">
                <!-- Textura oficial actualizada de la Grieta del Invocador (Mapa-lol-actualizado.jpg) -->
                <img src="${mapImg()}"
                     alt="Grieta del Invocador — Mapa Oficial Actualizado"
                     class="w-full h-full object-cover select-none"
                     draggable="false" />

                <!-- Capas SVG de Rutas de Gank / Timings, 16 Campamentos y Líneas de Control -->
                ${renderTacticalSvg(s.role, s.side, s.showGankRoutes, s.showJungleCamps, s.showControlLines)}

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

            <div class="flex flex-wrap items-center justify-between gap-2 w-full max-w-[650px] px-2 text-[11px] text-ink-mute">
              <span>12 Campamentos (6 Azules + 6 Rojos: Rocosos, Rojo, Dagarracos, Lobos, Azul, Gromp) + 4 Objetivos de Río.</span>
              <span>Mostrando <strong>${visibleSpots.length}</strong> spots de ${ROLE_LABEL[s.role]} (${s.side === 'blue' ? 'Azul' : 'Rojo'})</span>
            </div>
          </div>

          <!-- Columna Derecha: Tarjeta Lateral de Detalle Táctico -->
          <div class="lg:col-span-5 xl:col-span-4 h-full">
            ${sidePanel(activeSpot, allRoleSpots, s.role)}
          </div>
        </div>

        <!-- Enciclopedia Táctica Inferior (Investigación de Ganks, Pinks, Objetivos y Líneas de Visión) -->
        ${renderMapControlKnowledgeBase(s.guideTab)}
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
      setGuideTab: ({ data }) => {
        const guideTab = data.tab as GuideTab;
        return { guideTab };
      },
      toggleLayer: ({ data, state }) => {
        const layer = data.layer;
        if (layer === 'vision') return { showVisionRadius: !state.showVisionRadius };
        if (layer === 'routes') return { showGankRoutes: !state.showGankRoutes };
        if (layer === 'camps') return { showJungleCamps: !state.showJungleCamps };
        if (layer === 'lines') return { showControlLines: !state.showControlLines };
      },
    },
  });

  return view;
}
