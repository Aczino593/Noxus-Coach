import { createView, type View } from '../lib/view';
import { champIcon, emptySlot, esc, gauge, icon, itemIcon, roleIcon, sk } from '../lib/ui';
import { CHAMP_BY_ID } from '../data/champions';
import { item } from '../data/items';
import { itemCost } from '../data/itemGuide';
import { SKILL_COLOR } from '../data/builds';
import { getBuild, matchup, type PathStep, type ResolvedBuild, type TacticalComponent } from '../lib/buildEngine';
import { ROLE_LABEL, ROLES, type Role } from '../types';
import { championPicker } from './ChampionPicker';
import { runesTree } from './RunesTree';
import { sleep } from '../lib/ui';

interface State {
  mine: string;
  enemy: string | null;
  role: Role;
  picker: 'mine' | 'enemy' | null;
  query: string;
  loading: boolean;
  selectedSituational: number;
}

/* ─────────────── Selectores ─────────────── */
function trigger(kind: 'mine' | 'enemy', s: State): string {
  const id = kind === 'mine' ? s.mine : s.enemy;
  const ch = id ? CHAMP_BY_ID[id] : null;
  const open = s.picker === kind;
  const label = kind === 'mine' ? 'Tu campeón' : 'Rival esperado';
  return `
  <div class="relative">
    <button class="flex w-[250px] items-center gap-3 rounded-xl border bg-canvas p-2 pr-3 text-left transition-colors ${open ? 'border-crimson' : 'border-line hover:border-line-strong'}" data-action="open-${kind}" aria-expanded="${open}" aria-haspopup="listbox">
      ${ch ? champIcon(ch.id, 44, kind === 'enemy' ? '!border-red-side/60' : '!border-crimson/60') : `<span class="champ-ring grid h-11 w-11 place-items-center text-ink-mute">${icon('plus', 16)}</span>`}
      <span class="min-w-0 flex-1 leading-tight">
        <span class="eyebrow block">${label}</span>
        <span class="block truncate text-[14px] font-bold">${ch ? esc(ch.name) : 'Sin rival (a ciegas)'}</span>
      </span>
      <span class="text-ink-mute">${icon('chevron', 15)}</span>
    </button>
    ${open
      ? championPicker({
        query: s.query,
        role: kind === 'enemy' ? s.role : null,
        exclude: kind === 'enemy' ? [s.mine] : [],
        pickAction: `pick-${kind}`,
        closeAction: 'close',
        inputKey: `q-${kind}`,
        title: label,
      })
      : ''
    }
  </div>`;
}

function controls(s: State): string {
  const ch = CHAMP_BY_ID[s.mine];
  return `
  <div class="card flex flex-wrap items-center gap-4 p-3.5">
    ${trigger('mine', s)}
    <span class="grid h-9 w-9 place-items-center rounded-full border border-line-strong text-[10px] font-extrabold text-crimson">VS</span>
    ${trigger('enemy', s)}
    ${s.enemy ? `<button class="btn btn-ghost btn-sm" data-action="clear-enemy">${icon('x', 12)} Quitar rival</button>` : ''}
    <div class="ml-auto flex items-center gap-1 rounded-xl border border-line-strong bg-canvas/80 p-1">
      <span class="eyebrow px-2 text-[10px] uppercase font-bold tracking-wider text-ink-mute">Carril:</span>
      ${ROLES.map((r) => {
    const active = s.role === r;
    const isNative = ch.roles.includes(r);
    const label = r === 'adc' ? 'ADC / Bot' : ROLE_LABEL[r];
    return `
        <button type="button"
                class="role-btn relative grid h-9 w-9 place-items-center rounded-lg border transition-all duration-200 cursor-pointer ${active
        ? '!bg-crimson !text-white !border-crimson shadow-[0_0_14px_rgba(255,46,77,0.55)] scale-[1.04]'
        : 'border-transparent text-ink-dim hover:text-ink hover:bg-surface-2 hover:border-line-strong'
      }"
                data-action="role"
                data-id="${r}"
                aria-pressed="${active}"
                aria-label="${label}"
                title="${label}${isNative ? ' (Rol principal)' : ' (Selección flexible)'}">
          ${roleIcon(r, 18, active ? 'text-white' : 'text-ink-mute hover:text-ink')}
          ${isNative && !active ? '<span class="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-crimson/60" title="Rol principal"></span>' : ''}
        </button>`;
  }).join('')}
    </div>
  </div>`;
}

/* ─────────────── Matchup ─────────────── */
function matchupCard(s: State): string {
  const m = matchup(s.mine, s.enemy, s.role);
  if (!m) {
    return `<section class="card p-5"><h3 class="section-title">Matchup</h3>
      <p class="mt-3 text-[12.5px] text-ink-dim">Selecciona un rival esperado para recibir consejos de línea y objetos situacionales específicos. Mientras tanto, se muestra una build a ciegas.</p></section>`;
  }
  const color = m.tone === 'good' ? 'var(--color-win)' : m.tone === 'bad' ? 'var(--color-loss)' : 'var(--color-gold)';
  return `
  <section class="card p-5">
    <div class="flex items-start justify-between">
      <div><h3 class="section-title">Matchup</h3><p class="section-sub mt-0.5">${esc(CHAMP_BY_ID[s.mine].name)} vs ${esc(CHAMP_BY_ID[s.enemy!].name)}</p></div>
      <span class="chip" style="color:${color};border-color:${color}66;background:${color}1a">${m.label}</span>
    </div>
    <div class="mt-4 flex items-center gap-5">
      ${gauge(m.wr, { size: 104, stroke: 11, color, valueText: `${m.wr.toFixed(1)}%`, label: 'WR est.' })}
      <ul class="grid flex-1 gap-2">
        ${m.tips.map((t) => `<li class="flex gap-2 text-[12px] leading-snug text-ink-dim"><span class="mt-0.5 text-crimson">${icon('target', 13)}</span><span>${t}</span></li>`).join('')}
      </ul>
    </div>
  </section>`;
}

/* ─────────────── Habilidades ─────────────── */
function skills(b: ResolvedBuild): string {
  const rows: ('Q' | 'W' | 'E' | 'R')[] = ['Q', 'W', 'E', 'R'];
  const priority = b.priority.join(' › ');
  return `
  <section class="card p-5">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="section-title">Orden de Habilidades</h3>
        <p class="section-sub mt-0.5">Prioridad de maximización para dominar los intercambios de daño.</p>
      </div>
      <span class="chip chip-crimson text-[11.5px] font-bold">Prioridad: <b class="num font-black">${priority}</b></span>
    </div>
    <div class="mt-3 overflow-x-auto">
      <div class="grid min-w-[560px] gap-1" style="grid-template-columns:30px repeat(18, minmax(0,1fr))">
        <span></span>
        ${Array.from({ length: 18 }, (_, i) => `<span class="num text-center text-[9.5px] ${[5, 10, 15].includes(i) ? 'text-crimson font-bold' : 'text-ink-mute'}">${i + 1}</span>`).join('')}
        ${rows
      .map((r) => {
        const c = SKILL_COLOR[r];
        return `<span class="grid h-6 w-[26px] place-items-center rounded-md border text-[11px] font-extrabold" style="color:${c};border-color:${c}66;background:${c}14">${r}</span>
            ${b.levels
            .map((lv, i) => {
              const on = lv === r;
              const first = i < 3 && on;
              return `<span class="grid h-6 place-items-center rounded-md border text-[10px] font-bold num ${on ? '' : 'border-line bg-canvas'}"
                  style="${on ? `background:${c}26;border-color:${c};color:${c};${first ? `box-shadow:0 0 0 1px ${c}, 0 0 12px -2px ${c}` : ''}` : ''}">${on ? i + 1 : ''}</span>`;
            })
            .join('')}`;
      })
      .join('')}
      </div>
    </div>
    <div class="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-line text-[11.5px] text-ink-dim">
      <div>Detalle Nivel 1 a 3: <strong class="text-ink">Nivel 1 ${b.first3[0]} → Nivel 2 ${b.first3[1]} → Nivel 3 ${b.first3[2]}</strong></div>
      <div>Definitiva (R) en niveles <strong class="text-crimson font-bold">6 / 11 / 16</strong></div>
    </div>
  </section>`;
}

/* ─────────────── Runas Estilo Mobalytics ─────────────── */
function runes(b: ResolvedBuild): string {
  return runesTree(b.runes, b.spells);
}

/* ─────────────── Ruta secuencial de 6 ítems ─────────────── */
const arrow = `<span class="self-center text-ink-mute">${icon('chevron', 16, '-rotate-90')}</span>`;

const gold = (n: number) => `${n.toLocaleString('es-AR')} g`;

/** Bloque de alerta que interrumpe la ruta: componente barato antes del siguiente ítem completo. */
function tacticalAlert(t: TacticalComponent): string {
  const name = esc(item(t.item).name);
  const lane = t.duo ? 'los intercambios 2v2' : 'los intercambios de la línea';
  return `
  <li class="flex gap-3.5 pb-4" role="alert">
    <div class="flex flex-col items-center">
      <span class="grid h-9 w-9 place-items-center rounded-full border border-crimson bg-crimson/15 text-crimson shadow-[0_0_16px_-4px_var(--color-crimson)]">${icon('alert', 16)}</span>
      <span class="mt-1 w-px flex-1 border-l border-dashed border-crimson/50"></span>
    </div>
    <div class="flex-1 rounded-xl border border-crimson/50 bg-crimson/10 p-3.5 shadow-[0_0_24px_-12px_var(--color-crimson)]">
      <div class="flex items-start gap-3">
        ${itemIcon(t.item, 44, '!border-crimson/60')}
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <b class="text-[13px] font-extrabold text-crimson">¡Adaptación de Línea recomendada!</b>
            <span class="chip chip-crimson num">${icon('coin', 11)} +${gold(t.cost)}</span>
          </div>
          <p class="mt-1 text-[12px] leading-snug text-ink">${esc(t.enemy)} tiene ${esc(t.threat)}. Compra <b>'${name}'</b> (${t.cost.toLocaleString('es-AR')} de oro) antes de empezar tu segundo ítem completo. Esto corta sus curaciones y te permite ganar ${lane}.</p>
        </div>
      </div>
    </div>
  </li>`;
}

function pathStep(st: PathStep, last: boolean): string {
  const spike = st.slot <= 2;
  const ring = st.slot === 1 ? '!border-gold/70' : spike ? '!border-crimson/60' : '';
  const badge =
    st.slot === 1
      ? 'border-gold bg-gold text-canvas shadow-[0_0_16px_-3px_var(--color-gold)]'
      : spike
        ? 'border-crimson bg-crimson/20 text-crimson'
        : 'border-line-strong bg-surface-2 text-ink-dim';
  return `
  <li class="flex gap-3.5 pb-4">
    <div class="flex flex-col items-center">
      <span class="num grid h-9 w-9 place-items-center rounded-full border text-[15px] font-extrabold ${badge}">${st.slot}</span>
      ${last ? '' : '<span class="mt-1 w-px flex-1 bg-line-strong"></span>'}
    </div>
    <div class="card-inset card-hover min-w-0 flex-1 p-3">
      <div class="flex items-start gap-3">
        ${itemIcon(st.item, 52, ring)}
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <b class="text-[13.5px]">${esc(item(st.item).name)}</b>
            <span class="chip chip-gold num">${icon('coin', 11)} ${gold(st.cost)}</span>
          </div>
          <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span class="chip ${spike ? 'chip-crimson' : ''}">${esc(st.label)}</span>
            ${st.adapted ? `<span class="chip chip-win">${icon('target', 10)} Adaptado: ${esc(st.adapted)}</span>` : ''}
          </div>
        </div>
        <span class="num flex-none text-[10.5px] text-ink-mute" data-tip="Oro total acumulado">Σ ${gold(st.cumulative)}</span>
      </div>
      <p class="mt-2.5 flex gap-1.5 text-[12px] leading-snug text-ink-dim"><span class="mt-0.5 flex-none text-gold">${icon('spark', 12)}</span><span>${esc(st.why)}</span></p>
    </div>
  </li>`;
}

function items(b: ResolvedBuild): string {
  const group = (title: string, ids: number[], size = 40) => `
    <div>
      <div class="eyebrow mb-2">${title}</div>
      <div class="flex gap-1.5">${ids.length ? ids.map((id) => itemIcon(id, size)).join('') : emptySlot(size)}</div>
    </div>`;
  const total = b.path.length ? b.path[b.path.length - 1].cumulative : 0;
  return `
  <section class="card p-5">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 class="section-title">Ruta de objetos · 6 Power Spikes</h3>
        <p class="section-sub mt-0.5">Compra en este orden: cada objeto sube tu poder en un momento clave de la partida.</p>
      </div>
      <span class="chip chip-gold num">${icon('coin', 11)} Σ ${gold(total)}</span>
    </div>
    <div class="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-line bg-canvas/60 p-3">
      ${group('Iniciales', b.start)}${arrow}
      ${b.firstBack && b.firstBack.length ? group('Primer Back', b.firstBack) + arrow : ''}
      ${group('Botas', [b.boots])}
      <p class="ml-auto max-w-[190px] self-center text-[11px] leading-snug text-ink-mute">Inicio y botas son fijos; la ruta numerada son tus 6 objetos finales.</p>
    </div>
    <ol class="mt-5">
      ${b.path
      .map(
        (st, i) =>
          pathStep(st, i === b.path.length - 1 && !(b.tactical && b.tactical.afterSlot === st.slot)) +
          (b.tactical && b.tactical.afterSlot === st.slot ? tacticalAlert(b.tactical) : ''),
      )
      .join('')}
    </ol>
  </section>`;
}

/* ─────────────── Objetos Situacionales Recomendados (Estilo Mobalytics) ─────────────── */
function situationalItems(b: ResolvedBuild, s: State): string {
  if (!b.situational || !b.situational.length) return '';

  const activeIdx = Math.min(s.selectedSituational ?? 0, b.situational.length - 1);
  const activeSit = b.situational[activeIdx];
  const activeItem = item(activeSit.item);
  const cost = itemCost(activeSit.item);

  return `
  <section class="card p-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 class="section-title flex items-center gap-2">
          <span>SITUATIONAL ITEMS</span>
          <span class="text-[11px] font-normal text-ink-mute">· Alternativas Tácticas</span>
        </h3>
        <p class="section-sub mt-0.5">Sustituciones al núcleo para responder a la composición y ventajas enemigas.</p>
      </div>
      <span class="chip chip-gold text-[11px] font-bold num">${b.situational.length} opciones</span>
    </div>

    <!-- Barra interactiva de iconos de ítems -->
    <div class="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-canvas/60 p-2.5">
      ${b.situational
      .map((sit, idx) => {
        const isSelected = idx === activeIdx;
        const it = item(sit.item);
        return `
          <button type="button"
                  class="group relative rounded-xl p-1 transition-all duration-200 cursor-pointer ${isSelected
            ? 'bg-gold/15 ring-2 ring-gold shadow-[0_0_16px_rgba(240,180,41,0.45)] scale-105'
            : 'hover:bg-surface-2 opacity-75 hover:opacity-100 hover:scale-102'
          }"
                  data-action="select-situational"
                  data-id="${idx}"
                  aria-pressed="${isSelected}"
                  title="${esc(it.name)} · ${esc(sit.tag)}">
            ${itemIcon(sit.item, 44, isSelected ? '!border-gold' : '!border-line')}
            ${isSelected ? '<span class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_var(--color-gold)]"></span>' : ''}
          </button>`;
      })
      .join('')}
    </div>

    <!-- Detalle pedagógico del ítem situacional seleccionado -->
    <div class="mt-3.5 rounded-xl border border-line-strong bg-canvas/80 p-4 transition-all">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-[15px] font-bold text-ink">${esc(activeItem.name)}</h4>
            <span class="chip chip-crimson text-[10.5px] font-bold">${esc(activeSit.tag)}</span>
          </div>
          <div class="mt-1 text-[12px] font-medium text-ink-dim">
            <span>Alternativa recomendada para: </span>
            <strong class="text-gold font-bold">${esc(activeSit.alternativeFor)}</strong>
          </div>
        </div>
        <span class="chip chip-gold num text-[11.5px] font-bold">${icon('coin', 11)} ${gold(cost)}</span>
      </div>
      <p class="mt-3 flex gap-2 text-[12.5px] leading-relaxed text-ink-dim">
        <span class="mt-0.5 flex-none text-gold">${icon('spark', 13)}</span>
        <span>${esc(activeSit.reason)}</span>
      </p>
    </div>
  </section>`;
}

function skeleton(): string {
  return `<div class="mt-4 grid gap-4" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
    <div class="grid gap-4">${sk('h-[190px]')}${sk('h-[200px]')}${sk('h-[230px]')}</div>
    <div class="grid gap-4">${sk('h-[250px]')}${sk('h-[340px]')}${sk('h-[180px]')}</div></div>`;
}

export function mountBuildPlanner(root: HTMLElement) {
  const view = createView<State>({
    root,
    state: { mine: 'Ahri', enemy: 'Yone', role: 'mid', picker: null, query: '', loading: false, selectedSituational: 0 },
    render: (s) => {
      let body: string;
      if (s.loading) body = skeleton();
      else {
        const b = getBuild(s.mine, s.enemy, s.role);
        body = `<div class="mt-4 grid items-start gap-4" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
          <div class="grid gap-4">${matchupCard(s)}${skills(b)}${runes(b)}</div>
          <div class="grid gap-4">${items(b)}${situationalItems(b, s)}</div>
        </div>`;
      }
      return `
        <div class="mb-3 flex items-end justify-between">
          <div><h2 class="text-[18px] font-extrabold">Preparador de Builds & Items</h2>
          <p class="section-sub">Elige tu campeón, el carril de juego y el matchup esperado para una build 100% reactiva.</p></div>
          <div class="flex items-center gap-2">
            <span class="chip chip-crimson font-bold">${roleIcon(s.role, 14)} ${s.role === 'adc' ? 'ADC / Bot' : ROLE_LABEL[s.role]}</span>
            <span class="chip chip-gold">${icon('spark', 11)} ${esc(getBuild(s.mine, s.enemy, s.role).label)}</span>
          </div>
        </div>
        ${controls(s)}${body}`;
    },
    actions: {
      'open-mine': ({ state }) => ({ picker: state.picker === 'mine' ? null : 'mine', query: '' }),
      'open-enemy': ({ state }) => ({ picker: state.picker === 'enemy' ? null : 'enemy', query: '' }),
      close: () => ({ picker: null, query: '' }),
      'pick-mine': ({ data, view }) => {
        void change(view, { mine: data.id!, role: CHAMP_BY_ID[data.id!].roles[0] });
      },
      'pick-enemy': ({ data, view }) => {
        void change(view, { enemy: data.id! });
      },
      'clear-enemy': ({ view }) => {
        void change(view, { enemy: null });
      },
      role: ({ data, view }) => {
        void change(view, { role: data.id as Role });
      },
      'select-situational': ({ data }) => ({
        selectedSituational: Number(data.id ?? 0),
      }),
    },
    inputs: {
      'q-mine': ({ value }) => ({ query: value }),
      'q-enemy': ({ value }) => ({ query: value }),
    },
  });

  async function change(v: View<State>, patch: Partial<State>) {
    v.set({ ...patch, picker: null, query: '', loading: true, selectedSituational: 0 });
    await sleep(420);
    v.set({ loading: false });
  }

  return view;
}
