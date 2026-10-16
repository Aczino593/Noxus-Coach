import { createView, type View } from '../lib/view';
import {
  champIcon,
  itemIcon,
  emptySlot,
  spellIcon,
  perkIcon,
  roleIcon,
  icon,
  gauge,
  fmtNum,
  esc,
  sk,
  type IconName,
} from '../lib/ui';
import { scale, smoothPath, type Pt } from '../lib/charts';
import {
  fetchDetailedMatch,
  type DetailedMatch,
  type ParticipantDetail,
  type MetricCard,
} from '../data/matchDetail';
import { renderGankAnalyzer } from './GankAnalyzer';

export type DetailTab = 'summary' | 'macro' | 'draft' | 'stats';
export type TimelineMetric = 'gold' | 'damage' | 'cs';
export type TimelineComparison = 'all' | 'lane' | 'team' | 'custom';

export interface MatchDetailState {
  loading: boolean;
  matchId: string;
  region: string;
  puuidOrName: string;
  match: DetailedMatch | null;
  activeTab: DetailTab;
  comparison: TimelineComparison;
  metric: TimelineMetric;
  selectedParticipantIds: number[];
  /** participantId del ADC/Support analizado en el Analizador de Ganks (null = por defecto) */
  gankSubject: number | null;
  error?: string;
}

export interface MountMatchDetailOptions {
  matchId: string;
  region: string;
  puuidOrName?: string;
  onBack: () => void;
}

/* ─────────────────────────────────────────────────────────────
 * SUB-COMPONENTES DE LA VISTA DETALLADA
 * ───────────────────────────────────────────────────────────── */

/** 1. CABECERA DE LA PARTIDA */
function renderHeader(s: MatchDetailState): string {
  const m = s.match;
  if (!m) return '';

  const isWin = m.result === 'win';
  const me = m.me;

  const tabs: { id: DetailTab; label: string; icon: IconName }[] = [
    { id: 'summary', label: 'Resumen', icon: 'grid' },
    { id: 'macro', label: 'Entrenador de macro', icon: 'zap' },
    { id: 'draft', label: 'Draft', icon: 'users' },
    { id: 'stats', label: 'Estadísticas', icon: 'chart' },
  ];

  return `
  <header class="card p-4 anim-fade-up">
    <!-- Fila superior: Botón volver + Identificador de partida + Estado -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="btn btn-ghost hover:border-line-strong hover:bg-surface-2"
          data-action="back"
          title="Regresar a la lista de partidas"
        >
          <span class="text-crimson">${icon('arrowLeft', 16)}</span>
          <span class="font-semibold text-ink">Volver al historial</span>
        </button>
        <span class="h-4 w-px bg-line"></span>
        <div class="flex items-center gap-2">
          <span class="chip ${isWin ? 'chip-win' : 'chip-loss'} font-bold">
            ${isWin ? 'VICTORIA' : 'DERROTA'}
          </span>
          <span class="text-[12px] font-medium text-ink-dim">${esc(m.queueLabel)}</span>
          <span class="text-[12px] text-ink-mute">· ID: ${esc(m.id)}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        ${
          m.lp !== null
            ? `<span class="chip ${m.lp >= 0 ? 'chip-win' : 'chip-loss'} font-mono font-bold">
                ${m.lp >= 0 ? '+' : ''}${m.lp} LP
              </span>`
            : ''
        }
        <span class="chip text-ink-mute">${icon('clock', 12)} ${esc(m.durationFormatted)}</span>
        <span class="chip text-ink-mute">${esc(m.date)}</span>
      </div>
    </div>

    <!-- Fila central: Retrato del campeón + Invocador + Spells + Runas + Puntuación de draft -->
    <div class="flex flex-wrap items-center justify-between gap-5">
      <!-- Retrato y Datos del Invocador Principal -->
      <div class="flex items-center gap-4">
        <div class="relative">
          <div class="rounded-xl p-0.5 ${isWin ? 'ring-2 ring-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.35)]' : 'ring-2 ring-crimson shadow-[0_0_16px_rgba(255,46,77,0.35)]'}">
            ${champIcon(me.champ, 64, '!rounded-lg')}
          </div>
          <span class="absolute -bottom-2 -right-1 grid h-6 w-6 place-items-center rounded-lg border border-line-strong bg-canvas text-crimson shadow">
            ${roleIcon(me.role, 14)}
          </span>
        </div>

        <div class="leading-tight">
          <div class="flex items-center gap-2">
            <h2 class="text-[18px] font-extrabold text-ink">${esc(me.champName)}</h2>
            <span class="chip chip-gold !px-1.5 !py-0 text-[10.5px]">TÚ</span>
          </div>
          <div class="mt-1 flex items-center gap-2 text-[12px] text-ink-dim">
            <span>Invocador: <b class="text-ink">${esc(me.name)}</b></span>
            <span>·</span>
            <span class="num font-semibold text-ink">${me.k}/<span class="text-loss">${me.d}</span>/${me.a}</span>
            <span class="text-ink-mute">(${me.kdaRatio.toFixed(2)} KDA)</span>
          </div>
          <div class="mt-1.5 flex items-center gap-2 text-[11px] text-ink-mute">
            <span>${me.cs} CS (${me.csPerMin}/m)</span>
            <span>·</span>
            <span>${(me.gold / 1000).toFixed(1)}k Oro</span>
            <span>·</span>
            <span>${me.damageDealt.toLocaleString()} Daño</span>
          </div>
        </div>

        <!-- Hechizos y Runas -->
        <div class="ml-2 flex items-center gap-1.5 border-l border-line pl-4">
          <div class="grid gap-1">
            ${spellIcon(me.spells[0], 24)}
            ${spellIcon(me.spells[1], 24)}
          </div>
          <div class="grid gap-1">
            ${perkIcon(me.keystone.path, 24, me.keystone.name)}
            ${perkIcon(me.secondary.path, 24, me.secondary.name)}
          </div>
        </div>
      </div>

      <!-- Puntuación de draft (Circular Gauge con estética Crimson Noxus) -->
      <div class="flex items-center gap-6 border-l border-line pl-6">
        <div class="flex items-center gap-3">
          ${gauge(m.draftScore * 20, {
            size: 64,
            stroke: 6,
            valueText: fmtNum(m.draftScore, 1),
            color: m.draftScore >= 4 ? '#e0a96d' : m.draftScore >= 3 ? '#10b981' : '#ff2e4d',
          })}
          <div class="leading-tight">
            <div class="eyebrow text-gold">Draft Score</div>
            <div class="text-[13px] font-bold text-ink">
              ${m.draftScore >= 4.2 ? 'Excelente ventaja' : m.draftScore >= 3.5 ? 'Composición sólida' : 'Draft desfavorable'}
            </div>
            <div class="text-[11px] text-ink-dim">Sinergia calculada 5v5</div>
          </div>
        </div>

        ${
          m.macroScore !== null
            ? `<div class="flex items-center gap-3 border-l border-line/60 pl-6">
                <div class="num grid h-14 w-14 place-items-center rounded-2xl border border-gold/40 text-[18px] font-bold text-gold" style="background:radial-gradient(circle at 50% 30%, rgb(224 169 109 / .2), rgb(224 169 109 / .03));box-shadow:0 0 16px -4px rgb(224 169 109 / .4)">
                  ${m.macroScore}
                </div>
                <div class="leading-tight">
                  <div class="eyebrow text-gold">Macro Score</div>
                  <div class="text-[13px] font-bold text-ink">IA Macro Coaching</div>
                  <div class="text-[11px] text-ink-dim">Toma de decisiones</div>
                </div>
              </div>`
            : ''
        }
      </div>
    </div>

    <!-- Submenú de navegación de partida (Tabs tipo pill) -->
    <nav class="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-3" role="tablist">
      ${tabs
        .map(
          (t) => `
        <button
          type="button"
          class="pill ${s.activeTab === t.id ? '!border-crimson !text-white' : ''}"
          aria-pressed="${s.activeTab === t.id}"
          data-action="tab"
          data-id="${t.id}"
          role="tab"
        >
          ${icon(t.icon, 14)}
          <span>${esc(t.label)}</span>
        </button>`,
        )
        .join('')}
    </nav>
  </header>`;
}

/** 2. TABLERO DE JUGADORES 5v5 (ALIADOS ARRIBA, RIVALES ABAJO) */
function renderPlayerBoard(s: MatchDetailState): string {
  const m = s.match;
  if (!m) return '';

  const renderPlayerCard = (p: ParticipantDetail, isAlly: boolean) => {
    const items = Array.from({ length: 6 }, (_, i) =>
      p.items[i] ? itemIcon(p.items[i], 24) : emptySlot(24),
    );

    const isHighlight = p.isMe;

    return `
    <div class="relative flex flex-col justify-between rounded-xl border ${
      isHighlight
        ? 'border-crimson bg-gradient-to-b from-crimson/15 via-surface to-surface shadow-[0_0_20px_-6px_rgba(255,46,77,0.4)]'
        : 'border-line bg-surface hover:border-line-strong'
    } p-2.5 transition-all">
      <!-- Fila superior: Rol + Campeón + Nombre + Badge conductual -->
      <div class="flex items-center gap-2">
        <div class="relative flex-none">
          <div class="rounded-lg p-0.5 ${isAlly ? 'border border-blue-side/50' : 'border-red-side/50'}">
            ${champIcon(p.champ, 42, '!rounded-md')}
          </div>
          <span class="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded bg-canvas text-[9px] text-ink-dim border border-line">
            ${roleIcon(p.role, 11)}
          </span>
        </div>

        <div class="min-w-0 flex-1 leading-tight">
          <div class="flex items-center gap-1.5 truncate">
            <span class="truncate text-[12px] font-bold text-ink">${esc(p.name)}</span>
            ${p.isMe ? '<span class="chip chip-gold !px-1 !py-0 text-[9px]">TÚ</span>' : ''}
          </div>
          <div class="text-[10.5px] text-ink-mute">${esc(p.champName)}</div>
        </div>
      </div>

      <!-- Badge de etiqueta conductual temática -->
      <div class="my-2">
        <span class="chip ${p.behaviorTag.color} flex items-center gap-1.5 truncate text-[10.5px] font-bold" title="${esc(p.behaviorTag.desc)}">
          ${icon(p.behaviorTag.icon, 12)}
          <span class="truncate">${esc(p.behaviorTag.label)}</span>
        </span>
      </div>

      <!-- Estadísticas de combate KDA + CS + Daño -->
      <div class="rounded-lg bg-canvas/70 p-1.5 text-[11px] leading-tight border border-line/60">
        <div class="flex items-center justify-between">
          <span class="text-ink-mute">K/D/A</span>
          <span class="num font-bold text-ink">
            ${p.k}/<span class="text-loss">${p.d}</span>/${p.a}
          </span>
        </div>
        <div class="mt-1 flex items-center justify-between text-ink-dim">
          <span>CS / min</span>
          <span class="num font-semibold text-ink">${p.cs} (${p.csPerMin})</span>
        </div>
        <div class="mt-1 flex items-center justify-between text-ink-dim">
          <span>Daño</span>
          <span class="num font-semibold text-gold">${(p.damageDealt / 1000).toFixed(1)}k</span>
        </div>
      </div>

      <!-- Objetos del jugador -->
      <div class="mt-2 flex items-center justify-between gap-1">
        <div class="grid grid-cols-6 gap-1">
          ${items.join('')}
        </div>
        ${itemIcon(p.ward, 24)}
      </div>
    </div>`;
  };

  return `
  <section class="card mt-4 p-4 anim-fade-up">
    <!-- Equipo Aliado (Azul) -->
    <div class="mb-5">
      <div class="mb-2.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="h-3 w-1 rounded-full bg-blue-side"></span>
          <h3 class="text-[13px] font-bold uppercase tracking-wider text-blue-side">Tu Equipo (Aliados)</h3>
          <span class="chip chip-win font-mono text-[10.5px] font-bold">${m.blueKills} Kills</span>
        </div>
        <div class="text-[11.5px] text-ink-dim">
          Oro total: <b class="num text-ink">${(m.blueGold / 1000).toFixed(1)}k</b>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        ${m.allies.map((p) => renderPlayerCard(p, true)).join('')}
      </div>
    </div>

    <div class="relative my-4 flex items-center justify-center">
      <span class="absolute inset-x-0 h-px bg-line"></span>
      <span class="relative z-10 flex items-center gap-1.5 rounded-full border border-line-strong bg-canvas px-3 py-0.5 text-[11px] font-extrabold uppercase text-ink-mute">
        ${icon('swords', 12)} VS
      </span>
    </div>

    <!-- Equipo Rival (Rojo) -->
    <div>
      <div class="mb-2.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="h-3 w-1 rounded-full bg-red-side"></span>
          <h3 class="text-[13px] font-bold uppercase tracking-wider text-red-side">Equipo Rival (Enemigos)</h3>
          <span class="chip chip-loss font-mono text-[10.5px] font-bold">${m.redKills} Kills</span>
        </div>
        <div class="text-[11.5px] text-ink-dim">
          Oro total: <b class="num text-ink">${(m.redGold / 1000).toFixed(1)}k</b>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        ${m.enemies.map((p) => renderPlayerCard(p, false)).join('')}
      </div>
    </div>
  </section>`;
}

/** 3. DESGLOSE DE RENDIMIENTO ESTADÍSTICO (GRID DE 6 TARJETAS CON PERCENTILES) */
function renderMetricCards(s: MatchDetailState): string {
  const m = s.match;
  if (!m) return '';

  return `
  <section class="mt-4 anim-fade-up">
    <div class="mb-2.5 flex items-center justify-between">
      <div>
        <h3 class="section-title">Desglose de Rendimiento Estadístico</h3>
        <p class="section-sub">Comparativa individual de tu impacto contra el promedio de invocadores en tu Elo.</p>
      </div>
      <span class="chip chip-gold">${icon('spark', 11)} Itero Analytics</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      ${m.metrics
        .map((card: MetricCard) => {
          return `
          <div class="card p-3.5 flex flex-col justify-between hover:border-line-strong transition-colors">
            <!-- Título + Badge de Percentil -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="grid h-7 w-7 place-items-center rounded-lg border border-line bg-canvas text-gold">
                  ${icon(card.icon, 15)}
                </span>
                <span class="text-[12.5px] font-bold text-ink">${esc(card.title)}</span>
              </div>
              <span class="chip ${card.isHighest ? 'chip-gold' : 'chip-crimson'} font-mono text-[11px] font-bold">
                ${esc(card.percentileBadge)}
              </span>
            </div>

            <!-- Cifra principal -->
            <div class="my-3">
              <div class="num text-[28px] font-extrabold leading-none text-ink">
                ${esc(card.value)}
              </div>
              <div class="mt-1 text-[11px] text-ink-mute">${esc(card.averageText)}</div>
            </div>

            <!-- Barra de progreso bicolor horizontal (Ámbar y Carmesí) con indicador de posición -->
            <div>
              <div class="relative h-2.5 w-full rounded-full bg-surface-3 p-0.5 border border-line-strong overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-700"
                  style="width:${card.progressPercent}%; background:linear-gradient(90deg, #e0a96d 0%, #ff2e4d 100%); box-shadow:0 0 10px rgba(255,46,77,0.5)"
                ></div>
              </div>
              <div class="mt-1 flex items-center justify-between text-[10px] text-ink-mute font-mono">
                <span>Bajo</span>
                <span>Promedio</span>
                <span class="text-gold">Top Tier</span>
              </div>
            </div>
          </div>`;
        })
        .join('')}
    </div>
  </section>`;
}

/** 4. GRÁFICO DE COMPARACIÓN TEMPORAL (TIMELINE SVG) */
function renderTimelineChart(s: MatchDetailState): string {
  const m = s.match;
  if (!m) return '';

  const W = 920;
  const H = 260;
  const padL = 50;
  const padR = 24;
  const padT = 20;
  const padB = 35;

  const dataset =
    s.metric === 'damage'
      ? m.timelineDamage
      : s.metric === 'cs'
      ? m.timelineCs
      : m.timelineGold;

  const selectedIds = new Set(s.selectedParticipantIds);

  // Calcular valor máximo para escalar el eje Y
  let maxVal = 100;
  for (const point of dataset) {
    for (const id of selectedIds) {
      const v = point.values[id] ?? 0;
      if (v > maxVal) maxVal = v;
    }
  }
  // Margen superior
  maxVal = Math.ceil(maxVal * 1.1);

  const maxMin = Math.max(1, m.minutes[m.minutes.length - 1] ?? 30);

  // Generar cuadrícula horizontal de Y (4 líneas)
  const ySteps = 4;
  const yLines: string[] = [];
  for (let i = 0; i <= ySteps; i++) {
    const val = Math.round((maxVal / ySteps) * i);
    const y = scale(val, 0, maxVal, H - padB, padT);
    const label =
      s.metric === 'cs'
        ? String(val)
        : val >= 1000
        ? `${(val / 1000).toFixed(0)}k`
        : String(val);

    yLines.push(`
      <line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="#232733" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="${padL - 8}" y="${y + 4}" fill="#5f6678" font-size="10" font-family="var(--font-mono)" text-anchor="end">${label}</text>
    `);
  }

  // Generar marcas de tiempo en X (cada 5 minutos)
  const xLabels: string[] = [];
  for (let min = 0; min <= maxMin; min += 5) {
    const x = scale(min, 0, maxMin, padL, W - padR);
    xLabels.push(`
      <line x1="${x}" x2="${x}" y1="${H - padB}" y2="${H - padB + 5}" stroke="#323849" stroke-width="1.2"/>
      <line x1="${x}" x2="${x}" y1="${padT}" y2="${H - padB}" stroke="#232733" stroke-width="0.7" stroke-dasharray="2 4"/>
      <text x="${x}" y="${H - padB + 18}" fill="#9aa1b2" font-size="10" font-family="var(--font-mono)" text-anchor="middle">${min}m</text>
    `);
  }

  // Generar trazados de líneas para los campeones seleccionados
  const lines: string[] = [];
  for (const p of m.allParticipants) {
    if (!selectedIds.has(p.participantId)) continue;

    const pts: Pt[] = dataset.map((pt) => [
      scale(pt.minute, 0, maxMin, padL, W - padR),
      scale(pt.values[p.participantId] ?? 0, 0, maxVal, H - padB, padT),
    ]);

    const pathD = smoothPath(pts);
    const lastPt = pts[pts.length - 1];
    const isMe = p.isMe;

    lines.push(`
      <g>
        <path
          d="${pathD}"
          fill="none"
          stroke="${p.timelineColor}"
          stroke-width="${isMe ? 3.2 : 1.8}"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="${isMe ? 'filter:drop-shadow(0 0 8px rgba(255,46,77,0.7))' : 'opacity:0.85'}"
        />
        <circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="${isMe ? 5 : 3.5}" fill="${p.timelineColor}" stroke="#0b0c10" stroke-width="1.5"/>
      </g>
    `);
  }

  const renderSelectorBox = (title: string, players: ParticipantDetail[], isAlly: boolean) => `
    <div class="rounded-xl border border-line bg-canvas/80 p-2.5">
      <div class="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider ${isAlly ? 'text-blue-side' : 'text-red-side'}">
        <span>${title}</span>
        <span class="text-[10px] text-ink-mute">${players.filter((p) => selectedIds.has(p.participantId)).length}/5</span>
      </div>
      <div class="grid grid-cols-5 gap-1.5">
        ${players
          .map((p) => {
            const isChecked = selectedIds.has(p.participantId);
            return `
            <label
              class="group relative flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-1.5 transition-all ${
                isChecked
                  ? 'border-line-strong bg-surface-2'
                  : 'border-transparent bg-transparent opacity-40 hover:opacity-80'
              }"
              title="${esc(p.name)} (${esc(p.champName)})"
            >
              <input
                type="checkbox"
                class="sr-only"
                data-change="toggle-player"
                data-id="${p.participantId}"
                ${isChecked ? 'checked' : ''}
              />
              <div class="relative">
                ${champIcon(p.champ, 30, '!rounded-md')}
                <span
                  class="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-canvas"
                  style="background:${p.timelineColor}"
                ></span>
              </div>
              <span class="truncate text-[10px] font-semibold text-ink max-w-[50px] text-center">
                ${esc(p.champName)}
              </span>
            </label>`;
          })
          .join('')}
      </div>
    </div>`;

  return `
  <section class="card mt-4 p-4 anim-fade-up">
    <!-- Encabezado de la comparativa y selectores desplegables -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
      <div>
        <h3 class="section-title">Gráfico de Comparación Temporal</h3>
        <p class="section-sub">Evolución minuto a minuto de oro, daño y ritmo de farmeo.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Selector Desplegable: Comparación -->
        <div class="field !min-w-[170px] !py-1">
          <label for="select-timeline-comparison">Comparación</label>
          <select id="select-timeline-comparison" data-change="comparison">
            <option value="all" ${s.comparison === 'all' ? 'selected' : ''}>Todos los jugadores</option>
            <option value="lane" ${s.comparison === 'lane' ? 'selected' : ''}>Tu carril directo</option>
            <option value="team" ${s.comparison === 'team' ? 'selected' : ''}>Tu equipo</option>
            <option value="custom" ${s.comparison === 'custom' ? 'selected' : ''}>Selección manual</option>
          </select>
        </div>

        <!-- Selector Desplegable: Estadística -->
        <div class="field !min-w-[150px] !py-1">
          <label for="select-timeline-metric">Estadística</label>
          <select id="select-timeline-metric" data-change="metric">
            <option value="gold" ${s.metric === 'gold' ? 'selected' : ''}>Oro acumulado</option>
            <option value="damage" ${s.metric === 'damage' ? 'selected' : ''}>Daño infligido</option>
            <option value="cs" ${s.metric === 'cs' ? 'selected' : ''}>CS / Farm</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Cajas interactivas de invocadores: TU EQUIPO y EQUIPO ENEMIGO -->
    <div class="my-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
      ${renderSelectorBox('TU EQUIPO', m.allies, true)}
      ${renderSelectorBox('EQUIPO ENEMIGO', m.enemies, false)}
    </div>

    <!-- Gráfica SVG de Líneas de Tiempo -->
    <div class="mt-2 rounded-xl border border-line bg-canvas p-2.5">
      <svg
        viewBox="0 0 ${W} ${H}"
        class="h-[260px] w-full"
        role="img"
        aria-label="Curva temporal de progresión"
      >
        <!-- Eje Y y cuadrícula horizontal -->
        ${yLines.join('')}

        <!-- Eje X y marcas cada 5 min -->
        ${xLabels.join('')}

        <!-- Trazados de campeones activos -->
        ${lines.join('')}
      </svg>
    </div>
  </section>`;
}

/** 5. PESTAÑA: ENTRENADOR DE MACRO */
function renderMacroTab(s: MatchDetailState): string {
  const m = s.match;
  if (!m) return '';

  const decisions = [
    {
      time: '08:30',
      type: 'good',
      title: 'Control y prioridad en Larvas del Vacío',
      desc: 'Rotación con push de oleada previo al spawn; facilitó la captura de 3 larvas para el equipo.',
    },
    {
      time: '14:20',
      type: 'warn',
      title: 'Gestión de oleada tras caída de Torre Exterior',
      desc: 'Extensión sin visión de río mientras el jungla rival realizaba pathing hacia top.',
    },
    {
      time: '22:15',
      type: 'good',
      title: 'Control de visión en fosa de Dragón',
      desc: 'Limpieza de 2 centinelas enemigos evitando emboscada por flanco.',
    },
    {
      time: '31:40',
      type: m.result === 'win' ? 'good' : 'bad',
      title: 'Decisión de pelea en Barón Nashor',
      desc:
        m.result === 'win'
          ? 'Iniciación perfecta sobre el tirador rival cerrando la partida de inmediato.'
          : 'Falta de teleport coordinado; la desventaja numérica costó inhibidor central.',
    },
  ];

  return `
  <section class="mt-4 grid gap-4 anim-fade-up">
    <div class="card p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 class="section-title">Coaching Estratégico de Macro</h3>
          <p class="section-sub">Auditoría automática de decisiones en mapa y control de tempos.</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="num text-[32px] font-extrabold text-gold">${m.macroScore ?? 78}/100</span>
          <span class="chip chip-gold font-bold">Nivel Diamante</span>
        </div>
      </div>

      <div class="mt-5 grid gap-3">
        ${decisions
          .map(
            (d) => `
          <div class="card-inset flex items-start gap-3.5 p-3.5">
            <span class="num flex-none rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-ink">
              ${d.time}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="${d.type === 'good' ? 'text-win' : d.type === 'warn' ? 'text-gold' : 'text-loss'}">
                  ${icon(d.type === 'good' ? 'check' : 'alert', 15)}
                </span>
                <div class="text-[13px] font-bold text-ink">${esc(d.title)}</div>
              </div>
              <p class="mt-1 text-[12px] text-ink-dim">${esc(d.desc)}</p>
            </div>
          </div>`,
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

/** 6. PESTAÑA: DRAFT */
function renderDraftTab(s: MatchDetailState): string {
  const m = s.match;
  if (!m) return '';

  return `
  <section class="mt-4 grid gap-4 anim-fade-up">
    <div class="card p-5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="section-title">Análisis de Composición 5v5 (Draft)</h3>
          <p class="section-sub">Sinergias de daño, control de masas y curvas de poder.</p>
        </div>
        <span class="chip chip-gold font-mono font-bold">Puntuación: ${m.draftScore.toFixed(1)} / 5.0</span>
      </div>

      <div class="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="card-inset p-3.5 text-center">
          <div class="eyebrow text-ink-mute">Reparto de Daño</div>
          <div class="num mt-2 text-[20px] font-bold text-ink">62% AD · 34% AP · 4% True</div>
          <div class="mt-1 text-[11px] text-ink-dim">Composición equilibrada contra resistencias</div>
        </div>

        <div class="card-inset p-3.5 text-center">
          <div class="eyebrow text-ink-mute">Control de Masas Duro</div>
          <div class="num mt-2 text-[20px] font-bold text-gold">7.2s encadenables</div>
          <div class="mt-1 text-[11px] text-ink-dim">Gran capacidad de iniciación en peleas de equipo</div>
        </div>

        <div class="card-inset p-3.5 text-center">
          <div class="eyebrow text-ink-mute">Curva de Poder</div>
          <div class="num mt-2 text-[20px] font-bold text-crimson">Fuerte en Mid-Late</div>
          <div class="mt-1 text-[11px] text-ink-dim">Pico de poder a los 2 items (min 18-26)</div>
        </div>
      </div>
    </div>
  </section>`;
}

/** 7. PESTAÑA: ESTADÍSTICAS */
function renderStatsTab(s: MatchDetailState): string {
  const m = s.match;
  if (!m) return '';

  const renderTableRows = (players: ParticipantDetail[]) =>
    players
      .map(
        (p) => `
      <tr class="border-b border-line/60 hover:bg-surface-2 transition-colors ${p.isMe ? 'bg-crimson/5' : ''}">
        <td class="py-2.5 px-3">
          <div class="flex items-center gap-2">
            ${champIcon(p.champ, 32, '!rounded-md')}
            <div class="leading-tight">
              <div class="flex items-center gap-1">
                <span class="font-bold text-[12px] text-ink">${esc(p.name)}</span>
                ${p.isMe ? '<span class="chip chip-gold !px-1 !py-0 text-[9px]">TÚ</span>' : ''}
              </div>
              <span class="text-[10.5px] text-ink-mute">${esc(p.champName)}</span>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 num font-bold ${p.isMe ? 'text-gold' : 'text-ink'}">${p.k}/${p.d}/${p.a}</td>
        <td class="py-2.5 px-3 num font-semibold text-ink">${p.cs} (${p.csPerMin}/m)</td>
        <td class="py-2.5 px-3 num font-bold text-crimson">${p.damageDealt.toLocaleString()}</td>
        <td class="py-2.5 px-3 num text-ink-dim">${p.damageTaken.toLocaleString()}</td>
        <td class="py-2.5 px-3 num text-gold">${(p.gold / 1000).toFixed(1)}k</td>
        <td class="py-2.5 px-3 num text-sky-400">${p.visionScore} (${p.controlWards} wards)</td>
      </tr>`,
      )
      .join('');

  return `
  <section class="card mt-4 p-4 anim-fade-up overflow-x-auto">
    <h3 class="section-title mb-3">Estadísticas Completas de Combate</h3>
    <table class="w-full text-left border-collapse text-[12px]">
      <thead>
        <tr class="border-b border-line text-ink-mute text-[10.5px] uppercase">
          <th class="py-2 px-3">Invocador / Campeón</th>
          <th class="py-2 px-3">KDA</th>
          <th class="py-2 px-3">CS</th>
          <th class="py-2 px-3">Daño Infligido</th>
          <th class="py-2 px-3">Daño Recibido</th>
          <th class="py-2 px-3">Oro</th>
          <th class="py-2 px-3">Visión</th>
        </tr>
      </thead>
      <tbody>
        <tr><td colspan="7" class="py-2 px-3 font-bold text-blue-side bg-surface-2 text-[11px] uppercase tracking-wider">Tu Equipo (Aliados)</td></tr>
        ${renderTableRows(m.allies)}
        <tr><td colspan="7" class="py-2 px-3 font-bold text-red-side bg-surface-2 text-[11px] uppercase tracking-wider">Equipo Rival (Enemigos)</td></tr>
        ${renderTableRows(m.enemies)}
      </tbody>
    </table>
  </section>`;
}

/* ─────────────────────────────────────────────────────────────
 * FUNCIÓN PRINCIPAL DE MONTAJE (mountMatchDetailView)
 * ───────────────────────────────────────────────────────────── */
export function mountMatchDetailView(
  root: HTMLElement,
  options: MountMatchDetailOptions,
): View<MatchDetailState> {
  const { matchId, region, puuidOrName = 'Acz593', onBack } = options;

  const view = createView<MatchDetailState>({
    root,
    state: {
      loading: true,
      matchId,
      region,
      puuidOrName,
      match: null,
      activeTab: 'summary',
      comparison: 'all',
      metric: 'gold',
      selectedParticipantIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      gankSubject: null,
    },
    render: (s) => {
      if (s.loading) {
        return `
        <div class="card p-6 anim-fade-up">
          <div class="flex items-center gap-3">
            <button class="btn btn-ghost" data-action="back">${icon('arrowLeft', 16)} Volver</button>
            <span class="text-ink-dim">Cargando desglose analítico de la partida...</span>
          </div>
          <div class="mt-4 grid gap-3">
            ${sk('h-[140px] w-full !rounded-xl')}
            ${sk('h-[280px] w-full !rounded-xl')}
            ${sk('h-[200px] w-full !rounded-xl')}
          </div>
        </div>`;
      }

      if (!s.match) {
        return `
        <div class="card p-8 text-center anim-fade-up">
          <div class="text-[16px] font-bold text-loss">No se pudo cargar la partida</div>
          <p class="mt-2 text-[12.5px] text-ink-dim">${esc(s.error || 'La información de la partida no está disponible.')}</p>
          <button class="btn btn-primary mt-4" data-action="back">${icon('arrowLeft', 14)} Volver al historial</button>
        </div>`;
      }

      let tabContent = '';
      if (s.activeTab === 'summary') {
        tabContent = `
          ${renderPlayerBoard(s)}
          ${renderMetricCards(s)}
          ${s.match ? renderGankAnalyzer(s.match, s.gankSubject) : ''}
          ${renderTimelineChart(s)}
        `;
      } else if (s.activeTab === 'macro') {
        tabContent = renderMacroTab(s);
      } else if (s.activeTab === 'draft') {
        tabContent = renderDraftTab(s);
      } else if (s.activeTab === 'stats') {
        tabContent = renderStatsTab(s);
      }

      return `
      <div class="match-detail-view pb-8">
        ${renderHeader(s)}
        ${tabContent}
      </div>`;
    },
    actions: {
      back: () => {
        onBack();
      },
      tab: ({ data }) => {
        const tab = data.id as DetailTab;
        return { activeTab: tab };
      },
      'gank-subject': ({ data }) => {
        return { gankSubject: Number(data.id) };
      },
    },
    changes: {
      comparison: ({ value, state }) => {
        const comp = value as TimelineComparison;
        const m = state.match;
        if (!m) return { comparison: comp };

        let ids: number[] = [];
        if (comp === 'all') {
          ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        } else if (comp === 'lane') {
          const meRole = m.me.role;
          const rival = m.enemies.find((e) => e.role === meRole);
          ids = [m.me.participantId, rival ? rival.participantId : 6];
        } else if (comp === 'team') {
          ids = m.allies.map((a) => a.participantId);
        } else {
          ids = state.selectedParticipantIds;
        }

        return { comparison: comp, selectedParticipantIds: ids };
      },
      metric: ({ value }) => {
        return { metric: value as TimelineMetric };
      },
      'toggle-player': ({ el, state }) => {
        const input = el as HTMLInputElement;
        const id = Number(input.dataset.id);
        const current = new Set(state.selectedParticipantIds);

        if (input.checked) {
          current.add(id);
        } else {
          current.delete(id);
        }

        return {
          comparison: 'custom',
          selectedParticipantIds: Array.from(current),
        };
      },
    },
  });

  // Cargar datos asíncronamente
  void (async () => {
    try {
      const match = await fetchDetailedMatch(matchId, region, puuidOrName);
      view.set({
        match,
        loading: false,
        selectedParticipantIds: match.allParticipants.map((p) => p.participantId),
      });
    } catch (err: unknown) {
      view.set({
        loading: false,
        error: err instanceof Error ? err.message : 'Error desconocido al cargar la partida',
      });
    }
  })();

  return view;
}
