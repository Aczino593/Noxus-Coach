import { champIcon, esc, icon, itemIcon, roleIcon } from '../lib/ui';
import type { DetailedMatch, ParticipantDetail } from '../data/matchDetail';
import { BUSHES, analyzeBotLane, clock, defaultSubjectId, type GankDiagnosis, type GankReport } from '../lib/gankEngine';
import { ROLE_LABEL } from '../types';
import { botLaneMinimap } from './BotLaneMinimap';

/** Analizador táctico de ganks y visión del carril inferior (ADC + Support). */

const KIND_CHIP: Record<GankDiagnosis['kind'], { cls: string; label: string }> = {
  dark: { cls: 'chip-loss', label: 'Muerte evitable' },
  expired: { cls: 'chip-gold', label: 'Parcialmente evitable' },
  covered: { cls: 'chip-win', label: 'Había visión' },
};

function subjectChip(p: ParticipantDetail, active: boolean): string {
  return `
  <button type="button" class="pill ${active ? '!border-crimson !text-white' : ''}" aria-pressed="${active}" data-action="gank-subject" data-id="${p.participantId}">
    ${champIcon(p.champ, 22, '!rounded-md')}
    <span class="text-crimson">${roleIcon(p.role, 14)}</span>
    <span>${esc(p.champName)}${p.isMe ? ' · TÚ' : ''}</span>
  </button>`;
}

function stat(label: string, value: number, color: string, hint: string): string {
  return `
  <div class="card-inset p-3 text-center">
    <div class="eyebrow">${label}</div>
    <div class="num mt-1.5 text-[26px] font-extrabold leading-none" style="color:${color}">${value}</div>
    <div class="mt-1.5 text-[11px] text-ink-dim">${hint}</div>
  </div>`;
}

function diagnosisCard(d: GankDiagnosis, mySide: GankReport['mySide']): string {
  const chip = KIND_CHIP[d.kind];
  const bush = BUSHES[d.bush];
  const minimap = botLaneMinimap({
    death: d.pos,
    bush: d.bush,
    ward: d.kind === 'covered' ? 'green' : 'gold',
    clock: d.clock,
    mySide,
  });
  const intruderRole = d.intruder.role === 'jungle' ? 'Jungla' : 'Mid';
  return `
  <article class="card-inset grid overflow-hidden md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
    <div class="border-b border-line p-3 md:border-b-0 md:border-r">${minimap}</div>
    <div class="flex flex-col gap-3 p-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="chip ${chip.cls} font-bold">${icon(d.avoidable ? 'alert' : 'check', 11)} ${chip.label}</span>
        <span class="chip num">${icon('clock', 11)} ${d.clock}</span>
        <span class="chip" title="Enemigo que intervino en la muerte">${champIcon(d.intruder.champ, 18, '!rounded')} ${esc(d.intruder.champName)} · ${intruderRole}</span>
        ${d.exact ? '' : '<span class="chip chip-gold" title="La API de Riot no entrega la posición de los wards">Estimado</span>'}
      </div>
      <p class="text-[12.5px] leading-relaxed text-ink">${esc(d.advice)}</p>
      ${
        d.avoidable
          ? `<div class="mt-auto flex items-center gap-3 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2">
              ${itemIcon(2055, 34, '!border-gold/60')}
              <div class="leading-tight">
                <div class="text-[12.5px] font-bold text-gold">Ward de Control (Pink)</div>
                <div class="text-[11.5px] text-ink-dim">Colócalo en el ${esc(bush.label)} antes del ${clock(Math.max(0, d.timeSec - 60))}.</div>
              </div>
            </div>`
          : ''
      }
    </div>
  </article>`;
}

function verdict(r: GankReport): string {
  const who = r.isMe ? `Tus ${r.earlyDeaths} muertes tempranas` : `Las ${r.earlyDeaths} muertes tempranas de ${esc(r.subject.champName)}`;
  if (r.earlyDeaths === 0) {
    return `<div class="mt-3 flex items-start gap-2.5 rounded-xl border border-win/40 bg-win/10 p-3.5 text-[12.5px] text-win">${icon('check', 16)}<span><b>Fase de líneas limpia:</b> ${esc(r.subject.champName)} no murió antes del minuto 14. Mantén ese ritmo de visión y posicionamiento.</span></div>`;
  }
  if (r.gankDeaths === 0) {
    return `<div class="mt-3 flex items-start gap-2.5 rounded-xl border border-line-strong bg-canvas p-3.5 text-[12.5px] text-ink-dim">${icon('info', 16)}<span>${who} fueron en peleas 2v2 o fuera del carril: no hubo emboscadas del jungla ni del mid enemigo.</span></div>`;
  }
  return '';
}

export function renderGankAnalyzer(m: DetailedMatch, subjectId: number | null): string {
  const id = subjectId ?? defaultSubjectId(m);
  const botDuo = m.allies.filter((p) => p.role === 'adc' || p.role === 'support');
  const header = `
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="section-title">Analizador de Ganks y Visión · Carril inferior</h3>
        <p class="section-sub mt-0.5">Muertes tempranas (min 0-14) con intervención del jungla o el mid enemigo y estado de visión del Arbusto del Río / Tribush.</p>
      </div>
      <span class="chip chip-crimson">${icon('eye', 11)} Fase de líneas</span>
    </div>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <span class="eyebrow mr-1">Analizar a</span>
      ${botDuo.map((p) => subjectChip(p, p.participantId === id)).join('')}
    </div>`;

  if (m.events.source === 'unavailable') {
    return `
    <section class="card mt-4 p-5 anim-fade-up">
      ${header}
      <div class="mt-3 flex items-start gap-2.5 rounded-xl border border-line-strong bg-canvas p-3.5 text-[12.5px] text-ink-dim">${icon('info', 16)}<span>No se pudo descargar la línea de tiempo (Match-V5 Timeline) de esta partida, así que no es posible reconstruir muertes ni visión del carril inferior.</span></div>
    </section>`;
  }

  const r = analyzeBotLane(m, id);
  const roleNote =
    m.me.role !== 'adc' && m.me.role !== 'support'
      ? `<div class="mt-3 flex items-start gap-2.5 rounded-xl border border-gold/30 bg-gold/10 p-3 text-[12px] text-ink-dim">${icon('info', 15)}<span>En esta partida jugaste <b class="text-ink">${ROLE_LABEL[m.me.role]}</b>: el analizador se centra en el dúo del carril inferior de tu equipo.</span></div>`
      : '';

  const avoidColor = r.avoidable > 0 ? 'var(--color-loss)' : 'var(--color-win)';
  return `
  <section class="card mt-4 p-5 anim-fade-up">
    ${header}
    ${roleNote}
    <div class="mt-3 grid grid-cols-3 gap-3">
      ${stat('Muertes tempranas', r.earlyDeaths, 'var(--color-ink)', 'minutos 0 a 14')}
      ${stat('Emboscadas', r.gankDeaths, r.gankDeaths ? 'var(--color-gold)' : 'var(--color-ink-mute)', 'jungla o mid enemigo')}
      ${stat('Evitables con Pink', r.avoidable, avoidColor, 'arbusto sin visión')}
    </div>
    ${verdict(r)}
    <div class="mt-4 grid gap-3">
      ${r.diagnoses.map((d) => diagnosisCard(d, r.mySide)).join('')}
    </div>
    <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line pt-3 text-[11px] text-ink-dim">
      <span class="flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full bg-crimson shadow-[0_0_8px_var(--color-crimson)]"></i>Dónde moriste</span>
      <span class="flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full bg-gold"></i>Dónde poner el Pink</span>
      <span class="flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full bg-win"></i>Ward ya activo</span>
      <span class="ml-auto text-ink-mute">${r.source === 'riot' ? 'Datos: Match-V5 Timeline (posición de wards estimada)' : 'Datos simulados del modo local'}</span>
    </div>
  </section>`;
}
