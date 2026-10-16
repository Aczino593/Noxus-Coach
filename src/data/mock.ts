import type { Queue, Role } from '../types';

/* ───────────────────────── Cuenta activa ───────────────────────── */
export interface RankInfo {
  tier: string; // "PLATA"
  division: string; // "III"
  lp: number;
  wins: number;
  losses: number;
}
export interface Account {
  name: string;
  tag: string;
  region: string;
  level: number;
  profileIcon: number;
  solo: RankInfo | null;
  flex: RankInfo | null;
}

export const ACCOUNT: Account = {
  name: 'Acz593',
  tag: 'Acz',
  region: 'LAS',
  level: 143,
  profileIcon: 4568,
  solo: { tier: 'PLATA', division: 'III', lp: 2, wins: 22, losses: 14 },
  flex: null,
};

export const REGIONS = [
  { id: 'LAS', label: 'América Latina Sur' },
  { id: 'LAN', label: 'América Latina Norte' },
  { id: 'NA', label: 'Norteamérica' },
  { id: 'BR', label: 'Brasil' },
  { id: 'EUW', label: 'Europa Oeste' },
  { id: 'EUNE', label: 'Europa Nórdica y Este' },
  { id: 'KR', label: 'Corea' },
];

/* ───────────────────────── Historial de partidas ───────────────────────── */
export interface Match {
  id: string;
  result: 'win' | 'loss';
  queue: Queue;
  durationSec: number;
  date: string;
  role: Role;
  champ: string;
  rival: string;
  k: number;
  d: number;
  a: number;
  cs: number;
  gpm: number;
  items: number[];
  ward: number;
  spells: [string, string];
  keystone: { path: string; name: string };
  secondary: { path: string; name: string };
  lp: number | null;
  draftScore: number; // 0-5
  macroScore: number | null; // 0-100
  insights: { kind: 'good' | 'warn' | 'bad'; text: string }[];
}

const K = {
  conqueror: { path: 'Styles/Precision/Conqueror/Conqueror.png', name: 'Conquistador' },
  electrocute: { path: 'Styles/Domination/Electrocute/Electrocute.png', name: 'Electrocutar' },
  grasp: { path: 'Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png', name: 'Garra del Inmortal' },
  comet: { path: 'Styles/Sorcery/ArcaneComet/ArcaneComet.png', name: 'Cometa Arcano' },
  lethal: { path: 'Styles/Precision/LethalTempo/LethalTempoTemp.png', name: 'Ritmo Letal' },
  aftershock: { path: 'Styles/Resolve/VeteranAftershock/VeteranAftershock.png', name: 'Réplica' },
  hail: { path: 'Styles/Domination/HailOfBlades/HailOfBlades.png', name: 'Lluvia de Espadas' },
};
const TREE = {
  precision: { path: 'Styles/7201_Precision.png', name: 'Precisión' },
  domination: { path: 'Styles/7200_Domination.png', name: 'Dominación' },
  sorcery: { path: 'Styles/7202_Sorcery.png', name: 'Brujería' },
  resolve: { path: 'Styles/7204_Resolve.png', name: 'Valor' },
  inspiration: { path: 'Styles/7203_Whimsy.png', name: 'Inspiración' },
};

export const MATCHES: Match[] = [
  {
    id: 'm1', result: 'loss', queue: 'solo', durationSec: 39 * 60 + 40, date: '5 Oct 2026', role: 'top',
    champ: 'Aatrox', rival: 'Darius', k: 8, d: 12, a: 9, cs: 206, gpm: 401,
    items: [6609, 3071, 3111, 3053, 3026, 0], ward: 3340, spells: ['SummonerFlash', 'SummonerTeleport'],
    keystone: K.conqueror, secondary: TREE.resolve, lp: -17, draftScore: 3.8, macroScore: 41,
    insights: [
      { kind: 'good', text: 'Draft sólido: Aatrox tiene ventaja de +3.2% de WR sobre Darius tras nivel 6.' },
      { kind: 'bad', text: '12 muertes: 5 de ellas ocurrieron sin visión en río entre los min 14 y 22.' },
      { kind: 'warn', text: 'Faltó teletransporte a la pelea de Barón (min 31). Perdiste 1 inhibidor.' },
    ],
  },
  {
    id: 'm2', result: 'win', queue: 'solo', durationSec: 31 * 60 + 12, date: '5 Oct 2026', role: 'top',
    champ: 'Ornn', rival: 'Jax', k: 4, d: 3, a: 17, cs: 221, gpm: 389,
    items: [3068, 3001, 3047, 3742, 0, 0], ward: 3340, spells: ['SummonerFlash', 'SummonerTeleport'],
    keystone: K.grasp, secondary: TREE.inspiration, lp: 19, draftScore: 4.4, macroScore: 78,
    insights: [
      { kind: 'good', text: 'Excelente uso de Q + R en la pelea de Dragón Ancestral (3 impactos).' },
      { kind: 'good', text: 'Mejoraste el ratio de visión: 1.2 wards/min.' },
    ],
  },
  {
    id: 'm3', result: 'win', queue: 'solo', durationSec: 28 * 60 + 5, date: '4 Oct 2026', role: 'top',
    champ: 'Camille', rival: 'Gnar', k: 11, d: 4, a: 6, cs: 187, gpm: 441,
    items: [6672, 3078, 3047, 3053, 0, 0], ward: 3340, spells: ['SummonerFlash', 'SummonerTeleport'],
    keystone: K.conqueror, secondary: TREE.domination, lp: 21, draftScore: 4.1, macroScore: 83,
    insights: [{ kind: 'good', text: 'Split-push efectivo: 3 torres tomadas mientras tu equipo contestaba Dragón.' }],
  },
  {
    id: 'm4', result: 'loss', queue: 'flex', durationSec: 34 * 60 + 51, date: '3 Oct 2026', role: 'mid',
    champ: 'Orianna', rival: 'Syndra', k: 3, d: 7, a: 11, cs: 267, gpm: 366,
    items: [6655, 3157, 3020, 3089, 0, 0], ward: 3364, spells: ['SummonerFlash', 'SummonerDot'],
    keystone: K.comet, secondary: TREE.inspiration, lp: -15, draftScore: 2.9, macroScore: 52,
    insights: [
      { kind: 'bad', text: 'Draft con 82% de daño AP: el rival construyó RM temprano.' },
      { kind: 'warn', text: 'Tu equipo no tenía engage fiable para tu R (solo 1 CC duro).' },
    ],
  },
  {
    id: 'm5', result: 'win', queue: 'clash', durationSec: 33 * 60 + 29, date: '2 Oct 2026', role: 'top',
    champ: 'Sion', rival: 'Malphite', k: 5, d: 2, a: 19, cs: 232, gpm: 378,
    items: [3068, 3110, 3047, 3083, 0, 0], ward: 3340, spells: ['SummonerFlash', 'SummonerTeleport'],
    keystone: K.aftershock, secondary: TREE.inspiration, lp: null, draftScore: 4.7, macroScore: 91,
    insights: [
      { kind: 'good', text: 'Composición Teamfight completada: 5/5 CC encadenados en Barón.' },
      { kind: 'good', text: 'Los bans coordinados anularon al One-Trick de Yone rival.' },
    ],
  },
  {
    id: 'm6', result: 'win', queue: 'solo', durationSec: 26 * 60 + 40, date: '2 Oct 2026', role: 'jungle',
    champ: 'JarvanIV', rival: 'Viego', k: 9, d: 5, a: 14, cs: 168, gpm: 405,
    items: [3071, 3047, 6333, 3053, 0, 0], ward: 3340, spells: ['SummonerFlash', 'SummonerSmite'],
    keystone: K.conqueror, secondary: TREE.resolve, lp: 18, draftScore: 3.9, macroScore: null,
    insights: [{ kind: 'good', text: 'Tracking de jungla enemiga correcto: 2 invasiones exitosas.' }],
  },
  {
    id: 'm7', result: 'loss', queue: 'quick', durationSec: 24 * 60 + 10, date: '1 Oct 2026', role: 'adc',
    champ: 'Jinx', rival: 'Caitlyn', k: 6, d: 8, a: 4, cs: 198, gpm: 349,
    items: [6672, 3006, 3031, 0, 0, 0], ward: 3340, spells: ['SummonerFlash', 'SummonerHeal'],
    keystone: K.lethal, secondary: TREE.domination, lp: null, draftScore: 3.1, macroScore: null,
    insights: [{ kind: 'warn', text: 'Perdiste la fase de líneas: −18 CS a los 10 minutos.' }],
  },
  {
    id: 'm8', result: 'win', queue: 'solo', durationSec: 29 * 60 + 33, date: '30 Sep 2026', role: 'mid',
    champ: 'Ahri', rival: 'Yone', k: 12, d: 4, a: 8, cs: 241, gpm: 428,
    items: [6655, 3020, 3157, 3089, 0, 0], ward: 3364, spells: ['SummonerFlash', 'SummonerDot'],
    keystone: K.electrocute, secondary: TREE.sorcery, lp: 20, draftScore: 4.2, macroScore: 80,
    insights: [{ kind: 'good', text: 'Ventaja de +1.1k de oro a los 15 min por rotaciones a bot.' }],
  },
];

export const QUEUE_LABEL: Record<Queue, string> = {
  solo: 'Clasificatoria Solo/Dúo',
  flex: 'Flexible',
  quick: 'Reclutamiento',
  clash: 'Torneo Clash',
};

/** Resultados de las últimas 10 partidas (más reciente a la derecha). 6W 4L */
export const LAST_10: ('W' | 'L')[] = ['L', 'L', 'W', 'W', 'W', 'L', 'W', 'W', 'L', 'W'].reverse() as ('W' | 'L')[];

export const SUMMARY = {
  games: 36,
  winrate: 61.1,
  champs: [
    { id: 'Aatrox', w: 0, l: 1 },
    { id: 'Ornn', w: 1, l: 0 },
    { id: 'Camille', w: 2, l: 0 },
  ],
};

/** LP absoluto (0 = Plata IV 0 LP; 100 = Plata III 0 LP; 200 = Plata II 0 LP). */
export const LP_SERIES: number[] = [
  22, 30, 41, 38, 52, 61, 58, 70, 66, 74, 85, 79, 71, 88, 96, 92, 84, 97, 108, 103, 95, 112, 120, 116, 109, 118, 127, 124, 118, 102,
];
export const LP_BANDS = [
  { at: 0, label: 'Plata IV' },
  { at: 100, label: 'Plata III' },
  { at: 200, label: 'Plata II' },
];

/* ───────────────────────── Estadísticas de la cuenta ───────────────────────── */
export interface StatGroup {
  id: string;
  label: string;
  score: number;
  rows: { label: string; value: number }[];
}

export const STAT_GROUPS: StatGroup[] = [
  {
    id: 'resource', label: 'Recurso', score: 65,
    rows: [
      { label: 'CS en línea', value: 80 },
      { label: 'XP', value: 77 },
      { label: 'CS de la jungla', value: 93 },
      { label: 'Oro', value: 8 },
    ],
  },
  {
    id: 'combat', label: 'Combate', score: 36,
    rows: [
      { label: 'Participación total en muertes', value: 9 },
      { label: 'Ratio KDA', value: 32 },
      { label: 'Daño causado', value: 21 },
      { label: 'Daño recibido', value: 81 },
    ],
  },
  {
    id: 'objectives', label: 'Objetivos', score: 40,
    rows: [
      { label: 'Dragones', value: 5 },
      { label: 'Larvas del Vacío y Heraldo', value: 50 },
      { label: 'Torres exteriores e interiores', value: 65 },
    ],
  },
  {
    id: 'vision', label: 'Visión', score: 35,
    rows: [
      { label: 'Ward estándar', value: 36 },
      { label: 'Wards de control', value: 28 },
      { label: 'Trinkets azules', value: 40 },
      { label: 'Objetos de support', value: 89 },
    ],
  },
];

export const KILL_TARGETS: { role: Role; value: number }[] = [
  { role: 'top', value: 21 },
  { role: 'jungle', value: 13 },
  { role: 'mid', value: 8 },
  { role: 'adc', value: 44 },
  { role: 'support', value: 2 },
];

export const TEAM_SHARES = [
  { label: 'Reparto de Daño', value: 20 },
  { label: 'Reparto de Oro', value: 21 },
  { label: 'Reparto de XP', value: 17 },
];

export const EARLY_AGGRESSION = {
  overall: 20,
  rows: [
    { label: 'Primeras Sangres', value: 27 },
    { label: 'Invasiones de nivel 1', value: 16 },
    { label: 'Participaciones en asesinatos Pre-7', value: 17 },
  ],
};

export const WALLET = [
  { label: '0-7 min', value: 3 },
  { label: '7-14 min', value: 62 },
  { label: '14-21 min', value: 5 },
  { label: '21+ min', value: 17 },
];

export const DESTROYING = [
  { label: 'Torres', value: 62 },
  { label: 'Jugadores', value: 36 },
  { label: 'Monstruos', value: 74 },
];
