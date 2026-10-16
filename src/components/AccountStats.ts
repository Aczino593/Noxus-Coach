import { createView, type View } from '../lib/view';
import { champIcon, gauge, icon, itemIcon, pct, roleIcon, sk, statBar, tierColor } from '../lib/ui';
import { fetchAccountStats, fetchMatches } from '../data/api';
import { fetchDetailedMatch, type DetailedMatch } from '../data/matchDetail';
import {
  farmReport,
  visionReport,
  LIGHT_COLOR,
  CS_TARGET,
  GOLD_PER_CS,
  type Light,
  type FarmReport,
  type VisionReport,
} from '../lib/fundamentals';
import { EARLY_AGGRESSION, KILL_TARGETS, TEAM_SHARES, type Match, type StatGroup } from '../data/mock';
import { ROLE_LABEL } from '../types';

interface State {
  loading: boolean;
  matches: Match[];
  selectedMatchId: string;
  detailedMatch: DetailedMatch | null;
  groups: StatGroup[];
}

function panel(title: string, sub: string, body: string, extra = ''): string {
  return `
  <section class="card p-5 ${extra}">
    <h3 class="section-title">${title}</h3>
    <p class="section-sub mt-0.5">${sub}</p>
    <div class="mt-4">${body}</div>
  </section>`;
}

/* ─────────────── Semáforo Visual de 3 Luces ─────────────── */
function trafficLightWidget(light: Light, label: string): string {
  const isRed = light === 'red';
  const isYellow = light === 'yellow';
  const isGreen = light === 'green';

  return `
  <div class="flex items-center gap-2.5 p-1.5 px-3.5 rounded-full bg-canvas border border-line-strong shadow-inner">
    <!-- Luz Roja (< 5.0) -->
    <div class="relative flex items-center justify-center">
      <span class="w-3.5 h-3.5 rounded-full transition-all duration-300"
            style="background: ${isRed ? '#ef4444' : '#321419'};
                   box-shadow: ${isRed ? '0 0 14px 2px #ef4444' : 'none'};
                   border: 1px solid ${isRed ? '#ef4444' : '#4d1e25'}"></span>
    </div>
    <!-- Luz Amarilla (5.0 - 6.5) -->
    <div class="relative flex items-center justify-center">
      <span class="w-3.5 h-3.5 rounded-full transition-all duration-300"
            style="background: ${isYellow ? '#f5b942' : '#332914'};
                   box-shadow: ${isYellow ? '0 0 14px 2px #f5b942' : 'none'};
                   border: 1px solid ${isYellow ? '#f5b942' : '#4d3d1e'}"></span>
    </div>
    <!-- Luz Verde (> 7.0) -->
    <div class="relative flex items-center justify-center">
      <span class="w-3.5 h-3.5 rounded-full transition-all duration-300"
            style="background: ${isGreen ? '#10b981' : '#0e2b20'};
                   box-shadow: ${isGreen ? '0 0 14px 2px #10b981' : 'none'};
                   border: 1px solid ${isGreen ? '#10b981' : '#164231'}"></span>
    </div>
    <span class="text-[11.5px] font-bold uppercase tracking-wider ml-1" style="color: ${LIGHT_COLOR[light]}">${label}</span>
  </div>`;
}

/* ─────────────── Tarjeta Destacada 1: Farmeo (CS) ─────────────── */
function farmCard(farm: FarmReport, durationSec: number): string {
  const mins = Math.floor(durationSec / 60);
  const secs = String(durationSec % 60).padStart(2, '0');

  if (!farm.applicable) {
    return `
    <div class="card p-5 border-line flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-crimson font-bold text-[14px]">
            ${icon('sword', 17)} Diagnóstico de Farmeo (CS)
          </div>
          <span class="chip chip-gold">Soporte</span>
        </div>
        <p class="text-[12px] text-ink-dim mt-1.5 leading-relaxed">${farm.message}</p>
      </div>
      <div class="card-inset p-3.5 mt-4 text-[12px] text-ink-dim">
        Tu impacto se mide principalmente en puntuación de visión, protección y presencia en peleas de equipo.
      </div>
    </div>`;
  }

  return `
  <div class="card p-5 border-line flex flex-col justify-between">
    <div>
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 text-crimson font-bold text-[14px]">
            ${icon('sword', 17)} Diagnóstico de Farmeo (CS)
          </div>
          <p class="text-[11.5px] text-ink-dim mt-0.5">Ritmo de súbditos y conversión de oro frente a la meta de ${CS_TARGET}.0 CS/m.</p>
        </div>
        ${trafficLightWidget(farm.light, farm.label)}
      </div>

      <div class="flex items-baseline gap-4 mt-4">
        <div class="num text-[36px] font-extrabold leading-none tracking-tight" style="color: ${LIGHT_COLOR[farm.light]}">
          ${farm.csPerMin.toFixed(1)} <span class="text-[14px] font-medium text-ink-dim">CS/min</span>
        </div>
        <div class="text-[12px] text-ink-dim">
          Total: <strong class="text-ink font-bold">${farm.cs} súbditos</strong> en ${mins}m ${secs}s
        </div>
      </div>

      <!-- Semáforo legend -->
      <div class="flex items-center gap-4 text-[10.5px] text-ink-mute mt-2 border-b border-line pb-2.5">
        <span class="flex items-center gap-1.5"><i class="w-2 h-2 rounded-full bg-loss"></i>Rojo: &lt; 5.0</span>
        <span class="flex items-center gap-1.5"><i class="w-2 h-2 rounded-full bg-[#f5b942]"></i>Amarillo: 5.0 - 6.5</span>
        <span class="flex items-center gap-1.5"><i class="w-2 h-2 rounded-full bg-win"></i>Verde: &gt; 7.0</span>
      </div>

      <!-- Mensaje pedagógico -->
      <div class="mt-3 p-3 rounded-lg border text-[12px] leading-relaxed" style="background: ${LIGHT_COLOR[farm.light]}12; border-color: ${LIGHT_COLOR[farm.light]}33; color: var(--color-ink)">
        <strong style="color: ${LIGHT_COLOR[farm.light]}">${farm.message}</strong>
      </div>
    </div>

    <!-- Estimación de oro perdido -->
    <div class="mt-4 card-inset p-3.5 border border-gold/30 bg-gold/5 flex items-start gap-3">
      <div class="w-8 h-8 rounded-lg bg-gold/15 border border-gold/30 grid place-items-center text-gold flex-none mt-0.5">
        ${icon('coin', 18)}
      </div>
      <div class="text-[12px] leading-snug">
        <div class="text-gold font-bold text-[13px]">
          ${farm.lostGold > 0 ? `Has perdido ~${farm.lostGold.toLocaleString()} de oro en súbditos no farmeados` : '¡Ritmo óptimo de oro por súbditos!'}
        </div>
        <p class="text-ink-dim mt-1 text-[11.5px]">
          ${farm.lostGold > 0
            ? `Te faltaron <strong class="text-ink font-semibold">${farm.lostCs} súbditos</strong> para alcanzar el estándar competitivo de ${CS_TARGET}.0 CS/m (~${GOLD_PER_CS}g por súbdito).`
            : `Mantienes una ventaja económica constante sin desaprovechar oleadas.`}
          <span class="block text-ink-mute text-[10.5px] mt-1">💡 Regla de oro: Cada 15 súbditos equivalen aproximadamente a un asesinato (~300g). Farmeas con consistencia y obtendrás tus picos de poder sin asumir riesgos innecesarios.</span>
        </p>
      </div>
    </div>
  </div>`;
}

/* ─────────────── Tarjeta Destacada 2: Visión y Control Wards ─────────────── */
function visionCard(vision: VisionReport, durationSec: number, role: string): string {
  const mins = Math.floor(durationSec / 60);

  return `
  <div class="card p-5 border-line flex flex-col justify-between">
    <div>
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 text-crimson font-bold text-[14px]">
            ${icon('eye', 17)} Control de Visión & Wards de Control
          </div>
          <p class="text-[11.5px] text-ink-dim mt-0.5">Puntuación por minuto y uso de Wards de Control para proteger tu carril.</p>
        </div>
        <span class="chip ${vision.noPink ? 'chip-loss' : 'chip-win'} font-bold">
          ${vision.noPink ? 'Visión Deficiente' : 'Buena Cobertura'}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-4 mt-4">
        <!-- Puntuación de visión / min -->
        <div class="card-inset p-3">
          <div class="text-[11px] text-ink-dim font-medium">Puntuación de Visión</div>
          <div class="num text-[26px] font-extrabold leading-tight mt-0.5" style="color: ${LIGHT_COLOR[vision.light]}">
            ${vision.visionPerMin.toFixed(2)} <span class="text-[12px] font-normal text-ink-dim">pts/min</span>
          </div>
          <div class="text-[11px] text-ink-mute mt-1">
            Total: <strong class="text-ink">${vision.visionScore} pts</strong> · Meta (${role}): <strong class="text-ink">${vision.target}</strong>
          </div>
        </div>

        <!-- Wards de Control comprados -->
        <div class="card-inset p-3 flex items-center gap-3">
          <div class="flex-none">
            ${itemIcon(2055, 34)}
          </div>
          <div>
            <div class="num text-[22px] font-extrabold leading-tight ${vision.controlWards <= 1 ? 'text-loss' : 'text-win'}">
              ${vision.controlWards} <span class="text-[12px] font-normal text-ink-dim">Pinks comprados</span>
            </div>
            <div class="text-[11px] text-ink-mute mt-0.5">
              Recomendado en ${mins}m: <strong class="text-ink">≥ ${vision.controlTarget} pinks</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Advertencia en ROJO si compró 0 o 1 pink -->
    ${vision.noPink ? `
      <div class="mt-4 p-4 rounded-xl border border-loss/50 bg-loss/10 text-loss flex items-start gap-3.5 shadow-lg shadow-loss/10">
        <div class="w-8 h-8 rounded-lg bg-loss/20 border border-loss/40 grid place-items-center text-loss flex-none mt-0.5">
          ${icon('alert', 18)}
        </div>
        <div class="text-[12px] leading-relaxed flex-1">
          <div class="font-bold text-[13px] text-loss">
            ${vision.message}
          </div>
          <p class="text-ink-dim mt-1 text-[11.5px]">
            En una partida de <strong class="text-ink">${mins} minutos</strong>, compraste solo <strong class="text-loss font-bold">${vision.controlWards} Ward de Control</strong>. Sin visión denegada en río y objetivos, el jungla enemigo tiene vía libre para emboscarte.
          </p>
          <div class="mt-2 text-[11px] font-semibold text-loss/90 bg-loss/15 p-2 rounded border border-loss/20">
            🛡️ Hábito pedagógico: Cada vez que vuelvas a base con 75 de oro libre, compra 1 Ward de Control y colócalo inmediatamente en el tribush o arbusto de río.
          </div>
        </div>
      </div>
    ` : `
      <div class="mt-4 p-4 rounded-xl border border-win/40 bg-win/10 text-win flex items-start gap-3.5">
        <div class="w-8 h-8 rounded-lg bg-win/20 border border-win/30 grid place-items-center text-win flex-none mt-0.5">
          ${icon('check', 18)}
        </div>
        <div class="text-[12px] leading-relaxed flex-1">
          <div class="font-bold text-[13px] text-win">
            ${vision.message}
          </div>
          <p class="text-ink-dim mt-1 text-[11.5px]">
            Invertir en visión constante te permitió proteger las entradas de tu línea y disputar objetivos sin temor a emboscadas ciegas.
          </p>
        </div>
      </div>
    `}
  </div>`;
}

/* ─────────────── ¿A quién estás matando? ─────────────── */
function killTargets(loading: boolean): string {
  const H = 140;
  const body = loading
    ? `<div class="flex justify-between gap-4 px-4">${Array.from({ length: 5 }, () => sk('h-[180px] w-8')).join('')}</div>`
    : `<div class="flex items-end justify-around px-2">${KILL_TARGETS.map((t) => {
        const h = Math.max(6, (t.value / 100) * H);
        const c = tierColor(t.value);
        return `<div class="flex flex-col items-center gap-2">
          <span class="num text-[12px] font-bold" style="color:${c}">${pct(t.value)}</span>
          <div class="relative w-[14px] overflow-hidden rounded-full bg-[#1b1e28]" style="height:${H}px">
            <div class="bar-fill absolute inset-x-0 bottom-0 !rounded-full" style="height:${h}px;background:linear-gradient(0deg, ${c}, ${c}cc);box-shadow:0 0 12px -2px ${c}"></div>
          </div>
          <span class="grid h-8 w-8 place-items-center rounded-lg border border-line-strong bg-canvas text-crimson" data-tip="${ROLE_LABEL[t.role]}">${roleIcon(t.role, 16)}</span>
        </div>`;
      }).join('')}</div>`;
  return panel('¿A quién estás matando?', 'Frecuencia con la que eliminas a rivales de cada posición.', body);
}

/* ─────────────── Resumen Estadístico Clásico (Gauges + Barras) ─────────────── */
function summary(s: State): string {
  const body = s.loading
    ? Array.from({ length: 3 }, () => `<div class="flex items-center gap-6 py-4"><div class="skeleton h-[110px] w-[110px] !rounded-full"></div><div class="flex-1 space-y-3">${sk('h-3 w-full')}${sk('h-3 w-full')}${sk('h-3 w-4/5')}</div></div>`).join('')
    : s.groups
        .map(
          (g, idx) => `
        <div class="flex items-center gap-6 ${idx ? 'border-t border-line pt-4 mt-4' : ''}">
          <div class="flex-none">${gauge(g.score, { size: 114, stroke: 13, label: g.label })}</div>
          <div class="grid flex-1 gap-2.5">${g.rows.map((r) => statBar(r.label, r.value)).join('')}</div>
        </div>`,
        )
        .join('');
  return panel('Percentiles de Rendimiento', 'Comparativa global de tus estadísticas promedio frente al Elo Plata.', body);
}

/* ─────────────── Agresión al principio del juego ─────────────── */
function earlyAggression(loading: boolean): string {
  const body = loading
    ? `<div class="flex items-center gap-6"><div class="skeleton h-[110px] w-[110px] !rounded-full"></div><div class="flex-1 space-y-3">${sk('h-3 w-full')}${sk('h-3 w-full')}</div></div>`
    : `<div class="flex items-center gap-6">
        ${gauge(EARLY_AGGRESSION.overall, { size: 114, stroke: 13, label: 'General', color: 'var(--color-crimson)' })}
        <div class="grid flex-1 gap-2.5">${EARLY_AGGRESSION.rows.map((r) => statBar(r.label, r.value)).join('')}</div>
      </div>`;
  return panel('Agresión en Early Game (0-7 min)', '¿Con qué frecuencia buscas intercambios de daño y presión antes del primer regreso a base?', body);
}

/* ─────────────── Porcentajes de equipo ─────────────── */
function teamShares(loading: boolean): string {
  const body = loading
    ? `<div class="grid grid-cols-3 gap-4">${sk('h-14')}${sk('h-14')}${sk('h-14')}</div>`
    : `<div class="grid grid-cols-3 text-center gap-2">${TEAM_SHARES.map((t) => {
        const color = t.value >= 22 ? 'var(--color-gold)' : t.value >= 18 ? 'var(--color-win)' : 'var(--color-loss)';
        return `<div class="card-inset p-3">
          <div class="num text-[24px] font-bold leading-none" style="color:${color}">${t.value}%</div>
          <div class="mt-1 text-[11px] text-ink-dim">${t.label}</div>
          <div class="bar-track mx-auto mt-2 w-20"><div class="bar-fill" style="width:${t.value * 3}%;background:${color}"></div></div>
        </div>`;
      }).join('')}</div>`;
  return panel('Participación en el Equipo', 'Porcentaje de Daño, Oro y Experiencia que aportas al total del equipo.', body);
}

export function mountAccountStats(root: HTMLElement) {
  const view = createView<State>({
    root,
    state: {
      loading: true,
      matches: [],
      selectedMatchId: 'm1',
      detailedMatch: null,
      groups: [],
    },
    render: (s) => {
      if (s.loading || !s.detailedMatch) {
        return `
        <div class="space-y-4">
          <div class="card p-4 flex items-center justify-between">
            <div class="skeleton h-5 w-72"></div>
            <div class="skeleton h-8 w-24"></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="card p-6 h-64 skeleton"></div>
            <div class="card p-6 h-64 skeleton"></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="card p-6 h-64 skeleton"></div>
            <div class="card p-6 h-64 skeleton"></div>
          </div>
        </div>`;
      }

      const dm = s.detailedMatch;
      const me = dm.me;
      const farm = farmReport(me.cs, dm.durationSec, me.role);
      const vision = visionReport(me.visionScore, me.controlWards, dm.durationSec, me.role);

      return `
      <div class="space-y-4">
        <!-- Barra Superior: Selector de Partida para Diagnóstico de Fundamentos -->
        <div class="card p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="eyebrow text-crimson">Diagnóstico de Partida:</span>
            <div class="flex flex-wrap items-center gap-2">
              ${s.matches.slice(0, 5).map((m) => {
                const active = m.id === s.selectedMatchId;
                const isWin = m.result === 'win';
                return `
                <button class="pill !h-8 !px-2.5 !gap-2 text-[11.5px] ${active ? '!border-crimson !bg-crimson/15 text-white font-bold' : ''}"
                        data-action="selectMatch" data-id="${m.id}" aria-pressed="${active}">
                  ${champIcon(m.champ, 20)}
                  <span>${m.champ}</span>
                  <span class="chip ${isWin ? 'chip-win' : 'chip-loss'} !text-[9.5px] !py-0 !px-1.5">${isWin ? 'VIC' : 'DER'}</span>
                </button>`;
              }).join('')}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button class="btn btn-sm" data-action="reload" title="Recalcular métricas">
              ${icon('refresh', 12)} Actualizar
            </button>
          </div>
        </div>

        <!-- SECCIÓN PRINCIPAL: LOS 2 FUNDAMENTOS CLAVE (CS + VISIÓN) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          ${farmCard(farm, dm.durationSec)}
          ${visionCard(vision, dm.durationSec, ROLE_LABEL[me.role])}
        </div>

        <!-- SECCIÓN SECUNDARIA: AGRESIVIDAD, PARTICIPACIÓN Y PERCENTILES -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          ${summary(s)}
          <div class="grid gap-4">
            ${killTargets(s.loading)}
            ${earlyAggression(s.loading)}
            ${teamShares(s.loading)}
          </div>
        </div>
      </div>`;
    },
    actions: {
      selectMatch: async ({ data, state, view: v }) => {
        const id = data.id as string;
        if (id === state.selectedMatchId) return;
        v.set({ selectedMatchId: id });
        const detailed = await fetchDetailedMatch(id, 'LAS');
        v.set({ detailedMatch: detailed });
      },
      reload: ({ view: v }) => {
        void load(v);
      },
    },
  });

  async function load(v: View<State>) {
    v.set({ loading: true });
    const [matches, groups] = await Promise.all([
      fetchMatches(),
      fetchAccountStats(),
    ]);

    const targetMatchId = matches[0]?.id || 'm1';
    const detailed = await fetchDetailedMatch(targetMatchId, 'LAS');

    v.set({
      matches,
      groups,
      selectedMatchId: targetMatchId,
      detailedMatch: detailed,
      loading: false,
    });
  }

  void load(view);
  return view;
}
