import { createView } from '../lib/view';
import { champIcon, esc, icon } from '../lib/ui';
import { CHAMP_BY_ID } from '../data/champions';
import { getLastAggregatedData, type ChampionAggregate } from '../data/api';
import { MATCHES, type Match } from '../data/mock';
import { ROLE_LABEL, ROLES, type Role } from '../types';

interface ChampionRow extends ChampionAggregate { role: Role; }
interface State { role: Role | 'all'; sort: 'games' | 'winRate' | 'kda' | 'cs'; rows: ChampionRow[]; live: boolean; }

function rowsFromMatches(source: Match[]): ChampionRow[] {
  const groups = new Map<string, Match[]>();
  for (const match of source) {
    const key = `${match.champ}:${match.role}`;
    groups.set(key, [...(groups.get(key) ?? []), match]);
  }
  return [...groups.values()].map((matches) => {
    const champion = matches[0].champ;
    const count = matches.length;
    const wins = matches.filter((m) => m.result === 'win').length;
    const kills = matches.reduce((n, m) => n + m.k, 0);
    const deaths = matches.reduce((n, m) => n + m.d, 0);
    const assists = matches.reduce((n, m) => n + m.a, 0);
    const minutes = matches.reduce((n, m) => n + m.durationSec / 60, 0);
    const ch = CHAMP_BY_ID[champion];
    return {
      champion, championName: ch?.name ?? champion, championId: 0, count, wins, losses: count - wins,
      winRate: Math.round(wins / count * 100), kills, deaths, assists,
      avgKills: kills / count, avgDeaths: deaths / count, avgAssists: assists / count,
      kdaRatio: (kills + assists) / Math.max(1, deaths), totalCs: matches.reduce((n, m) => n + m.cs, 0),
      csPerMin: matches.reduce((n, m) => n + m.cs, 0) / Math.max(1, minutes),
      controlWards: 0, highestKills: Math.max(...matches.map((m) => m.k)), role: matches[0].role,
    };
  });
}

function readRows(): { rows: ChampionRow[]; live: boolean } {
  const data = getLastAggregatedData();
  if (data?.matches.length) return { rows: rowsFromMatches(data.matches), live: data.isLive };
  return { rows: rowsFromMatches(MATCHES), live: false };
}

export function mountChampionStats(root: HTMLElement) {
  const initial = readRows();
  return createView<State>({
    root,
    state: { role: 'all', sort: 'games', ...initial },
    render: (s) => {
      const rows = s.rows.filter((r) => s.role === 'all' || r.role === s.role).sort((a, b) =>
        s.sort === 'winRate' ? b.winRate - a.winRate || b.count - a.count :
        s.sort === 'kda' ? b.kdaRatio - a.kdaRatio : s.sort === 'cs' ? b.csPerMin - a.csPerMin : b.count - a.count,
      );
      const total = rows.reduce((sum, r) => sum + r.count, 0);
      const games = rows.reduce((sum, r) => sum + r.wins, 0);
      const winRate = total ? Math.round(games / total * 100) : 0;
      return `
        <header class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><div class="eyebrow">Rendimiento personal</div><h2 class="mt-1 text-xl font-extrabold">Estadísticas por campeón</h2>
          <p class="mt-1 text-ink-dim">Compara victorias, KDA y farmeo de tus partidas recientes.</p></div>
          <div class="flex items-center gap-2"><span class="chip ${s.live ? 'chip-win' : ''}">${s.live ? 'Datos de Riot API' : 'Modo local · demostración'}</span>
          <button class="btn btn-sm" data-action="refresh">${icon('refresh', 13)} Actualizar</button></div>
        </header>
        <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="card p-4"><div class="eyebrow">Partidas analizadas</div><div class="num mt-2 text-2xl font-bold">${total}</div></div>
          <div class="card p-4"><div class="eyebrow">Victorias</div><div class="num mt-2 text-2xl font-bold text-win">${winRate}%</div></div>
          <div class="card p-4"><div class="eyebrow">Campeones jugados</div><div class="num mt-2 text-2xl font-bold text-crimson">${rows.length}</div></div>
        </div>
        <section class="card overflow-hidden">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
            <div class="flex flex-wrap gap-1">${(['all', ...ROLES] as const).map((r) => `<button class="pill" aria-pressed="${s.role === r}" data-action="role" data-id="${r}">${r === 'all' ? 'Todos los roles' : ROLE_LABEL[r]}</button>`).join('')}</div>
            <label class="flex items-center gap-2 text-xs text-ink-dim">Ordenar
              <select class="!w-auto" data-change="sort"><option value="games" ${s.sort === 'games' ? 'selected' : ''}>Más jugados</option><option value="winRate" ${s.sort === 'winRate' ? 'selected' : ''}>Winrate</option><option value="kda" ${s.sort === 'kda' ? 'selected' : ''}>KDA</option><option value="cs" ${s.sort === 'cs' ? 'selected' : ''}>CS/min</option></select>
            </label>
          </div>
          ${rows.length ? `<div class="overflow-x-auto"><table class="w-full min-w-[720px] text-left"><thead class="text-[10px] uppercase tracking-wider text-ink-mute"><tr><th class="p-3">Campeón</th><th class="p-3">Rol</th><th class="p-3">Partidas</th><th class="p-3">Victorias</th><th class="p-3">K / D / A</th><th class="p-3">KDA</th><th class="p-3">CS/min</th></tr></thead><tbody>${rows.map((r) => `<tr class="border-t border-line/70 hover:bg-surface-2/60"><td class="p-3"><div class="flex items-center gap-2.5">${champIcon(r.champion, 36)}<span class="font-semibold">${esc(r.championName)}</span></div></td><td class="p-3 text-ink-dim">${ROLE_LABEL[r.role]}</td><td class="num p-3">${r.count}</td><td class="num p-3 ${r.winRate >= 50 ? 'text-win' : 'text-loss'}">${r.winRate}% <span class="text-ink-mute">(${r.wins}V/${r.losses}D)</span></td><td class="num p-3">${r.avgKills.toFixed(1)} / ${r.avgDeaths.toFixed(1)} / ${r.avgAssists.toFixed(1)}</td><td class="num p-3 font-bold">${r.kdaRatio.toFixed(2)}</td><td class="num p-3">${r.csPerMin.toFixed(1)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="p-10 text-center text-ink-dim">Todavía no hay partidas para este rol.</div>'}
          <div class="border-t border-line px-3 py-2 text-[11px] text-ink-mute">Las métricas reflejan únicamente las partidas cargadas. El modo local usa partidas de ejemplo.</div>
        </section>`;
    },
    actions: {
      role: ({ data }) => ({ role: data.id as Role | 'all' }),
      refresh: () => readRows(),
    },
    changes: { sort: ({ value }) => ({ sort: value as State['sort'] }) },
  });
}
