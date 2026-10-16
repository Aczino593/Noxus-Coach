import type { Role } from '../types';
import { ROLE_LABEL } from '../types';
import { champImg, itemImg, itemCdImg, spellImg, perkImg, OFFICIAL_ROLE_ICONS, roleImg } from './assets';
export { OFFICIAL_ROLE_ICONS, roleImg };
import { ROLE_PATHS as OFFICIAL_ROLE_PATHS } from './rolePaths';
import { CHAMP_BY_ID } from '../data/champions';
import { item as itemData } from '../data/items';

export const esc = (s: unknown): string =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/* ───────────────────────── Iconos (trazo, 24×24) ───────────────────────── */
const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  minus: '<path d="M5 12h14"/>',
  square: '<rect x="5.5" y="5.5" width="13" height="13" rx="1.5"/>',
  restore: '<rect x="8" y="8" width="11" height="11" rx="1.5"/><path d="M16 8V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8.5A1.5 1.5 0 0 0 6 16h2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trophy: '<path d="M8 4h8v6a4 4 0 0 1-8 0V4z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 14v4M8 21h8M10 18h4"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
  swords: '<path d="m14.5 17.5-11-11V3h3.5l11 11M13 19l6-6M16 16l4 4M19 21l2-2"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/>',
  swap: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>',
  chart: '<path d="M3 3v18h18M7 15l4-5 3 3 5-7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
  sword: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>',
  flame: '<path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5C9.5 8.5 10.5 8 12 8s2.5.7 2.5 1.8-1 1.6-2.5 2-2.5.9-2.5 2 1 1.9 2.5 1.9 2.5-.6 2.5-1.7"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m11 12 9-9h3v3l-2 2v2l-2 2"/>',
  radio: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M12 12h.01M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2"/>',
} as const;
export type IconName = keyof typeof ICONS;

export function icon(name: IconName, size = 16, cls = ''): string {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

/**
 * Iconos de rol oficiales vectoriales extraídos del cliente de League of Legends
 * (CommunityDragon / Riot Client), con soporte de fill/currentColor para Crimson Noxus.
 */
export function roleIcon(role: Role, size = 18, cls = ''): string {
  const path = OFFICIAL_ROLE_PATHS[role] ?? OFFICIAL_ROLE_PATHS['mid'];
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 136 136" fill="currentColor" role="img" aria-label="${ROLE_LABEL[role]}"><path d="${path}"/></svg>`;
}

/* ───────────────────────── Imágenes con fallback ───────────────────────── */
function initials(name: string): string {
  return name.replace(/[^A-Za-zÁÉÍÓÚáéíóú0-9 ]/g, '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function champIcon(id: string, size = 40, cls = ''): string {
  const name = CHAMP_BY_ID[id]?.name ?? id;
  return `<img class="champ-ring ${cls}" src="${champImg(id)}" width="${size}" height="${size}" alt="${esc(name)}" title="${esc(name)}" loading="lazy" decoding="async" draggable="false" data-fb="${esc(initials(name))}" style="width:${size}px;height:${size}px"/>`;
}

export function itemIcon(id: number, size = 32, cls = ''): string {
  if (!id || id <= 0) return emptySlot(size, cls);
  const it = itemData(id);
  const primaryUrl = itemImg(id);
  const fallbackUrl = itemCdImg(id);
  return `<img class="item-slot ${cls}" src="${primaryUrl}" data-cd-fallback="${fallbackUrl}" width="${size}" height="${size}" alt="${esc(it.name)}" title="${esc(it.name)}" loading="lazy" decoding="async" draggable="false" data-fb="${esc(initials(it.name))}" style="width:${size}px;height:${size}px"/>`;
}

export function emptySlot(size = 32, cls = ''): string {
  return `<span class="item-slot ${cls}" style="display:inline-block;width:${size}px;height:${size}px"></span>`;
}

export function spellIcon(key: string, size = 22): string {
  return `<img class="item-slot" src="${spellImg(key)}" width="${size}" height="${size}" alt="${esc(key)}" title="${esc(key.replace('Summoner', ''))}" loading="lazy" decoding="async" draggable="false" data-fb="S" style="width:${size}px;height:${size}px;border-radius:5px"/>`;
}

export function perkIcon(path: string, size = 22, title = ''): string {
  return `<img src="${perkImg(path)}" width="${size}" height="${size}" alt="${esc(title)}" title="${esc(title)}" loading="lazy" decoding="async" draggable="false" data-fb="R" style="width:${size}px;height:${size}px;border-radius:99px;background:#0b0c10"/>`;
}

/** Listener global: intenta fallback a CommunityDragon antes de sustituir por tile con iniciales (offline-safe). */
export function installImageFallback(): void {
  document.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;

      // 1. Si falla el CDN de Data Dragon, intentar el CDN de CommunityDragon
      if (img.dataset.cdFallback && img.src !== img.dataset.cdFallback) {
        const next = img.dataset.cdFallback;
        delete img.dataset.cdFallback;
        img.src = next;
        return;
      }

      // 2. Si no hay red o el ítem no existe en ningún CDN, sustituir por tile con iniciales
      if (!img.dataset.fb) return;
      const tile = document.createElement('span');
      tile.className = img.className;
      tile.setAttribute('title', img.title);
      tile.style.cssText = img.getAttribute('style') ?? '';
      tile.style.display = 'inline-grid';
      tile.style.placeItems = 'center';
      tile.style.font = '700 10px var(--font-mono)';
      tile.style.color = 'var(--color-ink-dim)';
      tile.textContent = img.dataset.fb ?? '?';
      img.replaceWith(tile);
    },
    true,
  );
}

/* ───────────────────────── Componentes visuales ───────────────────────── */

/** Color por percentil: alto = oro, medio = esmeralda, bajo = rojo. */
export function tierColor(v: number): string {
  if (v >= 70) return 'var(--color-gold)';
  if (v >= 40) return 'var(--color-win)';
  return 'var(--color-loss)';
}

export function pct(v: number): string {
  return `P${Math.round(v)}`;
}

export interface GaugeOpts {
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
  valueText?: string;
}

export function gauge(value: number, o: GaugeOpts = {}): string {
  const size = o.size ?? 140;
  const stroke = o.stroke ?? 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const color = o.color ?? tierColor(v);
  const text = o.valueText ?? pct(v);
  return `
  <div class="relative inline-grid place-items-center" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="-rotate-90">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#1b1e28" stroke-width="${stroke}"/>
      <circle class="gauge-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${((c * v) / 100).toFixed(1)} ${c.toFixed(1)}"
        style="filter:drop-shadow(0 0 6px ${color}55)"/>
    </svg>
    <div class="absolute inset-0 grid place-content-center text-center">
      <div class="num font-bold leading-none" style="font-size:${Math.round(size * 0.2)}px;color:${color}">${text}</div>
      ${o.label ? `<div class="mt-1 text-ink-dim" style="font-size:${Math.max(10, Math.round(size * 0.085))}px">${o.label}</div>` : ''}
    </div>
  </div>`;
}

export function statBar(label: string, value: number, valueText?: string): string {
  const color = tierColor(value);
  return `
  <div>
    <div class="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
      <span class="text-ink">${label}</span>
      <span class="num font-semibold" style="color:${color}">${valueText ?? pct(value)}</span>
    </div>
    <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, value)}%;background:${color}"></div></div>
  </div>`;
}

export function sk(cls: string): string {
  return `<div class="skeleton ${cls}"></div>`;
}

export function subnav(items: { id: string; label: string }[], active: string, action: string): string {
  return `<nav class="subnav" role="tablist">${items
    .map(
      (it) =>
        `<button class="subnav-btn" role="tab" aria-selected="${it.id === active}" data-action="${action}" data-id="${it.id}">${it.label}</button>`,
    )
    .join('')}</nav>`;
}

export function roleFilter(active: Role | 'all', action = 'role'): string {
  const roles: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];
  return roles
    .map(
      (r) =>
        `<button class="role-btn" aria-pressed="${active === r}" data-action="${action}" data-id="${r}" data-tip="${ROLE_LABEL[r]}" aria-label="${ROLE_LABEL[r]}">${roleIcon(r, 17)}</button>`,
    )
    .join('');
}

export function fmtNum(n: number, d = 1): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
