import type { Archetype } from '../types';

export interface ArchetypeInfo {
  id: Archetype;
  name: string;
  short: string;
  desc: string;
  icon: 'users' | 'target' | 'compass' | 'swap' | 'shield';
  /** Curva ideal (0-100) en [0,5,10,15,20,25,30,35,40] min */
  curve: number[];
  needs: string[];
}

export const ARCHETYPES: ArchetypeInfo[] = [
  {
    id: 'teamfight', name: 'Teamfight / Wombo Combo', short: 'Teamfight',
    desc: 'Pelea 5v5 en objetivos con habilidades de área encadenadas.',
    icon: 'users', curve: [35, 42, 52, 66, 80, 88, 92, 94, 95],
    needs: ['2+ engages de área', 'Cadena de CC ≥ 6 s', 'Frontline + AoE'],
  },
  {
    id: 'pick', name: 'Pick / Engage', short: 'Pick',
    desc: 'Atrapa un objetivo aislado y convierte la ventaja en objetivos.',
    icon: 'target', curve: [55, 68, 80, 86, 84, 78, 72, 68, 64],
    needs: ['3+ campeones de pick', 'CC duro de bajo cooldown', 'Visión y rotaciones'],
  },
  {
    id: 'poke', name: 'Poke / Asedio', short: 'Poke',
    desc: 'Desgasta con rango y asedia torres antes del engage rival.',
    icon: 'compass', curve: [45, 58, 72, 82, 86, 84, 78, 72, 68],
    needs: ['2+ pokers de largo alcance', 'Disengage / peel', 'Control de oleadas'],
  },
  {
    id: 'split', name: 'Split-push 1-3-1', short: 'Split 1-3-1',
    desc: 'Un duelista presiona un carril mientras 3 contestan objetivos.',
    icon: 'swap', curve: [40, 48, 58, 68, 78, 86, 92, 95, 96],
    needs: ['1 splitter con TP', 'Waveclear fuerte', 'Comunicación de presión'],
  },
  {
    id: 'protect', name: 'Hypercarry Protect', short: 'Protect',
    desc: 'Un carry de escalado protegido por utilidad y frontline.',
    icon: 'shield', curve: [28, 36, 48, 62, 78, 90, 97, 99, 100],
    needs: ['1 hypercarry', 'Enchanter o peel duro', 'Tanque con CC'],
  },
];

export const ARCH_BY_ID = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a])) as Record<Archetype, ArchetypeInfo>;

export const CLASH_INFO = {
  cup: 'Clash · Copa de Noxus',
  day: 'Día 2',
  round: 'Cuartos de final',
  tier: 'Tier II',
  team: 'Heraldos de Hierro',
  /** Segundos hasta la selección de campeones (demo) */
  champSelectIn: 4 * 60 + 32,
};

export interface PoolEntry {
  champ: string;
  games: number;
  wr: number;
  mastery: 'M7' | 'M6' | 'M5' | 'M4';
  points: string;
  rawPoints?: number;
}

export interface ScoutPlayer {
  role: 'top' | 'jungle' | 'mid' | 'adc' | 'support';
  name: string;
  tag: string;
  rank: string;
  puuid?: string;
  pool: PoolEntry[];
  isLive?: boolean;
}

export const SAMPLE_ENEMY: ScoutPlayer[] = [
  {
    role: 'top', name: 'Brisaroja', tag: 'LAS', rank: 'Oro II',
    pool: [
      { champ: 'Renekton', games: 62, wr: 58, mastery: 'M7', points: '480k' },
      { champ: 'Darius', games: 14, wr: 50, mastery: 'M5', points: '96k' },
      { champ: 'Fiora', games: 9, wr: 44, mastery: 'M4', points: '41k' },
    ],
  },
  {
    role: 'jungle', name: 'Cazalobos', tag: 'NOX', rank: 'Oro III',
    pool: [
      { champ: 'Viego', games: 38, wr: 53, mastery: 'M6', points: '210k' },
      { champ: 'Nocturne', games: 22, wr: 55, mastery: 'M6', points: '168k' },
      { champ: 'LeeSin', games: 17, wr: 47, mastery: 'M5', points: '120k' },
    ],
  },
  {
    role: 'mid', name: 'YoneEsMiVida', tag: '6969', rank: 'Platino IV',
    pool: [
      { champ: 'Yone', games: 118, wr: 61, mastery: 'M7', points: '912k' },
      { champ: 'Akali', games: 19, wr: 47, mastery: 'M5', points: '88k' },
      { champ: 'Sylas', games: 11, wr: 45, mastery: 'M4', points: '40k' },
    ],
  },
  {
    role: 'adc', name: 'Piltover99', tag: 'CAIT', rank: 'Oro I',
    pool: [
      { champ: 'Caitlyn', games: 71, wr: 56, mastery: 'M7', points: '603k' },
      { champ: 'Jhin', games: 24, wr: 52, mastery: 'M6', points: '175k' },
      { champ: 'Ashe', games: 13, wr: 46, mastery: 'M5', points: '77k' },
    ],
  },
  {
    role: 'support', name: 'MareaNegra', tag: 'SUP', rank: 'Oro II',
    pool: [
      { champ: 'Nautilus', games: 44, wr: 54, mastery: 'M7', points: '340k' },
      { champ: 'Thresh', games: 31, wr: 51, mastery: 'M6', points: '256k' },
      { champ: 'Leona', games: 20, wr: 50, mastery: 'M5', points: '142k' },
    ],
  },
];

/** Equipo propio por defecto (Teamfight) */
export const DEFAULT_TEAM: (string | null)[] = ['Ornn', 'JarvanIV', 'Orianna', 'Jinx', 'Rakan'];

/** Objetos de equipo iniciales (con solapamientos a propósito para mostrar el detector) */
export const DEFAULT_UTILITY: number[][] = [
  [3075, 3110], // Ornn: Cota de Espinas (anti-curación) + Corazón Helado
  [6609, 3053], // Jarvan: Chempunk (anti-curación) + Sterak
  [3165, 3107], // Orianna: Morellonomicón (anti-curación) + Redención
  [3033, 3026], // Jinx: Recordatorio Mortal (anti-curación) + Ángel Guardián
  [2065, 3107], // Rakan: Shurelya + Redención (solapa con Orianna)
];
