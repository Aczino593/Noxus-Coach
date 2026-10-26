import { createView } from '../lib/view';
import { subnav } from '../lib/ui';
import { mountMatchHistory } from './MatchHistory';
import { mountAccountStats } from './AccountStats';
import { mountChampionStats } from './ChampionStats';

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
  const view = createView<State>({
    root,
    state: { tab: 'history' },
    render: (s) => `
      ${subnav(TABS, s.tab, 'tab')}
      <div id="profile-history-tab" class="${s.tab === 'history' ? '' : 'hidden'}"></div>
      <div id="profile-stats-tab" class="${s.tab === 'stats' ? '' : 'hidden'}"></div>
      <div id="profile-champs-tab" class="${s.tab === 'champs' ? '' : 'hidden'}"></div>
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
      const champsEl = root.querySelector<HTMLElement>('#profile-champs-tab');

      if (histEl) {
        mountMatchHistory(histEl);
      }
      if (statsEl && v.state.tab === 'stats') {
        mountAccountStats(statsEl);
      }
      if (champsEl && v.state.tab === 'champs') {
        mountChampionStats(champsEl);
      }
    },
  });

  return view;
}
