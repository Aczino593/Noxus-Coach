import { createView, type View } from '../lib/view';
import {
  champIcon, esc, fmtNum, gauge, icon, itemIcon, emptySlot, perkIcon, roleFilter, roleIcon, sk, spellIcon,
} from '../lib/ui';
import { profileImg } from '../lib/assets';
import { scale, smoothPath, type Pt } from '../lib/charts';
import { fetchSummonerProfile, type AggregatedDataResult } from '../data/api';
import { mountMatchDetailView } from './MatchDetailView';
import {
  ACCOUNT, LAST_10, LP_BANDS, LP_SERIES, QUEUE_LABEL, REGIONS, SUMMARY, type Match, type Account,
} from '../data/mock';
import { CHAMP_BY_ID } from '../data/champions';
import type { Queue, Role } from '../types';

interface State {
  loading: boolean;
  matches: Match[];
  queue: Queue;
  role: Role | 'all';
  champ: string | null;
  champPanel: boolean;
  expanded: string | null;
  selectedMatchId: string | null;
  searched: { name: string; tag: string; region: string };
  account: Account;
  isLive: boolean;
  apiNotice?: string;
  aggregated?: AggregatedDataResult;
}

const QUEUES: Queue[] = ['solo', 'flex', 'quick', 'clash'];
const draft = { region: ACCOUNT.region, name: ACCOUNT.name, tag: ACCOUNT.tag };

/* ─────────────── Cabecera: buscador + cuenta ─────────────── */
function searchBar(s: State): string {
  return `
  <form id="form-summoner-search" class="card flex flex-wrap items-center gap-3 p-3.5" data-submit="search" onsubmit="event.preventDefault();">
    <div class="field" style="min-width:210px">
      <label for="input-summoner-region">Región</label>
      <select id="input-summoner-region" data-change="region">
        ${REGIONS.map((r) => `<option value="${r.id}" ${r.id === draft.region ? 'selected' : ''}>${r.label}</option>`).join('')}
      </select>
    </div>
    <div class="field" style="min-width:190px">
      <label for="input-summoner-name">Nombre del invocador</label>
      <input id="input-summoner-name" data-input="name" value="${esc(draft.name)}" autocomplete="off" spellcheck="false" placeholder="Invocador"/>
    </div>
    <div class="field" style="min-width:120px">
      <label for="input-summoner-tag">Lema (#TAG)</label>
      <input id="input-summoner-tag" data-input="tag" value="${esc(draft.tag)}" autocomplete="off" spellcheck="false" placeholder="TAG"/>
    </div>
    <button type="button" class="btn" data-action="reset">Restablecer</button>
    <button type="submit" class="btn btn-light" data-action="search">${icon('search', 14)} Buscar</button>

    <div class="ml-auto flex items-center gap-3 rounded-xl border border-line bg-canvas px-3 py-2">
      <img src="${profileImg(s.account.profileIcon)}" width="44" height="44" alt="" class="rounded-xl border border-crimson/50" data-fb="${esc(s.account.name.slice(0, 2).toUpperCase())}" style="width:44px;height:44px;border-radius:12px"/>
      <div class="leading-tight">
        <div class="flex items-center gap-2">
          <div class="text-[14px] font-bold">${esc(s.account.name)}<span class="font-medium text-ink-mute"> #${esc(s.account.tag)}</span></div>
          ${s.isLive ? '<span class="chip chip-crimson !px-1.5 !py-0 text-[10px]">' + icon('radio', 10) + ' Riot API</span>' : s.apiNotice ? '<span class="chip chip-crimson !px-1.5 !py-0 text-[10px]">Sin datos</span>' : '<span class="chip !px-1.5 !py-0 text-[10px] text-ink-mute">Modo Local</span>'}
        </div>
        <div class="mt-1 flex items-center gap-1.5">
          <span class="chip chip-gold">${icon('shield', 11)} ${s.account.solo ? s.account.solo.tier + ' ' + s.account.solo.division : 'UNRANKED'}</span>
          <span class="num text-[11px] text-ink-dim">${s.account.solo?.lp ?? 0} LP · ${s.account.solo?.wins ?? 0}V ${s.account.solo?.losses ?? 0}D</span>
          <span class="chip !px-1.5 !py-0 text-[10px]">Nvl ${s.account.level}</span>
        </div>
      </div>
    </div>
  </form>
  ${s.apiNotice ? `
    <div class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-loss/50 bg-loss/10 px-4 py-3 text-[13px] font-semibold text-loss shadow-sm" role="alert">
      <div class="flex items-center gap-2.5">
        ${icon('alert', 16, 'text-loss flex-none')}
        <span>${esc(s.apiNotice)}</span>
      </div>
      <span class="text-[11.5px] font-normal text-ink-dim">Región actual: <b>${esc(s.searched.region)}</b></span>
    </div>
  ` : ''}`;
}

function filters(s: State): string {
  const champs = [...new Set(s.matches.map((m) => m.champ))];
  return `
  <div class="mt-3 flex flex-wrap items-center gap-2">
    ${QUEUES.map(
      (q) => `<button class="pill" aria-pressed="${s.queue === q}" data-action="queue" data-id="${q}">${q === 'clash' ? icon('trophy', 13) : ''}${QUEUE_LABEL[q]}</button>`,
    ).join('')}
    <span class="mx-1 h-6 w-px bg-line"></span>
    <div class="flex gap-1.5">
      <button class="role-btn" aria-pressed="${s.role === 'all'}" data-action="role" data-id="all" data-tip="Todos los roles" aria-label="Todos los roles">${icon('grid', 15)}</button>
      ${roleFilter(s.role)}
    </div>
    <button class="btn ml-1" data-action="champ-panel" aria-expanded="${s.champPanel}">${icon('sliders', 14)} Filtrar campeones${s.champ ? ` · <span class="text-crimson">${esc(CHAMP_BY_ID[s.champ]?.name ?? s.champ)}</span>` : ''}</button>
    <button class="btn ml-auto" data-action="refresh" ${s.loading ? 'disabled' : ''}>${icon('refresh', 14, s.loading ? 'animate-spin' : '')} Actualizar</button>
  </div>
  ${
    s.champPanel
      ? `<div class="card-inset anim-fade-up mt-2 flex flex-wrap items-center gap-2 p-2.5">
          <button class="pill !h-[30px]" aria-pressed="${s.champ === null}" data-action="champ" data-id="">Todos</button>
          ${champs.map((c) => `<button class="rounded-lg p-0.5 ${s.champ === c ? 'ring-2 ring-crimson' : 'opacity-70 hover:opacity-100'}" data-action="champ" data-id="${c}" aria-label="${CHAMP_BY_ID[c]?.name}">${champIcon(c, 34)}</button>`).join('')}
        </div>`
      : ''
  }`;
}

/* ─────────────── Widget: Rendimiento Agrupado Header ─────────────── */
function performanceOverviewHeader(s: State): string {
  if (s.loading || !s.aggregated) return '';

  const agg = s.aggregated;
  const most = agg.mostPlayedChampion;
  const best = agg.bestKdaChampion;
  const worst = agg.worstKdaChampion;
  const glob = agg.globalMetrics;

  return `
  <div class="mt-3 card p-4 border border-line bg-canvas">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-crimson animate-pulse"></span>
        <span class="text-[12.5px] font-bold uppercase tracking-wider text-ink">Rendimiento Agrupado · Resumen de Clasificatorias</span>
        <span class="chip !py-0 !px-1.5 text-[10px] text-ink-dim">Últimas ${glob.totalMatches} partidas</span>
      </div>
      <div class="flex items-center gap-3 text-[11.5px] text-ink-dim">
        <span>WR: <strong class="${glob.winRate >= 50 ? 'text-win' : 'text-loss'} font-bold">${glob.winRate}%</strong> (${glob.totalWins}V ${glob.totalLosses}D)</span>
        <span class="h-3 w-px bg-line"></span>
        <span>KDA: <strong class="text-ink font-bold">${glob.overallKda.toFixed(2)}</strong></span>
        <span class="h-3 w-px bg-line"></span>
        <span>CS/m: <strong class="text-gold font-bold">${glob.avgCsPerMin.toFixed(1)}</strong></span>
        <span class="h-3 w-px bg-line"></span>
        <span>Pinks: <strong class="text-ink font-bold">${glob.avgControlWards.toFixed(1)}/p</strong></span>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <!-- Más Jugado -->
      <div class="card-inset p-3 flex items-center gap-3">
        ${most ? champIcon(most.champion, 42) : '<div class="w-10 h-10 rounded-xl bg-canvas border border-line"></div>'}
        <div class="flex-1 min-w-0 leading-tight">
          <div class="text-[10px] font-bold uppercase text-ink-dim tracking-wider">Más Jugado</div>
          <div class="text-[13px] font-bold text-ink truncate mt-0.5">${most ? esc(most.championName) : 'Sin datos'}</div>
          <div class="mt-1 flex items-center gap-2 text-[11px]">
            <span class="chip ${most && most.winRate >= 50 ? 'chip-win' : 'chip-loss'} !py-0 !px-1.5 font-bold">${most ? most.winRate : 0}% WR</span>
            <span class="text-ink-mute">${most ? most.count : 0} partidas</span>
          </div>
        </div>
      </div>

      <!-- Mejor KDA -->
      <div class="card-inset p-3 flex items-center gap-3 border border-win/20 bg-win/5">
        ${best ? champIcon(best.champion, 42) : '<div class="w-10 h-10 rounded-xl bg-canvas border border-line"></div>'}
        <div class="flex-1 min-w-0 leading-tight">
          <div class="text-[10px] font-bold uppercase text-win tracking-wider">Mejor KDA</div>
          <div class="text-[13px] font-bold text-ink truncate mt-0.5">${best ? esc(best.championName) : 'Sin datos'}</div>
          <div class="mt-1 flex items-center gap-2 text-[11px]">
            <span class="num font-bold text-win">${best ? best.kdaRatio.toFixed(1) : 0} KDA</span>
            <span class="text-ink-mute">${best ? `${best.winRate}% WR (${best.count}p)` : ''}</span>
          </div>
        </div>
      </div>

      <!-- Peor KDA -->
      <div class="card-inset p-3 flex items-center gap-3 border border-loss/20 bg-loss/5">
        ${worst ? champIcon(worst.champion, 42) : '<div class="w-10 h-10 rounded-xl bg-canvas border border-line"></div>'}
        <div class="flex-1 min-w-0 leading-tight">
          <div class="text-[10px] font-bold uppercase text-loss tracking-wider">Menor KDA</div>
          <div class="text-[13px] font-bold text-ink truncate mt-0.5">${worst ? esc(worst.championName) : 'Sin datos'}</div>
          <div class="mt-1 flex items-center gap-2 text-[11px]">
            <span class="num font-bold text-loss">${worst ? worst.kdaRatio.toFixed(1) : 0} KDA</span>
            <span class="text-ink-mute">${worst ? `${worst.winRate}% WR (${worst.count}p)` : ''}</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ─────────────── Widget: partidas + racha + campeones ─────────────── */
function summary(s: State, list: Match[]): string {
  if (s.loading) {
    return `<div class="card p-4">
      <div class="grid grid-cols-2 gap-3">${sk('h-[92px]')}${sk('h-[92px]')}</div>
      <div class="mt-5">${sk('h-4 w-40')}<div class="mt-2">${sk('h-3 w-full')}</div></div>
      <div class="mt-5 grid grid-cols-3 gap-2">${sk('h-12')}${sk('h-12')}${sk('h-12')}</div>
    </div>`;
  }
  const solo = s.queue === 'solo';
  const wins = list.filter((m) => m.result === 'win').length;
  const games = s.aggregated?.globalMetrics?.totalMatches ?? (solo ? SUMMARY.games : list.length);
  const wr = s.aggregated?.globalMetrics?.winRate ?? (solo ? SUMMARY.winrate : list.length ? (wins / list.length) * 100 : 0);
  const recent = list.slice(0, 10);
  const w10 = recent.filter((m) => m.result === 'win').length;
  const l10 = recent.length - w10;
  const recentResults = recent.map((m) => (m.result === 'win' ? 'W' : 'L'));

  const champList = (s.aggregated?.championStats && s.aggregated.championStats.length > 0)
    ? s.aggregated.championStats.slice(0, 3).map((c) => ({
        champ: c.champion,
        w: c.wins,
        l: c.losses,
        r: c.winRate,
      }))
    : SUMMARY.champs.map((c) => {
        const total = c.w + c.l;
        const r = total ? Math.round((c.w / total) * 100) : 0;
        return { champ: c.id, w: c.w, l: c.l, r };
      });

  return `
  <div class="card p-4">
    <div class="grid grid-cols-2 gap-3">
      <div class="card-inset grid place-content-center py-5 text-center">
        <div class="num text-[34px] font-bold leading-none">${games}</div>
        <div class="mt-2 text-[12px] text-ink-dim">Partidas</div>
      </div>
      <div class="card-inset grid place-content-center py-5 text-center" style="background:linear-gradient(160deg, rgb(255 46 77 / .16), rgb(255 46 77 / .03))">
        <div class="num text-[34px] font-bold leading-none text-crimson">${fmtNum(wr)}%</div>
        <div class="mt-2 text-[12px] text-ink-dim">Porcentaje de victorias</div>
      </div>
    </div>
    <div class="mt-5">
      <div class="mb-2 flex items-center justify-between text-[12px]">
        <span class="text-ink-dim">Últimas ${recent.length || 10} partidas</span>
        <span class="num font-bold"><span class="text-win">${w10}V</span> <span class="text-loss">${l10}D</span></span>
      </div>
      <div class="grid grid-cols-10 gap-1" role="img" aria-label="Racha de partidas recientes">
        ${(recentResults.length ? recentResults : LAST_10).map((r) => `<span class="h-2 rounded-full" style="background:${r === 'W' ? 'var(--color-win)' : 'var(--color-loss)'};${r === 'W' ? 'box-shadow:0 0 8px -1px rgb(16 185 129 / .6)' : ''}"></span>`).join('')}
      </div>
    </div>
    <div class="mt-4 grid grid-cols-3 gap-2">
      ${champList
        .map((c) => {
          return `<div class="card-inset flex items-center gap-2 p-1.5">
            ${champIcon(c.champ, 34)}
            <div class="leading-tight">
              <div class="num text-[11px]"><span class="text-win">${c.w}V</span> <span class="text-loss">${c.l}D</span></div>
              <div class="num text-[11px] font-semibold ${c.r >= 50 ? 'text-gold' : 'text-ink-mute'}">${c.r}%</div>
            </div>
          </div>`;
        })
        .join('')}
    </div>
  </div>`;
}

/* ─────────────── Gráfico de LP ─────────────── */
function lpChart(s: State): string {
  const head = `<div class="mb-3 flex items-center justify-between">
      <h3 class="text-[13px] font-bold">Gráfico de LP en ${QUEUE_LABEL[s.queue === 'flex' ? 'flex' : 'solo']}</h3>
      <span class="chip chip-gold">${icon('shield', 11)} ${ACCOUNT.solo!.tier} ${ACCOUNT.solo!.division} · ${ACCOUNT.solo!.lp} LP</span>
    </div>`;
  if (s.loading) return `<div class="card p-4">${head}${sk('h-[230px] w-full')}</div>`;
  if (s.queue !== 'solo' && s.queue !== 'flex') {
    return `<div class="card grid place-content-center p-4 text-center"><div class="text-ink-mute">${icon('chart', 28)}</div><p class="mt-2 text-[12.5px] text-ink-dim">Esta cola no otorga LP.<br/>Elige Solo/Dúo o Flexible para ver la evolución.</p></div>`;
  }
  const W = 620, H = 232, padL = 12, padR = 14, padT = 14, padB = 16;
  const lo = -25, hi = 150;
  const pts: Pt[] = LP_SERIES.map((v, i) => [
    scale(i, 0, LP_SERIES.length - 1, padL, W - padR),
    scale(v, lo, hi, H - padB, padT),
  ]);
  const line = smoothPath(pts);
  const last = pts[pts.length - 1];
  const area = `${line} L${last[0]},${H - padB} L${pts[0][0]},${H - padB} Z`;
  const bands = LP_BANDS.filter((b) => b.at > lo && b.at < hi)
    .map((b) => {
      const y = scale(b.at, lo, hi, H - padB, padT);
      return `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="#e0a96d" stroke-opacity=".35" stroke-dasharray="5 5"/>
        <text x="${padL + 4}" y="${y - 5}" fill="#e0a96d" fill-opacity=".8" font-size="10" font-weight="600">${b.label}</text>`;
    })
    .join('');
  return `<div class="card p-4">${head}
    <svg viewBox="0 0 ${W} ${H}" class="h-[230px] w-full" role="img" aria-label="Evolución de LP">
      <defs>
        <linearGradient id="lp-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff2e4d" stop-opacity=".32"/><stop offset="1" stop-color="#ff2e4d" stop-opacity="0"/></linearGradient>
      </defs>
      ${bands}
      <path d="${area}" fill="url(#lp-fill)"/>
      <path d="${line}" fill="none" stroke="#ff2e4d" stroke-width="2.4" stroke-linecap="round" style="filter:drop-shadow(0 0 6px rgb(255 46 77 / .6))"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="9" fill="#ff2e4d" fill-opacity=".18"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="#ff2e4d" stroke="#fff" stroke-width="1.5"/>
    </svg></div>`;
}

/* ─────────────── Fila de partida ─────────────── */
function mmss(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function matchRow(m: Match): string {
  const win = m.result === 'win';
  const mins = m.durationSec / 60;
  const items = Array.from({ length: 6 }, (_, i) => (m.items[i] ? itemIcon(m.items[i], 30) : emptySlot(30)));
  const macro =
    m.macroScore === null
      ? `<div class="flex flex-col items-center gap-1.5" data-tip="Desbloquea el análisis de macro con IA">
          <span class="grid h-[52px] w-[52px] place-items-center rounded-full border border-dashed border-line-strong bg-canvas text-ink-mute">${icon('lock', 20)}</span>
          <span class="text-[10.5px] text-ink-dim">AI Macro Score</span></div>`
      : `<div class="flex flex-col items-center gap-1.5">
          <span class="num grid h-[52px] w-[52px] place-items-center rounded-full border border-gold/50 text-[16px] font-bold text-gold" style="background:radial-gradient(circle at 50% 30%, rgb(224 169 109 / .22), rgb(224 169 109 / .04));box-shadow:0 0 18px -4px rgb(224 169 109 / .5)">${m.macroScore}</span>
          <span class="text-[10.5px] text-ink-dim">AI Macro Score</span></div>`;

  return `
  <article class="match-row anim-fade-up group hover:border-crimson/50 hover:shadow-[0_0_24px_-8px_rgba(255,46,77,0.35)] transition-all cursor-pointer" data-result="${m.result}">
    <button class="grid w-full items-center gap-4 px-4 py-3 text-left" style="grid-template-columns:128px 170px 90px 128px 112px 96px 96px minmax(75px,auto)" data-action="select-match" data-id="${m.id}" title="Ver desglose analítico de la partida">
      <div>
        <div class="text-[16px] font-extrabold ${win ? 'text-win' : 'text-loss'}">${win ? 'Victoria' : 'Derrota'}</div>
        <div class="text-[11.5px] leading-tight text-ink-dim">${QUEUE_LABEL[m.queue]}</div>
        <div class="num mt-0.5 text-[11px] text-ink-mute">${mmss(m.durationSec)} · ${m.date}</div>
        ${m.lp !== null ? `<div class="num mt-0.5 text-[11px] font-bold ${m.lp > 0 ? 'text-win' : 'text-loss'}">${m.lp > 0 ? '+' : ''}${m.lp} LP</div>` : ''}
      </div>
      <div class="flex items-center gap-2.5">
        <div class="relative">${champIcon(m.champ, 56, win ? '!border-win/50' : '!border-loss/50')}
          <span class="absolute -bottom-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-md border border-line-strong bg-canvas text-crimson">${roleIcon(m.role, 12)}</span></div>
        <span class="flex flex-col items-center text-[9.5px] font-bold text-ink-mute">${icon('swords', 13)}VS</span>
        ${champIcon(m.rival, 40)}
      </div>
      <div class="flex items-center gap-1.5">
        <div class="grid gap-1">${spellIcon(m.spells[0], 22)}${spellIcon(m.spells[1], 22)}</div>
        <div class="grid gap-1">${perkIcon(m.keystone.path, 22, m.keystone.name)}${perkIcon(m.secondary.path, 22, m.secondary.name)}</div>
      </div>
      <div class="flex items-center gap-1">
        <div class="grid grid-cols-3 gap-[3px]">${items.join('')}</div>
        ${itemIcon(m.ward, 30)}
      </div>
      <div class="num text-[12px] leading-[1.7]">
        <div class="flex justify-between gap-2"><span class="text-ink-mute">K/D/A</span><b>${m.k}/<span class="text-loss">${m.d}</span>/${m.a}</b></div>
        <div class="flex justify-between gap-2"><span class="text-ink-mute">CS/m</span><b>${fmtNum(m.cs / mins)}</b></div>
        <div class="flex justify-between gap-2"><span class="text-ink-mute">GPM</span><b>${m.gpm}</b></div>
      </div>
      <div class="flex flex-col items-center gap-1.5">
        ${gauge(m.draftScore * 20, { size: 52, stroke: 5, valueText: fmtNum(m.draftScore) })}
        <span class="text-[10.5px] leading-none text-ink-dim">Puntuación de draft</span>
      </div>
      ${macro}
      <div class="flex items-center justify-end gap-1.5 text-crimson group-hover:translate-x-1 transition-all">
        <span class="text-[11.5px] font-bold hidden sm:inline">Detalle</span>
        ${icon('chevron', 15, '-rotate-90')}
      </div>
    </button>
  </article>`;
}

function matchList(s: State, list: Match[]): string {
  if (s.loading) {
    return `<div class="mt-4 grid gap-3">${Array.from({ length: 4 }, () => sk('h-[88px] w-full !rounded-[14px]')).join('')}</div>`;
  }
  if (!list.length) {
    if (s.apiNotice) {
      return `
      <div class="card mt-4 grid place-items-center gap-3 py-16 text-center">
        <span class="grid h-12 w-12 place-items-center rounded-2xl border border-loss/40 bg-loss/10 text-loss">
          ${icon('alert', 24)}
        </span>
        <div>
          <div class="text-[16px] font-bold text-loss">${esc(s.apiNotice)}</div>
          <p class="mt-1 max-w-md text-[12.5px] text-ink-dim">Verifica que el invocador exista y que la región (<b class="text-ink">${esc(s.searched.region)}</b>) sea la correcta.</p>
        </div>
      </div>`;
    }
    return `<div class="card mt-4 grid place-items-center gap-2 py-14 text-center text-ink-dim">${icon('search', 28)}<p>No hay partidas con estos filtros.</p><button class="btn btn-sm" data-action="clear">Limpiar filtros</button></div>`;
  }
  return `<div class="mt-4 grid gap-3">${list.map((m) => matchRow(m)).join('')}</div>`;
}

export function mountMatchHistory(root: HTMLElement) {
  const view = createView<State>({
    root,
    state: {
      loading: true, matches: [], queue: 'solo', role: 'all', champ: null, champPanel: false, expanded: null,
      selectedMatchId: null,
      searched: { name: ACCOUNT.name, tag: ACCOUNT.tag, region: ACCOUNT.region },
      account: ACCOUNT,
      isLive: false,
    },
    render: (s) => {
      if (s.selectedMatchId) {
        return `<div id="match-detail-slot" class="anim-fade-up"></div>`;
      }
      const list = s.matches.filter(
        (m) => m.queue === s.queue && (s.role === 'all' || m.role === s.role) && (!s.champ || m.champ === s.champ),
      );
      return `
        ${searchBar(s)}
        ${filters(s)}
        ${performanceOverviewHeader(s)}
        <div class="mt-4 grid items-stretch gap-4" style="grid-template-columns:minmax(330px,0.9fr) minmax(0,1.6fr)">
          ${summary(s, list)}
          ${lpChart(s)}
        </div>
        ${matchList(s, list)}`;
    },
    actions: {
      'select-match': ({ data }) => ({ selectedMatchId: data.id || null }),
      queue: ({ data, view }) => {
        const q = data.id as Queue;
        view.set({ queue: q, expanded: null });
        void load(view);
      },
      role: ({ data }) => ({ role: data.id as Role | 'all', expanded: null }),
      'champ-panel': ({ state }) => ({ champPanel: !state.champPanel }),
      champ: ({ data }) => ({ champ: data.id || null, expanded: null }),
      toggle: ({ data, state }) => ({ expanded: state.expanded === data.id ? null : data.id! }),
      clear: () => ({ role: 'all', champ: null }),
      reset: ({ view }) => {
        Object.assign(draft, { region: ACCOUNT.region, name: ACCOUNT.name, tag: ACCOUNT.tag });
        view.refresh();
      },
      search: ({ view, event }) => {
        if (event) {
          event.preventDefault();
        }
        const nameEl = document.getElementById('input-summoner-name') as HTMLInputElement | null;
        const tagEl = document.getElementById('input-summoner-tag') as HTMLInputElement | null;
        const regionEl = document.getElementById('input-summoner-region') as HTMLSelectElement | null;

        const gameName = (nameEl?.value ?? draft.name).trim();
        const tagLine = (tagEl?.value ?? draft.tag).replace(/^#+/, '').trim();
        const region = regionEl?.value ?? draft.region;

        draft.name = gameName;
        draft.tag = tagLine;
        draft.region = region;

        view.set({
          searched: { name: gameName, tag: tagLine, region },
          selectedMatchId: null,
          apiNotice: undefined,
        });
        void load(view);
      },
      refresh: ({ view }) => {
        void load(view);
      },
    },
    inputs: {
      name: ({ value }) => void (draft.name = value),
      tag: ({ value }) => void (draft.tag = value),
    },
    changes: { region: ({ value }) => void (draft.region = value) },
    afterRender: (v) => {
      if (v.state.selectedMatchId) {
        const slot = root.querySelector<HTMLElement>('#match-detail-slot');
        if (slot) {
          mountMatchDetailView(slot, {
            matchId: v.state.selectedMatchId,
            region: v.state.searched.region,
            puuidOrName: v.state.account.name,
            onBack: () => {
              v.set({ selectedMatchId: null });
            },
          });
        }
      }
    },
  });

  async function load(v: View<State>) {
    v.set({ loading: true, expanded: null });
    const s = v.state;
    const queueId = s.queue === 'solo' ? 420 : s.queue === 'flex' ? 440 : undefined;
    const res = await fetchSummonerProfile(s.searched.name, s.searched.tag, s.searched.region, 20, queueId);
    v.set({
      matches: res.matches,
      account: res.account,
      isLive: res.isLive,
      apiNotice: res.error,
      aggregated: res.aggregated,
      loading: false,
    });
  }

  void load(view);
  return view;
}
