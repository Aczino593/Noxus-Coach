import type { Role } from '../types';
import type { DetailedMatch, ParticipantDetail } from '../data/matchDetail';
import type { RiotTimelineDto } from '../data/api';
import { hash01 } from './charts';

/**
 * Motor del Analizador Táctico de Ganks, Visión e Invasiones de Jungla (5 Roles).
 *
 * - En líneas (Top, Mid, ADC, Support): detecta muertes tempranas (min 0-14) donde intervino
 *   el jungla o un rotador enemigo, comprueba si el arbusto clave de entrada tenía visión aliada
 *   en los 60 s previos y genera un diagnóstico con recomendación de Ward de Control (Pink).
 * - En Jungla: detecta muertes tempranas por invasión a tus campamentos (Buff Azul / Gromp y
 *   Buff Rojo / Picuchillos), evaluando si las entradas del río tenían visión defensiva.
 *
 * Coordenadas: mapa de Summoner's Rift de 14870×14870 (unidades de Match-V5 Timeline).
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

/* ─────────────── Geometría de los 3 carriles y la Jungla ─────────────── */
export const MAP_SIZE = 14870;
export const EARLY_LIMIT_SEC = 14 * 60;
export const DARK_THRESHOLD_SEC = 60;
export const WARD_RADIUS = 950;
const MOVE_SPEED = 345;

export type GankZone = 'top' | 'mid' | 'bot' | 'jungle';

export type BushId =
  | 'river'
  | 'tri'
  | 'top_river'
  | 'top_tri'
  | 'mid_top'
  | 'mid_bot'
  | 'jg_blue'
  | 'jg_red';

export interface BushMeta {
  label: string;
  article: string;
  from: string;
  pos: MapPoint;
  zone: GankZone;
}

export const BUSHES: Record<BushId, BushMeta> = {
  // Bot lane (Season 14+ Mapa Actualizado)
  river: {
    label: 'Pixel Bush Río (Bot)',
    article: 'El arbusto central del río inferior',
    from: 'el río inferior',
    pos: { x: 11420, y: 3720 },
    zone: 'bot',
  },
  tri: {
    label: 'Tribush Inferior',
    article: 'El Tribush defensivo inferior',
    from: 'el Tribush de bot',
    pos: { x: 10290, y: 3050 },
    zone: 'bot',
  },
  // Top lane (Season 14+ Mapa Actualizado)
  top_river: {
    label: 'Pixel Bush Río (Top)',
    article: 'El nuevo arbusto central del río superior',
    from: 'el río superior',
    pos: { x: 3390, y: 11230 },
    zone: 'top',
  },
  top_tri: {
    label: 'Tribush Superior',
    article: 'El Tribush superior',
    from: 'el Tribush de top',
    pos: { x: 4480, y: 11850 },
    zone: 'top',
  },
  // Mid lane (Season 14+ arbustos laterales desplazados)
  mid_top: {
    label: 'Arbusto Río Norte (Mid)',
    article: 'El arbusto superior del carril central',
    from: 'el río superior (lado Vacío)',
    pos: { x: 6320, y: 8500 },
    zone: 'mid',
  },
  mid_bot: {
    label: 'Arbusto Río Sur (Mid)',
    article: 'El arbusto inferior del carril central',
    from: 'el río inferior (lado Dragón)',
    pos: { x: 8505, y: 6425 },
    zone: 'mid',
  },
  // Jungla (Invasiones a campamentos en el nuevo mapa)
  jg_blue: {
    label: 'Entrada Río ➔ Buff Azul',
    article: 'La rampa del río hacia tu Buff Azul',
    from: 'la entrada del río hacia tu Buff Azul',
    pos: { x: 5130, y: 8250 },
    zone: 'jungle',
  },
  jg_red: {
    label: 'Entrada Río ➔ Buff Rojo',
    article: 'La entrada de Dagarracos / Río hacia tu Buff Rojo',
    from: 'la entrada del río hacia tu Buff Rojo',
    pos: { x: 8350, y: 5450 },
    zone: 'jungle',
  },
};

export const BOT_TOWERS = {
  blueOuter: { x: 10410, y: 1460 } as MapPoint,
  blueInner: { x: 6919, y: 1483 } as MapPoint,
  redOuter: { x: 13380, y: 4490 } as MapPoint,
};

export const TOP_TOWERS = {
  blueOuter: { x: 1460, y: 10440 } as MapPoint,
  redOuter: { x: 4360, y: 13290 } as MapPoint,
};

export const MID_TOWERS = {
  blueOuter: { x: 5980, y: 6450 } as MapPoint,
  redOuter: { x: 8850, y: 8590 } as MapPoint,
};

export const JUNGLE_CAMPS_POS = {
  blueBuff: { x: 4460, y: 7910 } as MapPoint,
  blueGromp: { x: 2380, y: 8400 } as MapPoint,
  blueWolves: { x: 4135, y: 6425 } as MapPoint,
  blueRaptors: { x: 6915, y: 5428 } as MapPoint,
  redBuff: { x: 7700, y: 4090 } as MapPoint,
  blueKrugs: { x: 8357, y: 2706 } as MapPoint,
  redRaptors: { x: 7807, y: 9487 } as MapPoint,
  redWolves: { x: 10736, y: 8446 } as MapPoint,
  redBlueBuff: { x: 10855, y: 6915 } as MapPoint,
};

const dist = (a: MapPoint, b: MapPoint) => Math.hypot(a.x - b.x, a.y - b.y);

export function zoneForRole(role: Role): GankZone {
  if (role === 'top') return 'top';
  if (role === 'mid') return 'mid';
  if (role === 'jungle') return 'jungle';
  return 'bot';
}

export function bushesForZone(zone: GankZone): [BushId, BushId] {
  if (zone === 'top') return ['top_river', 'top_tri'];
  if (zone === 'mid') return ['mid_top', 'mid_bot'];
  if (zone === 'jungle') return ['jg_blue', 'jg_red'];
  return ['river', 'tri'];
}

/** ¿El punto cae en el carril inferior? */
export function inBotLane(p: MapPoint): boolean {
  return (p.y < 5600 && p.x > 5200) || (p.x > 10300 && p.y < 9800);
}

/** ¿El punto cae en la zona correspondiente al rol analizado? */
export function inRoleZone(role: Role, p: MapPoint): boolean {
  if (role === 'adc' || role === 'support') return inBotLane(p);
  if (role === 'top') {
    return (p.x < 4600 && p.y > 5200) || (p.y > 9600 && p.x < 9600);
  }
  if (role === 'mid') {
    return p.x > 4200 && p.x < 10600 && p.y > 4200 && p.y < 10600 && Math.abs(p.x - p.y) < 3400;
  }
  // Jungla: cuadrantes de jungla o río
  return p.x > 1800 && p.x < 13000 && p.y > 1800 && p.y < 13000;
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
  zone: GankZone;
  kind: DiagnosisKind;
  darkSec: number;
  /** Un Ward de Control en el arbusto/entrada lo habría evitado */
  avoidable: boolean;
  reactionLo: number;
  reactionHi: number;
  exact: boolean;
  advice: string;
}

export interface GankReport {
  subject: ParticipantDetail;
  zone: GankZone;
  isMe: boolean;
  earlyDeaths: number;
  gankDeaths: number;
  avoidable: number;
  diagnoses: GankDiagnosis[];
  source: MatchEvents['source'];
  mySide: 'blue' | 'red';
}

const ROLE_NAME_ES: Record<Role, string> = {
  top: 'top',
  jungle: 'jungla',
  mid: 'mid',
  adc: 'tirador',
  support: 'soporte',
};

function adviceText(d: {
  kind: DiagnosisKind;
  clock: string;
  isMe: boolean;
  subjectName: string;
  subjectRole: Role;
  intruder: ParticipantDetail;
  bush: BushId;
  darkSec: number;
  neverWarded: boolean;
  lo: number;
  hi: number;
}): string {
  const b = BUSHES[d.bush];
  const isJungle = d.subjectRole === 'jungle';
  const campName = d.bush === 'jg_blue' ? 'tu campamento de Buff Azul / Gromp' : 'tu campamento de Buff Rojo / Picuchillos';
  const who = isJungle
    ? d.isMe
      ? `Sufriste una invasión en ${campName}`
      : `${d.subjectName} sufrió una invasión en ${campName}`
    : d.isMe
      ? 'Fuiste emboscado'
      : `${d.subjectName} fue emboscado`;

  const intruderLabel = `el ${ROLE_NAME_ES[d.intruder.role] ?? 'enemigo'} rival (${d.intruder.champName})`;
  const head = `${who} desde ${b.from} por ${intruderLabel}.`;
  const pink = isJungle
    ? `Colocar un Ward de Control (Pink) en ${b.label} ${d.isMe ? 'te' : 'le'} habría dado ${d.lo}-${d.hi} segundos de aviso para abandonar el campamento o pedir rotación de tus líneas.`
    : `Colocar un Ward de Control (Pink) en ese arbusto ${d.isMe ? 'te' : 'le'} habría dado ${d.lo}-${d.hi} segundos de reacción para replegarte hacia ${d.isMe ? 'tu' : 'su'} torre.`;

  if (d.kind === 'dark') {
    const label = d.darkSec >= 180 ? `${Math.floor(d.darkSec / 60)} minutos` : `${Math.max(60, Math.floor(d.darkSec / 30) * 30)} segundos`;
    const dark = d.neverWarded ? 'no tuvo ningún ward defensivo desde el inicio de la partida' : `llevaba más de ${label} a oscuras`;
    return `${isJungle ? 'Invasión evitable' : 'Muerte evitable'} al minuto ${d.clock}: ${head} ${b.article} ${dark}. ${pink}`;
  }
  if (d.kind === 'expired') {
    return `${isJungle ? 'Invasión parcialmente evitable' : 'Muerte parcialmente evitable'} al minuto ${d.clock}: ${head} ${b.article} se había quedado sin visión hace solo ${d.darkSec} segundos. Renueva el centinela antes de que expire o asegura un Pink fijo ahí. ${pink}`;
  }
  return `${isJungle ? 'Invasión con visión' : 'Muerte con visión'} al minuto ${d.clock}: ${head} ${b.article} tenía un ward activo, por lo que el movimiento enemigo se vio en el minimapa. Retrocede de inmediato cuando veas cruzar a ${d.intruder.champName}.`;
}

/** Sujeto por defecto: el jugador principal de la partida (sea Top, Jungla, Mid, ADC o Support). */
export function defaultSubjectId(m: DetailedMatch): number {
  return m.me.participantId;
}

export function analyzeBotLane(match: DetailedMatch, subjectId: number): GankReport {
  const subject = match.allParticipants.find((p) => p.participantId === subjectId) ?? match.me;
  const zone = zoneForRole(subject.role);
  const [bushA, bushB] = bushesForZone(zone);
  const events = match.events;
  const byId = new Map(match.allParticipants.map((p) => [p.participantId, p]));
  const enemyRoleOf = (id: number): Role | null => {
    const p = byId.get(id);
    return p && p.team !== subject.team ? p.role : null;
  };

  // Quién pudo poner visión útil en esa zona: el propio jugador, el jungla y el soporte aliados
  const creators = new Set(
    match.allParticipants
      .filter(
        (p) =>
          p.team === subject.team &&
          (p.participantId === subject.participantId ||
            p.role === 'jungle' ||
            p.role === 'support' ||
            (zone === 'bot' && p.role === 'adc')),
      )
      .map((p) => p.participantId),
  );

  const early = events.kills
    .filter((k) => k.victimId === subject.participantId && k.timeSec <= EARLY_LIMIT_SEC)
    .sort((a, b) => a.timeSec - b.timeSec);

  const diagnoses: GankDiagnosis[] = [];
  for (const k of early) {
    if (!inRoleZone(subject.role, k.pos)) continue;

    // En líneas buscamos que haya intervenido alguien que no sea su par de línea directo;
    // en jungla cualquier enemigo dentro de tus campamentos cuenta como invasión.
    const involved = [k.killerId, ...k.assistIds].filter((id) => {
      const r = enemyRoleOf(id);
      if (!r) return false;
      if (zone === 'jungle') return true;
      if (zone === 'top') return r === 'jungle' || r === 'mid' || r === 'support';
      if (zone === 'mid') return r === 'jungle' || r === 'support' || r === 'top';
      return r === 'jungle' || r === 'mid' || r === 'top';
    });
    if (!involved.length) continue;

    const intruderId = involved.find((id) => enemyRoleOf(id) === 'jungle') ?? involved[0];
    const intruder = byId.get(intruderId)!;

    const bush: BushId = dist(k.pos, BUSHES[bushA].pos) <= dist(k.pos, BUSHES[bushB].pos) ? bushA : bushB;
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
      zone,
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
        subjectRole: subject.role,
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
    zone,
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

/* ─────────────── Eventos simulados (modo local para los 5 roles) ─────────────── */
const jitter = (seed: string, amp: number) => (hash01(seed) * 2 - 1) * amp;

/**
 * Genera una línea de eventos determinista (mismo matchId → mismos eventos) para los 5 aliados
 * (Top, Jungla, Mid, ADC, Support), permitiendo diagnosticar ganks en las 3 líneas e invasiones de campamentos.
 */
export function simulateMatchEvents(parts: ParticipantDetail[], durationSec: number, matchId: string): MatchEvents {
  const allies = parts.filter((p) => p.team === 'blue');
  const enemies = parts.filter((p) => p.team === 'red');
  const eRole = (r: Role) => enemies.find((e) => e.role === r);
  const lastSec = Math.max(60, durationSec - 20);

  const wards: WardEvent[] = [];
  const kills: KillEvent[] = [];

  // 1) Wards de cada aliado en los arbustos de su línea o entradas de jungla
  for (const w of allies) {
    const z = zoneForRole(w.role);
    const [bA, bB] = bushesForZone(z);
    let t = 75 + Math.floor(hash01(`${matchId}|${w.participantId}|w0`) * 45);
    let n = 0;
    while (t < EARLY_LIMIT_SEC + 60) {
      const r = hash01(`${matchId}|${w.participantId}|w|${n}`);
      const target: MapPoint = r < 0.52 ? BUSHES[bA].pos : BUSHES[bB].pos;
      wards.push({
        timeSec: t,
        creatorId: w.participantId,
        kind: w.role === 'support' ? 'support' : 'trinket',
        pos: {
          x: target.x + jitter(`${matchId}|${w.participantId}|x|${n}`, 300),
          y: target.y + jitter(`${matchId}|${w.participantId}|y|${n}`, 300),
        },
      });
      t += 105 + Math.floor(hash01(`${matchId}|${w.participantId}|s|${n}`) * 55);
      n++;
    }
  }

  // 2) Muertes tempranas por gank o invasión para cada uno de los 5 aliados
  for (const p of allies) {
    const z = zoneForRole(p.role);
    const [bA, bB] = bushesForZone(z);
    const deaths = Math.min(3, Math.max(p.d > 0 ? 1 : 0, Math.round(p.d / 3.2)));
    const first = 175 + Math.floor(hash01(`${matchId}|${p.participantId}|first`) * 240);
    const gap = 185 + Math.floor(hash01(`${matchId}|${p.participantId}|gap`) * 140);

    for (let i = 0; i < deaths; i++) {
      const t = first + i * gap;
      if (t > lastSec || t > EARLY_LIMIT_SEC) break;
      const key = `${matchId}|${p.participantId}|${i}`;
      const isGank = hash01(`${key}|gank`) < 0.85;
      const jungle = eRole('jungle');
      const mid = eRole('mid');
      const sup = eRole('support');
      const laneOpp = eRole(p.role);

      const intruder =
        z === 'mid'
          ? hash01(`${key}|who`) < 0.72
            ? jungle ?? sup
            : sup ?? jungle
          : hash01(`${key}|who`) < 0.78
            ? jungle ?? mid
            : mid ?? jungle;

      let pos: MapPoint;
      let killer: ParticipantDetail | undefined;
      const assists: ParticipantDetail[] = [];

      if (isGank && intruder) {
        const bush: BushId = hash01(`${key}|bush`) < 0.56 ? bA : bB;
        const base = BUSHES[bush].pos;

        if (z === 'top') {
          if (bush === 'top_river') {
            pos = {
              x: 2150 + jitter(`${key}|dx`, 260),
              y: 12050 + jitter(`${key}|dy`, 260),
            };
          } else {
            pos = {
              x: 3150 + jitter(`${key}|dx`, 280),
              y: 12880 + jitter(`${key}|dy`, 260),
            };
          }
        } else if (z === 'mid') {
          if (bush === 'mid_top') {
            pos = {
              x: 7020 + jitter(`${key}|dx`, 320),
              y: 7780 + jitter(`${key}|dy`, 320),
            };
          } else {
            pos = {
              x: 7780 + jitter(`${key}|dx`, 320),
              y: 7080 + jitter(`${key}|dy`, 320),
            };
          }
        } else if (z === 'jungle') {
          const camp = bush === 'jg_blue' ? JUNGLE_CAMPS_POS.blueBuff : JUNGLE_CAMPS_POS.redBuff;
          pos = {
            x: camp.x + jitter(`${key}|dx`, 240),
            y: camp.y + jitter(`${key}|dy`, 240),
          };
        } else {
          if (bush === 'river') {
            pos = {
              x: 12420 + jitter(`${key}|dx`, 300),
              y: 2820 + jitter(`${key}|dy`, 280),
            };
          } else {
            pos = {
              x: 11250 + jitter(`${key}|dx`, 300),
              y: 1850 + jitter(`${key}|dy`, 260),
            };
          }
        }

        killer = hash01(`${key}|k`) < 0.55 ? intruder : laneOpp ?? intruder;
        if (killer !== intruder) assists.push(intruder);
        if (laneOpp && killer !== laneOpp && !assists.includes(laneOpp)) assists.push(laneOpp);

        // Si toca zona a oscuras, retiramos wards cercanos previos
        if (hash01(`${key}|dark`) < 0.72) {
          for (let j = wards.length - 1; j >= 0; j--) {
            const w = wards[j];
            const end = w.timeSec + WARD_LIFE[w.kind];
            if (w.pos && dist(w.pos, base) <= WARD_RADIUS && w.timeSec <= t && end >= t - 75) {
              wards.splice(j, 1);
            }
          }
        }
      } else {
        if (z === 'top') pos = { x: 2200 + jitter(`${key}|px`, 350), y: 12300 + jitter(`${key}|py`, 350) };
        else if (z === 'mid') pos = { x: 7400 + jitter(`${key}|px`, 420), y: 7450 + jitter(`${key}|py`, 420) };
        else if (z === 'jungle') pos = { x: 5800 + jitter(`${key}|px`, 500), y: 6100 + jitter(`${key}|py`, 500) };
        else pos = { x: 11800 + jitter(`${key}|px`, 500), y: 2150 + jitter(`${key}|py`, 300) };
        killer = laneOpp ?? jungle;
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
