import type { Role } from '../types';
import type { DetailedMatch, ParticipantDetail } from '../data/matchDetail';
import type { RiotTimelineDto } from '../data/api';
import { hash01 } from './charts';

/**
 * Motor del Analizador de Ganks y Visión (carril inferior).
 *
 * Detecta muertes tempranas (min 0-14) del ADC/Support donde intervino el jungla o el mid enemigo,
 * comprueba si el arbusto clave por el que entró el gank (Arbusto del Río / Tribush) tenía visión
 * aliada en los 60 s previos y genera un consejo correctivo.
 *
 * Coordenadas: mapa de Summoner's Rift de 14870×14870 (mismas unidades que Match-V5 Timeline).
 * Las posiciones de arbustos/torres son APROXIMADAS (esquemáticas): calibrar contra el cliente si
 * se necesita precisión de radio de visión.
 */

export interface MapPoint {
  x: number;
  y: number;
}

export type WardKind = 'trinket' | 'support' | 'control' | 'blue' | 'unknown';

export interface KillEvent {
  timeSec: number;
  victimId: number;
  killerId: number;
  assistIds: number[];
  pos: MapPoint;
}

export interface WardEvent {
  timeSec: number;
  creatorId: number;
  kind: WardKind;
  /** Riot Match-V5 NO entrega posición en WARD_PLACED: queda undefined con datos reales. */
  pos?: MapPoint;
}

export interface MatchEvents {
  /** 'riot': timeline oficial · 'simulated': eventos del modo local · 'unavailable': sin timeline */
  source: 'riot' | 'simulated' | 'unavailable';
  /** Lado físico del mapa de tu equipo (azul = esquina inferior izquierda) */
  mySide: 'blue' | 'red';
  kills: KillEvent[];
  wards: WardEvent[];
}

/* ─────────────── Geometría del carril inferior ─────────────── */
export const MAP_SIZE = 14870;
export const EARLY_LIMIT_SEC = 14 * 60;
export const DARK_THRESHOLD_SEC = 60;
export const WARD_RADIUS = 900;
const MOVE_SPEED = 345;

export type BushId = 'river' | 'tri';

export const BUSHES: Record<BushId, { label: string; article: string; from: string; pos: MapPoint }> = {
  river: { label: 'Arbusto del Río', article: 'El arbusto del río', from: 'el río', pos: { x: 11350, y: 3550 } },
  tri: { label: 'Tribush', article: 'El Tribush', from: 'el Tribush', pos: { x: 12600, y: 4650 } },
};

export const BOT_TOWERS = {
  blueOuter: { x: 10504, y: 1029 } as MapPoint,
  blueInner: { x: 6919, y: 1483 } as MapPoint,
  redOuter: { x: 13866, y: 4505 } as MapPoint,
};

const dist = (a: MapPoint, b: MapPoint) => Math.hypot(a.x - b.x, a.y - b.y);

/** ¿El punto cae en el carril inferior (forma de "L" a lo largo de la base inferior y el borde derecho)? */
export function inBotLane(p: MapPoint): boolean {
  return (p.y < 5600 && p.x > 5200) || (p.x > 10300 && p.y < 9800);
}

export const clock = (sec: number): string =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/* ─────────────── Visión ─────────────── */
const WARD_LIFE: Record<WardKind, number> = {
  trinket: 120,
  support: 150,
  control: Infinity,
  blue: Infinity,
  unknown: 120,
};

interface Coverage {
  warded: boolean;
  /** Segundos sin visión justo antes del momento t (0 si estaba cubierto) */
  darkSec: number;
  /** El arbusto no tuvo ningún ward desde el inicio de la partida */
  neverWarded: boolean;
  /** false: sin coordenadas de wards → resultado estimado */
  exact: boolean;
}

function coverage(bush: BushId, t: number, wards: WardEvent[], creators: Set<number>): Coverage {
  const exact = wards.every((w) => !!w.pos);
  let lastCovered = 0;
  let warded = false;
  for (const w of wards) {
    if (!creators.has(w.creatorId) || w.timeSec > t) continue;
    if (exact && w.pos && dist(w.pos, BUSHES[bush].pos) > WARD_RADIUS) continue;
    // Sin posiciones no sabemos dónde cayó el Pink: asumimos que no es permanente
    const life = exact ? WARD_LIFE[w.kind] : Math.min(WARD_LIFE[w.kind], 150);
    const end = w.timeSec + life;
    if (end >= t) {
      warded = true;
      break;
    }
    lastCovered = Math.max(lastCovered, end);
  }
  return { warded, darkSec: warded ? 0 : Math.round(t - lastCovered), neverWarded: !warded && lastCovered === 0, exact };
}

/* ─────────────── Diagnóstico ─────────────── */
export type DiagnosisKind = 'dark' | 'expired' | 'covered';

export interface GankDiagnosis {
  timeSec: number;
  clock: string;
  pos: MapPoint;
  intruder: ParticipantDetail;
  bush: BushId;
  kind: DiagnosisKind;
  darkSec: number;
  /** Un Ward de Control en el arbusto lo habría evitado */
  avoidable: boolean;
  reactionLo: number;
  reactionHi: number;
  exact: boolean;
  advice: string;
}

export interface GankReport {
  subject: ParticipantDetail;
  isMe: boolean;
  earlyDeaths: number;
  gankDeaths: number;
  avoidable: number;
  diagnoses: GankDiagnosis[];
  source: MatchEvents['source'];
  mySide: 'blue' | 'red';
}

function adviceText(d: {
  kind: DiagnosisKind;
  clock: string;
  isMe: boolean;
  subjectName: string;
  intruder: ParticipantDetail;
  bush: BushId;
  darkSec: number;
  neverWarded: boolean;
  lo: number;
  hi: number;
}): string {
  const b = BUSHES[d.bush];
  const who = d.isMe ? 'Fuiste emboscado' : `${d.subjectName} fue emboscado`;
  const intruder = `el ${d.intruder.role === 'jungle' ? 'jungla' : 'mid'} enemigo (${d.intruder.champName})`;
  const head = `${who} desde ${b.from} por ${intruder}.`;
  const pink = `Colocar un Ward de Control (Pink) en ese arbusto ${d.isMe ? 'te' : 'le'} habría dado ${d.lo}-${d.hi} segundos de reacción para volver a ${d.isMe ? 'tu' : 'su'} torre.`;

  if (d.kind === 'dark') {
    const label = d.darkSec >= 180 ? `${Math.floor(d.darkSec / 60)} minutos` : `${Math.max(60, Math.floor(d.darkSec / 30) * 30)} segundos`;
    const dark = d.neverWarded ? 'no tuvo ningún ward desde el inicio de la partida' : `llevaba más de ${label} a oscuras`;
    return `Muerte evitable al minuto ${d.clock}: ${head} ${b.article} ${dark}. ${pink}`;
  }
  if (d.kind === 'expired') {
    return `Muerte parcialmente evitable al minuto ${d.clock}: ${head} ${b.article} se había quedado sin ward hace solo ${d.darkSec} segundos. Renueva el ward antes de que expire (los amarillos duran ~90-120 s) o deja un Pink fijo ahí. ${pink}`;
  }
  return `Muerte con visión al minuto ${d.clock}: ${head} ${b.article} tenía un ward activo, así que la información estaba disponible. Mira el minimapa cuando el jungla enemigo desaparezca de la vista y retrocede a torre en cuanto se revele.`;
}

/** Sujeto por defecto: tú si juegas ADC/Support; si no, el ADC aliado (o el Support). */
export function defaultSubjectId(m: DetailedMatch): number {
  const bot = (p: ParticipantDetail) => p.role === 'adc' || p.role === 'support';
  if (bot(m.me)) return m.me.participantId;
  const adc = m.allies.find((p) => p.role === 'adc');
  const sup = m.allies.find((p) => p.role === 'support');
  return (adc ?? sup ?? m.me).participantId;
}

export function analyzeBotLane(match: DetailedMatch, subjectId: number): GankReport {
  const subject = match.allParticipants.find((p) => p.participantId === subjectId) ?? match.me;
  const events = match.events;
  const byId = new Map(match.allParticipants.map((p) => [p.participantId, p]));
  const enemyRoleOf = (id: number): Role | null => {
    const p = byId.get(id);
    return p && p.team !== subject.team ? p.role : null;
  };

  // Quién pudo ver ese arbusto: tu dúo del carril inferior y el jungla aliado
  const creators = new Set(
    match.allParticipants
      .filter((p) => p.team === subject.team && (p.role === 'adc' || p.role === 'support' || p.role === 'jungle'))
      .map((p) => p.participantId),
  );

  const early = events.kills
    .filter((k) => k.victimId === subject.participantId && k.timeSec <= EARLY_LIMIT_SEC)
    .sort((a, b) => a.timeSec - b.timeSec);

  const diagnoses: GankDiagnosis[] = [];
  for (const k of early) {
    if (!inBotLane(k.pos)) continue;
    const involved = [k.killerId, ...k.assistIds].filter((id) => {
      const r = enemyRoleOf(id);
      return r === 'jungle' || r === 'mid';
    });
    if (!involved.length) continue; // 2v2 puro: no es un gank
    const intruderId = involved.find((id) => enemyRoleOf(id) === 'jungle') ?? involved[0];
    const intruder = byId.get(intruderId)!;

    const bush: BushId = dist(k.pos, BUSHES.river.pos) <= dist(k.pos, BUSHES.tri.pos) ? 'river' : 'tri';
    const cov = coverage(bush, k.timeSec, events.wards, creators);
    const kind: DiagnosisKind = cov.warded ? 'covered' : cov.darkSec >= DARK_THRESHOLD_SEC ? 'dark' : 'expired';

    const secs = dist(BUSHES[bush].pos, k.pos) / MOVE_SPEED;
    const lo = Math.max(2, Math.floor(secs));
    const hi = lo + 1;
    const ck = clock(k.timeSec);

    diagnoses.push({
      timeSec: k.timeSec,
      clock: ck,
      pos: k.pos,
      intruder,
      bush,
      kind,
      darkSec: cov.darkSec,
      avoidable: kind !== 'covered',
      reactionLo: lo,
      reactionHi: hi,
      exact: cov.exact,
      advice: adviceText({
        kind,
        clock: ck,
        isMe: subject.isMe,
        subjectName: subject.champName,
        intruder,
        bush,
        darkSec: cov.darkSec,
        neverWarded: cov.neverWarded,
        lo,
        hi,
      }),
    });
  }

  return {
    subject,
    isMe: subject.isMe,
    earlyDeaths: early.length,
    gankDeaths: diagnoses.length,
    avoidable: diagnoses.filter((d) => d.avoidable).length,
    diagnoses,
    source: events.source,
    mySide: events.mySide,
  };
}

/* ─────────────── Eventos reales (Match-V5 Timeline) ─────────────── */
type TimelineFrame = RiotTimelineDto['info']['frames'][number];

const WARD_KIND: Record<string, WardKind> = {
  YELLOW_TRINKET: 'trinket',
  SIGHT_WARD: 'support',
  CONTROL_WARD: 'control',
  BLUE_TRINKET: 'blue',
};

export function parseTimelineEvents(frames: TimelineFrame[]): Pick<MatchEvents, 'kills' | 'wards'> {
  const kills: KillEvent[] = [];
  const wards: WardEvent[] = [];
  for (const f of frames) {
    for (const ev of f.events ?? []) {
      if (ev.type === 'CHAMPION_KILL' && ev.victimId && ev.position) {
        kills.push({
          timeSec: Math.round(ev.timestamp / 1000),
          victimId: ev.victimId,
          killerId: ev.killerId ?? 0,
          assistIds: ev.assistingParticipantIds ?? [],
          pos: { x: ev.position.x, y: ev.position.y },
        });
      } else if (ev.type === 'WARD_PLACED' && ev.creatorId) {
        wards.push({
          timeSec: Math.round(ev.timestamp / 1000),
          creatorId: ev.creatorId,
          kind: WARD_KIND[ev.wardType ?? ''] ?? 'unknown',
        });
      }
    }
  }
  return { kills, wards };
}

/* ─────────────── Eventos simulados (modo local) ─────────────── */
const jitter = (seed: string, amp: number) => (hash01(seed) * 2 - 1) * amp;

/**
 * Genera una línea de eventos determinista (mismo matchId → mismos eventos) para las partidas
 * del historial local, que no tienen timeline oficial.
 */
export function simulateMatchEvents(parts: ParticipantDetail[], durationSec: number, matchId: string): MatchEvents {
  const allies = parts.filter((p) => p.team === 'blue');
  const enemies = parts.filter((p) => p.team === 'red');
  const eRole = (r: Role) => enemies.find((e) => e.role === r);
  const lastSec = Math.max(60, durationSec - 20);

  // 1) Wards base del support y el jungla aliados alrededor de los arbustos
  const wards: WardEvent[] = [];
  for (const w of allies.filter((p) => p.role === 'support' || p.role === 'jungle')) {
    let t = 80 + Math.floor(hash01(`${matchId}|${w.participantId}|w0`) * 40);
    let n = 0;
    while (t < EARLY_LIMIT_SEC + 60) {
      const r = hash01(`${matchId}|${w.participantId}|w|${n}`);
      const target: MapPoint = r < 0.45 ? BUSHES.river.pos : r < 0.75 ? BUSHES.tri.pos : { x: 8800, y: 1500 };
      wards.push({
        timeSec: t,
        creatorId: w.participantId,
        kind: w.role === 'support' ? 'support' : 'trinket',
        pos: {
          x: target.x + jitter(`${matchId}|${w.participantId}|x|${n}`, 350),
          y: target.y + jitter(`${matchId}|${w.participantId}|y|${n}`, 350),
        },
      });
      t += 100 + Math.floor(hash01(`${matchId}|${w.participantId}|s|${n}`) * 55);
      n++;
    }
  }

  // 2) Muertes del dúo del carril inferior aliado
  const kills: KillEvent[] = [];
  for (const p of allies.filter((x) => x.role === 'adc' || x.role === 'support')) {
    const deaths = Math.min(3, Math.max(p.d > 0 ? 1 : 0, Math.round(p.d / 3.5)));
    const first = 190 + Math.floor(hash01(`${matchId}|${p.participantId}|first`) * 260);
    const gap = 190 + Math.floor(hash01(`${matchId}|${p.participantId}|gap`) * 150);

    for (let i = 0; i < deaths; i++) {
      const t = first + i * gap;
      if (t > lastSec) break;
      const key = `${matchId}|${p.participantId}|${i}`;
      const isGank = hash01(`${key}|gank`) < 0.8;
      const jungle = eRole('jungle');
      const mid = eRole('mid');
      const intruder = hash01(`${key}|who`) < 0.75 ? jungle ?? mid : mid ?? jungle;
      const adc = eRole('adc');
      const sup = eRole('support');

      let pos: MapPoint;
      let killer: ParticipantDetail | undefined;
      const assists: ParticipantDetail[] = [];
      if (isGank && intruder) {
        const bush: BushId = hash01(`${key}|bush`) < 0.62 ? 'river' : 'tri';
        const base = BUSHES[bush].pos;
        pos = {
          x: base.x - (1000 + hash01(`${key}|dx`) * 600),
          y: base.y - (450 + hash01(`${key}|dy`) * 450),
        };
        killer = hash01(`${key}|k`) < 0.5 ? intruder : adc ?? intruder;
        if (killer !== intruder) assists.push(intruder);
        if (sup) assists.push(sup);

        // Zona a oscuras: se retiran los wards que la cubrían justo antes de la muerte
        if (hash01(`${key}|dark`) < 0.7) {
          for (let j = wards.length - 1; j >= 0; j--) {
            const w = wards[j];
            const end = w.timeSec + WARD_LIFE[w.kind];
            if (w.pos && dist(w.pos, base) <= WARD_RADIUS && w.timeSec <= t && end >= t - 75) wards.splice(j, 1);
          }
        }
      } else {
        pos = { x: 8800 + jitter(`${key}|px`, 900), y: 1500 + jitter(`${key}|py`, 350) };
        killer = adc ?? sup;
        if (killer !== sup && sup) assists.push(sup);
      }
      if (!killer) continue;

      kills.push({
        timeSec: t,
        victimId: p.participantId,
        killerId: killer.participantId,
        assistIds: assists.map((a) => a.participantId),
        pos,
      });
    }
  }

  wards.sort((a, b) => a.timeSec - b.timeSec);
  kills.sort((a, b) => a.timeSec - b.timeSec);
  return { source: 'simulated', mySide: 'blue', kills, wards };
}
