import type { Role } from '../types';

/**
 * URLs de Data Dragon (Riot Games) y CommunityDragon con resolución dinámica
 * del último parche activo.
 */
const CDN = 'https://ddragon.leagueoflegends.com';
const CD_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';
const STORAGE_KEY_VERSION = 'riot_ddragon_latest_version';

function getInitialVersion(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_VERSION);
      if (stored && stored.trim()) return stored.trim();
    } catch {
      // Ignorar fallo de localStorage
    }
  }
  // Parche reciente activo como fallback en lugar de versión estática antigua
  return '16.20.1';
}

let version = getInitialVersion();

/** Diccionario de ítems de CommunityDragon para fallbacks de temporada activa */
const cdItemIconMap = new Map<number, string>();

/** Coste total en oro por ítem resuelto desde Data Dragon (parche activo) */
const itemGoldMap = new Map<number, number>();

/** Mapeo estático inmediato de claves numéricas de Riot a IDs de campeón */
const STATIC_CHAMP_KEYS: Record<number, string> = {
  266: 'Aatrox', 103: 'Ahri', 84: 'Akali', 166: 'Akshan', 12: 'Alistar', 32: 'Amumu', 34: 'Anivia', 1: 'Annie',
  523: 'Aphelios', 22: 'Ashe', 136: 'AurelionSol', 893: 'Aurora', 268: 'Azir', 432: 'Bard', 200: 'Belveth',
  53: 'Blitzcrank', 63: 'Brand', 201: 'Braum', 233: 'Briar', 51: 'Caitlyn', 164: 'Camille', 69: 'Cassiopeia',
  31: 'Chogath', 42: 'Corki', 122: 'Darius', 131: 'Diana', 119: 'Draven', 36: 'DrMundo', 245: 'Ekko',
  60: 'Elise', 28: 'Evelynn', 81: 'Ezreal', 9: 'Fiddlesticks', 114: 'Fiora', 105: 'Fizz', 3: 'Galio',
  41: 'Gangplank', 86: 'Garen', 150: 'Gnar', 79: 'Gragas', 104: 'Graves', 887: 'Gwen', 120: 'Hecarim',
  74: 'Heimerdinger', 910: 'Hwei', 420: 'Illaoi', 39: 'Irelia', 427: 'Ivern', 40: 'Janna', 59: 'JarvanIV',
  24: 'Jax', 126: 'Jayce', 202: 'Jhin', 222: 'Jinx', 145: 'Kaisa', 429: 'Kalista', 43: 'Karma', 30: 'Karthus',
  38: 'Kassadin', 55: 'Katarina', 10: 'Kayle', 141: 'Kayn', 85: 'Kennen', 121: 'Khazix', 203: 'Kindred',
  240: 'Kled', 96: 'KogMaw', 897: 'KSante', 7: 'Leblanc', 64: 'LeeSin', 89: 'Leona', 876: 'Lillia',
  127: 'Lissandra', 236: 'Lucian', 117: 'Lulu', 99: 'Lux', 54: 'Malphite', 90: 'Malzahar', 57: 'Maokai',
  11: 'MasterYi', 902: 'Milio', 21: 'MissFortune', 62: 'MonkeyKing', 82: 'Mordekaiser', 25: 'Morgana',
  950: 'Naafiri', 267: 'Nami', 75: 'Nasus', 111: 'Nautilus', 518: 'Neeko', 76: 'Nidalee', 895: 'Nilah',
  56: 'Nocturne', 20: 'Nunu', 2: 'Olaf', 61: 'Orianna', 516: 'Ornn', 80: 'Pantheon', 78: 'Poppy',
  555: 'Pyke', 246: 'Qiyana', 133: 'Quinn', 497: 'Rakan', 33: 'Rammus', 421: 'RekSai', 526: 'Rell',
  888: 'Renata', 58: 'Renekton', 107: 'Rengar', 92: 'Riven', 68: 'Rumble', 13: 'Ryze', 360: 'Samira',
  113: 'Sejuani', 235: 'Senna', 147: 'Seraphine', 875: 'Sett', 35: 'Shaco', 98: 'Shen', 102: 'Shyvana',
  27: 'Singed', 14: 'Sion', 15: 'Sivir', 72: 'Skarner', 901: 'Smolder', 37: 'Sona', 16: 'Soraka',
  50: 'Swain', 517: 'Sylas', 134: 'Syndra', 223: 'TahmKench', 163: 'Taliyah', 91: 'Talon', 44: 'Taric',
  17: 'Teemo', 412: 'Thresh', 18: 'Tristana', 48: 'Trundle', 23: 'Tryndamere', 4: 'TwistedFate',
  29: 'Twitch', 77: 'Udyr', 6: 'Urgot', 110: 'Varus', 67: 'Vayne', 45: 'Veigar', 161: 'Velkoz',
  711: 'Vex', 254: 'Vi', 234: 'Viego', 112: 'Viktor', 8: 'Vladimir', 106: 'Volibear', 19: 'Warwick',
  498: 'Xayah', 101: 'Xerath', 5: 'XinZhao', 157: 'Yasuo', 777: 'Yone', 83: 'Yorick', 350: 'Yuumi',
  154: 'Zac', 238: 'Zed', 221: 'Zeri', 115: 'Ziggs', 26: 'Zilean', 142: 'Zoe', 143: 'Zyra',
};

const keyToIdMap = new Map<number, string>(
  Object.entries(STATIC_CHAMP_KEYS).map(([k, v]) => [Number(k), v]),
);
const keyToNameMap = new Map<number, string>();

/**
 * Consulta dinámica del array de versiones de Data Dragon para resolver el parche
 * activo más reciente (versions[0]) y precargar catálogo de CommunityDragon.
 */
export async function initAssets(timeoutMs = 4000): Promise<void> {
  // 1. Resolver el parche más reciente de Riot Games
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${CDN}/api/versions.json`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const list = (await res.json()) as string[];
      if (Array.isArray(list) && list[0]) {
        version = list[0];
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_KEY_VERSION, version);
          } catch {
            // Ignorar fallo de almacenamiento
          }
        }
      }
    }
  } catch {
    /* En caso de fallo de red, se preserva la versión en caché */
  }

  // 2. Cargar diccionario completo de campeones desde Data Dragon
  try {
    const cRes = await fetch(`${CDN}/cdn/${version}/data/es_ES/champion.json`);
    if (cRes.ok) {
      const cData = (await cRes.json()) as { data: Record<string, { key: string; id: string; name: string }> };
      if (cData && cData.data) {
        for (const item of Object.values(cData.data)) {
          const numKey = Number(item.key);
          keyToIdMap.set(numKey, item.id);
          keyToNameMap.set(numKey, item.name);
        }
      }
    }
  } catch {
    // Se mantiene el mapa estático
  }

  // 3. Cargar catálogo de CommunityDragon como fuente alternativa para ítems recién actualizados
  try {
    const cdRes = await fetch(`${CD_BASE}/v1/items.json`);
    if (cdRes.ok) {
      const cdItems = (await cdRes.json()) as { id: number; iconPath: string; name?: string }[];
      if (Array.isArray(cdItems)) {
        for (const it of cdItems) {
          if (it.id && it.iconPath) {
            const cleanPath = it.iconPath
              .toLowerCase()
              .replace('/lol-game-data/assets/', '');
            cdItemIconMap.set(it.id, `${CD_BASE}/${cleanPath}`);
          }
        }
      }
    }
  } catch {
    // Si falla CommunityDragon, se mantiene el CDN oficial de Riot
  }

  // 4. Costes de oro reales del parche activo (Data Dragon item.json)
  try {
    const iRes = await fetch(`${CDN}/cdn/${version}/data/es_ES/item.json`);
    if (iRes.ok) {
      const iData = (await iRes.json()) as { data?: Record<string, { gold?: { total?: number } }> };
      for (const [id, it] of Object.entries(iData.data ?? {})) {
        const total = it.gold?.total;
        if (typeof total === 'number' && total > 0) itemGoldMap.set(Number(id), total);
      }
    }
  } catch {
    // Se usa la tabla estática de respaldo (data/itemGuide.ts)
  }
}

/** Coste total en oro de un ítem según Data Dragon, o undefined si aún no se resolvió. */
export function itemGold(id: number): number | undefined {
  return itemGoldMap.get(id);
}

export function champIdFromKey(key: number | string): string {
  const num = Number(key);
  return keyToIdMap.get(num) ?? STATIC_CHAMP_KEYS[num] ?? 'Aatrox';
}

export function champNameFromKey(key: number | string): string {
  const num = Number(key);
  return keyToNameMap.get(num) ?? keyToIdMap.get(num) ?? STATIC_CHAMP_KEYS[num] ?? String(key);
}

export const gameVersion = () => version;
export const champImg = (id: string) => `${CDN}/cdn/${version}/img/champion/${id}.png`;

/**
 * Construye la URL de cualquier objeto usando el CDN oficial de Riot
 * con la versión dinámica activa del último parche.
 */
export function itemImg(id: number): string {
  if (!id || id <= 0) return '';
  return `${CDN}/cdn/${version}/img/item/${id}.png`;
}

/**
 * URL alternativa del CDN de CommunityDragon para ítems recién modificados
 */
export function itemCdImg(id: number): string {
  if (!id || id <= 0) return '';
  const cachedUrl = cdItemIconMap.get(id);
  if (cachedUrl) return cachedUrl;
  return `https://raw.communitydragon.org/latest/game/assets/items/icons2d/${id}.png`;
}

export const spellImg = (key: string) => `${CDN}/cdn/${version}/img/spell/${key}.png`;
export const profileImg = (id: number) => `${CDN}/cdn/${version}/img/profileicon/${id}.png`;
export const perkImg = (path: string) => `${CDN}/cdn/img/perk-images/${path}`;
export const mapImg = () => '/maps/summoners_rift.png';
export const CDRAGON_MINIMAP_URL = '/maps/summoners_rift.png';

/* ─────────────────────────────────────────────────────────────
 * ICONOS OFICIALES DE ROLES (COMMUNITYDRAGON / RIOT CLIENT)
 * ───────────────────────────────────────────────────────────── */
export const OFFICIAL_ROLE_ICONS: Record<Role, string> = {
  top: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-top.png',
  jungle: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-jungle.png',
  mid: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-middle.png',
  adc: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-bottom.png',
  support: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-utility.png',
};

export const roleImg = (role: Role): string => OFFICIAL_ROLE_ICONS[role];
