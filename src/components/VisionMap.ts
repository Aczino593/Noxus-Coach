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

interface State {
  role: Role;
  side: 'blue' | 'red';
  selectedSpotId: string | null;
  filterType: WardType | 'all';
}

function wardPin(spot: VisionSpot, isSelected: boolean): string {
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

    <!-- Anillo de pulso animado -->
    <span class="absolute -inset-2.5 rounded-full opacity-60 animate-ping pointer-events-none"
          style="background-color: ${color}; animation-duration: ${isSelected ? '1.4s' : '2.8s'};"></span>

    <!-- Resplandor estático si está seleccionado -->
    <span class="absolute -inset-2 rounded-full blur-xs opacity-70 pointer-events-none"
          style="background-color: ${color};"></span>

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

function sidePanel(spot: VisionSpot | null, spots: VisionSpot[]): string {
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
    </div>

    <!-- Lista rápida de puntos del rol actual -->
    <div class="border-t border-line pt-3">
      <div class="text-[11px] font-bold text-ink-mute uppercase tracking-wider mb-2">
        Puntos de este rol (${spots.length})
      </div>
      <div class="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
        ${spots.map((s) => {
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
        }).join('')}
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
    },
    render: (s) => {
      const allRoleSpots = getVisionSpots(s.role, s.side);
      const visibleSpots = s.filterType === 'all'
        ? allRoleSpots
        : allRoleSpots.filter((sp) => sp.type === s.filterType);

      // Si no hay seleccionado o el seleccionado no pertenece al filtro actual, seleccionar el primero
      const activeSpot = (s.selectedSpotId && visibleSpots.find((p) => p.id === s.selectedSpotId))
        || visibleSpots[0]
        || allRoleSpots[0]
        || null;

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

        <!-- Contenedor Principal: Mapa a la izquierda + Panel Lateral a la derecha -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <!-- Columna Izquierda: Mapa de la Grieta del Invocador con Pines -->
          <div class="lg:col-span-7 xl:col-span-8 card p-4 flex flex-col items-center">
            <div class="relative w-full max-w-[620px] aspect-square rounded-2xl overflow-hidden border border-line-strong shadow-2xl bg-[#08090c]">
              <!-- Textura oficial del minimapa de la Grieta del Invocador (Season 14+) -->
              <img src="${mapImg()}"
                   alt="Grieta del Invocador — Textura Oficial del Minimapa"
                   class="w-full h-full object-cover filter brightness-95 contrast-105 select-none"
                   draggable="false" />

              <!-- Overlay estético con viñeta y sutil gradiente -->
              <div class="absolute inset-0 bg-radial from-transparent via-[#0b0c10]/20 to-[#0b0c10]/80 pointer-events-none"></div>

              <!-- Etiquetas discretas de Base -->
              <div class="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-wider text-[#4c8dff]/70 pointer-events-none select-none bg-[#0b0c10]/80 px-2 py-0.5 rounded border border-[#4c8dff]/30">
                Base Azul
              </div>
              <div class="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider text-crimson/70 pointer-events-none select-none bg-[#0b0c10]/80 px-2 py-0.5 rounded border border-crimson/30">
                Base Roja
              </div>

              <!-- PINES ACTIVOS SOBRE EL MAPA -->
              ${visibleSpots.map((spot) => wardPin(spot, spot.id === activeSpot?.id)).join('')}
            </div>

            <div class="mt-3 flex items-center justify-between w-full max-w-[620px] px-2 text-[11px] text-ink-mute">
              <span>📍 Haz clic en cualquier pin para ver el detalle táctico y el minuto exacto.</span>
              <span>Mostrando <strong>${visibleSpots.length}</strong> spots de ${ROLE_LABEL[s.role]}</span>
            </div>
          </div>

          <!-- Columna Derecha: Tarjeta Lateral de Detalle Táctico -->
          <div class="lg:col-span-5 xl:col-span-4 h-full">
            ${sidePanel(activeSpot, allRoleSpots)}
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
    },
  });

  return view;
}
