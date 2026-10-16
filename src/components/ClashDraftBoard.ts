import { createView } from '../lib/view';
import { icon, sleep, subnav } from '../lib/ui';
import { ARCH_BY_ID, CLASH_INFO, DEFAULT_TEAM, DEFAULT_UTILITY, SAMPLE_ENEMY } from '../data/clashMock';
import { type Archetype } from '../types';
import { autoResolve, bestArchetype, findConflicts } from '../lib/clashEngine';
import { renderComp } from './clash/CompEngine';
import { renderScouting } from './clash/Scouting';
import { renderBuilds } from './clash/TeamBuilds';
import { scoutDraft, type ClashState, type ClashTab } from './clash/state';
import { fetchClashTeam } from '../data/api';

const TABS: { id: ClashTab; label: string }[] = [
  { id: 'comp', label: 'Composición de equipo' },
  { id: 'scout', label: 'Scouting y bans' },
  { id: 'builds', label: 'Builds situacionales de equipo' },
];

const deadline = Date.now() + CLASH_INFO.champSelectIn * 1000;
const remaining = () => Math.max(0, Math.round((deadline - Date.now()) / 1000));
const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

function header(): string {
  return `
  <div class="relative mb-4 flex items-center gap-5 overflow-hidden rounded-2xl border border-gold/30 p-4" style="background:linear-gradient(100deg, rgb(224 169 109 / .14), rgb(255 46 77 / .08) 55%, var(--color-surface))">
    <div class="pointer-events-none absolute -left-8 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl"></div>
    <span class="relative grid h-14 w-14 flex-none place-items-center rounded-2xl border border-gold/50 bg-canvas/70 text-gold shadow-[0_0_30px_-8px_rgba(224,169,109,.7)]">${icon('trophy', 28)}</span>
    <div class="relative min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-[19px] font-extrabold">${CLASH_INFO.cup}</h2>
        <span class="chip chip-gold">${CLASH_INFO.tier}</span><span class="chip">${CLASH_INFO.day}</span><span class="chip chip-crimson">${CLASH_INFO.round}</span>
      </div>
      <p class="mt-1 text-[12.5px] text-ink-dim">Equipo <b class="text-ink">${CLASH_INFO.team}</b> · Coaching 5v5 para juego coordinado: composición, scouting y builds de equipo.</p>
    </div>
    <div class="relative text-right">
      <div class="eyebrow">Selección de campeones en</div>
      <div id="clash-countdown" class="num text-[28px] font-bold leading-none text-gold">${fmt(remaining())}</div>
    </div>
  </div>`;
}

export function mountClashDraftBoard(root: HTMLElement) {
  const initialUtility = DEFAULT_UTILITY.map((u) => [...u]);
  const view = createView<ClashState>({
    root,
    state: {
      tab: 'comp',
      arch: 'teamfight',
      team: [...DEFAULT_TEAM],
      picker: null,
      query: '',
      enemy: SAMPLE_ENEMY,
      scouting: false,
      bansOn: {},
      utility: initialUtility,
      buildsLoading: false,
    },
    render: (s) => `
      ${header()}
      ${subnav(TABS, s.tab, 'tab')}
      ${s.tab === 'comp' ? renderComp(s) : s.tab === 'scout' ? renderScouting(s) : renderBuilds(s)}`,
    actions: {
      tab: async ({ data, view }) => {
        const tab = data.id as ClashTab;
        if (tab === 'builds') {
          view.set({ tab, buildsLoading: true, picker: null });
          await sleep(420);
          view.set({ buildsLoading: false });
        } else view.set({ tab, picker: null });
      },
      arch: ({ data }) => ({ arch: data.id as Archetype }),
      'slot-open': ({ data, state }) => ({ picker: state.picker === Number(data.id) ? null : Number(data.id), query: '' }),
      'picker-close': () => ({ picker: null, query: '' }),
      'slot-pick': ({ data, state }) => {
        const team = [...state.team];
        team[state.picker!] = data.id!;
        const next = { ...state, team };
        return { team, picker: null, query: '', arch: state.arch === bestArchetype(state.team) ? bestArchetype(next.team) : state.arch };
      },
      'slot-clear': ({ data, state }) => {
        const team = [...state.team];
        team[Number(data.id)] = null;
        return { team };
      },
      'team-clear': () => ({ team: Array(5).fill(null) as ClashState['team'] }),

      'scout-load': async ({ view }) => {
        view.set({ scouting: true });
        const res = await fetchClashTeam(scoutDraft.inputs, scoutDraft.region);
        view.set({ enemy: res.players, scouting: false, bansOn: {} });
      },
      'scout-sample': async ({ view }) => {
        SAMPLE_ENEMY.forEach((p, i) => (scoutDraft.inputs[i] = { name: p.name, tag: p.tag }));
        view.set({ scouting: true });
        await sleep(600);
        view.set({ enemy: SAMPLE_ENEMY, scouting: false, bansOn: {} });
      },

      'auto-resolve': ({ state }) => ({ utility: autoResolve(state.utility) }),
      suggest: ({ data, state }) => {
        const p = Number(data.p);
        const utility = state.utility.map((u) => [...u]);
        const clashing = utility[p].findIndex((_, k) => findConflicts(utility).some((c) => c.players.includes(p)) && k === 0);
        utility[p][clashing >= 0 ? clashing : 1] = Number(data.id);
        return { utility };
      },
    },
    inputs: {
      'sc-name': ({ data, value }) => void (scoutDraft.inputs[Number(data.i)].name = value),
      'sc-tag': ({ data, value }) => void (scoutDraft.inputs[Number(data.i)].tag = value),
      cq: ({ value }) => ({ query: value }),
    },
    changes: {
      'sc-region': ({ value }) => void (scoutDraft.region = value),
      ban: ({ data, checked, state }) => ({ bansOn: { ...state.bansOn, [data.id!]: checked } }),
      util: ({ data, value, state }) => {
        const utility = state.utility.map((u) => [...u]);
        utility[Number(data.p)][Number(data.k)] = Number(value);
        return { utility };
      },
    },
  });

  // Cuenta regresiva: sólo toca el nodo de texto, sin re-render.
  const timer = window.setInterval(() => {
    if (root.hidden) return;
    const el = document.getElementById('clash-countdown');
    if (el) el.textContent = fmt(remaining());
  }, 1000);
  window.addEventListener('beforeunload', () => window.clearInterval(timer));

  void ARCH_BY_ID;
  return view;
}
