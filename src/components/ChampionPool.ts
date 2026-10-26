import { createView } from '../lib/view';
import { champIcon, esc, icon, roleIcon } from '../lib/ui';
import { CHAMPIONS, CHAMP_BY_ID } from '../data/champions';
import { ROLE_LABEL, ROLES, type Role } from '../types';

type PoolSlot = 'blind' | 'counter' | 'pocket';
interface Pick { champion: string; slot: PoolSlot; }
type Pools = Partial<Record<Role, Pick[]>>;
interface State { role: Role; query: string; pools: Pools; }
const STORAGE = 'noxus_champion_pools_v1';
const SLOT_LABEL: Record<PoolSlot, string> = { blind: 'Seguro', counter: 'Contra-pick', pocket: 'Especialidad' };

function readPools(): Pools {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE) || '{}') as Pools;
    return value && typeof value === 'object' ? value : {};
  } catch { return {}; }
}
function savePools(pools: Pools) {
  try { localStorage.setItem(STORAGE, JSON.stringify(pools)); } catch { /* storage unavailable */ }
}

export function mountChampionPool(root: HTMLElement) {
  return createView<State>({
    root,
    state: { role: 'top', query: '', pools: readPools() },
    render: (s) => {
      const pool = s.pools[s.role] ?? [];
      const chosen = new Set(pool.map((p) => p.champion));
      const options = CHAMPIONS.filter((c) => c.roles.includes(s.role) && !chosen.has(c.id) && c.name.toLowerCase().includes(s.query.toLowerCase())).slice(0, 18);
      return `
        <header class="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div class="eyebrow">Planificación personal</div><h2 class="mt-1 text-xl font-extrabold">Tu champion pool</h2><p class="mt-1 text-ink-dim">Arma una selección compacta para cada rol y guarda tus picks en este dispositivo.</p></div><span class="chip">${icon('users', 13)} ${ROLES.reduce((n, r) => n + (s.pools[r]?.length ?? 0), 0)} picks guardados</span></header>
        <div class="mb-4 flex flex-wrap gap-2">${ROLES.map((r) => `<button class="pill flex items-center gap-2" aria-pressed="${s.role === r}" data-action="role" data-id="${r}">${roleIcon(r, 15)} ${ROLE_LABEL[r]} <span class="num text-ink-mute">${s.pools[r]?.length ?? 0}/3</span></button>`).join('')}</div>
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(310px,.85fr)]">
          <section class="card p-4"><div class="flex flex-wrap items-center justify-between gap-3"><div><h3 class="section-title">Selecciona campeones</h3><p class="section-sub">Agrega hasta tres opciones para ${ROLE_LABEL[s.role]}.</p></div><label class="relative"><span class="sr-only">Buscar campeón</span><input class="!w-56 pl-9" data-input="query" value="${esc(s.query)}" placeholder="Buscar campeón…" autocomplete="off">${icon('search', 14, 'absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute')}</label></div>
          <div class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">${options.map((c) => `<button class="card-inset grid justify-items-center gap-1.5 p-2 transition-colors hover:border-crimson/60" data-action="add" data-id="${c.id}" aria-label="Agregar ${esc(c.name)}">${champIcon(c.id, 44)}<span class="max-w-full truncate text-[11px]">${esc(c.name)}</span></button>`).join('') || '<p class="col-span-full py-8 text-center text-ink-dim">No hay más coincidencias.</p>'}</div></section>
          <section class="card p-4"><div class="flex items-center justify-between"><div><h3 class="section-title">Pool de ${ROLE_LABEL[s.role]}</h3><p class="section-sub">Cubre distintas necesidades de selección.</p></div><span class="chip chip-crimson">${pool.length}/3</span></div>
          ${pool.length ? `<div class="mt-4 grid gap-2">${pool.map((p) => { const ch = CHAMP_BY_ID[p.champion]; return `<article class="card-inset flex items-center gap-3 p-3">${champIcon(p.champion, 44)}<div class="min-w-0 flex-1"><div class="truncate font-bold">${esc(ch?.name ?? p.champion)}</div><div class="mt-1 flex items-center gap-2"><span class="chip !py-0">${SLOT_LABEL[p.slot]}</span><span class="text-[11px] text-ink-mute">${ch?.dmg ?? ''} · ${ch?.late && ch.late >= 4 ? 'Escalado' : ch?.early && ch.early >= 4 ? 'Juego temprano' : 'Flexible'}</span></div></div><button class="btn btn-sm" data-action="cycle" data-id="${p.champion}" title="Cambiar categoría">${icon('swap', 13)}</button><button class="btn btn-sm" data-action="remove" data-id="${p.champion}" aria-label="Quitar ${esc(ch?.name ?? p.champion)}">${icon('trash', 13)}</button></article>`; }).join('')}</div>` : `<div class="mt-4 rounded-xl border border-dashed border-line-strong p-8 text-center text-ink-dim"><div class="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-crimson">${icon('plus', 18)}</div><p class="font-semibold text-ink">Tu pool está vacío</p><p class="mt-1 text-xs">Elige campeones en la lista para empezar.</p></div>`}
          <div class="mt-4 rounded-xl border border-line bg-canvas/70 p-3 text-xs leading-relaxed text-ink-dim"><b class="text-ink">Idea de estructura:</b> un pick seguro para blind pick, una opción de respuesta y un campeón de especialidad que domines. El indicador de estilo usa los perfiles internos del proyecto.</div></section>
        </div>`;
    },
    actions: {
      role: ({ data }) => ({ role: data.id as Role, query: '' }),
      add: ({ data, state }) => {
        const list = state.pools[state.role] ?? [];
        if (list.length >= 3 || !data.id || list.some((p) => p.champion === data.id)) return;
        const pools = { ...state.pools, [state.role]: [...list, { champion: data.id, slot: (['blind', 'counter', 'pocket'][list.length] as PoolSlot)] } };
        savePools(pools); return { pools };
      },
      remove: ({ data, state }) => {
        const pools = { ...state.pools, [state.role]: (state.pools[state.role] ?? []).filter((p) => p.champion !== data.id) };
        savePools(pools); return { pools };
      },
      cycle: ({ data, state }) => {
        const pools = { ...state.pools, [state.role]: (state.pools[state.role] ?? []).map((p) => p.champion === data.id ? { ...p, slot: (['blind', 'counter', 'pocket'][(['blind', 'counter', 'pocket'].indexOf(p.slot) + 1) % 3] as PoolSlot) } : p) };
        savePools(pools); return { pools };
      },
    },
    inputs: { query: ({ value }) => ({ query: value }) },
  });
}
