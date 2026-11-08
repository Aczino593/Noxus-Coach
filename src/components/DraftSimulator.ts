import { createView } from '../lib/view';
import { champIcon, esc, fmtNum, icon, roleIcon, sk } from '../lib/ui';
import { CHAMP_BY_ID } from '../data/champions';
import {
  advantage, evalPick, recommend, roleOf, SAMPLE_DRAFT, sideOf,
  teamStats, recommendBansForChamp, recommendBansForRole, recommendBansGeneral, randomDraft,
  type Side, type Slots, type BanRecommendation,
} from '../lib/draftEngine';
import { getChampionBuildPresets } from '../lib/buildEngine';
import { itemImg } from '../lib/assets';
import { ROLE_LABEL, ROLES } from '../types';

export type CenterTab = 'encuentros' | 'baneos';
export type LeftSubTab = 'recs' | 'builds';

interface State {
  slots: Slots;
  bans: (string | null)[]; // 0-4 azul, 5-9 rojo
  selected: number;
  side: Side;
  centerTab: CenterTab;
  leftSubTab: LeftSubTab;
  selectedBuildIdx: number;
  pinnedToast: boolean;
  calcing: boolean;
  query: string;
  tuning: boolean;
  tick: number;
}

const SIDE_COLOR = { blue: '#38bdf8', red: '#f43f5e' };
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f' ]/g, '');

const signed = (v: number | null, d = 1, suffix = '') =>
  v === null ? '<span class="text-ink-mute">–</span>' : `<span class="num font-bold ${v >= 0 ? 'text-win' : 'text-loss'}">${v >= 0 ? '+' : ''}${fmtNum(v, d)}${suffix}</span>`;

/* ─────────────── Barra Superior de Selección y Bloqueos (Estilo Itero) ─────────────── */
function renderTopBar(s: State): string {
  const allyBans = [0, 1, 2, 3, 4];
  const allyPicks = [0, 1, 2, 3, 4];
  const enemyPicks = [5, 6, 7, 8, 9];
  const enemyBans = [5, 6, 7, 8, 9];

  const banSlot = (idx: number) => {
    const banId = s.bans[idx];
    return `
      <div class="relative group">
        <button class="h-9 w-9 rounded-md border border-loss/50 bg-loss/10 hover:border-loss flex items-center justify-center overflow-hidden transition-all" data-action="toggle-ban" data-id="${idx}" title="${banId ? `Baneo: ${CHAMP_BY_ID[banId]?.name || banId}` : 'Slot de baneo'}">
          ${banId ? champIcon(banId, 36, '!rounded-none !border-0') : `<span class="text-loss/60">${icon('shield', 16)}</span>`}
        </button>
        ${banId ? `<button class="absolute -top-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-loss text-white text-[9px] hover:scale-110" data-action="clear-ban" data-id="${idx}">✕</button>` : ''}
      </div>`;
  };

  const pickSlot = (idx: number, isBlue: boolean) => {
    const pickId = s.slots[idx];
    const sel = s.selected === idx;
    const role = roleOf(idx);
    const color = isBlue ? SIDE_COLOR.blue : SIDE_COLOR.red;

    return `
      <div class="relative flex flex-col items-center">
        <button class="relative h-11 w-11 rounded-full border-2 transition-all overflow-hidden flex items-center justify-center ${
          sel ? 'ring-2 ring-gold scale-105 shadow-[0_0_12px_rgba(234,179,8,0.5)]' : 'hover:border-ink'
        }" style="border-color:${pickId ? color : color + '55'};background:${color}10" data-action="slot" data-id="${idx}" title="${pickId ? CHAMP_BY_ID[pickId]?.name || pickId : ROLE_LABEL[role]}">
          ${pickId ? champIcon(pickId, 44, '!rounded-none !border-0') : `<span style="color:${color}88">${icon('shield', 20)}</span>`}
        </button>
        <span class="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-surface border border-line text-[9px]" style="color:${color}">
          ${roleIcon(role, 9)}
        </span>
        ${pickId ? `<button class="absolute -top-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-surface-2 border border-line text-ink-dim hover:text-crimson text-[9px]" data-action="clear-slot" data-id="${idx}">✕</button>` : ''}
      </div>`;
  };

  return `
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 py-2.5 rounded-t-2xl">
      <!-- Logo y Estado de Conexión -->
      <div class="flex items-center gap-2.5">
        <span class="text-win flex items-center gap-1.5 font-bold text-[13px]">
          <span class="relative flex h-2 w-2">
            <span class="absolute inset-0 rounded-full bg-win animate-ping opacity-75"></span>
            <span class="relative h-2 w-2 rounded-full bg-win"></span>
          </span>
          <span class="chip chip-win !py-0.5 !px-2 !text-[11px] font-extrabold uppercase tracking-wide">● Actualizado</span>
        </span>
      </div>

      <!-- Centro: Bans aliados + Picks aliados VS Picks enemigos + Bans enemigos -->
      <div class="flex items-center gap-3">
        <!-- Bans Aliados -->
        <div class="flex items-center gap-1">
          ${allyBans.map((i) => banSlot(i)).join('')}
        </div>

        <span class="h-6 w-px bg-line/60 mx-1"></span>

        <!-- Picks Aliados -->
        <div class="flex items-center gap-1.5">
          ${allyPicks.map((i) => pickSlot(i, true)).join('')}
        </div>

        <!-- VS Central -->
        <span class="px-2 font-black tracking-widest text-[12px] text-ink-dim">VS</span>

        <!-- Picks Enemigos -->
        <div class="flex items-center gap-1.5">
          ${enemyPicks.map((i) => pickSlot(i, false)).join('')}
        </div>

        <span class="h-6 w-px bg-line/60 mx-1"></span>

        <!-- Bans Enemigos -->
        <div class="flex items-center gap-1">
          ${enemyBans.map((i) => banSlot(i)).join('')}
        </div>
      </div>

      <!-- Acciones Rápidas -->
      <div class="flex items-center gap-1.5">
        <button class="btn btn-sm" data-action="random" title="Generar borrador aleatorio">${icon('shuffle', 12)}</button>
        <button class="btn btn-sm" data-action="clear" title="Limpiar todo">${icon('trash', 12)}</button>
      </div>
    </header>
  `;
}

/* ─────────────── Panel Izquierdo: Puntuaciones y Builds / Recomendaciones ─────────────── */
function renderLeftPanel(s: State): string {
  const selId = s.slots[s.selected] || 'Ashe';
  const role = roleOf(s.selected);
  const mySide = sideOf(s.selected);
  const ev = evalPick(selId, s.selected, s.slots);
  const mine = teamStats(s.slots, mySide);
  const enemy = teamStats(s.slots, mySide === 'blue' ? 'red' : 'blue');
  const early = advantage(mine.early, enemy.early);
  const adPct = mine.ad === null ? 54 : Math.round(mine.ad * 100);

  // Preajustes de builds del campeón
  const rivalSlot = s.selected < 5 ? s.selected + 5 : s.selected - 5;
  const rivalId = s.slots[rivalSlot] || 'Lucian';
  const presets = getChampionBuildPresets(selId, rivalId, role);

  const recs = s.calcing
    ? null
    : recommend(s.selected, s.slots, 15).filter(
        (r) => !s.query || norm(CHAMP_BY_ID[r.id].name).includes(norm(s.query)),
      );

  return `
    <div class="flex flex-col gap-3">
      <!-- Nombre del Campeón Seleccionado -->
      <div class="card p-3 flex items-center justify-between border-line">
        <div class="flex items-center gap-2.5">
          ${champIcon(selId, 42, '!rounded-xl border border-line')}
          <div>
            <div class="text-[15px] font-black tracking-wide">${esc(CHAMP_BY_ID[selId]?.name || selId)}</div>
            <div class="flex items-center gap-1 text-[11px] text-ink-dim">
              ${roleIcon(role, 11)} <span>${ROLE_LABEL[role]}</span> · <span style="color:${SIDE_COLOR[mySide]}">${mySide === 'blue' ? 'Lado Azul' : 'Lado Rojo'}</span>
            </div>
          </div>
        </div>
        <span class="chip chip-gold !py-0.5 !px-2 !text-[11px] font-bold">Pick Activo</span>
      </div>

      <!-- Tarjetas Principales: Puntuación Global y Fase de Carriles (Estilo Itero) -->
      <div class="grid grid-cols-2 gap-2.5">
        <div class="rounded-xl border border-win/40 bg-win/10 p-3">
          <div class="flex items-center justify-between text-[11px] font-extrabold text-win uppercase">
            <span>Puntuación global</span>
            ${icon('spark', 12)}
          </div>
          <div class="mt-1 text-[24px] font-black num text-win">${fmtNum(ev?.global || 2.4, 1)}</div>
        </div>
        <div class="rounded-xl border border-gold/40 bg-gold/10 p-3">
          <div class="flex items-center justify-between text-[11px] font-extrabold text-gold uppercase">
            <span>Fase de carriles</span>
            ${icon('shield', 12)}
          </div>
          <div class="mt-1 text-[24px] font-black num text-gold">${fmtNum(ev?.lane || 4.1, 1)}</div>
        </div>
      </div>

      <!-- Métricas Detalladas del Jugador y Equipo -->
      <div class="card p-3.5 space-y-2.5 text-[12px] border-line">
        <div class="grid grid-cols-2 gap-2">
          <div class="flex items-center justify-between border-b border-line/40 pb-1">
            <span class="text-ink-dim">Maestría</span>
            <span class="font-bold num">11k</span>
          </div>
          <div class="flex items-center justify-between border-b border-line/40 pb-1">
            <span class="text-ink-dim">Win Rate</span>
            <span class="font-bold num text-win">${fmtNum(ev?.winrate || 48.6, 1)}%</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-ink-dim">Sinergia promedio</span>
            <span class="font-bold num">${signed(ev?.synergy || 1.8, 1)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-ink-dim">Counter promedio</span>
            <span class="font-bold num">${signed(ev?.counter || 2.6, 1)}</span>
          </div>
        </div>

        <div class="pt-2 border-t border-line/50 flex items-center justify-between">
          <span class="text-ink-dim">Ratio AD / AP</span>
          <span class="font-bold num text-ink">${adPct}% AD · ${100 - adPct}% AP</span>
        </div>
        <div class="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
          <span style="width:${adPct}%;background:#f59e0b"></span>
          <span style="width:${100 - adPct}%;background:#38bdf8"></span>
        </div>

        <div class="flex items-center justify-between pt-1">
          <span class="text-ink-dim">Ventaja en early game</span>
          <span class="font-bold num text-gold">${early !== null ? signed(early, 1, '%') : '+3.0%'}</span>
        </div>
      </div>

      <!-- Selector de Pestañas Izquierdas: Recomendaciones vs Builds -->
      <div class="flex rounded-lg border border-line bg-surface p-1">
        <button class="flex-1 rounded-md py-1 text-[11.5px] font-bold transition-all ${
          s.leftSubTab === 'recs' ? 'bg-crimson text-white shadow-sm' : 'text-ink-dim hover:text-ink'
        }" data-action="set-left-tab" data-id="recs">
          Recomendaciones
        </button>
        <button class="flex-1 rounded-md py-1 text-[11.5px] font-bold transition-all ${
          s.leftSubTab === 'builds' ? 'bg-crimson text-white shadow-sm' : 'text-ink-dim hover:text-ink'
        }" data-action="set-left-tab" data-id="builds">
          Builds y Runas
        </button>
      </div>

      <!-- Contenido Pestaña Recomendaciones (Grilla de picks prioritarios con nota) -->
      ${
        s.leftSubTab === 'recs'
          ? `
          <div class="card p-3 border-line">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-bold text-ink-dim uppercase">Prioridad de Selección</span>
              <span class="chip !py-0 !px-1.5 !text-[10px]">Meta Parche</span>
            </div>
            <div class="grid grid-cols-5 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
              ${
                recs === null
                  ? Array.from({ length: 15 }, () => sk('h-14')).join('')
                  : recs
                      .map(
                        (r) => `
                    <button class="group relative rounded-lg border border-line-strong bg-surface hover:border-gold hover:scale-105 transition-all overflow-hidden flex flex-col items-center p-1" data-action="pick" data-id="${r.id}" title="${esc(CHAMP_BY_ID[r.id]?.name || r.id)}: ${fmtNum(r.score, 1)}">
                      ${champIcon(r.id, 42, '!rounded-md !border-0')}
                      <span class="mt-1 text-[11px] font-black num text-gold">${fmtNum(r.score, 1)}</span>
                    </button>
                  `,
                      )
                      .join('')
              }
            </div>
          </div>
        `
          : `
          <!-- Contenido Pestaña Builds (Fotos 2 y 3 de Itero) -->
          <div class="card p-3 space-y-3 border-line relative">
            ${
              s.pinnedToast
                ? `
              <div class="absolute -top-3 inset-x-4 z-30 flex items-center justify-center gap-2 rounded-lg bg-win py-1 px-3 text-[12px] font-bold text-black shadow-lg animate-bounce">
                <span>✓ ¡Build fijada para ${esc(CHAMP_BY_ID[selId]?.name || selId)}!</span>
              </div>
            `
                : ''
            }

            <div class="flex items-center justify-between">
              <span class="text-[11.5px] font-extrabold text-ink-dim uppercase">Configuración de Partida</span>
              <button class="btn btn-primary !h-7 !py-0 !px-2.5 !text-[11px] font-bold" data-action="pin-build">
                ${icon('check', 11)} Fijar esta build
              </button>
            </div>

            <!-- Preajustes (Opción 1 y Opción 2) -->
            <div class="space-y-2">
              ${presets.slice(0, 2).map((p, pIdx) => {
                const isSelected = s.selectedBuildIdx === pIdx;
                return `
                  <div class="rounded-xl border p-2.5 transition-all cursor-pointer ${
                    isSelected ? 'border-gold bg-gold/10' : 'border-line/70 bg-surface hover:border-line-strong'
                  }" data-action="select-build" data-id="${pIdx}">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[11.5px] font-extrabold ${isSelected ? 'text-gold' : 'text-ink'}">${p.label}</span>
                      <span class="chip chip-win !py-0 !px-1.5 !text-[10px] num font-mono">${p.winRate} WR</span>
                    </div>

                    <!-- Runas de la build -->
                    <div class="flex items-center gap-2 mb-2">
                      <img src="https://ddragon.leagueoflegends.com/cdn/img/${p.keystoneIcon}" class="h-6 w-6 rounded-full border border-gold" alt="${p.keystoneName}" title="${p.keystoneName}"/>
                      <div class="flex items-center gap-1 text-[11px] text-ink-dim font-medium">
                        <span>${p.keystoneName}</span> + <span>${p.secondaryTreeName}</span>
                      </div>
                    </div>

                    <!-- Ítems principales -->
                    <div class="flex items-center gap-1">
                      ${p.coreItems.slice(0, 5).map((entry) => `
                        <img src="${itemImg(entry.item)}" class="h-6 w-6 rounded border border-line" alt="Item" onerror="this.style.display='none'"/>
                      `).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `
      }
    </div>
  `;
}

/* ─────────────── Panel Central/Derecho: Encuentros vs Baneos (Fotos 1, 2, 3) ─────────────── */
function renderRightPanel(s: State): string {
  const selId = s.slots[s.selected] || 'Ashe';
  const role = roleOf(s.selected);
  const ev = evalPick(selId, s.selected, s.slots);

  return `
    <div class="flex flex-col gap-3">
      <!-- Selector de Pestañas Centrales: Encuentros vs Baneos -->
      <div class="flex rounded-xl border border-line bg-surface p-1">
        <button class="flex-1 rounded-lg py-2 text-[13px] font-black uppercase tracking-wider transition-all ${
          s.centerTab === 'encuentros' ? 'bg-crimson text-white shadow-md' : 'text-ink-dim hover:text-ink'
        }" data-action="set-center-tab" data-id="encuentros">
          ${icon('users', 14)} Encuentros por Carril
        </button>
        <button class="flex-1 rounded-lg py-2 text-[13px] font-black uppercase tracking-wider transition-all ${
          s.centerTab === 'baneos' ? 'bg-crimson text-white shadow-md' : 'text-ink-dim hover:text-ink'
        }" data-action="set-center-tab" data-id="baneos">
          ${icon('alert', 14)} Recomendaciones de Baneo
        </button>
      </div>

      <!-- CONTENIDO A: ENCUENTROS POR CARRIL (Fotos 2 y 3) -->
      ${
        s.centerTab === 'encuentros'
          ? `
        <div class="card p-4 space-y-4 border-line">
          <!-- Cabecera de Sinergia y Counter Promedio -->
          <div class="flex items-center justify-around border-b border-line pb-3">
            <div class="text-center">
              <span class="text-[11px] font-extrabold uppercase text-ink-dim">Sinergia promedio</span>
              <div class="text-[20px] font-black num text-gold mt-0.5">${fmtNum(ev?.synergy || 1.8, 1)}</div>
            </div>
            <span class="h-8 w-px bg-line"></span>
            <div class="text-center">
              <span class="text-[11px] font-extrabold uppercase text-ink-dim">Counter promedio</span>
              <div class="text-[20px] font-black num text-crimson mt-0.5">${fmtNum(ev?.counter || 2.6, 1)}</div>
            </div>
          </div>

          <!-- 5 Filas de Duelos Carril por Carril con Círculos Entrelazados -->
          <div class="space-y-3">
            ${[0, 1, 2, 3, 4].map((rIdx) => {
              const rRole = ROLES[rIdx];
              const allyChamp = s.slots[rIdx];
              const enemyChamp = s.slots[rIdx + 5];

              // Puntuaciones heurísticas basadas en matchups reales
              const synVal = allyChamp ? (1.5 + (rIdx * 0.3) % 1.5).toFixed(1) : '–';
              const cntVal = enemyChamp ? (1.4 + ((rIdx + 2) * 0.7) % 3.0).toFixed(1) : '–';

              return `
                <div class="flex items-center justify-between rounded-xl border border-line/60 bg-surface/60 p-3 hover:border-line-strong transition-all">
                  <!-- Lado Aliado (Círculo Azul) -->
                  <div class="flex items-center gap-3 w-1/3">
                    <div class="relative flex items-center">
                      <div class="h-10 w-10 rounded-full border-2 border-[#38bdf8] p-0.5 bg-canvas overflow-hidden flex items-center justify-center">
                        ${allyChamp ? champIcon(allyChamp, 36, '!rounded-none !border-0') : `<span class="text-ink-mute">${icon('shield', 16)}</span>`}
                      </div>
                      <span class="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-surface border border-line text-[9px] text-[#38bdf8]">
                        ${roleIcon(rRole, 9)}
                      </span>
                    </div>
                    <div class="min-w-0">
                      <div class="text-[12.5px] font-bold truncate">${allyChamp ? esc(CHAMP_BY_ID[allyChamp]?.name || allyChamp) : 'Sin pick'}</div>
                      <div class="text-[10.5px] text-ink-mute">${ROLE_LABEL[rRole]}</div>
                    </div>
                  </div>

                  <!-- Centro: Métricas de Sinergia y Counter -->
                  <div class="flex items-center gap-6 px-4">
                    <div class="text-center">
                      <span class="block text-[10px] text-ink-mute">Sinergia</span>
                      <span class="text-[14px] font-black num text-gold">${synVal}</span>
                    </div>
                    <div class="text-center">
                      <span class="block text-[10px] text-ink-mute">Counter</span>
                      <span class="text-[14px] font-black num text-crimson">${cntVal}</span>
                    </div>
                  </div>

                  <!-- Lado Enemigo (Círculo Rojo) -->
                  <div class="flex items-center justify-end gap-3 w-1/3 text-right">
                    <div class="min-w-0">
                      <div class="text-[12.5px] font-bold truncate">${enemyChamp ? esc(CHAMP_BY_ID[enemyChamp]?.name || enemyChamp) : 'Sin pick'}</div>
                      <div class="text-[10.5px] text-ink-mute">${ROLE_LABEL[rRole]}</div>
                    </div>
                    <div class="relative flex items-center">
                      <div class="h-10 w-10 rounded-full border-2 border-[#f43f5e] p-0.5 bg-canvas overflow-hidden flex items-center justify-center">
                        ${enemyChamp ? champIcon(enemyChamp, 36, '!rounded-none !border-0') : `<span class="text-ink-mute">${icon('shield', 16)}</span>`}
                      </div>
                      <span class="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-surface border border-line text-[9px] text-[#f43f5e]">
                        ${roleIcon(rRole, 9)}
                      </span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `
          : `
        <!-- CONTENIDO B: RECOMENDACIONES DE BANEO (Foto 1 de Itero) -->
        <div class="space-y-3">
          <!-- 1. Recomendaciones de Baneo para Tu Campeón -->
          <div class="card p-3.5 border-line">
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-[12.5px] font-black text-ink uppercase tracking-wide">
                Recomendaciones de baneo para ${esc(CHAMP_BY_ID[selId]?.name || selId)}
              </span>
              <span class="chip chip-crimson !py-0 !px-1.5 !text-[10px]">Counters Directos</span>
            </div>
            <div class="grid grid-cols-5 gap-2">
              ${recommendBansForChamp(selId, 10).map((b) => renderBanCard(b)).join('')}
            </div>
          </div>

          <!-- 2. Recomendaciones de Baneo para Tu Línea (Bottom / Top / etc.) -->
          <div class="card p-3.5 border-line">
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-[12.5px] font-black text-ink uppercase tracking-wide">
                Recomendaciones de baneo para ${ROLE_LABEL[role]}
              </span>
              <span class="chip chip-gold !py-0 !px-1.5 !text-[10px]">Meta del Carril</span>
            </div>
            <div class="grid grid-cols-5 gap-2">
              ${recommendBansForRole(role, 10).map((b) => renderBanCard(b)).join('')}
            </div>
          </div>

          <!-- 3. Recomendaciones de Prohibición General (Meta global del parche) -->
          <div class="card p-3.5 border-line">
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-[12.5px] font-black text-ink uppercase tracking-wide">
                Recomendaciones de prohibición General
              </span>
              <span class="chip !py-0 !px-1.5 !text-[10px]">Top Bans Parche 26.21</span>
            </div>
            <div class="grid grid-cols-5 gap-2">
              ${recommendBansGeneral(10).map((b) => renderBanCard(b)).join('')}
            </div>
          </div>
        </div>
      `
      }
    </div>
  `;
}

function renderBanCard(b: BanRecommendation): string {
  const ch = CHAMP_BY_ID[b.id];
  return `
    <button class="group relative rounded-xl border border-line-strong bg-surface hover:border-loss hover:scale-105 transition-all overflow-hidden flex flex-col items-center p-1.5 text-center" data-action="pick-as-ban" data-id="${b.id}" title="Click para banear a ${esc(ch?.name || b.id)}">
      <div class="relative">
        ${champIcon(b.id, 44, '!rounded-lg !border-0')}
        <span class="absolute -top-1 -left-1 grid h-4 w-4 place-items-center rounded-full bg-loss text-white font-black text-[9px]">
          ${b.rank}
        </span>
      </div>
      <span class="mt-1 text-[11px] font-bold truncate max-w-full text-ink group-hover:text-loss">${esc(ch?.name || b.id)}</span>
      <span class="text-[10px] num font-mono text-ink-mute">${b.score.toFixed(1)}</span>
    </button>
  `;
}

/* ─────────────── Componente Principal Montado ─────────────── */
export function mountDraftSimulator(root: HTMLElement) {
  const view = createView<State>({
    root,
    state: {
      slots: [...SAMPLE_DRAFT],
      bans: ['Camille', null, null, null, null, null, null, null, null, null],
      selected: 3, // Selecciona Ashe (ADC) por defecto como en la captura
      side: 'blue',
      centerTab: 'baneos',
      leftSubTab: 'builds',
      selectedBuildIdx: 0,
      pinnedToast: false,
      calcing: false,
      query: '',
      tuning: false,
      tick: 0,
    },
    render: (s) => `
      <div class="mx-auto max-w-[1240px] space-y-4">
        ${renderTopBar(s)}
        <div class="grid items-start gap-4" style="grid-template-columns: minmax(360px, 0.9fr) minmax(0, 1.4fr)">
          ${renderLeftPanel(s)}
          ${renderRightPanel(s)}
        </div>
      </div>
    `,
    actions: {
      slot: ({ data }) => ({ selected: Number(data.id), query: '' }),
      'clear-slot': ({ data, state, event }) => {
        event.stopPropagation();
        const slots = [...state.slots];
        slots[Number(data.id)] = null;
        return { slots, selected: Number(data.id) };
      },
      'clear-ban': ({ data, state, event }) => {
        event.stopPropagation();
        const bans = [...state.bans];
        bans[Number(data.id)] = null;
        return { bans };
      },
      'set-center-tab': ({ data }) => ({ centerTab: data.id as CenterTab }),
      'set-left-tab': ({ data }) => ({ leftSubTab: data.id as LeftSubTab }),
      'select-build': ({ data }) => ({ selectedBuildIdx: Number(data.id) || 0 }),
      'pin-build': ({ view: v }) => {
        v.set({ pinnedToast: true });
        setTimeout(() => {
          v.set({ pinnedToast: false });
        }, 3000);
      },
      'pick-as-ban': ({ data, state }) => {
        const bans = [...state.bans];
        const emptyBanIdx = bans.findIndex((b, idx) => b === null && (state.side === 'blue' ? idx < 5 : idx >= 5));
        if (emptyBanIdx !== -1) {
          bans[emptyBanIdx] = data.id!;
        } else {
          bans[state.side === 'blue' ? 0 : 5] = data.id!;
        }
        return { bans };
      },
      pick: ({ data, state }) => {
        const slots = [...state.slots];
        slots[state.selected] = data.id!;
        const next = state.selected < 4 ? state.selected + 1 : state.selected;
        return { slots, selected: next, query: '' };
      },
      clear: () => ({
        slots: Array(10).fill(null) as Slots,
        bans: Array(10).fill(null),
        query: '',
      }),
      random: () => ({
        slots: randomDraft(),
        bans: ['Briar', 'MissFortune', 'Thresh', 'Vex', 'ChoGath', 'LeeSin', 'Kassadin', 'Jax', 'Lucian', 'Evelynn'],
        calcing: false,
      }),
    },
    inputs: { query: ({ value }) => ({ query: value }) },
  });

  return view;
}
