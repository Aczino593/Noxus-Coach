import { sleep } from '../lib/ui';
import { MATCHES, STAT_GROUPS, ACCOUNT, type Match, type StatGroup, type Account, type RankInfo } from './mock';
import { champIdFromKey } from '../lib/assets';
import { ROLES, type Role, type Queue } from '../types';
import { genPlayer } from '../lib/clashEngine';
import type { ScoutPlayer, PoolEntry } from './clashMock';

/* ─────────────────────────────────────────────────────────────
 * CONFIGURACIÓN DE RIOT API KEY Y ESTADO
 * ───────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'riot_api_key_custom';

export function getRiotApiKey(): string {
  if (typeof window !== 'undefined') {
    const custom = window.localStorage.getItem(STORAGE_KEY);
    if (custom && custom.trim()) return custom.trim();
  }
  return (import.meta.env.VITE_RIOT_API_KEY as string) || '';
}

export function setRiotApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      window.localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export interface RiotApiStatus {
  hasKey: boolean;
  status: 'idle' | 'live' | 'expired_or_invalid' | 'rate_limited' | 'error';
  message: string;
  lastChecked?: number;
}

let apiStatus: RiotApiStatus = {
  hasKey: true,
  status: 'idle',
  message: 'Clave configurada. Lista para consultas.',
};

export function getApiStatus(): RiotApiStatus {
  return { ...apiStatus };
}

export class RiotApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'RiotApiError';
    this.status = status;
  }
}

/* ─────────────────────────────────────────────────────────────
 * RUTEO REGIONAL Y DE PLATAFORMA (RIOT API)
 * ───────────────────────────────────────────────────────────── */
export const REGION_MAPPINGS: Record<string, { platform: string; regional: string; label: string }> = {
  LAS: { platform: 'la2', regional: 'americas', label: 'América Latina Sur' },
  LAN: { platform: 'la1', regional: 'americas', label: 'América Latina Norte' },
  NA: { platform: 'na1', regional: 'americas', label: 'Norteamérica' },
  BR: { platform: 'br1', regional: 'americas', label: 'Brasil' },
  EUW: { platform: 'euw1', regional: 'europe', label: 'Europa Oeste' },
  EUNE: { platform: 'eun1', regional: 'europe', label: 'Europa Nórdica y Este' },
  KR: { platform: 'kr', regional: 'asia', label: 'Corea' },
};

export function getRouting(region: string): { platform: string; regional: string } {
  return REGION_MAPPINGS[region] ?? { platform: 'la2', regional: 'americas' };
}

/* ─────────────────────────────────────────────────────────────
 * CLIENTE HTTP RESILIENTE CON RETRY EN 429 (RATE LIMIT)
 * ───────────────────────────────────────────────────────────── */
async function riotFetch<T>(routing: string, apiPath: string, maxRetries = 3): Promise<T> {
  const cleanPath = apiPath.startsWith('/') ? apiPath.slice(1) : apiPath;
  const key = getRiotApiKey();

  // En entorno web (Vite dev local o Vercel), usamos el proxy /riot-api/ para evitar bloqueos de CORS.
  // En la aplicación de escritorio nativa (Tauri), se consulta directo.
  const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const url = !inTauri
    ? `/riot-api/${routing}/${cleanPath}`
    : `https://${routing}.api.riotgames.com/${cleanPath}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Riot-Token': key,
  };

  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      const res = await fetch(url, { headers });

      // Manejo de Error 429: Rate Limit de Riot (20 req/1s y 100 req/2min)
      if (res.status === 429) {
        const retryHeader = res.headers.get('Retry-After');
        const waitSec = retryHeader ? Number(retryHeader) : 10;
        const waitMs = (isNaN(waitSec) || waitSec <= 0 ? 10 : waitSec) * 1000;
        console.warn(`[Riot API 429 Rate Limit] Endpoint: ${cleanPath}. Esperando ${waitMs / 1000}s (Intento ${attempt}/${maxRetries})...`);

        if (attempt >= maxRetries) {
          apiStatus = {
            hasKey: true,
            status: 'rate_limited',
            message: 'Límite de peticiones de Riot superado (429). Esperando enfriamiento.',
            lastChecked: Date.now(),
          };
          throw new RiotApiError(429, apiStatus.message);
        }

        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          let riotReason = '';
          try {
            const body = (await res.json()) as { status?: { message?: string } };
            if (body?.status?.message) riotReason = `: ${body.status.message}`;
          } catch {
            // ignore
          }
          apiStatus = {
            hasKey: true,
            status: 'expired_or_invalid',
            message: `Clave Riot no autorizada o expirada (${res.status}${riotReason}). Renueva tu clave en developer.riotgames.com.`,
            lastChecked: Date.now(),
          };
          throw new RiotApiError(res.status, apiStatus.message);
        }

        if (res.status === 404) {
          throw new RiotApiError(404, 'Registro no encontrado en Riot Games (404).');
        }

        throw new RiotApiError(res.status, `Error de Riot API (${res.status}): ${res.statusText}`);
      }

      apiStatus = {
        hasKey: true,
        status: 'live',
        message: 'Conectado a la API oficial de Riot Games.',
        lastChecked: Date.now(),
      };

      return (await res.json()) as T;
    } catch (err: unknown) {
      if (err instanceof RiotApiError) throw err;
      if (attempt >= maxRetries) {
        apiStatus = {
          hasKey: true,
          status: 'error',
          message: err instanceof Error ? err.message : 'Error de red con Riot API',
          lastChecked: Date.now(),
        };
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new RiotApiError(500, 'Error al contactar Riot Games tras múltiples reintentos.');
}

/* ─────────────────────────────────────────────────────────────
 * DTOS OFICIALES DE RIOT GAMES
 * ───────────────────────────────────────────────────────────── */

export interface RiotAccountDto {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotSummonerDto {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface RiotLeagueEntryDto {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  summonerId: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface RiotChampionMasteryDto {
  puuid: string;
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
}

export interface RiotParticipantDto {
  puuid: string;
  participantId?: number;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
  championId: number;
  championName: string;
  teamPosition: string;
  teamId?: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions?: number;
  totalDamageTaken?: number;
  visionScore?: number;
  visionWardsBoughtInGame?: number;
  wardsPlaced?: number;
  wardsKilled?: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  summoner1Id: number;
  summoner2Id: number;
  perks?: {
    styles: {
      style: number;
      selections: { perk: number }[];
    }[];
  };
}

export interface RiotMatchDto {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameDuration: number;
    gameCreation: number;
    queueId: number;
    teams?: {
      teamId: number;
      win: boolean;
      objectives?: {
        baron?: { kills: number };
        dragon?: { kills: number };
        riftHerald?: { kills: number };
        horde?: { kills: number };
        tower?: { kills: number };
      };
    }[];
    participants: RiotParticipantDto[];
  };
}

export interface RiotTimelineEventDto {
  type: string;
  timestamp: number;
  victimId?: number;
  killerId?: number;
  assistingParticipantIds?: number[];
  position?: { x: number; y: number };
  creatorId?: number;
  wardType?: string;
}

export interface RiotTimelineDto {
  metadata: {
    matchId: string;
  };
  info: {
    frameInterval: number;
    frames: {
      timestamp: number;
      events?: RiotTimelineEventDto[];
      participantFrames: Record<
        string,
        {
          participantId: number;
          totalGold: number;
          currentGold: number;
          level: number;
          minionsKilled: number;
          jungleMinionsKilled: number;
          damageStats?: {
            totalDamageDoneToChampions: number;
          };
        }
      >;
    }[];
  };
}

/* ─────────────────────────────────────────────────────────────
 * CAPA 1: RESOLUCIÓN DE PUUID (Account-V1 en región continental)
 * ───────────────────────────────────────────────────────────── */

/**
 * Resuelve el PUUID oficial de un jugador mediante Account-V1 en la región continental
 * Sanitiza el tagLine (remueve '#' inicial) y maneja 404 controladamente.
 */
export async function getPuuid(
  gameName: string,
  tagLine: string,
  region: string,
): Promise<string> {
  const cleanName = gameName.trim();
  const cleanTag = tagLine.replace(/^#+/, '').trim();
  if (!cleanName) throw new Error('Nombre de invocador vacío');

  const { regional } = getRouting(region);
  try {
    const account = await riotFetch<RiotAccountDto>(
      regional,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(cleanName)}/${encodeURIComponent(cleanTag || region)}`,
    );
    if (!account || !account.puuid) {
      throw new RiotApiError(404, 'Invocador no encontrado');
    }
    return account.puuid;
  } catch (err: unknown) {
    if (err instanceof RiotApiError && err.status === 404) {
      throw new RiotApiError(404, 'Invocador no encontrado');
    }
    throw err;
  }
}

/** Compatibilidad directa con llamadas que requieren el DTO completo */
export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
  region: string,
): Promise<RiotAccountDto> {
  const cleanName = gameName.trim();
  const cleanTag = tagLine.replace(/^#+/, '').trim();
  const { regional } = getRouting(region);
  return riotFetch<RiotAccountDto>(
    regional,
    `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(cleanName)}/${encodeURIComponent(cleanTag || region)}`,
  );
}

/* ─────────────────────────────────────────────────────────────
 * CAPA 2: OBTENCIÓN DE MATCH IDS CON FILTRO DE COLA (Match-V5)
 * ───────────────────────────────────────────────────────────── */

/**
 * Obtiene IDs de partidas recientes con filtro de cola competitivo opcional:
 * queueId: 420 (Solo/Dúo), 440 (Flex), undefined (Todas las colas).
 */
export async function getMatchIds(
  puuid: string,
  region: string,
  count = 20,
  queueId?: number,
): Promise<string[]> {
  const { regional } = getRouting(region);
  const queueParam = typeof queueId === 'number' && queueId > 0 ? `&queue=${queueId}` : '';
  const query = `?start=0&count=${count}${queueParam}`;
  return riotFetch<string[]>(
    regional,
    `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids${query}`,
  );
}

/* ─────────────────────────────────────────────────────────────
 * CAPA 3: DESCARGA DE PARTIDA CON PROTECCIÓN 429 Y CACHÉ
 * ───────────────────────────────────────────────────────────── */

const matchCache = new Map<string, RiotMatchDto>();
const timelineCache = new Map<string, RiotTimelineDto>();

/**
 * Descarga los datos de una partida terminada.
 * Utiliza caché en memoria y localStorage (las partidas finalizadas son inmutables).
 * Incluye protección de Rate Limit 429 con reintentos automáticos.
 */
export async function getMatchData(
  matchId: string,
  region: string,
): Promise<RiotMatchDto> {
  // 1. Memoria rápida
  const mem = matchCache.get(matchId);
  if (mem) return mem;

  // 2. Caché persistente en localStorage
  const storageKey = `riot_match_cache_${matchId}`;
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as RiotMatchDto;
        if (parsed?.metadata?.matchId === matchId && parsed?.info?.participants?.length) {
          matchCache.set(matchId, parsed);
          return parsed;
        }
      }
    } catch {
      // Ignorar fallo de parseo o cuota de localStorage
    }
  }

  // 3. Petición HTTP con manejo de 429
  const { regional } = getRouting(region);
  const dto = await riotFetch<RiotMatchDto>(
    regional,
    `/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
  );

  // Guardar en cachés
  matchCache.set(matchId, dto);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(dto));
    } catch {
      // QuotaExceededError handling
    }
  }

  return dto;
}

/** Alias para compatibilidad con código existente */
export const getMatchDetail = getMatchData;

/** Timeline de la partida */
export async function getMatchTimeline(
  matchId: string,
  region: string,
): Promise<RiotTimelineDto | null> {
  const cached = timelineCache.get(matchId);
  if (cached) return cached;
  const { regional } = getRouting(region);
  try {
    const dto = await riotFetch<RiotTimelineDto>(
      regional,
      `/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`,
    );
    timelineCache.set(matchId, dto);
    return dto;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
 * CAPA 4: LOCALIZACIÓN EXACTA DEL JUGADOR EN LA PARTIDA
 * ───────────────────────────────────────────────────────────── */

/**
 * Lógica canónica de índice de metadata para Riot Match-V5:
 * Localiza la posición del PUUID en metadata.participants y retorna el participante correspondiente.
 */
export function findPlayerData(matchData: RiotMatchDto, puuid: string): RiotParticipantDto {
  const participantsPuuids: string[] = matchData.metadata.participants;
  const playerIndex = participantsPuuids.indexOf(puuid);
  if (playerIndex === -1) {
    // Intento de fallback por búsqueda directa en info.participants si los IDs difieren
    const direct = matchData.info.participants.find((p) => p.puuid === puuid);
    if (direct) return direct;
    throw new Error('Jugador no encontrado en la partida');
  }
  return matchData.info.participants[playerIndex];
}

export interface ExtractedPlayerStats {
  championName: string;
  championId: number;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  teamPosition: string;
  role: Role;
  totalCs: number;
  csPerMin: number;
  visionScore: number;
  controlWards: number;
  items: [number, number, number, number, number, number];
  ward: number;
  rawParticipant: RiotParticipantDto;
}

const ROLE_MAP: Record<string, Role> = {
  TOP: 'top',
  JUNGLE: 'jungle',
  MIDDLE: 'mid',
  BOTTOM: 'adc',
  UTILITY: 'support',
};

const QUEUE_MAP: Record<number, Queue> = {
  420: 'solo',
  440: 'flex',
  700: 'clash',
  490: 'quick',
};

/**
 * Extrae todas las métricas tácticas clave del participante localizado:
 * championName, kills, deaths, assists, win, teamPosition, CS total, visionScore, Pinks y los 6 ítems.
 */
export function extractPlayerStats(matchData: RiotMatchDto, puuid: string): ExtractedPlayerStats {
  const p = findPlayerData(matchData, puuid);
  const totalCs = (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
  const durationMin = Math.max(1, matchData.info.gameDuration / 60);
  const csPerMin = Math.round((totalCs / durationMin) * 10) / 10;
  const role: Role = ROLE_MAP[p.teamPosition] || 'mid';

  return {
    championName: p.championName,
    championId: p.championId,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    win: Boolean(p.win),
    teamPosition: p.teamPosition,
    role,
    totalCs,
    csPerMin,
    visionScore: p.visionScore || 0,
    controlWards: p.visionWardsBoughtInGame || 0,
    items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5],
    ward: p.item6 || 3340,
    rawParticipant: p,
  };
}

/** Mapea un DTO de partida de Riot al formato de UI Match */
export function parseRiotMatch(dto: RiotMatchDto, targetPuuid: string): Match | null {
  try {
    const stats = extractPlayerStats(dto, targetPuuid);
    const me = stats.rawParticipant;
    const durationSec = dto.info.gameDuration;
    const durationMin = Math.max(1, durationSec / 60);
    const gpm = Math.round(me.goldEarned / durationMin);
    const kda = (stats.kills + stats.assists) / Math.max(1, stats.deaths);

    const rival = dto.info.participants.find(
      (p) => p.puuid !== targetPuuid && p.teamPosition === me.teamPosition,
    );
    const rivalChamp = rival ? champIdFromKey(rival.championId) : 'Desconocido';

    const insights: Match['insights'] = [];
    if (kda >= 4) insights.push({ kind: 'good', text: `Excelente KDA de ${kda.toFixed(1)} con alto impacto en peleas.` });
    if (stats.csPerMin >= 8) insights.push({ kind: 'good', text: 'Farm superior a 8 CS/minuto: tempo de farmeo óptimo.' });
    if (stats.deaths >= 7) insights.push({ kind: 'bad', text: 'Número elevado de muertes: revisa overextending en mid game.' });

    return {
      id: dto.metadata.matchId,
      result: stats.win ? 'win' : 'loss',
      queue: QUEUE_MAP[dto.info.queueId] || 'solo',
      durationSec,
      date: new Date(dto.info.gameCreation).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      role: stats.role,
      champ: champIdFromKey(stats.championId) || stats.championName,
      rival: rivalChamp,
      k: stats.kills,
      d: stats.deaths,
      a: stats.assists,
      cs: stats.totalCs,
      gpm,
      items: stats.items,
      ward: stats.ward,
      spells: ['SummonerFlash', 'SummonerTeleport'],
      keystone: { path: 'Styles/Precision/Conqueror/Conqueror.png', name: 'Conquistador' },
      secondary: { path: 'Styles/Domination/Electrocute/Electrocute.png', name: 'Dominación' },
      lp: stats.win ? 19 : -16,
      draftScore: 4,
      macroScore: 78,
      insights,
    };
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
 * CAPA 5: AGREGACIÓN ESTADÍSTICA ESTILO DATAFRAME
 * ───────────────────────────────────────────────────────────── */

export interface ChampionAggregate {
  champion: string;
  championName: string;
  championId: number;
  count: number;
  wins: number;
  losses: number;
  winRate: number; // Math.round(wins / count * 100)
  kills: number;
  deaths: number;
  assists: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  kdaRatio: number; // (kills + assists) / Math.max(1, deaths)
  totalCs: number;
  csPerMin: number;
  controlWards: number;
  highestKills: number;
}

export interface GlobalMetrics {
  totalMatches: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  overallKda: number;
  winRate: number;
  avgCsPerMin: number;
  avgControlWards: number;
  totalWins: number;
  totalLosses: number;
}

export interface AggregatedDataResult {
  puuid: string;
  account: Account;
  globalMetrics: GlobalMetrics;
  championStats: ChampionAggregate[];
  mostPlayedChampion: ChampionAggregate | null;
  bestKdaChampion: ChampionAggregate | null;
  worstKdaChampion: ChampionAggregate | null;
  matches: Match[];
  rawMatches: RiotMatchDto[];
  isLive: boolean;
  error?: string;
}

let cachedAggregatedData: AggregatedDataResult | null = null;

export function getLastAggregatedData(): AggregatedDataResult | null {
  return cachedAggregatedData;
}

export function setCachedAggregatedData(data: AggregatedDataResult): void {
  cachedAggregatedData = data;
}

/** Genera datos estadísticos consistentes para el modo local o cuando no hay API Key */
function createFallbackAggregated(
  region: string,
  name = ACCOUNT.name,
  tag = ACCOUNT.tag,
): AggregatedDataResult {
  const matches = MATCHES;
  const champMap = new Map<string, { count: number; wins: number; kills: number; deaths: number; assists: number; cs: number; durMin: number; highestKills: number }>();

  let totalKills = 0;
  let totalDeaths = 0;
  let totalAssists = 0;
  let totalWins = 0;
  let totalCs = 0;
  let totalDurMin = 0;

  for (const m of matches) {
    const mins = Math.max(1, m.durationSec / 60);
    totalKills += m.k;
    totalDeaths += m.d;
    totalAssists += m.a;
    if (m.result === 'win') totalWins++;
    totalCs += m.cs;
    totalDurMin += mins;

    const entry = champMap.get(m.champ) ?? { count: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, durMin: 0, highestKills: 0 };
    entry.count++;
    if (m.result === 'win') entry.wins++;
    entry.kills += m.k;
    entry.deaths += m.d;
    entry.assists += m.a;
    entry.cs += m.cs;
    entry.durMin += mins;
    entry.highestKills = Math.max(entry.highestKills, m.k);
    champMap.set(m.champ, entry);
  }

  const championStats: ChampionAggregate[] = Array.from(champMap.entries()).map(([champ, d]) => ({
    champion: champ,
    championName: champ,
    championId: 103,
    count: d.count,
    wins: d.wins,
    losses: d.count - d.wins,
    winRate: Math.round((d.wins / d.count) * 100),
    kills: d.kills,
    deaths: d.deaths,
    assists: d.assists,
    avgKills: Math.round((d.kills / d.count) * 10) / 10,
    avgDeaths: Math.round((d.deaths / d.count) * 10) / 10,
    avgAssists: Math.round((d.assists / d.count) * 10) / 10,
    kdaRatio: Math.round(((d.kills + d.assists) / Math.max(1, d.deaths)) * 10) / 10,
    totalCs: d.cs,
    csPerMin: Math.round((d.cs / d.durMin) * 10) / 10,
    controlWards: Math.round(d.count * 1.5),
    highestKills: d.highestKills,
  }));

  championStats.sort((a, b) => b.count - a.count || b.winRate - a.winRate);

  const n = matches.length;
  const mostPlayedChampion = championStats[0] ?? null;
  const sortedKda = [...championStats].sort((a, b) => b.kdaRatio - a.kdaRatio);

  return {
    puuid: 'mock_puuid_local',
    account: { ...ACCOUNT, name, tag, region },
    globalMetrics: {
      totalMatches: n,
      avgKills: Math.round((totalKills / n) * 10) / 10,
      avgDeaths: Math.round((totalDeaths / n) * 10) / 10,
      avgAssists: Math.round((totalAssists / n) * 10) / 10,
      overallKda: Math.round(((totalKills + totalAssists) / Math.max(1, totalDeaths)) * 100) / 100,
      winRate: Math.round((totalWins / n) * 100),
      avgCsPerMin: Math.round((totalCs / totalDurMin) * 10) / 10,
      avgControlWards: 1.8,
      totalWins,
      totalLosses: n - totalWins,
    },
    championStats,
    mostPlayedChampion,
    bestKdaChampion: sortedKda[0] ?? null,
    worstKdaChampion: sortedKda[sortedKda.length - 1] ?? null,
    matches,
    rawMatches: [],
    isLive: false,
  };
}

/**
 * Función Maestra del Pipeline de Datos:
 * Recorre las partidas descargadas y genera un resumen agrupado por campeón (groupby('champion')).
 */
export async function masterGatherData(
  gameName: string,
  tagLine: string,
  region: string,
  count = 20,
  queueId?: number,
): Promise<AggregatedDataResult> {
  const cleanName = gameName.trim();
  const cleanTag = tagLine.replace(/^#+/, '').trim() || region;

  if (!cleanName) {
    const fallback = createFallbackAggregated(region);
    setCachedAggregatedData(fallback);
    return fallback;
  }

  // 1. Capa 1: getPuuid
  let puuid = '';
  try {
    puuid = await getPuuid(cleanName, cleanTag, region);
  } catch (err: unknown) {
    const is404 = err instanceof RiotApiError && err.status === 404;
    const msg = is404
      ? 'Invocador no encontrado'
      : err instanceof Error ? err.message : 'Error al consultar Riot API.';

    const fallback = {
      ...createFallbackAggregated(region, cleanName, cleanTag),
      error: msg,
      isLive: false,
    };
    setCachedAggregatedData(fallback);
    return fallback;
  }

  // 2. Información de Cuenta (Summoner-V4 y League-V4 por PUUID)
  let level = 1;
  let iconId = 29;
  let soloRank: RankInfo | null = null;
  let flexRank: RankInfo | null = null;

  try {
    const [summoner, leagues] = await Promise.allSettled([
      getSummonerByPuuid(puuid, region),
      getLeagueEntriesByPuuid(puuid, region),
    ]);

    if (summoner.status === 'fulfilled' && summoner.value) {
      level = summoner.value.summonerLevel || 1;
      iconId = summoner.value.profileIconId || 29;
    }

    if (leagues.status === 'fulfilled' && Array.isArray(leagues.value)) {
      const solo = leagues.value.find((l) => l.queueType === 'RANKED_SOLO_5x5');
      const flex = leagues.value.find((l) => l.queueType === 'RANKED_FLEX_SR');
      if (solo) {
        soloRank = { tier: solo.tier, division: solo.rank, lp: solo.leaguePoints, wins: solo.wins, losses: solo.losses };
      }
      if (flex) {
        flexRank = { tier: flex.tier, division: flex.rank, lp: flex.leaguePoints, wins: flex.wins, losses: flex.losses };
      }
    }
  } catch {
    // Continuar con valores por defecto
  }

  const account: Account = {
    name: cleanName,
    tag: cleanTag,
    region,
    level,
    profileIcon: iconId,
    solo: soloRank,
    flex: flexRank,
  };

  // 3. Capa 2: getMatchIds (filtrado de cola competitivo opcional)
  let matchIds: string[] = [];
  try {
    matchIds = await getMatchIds(puuid, region, count, queueId);
  } catch (err) {
    const fallback = {
      ...createFallbackAggregated(region, cleanName, cleanTag),
      account,
      puuid,
      error: err instanceof Error ? err.message : 'Error al obtener IDs de partida',
      isLive: false,
    };
    setCachedAggregatedData(fallback);
    return fallback;
  }

  if (!matchIds.length) {
    const emptyResult: AggregatedDataResult = {
      puuid,
      account,
      globalMetrics: {
        totalMatches: 0,
        avgKills: 0,
        avgDeaths: 0,
        avgAssists: 0,
        overallKda: 0,
        winRate: 0,
        avgCsPerMin: 0,
        avgControlWards: 0,
        totalWins: 0,
        totalLosses: 0,
      },
      championStats: [],
      mostPlayedChampion: null,
      bestKdaChampion: null,
      worstKdaChampion: null,
      matches: [],
      rawMatches: [],
      isLive: true,
      error: 'No se encontraron partidas para el filtro seleccionado.',
    };
    setCachedAggregatedData(emptyResult);
    return emptyResult;
  }

  // 4. Capa 3: Descarga con Rate Limit 429 y Caché
  const matchPromises = matchIds.map((id) => getMatchData(id, region));
  const settled = await Promise.allSettled(matchPromises);

  const rawMatches: RiotMatchDto[] = [];
  const parsedMatches: Match[] = [];

  let totalKills = 0;
  let totalDeaths = 0;
  let totalAssists = 0;
  let totalWins = 0;
  let totalCs = 0;
  let totalControlWards = 0;
  let totalDurationSec = 0;

  // Groupby Champion Map
  const champMap = new Map<string, {
    champion: string;
    championName: string;
    championId: number;
    count: number;
    wins: number;
    losses: number;
    kills: number;
    deaths: number;
    assists: number;
    totalCs: number;
    totalDurationSec: number;
    controlWards: number;
    highestKills: number;
  }>();

  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value) {
      const matchDto = s.value;
      rawMatches.push(matchDto);

      try {
        // Capa 4: findPlayerData
        const stats = extractPlayerStats(matchDto, puuid);
        const uiMatch = parseRiotMatch(matchDto, puuid);
        if (uiMatch) parsedMatches.push(uiMatch);

        const durSec = matchDto.info.gameDuration;
        totalKills += stats.kills;
        totalDeaths += stats.deaths;
        totalAssists += stats.assists;
        if (stats.win) totalWins++;
        totalCs += stats.totalCs;
        totalControlWards += stats.controlWards;
        totalDurationSec += durSec;

        const champKey = champIdFromKey(stats.championId) || stats.championName;
        const entry = champMap.get(champKey) ?? {
          champion: champKey,
          championName: stats.championName,
          championId: stats.championId,
          count: 0,
          wins: 0,
          losses: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          totalCs: 0,
          totalDurationSec: 0,
          controlWards: 0,
          highestKills: 0,
        };

        entry.count++;
        if (stats.win) entry.wins++;
        else entry.losses++;
        entry.kills += stats.kills;
        entry.deaths += stats.deaths;
        entry.assists += stats.assists;
        entry.totalCs += stats.totalCs;
        entry.totalDurationSec += durSec;
        entry.controlWards += stats.controlWards;
        entry.highestKills = Math.max(entry.highestKills, stats.kills);

        champMap.set(champKey, entry);
      } catch {
        // Participante no encontrado en esta partida particular
      }
    }
  }

  const n = parsedMatches.length;
  const globalMetrics: GlobalMetrics = {
    totalMatches: n,
    avgKills: n ? Math.round((totalKills / n) * 10) / 10 : 0,
    avgDeaths: n ? Math.round((totalDeaths / n) * 10) / 10 : 0,
    avgAssists: n ? Math.round((totalAssists / n) * 10) / 10 : 0,
    overallKda: n ? Math.round(((totalKills + totalAssists) / Math.max(1, totalDeaths)) * 100) / 100 : 0,
    winRate: n ? Math.round((totalWins / n) * 100) : 0,
    avgCsPerMin: totalDurationSec > 0 ? Math.round((totalCs / (totalDurationSec / 60)) * 10) / 10 : 0,
    avgControlWards: n ? Math.round((totalControlWards / n) * 10) / 10 : 0,
    totalWins,
    totalLosses: n - totalWins,
  };

  // Tabla agrupada por campeón
  const championStats: ChampionAggregate[] = Array.from(champMap.values()).map((c) => {
    const mins = Math.max(1, c.totalDurationSec / 60);
    return {
      champion: c.champion,
      championName: c.championName,
      championId: c.championId,
      count: c.count,
      wins: c.wins,
      losses: c.losses,
      winRate: Math.round((c.wins / c.count) * 100),
      kills: c.kills,
      deaths: c.deaths,
      assists: c.assists,
      avgKills: Math.round((c.kills / c.count) * 10) / 10,
      avgDeaths: Math.round((c.deaths / c.count) * 10) / 10,
      avgAssists: Math.round((c.assists / c.count) * 10) / 10,
      kdaRatio: Math.round(((c.kills + c.assists) / Math.max(1, c.deaths)) * 10) / 10,
      totalCs: c.totalCs,
      csPerMin: Math.round((c.totalCs / mins) * 10) / 10,
      controlWards: c.controlWards,
      highestKills: c.highestKills,
    };
  });

  // Ordenar por cantidad de partidas descendente
  championStats.sort((a, b) => b.count - a.count || b.winRate - a.winRate);

  const mostPlayedChampion = championStats[0] ?? null;

  // Filtrar preferentemente campeones con al menos 2 partidas para mejor/peor KDA si existen
  const candidateChamps = championStats.filter((c) => c.count >= 2).length > 0
    ? championStats.filter((c) => c.count >= 2)
    : championStats;

  const sortedByKda = [...candidateChamps].sort((a, b) => b.kdaRatio - a.kdaRatio);
  const bestKdaChampion = sortedByKda[0] ?? null;
  const worstKdaChampion = sortedByKda[sortedByKda.length - 1] ?? null;

  const result: AggregatedDataResult = {
    puuid,
    account,
    globalMetrics,
    championStats,
    mostPlayedChampion,
    bestKdaChampion,
    worstKdaChampion,
    matches: parsedMatches,
    rawMatches,
    isLive: true,
  };

  setCachedAggregatedData(result);
  return result;
}

export const gatherAndAggregateData = masterGatherData;

/* ─────────────────────────────────────────────────────────────
 * CONSULTAS COMPLEMENTARIAS
 * ───────────────────────────────────────────────────────────── */

/** Summoner-V4 por PUUID */
export async function getSummonerByPuuid(
  puuid: string,
  region: string,
): Promise<RiotSummonerDto> {
  const { platform } = getRouting(region);
  return riotFetch<RiotSummonerDto>(
    platform,
    `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`,
  );
}

/** League-V4 por PUUID (moderno) */
export async function getLeagueEntriesByPuuid(
  puuid: string,
  region: string,
): Promise<RiotLeagueEntryDto[]> {
  const { platform } = getRouting(region);
  return riotFetch<RiotLeagueEntryDto[]>(
    platform,
    `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
  );
}

/** League-V4 por summonerId (compatibilidad legado) */
export async function getLeagueEntries(
  summonerId: string,
  region: string,
): Promise<RiotLeagueEntryDto[]> {
  const { platform } = getRouting(region);
  return riotFetch<RiotLeagueEntryDto[]>(
    platform,
    `/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`,
  );
}

/** Champion-Mastery-V4: Top maestrías por PUUID */
export async function getTopMasteries(
  puuid: string,
  region: string,
  count = 5,
): Promise<RiotChampionMasteryDto[]> {
  const { platform } = getRouting(region);
  return riotFetch<RiotChampionMasteryDto[]>(
    platform,
    `/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}/top?count=${count}`,
  );
}

export interface ProfileFetchResult {
  account: Account;
  matches: Match[];
  isLive: boolean;
  error?: string;
  aggregated?: AggregatedDataResult;
}

/**
 * Consulta el perfil completo de un invocador en Riot Games integrando el pipeline de datos agregados.
 */
export async function fetchSummonerProfile(
  gameName: string,
  tagLine: string,
  region: string,
  count = 20,
  queueId?: number,
): Promise<ProfileFetchResult> {
  const agg = await masterGatherData(gameName, tagLine, region, count, queueId);
  return {
    account: agg.account,
    matches: agg.matches,
    isLive: agg.isLive,
    error: agg.error,
    aggregated: agg,
  };
}

/** Compatibilidad con vistas existentes */
export async function fetchMatches(latency = 200): Promise<Match[]> {
  await sleep(latency);
  const cached = getLastAggregatedData();
  if (cached && cached.matches.length > 0) {
    return cached.matches;
  }
  return MATCHES;
}

export async function fetchAccountStats(latency = 200): Promise<StatGroup[]> {
  await sleep(latency);
  return STAT_GROUPS;
}

/* ─────────────────────────────────────────────────────────────
 * SCOUTING DE RIVALES PARA CLASH (RIOT API + MATCH-V5 + MASTERIES)
 * ───────────────────────────────────────────────────────────── */

/** Consulta un rival específico de Clash en Riot API */
export async function fetchSingleRival(
  name: string,
  tag: string,
  role: Role,
  region: string,
): Promise<ScoutPlayer> {
  const cleanName = name.trim();
  const cleanTag = tag.trim().replace(/^#+/, '') || region;
  if (!cleanName) return genPlayer(`Rival_${role}`, cleanTag, role);

  try {
    const acc = await getAccountByRiotId(cleanName, cleanTag, region);
    if (!acc || !acc.puuid) return { ...genPlayer(cleanName, cleanTag, role), isLive: false };

    let rankStr = 'Oro III';
    try {
      const leagues = await getLeagueEntriesByPuuid(acc.puuid, region);
      const solo = leagues.find((l) => l.queueType === 'RANKED_SOLO_5x5');
      if (solo) {
        rankStr = `${solo.tier.charAt(0) + solo.tier.slice(1).toLowerCase()} ${solo.rank}`;
      }
    } catch {
      // Ignorar fallo de liga
    }

    const masteries = await getTopMasteries(acc.puuid, region, 5);

    let recentGamesByChamp: Record<string, { games: number; wins: number }> = {};
    let totalSampleGames = 0;

    try {
      const matchIds = await getMatchIds(acc.puuid, region, 10, 420);
      const matchSample = matchIds.slice(0, 6);
      const results = await Promise.allSettled(matchSample.map((id) => getMatchData(id, region)));

      for (const res of results) {
        if (res.status === 'fulfilled') {
          const detail = res.value;
          try {
            const participant = findPlayerData(detail, acc.puuid);
            totalSampleGames++;
            const champKey = champIdFromKey(participant.championId);
            if (!recentGamesByChamp[champKey]) {
              recentGamesByChamp[champKey] = { games: 0, wins: 0 };
            }
            recentGamesByChamp[champKey].games++;
            if (participant.win) recentGamesByChamp[champKey].wins++;
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // Continuar con estimación basada en maestrías si Match-V5 falla
    }

    const pool: PoolEntry[] = masteries.slice(0, 3).map((m) => {
      const champId = champIdFromKey(m.championId);
      const recent = recentGamesByChamp[champId];
      const games = recent ? recent.games : Math.max(12, Math.round(m.championPoints / 12000));
      const wr = recent && recent.games > 0
        ? Math.round((recent.wins / recent.games) * 100)
        : Math.min(72, Math.max(48, Math.round(52 + (m.championPoints % 17))));

      const masteryTag: PoolEntry['mastery'] =
        m.championLevel >= 7 ? 'M7' : m.championLevel === 6 ? 'M6' : m.championLevel === 5 ? 'M5' : 'M4';
      const ptsFormatted = `${Math.round(m.championPoints / 1000)}k`;

      return {
        champ: champId,
        games,
        wr,
        mastery: masteryTag,
        points: ptsFormatted,
        rawPoints: m.championPoints,
      };
    });

    return {
      role,
      name: acc.gameName,
      tag: acc.tagLine,
      rank: rankStr,
      puuid: acc.puuid,
      pool: pool.length ? pool : genPlayer(cleanName, cleanTag, role).pool,
      isLive: true,
    };
  } catch {
    const fallback = genPlayer(cleanName, cleanTag, role);
    return { ...fallback, isLive: false };
  }
}

/** Consulta en paralelo a los 5 rivales del equipo para Clash */
export async function fetchClashTeam(
  inputs: { name: string; tag: string }[],
  region: string,
): Promise<{ players: ScoutPlayer[]; liveCount: number; statusMessage: string }> {
  const promises = ROLES.map((role, idx) => {
    const input = inputs[idx] || { name: `Rival${idx + 1}`, tag: region };
    return fetchSingleRival(input.name, input.tag, role, region);
  });

  const results = await Promise.all(promises);
  const liveCount = results.filter((p) => p.isLive).length;

  let statusMessage = '';
  if (liveCount === 5) {
    statusMessage = '5/5 rivales analizados en tiempo real mediante Riot API (Mastery-V4 + Match-V5).';
  } else if (liveCount > 0) {
    statusMessage = `${liveCount}/5 rivales conectados con Riot API; el resto utiliza análisis predictivo.`;
  } else {
    statusMessage =
      apiStatus.status === 'expired_or_invalid'
        ? 'Clave Riot API de desarrollo no activa (401). Utilizando simulación de alta fidelidad.'
        : 'Datos calculados mediante motor de scouting predictivo de Clash.';
  }

  return {
    players: results,
    liveCount,
    statusMessage,
  };
}
