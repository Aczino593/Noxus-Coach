import { createView } from '../lib/view';
import { esc, roleImg } from '../lib/ui';
import { champImg, itemImg } from '../lib/assets';
import { item as itemData } from '../data/items';
import { itemCost } from '../data/itemGuide';
import { ROLES, type Role } from '../types';
import { getChampionBuildPresets, type BuildPreset } from '../lib/buildEngine';

/* ─────────────────────────────────────────────────────────────
 * TIPOS Y ESTADO DEL MINI-HUD OVERLAY IN-GAME (ESTILO ITERO / MOBALYTICS)
 * ───────────────────────────────────────────────────────────── */
export type OverlayCorner = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';

export interface LivePlayer {
  champId: string;
  name: string;
  role: Role;
  isMe?: boolean;
  ultCooldown: number; // segundos restantes (0 = lista)
  ultBaseCooldown: number;
}

export interface JungleCamp {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  respawnTime: number;
  remaining: number;
}

export interface MatchScenario {
  id: string;
  title: string;
  myRole: Role;
  myChamp: string;
  allies: LivePlayer[];
  enemies: LivePlayer[];
}

const DEMO_SCENARIOS: MatchScenario[] = [
  {
    id: 'mid-ahri-sylas',
    title: 'Partida 1 · Ahri (Mid) vs Sylas',
    myRole: 'mid',
    myChamp: 'Ahri',
    allies: [
      { champId: 'Ornn', name: 'ForgedHammer', role: 'top', ultCooldown: 0, ultBaseCooldown: 90 },
      { champId: 'Viego', name: 'RuinedKing', role: 'jungle', ultCooldown: 42, ultBaseCooldown: 70 },
      { champId: 'Ahri', name: 'NoxusCoach', role: 'mid', isMe: true, ultCooldown: 0, ultBaseCooldown: 80 },
      { champId: 'Jinx', name: 'LooseCannon', role: 'adc', ultCooldown: 0, ultBaseCooldown: 70 },
      { champId: 'Lulu', name: 'PurplePix', role: 'support', ultCooldown: 58, ultBaseCooldown: 80 },
    ],
    enemies: [
      { champId: 'Aatrox', name: 'DarkinBlade', role: 'top', ultCooldown: 0, ultBaseCooldown: 80 },
      { champId: 'LeeSin', name: 'BlindMonk', role: 'jungle', ultCooldown: 0, ultBaseCooldown: 60 },
      { champId: 'Sylas', name: 'ChainBreaker', role: 'mid', ultCooldown: 0, ultBaseCooldown: 60 },
      { champId: 'Draven', name: 'Executioner', role: 'adc', ultCooldown: 0, ultBaseCooldown: 75 },
      { champId: 'Thresh', name: 'ChainWarden', role: 'support', ultCooldown: 0, ultBaseCooldown: 80 },
    ],
  },
  {
    id: 'bot-jinx-draven',
    title: 'Partida 2 · Jinx (ADC) vs Draven',
    myRole: 'adc',
    myChamp: 'Jinx',
    allies: [
      { champId: 'Malphite', name: 'RockSolid', role: 'top', ultCooldown: 74, ultBaseCooldown: 85 },
      { champId: 'JarvanIV', name: 'DemaciaKing', role: 'jungle', ultCooldown: 0, ultBaseCooldown: 75 },
      { champId: 'Orianna', name: 'Clockwork', role: 'mid', ultCooldown: 0, ultBaseCooldown: 80 },
      { champId: 'Jinx', name: 'NoxusCoach', role: 'adc', isMe: true, ultCooldown: 0, ultBaseCooldown: 70 },
      { champId: 'Thresh', name: 'HookMaster', role: 'support', ultCooldown: 31, ultBaseCooldown: 80 },
    ],
    enemies: [
      { champId: 'Jax', name: 'Grandmaster', role: 'top', ultCooldown: 0, ultBaseCooldown: 60 },
      { champId: 'Sejuani', name: 'BoarRider', role: 'jungle', ultCooldown: 0, ultBaseCooldown: 80 },
      { champId: 'Zed', name: 'ShadowNinja', role: 'mid', ultCooldown: 0, ultBaseCooldown: 65 },
      { champId: 'Draven', name: 'BleedAxes', role: 'adc', ultCooldown: 0, ultBaseCooldown: 75 },
      { champId: 'Leona', name: 'SunShield', role: 'support', ultCooldown: 0, ultBaseCooldown: 70 },
    ],
  },
  {
    id: 'top-aatrox-darius',
    title: 'Partida 3 · Aatrox (Top) vs Darius',
    myRole: 'top',
    myChamp: 'Aatrox',
    allies: [
      { champId: 'Aatrox', name: 'NoxusCoach', role: 'top', isMe: true, ultCooldown: 0, ultBaseCooldown: 80 },
      { champId: 'LeeSin', name: 'KickMaster', role: 'jungle', ultCooldown: 0, ultBaseCooldown: 65 },
      { champId: 'Syndra', name: 'SphereForce', role: 'mid', ultCooldown: 38, ultBaseCooldown: 80 },
      { champId: 'Caitlyn', name: 'Sheriff', role: 'adc', ultCooldown: 0, ultBaseCooldown: 70 },
      { champId: 'Nautilus', name: 'AnchorTitan', role: 'support', ultCooldown: 52, ultBaseCooldown: 80 },
    ],
    enemies: [
      { champId: 'Darius', name: 'NoxusMight', role: 'top', ultCooldown: 0, ultBaseCooldown: 80 },
      { champId: 'Viego', name: 'MistHunter', role: 'jungle', ultCooldown: 0, ultBaseCooldown: 70 },
      { champId: 'Viktor', name: 'Evolution', role: 'mid', ultCooldown: 0, ultBaseCooldown: 80 },
      { champId: 'Jinx', name: 'RocketLauncher', role: 'adc', ultCooldown: 0, ultBaseCooldown: 70 },
      { champId: 'Lux', name: 'LightMage', role: 'support', ultCooldown: 0, ultBaseCooldown: 45 },
    ],
  },
];

interface State {
  open: boolean;
  collapsed: boolean;
  corner: OverlayCorner;
  scenarioId: string;
  role: Role;
  presetIdx: number;
  playerLevel: number;
  itemPathIndex: number;
  gameTimeSec: number;
  jungleCamps: JungleCamp[];
  allies: LivePlayer[];
  enemies: LivePlayer[];
}

const CORNER_CLASSES: Record<OverlayCorner, string> = {
  'top-right': 'top-14 right-4',
  'bottom-right': 'bottom-4 right-4',
  'top-left': 'top-14 left-4',
  'bottom-left': 'bottom-4 left-4',
};

export function mountLiveOverlayView(root: HTMLElement, onOpenChange?: (open: boolean) => void) {
  const defaultScenario = DEMO_SCENARIOS[0];

  const defaultJungleCamps: JungleCamp[] = [
    { id: 'dragon', name: 'Dragón Elemental', shortName: 'Dragón', icon: 'flame', respawnTime: 300, remaining: 118 },
    { id: 'grubs', name: 'Larvas / Heraldo', shortName: 'Heraldo', icon: 'shield', respawnTime: 360, remaining: 195 },
    { id: 'baron', name: 'Barón Nashor', shortName: 'Barón', icon: 'spark', respawnTime: 360, remaining: 0 },
    { id: 'blue', name: 'Buff Azul', shortName: 'Azul', icon: 'zap', respawnTime: 300, remaining: 0 },
    { id: 'red', name: 'Buff Rojo', shortName: 'Rojo', icon: 'target', respawnTime: 300, remaining: 74 },
  ];

  const view = createView<State>({
    root,
    state: {
      open: false,
      collapsed: false,
      corner: 'top-right',
      scenarioId: defaultScenario.id,
      role: defaultScenario.myRole,
      presetIdx: 0,
      playerLevel: 6,
      itemPathIndex: 2,
      gameTimeSec: 860,
      jungleCamps: defaultJungleCamps,
      allies: JSON.parse(JSON.stringify(defaultScenario.allies)),
      enemies: JSON.parse(JSON.stringify(defaultScenario.enemies)),
    },
    render: (s) => {
      if (!s.open) return '';

      const myPlayer = s.allies.find((p) => p.role === s.role) || s.allies.find((p) => p.isMe) || s.allies[2];
      const rivalPlayer = s.enemies.find((p) => p.role === s.role) || s.enemies[2];
      const presets = getChampionBuildPresets(myPlayer.champId, rivalPlayer.champId, s.role);
      const activePreset = presets[s.presetIdx] || presets[0];
      const posClass = CORNER_CLASSES[s.corner];

      if (s.collapsed) {
        const currentSkill = activePreset.abilityOrder.levels[s.playerLevel - 1] || 'Q';
        return `
        <aside class="fixed ${posClass} z-50 flex items-center gap-2.5 rounded-full border border-crimson/70 bg-canvas/90 px-3.5 py-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.85)]">
          <span class="relative flex h-2.5 w-2.5">
            <span class="absolute inset-0 rounded-full bg-win opacity-75 animate-ping"></span>
            <span class="relative h-2.5 w-2.5 rounded-full bg-win"></span>
          </span>
          <img src="${champImg(myPlayer.champId)}" class="h-6 w-6 rounded-full border border-gold object-cover" alt="" />
          <span class="text-[11.5px] font-extrabold text-ink">Nv.${s.playerLevel} <b class="text-gold">+${currentSkill}</b></span>
          <span class="num font-mono text-[11px] text-ink-dim">${formatTime(s.gameTimeSec)}</span>
          <button class="btn btn-sm !h-6 !px-2 !text-[10px]" data-action="toggle-collapse" title="Expandir Mini-HUD">Abrir HUD</button>
          <button class="text-ink-mute hover:text-ink text-[12px] px-1" data-action="close-overlay" title="Cerrar Overlay (Alt+O)">✕</button>
        </aside>`;
      }

      return `
      <aside class="fixed ${posClass} z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-line-strong bg-[#0b0c10]/92 backdrop-blur-xl shadow-[0_12px_45px_rgba(0,0,0,0.9)] text-ink overflow-hidden select-none">
        <!-- Barra Superior del Mini-HUD Overlay -->
        <div class="flex items-center justify-between gap-2 border-b border-line bg-surface/90 px-3 py-2">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
              <span class="absolute inset-0 rounded-full bg-win opacity-75 animate-ping"></span>
              <span class="relative h-2.5 w-2.5 rounded-full bg-win"></span>
            </span>
            <span class="text-[11px] font-black tracking-wider text-ink">NOXUS OVERLAY</span>
            <span class="chip chip-gold !py-0 !px-1.5 !text-[9.5px] num font-mono">${formatTime(s.gameTimeSec)}</span>
          </div>

          <!-- Controles de Esquina y Ventana -->
          <div class="flex items-center gap-1">
            <div class="flex items-center rounded-md border border-line bg-canvas/70 p-0.5 mr-1" title="Anclar a otra esquina de la pantalla">
              <button class="px-1 py-0.5 text-[9px] rounded ${s.corner === 'top-left' ? 'bg-crimson text-white font-bold' : 'text-ink-mute hover:text-ink'}" data-action="set-corner" data-id="top-left">↖</button>
              <button class="px-1 py-0.5 text-[9px] rounded ${s.corner === 'top-right' ? 'bg-crimson text-white font-bold' : 'text-ink-mute hover:text-ink'}" data-action="set-corner" data-id="top-right">↗</button>
              <button class="px-1 py-0.5 text-[9px] rounded ${s.corner === 'bottom-left' ? 'bg-crimson text-white font-bold' : 'text-ink-mute hover:text-ink'}" data-action="set-corner" data-id="bottom-left">↙</button>
              <button class="px-1 py-0.5 text-[9px] rounded ${s.corner === 'bottom-right' ? 'bg-crimson text-white font-bold' : 'text-ink-mute hover:text-ink'}" data-action="set-corner" data-id="bottom-right">↘</button>
            </div>
            <button class="flex h-5 w-5 items-center justify-center rounded text-ink-mute hover:bg-surface-2 hover:text-ink text-[11px]" data-action="toggle-collapse" title="Minimizar a píldora compacta">—</button>
            <button class="flex h-5 w-5 items-center justify-center rounded text-ink-mute hover:bg-crimson/20 hover:text-crimson text-[11px]" data-action="close-overlay" title="Ocultar Overlay (Alt+O)">✕</button>
          </div>
        </div>

        <div class="p-3 space-y-2.5 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <!-- Selector Compacto de Partida / Rol y Detección de Matchup -->
          <div class="rounded-xl border border-line bg-surface/60 p-2 space-y-2">
            <div class="flex items-center justify-between gap-1.5">
              <select class="input !h-6 !py-0 !px-2 !text-[10.5px] bg-canvas border-line font-semibold flex-1" data-change="scenario" aria-label="Seleccionar partida en vivo">
                ${DEMO_SCENARIOS.map((sc) => `<option value="${sc.id}" ${sc.id === s.scenarioId ? 'selected' : ''}>${esc(sc.title)}</option>`).join('')}
              </select>
              <div class="flex items-center gap-0.5">
                ${ROLES.map(
                  (r) => `
                  <button class="p-1 rounded border transition-all ${
                    s.role === r ? 'border-crimson bg-crimson/20' : 'border-transparent opacity-60 hover:opacity-100'
                  }" data-action="role" data-id="${r}" title="Línea: ${r.toUpperCase()}">
                    <img src="${roleImg(r)}" class="w-3.5 h-3.5" alt="${r}" />
                  </button>`,
                ).join('')}
              </div>
            </div>

            <!-- Composición 5v5 Detectada + Pick Recomendado IA -->
            ${renderCompactDraftWidget(s, myPlayer, rivalPlayer)}
          </div>

          <!-- WIDGET 1: CAMINO DE OBJETOS CHICO (SOLO ICONOS) -->
          ${renderCompactItemPathWidget(s, activePreset, presets)}

          <!-- WIDGET 2: GUÍA DE QUÉ HABILIDAD SUBIR PRIMERO -->
          ${renderCompactSkillWidget(s, activePreset)}

          <!-- WIDGET 3: CONTADOR DE LA JUNGLA -->
          ${renderCompactJungleWidget(s)}

          <!-- WIDGET 4: CONTADOR DE DEFINITIVAS ALIADAS -->
          ${renderCompactAlliesUltWidget(s)}
        </div>
      </aside>`;
    },
    actions: {
      'set-corner': ({ data }) => ({ corner: data.id as OverlayCorner }),
      'toggle-collapse': ({ state }) => ({ collapsed: !state.collapsed }),
      'close-overlay': () => {
        onOpenChange?.(false);
        return { open: false };
      },
      role: ({ data }) => ({ role: data.id as Role, presetIdx: 0 }),
      preset: ({ data }) => ({ presetIdx: Number(data.idx) || 0 }),
      'level-up': ({ state }) => ({ playerLevel: Math.min(18, state.playerLevel + 1) }),
      'level-down': ({ state }) => ({ playerLevel: Math.max(1, state.playerLevel - 1) }),
      'next-item': ({ state }) => ({ itemPathIndex: (state.itemPathIndex + 1) % 7 }),
      'select-item-step': ({ data }) => ({ itemPathIndex: Number(data.idx) || 0 }),
      'reset-camp': ({ data, state }) => {
        const campId = data.id as string;
        return {
          jungleCamps: state.jungleCamps.map((c) => (c.id === campId ? { ...c, remaining: c.respawnTime } : c)),
        };
      },
      'trigger-ult': ({ data, state }) => {
        const champ = data.id as string;
        return {
          allies: state.allies.map((a) =>
            a.champId === champ ? { ...a, ultCooldown: a.ultCooldown > 0 ? 0 : a.ultBaseCooldown } : a,
          ),
        };
      },
    },
    changes: {
      scenario: ({ value, view: v }) => {
        const sc = DEMO_SCENARIOS.find((d) => d.id === value) || defaultScenario;
        v.set({
          scenarioId: sc.id,
          role: sc.myRole,
          presetIdx: 0,
          allies: JSON.parse(JSON.stringify(sc.allies)),
          enemies: JSON.parse(JSON.stringify(sc.enemies)),
        });
      },
    },
  });

  // Ticker en tiempo real para los temporizadores de jungla y definitivas aliadas
  window.setInterval(() => {
    const s = view.state;
    if (!s.open) return;

    const nextGameTime = s.gameTimeSec + 1;
    let changed = false;

    const nextCamps = s.jungleCamps.map((camp) => {
      if (camp.remaining > 0) {
        changed = true;
        return { ...camp, remaining: camp.remaining - 1 };
      }
      return camp;
    });

    const nextAllies = s.allies.map((ally) => {
      if (ally.ultCooldown > 0) {
        changed = true;
        return { ...ally, ultCooldown: ally.ultCooldown - 1 };
      }
      return ally;
    });

    if (changed || nextGameTime % 5 === 0) {
      view.set({
        gameTimeSec: nextGameTime,
        jungleCamps: nextCamps,
        allies: nextAllies,
      });
    }
  }, 1000);

  return {
    toggle: () => {
      const next = !view.state.open;
      view.set({ open: next, collapsed: false });
      onOpenChange?.(next);
      return next;
    },
    setOpen: (open: boolean) => {
      view.set({ open });
      onOpenChange?.(open);
    },
    isOpen: () => view.state.open,
  };
}

/* ─────────────────────────────────────────────────────────────
 * WIDGETS DEL MINI-HUD OVERLAY IN-GAME
 * ───────────────────────────────────────────────────────────── */

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Detección compacta 5v5 + Recomendación IA para la línea */
function renderCompactDraftWidget(s: State, myPlayer: LivePlayer, rivalPlayer: LivePlayer): string {
  const rec = getRecommendationsByRoleAndRival(s.role, rivalPlayer.champId)[0];
  return `
  <div class="flex items-center justify-between gap-2 pt-1 border-t border-line/60">
    <!-- Aliados vs Enemigos mini avatares -->
    <div class="flex items-center gap-1">
      <div class="flex -space-x-1.5">
        ${s.allies
          .map(
            (p) =>
              `<img src="${champImg(p.champId)}" class="w-5 h-5 rounded-full border ${
                p.role === s.role ? 'border-gold z-10 scale-110' : 'border-win/70 opacity-85'
              }" title="Aliado: ${esc(p.champId)} (${p.role})" alt="" />`,
          )
          .join('')}
      </div>
      <span class="text-[9px] font-black text-ink-mute px-0.5">VS</span>
      <div class="flex -space-x-1.5">
        ${s.enemies
          .map(
            (p) =>
              `<img src="${champImg(p.champId)}" class="w-5 h-5 rounded-full border ${
                p.role === s.role ? 'border-crimson z-10 scale-110' : 'border-crimson/60 opacity-85'
              }" title="Enemigo: ${esc(p.champId)} (${p.role})" alt="" />`,
          )
          .join('')}
      </div>
    </div>

    <!-- Pick Recomendado por Composición -->
    <div class="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-2 py-0.5" title="${esc(rec.reason)}">
      <img src="${champImg(rec.champId)}" class="w-4 h-4 rounded-full border border-gold" alt="" />
      <span class="text-[10px] font-bold text-gold">Pick IA: ${esc(rec.champId)} (${rec.winRate})</span>
    </div>
  </div>
  <div class="text-[10px] text-ink-dim leading-tight flex items-center justify-between">
    <span>Matchup: <b class="text-ink">${esc(myPlayer.champId)}</b> vs <b class="text-crimson">${esc(rivalPlayer.champId)}</b></span>
    <span class="text-win font-semibold">${esc(rec.shortTip)}</span>
  </div>`;
}

/** 1. Camino de Objetos Chico (Solo Iconos en camino secuencial) */
function renderCompactItemPathWidget(s: State, b: BuildPreset, presets: BuildPreset[]): string {
  const steps = [
    b.starterItems[0]?.item || 1056,
    b.earlyItems[0]?.item || 3802,
    b.coreItems[1]?.item || 3020,
    b.fullBuild[0] || 3118,
    b.fullBuild[2] || 4645,
    b.fullBuild[3] || 3157,
    b.fullBuild[4] || 3089,
  ];
  const activeItemId = steps[s.itemPathIndex] || steps[0];
  const activeItem = itemData(activeItemId);

  return `
  <section class="rounded-xl border border-line bg-surface/70 p-2.5 space-y-2">
    <div class="flex items-center justify-between gap-1">
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] font-extrabold uppercase tracking-wider text-ink-dim">Camino de Objetos</span>
        <div class="flex items-center gap-0.5">
          ${presets
            .map(
              (pr, idx) => `
              <button class="px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                s.presetIdx === idx ? 'bg-gold text-canvas' : 'bg-canvas/70 text-ink-mute hover:text-ink'
              }" data-action="preset" data-idx="${idx}" title="${esc(pr.label)} (${pr.winRate}% WR)">
                ${idx === 0 ? 'M1' : idx === 1 ? 'M2' : idx === 2 ? 'Alt' : 'Off'}
              </button>`,
            )
            .join('')}
        </div>
      </div>
      <button class="text-[10px] font-bold text-gold hover:underline flex items-center gap-1" data-action="next-item" title="Marcar objeto comprado y avanzar al siguiente">
        <span>${esc(activeItem.name.slice(0, 15))}</span>
        <span class="num font-mono text-[9.5px] text-ink-dim">(${itemCost(activeItemId)}g) ➔</span>
      </button>
    </div>

    <!-- Fila horizontal compacta de SOLO ICONOS de objetos con flechas -->
    <div class="flex items-center justify-between gap-0.5 rounded-lg bg-canvas/90 px-2 py-1.5 border border-line/80">
      ${steps
        .map((id, i) => {
          const isDone = i < s.itemPathIndex;
          const isCurrent = i === s.itemPathIndex;
          const it = itemData(id);
          const cost = itemCost(id);
          return `
          <div class="flex items-center">
            <button type="button" class="relative group focus:outline-none" data-action="select-item-step" data-idx="${i}" title="${esc(it.name)} · ${cost} de oro">
              <img src="${itemImg(id)}" class="w-8 h-8 rounded-md object-contain transition-transform ${
                isCurrent
                  ? 'ring-2 ring-gold scale-110 shadow-[0_0_10px_rgba(240,180,41,0.65)]'
                  : isDone
                    ? 'opacity-45 grayscale-[40%] border border-win/60'
                    : 'opacity-85 border border-line hover:opacity-100'
              }" alt="${esc(it.name)}" />
              ${
                isDone
                  ? '<span class="absolute -top-1 -right-1 bg-win text-canvas rounded-full w-3 h-3 flex items-center justify-center text-[7px] font-black">✓</span>'
                  : isCurrent
                    ? '<span class="absolute -top-1 -right-1 bg-gold text-canvas rounded-full w-3 h-3 flex items-center justify-center text-[7px] font-black">★</span>'
                    : ''
              }
            </button>
            ${i < steps.length - 1 ? '<span class="text-[8px] text-ink-mute mx-0.5 opacity-50">›</span>' : ''}
          </div>`;
        })
        .join('')}
    </div>
  </section>`;
}

/** 2. Guía de Qué Habilidad Subir Primero */
function renderCompactSkillWidget(s: State, b: BuildPreset): string {
  const currentSkill = b.abilityOrder.levels[s.playerLevel - 1] || 'Q';
  const isUlt = currentSkill === 'R';
  const keys: ('Q' | 'W' | 'E' | 'R')[] = ['Q', 'W', 'E', 'R'];

  return `
  <section class="rounded-xl border border-line bg-surface/70 p-2.5 space-y-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-extrabold uppercase tracking-wider text-ink-dim">Subir Habilidad</span>
        <span class="chip !py-0 !px-1.5 !text-[9.5px] font-bold text-gold">Max: ${esc(b.abilityOrder.priorityStr)}</span>
      </div>
      <div class="flex items-center gap-1 bg-canvas rounded-md border border-line px-1 py-0.5">
        <button class="text-ink-mute hover:text-ink px-1 text-[11px] font-bold" data-action="level-down" title="Nivel anterior">−</button>
        <span class="num text-[10.5px] font-extrabold text-gold px-1">Nv. ${s.playerLevel}</span>
        <button class="text-ink-mute hover:text-ink px-1 text-[11px] font-bold" data-action="level-up" title="Siguiente nivel">+</button>
      </div>
    </div>

    <!-- 4 Teclas Q W E R con iluminado en la habilidad a subir ahora -->
    <div class="grid grid-cols-4 gap-1.5">
      ${keys
        .map((k) => {
          const active = k === currentSkill;
          return `
          <div class="flex items-center justify-center gap-1.5 rounded-lg border py-1.5 px-2 transition-all ${
            active
              ? isUlt
                ? 'border-crimson bg-crimson/20 text-crimson shadow-[0_0_12px_rgba(255,46,77,0.4)] scale-[1.03]'
                : 'border-gold bg-gold/20 text-gold shadow-[0_0_12px_rgba(240,180,41,0.35)] scale-[1.03]'
              : 'border-line bg-canvas/60 text-ink-mute opacity-60'
          }">
            <span class="text-[13px] font-black">${k}</span>
            ${active ? '<span class="text-[9px] font-extrabold uppercase tracking-tight">▲ SUBIR</span>' : ''}
          </div>`;
        })
        .join('')}
    </div>
  </section>`;
}

/** 3. Contador de la Jungla Compacto */
function renderCompactJungleWidget(s: State): string {
  return `
  <section class="rounded-xl border border-line bg-surface/70 p-2.5 space-y-1.5">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-extrabold uppercase tracking-wider text-ink-dim">Timers de Jungla</span>
      <span class="text-[9.5px] text-ink-mute">Click para reiniciar</span>
    </div>
    <div class="grid grid-cols-5 gap-1">
      ${s.jungleCamps
        .map((c) => {
          const ready = c.remaining <= 0;
          const soon = c.remaining > 0 && c.remaining <= 30;
          return `
          <button type="button" class="flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 transition-all ${
            ready
              ? 'border-win/50 bg-win/10 text-win'
              : soon
                ? 'border-gold bg-gold/15 text-gold animate-pulse'
                : 'border-line bg-canvas/70 text-ink'
          }" data-action="reset-camp" data-id="${c.id}" title="${esc(c.name)} · Click para reiniciar (${c.respawnTime / 60}:00)">
            <span class="text-[9.5px] font-bold truncate max-w-full">${esc(c.shortName)}</span>
            <span class="num font-mono text-[11px] font-extrabold mt-0.5">${ready ? 'VIVO' : formatTime(c.remaining)}</span>
          </button>`;
        })
        .join('')}
    </div>
  </section>`;
}

/** 4. Contador de Definitivas Aliadas (R) */
function renderCompactAlliesUltWidget(s: State): string {
  const alliesWithoutMe = s.allies.filter((a) => !a.isMe).slice(0, 4);

  return `
  <section class="rounded-xl border border-line bg-surface/70 p-2.5 space-y-1.5">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-extrabold uppercase tracking-wider text-ink-dim">Definitivas Aliadas (R)</span>
      <span class="text-[9.5px] text-ink-mute">Click al gastar R</span>
    </div>
    <div class="grid grid-cols-4 gap-1.5">
      ${alliesWithoutMe
        .map((ally) => {
          const ready = ally.ultCooldown <= 0;
          return `
          <button type="button" class="flex items-center gap-1.5 rounded-lg border p-1.5 transition-all ${
            ready ? 'border-win/50 bg-win/10' : 'border-line bg-canvas/75'
          }" data-action="trigger-ult" data-id="${ally.champId}" title="${esc(ally.champId)} (${ally.role.toUpperCase()}) · Click para alternar enfriamiento de R">
            <div class="relative flex-none">
              <img src="${champImg(ally.champId)}" class="w-6 h-6 rounded-full border ${ready ? 'border-win' : 'border-line opacity-65'} object-cover" alt="" />
              <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-canvas ${ready ? 'bg-win' : 'bg-crimson'}"></span>
            </div>
            <div class="min-w-0 text-left leading-none">
              <div class="text-[9.5px] font-bold truncate text-ink">${esc(ally.champId)}</div>
              <div class="num font-mono text-[10px] font-extrabold mt-0.5 ${ready ? 'text-win' : 'text-crimson'}">
                ${ready ? 'R LISTA' : `${ally.ultCooldown}s`}
              </div>
            </div>
          </button>`;
        })
        .join('')}
    </div>
  </section>`;
}

function getRecommendationsByRoleAndRival(role: Role, _rival: string) {
  if (role === 'mid') {
    return [
      {
        champId: 'Ahri',
        winRate: '54.2%',
        shortTip: 'Corta su E2 con tu Charm (E)',
        reason: 'Rango superior para castigar en early y movilidad con R para eludir la E2 de Sylas.',
      },
    ];
  }
  if (role === 'adc') {
    return [
      {
        champId: 'Jinx',
        winRate: '52.4%',
        shortTip: 'Farmea con Q (Espinas) y escala',
        reason: 'Escalado insuperable en peleas grupales de 5v5 con reinicios de Pasiva.',
      },
    ];
  }
  if (role === 'top') {
    return [
      {
        champId: 'Aatrox',
        winRate: '53.5%',
        shortTip: 'Espacia con Q1/Q2 y guarda E',
        reason: 'Excelente espaciado con el borde de las Q para no permitir que Darius alcance las 5 marcas.',
      },
    ];
  }
  if (role === 'jungle') {
    return [
      {
        champId: 'LeeSin',
        winRate: '53.0%',
        shortTip: 'Prioriza objetivos tempranos',
        reason: 'Presión temprana y robo de objetivos neutrales con combo Q + Castigo.',
      },
    ];
  }
  return [
    {
      champId: 'Thresh',
      winRate: '52.6%',
      shortTip: 'Guarda E (Despellejar) defensivo',
      reason: 'La linterna salva aliados desposicionados y el gancho castiga saltos imprudentes.',
    },
  ];
}
