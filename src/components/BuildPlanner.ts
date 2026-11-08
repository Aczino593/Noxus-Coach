import { createView, type View } from '../lib/view';
import { champIcon, esc, icon, itemIcon, roleIcon, spellIcon } from '../lib/ui';
import { CHAMP_BY_ID } from '../data/champions';
import { item } from '../data/items';
import { itemCost } from '../data/itemGuide';
import {
  getChampionBuildPresets,
  matchup,
  type BuildPreset,
  type PresetId,
} from '../lib/buildEngine';
import { ROLE_LABEL, ROLES, type Role } from '../types';
import { championPicker } from './ChampionPicker';
import { runesTree } from './RunesTree';
import { sleep } from '../lib/ui';
import { importBuildToClient, importRunesToClient } from '../lib/lcuClient';

interface State {
  mine: string;
  enemy: string | null;
  role: Role;
  picker: 'mine' | 'enemy' | null;
  pickerRole: Role | null;
  query: string;
  loading: boolean;
  selectedSituational: number;
  presetId: PresetId;
  importToast: { text: string; success: boolean } | null;
  importing: boolean;
}

const gold = (n: number) => `${n.toLocaleString('es-AR')} g`;

/* ─────────────── Selectores de Campeón y Rol ─────────────── */
function trigger(kind: 'mine' | 'enemy', s: State): string {
  const id = kind === 'mine' ? s.mine : s.enemy;
  const ch = id ? CHAMP_BY_ID[id] : null;
  const open = s.picker === kind;
  const label = kind === 'mine' ? 'Tu campeón' : 'Rival esperado';
  return `
  <div class="relative">
    <button class="flex w-[240px] items-center gap-3 rounded-xl border bg-canvas p-2 pr-3 text-left transition-colors ${
      open ? 'border-crimson' : 'border-line hover:border-line-strong'
    }" data-action="open-${kind}" aria-expanded="${open}" aria-haspopup="listbox">
      ${
        ch
          ? champIcon(ch.id, 42, kind === 'enemy' ? '!border-red-side/60' : '!border-crimson/60')
          : `<span class="champ-ring grid h-10 w-10 place-items-center text-ink-mute">${icon('plus', 16)}</span>`
      }
      <span class="min-w-0 flex-1 leading-tight">
        <span class="eyebrow block text-[10px]">${label}</span>
        <span class="block truncate text-[13.5px] font-bold">${ch ? esc(ch.name) : 'Sin rival (a ciegas)'}</span>
      </span>
      <span class="text-ink-mute">${icon('chevron', 14)}</span>
    </button>
    ${
      open
        ? championPicker({
            query: s.query,
            role: s.pickerRole,
            exclude: kind === 'enemy' ? [s.mine] : [],
            pickAction: `pick-${kind}`,
            closeAction: 'close',
            inputKey: `q-${kind}`,
            title: label,
            roleAction: 'picker-filter-role',
          })
        : ''
    }
  </div>`;
}

function controls(s: State): string {
  const ch = CHAMP_BY_ID[s.mine];
  return `
  <div class="card flex flex-wrap items-center gap-3 p-3.5 mb-4">
    ${trigger('mine', s)}
    <span class="grid h-8 w-8 place-items-center rounded-full border border-line-strong text-[10px] font-extrabold text-crimson">VS</span>
    ${trigger('enemy', s)}
    ${s.enemy ? `<button class="btn btn-ghost btn-sm text-[11.5px]" data-action="clear-enemy">${icon('x', 11)} Quitar rival</button>` : ''}
    <div class="ml-auto flex items-center gap-1 rounded-xl border border-line-strong bg-canvas/80 p-1">
      <span class="eyebrow px-2 text-[10px] uppercase font-bold tracking-wider text-ink-mute">Carril:</span>
      ${ROLES.map((r) => {
        const active = s.role === r;
        const isNative = ch.roles.includes(r);
        const label = r === 'adc' ? 'ADC / Bot' : ROLE_LABEL[r];
        return `
        <button type="button"
                class="role-btn relative grid h-8 w-8 place-items-center rounded-lg border transition-all duration-200 cursor-pointer ${
                  active
                    ? '!bg-crimson !text-white !border-crimson shadow-[0_0_12px_rgba(255,46,77,0.5)] scale-[1.04]'
                    : 'border-transparent text-ink-dim hover:text-ink hover:bg-surface-2 hover:border-line-strong'
                }"
                data-action="role"
                data-id="${r}"
                aria-pressed="${active}"
                aria-label="${label}"
                title="${label}${isNative ? ' (Rol principal)' : ' (Selección flexible)'}">
          ${roleIcon(r, 16, active ? 'text-white' : 'text-ink-mute hover:text-ink')}
          ${isNative && !active ? '<span class="absolute bottom-1 w-1 h-1 rounded-full bg-crimson/60"></span>' : ''}
        </button>`;
      }).join('')}
    </div>
  </div>`;
}

/* ─────────────── Columna Izquierda: Recommended Builds (Estilo Mobalytics) ─────────────── */
function recommendedBuildsSidebar(presets: BuildPreset[], s: State): string {
  const ch = CHAMP_BY_ID[s.mine];

  return `
  <div class="space-y-4">
    <!-- Lista de Preajustes Recomendados (Most Popular, Highest WR, Alternative, Off-Meta) -->
    <div class="card p-4 space-y-2.5">
      <div class="flex items-center justify-between border-b border-line pb-2">
        <h4 class="text-[12px] font-black uppercase tracking-wider text-gold">RECOMMENDED BUILDS</h4>
        <span class="text-[10.5px] font-bold text-ink-mute">WR</span>
      </div>

      <div class="space-y-1.5">
        ${presets
          .map((p) => {
            const isSelected = p.id === s.presetId;
            return `
            <button type="button"
                    class="w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-gold bg-gold/10 shadow-[0_0_15px_rgba(240,180,41,0.25)]'
                        : 'border-line bg-canvas/60 hover:bg-surface-2 hover:border-line-strong'
                    }"
                    data-action="select-preset"
                    data-id="${p.id}">
              <!-- Indicador de barra vertical dorada lateral -->
              ${isSelected ? '<span class="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gold rounded-r"></span>' : ''}

              <div class="flex items-center gap-2.5 pl-1.5">
                <!-- Icono de Runa y Primer Ítem -->
                <div class="flex items-center -space-x-1.5 flex-none">
                  <img src="https://ddragon.leagueoflegends.com/cdn/img/${p.keystoneIcon}" class="w-6 h-6 object-contain drop-shadow" alt="" />
                  <img src="https://ddragon.leagueoflegends.com/cdn/img/${p.secondaryTreeIcon}" class="w-4 h-4 object-contain opacity-80" alt="" />
                </div>
                <div>
                  <img src="https://ddragon.leagueoflegends.com/cdn/14.20.1/img/item/${p.coreItemIcon}.png" class="w-7 h-7 rounded border border-line object-cover" alt="" />
                </div>
                <div class="min-w-0">
                  <div class="text-[12px] font-bold ${isSelected ? 'text-gold' : 'text-ink'}">${esc(p.label)}</div>
                  <div class="text-[9.5px] text-ink-mute">${esc(p.badge)}</div>
                </div>
              </div>

              <div class="text-right flex-none">
                <span class="num text-[12.5px] font-extrabold ${isSelected ? 'text-gold' : 'text-win'}">${p.winRate}</span>
              </div>
            </button>`;
          })
          .join('')}
      </div>
    </div>

    <!-- Top Players / OTPs (Estilo Mobalytics) -->
    <div class="card p-4 space-y-2.5">
      <div class="flex items-center justify-between border-b border-line pb-2">
        <h4 class="text-[11.5px] font-black uppercase tracking-wider text-ink-dim">TOP PLAYERS (${esc(ch.name)})</h4>
        <span class="text-[10.5px] text-ink-mute">ALL</span>
      </div>
      <div class="space-y-1.5 text-[11.5px]">
        <div class="flex items-center justify-between p-1.5 rounded-lg bg-surface-2/40 border border-line/40">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-crimson"></span>
            <span class="font-bold text-ink">embemilo#milo</span>
            <span class="chip chip-gold !py-0 !text-[8.5px]">OTP</span>
          </div>
          <span class="num font-bold text-win">66.7%</span>
        </div>
        <div class="flex items-center justify-between p-1.5 rounded-lg bg-surface-2/40 border border-line/40">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-crimson"></span>
            <span class="font-bold text-ink">MipoLz</span>
            <span class="chip chip-gold !py-0 !text-[8.5px]">OTP</span>
          </div>
          <span class="num font-bold text-win">65.0%</span>
        </div>
        <div class="flex items-center justify-between p-1.5 rounded-lg bg-surface-2/40 border border-line/40">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-crimson"></span>
            <span class="font-bold text-ink">ÇwÇ</span>
            <span class="chip chip-gold !py-0 !text-[8.5px]">OTP</span>
          </div>
          <span class="num font-bold text-win">65.0%</span>
        </div>
      </div>
    </div>

    <!-- Matchup Specific Dinámico y Reactivo (Estilo Mobalytics/OP.GG) -->
    ${matchupSpecificCard(s)}
  </div>`;
}

function matchupSpecificCard(s: State): string {
  const enemyCh = s.enemy ? CHAMP_BY_ID[s.enemy] : null;
  const currentMatch = s.enemy ? matchup(s.mine, s.enemy, s.role) : null;

  // Lista de rivales comunes en la línea según el rol del usuario
  const commonRivalsByRole: Record<Role, string[]> = {
    adc: ['Jinx', 'Kaisa', 'Ezreal', 'Jhin', 'Ashe', 'Vayne', 'Aphelios', 'Varus'],
    mid: ['Ahri', 'Syndra', 'Yasuo', 'Yone', 'Zed', 'Sylas', 'Viktor', 'Akali'],
    top: ['Aatrox', 'Darius', 'Garen', 'Jax', 'Fiora', 'Sett', 'Camille', 'Ornn'],
    jungle: ['LeeSin', 'Viego', 'JarvanIV', 'Nocturne', 'Sejuani', 'Vi', 'Amumu'],
    support: ['Thresh', 'Nautilus', 'Blitzcrank', 'Leona', 'Lulu', 'Karma', 'Lux'],
  };

  const pool = (commonRivalsByRole[s.role] || ['Jinx', 'Ahri', 'Darius'])
    .filter((id) => id !== s.mine && id !== s.enemy && CHAMP_BY_ID[id])
    .slice(0, 3);

  const commonEntries = pool.map((rivalId) => {
    const rCh = CHAMP_BY_ID[rivalId];
    const m = matchup(s.mine, rivalId, s.role);
    const wrVal = m ? m.wr.toFixed(1) : '50.0';
    const wrClass = Number(wrVal) >= 51.5 ? 'text-win' : Number(wrVal) <= 48.5 ? 'text-loss' : 'text-gold';
    return { ch: rCh, wr: wrVal, wrClass, m };
  });

  return `
  <div class="card p-4 space-y-2.5">
    <div class="flex items-center justify-between border-b border-line pb-2">
      <h4 class="text-[11.5px] font-black uppercase tracking-wider text-ink-dim">MATCHUP SPECIFIC</h4>
      <span class="text-[10px] font-bold text-ink-mute">WR PROBABLE</span>
    </div>

    <!-- Rival Seleccionado Actual (Destacado y Reactivo) -->
    ${
      enemyCh && currentMatch
        ? `
      <div class="p-2.5 rounded-xl border border-crimson/60 bg-gradient-to-r from-crimson/15 to-surface-2/60 space-y-1.5 shadow-[0_0_12px_rgba(255,46,77,0.15)]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            ${champIcon(enemyCh.id, 30, '!border-red-side')}
            <div class="min-w-0">
              <div class="text-[12px] font-bold text-ink truncate">vs ${esc(enemyCh.name)} <span class="text-[9px] font-extrabold text-crimson uppercase tracking-wide">Rival</span></div>
              <div class="text-[9.5px] text-ink-mute truncate max-w-[130px]" title="${esc(currentMatch.keyThreat)}">${esc(currentMatch.keyThreat)}</div>
            </div>
          </div>
          <div class="text-right flex-none">
            <div class="num text-[13px] font-black ${currentMatch.tone === 'good' ? 'text-win' : currentMatch.tone === 'bad' ? 'text-loss' : 'text-gold'}">
              ${currentMatch.wr.toFixed(1)}%
            </div>
            <span class="chip ${currentMatch.tone === 'good' ? 'chip-win' : currentMatch.tone === 'bad' ? 'chip-crimson' : 'chip-gold'} !py-0 !text-[8.5px]">
              ${esc(currentMatch.label)}
            </span>
          </div>
        </div>
      </div>`
        : `
      <div class="p-2.5 rounded-lg border border-dashed border-line text-center text-[11px] text-ink-mute">
        Elige un rival arriba para ver consejos y estadísticas específicas del matchup
      </div>`
    }

    <!-- Otros Rivales Frecuentes del Carril -->
    <div class="space-y-1 text-[11.5px] pt-1">
      <div class="text-[10px] uppercase font-bold tracking-wider text-ink-mute/80 pb-0.5">Otros rivales frecuentes:</div>
      ${commonEntries
        .map(
          (entry) => `
        <button type="button"
                class="w-full flex items-center justify-between p-1.5 rounded-lg bg-surface-2/40 border border-line/40 hover:bg-surface-2 hover:border-line-strong transition-all cursor-pointer text-left group"
                data-action="pick-enemy"
                data-id="${entry.ch.id}"
                title="Hacer clic para analizar build vs ${esc(entry.ch.name)}">
          <div class="flex items-center gap-2">
            ${champIcon(entry.ch.id, 22, '!border-line')}
            <span class="font-medium text-ink group-hover:text-gold transition-colors">vs ${esc(entry.ch.name)}</span>
          </div>
          <span class="num font-bold ${entry.wrClass}">${entry.wr}%</span>
        </button>`,
        )
        .join('')}
    </div>
  </div>`;
}

/* ─────────────── Columna Central: Runes Tree y Ability Order ─────────────── */
function centerColumn(b: BuildPreset, s: State): string {
  const ch = CHAMP_BY_ID[s.mine];

  return `
  <div class="space-y-4">
    <!-- Encabezado del Build Recomendado -->
    <div class="card p-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="relative">
          ${champIcon(ch.id, 44, '!border-gold')}
          <span class="absolute -bottom-1 -right-1 bg-canvas border border-line rounded px-1 text-[8.5px] font-bold text-gold">
            ${esc(s.role.toUpperCase())}
          </span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-[16px] font-black text-ink tracking-wide">${esc(ch.name.toUpperCase())} BUILD</h3>
            <span class="chip chip-crimson !py-0 text-[10px]">${esc(b.label.toUpperCase())}</span>
          </div>
          <div class="text-[12px] text-ink-dim mt-0.5">
            Win Rate: <b class="num text-win font-bold">${b.winRate}</b> basado en <span class="num font-bold text-ink">${b.matches}</span> partidas
          </div>
        </div>
      </div>
      <div class="flex flex-col sm:flex-row items-end sm:items-center gap-2">
        ${
          s.importToast
            ? `<span class="chip ${s.importToast.success ? 'chip-win' : 'chip-crimson'} text-[11px] font-bold animate-fade-in">
                ${esc(s.importToast.text)}
               </span>`
            : ''
        }
        <button class="btn btn-sm ${s.importing ? 'opacity-60 cursor-wait' : 'btn-light'} font-bold shadow-md hover:scale-[1.02] transition-transform"
                data-action="import-client"
                ${s.importing ? 'disabled' : ''}
                title="Equipa automáticamente las runas y exporta la build a la tienda del cliente de League of Legends">
          ${s.importing ? icon('clock', 12) : icon('download', 12)}
          <span>${s.importing ? 'IMPORTANDO A LOL...' : 'IMPORT TO CLIENT'}</span>
        </button>
      </div>
    </div>

    <!-- Árbol Completo de Runas -->
    <div class="runes-wrapper">
      ${runesTree(b.runes, b.spells)}
    </div>

    <!-- Orden de Habilidades (Matriz de Niveles 1 a 18 Estilo Mobalytics) -->
    <section class="card p-5 space-y-3">
      <div class="flex items-center justify-between border-b border-line pb-2.5">
        <div>
          <h3 class="section-title text-[13px] flex items-center gap-2">
            <span>ABILITY ORDER</span>
            <span class="text-[11px] font-normal text-ink-mute">· Max: <b class="text-gold font-bold">${esc(b.abilityOrder.priorityStr)}</b></span>
          </h3>
        </div>
        <span class="chip chip-gold !py-0 text-[10.5px]">Nivel 1 al 18</span>
      </div>

      <!-- Cuadrícula / Matriz 1 a 18 -->
      <div class="overflow-x-auto">
        <div class="grid min-w-[540px] gap-1 text-center" style="grid-template-columns: 28px repeat(18, minmax(0, 1fr))">
          <!-- Fila de cabecera de números 1 a 18 -->
          <span></span>
          ${Array.from({ length: 18 }, (_, i) => {
            const isUltLevel = [5, 10, 15].includes(i);
            return `<span class="num text-[10px] font-bold ${isUltLevel ? 'text-crimson' : 'text-ink-mute'}">${i + 1}</span>`;
          }).join('')}

          <!-- Filas para Q, W, E, R -->
          ${(['Q', 'W', 'E', 'R'] as const)
            .map((skill) => {
              const isR = skill === 'R';
              return `
              <span class="grid h-7 w-7 place-items-center rounded-lg border text-[11.5px] font-black ${
                isR ? 'border-crimson/60 bg-crimson/20 text-crimson' : 'border-gold/50 bg-gold/15 text-gold'
              }">
                ${skill}
              </span>
              ${b.abilityOrder.levels
                .map((lv) => {
                  const isActive = lv === skill;
                  return `
                  <span class="grid h-7 place-items-center rounded-lg border text-[11px] font-black num transition-all ${
                    isActive
                      ? isR
                        ? 'border-crimson bg-crimson text-white shadow-[0_0_10px_rgba(255,46,77,0.7)]'
                        : 'border-gold bg-gold text-canvas shadow-[0_0_10px_rgba(240,180,41,0.6)]'
                      : 'border-line/40 bg-surface-2/20 text-transparent'
                  }">
                    ${isActive ? skill : '·'}
                  </span>`;
                })
                .join('')}`;
            })
            .join('')}
        </div>
      </div>
    </section>
  </div>`;
}

/* ─────────────── Columna Derecha: Spells, Items y Situational ─────────────── */
function rightColumn(b: BuildPreset, s: State): string {
  const sitList = b.situational || [];
  const activeIdx = Math.min(s.selectedSituational ?? 0, Math.max(0, sitList.length - 1));
  const activeSit = sitList[activeIdx] || sitList[0];

  return `
  <div class="space-y-4">
    <!-- Hechizos de Invocador (SPELLS) -->
    <section class="card p-4 space-y-2.5">
      <h4 class="text-[11.5px] font-black uppercase tracking-wider text-ink-dim border-b border-line pb-2">SPELLS</h4>
      <div class="flex items-center gap-3">
        ${b.spells
          .map((sp, idx) => {
            const keyLetter = idx === 0 ? 'D' : 'F';
            return `
            <div class="relative flex items-center gap-2 p-1.5 rounded-xl border border-line bg-surface-2/50">
              ${spellIcon(sp, 36)}
              <span class="num text-[12px] font-black text-gold px-1.5">${keyLetter}</span>
            </div>`;
          })
          .join('')}
      </div>
    </section>

    <!-- Objetos Clasificados: Starter, Early, Core y Full Build -->
    <section class="card p-4 space-y-3.5">
      <h4 class="text-[11.5px] font-black uppercase tracking-wider text-gold border-b border-line pb-2">ITEMS</h4>

      <!-- Starter Items -->
      <div>
        <div class="flex items-center justify-between text-[11px] text-ink-dim mb-1.5">
          <span>Starter Items</span>
          <span class="text-ink-mute num font-mono">${esc(b.starterItems[0]?.timing || '@ 10 sec')}</span>
        </div>
        <div class="flex items-center gap-1.5">
          ${b.starterItems.map((st) => itemIcon(st.item, 38)).join('')}
        </div>
      </div>

      <!-- Early Items -->
      <div class="pt-2 border-t border-line/50">
        <div class="flex items-center justify-between text-[11px] text-ink-dim mb-1.5">
          <span>Early Items</span>
          <span class="text-ink-mute num font-mono">${esc(b.earlyItems[0]?.timing || '@ 3 min')}</span>
        </div>
        <div class="flex items-center gap-1.5">
          ${b.earlyItems.map((st) => itemIcon(st.item, 38)).join('')}
        </div>
      </div>

      <!-- Core Items -->
      <div class="pt-2 border-t border-line/50">
        <div class="flex items-center justify-between text-[11px] text-ink-dim mb-1.5">
          <span class="font-bold text-ink">Core Items</span>
          <span class="text-gold font-bold num font-mono">${esc(b.coreItems[0]?.timing || '@ 20 min')}</span>
        </div>
        <div class="flex items-center gap-1.5">
          ${b.coreItems.map((st) => itemIcon(st.item, 40, '!border-gold')).join('')}
        </div>
      </div>

      <!-- Full Build (6 Ítems Únicos Garantizados Sin Repetidos) -->
      <div class="pt-2 border-t border-line/50">
        <div class="flex items-center justify-between text-[11px] text-ink-dim mb-1.5">
          <span class="font-bold text-ink">Full Build (6 Objetos Finales)</span>
          <span class="chip chip-gold !py-0 text-[9.5px]">Completa</span>
        </div>
        <div class="grid grid-cols-6 gap-1">
          ${b.fullBuild.slice(0, 6).map((id) => itemIcon(id, 36)).join('')}
        </div>
      </div>
    </section>

    <!-- Situational Items Interactivo (Estilo Mobalytics) -->
    <section class="card p-4 space-y-3">
      <div class="flex items-center justify-between border-b border-line pb-2">
        <h4 class="text-[11.5px] font-black uppercase tracking-wider text-ink-dim">SITUATIONAL ITEMS</h4>
        <span class="chip chip-gold !py-0 text-[10px] num">${sitList.length} opciones</span>
      </div>

      <!-- Barra de iconos horizontales -->
      <div class="flex flex-wrap items-center gap-1.5">
        ${sitList
          .map((sit, idx) => {
            const isSelected = idx === activeIdx;
            const isCounter = sit.tag.startsWith('★');
            return `
            <button type="button"
                    class="cursor-pointer rounded-lg p-0.5 transition-all relative ${
                      isSelected
                        ? 'ring-2 ring-gold scale-105 shadow-[0_0_10px_rgba(240,180,41,0.5)]'
                        : isCounter
                          ? 'ring-1 ring-crimson/80 opacity-95 hover:opacity-100 hover:scale-105'
                          : 'opacity-70 hover:opacity-100'
                    }"
                    data-action="select-situational"
                    data-id="${idx}"
                    title="${esc(sit.tag)}">
              ${isCounter ? '<span class="absolute -top-1 -right-1 flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-crimson"></span></span>' : ''}
              ${itemIcon(sit.item, 34, isSelected ? '!border-gold' : isCounter ? '!border-crimson' : '!border-line')}
            </button>`;
          })
          .join('')}
      </div>

      <!-- Tarjeta explicativa pedagógica del ítem situacional seleccionado -->
      ${
        activeSit
          ? `
        <div class="rounded-xl border ${activeSit.tag.startsWith('★') ? 'border-crimson/60 bg-gradient-to-r from-crimson/10 to-canvas/90' : 'border-line-strong bg-canvas/90'} p-3 text-[12px] space-y-1.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-bold text-ink">${esc(item(activeSit.item).name)}</span>
              ${activeSit.tag.startsWith('★') ? `<span class="chip chip-crimson !py-0 !text-[9.5px] font-bold">${esc(activeSit.tag)}</span>` : `<span class="chip chip-gold !py-0 !text-[9.5px]">${esc(activeSit.tag)}</span>`}
            </div>
            <span class="num text-gold font-bold">${gold(itemCost(activeSit.item))}</span>
          </div>
          <div class="text-[11px] text-ink-dim">
            Alternativa para: <b class="text-gold">${esc(activeSit.alternativeFor)}</b>
          </div>
          <p class="text-[11.5px] leading-relaxed text-ink-dim pt-1 border-t border-line/40">
            ${esc(activeSit.reason)}
          </p>
        </div>`
          : ''
      }
    </section>

    <!-- Consejos Tácticos de Matchup (5 Pautas) -->
    ${matchupTipsCard(s)}
  </div>`;
}

function matchupTipsCard(s: State): string {
  const m = matchup(s.mine, s.enemy, s.role);
  if (!m) return '';

  return `
  <section class="card p-4 space-y-2.5">
    <div class="flex items-center justify-between border-b border-line pb-2">
      <div>
        <h4 class="text-[11.5px] font-black uppercase tracking-wider text-crimson">5 CLAVES TÁCTICAS DEL ENFRENTAMIENTO</h4>
        <div class="text-[10px] text-ink-mute mt-0.5">Amenaza: <b class="text-ink">${esc(m.keyThreat)}</b></div>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="chip ${m.threatLevel === 'Crítica' || m.threatLevel === 'Alta' ? 'chip-crimson' : 'chip-gold'} !py-0 text-[9.5px]">
          Amenaza ${m.threatLevel}
        </span>
        <span class="chip ${m.tone === 'good' ? 'chip-win' : m.tone === 'bad' ? 'chip-crimson' : 'chip-gold'} !py-0 text-[10px]">
          ${esc(m.label)}
        </span>
      </div>
    </div>
    <ul class="space-y-1.5 text-[11.5px] leading-snug text-ink-dim">
      ${m.tips.map((t) => `<li class="flex items-start gap-1.5"><span class="text-crimson mt-0.5">•</span><span>${esc(t)}</span></li>`).join('')}
    </ul>
  </section>`;
}

/* ─────────────── Componente Principal ─────────────── */
export function mountBuildPlanner(root: HTMLElement) {
  const view = createView<State>({
    root,
    state: {
      mine: 'Ahri',
      enemy: 'Yone',
      role: 'mid',
      picker: null,
      pickerRole: null,
      query: '',
      loading: false,
      selectedSituational: 0,
      presetId: 'most-popular',
      importToast: null,
      importing: false,
    },
    render: (s) => {
      const presets = getChampionBuildPresets(s.mine, s.enemy, s.role);
      const activePreset = presets.find((p) => p.id === s.presetId) || presets[0];

      return `
      <div>
        <!-- Controles superiores de selección de Campeón, Rival y Carril -->
        ${controls(s)}

        <!-- Cuadrícula de 3 Columnas Estilo Mobalytics -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <!-- Columna 1 (3 cols): Preajustes Recomendados, Top Players y Matchups -->
          <div class="lg:col-span-3">
            ${recommendedBuildsSidebar(presets, s)}
          </div>

          <!-- Columna 2 (5 cols): Runas Completas y Matriz 1 a 18 de Habilidades -->
          <div class="lg:col-span-5">
            ${centerColumn(activePreset, s)}
          </div>

          <!-- Columna 3 (4 cols): Spells, Objetos, Situacionales y Tips -->
          <div class="lg:col-span-4">
            ${rightColumn(activePreset, s)}
          </div>
        </div>
      </div>`;
    },
    actions: {
      'open-mine': ({ state }) => ({
        picker: state.picker === 'mine' ? null : 'mine',
        pickerRole: state.role,
        query: '',
      }),
      'open-enemy': ({ state }) => ({
        picker: state.picker === 'enemy' ? null : 'enemy',
        pickerRole: null,
        query: '',
      }),
      close: () => ({ picker: null, query: '' }),
      'picker-filter-role': ({ data }) => ({
        pickerRole: data.id === 'all' ? null : (data.id as Role),
      }),
      'picker-clear-q': () => ({ query: '' }),
      'pick-mine': ({ data, view }) => {
        void change(view, { mine: data.id!, role: CHAMP_BY_ID[data.id!].roles[0] });
      },
      'pick-enemy': ({ data, view }) => {
        void change(view, { enemy: data.id! });
      },
      'clear-enemy': ({ view }) => {
        void change(view, { enemy: null });
      },
      role: ({ data, view }) => {
        void change(view, { role: data.id as Role });
      },
      'select-preset': ({ data }) => {
        return {
          presetId: data.id as PresetId,
          selectedSituational: 0,
        };
      },
      'select-situational': ({ data }) => ({
        selectedSituational: Number(data.id ?? 0),
      }),
      'import-client': async ({ state, view: v }) => {
        if (state.importing) return {};
        v.set({ importing: true, importToast: null });
        const ch = CHAMP_BY_ID[state.mine];
        const presets = getChampionBuildPresets(state.mine, state.enemy, state.role);
        const activePreset = presets.find((p) => p.id === state.presetId) || presets[0];

        try {
          // 1. Guardar la build en la tienda oficial de LoL
          const buildRes = await importBuildToClient(ch.name, activePreset);
          // 2. Equipar runas vía LCU API
          const runeRes = await importRunesToClient(activePreset.runes, ch.name, activePreset.label);

          let toastMsg = '';
          let isSuccess = false;

          if (runeRes.success && buildRes.success) {
            toastMsg = '✓ ¡Runas equipadas y Build guardada en la Tienda!';
            isSuccess = true;
          } else if (buildRes.success && !runeRes.success) {
            toastMsg = '✓ Build guardada en la Tienda · (Abre LoL para equipar runas)';
            isSuccess = true;
          } else if (runeRes.success) {
            toastMsg = '✓ ¡Runas equipadas en el cliente de LoL!';
            isSuccess = true;
          } else {
            toastMsg = runeRes.message || buildRes.message || 'Error al conectar con LoL';
            isSuccess = false;
          }

          v.set({ importing: false, importToast: { text: toastMsg, success: isSuccess } });
          setTimeout(() => {
            if (v.state.importToast?.text === toastMsg) {
              v.set({ importToast: null });
            }
          }, 6000);
        } catch (err: any) {
          v.set({ importing: false, importToast: { text: `Error: ${err?.message}`, success: false } });
        }
        return {};
      },
    },
    inputs: {
      'q-mine': ({ value }) => ({ query: value }),
      'q-enemy': ({ value }) => ({ query: value }),
    },
  });

  async function change(v: View<State>, patch: Partial<State>) {
    v.set({ ...patch, picker: null, query: '', loading: true, selectedSituational: 0, presetId: 'most-popular' });
    await sleep(250);
    v.set({ loading: false });
  }

  return view;
}
