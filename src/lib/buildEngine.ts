import type { Champion, Role } from '../types';
import { CHAMP_BY_ID } from '../data/champions';
import { BUILD_OVERRIDES, TEMPLATES, TEMPLATE_TAILS, type BuildData, type Skill, type TemplateId, type TreeId } from '../data/builds';
import { itemCost, itemGuide, getChampionRoleBuild, detectEnemyArchetypes } from '../data/itemGuide';
import { CHAMPION_PROFILES } from '../data/championProfiles';
import { item } from '../data/items';
import { pairHash } from './charts';
import matchupsDataset from '../data/matchups.json';

export function getSyncedMatchupData(champId: string, role: Role) {
  const roleKey =
    role === 'mid' ? 'MIDDLE' : role === 'adc' ? 'BOTTOM' : role === 'support' ? 'UTILITY' : (role.toUpperCase() as 'TOP' | 'JUNGLE');
  const champData = (matchupsDataset as any)?.champions?.[champId];
  if (!champData) return null;
  return champData.roles?.[roleKey] ?? Object.values(champData.roles ?? {})[0] ?? null;
}

export interface SituationalItem {
  item: number;
  tag: string;
  reason: string;
  alternativeFor: string;
}

/** Un paso de la ruta secuencial (1 al 6) de objetos finales. */
export interface PathStep {
  /** 1..6 */
  slot: number;
  item: number;
  cost: number;
  /** Oro acumulado hasta completar este ítem */
  cumulative: number;
  /** Ej.: "1er Power Spike - Núcleo", "3er Ítem - Penetración", "Defensa situacional" */
  label: string;
  /** Por qué armarse esto, en lenguaje simple */
  why: string;
  /** Si el ítem se eligió por el matchup, la razón corta (p. ej. "Anti-curación") */
  adapted: string | null;
}

/** Interrupción táctica: componente barato a comprar antes de seguir con la ruta. */
export interface TacticalComponent {
  /** El aviso aparece después de este paso (1 = tras el primer ítem completo) */
  afterSlot: number;
  item: number;
  cost: number;
  enemy: string;
  /** Frase del tipo "curación y robo de vida temprano" */
  threat: string;
  /** true si la línea es un 2v2 (ADC/Support) */
  duo: boolean;
}

export interface ResolvedBuild extends BuildData {
  templateId: TemplateId;
  levels: ('Q' | 'W' | 'E' | 'R')[];
  situational: SituationalItem[];
  path: PathStep[];
  tactical: TacticalComponent | null;
}

export function templateFor(ch: Champion, role: Role): TemplateId {
  if (role === 'adc') return 'marksman';
  if (role === 'support') return ch.traits.includes('enchanter') ? 'enchanter' : 'engage';
  if (role === 'top') return ch.traits.includes('tank') ? 'tank' : 'bruiser';
  if (role === 'jungle') return ch.traits.includes('tank') ? 'tank' : ch.dmg === 'AP' ? 'mage' : 'bruiser';
  if (ch.dmg === 'AP') return 'mage';
  return 'bruiser';
}

/** Genera los 18 niveles: R en 6/11/16, primeros 3 definidos, el resto por prioridad (máx. 5 por habilidad). */
export function levelOrder(first3: Skill[], priority: Skill[]): ('Q' | 'W' | 'E' | 'R')[] {
  const out: ('Q' | 'W' | 'E' | 'R')[] = Array(18).fill('Q');
  const count: Record<Skill, number> = { Q: 0, W: 0, E: 0 };
  [5, 10, 15].forEach((i) => (out[i] = 'R'));
  first3.forEach((s, i) => {
    out[i] = s;
    count[s]++;
  });
  const queue: Skill[] = [];
  priority.forEach((s, idx) => {
    const target = idx === 0 ? 5 : idx === 1 ? 5 : 5;
    for (let n = count[s]; n < target; n++) queue.push(s);
  });
  for (let lvl = 3; lvl < 18; lvl++) {
    if (out[lvl] === 'R') continue;
    out[lvl] = queue.shift() ?? 'Q';
  }
  return out;
}

/**
 * Campeones con sustain relevante en línea aunque su kit no los marque con el rasgo `heal`.
 * La frase se inserta en el aviso táctico: "{Rival} tiene {frase}".
 */
const SUSTAIN_THREATS: Record<string, string> = {
  Draven: 'curación y robo de vida temprano con filo vampírico',
  Samira: 'robo de vida explosivo al encadenar su combo y definitiva',
  Soraka: 'curaciones masivas que anulan tu daño de desgaste',
  Warwick: 'curación y robo de vida crítico desde que sangra a su objetivo',
  Aatrox: 'curación masiva en combate con sus impactos de espada',
  Vladimir: 'robo de vida constante y sustain con Transfusión (Q)',
  Sylas: 'curación crítica cuando baja de vida con Matarreyes (W)',
  Fiora: 'curación al impactar puntos vitales y zona de Definitiva',
  Gwen: 'curación continua con Mil Tajos y área de Tijeretazo',
  Briar: 'frenesí con robo de vida pasivo aumentado por vida faltante',
  Darius: 'curación porcentual con el filo exterior de su hacha (Q)',
  Renekton: 'curación instantánea potenciada con furia en su Q',
  Volibear: 'regeneración pasiva y escudo continuo en peleas largas',
  Mundo: 'regeneración masiva con su Definitiva e inmunidad a CC',
  Swain: 'curación masiva continua durante su Ascensión Demoníaca (R)',
  Cassiopeia: 'curación por colmillo venenoso (E) en combate extendido',
};

/** Devuelve la frase de amenaza de sustain del rival o null si no es relevante. */
export function sustainThreat(e: Champion): string | null {
  return SUSTAIN_THREATS[e.id] ?? (e.traits.includes('heal') ? 'curación y robo de vida continuo' : null);
}

/** Componente barato que corta curaciones, según el tipo de campeón. */
function antiHealComponent(ch: Champion, tid: TemplateId): number {
  if (tid === 'tank' || tid === 'engage') return 3076; // Chaleco de Zarzas
  if (ch.dmg === 'AP') return 3916; // Orbe del Olvido
  return 3123; // Llamada del Verdugo
}

/** Genera los 6 objetos situacionales recomendados con sus alternativas pedagógicas estilo Mobalytics */
export function generateSituationalItems(
  ch: Champion,
  role: Role,
  tid: TemplateId,
  coreItems: number[],
): SituationalItem[] {
  const pool: SituationalItem[] = [];

  const coreNames = coreItems.map((id) => item(id).name);
  const altSlot3 = coreNames[2] ?? '3er objeto del núcleo';
  const altSlot4 = coreNames[3] ?? '4º objeto del núcleo';
  const altSlot5 = coreNames[4] ?? '5º objeto del núcleo';

  if (ch.dmg === 'AP') {
    pool.push(
      {
        item: 3100, // Lich Bane
        tag: 'Burst Ofensivo',
        alternativeFor: altSlot4,
        reason:
          'Añade daño explosivo masivo al combinar habilidades con auto-ataques. Muy efectivo contra campeones frágiles sin resistencia mágica para eliminarlos de una sola rotación.',
      },
      {
        item: 3102, // Banshee's Veil
        tag: 'Escudo Anti-Hechizos',
        alternativeFor: altSlot4,
        reason:
          'Otorga un escudo que bloquea la primera habilidad enemiga y resistencia mágica contra composiciones de desgaste (poke) o iniciaciones a distancia.',
      },
      {
        item: 3157, // Zhonya's Hourglass
        tag: 'Defensa Anti-Burst',
        alternativeFor: altSlot3,
        reason:
          'Estasis invulnerable de 2.5 segundos para sobrevivir el all-in de asesinos, definitivas de ejecución o reposicionarte tras iniciar.',
      },
      {
        item: 3165, // Morellonomicon
        tag: 'Anti-Curación',
        alternativeFor: altSlot3,
        reason:
          'Aplica 40% de Heridas Graves para cortar curaciones masivas, robo de vida y regeneración de campeones con sustain en peleas largas.',
      },
      {
        item: 6653, // Liandry's Torment
        tag: 'Quemadura Anti-Tanque',
        alternativeFor: altSlot3,
        reason:
          'Quema un porcentaje de la vida máxima del rival en el tiempo. Indispensable si el equipo enemigo acumula tanques con mucha vida.',
      },
      {
        item: 3137, // Cryptbloom
        tag: 'Penetración + Curación Grupal',
        alternativeFor: altSlot5,
        reason:
          'Penetración mágica porcentual económica que libera una onda curativa para todo tu equipo tras conseguir un derribo en peleas grupales.',
      },
      {
        item: 4629, // Cosmic Drive
        tag: 'Movilidad y Kiting',
        alternativeFor: altSlot4,
        reason:
          'Acelera tus habilidades y te otorga una ráfaga continua de velocidad de movimiento tras impactar hechizos para kitear campeones cuerpo a cuerpo.',
      },
      {
        item: 4645, // Shadowflame
        tag: 'Críticos Mágicos',
        alternativeFor: altSlot3,
        reason:
          'Inflige impactos críticos mágicos contra objetivos con menos del 35% de vida o protegidos por escudos temporales.',
      },
    );
  } else if (role === 'adc' || tid === 'marksman') {
    pool.push(
      {
        item: 6673, // Immortal Shieldbow
        tag: 'Anti-Burst Salvavidas',
        alternativeFor: altSlot4,
        reason:
          'Otorga un escudo masivo al bajar del 30% de vida, salvándote del combo explosivo repentino de asesinos rivales.',
      },
      {
        item: 3036, // Lord Dominik's Regards
        tag: 'Penetración Anti-Tanque',
        alternativeFor: altSlot3,
        reason:
          'Hasta 40% de penetración de armadura porcentual para derretir la primera línea defensiva enemiga en peleas de equipo.',
      },
      {
        item: 3033, // Mortal Reminder
        tag: 'Anti-Curación a Distancia',
        alternativeFor: altSlot3,
        reason:
          'Penetración de armadura combinada con Heridas Graves; anula la regeneración del equipo rival con tus ataques a distancia.',
      },
      {
        item: 3026, // Guardian Angel
        tag: 'Segunda Oportunidad',
        alternativeFor: altSlot5,
        reason:
          'Te revive tras caer en combate con 50% de vida base; vital para no dejar a tu equipo sin tirador en la pelea decisiva.',
      },
      {
        item: 3094, // Rapid Firecannon
        tag: 'Alcance de Asedio',
        alternativeFor: altSlot4,
        reason:
          'Aumenta el alcance de tu primer disparo cargado para castigar desde una distancia segura sin exponerte a iniciaciones.',
      },
      {
        item: 3153, // Blade of the Ruined King
        tag: 'Anti-Vida y Kiting',
        alternativeFor: altSlot3,
        reason:
          'Daño porcentual de vida actual en cada golpe y robo de velocidad de movimiento para destruir tanques y evitar que te alcancen.',
      },
      {
        item: 3156, // Maw of Malmortius
        tag: 'Escudo Anti-Magia',
        alternativeFor: altSlot4,
        reason:
          'Escudo salvavidas contra daño mágico masivo y omnivampirismo al activarse para sobrevivir a magos y asesinos AP.',
      },
    );
  } else if (tid === 'tank' || tid === 'engage') {
    pool.push(
      {
        item: 3075, // Thornmail
        tag: 'Anti-Curación Pesada',
        alternativeFor: altSlot3,
        reason:
          'Devuelve daño mágico al recibir ataques básicos y aplica Heridas Graves para cortar el robo de vida enemigo.',
      },
      {
        item: 3143, // Randuin's Omen
        tag: 'Anti-Críticos y Tiradores',
        alternativeFor: altSlot4,
        reason:
          'Reduce el daño de golpes críticos en un 30% y activa una ralentización en área; indispensable contra Yasuo, Yone y ADCs.',
      },
      {
        item: 6665, // Kaenic Rookern
        tag: 'Escudo Mágico Regenerativo',
        alternativeFor: altSlot3,
        reason:
          'Escudo mágico equivalente al 18% de tu vida máxima que se regenera automáticamente cada 12 segundos fuera de combate.',
      },
      {
        item: 4401, // Force of Nature
        tag: 'Anti-Magia Sostenida',
        alternativeFor: altSlot4,
        reason:
          'Aumenta tu resistencia mágica y velocidad de movimiento al recibir daño mágico continuo (Cassiopeia, Ryze, Gwen).',
      },
      {
        item: 3110, // Frozen Heart
        tag: 'Aura Anti-Velocidad de Ataque',
        alternativeFor: altSlot3,
        reason:
          'Reduce la velocidad de ataque de todos los enemigos cercanos en un 20% de forma pasiva; frena en seco a duelistas veloces.',
      },
      {
        item: 3083, // Warmog's Armor
        tag: 'Regeneración Fuera de Combate',
        alternativeFor: altSlot5,
        reason:
          'Restaura tu vida completa en pocos segundos al retirarte de una escaramuza para reiniciar el asedio con vida al 100%.',
      },
    );
  } else if (tid === 'enchanter') {
    pool.push(
      {
        item: 3222, // Mikael's Blessing
        tag: 'Purificación de Control de Masas',
        alternativeFor: altSlot3,
        reason:
          'Limpia al instante aturdimientos, inmovilizaciones o silencios sobre tu carry aliado y le otorga una curación inmediata.',
      },
      {
        item: 3107, // Redemption
        tag: 'Curación Masiva en Área',
        alternativeFor: altSlot3,
        reason:
          'Haz de luz que restaura vida a todos los aliados y quema a los enemigos en área, utilizable incluso si has caído en combate.',
      },
      {
        item: 3190, // Locket of the Iron Solari
        tag: 'Escudo de Protección Grupal',
        alternativeFor: altSlot3,
        reason:
          'Otorga un escudo instantáneo a todos los aliados cercanos para amortiguar definitivas de daño masivo en área.',
      },
      {
        item: 3109, // Knight's Vow
        tag: 'Vínculo con el Tirador',
        alternativeFor: altSlot3,
        reason:
          'Redirige el 10% del daño que recibe tu carry hacia ti y te cura por el daño que él inflija a los enemigos.',
      },
      {
        item: 2065, // Shurelya's Battlesong
        tag: 'Aceleración de Equipo',
        alternativeFor: altSlot3,
        reason:
          'Otorga una ráfaga de velocidad de movimiento a todos los aliados para iniciar una persecución o escapar de una emboscada.',
      },
      {
        item: 3157, // Zhonya's
        tag: 'Supervivencia Personal',
        alternativeFor: altSlot4,
        reason:
          'Estasis de 2.5s para no morir de un combo cuando los asesinos rivales busquen eliminar al soporte al inicio de la pelea.',
      },
    );
  } else {
    pool.push(
      {
        item: 6333, // Death's Dance
        tag: 'Anti-Burst Físico',
        alternativeFor: altSlot4,
        reason:
          'Difiere el 30% del daño recibido en daño de sangrado en el tiempo y purga el daño pendiente tras conseguir una baja.',
      },
      {
        item: 3156, // Maw of Malmortius
        tag: 'Escudo Anti-Magia',
        alternativeFor: altSlot4,
        reason:
          'Gran resistencia mágica y escudo protector para aguantar la rotación de habilidades de magos y asesinos AP.',
      },
      {
        item: 3071, // Black Cleaver
        tag: 'Reducción de Armadura',
        alternativeFor: altSlot3,
        reason:
          'Reduce la armadura del objetivo hasta en un 30% con cada impacto físico, beneficiando a todo tu equipo.',
      },
      {
        item: 6609, // Chempunk Chainsword
        tag: 'Anti-Curación Agresiva',
        alternativeFor: altSlot3,
        reason:
          'Estadísticas de daño y aceleración con Heridas Graves para ganar duelos contra rivales con regeneración continua.',
      },
      {
        item: 3053, // Sterak's Gage
        tag: 'Escudo Masivo en Teamfight',
        alternativeFor: altSlot4,
        reason:
          'Escudo gigantesco escalado con tu vida adicional y tenacidad para resistir el control de masas en peleas grupales.',
      },
      {
        item: 3026, // Guardian Angel
        tag: 'Segunda Oportunidad',
        alternativeFor: altSlot5,
        reason:
          'Permite lanzarte como iniciador secundario en peleas de equipo sin riesgo de quedar fuera de la partida al instante.',
      },
      {
        item: 3742, // Dead Man's Plate
        tag: 'Movilidad e Iniciación',
        alternativeFor: altSlot4,
        reason:
          'Velocidad de movimiento fuera de combate para rotar y una ralentización contundente en tu primer golpe cuerpo a cuerpo.',
      },
    );
  }

  const filtered = pool.filter((p) => !coreItems.includes(p.item));
  return filtered.slice(0, 6);
}

export function getBuild(champId: string, enemyId: string | null, roleHint?: Role): ResolvedBuild {
  const ch = CHAMP_BY_ID[champId];
  if (!ch) throw new Error(`Campeón desconocido: ${champId}`);
  const role = roleHint ?? ch.roles[0];
  const enemy = enemyId ? CHAMP_BY_ID[enemyId] : null;
  const tid = templateFor(ch, role);

  // 1. Obtener perfil de alta fidelidad o role build específico (sincronizado o estático)
  const synced = getSyncedMatchupData(champId, role);
  const roleBuild = getChampionRoleBuild(champId, role);
  const profile = CHAMPION_PROFILES[champId];
  const roleOverride = profile?.roleOverrides?.[role];

  const first3: Skill[] =
    (synced?.skillOrder?.first3 as Skill[]) ??
    (roleBuild?.skillOrder.max as Skill[]) ??
    roleOverride?.first3 ??
    profile?.first3 ??
    BUILD_OVERRIDES[champId]?.first3 ??
    TEMPLATES[tid].first3;

  const priority: Skill[] =
    (synced?.skillOrder?.priority as Skill[]) ??
    (roleBuild
      ? ((roleBuild.skillOrder.priority.includes('›')
          ? roleBuild.skillOrder.priority.split('›').map((s) => s.trim())
          : roleBuild.skillOrder.priority.split(/[,\s>]+/).map((s) => s.trim())
        ).filter(Boolean) as Skill[])
      : (roleOverride?.priority ?? profile?.priority ?? BUILD_OVERRIDES[champId]?.priority ?? TEMPLATES[tid].priority));

  const runes =
    synced?.runes
      ? {
          primary: {
            tree: synced.runes.primary.treeId as TreeId,
            keystone: {
              name: synced.runes.primary.keystone.name,
              path: synced.runes.primary.keystone.path,
            },
            slots: synced.runes.primary.slots,
          },
          secondary: {
            tree: synced.runes.secondary.treeId as TreeId,
            slots: synced.runes.secondary.slots,
          },
          shards: synced.runes.shards,
        }
      : roleBuild
        ? {
            primary: {
              tree: roleBuild.primaryRunes.tree,
              keystone: roleBuild.primaryRunes.keystone!,
              slots: roleBuild.primaryRunes.slots,
            },
            secondary: {
              tree: roleBuild.secondaryRunes.tree,
              slots: roleBuild.secondaryRunes.slots,
            },
            shards: roleBuild.statShards,
          }
        : (roleOverride?.runes ?? profile?.runes ?? BUILD_OVERRIDES[champId]?.runes ?? TEMPLATES[tid].runes);

  let boots =
    (synced?.build?.boots as number) ??
    roleBuild?.boots ??
    roleOverride?.boots ??
    profile?.boots ??
    BUILD_OVERRIDES[champId]?.boots ??
    TEMPLATES[tid].boots;

  // Ajustes de botas según rol
  if (role === 'adc' && boots !== 3006 && ch.dmg !== 'AP') boots = 3006;
  if (role === 'support' && boots === 3006) boots = 3158;

  let start =
    (synced?.build?.start as number[]) ??
    roleBuild?.start ??
    (role === 'support'
      ? [3865, 2003]
      : role === 'jungle'
        ? [1101, 2031]
        : role === 'adc'
          ? [1055, 2003]
          : ch.dmg === 'AP'
            ? [1056, 2003, 2003, 3340]
            : [1055, 2003]);

  let spells =
    roleBuild?.spells ??
    roleOverride?.spells ??
    profile?.spells ??
    (role === 'jungle'
      ? ['SummonerFlash', 'SummonerSmite']
      : role === 'support'
        ? ['SummonerFlash', ch.dmg === 'AP' ? 'SummonerDot' : 'SummonerExhaust']
        : role === 'adc'
          ? ['SummonerFlash', 'SummonerHeal']
          : role === 'top'
            ? ['SummonerFlash', 'SummonerTeleport']
            : ['SummonerFlash', 'SummonerDot']);

  const firstBack =
    roleBuild?.firstBack ??
    roleOverride?.firstBack ??
    profile?.firstBack ??
    BUILD_OVERRIDES[champId]?.firstBack ??
    (ch.dmg === 'AP' ? [3802, 1001] : [1001]);

  let coreList: number[] = [
    ...(synced?.build?.core
      ? (synced.build.core as number[])
      : roleBuild
        ? roleBuild.defaultCore.map((d) => d.item)
        : (roleOverride?.core ?? profile?.core ?? BUILD_OVERRIDES[champId]?.core ?? TEMPLATES[tid].core)),
  ];

  if (coreList.length < 6) {
    const tail = TEMPLATE_TAILS[tid];
    for (const t of tail) {
      if (!coreList.includes(t)) coreList.push(t);
      if (coreList.length >= 6) break;
    }
  }

  // Si juega soporte y no tiene el ítem de soporte completado en el slot 1 o 2
  if (role === 'support' && !coreList.includes(3865)) {
    coreList = [3865, ...coreList.slice(0, 5)];
  }

  const coreSteps: { item: number; label: string; why: string; adapted: string | null }[] = coreList
    .slice(0, 6)
    .map((itemId, idx) => {
      const guide = itemGuide(itemId);
      const defaultLabel =
        idx === 0 ? '1er Power Spike - Núcleo' : idx === 1 ? '2do Power Spike' : guide.role || 'Objeto Clave';
      return {
        item: itemId,
        label: defaultLabel,
        why: guide.why,
        adapted: null,
      };
    });

  // Adaptación dinámica frente al rival
  if (enemy) {
    const archetypes = detectEnemyArchetypes(enemy);
    let adaptationApplied = false;

    // Si roleBuild tenía adaptaciones manuales por arquetipo:
    if (roleBuild?.archetypeAdaptations) {
      for (const arch of archetypes) {
        const adapt = roleBuild.archetypeAdaptations[arch];
        if (adapt) {
          const targetSlot = adapt.replaceSlot ?? (coreSteps.length >= 4 ? 4 : coreSteps.length);
          const targetIdx = targetSlot - 1;
          if (targetIdx >= 0 && targetIdx < coreSteps.length) {
            coreSteps[targetIdx] = {
              item: adapt.item,
              label: adapt.label,
              why: adapt.why,
              adapted: adapt.label,
            };
            adaptationApplied = true;
            break;
          }
        }
      }
    }

    if (!adaptationApplied) {
      const primaryArch = archetypes[0];
      let adaptItem = 0;
      let adaptLabel = '';
      let adaptWhy = '';

      if (primaryArch === 'TANK') {
        if (ch.dmg === 'AP') {
          adaptItem = 6653;
          adaptLabel = 'Anti-Tanque (Liandry)';
          adaptWhy = `${enemy.name} es un tanque con mucha vida: la quemadura porcentual de Tormento de Liandry derriba sus defensas.`;
        } else if (role === 'adc' || ch.traits.includes('hypercarry')) {
          adaptItem = 3036;
          adaptLabel = 'Anti-Tanque (LDR)';
          adaptWhy = `${enemy.name} acumula armadura: Saludos de Lord Dominik ignora hasta 40% de su armadura en teamfights.`;
        } else if (tid === 'tank' || tid === 'engage') {
          adaptItem = 3068;
          adaptLabel = 'Duelo Frontline (Solar)';
          adaptWhy = `${enemy.name} ofrece peleas prolongadas: Égida Solar te da daño de quemadura continuo cuerpo a cuerpo.`;
        } else {
          adaptItem = 3071;
          adaptLabel = 'Anti-Tanque (Cuchilla)';
          adaptWhy = `${enemy.name} compra armadura: Cuchilla Negra reduce su armadura total en cada golpe para todo tu equipo.`;
        }
      } else if (primaryArch === 'HEALER' || sustainThreat(enemy)) {
        if (ch.dmg === 'AP') {
          adaptItem = 3165;
          adaptLabel = 'Anti-Curación (Morello)';
          adaptWhy = `${enemy.name} se regenera constantemente en combate: corta el 40% de sus curaciones con Heridas Graves.`;
        } else if (tid === 'tank' || tid === 'engage') {
          adaptItem = 3075;
          adaptLabel = 'Anti-Curación (Espinas)';
          adaptWhy = `${enemy.name} abusa del robo de vida: Cota de Espinas devuelve daño cortando su curación al atacarte.`;
        } else if (role === 'adc') {
          adaptItem = 3033;
          adaptLabel = 'Anti-Curación (Recordatorio)';
          adaptWhy = `${enemy.name} tiene regeneración masiva: corta sus curaciones de inmediato a distancia con Recordatorio Mortal.`;
        } else {
          adaptItem = 6609;
          adaptLabel = 'Anti-Curación (Chempunk)';
          adaptWhy = `${enemy.name} abusa de curación en combate: corta su sustain manteniendo daño físico sólido con Espada Sierra.`;
        }
      } else if (primaryArch === 'ASSASSIN' || primaryArch === 'BURST') {
        if (ch.dmg === 'AP') {
          adaptItem = 3157;
          adaptLabel = 'Defensivo Anti-Burst (Zhonya)';
          adaptWhy = `${enemy.name} entra con daño explosivo letal: el éxtasis de 2.5s anula su rotación definitiva.`;
        } else if (role === 'adc') {
          adaptItem = 6673;
          adaptLabel = 'Anti-Burst (Arcoescudo)';
          adaptWhy = `${enemy.name} te saltará para ejecutarte: el escudo salvavidas te permite sobrevivir el combo inicial.`;
        } else if (tid === 'tank' || tid === 'engage') {
          adaptItem = enemy.dmg === 'AP' ? 6665 : 3143;
          adaptLabel = enemy.dmg === 'AP' ? 'Anti-Magia (Rookern)' : 'Anti-Crítico (Randuin)';
          adaptWhy = `${enemy.name} entra con daño explosivo: absorbe el impacto con defensas pesadas especializadas.`;
        } else {
          adaptItem = 6333;
          adaptLabel = 'Anti-Burst (Danza de la Muerte)';
          adaptWhy = `${enemy.name} inflige burst rápido: parte del daño recibido se difiere en el tiempo para no morir al instante.`;
        }
      } else if (primaryArch === 'POKE') {
        if (ch.dmg === 'AP') {
          adaptItem = 3102;
          adaptLabel = 'Anti-Poke (Banshee)';
          adaptWhy = `${enemy.name} desgasta a distancia: el escudo de hechizos absorbe la primera habilidad sin recibir daño.`;
        } else if (tid === 'tank' || tid === 'engage') {
          adaptItem = 6665;
          adaptLabel = 'Anti-Poke (Rookern)';
          adaptWhy = `${enemy.name} hostiga con magia: regenera un escudo mágico cada pocos segundos fuera de combate.`;
        } else {
          adaptItem = 3814;
          adaptLabel = 'Anti-Poke (Filo de la Noche)';
          adaptWhy = `${enemy.name} tiene proyectiles de hostigamiento: el escudo pasivo bloquea su primer hechizo.`;
        }
      } else if (primaryArch === 'CC') {
        if (tid === 'enchanter') {
          adaptItem = 3222;
          adaptLabel = 'Anti-CC (Mikael)';
          adaptWhy = `${enemy.name} encadena control de masas: purifica aturdimientos y salva a tus aliados con Bendición de Mikael.`;
        } else {
          boots = 3111;
          adaptItem = ch.dmg === 'AP' ? 3102 : 3156;
          adaptLabel = 'Anti-CC (Tenacidad)';
          adaptWhy = `${enemy.name} tiene control de masas pesado: reduce la duración de aturdimientos y ralentizaciones.`;
        }
      }

      if (adaptItem && coreSteps.length >= 4) {
        const existingIdx = coreSteps.findIndex((s) => s.item === adaptItem);
        if (existingIdx >= 0) {
          coreSteps[existingIdx] = {
            ...coreSteps[existingIdx],
            label: `Adaptación: ${adaptLabel}`,
            why: adaptWhy,
            adapted: adaptLabel,
          };
        } else {
          const replaceIdx = (primaryArch === 'TANK' || primaryArch === 'HEALER') && coreSteps.length >= 3 ? 2 : 3;
          coreSteps[replaceIdx] = {
            item: adaptItem,
            label: `Adaptación: ${adaptLabel}`,
            why: adaptWhy,
            adapted: adaptLabel,
          };
        }
      }
    }
  }

  let acc = 0;
  const path: PathStep[] = coreSteps.slice(0, 6).map((st, i) => {
    const cost = itemCost(st.item);
    acc += cost;
    return {
      slot: i + 1,
      item: st.item,
      cost,
      cumulative: acc,
      label: st.label,
      why: st.why,
      adapted: st.adapted,
    };
  });

  let tactical: TacticalComponent | null = null;
  const threat = enemy ? sustainThreat(enemy) : null;
  if (enemy && threat) {
    const comp = antiHealComponent(ch, tid);
    tactical = {
      afterSlot: 1,
      item: comp,
      cost: itemCost(comp),
      enemy: enemy.name,
      threat,
      duo: role === 'adc' || role === 'support',
    };
  }

  const activeLabel =
    roleBuild?.label ??
    roleOverride?.label ??
    profile?.label ??
    BUILD_OVERRIDES[champId]?.label ??
    `${ch.name} · ${role.toUpperCase()}`;

  return {
    label: activeLabel,
    first3,
    priority,
    runes,
    start,
    firstBack,
    boots,
    core: coreSteps.map((c) => c.item),
    spells,
    templateId: tid,
    levels: levelOrder(first3, priority),
    situational: generateSituationalItems(
      ch,
      role,
      tid,
      coreSteps.map((c) => c.item),
    ),
    path,
    tactical,
  };
}

export interface MatchupInfo {
  wr: number;
  label: string;
  tone: 'good' | 'even' | 'bad';
  tips: string[];
}

const ICONIC_MATCHUPS: Record<string, { wr: number; label: string; tone: 'good' | 'even' | 'bad'; tips: string[] }> = {
  'Ahri-Yone': {
    wr: 52.4,
    label: 'Favorable con Kiteo',
    tone: 'good',
    tips: [
      'Guarda tu E (Encanto) exclusivamente para interrumpir el avance de su E (Alma Desatada) o Q3 (Tornado desplazador).',
      'Primer Back (1.500g): Prioriza Capítulo Perdido para pokeo infinito con Q y Botas para esquivar sus tornados sin gastar Flash.',
      'Power Spike 1 (Malicia): Al alcanzar nivel 6 con Malicia, kitea su definitiva (Destino Sellado) con los dashes de tu R (Espíritu Salvaje).',
      'Power Spike 2 (Llama Sombría): Los impactos críticos mágicos ejecutan a Yone a través del escudo que genera su W.',
      'Ítem Situacional: Construye Reloj de Arena de Zhonya (4º objeto) para anular su engage en teamfights tardías, o Perdición del Liche para burst ofensivo.',
    ],
  },
  'Yone-Ahri': {
    wr: 47.6,
    label: 'Desafiante con Espaciado',
    tone: 'bad',
    tips: [
      'Esquiva su Q (Orbe del Engaño) moviéndote en diagonal; nunca uses tu E (Alma Desatada) en línea recta si Ahri tiene su E (Encanto) disponible.',
      'Primer Back (1.300g): Compra Grebas de Berserker tempranas para reducir el tiempo de lanzamiento de tu Q y W y esquivar su pokeo.',
      'Nivel 6: Ahri tiene 3 dashes con R; no gastes tu Destino Sellado (R) hasta haberla forzado a quemar su definitiva.',
      'Ítem Situacional: Fauces de Malmortius o Filo del Infinito; un escudo mágico temprano evita que Ahri te ejecute de un combo.',
      'Teamfights: Flanquea desde la niebla de guerra para atraparla en espacios cerrados donde sus dashes no tengan vía de escape.',
    ],
  },
  'Darius-Garen': {
    wr: 53.5,
    label: 'Favorable por Hemorragia',
    tone: 'good',
    tips: [
      'Espaciado con Q (Diezmar): Conecta siempre el borde exterior de tu hacha para curarte y aplicar Hemorragia cuando Garen active su Q (Golpe Decisivo).',
      'Primer Back (1.100g - 1.300g): Bacteriófago o Tiamat + Botas para evitar que Garen active su pasiva (Perseverancia) tras cada trade.',
      'Pico de Nivel 6: Acumula las 5 marcas de Fuerza Noxiana antes de tirar Guillotina Noxiana (R); usa Barrera/Flash si intenta silenciarte con vida baja.',
      'Ítem Situacional: Quijotes Blindados y Cota de Espinas para anular el daño de su Juicio (E) y cortar su regeneración.',
      'Teamfights: Actúa como el coloso principal del equipo; si logras un reseteo con R sobre Garen, arrasarás la frontline rival.',
    ],
  },
  'Jinx-Lucian': {
    wr: 51.8,
    label: 'Favorable por Escalado',
    tone: 'good',
    tips: [
      'Rango de Cohetes (Q): Castiga a Lucian desde la distancia máxima de Carapescado cada vez que intente dar el último golpe a un súbdito.',
      'Primer Back (1.300g): Espadón o componentes de daño puro para igualar el intercambio en ráfaga de su combo temprano con pasiva.',
      'Nivel 6: Guarda tus ¡Mascafuegos! (E) para colocarlos detrás de ti cuando Lucian use su dash hacia adelante, y remata con tu R a distancia.',
      'Ítem Situacional: Arcoescudo Inmortal o Ángel Guardián en 4to objeto para sobrevivir si Lucian flanquea con El Sacrificio (R).',
      'Condición de Victoria: Superas ampliamente a Lucian a partir del minuto 20; farmea seguro y tus cohetes en área ganarán las peleas 5v5.',
    ],
  },
  'LeeSin-Viego': {
    wr: 52.8,
    label: 'Favorable en Duelo Temprano',
    tone: 'good',
    tips: [
      'Presión en Niveles 1 al 3: Invade la jungla de Viego en su segundo buff o disputa el Escurridizo; tu combo de Q + electrocutar/conquistador supera su daño base.',
      'Primer Back (1.100g): Diente de Serrín (Dirk) o Tiamat para acelerar tu limpieza y buscar escaramuzas agresivas en el río.',
      'Nivel 6: Guarda Furia del Dragón (R) para patear a Viego lejos si intenta usar su posesión de alma, o patéalo hacia tu equipo para eliminarlo al instante.',
      'Ítem Situacional: Llamada del Verdugo temprana y Danza de la Muerte para resistir su daño continuo y cortar su curación pasiva.',
      'Teamfights: Protege a tus tiradores usando tu R como desenganche si Viego intenta saltar con Rompecorazones.',
    ],
  },
  'Aatrox-Fiora': {
    wr: 47.2,
    label: 'Desafiante (Bait de Réplica)',
    tone: 'bad',
    tips: [
      'Guarda tu E (Deslizamiento) para reposicionar tus impactos de Q fuera de su W (Réplica); si Fiora predice tu Q3 con su réplica, te aturdirá de inmediato.',
      'Primer Back (1.000g - 1.200g): Quijotes Blindados tempranos para reducir en 12% el daño de sus ataques a puntos vitales.',
      'Pico de Nivel 6: Cuando Fiora active Gran Duelo (R), pégate a un muro para taparle el cuarto punto vital y mantén tu R activa para regenerarte.',
      'Ítem Situacional: Chaleco de Zarzas / Espada Sierra Chempunk para cortar de raíz el robo de vida de su hidra.',
      'Teamfights: Tu presencia en peleas de 5v5 es inmensamente superior a la de Fiora; agrupa con tu equipo mientras ella se ve forzada a empujar en solitario.',
    ],
  },
  'Thresh-Blitzcrank': {
    wr: 51.5,
    label: 'Favorable con Despellejar',
    tone: 'good',
    tips: [
      'Juega detrás de la oleada de súbditos; usa tu Linterna (W) inmediatamente para rescatar a tu ADC si Blitzcrank conecta un gancho.',
      'Despellejar (E): Lanza tu E hacia atrás cuando Blitzcrank corra con Sobremarcha (W) para cortar su avance antes de que golpee con su E.',
      'Primer Back (900g): Quijotes Blindados y Lente del Oráculo para denegar su control de visión en los arbustos de la bot lane.',
      'Nivel 6: La Caja (R) divide la zona de pelea y ralentiza a Blitzcrank en un 99%, dejándolo vulnerable al daño de tu tirador.',
      'Ítem Situacional: Promesa del Caballero (2do objeto) para transferir daño de tu tirador y Relicario de los Solari para amortiguar el silencio de su R.',
    ],
  },
  'Caitlyn-Vayne': {
    wr: 53.8,
    label: 'Muy Favorable por Rango',
    tone: 'good',
    tips: [
      'Abuso de Alcance (650): Castiga a Vayne cada vez que intente dar un básico a un súbdito; coloca trampas (W) en sus caminos de escape habituales.',
      'Primer Back (1.300g): Espadón para amplificar la presión de placas de torre y castigar su pobre limpieza de oleadas.',
      'Nivel 6: Vayne buscará all-in con Hora Final (R); guarda tu Red de Calibre 90 (E) para distanciarte inmediatamente y coloca trampas bajo tus pies.',
      'Ítem Situacional: Cañón de Fuego Rápido para golpearla fuera de su alcance de respuesta, y Recordatorio Mortal para cortar su robo de vida.',
      'Condición de Victoria: Tira la primera torre antes del minuto 14 y traslada tu ventaja de oro a las otras líneas para cerrar antes de su escalado tardío.',
    ],
  },
  'Leona-Nautilus': {
    wr: 50.8,
    label: 'Duelo Parejo de Iniciación',
    tone: 'even',
    tips: [
      'Foco en el ADC: Si Nautilus engancha a tu ADC, no le pegues a él; salta con tu Hoja del Cénit (E) directamente sobre su tirador enemigo.',
      'Eclipse (W): Activa siempre tu W antes de entrar en rango de su golpe pasivo para mitigar el 30%+ del daño inicial del rival.',
      'Primer Back: Quijotes Blindados y Rubí de Cristal para ganar el duelo de resistencia en el primer 2v2 completo.',
      'Nivel 6: Llamarada Solar (R) tiene mayor alcance que la definitiva de Nautilus; úsala como iniciación a distancia sobre su carry descolocado.',
      'Ítem Situacional: Relicario de los Solari de Hierro y Convergencia de Zeke para potenciar el daño de tu tirador en cada iniciación con R.',
    ],
  },
  'Sylas-Akali': {
    wr: 51.0,
    label: 'Duelo de Asesinato y Sustain',
    tone: 'even',
    tips: [
      'Robo de Definitiva: Robar Ejecución Perfecta (R) de Akali te otorga dos desplazamientos masivos con micro-aturdimiento y daño por ejecución.',
      'Bomba de Humo (W): Cuando Akali use su Velo del Crepúsculo, no persigas a ciegas dentro del humo; lanza tu Q al centro para desgastarla y espera a que expire.',
      'Primer Back (1.200g): Capítulo Perdido o Foco del Maleficio para mantener la regeneración de maná y resistir su burst mágico con Matarreyes (W).',
      'Nivel 6: Guarda tu W para curarte cuando tu vida baje del 40%, dando la vuelta al all-in cuando Akali intente ejecutarte con R2.',
      'Ítem Situacional: Reloj de Arena de Zhonya para esquivar el segundo impacto de su R2 y Morellonomicón para cortar su regeneración.',
    ],
  },
};

export function matchup(myId: string, enemyId: string | null, roleHint?: Role): MatchupInfo | null {
  if (!enemyId || !CHAMP_BY_ID[myId] || !CHAMP_BY_ID[enemyId]) return null;
  const me = CHAMP_BY_ID[myId];
  const en = CHAMP_BY_ID[enemyId];
  const role = roleHint ?? me.roles[0];
  const tid = templateFor(me, role);

  const pairKey = `${myId}-${enemyId}`;
  if (ICONIC_MATCHUPS[pairKey]) {
    return ICONIC_MATCHUPS[pairKey];
  }

  const myProfile = CHAMPION_PROFILES[myId];
  const delta = pairHash(myId, enemyId) * 3.2 + (me.early - en.early) * 0.6 + (me.late - en.late) * 0.3;
  const wr = Math.max(42, Math.min(58, 50 + delta));
  const tone = wr >= 51.5 ? 'good' : wr <= 48.5 ? 'bad' : 'even';
  const label =
    wr >= 53.0
      ? 'Favorable con Presión'
      : wr >= 51.5
        ? 'Favorable con Control'
        : wr <= 47.0
          ? 'Desfavorable (Bajo Torre)'
          : wr <= 48.5
            ? 'Difícil (Respetar All-In)'
            : 'Duelo Parejo por Habilidad';

  // 5 Consejos Pedagógicos Profundos
  const tips: string[] = [];
  const myMainSkill = myProfile?.priority[0] ?? 'Q';

  // 1. Dinámica de trade y enfriamientos
  if (en.traits.includes('assassin') || en.traits.includes('burst')) {
    tips.push(
      `Respeta la ventana de burst de ${en.name} cuando tenga habilidades disponibles. Castiga con tu ${myMainSkill} cada vez que gaste su salto o falle su habilidad principal, sin exponerte a su rotación letal.`
    );
  } else if (en.traits.includes('tank') || en.traits.includes('engage')) {
    tips.push(
      `Evita intercambios prolongados cuerpo a cuerpo. Utiliza el rango y espaciado de tu ${myMainSkill} para desgastarlo gradualmente y no permitas que encadene su control de masas (${en.hardCC.toFixed(1)}s CC).`
    );
  } else if (en.traits.includes('heal') || sustainThreat(en)) {
    tips.push(
      `Los intercambios cortos y explosivos son tu prioridad: la regeneración continua de ${en.name} le dará ventaja si alargas la pelea sin Heridas Graves. Conecta ${myMainSkill} y retrocede.`
    );
  } else if (en.traits.includes('poke')) {
    tips.push(
      `Muévete en ángulo diagonal para esquivar los proyectiles de ${en.name}. No te sitúes detrás de súbditos con poca vida y busca castigar con ${myMainSkill} cuando falle su habilidad clave.`
    );
  } else if (en.traits.includes('hypercarry')) {
    tips.push(
      `Aprovecha tus ventajas tempranas para presionar la oleada y negarle súbditos a ${en.name}. Congela la línea cerca de tu torre antes de que alcance sus picos de objetos tardíos.`
    );
  } else {
    tips.push(
      `Prioriza los intercambios de daño con tu ${myMainSkill} cuando ${en.name} se acerque a dar el último golpe a un súbdito canon, castigando su posicionamiento con ventaja de súbditos a tu favor.`
    );
  }

  // 2. Primer Back y control de oleadas
  const firstBackIds = myProfile?.firstBack ?? (me.dmg === 'AP' ? [3802, 1001] : [1001]);
  const firstBackNames = firstBackIds.map((id) => `'${item(id).name}'`).join(' y ');
  tips.push(
    `Primer Back (~1.100g - 1.400g): Prioriza volver a base para comprar ${firstBackNames}. Esto estabiliza tu maná/daño y te da velocidad para esquivar habilidades de ${en.name} sin gastar Flash.`
  );

  // 3. Power Spike de Nivel 6
  if (en.hardCC >= 2 || en.traits.includes('engage')) {
    tips.push(
      `Pico de Nivel 6: La definitiva de ${en.name} tiene un impacto de control decisivo. No uses tus habilidades de desplazamiento/escape de forma agresiva antes de ver su animación de definitiva.`
    );
  } else if (en.traits.includes('burst') || en.traits.includes('assassin')) {
    tips.push(
      `Pico de Nivel 6: ${en.name} buscará el all-in letal en cuanto alcance nivel 6; mantén tu vida por encima del 70% o pulsa 'B' para reiniciar la línea con ventaja de compras.`
    );
  } else if (me.early >= 4) {
    tips.push(
      `Pico de Nivel 6: Cuentas con una gran ventaja de daño temprano; desgasta a ${en.name} al 60% de vida y ejecuta tu combo completo con Definitiva para forzar su Flash o asegurar la baja.`
    );
  } else {
    tips.push(
      `Pico de Nivel 6: Coordina con tu jungla la llegada del nivel 6; combina tu definitiva con el daño aliado para asegurar la primera baja o asegurar la prioridad para Dragón/Heraldo.`
    );
  }

  // 4. Adaptación de Ítems Situacional
  if (en.traits.includes('heal') || sustainThreat(en)) {
    const compName = me.dmg === 'AP' ? 'Orbe del Olvido' : tid === 'tank' ? 'Chaleco de Zarzas' : 'Llamada del Verdugo';
    tips.push(
      `Adaptación Situacional: ${en.name} abusa de la regeneración; adquiere '${compName}' temprano y completa tu ítem anti-curación en tu 3er hueco para anular sus peleas prolongadas.`
    );
  } else if (en.traits.includes('tank')) {
    const penName = me.dmg === 'AP' ? 'Tormento de Liandry / Báculo del Vacío' : 'Cuchilla Negra / Lord Dominik';
    tips.push(
      `Adaptación Situacional: Frente a las resistencias de ${en.name}, tu ruta incorpora ${penName} para derretir su armadura y vida en peleas de equipo.`
    );
  } else if (en.traits.includes('assassin') || en.traits.includes('burst')) {
    const defName = me.dmg === 'AP' ? 'Reloj de Arena de Zhonya' : 'Danza de la Muerte / Arcoescudo';
    tips.push(
      `Adaptación Situacional: Para sobrevivir el burst letal de ${en.name}, tu ruta incluye ${defName} como objeto defensivo reactivo para anular su asesinato.`
    );
  } else if (en.traits.includes('poke')) {
    const pokeName = me.dmg === 'AP' ? 'Velo de la Banshee' : 'Filo de la Noche';
    tips.push(
      `Adaptación Situacional: Para neutralizar el asedio a distancia de ${en.name}, tu build adapta ${pokeName} para absorber el primer impacto con su escudo de hechizos.`
    );
  } else {
    tips.push(
      `Adaptación Situacional: Ajusta tus defensas frente al daño de ${en.name} (${en.dmg}) con botas reactivas (${en.dmg === 'AP' ? 'Botas de Mercurio' : 'Quijotes Blindados'}) para ganar cada trade.`
    );
  }

  // 5. Condición de Victoria y Teamfights
  if (me.arch.includes('split')) {
    tips.push(
      `Condición de Victoria: Tu mayor fortaleza es la presión lateral (split-push); fuerza a ${en.name} a responderte en las bandas laterales mientras tu equipo disputa objetivos mayores.`
    );
  } else if (me.arch.includes('teamfight')) {
    tips.push(
      `Condición de Victoria: Tu impacto brilla en peleas de 5v5; agrupa en objetivos de Dragón y Barón, donde tu daño o control de masas en área supera con creces el juego individual de ${en.name}.`
    );
  } else if (me.arch.includes('pick')) {
    tips.push(
      `Condición de Victoria: Controla la visión del río y prepara emboscadas en la niebla de guerra; elimina a objetivos descolocados antes de que ${en.name} pueda iniciar o asistir a su equipo.`
    );
  } else if (me.arch.includes('poke')) {
    tips.push(
      `Condición de Victoria: Asedia a distancia y desgasta al equipo rival antes de iniciar peleas; no permitas que ${en.name} fuerce peleas cuerpo a cuerpo sin haber recibido daño previo.`
    );
  } else {
    tips.push(
      `Condición de Victoria: Juega alrededor de tus picos de 2 y 3 objetos; protege a tus tiradores y controla el tempo de los objetivos neutrales.`
    );
  }

  return { wr, label, tone, tips: tips.slice(0, 5) };
}
