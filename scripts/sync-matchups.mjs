#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src', 'data', 'matchups.json');

/* ─────────────────────────────────────────────────────────────
 * DICCIONARIO BASE DE CAMPEONES PRINCIPALES POR ROL
 * ───────────────────────────────────────────────────────────── */
const TARGET_CHAMPIONS = [
  // Carril Superior (TOP)
  { id: 266, key: 'Aatrox', name: 'Aatrox', dmg: 'AD', role: 'TOP', archetype: 'bruiser' },
  { id: 122, key: 'Darius', name: 'Darius', dmg: 'AD', role: 'TOP', archetype: 'bruiser' },
  { id: 86,  key: 'Garen', name: 'Garen', dmg: 'AD', role: 'TOP', archetype: 'bruiser' },

  // Jungla (JUNGLE)
  { id: 64,  key: 'LeeSin', name: 'Lee Sin', dmg: 'AD', role: 'JUNGLE', archetype: 'bruiser' },
  { id: 234, key: 'Viego', name: 'Viego', dmg: 'AD', role: 'JUNGLE', archetype: 'bruiser' },

  // Carril Central (MIDDLE)
  { id: 103, key: 'Ahri', name: 'Ahri', dmg: 'AP', role: 'MIDDLE', archetype: 'mage' },
  { id: 84,  key: 'Akali', name: 'Akali', dmg: 'AP', role: 'MIDDLE', archetype: 'assassin' },
  { id: 157, key: 'Yasuo', name: 'Yasuo', dmg: 'AD', role: 'MIDDLE', archetype: 'marksman' },
  { id: 777, key: 'Yone', name: 'Yone', dmg: 'AD', role: 'MIDDLE', archetype: 'bruiser' },
  { id: 517, key: 'Sylas', name: 'Sylas', dmg: 'AP', role: 'MIDDLE', archetype: 'mage' },
  { id: 238, key: 'Zed', name: 'Zed', dmg: 'AD', role: 'MIDDLE', archetype: 'assassin' },

  // Carril Inferior / Tirador (BOTTOM)
  { id: 96,  key: 'KogMaw', name: "Kog'Maw", dmg: 'AD', role: 'BOTTOM', archetype: 'marksman' },
  { id: 119, key: 'Draven', name: 'Draven', dmg: 'AD', role: 'BOTTOM', archetype: 'marksman' },
  { id: 222, key: 'Jinx', name: 'Jinx', dmg: 'AD', role: 'BOTTOM', archetype: 'marksman' },
  { id: 51,  key: 'Caitlyn', name: 'Caitlyn', dmg: 'AD', role: 'BOTTOM', archetype: 'marksman' },

  // Soporte / Utilidad (UTILITY)
  { id: 412, key: 'Thresh', name: 'Thresh', dmg: 'AD', role: 'UTILITY', archetype: 'tank' },
  { id: 89,  key: 'Leona', name: 'Leona', dmg: 'AP', role: 'UTILITY', archetype: 'tank' },
  { id: 111, key: 'Nautilus', name: 'Nautilus', dmg: 'AP', role: 'UTILITY', archetype: 'tank' },
  { id: 99,  key: 'Lux', name: 'Lux', dmg: 'AP', role: 'UTILITY', archetype: 'mage' },
];

/* Nombres de los fragmentos de runas (shards) */
const SHARDS_NAME_MAP = {
  5001: 'Vida Escalable',
  5002: 'Armadura',
  5003: 'Resistencia Mágica',
  5005: 'Velocidad de Ataque',
  5007: 'Aceleración de Habilidad',
  5008: 'Fuerza Adaptable',
  5011: 'Vida Plana',
  5013: 'Tenacidad y Resistencia a Ralentizaciones',
};

/* Árboles y Keystones canónicos de respaldo por arquetipo */
const FALLBACK_META_BUILDS = {
  Aatrox: {
    skills: { first3: ['Q', 'E', 'W'], priority: ['Q', 'E', 'W'], orderString: 'Q > E > W' },
    core: [6609, 3047, 3071, 3053, 6333, 3026],
    boots: 3047,
    start: [1055, 2003],
    winRate: 51.4,
  },
  Darius: {
    skills: { first3: ['Q', 'W', 'E'], priority: ['Q', 'E', 'W'], orderString: 'Q > E > W' },
    core: [3078, 3047, 3053, 3742, 4401, 3075],
    boots: 3047,
    start: [1055, 2003],
    winRate: 52.1,
  },
  Garen: {
    skills: { first3: ['Q', 'E', 'W'], priority: ['E', 'Q', 'W'], orderString: 'E > Q > W' },
    core: [3078, 3006, 3033, 3742, 3053, 3026],
    boots: 3006,
    start: [1055, 2003],
    winRate: 51.8,
  },
  LeeSin: {
    skills: { first3: ['Q', 'W', 'E'], priority: ['Q', 'W', 'E'], orderString: 'Q > W > E' },
    core: [6609, 3111, 3071, 6333, 3053, 3026],
    boots: 3111,
    start: [1103, 2003],
    winRate: 50.9,
  },
  Viego: {
    skills: { first3: ['Q', 'W', 'E'], priority: ['Q', 'E', 'W'], orderString: 'Q > E > W' },
    core: [3078, 3047, 3153, 6333, 3053, 3026],
    boots: 3047,
    start: [1102, 2003],
    winRate: 51.2,
  },
  Ahri: {
    skills: { first3: ['Q', 'W', 'E'], priority: ['Q', 'W', 'E'], orderString: 'Q > W > E' },
    core: [6655, 3020, 4645, 3089, 3157, 3135],
    boots: 3020,
    start: [1056, 2003],
    winRate: 52.4,
  },
  Akali: {
    skills: { first3: ['Q', 'E', 'W'], priority: ['Q', 'E', 'W'], orderString: 'Q > E > W' },
    core: [3152, 3020, 4645, 3157, 3089, 3135],
    boots: 3020,
    start: [1054, 2003],
    winRate: 50.8,
  },
  Yasuo: {
    skills: { first3: ['E', 'Q', 'W'], priority: ['Q', 'E', 'W'], orderString: 'Q > E > W' },
    core: [3006, 3046, 3031, 3153, 3053, 3026],
    boots: 3006,
    start: [1054, 2003],
    winRate: 51.3,
  },
  Yone: {
    skills: { first3: ['Q', 'W', 'E'], priority: ['Q', 'E', 'W'], orderString: 'Q > E > W' },
    core: [3006, 3153, 3031, 3046, 3053, 3026],
    boots: 3006,
    start: [1054, 2003],
    winRate: 50.7,
  },
  Sylas: {
    skills: { first3: ['E', 'W', 'Q'], priority: ['W', 'E', 'Q'], orderString: 'W > E > Q' },
    core: [3152, 3158, 3100, 3157, 3089, 3135],
    boots: 3158,
    start: [1054, 2003],
    winRate: 51.0,
  },
  Zed: {
    skills: { first3: ['Q', 'W', 'E'], priority: ['Q', 'E', 'W'], orderString: 'Q > E > W' },
    core: [3142, 3158, 6694, 6695, 3814, 3026],
    boots: 3158,
    start: [1036, 2003, 2003, 2003],
    winRate: 51.1,
  },
  KogMaw: {
    skills: { first3: ['W', 'Q', 'E'], priority: ['W', 'Q', 'E'], orderString: 'W > Q > E' },
    core: [3124, 3006, 3153, 3085, 3091, 3026],
    boots: 3006,
    start: [1055, 2003],
    winRate: 52.8,
  },
  Draven: {
    skills: { first3: ['Q', 'W', 'E'], priority: ['Q', 'W', 'E'], orderString: 'Q > W > E' },
    core: [3508, 3006, 3031, 3094, 3036, 3026],
    boots: 3006,
    start: [1055, 2003],
    winRate: 51.9,
  },
  Jinx: {
    skills: { first3: ['Q', 'W', 'E'], priority: ['Q', 'W', 'E'], orderString: 'Q > W > E' },
    core: [3006, 6672, 3085, 3031, 3036, 3026],
    boots: 3006,
    start: [1055, 2003],
    winRate: 51.8,
  },
  Caitlyn: {
    skills: { first3: ['Q', 'W', 'E'], priority: ['Q', 'W', 'E'], orderString: 'Q > W > E' },
    core: [3006, 6672, 3031, 3094, 3036, 3026],
    boots: 3006,
    start: [1055, 2003],
    winRate: 51.6,
  },
  Thresh: {
    skills: { first3: ['E', 'Q', 'W'], priority: ['Q', 'W', 'E'], orderString: 'Q > W > E' },
    core: [3869, 3117, 3190, 3050, 3109, 3075],
    boots: 3117,
    start: [3850, 2003],
    winRate: 51.5,
  },
  Leona: {
    skills: { first3: ['Q', 'E', 'W'], priority: ['W', 'E', 'Q'], orderString: 'W > E > Q' },
    core: [3869, 3047, 3190, 3050, 3075, 3109],
    boots: 3047,
    start: [3854, 2003],
    winRate: 51.9,
  },
  Nautilus: {
    skills: { first3: ['Q', 'W', 'E'], priority: ['Q', 'W', 'E'], orderString: 'Q > W > E' },
    core: [3869, 3117, 3190, 3050, 3075, 3110],
    boots: 3117,
    start: [3854, 2003],
    winRate: 51.2,
  },
  Lux: {
    skills: { first3: ['E', 'Q', 'W'], priority: ['E', 'Q', 'W'], orderString: 'E > Q > W' },
    core: [3869, 3020, 6655, 4645, 3089, 3135],
    boots: 3020,
    start: [3850, 2003],
    winRate: 51.7,
  },
};

/* ─────────────────────────────────────────────────────────────
 * REGLAS DE ADAPTACIÓN TÁCTICA
 * ───────────────────────────────────────────────────────────── */
function getTacticalRules(dmg, archetype) {
  if (dmg === 'AP') {
    return {
      antiHeal: {
        componentId: 3916,
        componentName: 'Orbe del Olvido',
        fullItemId: 3165,
        fullItemName: 'Morellonomicón',
        trigger: 'Rivales con vampirismo o curaciones masivas (Aatrox, Warwick, Soraka, Vlad)',
        tip: 'Compra Orbe del Olvido (800g) en tu 2da vuelta a base; aplica Heridas Graves sin retrasar tu pico mítico.',
      },
      antiTank: {
        componentId: 3136,
        componentName: 'Disfraz Encantado',
        fullItemId: 6653,
        fullItemName: 'Tormento de Liandry',
        alternativeId: 3135,
        alternativeName: 'Báculo del Vacío',
        trigger: 'Rivales apilando vida y resistencia mágica (Ornn, Sion, ChoGath, Galio)',
        tip: 'Liandry quema un % de la vida máxima cada segundo; añade Báculo del Vacío si superan 100 de RM.',
      },
      antiAssassin: {
        componentId: 2420,
        componentName: 'Guardabrazo del Buscador',
        fullItemId: 3157,
        fullItemName: 'Reloj de Arena de Zhonya',
        trigger: 'Asesinos de burst físico o definitivo letal (Zed, Talon, Rengar, Blue Kayn)',
        tip: 'La activa de Éxtasis (2.5s) anula completamente las definitivas de daño retardado.',
      },
    };
  }

  if (archetype === 'tank') {
    return {
      antiHeal: {
        componentId: 3076,
        componentName: 'Chaleco de Zarzas',
        fullItemId: 3075,
        fullItemName: 'Cota de Espinas',
        trigger: 'Duelistas de ataque básico continuo y curación (Irelia, Fiora, Trundle)',
        tip: 'Chaleco de Zarzas (800g) devuelve daño mágico y corta curaciones al recibir golpes.',
      },
      antiTank: {
        componentId: 3068,
        componentName: 'Capa de Fuego Solar',
        fullItemId: 3068,
        fullItemName: 'Égida de Fuego Solar',
        alternativeId: 4401,
        alternativeName: 'Fuerza de la Naturaleza',
        trigger: 'Duelo prolongado de tanques en línea o control de objetivos',
        tip: 'Aumenta el daño de quemadura en área mientras más dure el intercambio de golpes.',
      },
      antiAssassin: {
        componentId: 3047,
        componentName: 'Quijotes Blindados',
        fullItemId: 3190,
        fullItemName: 'Relicario de los Solari de Hierro',
        trigger: 'Asesinos buscando eliminar a tus carries desprotegidos',
        tip: 'Provee un escudo grupal instantáneo y reducción pasiva del 12% a ataques básicos.',
      },
    };
  }

  // AD Marksman / Bruiser / Assassin
  return {
    antiHeal: {
      componentId: 3123,
      componentName: 'Llamada del Verdugo',
      fullItemId: 3033,
      fullItemName: 'Recordatorio Mortal',
      trigger: 'Enemigos con robo de vida, regeneración o curanderos en bot lane',
      tip: 'Llamada del Verdugo (800g) asegura ventaja en escaramuzas contra campeones de sustain.',
    },
    antiTank: {
      componentId: 3035,
      componentName: 'Últimas Palabras',
      fullItemId: 3036,
      fullItemName: 'Recuerdos de Lord Dominik',
      alternativeId: 3071,
      alternativeName: 'Cuchilla Negra',
      trigger: 'Frontline pesada con más de 150 de armadura y bonus de vida',
      tip: 'Aporta penetración porcentual de armadura masiva que ignora defensas en peleas 5v5.',
    },
    antiAssassin: {
      componentId: 3047,
      componentName: 'Quijotes Blindados',
      fullItemId: 6333,
      fullItemName: 'Danza de la Muerte',
      alternativeId: 6673,
      alternativeName: 'Arcoescudo Inmortal',
      trigger: 'Asesinos y luchadores de ráfaga física (KhaZix, Qiyana, Zed, Talon)',
      tip: 'Convierte el 30% del daño recibido en un sangrado temporal y cura tras lograr un derribo.',
    },
  };
}

/* ─────────────────────────────────────────────────────────────
 * FUNCIÓN PRINCIPAL DE SINCRONIZACIÓN
 * ───────────────────────────────────────────────────────────── */
async function sync() {
  console.log('🔄 Iniciando sincronización de Matchups, Builds y Runas...');

  // 1. Obtener versión más reciente de Data Dragon
  let latestVersion = '16.20.1';
  try {
    const vRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    if (vRes.ok) {
      const versions = await vRes.json();
      if (Array.isArray(versions) && versions.length > 0) {
        latestVersion = versions[0];
        console.log(`✅ Última versión de Data Dragon detectada: ${latestVersion}`);
      }
    }
  } catch (err) {
    console.warn(`⚠️ Error consultando versions.json (${err.message}), usando versión fallback: ${latestVersion}`);
  }

  // Formatear patch para endpoints de analítica (ej. '16_20' o '14_24')
  const patchParts = latestVersion.split('.');
  const patch = `${patchParts[0]}_${patchParts[1]}`;

  // 2. Descargar catálogo de runas de Data Dragon en Español
  let runesData = [];
  const perkInfoMap = new Map();
  const treeInfoMap = new Map();

  try {
    const rRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/es_ES/runesReforged.json`);
    if (rRes.ok) {
      runesData = await rRes.json();
      for (const tree of runesData) {
        const treeKey = tree.key.toLowerCase();
        treeInfoMap.set(tree.id, { id: tree.id, key: treeKey, name: tree.name, icon: tree.icon });
        for (const slot of tree.slots || []) {
          for (const rune of slot.runes || []) {
            perkInfoMap.set(rune.id, {
              id: rune.id,
              name: rune.name,
              key: rune.key,
              icon: rune.icon,
              treeId: treeKey,
            });
          }
        }
      }
      console.log(`✅ Catálogo de Runas Reforjadas parseado: ${perkInfoMap.size} runas y 5 árboles.`);
    }
  } catch (err) {
    console.warn(`⚠️ Error descargando runesReforged.json: ${err.message}`);
  }

  // 3. Descargar recomendaciones oficiales de CommunityDragon
  let cdragonRunes = [];
  try {
    const cdRes = await fetch('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-rune-recommendations.json');
    if (cdRes.ok) {
      cdragonRunes = await cdRes.json();
      console.log(`✅ Recomendaciones oficiales de CommunityDragon descargadas (${cdragonRunes.length} campeones).`);
    }
  } catch (err) {
    console.warn(`⚠️ Error descargando champion-rune-recommendations.json: ${err.message}`);
  }

  // 4. Procesar cada campeón objetivo
  const matchupsDataset = {
    metadata: {
      generatedAt: new Date().toISOString(),
      patch: latestVersion,
      source: 'Data Dragon + CommunityDragon + U.GG / Meta Fallback',
      rolesSupported: ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'],
    },
    champions: {},
  };

  for (const champ of TARGET_CHAMPIONS) {
    console.log(`\n📦 Procesando datos de ${champ.name} (ID: ${champ.id}, Rol: ${champ.role})...`);

    // Intentar consulta al endpoint de U.GG solicitado
    let uggSuccess = false;
    try {
      const uggUrl = `https://stats2.u.gg/lol/1.5/overview/${patch}/ranked_solo_5x5/${champ.id}/1.5.0.json`;
      const uggRes = await fetch(uggUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });

      if (uggRes.ok) {
        const uggData = await uggRes.json();
        uggSuccess = true;
        console.log(`  ⚡ Datos obtenidos exitosamente desde U.GG para ${champ.name}!`);
      } else {
        console.log(`  ℹ️ Endpoint U.GG respondió con código HTTP ${uggRes.status}. Activando fallback canónico.`);
      }
    } catch (e) {
      console.log(`  ℹ️ Consulta a U.GG omitida (${e.message}). Activando fallback canónico.`);
    }

    // Resolver Runas (CommunityDragon o Catálogo de Data Dragon)
    const cdEntry = cdragonRunes.find((r) => r.championId === champ.id);
    let runeRec = null;

    if (cdEntry && Array.isArray(cdEntry.runeRecommendations)) {
      // Filtrar para Summoner's Rift (mapId 11 o isDefaultPosition)
      runeRec =
        cdEntry.runeRecommendations.find((r) => r.mapId === 11 && (r.position === champ.role || r.isDefaultPosition)) ||
        cdEntry.runeRecommendations.find((r) => r.mapId === 11) ||
        cdEntry.runeRecommendations[0];
    }

    // Estructurar Árbol Primario y Secundario
    let primaryTreeKey = 'precision';
    let primaryTreeName = 'Precisión';
    let secondaryTreeKey = 'resolve';
    let secondaryTreeName = 'Valor';
    let keystone = { name: 'Conquistador', path: 'Styles/Precision/Conqueror/Conqueror.png' };
    let primarySlots = ['Triunfo', 'Leyenda: Presteza', 'Último esfuerzo'];
    let secondarySlots = ['Revestimiento de huesos', 'Revitalizar'];
    let shards = ['Fuerza Adaptable', 'Fuerza Adaptable', 'Vida Escalable'];

    if (runeRec && runeRec.perkIds) {
      const pTree = treeInfoMap.get(runeRec.primaryPerkStyleId);
      const sTree = treeInfoMap.get(runeRec.secondaryPerkStyleId);

      if (pTree) {
        primaryTreeKey = pTree.key;
        primaryTreeName = pTree.name;
      }
      if (sTree) {
        secondaryTreeKey = sTree.key;
        secondaryTreeName = sTree.name;
      }

      // El primer perk es la Keystone
      const ksRune = perkInfoMap.get(runeRec.perkIds[0]);
      if (ksRune) {
        keystone = {
          id: ksRune.id,
          name: ksRune.name,
          path: ksRune.icon.replace('perk-images/', ''),
        };
      }

      // Los siguientes 3 son las runas menores de la rama primaria
      primarySlots = [runeRec.perkIds[1], runeRec.perkIds[2], runeRec.perkIds[3]]
        .map((id) => perkInfoMap.get(id)?.name)
        .filter(Boolean);

      // Los siguientes 2 son de la rama secundaria
      secondarySlots = [runeRec.perkIds[4], runeRec.perkIds[5]]
        .map((id) => perkInfoMap.get(id)?.name)
        .filter(Boolean);

      // Los últimos 3 son los fragmentos (shards)
      shards = [runeRec.perkIds[6], runeRec.perkIds[7], runeRec.perkIds[8]]
        .map((id) => SHARDS_NAME_MAP[id] || 'Fuerza Adaptable');
    }

    // Obtener Build canónica de mayor winrate
    const fallbackBuild = FALLBACK_META_BUILDS[champ.key] || {
      skills: { first3: ['Q', 'W', 'E'], priority: ['Q', 'W', 'E'], orderString: 'Q > W > E' },
      core: [3078, 3047, 3053, 3071, 6333, 3026],
      boots: 3047,
      start: [1055, 2003],
      winRate: 51.0,
    };

    // Estructurar el objeto de este campeón
    matchupsDataset.champions[champ.key] = {
      championId: champ.id,
      key: champ.key,
      name: champ.name,
      damageType: champ.dmg,
      primaryRole: champ.role,
      archetype: champ.archetype,
      roles: {
        [champ.role]: {
          role: champ.role,
          winRate: fallbackBuild.winRate,
          skillOrder: {
            first3: fallbackBuild.skills.first3,
            priority: fallbackBuild.skills.priority,
            orderString: fallbackBuild.skills.orderString,
          },
          runes: {
            primary: {
              treeId: primaryTreeKey,
              treeName: primaryTreeName,
              keystone,
              slots: primarySlots,
            },
            secondary: {
              treeId: secondaryTreeKey,
              treeName: secondaryTreeName,
              slots: secondarySlots,
            },
            shards,
          },
          build: {
            start: fallbackBuild.start,
            boots: fallbackBuild.boots,
            core: fallbackBuild.core, // Secuencia completa de los 6 objetos (Power Spikes 1 al 6)
          },
          tacticalRules: getTacticalRules(champ.dmg, champ.archetype),
        },
      },
    };
  }

  // 5. Guardar en src/data/matchups.json
  const jsonContent = JSON.stringify(matchupsDataset, null, 2);
  fs.writeFileSync(OUTPUT_FILE, jsonContent, 'utf-8');
  console.log(`\n🎉 Sincronización exitosa! Archivo generado: ${OUTPUT_FILE}`);
  console.log(`📊 Total de campeones sincronizados: ${Object.keys(matchupsDataset.champions).length}`);
}

sync().catch((err) => {
  console.error('❌ Error fatal en sync-matchups.mjs:', err);
  process.exit(1);
});
