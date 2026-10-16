import type { Role, Queue } from '../types';
import type { IconName } from '../lib/ui';
import { champIdFromKey } from '../lib/assets';
import { MATCHES, type Match } from './mock';
import { getMatchDetail, getMatchTimeline, type RiotMatchDto } from './api';
import { parseTimelineEvents, simulateMatchEvents, type MatchEvents } from '../lib/gankEngine';

/* ─────────────────────────────────────────────────────────────
 * TIPOS DE DATOS PARA LA VISTA DETALLADA (MatchDetailView)
 * ───────────────────────────────────────────────────────────── */

export interface BehaviorTag {
  label: string; // "El Team Carry", "Apoyo", "Imán", etc.
  icon: IconName;
  color: string; // CSS class (ej. "text-crimson bg-crimson/10 border-crimson/30")
  desc: string;
}

export interface ParticipantDetail {
  id: string; // participantId o PUUID
  participantId: number;
  name: string;
  tag?: string;
  champ: string;
  champName: string;
  role: Role;
  team: 'blue' | 'red';
  isMe: boolean;
  k: number;
  d: number;
  a: number;
  kdaRatio: number;
  cs: number;
  csPerMin: number;
  gold: number;
  damageDealt: number;
  damageTaken: number;
  visionScore: number;
  controlWards: number;
  items: number[];
  ward: number;
  spells: [string, string];
  keystone: { path: string; name: string };
  secondary: { path: string; name: string };
  behaviorTag: BehaviorTag;
  timelineColor: string;
}

export interface MetricCard {
  id: string;
  title: string;
  icon: IconName;
  value: string;
  rawNum: number;
  averageText: string;
  percentileBadge: string; // ej. "Highest 42nd" o "Lowest 40th"
  percentileRank: number; // 0 a 100
  isHighest: boolean;
  progressPercent: number; // 0 a 100
}

export interface TimelineDataPoint {
  minute: number;
  values: Record<number, number>; // participantId -> valor en ese minuto
}

export interface DetailedMatch {
  id: string;
  result: 'win' | 'loss';
  queue: Queue;
  queueLabel: string;
  durationSec: number;
  durationFormatted: string;
  date: string;
  draftScore: number;
  macroScore: number | null;
  lp: number | null;
  me: ParticipantDetail;
  allies: ParticipantDetail[]; // 5 jugadores
  enemies: ParticipantDetail[]; // 5 jugadores
  allParticipants: ParticipantDetail[]; // 10 jugadores ordenados por rol
  metrics: MetricCard[];
  epicMonsterDiff: number;
  blueKills: number;
  redKills: number;
  blueGold: number;
  redGold: number;
  // Timeline
  minutes: number[]; // [0, 1, 2, ..., N]
  timelineGold: TimelineDataPoint[];
  timelineDamage: TimelineDataPoint[];
  timelineCs: TimelineDataPoint[];
  /** Eventos de la partida (muertes y wards) para el Analizador de Ganks y Visión */
  events: MatchEvents;
}

/* ─────────────────────────────────────────────────────────────
 * PALETA DE COLORES PARA LA LÍNEA TEMPORAL (TIMELINE)
 * ───────────────────────────────────────────────────────────── */
const ALLY_COLORS = ['#4c8dff', '#06b6d4', '#e0a96d', '#818cf8', '#34d399'];
const ENEMY_COLORS = ['#f43f5e', '#ea580c', '#e11d48', '#c084fc', '#f97316'];
const ME_COLOR = '#ff2e4d'; // Rojo Noxus prominente para el usuario

/* ─────────────────────────────────────────────────────────────
 * ASIGNACIÓN DE ETIQUETAS CONDUCTUALES (BEHAVIOR TAGS)
 * ───────────────────────────────────────────────────────────── */
export function assignBehaviorTag(
  p: {
    k: number;
    d: number;
    a: number;
    role: Role;
    damageDealt: number;
    damageTaken: number;
    visionScore: number;
    controlWards: number;
    champ: string;
  },
  all: {
    k: number;
    d: number;
    a: number;
    team: 'blue' | 'red';
    damageDealt: number;
    damageTaken: number;
    visionScore: number;
  }[],
  team: 'blue' | 'red',
): BehaviorTag {
  const teamMembers = all.filter((x) => x.team === team);
  const maxDmgInTeam = Math.max(1, ...teamMembers.map((x) => x.damageDealt));
  const maxKillsInTeam = Math.max(1, ...teamMembers.map((x) => x.k));
  const maxAssistsInTeam = Math.max(1, ...teamMembers.map((x) => x.a));
  const maxDmgTakenInGame = Math.max(1, ...all.map((x) => x.damageTaken));
  const maxVisionInGame = Math.max(1, ...all.map((x) => x.visionScore));

  if (p.k >= 8 && (p.damageDealt >= maxDmgInTeam * 0.95 || p.k >= maxKillsInTeam)) {
    return {
      label: 'El Team Carry',
      icon: 'swords',
      color: 'text-crimson bg-crimson/15 border-crimson/40',
      desc: 'Mayor daño acumulado e impacto decisivo en peleas por equipos.',
    };
  }

  if (p.k >= 10 && p.d <= 3) {
    return {
      label: '1 vs 5',
      icon: 'flame',
      color: 'text-amber-400 bg-amber-400/15 border-amber-400/40',
      desc: 'Dominó duelos y escaramuzas con mínimo margen de error.',
    };
  }

  if (p.damageTaken >= maxDmgTakenInGame * 0.88 || (p.role === 'top' && p.damageTaken >= 28000)) {
    return {
      label: 'Imán',
      icon: 'target',
      color: 'text-amber-500 bg-amber-500/15 border-amber-500/40',
      desc: 'Absorbió el castigo prioritario del equipo contrario.',
    };
  }

  if (p.controlWards >= 4 || p.visionScore >= maxVisionInGame * 0.88) {
    return {
      label: '¡Te veo!',
      icon: 'eye',
      color: 'text-sky-400 bg-sky-400/15 border-sky-400/40',
      desc: 'Control de visión absoluto y denegación de información en niebla.',
    };
  }

  if (p.role === 'support' || p.a >= maxAssistsInTeam * 0.9) {
    return {
      label: 'Apoyo',
      icon: 'shield',
      color: 'text-emerald-400 bg-emerald-400/15 border-emerald-400/40',
      desc: 'Facilitador de iniciaciones, peel protector y asistencias seguras.',
    };
  }

  if (p.d >= 8 && p.k <= 4) {
    return {
      label: 'Mal inicio',
      icon: 'alert',
      color: 'text-rose-400 bg-rose-400/15 border-rose-400/40',
      desc: 'Fase temprana difícil con muertes acumuladas bajo presión rival.',
    };
  }

  if (p.role === 'mid' || ['Syndra', 'Ahri', 'Camille', 'Blitzcrank', 'Thresh', 'Nautilus'].includes(p.champ)) {
    return {
      label: 'Pescador',
      icon: 'spark',
      color: 'text-gold bg-gold/15 border-gold/40',
      desc: 'Cazador de iniciaciones que aisló objetivos clave previo al dragón.',
    };
  }

  return {
    label: 'Molesto',
    icon: 'zap',
    color: 'text-purple-400 bg-purple-400/15 border-purple-400/40',
    desc: 'Constante hostigamiento y control de masas disruptivo en las líneas.',
  };
}

/* ─────────────────────────────────────────────────────────────
 * GENERADOR DE LAS 6 TARJETAS DE RENDIMIENTO CON PERCENTILES
 * ───────────────────────────────────────────────────────────── */
function buildMetricCards(p: {
  k: number;
  d: number;
  a: number;
  durationSec: number;
  visionScore: number;
  controlWards: number;
  damageDealt: number;
  damageTaken: number;
  epicMonsterDiff: number;
}): MetricCard[] {
  const mins = Math.max(1, p.durationSec / 60);
  const kdaNum = (p.k + p.a) / Math.max(1, p.d);
  const visionPerMin = p.visionScore / mins;

  // 1. Ratio KDA (Promedio típico ~2.10)
  const kdaRank = Math.min(99, Math.max(5, Math.round(kdaNum >= 3 ? 42 : kdaNum * 15)));
  // 2. Visión por minuto (Promedio típico ~1.40)
  const visionRank = Math.min(99, Math.max(5, Math.round(visionPerMin >= 2 ? 36 : visionPerMin * 22)));
  // 3. Diferencia de monstruos épicos (+3, +1, -1)
  const epicRank = p.epicMonsterDiff >= 0 ? 40 : 65;
  // 4. Daño recibido (Promedio ~21,000)
  const dmgTakenRank = p.damageTaken >= 25000 ? 27 : 55;
  // 5. Daño infligido (Promedio ~18,500)
  const dmgDealtRank = p.damageDealt >= 20000 ? 30 : 40;
  // 6. Control Wards
  const wardRank = p.controlWards >= 4 ? 24 : 58;

  return [
    {
      id: 'kda',
      title: 'Ratio KDA',
      icon: 'swords',
      value: kdaNum.toFixed(2),
      rawNum: kdaNum,
      averageText: 'Media del Elo: 2.15',
      percentileBadge: `Highest ${kdaRank}th`,
      percentileRank: kdaRank,
      isHighest: true,
      progressPercent: Math.min(100, Math.round((kdaNum / 4.5) * 100)),
    },
    {
      id: 'vision_pm',
      title: 'Puntuación de visión por minuto',
      icon: 'eye',
      value: visionPerMin.toFixed(2),
      rawNum: visionPerMin,
      averageText: 'Media del Elo: 1.40 /min',
      percentileBadge: `Highest ${visionRank}th`,
      percentileRank: visionRank,
      isHighest: true,
      progressPercent: Math.min(100, Math.round((visionPerMin / 3.0) * 100)),
    },
    {
      id: 'epic_monsters',
      title: 'Diferencia de Monstruos Épicos',
      icon: 'trophy',
      value: p.epicMonsterDiff > 0 ? `+${p.epicMonsterDiff}` : `${p.epicMonsterDiff}`,
      rawNum: p.epicMonsterDiff,
      averageText: p.epicMonsterDiff >= 0 ? 'Ventaja en Barones y Dragones' : 'Déficit en neutrales',
      percentileBadge: `Highest ${epicRank}th`,
      percentileRank: epicRank,
      isHighest: p.epicMonsterDiff >= 0,
      progressPercent: Math.min(100, Math.max(10, 50 + p.epicMonsterDiff * 12)),
    },
    {
      id: 'damage_taken',
      title: 'Daño total recibido',
      icon: 'shield',
      value: p.damageTaken.toLocaleString('es-ES'),
      rawNum: p.damageTaken,
      averageText: 'Media de partida: 22,400',
      percentileBadge: `Highest ${dmgTakenRank}th`,
      percentileRank: dmgTakenRank,
      isHighest: true,
      progressPercent: Math.min(100, Math.round((p.damageTaken / 40000) * 100)),
    },
    {
      id: 'damage_dealt',
      title: 'Daño total infligido',
      icon: 'flame',
      value: p.damageDealt.toLocaleString('es-ES'),
      rawNum: p.damageDealt,
      averageText: 'Media de partida: 18,600',
      percentileBadge: `Lowest ${dmgDealtRank}th`,
      percentileRank: dmgDealtRank,
      isHighest: false,
      progressPercent: Math.min(100, Math.max(15, Math.round((p.damageDealt / 35000) * 100))),
    },
    {
      id: 'control_wards',
      title: 'Control Wards comprados/colocados',
      icon: 'target',
      value: p.controlWards.toFixed(2),
      rawNum: p.controlWards,
      averageText: 'Objetivo de Elo: 3.50',
      percentileBadge: `Highest ${wardRank}th`,
      percentileRank: wardRank,
      isHighest: true,
      progressPercent: Math.min(100, Math.round((p.controlWards / 6) * 100)),
    },
  ];
}

/* ─────────────────────────────────────────────────────────────
 * SIMULADOR DE CURVA TEMPORAL (CUANDO NO HAY TIMELINE RIOT)
 * ───────────────────────────────────────────────────────────── */
function generateRealisticTimeline(
  participants: ParticipantDetail[],
  durationSec: number,
): { minutes: number[]; gold: TimelineDataPoint[]; damage: TimelineDataPoint[]; cs: TimelineDataPoint[] } {
  const totalMins = Math.max(10, Math.floor(durationSec / 60));
  const minutes: number[] = Array.from({ length: totalMins + 1 }, (_, i) => i);

  const gold: TimelineDataPoint[] = [];
  const damage: TimelineDataPoint[] = [];
  const cs: TimelineDataPoint[] = [];

  for (let m = 0; m <= totalMins; m++) {
    const progress = m / totalMins;
    const goldVals: Record<number, number> = {};
    const dmgVals: Record<number, number> = {};
    const csVals: Record<number, number> = {};

    for (const p of participants) {
      // Oro: arranca en 500, escala exponencialmente con ganks y torres
      const startGold = 500;
      const endGold = p.gold;
      const goldAtMin = Math.round(startGold + (endGold - startGold) * Math.pow(progress, 1.25));
      goldVals[p.participantId] = goldAtMin;

      // Daño: arranca en 0, aumenta dramáticamente a partir del min 14 (teamfights)
      const endDmg = p.damageDealt;
      const dmgAtMin = Math.round(endDmg * Math.pow(progress, 1.6));
      dmgVals[p.participantId] = dmgAtMin;

      // CS: arranca en 0, progresión lineal con pequeñas pausas en mid game
      const endCs = p.cs;
      const csAtMin = Math.round(endCs * Math.pow(progress, 0.95));
      csVals[p.participantId] = csAtMin;
    }

    gold.push({ minute: m, values: goldVals });
    damage.push({ minute: m, values: dmgVals });
    cs.push({ minute: m, values: csVals });
  }

  return { minutes, gold, damage, cs };
}

/* ─────────────────────────────────────────────────────────────
 * COMPOSICIONES MOCK RICAS (10 JUGADORES) PARA HISTORIAL LOCAL
 * ───────────────────────────────────────────────────────────── */
interface TeamArchetype {
  top: string;
  jungle: string;
  mid: string;
  adc: string;
  support: string;
}

const ALLY_MOCKS: Record<string, TeamArchetype> = {
  m1: { top: 'Aatrox', jungle: 'Vi', mid: 'Sylas', adc: 'KaiSa', support: 'Nautilus' },
  m2: { top: 'Ornn', jungle: 'JarvanIV', mid: 'Ahri', adc: 'Jinx', support: 'Lulu' },
  m3: { top: 'Camille', jungle: 'Sejuani', mid: 'Orianna', adc: 'Jhin', support: 'Leona' },
  m4: { top: 'Gwen', jungle: 'Viego', mid: 'Orianna', adc: 'Caitlyn', support: 'Milio' },
  m5: { top: 'Sion', jungle: 'LeeSin', mid: 'Viktor', adc: 'Aphelios', support: 'Thresh' },
  m6: { top: 'Renekton', jungle: 'JarvanIV', mid: 'Syndra', adc: 'Ezreal', support: 'Karma' },
  m7: { top: 'Malphite', jungle: 'Nocturne', mid: 'Yone', adc: 'Jinx', support: 'Blitzcrank' },
  m8: { top: 'KSante', jungle: 'XinZhao', mid: 'Ahri', adc: 'Varus', support: 'Rell' },
};

const ENEMY_MOCKS: Record<string, TeamArchetype> = {
  m1: { top: 'Darius', jungle: 'LeeSin', mid: 'Viktor', adc: 'Jinx', support: 'Thresh' },
  m2: { top: 'Jax', jungle: 'Viego', mid: 'Syndra', adc: 'Caitlyn', support: 'Lux' },
  m3: { top: 'Gnar', jungle: 'XinZhao', mid: 'Akali', adc: 'Ashe', support: 'Braum' },
  m4: { top: 'Fiora', jungle: 'JarvanIV', mid: 'Syndra', adc: 'Jinx', support: 'Nami' },
  m5: { top: 'Malphite', jungle: 'Nocturne', mid: 'Yone', adc: 'KaiSa', support: 'Rakan' },
  m6: { top: 'Aatrox', jungle: 'Viego', mid: 'Ahri', adc: 'Lucian', support: 'Nami' },
  m7: { top: 'Jax', jungle: 'LeeSin', mid: 'Azir', adc: 'Caitlyn', support: 'Morgana' },
  m8: { top: 'Gwen', jungle: 'Vi', mid: 'Yone', adc: 'Tristana', support: 'Alistar' },
};

function buildLocalDetailedMatch(m: Match): DetailedMatch {
  const isWin = m.result === 'win';
  const durationMin = Math.max(1, m.durationSec / 60);

  const alliesArch = ALLY_MOCKS[m.id] ?? {
    top: m.role === 'top' ? m.champ : 'Aatrox',
    jungle: m.role === 'jungle' ? m.champ : 'Vi',
    mid: m.role === 'mid' ? m.champ : 'Orianna',
    adc: m.role === 'adc' ? m.champ : 'KaiSa',
    support: m.role === 'support' ? m.champ : 'Nautilus',
  };

  const enemiesArch = ENEMY_MOCKS[m.id] ?? {
    top: m.role === 'top' ? m.rival : 'Darius',
    jungle: m.role === 'jungle' ? m.rival : 'LeeSin',
    mid: m.role === 'mid' ? m.rival : 'Viktor',
    adc: m.role === 'adc' ? m.rival : 'Caitlyn',
    support: m.role === 'support' ? m.rival : 'Thresh',
  };

  const roles: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];
  const allyNames = ['Acz593 (Tú)', 'ShadowWolf', 'SolarFlare', 'ValkyrieADC', 'OceanSoul'];
  const enemyNames = ['DarkVanquisher', 'GrimReaper', 'ApexPredator', 'SilverBullet', 'WardenSentinel'];

  const allParticipants: ParticipantDetail[] = [];
  const allies: ParticipantDetail[] = [];
  const enemies: ParticipantDetail[] = [];

  let blueKills = 0;
  let redKills = 0;
  let blueGold = 0;
  let redGold = 0;

  // Construir 5 aliados
  for (let i = 0; i < 5; i++) {
    const role = roles[i];
    const isMe = role === m.role;
    const champ = isMe ? m.champ : alliesArch[role];
    const k = isMe ? m.k : Math.max(1, Math.round((isWin ? 7 : 3) + (i % 3) * 2));
    const d = isMe ? m.d : Math.max(1, Math.round((isWin ? 3 : 7) + ((i * 2) % 4)));
    const a = isMe ? m.a : Math.max(2, Math.round((isWin ? 14 : 6) + (i % 5)));
    const cs = isMe ? m.cs : Math.round(role === 'support' ? 38 : durationMin * (isWin ? 7.8 : 6.5));
    const gold = isMe ? m.gpm * durationMin : Math.round(durationMin * (isWin ? 420 : 350) + cs * 18);
    const damageDealt = isMe ? 28400 : Math.round(durationMin * (role === 'support' ? 380 : 750));
    const damageTaken = isMe ? 31917 : Math.round(durationMin * (role === 'top' ? 950 : 620));
    const visionScore = isMe ? Math.round(durationMin * (isWin ? 1.8 : 0.9)) : Math.round(durationMin * (role === 'support' ? 2.5 : 1.1));
    // Mock del jugador: en derrotas con muchas muertes casi no compra Wards de Control
    const controlWards = isMe ? (isWin ? 4 : d >= 10 ? 0 : 1) : (role === 'support' ? 6 : 2);

    blueKills += k;
    blueGold += gold;

    const p: ParticipantDetail = {
      id: `ally_${i + 1}`,
      participantId: i + 1,
      name: isMe ? 'Acz593' : allyNames[i],
      champ,
      champName: champ,
      role,
      team: 'blue',
      isMe,
      k,
      d,
      a,
      kdaRatio: Number(((k + a) / Math.max(1, d)).toFixed(2)),
      cs,
      csPerMin: Number((cs / durationMin).toFixed(1)),
      gold,
      damageDealt,
      damageTaken,
      visionScore,
      controlWards,
      items: isMe ? m.items : [3071, 3047, 3053, 6672, 0, 0],
      ward: isMe ? m.ward : 3340,
      spells: isMe ? m.spells : ['SummonerFlash', 'SummonerTeleport'],
      keystone: isMe ? m.keystone : { path: 'Styles/Precision/Conqueror/Conqueror.png', name: 'Conquistador' },
      secondary: isMe ? m.secondary : { path: 'Styles/7204_Resolve.png', name: 'Valor' },
      behaviorTag: { label: '', icon: 'shield', color: '', desc: '' },
      timelineColor: isMe ? ME_COLOR : ALLY_COLORS[i],
    };
    allies.push(p);
  }

  // Construir 5 rivales
  for (let i = 0; i < 5; i++) {
    const role = roles[i];
    const champ = enemiesArch[role];
    const isRivalDirect = role === m.role;
    const k = isRivalDirect && !isWin ? 9 : Math.max(1, Math.round((isWin ? 3 : 7) + (i % 3)));
    const d = isRivalDirect && isWin ? 8 : Math.max(1, Math.round((isWin ? 7 : 3) + ((i * 2) % 4)));
    const a = Math.max(2, Math.round((isWin ? 5 : 12) + (i % 4)));
    const cs = Math.round(role === 'support' ? 32 : durationMin * (isWin ? 6.2 : 7.9));
    const gold = Math.round(durationMin * (isWin ? 340 : 430) + cs * 19);
    const damageDealt = Math.round(durationMin * (role === 'support' ? 340 : 780));
    const damageTaken = Math.round(durationMin * (role === 'top' ? 920 : 610));
    const visionScore = Math.round(durationMin * (role === 'support' ? 2.4 : 1.0));
    const controlWards = role === 'support' ? 5 : 2;

    redKills += k;
    redGold += gold;

    const p: ParticipantDetail = {
      id: `enemy_${i + 6}`,
      participantId: i + 6,
      name: enemyNames[i],
      champ,
      champName: champ,
      role,
      team: 'red',
      isMe: false,
      k,
      d,
      a,
      kdaRatio: Number(((k + a) / Math.max(1, d)).toFixed(2)),
      cs,
      csPerMin: Number((cs / durationMin).toFixed(1)),
      gold,
      damageDealt,
      damageTaken,
      visionScore,
      controlWards,
      items: [3078, 3047, 3053, 0, 0, 0],
      ward: 3340,
      spells: ['SummonerFlash', 'SummonerDot'],
      keystone: { path: 'Styles/Precision/Conqueror/Conqueror.png', name: 'Conquistador' },
      secondary: { path: 'Styles/7200_Domination.png', name: 'Dominación' },
      behaviorTag: { label: '', icon: 'swords', color: '', desc: '' },
      timelineColor: ENEMY_COLORS[i],
    };
    enemies.push(p);
  }

  allParticipants.push(...allies, ...enemies);

  // Calcular etiquetas conductuales contextuales
  for (const p of allParticipants) {
    p.behaviorTag = assignBehaviorTag(p, allParticipants, p.team);
  }

  const me = allies.find((a) => a.isMe)!;
  const epicMonsterDiff = isWin ? 3 : -1;

  const metrics = buildMetricCards({
    k: me.k,
    d: me.d,
    a: me.a,
    durationSec: m.durationSec,
    visionScore: me.visionScore,
    controlWards: me.controlWards,
    damageDealt: me.damageDealt,
    damageTaken: me.damageTaken,
    epicMonsterDiff,
  });

  const timeline = generateRealisticTimeline(allParticipants, m.durationSec);

  const queueLabels: Record<Queue, string> = {
    solo: 'Clasificatoria Solo/Dúo',
    flex: 'Clasificatoria Flexible',
    quick: 'Reclutamiento Rápido',
    clash: 'Torneo Clash Noxus',
  };

  return {
    id: m.id,
    result: m.result,
    queue: m.queue,
    queueLabel: queueLabels[m.queue] || 'Clasificatoria Solo/Dúo',
    durationSec: m.durationSec,
    durationFormatted: `${Math.floor(m.durationSec / 60)}:${String(m.durationSec % 60).padStart(2, '0')}`,
    date: m.date,
    draftScore: m.draftScore,
    macroScore: m.macroScore,
    lp: m.lp,
    me,
    allies,
    enemies,
    allParticipants,
    metrics,
    epicMonsterDiff,
    blueKills,
    redKills,
    blueGold,
    redGold,
    minutes: timeline.minutes,
    timelineGold: timeline.gold,
    timelineDamage: timeline.damage,
    timelineCs: timeline.cs,
    events: simulateMatchEvents(allParticipants, m.durationSec, m.id),
  };
}

/* ─────────────────────────────────────────────────────────────
 * MAPEO DE PARTIDA DE RIOT API (MATCH-V5 + TIMELINE-V5)
 * ───────────────────────────────────────────────────────────── */
const ROLE_POSITION_MAP: Record<string, Role> = {
  TOP: 'top',
  JUNGLE: 'jungle',
  MIDDLE: 'mid',
  BOTTOM: 'adc',
  UTILITY: 'support',
};

function parseRiotMatchToDetailed(
  dto: RiotMatchDto,
  currentPuuidOrName: string,
): DetailedMatch {
  const durationSec = dto.info.gameDuration;
  const durationMin = Math.max(1, durationSec / 60);

  // Identificar al jugador actual
  const myPuuidClean = currentPuuidOrName.toLowerCase();
  let meParticipant = dto.info.participants.find(
    (p) =>
      p.puuid.toLowerCase() === myPuuidClean ||
      (p.riotIdGameName && p.riotIdGameName.toLowerCase() === myPuuidClean) ||
      (p.summonerName && p.summonerName.toLowerCase() === myPuuidClean),
  );

  if (!meParticipant) {
    meParticipant = dto.info.participants[0];
  }

  const myTeamId = meParticipant.teamId ?? 100;
  const isWin = meParticipant.win;

  const rolesOrder: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];
  const allParticipants: ParticipantDetail[] = [];
  const allies: ParticipantDetail[] = [];
  const enemies: ParticipantDetail[] = [];

  let blueKills = 0;
  let redKills = 0;
  let blueGold = 0;
  let redGold = 0;

  let allyColorIndex = 0;
  let enemyColorIndex = 0;

  for (let i = 0; i < dto.info.participants.length; i++) {
    const raw = dto.info.participants[i];
    const isMe = raw.puuid === meParticipant.puuid;
    const isAlly = (raw.teamId ?? (i < 5 ? 100 : 200)) === myTeamId;
    const team = isAlly ? 'blue' : 'red';

    const role = ROLE_POSITION_MAP[raw.teamPosition] || rolesOrder[i % 5];
    const champ = champIdFromKey(raw.championId);
    const k = raw.kills;
    const d = raw.deaths;
    const a = raw.assists;
    const cs = raw.totalMinionsKilled + raw.neutralMinionsKilled;
    const gold = raw.goldEarned;
    const damageDealt = raw.totalDamageDealtToChampions ?? Math.round(durationMin * 700);
    const damageTaken = raw.totalDamageTaken ?? Math.round(durationMin * 750);
    const visionScore = raw.visionScore ?? Math.round(durationMin * 1.3);
    const controlWards = raw.visionWardsBoughtInGame ?? 2;

    if (isAlly) {
      blueKills += k;
      blueGold += gold;
    } else {
      redKills += k;
      redGold += gold;
    }

    const name = raw.riotIdGameName || raw.summonerName || `Jugador ${i + 1}`;

    const color = isMe
      ? ME_COLOR
      : isAlly
      ? ALLY_COLORS[allyColorIndex++ % ALLY_COLORS.length]
      : ENEMY_COLORS[enemyColorIndex++ % ENEMY_COLORS.length];

    const pDetail: ParticipantDetail = {
      id: raw.puuid,
      participantId: raw.participantId ?? i + 1,
      name,
      tag: raw.riotIdTagline,
      champ,
      champName: raw.championName || champ,
      role,
      team,
      isMe,
      k,
      d,
      a,
      kdaRatio: Number(((k + a) / Math.max(1, d)).toFixed(2)),
      cs,
      csPerMin: Number((cs / durationMin).toFixed(1)),
      gold,
      damageDealt,
      damageTaken,
      visionScore,
      controlWards,
      items: [raw.item0, raw.item1, raw.item2, raw.item3, raw.item4, raw.item5],
      ward: raw.item6 || 3340,
      spells: ['SummonerFlash', 'SummonerTeleport'],
      keystone: { path: 'Styles/Precision/Conqueror/Conqueror.png', name: 'Conquistador' },
      secondary: { path: 'Styles/7204_Resolve.png', name: 'Valor' },
      behaviorTag: { label: '', icon: 'shield', color: '', desc: '' },
      timelineColor: color,
    };

    if (isAlly) allies.push(pDetail);
    else enemies.push(pDetail);
    allParticipants.push(pDetail);
  }

  // Ordenar por rol estándar (Top -> Jg -> Mid -> Adc -> Supp)
  const roleSort = (a: ParticipantDetail, b: ParticipantDetail) => rolesOrder.indexOf(a.role) - rolesOrder.indexOf(b.role);
  allies.sort(roleSort);
  enemies.sort(roleSort);

  // Asignar etiquetas conductuales
  for (const p of allParticipants) {
    p.behaviorTag = assignBehaviorTag(p, allParticipants, p.team);
  }

  const me = allies.find((a) => a.isMe) || allies[0];

  // Diferencia de monstruos épicos
  let epicMonsterDiff = 0;
  if (dto.info.teams) {
    const allyTeamObj = dto.info.teams.find((t) => t.teamId === myTeamId);
    const enemyTeamObj = dto.info.teams.find((t) => t.teamId !== myTeamId);
    const allyEpics = (allyTeamObj?.objectives?.baron?.kills ?? 0) + (allyTeamObj?.objectives?.dragon?.kills ?? 0);
    const enemyEpics = (enemyTeamObj?.objectives?.baron?.kills ?? 0) + (enemyTeamObj?.objectives?.dragon?.kills ?? 0);
    epicMonsterDiff = allyEpics - enemyEpics;
  } else {
    epicMonsterDiff = isWin ? 3 : -2;
  }

  const metrics = buildMetricCards({
    k: me.k,
    d: me.d,
    a: me.a,
    durationSec,
    visionScore: me.visionScore,
    controlWards: me.controlWards,
    damageDealt: me.damageDealt,
    damageTaken: me.damageTaken,
    epicMonsterDiff,
  });

  const timeline = generateRealisticTimeline(allParticipants, durationSec);

  const queueMap: Record<number, { q: Queue; label: string }> = {
    420: { q: 'solo', label: 'Clasificatoria Solo/Dúo' },
    440: { q: 'flex', label: 'Clasificatoria Flexible' },
    700: { q: 'clash', label: 'Torneo Clash' },
    490: { q: 'quick', label: 'Reclutamiento Rápido' },
  };

  const queueInfo = queueMap[dto.info.queueId] ?? { q: 'solo', label: 'Clasificatoria Solo/Dúo' };

  return {
    id: dto.metadata.matchId,
    result: isWin ? 'win' : 'loss',
    queue: queueInfo.q,
    queueLabel: queueInfo.label,
    durationSec,
    durationFormatted: `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`,
    date: new Date(dto.info.gameCreation).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    draftScore: Number((3.5 + (me.kdaRatio > 3 ? 0.8 : -0.5)).toFixed(1)),
    macroScore: isWin ? 82 : 46,
    lp: isWin ? 19 : -16,
    me,
    allies,
    enemies,
    allParticipants,
    metrics,
    epicMonsterDiff,
    blueKills,
    redKills,
    blueGold,
    redGold,
    minutes: timeline.minutes,
    timelineGold: timeline.gold,
    timelineDamage: timeline.damage,
    timelineCs: timeline.cs,
    // El timeline oficial (si existe) rellena kills/wards en fetchDetailedMatch
    events: { source: 'unavailable', mySide: myTeamId === 200 ? 'red' : 'blue', kills: [], wards: [] },
  };
}

/* ─────────────────────────────────────────────────────────────
 * FUNCIÓN PRINCIPAL DE CONSULTA DE PARTIDA DETALLADA
 * ───────────────────────────────────────────────────────────── */
export async function fetchDetailedMatch(
  matchId: string,
  region: string,
  currentPuuidOrName = 'Acz593',
): Promise<DetailedMatch> {
  // 1. Si es una partida local del mock (m1...m8)
  const localMatch = MATCHES.find((m) => m.id === matchId);
  if (localMatch) {
    return buildLocalDetailedMatch(localMatch);
  }

  // 2. Si es un match ID de Riot (ej. LA2_123456 o similar)
  try {
    const riotDto = await getMatchDetail(matchId, region);
    if (riotDto && riotDto.info && riotDto.info.participants) {
      const detailed = parseRiotMatchToDetailed(riotDto, currentPuuidOrName);

      // Intentar enriquecer con la timeline oficial de Riot si está disponible
      try {
        const timelineDto = await getMatchTimeline(matchId, region);
        if (timelineDto?.info?.frames?.length) {
          const frames = timelineDto.info.frames;
          const totalMins = frames.length - 1;
          detailed.minutes = Array.from({ length: frames.length }, (_, i) => i);
          detailed.timelineGold = [];
          detailed.timelineDamage = [];
          detailed.timelineCs = [];

          for (let m = 0; m <= totalMins; m++) {
            const frame = frames[m];
            const gVals: Record<number, number> = {};
            const dVals: Record<number, number> = {};
            const cVals: Record<number, number> = {};

            for (const [pIdStr, pf] of Object.entries(frame.participantFrames)) {
              const pId = Number(pIdStr);
              gVals[pId] = pf.totalGold;
              cVals[pId] = pf.minionsKilled + pf.jungleMinionsKilled;
              dVals[pId] = pf.damageStats?.totalDamageDoneToChampions ?? Math.round(pf.totalGold * 0.85);
            }

            detailed.timelineGold.push({ minute: m, values: gVals });
            detailed.timelineDamage.push({ minute: m, values: dVals });
            detailed.timelineCs.push({ minute: m, values: cVals });
          }

          // Eventos oficiales (muertes y wards) para el analizador de ganks
          const parsed = parseTimelineEvents(frames);
          detailed.events = { ...detailed.events, source: 'riot', kills: parsed.kills, wards: parsed.wards };
        }
      } catch {
        // Si falla la timeline específica de Riot, conservamos la generada
      }

      return detailed;
    }
  } catch {
    // Si falla Riot API, caer en el primer mock con el ID dado
  }

  // Fallback seguro en caso de error
  const fallbackMatch = MATCHES[0];
  return buildLocalDetailedMatch({ ...fallbackMatch, id: matchId });
}
