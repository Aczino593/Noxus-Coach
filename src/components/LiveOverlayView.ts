import { createView } from '../lib/view';
import { esc, roleImg } from '../lib/ui';
import { champImg, itemImg, mapImg } from '../lib/assets';
import { item as itemData } from '../data/items';
import { itemCost } from '../data/itemGuide';
import { CHAMPIONS, CHAMP_BY_ID } from '../data/champions';
import { VISION_SPOTS, type VisionSpot } from '../data/visionSpots';
import { ROLES, type Role } from '../types';
import { getChampionBuildPresets, type BuildPreset } from '../lib/buildEngine';
import { isTauri, setOverlayAlwaysOnTop } from '../lib/tauri';
import { fetchHudSettings, importBuildToClient, importRunesToClient } from '../lib/lcuClient';

/* ─────────────────────────────────────────────────────────────
 * TIPOS Y ESTADO DEL OVERLAY IN-GAME CONECTADO A LOL (127.0.0.1:2999)
 * ───────────────────────────────────────────────────────────── */
export type OverlayCorner = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';

export interface LivePlayer {
  champId: string;
  name: string;
  role: Role;
  isMe?: boolean;
  ultCooldown: number;
  ultBaseCooldown: number;
}

interface WardToastData {
  spot: VisionSpot;
  phaseTitle: string;
  remainingSec: number; // Se oculta solo al llegar a 0
}

interface State {
  open: boolean;
  collapsed: boolean;
  transparentHudMode: boolean;
  corner: OverlayCorner;
  /** Estado de conexión en vivo con League of Legends (127.0.0.1:2999) */
  liveConnected: boolean;
  gameModeLabel: string;
  mySide: 'blue' | 'red';
  myChampId: string;
  rivalChampId: string;
  role: Role;
  presetIdx: number;
  playerLevel: number;
  skillLevels: { Q: number; W: number; E: number; R: number };
  currentGold: number;
  ownedItemIds: number[];
  manualItemStep: number;
  gameTimeSec: number;
  allies: LivePlayer[];
  enemies: LivePlayer[];
  /** Pequeña pestaña emergente de visión que dura 10 segundos y se cierra sola */
  wardToast: WardToastData | null;
  lastTriggeredWardPhase: string;
  detectedGlobalScale: number;
  detectedMinimapScale: number;
  detectedFlipMiniMap: boolean;
  hudScaleManualDelta: number;
  importToast: string | null;
}

const CORNER_CLASSES: Record<OverlayCorner, string> = {
  'top-right': 'top-14 right-4',
  'bottom-right': 'bottom-4 right-4',
  'top-left': 'top-14 left-4',
  'bottom-left': 'bottom-4 left-4',
};

/** Normaliza el nombre de campeón devuelto por Riot Live Client API (`rawChampionName` o `championName`) */
function resolveChampId(rawOrDisplay: string): string {
  if (!rawOrDisplay) return 'Ahri';
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
  // Si el usuario juega un campeón de Data Dragon fuera del subset base, respetamos su ID limpio
  if (/^[A-Za-z]+$/.test(cleaned)) return cleaned;
  return 'Ahri';
}

function mapRiotPositionToRole(pos: string | undefined, fallbackChampId: string): Role {
  const p = (pos || '').toUpperCase();
  if (p === 'TOP') return 'top';
  if (p === 'JUNGLE') return 'jungle';
  if (p === 'MIDDLE' || p === 'MID') return 'mid';
  if (p === 'BOTTOM' || p === 'BOT') return 'adc';
  if (p === 'UTILITY' || p === 'SUPPORT') return 'support';

  const champ = CHAMP_BY_ID[fallbackChampId];
  return champ?.roles?.[0] ?? 'mid';
}

/** Selecciona el spot de visión ideal según el minuto actual de la partida, tu rol y tu lado */
function pickContextualWardSpot(role: Role, side: 'blue' | 'red', gameTimeSec: number): { spot: VisionSpot; phaseTitle: string } {
  const roleSpots = VISION_SPOTS.filter((sp) => sp.role === role && sp.side === side);
  const pool = roleSpots.length > 0 ? roleSpots : VISION_SPOTS.filter((sp) => sp.role === 'mid' && sp.side === side);

  if (gameTimeSec < 130) {
    // Min 00:00 - 02:10: Ward inicial de salida / Pixel Bush o Raptors
    const early = pool.find((s) => s.phase === 'early' && s.type === 'trinket') || pool[0];
    return { spot: early, phaseTitle: '01:15 · Ward Inicial Antirrotación' };
  }
  if (gameTimeSec < 220) {
    // Min 02:10 - 03:40: Ventana del primer Gank Nv. 3 / Escurridizo
    const gank = pool.filter((s) => s.phase === 'early')[1] || pool[0];
    return { spot: gank, phaseTitle: '02:30 · Alerta de Primer Gank (Nv. 3)' };
  }
  if (gameTimeSec < 540) {
    // Min 03:40 - 09:00: Pink Ward defensivo / Control de primer objetivo
    const pink = pool.find((s) => s.type === 'control') || pool[2] || pool[0];
    return { spot: pink, phaseTitle: '04:30+ · Coloca tu Pink Ward (75g)' };
  }
  // Mid / Late Game: Control de Objetivos y Jungla Profunda
  const midLate = pool.find((s) => s.phase === 'midgame' || s.phase === 'objective') || pool[pool.length - 1];
  return { spot: midLate, phaseTitle: 'Control de Río y Objetivos' };
}

export function mountLiveOverlayView(root: HTMLElement, onOpenChange?: (open: boolean) => void) {
  let pipWindow: Window | null = null;

  const view = createView<State>({
    root,
    state: {
      open: false,
      collapsed: false,
      transparentHudMode: false,
      corner: 'top-right',
      liveConnected: false,
      gameModeLabel: 'Modo Demo (Abre LoL para detectar en vivo)',
      mySide: 'blue',
      myChampId: 'Ahri',
      rivalChampId: 'Sylas',
      role: 'mid',
      presetIdx: 0,
      playerLevel: 3,
      skillLevels: { Q: 2, W: 1, E: 0, R: 0 },
      currentGold: 650,
      ownedItemIds: [1056, 2003],
      manualItemStep: 1,
      gameTimeSec: 145,
      allies: [
        { champId: 'Ornn', name: 'Top', role: 'top', ultCooldown: 0, ultBaseCooldown: 90 },
        { champId: 'Viego', name: 'Jungla', role: 'jungle', ultCooldown: 0, ultBaseCooldown: 70 },
        { champId: 'Ahri', name: 'Tú', role: 'mid', isMe: true, ultCooldown: 0, ultBaseCooldown: 80 },
        { champId: 'Jinx', name: 'ADC', role: 'adc', ultCooldown: 0, ultBaseCooldown: 70 },
        { champId: 'Lulu', name: 'Support', role: 'support', ultCooldown: 0, ultBaseCooldown: 80 },
      ],
      enemies: [
        { champId: 'Aatrox', name: 'Top Rival', role: 'top', ultCooldown: 0, ultBaseCooldown: 80 },
        { champId: 'LeeSin', name: 'Jg Rival', role: 'jungle', ultCooldown: 0, ultBaseCooldown: 60 },
        { champId: 'Sylas', name: 'Mid Rival', role: 'mid', ultCooldown: 0, ultBaseCooldown: 60 },
        { champId: 'Draven', name: 'ADC Rival', role: 'adc', ultCooldown: 0, ultBaseCooldown: 75 },
        { champId: 'Thresh', name: 'Sup Rival', role: 'support', ultCooldown: 0, ultBaseCooldown: 80 },
      ],
      wardToast: null,
      lastTriggeredWardPhase: '',
      detectedGlobalScale: 1.0,
      detectedMinimapScale: 1.0,
      detectedFlipMiniMap: false,
      hudScaleManualDelta: 0,
      importToast: null,
    },
    render: (s) => {
      if (!s.open) return '';

      const presets = getChampionBuildPresets(s.myChampId, s.rivalChampId, s.role);
      const activePreset = presets[s.presetIdx] || presets[0];
      const posClass = CORNER_CLASSES[s.corner];

      if (s.collapsed) {
        const currentSkill = activePreset.abilityOrder.levels[s.playerLevel - 1] || 'Q';
        return `
        <aside class="fixed ${posClass} z-50 flex items-center gap-2.5 rounded-full border border-crimson/70 bg-canvas/95 px-3.5 py-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.9)]">
          <span class="relative flex h-2.5 w-2.5">
            <span class="absolute inset-0 rounded-full ${s.liveConnected ? 'bg-win' : 'bg-gold'} opacity-75 animate-ping"></span>
            <span class="relative h-2.5 w-2.5 rounded-full ${s.liveConnected ? 'bg-win' : 'bg-gold'}"></span>
          </span>
          <img src="${champImg(s.myChampId)}" class="h-6 w-6 rounded-full border border-gold object-cover" alt="" />
          <span class="text-[11.5px] font-extrabold text-ink">Nv.${s.playerLevel} <b class="text-gold">+${currentSkill}</b></span>
          <span class="num font-mono text-[11px] text-ink-dim">${formatTime(s.gameTimeSec)}</span>
          <button class="btn btn-sm !h-6 !px-2 !text-[10px]" data-action="toggle-collapse">Expandir</button>
          <button class="text-ink-mute hover:text-ink text-[12px] px-1" data-action="close-overlay" title="Cerrar Overlay (Alt+O)">✕</button>
        </aside>
        ${renderBottomAbilityHudBar(s, activePreset)}
        ${s.wardToast ? renderTemporaryWardToast(s.wardToast, s.detectedFlipMiniMap) : ''}`;
      }

      return `
      <!-- 1. PANEL COMPACTO DE OBJETOS Y MATCHUP (ESQUINA) -->
      <aside class="fixed ${posClass} z-50 w-[355px] max-w-[calc(100vw-2rem)] rounded-2xl border border-line-strong bg-[#0a0b0f]/95 backdrop-blur-xl shadow-[0_14px_48px_rgba(0,0,0,0.92)] text-ink overflow-hidden select-none">
        <!-- Cabecera de Estado en Vivo -->
        <div class="flex items-center justify-between gap-2 border-b border-line bg-surface/95 px-3 py-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="relative flex h-2.5 w-2.5 flex-none">
              <span class="absolute inset-0 rounded-full ${s.liveConnected ? 'bg-win' : 'bg-gold'} opacity-75 animate-ping"></span>
              <span class="relative h-2.5 w-2.5 rounded-full ${s.liveConnected ? 'bg-win' : 'bg-gold'}"></span>
            </span>
            <span class="text-[10.5px] font-black tracking-wider truncate ${s.liveConnected ? 'text-win' : 'text-ink'}">
              ${s.liveConnected ? 'LOL CONECTADO EN VIVO' : 'NOXUS OVERLAY'}
            </span>
            <span class="chip chip-gold !py-0 !px-1.5 !text-[9.5px] num font-mono flex-none">${formatTime(s.gameTimeSec)}</span>
          </div>

          <!-- Esquinas y Controles -->
          <div class="flex items-center gap-1 flex-none">
            <div class="flex items-center rounded-md border border-line bg-canvas/80 p-0.5 mr-0.5" title="Cambiar esquina">
              <button class="px-1 py-0.5 text-[9px] rounded ${s.corner === 'top-left' ? 'bg-crimson text-white font-bold' : 'text-ink-mute hover:text-ink'}" data-action="set-corner" data-id="top-left">↖</button>
              <button class="px-1 py-0.5 text-[9px] rounded ${s.corner === 'top-right' ? 'bg-crimson text-white font-bold' : 'text-ink-mute hover:text-ink'}" data-action="set-corner" data-id="top-right">↗</button>
              <button class="px-1 py-0.5 text-[9px] rounded ${s.corner === 'bottom-left' ? 'bg-crimson text-white font-bold' : 'text-ink-mute hover:text-ink'}" data-action="set-corner" data-id="bottom-left">↙</button>
              <button class="px-1 py-0.5 text-[9px] rounded ${s.corner === 'bottom-right' ? 'bg-crimson text-white font-bold' : 'text-ink-mute hover:text-ink'}" data-action="set-corner" data-id="bottom-right">↘</button>
            </div>
            <button class="flex h-5 w-5 items-center justify-center rounded text-ink-mute hover:bg-surface-2 hover:text-ink text-[11px]" data-action="toggle-collapse" title="Minimizar">—</button>
            <button class="flex h-5 w-5 items-center justify-center rounded text-ink-mute hover:bg-crimson/20 hover:text-crimson text-[11px]" data-action="close-overlay" title="Cerrar (Alt+O)">✕</button>
          </div>
        </div>

        <div class="p-3 space-y-2.5">
          <!-- Barra de Superposición sobre LoL + Disparador de Pestaña de Ward -->
          <div class="flex items-center justify-between gap-1.5">
            ${
              isTauri()
                ? `<button type="button" class="flex-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition-all ${
                    s.transparentHudMode
                      ? 'border-win bg-win/20 text-win'
                      : 'border-line bg-canvas/80 text-ink-dim hover:text-ink'
                  }" data-action="toggle-transparent-hud" title="Hace transparente el fondo de la app y la mantiene siempre encima del LoL">
                    ${s.transparentHudMode ? '🟢 Fondo Transparente Activo' : '🪟 Superponer sobre LoL'}
                  </button>`
                : `<button type="button" class="flex-1 rounded-lg border border-gold/40 bg-gold/10 hover:bg-gold/20 px-2 py-1 text-[10px] font-bold text-gold transition-all" data-action="open-pip-overlay" title="Abre una mini-ventana Siempre Visible que flota encima del League of Legends (Modo Ventana Sin Bordes)">
                    📌 Flotar encima del LoL
                  </button>`
            }
            <button type="button" class="rounded-lg border border-crimson/50 bg-crimson/15 hover:bg-crimson/25 px-2.5 py-1 text-[10px] font-bold text-crimson transition-all flex items-center gap-1" data-action="trigger-ward-toast" title="Muestra por 10 segundos la pestaña de dónde wardear en tu línea">
              <span>👁 Dónde Wardear (10s)</span>
            </button>
          </div>

          <!-- DETECCIÓN DE CAMPEÓN PROPIO Y RIVAL + LÍNEA -->
          ${renderDetectedMatchupCard(s)}

          <!-- CAMINO DE OBJETOS CHICO (SOLO ICONOS ENCADENADOS) -->
          ${renderCompactItemPathWidget(s, activePreset, presets)}
        </div>
      </aside>

      <!-- 2. INDICADOR CENTRAL ARRIBA DE LAS HABILIDADES DEL LOL (Q / W / E / R) -->
      ${renderBottomAbilityHudBar(s, activePreset)}

      <!-- 3. PEQUEÑA PESTAÑA TEMPORAL (10s) QUE INDICA DÓNDE WARDEAR Y DESAPARECE SOLA -->
      ${s.wardToast ? renderTemporaryWardToast(s.wardToast, s.detectedFlipMiniMap) : ''}`;
    },
    actions: {
      'set-corner': ({ data }) => ({ corner: data.id as OverlayCorner }),
      'toggle-collapse': ({ state }) => ({ collapsed: !state.collapsed }),
      'close-overlay': () => {
        applyTransparentBackground(false);
        setOverlayAlwaysOnTop(false);
        onOpenChange?.(false);
        return { open: false, transparentHudMode: false };
      },
      'toggle-transparent-hud': ({ state }) => {
        const next = !state.transparentHudMode;
        applyTransparentBackground(next);
        setOverlayAlwaysOnTop(next);
        return { transparentHudMode: next };
      },
      'open-pip-overlay': () => {
        openAlwaysOnTopPiPWindow();
      },
      role: ({ data, state }) => {
        const nextRole = data.id as Role;
        const { spot, phaseTitle } = pickContextualWardSpot(nextRole, state.mySide, state.gameTimeSec);
        return {
          role: nextRole,
          presetIdx: 0,
          wardToast: { spot, phaseTitle, remainingSec: 10 },
        };
      },
      preset: ({ data }) => ({ presetIdx: Number(data.idx) || 0 }),
      'level-up': ({ state }) => ({ playerLevel: Math.min(18, state.playerLevel + 1) }),
      'level-down': ({ state }) => ({ playerLevel: Math.max(1, state.playerLevel - 1) }),
      'select-item-step': ({ data }) => ({ manualItemStep: Number(data.idx) || 0 }),
      'trigger-ward-toast': ({ state }) => {
        const { spot, phaseTitle } = pickContextualWardSpot(state.role, state.mySide, state.gameTimeSec);
        return {
          wardToast: {
            spot,
            phaseTitle,
            remainingSec: 10,
          },
        };
      },
      'dismiss-ward-toast': () => ({ wardToast: null }),
      'hud-scale-down': ({ state }) => ({
        hudScaleManualDelta: Math.max(-0.6, state.hudScaleManualDelta - 0.05),
      }),
      'hud-scale-up': ({ state }) => ({
        hudScaleManualDelta: Math.min(0.6, state.hudScaleManualDelta + 0.05),
      }),
      'quick-import-lol': async ({ state, view: v }) => {
        const presets = getChampionBuildPresets(state.myChampId, state.rivalChampId, state.role);
        const activePreset = presets[state.presetIdx] || presets[0];

        v.set({ importToast: 'Importando...' });
        try {
          const bRes = await importBuildToClient(state.myChampId, activePreset);
          const rRes = await importRunesToClient(activePreset.runes, state.myChampId, activePreset.label);
          const msg =
            rRes.success && bRes.success
              ? '✓ Runas y Build en LoL'
              : bRes.success
                ? '✓ Build en Tienda LoL'
                : rRes.message || bRes.message;
          v.set({ importToast: msg });
          setTimeout(() => {
            if (v.state.importToast === msg) v.set({ importToast: null });
          }, 5000);
        } catch {
          v.set({ importToast: 'Error al importar' });
        }
        return {};
      },
    },
    changes: {
      'my-champ': ({ value, view: v }) => {
        const role = mapRiotPositionToRole('', value);
        v.set({ myChampId: value, role, presetIdx: 0 });
      },
      'rival-champ': ({ value, view: v }) => {
        v.set({ rivalChampId: value, presetIdx: 0 });
      },
    },
  });

  /** Abre una mini-ventana Always-On-Top real usando Document Picture-in-Picture (Chrome/Edge) */
  async function openAlwaysOnTopPiPWindow() {
    const anyWin = window as any;
    if (!anyWin.documentPictureInPicture) {
      alert(
        'Para superponer en pantalla completa usa Chrome/Edge o ejecuta la app con Tauri. Asegúrate de que League of Legends esté en modo "Sin Bordes" (Borderless).',
      );
      return;
    }
    try {
      pipWindow = await anyWin.documentPictureInPicture.requestWindow({
        width: 380,
        height: 360,
      });
      if (!pipWindow) return;
      // Copiar hojas de estilo al mini-HUD flotante Always-On-Top
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
        pipWindow!.document.head.appendChild(node.cloneNode(true));
      });
      pipWindow.document.body.style.background = '#08090c';
      pipWindow.document.body.style.color = '#f3ece2';
      pipWindow.document.body.style.margin = '0';
      pipWindow.document.body.style.padding = '10px';
      pipWindow.document.body.style.fontFamily = 'Inter, sans-serif';
      renderPiPContent();

      pipWindow.addEventListener('pagehide', () => {
        pipWindow = null;
      });
    } catch {
      // Usuario canceló PiP
    }
  }

  function renderPiPContent() {
    if (!pipWindow || pipWindow.closed) return;
    const s = view.state;
    const presets = getChampionBuildPresets(s.myChampId, s.rivalChampId, s.role);
    const activePreset = presets[s.presetIdx] || presets[0];
    const currentSkill = activePreset.abilityOrder.levels[s.playerLevel - 1] || 'Q';
    const { spot, phaseTitle } = pickContextualWardSpot(s.role, s.mySide, s.gameTimeSec);

    pipWindow.document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;user-select:none;">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #262936;padding-bottom:6px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:8px;height:8px;border-radius:999px;background:${s.liveConnected ? '#2dc98a' : '#f0b429'};display:inline-block;"></span>
            <strong style="font-size:11px;letter-spacing:0.05em;">${s.liveConnected ? 'LOL EN VIVO DETECTADO' : 'NOXUS MINI-HUD'}</strong>
          </div>
          <span style="font-family:monospace;font-size:11px;color:#f0b429;font-weight:800;">${formatTime(s.gameTimeSec)} · Nv.${s.playerLevel} (${s.currentGold}g)</span>
        </div>

        <!-- Habilidad a subir ahora mismo -->
        <div style="background:#12141c;border:1px solid #f0b42988;border-radius:10px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="${champImg(s.myChampId)}" style="width:28px;height:28px;border-radius:999px;border:1.5px solid #f0b429;" />
            <div>
              <div style="font-size:10px;color:#9ca3af;">SUBIR EN NIVEL ${s.playerLevel}</div>
              <div style="font-size:14px;font-weight:900;color:#f0b429;">▲ SUBIR TECLA [ ${currentSkill} ]</div>
            </div>
          </div>
          <div style="font-size:10px;color:#d1d5db;font-weight:700;">Max: ${esc(activePreset.abilityOrder.priorityStr)}</div>
        </div>

        <!-- Camino de Objetos (Solo iconos) -->
        <div style="background:#12141c;border:1px solid #262936;border-radius:10px;padding:8px 10px;">
          <div style="font-size:10px;color:#9ca3af;font-weight:800;margin-bottom:6px;text-transform:uppercase;">
            Camino de Objetos (${esc(s.myChampId)} vs ${esc(s.rivalChampId)})
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
            ${getOrderedBuildItems(activePreset)
              .map((id, idx) => {
                const owned = s.ownedItemIds.includes(id);
                return `<div style="position:relative;">
                  <img src="${itemImg(id)}" style="width:34px;height:34px;border-radius:6px;border:${
                    owned ? '2px solid #2dc98a' : idx === s.manualItemStep ? '2px solid #f0b429' : '1px solid #333'
                  };opacity:${owned ? '0.55' : '1'};" title="${esc(itemData(id).name)} (${itemCost(id)}g)" />
                  ${owned ? '<span style="position:absolute;top:-4px;right:-4px;background:#2dc98a;color:#000;font-size:9px;font-weight:900;border-radius:999px;padding:0 3px;">✓</span>' : ''}
                </div>`;
              })
              .join('<span style="color:#6b7280;font-size:10px;">➔</span>')}
          </div>
        </div>

        <!-- Consejo de Ward actual -->
        <div style="background:#12141c;border:1px solid #ff2e4d66;border-radius:10px;padding:8px 10px;">
          <div style="font-size:10px;color:#ff2e4d;font-weight:800;text-transform:uppercase;">👁 ${esc(phaseTitle)}</div>
          <div style="font-size:11.5px;font-weight:800;color:#f3ece2;margin-top:2px;">Wardear: ${esc(spot.title)}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${esc(spot.tacticalAdvice)}</div>
        </div>
      </div>
    `;
  }

  /**
   * SONDEO EN TIEMPO REAL DE LEAGUE OF LEGENDS (`https://127.0.0.1:2999/liveclientdata/allgamedata` vía `/lol-live`)
   * Funciona automáticamente al entrar a una Partida de Entrenamiento o Partida Normal/Clasificatoria.
   */
  async function pollLiveLeagueClient() {
    try {
      const resp = await fetch('/lol-live', { cache: 'no-store' });
      if (!resp.ok) return;
      const payload = await resp.json();

      if (!payload?.connected || !payload?.data) {
        if (view.state.liveConnected) {
          view.set({
            liveConnected: false,
            gameModeLabel: 'Modo Demo (Abre una partida en LoL para detectar en vivo)',
          });
        }
        return;
      }

      const d = payload.data;
      const activePlayer = d.activePlayer ?? {};
      const allPlayers: any[] = Array.isArray(d.allPlayers) ? d.allPlayers : [];
      const gameData = d.gameData ?? {};

      // Identificar al jugador activo en `allPlayers`
      const activeName = (activePlayer.riotIdGameName || activePlayer.summonerName || '').toLowerCase();
      const meEntry =
        allPlayers.find((p) => {
          const pName = (p.riotIdGameName || p.summonerName || '').toLowerCase();
          return activeName && pName && (pName === activeName || activeName.includes(pName));
        }) || allPlayers[0];

      const myChampId = resolveChampId(meEntry?.rawChampionName || meEntry?.championName || 'Ahri');
      const myTeam = meEntry?.team === 'CHAOS' ? 'CHAOS' : 'ORDER';
      const mySide: 'blue' | 'red' = myTeam === 'CHAOS' ? 'red' : 'blue';
      const detectedRole = mapRiotPositionToRole(meEntry?.position, myChampId);

      // Objetos comprados actualmente en el inventario del jugador en LoL
      const ownedItemIds: number[] = Array.isArray(meEntry?.items)
        ? meEntry.items.map((it: any) => Number(it.itemID)).filter((n: number) => n > 0)
        : [];

      // Niveles reales de habilidades Q, W, E, R desde el cliente de LoL
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

      // Detectar campeones enemigos en la partida (filtrando muñecos de práctica si hay bots reales)
      const rawEnemies = allPlayers.filter((p) => p.team && p.team !== myTeam);
      const realEnemies = rawEnemies.filter((p) => !String(p.rawChampionName || '').includes('TargetDummy'));
      const enemyList = (realEnemies.length > 0 ? realEnemies : rawEnemies).map((p, idx) => {
        const cId = resolveChampId(p.rawChampionName || p.championName);
        return {
          champId: cId,
          name: p.riotIdGameName || p.summonerName || cId,
          role: mapRiotPositionToRole(p.position, cId) || ROLES[idx % 5],
          ultCooldown: 0,
          ultBaseCooldown: 75,
        };
      });

      const rivalInMyLane =
        enemyList.find((e) => e.role === detectedRole)?.champId ||
        enemyList[0]?.champId ||
        view.state.rivalChampId;

      // Calcular el siguiente ítem del camino según los ítems que ya compraste en la tienda del LoL
      const presets = getChampionBuildPresets(myChampId, rivalInMyLane, detectedRole);
      const activePreset = presets[view.state.presetIdx] || presets[0];
      const buildSteps = getOrderedBuildItems(activePreset);
      const firstUnownedIdx = buildSteps.findIndex((itemId) => !ownedItemIds.includes(itemId));
      const nextStepIdx = firstUnownedIdx === -1 ? buildSteps.length - 1 : firstUnownedIdx;

      // Disparar automáticamente la pequeña pestaña de "Dónde Wardear" (10s) al entrar a partida o en ventanas clave
      let nextToast = view.state.wardToast;
      let nextPhaseKey = view.state.lastTriggeredWardPhase;

      const phaseTrigger =
        !view.state.liveConnected
          ? 'connect'
          : gameTimeSec >= 70 && gameTimeSec <= 85
            ? 'early-0115'
            : gameTimeSec >= 140 && gameTimeSec <= 155
              ? 'gank-0225'
              : gameTimeSec >= 270 && gameTimeSec <= 285
                ? 'pink-0430'
                : '';

      if (phaseTrigger && phaseTrigger !== view.state.lastTriggeredWardPhase) {
        const { spot, phaseTitle } = pickContextualWardSpot(detectedRole, mySide, gameTimeSec);
        nextToast = { spot, phaseTitle, remainingSec: 10 };
        nextPhaseKey = phaseTrigger;
      }

      // Si es la primera vez que detecta la partida en vivo, abrimos el Overlay automáticamente
      const shouldAutoOpen = !view.state.liveConnected ? true : view.state.open;
      if (!view.state.liveConnected && shouldAutoOpen) {
        onOpenChange?.(true);
      }

      view.set({
        open: shouldAutoOpen,
        liveConnected: true,
        gameModeLabel: gameData.gameMode === 'PRACTICETOOL' ? 'Partida de Entrenamiento' : 'Partida en Vivo',
        mySide,
        myChampId,
        rivalChampId: rivalInMyLane,
        role: view.state.liveConnected ? view.state.role : detectedRole,
        playerLevel,
        skillLevels,
        currentGold,
        ownedItemIds,
        manualItemStep: nextStepIdx,
        gameTimeSec,
        enemies: enemyList.length > 0 ? enemyList : view.state.enemies,
        wardToast: nextToast,
        lastTriggeredWardPhase: nextPhaseKey,
      });

      renderPiPContent();
    } catch {
      // Silencioso si el servidor no responde
    }
  }

  // Sondeo continuo cada 1.2 segundos para detectar League of Legends al instante
  window.setInterval(pollLiveLeagueClient, 1200);
  pollLiveLeagueClient();

  // Detección de escala del HUD y minimapa (GlobalScale, FlipMiniMap) desde la configuración de LoL
  const checkHud = () => {
    fetchHudSettings().then((hud) => {
      if (hud.connected) {
        view.set({
          detectedGlobalScale: hud.globalScale,
          detectedMinimapScale: hud.minimapScale,
          detectedFlipMiniMap: hud.flipMiniMap,
        });
      }
    });
  };
  checkHud();

  let hudCheckCount = 0;

  // Reloj de 1 segundo para descontar el Toast temporal de Visión (10s -> 0s y desaparece)
  window.setInterval(() => {
    const s = view.state;
    if (!s.open) return;

    hudCheckCount++;
    if (hudCheckCount % 8 === 0) {
      checkHud();
    }

    let nextToast = s.wardToast;
    if (nextToast) {
      if (nextToast.remainingSec <= 1) {
        nextToast = null;
      } else {
        nextToast = { ...nextToast, remainingSec: nextToast.remainingSec - 1 };
      }
    }

    if (!s.liveConnected) {
      view.set({
        gameTimeSec: s.gameTimeSec + 1,
        wardToast: nextToast,
      });
    } else if (nextToast !== s.wardToast) {
      view.set({ wardToast: nextToast });
    }
    renderPiPContent();
  }, 1000);

  return {
    toggle: () => {
      const next = !view.state.open;
      if (next && !view.state.wardToast) {
        const { spot, phaseTitle } = pickContextualWardSpot(
          view.state.role,
          view.state.mySide,
          view.state.gameTimeSec,
        );
        view.set({
          open: true,
          collapsed: false,
          wardToast: { spot, phaseTitle, remainingSec: 10 },
        });
      } else {
        if (!next) {
          applyTransparentBackground(false);
          setOverlayAlwaysOnTop(false);
        }
        view.set({ open: next, collapsed: false, transparentHudMode: false });
      }
      onOpenChange?.(next);
      return next;
    },
    setOpen: (open: boolean) => {
      if (!open) {
        applyTransparentBackground(false);
        setOverlayAlwaysOnTop(false);
      }
      view.set({ open });
      onOpenChange?.(open);
    },
    isOpen: () => view.state.open,
  };
}

function applyTransparentBackground(transparent: boolean) {
  if (transparent) {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    const mainEl = document.querySelector('#view-host') as HTMLElement | null;
    if (mainEl) mainEl.style.opacity = '0.08';
  } else {
    document.documentElement.style.background = '';
    document.body.style.background = '';
    const mainEl = document.querySelector('#view-host') as HTMLElement | null;
    if (mainEl) mainEl.style.opacity = '1';
  }
}

/* ─────────────────────────────────────────────────────────────
 * SUB-COMPONENTES FUNDAMENTALES DEL OVERLAY
 * ───────────────────────────────────────────────────────────── */

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getOrderedBuildItems(b: BuildPreset): number[] {
  const raw = [
    b.starterItems[0]?.item || 1056,
    b.earlyItems[0]?.item || 3802,
    b.coreItems[1]?.item || 3020,
    b.fullBuild[0] || 3118,
    b.fullBuild[2] || 4645,
    b.fullBuild[3] || 3157,
    b.fullBuild[4] || 3089,
  ];
  // Evitar cualquier ítem duplicado en el camino
  return Array.from(new Set(raw));
}

/** Tarjeta compacta con el Campeón Detectado + Enemigo y selector rápido para modo entrenamiento */
function renderDetectedMatchupCard(s: State): string {
  const allChamps = CHAMPIONS.slice().sort((a, b) => a.name.localeCompare(b.name));

  return `
  <div class="rounded-xl border border-line bg-surface/75 p-2.5 space-y-2">
    <div class="flex items-center justify-between gap-1.5">
      <span class="text-[10px] font-bold text-ink-dim truncate">${esc(s.gameModeLabel)}</span>
      <div class="flex items-center gap-1.5">
        ${
          s.importToast
            ? `<span class="chip chip-win !py-0 !px-1.5 text-[9px] font-bold animate-fade-in">${esc(s.importToast)}</span>`
            : `<button class="btn btn-sm btn-light !h-5 !px-2 !text-[9.5px] font-bold flex items-center gap-1 shadow-sm" data-action="quick-import-lol" title="Equipa las runas y exporta la build a la tienda del LoL">
                 <span>⚡ Importar a LoL</span>
               </button>`
        }
      </div>
    </div>

    <!-- Selección de Línea -->
    <div class="flex items-center justify-between gap-1 pt-1 border-t border-line/50">
      <span class="text-[9.5px] font-bold uppercase text-ink-mute">Línea de Juego:</span>
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

    <!-- Tu Campeón vs Campeón Rival (Auto-detectado en partida o seleccionable en Práctica) -->
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg bg-canvas/85 p-2 border border-line/80">
      <div class="flex items-center gap-2 min-w-0">
        <img src="${champImg(s.myChampId)}" class="w-8 h-8 rounded-full border-2 border-win object-cover flex-none" alt="" />
        <div class="min-w-0 flex-1">
          <div class="text-[9px] font-bold uppercase text-win">Tu Campeón</div>
          <select class="w-full bg-transparent text-[11.5px] font-extrabold text-ink focus:outline-none truncate cursor-pointer" data-change="my-champ">
            ${allChamps.map((c) => `<option value="${c.id}" class="bg-canvas text-ink" ${c.id === s.myChampId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            ${!CHAMP_BY_ID[s.myChampId] ? `<option value="${esc(s.myChampId)}" class="bg-canvas text-ink" selected>${esc(s.myChampId)}</option>` : ''}
          </select>
        </div>
      </div>

      <span class="text-[10px] font-black text-crimson px-1">VS</span>

      <div class="flex items-center gap-2 min-w-0">
        <img src="${champImg(s.rivalChampId)}" class="w-8 h-8 rounded-full border-2 border-crimson object-cover flex-none" alt="" />
        <div class="min-w-0 flex-1">
          <div class="text-[9px] font-bold uppercase text-crimson">Rival Línea</div>
          <select class="w-full bg-transparent text-[11.5px] font-extrabold text-ink focus:outline-none truncate cursor-pointer" data-change="rival-champ">
            ${allChamps.map((c) => `<option value="${c.id}" class="bg-canvas text-ink" ${c.id === s.rivalChampId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            ${!CHAMP_BY_ID[s.rivalChampId] ? `<option value="${esc(s.rivalChampId)}" class="bg-canvas text-ink" selected>${esc(s.rivalChampId)}</option>` : ''}
          </select>
        </div>
      </div>
    </div>

    <!-- Retratos de los enemigos detectados en la partida -->
    <div class="flex items-center justify-between text-[10px] text-ink-dim px-0.5">
      <div class="flex items-center gap-1.5">
        <span class="text-[9.5px] font-bold text-ink-mute">Enemigos:</span>
        <div class="flex -space-x-1">
          ${s.enemies
            .slice(0, 5)
            .map(
              (e) =>
                `<img src="${champImg(e.champId)}" class="w-5 h-5 rounded-full border ${
                  e.champId === s.rivalChampId ? 'border-crimson scale-110 z-10' : 'border-line opacity-80'
                }" title="Enemigo detectado: ${esc(e.champId)}" alt="" />`,
            )
            .join('')}
        </div>
      </div>
      <span class="num font-mono text-[10.5px] font-extrabold text-gold">${s.currentGold}g en bolsa</span>
    </div>
  </div>`;
}

/** 1. Camino de Objetos Chico (Solo Iconos en camino secuencial, detectando compras reales del LoL) */
function renderCompactItemPathWidget(s: State, b: BuildPreset, presets: BuildPreset[]): string {
  const steps = getOrderedBuildItems(b);
  const activeIdx = Math.min(steps.length - 1, Math.max(0, s.manualItemStep));
  const activeItemId = steps[activeIdx] || steps[0];
  const activeItem = itemData(activeItemId);
  const activeCost = itemCost(activeItemId);
  const canAffordNow = s.currentGold >= activeCost && activeCost > 0;

  return `
  <section class="rounded-xl border border-line bg-surface/80 p-2.5 space-y-2">
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
      <span class="text-[10px] font-bold ${canAffordNow ? 'text-win animate-pulse' : 'text-gold'}">
        ${esc(activeItem.name.slice(0, 16))} (${activeCost}g)
      </span>
    </div>

    <!-- Fila horizontal compacta de SOLO ICONOS de objetos con flechas -->
    <div class="flex items-center justify-between gap-0.5 rounded-lg bg-canvas/95 px-2 py-2 border border-line/80">
      ${steps
        .map((id, i) => {
          const isOwnedInGame = s.ownedItemIds.includes(id);
          const isDone = isOwnedInGame || i < activeIdx;
          const isCurrent = i === activeIdx && !isOwnedInGame;
          const it = itemData(id);
          const cost = itemCost(id);
          return `
          <div class="flex items-center">
            <button type="button" class="relative group focus:outline-none" data-action="select-item-step" data-idx="${i}" title="${esc(it.name)} · ${cost} de oro">
              <img src="${itemImg(id)}" class="w-8 h-8 rounded-md object-contain transition-transform ${
                isCurrent
                  ? 'ring-2 ring-gold scale-110 shadow-[0_0_12px_rgba(240,180,41,0.75)]'
                  : isDone
                    ? 'opacity-45 grayscale-[35%] border border-win/70'
                    : 'opacity-85 border border-line hover:opacity-100'
              }" alt="${esc(it.name)}" />
              ${
                isDone
                  ? '<span class="absolute -top-1 -right-1 bg-win text-canvas rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-black">✓</span>'
                  : isCurrent
                    ? '<span class="absolute -top-1 -right-1 bg-gold text-canvas rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-black">★</span>'
                    : ''
              }
            </button>
            ${i < steps.length - 1 ? '<span class="text-[9px] text-ink-mute mx-0.5 opacity-60">➔</span>' : ''}
          </div>`;
        })
        .join('')}
    </div>

    ${
      canAffordNow
        ? `<div class="rounded-md bg-win/15 border border-win/40 px-2 py-1 text-[10px] font-bold text-win text-center">
            ✓ Tienes oro suficiente (${s.currentGold}g) para comprar ${esc(activeItem.name)}
          </div>`
        : ''
    }
  </section>`;
}

/**
 * 2. INDICADOR FUNDAMENTAL ARRIBA DE LAS HABILIDADES DEL LOL (PARTE INFERIOR CENTRAL)
 * Se posiciona exactamente encima de los botones Q, W, E, R del HUD de League of Legends,
 * adaptándose automáticamente a la escala de HUD del usuario (GlobalScale) y permitiendo ajuste fino.
 */
function renderBottomAbilityHudBar(s: State, b: BuildPreset): string {
  const currentSkill = b.abilityOrder.levels[s.playerLevel - 1] || 'Q';
  const keys: ('Q' | 'W' | 'E' | 'R')[] = ['Q', 'W', 'E', 'R'];

  const effectiveScale = Math.max(0.2, Math.min(1.4, s.detectedGlobalScale + s.hudScaleManualDelta));
  const scaleCss = (0.65 + 0.35 * Math.min(1.0, effectiveScale)).toFixed(2);
  const bottomPx = Math.round(42 + 38 * effectiveScale);

  return `
  <div class="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 select-none transition-all duration-300"
       style="bottom: ${bottomPx}px; transform: translateX(-50%) scale(${scaleCss}); transform-origin: bottom center;">
    <!-- Píldora superior de Nivel y Prioridad de Maxeo + Ajuste fino de HUD -->
    <div class="flex items-center gap-2 rounded-full border border-gold/50 bg-[#08090c]/95 px-3 py-1 backdrop-blur-md shadow-[0_6px_24px_rgba(0,0,0,0.85)]">
      <img src="${champImg(s.myChampId)}" class="w-4 h-4 rounded-full border border-gold" alt="" />
      <span class="text-[10.5px] font-extrabold text-ink">
        Nivel <b class="text-gold">${s.playerLevel}</b> ➔ Subir <b class="text-gold underline">${currentSkill}</b>
      </span>
      <span class="text-[10px] font-bold text-ink-dim border-l border-line pl-2">Max: ${esc(b.abilityOrder.priorityStr)}</span>
      <div class="flex items-center gap-0.5 border-l border-line pl-1.5">
        <button class="px-1 text-[11px] font-bold text-ink-mute hover:text-ink cursor-pointer" data-action="level-down" title="Bajar nivel manual">−</button>
        <button class="px-1 text-[11px] font-bold text-ink-mute hover:text-ink cursor-pointer" data-action="level-up" title="Subir nivel manual">+</button>
      </div>

      <!-- Ajuste fino de Escala HUD -->
      <div class="flex items-center gap-1 border-l border-line pl-2" title="Escala detectada del HUD de League of Legends">
        <span class="text-[8.5px] font-bold text-ink-mute uppercase">HUD:</span>
        <button class="h-4 w-4 rounded bg-canvas border border-line text-[10px] font-bold text-ink-dim hover:text-ink flex items-center justify-center cursor-pointer" data-action="hud-scale-down" title="Reducir escala del HUD">−</button>
        <span class="num font-mono text-[9.5px] font-extrabold text-gold">${Math.round(effectiveScale * 100)}%</span>
        <button class="h-4 w-4 rounded bg-canvas border border-line text-[10px] font-bold text-ink-dim hover:text-ink flex items-center justify-center cursor-pointer" data-action="hud-scale-up" title="Aumentar escala del HUD">+</button>
      </div>
    </div>

    <!-- Las 4 Cajas de Habilidad alineadas sobre el HUD de Q W E R de League of Legends -->
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

/**
 * 3. PEQUEÑA PESTAÑA EMERGENTE (TOAST TEMPORAL DE 10 SEGUNDOS) QUE INDICA DÓNDE WARDEAR
 * Aparece automáticamente por 10 segundos y luego se cierra sola para no estorbar en partida.
 * Si el jugador tiene FlipMiniMap activado, se ubica automáticamente en el lateral opuesto.
 */
function renderTemporaryWardToast(toast: WardToastData, flipMiniMap = false): string {
  const { spot, phaseTitle, remainingSec } = toast;
  const pct = Math.max(0, Math.min(100, (remainingSec / 10) * 100));
  const posClass = flipMiniMap ? 'bottom-44 left-4' : 'bottom-44 right-4';

  return `
  <div class="fixed ${posClass} z-50 w-[320px] rounded-2xl border-2 border-gold/70 bg-[#0a0c12]/95 backdrop-blur-xl shadow-[0_14px_40px_rgba(0,0,0,0.92)] overflow-hidden select-none animate-fade-in">
    <div class="flex items-center justify-between gap-2 bg-gold/15 border-b border-gold/30 px-3 py-1.5">
      <div class="flex items-center gap-1.5">
        <span class="text-gold text-[12px]">👁</span>
        <span class="text-[10px] font-black uppercase tracking-wider text-gold">${esc(phaseTitle)}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="num font-mono text-[10px] font-bold text-ink-dim">${remainingSec}s</span>
        <button class="text-ink-mute hover:text-ink text-[11px]" data-action="dismiss-ward-toast" title="Cerrar aviso">✕</button>
      </div>
    </div>

    <div class="p-2.5 flex items-center gap-2.5">
      <!-- Mini recorte del mapa actualizado mostrando el punto exacto donde wardear -->
      <div class="relative w-16 h-16 rounded-xl overflow-hidden border border-gold/60 flex-none bg-canvas">
        <img src="${mapImg()}" class="w-full h-full object-cover" style="transform: scale(2.3); transform-origin: ${spot.left}% ${spot.top}%;" alt="Dónde wardear" />
        <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-4 w-4">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-85"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-gold border-2 border-canvas items-center justify-center text-[8px] font-black text-canvas">W</span>
        </span>
      </div>

      <div class="min-w-0 flex-1 space-y-1">
        <div class="text-[11.5px] font-extrabold text-ink leading-tight">${esc(spot.title)}</div>
        <p class="text-[10px] text-ink-dim leading-snug line-clamp-2">${esc(spot.tacticalAdvice)}</p>
        <div class="text-[9.5px] font-bold text-win">⏱ Ventana: ${esc(spot.minuteRecommended)}</div>
      </div>
    </div>

    <!-- Barra de progreso de 10 segundos que se vacía hasta cerrar la pestaña automáticamente -->
    <div class="h-1 w-full bg-canvas">
      <div class="h-full bg-gold transition-all duration-1000" style="width: ${pct}%;"></div>
    </div>
  </div>`;
}
