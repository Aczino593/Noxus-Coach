import { CHAMP_BY_ID, champsForRole } from '../data/champions';
import { ROLES, type Champion, type Role } from '../types';
import { hash01, pairHash } from './charts';

export type Side = 'blue' | 'red';
export type Slots = (string | null)[]; // 0-4 azul (top→supp), 5-9 rojo

export const sideOf = (i: number): Side => (i < 5 ? 'blue' : 'red');
export const roleOf = (i: number): Role => ROLES[i % 5];
export const opposite = (i: number): number => (i < 5 ? i + 5 : i - 5);
export const idx = (side: Side, role: Role): number => (side === 'blue' ? 0 : 5) + ROLES.indexOf(role);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Pesos del modelo de recomendación (editables en la UI). */
export const weights = { synergy: 1, counter: 1, meta: 1 };

/** Sinergia simétrica de un par aliado (≈ -1 … +1.2) */
export function synergyPair(a: Champion, b: Champion): number {
  const [x, y] = a.id < b.id ? [a, b] : [b, a];
  let s = pairHash(x.id, y.id) * 0.55;
  const shared = a.arch.filter((t) => b.arch.includes(t)).length;
  s += shared * 0.22;
  if (a.dmg !== b.dmg && a.dmg !== 'MIX' && b.dmg !== 'MIX') s += 0.2;
  if ((a.traits.includes('engage') && b.traits.includes('burst')) || (b.traits.includes('engage') && a.traits.includes('burst'))) s += 0.25;
  if ((a.traits.includes('enchanter') && b.traits.includes('hypercarry')) || (b.traits.includes('enchanter') && a.traits.includes('hypercarry'))) s += 0.3;
  return clamp(s, -1, 1.3);
}

/** Counter antisimétrico: >0 significa que `a` gana a `b` */
export function counterPair(a: Champion, b: Champion): number {
  const [x, y] = a.id < b.id ? [a, b] : [b, a];
  const base = pairHash(x.id, y.id) * 0.9;
  const signed = a.id < b.id ? base : -base;
  return clamp(signed + (a.early - b.early) * 0.08, -1.2, 1.2);
}

const metaBias = (id: string) => hash01(`meta:${id}`) * 0.55 - 0.15;

export interface PickEval {
  global: number;
  lane: number;
  synergy: number | null;
  counter: number | null;
  laneDelta: number | null; // en puntos porcentuales de WR
  mastery: string;
  winrate: number;
  synergies: { slot: number; value: number }[];
  counters: { slot: number; value: number }[];
}

const champOf = (id: string | null) => (id ? CHAMP_BY_ID[id] : null);

function adShare(champs: Champion[]): number | null {
  if (!champs.length) return null;
  const v = champs.reduce((a, c) => a + (c.dmg === 'AD' ? 1 : c.dmg === 'MIX' ? 0.5 : 0), 0);
  return v / champs.length;
}

export function evalPick(champId: string, i: number, slots: Slots): PickEval {
  const ch = CHAMP_BY_ID[champId];
  const side = sideOf(i);
  const synergies: PickEval['synergies'] = [];
  const counters: PickEval['counters'] = [];
  slots.forEach((id, j) => {
    const other = champOf(id);
    if (!other || j === i) return;
    if (sideOf(j) === side) synergies.push({ slot: j, value: synergyPair(ch, other) });
    else counters.push({ slot: j, value: counterPair(ch, other) });
  });
  const avg = (a: { value: number }[]) => (a.length ? a.reduce((s, x) => s + x.value, 0) / a.length : null);
  const synergy = avg(synergies);
  const counter = avg(counters);
  const laneEnemy = champOf(slots[opposite(i)]);
  const laneRaw = laneEnemy ? counterPair(ch, laneEnemy) : null;

  const allyAd = adShare(synergies.map((s) => CHAMP_BY_ID[slots[s.slot]!]));
  let need = 0;
  if (allyAd !== null && synergies.length >= 2) {
    if (allyAd > 0.65 && ch.dmg === 'AP') need = 0.22;
    if (allyAd < 0.35 && ch.dmg === 'AD') need = 0.22;
    if (allyAd > 0.65 && ch.dmg === 'AD') need = -0.15;
    if (allyAd < 0.35 && ch.dmg === 'AP') need = -0.15;
  }

  const mb = metaBias(champId);
  const global = clamp(
    2.2 + mb * weights.meta + (synergy ?? 0) * 0.42 * weights.synergy + (counter ?? 0) * 0.5 * weights.counter + need,
    1.2,
    3.6,
  );
  const lane = clamp(2.2 + mb * 0.6 * weights.meta + (laneRaw ?? 0) * 0.85 * weights.counter + (ch.early - 3) * 0.12, 1.2, 3.6);
  const winrate = 47.5 + hash01(`wr:${champId}`) * 6 + (counter ?? 0) * 2;
  const masteryLevel = Math.floor(hash01(`ms:${champId}`) * 4);

  return {
    global,
    lane,
    synergy,
    counter,
    laneDelta: laneRaw === null ? null : laneRaw * 3.1,
    mastery: ['Baja', 'Media', 'Alta', 'Muy alta'][masteryLevel],
    winrate,
    synergies,
    counters,
  };
}

export function recommend(i: number, slots: Slots, limit = 40): { id: string; score: number }[] {
  const role = roleOf(i);
  const taken = new Set(slots.filter(Boolean) as string[]);
  return champsForRole(role)
    .filter((c) => !taken.has(c.id))
    .map((c) => ({ id: c.id, score: evalPick(c.id, i, slots).global }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface TeamStats {
  ad: number | null; // 0..1
  early: number | null;
  mid: number | null;
  late: number | null;
}

export function teamStats(slots: Slots, side: Side): TeamStats {
  const from = side === 'blue' ? 0 : 5;
  const champs = slots.slice(from, from + 5).map(champOf).filter(Boolean) as Champion[];
  if (!champs.length) return { ad: null, early: null, mid: null, late: null };
  const mean = (f: (c: Champion) => number) => champs.reduce((a, c) => a + f(c), 0) / champs.length;
  return {
    ad: adShare(champs),
    early: mean((c) => c.early),
    mid: mean((c) => (c.early + c.late) / 2),
    late: mean((c) => c.late),
  };
}

/** Ventaja de `mine` sobre `theirs` en % (-100..100). */
export function advantage(mine: number | null, theirs: number | null): number | null {
  if (mine === null || theirs === null) return null;
  return ((mine - theirs) / 5) * 100;
}

export function laneMatchups(slots: Slots): { role: Role; a: string | null; b: string | null; delta: number | null; blind: boolean }[] {
  return (['top', 'mid', 'adc'] as Role[]).map((role) => {
    const a = slots[idx('blue', role)];
    const b = slots[idx('red', role)];
    const ca = champOf(a);
    const cb = champOf(b);
    return { role, a, b, delta: ca && cb ? counterPair(ca, cb) * 3.1 : null, blind: !ca || !cb };
  });
}

const POOL_BY_ROLE: Record<Role, string[]> = Object.fromEntries(
  ROLES.map((r) => [r, champsForRole(r).map((c) => c.id)]),
) as Record<Role, string[]>;

export function randomDraft(): Slots {
  const used = new Set<string>();
  return Array.from({ length: 10 }, (_, i) => {
    const pool = POOL_BY_ROLE[roleOf(i)].filter((id) => !used.has(id));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    used.add(pick);
    return pick;
  });
}

export const SAMPLE_DRAFT: Slots = [
  'Ornn', 'JarvanIV', 'Orianna', 'Jinx', null,
  'Renekton', 'LeeSin', 'Syndra', 'Caitlyn', 'Nautilus',
];
