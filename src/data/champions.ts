import type { Archetype, Champion, DmgType, Role, Trait } from '../types';

const ARCH: Record<string, Archetype> = {
  tf: 'teamfight',
  pick: 'pick',
  poke: 'poke',
  split: 'split',
  prot: 'protect',
};

function c(
  id: string,
  name: string,
  roles: string,
  dmg: DmgType,
  hardCC: number,
  softCC: number,
  early: number,
  late: number,
  exec: number,
  arch: string,
  traits = '',
): Champion {
  return {
    id,
    name,
    roles: roles.split(',') as Role[],
    dmg,
    hardCC,
    softCC,
    early,
    late,
    exec,
    arch: arch.split(',').map((a) => ARCH[a]),
    traits: traits ? (traits.split(',') as Trait[]) : [],
  };
}

//            id            nombre        roles           dmg   hard soft ear lat exe arch        traits
export const CHAMPIONS: Champion[] = [
  // Top
  c('Aatrox', 'Aatrox', 'top', 'AD', 1.3, 1, 4, 3, 3, 'tf,split', 'heal'),
  c('Camille', 'Camille', 'top', 'AD', 2.5, 1, 3, 4, 2, 'pick,split', 'assassin'),
  c('Ornn', 'Ornn', 'top', 'AD', 2.2, 2, 2, 4, 4, 'tf,prot', 'tank,engage'),
  c('Malphite', 'Malphite', 'top,support', 'AP', 1.5, 2, 2, 3, 5, 'tf,pick', 'tank,engage'),
  c('Jax', 'Jax', 'top', 'AD', 1, 1, 2, 5, 3, 'split', 'hypercarry'),
  c('Fiora', 'Fiora', 'top', 'AD', 0, 1, 4, 4, 2, 'split'),
  c('Renekton', 'Renekton', 'top', 'AD', 1.5, 1, 5, 2, 3, 'pick', 'heal'),
  c('Gnar', 'Gnar', 'top', 'AD', 2, 2, 3, 3, 2, 'tf', 'engage'),
  c('Sion', 'Sion', 'top', 'AD', 2, 2, 2, 4, 4, 'tf,pick', 'tank,engage'),
  c('KSante', "K'Sante", 'top', 'AD', 1.5, 1, 3, 4, 3, 'pick,prot', 'tank'),
  c('Shen', 'Shen', 'top', 'AD', 1.5, 1, 3, 3, 4, 'prot,pick', 'tank'),
  c('Gwen', 'Gwen', 'top', 'AP', 0, 2, 3, 5, 3, 'split', 'heal'),
  c('Darius', 'Darius', 'top', 'AD', 1, 2, 5, 2, 4, 'pick', 'heal'),
  c('Garen', 'Garen', 'top', 'AD', 1.5, 1, 4, 3, 5, 'split,tf', 'tank,heal'),
  c('Jayce', 'Jayce', 'top,mid', 'AD', 1, 1, 5, 2, 2, 'poke', 'poke,burst'),
  c('Poppy', 'Poppy', 'top,jungle,support', 'AD', 1.5, 1, 3, 3, 4, 'prot,pick', 'tank'),

  // Jungla
  c('LeeSin', 'Lee Sin', 'jungle', 'AD', 1, 1, 5, 2, 2, 'pick', 'assassin'),
  c('Vi', 'Vi', 'jungle', 'AD', 2, 1, 3, 3, 4, 'pick,tf', 'engage'),
  c('Sejuani', 'Sejuani', 'jungle', 'AP', 2.5, 3, 3, 3, 4, 'tf,pick', 'tank,engage'),
  c('Zac', 'Zac', 'jungle', 'AP', 2.5, 2, 3, 4, 3, 'tf,pick', 'tank,engage'),
  c('Viego', 'Viego', 'jungle', 'AD', 0.5, 1, 3, 4, 3, 'tf,split', 'heal'),
  c('Nocturne', 'Nocturne', 'jungle', 'AD', 1.5, 1, 4, 4, 4, 'pick,split', 'assassin'),
  c('Amumu', 'Amumu', 'jungle', 'AP', 3.5, 2, 3, 3, 5, 'tf', 'tank,engage'),
  c('Nidalee', 'Nidalee', 'jungle', 'AP', 0, 1, 4, 2, 1, 'poke,pick', 'poke,burst'),
  c('Hecarim', 'Hecarim', 'jungle', 'AD', 1.2, 2, 3, 4, 4, 'tf,pick', 'engage'),
  c('Rammus', 'Rammus', 'jungle', 'AP', 2, 2, 3, 2, 5, 'pick', 'tank,engage'),
  c('JarvanIV', 'Jarvan IV', 'jungle', 'AD', 2.5, 1, 4, 3, 4, 'tf,pick', 'engage'),
  c('XinZhao', 'Xin Zhao', 'jungle', 'AD', 1, 1, 4, 2, 4, 'pick'),
  c('Warwick', 'Warwick', 'jungle', 'AD', 1.5, 1, 4, 3, 4, 'pick', 'heal'),
  c('Elise', 'Elise', 'jungle', 'AP', 1.5, 1, 5, 2, 3, 'pick', 'assassin,burst'),
  c('Maokai', 'Maokai', 'jungle,support,top', 'AP', 2.5, 3, 3, 4, 5, 'tf,prot,pick', 'tank,engage'),

  // Mid
  c('Ahri', 'Ahri', 'mid', 'AP', 1.5, 1, 3, 3, 4, 'pick,tf', 'burst'),
  c('Orianna', 'Orianna', 'mid', 'AP', 1, 2, 3, 4, 4, 'tf', 'poke'),
  c('Syndra', 'Syndra', 'mid', 'AP', 1.5, 1, 2, 4, 3, 'pick,poke,tf', 'burst'),
  c('Azir', 'Azir', 'mid', 'AP', 1.5, 1, 2, 5, 1, 'tf,poke', 'hypercarry'),
  c('Viktor', 'Viktor', 'mid', 'AP', 1, 2, 2, 5, 4, 'tf,poke', 'hypercarry'),
  c('Corki', 'Corki', 'mid', 'MIX', 0, 1, 3, 4, 4, 'poke', 'poke'),
  c('Sylas', 'Sylas', 'mid', 'AP', 1, 1, 3, 4, 2, 'pick,tf', 'heal'),
  c('Yone', 'Yone', 'mid,top', 'AD', 1.5, 2, 3, 5, 3, 'tf,split', 'hypercarry,assassin,burst'),
  c('Yasuo', 'Yasuo', 'mid,top', 'AD', 1.5, 2, 3, 5, 2, 'tf,split', 'hypercarry'),
  c('Zed', 'Zed', 'mid', 'AD', 0, 2, 4, 3, 2, 'pick', 'assassin,burst'),
  c('Akali', 'Akali', 'mid,top', 'AP', 0, 2, 4, 3, 2, 'pick', 'assassin,burst'),
  c('Vex', 'Vex', 'mid', 'AP', 1.5, 1, 3, 4, 3, 'pick,tf', 'burst'),
  c('Taliyah', 'Taliyah', 'mid,jungle', 'AP', 1.5, 2, 3, 3, 3, 'pick,tf', 'poke'),
  c('Anivia', 'Anivia', 'mid', 'AP', 1, 2, 2, 4, 3, 'poke,tf', 'poke'),
  c('Ryze', 'Ryze', 'mid,top', 'AP', 1, 2, 2, 5, 2, 'tf,split', 'hypercarry'),
  c('Lissandra', 'Lissandra', 'mid', 'AP', 2.5, 2, 3, 3, 4, 'pick,tf', 'engage'),
  c('Cassiopeia', 'Cassiopeia', 'mid', 'AP', 2, 2, 2, 5, 3, 'tf', 'hypercarry,heal'),
  c('Veigar', 'Veigar', 'mid,support', 'AP', 1.5, 0, 2, 5, 4, 'poke,pick', 'burst'),

  // ADC
  c('Jinx', 'Jinx', 'adc', 'AD', 0, 2, 2, 5, 4, 'tf,prot', 'hypercarry'),
  c('Kaisa', "Kai'Sa", 'adc', 'MIX', 0, 1, 3, 4, 3, 'tf,pick', 'burst'),
  c('Ezreal', 'Ezreal', 'adc', 'MIX', 0, 1, 3, 3, 3, 'poke', 'poke'),
  c('Jhin', 'Jhin', 'adc', 'AD', 0, 2, 3, 4, 4, 'pick,poke', 'poke'),
  c('Ashe', 'Ashe', 'adc,support', 'AD', 3, 3, 3, 3, 5, 'pick,poke,tf', 'poke'),
  c('Caitlyn', 'Caitlyn', 'adc', 'AD', 1.5, 3, 4, 3, 4, 'poke,pick', 'poke'),
  c('Vayne', 'Vayne', 'adc,top', 'AD', 1, 1, 2, 5, 2, 'split,tf', 'hypercarry'),
  c('Xayah', 'Xayah', 'adc', 'AD', 1.25, 1, 3, 4, 3, 'tf,prot', 'hypercarry'),
  c('Varus', 'Varus', 'adc,mid', 'AD', 2, 2, 3, 3, 3, 'poke,tf,pick', 'poke'),
  c('Tristana', 'Tristana', 'adc', 'AD', 1, 1, 3, 5, 4, 'tf', 'hypercarry'),
  c('Lucian', 'Lucian', 'adc,mid', 'AD', 0, 1, 5, 3, 3, 'pick', 'burst'),
  c('Zeri', 'Zeri', 'adc', 'AD', 0, 2, 2, 5, 2, 'prot,tf', 'hypercarry'),
  c('MissFortune', 'Miss Fortune', 'adc', 'AD', 0, 2, 3, 4, 5, 'tf,poke', 'poke'),
  c('Kalista', 'Kalista', 'adc', 'AD', 1, 1, 4, 3, 2, 'pick'),
  c('Aphelios', 'Aphelios', 'adc', 'AD', 1.5, 2, 2, 4, 2, 'tf,prot', 'hypercarry'),
  c('Draven', 'Draven', 'adc', 'AD', 1, 1, 5, 3, 3, 'pick', 'burst'),
  c('Samira', 'Samira', 'adc', 'AD', 0, 1, 4, 4, 2, 'tf,pick', 'burst'),
  c('KogMaw', "Kog'Maw", 'adc', 'AD', 0, 2, 2, 5, 4, 'tf,prot', 'hypercarry'),

  // Support
  c('Thresh', 'Thresh', 'support', 'MIX', 1.5, 1, 3, 3, 2, 'pick,prot', 'engage'),
  c('Blitzcrank', 'Blitzcrank', 'support', 'AP', 2.5, 1, 4, 2, 4, 'pick', 'tank,engage'),
  c('Nautilus', 'Nautilus', 'support', 'AP', 2.5, 2, 4, 3, 4, 'pick,tf', 'tank,engage'),
  c('Leona', 'Leona', 'support', 'AP', 3, 1, 4, 3, 4, 'pick,tf', 'tank,engage'),
  c('Lulu', 'Lulu', 'support', 'AP', 1.5, 2, 2, 4, 4, 'prot', 'enchanter'),
  c('Karma', 'Karma', 'support,mid', 'AP', 1.5, 2, 3, 3, 4, 'poke,prot', 'enchanter,poke'),
  c('Alistar', 'Alistar', 'support', 'AP', 2.5, 1, 3, 3, 4, 'tf,pick', 'tank,engage'),
  c('Rakan', 'Rakan', 'support', 'AP', 2, 1, 4, 3, 3, 'tf,pick', 'engage'),
  c('Braum', 'Braum', 'support', 'AD', 2, 2, 3, 3, 4, 'prot', 'tank'),
  c('Rell', 'Rell', 'support', 'AP', 3, 1, 3, 4, 3, 'tf,pick', 'tank,engage'),
  c('Renata', 'Renata Glasc', 'support', 'AP', 2, 1, 2, 4, 3, 'prot,tf', 'enchanter'),
  c('Janna', 'Janna', 'support', 'AP', 1, 2, 2, 3, 5, 'prot,poke', 'enchanter'),
  c('Soraka', 'Soraka', 'support', 'AP', 1.5, 1, 2, 4, 5, 'prot', 'enchanter,heal'),
  c('Nami', 'Nami', 'support', 'AP', 1.5, 2, 3, 3, 4, 'prot,tf', 'enchanter'),
  c('Milio', 'Milio', 'support', 'AP', 1, 1, 2, 4, 4, 'prot', 'enchanter'),
  c('Pyke', 'Pyke', 'support', 'AD', 1, 1, 4, 2, 2, 'pick', 'assassin'),
  c('Bard', 'Bard', 'support', 'AP', 1.5, 1, 2, 3, 2, 'pick'),
  c('Lux', 'Lux', 'support,mid', 'AP', 2, 2, 3, 3, 4, 'poke,pick', 'burst,poke'),
  c('Zyra', 'Zyra', 'support', 'AP', 1.5, 2, 3, 3, 4, 'poke,tf', 'poke'),
  c('Morgana', 'Morgana', 'support,mid', 'AP', 2.5, 1, 3, 3, 5, 'pick,prot', 'tank'),
];

export const CHAMP_BY_ID: Record<string, Champion> = Object.fromEntries(
  CHAMPIONS.map((ch) => [ch.id, ch]),
);

export function champ(id: string): Champion {
  const found = CHAMP_BY_ID[id];
  if (!found) throw new Error(`Campeón desconocido: ${id}`);
  return found;
}

export function champsForRole(role: Role): Champion[] {
  return CHAMPIONS.filter((ch) => ch.roles.includes(role));
}
