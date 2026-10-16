import { CHAMP_BY_ID } from '../../data/champions';
import { REGIONS } from '../../data/mock';
import { ROLE_LABEL, ROLES } from '../../types';
import { isOneTrick, recommendBans, totalGames } from '../../lib/clashEngine';
import { champIcon, esc, icon, roleIcon, sk } from '../../lib/ui';
import { scoutDraft, type ClashState } from './state';
import { getApiStatus } from '../../data/api';

const threatColor = { crítica: 'var(--color-crimson)', alta: 'var(--color-gold)', media: 'var(--color-ink-dim)' } as const;

function form(s: ClashState): string {
  const status = getApiStatus();
  return `
  <section class="card p-4">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="section-title">Equipo rival</h3>
      <span class="chip">${icon('users', 11)} 5 rivales</span>
    </div>
    <div class="field mb-3">
      <label for="sc-region">Región</label>
      <select id="sc-region" data-change="sc-region">
        ${REGIONS.map((r) => `<option value="${r.id}" ${r.id === scoutDraft.region ? 'selected' : ''}>${r.label}</option>`).join('')}
      </select>
    </div>
    <div class="grid gap-2">
      ${ROLES.map((role, i) => `
        <div class="flex items-center gap-2">
          <span class="grid h-9 w-9 flex-none place-items-center rounded-lg border border-line-strong bg-canvas text-crimson" data-tip="${ROLE_LABEL[role]}">${roleIcon(role, 16)}</span>
          <input id="sc-n${i}" class="input" data-input="sc-name" data-i="${i}" value="${esc(scoutDraft.inputs[i].name)}" placeholder="Nombre de invocador" autocomplete="off" spellcheck="false" aria-label="Nombre ${ROLE_LABEL[role]}"/>
          <input id="sc-t${i}" class="input !w-[88px]" data-input="sc-tag" data-i="${i}" value="${esc(scoutDraft.inputs[i].tag)}" placeholder="#TAG" autocomplete="off" spellcheck="false" aria-label="Tag ${ROLE_LABEL[role]}"/>
        </div>`).join('')}
    </div>
    <div class="mt-4 flex gap-2">
      <button class="btn btn-primary flex-1" data-action="scout-load" ${s.scouting ? 'disabled' : ''}>
        ${icon('search', 14, s.scouting ? 'animate-pulse' : '')} ${s.scouting ? 'Consultando Riot API…' : 'Cargar equipo rival'}
      </button>
      <button class="btn" data-action="scout-sample" ${s.scouting ? 'disabled' : ''} data-tip="Rellenar con un equipo de ejemplo">${icon('download', 14)}</button>
    </div>
    
    <div class="mt-3.5 rounded-lg border border-line bg-canvas/60 p-2.5 text-[11px] leading-snug">
      <div class="flex items-center justify-between font-semibold text-ink-dim">
        <span class="flex items-center gap-1.5">${icon('radio', 12, 'text-crimson')} Conexión Riot API</span>
        <span class="chip ${status.status === 'live' ? 'chip-crimson' : ''} !px-1.5 !py-0 text-[10px]">
          ${status.status === 'live' ? 'En vivo' : 'Proxy activo'}
        </span>
      </div>
      <p class="mt-1 text-ink-mute">
        Cruza los 3 campeones con mayor maestría de <code class="text-ink-dim">Champion-Mastery-V4</code> con el historial reciente de <code class="text-ink-dim">Match-V5</code> para detectar One-Tricks y calcular el Ban Priority Score.
      </p>
    </div>
  </section>`;
}

function bansCard(s: ClashState): string {
  const bans = recommendBans(s.enemy, s.team);
  const on = bans.filter((b) => s.bansOn[b.champ] !== false);
  const totalScore = bans.reduce((a, b) => a + Math.max(0, b.score), 0) || 1;
  const covered = (on.reduce((a, b) => a + Math.max(0, b.score), 0) / totalScore) * 100;

  return `
  <section class="card p-4">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="section-title">5 Bans Óptimos recomendados</h3>
          <span class="chip chip-crimson !px-2 !py-0.5 text-[10.5px]">Motor de IA</span>
        </div>
        <p class="section-sub mt-0.5">Ponderación estratégica: Maestría total de puntos + Winrate reciente en Match-V5 + Condición One-Trick (>50% de partidas).</p>
      </div>
      <div class="text-right">
        <div class="eyebrow">Amenaza neutralizada</div>
        <div class="num text-[22px] font-bold text-gold">${Math.round(covered)}%</div>
      </div>
    </div>
    
    <div class="mt-4 flex justify-center gap-3" aria-label="Previsualización de bans">
      ${bans.map((b, i) => {
        const active = s.bansOn[b.champ] !== false;
        return `<div class="relative ${active ? '' : 'opacity-35'}">
          ${champIcon(b.champ, 58, '!border-crimson/60')}
          ${active ? '<span class="pointer-events-none absolute inset-0 grid place-items-center text-crimson drop-shadow-[0_0_6px_rgba(255,46,77,.9)]">' + icon('ban', 56) + '</span>' : ''}
          <span class="num absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-crimson text-[10px] font-extrabold text-white">${i + 1}</span>
        </div>`;
      }).join('')}
    </div>

    <div class="mt-4 grid gap-2.5">
      ${bans.map((b, i) => {
        const active = s.bansOn[b.champ] !== false;
        const c = threatColor[b.threat];
        const champObj = CHAMP_BY_ID[b.champ];
        const champName = champObj ? champObj.name : b.champ;
        return `
        <div class="card-inset flex items-start gap-3 p-3 ${active ? '' : 'opacity-50'}">
          <span class="num mt-2 w-5 text-center text-[13px] font-bold text-ink-mute">${i + 1}</span>
          <div class="mt-0.5">${champIcon(b.champ, 46)}</div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <b class="text-[14px] text-ink">${esc(champName)}</b>
              <span class="text-[11.5px] text-ink-mute">de <b class="text-ink-dim">${esc(b.owner)}</b> (${ROLE_LABEL[b.role] || b.role})</span>
              <span class="chip" style="color:${c};border-color:${c}66;background:${c}1a">Amenaza ${b.threat} · ${b.score} pts</span>
              ${b.isOtp ? '<span class="chip chip-crimson !px-1.5 !py-0 text-[10px] font-bold">OTP RIVAL</span>' : ''}
            </div>

            <!-- Consejo táctico generado para la fase de bloqueo -->
            <div class="mt-1.5 flex items-center gap-2 rounded-md border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11.5px] font-medium text-gold">
              ${icon('zap', 13, 'text-gold flex-none')}
              <span class="leading-tight">${esc(b.tacticalAdvice)}</span>
            </div>

            <div class="mt-1.5 flex flex-wrap gap-1.5">
              ${b.reasons.map((r) => `<span class="chip ${r.startsWith('One-Trick') || r.startsWith('OTP') ? 'chip-crimson' : r.startsWith('Counter') ? 'chip-gold' : ''}">${r}</span>`).join('')}
            </div>
          </div>
          <div class="w-[84px] flex-none text-right">
            <div class="num text-[15px] font-bold" style="color:${c}">${Math.max(0, Math.round(b.score))}</div>
            <div class="bar-track mt-1"><div class="bar-fill" style="width:${Math.min(100, Math.max(4, b.score))}%;background:${c}"></div></div>
          </div>
          <label class="relative mt-2 inline-flex cursor-pointer items-center" data-tip="${active ? 'Banear' : 'No banear'}">
            <input type="checkbox" class="peer sr-only" data-change="ban" data-id="${b.champ}" ${active ? 'checked' : ''} aria-label="Banear ${esc(champName)}"/>
            <span class="h-5 w-9 rounded-full bg-[#262b38] transition-colors peer-checked:bg-crimson peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-crimson"></span>
            <span class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></span>
          </label>
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

function playerCard(p: ClassPlayer, color: string): string {
  const total = totalGames(p.player);
  const otp = isOneTrick(p.player);
  const topChamp = p.player.pool[0];
  const topChampName = topChamp && CHAMP_BY_ID[topChamp.champ] ? CHAMP_BY_ID[topChamp.champ].name : (topChamp?.champ ?? '');

  return `
  <article class="card p-3.5 ${otp ? '!border-crimson/40' : ''}" style="${otp ? 'background:linear-gradient(180deg, rgb(255 46 77 / .07), var(--color-surface))' : ''}">
    <div class="flex items-center gap-2.5">
      <span class="grid h-8 w-8 flex-none place-items-center rounded-lg border border-line-strong bg-canvas text-crimson">${roleIcon(p.player.role, 16)}</span>
      <div class="min-w-0 flex-1 leading-tight">
        <div class="truncate text-[13px] font-bold">${esc(p.player.name)}<span class="font-medium text-ink-mute">#${esc(p.player.tag)}</span></div>
        <div class="text-[11px] text-ink-dim">${ROLE_LABEL[p.player.role]}</div>
      </div>
      ${p.player.isLive ? '<span class="chip chip-crimson !px-1.5 !py-0 text-[10px]">Riot API</span>' : '<span class="chip !px-1.5 !py-0 text-[10px] text-ink-mute">Scout</span>'}
      <span class="chip chip-gold">${p.player.rank}</span>
    </div>

    ${otp && topChamp ? `<div class="mt-2.5 flex items-center gap-2 rounded-lg border border-crimson/40 bg-crimson/10 px-2.5 py-1.5 text-[11.5px] font-bold text-crimson">${icon('flame', 14)} ONE-TRICK · ${esc(topChampName)} (${Math.round((topChamp.games / Math.max(1, total)) * 100)}%)</div>` : ''}

    <div class="mt-3 grid gap-2">
      ${p.player.pool.map((e) => {
        const champObj = CHAMP_BY_ID[e.champ];
        const name = champObj ? champObj.name : e.champ;
        return `
        <div class="flex items-center gap-2">
          ${champIcon(e.champ, 28)}
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between text-[11.5px]">
              <span class="truncate font-semibold">${esc(name)}</span>
              <span class="num ${e.wr >= 55 ? 'text-gold' : e.wr >= 50 ? 'text-win' : 'text-loss'} font-bold">${e.wr}%</span>
            </div>
            <div class="bar-track mt-0.5 !h-1"><div class="bar-fill" style="width:${(e.games / Math.max(1, total)) * 100}%;background:${color}"></div></div>
          </div>
          <span class="num w-[26px] text-right text-[10.5px] text-ink-mute">${e.games}</span>
          <span class="chip !px-1.5 !py-0 ${e.mastery === 'M7' ? 'chip-crimson' : ''}">${e.mastery} · ${e.points}</span>
        </div>`;
      }).join('')}
    </div>
  </article>`;
}

interface ClassPlayer { player: ClashState['enemy'][number] }

function skeletonRight(): string {
  return `<div class="grid gap-4">${sk('h-[330px]')}<div class="grid grid-cols-2 gap-4">${sk('h-[170px]')}${sk('h-[170px]')}${sk('h-[170px]')}${sk('h-[170px]')}</div></div>`;
}

export function renderScouting(s: ClashState): string {
  let right: string;
  if (s.scouting) right = skeletonRight();
  else if (!s.enemy.length) {
    right = `
      <section class="card grid place-items-center gap-2 py-24 text-center text-ink-dim">
        ${icon('eye', 34)}
        <p class="max-w-[340px]">
          Ingresa a los 5 rivales con sus Riot IDs y haz clic en <b class="text-ink">Cargar equipo rival</b> para analizar sus maestrías de <code class="text-crimson">Champion-Mastery-V4</code> y partidas de <code class="text-crimson">Match-V5</code>.
        </p>
      </section>`;
  } else {
    right = `
      <div class="grid gap-4">
        ${bansCard(s)}
        <div>
          <div class="mb-2 flex items-center justify-between">
            <h3 class="section-title">Scouting de los 5 rivales</h3>
            <span class="text-[11.5px] text-ink-dim">Top 3 picks por maestría y partidas analizadas</span>
          </div>
          <div class="grid grid-cols-2 gap-3 xl:grid-cols-3">
            ${s.enemy.map((p, i) => playerCard({ player: p }, ['#ff2e4d', '#e0a96d', '#4c8dff', '#10b981', '#9aa7ff'][i % 5])).join('')}
          </div>
        </div>
      </div>`;
  }
  return `<div class="grid items-start gap-4" style="grid-template-columns:minmax(340px,0.55fr) minmax(0,1.45fr)">${form(s)}${right}</div>`;
}
