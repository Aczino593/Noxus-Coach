import {
  BOT_TOWERS,
  TOP_TOWERS,
  MID_TOWERS,
  JUNGLE_CAMPS_POS,
  BUSHES,
  bushesForZone,
  type BushId,
  type GankZone,
  type MapPoint,
} from '../lib/gankEngine';
import { mapImg } from '../lib/assets';
import { scale } from '../lib/charts';
import { esc, icon } from '../lib/ui';

/**
 * Minimapa táctico sobre el mapa oficial actual de la Grieta del Invocador (`/maps/summoners_rift.png`).
 * Recorta con precisión la zona de la acción (Top, Mid, Bot o Jungla) manteniendo la proporción
 * 1:1 de las coordenadas oficiales de Riot (14870 × 14870) para mostrar la ubicación exacta
 * de ganks, wards e invasiones de campamentos.
 */
const MAP_MAX = 14870;
const W = 420;
const H = 280;

const GOLD = '#facc15';
const GREEN = '#34d399';
const CRIMSON = '#ff2e4d';

export interface MinimapOpts {
  death: MapPoint;
  bush: BushId;
  /** gold: Pink recomendado · green: ya había un ward cubriendo el arbusto */
  ward: 'gold' | 'green';
  clock: string;
  mySide: 'blue' | 'red';
  zone?: GankZone;
}

interface ZoneViewport {
  /** Recorte en coordenadas de Riot [0..14870] con relación de aspecto 3:2 (igual a 420×280) */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  sectorTitle: string;
}

/**
 * Cada viewport mantiene proporción ~1.5 (dx / dy = 420 / 280) para que la textura
 * real de la Grieta del Invocador nunca se deforme y encaje al milímetro.
 */
const ZONE_VIEWPORTS: Record<GankZone, ZoneViewport> = {
  top: {
    x0: 0,
    x1: 10200,
    y0: 8070,
    y1: 14870,
    sectorTitle: 'SECTOR NOROESTE · TOP & RÍO SUPERIOR',
  },
  mid: {
    x0: 2600,
    x1: 12200,
    y0: 4200,
    y1: 10600,
    sectorTitle: 'SECTOR CENTRAL · MID & RÍO',
  },
  bot: {
    x0: 4670,
    x1: 14870,
    y0: 0,
    y1: 6800,
    sectorTitle: 'SECTOR SURESTE · BOT & DRAGÓN',
  },
  jungle: {
    x0: 1200,
    x1: 11700,
    y0: 2100,
    y1: 9100,
    sectorTitle: 'CUADRANTE DE JUNGLA & ENTRADAS DE RÍO',
  },
};

const fmt = (n: number) => n.toFixed(1);

function pillLabel(
  x: number,
  y: number,
  text: string,
  textColor: string,
  borderColor: string,
  fontSize = 9.5,
): string {
  const charW = fontSize * 0.58;
  const boxW = Math.max(46, text.length * charW + 14);
  const boxH = fontSize + 8;
  const clampedX = Math.max(boxW / 2 + 4, Math.min(W - boxW / 2 - 4, x));
  const clampedY = Math.max(boxH / 2 + 4, Math.min(H - boxH / 2 - 4, y));

  return `
    <g transform="translate(${fmt(clampedX)} ${fmt(clampedY)})">
      <rect x="${fmt(-boxW / 2)}" y="${fmt(-boxH / 2)}" width="${fmt(boxW)}" height="${fmt(boxH)}" rx="4"
            fill="#08090ce6" stroke="${borderColor}" stroke-width="1"/>
      <text x="0" y="${fmt(fontSize * 0.34)}" fill="${textColor}" font-size="${fontSize}" font-weight="700" text-anchor="middle">${esc(text)}</text>
    </g>`;
}

export function botLaneMinimap(o: MinimapOpts): string {
  const zone: GankZone = o.zone ?? BUSHES[o.bush].zone;
  const vp = ZONE_VIEWPORTS[zone];

  const sx = (x: number) => scale(x, vp.x0, vp.x1, 0, W);
  const sy = (y: number) => scale(y, vp.y0, vp.y1, H, 0);
  const pt = (p: MapPoint): [number, number] => [sx(p.x), sy(p.y)];

  // Posición y escala exacta de la imagen completa de la Grieta (0..14870) dentro del recorte actual
  const imgX = sx(0);
  const imgY = sy(MAP_MAX);
  const imgW = sx(MAP_MAX) - sx(0);
  const imgH = sy(0) - sy(MAP_MAX);

  const clipId = `rift-clip-${zone}-${o.bush}-${o.clock.replace(':', '')}`;
  const arrowId = `gank-arrow-${zone}-${o.bush}-${o.clock.replace(':', '')}`;

  const tower = (p: MapPoint, color: string, label: string, dyOffset: number): string => {
    const [x, y] = pt(p);
    return `
      <g transform="translate(${fmt(x)} ${fmt(y)})">
        <circle r="10" fill="#08090ccc" stroke="${color}" stroke-width="1.6"/>
        <rect x="-4.5" y="-4.5" width="9" height="9" rx="1.5" transform="rotate(45)" fill="${color}"/>
      </g>
      ${pillLabel(x, y + dyOffset, label, color, `${color}88`, 8.8)}`;
  };

  const campNode = (p: MapPoint, color: string, label: string, dyOffset: number): string => {
    const [x, y] = pt(p);
    return `
      <g transform="translate(${fmt(x)} ${fmt(y)})">
        <circle r="12" fill="#08090cd9" stroke="${color}" stroke-width="1.8" stroke-dasharray="3 2"/>
        <circle r="5" fill="${color}"/>
      </g>
      ${pillLabel(x, y + dyOffset, label, color, `${color}88`, 8.8)}`;
  };

  const allyColor = o.mySide === 'blue' ? '#4c8dff' : '#ff4d63';
  const enemyColor = o.mySide === 'blue' ? '#ff4d63' : '#4c8dff';

  const towersSet = zone === 'top' ? TOP_TOWERS : zone === 'mid' ? MID_TOWERS : BOT_TOWERS;
  const allyPos = o.mySide === 'blue' ? towersSet.blueOuter : towersSet.redOuter;
  const enemyPos = o.mySide === 'blue' ? towersSet.redOuter : towersSet.blueOuter;

  const [dx, dy] = pt(o.death);
  const bushPos = BUSHES[o.bush].pos;
  const [bx, by] = pt(bushPos);
  const wardColor = o.ward === 'gold' ? GOLD : GREEN;
  const wardLabel = o.ward === 'gold' ? `Pink: ${BUSHES[o.bush].label}` : `Ward activo: ${BUSHES[o.bush].label}`;

  // Evitar colisión de etiquetas entre el Ward y la Muerte
  const deathBelowBush = dy >= by;
  const wardLabelY = deathBelowBush ? by - 24 : by + 24;
  const deathLabelY = deathBelowBush ? dy + 24 : dy - 24;

  const zoneBushes = bushesForZone(zone);
  const bushRings = zoneBushes
    .map((id) => {
      const [x, y] = pt(BUSHES[id].pos);
      const active = id === o.bush;
      if (active) {
        return `<ellipse cx="${fmt(x)}" cy="${fmt(y)}" rx="22" ry="14" fill="${wardColor}" fill-opacity="0.22" stroke="${wardColor}" stroke-width="1.5" stroke-dasharray="3 2"/>`;
      }
      return `
        <ellipse cx="${fmt(x)}" cy="${fmt(y)}" rx="16" ry="10" fill="#10b981" fill-opacity="0.18" stroke="#34d399" stroke-opacity="0.55" stroke-width="1"/>
        ${pillLabel(x, y + 18, BUSHES[id].label, '#cbd5e1', '#334155', 8)}`;
    })
    .join('');

  const structuresSvg =
    zone === 'jungle'
      ? `
        ${campNode(JUNGLE_CAMPS_POS.blueGromp, '#60a5fa', 'Gromp (Azul)', -19)}
        ${campNode(JUNGLE_CAMPS_POS.blueBuff, '#60a5fa', 'Buff Azul (Azul)', -19)}
        ${campNode(JUNGLE_CAMPS_POS.blueWolves, '#60a5fa', 'Lobos (Azul)', 19)}
        ${campNode(JUNGLE_CAMPS_POS.blueRaptors, '#f87171', 'Dagarracos (Azul)', -19)}
        ${campNode(JUNGLE_CAMPS_POS.redBuff, '#f87171', 'Buff Rojo (Azul)', 19)}
        ${campNode(JUNGLE_CAMPS_POS.blueKrugs, '#f87171', 'Rocosos (Azul)', 19)}
        ${campNode(JUNGLE_CAMPS_POS.redWolves, '#60a5fa', 'Lobos (Rojo)', -19)}
        ${campNode(JUNGLE_CAMPS_POS.redBlueBuff, '#60a5fa', 'Buff Azul (Rojo)', 19)}
      `
      : `
        ${tower(allyPos, allyColor, 'Tu Torre', 21)}
        ${tower(enemyPos, enemyColor, 'Torre Rival', -21)}
      `;

  // Mini-radar en la esquina inferior derecha mostrando en qué parte de la Grieta estamos
  const radarSize = 54;
  const radarX = W - radarSize - 8;
  const radarY = H - radarSize - 8;
  const rvx = radarX + (vp.x0 / MAP_MAX) * radarSize;
  const rvy = radarY + ((MAP_MAX - vp.y1) / MAP_MAX) * radarSize;
  const rvw = ((vp.x1 - vp.x0) / MAP_MAX) * radarSize;
  const rvh = ((vp.y1 - vp.y0) / MAP_MAX) * radarSize;

  return `
  <svg viewBox="0 0 ${W} ${H}" class="h-auto w-full rounded-xl shadow-inner" role="img"
    aria-label="Mapa oficial de la Grieta del Invocador: evento al minuto ${esc(o.clock)} en ${esc(BUSHES[o.bush].label)}">
    <defs>
      <clipPath id="${clipId}">
        <rect width="${W}" height="${H}" rx="12"/>
      </clipPath>
      <marker id="${arrowId}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="${CRIMSON}"/>
      </marker>
    </defs>

    <g clip-path="url(#${clipId})">
      <rect width="${W}" height="${H}" fill="#08090c"/>

      <!-- Mapa Oficial de la Grieta del Invocador (Season 14+) escalado a coordenadas exactas -->
      <image href="${mapImg()}"
             x="${fmt(imgX)}"
             y="${fmt(imgY)}"
             width="${fmt(imgW)}"
             height="${fmt(imgH)}"
             preserveAspectRatio="none"
             style="filter:brightness(0.95) contrast(1.08) saturate(1.1)"/>

      <!-- Sutil viñeta táctica para resaltar los iconos sobre el terreno real -->
      <rect width="${W}" height="${H}" fill="#07090e" fill-opacity="0.22"/>

      <!-- Torres o Campamentos de la Jungla -->
      ${structuresSvg}

      <!-- Arbustos / Entradas de Río -->
      ${bushRings}

      <!-- Vector de trayectoria del Gank / Invasión -->
      <line x1="${fmt(bx)}" y1="${fmt(by)}" x2="${fmt(dx)}" y2="${fmt(dy)}"
            stroke="#000000" stroke-opacity="0.7" stroke-width="4.2" stroke-linecap="round"/>
      <line x1="${fmt(bx)}" y1="${fmt(by)}" x2="${fmt(dx)}" y2="${fmt(dy)}"
            stroke="${CRIMSON}" stroke-opacity="0.95" stroke-width="2.2" stroke-dasharray="5 4"
            stroke-linecap="round" marker-end="url(#${arrowId})"/>

      <!-- Pin de Ward Recomendado / Activo -->
      <g transform="translate(${fmt(bx)} ${fmt(by)})" style="color:${wardColor};filter:drop-shadow(0 0 8px ${wardColor}aa)">
        <circle r="13" fill="#0b0c10" stroke="${wardColor}" stroke-width="2.2"/>
        <g transform="translate(-8 -8)">${icon('eye', 16)}</g>
      </g>
      ${pillLabel(bx, wardLabelY, wardLabel, wardColor, wardColor, 9.2)}

      <!-- Punto exacto de la Muerte / Invasión sufrida -->
      <circle cx="${fmt(dx)}" cy="${fmt(dy)}" r="9" fill="${CRIMSON}" opacity="0.4">
        <animate attributeName="r" values="7;22;7" dur="1.9s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.65;0;0.65" dur="1.9s" repeatCount="indefinite"/>
      </circle>
      <circle cx="${fmt(dx)}" cy="${fmt(dy)}" r="6.5" fill="${CRIMSON}" stroke="#ffffff" stroke-width="2"
              style="filter:drop-shadow(0 0 8px ${CRIMSON})"/>
      ${pillLabel(dx, deathLabelY, `${zone === 'jungle' ? 'Invasión' : 'Baja'} ${o.clock}`, '#fda4af', CRIMSON, 9.5)}

      <!-- Encabezado de Sector (Esquina Superior Izquierda) -->
      <g transform="translate(8 8)">
        <rect width="208" height="19" rx="5" fill="#08090cd9" stroke="#232733" stroke-width="1"/>
        <circle cx="10" cy="9.5" r="3" fill="${CRIMSON}"/>
        <text x="19" y="13" fill="#e2e8f0" font-size="8.5" font-weight="800" letter-spacing="0.06em">${esc(vp.sectorTitle)}</text>
      </g>

      <!-- Mini-Radar de Ubicación Global en la Grieta (Esquina Inferior Derecha) -->
      <g>
        <rect x="${radarX}" y="${radarY}" width="${radarSize}" height="${radarSize}" rx="6" fill="#08090ce6" stroke="#2c3242" stroke-width="1.2"/>
        <image href="${mapImg()}" x="${radarX + 1}" y="${radarY + 1}" width="${radarSize - 2}" height="${radarSize - 2}" opacity="0.75"/>
        <rect x="${fmt(rvx)}" y="${fmt(rvy)}" width="${fmt(rvw)}" height="${fmt(rvh)}"
              fill="${CRIMSON}22" stroke="${CRIMSON}" stroke-width="1.3" rx="2"/>
      </g>
    </g>

    <!-- Borde exterior del visor -->
    <rect width="${W}" height="${H}" rx="12" fill="none" stroke="#262b38" stroke-width="1.5"/>
  </svg>`;
}
