import { createView } from '../lib/view';
import { subnav } from '../lib/ui';
import { mountMatchHistory } from './MatchHistory';
import { mountAccountStats } from './AccountStats';

export type ProfileTab = 'history' | 'stats' | 'champs';

interface State {
  tab: ProfileTab;
}

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'history', label: 'Historia de la partida' },
  { id: 'stats', label: 'Estadísticas de la cuenta' },
  { id: 'champs', label: 'Estadísticas del campeón' },
];

export function mountProfileView(root: HTMLElement) {
  let historyMounted = false;
  let statsMounted = false;

  const view = createView<State>({
    root,
    state: { tab: 'history' },
    render: (s) => `
      ${subnav(TABS, s.tab, 'tab')}
      <div id="profile-history-tab" class="${s.tab === 'history' ? '' : 'hidden'}"></div>
      <div id="profile-stats-tab" class="${s.tab === 'stats' ? '' : 'hidden'}"></div>
      <div id="profile-champs-tab" class="${s.tab === 'champs' ? '' : 'hidden'}">
        <div class="card grid place-items-center gap-2 py-20 text-center text-ink-dim">
          <div class="text-[16px] font-bold text-ink">Estadísticas del Campeón</div>
          <p class="max-w-[400px] text-[12.5px]">Selecciona o filtra un campeón en el historial para ver métricas acumuladas de daño, KDA, winrate por línea y runas más efectivas.</p>
          <button class="btn btn-primary mt-2" data-action="tab" data-id="history">Ir a Historia de la partida</button>
        </div>
      </div>
    `,
    actions: {
      tab: ({ data }) => {
        const nextTab = data.id as ProfileTab;
        return { tab: nextTab };
      },
    },
    afterRender: (v) => {
      const histEl = root.querySelector<HTMLElement>('#profile-history-tab');
      const statsEl = root.querySelector<HTMLElement>('#profile-stats-tab');

      if (histEl && !historyMounted) {
        historyMounted = true;
        mountMatchHistory(histEl);
      }
      if (statsEl && !statsMounted && v.state.tab === 'stats') {
        statsMounted = true;
        mountAccountStats(statsEl);
      }
    },
  });

  return view;
}
