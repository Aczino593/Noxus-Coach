import { createView } from '../lib/view';
import { subnav } from '../lib/ui';
import { mountBuildPlanner } from './BuildPlanner';
import { mountDraftSimulator } from './DraftSimulator';
import { mountVisionMap } from './VisionMap';
import { mountChampionPool } from './ChampionPool';
import { mountPatchAnalysis } from './PatchAnalysis';

export type ToolsTab = 'builds' | 'vision' | 'draft' | 'pool' | 'patch';

interface State {
  tab: ToolsTab;
}

const TABS: { id: ToolsTab; label: string }[] = [
  { id: 'builds', label: 'Preparador de Builds & Items' },
  { id: 'vision', label: 'Mapa de Visión Interactivo' },
  { id: 'draft', label: 'Herramienta de Draft Estándar' },
  { id: 'pool', label: 'Constructor de Champion Pool' },
  { id: 'patch', label: 'Análisis del parche 26.21' },
];

export function mountToolsView(root: HTMLElement) {
  const view = createView<State>({
    root,
    state: { tab: 'builds' },
    render: (s) => `
      ${subnav(TABS, s.tab, 'tab')}
      <div id="tools-builds-tab" class="${s.tab === 'builds' ? '' : 'hidden'}"></div>
      <div id="tools-vision-tab" class="${s.tab === 'vision' ? '' : 'hidden'}"></div>
      <div id="tools-draft-tab" class="${s.tab === 'draft' ? '' : 'hidden'}"></div>
      <div id="tools-pool-tab" class="${s.tab === 'pool' ? '' : 'hidden'}"></div>
      <div id="tools-patch-tab" class="${s.tab === 'patch' ? '' : 'hidden'}"></div>
    `,
    actions: {
      tab: ({ data }) => {
        const nextTab = data.id as ToolsTab;
        return { tab: nextTab };
      },
    },
    afterRender: (v) => {
      const buildsEl = root.querySelector<HTMLElement>('#tools-builds-tab');
      const visionEl = root.querySelector<HTMLElement>('#tools-vision-tab');
      const draftEl = root.querySelector<HTMLElement>('#tools-draft-tab');
      const poolEl = root.querySelector<HTMLElement>('#tools-pool-tab');
      const patchEl = root.querySelector<HTMLElement>('#tools-patch-tab');

      if (buildsEl) {
        mountBuildPlanner(buildsEl);
      }
      if (visionEl && v.state.tab === 'vision') {
        mountVisionMap(visionEl);
      }
      if (draftEl && v.state.tab === 'draft') {
        mountDraftSimulator(draftEl);
      }
      if (poolEl && v.state.tab === 'pool') {
        mountChampionPool(poolEl);
      }
      if (patchEl && v.state.tab === 'patch') {
        mountPatchAnalysis(patchEl);
      }
    },
  });

  return view;
}
