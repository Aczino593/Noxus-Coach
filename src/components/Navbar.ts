import { createView } from '../lib/view';
import { icon, esc, sleep } from '../lib/ui';
import { profileImg } from '../lib/assets';
import { ACCOUNT } from '../data/mock';
import { getRiotApiKey, setRiotApiKey, getApiStatus } from '../data/api';
import { closeWindow, isMaximized, minimize, onMaximizeChange, toggleMaximize } from '../lib/tauri';

export type NavId = 'profile' | 'tools' | 'clash';

const NAV: { id: NavId; label: string; icon: Parameters<typeof icon>[0] }[] = [
  { id: 'profile', label: 'Perfil', icon: 'user' },
  { id: 'tools', label: 'Herramientas', icon: 'wrench' },
  { id: 'clash', label: 'Modo Clash', icon: 'trophy' },
];

type Sync = 'connected' | 'syncing' | 'offline';

interface State {
  active: NavId;
  sync: Sync;
  maximized: boolean;
}

const D = 'data-tauri-drag-region';

function logo(): string {
  return `
  <div class="mr-1 flex items-center gap-2.5 pr-2" ${D}>
    <div class="relative grid h-9 w-9 place-items-center" ${D}>
      <span class="absolute -inset-2 rounded-full bg-crimson/45 blur-xl" style="animation:var(--animate-pulse-ring)" ${D}></span>
      <img src="/logo.png"
           alt="Noxus Coach"
           width="32"
           height="32"
           class="relative h-8 w-8 object-contain drop-shadow-[0_0_10px_rgba(255,46,77,0.75)] transition-transform hover:scale-105"
           draggable="false"
           ${D} />
    </div>
    <div class="hidden leading-none xl:block" ${D}>
      <div class="text-[15px] font-extrabold tracking-[.14em]" ${D}>NOXUS</div>
      <div class="mt-0.5 text-[9px] font-semibold tracking-[.38em] text-crimson" ${D}>COACH</div>
    </div>
  </div>`;
}

function apiKeyBtn(): string {
  const status = getApiStatus();
  const color = status.status === 'live' ? 'bg-win' : status.status === 'expired_or_invalid' ? 'bg-loss' : 'bg-gold';
  return `
  <button class="btn btn-sm" data-action="api-key" data-tip="Configuración de Riot Development API Key" aria-label="Configurar Riot API Key">
    <span class="relative flex h-2 w-2">
      <span class="absolute inset-0 rounded-full ${color} opacity-60"></span>
      <span class="relative h-2 w-2 rounded-full ${color}"></span>
    </span>
    ${icon('key', 12)}
    <span class="hidden 2xl:inline">Riot API</span>
  </button>`;
}

function syncBtn(sync: Sync): string {
  const dot = { connected: 'bg-win', syncing: 'bg-gold', offline: 'bg-ink-mute' }[sync];
  const text = { connected: 'Cliente LoL', syncing: 'Sincronizando…', offline: 'Sin cliente' }[sync];
  return `
  <button class="btn btn-sm" data-action="sync" ${sync === 'syncing' ? 'disabled' : ''} data-tip="Sincronizar con el cliente local de LoL" aria-label="Sincronizar cliente local de LoL">
    <span class="relative flex h-2 w-2"><span class="absolute inset-0 rounded-full ${dot} ${sync === 'connected' ? 'opacity-60 animate-ping' : ''}"></span><span class="relative h-2 w-2 rounded-full ${dot}"></span></span>
    ${icon('refresh', 13, sync === 'syncing' ? 'animate-spin' : '')}
    <span class="hidden 2xl:inline">${text}</span>
  </button>`;
}

function accountWidget(sync: Sync): string {
  const a = ACCOUNT;
  const solo = a.solo ? `${a.solo.tier} ${a.solo.division} · ${a.solo.lp} LP` : 'Sin clasificar';
  return `
  <div class="flex items-center gap-2 pl-2" ${D}>
    ${apiKeyBtn()}
    ${syncBtn(sync)}
    <div class="flex items-center gap-2.5 rounded-xl border border-line bg-surface/70 py-1 pl-1 pr-3 transition-colors hover:border-line-strong" ${D}>
      <div class="relative" ${D}>
        <img src="${profileImg(a.profileIcon)}" width="36" height="36" alt="Avatar" class="h-9 w-9 rounded-full border border-crimson/60 object-cover" data-fb="${esc(a.name.slice(0, 2).toUpperCase())}" style="width:36px;height:36px;border-radius:99px"/>
        <span class="num absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-line-strong bg-canvas px-1.5 text-[9px] font-bold leading-[14px] text-gold" ${D}>${a.level}</span>
      </div>
      <div class="leading-tight" ${D}>
        <div class="text-[13px] font-bold" ${D}>${esc(a.name)}<span class="font-medium text-ink-mute">#${esc(a.tag)}</span></div>
        <div class="mt-0.5 flex items-center gap-1.5" ${D}>
          <span class="chip chip-gold !py-0 !text-[9.5px]" ${D}>SoloQ · ${solo}</span>
          <span class="chip !py-0 !text-[9.5px]" ${D}>Flex · ${a.flex ? 'Clasif.' : '—'}</span>
        </div>
      </div>
    </div>
  </div>`;
}

function controls(maximized: boolean): string {
  return `
  <div class="ml-3 flex h-full" role="group" aria-label="Controles de ventana">
    <button class="win-btn" data-action="win-min" aria-label="Minimizar">${icon('minus', 16)}</button>
    <button class="win-btn" data-action="win-max" aria-label="${maximized ? 'Restaurar' : 'Maximizar'}">${icon(maximized ? 'restore' : 'square', 15)}</button>
    <button class="win-btn win-btn-close" data-action="win-close" aria-label="Cerrar">${icon('x', 17)}</button>
  </div>`;
}

export function mountNavbar(root: HTMLElement, onNavigate: (id: NavId) => void) {
  const view = createView<State>({
    root,
    state: { active: 'profile', sync: 'connected', maximized: false },
    render: (s) => `
      ${logo()}
      <nav class="flex h-full items-stretch" aria-label="Navegación principal">
        ${NAV.map(
          (n) =>
            `<button class="nav-btn" id="nav-${n.id}" ${s.active === n.id ? 'aria-current="page"' : ''} data-action="nav" data-id="${n.id}">${icon(n.icon, 16)}<span>${n.label}</span></button>`,
        ).join('')}
      </nav>
      <div class="h-full flex-1" ${D}></div>
      ${accountWidget(s.sync)}
      ${controls(s.maximized)}
    `,
    actions: {
      nav: ({ data, state }) => {
        const id = data.id as NavId;
        if (id === state.active) return;
        onNavigate(id);
        return { active: id };
      },
      sync: async ({ view }) => {
        view.set({ sync: 'syncing' });
        await sleep(1600);
        view.set({ sync: 'connected' });
      },
      'api-key': ({ view }) => {
        const cur = getRiotApiKey();
        const next = window.prompt(
          'Configura tu Riot Games API Key de desarrollo (válida 24h):\nhttps://developer.riotgames.com',
          cur,
        );
        if (next !== null && next.trim() && next.trim() !== cur) {
          setRiotApiKey(next.trim());
          view.refresh();
        }
      },
      'win-min': () => void minimize(),
      'win-max': () => void toggleMaximize(),
      'win-close': () => void closeWindow(),
    },
  });

  void isMaximized().then((m) => view.set({ maximized: m }));
  void onMaximizeChange((m) => view.set({ maximized: m }));

  return { setActive: (id: NavId) => view.set({ active: id }) };
}
