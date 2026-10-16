import { CHAMPIONS } from '../data/champions';
import type { Role } from '../types';
import { ROLE_LABEL } from '../types';
import { champIcon, esc, icon } from '../lib/ui';

export interface PickerOpts {
  /** Texto de búsqueda actual */
  query: string;
  /** Limita a un rol (opcional) */
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
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f' ]/g, '');

/** Popover con buscador + parrilla de campeones. Se renderiza dentro del contenedor `relative` del disparador. */
export function championPicker(o: PickerOpts): string {
  const q = norm(o.query);
  const list = CHAMPIONS.filter(
    (c) => (!o.role || c.roles.includes(o.role)) && !o.exclude?.includes(c.id) && (!q || norm(c.name).includes(q)),
  ).sort((a, b) => a.name.localeCompare(b.name));
  return `
  <div class="fixed inset-0 z-40" data-action="${o.closeAction}"></div>
  <div class="card anim-fade-up absolute z-50 w-[420px] p-3 shadow-2xl" style="${o.position ?? 'left:0;top:calc(100% + 8px)'};box-shadow:0 24px 60px -12px rgb(0 0 0 / .85), 0 0 0 1px rgb(255 46 77 / .15)">
    <div class="mb-2 flex items-center justify-between">
      <span class="eyebrow">${o.title ?? 'Elegir campeón'}${o.role ? ` · ${ROLE_LABEL[o.role]}` : ''}</span>
      <button class="btn btn-ghost btn-sm btn-icon !h-6 !w-6" data-action="${o.closeAction}" aria-label="Cerrar">${icon('x', 13)}</button>
    </div>
    <div class="relative mb-2">
      <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-mute">${icon('search', 14)}</span>
      <input id="picker-q-${o.inputKey}" class="input !pl-8" data-input="${o.inputKey}" data-autofocus value="${esc(o.query)}" placeholder="Buscar campeón…" autocomplete="off" spellcheck="false"/>
    </div>
    <div class="grid max-h-[300px] grid-cols-6 gap-1.5 overflow-y-auto pr-1" data-keep-scroll="picker-${o.inputKey}">
      ${
        list.length
          ? list
              .map(
                (c) => `<button class="champ-tile p-0.5 text-center" data-action="${o.pickAction}" data-id="${c.id}" aria-label="${esc(c.name)}">
                  ${champIcon(c.id, 52, '!border-0 !rounded-[7px] w-full')}
                  <span class="mt-0.5 block truncate text-[9.5px] font-medium text-ink-dim">${esc(c.name)}</span>
                </button>`,
              )
              .join('')
          : `<p class="col-span-6 py-6 text-center text-ink-mute">Sin resultados para “${esc(o.query)}”</p>`
      }
    </div>
  </div>`;
}
