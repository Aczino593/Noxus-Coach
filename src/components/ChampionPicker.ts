import { CHAMPIONS } from '../data/champions';
import type { Role } from '../types';
import { ROLE_LABEL, ROLES } from '../types';
import { champIcon, esc, icon, roleIcon } from '../lib/ui';

export interface PickerOpts {
  /** Texto de búsqueda actual */
  query: string;
  /** Limita a un rol (opcional, null = todos) */
  role?: Role | null;
  exclude?: string[];
  /** `data-action` al elegir (lleva `data-id` = id del campeón) */
  pickAction: string;
  /** `data-action` del overlay para cerrar */
  closeAction: string;
  /** `data-input` del buscador */
  inputKey: string;
  title?: string;
  /** Posición CSS del popover (por defecto bajo el disparador) */
  position?: string;
  /** Acción para cambiar el rol del selector */
  roleAction?: string;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f' ]/g, '');

/** Popover con buscador + selector de rol + parrilla de campeones. */
export function championPicker(o: PickerOpts): string {
  const q = norm(o.query);

  // Si hay búsqueda por texto, busca globalmente para no ocultar campeones off-meta o de otras líneas (ej. Syndra/Sett en Bot)
  const list = CHAMPIONS.filter((c) => {
    if (o.exclude?.includes(c.id)) return false;
    if (q) {
      return norm(c.name).includes(q) || norm(c.id).includes(q);
    }
    return !o.role || c.roles.includes(o.role);
  }).sort((a, b) => a.name.localeCompare(b.name));

  const roleAction = o.roleAction ?? 'picker-filter-role';

  return `
  <div class="fixed inset-0 z-40" data-action="${o.closeAction}"></div>
  <div class="card anim-fade-up absolute z-50 w-[440px] p-3 shadow-2xl" style="${o.position ?? 'left:0;top:calc(100% + 8px)'};box-shadow:0 24px 60px -12px rgb(0 0 0 / .9), 0 0 0 1px rgb(255 46 77 / .2)">
    <div class="mb-2 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="eyebrow text-[11px] font-black">${o.title ?? 'Elegir campeón'}</span>
        <span class="chip chip-gold !py-0 !text-[9.5px] num">${list.length}</span>
      </div>
      <button class="btn btn-ghost btn-sm btn-icon !h-6 !w-6" data-action="${o.closeAction}" aria-label="Cerrar">${icon('x', 13)}</button>
    </div>

    <!-- Filtro de Roles Interactivo: Todos + 5 Posiciones -->
    <div class="mb-2.5 flex items-center gap-1 overflow-x-auto pb-0.5">
      <button type="button"
              class="pill !h-7 !px-2.5 !text-[11px] cursor-pointer ${
                !o.role ? '!border-crimson !text-white !bg-crimson/20 shadow-[0_0_8px_rgba(255,46,77,0.3)]' : '!text-ink-mute hover:!text-ink'
              }"
              data-action="${roleAction}"
              data-id="all">
        Todos
      </button>
      ${ROLES.map((r) => {
        const active = o.role === r;
        const label = r === 'adc' ? 'ADC / Bot' : ROLE_LABEL[r];
        return `
        <button type="button"
                class="pill !h-7 !px-2 !text-[11px] flex items-center gap-1.5 cursor-pointer ${
                  active ? '!border-crimson !text-white !bg-crimson/20 shadow-[0_0_8px_rgba(255,46,77,0.3)]' : '!text-ink-mute hover:!text-ink'
                }"
                data-action="${roleAction}"
                data-id="${r}"
                title="${label}">
          ${roleIcon(r, 12, active ? 'text-white' : 'text-ink-mute')}
          <span>${r === 'adc' ? 'ADC' : r === 'support' ? 'Sup' : r.slice(0, 3)}</span>
        </button>`;
      }).join('')}
    </div>

    <div class="relative mb-2">
      <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-mute">${icon('search', 14)}</span>
      <input id="picker-q-${o.inputKey}" class="input !pl-8" data-input="${o.inputKey}" data-autofocus value="${esc(o.query)}" placeholder="Buscar cualquier campeón (ej. Syndra, Sett, Lux, Jax)…" autocomplete="off" spellcheck="false"/>
      ${
        o.query
          ? `<button class="absolute right-2 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink text-xs p-1" data-action="picker-clear-q">✕</button>`
          : ''
      }
    </div>

    <div class="grid max-h-[300px] grid-cols-6 gap-1.5 overflow-y-auto pr-1" data-keep-scroll="picker-${o.inputKey}">
      ${
        list.length
          ? list
              .map(
                (c) => `<button class="champ-tile p-0.5 text-center cursor-pointer group" data-action="${o.pickAction}" data-id="${c.id}" aria-label="${esc(c.name)}">
                  ${champIcon(c.id, 52, '!border-0 !rounded-[7px] w-full transition-transform group-hover:scale-105')}
                  <span class="mt-0.5 block truncate text-[9.5px] font-medium text-ink-dim group-hover:text-gold">${esc(c.name)}</span>
                </button>`,
              )
              .join('')
          : `<div class="col-span-6 py-8 text-center space-y-1">
              <p class="text-ink-mute text-[12px]">Sin resultados para “${esc(o.query)}”</p>
              <p class="text-[10.5px] text-ink-mute/70">Prueba quitando filtros de rol o verifica el nombre</p>
             </div>`
      }
    </div>
  </div>`;
}
