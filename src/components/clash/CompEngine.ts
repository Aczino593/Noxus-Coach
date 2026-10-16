import { CHAMP_BY_ID } from '../../data/champions';
import { ARCHETYPES, ARCH_BY_ID } from '../../data/clashMock';
import { ROLE_LABEL, ROLES } from '../../types';
import {
  MINUTES, archetypeFit, bestArchetype, ccChain, execEase, insights, powerCurve, powerProfile,
} from '../../lib/clashEngine';
import { champIcon, esc, gauge, icon, roleIcon } from '../../lib/ui';
import { scale, smoothPath, type Pt } from '../../lib/charts';
import { championPicker } from '../ChampionPicker';
import { PALETTE, type ClashState } from './state';

/* ─────────────── Arquetipos ─────────────── */
function archetypeCards(s: ClashState): string {
  const best = bestArchetype(s.team);
  const filled = s.team.filter(Boolean).length > 0;
  return `
  <div class="grid grid-cols-5 gap-3">
    ${ARCHETYPES.map((a) => {
      const sel = s.arch === a.id;
      const fit = archetypeFit(s.team, a.id).score;
      const color = fit >= 70 ? 'var(--color-gold)' : fit >= 45 ? 'var(--color-win)' : 'var(--color-loss)';
      return `<button class="card card-hover relative flex flex-col gap-2 p-3.5 text-left ${sel ? '!border-crimson' : ''}" style="${sel ? 'background:linear-gradient(180deg, rgb(255 46 77 / .14), var(--color-surface));box-shadow:0 0 0 1px rgb(255 46 77 / .25), 0 14px 34px -16px var(--color-crimson)' : ''}" data-action="arch" data-id="${a.id}" aria-pressed="${sel}">
        <div class="flex items-center justify-between">
          <span class="grid h-8 w-8 place-items-center rounded-lg border ${sel ? 'border-crimson/60 bg-crimson/15 text-crimson' : 'border-line-strong bg-canvas text-ink-dim'}">${icon(a.icon, 16)}</span>
          ${filled ? `<span class="num text-[13px] font-bold" style="color:${color}">${fit}%</span>` : ''}
        </div>
        <div class="text-[13px] font-bold leading-tight">${a.name}</div>
        <p class="text-[11px] leading-snug text-ink-dim">${a.desc}</p>
        ${filled && best === a.id ? `<span class="chip chip-gold absolute -top-2 right-3">${icon('spark', 10)} Mejor encaje</span>` : ''}
      </button>`;
    }).join('')}
  </div>`;
}

/* ─────────────── Picks del equipo ─────────────── */
function teamSlots(s: ClashState): string {
  const dots = (v: number) =>
    Array.from({ length: 5 }, (_, i) => `<i class="h-1.5 w-3 rounded-full ${i < v ? 'bg-gold' : 'bg-[#232733]'}"></i>`).join('');
  return `
  <section class="card p-4">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="section-title">Tu equipo · 5 picks</h3>
      <button class="btn btn-ghost btn-sm" data-action="team-clear">${icon('trash', 12)} Vaciar</button>
    </div>
    <div class="grid gap-2">
      ${ROLES.map((role, i) => {
        const id = s.team[i];
        const ch = id ? CHAMP_BY_ID[id] : null;
        const open = s.picker === i;
        return `<div class="relative flex items-center gap-1.5">
          <button class="flex min-w-0 flex-1 items-center gap-3 rounded-xl border bg-canvas p-2 text-left transition-colors ${open ? 'border-crimson' : 'border-line hover:border-line-strong'}" data-action="slot-open" data-id="${i}" aria-expanded="${open}">
            <span class="grid h-9 w-9 flex-none place-items-center rounded-lg border border-line-strong bg-surface text-crimson" data-tip="${ROLE_LABEL[role]}">${roleIcon(role, 17)}</span>
            ${ch ? champIcon(ch.id, 46, '!border-crimson/40') : `<span class="champ-ring grid h-[46px] w-[46px] place-items-center text-ink-mute">${icon('plus', 16)}</span>`}
            <span class="min-w-0 flex-1 leading-tight">
              <span class="block truncate text-[13.5px] font-bold">${ch ? esc(ch.name) : `Elegir ${ROLE_LABEL[role]}`}</span>
              ${
                ch
                  ? `<span class="mt-1 flex flex-wrap items-center gap-1.5"><span class="chip ${ch.dmg === 'AD' ? 'chip-gold' : ch.dmg === 'AP' ? 'chip-crimson' : ''} !py-0">${ch.dmg}</span>
                      <span class="chip !py-0 num">CC ${ch.hardCC.toFixed(1)}s</span>
                      <span class="flex items-center gap-0.5" data-tip="Early ${ch.early}/5"><span class="mr-1 text-[9px] text-ink-mute">E</span>${dots(ch.early)}</span>
                      <span class="flex items-center gap-0.5" data-tip="Late ${ch.late}/5"><span class="mr-1 text-[9px] text-ink-mute">L</span>${dots(ch.late)}</span></span>`
                  : `<span class="text-[11px] text-ink-mute">Hueco libre</span>`
              }
            </span>
          </button>
          ${id ? `<button class="btn btn-ghost btn-icon btn-sm" data-action="slot-clear" data-id="${i}" aria-label="Quitar">${icon('x', 13)}</button>` : ''}
          ${open ? championPicker({ query: s.query, role, exclude: s.team.filter(Boolean) as string[], pickAction: 'slot-pick', closeAction: 'picker-close', inputKey: 'cq', title: 'Pick de equipo' }) : ''}
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

/* ─────────────── Cadena de CC ─────────────── */
function ccCard(s: ClashState): string {
  const chain = ccChain(s.team);
  const max = Math.max(8, Math.ceil(chain.total));
  const tone = chain.rating === 'excelente' ? 'chip-gold' : chain.rating === 'buena' ? 'chip-win' : 'chip-loss';
  return `
  <section class="card p-4">
    <div class="flex items-center justify-between">
      <h3 class="section-title">Cadena de Control de Masas</h3>
      <span class="chip ${tone}">${chain.rating}</span>
    </div>
    <p class="section-sub mt-0.5">CC duro encadenado sin huecos (se asume 0.2 s de solape entre habilidades).</p>
    ${
      chain.segs.length
        ? `<div class="relative mt-3">
            <div class="pointer-events-none absolute inset-0 flex justify-between">${Array.from({ length: max + 1 }, () => '<i class="w-px bg-line/70"></i>').join('')}</div>
            <div class="relative grid gap-1.5 py-1">
              ${chain.segs
                .map(
                  (g, i) => `<div class="relative h-7">
                    <div class="absolute flex h-7 items-center gap-1.5 overflow-hidden rounded-lg px-1.5" style="left:${(g.start / max) * 100}%;width:${(g.dur / max) * 100}%;background:${PALETTE[i % 5]}2e;border:1px solid ${PALETTE[i % 5]}aa;box-shadow:0 0 14px -6px ${PALETTE[i % 5]}">
                      ${champIcon(g.champ, 20, '!rounded-md')}<span class="num truncate text-[10.5px] font-bold" style="color:${PALETTE[i % 5]}">${g.dur.toFixed(1)}s</span>
                    </div></div>`,
                )
                .join('')}
            </div>
            <div class="num mt-1 flex justify-between text-[9.5px] text-ink-mute">${Array.from({ length: max + 1 }, (_, i) => `<span>${i}s</span>`).join('')}</div>
          </div>
          <div class="mt-3 flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2 text-[12px]">
            <span class="text-ink-dim">Cadena total</span><b class="num text-[15px] text-gold">${chain.total.toFixed(1)} s</b>
            <span class="text-ink-dim">CC suave</span><b class="num">${chain.soft}</b>
          </div>
          <p class="mt-2 text-[11.5px] text-ink-dim"><span class="text-crimson">Orden sugerido:</span> ${chain.order.map((id) => esc(CHAMP_BY_ID[id].name)).join(' → ')}</p>`
        : `<p class="py-8 text-center text-ink-mute">Elige campeones para ver la cadena de CC.</p>`
    }
  </section>`;
}

/* ─────────────── Curva de poder ─────────────── */
function powerCard(s: ClashState): string {
  const curve = powerCurve(s.team);
  const ideal = ARCH_BY_ID[s.arch].curve;
  const prof = powerProfile(s.team);
  const W = 520, H = 200, L = 30, R = 10, T = 12, B = 24;
  const xy = (arr: number[]): Pt[] => arr.map((v, i) => [scale(i, 0, 8, L, W - R), scale(v, 0, 100, H - B, T)]);
  const pts = xy(curve);
  const line = smoothPath(pts);
  const area = `${line} L${pts[8][0]},${H - B} L${pts[0][0]},${H - B} Z`;
  const hasData = s.team.some(Boolean);
  const tone = prof.tone === 'early' ? 'chip-crimson' : prof.tone === 'late' ? 'chip-gold' : 'chip-win';
  const peakX = scale(MINUTES.indexOf(prof.peak), 0, 8, L, W - R);
  return `
  <section class="card p-4">
    <div class="flex items-center justify-between">
      <h3 class="section-title">Curva de poder</h3>
      <span class="chip ${tone}">${hasData ? prof.label : '—'}</span>
    </div>
    <p class="section-sub mt-0.5">Tu composición vs. la curva ideal de <b class="text-gold">${ARCH_BY_ID[s.arch].short}</b>${prof.windowFrom !== null ? ` · ventana de victoria desde el min <b class="num text-ink">${prof.windowFrom}</b>` : ''}.</p>
    <svg viewBox="0 0 ${W} ${H}" class="mt-2 h-[200px] w-full" role="img" aria-label="Curva de poder del equipo">
      <defs><linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff2e4d" stop-opacity=".35"/><stop offset="1" stop-color="#ff2e4d" stop-opacity="0"/></linearGradient></defs>
      ${[0, 25, 50, 75, 100].map((v) => `<line x1="${L}" x2="${W - R}" y1="${scale(v, 0, 100, H - B, T)}" y2="${scale(v, 0, 100, H - B, T)}" stroke="#232733" ${v === 75 ? 'stroke-dasharray="3 5"' : ''}/><text x="${L - 6}" y="${scale(v, 0, 100, H - B, T) + 3}" text-anchor="end" fill="#5f6678" font-size="9" class="num">${v}</text>`).join('')}
      ${MINUTES.map((m, i) => `<text x="${scale(i, 0, 8, L, W - R)}" y="${H - 6}" text-anchor="middle" fill="#5f6678" font-size="9" class="num">${m}'</text>`).join('')}
      <path d="${smoothPath(xy(ideal))}" fill="none" stroke="#e0a96d" stroke-width="1.8" stroke-dasharray="5 5" stroke-opacity=".85"/>
      ${hasData ? `<path d="${area}" fill="url(#pc-fill)"/><path d="${line}" fill="none" stroke="#ff2e4d" stroke-width="2.6" stroke-linecap="round" style="filter:drop-shadow(0 0 6px rgb(255 46 77 / .6))"/>
        <line x1="${peakX}" x2="${peakX}" y1="${T}" y2="${H - B}" stroke="#ff2e4d" stroke-opacity=".35" stroke-dasharray="2 4"/>
        ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="#0b0c10" stroke="#ff2e4d" stroke-width="1.6"/>`).join('')}` : ''}
    </svg>
    <div class="flex items-center gap-4 text-[11px] text-ink-dim">
      <span class="flex items-center gap-1.5"><i class="h-0.5 w-4 bg-crimson"></i>Tu equipo</span>
      <span class="flex items-center gap-1.5"><i class="h-0.5 w-4 border-t-2 border-dashed border-gold"></i>Ideal ${ARCH_BY_ID[s.arch].short}</span>
      ${hasData ? `<span class="ml-auto num">Pico: min ${prof.peak}</span>` : ''}
    </div>
  </section>`;
}

/* ─────────────── Compatibilidad + ejecución ─────────────── */
function fitCard(s: ClashState): string {
  const fit = archetypeFit(s.team, s.arch);
  const a = ARCH_BY_ID[s.arch];
  const has = s.team.some(Boolean);
  return `
  <section class="card p-4">
    <h3 class="section-title">Compatibilidad · ${a.short}</h3>
    <div class="mt-3 flex items-center gap-5">
      ${gauge(fit.score, { size: 118, stroke: 12, valueText: has ? `${fit.score}%` : '–', label: 'Encaje' })}
      <ul class="grid flex-1 gap-2">
        ${
          has
            ? fit.checks.map((c) => `<li class="flex items-center gap-2 text-[12px]"><span class="${c.ok ? 'text-win' : 'text-loss'}">${icon(c.ok ? 'check' : 'x', 14)}</span><span class="flex-1">${c.label}</span><span class="num text-[11px] text-ink-dim">${c.detail}</span></li>`).join('')
            : a.needs.map((n) => `<li class="flex items-center gap-2 text-[12px] text-ink-dim"><span class="text-crimson">${icon('target', 13)}</span>${n}</li>`).join('')
        }
      </ul>
    </div>
  </section>`;
}

function execCard(s: ClashState): string {
  const e = execEase(s.team);
  const has = s.team.some(Boolean);
  return `
  <section class="card p-4">
    <h3 class="section-title">Facilidad de ejecución táctica en voz</h3>
    <p class="section-sub mt-0.5">Qué tan simple es coordinar la composición con calls por Discord.</p>
    <div class="mt-3 flex items-center gap-5">
      ${gauge(e.score, { size: 104, stroke: 11, valueText: has ? String(e.score) : '–', label: 'sobre 100' })}
      <ul class="grid flex-1 gap-1.5">
        ${e.calls.length ? e.calls.map((c) => `<li class="flex items-start gap-2 text-[11.5px] leading-snug text-ink-dim"><span class="mt-0.5 text-crimson">${icon('mic', 13)}</span>${c}</li>`).join('') : '<li class="text-ink-mute">Sin calls requeridas aún.</li>'}
      </ul>
    </div>
  </section>`;
}

function insightsCard(s: ClashState): string {
  const list = insights(s.team, s.arch);
  return `
  <section class="card p-4">
    <h3 class="section-title">Lectura del coach</h3>
    <ul class="mt-3 grid gap-2">
      ${list.map((i) => `<li class="flex items-start gap-2.5 rounded-lg border border-line bg-canvas px-3 py-2 text-[12.5px]"><span class="mt-0.5 ${i.kind === 'good' ? 'text-win' : i.kind === 'warn' ? 'text-gold' : 'text-loss'}">${icon(i.kind === 'good' ? 'check' : 'alert', 14)}</span>${i.text}</li>`).join('')}
    </ul>
  </section>`;
}

export function renderComp(s: ClashState): string {
  return `
  <div class="grid gap-4">
    ${archetypeCards(s)}
    <div class="grid items-start gap-4" style="grid-template-columns:minmax(380px,0.8fr) minmax(0,1.2fr)">
      <div class="grid gap-4">${teamSlots(s)}${insightsCard(s)}</div>
      <div class="grid gap-4">
        <div class="grid gap-4" style="grid-template-columns:1fr 1fr">${fitCard(s)}${execCard(s)}</div>
        ${ccCard(s)}
        ${powerCard(s)}
      </div>
    </div>
  </div>`;
}
