import { CHAMP_BY_ID } from '../../data/champions';
import { GROUP_LABEL, TEAM_ITEM_POOL, item } from '../../data/items';
import { ROLE_LABEL, ROLES, type Role } from '../../types';
import { NEEDS, enemyRead, findConflicts, slotConflicts } from '../../lib/clashEngine';
import { getBuild } from '../../lib/buildEngine';
import { champIcon, emptySlot, esc, icon, itemIcon, roleIcon, sk } from '../../lib/ui';
import type { ClashState } from './state';

const POOL_SORTED = [...TEAM_ITEM_POOL].sort((a, b) => item(a).name.localeCompare(item(b).name));

const SUGGEST: Record<Role, number[]> = {
  top: [3110, 3068, 3143, 3193],
  jungle: [3050, 3742, 3053, 3156],
  mid: [3157, 3102, 3001, 3135],
  adc: [3026, 3156, 3033, 6333],
  support: [2065, 3190, 3222, 3107, 3109],
};

function enemyCard(s: ClashState): string {
  const read = enemyRead(s.enemy);
  if (!read.predicted.length) {
    return `<section class="card p-4"><h3 class="section-title">Lectura del rival</h3>
      <p class="mt-2 text-[12.5px] text-ink-dim">Carga el equipo rival en <b class="text-ink">Scouting y Bans</b> para adaptar objetos a sus picks probables.</p></section>`;
  }
  const allItems = s.utility.flat();
  const toneCls = { crimson: 'chip-crimson', gold: 'chip-gold', win: 'chip-win' };
  return `
  <section class="card p-4">
    <div class="flex items-center justify-between"><h3 class="section-title">Lectura del rival (picks probables)</h3>
      <div class="flex gap-1.5">${read.chips.map((c) => `<span class="chip ${toneCls[c.tone]}">${c.label}</span>`).join('')}</div></div>
    <div class="mt-3 flex gap-2">${read.predicted.map((id) => `<div class="text-center">${champIcon(id, 44, '!border-red-side/50')}<div class="mt-1 max-w-[56px] truncate text-[10px] text-ink-dim">${esc(CHAMP_BY_ID[id].name)}</div></div>`).join('')}</div>
    <div class="mt-4 grid gap-1.5">
      ${NEEDS.map((n) => {
        const rel = read.needs[n.key];
        const owners = s.utility.flatMap((u, p) => (u.some(n.groupOrTag) ? [p] : []));
        const needed = rel >= 2;
        const ok = owners.length > 0;
        return `<div class="flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-[12px] ${needed && !ok ? 'border-crimson/50 bg-crimson/10' : 'border-line bg-canvas'}">
          <span class="${ok ? 'text-win' : needed ? 'text-crimson' : 'text-ink-mute'}">${icon(ok ? 'check' : needed ? 'alert' : 'minus', 14)}</span>
          <span class="flex-1"><b>${n.label}</b> <span class="text-ink-mute">· ${n.why} (${rel})</span></span>
          ${owners.length ? `<span class="flex gap-1">${owners.map((p) => champIcon(s.team[p] ?? 'Ornn', 20, '!rounded-md')).join('')}</span>` : needed ? '<span class="chip chip-loss">Sin cobertura</span>' : '<span class="text-[10.5px] text-ink-mute">Opcional</span>'}
        </div>`;
      }).join('')}
    </div>
    <span class="hidden">${allItems.length}</span>
  </section>`;
}

function conflictCard(s: ClashState): string {
  const conflicts = findConflicts(s.utility);
  return `
  <section class="card p-4 ${conflicts.length ? '!border-crimson/50' : '!border-win/40'}" style="${conflicts.length ? 'background:linear-gradient(180deg, rgb(255 46 77 / .08), var(--color-surface))' : ''}">
    <div class="flex items-center justify-between">
      <h3 class="section-title">Solapamiento de pasivas únicas</h3>
      <button class="btn ${conflicts.length ? 'btn-primary' : ''} btn-sm" data-action="auto-resolve" ${conflicts.length ? '' : 'disabled'}>${icon('spark', 13)} Auto-resolver</button>
    </div>
    ${
      conflicts.length
        ? `<p class="section-sub mt-0.5">Dos jugadores con la misma pasiva única desperdician oro: sólo uno debería llevarla.</p>
          <ul class="mt-3 grid gap-2">${conflicts
            .map(
              (c) => `<li class="flex items-center gap-3 rounded-lg border border-crimson/40 bg-canvas px-3 py-2 text-[12.5px]">
                <span class="text-crimson">${icon('alert', 15)}</span>
                <b class="flex-1">${c.label}</b>
                <span class="flex gap-1">${c.players.map((p) => `<span class="flex items-center gap-1 rounded-md border border-line-strong bg-surface px-1.5 py-0.5 text-[10.5px] font-semibold">${roleIcon(ROLES[p], 11)}${ROLE_LABEL[ROLES[p]]}</span>`).join('')}</span>
              </li>`,
            )
            .join('')}</ul>`
        : `<div class="mt-3 flex items-center gap-3 text-win">${icon('check', 20)}<p class="text-[12.5px] text-ink-dim"><b class="text-win">Sin solapamientos.</b> Cada pasiva única (anti-curación, auras, activas) tiene un único responsable.</p></div>`
    }
  </section>`;
}

function playerRow(s: ClashState, p: number): string {
  const id = s.team[p];
  const role = ROLES[p];
  if (!id) {
    return `<div class="card-inset flex items-center gap-3 p-3 text-ink-mute"><span class="text-crimson">${roleIcon(role, 16)}</span>Elige un campeón de ${ROLE_LABEL[role]} en Composición de equipo.</div>`;
  }
  const ch = CHAMP_BY_ID[id];
  const rival = s.enemy[p]?.pool[0].champ ?? null;
  const build = getBuild(id, rival, role);
  const util = s.utility[p];
  const owned = new Set(s.utility.flat());
  const sug = SUGGEST[role].filter((i) => !owned.has(i)).slice(0, 3);

  const slot = (k: number) => {
    const conflict = slotConflicts(s.utility, p, k);
    return `<div class="min-w-0 flex-1">
      <div class="mb-1 flex items-center justify-between"><span class="eyebrow">Slot de equipo ${k + 1}</span>
        ${conflict ? `<span class="chip chip-loss" data-tip="Otro jugador ya lleva esta pasiva">${icon('alert', 10)} Solapa</span>` : '<span class="chip chip-win">OK</span>'}</div>
      <div class="flex items-center gap-2 rounded-xl border p-1.5 ${conflict ? 'border-crimson/60 bg-crimson/10' : 'border-line bg-canvas'}">
        ${itemIcon(util[k], 36)}
        <select class="input !h-9" data-change="util" data-p="${p}" data-k="${k}" aria-label="Objeto de equipo ${k + 1} de ${esc(ch.name)}">
          ${POOL_SORTED.map((i) => `<option value="${i}" ${i === util[k] ? 'selected' : ''}>${esc(item(i).name)}</option>`).join('')}
        </select>
      </div>
      <div class="mt-1 flex flex-wrap gap-1">${item(util[k]).tags.slice(0, 2).map((t) => `<span class="chip">${t}</span>`).join('')}${item(util[k]).group ? `<span class="chip chip-gold">${GROUP_LABEL[item(util[k]).group!] ?? ''}</span>` : ''}</div>
    </div>`;
  };

  return `
  <article class="card p-3.5">
    <div class="grid items-start gap-4" style="grid-template-columns:190px 210px minmax(0,1fr) minmax(0,1fr)">
      <div class="flex items-center gap-3">
        ${champIcon(id, 52, '!border-crimson/50')}
        <div class="leading-tight"><div class="text-[14px] font-bold">${esc(ch.name)}</div>
          <div class="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-dim"><span class="text-crimson">${roleIcon(role, 12)}</span>${ROLE_LABEL[role]}</div>
          ${rival ? `<div class="mt-1 flex items-center gap-1 text-[10.5px] text-ink-mute">vs ${champIcon(rival, 16, '!rounded')} ${esc(CHAMP_BY_ID[rival].name)}</div>` : ''}</div>
      </div>
      <div>
        <div class="eyebrow mb-1">Ruta individual</div>
        <div class="flex items-center gap-1">${itemIcon(build.boots, 32)}${build.core.slice(0, 3).map((i) => itemIcon(i, 32, '!border-gold/50')).join('')}${build.core.length < 3 ? emptySlot(32) : ''}</div>
        <div class="mt-1 text-[10.5px] text-ink-mute">${esc(build.label)}</div>
      </div>
      ${slot(0)}${slot(1)}
    </div>
    ${sug.length ? `<div class="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5"><span class="eyebrow">Sugeridos para ${ROLE_LABEL[role]}</span>
      ${sug.map((i) => `<button class="flex items-center gap-1.5 rounded-lg border border-line-strong bg-canvas py-0.5 pl-0.5 pr-2 text-[11px] font-semibold text-ink-dim transition-colors hover:border-crimson hover:text-ink" data-action="suggest" data-p="${p}" data-id="${i}">${itemIcon(i, 22, '!rounded-md')}${esc(item(i).name)}</button>`).join('')}</div>` : ''}
  </article>`;
}

export function renderBuilds(s: ClashState): string {
  if (s.buildsLoading) {
    return `<div class="grid gap-4"><div class="grid grid-cols-2 gap-4">${sk('h-[280px]')}${sk('h-[280px]')}</div>${Array.from({ length: 5 }, () => sk('h-[120px]')).join('')}</div>`;
  }
  return `
  <div class="grid gap-4">
    <div class="grid items-start gap-4" style="grid-template-columns:1.2fr 1fr">${enemyCard(s)}${conflictCard(s)}</div>
    <div>
      <div class="mb-2 flex items-end justify-between"><div><h3 class="section-title">Rutas de objetos coordinadas</h3>
        <p class="section-sub">A diferencia de SoloQ, aquí cada jugador reserva 2 slots para utilidad de equipo y sin duplicar pasivas.</p></div></div>
      <div class="grid gap-3">${ROLES.map((_, p) => playerRow(s, p)).join('')}</div>
    </div>
  </div>`;
}
