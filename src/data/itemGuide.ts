import { itemGold } from '../lib/assets';

/**
 * Guía pedagógica por ítem para la ruta secuencial de 6 objetos.
 *  - role: función del ítem dentro de la ruta (alimenta la etiqueta "2º Spike - Velocidad/Daño").
 *    Si empieza por "Defensa" se considera un ítem defensivo situacional.
 *  - cost: coste total de respaldo (offline). El valor real lo resuelve Data Dragon vía itemGold().
 *  - why: por qué comprarlo, en lenguaje simple para jugadores principiantes.
 */
export interface ItemGuideEntry {
  role: string;
  cost: number;
  why: string;
}

const g = (role: string, cost: number, why: string): ItemGuideEntry => ({ role, cost, why });

export const ITEM_GUIDE: Record<number, ItemGuideEntry> = {
  // ── Tiradores / on-hit ──
  3153: g('Núcleo', 3200, 'Te da robo de vida y ralentiza para que no te alcancen: cada golpe quita un % de la vida actual del rival.'),
  3124: g('Velocidad/Daño', 3000, 'Tus ataques se aceleran con cada golpe y añaden daño mágico: pegas muchísimo más rápido en las peleas largas.'),
  3033: g('Penetración + Anti-curación', 3000, 'Ignora parte de la armadura y reduce las curaciones rivales: ideal contra tanques y rivales que se curan.'),
  3085: g('Daño en área', 2600, 'Lanza flechas extra a los enemigos cercanos: más daño en peleas de equipo y oleadas limpiadas más rápido.'),
  3302: g('Penetración', 3000, 'Cada golpe le resta armadura y resistencia mágica al rival: todo tu equipo le pega más fuerte.'),
  3026: g('Defensa situacional', 3200, 'Si mueres, revives unos segundos después: te da una segunda oportunidad en la pelea decisiva.'),
  6672: g('Núcleo', 3100, 'Cada tercer ataque hace daño extra: sube tu daño contra campeones desde el primer ítem.'),
  3046: g('Velocidad/Daño', 2600, 'Más velocidad de ataque y de movimiento: puedes pegar y retroceder sin que te atrapen.'),
  3031: g('Daño crítico', 3400, 'Convierte tus críticos en mucho más daño: tu ítem de daño puro cuando ya vas adelante.'),
  3036: g('Penetración', 3000, 'Más daño contra rivales con mucha vida y armadura: te sirve cuando aparecen tanques.'),
  3072: g('Sustain', 3400, 'Robo de vida alto y un escudo: aguantas más peleas sin volver a base.'),
  3094: g('Velocidad/Daño', 2600, 'Más velocidad de ataque y alcance extra en tus golpes cargados: pegas desde más lejos.'),
  3814: g('Defensa situacional', 2800, 'Un escudo que bloquea la primera habilidad que te pega: te protege del control enemigo.'),
  6673: g('Defensa situacional', 3200, 'Escudo de vida cuando te bajan de golpe: sobrevives al daño explosivo.'),

  // ── Bruisers / duelistas ──
  3078: g('Núcleo', 3333, 'Mezcla de daño, vida y velocidad: tu primer ítem para ganar peleas cuerpo a cuerpo.'),
  3053: g('Aguante en pelea', 3100, 'Te da un escudo al bajar de vida: sobrevives al daño explosivo y sigues peleando.'),
  6609: g('Núcleo + Anti-curación', 3000, 'Daño sólido, ralentiza y reduce curaciones: muy fuerte contra rivales que se sostienen.'),
  6333: g('Aguante en pelea', 3300, 'Parte del daño que recibes se retrasa en el tiempo: aguantas mucho más en peleas largas.'),
  3071: g('Penetración', 3000, 'Rompe la armadura enemiga con cada golpe: perfecto contra tanques y frontlines.'),
  3156: g('Defensa situacional', 3100, 'Resistencia mágica y un escudo al bajar de vida: te salva del daño mágico explosivo.'),
  6694: g('Penetración', 3200, 'Ignora armadura y ralentiza al rival: ideal para asesinos que necesitan alcanzar a su objetivo.'),

  // ── Iniciales / Primer Back ──
  1056: g('Inicial', 400, 'Anillo de Doran: Maná al matar súbditos y vida extra para sobrevivir la presión temprana en línea.'),
  2003: g('Consumible', 50, 'Poción de Vida: Regeneración para soportar los intercambios tempranos de habilidades.'),
  3340: g('Visión', 0, 'Tótem Guardián: Visión gratuita para prevenir el primer gank del jungla rival.'),
  3802: g('Primer Back', 1200, 'Capítulo Perdido: Restaura maná al subir de nivel y te permite pokear con Q sin quedarte seco.'),
  1001: g('Primer Back', 300, 'Botas básicas: Velocidad de movimiento indispensable para esquivar habilidades de largo alcance.'),
  3020: g('Penetración mágica temprana', 1100, 'Botas de Hechicero: Penetración mágica plana para maximizar tu daño antes de que el rival compre resistencia.'),

  // ── Magos ──
  3118: g('1er Power Spike crítico', 2700, 'Malicia: Daño en área con tu definitiva (R) y aceleración de habilidad. Tu primer gran pico de poder.'),
  4645: g('2do Power Spike masivo', 3200, 'Llama Sombría: Críticos mágicos contra objetivos con menos del 35% de vida o protegidos por escudos.'),
  3100: g('Burst ofensivo', 3200, 'Perdición del Liche: Daño explosivo al combinar habilidades con auto-ataque para ejecutar objetivos frágiles.'),
  3089: g('Poder de habilidad masivo', 3600, 'Sombrero Mortal de Rabadon: Multiplica tu poder de habilidad en un 35%: escala tu daño para el juego tardío.'),
  3135: g('Penetración', 3000, 'Báculo del Vacío: Atraviesa el 40% de la resistencia mágica enemiga cuando compran resistencias.'),
  3137: g('Penetración + Cura de equipo', 2850, 'Criptoflora: Penetración porcentual que emite una nova curativa para tus aliados tras una baja.'),
  6655: g('Núcleo', 3000, 'Compañero de Luden: Daño explosivo con tus habilidades y maná: alternativa de burst.'),
  6653: g('Daño continuo', 3200, 'Tormento de Liandry: Quema un % de la vida del rival con el tiempo: excelente contra tanques.'),
  3003: g('Escalado', 2600, 'Bastón del Arcángel: Más maná y escudo que crece con el tiempo para magos de spam.'),
  3157: g('Defensa situacional', 3250, 'Reloj de Arena de Zhonya: Te vuelve invulnerable 2.5s: anula la definitiva enemiga y te permite reposicionar.'),
  3102: g('Defensa situacional', 3000, 'Velo de la Banshee: Escudo que bloquea la siguiente habilidad: te protege del daño mágico y del poke.'),
  3165: g('Anti-curación', 2200, 'Morellonomicón: Reduce curaciones rivales: tu corta-curas indispensable contra composiciones de sustain.'),
  6656: g('Penetración', 2850, 'Criptofloración: Penetración mágica y curación para aliados.'),
  3152: g('Daño', 2600, 'Cinturón Cohete Hextech: Activación de movimiento y daño explosivo.'),
  4629: g('Escalado', 3000, 'Impulso Cósmico: Velocidad de movimiento y aceleración para rotar combos con fluidez.'),
  3042: g('Escalado', 2900, 'Muramana: Daño físico y maná para builds híbridas.'),

  // ── Tanques / frontline ──
  3068: g('Núcleo', 3200, 'Te da vida y daño continuo en área: aguantas en primera línea y castigas a quien te rodea.'),
  3193: g('Defensa situacional', 3200, 'Mucha armadura y resistencia mágica al activarla: te protege durante las peleas.'),
  3001: g('Utilidad de equipo', 2700, 'Baja la resistencia mágica de los rivales cercanos: todo tu equipo AP les pega más.'),
  3742: g('Engage', 2900, 'Te da velocidad al entrar y empuja a quien golpeas: iniciar la pelea es mucho más fácil.'),
  3083: g('Aguante', 3000, 'Montañas de vida que se regeneran: aguantas el daño mientras tu equipo pega.'),
  3143: g('Defensa situacional', 2700, 'Ralentiza a quien te golpea y reduce críticos: ideal contra tiradores.'),
  6665: g('Aguante', 3200, 'Vida y resistencias que crecen en la pelea: tu tanque aguanta cada vez más.'),
  3075: g('Anti-curación', 2700, 'Devuelve daño a quien te ataca y reduce curas: te vuelve un muro contra auto-ataques.'),
  3065: g('Defensa situacional', 2900, 'Aumenta curas y escudos que recibes y da resistencia mágica: aguanta al equipo AP.'),
  4401: g('Defensa situacional', 2900, 'Resistencia mágica alta y escudo: te vuelve casi inmune a magos enemigos.'),
  3110: g('Defensa situacional', 2500, 'Ralentiza a los que te pegan y da armadura: frena a los auto-ataques rivales.'),

  // ── Utilidad / support ──
  2065: g('Utilidad de equipo', 2200, 'Da velocidad a todo tu equipo al activarla: sirve para entrar o huir de la pelea.'),
  3190: g('Utilidad de equipo', 2200, 'Escudo de equipo al activarla: protege a tus aliados del daño explosivo.'),
  3109: g('Utilidad de equipo', 2300, 'Te vincula con tu carry y le reduce el daño que recibe: lo mantiene vivo en las peleas.'),
  3107: g('Utilidad de equipo', 2300, 'Cura en un área al activarla: salva peleas de equipo si tus aliados pelean juntos.'),
  3222: g('Utilidad de equipo', 2300, 'Limpia el control de un aliado: lo libera de aturdimientos en el momento clave.'),
  3050: g('Utilidad de equipo', 2200, 'Mejora a un aliado con bonificaciones de combate: funciona de maravilla con engages.'),

  // ── Componentes baratos (adaptaciones de línea) ──
  3123: g('Anti-curación', 800, 'Reduce las curaciones del rival y se convierte luego en Recordatorio Mortal.'),
  3916: g('Anti-curación', 800, 'Reduce las curaciones del rival y te sirve de base para un ítem de poder de habilidad.'),
  3076: g('Anti-curación', 800, 'Devuelve daño a los auto-ataques y reduce curaciones: base barata de Cota de Espinas.'),
};

const FALLBACK_ENTRY: ItemGuideEntry = {
  role: 'Escalado',
  cost: 0,
  why: 'Ítem recomendado para completar tu build y seguir creciendo en la partida.',
};

export function itemGuide(id: number): ItemGuideEntry {
  return ITEM_GUIDE[id] ?? FALLBACK_ENTRY;
}

/** Coste en oro: prioriza Data Dragon (parche activo) y usa la tabla estática como respaldo. */
export function itemCost(id: number): number {
  return itemGold(id) ?? ITEM_GUIDE[id]?.cost ?? 0;
}

/* ══════════════════════════════════════════════════════════════════
 * SOPORTE DE BUILDS POR LÍNEA Y ADAPTACIONES AL RIVAL (MOBALYTICS META)
 * ══════════════════════════════════════════════════════════════════ */

import type { TreeId, Keystone } from './builds';
import { KS, ADAPT } from './builds';
import type { Role, Champion } from '../types';

export type PositionRole = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY';

export type EnemyArchetype =
  | 'TANK'
  | 'ASSASSIN'
  | 'HEALER'
  | 'BURST'
  | 'POKE'
  | 'BRUISER'
  | 'CC';

export interface RuneTreeSelection {
  tree: TreeId;
  keystone?: Keystone;
  slots: string[];
}

export interface ItemStep {
  slot: number;
  item: number;
  label?: string;
  why?: string;
}

export interface ItemAdaptation {
  replaceSlot?: number;
  item: number;
  label: string;
  why: string;
  threatDescription?: string;
}

export interface ChampionRoleBuild {
  role: 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY';
  primaryRunes: RuneTreeSelection;
  secondaryRunes: RuneTreeSelection;
  statShards: string[];
  skillOrder: { max: string[]; priority: string };
  defaultCore: ItemStep[];
  archetypeAdaptations?: Partial<Record<EnemyArchetype, ItemAdaptation>>;
  label?: string;
  start?: number[];
  firstBack?: number[];
  boots?: number;
  spells?: string[];
}

export function roleToPosition(role: Role): PositionRole {
  switch (role) {
    case 'top':
      return 'TOP';
    case 'jungle':
      return 'JUNGLE';
    case 'mid':
      return 'MIDDLE';
    case 'adc':
      return 'BOTTOM';
    case 'support':
      return 'UTILITY';
  }
}

export function positionToRole(pos: PositionRole): Role {
  switch (pos) {
    case 'TOP':
      return 'top';
    case 'JUNGLE':
      return 'jungle';
    case 'MIDDLE':
      return 'mid';
    case 'BOTTOM':
      return 'adc';
    case 'UTILITY':
      return 'support';
  }
}

/** Detecta los arquetipos de amenaza que representa el campeón rival */
export function detectEnemyArchetypes(enemy: Champion): EnemyArchetype[] {
  const list: EnemyArchetype[] = [];
  if (enemy.traits.includes('tank')) list.push('TANK');
  if (enemy.traits.includes('heal')) list.push('HEALER');
  if (enemy.traits.includes('assassin')) list.push('ASSASSIN');
  if (enemy.traits.includes('burst')) list.push('BURST');
  if (enemy.traits.includes('poke') || enemy.arch.includes('poke')) list.push('POKE');
  if (enemy.traits.includes('engage') || enemy.hardCC >= 2) list.push('CC');
  if (enemy.dmg === 'AD' && (enemy.arch.includes('split') || enemy.traits.includes('hypercarry'))) list.push('BRUISER');
  if (!list.length) list.push('BRUISER');
  return list;
}

/** Repositorio de builds específicas por campeón y línea */
export const CHAMPION_ROLE_BUILDS: Record<string, Partial<Record<PositionRole, ChampionRoleBuild>>> = {
  Ahri: {
    MIDDLE: {
      role: 'MIDDLE',
      label: 'Mago de Burst & Control (Mid)',
      primaryRunes: {
        tree: 'domination',
        keystone: KS.electrocute,
        slots: ['Impacto repentino', 'Colección de globos oculares', 'Cazador definitivo'],
      },
      secondaryRunes: {
        tree: 'sorcery',
        slots: ['Banda de maná', 'Trascendencia'],
      },
      statShards: [ADAPT, ADAPT, 'Vida Escalable'],
      skillOrder: { max: ['Q', 'W', 'E'], priority: 'Q › W › E' },
      start: [1056, 2003, 2003, 3340],
      firstBack: [3802, 1001],
      boots: 3020,
      spells: ['SummonerFlash', 'SummonerDot'],
      defaultCore: [
        { slot: 1, item: 3118, label: '1er Power Spike crítico', why: 'Malicia: Daño en área con tu definitiva y aceleración crítica de R.' },
        { slot: 2, item: 3020, label: 'Penetración temprana', why: 'Botas de Hechicero: Penetración mágica plana para maximizar tu burst.' },
        { slot: 3, item: 4645, label: '2do Power Spike masivo', why: 'Llama Sombría: Críticos mágicos contra objetivos con menos del 35% de vida o protegidos por escudos.' },
        { slot: 4, item: 3157, label: 'Defensa situacional', why: 'Reloj de Arena de Zhonya: Estasis de 2.5s para reposicionar tras un all-in o anular definitivas.' },
        { slot: 5, item: 3089, label: 'Poder de habilidad masivo', why: 'Sombrero Mortal de Rabadon: Multiplica tu AP en 35% para el juego tardío.' },
        { slot: 6, item: 3135, label: 'Penetración porcentual', why: 'Báculo del Vacío: Atraviesa el 40% de la resistencia mágica del equipo enemigo.' },
      ],
      archetypeAdaptations: {
        TANK: {
          replaceSlot: 3,
          item: 6653,
          label: 'Adaptación Anti-Tanque (Liandry)',
          why: 'Tormento de Liandry: El rival acumula mucha vida; la quemadura por % de vida máxima destruye su resistencia.',
          threatDescription: 'Rival con alta acumulación de vida y aguante.',
        },
        HEALER: {
          replaceSlot: 3,
          item: 3165,
          label: 'Adaptación Anti-Curación (Morello)',
          why: 'Morellonomicón: Aplica 40% de Heridas Graves para cortar a la mitad la regeneración y robo de vida rival.',
          threatDescription: 'Rival con curación sostenida o robo de vida alto.',
        },
        ASSASSIN: {
          replaceSlot: 4,
          item: 3157,
          label: 'Adaptación Defensiva (Zhonya)',
          why: 'Reloj de Arena de Zhonya prioritario: Úsalo para cancelar el all-in y definitiva de ejecución del rival.',
          threatDescription: 'Asesino con alto daño explosivo y saltos a quemarropa.',
        },
        BURST: {
          replaceSlot: 4,
          item: 3157,
          label: 'Adaptación Anti-Burst (Zhonya)',
          why: 'Reloj de Arena de Zhonya: Absorbe y anula la rotación letal antes de que te ejecute.',
          threatDescription: 'Daño mágico o físico concentrado en 1 segundo.',
        },
        POKE: {
          replaceSlot: 4,
          item: 3102,
          label: 'Adaptación Anti-Poke (Banshee)',
          why: 'Velo de la Banshee: Escudo antihechizos y resistencia mágica para amortiguar el desgaste de largo alcance.',
          threatDescription: 'Habilidades a larga distancia constantes.',
        },
        BRUISER: {
          replaceSlot: 4,
          item: 3100,
          label: 'Adaptación Kiteo & Burst (Liche)',
          why: 'Perdición del Liche: Velocidad de movimiento extra para kitear y daño masivo al intercalar ataques básicos.',
          threatDescription: 'Luchador resistente cuerpo a cuerpo en combates extendidos.',
        },
        CC: {
          replaceSlot: 4,
          item: 3102,
          label: 'Adaptación Anti-Control (Banshee)',
          why: 'Velo de la Banshee: Bloquea el aturdimiento o agarre inicial impidiendo que te atrapen.',
          threatDescription: 'Control de masas duro y encadenable.',
        },
      },
    },
    UTILITY: {
      role: 'UTILITY',
      label: 'Soporte de Pick & Control (Support)',
      primaryRunes: {
        tree: 'inspiration',
        keystone: KS.glacial,
        slots: ['Calzado mágico', 'Entrega de galletas', 'Perspicacia cósmica'],
      },
      secondaryRunes: {
        tree: 'domination',
        slots: ['Golpe bajo', 'Cazador definitivo'],
      },
      statShards: ['Aceleración de Habilidad', ADAPT, 'Vida Escalable'],
      skillOrder: { max: ['E', 'Q', 'W'], priority: 'E › Q › W' },
      start: [3865, 2003],
      firstBack: [3158],
      boots: 3158,
      spells: ['SummonerFlash', 'SummonerDot'],
      defaultCore: [
        { slot: 1, item: 3865, label: 'Ítem de Soporte', why: 'Atlas Mundial: Provee oro y wards de visión al completar misiones.' },
        { slot: 2, item: 3158, label: 'Aceleración de hechizos', why: 'Botas Jonias: Reducción de enfriamiento en Destello y Encanto (E).' },
        { slot: 3, item: 3118, label: 'Daño & Slow de área', why: 'Malicia: Daño en área que ralentiza para facilitar el atrape de tu tirador.' },
        { slot: 4, item: 3165, label: 'Corta-curas de botlane', why: 'Morellonomicón: Reduce las curaciones de los soportes y tiradores rivales.' },
        { slot: 5, item: 3157, label: 'Iniciación segura', why: 'Reloj de Arena de Zhonya: Te permite iniciar con R+E y quedar invulnerable.' },
        { slot: 6, item: 3137, label: 'Curación para el equipo', why: 'Criptoflora: Cura a tu equipo al derribar a un enemigo.' },
      ],
      archetypeAdaptations: {
        TANK: {
          replaceSlot: 4,
          item: 3137,
          label: 'Anti-Tanque / Utilidad (Criptoflora)',
          why: 'Penetración mágica porcentual para ayudar a tu ADC a derribar al tanque rival.',
        },
        HEALER: {
          replaceSlot: 4,
          item: 3165,
          label: 'Anti-Curación (Morello)',
          why: 'Morellonomicón urgente para cortar las curaciones masivas del soporte enchanter enemigo.',
        },
        ASSASSIN: {
          replaceSlot: 5,
          item: 3157,
          label: 'Defensa Anti-Asesinos (Zhonya)',
          why: 'Zhonya temprano para evitar que el asesino rival te borre del mapa al iniciar las peleas.',
        },
        BURST: {
          replaceSlot: 5,
          item: 3157,
          label: 'Defensa Anti-Burst (Zhonya)',
          why: 'Zhonya para sobrevivir al daño letal enemigo.',
        },
        POKE: {
          replaceSlot: 5,
          item: 3102,
          label: 'Anti-Poke (Banshee)',
          why: 'Banshee para bloquear ganchos y habilidades de poke a distancia.',
        },
        BRUISER: {
          replaceSlot: 5,
          item: 3157,
          label: 'Defensa (Zhonya)',
          why: 'Zhonya para reposicionarte lejos del alcance del coloso rival.',
        },
        CC: {
          replaceSlot: 5,
          item: 3102,
          label: 'Anti-CC (Banshee)',
          why: 'Escudo anti-hechizos para neutralizar iniciaciones enemigas.',
        },
      },
    },
    TOP: {
      role: 'TOP',
      label: 'Mago de Kiteo & Desgaste (Top)',
      primaryRunes: {
        tree: 'sorcery',
        keystone: KS.comet,
        slots: ['Banda de maná', 'Trascendencia', 'Piroláser'],
      },
      secondaryRunes: {
        tree: 'inspiration',
        slots: ['Entrega de galletas', 'Perspicacia cósmica'],
      },
      statShards: ['Aceleración de Habilidad', ADAPT, 'Vida Escalable'],
      skillOrder: { max: ['Q', 'W', 'E'], priority: 'Q › W › E' },
      start: [1056, 2003, 2003, 3340],
      firstBack: [3802, 1001],
      boots: 3020,
      spells: ['SummonerFlash', 'SummonerTeleport'],
      defaultCore: [
        { slot: 1, item: 6653, label: 'Desgaste por % de vida', why: 'Tormento de Liandry: Daño sostenido para derretir a luchadores y tanques de Top.' },
        { slot: 2, item: 3020, label: 'Penetración plana', why: 'Botas de Hechicero: Daño mágico temprano en trades de línea.' },
        { slot: 3, item: 4629, label: 'Kiteo & Velocidad', why: 'Impulso Cósmico: Velocidad de movimiento tras acertar habilidades para que los colosos no te alcancen.' },
        { slot: 4, item: 3157, label: 'Anti-Dives', why: 'Reloj de Arena de Zhonya: Evita que el rival te zambulla bajo torre.' },
        { slot: 5, item: 3089, label: 'Poder de habilidad masivo', why: 'Sombrero Mortal de Rabadon: Escala tu daño a niveles letales.' },
        { slot: 6, item: 3135, label: 'Penetración porcentual', why: 'Báculo del Vacío: Ignora el 40% de resistencia mágica acumulada por los tanques.' },
      ],
      archetypeAdaptations: {
        TANK: {
          replaceSlot: 3,
          item: 3135,
          label: 'Anti-Tanque Temprano (Báculo)',
          why: 'Báculo del Vacío apresurado para neutralizar la compra temprana de Capa de Negatrones o Fuerza de la Naturaleza.',
        },
        HEALER: {
          replaceSlot: 3,
          item: 3165,
          label: 'Anti-Curación (Morello)',
          why: 'Morellonomicón para frenar el robo de vida de duelistas de top como Aatrox o Fiora.',
        },
        ASSASSIN: {
          replaceSlot: 4,
          item: 3157,
          label: 'Defensa (Zhonya)',
          why: 'Zhonya para anular el all-in del duelista rival.',
        },
        BURST: {
          replaceSlot: 4,
          item: 3157,
          label: 'Defensa Anti-Burst (Zhonya)',
          why: 'Zhonya para sobrevivir combos explosivos.',
        },
        POKE: {
          replaceSlot: 4,
          item: 3102,
          label: 'Anti-Poke (Banshee)',
          why: 'Banshee para bloquear el desgaste a distancia.',
        },
        BRUISER: {
          replaceSlot: 3,
          item: 4629,
          label: 'Velocidad de Kiteo (Cósmico)',
          why: 'Impulso Cósmico para que el bruiser jamás te alcance cuerpo a cuerpo.',
        },
        CC: {
          replaceSlot: 4,
          item: 3102,
          label: 'Anti-CC (Banshee)',
          why: 'Banshee para inmunidad a iniciaciones.',
        },
      },
    },
    BOTTOM: {
      role: 'BOTTOM',
      label: 'Mago Carry Inferior (APC)',
      primaryRunes: {
        tree: 'domination',
        keystone: KS.electrocute,
        slots: ['Impacto repentino', 'Colección de globos oculares', 'Cazador definitivo'],
      },
      secondaryRunes: {
        tree: 'sorcery',
        slots: ['Banda de maná', 'Trascendencia'],
      },
      statShards: [ADAPT, ADAPT, 'Vida Escalable'],
      skillOrder: { max: ['Q', 'W', 'E'], priority: 'Q › W › E' },
      start: [1056, 2003, 2003, 3340],
      firstBack: [3802, 1001],
      boots: 3020,
      spells: ['SummonerFlash', 'SummonerDot'],
      defaultCore: [
        { slot: 1, item: 3118, label: '1er Spike crítico', why: 'Malicia: Daño en área para dominar las peleas 2v2 en el carril inferior.' },
        { slot: 2, item: 3020, label: 'Penetración temprana', why: 'Botas de Hechicero: Castiga a tiradores sin resistencia mágica base.' },
        { slot: 3, item: 4645, label: '2do Spike masivo', why: 'Llama Sombría: Críticos mágicos para borrar tiradores y enchanters frágiles.' },
        { slot: 4, item: 3157, label: 'Defensa', why: 'Reloj de Arena de Zhonya: Supervivencia ante emboscadas del jungla enemigo.' },
        { slot: 5, item: 3089, label: 'Poder de habilidad', why: 'Sombrero Mortal de Rabadon: Multiplica tu daño para ganar peleas grupales.' },
        { slot: 6, item: 3135, label: 'Penetración', why: 'Báculo del Vacío: Ignora las resistencias del equipo rival.' },
      ],
      archetypeAdaptations: {
        TANK: {
          replaceSlot: 3,
          item: 6653,
          label: 'Anti-Tanque (Liandry)',
          why: 'Liandry para derretir al soporte tanque y a la frontline rival.',
        },
        HEALER: {
          replaceSlot: 3,
          item: 3165,
          label: 'Anti-Curación (Morello)',
          why: 'Morello para anular curaciones de tiradores con robo de vida y enchanters.',
        },
        ASSASSIN: {
          replaceSlot: 4,
          item: 3157,
          label: 'Defensa (Zhonya)',
          why: 'Zhonya para evitar que el asesino te elimine en los flancos.',
        },
        BURST: {
          replaceSlot: 4,
          item: 3157,
          label: 'Defensa Anti-Burst (Zhonya)',
          why: 'Zhonya para absorber el combo letal del botlane rival.',
        },
        POKE: {
          replaceSlot: 4,
          item: 3102,
          label: 'Anti-Poke (Banshee)',
          why: 'Banshee para bloquear el asedio a distancia.',
        },
        BRUISER: {
          replaceSlot: 4,
          item: 3100,
          label: 'Kiteo (Liche)',
          why: 'Perdición del Liche para daño en área y movilidad.',
        },
        CC: {
          replaceSlot: 4,
          item: 3102,
          label: 'Anti-CC (Banshee)',
          why: 'Banshee para evitar aturdimientos.',
        },
      },
    },
    JUNGLE: {
      role: 'JUNGLE',
      label: 'Asesino Emboscador (Jungla)',
      primaryRunes: {
        tree: 'domination',
        keystone: KS.electrocute,
        slots: ['Impacto repentino', 'Colección de globos oculares', 'Cazador incesante'],
      },
      secondaryRunes: {
        tree: 'sorcery',
        slots: ['Celeridad', 'Caminar sobre agua'],
      },
      statShards: [ADAPT, ADAPT, 'Vida Escalable'],
      skillOrder: { max: ['Q', 'W', 'E'], priority: 'Q › W › E' },
      start: [1101, 2031],
      firstBack: [3802, 1001],
      boots: 3020,
      spells: ['SummonerFlash', 'SummonerSmite'],
      defaultCore: [
        { slot: 1, item: 3118, label: '1er Spike de Gank', why: 'Malicia: Daño en área y reducción de enfriamiento en tu definitiva para gankear continuamente.' },
        { slot: 2, item: 3020, label: 'Movilidad & Daño', why: 'Botas de Hechicero: Rapidez para rotar entre campamentos y penetración mágica.' },
        { slot: 3, item: 4645, label: 'Burst de Emboscada', why: 'Llama Sombría: Críticos mágicos para ejecutar a los objetivos en emboscadas rápidas.' },
        { slot: 4, item: 3157, label: 'Defensa de Invasión', why: 'Reloj de Arena de Zhonya: Te da tiempo para que tus aliados lleguen a socorrerte en peleas por el dragón.' },
        { slot: 5, item: 3089, label: 'AP Masivo', why: 'Sombrero Mortal de Rabadon: Multiplica tu daño de ejecución.' },
        { slot: 6, item: 3135, label: 'Penetración', why: 'Báculo del Vacío: Garantiza daño contra la frontline rival.' },
      ],
      archetypeAdaptations: {
        TANK: {
          replaceSlot: 3,
          item: 6653,
          label: 'Anti-Tanque (Liandry)',
          why: 'Liandry para derretir junglas tanques en escaramuzas.',
        },
        HEALER: {
          replaceSlot: 3,
          item: 3165,
          label: 'Anti-Curación (Morello)',
          why: 'Morello para anular la curación del jungla rival.',
        },
        ASSASSIN: {
          replaceSlot: 4,
          item: 3157,
          label: 'Defensa (Zhonya)',
          why: 'Zhonya para contrarrestar emboscadas del jungla rival.',
        },
        BURST: {
          replaceSlot: 4,
          item: 3157,
          label: 'Defensa Anti-Burst (Zhonya)',
          why: 'Zhonya para neutralizar el burst enemigo.',
        },
        POKE: {
          replaceSlot: 4,
          item: 3102,
          label: 'Anti-Poke (Banshee)',
          why: 'Banshee para bloquear poke al entrar a emboscar.',
        },
        BRUISER: {
          replaceSlot: 4,
          item: 3100,
          label: 'Kiteo (Liche)',
          why: 'Perdición del Liche para burst adicional.',
        },
        CC: {
          replaceSlot: 4,
          item: 3102,
          label: 'Anti-CC (Banshee)',
          why: 'Banshee para evitar quedar atrapada al entrar al foso de objetivos.',
        },
      },
    },
  },
  Akali: {
    MIDDLE: {
      role: 'MIDDLE',
      label: 'Asesino de Burst Quirúrgico (Mid)',
      primaryRunes: {
        tree: 'domination',
        keystone: KS.electrocute,
        slots: ['Impacto repentino', 'Colección de globos oculares', 'Cazador definitivo'],
      },
      secondaryRunes: {
        tree: 'resolve',
        slots: ['Fuerzas renovadas', 'Sobrecrecimiento'],
      },
      statShards: [ADAPT, ADAPT, 'Vida Escalable'],
      skillOrder: { max: ['Q', 'E', 'W'], priority: 'Q › E › W' },
      start: [1054, 2003],
      boots: 3020,
      spells: ['SummonerFlash', 'SummonerDot'],
      defaultCore: [
        { slot: 1, item: 3152, label: 'Iniciación & Burst', why: 'Cinturón Cohete Hextech: Salto hacia adelante para conectar la E y daño explosivo.' },
        { slot: 2, item: 3020, label: 'Penetración mágica', why: 'Botas de Hechicero: Penetración plana contra campeones frágiles.' },
        { slot: 3, item: 4645, label: 'Ejecución letal', why: 'Llama Sombría: Críticos mágicos cuando el rival baja del 35% de vida.' },
        { slot: 4, item: 3157, label: 'Supervivencia', why: 'Reloj de Arena de Zhonya: Te da tiempo dentro del velo para recuperar energía y enfriamientos.' },
        { slot: 5, item: 3089, label: 'Poder de habilidad', why: 'Sombrero Mortal de Rabadon: Multiplica todo tu daño por 35%.' },
        { slot: 6, item: 3135, label: 'Penetración porcentual', why: 'Báculo del Vacío: Atraviesa las defensas mágicas enemigas.' },
      ],
      archetypeAdaptations: {
        TANK: {
          replaceSlot: 3,
          item: 6653,
          label: 'Anti-Tanque (Liandry)',
          why: 'Tormento de Liandry: Convierte tu daño en quemadura porcentual para vencer tanques.',
        },
        HEALER: {
          replaceSlot: 3,
          item: 3165,
          label: 'Anti-Curación (Morello)',
          why: 'Morello para cortar las curaciones enemigas.',
        },
        ASSASSIN: {
          replaceSlot: 4,
          item: 3157,
          label: 'Defensa (Zhonya)',
          why: 'Zhonya para capear el all-in del asesino rival.',
        },
        BURST: {
          replaceSlot: 4,
          item: 3157,
          label: 'Defensa Anti-Burst (Zhonya)',
          why: 'Zhonya para absorber el burst enemigo.',
        },
        POKE: {
          replaceSlot: 4,
          item: 3102,
          label: 'Anti-Poke (Banshee)',
          why: 'Velo de la Banshee para absorber el daño a distancia.',
        },
        BRUISER: {
          replaceSlot: 3,
          item: 4629,
          label: 'Movilidad Extendida (Cósmico)',
          why: 'Impulso Cósmico para peleas largas y giros de velo.',
        },
        CC: {
          replaceSlot: 4,
          item: 3102,
          label: 'Anti-CC (Banshee)',
          why: 'Banshee para inmunidad contra el control duro inicial.',
        },
      },
    },
    TOP: {
      role: 'TOP',
      label: 'Duelista AP de Combate Prolongado (Top)',
      primaryRunes: {
        tree: 'precision',
        keystone: KS.conqueror,
        slots: ['Claridad mental', 'Leyenda: Tenacidad', 'Último esfuerzo'],
      },
      secondaryRunes: {
        tree: 'resolve',
        slots: ['Fuerzas renovadas', 'Inquebrantable'],
      },
      statShards: [ADAPT, ADAPT, 'Vida Escalable'],
      skillOrder: { max: ['Q', 'E', 'W'], priority: 'Q › E › W' },
      start: [1054, 2003],
      boots: 3020,
      spells: ['SummonerFlash', 'SummonerTeleport'],
      defaultCore: [
        { slot: 1, item: 6653, label: 'Quemadura continua', why: 'Tormento de Liandry: Daño sostenido y vida para ganar intercambios largos en Top.' },
        { slot: 2, item: 3020, label: 'Penetración plana', why: 'Botas de Hechicero: Maximiza el daño de tu pasiva y habilidades.' },
        { slot: 3, item: 4629, label: 'Aceleración & Kiting', why: 'Impulso Cósmico: Velocidad al entrar y salir del velo.' },
        { slot: 4, item: 3157, label: 'Defensa de duelo', why: 'Reloj de Arena de Zhonya: Estasis para esperar el reinicio de tu energía.' },
        { slot: 5, item: 3089, label: 'Poder de habilidad', why: 'Sombrero Mortal de Rabadon: Daño letal en juego medio y tardío.' },
        { slot: 6, item: 3137, label: 'Penetración & Curación', why: 'Criptoflora: Penetración y sostenimiento tras cada baja.' },
      ],
      archetypeAdaptations: {
        TANK: {
          replaceSlot: 3,
          item: 3135,
          label: 'Anti-Tanque (Báculo del Vacío)',
          why: 'Báculo del Vacío para penetrar la armadura mágica del tanque de top.',
        },
        HEALER: {
          replaceSlot: 3,
          item: 3165,
          label: 'Anti-Curación (Morello)',
          why: 'Morellonomicón para contrarrestar curas de duelistas como Aatrox o Fiora.',
        },
        ASSASSIN: {
          replaceSlot: 4,
          item: 3157,
          label: 'Defensa (Zhonya)',
          why: 'Zhonya para neutralizar la ejecución rival.',
        },
        BURST: {
          replaceSlot: 4,
          item: 3157,
          label: 'Anti-Burst (Zhonya)',
          why: 'Zhonya para sobrevivir combos.',
        },
        POKE: {
          replaceSlot: 4,
          item: 3102,
          label: 'Anti-Poke (Banshee)',
          why: 'Banshee para bloquear daño a distancia.',
        },
        BRUISER: {
          replaceSlot: 3,
          item: 4629,
          label: 'Kiting (Cósmico)',
          why: 'Impulso Cósmico para asegurar superioridad de movimiento.',
        },
        CC: {
          replaceSlot: 4,
          item: 3102,
          label: 'Anti-CC (Banshee)',
          why: 'Banshee para esquivar aturdimientos.',
        },
      },
    },
  },
  Yone: {
    MIDDLE: {
      role: 'MIDDLE',
      label: 'Hipercarry Crítico Cuerpo a Cuerpo (Mid)',
      primaryRunes: {
        tree: 'precision',
        keystone: KS.conqueror,
        slots: ['Triunfo', 'Leyenda: Presteza', 'Último esfuerzo'],
      },
      secondaryRunes: {
        tree: 'resolve',
        slots: ['Fuerzas renovadas', 'Sobrecrecimiento'],
      },
      statShards: ['Velocidad de Ataque', ADAPT, 'Vida Escalable'],
      skillOrder: { max: ['Q', 'E', 'W'], priority: 'Q › E › W' },
      start: [1055, 2003],
      boots: 3006,
      spells: ['SummonerFlash', 'SummonerDot'],
      defaultCore: [
        { slot: 1, item: 6672, label: '1er Spike de Ataque', why: 'Matakrakens: Daño con cada tercer autoataque y velocidad para reducir el enfriamiento de Q.' },
        { slot: 2, item: 3006, label: 'Velocidad de Ataque', why: 'Grebas de Berserker: Ítem central para rebajar al mínimo el enfriamiento de tu Q y W.' },
        { slot: 3, item: 3031, label: 'Poder Crítico Máximo', why: 'Filo del Infinito: Al alcanzar 100% de probabilidad crítica gracias a tu pasiva, multiplica todo tu daño.' },
        { slot: 4, item: 3072, label: 'Robo de Vida', why: 'Sed de Sangre: Sostenimiento masivo y un escudo de vida para no morir en teamfights.' },
        { slot: 5, item: 3026, label: 'Segunda Vida', why: 'Ángel Guardián: Te permite entrar con tu definitiva sin miedo a morir instantáneamente.' },
        { slot: 6, item: 3033, label: 'Penetración & Corta-curas', why: 'Recordatorio Mortal: Rompe armadura y reduce curaciones rivales.' },
      ],
      archetypeAdaptations: {
        TANK: {
          replaceSlot: 4,
          item: 3036,
          label: 'Anti-Tanque (Lord Dominik)',
          why: 'Saludos de Lord Dominik: Rompe tanques con armadura y mucha vida.',
        },
        HEALER: {
          replaceSlot: 4,
          item: 3033,
          label: 'Anti-Curación Temprano (Recordatorio)',
          why: 'Recordatorio Mortal apresurado para cortar el sustain rival.',
        },
        ASSASSIN: {
          replaceSlot: 4,
          item: 6673,
          label: 'Escudo Anti-Burst (Arco Inmortal)',
          why: 'Arco Inmortal: Escudo al caer de vida para evitar que te maten de un combo.',
        },
        BURST: {
          replaceSlot: 4,
          item: 6333,
          label: 'Defensa (Danza de la Muerte)',
          why: 'Danza de la Muerte: Aplaza el daño recibido en el tiempo para curarte en la pelea.',
        },
        POKE: {
          replaceSlot: 4,
          item: 3814,
          label: 'Anti-Poke (Filo de la Noche)',
          why: 'Filo de la Noche: Escudo anti-hechizos para entrar a distancia.',
        },
        BRUISER: {
          replaceSlot: 1,
          item: 3153,
          label: 'Duelista On-Hit (Rey Arruinado)',
          why: 'Hoja del Rey Arruinado: Robo de vida y daño por % de vida para ganar duelos cuerpo a cuerpo.',
        },
        CC: {
          replaceSlot: 5,
          item: 3156,
          label: 'Anti-CC & Escudo Mágico (Malmortius)',
          why: 'Mandíbula de Malmortius: Escudo mágico masivo y tenacidad.',
        },
      },
    },
    TOP: {
      role: 'TOP',
      label: 'Duelista de Split-push & On-Hit (Top)',
      primaryRunes: {
        tree: 'precision',
        keystone: KS.conqueror,
        slots: ['Triunfo', 'Leyenda: Presteza', 'Último esfuerzo'],
      },
      secondaryRunes: {
        tree: 'resolve',
        slots: ['Revestimiento de huesos', 'Sobrecrecimiento'],
      },
      statShards: ['Velocidad de Ataque', ADAPT, 'Vida Escalable'],
      skillOrder: { max: ['Q', 'E', 'W'], priority: 'Q › E › W' },
      start: [1055, 2003],
      boots: 3006,
      spells: ['SummonerFlash', 'SummonerTeleport'],
      defaultCore: [
        { slot: 1, item: 3153, label: 'Duelo On-Hit', why: 'Hoja del Rey Arruinado: % de vida por golpe y robo de vida para ganar la línea contra colosos.' },
        { slot: 2, item: 3006, label: 'Velocidad de Ataque', why: 'Grebas de Berserker: Velocidad para castear Q rápido.' },
        { slot: 3, item: 3031, label: 'Poder Crítico', why: 'Filo del Infinito: Aumenta brutalmente el daño de tus impactos críticos.' },
        { slot: 4, item: 6333, label: 'Resistencia a Duelos', why: 'Danza de la Muerte: Difumina el daño físico y te cura al conseguir un derribo.' },
        { slot: 5, item: 3053, label: 'Aguante Masivo', why: 'Aguijón de Sterak: Escudo gigante al bajar de vida y tenacidad.' },
        { slot: 6, item: 3033, label: 'Penetración & Corta-curas', why: 'Recordatorio Mortal: Rompe armaduras enemigas.' },
      ],
      archetypeAdaptations: {
        TANK: {
          replaceSlot: 4,
          item: 3036,
          label: 'Anti-Tanque (Lord Dominik)',
          why: 'Saludos de Lord Dominik para desarmar tanques de top.',
        },
        HEALER: {
          replaceSlot: 4,
          item: 3033,
          label: 'Anti-Curación (Recordatorio)',
          why: 'Recordatorio Mortal para cortar el sustain enemigo.',
        },
        ASSASSIN: {
          replaceSlot: 4,
          item: 6333,
          label: 'Defensa (Danza de la Muerte)',
          why: 'Danza de la Muerte para absorber daño físico letal.',
        },
        BURST: {
          replaceSlot: 4,
          item: 6673,
          label: 'Anti-Burst (Arco Inmortal)',
          why: 'Arco Inmortal para no ser borrado de golpe.',
        },
        POKE: {
          replaceSlot: 4,
          item: 3814,
          label: 'Anti-Poke (Filo de la Noche)',
          why: 'Filo de la Noche para avanzar bajo fuego enemigo.',
        },
        BRUISER: {
          replaceSlot: 5,
          item: 3053,
          label: 'Aguante (Sterak)',
          why: 'Sterak para ganar peleas prolongadas.',
        },
        CC: {
          replaceSlot: 5,
          item: 3156,
          label: 'Tenacidad (Malmortius)',
          why: 'Malmortius para resistir aturdimientos mágicos.',
        },
      },
    },
  },
};

/** Obtiene la build específica de rol para un campeón, si existe */
export function getChampionRoleBuild(
  champId: string,
  role: Role | PositionRole,
): ChampionRoleBuild | null {
  const pos =
    typeof role === 'string' && ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'].includes(role)
      ? (role as PositionRole)
      : roleToPosition(role as Role);
  return CHAMPION_ROLE_BUILDS[champId]?.[pos] ?? null;
}
