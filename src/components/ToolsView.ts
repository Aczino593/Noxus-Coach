import { createView } from '../lib/view';
import { subnav } from '../lib/ui';
import { mountBuildPlanner } from './BuildPlanner';
import { mountDraftSimulator } from './DraftSimulator';
import { mountVisionMap } from './VisionMap';

export type ToolsTab = 'builds' | 'vision' | 'draft' | 'pool';

interface State {
  tab: ToolsTab;
}

const TABS: { id: ToolsTab; label: string }[] = [
  { id: 'builds', label: 'Preparador de Builds & Items' },
  { id: 'vision', label: 'Mapa de Visión Interactivo' },
  { id: 'draft', label: 'Herramienta de Draft Estándar' },
  { id: 'pool', label: 'Constructor de Champion Pool' },
];

export function mountToolsView(root: HTMLElement) {
  let buildsMounted = false;
  let visionMounted = false;
  let draftMounted = false;

  const view = createView<State>({
    root,
    state: { tab: 'builds' },
    render: (s) => `
      ${subnav(TABS, s.tab, 'tab')}
      <div id="tools-builds-tab" class="${s.tab === 'builds' ? '' : 'hidden'}"></div>
      <div id="tools-vision-tab" class="${s.tab === 'vision' ? '' : 'hidden'}"></div>
      <div id="tools-draft-tab" class="${s.tab === 'draft' ? '' : 'hidden'}"></div>
      <div id="tools-pool-tab" class="${s.tab === 'pool' ? '' : 'hidden'}">
        <div class="card grid place-items-center gap-3 py-20 text-center text-ink-dim">
          <div class="text-[16px] font-bold text-ink">Constructor de Champion Pool</div>
          <p class="max-w-[460px] text-[12.5px]">Define tu grupo de 3-5 campeones por rol (Blind Pick, Counter Pick, Pocket Pick) para optimizar tus recomendaciones tanto en SoloQ como en Torneos.</p>
          <div class="flex gap-2">
            <button class="btn btn-primary" data-action="tab" data-id="draft">Probar en Simulador de Draft</button>
            <button class="btn" data-action="tab" data-id="builds">Ver Preparador de Builds</button>
            <button class="btn" data-action="tab" data-id="vision">Ver Mapa de Visión</button>
          </div>
        </div>
      </div>
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

      if (buildsEl && !buildsMounted) {
        buildsMounted = true;
        mountBuildPlanner(buildsEl);
      }
      if (visionEl && !visionMounted && v.state.tab === 'vision') {
        visionMounted = true;
        mountVisionMap(visionEl);
      }
      if (draftEl && !draftMounted && v.state.tab === 'draft') {
        draftMounted = true;
        mountDraftSimulator(draftEl);
      }
    },
  });

  return view;
}
