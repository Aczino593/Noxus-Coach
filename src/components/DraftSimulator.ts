import { createView, type View } from '../lib/view';
import { champIcon, esc, fmtNum, icon, roleFilter, roleIcon, sk, sleep } from '../lib/ui';
import { CHAMP_BY_ID } from '../data/champions';
import {
  advantage, evalPick, idx, laneMatchups, randomDraft, recommend, roleOf, SAMPLE_DRAFT, sideOf,
  teamStats, weights, type Side, type Slots,
} from '../lib/draftEngine';
import { ROLE_LABEL, type Role } from '../types';

interface State {
  slots: Slots;
  selected: number;
  side: Side;
  calcing: boolean;
  open: Record<string, boolean>;
  query: string;
  tuning: boolean;
  tick: number; // fuerza recálculo tras cambiar pesos
}

const SIDE_COLOR = { blue: 'var(--color-blue-side)', red: 'var(--color-red-side)' };
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f' ]/g, '');

const signed = (v: number | null, d = 1, suffix = '') =>
  v === null ? '<span class="text-ink-mute">–</span>' : `<span class="num font-bold ${v >= 0 ? 'text-win' : 'text-loss'}">${v >= 0 ? '+' : ''}${fmtNum(v, d)}${suffix}</span>`;
const rating = (v: number | null) => (v === null ? '<span class="text-ink-mute">–</span>' : `<span class="num font-bold text-gold">${fmtNum(v)}</span>`);

/* ─────────────── Fila de slots ─────────────── */
function slotBtn(s: State, i: number): string {
  const id = s.slots[i];
  const side = sideOf(i);
  const sel = s.selected === i;
  return `
  <div class="flex flex-col items-center gap-1.5">
    <div class="relative">
      <button class="draft-slot" data-side="${side}" aria-pressed="${sel}" data-action="slot" data-id="${i}" aria-label="${ROLE_LABEL[roleOf(i)]} ${side === 'blue' ? 'azul' : 'rojo'}${id ? `: ${CHAMP_BY_ID[id].name}` : ''}">
        ${id ? champIcon(id, 62, '!border-0 !rounded-[11px]') : `<span style="color:${SIDE_COLOR[side]}55">${icon('shield', 30)}</span>`}
      </button>
      ${id ? `<button class="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full border border-line-strong bg-canvas text-ink-dim hover:border-crimson hover:text-crimson" data-action="clear-slot" data-id="${i}" aria-label="Quitar campeón">${icon('x', 10)}</button>` : ''}
    </div>
    <span class="grid h-5 w-5 place-items-center rounded-md border text-[0] ${sel ? '' : 'opacity-70'}" style="color:${SIDE_COLOR[side]};border-color:${SIDE_COLOR[side]}44;background:${SIDE_COLOR[side]}10">${roleIcon(roleOf(i), 12)}</span>
  </div>`;
}

function topBar(s: State): string {
  const myRole = roleOf(s.selected);
  return `
  <div class="flex flex-wrap items-center gap-3">
    <div class="flex gap-1.5">${roleFilter(myRole, 'my-role')}</div>
    <div class="inline-flex overflow-hidden rounded-lg border border-line-strong" role="group" aria-label="Tu lado">
      ${(['blue', 'red'] as Side[]).map((sd) => `<button class="px-4 py-1.5 text-[12px] font-bold transition-colors" style="${s.side === sd ? `background:${SIDE_COLOR[sd]}22;color:${SIDE_COLOR[sd]};box-shadow:inset 0 0 0 1px ${SIDE_COLOR[sd]}` : 'color:var(--color-ink-dim)'}" data-action="side" data-id="${sd}" aria-pressed="${s.side === sd}">${sd === 'blue' ? 'Azul' : 'Rojo'}</button>`).join('')}
    </div>
    <div class="ml-auto flex gap-2">
      <button class="btn" data-action="random">${icon('shuffle', 14)} Aleatorizar el borrador</button>
      <button class="btn" data-action="import">${icon('download', 14)} Importar borrador</button>
    </div>
  </div>
  <div class="mt-5 flex items-start justify-center gap-6">
    <div class="flex gap-2.5" aria-label="Equipo azul">${[0, 1, 2, 3, 4].map((i) => slotBtn(s, i)).join('')}</div>
    <div class="mt-5 text-[10px] font-extrabold tracking-[.3em] text-ink-mute">VS</div>
    <div class="flex gap-2.5" aria-label="Equipo rojo">${[5, 6, 7, 8, 9].map((i) => slotBtn(s, i)).join('')}</div>
  </div>
  <div class="mt-4 flex flex-col items-center gap-2">
    <div class="flex gap-2">
      <button class="btn" data-action="clear">${icon('trash', 14)} Borrar borrador</button>
      <button class="btn btn-primary" data-action="recalc" ${s.calcing ? 'disabled' : ''}>${icon('spark', 14, s.calcing ? 'animate-spin' : '')} Obtener recomendaciones</button>
    </div>
    <button class="btn btn-ghost btn-sm" data-action="tuning" aria-expanded="${s.tuning}">${icon('sliders', 13)} Personalización del modelo</button>
    ${
      s.tuning
        ? `<div class="card-inset anim-fade-up grid w-[520px] grid-cols-3 gap-4 p-3.5">
            ${(['synergy', 'counter', 'meta'] as const)
              .map(
                (k) => `<label class="grid gap-1.5 text-[11.5px] text-ink-dim"><span class="flex justify-between"><span>${{ synergy: 'Peso de sinergia', counter: 'Peso de counters', meta: 'Peso de meta' }[k]}</span><b class="num text-gold">×${weights[k].toFixed(1)}</b></span>
                <input type="range" min="0" max="2" step="0.1" value="${weights[k]}" data-change="w-${k}" class="accent-[#ff2e4d]" aria-label="${k}"/></label>`,
              )
              .join('')}
          </div>`
        : ''
    }
  </div>`;
}

/* ─────────────── Panel izquierdo ─────────────── */
function leftPanel(s: State): string {
  const id = s.slots[s.selected];
  const ev = id ? evalPick(id, s.selected, s.slots) : null;
  const role = roleOf(s.selected);
  const mySide = sideOf(s.selected);
  const mine = teamStats(s.slots, mySide);
  const enemy = teamStats(s.slots, mySide === 'blue' ? 'red' : 'blue');
  const early = advantage(mine.early, enemy.early);
  const adPct = mine.ad === null ? null : Math.round(mine.ad * 100);

  const box = (title: string, tip: string, value: string, extra = '') => `
    <div class="rounded-xl border border-crimson/40 ${extra}" style="background:linear-gradient(180deg, rgb(255 46 77 / .22), rgb(255 46 77 / .06))">
      <div class="flex items-center justify-between px-3 pt-2.5 text-[12.5px] font-bold" >${title}<span class="text-ink-dim" data-tip="${tip}">${icon('info', 13)}</span></div>
      <div class="px-3 pb-2.5 pt-1 text-[22px]">${value}</div>
    </div>`;

  const kv = (label: string, tip: string, v: string) => `
    <div><div class="flex items-center gap-1 text-[11.5px] text-ink-dim">${label}<span data-tip="${tip}">${icon('info', 11)}</span></div><div class="mt-0.5 text-[15px]">${v}</div></div>`;

  const recs = s.calcing ? null : recommend(s.selected, s.slots, s.query ? 200 : 30).filter((r) => !s.query || norm(CHAMP_BY_ID[r.id].name).includes(norm(s.query)));

  return `
  <div class="grid gap-3">
    <div class="card flex items-center gap-3 p-3">
      ${id ? champIcon(id, 40) : `<span class="champ-ring grid h-10 w-10 place-items-center text-ink-mute">${icon('plus', 15)}</span>`}
      <div class="leading-tight"><div class="text-[14px] font-bold">${id ? esc(CHAMP_BY_ID[id].name) : 'Selecciona un slot'}</div>
        <div class="flex items-center gap-1.5 text-[11.5px] text-ink-dim"><span style="color:${SIDE_COLOR[mySide]}">${roleIcon(role, 12)}</span>${ROLE_LABEL[role]} · ${mySide === 'blue' ? 'Azul' : 'Rojo'}</div></div>
    </div>
    <div class="grid grid-cols-2 gap-2.5">
      ${box('Puntuación global', 'Resumen: sinergia + counters + meta', rating(ev?.global ?? null))}
      ${box('Fase de carriles', 'Fuerza del pick en su línea', rating(ev?.lane ?? null))}
    </div>
    <div class="card grid grid-cols-2 gap-x-4 gap-y-3 p-3.5">
      ${kv('Maestría', 'Nivel de maestría estimado', ev ? `<b>${ev.mastery}</b>` : '–')}
      ${kv('Porcentaje de victorias', 'Winrate del pick en tu Elo', ev ? `<span class="num font-bold">${fmtNum(ev.winrate)}%</span>` : '–')}
      ${kv('Sinergia promedio', 'Sinergia media con tus aliados', signed(ev?.synergy ?? null, 2))}
      ${kv('Counter promedio', 'Ventaja media contra el equipo rival', signed(ev?.counter ?? null, 2))}
    </div>
    <div class="card p-3.5">
      <div class="flex items-center justify-between text-[11.5px] text-ink-dim"><span class="flex items-center gap-1">Balance de daño (AD / AP)<span data-tip="Reparto de daño físico/mágico de tu equipo">${icon('info', 11)}</span></span>
        <span class="num font-bold text-ink">${adPct === null ? '–' : `AD ${adPct}% · AP ${100 - adPct}%`}</span></div>
      <div class="mt-2 flex h-2 overflow-hidden rounded-full bg-[#1b1e28]">
        ${adPct === null ? '' : `<span style="width:${adPct}%;background:#f59e0b"></span><span style="width:${100 - adPct}%;background:#8b5cf6"></span>`}
      </div>
      ${adPct !== null && (adPct > 75 || adPct < 25) ? `<p class="mt-2 flex items-center gap-1.5 text-[11px] text-gold">${icon('alert', 12)} Daño demasiado ${adPct > 75 ? 'físico' : 'mágico'}: el rival puede apilar ${adPct > 75 ? 'armadura' : 'RM'}.</p>` : ''}
      <div class="mt-3 flex items-center justify-between text-[11.5px] text-ink-dim"><span>Ventaja en early game</span>${signed(early, 1, '%')}</div>
    </div>

    <div class="card p-3.5">
      <div class="mb-2.5 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-[14px] font-bold text-crimson"><span class="grid h-6 w-6 place-items-center rounded-md border border-crimson/40 bg-crimson/10">${roleIcon(role, 13)}</span>Recomendaciones</h3>
        <div class="relative w-[150px]"><span class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-mute">${icon('search', 12)}</span>
          <input id="draft-q" class="input !h-7 !pl-7 !text-[11.5px]" data-input="query" value="${esc(s.query)}" placeholder="Buscar…" autocomplete="off"/></div>
      </div>
      <div class="grid max-h-[330px] grid-cols-5 gap-2 overflow-y-auto pr-1" data-keep-scroll="recs">
        ${
          recs === null
            ? Array.from({ length: 15 }, () => sk('h-[66px]')).join('')
            : recs.length
              ? recs
                  .map(
                    (r) => `<button class="champ-tile" data-action="pick" data-id="${r.id}" aria-label="${esc(CHAMP_BY_ID[r.id].name)}: ${fmtNum(r.score)}">
                      ${champIcon(r.id, 64, '!border-0 !rounded-none w-full')}
                      <span class="num absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent pt-3 text-center text-[12px] font-bold text-gold">${fmtNum(r.score)}</span>
                    </button>`,
                  )
                  .join('')
              : `<p class="col-span-5 py-6 text-center text-ink-mute">Sin resultados</p>`
        }
      </div>
    </div>
  </div>`;
}

/* ─────────────── Panel derecho ─────────────── */
function collapse(s: State, key: string, title: string, tip: string, headValue: string, body: string): string {
  const open = s.open[key];
  return `
  <div class="card overflow-hidden">
    <button class="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-bold hover:bg-white/[.02]" data-action="collapse" data-id="${key}" aria-expanded="${open}">
      <span class="text-ink-mute transition-transform ${open ? '' : '-rotate-90'}">${icon('chevron', 14)}</span>${title}
      <span class="text-ink-mute" data-tip="${tip}">${icon('info', 12)}</span>
      <span class="ml-auto">${headValue}</span>
    </button>
    ${open ? `<div class="anim-fade-up border-t border-line px-4 py-4">${body}</div>` : ''}
  </div>`;
}

const sectionHeader = (t: string) =>
  `<div class="rounded-lg border border-crimson/60 py-1.5 text-center text-[13px] font-bold text-crimson" style="background:linear-gradient(180deg, rgb(255 46 77 / .1), transparent)">${t}</div>`;

/** Pareja de círculos de selección: campeón activo (tenue) + el otro con anillo de color */
function pair(selId: string | null, otherId: string | null, color: string, role: Role | null, value: string): string {
  const ring = (id: string | null, col: string, dim = false) =>
    id
      ? `<span class="inline-block rounded-full p-[2px] ${dim ? 'opacity-60' : ''}" style="border:2px solid ${col}">${champIcon(id, 38, '!rounded-full !border-0')}</span>`
      : `<span class="grid h-[46px] w-[46px] place-items-center rounded-full border-2 border-dashed border-line-strong bg-canvas text-ink-mute">${icon('shield', 18)}</span>`;
  return `<div class="flex flex-col items-center gap-1.5">
    <div class="relative flex items-center"><span class="-mr-3 z-0">${ring(selId, '#3a4053', true)}</span><span class="relative z-10">${ring(otherId, color)}</span>
      ${role ? `<span class="absolute -bottom-1 -right-1 z-20 grid h-[18px] w-[18px] place-items-center rounded-md border border-line-strong bg-canvas" style="color:${color}">${roleIcon(role, 10)}</span>` : ''}</div>
    <div class="text-[12px]">${value}</div></div>`;
}

function rightPanel(s: State): string {
  const sel = s.selected;
  const selId = s.slots[sel];
  const ev = selId ? evalPick(selId, sel, s.slots) : null;
  const mySide = sideOf(sel);
  const lm = laneMatchups(s.slots);
  const mine = teamStats(s.slots, mySide);
  const enemy = teamStats(s.slots, mySide === 'blue' ? 'red' : 'blue');
  const myColor = SIDE_COLOR[mySide];
  const enColor = SIDE_COLOR[mySide === 'blue' ? 'red' : 'blue'];

  const allySlots = [0, 1, 2, 3, 4].map((i) => (mySide === 'blue' ? i : i + 5));
  const enemySlots = [0, 1, 2, 3, 4].map((i) => (mySide === 'blue' ? i + 5 : i));
  const synMap = new Map(ev?.synergies.map((x) => [x.slot, x.value]));
  const cntMap = new Map(ev?.counters.map((x) => [x.slot, x.value]));

  const stat = (label: string, m: number | null, e: number | null) => {
    const adv = advantage(m, e);
    return `<div class="mb-3 last:mb-0"><div class="mb-1 flex justify-between text-[11.5px] text-ink-dim"><span>${label}</span>${signed(adv, 1, '%')}</div>
      <div class="flex h-2 overflow-hidden rounded-full bg-[#1b1e28]"><span style="width:${m === null ? 50 : (m / (m + (e ?? m))) * 100}%;background:${myColor};transition:width .5s"></span><span class="flex-1" style="background:${enColor}"></span></div></div>`;
  };

  const laneAvg = lm.filter((l) => l.delta !== null);
  const laneStrength = laneAvg.length ? laneAvg.reduce((a, l) => a + l.delta!, 0) / laneAvg.length : null;

  return `
  <div class="grid gap-3">
    ${sectionHeader('Fase de líneas')}
    ${collapse(s, 'lanestrength', 'Fuerza de los campeones en fase de líneas', 'Promedio de ventaja en tus 3 carriles', signed(laneStrength, 1, '%'),
      `<div class="grid grid-cols-5 gap-2">${[0, 1, 2, 3, 4].map((i) => {
        const id = s.slots[allySlots[i]];
        const ch = id ? CHAMP_BY_ID[id] : null;
        return `<div class="text-center"><div class="mx-auto w-fit">${id ? champIcon(id, 36) : `<span class="champ-ring grid h-9 w-9 place-items-center text-ink-mute">${icon('shield', 14)}</span>`}</div>
          <div class="mt-1 text-[10.5px] text-ink-dim">${ROLE_LABEL[roleOf(allySlots[i])]}</div>
          <div class="num mt-0.5 text-[12px] font-bold text-gold">${ch ? `${ch.early}/5` : '–'}</div></div>`;
      }).join('')}</div><p class="mt-2.5 text-[11px] text-ink-mute">Fuerza temprana (1-5) de cada pick de tu equipo.</p>`)}
    ${collapse(s, 'lanes', 'Enfrentamientos en fase de líneas', 'Ventaja estimada de tu campeón sobre su rival directo', '',
      `<div class="grid grid-cols-3 gap-3">${lm
        .map((l) => {
          const a = mySide === 'blue' ? l.a : l.b;
          const b = mySide === 'blue' ? l.b : l.a;
          const d = l.delta === null ? null : mySide === 'blue' ? l.delta : -l.delta;
          return `<div class="flex flex-col items-center gap-1.5">
            <div class="flex items-center"><span class="-mr-2">${a ? `<span class="inline-block rounded-full p-[2px]" style="border:2px solid ${myColor}">${champIcon(a, 38, '!rounded-full !border-0')}</span>` : `<span class="grid h-[46px] w-[46px] place-items-center rounded-full border-2 border-dashed border-line-strong text-ink-mute">${icon('shield', 16)}</span>`}</span>
            ${b ? `<span class="inline-block rounded-full p-[2px]" style="border:2px solid ${enColor}">${champIcon(b, 38, '!rounded-full !border-0')}</span>` : `<span class="grid h-[46px] w-[46px] place-items-center rounded-full border-2 border-dashed border-line-strong text-ink-mute">${icon('shield', 16)}</span>`}</div>
            <div class="flex items-center gap-1 text-[11px] text-ink-dim">${roleIcon(l.role, 11)}${ROLE_LABEL[l.role]}</div>
            <div class="text-[12.5px]">${signed(d, 1, '%')}</div>
            ${l.blind ? '<div class="text-[9.5px] font-semibold text-crimson">* a ciegas</div>' : ''}</div>`;
        })
        .join('')}</div>
        <p class="mt-3 text-[11px] text-ink-mute"><span class="text-crimson">*</span> Este enfrentamiento es a ciegas, por lo que se basa en estadísticas promedio.</p>`)}

    ${sectionHeader('Encuentros')}
    ${collapse(s, 'syn', 'Sinergia promedio', 'Sinergias de combo del pick activo con cada aliado', rating(ev?.synergy ?? null).replace('text-gold', 'text-ink'),
      `<div class="grid grid-cols-5 gap-2">${allySlots.map((j) => {
        const v = synMap.get(j);
        return pair(selId, j === sel ? null : s.slots[j], '#4c8dff', roleOf(j), v === undefined ? '<span class="text-ink-mute">–</span>' : signed(v, 2));
      }).join('')}</div>`)}
    ${collapse(s, 'cnt', 'Counter promedio', 'Ventaja del pick activo contra cada rival', signed(ev?.counter ?? null, 2),
      `<div class="grid grid-cols-5 gap-2">${enemySlots.map((j) => {
        const v = cntMap.get(j);
        return pair(selId, s.slots[j], '#ff4d63', roleOf(j), v === undefined ? '<span class="text-ink-mute">–</span>' : signed(v, 2));
      }).join('')}</div>`)}

    ${sectionHeader('Estadísticas del equipo')}
    ${collapse(s, 'early', 'Ventaja en el early game', 'Comparación de poder en minutos 0-15', signed(advantage(mine.early, enemy.early), 1, '%'), stat('Poder temprano', mine.early, enemy.early))}
    ${collapse(s, 'mid', 'Ventaja en el mid game', 'Comparación de poder en minutos 15-25', signed(advantage(mine.mid, enemy.mid), 1, '%'), stat('Poder medio', mine.mid, enemy.mid))}
    ${collapse(s, 'late', 'Ventaja en el late game', 'Comparación de escalado en minutos 30+', signed(advantage(mine.late, enemy.late), 1, '%'), stat('Escalado tardío', mine.late, enemy.late))}
  </div>`;
}

export function mountDraftSimulator(root: HTMLElement) {
  const nextEmpty = (slots: Slots, from: number): number => {
    const base = from < 5 ? 0 : 5;
    for (let k = 1; k <= 5; k++) {
      const j = base + ((from - base + k) % 5);
      if (!slots[j]) return j;
    }
    return from;
  };

  const view = createView<State>({
    root,
    state: {
      slots: [...SAMPLE_DRAFT], selected: 4, side: 'blue', calcing: false, tuning: false, query: '', tick: 0,
      open: { lanestrength: false, lanes: true, syn: true, cnt: true, early: false, mid: false, late: false },
    },
    render: (s) => `
      <div class="mb-1 text-center"><h2 class="text-[18px] font-extrabold">Simulador de Draft</h2>
      <p class="section-sub">Selecciona un slot y elige campeones: puntuación, sinergias y counters se recalculan al instante.</p></div>
      <div class="mt-3">${topBar(s)}</div>
      <div class="mx-auto mt-6 grid max-w-[1180px] items-start gap-4" style="grid-template-columns:minmax(360px,0.85fr) minmax(0,1.15fr)">
        ${leftPanel(s)}${rightPanel(s)}
      </div>`,
    actions: {
      slot: ({ data }) => ({ selected: Number(data.id), query: '' }),
      'clear-slot': ({ data, state, event }) => {
        event.stopPropagation();
        const slots = [...state.slots];
        slots[Number(data.id)] = null;
        return { slots, selected: Number(data.id) };
      },
      'my-role': ({ data, state }) => ({ selected: idx(state.side, data.id as Role), query: '' }),
      side: ({ data, state }) => {
        const side = data.id as Side;
        return { side, selected: idx(side, roleOf(state.selected)) };
      },
      pick: ({ data, state, view }) => {
        const slots = [...state.slots];
        slots[state.selected] = data.id!;
        void recalcFlash(view, 320);
        return { slots, selected: nextEmpty(slots, state.selected), query: '', calcing: true };
      },
      clear: () => ({ slots: Array(10).fill(null) as Slots, query: '' }),
      random: ({ view }) => {
        void recalcFlash(view, 450);
        return { slots: randomDraft(), calcing: true };
      },
      import: ({ view }) => {
        void recalcFlash(view, 700);
        return { slots: [...SAMPLE_DRAFT], selected: 4, calcing: true };
      },
      recalc: ({ view }) => {
        void recalcFlash(view, 650);
      },
      collapse: ({ data, state }) => ({ open: { ...state.open, [data.id!]: !state.open[data.id!] } }),
      tuning: ({ state }) => ({ tuning: !state.tuning }),
    },
    inputs: { query: ({ value }) => ({ query: value }) },
    changes: {
      'w-synergy': ({ value }) => retune('synergy', value),
      'w-counter': ({ value }) => retune('counter', value),
      'w-meta': ({ value }) => retune('meta', value),
    },
  });

  function retune(k: keyof typeof weights, v: string): Partial<State> {
    weights[k] = Number(v);
    return { tick: view.state.tick + 1 };
  }

  async function recalcFlash(v: View<State>, ms: number) {
    v.set({ calcing: true });
    await sleep(ms);
    v.set({ calcing: false });
  }

  return view;
}
