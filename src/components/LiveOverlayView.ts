import { createView } from '../lib/view';
import { esc, roleImg, icon } from '../lib/ui';
import { champImg, itemImg } from '../lib/assets';
import { item as itemData } from '../data/items';
import { itemCost } from '../data/itemGuide';
import { CHAMPIONS, CHAMP_BY_ID } from '../data/champions';
import { ROLES, type Role } from '../types';
import { getChampionBuildPresets, type BuildPreset } from '../lib/buildEngine';
import { isTauri, setOverlayAlwaysOnTop } from '../lib/tauri';

/* ─────────────────────────────────────────────────────────────
 * TIPOS Y ESTADO DEL OVERLAY IN-GAME (Réplica Exacta de Itero)
 * ───────────────────────────────────────────────────────────── */
export type OverlayCorner = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
export type InGameTab = 'gamedata' | 'scouting';

export interface LivePlayer {
  champId: string;
  name: string;
  tag?: string;
  rank?: string;
  lp?: number;
  overallWr?: string;
  champWr?: string;
  role: Role;
  isMe?: boolean;
  isAlly?: boolean;
  badges?: { text: string; color: 'green' | 'cyan' | 'red' | 'purple' }[];
  ultCooldown: number;
  ultBaseCooldown: number;
}

interface State {
  open: boolean; // Controla la ventana grande de Game Data / Scouting (Atajo: ~ o botón)
  activeTab: InGameTab; // 'gamedata' (Foto 4) | 'scouting' (Foto 5)
  showMiniItemWidget: boolean; // Mini-widget en esquina inferior con el próximo ítem
  corner: OverlayCorner;
  liveConnected: boolean;
  gameModeLabel: string;
  mySide: 'blue' | 'red';
  myChampId: string; // e.g. 'Ashe'
  rivalChampId: string; // e.g. 'Lucian'
  rivalSuppId: string; // e.g. 'Thresh'
  role: Role;
  presetIdx: number;
  buildPage: number; // 1 to 3
  playerLevel: number;
  skillLevels: { Q: number; W: number; E: number; R: number };
  currentGold: number;
  ownedItemIds: number[];
  manualItemStep: number;
  gameTimeSec: number;
  allies: LivePlayer[];
  enemies: LivePlayer[];
  detectedGlobalScale: number;
  detectedMinimapScale: number;
  detectedFlipMiniMap: boolean;
  hudScaleManualDelta: number;
  importToast: string | null;
  transparentHudMode: boolean;
}

const CORNER_CLASSES: Record<OverlayCorner, string> = {
  'top-right': 'top-14 right-4',
  'bottom-right': 'bottom-4 right-4',
  'top-left': 'top-14 left-4',
  'bottom-left': 'bottom-4 left-4',
};

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function resolveChampId(rawOrDisplay: string): string {
  if (!rawOrDisplay) return 'Ashe';
  const cleaned = rawOrDisplay
    .replace(/^game_character_displayname_/i, '')
    .replace(/^PracticeTool_TargetDummy$/i, 'Sion')
    .replace(/\s+/g, '')
    .trim();

  if (CHAMP_BY_ID[cleaned]) return cleaned;
  const lower = cleaned.toLowerCase();
  for (const ch of CHAMPIONS) {
    if (ch.id.toLowerCase() === lower || ch.name.toLowerCase().replace(/\s+/g, '') === lower) {
      return ch.id;
    }
  }
  if (/^[A-Za-z]+$/.test(cleaned)) return cleaned;
  return 'Ashe';
}

function mapRiotPositionToRole(pos: string | undefined, fallbackChampId: string): Role {
  const p = (pos || '').toUpperCase();
  if (p === 'TOP') return 'top';
  if (p === 'JUNGLE') return 'jungle';
  if (p === 'MIDDLE' || p === 'MID') return 'mid';
  if (p === 'BOTTOM' || p === 'BOT') return 'adc';
  if (p === 'UTILITY' || p === 'SUPPORT') return 'support';
  const champ = CHAMP_BY_ID[fallbackChampId];
  return champ?.roles?.[0] ?? 'adc';
}

function getOrderedBuildItems(b: BuildPreset): number[] {
  const raw = [
    b.starterItems[0]?.item || 1055,
    b.earlyItems[0]?.item || 3006,
    b.coreItems[0]?.item || 3153,
    b.coreItems[1]?.item || 3085,
    b.fullBuild[0] || 3031,
    b.fullBuild[1] || 3036,
  ];
  return Array.from(new Set(raw));
}

/* ─────────────────────────────────────────────────────────────
 * SUB-COMPONENTE: VENTANA COMPLETA IN-GAME (Fotos 4 y 5 de Itero)
 * ───────────────────────────────────────────────────────────── */
function renderFullInGameModal(s: State, activePreset: BuildPreset): string {
  return `
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md select-none anim-fade-up">
    <div class="relative w-[1140px] max-w-full rounded-2xl border border-line-strong bg-[#090b10]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[90vh]">

      <!-- Barra Superior de Navegación del Overlay (Fotos 4 y 5) -->
      <header class="flex items-center justify-between border-b border-line bg-surface/90 px-4 py-2.5 flex-none">
        <!-- Izquierda: Botón Mostrar/Ocultar -->
        <div class="flex items-center gap-3">
          <button class="flex items-center gap-1.5 rounded-lg border border-line bg-canvas/80 px-2.5 py-1 text-[11px] font-bold text-ink hover:border-gold transition-all" data-action="toggle-overlay" title="Atajo de teclado: ~">
            ${icon('eye', 13)} Mostrar/Ocultar (~)
          </button>
        </div>

        <!-- Centro: Selector de Pestañas (Player Scouting vs Game Data) -->
        <div class="flex items-center rounded-xl border border-line bg-canvas p-1">
          <button class="px-5 py-1.5 rounded-lg text-[12.5px] font-black uppercase tracking-wider transition-all ${
            s.activeTab === 'scouting' ? 'border border-[#2dd4bf]/70 bg-[#2dd4bf]/20 text-[#2dd4bf] shadow-sm' : 'text-ink-dim hover:text-ink'
          }" data-action="set-tab" data-id="scouting">
            Player Scouting
          </button>
          <button class="px-5 py-1.5 rounded-lg text-[12.5px] font-black uppercase tracking-wider transition-all ${
            s.activeTab === 'gamedata' ? 'border border-[#2dd4bf]/70 bg-[#2dd4bf]/20 text-[#2dd4bf] shadow-sm' : 'text-ink-dim hover:text-ink'
          }" data-action="set-tab" data-id="gamedata">
            Game Data
          </button>
        </div>

        <!-- Derecha: Atajo Alt+O y Botón Cerrar -->
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-mono text-ink-mute hidden sm:inline">Alternar entre pestañas (Alt + O)</span>
          <button class="grid h-7 w-7 place-items-center rounded-lg border border-line bg-canvas/60 text-ink-mute hover:bg-crimson/20 hover:text-crimson transition-colors" data-action="toggle-overlay" title="Cerrar modal (~)">
            ✕
          </button>
        </div>
      </header>

      <!-- Cuerpo del Modal según Pestaña -->
      <div class="p-4 overflow-y-auto flex-1 grid gap-4" style="grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.6fr);">
        ${s.activeTab === 'gamedata' ? renderGameDataTab(s, activePreset) : renderPlayerScoutingTab(s)}
        ${renderInGameSidebar(s)}
      </div>

    </div>
  </div>
  `;
}

/* ─────────────────────────────────────────────────────────────
 * PESTAÑA 1: GAME DATA (Foto 4 de Itero)
 * ───────────────────────────────────────────────────────────── */
function renderGameDataTab(s: State, activePreset: BuildPreset): string {
  const starterItems = [1055, 2003, 2003]; // Espada Doran + pociones
  const orderedBuild = getOrderedBuildItems(activePreset);
  const alternatives = [3094, 3033, 6673, 3026]; // Cañón de fuego, Recordatorio, Arcoescudo, GA

  return `
    <div class="space-y-4">
      <!-- 1. Enfrentamiento contra el carril rival (Nivel 1 a 5) -->
      <section class="card p-3.5 border-line space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="text-[13px] font-black text-ink uppercase tracking-wide flex items-center gap-2">
            <span>Enfrentamiento contra ${esc(s.rivalChampId)} + ${esc(s.rivalSuppId)}</span>
            <span class="chip chip-gold !py-0 !px-1.5 !text-[10px]">Fase de Líneas</span>
          </div>
        </div>

        <!-- Tabla de Niveles 1 al 5: Estilo de Juego, Tradeo y Amenaza de Muerte -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[11.5px]">
            <thead>
              <tr class="border-b border-line text-ink-dim uppercase text-[10px]">
                <th class="py-1 px-2 font-bold">Nivel</th>
                <th class="py-1 px-2 font-bold">Estilo de juego ⓘ</th>
                <th class="py-1 px-2 font-bold">Tradeo ⓘ</th>
                <th class="py-1 px-2 font-bold text-right">Amenaza de muerte ⓘ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line/40">
              <tr class="hover:bg-surface/50">
                <td class="py-1.5 px-2 font-bold text-ink">1</td>
                <td class="py-1.5 px-2 font-extrabold text-gold">Matón</td>
                <td class="py-1.5 px-2 font-black num text-ink">4.3</td>
                <td class="py-1.5 px-2 text-right"><span class="chip chip-gold !py-0 !px-2 font-black num">2.8</span></td>
              </tr>
              <tr class="hover:bg-surface/50">
                <td class="py-1.5 px-2 font-bold text-ink">2</td>
                <td class="py-1.5 px-2 font-extrabold text-[#38bdf8]">Pokeo</td>
                <td class="py-1.5 px-2 font-black num text-ink">3.4</td>
                <td class="py-1.5 px-2 text-right"><span class="chip chip-crimson !py-0 !px-2 font-black num">1.0</span></td>
              </tr>
              <tr class="hover:bg-surface/50">
                <td class="py-1.5 px-2 font-bold text-ink">3</td>
                <td class="py-1.5 px-2 font-extrabold text-[#38bdf8]">Pokeo</td>
                <td class="py-1.5 px-2 font-black num text-ink">3.7</td>
                <td class="py-1.5 px-2 text-right"><span class="chip chip-win !py-0 !px-2 font-black num">0.3</span></td>
              </tr>
              <tr class="hover:bg-surface/50">
                <td class="py-1.5 px-2 font-bold text-ink">4</td>
                <td class="py-1.5 px-2 font-extrabold text-[#38bdf8]">Pokeo</td>
                <td class="py-1.5 px-2 font-black num text-ink">4.3</td>
                <td class="py-1.5 px-2 text-right"><span class="chip chip-win !py-0 !px-2 font-black num">0.8</span></td>
              </tr>
              <tr class="hover:bg-surface/50">
                <td class="py-1.5 px-2 font-bold text-ink">5</td>
                <td class="py-1.5 px-2 font-extrabold text-[#38bdf8]">Pokeo</td>
                <td class="py-1.5 px-2 font-black num text-ink">4.3</td>
                <td class="py-1.5 px-2 text-right"><span class="chip chip-gold !py-0 !px-2 font-black num">1.7</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 2. Ventaja de Escalado de Equipo -->
      <section class="card p-3.5 border-line space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[12px] font-black text-ink uppercase tracking-wide">Ventaja de Escalado de Equipo ⓘ</span>
        </div>
        <div class="grid grid-cols-3 gap-2.5">
          <div class="rounded-xl border border-line bg-surface p-2.5 text-center">
            <span class="block text-[10.5px] text-ink-dim">Inicio (15 - 26 min)</span>
            <span class="text-[18px] font-black num text-gold mt-0.5">3.0</span>
          </div>
          <div class="rounded-xl border border-win/40 bg-win/10 p-2.5 text-center">
            <span class="block text-[10.5px] text-win">Juego Medio (27 - 32 min)</span>
            <span class="text-[18px] font-black num text-win mt-0.5">4.5</span>
          </div>
          <div class="rounded-xl border border-crimson/40 bg-crimson/10 p-2.5 text-center">
            <span class="block text-[10.5px] text-crimson">Juego tardío (33+ min)</span>
            <span class="text-[18px] font-black num text-crimson mt-0.5">1.7</span>
          </div>
        </div>
      </section>

      <!-- 3. Builds e Habilidades (Paginación < 1/3 >) -->
      <section class="card p-3.5 border-line space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[12px] font-black text-ink uppercase tracking-wide">Builds Recomendadas</span>
          <div class="flex items-center gap-1.5 text-[11px] font-bold text-ink-dim">
            <button class="h-5 w-5 rounded bg-surface border border-line flex items-center justify-center hover:text-ink" data-action="prev-build-page">‹</button>
            <span>${s.buildPage}/3</span>
            <button class="h-5 w-5 rounded bg-surface border border-line flex items-center justify-center hover:text-ink" data-action="next-build-page">›</button>
          </div>
        </div>

        <!-- Objetos de inicio -->
        <div>
          <span class="block text-[10.5px] font-bold text-ink-dim uppercase mb-1">Objetos de inicio</span>
          <div class="flex items-center gap-1.5">
            ${starterItems.map((id) => `
              <img src="${itemImg(id)}" class="h-8 w-8 rounded-lg border border-line" alt="Item" onerror="this.style.display='none'"/>
            `).join('')}
          </div>
        </div>

        <!-- Orden de build -->
        <div>
          <span class="block text-[10.5px] font-bold text-ink-dim uppercase mb-1">Orden de build</span>
          <div class="flex items-center gap-2">
            ${orderedBuild.map((id, idx) => `
              <div class="flex items-center gap-1">
                <div class="relative group">
                  <img src="${itemImg(id)}" class="h-8 w-8 rounded-lg border border-line ${s.ownedItemIds.includes(id) ? 'ring-2 ring-win' : ''}" alt="Item" onerror="this.style.display='none'"/>
                  <span class="absolute -top-1 -left-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-surface-2 border border-line text-[8px] font-mono">${idx + 1}</span>
                </div>
                ${idx < orderedBuild.length - 1 ? `<span class="text-ink-mute text-[9px]">➔</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Alternativas -->
        <div>
          <span class="block text-[10.5px] font-bold text-ink-dim uppercase mb-1">Alternativas Situacionales</span>
          <div class="flex items-center gap-1.5">
            ${alternatives.map((id) => `
              <img src="${itemImg(id)}" class="h-7 w-7 rounded-lg border border-line opacity-85 hover:opacity-100" alt="Item" onerror="this.style.display='none'"/>
            `).join('')}
          </div>
        </div>

        <!-- Matriz de Habilidades (1 al 18) -->
        <div class="pt-2 border-t border-line/50">
          <span class="block text-[10.5px] font-bold text-ink-dim uppercase mb-1.5">Orden de maximización de habilidades</span>
          <div class="overflow-x-auto">
            <div class="grid grid-cols-[auto_repeat(18,1fr)] gap-1 text-center text-[10px] font-mono">
              <span class="font-bold text-ink-dim py-0.5">Nv</span>
              ${Array.from({ length: 18 }, (_, i) => `<span class="text-ink-mute">${i + 1}</span>`).join('')}

              ${(['Q', 'W', 'E', 'R'] as const).map((key) => `
                <span class="font-bold text-ink py-0.5 px-1">${key}</span>
                ${Array.from({ length: 18 }, (_, i) => {
                  const targetSkill = activePreset.abilityOrder.levels[i] || 'Q';
                  const isUp = targetSkill === key;
                  return `
                    <span class="h-5 rounded flex items-center justify-center font-bold ${
                      isUp ? (key === 'R' ? 'bg-crimson text-white' : 'bg-gold text-canvas') : 'bg-surface/50 text-transparent'
                    }">
                      ${isUp ? key : ''}
                    </span>
                  `;
                }).join('')}
              `).join('')}
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────
 * PESTAÑA 2: PLAYER SCOUTING (Foto 5 de Itero)
 * ───────────────────────────────────────────────────────────── */
function renderPlayerScoutingTab(s: State): string {
  // Jugadores del Scouting (Aliados y Enemigos con sus badges tácticos de conducta)
  const scoutingPlayers: LivePlayer[] = [
    {
      champId: 'Malzahar',
      name: 'FranCrow666',
      tag: 'LA3',
      rank: 'SILVER I 68 LP',
      overallWr: '218W 210L (50.9%)',
      champWr: '0W 1L (0.0%)',
      role: 'mid',
      badges: [
        { text: 'Malzahar Noob', color: 'purple' },
        { text: 'Siempre haz split-push', color: 'red' },
        { text: 'Nunca Gankea', color: 'red' },
        { text: 'AFK al principio de la partida', color: 'red' },
      ],
      ultCooldown: 0,
      ultBaseCooldown: 80,
    },
    {
      champId: s.myChampId,
      name: 'Aczi593',
      tag: 'Aczi',
      rank: 'SILVER III 2 LP',
      overallWr: '22W 16L (57.9%)',
      champWr: '0W 0L (-)',
      role: 'adc',
      isMe: true,
      badges: [
        { text: 'Ashe No hay partidas recientes', color: 'purple' },
        { text: 'Visión Omnisciente', color: 'green' },
        { text: 'Luchas constantes', color: 'cyan' },
        { text: 'Juego agresivo en las primeras fases', color: 'cyan' },
        { text: 'A menudo haciendo ganks', color: 'cyan' },
      ],
      ultCooldown: 0,
      ultBaseCooldown: 70,
    },
    {
      champId: 'Neeko',
      name: 'IPfran',
      tag: '007',
      rank: 'SILVER III 63 LP',
      overallWr: '214W 194L (52.5%)',
      champWr: '0W 0L (-)',
      role: 'support',
      badges: [
        { text: 'Neeko No hay partidas recientes', color: 'purple' },
        { text: 'Nunca juegues', color: 'cyan' },
        { text: 'A menudo haciendo ganks', color: 'cyan' },
        { text: 'Vulnerable al principio de la partida', color: 'red' },
      ],
      ultCooldown: 0,
      ultBaseCooldown: 90,
    },
    {
      champId: 'Kassadin',
      name: 'LaGarompa',
      tag: 'LAU',
      rank: 'GOLD IV 90 LP',
      overallWr: '23W 28L (45.1%)',
      champWr: '1W 0L (100%)',
      role: 'mid',
      badges: [
        { text: 'Kassadin No hay partidas recientes', color: 'purple' },
        { text: 'Visión Omnisciente', color: 'green' },
        { text: 'Normalmente «Split-Pushes»', color: 'cyan' },
      ],
      ultCooldown: 0,
      ultBaseCooldown: 50,
    },
    {
      champId: 'Lucian',
      name: 'Doffe',
      tag: 'Doffe',
      rank: 'SILVER I 30 LP',
      overallWr: '217W 215L (50.2%)',
      champWr: '0W 0L (-)',
      role: 'adc',
      badges: [
        { text: 'Lucian No hay partidas recientes', color: 'purple' },
        { text: 'Bastante vulnerable al principio', color: 'red' },
      ],
      ultCooldown: 0,
      ultBaseCooldown: 60,
    },
    {
      champId: 'Thresh',
      name: 'ElGordoFuhr3r',
      tag: 'TCDYE',
      rank: 'BRONZE IV 61 LP',
      overallWr: '370W 376L (49.6%)',
      champWr: '25W 12L (67.6%)',
      role: 'support',
      badges: [
        { text: 'Thresh Monstruo', color: 'purple' },
        { text: 'Thresh Jugador', color: 'purple' },
        { text: 'Amenaza en las primeras fases', color: 'cyan' },
        { text: 'Ganking sin parar', color: 'cyan' },
      ],
      ultCooldown: 0,
      ultBaseCooldown: 80,
    },
  ];

  return `
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      ${scoutingPlayers.map((p) => {
        return `
          <article class="card p-3 border-line space-y-2 flex flex-col justify-between hover:border-line-strong transition-all ${
            p.isMe ? 'ring-1 ring-gold/60 bg-gold/5' : ''
          }">
            <div>
              <!-- Cabecera de Jugador -->
              <div class="flex items-center gap-2 mb-2">
                <img src="${champImg(p.champId)}" class="h-10 w-10 rounded-full border border-line" alt="${p.champId}"/>
                <div class="min-w-0">
                  <div class="text-[12.5px] font-black truncate">${esc(p.name)} <span class="text-ink-mute font-medium text-[11px]">#${esc(p.tag || '')}</span></div>
                  <div class="text-[10px] font-bold text-gold uppercase">${esc(p.rank || 'UNRANKED')}</div>
                </div>
              </div>

              <!-- Récord general y con el campeón -->
              <div class="space-y-0.5 text-[10.5px] border-t border-line/40 pt-1.5 mb-2">
                <div class="flex justify-between text-ink-dim">
                  <span>En general:</span>
                  <span class="font-bold text-ink">${esc(p.overallWr || '–')}</span>
                </div>
                <div class="flex justify-between text-ink-dim">
                  <span>Campeón:</span>
                  <span class="font-bold text-ink">${esc(p.champWr || '–')}</span>
                </div>
              </div>
            </div>

            <!-- Etiquetas de Conducta Táctica (Badges de estilo de juego) -->
            <div class="flex flex-wrap gap-1">
              ${(p.badges || []).map((b) => {
                const badgeStyle =
                  b.color === 'green'
                    ? 'border-win/40 bg-win/10 text-win'
                    : b.color === 'cyan'
                      ? 'border-[#2dd4bf]/40 bg-[#2dd4bf]/10 text-[#2dd4bf]'
                      : b.color === 'red'
                        ? 'border-loss/40 bg-loss/10 text-loss'
                        : 'border-purple-400/40 bg-purple-400/10 text-purple-300';
                return `<span class="rounded px-1.5 py-0.5 text-[9.5px] font-bold border ${badgeStyle}">${esc(b.text)}</span>`;
              }).join('')}
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────
 * BARRA LATERAL DERECHA (Estado del Carril y 5 Emparejamientos)
 * ───────────────────────────────────────────────────────────── */
function renderInGameSidebar(s: State): string {
  const laneMatchups = [
    { ally: 'LeeSin', enemy: 'Jax', role: 'top', allyScore: '2.3', enemyScore: '1.4' },
    { ally: 'Amumu', enemy: 'Evelynn', role: 'jungle', allyScore: '1.4', enemyScore: '3.4' },
    { ally: 'Malzahar', enemy: 'Kassadin', role: 'mid', allyScore: '2.5', enemyScore: '1.6' },
    { ally: s.myChampId, enemy: s.rivalChampId, role: 'adc', allyScore: '–', enemyScore: '4.5' },
    { ally: 'Neeko', enemy: s.rivalSuppId, role: 'support', allyScore: '1.0', enemyScore: '1.9' },
  ];

  return `
    <aside class="space-y-3">
      <!-- Tarjeta Superior: Estado del Carril -->
      <div class="card p-3 border-line space-y-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <img src="${champImg(s.myChampId)}" class="h-8 w-8 rounded-full border border-gold" alt=""/>
            <div>
              <div class="text-[12px] font-black">${esc(s.myChampId)} <span class="text-gold num font-bold">2.4</span></div>
              <div class="text-[10px] text-win font-bold">Even · Estado del Carril (0-7 min)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Emparejamientos de los 5 Carriles -->
      <div class="card p-3 border-line space-y-2">
        <div class="flex items-center justify-between text-[11px] font-extrabold text-ink-dim uppercase">
          <span>Emparejamientos ⓘ</span>
          <span class="text-[9.5px] text-ink-mute">Notas Matchup</span>
        </div>

        <div class="space-y-2">
          ${laneMatchups.map((m) => `
            <div class="flex items-center justify-between p-1.5 rounded-lg border border-line/50 bg-surface/40">
              <!-- Aliado -->
              <div class="flex items-center gap-1.5">
                <img src="${champImg(m.ally)}" class="h-6 w-6 rounded-full border border-[#38bdf8]" alt=""/>
                <span class="text-[11px] font-bold num text-gold">${m.allyScore}</span>
              </div>

              <!-- Rol -->
              <span class="text-ink-mute">${roleImg(m.role as Role) ? `<img src="${roleImg(m.role as Role)}" class="h-3.5 w-3.5" alt=""/>` : m.role}</span>

              <!-- Enemigo -->
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-bold num text-crimson">${m.enemyScore}</span>
                <img src="${champImg(m.enemy)}" class="h-6 w-6 rounded-full border border-[#f43f5e]" alt=""/>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </aside>
  `;
}

/* ─────────────────────────────────────────────────────────────
 * 2. MINI-WIDGET DE OBJETOS EN LA ESQUINA INFERIOR
 * "Lo de los objetos me gustaria que salga en una esquina inferior
 * en chiquito para que sepan que objeto armarse despues."
 * ───────────────────────────────────────────────────────────── */
function renderMiniItemCornerWidget(s: State, activePreset: BuildPreset): string {
  const orderedBuild = getOrderedBuildItems(activePreset);
  const nextUnowned = orderedBuild.find((id) => !s.ownedItemIds.includes(id)) || orderedBuild[0];
  const itemInfo = itemData(nextUnowned);
  const cost = itemCost(nextUnowned);
  const diffGold = Math.max(0, cost - s.currentGold);
  const canBuy = diffGold === 0;

  return `
    <div class="fixed ${CORNER_CLASSES[s.corner] || 'bottom-4 right-4'} z-40 w-[295px] rounded-2xl border border-gold/60 bg-[#07090e]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.92)] select-none text-ink p-3 space-y-2 animate-fade-in">
      <!-- Cabecera del Mini-Widget -->
      <div class="flex items-center justify-between border-b border-line pb-1.5">
        <div class="flex items-center gap-2">
          <span class="relative flex h-2 w-2">
            <span class="absolute inset-0 rounded-full ${s.liveConnected ? 'bg-win animate-ping' : 'bg-gold'} opacity-75"></span>
            <span class="relative h-2 w-2 rounded-full ${s.liveConnected ? 'bg-win' : 'bg-gold'}"></span>
          </span>
          <span class="text-[10px] font-black uppercase tracking-wider text-gold">Siguiente Objeto</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-mono num text-ink-dim">${s.currentGold}g · ${formatTime(s.gameTimeSec)}</span>
          <button class="text-ink-mute hover:text-ink text-[11px] px-1" data-action="toggle-overlay" title="Abrir ventana completa (~)">⛶</button>
        </div>
      </div>

      <!-- Ítem Próximo Principal con Precio y Faltante -->
      <div class="flex items-center gap-2.5">
        <img src="${itemImg(nextUnowned)}" class="h-10 w-10 rounded-xl border-2 ${canBuy ? 'border-win animate-pulse' : 'border-gold'}" alt="${esc(itemInfo.name)}"/>
        <div class="min-w-0 flex-1">
          <div class="text-[12px] font-black truncate">${esc(itemInfo.name)}</div>
          <div class="text-[10.5px] font-bold ${canBuy ? 'text-win' : 'text-gold'}">
            ${canBuy ? '✓ ¡Puedes comprarlo en base!' : `Faltan ${diffGold}g (${cost}g)`}
          </div>
        </div>
      </div>

      <!-- Fila de los 6 Objetos en Secuencia (Tira chica) -->
      <div class="flex items-center justify-between gap-1 pt-1 border-t border-line/40">
        ${orderedBuild.map((id) => {
          const isOwned = s.ownedItemIds.includes(id);
          const isCurrent = id === nextUnowned && !isOwned;
          return `
            <div class="relative">
              <img src="${itemImg(id)}" class="h-6 w-6 rounded-md border ${
                isCurrent ? 'border-gold ring-1 ring-gold scale-105' : isOwned ? 'border-win opacity-60' : 'border-line opacity-80'
              }" alt="item"/>
              ${isOwned ? `<span class="absolute -top-1 -right-1 grid h-3 w-3 place-items-center rounded-full bg-win text-[7px] text-black font-black">✓</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────
 * 3. INDICADOR CENTRAL DE SUBIDA DE HABILIDADES SOBRE EL HUD
 * ───────────────────────────────────────────────────────────── */
function renderBottomAbilityHudBar(s: State, b: BuildPreset): string {
  const currentSkill = b.abilityOrder.levels[s.playerLevel - 1] || 'Q';
  const keys: ('Q' | 'W' | 'E' | 'R')[] = ['Q', 'W', 'E', 'R'];
  const effectiveScale = Math.max(0.2, Math.min(1.4, s.detectedGlobalScale + s.hudScaleManualDelta));
  const scaleCss = (0.65 + 0.35 * Math.min(1.0, effectiveScale)).toFixed(2);
  const bottomPx = Math.round(42 + 38 * effectiveScale);

  return `
  <div class="fixed left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 select-none transition-all duration-300"
       style="bottom: ${bottomPx}px; transform: translateX(-50%) scale(${scaleCss}); transform-origin: bottom center;">
    <div class="flex items-center gap-2 rounded-full border border-gold/50 bg-[#08090c]/95 px-3 py-1 backdrop-blur-md shadow-[0_6px_24px_rgba(0,0,0,0.85)]">
      <img src="${champImg(s.myChampId)}" class="w-4 h-4 rounded-full border border-gold" alt="" />
      <span class="text-[10.5px] font-extrabold text-ink">
        Nivel <b class="text-gold">${s.playerLevel}</b> ➔ Subir <b class="text-gold underline">${currentSkill}</b>
      </span>
      <span class="text-[10px] font-bold text-ink-dim border-l border-line pl-2">Max: ${esc(b.abilityOrder.priorityStr)}</span>
      <div class="flex items-center gap-0.5 border-l border-line pl-1.5">
        <button class="px-1 text-[11px] font-bold text-ink-mute hover:text-ink cursor-pointer" data-action="level-down">−</button>
        <button class="px-1 text-[11px] font-bold text-ink-mute hover:text-ink cursor-pointer" data-action="level-up">+</button>
      </div>
    </div>

    <!-- Las 4 Cajas Q W E R alineadas con el HUD -->
    <div class="grid grid-cols-4 gap-2.5 rounded-2xl border border-line-strong bg-[#08090c]/92 px-3.5 py-2 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.95)]">
      ${keys
        .map((k) => {
          const isTarget = k === currentSkill;
          const isUlt = k === 'R';
          const pts = s.skillLevels[k] ?? 0;
          return `
          <div class="relative flex flex-col items-center justify-center w-14 h-12 rounded-xl border transition-all ${
            isTarget
              ? isUlt
                ? 'border-2 border-crimson bg-crimson/25 text-crimson shadow-[0_0_18px_rgba(255,46,77,0.6)] -translate-y-1'
                : 'border-2 border-gold bg-gold/25 text-gold shadow-[0_0_18px_rgba(240,180,41,0.6)] -translate-y-1'
              : 'border-line bg-surface/75 text-ink-mute opacity-70'
          }">
            ${
              isTarget
                ? `<span class="absolute -top-3.5 whitespace-nowrap rounded-full ${
                    isUlt ? 'bg-crimson text-white' : 'bg-gold text-canvas'
                  } px-2 py-0.5 text-[8.5px] font-black tracking-wider shadow animate-bounce">▲ SUBIR</span>`
                : ''
            }
            <span class="text-[16px] font-black leading-none mt-1">${k}</span>
            <span class="num font-mono text-[9px] font-bold opacity-80 mt-0.5">${pts > 0 ? `Nv.${pts}` : ''}</span>
          </div>`;
        })
        .join('')}
    </div>
  </div>`;
}

/* ─────────────────────────────────────────────────────────────
 * MONTAJE DEL COMPONENTE OVERLAY
 * ───────────────────────────────────────────────────────────── */
export function mountLiveOverlayView(root: HTMLElement, onOpenChange?: (open: boolean) => void) {
  const view = createView<State>({
    root,
    state: {
      open: false,
      activeTab: 'gamedata',
      showMiniItemWidget: true,
      corner: 'bottom-right',
      liveConnected: false,
      gameModeLabel: 'Modo Demo (Abre LoL para detectar en vivo)',
      mySide: 'blue',
      myChampId: 'Ashe',
      rivalChampId: 'Lucian',
      rivalSuppId: 'Thresh',
      role: 'adc',
      presetIdx: 0,
      buildPage: 1,
      playerLevel: 1,
      skillLevels: { Q: 0, W: 1, E: 0, R: 0 },
      currentGold: 450,
      ownedItemIds: [1055, 2003],
      manualItemStep: 1,
      gameTimeSec: 65,
      allies: [],
      enemies: [],
      detectedGlobalScale: 1.0,
      detectedMinimapScale: 1.0,
      detectedFlipMiniMap: false,
      hudScaleManualDelta: 0,
      importToast: null,
      transparentHudMode: false,
    },
    render: (s) => {
      const presets = getChampionBuildPresets(s.myChampId, s.rivalChampId, s.role);
      const activePreset = presets[s.presetIdx] || presets[0];

      return `
        <!-- 1. Mini-Widget de Objetos en la Esquina Inferior -->
        ${s.showMiniItemWidget ? renderMiniItemCornerWidget(s, activePreset) : ''}

        <!-- 2. Barra Central de Habilidades sobre el HUD (Q W E R) -->
        ${renderBottomAbilityHudBar(s, activePreset)}

        <!-- 3. Ventana Completa In-Game (~ o Alt+O) -->
        ${s.open ? renderFullInGameModal(s, activePreset) : ''}
      `;
    },
    actions: {
      'toggle-overlay': ({ state }) => {
        const next = !state.open;
        if (isTauri()) {
          void setOverlayAlwaysOnTop(next);
        }
        onOpenChange?.(next);
        return { open: next };
      },
      'set-tab': ({ data }) => ({ activeTab: data.id as InGameTab }),
      'next-build-page': ({ state }) => ({ buildPage: state.buildPage < 3 ? state.buildPage + 1 : 1 }),
      'prev-build-page': ({ state }) => ({ buildPage: state.buildPage > 1 ? state.buildPage - 1 : 3 }),
      'level-up': ({ state }) => ({ playerLevel: Math.min(18, state.playerLevel + 1) }),
      'level-down': ({ state }) => ({ playerLevel: Math.max(1, state.playerLevel - 1) }),
    },
  });

  // Atajo de teclado: ~ para abrir/ocultar ventana completa, Alt+O para alternar pestañas
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '~' || e.key === 'F1') {
      e.preventDefault();
      const next = !view.state.open;
      view.set({ open: next });
      if (isTauri()) {
        void setOverlayAlwaysOnTop(next);
      }
      onOpenChange?.(next);
    } else if (e.altKey && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault();
      if (!view.state.open) {
        view.set({ open: true });
        if (isTauri()) {
          void setOverlayAlwaysOnTop(true);
        }
        onOpenChange?.(true);
      } else {
        const nextTab: InGameTab = view.state.activeTab === 'gamedata' ? 'scouting' : 'gamedata';
        view.set({ activeTab: nextTab });
      }
    } else if (e.key === 'Escape' && view.state.open) {
      view.set({ open: false });
      if (isTauri()) {
        void setOverlayAlwaysOnTop(false);
      }
      onOpenChange?.(false);
    }
  });

  // Sondeo continuo cada 1.2s para conectar con LoL Live Client en vivo
  async function pollClient() {
    try {
      const resp = await fetch('/lol-live', { cache: 'no-store' });
      if (!resp.ok) return;
      const payload = await resp.json();
      if (!payload?.connected || !payload?.data) return;

      const d = payload.data;
      const activePlayer = d.activePlayer ?? {};
      const allPlayers: any[] = Array.isArray(d.allPlayers) ? d.allPlayers : [];
      const gameData = d.gameData ?? {};

      const activeName = (activePlayer.riotIdGameName || activePlayer.summonerName || '').toLowerCase();
      const meEntry =
        allPlayers.find((p) => {
          const pName = (p.riotIdGameName || p.summonerName || '').toLowerCase();
          return activeName && pName && (pName === activeName || activeName.includes(pName));
        }) || allPlayers[0];

      const myChampId = resolveChampId(meEntry?.rawChampionName || meEntry?.championName || 'Ashe');
      const myTeam = meEntry?.team === 'CHAOS' ? 'CHAOS' : 'ORDER';
      const detectedRole = mapRiotPositionToRole(meEntry?.position, myChampId);

      const ownedItemIds: number[] = Array.isArray(meEntry?.items)
        ? meEntry.items.map((it: any) => Number(it.itemID)).filter((n: number) => n > 0)
        : [];

      const ab = activePlayer.abilities ?? {};
      const skillLevels = {
        Q: Number(ab.Q?.abilityLevel ?? 0),
        W: Number(ab.W?.abilityLevel ?? 0),
        E: Number(ab.E?.abilityLevel ?? 0),
        R: Number(ab.R?.abilityLevel ?? 0),
      };

      const playerLevel = Math.max(1, Math.min(18, Number(activePlayer.level || meEntry?.level || 1)));
      const currentGold = Math.floor(Number(activePlayer.currentGold ?? 0));
      const gameTimeSec = Math.floor(Number(gameData.gameTime ?? 0));

      const rawEnemies = allPlayers.filter((p) => p.team && p.team !== myTeam);
      const enemyList = rawEnemies.map((p, idx) => {
        const cId = resolveChampId(p.rawChampionName || p.championName);
        return {
          champId: cId,
          name: p.riotIdGameName || p.summonerName || cId,
          role: mapRiotPositionToRole(p.position, cId) || ROLES[idx % 5],
          ultCooldown: 0,
          ultBaseCooldown: 75,
        };
      });

      const rivalInMyLane = enemyList.find((e) => e.role === detectedRole)?.champId || 'Lucian';

      view.set({
        liveConnected: true,
        myChampId,
        rivalChampId: rivalInMyLane,
        role: detectedRole,
        playerLevel,
        skillLevels,
        currentGold,
        ownedItemIds,
        gameTimeSec,
        enemies: enemyList,
      });
    } catch {
      // ignore
    }
  }

  window.setInterval(pollClient, 1200);
  pollClient();

  return {
    toggle: () => {
      const next = !view.state.open;
      view.set({ open: next });
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
