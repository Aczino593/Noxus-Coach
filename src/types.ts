export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support';
export const ROLES: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];
export const ROLE_LABEL: Record<Role, string> = {
  top: 'Top',
  jungle: 'Jungla',
  mid: 'Mid',
  adc: 'ADC',
  support: 'Support',
};
export const ROLE_SHORT: Record<Role, string> = {
  top: 'Top',
  jungle: 'Jg',
  mid: 'Mid',
  adc: 'Adc',
  support: 'Supp',
};

export type DmgType = 'AD' | 'AP' | 'MIX';
export type Archetype = 'teamfight' | 'pick' | 'poke' | 'split' | 'protect';
export type Trait =
  | 'heal'
  | 'burst'
  | 'assassin'
  | 'tank'
  | 'engage'
  | 'enchanter'
  | 'hypercarry'
  | 'poke';

export interface Champion {
  id: string; // clave de Data Dragon (p. ej. "KSante")
  name: string;
  roles: Role[];
  dmg: DmgType;
  /** Segundos de control duro encadenable en un combate */
  hardCC: number;
  /** 0-3: cantidad de control suave (ralentizaciones, silencios…) */
  softCC: number;
  /** 1-5 */
  early: number;
  late: number;
  /** 1-5 (5 = muy fácil de ejecutar con calls simples) */
  exec: number;
  arch: Archetype[];
  traits: Trait[];
}

export type Queue = 'solo' | 'flex' | 'quick' | 'clash';

export interface Item {
  id: number;
  name: string;
  tags: string[];
  /** Grupo de pasiva única: dos jugadores con el mismo grupo se solapan */
  group?: string;
}
