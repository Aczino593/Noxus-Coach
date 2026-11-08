import { champIcon, esc, icon, itemIcon, roleIcon } from '../lib/ui';
import type { DetailedMatch, ParticipantDetail } from '../data/matchDetail';
import { BUSHES, analyzeBotLane, clock, defaultSubjectId, type GankDiagnosis, type GankReport, type GankZone } from '../lib/gankEngine';
import { ROLE_LABEL } from '../types';
import { botLaneMinimap } from './BotLaneMinimap';

/** Analizador táctico de ganks en líneas (Top, Mid, Bot) e invasiones de campamentos en la Jungla. */

const KIND_CHIP: Record<GankDiagnosis['kind'], { cls: string; label: string; jgLabel: string }> = {
  dark: { cls: 'chip-loss', label: 'Gank evitable (Sin visión)', jgLabel: 'Invasión sin visión' },
  expired: { cls: 'chip-gold', label: 'Visión expirada', jgLabel: 'Ward expirado en entrada' },
  covered: { cls: 'chip-win', label: 'Había visión', jgLabel: 'Entrada con visión' },
};

const ZONE_META: Record<
  GankZone,
  { title: string; subtitle: string; badge: string; stat1: string; stat2: string; stat3: string }
> = {
  top: {
    title: 'Analizador de Ganks y Visión · Carril Superior (Top)',
    subtitle: 'Emboscadas tempranas (min 0-14) del jungla o mid enemigo y cobertura del Arbusto del Río Superior y Tribush.',
    badge: 'Línea Superior',
    stat1: 'Muertes en línea',
    stat2: 'Ganks sufridos',
    stat3: 'Evitables con Pink',
  },
  mid: {
    title: 'Analizador de Ganks y Visión · Carril Central (Mid)',
    subtitle: 'Rotaciones y ganks (min 0-14) desde ambos laterales del río y control de los arbustos de Mid.',
    badge: 'Línea Central',
    stat1: 'Muertes en línea',
    stat2: 'Ganks laterales',
    stat3: 'Evitables con Pink',
  },
  bot: {
    title: 'Analizador de Ganks y Visión · Carril Inferior (Bot)',
    subtitle: 'Muertes tempranas (min 0-14) con intervención del jungla o el mid enemigo y visión del Río / Tribush.',
    badge: 'Línea Inferior',
    stat1: 'Muertes tempranas',
    stat2: 'Emboscadas',
    stat3: 'Evitables con Pink',
  },
  jungle: {
    title: 'Analizador de Invasiones y Control de Campamentos · Jungla',
    subtitle: 'Detección de cuándo fueron invadidos tus campamentos (Buff Azul / Buff Rojo) por falta de visión en las entradas del río.',
    badge: 'Control de Jungla',
    stat1: 'Bajas en tu jungla',
    stat2: 'Invasiones de campamento',
    stat3: 'Evitables con Pink',
  },
};

function subjectChip(p: ParticipantDetail, active: boolean): string {
  return `
  <button type="button" class="pill ${active ? '!border-crimson !text-white shadow-[0_0_10px_rgba(255,46,77,0.3)]' : ''}" aria-pressed="${active}" data-action="gank-subject" data-id="${p.participantId}">
    ${champIcon(p.champ, 22, '!rounded-md')}
    <span class="text-crimson">${roleIcon(p.role, 14)}</span>
    <span>${esc(p.champName)} · <span class="text-[10.5px] opacity-80">${esc(ROLE_LABEL[p.role])}</span>${p.isMe ? ' <b class="text-gold">(TÚ)</b>' : ''}</span>
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
  const isJungle = d.zone === 'jungle';
  const minimap = botLaneMinimap({
    death: d.pos,
    bush: d.bush,
    ward: d.kind === 'covered' ? 'green' : 'gold',
    clock: d.clock,
    mySide,
    zone: d.zone,
  });
  const intruderRole = ROLE_LABEL[d.intruder.role] || 'Enemigo';
  return `
  <article class="card-inset grid overflow-hidden md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
    <div class="border-b border-line p-3 md:border-b-0 md:border-r">${minimap}</div>
    <div class="flex flex-col gap-3 p-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="chip ${chip.cls} font-bold">${icon(d.avoidable ? 'alert' : 'check', 11)} ${isJungle ? chip.jgLabel : chip.label}</span>
        <span class="chip num">${icon('clock', 11)} ${d.clock}</span>
        <span class="chip" title="Enemigo que realizó el gank o invasión">${champIcon(d.intruder.champ, 18, '!rounded')} ${esc(d.intruder.champName)} · ${esc(intruderRole)}</span>
        ${d.exact ? '' : '<span class="chip chip-gold" title="La API de Riot no entrega la posición exacta de cada ward">Estimado</span>'}
      </div>
      <p class="text-[12.5px] leading-relaxed text-ink">${esc(d.advice)}</p>
      ${
        d.avoidable
          ? `<div class="mt-auto flex items-center gap-3 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2">
              ${itemIcon(2055, 34, '!border-gold/60')}
              <div class="leading-tight">
                <div class="text-[12.5px] font-bold text-gold">${isJungle ? 'Ward Defensivo de Entrada (Pink)' : 'Ward de Control (Pink)'}</div>
                <div class="text-[11.5px] text-ink-dim">Colócalo en <b>${esc(bush.label)}</b> antes del ${clock(Math.max(0, d.timeSec - 60))} para detectar ${isJungle ? 'la invasión a tu campamento' : 'la rotación enemiga'}.</div>
              </div>
            </div>`
          : ''
      }
    </div>
  </article>`;
}

function verdict(r: GankReport): string {
  const isJungle = r.zone === 'jungle';
  const who = r.isMe ? `Tus ${r.earlyDeaths} bajas tempranas` : `Las ${r.earlyDeaths} bajas tempranas de ${esc(r.subject.champName)}`;
  if (r.earlyDeaths === 0) {
    return `<div class="mt-3 flex items-start gap-2.5 rounded-xl border border-win/40 bg-win/10 p-3.5 text-[12.5px] text-win">${icon('check', 16)}<span><b>${isJungle ? 'Jungla protegida sin invasiones letales:' : 'Fase de líneas limpia:'}</b> ${esc(r.subject.champName)} no sufrió bajas tempranas antes del minuto 14. Excelente lectura de mapa y tracking del jungla rival.</span></div>`;
  }
  if (r.gankDeaths === 0) {
    return `<div class="mt-3 flex items-start gap-2.5 rounded-xl border border-line-strong bg-canvas p-3.5 text-[12.5px] text-ink-dim">${icon('info', 16)}<span>${who} ocurrieron en duelos directos (1v1 / 2v2) sin emboscadas ni invasiones por falta de visión.</span></div>`;
  }
  return '';
}

export function renderGankAnalyzer(m: DetailedMatch, subjectId: number | null): string {
  const id = subjectId ?? defaultSubjectId(m);
  const r = analyzeBotLane(m, id);
  const meta = ZONE_META[r.zone];

  const header = `
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="section-title">${esc(meta.title)}</h3>
        <p class="section-sub mt-0.5">${esc(meta.subtitle)}</p>
      </div>
      <span class="chip chip-crimson">${icon('eye', 11)} ${esc(meta.badge)}</span>
    </div>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <span class="eyebrow mr-1">Analizar línea / jungla:</span>
      ${m.allies.map((p) => subjectChip(p, p.participantId === r.subject.participantId)).join('')}
    </div>`;

  if (m.events.source === 'unavailable') {
    return `
    <section class="card mt-4 p-5 anim-fade-up">
      ${header}
      <div class="mt-3 flex items-start gap-2.5 rounded-xl border border-line-strong bg-canvas p-3.5 text-[12.5px] text-ink-dim">${icon('info', 16)}<span>No se pudo descargar la línea de tiempo (Match-V5 Timeline) de esta partida para reconstruir ganks ni invasiones de jungla.</span></div>
    </section>`;
  }

  const avoidColor = r.avoidable > 0 ? 'var(--color-loss)' : 'var(--color-win)';
  const isJungle = r.zone === 'jungle';

  return `
  <section class="card mt-4 p-5 anim-fade-up">
    ${header}
    <div class="mt-3 grid grid-cols-3 gap-3">
      ${stat(meta.stat1, r.earlyDeaths, 'var(--color-ink)', 'minutos 0 a 14')}
      ${stat(meta.stat2, r.gankDeaths, r.gankDeaths ? 'var(--color-gold)' : 'var(--color-ink-mute)', isJungle ? 'robo de campamento + emboscada' : 'jungla o mid enemigo')}
      ${stat(meta.stat3, r.avoidable, avoidColor, isJungle ? 'entrada de río sin visión' : 'arbusto sin visión')}
    </div>
    ${verdict(r)}
    <div class="mt-4 grid gap-3">
      ${r.diagnoses.map((d) => diagnosisCard(d, r.mySide)).join('')}
    </div>
    <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line pt-3 text-[11px] text-ink-dim">
      <span class="flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full bg-crimson shadow-[0_0_8px_var(--color-crimson)]"></i>${isJungle ? 'Dónde fuiste invadido' : 'Dónde moriste por gank'}</span>
      <span class="flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full bg-gold"></i>Dónde colocar el Pink</span>
      <span class="flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full bg-win"></i>Ward activo a tiempo</span>
      <span class="ml-auto text-ink-mute">${r.source === 'riot' ? 'Datos: Match-V5 Timeline' : 'Reconstrucción táctica de partida'}</span>
    </div>
  </section>`;
}
