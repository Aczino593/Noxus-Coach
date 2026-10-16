import { BOT_TOWERS, BUSHES, type BushId, type MapPoint } from '../lib/gankEngine';
import { scale } from '../lib/charts';
import { esc, icon } from '../lib/ui';

/**
 * Minimapa táctico esquemático del carril inferior.
 * Muestra la muerte (punto rojo brillante) y el arbusto donde debió estar el Ward de Control
 * (icono dorado = Pink recomendado · verde = ya había un ward activo).
 *
 * Es un esquema: el carril, el río y las torres están dibujados de forma simplificada
 * sobre el recorte [X0..X1] × [Y0..Y1] del mapa (14870 × 14870).
 */
const W = 420;
const H = 270;
const X0 = 4000;
const X1 = 14870;
const Y0 = 0;
const Y1 = 6700;

const GOLD = '#e0a96d';
const GREEN = '#34d399';

export interface MinimapOpts {
  death: MapPoint;
  bush: BushId;
  /** gold: Pink recomendado · green: ya había un ward cubriendo el arbusto */
  ward: 'gold' | 'green';
  clock: string;
  mySide: 'blue' | 'red';
}

const sx = (x: number) => scale(x, X0, X1, 0, W);
const sy = (y: number) => scale(y, Y0, Y1, H, 0);
const pt = (p: MapPoint): [number, number] => [sx(p.x), sy(p.y)];
const fmt = (n: number) => n.toFixed(1);

const LANE: MapPoint[] = [
  { x: 4300, y: 1480 },
  { x: 6919, y: 1483 },
  { x: 10504, y: 1029 },
  { x: 12700, y: 1500 },
  { x: 13700, y: 2900 },
  { x: 13866, y: 4505 },
  { x: 13700, y: 6700 },
];

function tower(p: MapPoint, color: string, label: string, anchor: 'start' | 'end' | 'middle', dx: number, dy: number): string {
  const [x, y] = pt(p);
  return `
    <rect x="-6" y="-6" width="12" height="12" rx="2" transform="translate(${fmt(x)} ${fmt(y)}) rotate(45)" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <text x="${fmt(x + dx)}" y="${fmt(y + dy)}" fill="${color}" font-size="9.5" font-weight="700" text-anchor="${anchor}">${esc(label)}</text>`;
}

export function botLaneMinimap(o: MinimapOpts): string {
  const allyColor = o.mySide === 'blue' ? '#4c8dff' : '#ff4d63';
  const enemyColor = o.mySide === 'blue' ? '#ff4d63' : '#4c8dff';
  const allyPos = o.mySide === 'blue' ? BOT_TOWERS.blueOuter : BOT_TOWERS.redOuter;
  const enemyPos = o.mySide === 'blue' ? BOT_TOWERS.redOuter : BOT_TOWERS.blueOuter;

  const lane = LANE.map((p) => pt(p).map(fmt).join(',')).join(' ');
  const [rx1, ry1] = pt({ x: 7000, y: 6700 });
  const [rx2, ry2] = pt({ x: 11900, y: 3350 });
  const [dx, dy] = pt(o.death);
  const bushPos = BUSHES[o.bush].pos;
  const [bx, by] = pt(bushPos);
  const wardColor = o.ward === 'gold' ? GOLD : GREEN;
  const wardLabel = o.ward === 'gold' ? 'Pink aquí' : 'Ward activo';

  const bushShape = (id: BushId) => {
    const [x, y] = pt(BUSHES[id].pos);
    const active = id === o.bush;
    return `
      <ellipse cx="${fmt(x)}" cy="${fmt(y)}" rx="25" ry="15" fill="#1f6f4a" fill-opacity="${active ? 0.5 : 0.28}" stroke="${GREEN}" stroke-opacity="${active ? 0.7 : 0.3}" stroke-width="1.2"/>
      <text x="${fmt(x)}" y="${fmt(y + 29)}" fill="#9aa1b2" font-size="9" text-anchor="middle" opacity="${active ? 1 : 0.6}">${esc(BUSHES[id].label)}</text>`;
  };

  return `
  <svg viewBox="0 0 ${W} ${H}" class="h-auto w-full" role="img"
    aria-label="Minimapa táctico del carril inferior: muerte al minuto ${esc(o.clock)} y ${esc(BUSHES[o.bush].label)} donde colocar el Ward de Control">
    <rect width="${W}" height="${H}" rx="12" fill="#0b0c10" stroke="#232733"/>

    <!-- Jungla (referencia visual) -->
    <ellipse cx="${fmt(sx(8200))}" cy="${fmt(sy(5600))}" rx="90" ry="46" fill="#10b981" fill-opacity="0.045"/>
    <ellipse cx="${fmt(sx(13300))}" cy="${fmt(sy(1400))}" rx="38" ry="28" fill="#10b981" fill-opacity="0.045"/>

    <!-- Río -->
    <line x1="${fmt(rx1)}" y1="${fmt(ry1)}" x2="${fmt(rx2)}" y2="${fmt(ry2)}" stroke="#4c8dff" stroke-opacity="0.14" stroke-width="54" stroke-linecap="round"/>

    <!-- Carril inferior -->
    <polyline points="${lane}" fill="none" stroke="#1b1f2a" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="${lane}" fill="none" stroke="#2c3242" stroke-width="1.4" stroke-dasharray="4 6" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Torres -->
    ${tower(allyPos, allyColor, 'Tu torre', 'middle', 0, 24)}
    ${tower(enemyPos, enemyColor, 'Torre rival', 'end', -12, 4)}

    <!-- Arbustos -->
    ${bushShape('river')}
    ${bushShape('tri')}

    <!-- Ruta del gank: del arbusto al punto de la muerte -->
    <line x1="${fmt(bx)}" y1="${fmt(by)}" x2="${fmt(dx)}" y2="${fmt(dy)}" stroke="${GOLD}" stroke-opacity="0.75" stroke-width="1.6" stroke-dasharray="5 4"/>

    <!-- Ward recomendado / activo -->
    <g transform="translate(${fmt(bx)} ${fmt(by)})" style="color:${wardColor};filter:drop-shadow(0 0 6px ${wardColor}99)">
      <circle r="13" fill="#0b0c10" stroke="${wardColor}" stroke-width="2"/>
      <g transform="translate(-8 -8)">${icon('eye', 16)}</g>
    </g>
    <text x="${fmt(bx)}" y="${fmt(by - 20)}" fill="${wardColor}" font-size="9.5" font-weight="700" text-anchor="middle">${wardLabel}</text>

    <!-- Muerte -->
    <circle cx="${fmt(dx)}" cy="${fmt(dy)}" r="8" fill="#ff2e4d" opacity="0.35">
      <animate attributeName="r" values="7;20;7" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${fmt(dx)}" cy="${fmt(dy)}" r="6" fill="#ff2e4d" stroke="#fff" stroke-opacity="0.85" stroke-width="1.5" style="filter:drop-shadow(0 0 6px #ff2e4d)"/>
    <text x="${fmt(dx)}" y="${fmt(dy + 22)}" fill="#ff7a8e" font-size="10" font-weight="700" text-anchor="middle" font-family="var(--font-mono)">${esc(o.clock)}</text>
  </svg>`;
}
