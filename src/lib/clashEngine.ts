import { CHAMP_BY_ID, champsForRole } from '../data/champions';
import { ARCH_BY_ID, SAMPLE_ENEMY, type PoolEntry, type ScoutPlayer } from '../data/clashMock';
import { GROUP_LABEL, item } from '../data/items';
import { ROLE_LABEL, ROLES, type Archetype, type Champion, type Role } from '../types';
import { counterPair } from './draftEngine';
import { hash01 } from './charts';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40];

export type Team = (string | null)[];
const filled = (team: Team): Champion[] => team.filter(Boolean).map((id) => CHAMP_BY_ID[id!]);

/* ──────────────── Cadena de CC ──────────────── */
export interface CCSeg {
  champ: string;
  start: number;
  dur: number;
}
export interface CCChain {
  segs: CCSeg[];
  total: number;
  soft: number;
  rating: 'excelente' | 'buena' | 'débil';
  order: string[];
}

export function ccChain(team: Team): CCChain {
  const list = filled(team)
    .filter((c) => c.hardCC > 0)
    .sort((a, b) => b.hardCC - a.hardCC);
  let cursor = 0;
  const segs: CCSeg[] = list.map((c) => {
    const seg = { champ: c.id, start: cursor, dur: c.hardCC };
    cursor += c.hardCC - 0.2; // 0.2 s de solape: la cadena no deja huecos
    return seg;
  });
  const total = list.reduce((a, c) => a + c.hardCC, 0);
  const soft = filled(team).reduce((a, c) => a + c.softCC, 0);
  return {
    segs,
    total,
    soft,
    rating: total >= 7 ? 'excelente' : total >= 5 ? 'buena' : 'débil',
    order: list.map((c) => c.id),
  };
}

/* ──────────────── Curva de poder ──────────────── */
const smooth = (x: number) => x * x * (3 - 2 * x);
export function powerCurve(team: Team): number[] {
  const champs = filled(team);
  if (!champs.length) return MINUTES.map(() => 0);
  return MINUTES.map((t) => {
    const w = smooth(clamp((t - 4) / 32, 0, 1));
    const avg = champs.reduce((a, c) => a + c.early * (1 - w) + c.late * w, 0) / champs.length;
    return clamp(avg * 20, 0, 100);
  });
}

export function powerProfile(team: Team): { label: string; tone: 'early' | 'late' | 'even'; peak: number; windowFrom: number | null } {
  const champs = filled(team);
  const curve = powerCurve(team);
  const diff = champs.length ? champs.reduce((a, c) => a + c.early - c.late, 0) / champs.length : 0;
  const peakIdx = curve.indexOf(Math.max(...curve));
  const w = MINUTES.find((_, i) => curve[i] >= 70);
  return {
    label: diff > 0.45 ? 'Early Spike' : diff < -0.45 ? 'Late Game Scaling' : 'Curva equilibrada',
    tone: diff > 0.45 ? 'early' : diff < -0.45 ? 'late' : 'even',
    peak: MINUTES[peakIdx],
    windowFrom: w ?? null,
  };
}

/* ──────────────── Compatibilidad con arquetipo ──────────────── */
export interface Fit {
  score: number;
  checks: { label: string; ok: boolean; detail: string }[];
}

export function archetypeFit(team: Team, arch: Archetype): Fit {
  const champs = filled(team);
  if (!champs.length) return { score: 0, checks: [] };
  const tagged = champs.filter((c) => c.arch.includes(arch)).length;
  const chain = ccChain(team);
  const engage = champs.filter((c) => c.traits.includes('engage')).length;
  const poke = champs.filter((c) => c.traits.includes('poke')).length;
  const carry = champs.filter((c) => c.traits.includes('hypercarry')).length;
  const peel = champs.filter((c) => c.traits.includes('enchanter') || c.traits.includes('tank')).length;
  const splitters = champs.filter((c) => c.arch.includes('split')).length;
  const pickers = champs.filter((c) => c.arch.includes('pick')).length;

  let bonus = 0;
  let checks: Fit['checks'] = [];
  switch (arch) {
    case 'teamfight':
      bonus = (engage >= 2 ? 15 : engage * 7) + (chain.total >= 6 ? 20 : chain.total * 2.5);
      checks = [
        { label: 'Engages de área', ok: engage >= 2, detail: `${engage}/2 recomendados` },
        { label: 'Cadena de CC ≥ 6 s', ok: chain.total >= 6, detail: `${chain.total.toFixed(1)} s` },
        { label: 'Daño AoE tardío', ok: champs.filter((c) => c.late >= 4).length >= 2, detail: `${champs.filter((c) => c.late >= 4).length} picks de escalado` },
      ];
      break;
    case 'pick':
      bonus = Math.min(pickers, 3) * 8 + (chain.total >= 5 ? 14 : chain.total * 2);
      checks = [
        { label: 'Campeones de pick', ok: pickers >= 3, detail: `${pickers}/3` },
        { label: 'CC duro suficiente', ok: chain.total >= 5, detail: `${chain.total.toFixed(1)} s` },
        { label: 'Poder medio (min 10-20)', ok: powerCurve(team)[3] >= 60, detail: `${Math.round(powerCurve(team)[3])}/100` },
      ];
      break;
    case 'poke':
      bonus = Math.min(poke, 3) * 9 + (engage === 0 ? 10 : 0);
      checks = [
        { label: 'Pokers de rango', ok: poke >= 2, detail: `${poke}/2` },
        { label: 'Peel / Disengage', ok: peel >= 1, detail: `${peel} picks` },
        { label: 'Sin dependencia de engage', ok: engage <= 1, detail: `${engage} engages` },
      ];
      break;
    case 'split':
      bonus = (splitters >= 1 ? 16 : 0) + (champs.filter((c) => c.arch.includes('teamfight')).length ? 0 : 0) + (chain.total >= 4 ? 10 : 0);
      checks = [
        { label: 'Splitter dedicado', ok: splitters >= 1, detail: `${splitters} candidatos` },
        { label: 'Escape / Teletransporte', ok: champs.some((c) => c.id === 'Fiora' || c.id === 'Jax' || c.id === 'Camille' || c.id === 'Gwen' || c.id === 'Yone'), detail: 'Top/Mid con side-lane' },
        { label: '3 jugadores para contestar', ok: chain.total >= 4, detail: `${chain.total.toFixed(1)} s de CC` },
      ];
      break;
    case 'protect':
      bonus = (carry >= 1 ? 20 : 0) + Math.min(peel, 3) * 6;
      checks = [
        { label: 'Hypercarry', ok: carry >= 1, detail: `${carry} carries` },
        { label: 'Peel (enchanter / tanque)', ok: peel >= 2, detail: `${peel}/2` },
        { label: 'Frontline con CC', ok: champs.some((c) => c.traits.includes('tank') && c.hardCC >= 1.5), detail: 'Tanque con CC duro' },
      ];
      break;
  }
  const score = clamp(Math.round((tagged / 5) * 55 + bonus + (champs.length < 5 ? -8 : 0)), 5, 99);
  return { score, checks };
}

/* ──────────────── Ejecución táctica ──────────────── */
export function execEase(team: Team): { score: number; calls: string[] } {
  const champs = filled(team);
  if (!champs.length) return { score: 0, calls: [] };
  const calls: string[] = [];
  const engagers = champs.filter((c) => c.traits.includes('engage'));
  if (engagers.length) calls.push(`Call de engage: ${engagers.slice(0, 2).map((c) => c.name).join(' / ')} abren, el resto sigue.`);
  if (ccChain(team).segs.length >= 3) calls.push('Orden de CC encadenado (ping de secuencia 1-2-3).');
  if (champs.some((c) => c.traits.includes('assassin'))) calls.push('Sincronizar el flanco del asesino con el engage frontal.');
  if (champs.some((c) => c.traits.includes('enchanter'))) calls.push('Peel del carry: el enchanter reserva su habilidad defensiva.');
  if (champs.some((c) => c.arch.includes('split'))) calls.push('Cobertura de side-lane y timers de Teletransporte.');
  if (champs.some((c) => c.traits.includes('hypercarry'))) calls.push('Foco: "protegemos al carry" hasta nivel 4 de objetos.');
  const avgExec = champs.reduce((a, c) => a + c.exec, 0) / champs.length;
  const score = clamp(Math.round(avgExec * 20 - calls.length * 2.5 + 8), 20, 98);
  return { score, calls: calls.slice(0, 5) };
}

export interface Insight {
  kind: 'good' | 'warn' | 'bad';
  text: string;
}

export function insights(team: Team, arch: Archetype): Insight[] {
  const champs = filled(team);
  if (champs.length < 5) return [{ kind: 'warn', text: `Completa los 5 picks (${champs.length}/5) para un análisis fiable.` }];
  const out: Insight[] = [];
  const ad = champs.reduce((a, c) => a + (c.dmg === 'AD' ? 1 : c.dmg === 'MIX' ? 0.5 : 0), 0) / 5;
  if (ad > 0.75) out.push({ kind: 'bad', text: `Daño ${Math.round(ad * 100)}% físico: el rival apilará armadura. Añade un pick AP.` });
  else if (ad < 0.25) out.push({ kind: 'bad', text: `Daño ${Math.round((1 - ad) * 100)}% mágico: el rival apilará RM. Añade un pick AD.` });
  else out.push({ kind: 'good', text: `Balance de daño sano (AD ${Math.round(ad * 100)}% / AP ${Math.round((1 - ad) * 100)}%).` });
  if (!champs.some((c) => c.traits.includes('engage'))) out.push({ kind: 'bad', text: 'Sin engage fiable: dependerás de que el rival inicie la pelea.' });
  if (!champs.some((c) => c.traits.includes('tank'))) out.push({ kind: 'warn', text: 'Sin frontline dedicado: tus carries quedarán expuestos.' });
  const chain = ccChain(team);
  out.push(chain.total >= 6 ? { kind: 'good', text: `Excelente cadena de CC: ${chain.total.toFixed(1)} s encadenables.` } : { kind: 'warn', text: `Cadena de CC corta (${chain.total.toFixed(1)} s): cuesta cerrar un pick.` });
  if (!champs.some((c) => c.late >= 5 || c.traits.includes('hypercarry'))) out.push({ kind: 'warn', text: 'Sin win-condition tardía: busca cerrar antes del minuto 28.' });
  const fit = archetypeFit(team, arch);
  const name = ARCH_BY_ID[arch].short;
  out.push(fit.score >= 70 ? { kind: 'good', text: `La composición encaja con ${name} (${fit.score}%).` } : { kind: 'warn', text: `Encaje bajo con ${name} (${fit.score}%): ajusta picks o cambia de arquetipo.` });
  return out.slice(0, 6);
}

/** Mejor arquetipo según los picks actuales */
export function bestArchetype(team: Team): Archetype {
  const ids = Object.keys(ARCH_BY_ID) as Archetype[];
  return ids.map((id) => ({ id, s: archetypeFit(team, id).score })).sort((a, b) => b.s - a.s)[0].id;
}

/* ──────────────── Scouting ──────────────── */
const MASTERY: PoolEntry['mastery'][] = ['M7', 'M6', 'M5', 'M4'];

export function genPlayer(name: string, tag: string, role: Role): ScoutPlayer {
  const known = SAMPLE_ENEMY.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (known) return { ...known, tag: tag || known.tag };
  const pool = champsForRole(role);
  const seed = `${name}#${tag}`;
  const picks: string[] = [];
  for (let k = 0; picks.length < 3 && k < 30; k++) {
    const c = pool[Math.floor(hash01(`${seed}:${k}`) * pool.length)];
    if (!picks.includes(c.id)) picks.push(c.id);
  }
  const otp = hash01(`${seed}:otp`) > 0.55;
  const base = 25 + Math.floor(hash01(`${seed}:g`) * 60);
  const games = otp ? [base * 2.4, base * 0.4, base * 0.25] : [base, base * 0.7, base * 0.5];
  return {
    role, name, tag: tag || 'LAS',
    rank: ['Plata I', 'Oro IV', 'Oro II', 'Platino III'][Math.floor(hash01(`${seed}:r`) * 4)],
    pool: picks.map((champ, i) => ({
      champ,
      games: Math.round(games[i]),
      wr: Math.round(44 + hash01(`${seed}:wr${i}`) * 18),
      mastery: MASTERY[Math.min(3, i + Math.floor(hash01(`${seed}:m`) * 2))],
      points: `${Math.round(60 + hash01(`${seed}:p${i}`) * 500)}k`,
    })),
  };
}

export const totalGames = (p: ScoutPlayer) => p.pool.reduce((a, e) => a + e.games, 0);
export const isOneTrick = (p: ScoutPlayer) => {
  const tot = totalGames(p);
  return tot > 0 && p.pool[0].games / tot >= 0.50;
};

export interface BanRec {
  champ: string;
  owner: string;
  role: Role;
  score: number;
  threat: 'crítica' | 'alta' | 'media';
  reasons: string[];
  tacticalAdvice: string;
  points: string;
  rawPoints: number;
  wr: number;
  games: number;
  isOtp: boolean;
}

export function recommendBans(players: ScoutPlayer[], myTeam: Team): BanRec[] {
  const mine = new Set(myTeam.filter(Boolean) as string[]);
  const mineChamps = filled(myTeam);
  const all: BanRec[] = [];

  for (const p of players) {
    const total = totalGames(p);
    const topEntry = p.pool[0];
    const playerIsOtp = Boolean(topEntry && total > 0 && topEntry.games / total >= 0.50);

    // Extraer los 3 campeones con mayor maestría del rival
    p.pool.slice(0, 3).forEach((e, i) => {
      if (mine.has(e.champ) || !CHAMP_BY_ID[e.champ]) return;

      const rawPoints = e.rawPoints ?? (parseInt(e.points, 10) * 1000 || 50000);
      const share = total > 0 ? e.games / total : 0;
      const champIsOtp = (share >= 0.50 || (playerIsOtp && i === 0)) && (e.games >= 4 || rawPoints >= 180000);

      // Ban Priority Score:
      // 1. Maestría total de puntos
      const masteryScore = Math.min(45, (rawPoints / 100000) * 8);

      // 2. Winrate reciente (ponderado)
      const wrDiff = e.wr - 50;
      const wrScore = wrDiff > 0 ? wrDiff * 1.5 : wrDiff * 0.4;

      // 3. One-Trick Pony (>50% de partidas)
      const otpScore = champIsOtp ? 35 : 0;

      // 4. Counters a nuestra composición
      const counters = mineChamps.length
        ? mineChamps.reduce((a, c) => a + counterPair(CHAMP_BY_ID[e.champ], c), 0) / mineChamps.length
        : 0;
      const counterScore = counters * 16;

      const rankBonus = i === 0 ? 8 : i === 1 ? 4 : 0;

      const score = Math.round(
        Math.max(5, masteryScore + wrScore + otpScore + counterScore + rankBonus),
      );

      // Consejo táctico contextual de coaching
      const champName = CHAMP_BY_ID[e.champ]?.name ?? e.champ;
      const roleStr = ROLE_LABEL[p.role] ?? p.role;
      const ptsStr = e.points || `${Math.round(rawPoints / 1000)}k`;

      let tacticalAdvice = '';
      if (champIsOtp) {
        tacticalAdvice = `Banear ${champName}: Rival en ${roleStr} es OTP con ${ptsStr} pts y ${e.wr}% WR reciente.`;
      } else if (e.wr >= 60 && rawPoints >= 200000) {
        tacticalAdvice = `Banear ${champName}: Confort pick letal de ${p.name} (${roleStr}) con ${ptsStr} pts y ${e.wr}% WR reciente.`;
      } else if (counterScore > 3) {
        tacticalAdvice = `Banear ${champName}: Counter directo y de alto impacto contra la composición de tu equipo.`;
      } else if (rawPoints >= 300000) {
        tacticalAdvice = `Banear ${champName}: Alta maestría en ${roleStr} (${ptsStr} pts) y pilar central de ${p.name}.`;
      } else {
        tacticalAdvice = `Banear ${champName}: Mayor winrate de ${p.name} en ${roleStr} (${e.wr}% WR) con ${ptsStr} de maestría.`;
      }

      const reasons: string[] = [];
      if (champIsOtp) reasons.push(`One-Trick · ${Math.round(share * 100)}% de sus partidas`);
      reasons.push(`${e.games} partidas · WR ${e.wr}%`);
      reasons.push(`Maestría ${e.mastery} · ${ptsStr}`);
      if (counters > 0.12) reasons.push('Counter directo a tu composición');

      all.push({
        champ: e.champ,
        owner: p.name,
        role: p.role,
        score,
        threat: 'media',
        reasons,
        tacticalAdvice,
        points: ptsStr,
        rawPoints,
        wr: e.wr,
        games: e.games,
        isOtp: champIsOtp,
      });
    });
  }

  // Eliminar duplicados si dos rivales comparten pick
  const map = new Map<string, BanRec>();
  for (const b of all) {
    const existing = map.get(b.champ);
    if (!existing || b.score > existing.score) {
      map.set(b.champ, b);
    }
  }

  const top = Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return top.map((b, i) => ({
    ...b,
    threat: i < 2 ? 'crítica' : i < 4 ? 'alta' : 'media',
  }));
}

/* ──────────────── Builds de equipo ──────────────── */
export interface Conflict {
  group: string;
  label: string;
  players: number[];
  itemName: string;
}

export function findConflicts(utility: number[][]): Conflict[] {
  const map = new Map<string, number[]>();
  utility.forEach((slots, p) => {
    const groups = new Set(slots.map((id) => item(id).group).filter(Boolean) as string[]);
    groups.forEach((g) => map.set(g, [...(map.get(g) ?? []), p]));
  });
  return [...map.entries()]
    .filter(([, ps]) => ps.length > 1)
    .map(([group, players]) => ({ group, label: GROUP_LABEL[group] ?? group, players, itemName: '' }));
}

export function slotConflicts(utility: number[][], p: number, s: number): string | null {
  const g = item(utility[p][s]).group;
  if (!g) return null;
  const clash = utility.some((slots, q) => q !== p && slots.some((id) => item(id).group === g));
  const self = utility[p].some((id, k) => k !== s && item(id).group === g);
  return clash || self ? (GROUP_LABEL[g] ?? g) : null;
}

const ALT: Record<Role, number[]> = {
  top: [3068, 3193, 3053, 6333, 3143],
  jungle: [3053, 6333, 3156, 3068],
  mid: [3157, 3156, 3102, 3003],
  adc: [3026, 3156, 6333, 3053],
  support: [3190, 3050, 3222, 2065, 3109],
};
const KEEP_ORDER: Record<string, number[]> = {
  antiheal: [3, 2, 1, 0, 4], // el daño principal se queda con la reducción de curación
  default: [4, 0, 1, 2, 3], // utilidad: prioridad al support / frontline
};

/** Resuelve duplicados de pasivas únicas dejando un único dueño por grupo. */
export function autoResolve(utility: number[][]): number[][] {
  const out = utility.map((u) => [...u]);
  for (let guard = 0; guard < 12; guard++) {
    const conflicts = findConflicts(out);
    if (!conflicts.length) break;
    const c = conflicts[0];
    const order = KEEP_ORDER[c.group] ?? KEEP_ORDER.default;
    const keeper = [...c.players].sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
    for (const p of c.players) {
      if (p === keeper) continue;
      const si = out[p].findIndex((id) => item(id).group === c.group);
      const role = ROLES[p];
      const used = new Set(out.flat());
      const replacement =
        ALT[role].find((id) => !used.has(id) && !(item(id).group && out.some((u) => u.some((x) => item(x).group === item(id).group)))) ??
        ALT[role].find((id) => !used.has(id)) ??
        ALT[role][0];
      out[p][si] = replacement;
    }
  }
  return out;
}

export interface Need {
  key: string;
  label: string;
  why: string;
  groupOrTag: (id: number) => boolean;
}

export const NEEDS: Need[] = [
  { key: 'antiheal', label: 'Anti-curación', why: 'Rivales con sustain', groupOrTag: (id) => item(id).group === 'antiheal' },
  { key: 'ap', label: 'Resistencia mágica', why: 'Daño AP en área', groupOrTag: (id) => item(id).tags.some((t) => t.includes('daño AP')) || item(id).group === 'abyssal' },
  { key: 'burst', label: 'Resistencia a burst', why: 'Asesinos / burst', groupOrTag: (id) => item(id).tags.includes('Resistencia a burst') },
  { key: 'tank', label: 'Anti-tanque', why: 'Frontline rival', groupOrTag: (id) => item(id).tags.some((t) => t.startsWith('Anti-tanque')) },
  { key: 'cc', label: 'Anti-CC / limpieza', why: 'Cadena de CC enemiga', groupOrTag: (id) => item(id).group === 'cleanse' || item(id).tags.includes('Anti-CC') },
];

/** Lee el equipo rival previsto (top de cada jugador) y estima qué necesidades son relevantes. */
export function enemyRead(players: ScoutPlayer[]): {
  predicted: string[];
  needs: Record<string, number>;
  apShare: number;
  chips: { label: string; tone: 'crimson' | 'gold' | 'win' }[];
} {
  const predicted = players.map((p) => p.pool[0].champ).filter((id) => CHAMP_BY_ID[id]);
  const champs = predicted.map((id) => CHAMP_BY_ID[id]);
  const count = (f: (c: Champion) => boolean) => champs.filter(f).length;
  const ap = champs.reduce((a, c) => a + (c.dmg === 'AP' ? 1 : c.dmg === 'MIX' ? 0.5 : 0), 0) / Math.max(1, champs.length);
  const needs: Record<string, number> = {
    antiheal: count((c) => c.traits.includes('heal')),
    ap: Math.round(ap * 5),
    burst: count((c) => c.traits.includes('assassin') || c.traits.includes('burst')),
    tank: count((c) => c.traits.includes('tank')),
    cc: Math.round(champs.reduce((a, c) => a + c.hardCC, 0) / 3),
  };
  const chips: { label: string; tone: 'crimson' | 'gold' | 'win' }[] = [
    { label: `${needs.antiheal} con curación`, tone: needs.antiheal >= 2 ? 'crimson' : 'gold' },
    { label: `${Math.round(ap * 100)}% daño AP`, tone: ap > 0.45 ? 'crimson' : 'win' },
    { label: `${needs.burst} burst/asesinos`, tone: needs.burst >= 2 ? 'crimson' : 'gold' },
    { label: `${needs.tank} tanques`, tone: needs.tank >= 2 ? 'crimson' : 'win' },
  ];
  return { predicted, needs, apShare: ap, chips };
}
