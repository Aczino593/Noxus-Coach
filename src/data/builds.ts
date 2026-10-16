import type { Role } from '../types';

export type Skill = 'Q' | 'W' | 'E';
export type TreeId = 'precision' | 'domination' | 'sorcery' | 'resolve' | 'inspiration';

export const TREES: Record<TreeId, { label: string; color: string; icon: string }> = {
  precision: { label: 'Precisión', color: '#c8aa6e', icon: 'Styles/7201_Precision.png' },
  domination: { label: 'Dominación', color: '#ff4d63', icon: 'Styles/7200_Domination.png' },
  sorcery: { label: 'Brujería', color: '#9aa7ff', icon: 'Styles/7202_Sorcery.png' },
  resolve: { label: 'Valor', color: '#4cc38a', icon: 'Styles/7204_Resolve.png' },
  inspiration: { label: 'Inspiración', color: '#49d0d6', icon: 'Styles/7203_Whimsy.png' },
};

export interface Keystone {
  name: string;
  path: string;
}

export interface RuneSetup {
  primary: { tree: TreeId; keystone: Keystone; slots: string[] };
  secondary: { tree: TreeId; slots: string[] };
  shards: string[];
}

export interface BuildData {
  label: string;
  first3: Skill[];
  priority: Skill[];
  runes: RuneSetup;
  start: number[];
  firstBack?: number[];
  boots: number;
  core: number[];
  spells: string[];
}

export const KS = {
  conqueror: { name: 'Conquistador', path: 'Styles/Precision/Conqueror/Conqueror.png' },
  electrocute: { name: 'Electrocutar', path: 'Styles/Domination/Electrocute/Electrocute.png' },
  comet: { name: 'Cometa Arcano', path: 'Styles/Sorcery/ArcaneComet/ArcaneComet.png' },
  lethal: { name: 'Ritmo Letal', path: 'Styles/Precision/LethalTempo/LethalTempoTemp.png' },
  aftershock: { name: 'Réplica', path: 'Styles/Resolve/VeteranAftershock/VeteranAftershock.png' },
  grasp: { name: 'Garra del Inmortal', path: 'Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png' },
  glacial: { name: 'Aumento Glacial', path: 'Styles/Inspiration/GlacialAugment/GlacialAugment.png' },
  guardian: { name: 'Guardián', path: 'Styles/Resolve/Guardian/Guardian.png' },
  summonAery: { name: 'Invocar a Aery', path: 'Styles/Sorcery/SummonAery/SummonAery.png' },
  pressTheAttack: { name: 'Ataque intensificado', path: 'Styles/Precision/PressTheAttack/PressTheAttack.png' },
  fleetFootwork: { name: 'Pies veloces', path: 'Styles/Precision/FleetFootwork/FleetFootwork.png' },
  darkHarvest: { name: 'Cosecha oscura', path: 'Styles/Domination/DarkHarvest/DarkHarvest.png' },
  hailOfBlades: { name: 'Lluvia de cuchillas', path: 'Styles/Domination/HailOfBlades/HailOfBlades.png' },
  phaseRush: { name: 'Irrupción de fase', path: 'Styles/Sorcery/PhaseRush/PhaseRush.png' },
  firstStrike: { name: 'Primer golpe', path: 'Styles/Inspiration/FirstStrike/FirstStrike.png' },
};

export const ADAPT = 'Fuerza Adaptable';

export type TemplateId = 'bruiser' | 'mage' | 'marksman' | 'tank' | 'enchanter' | 'engage';

export const TEMPLATES: Record<TemplateId, BuildData> = {
  bruiser: {
    label: 'Bruiser / Duelista',
    first3: ['Q', 'W', 'E'],
    priority: ['Q', 'E', 'W'],
    runes: {
      primary: { tree: 'precision', keystone: KS.conqueror, slots: ['Triunfo', 'Leyenda: Tenacidad', 'Último Esfuerzo'] },
      secondary: { tree: 'resolve', slots: ['Hueso Blindado', 'Revitalizar'] },
      shards: [ADAPT, ADAPT, 'Vida Escalable'],
    },
    start: [1055, 2003],
    boots: 3047,
    core: [3078, 3053],
    spells: ['SummonerFlash', 'SummonerTeleport'],
  },
  mage: {
    label: 'Mago de daño',
    first3: ['Q', 'W', 'E'],
    priority: ['Q', 'W', 'E'],
    runes: {
      primary: { tree: 'sorcery', keystone: KS.comet, slots: ['Manto de Nimbus', 'Transcendencia', 'Tormenta Creciente'] },
      secondary: { tree: 'domination', slots: ['Golpe Repentino', 'Cazador Ingenioso'] },
      shards: [ADAPT, ADAPT, 'Vida Escalable'],
    },
    start: [1056, 2003],
    boots: 3020,
    core: [6655, 4645],
    spells: ['SummonerFlash', 'SummonerDot'],
  },
  marksman: {
    label: 'Tirador (ADC)',
    first3: ['Q', 'W', 'E'],
    priority: ['Q', 'W', 'E'],
    runes: {
      primary: { tree: 'precision', keystone: KS.lethal, slots: ['Presencia de Ánimo', 'Leyenda: Alacridad', 'Golpe de Gracia'] },
      secondary: { tree: 'domination', slots: ['Sabor a Sangre', 'Cazador Codicioso'] },
      shards: ['Velocidad de Ataque', ADAPT, 'Vida Escalable'],
    },
    start: [1055, 2003],
    boots: 3006,
    core: [6672, 3046, 3031],
    spells: ['SummonerFlash', 'SummonerHeal'],
  },
  tank: {
    label: 'Tanque / Frontline',
    first3: ['Q', 'W', 'E'],
    priority: ['Q', 'E', 'W'],
    runes: {
      primary: { tree: 'resolve', keystone: KS.grasp, slots: ['Condicionamiento', 'Crecimiento Excesivo', 'Revitalizar'] },
      secondary: { tree: 'inspiration', slots: ['Botas Mágicas', 'Entrega de Galletas'] },
      shards: ['Vida Escalable', 'Vida Escalable', 'Resistencia a CC'],
    },
    start: [1054, 2003],
    boots: 3047,
    core: [3068, 3193],
    spells: ['SummonerFlash', 'SummonerTeleport'],
  },
  enchanter: {
    label: 'Enchanter / Utilidad',
    first3: ['W', 'Q', 'E'],
    priority: ['E', 'W', 'Q'],
    runes: {
      primary: { tree: 'sorcery', keystone: KS.summonAery, slots: ['Manto de Nimbus', 'Transcendencia', 'Tormenta Creciente'] },
      secondary: { tree: 'inspiration', slots: ['Botas Mágicas', 'Entrega de Galletas'] },
      shards: ['Velocidad de Habilidad', ADAPT, 'Vida Escalable'],
    },
    start: [3865, 2003],
    boots: 3158,
    core: [2065, 3190],
    spells: ['SummonerFlash', 'SummonerHeal'],
  },
  engage: {
    label: 'Engage / Pick',
    first3: ['Q', 'W', 'E'],
    priority: ['Q', 'W', 'E'],
    runes: {
      primary: { tree: 'resolve', keystone: KS.aftershock, slots: ['Condicionamiento', 'Hueso Blindado', 'Revitalizar'] },
      secondary: { tree: 'inspiration', slots: ['Botas Mágicas', 'Entrega de Galletas'] },
      shards: ['Resistencia a CC', 'Vida Escalable', 'Vida Escalable'],
    },
    start: [3865, 2003],
    boots: 3111,
    core: [3190, 3109],
    spells: ['SummonerFlash', 'SummonerExhaust'],
  },
};

/**
 * Ítems que completan la ruta de 6 cuando el core del campeón tiene menos de 6.
 * El motor (buildEngine) los mezcla con las adaptaciones al matchup.
 */
export const TEMPLATE_TAILS: Record<TemplateId, number[]> = {
  bruiser: [3071, 6333, 3053, 3156, 3026],
  mage: [3089, 3157, 3135, 6653, 3102],
  marksman: [3036, 3033, 3026, 3072, 3094],
  tank: [3083, 3143, 3065, 6665, 3075],
  enchanter: [3107, 3222, 3050, 3157, 3102],
  engage: [3107, 3222, 3050, 3742, 3193],
};

/** Builds específicas que sobreescriben la plantilla. */
export const BUILD_OVERRIDES: Record<string, Partial<BuildData> & { template: TemplateId }> = {
  Ahri: {
    template: 'mage',
    label: 'Mago de asesinato y control (burst)',
    first3: ['Q', 'W', 'E'],
    priority: ['Q', 'W', 'E'],
    runes: {
      primary: {
        tree: 'domination',
        keystone: KS.electrocute,
        slots: ['Impacto repentino', 'Colección de globos oculares', 'Cazador definitivo'],
      },
      secondary: {
        tree: 'sorcery',
        slots: ['Banda de maná', 'Trascendencia'],
      },
      shards: [ADAPT, ADAPT, 'Vida Escalable'],
    },
    start: [1056, 2003, 2003, 3340],
    firstBack: [3802, 1001],
    boots: 3020,
    core: [3118, 3020, 4645, 3157, 3089, 3135],
    spells: ['SummonerFlash', 'SummonerDot'],
  },
  Aatrox: {
    template: 'bruiser',
    first3: ['Q', 'E', 'W'],
    priority: ['Q', 'E', 'W'],
    core: [6609, 6333],
    boots: 3047,
  },
  Jinx: { template: 'marksman', first3: ['Q', 'W', 'E'], priority: ['Q', 'W', 'E'] },
  KogMaw: {
    template: 'marksman',
    label: "On-hit hipercarry (Kog'Maw)",
    first3: ['W', 'Q', 'E'],
    priority: ['W', 'Q', 'E'],
    boots: 3006,
    // Ruta completa de 6 ítems por power spike
    core: [3153, 3124, 3033, 3085, 3302, 3026],
  },
  LeeSin: {
    template: 'bruiser',
    label: 'Jungla de pick',
    first3: ['Q', 'W', 'E'],
    priority: ['Q', 'W', 'E'],
    start: [1101, 2031],
    spells: ['SummonerFlash', 'SummonerSmite'],
    core: [6609, 3053],
  },
  Thresh: {
    template: 'engage',
    first3: ['Q', 'E', 'W'],
    priority: ['Q', 'W', 'E'],
    core: [3190, 3109],
    boots: 3047,
    spells: ['SummonerFlash', 'SummonerExhaust'],
  },
  Orianna: { template: 'mage', first3: ['Q', 'W', 'E'], priority: ['Q', 'W', 'E'], core: [6655, 3003, 3157] },
  Ornn: { template: 'tank', first3: ['W', 'Q', 'E'], priority: ['W', 'Q', 'E'], core: [3068, 3001, 3742] },
  JarvanIV: { template: 'bruiser', first3: ['E', 'Q', 'W'], priority: ['Q', 'E', 'W'], start: [1101, 2031], spells: ['SummonerFlash', 'SummonerSmite'], core: [3071, 6333] },
  Rakan: { template: 'engage', first3: ['W', 'Q', 'E'], priority: ['W', 'E', 'Q'], core: [2065, 3190], boots: 3158 },
};

export const SKILL_COLOR: Record<Skill | 'R', string> = {
  Q: '#4c8dff',
  W: '#4cc38a',
  E: '#e0a96d',
  R: '#ff2e4d',
};

export function roleToLane(role: Role): string {
  return { top: 'Línea superior', jungle: 'Jungla', mid: 'Línea central', adc: 'Línea inferior', support: 'Apoyo' }[role];
}
