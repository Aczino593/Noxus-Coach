import { createView } from '../lib/view';
import { esc, icon } from '../lib/ui';

type ChangeKind = 'Buff' | 'Nerf' | 'Modificación';
interface PatchChange { name: string; kind: ChangeKind; role?: string; summary: string; details: string[]; }
const CHANGES: PatchChange[] = [
  { name: 'Azir', kind: 'Buff', role: 'Mid', summary: 'Más maná por nivel.', details: ['Crecimiento de maná: 40 → 50 por nivel.'] },
  { name: 'Caitlyn', kind: 'Modificación', role: 'ADC', summary: 'Parte del poder de late pasa a la Q de línea.', details: ['Pasiva: escalados de crítico reducidos (100% → 80%).', 'Q: daño básico aumentado de 50/90/130/170/210 a 50/95/140/185/230.'] },
  { name: 'Darius', kind: 'Buff', role: 'Top', summary: 'La Q recupera antes en rangos altos.', details: ['Q: enfriamiento en rango 5 reducido de 5 s a 4 s.'] },
  { name: 'Jinx', kind: 'Nerf', role: 'ADC', summary: 'Menos fuerza base y crecimiento de daño.', details: ['DA por nivel: 3,25 → 3.', 'Vida base: 630 → 610.'] },
  { name: 'Lee Sin', kind: 'Nerf', role: 'Jungla', summary: 'Menos disponibilidad de W y daño de definitiva.', details: ['W: enfriamiento 7 → 8 s.', 'R: daño de patada y colisión reducido.', 'E: corrección de revelación de enemigos invisibles.'] },
  { name: 'Locke', kind: 'Modificación', summary: 'Menos recursos y aguante, con más escalado de daño.', details: ['Menos crecimiento de maná y mayor coste de W.', 'Ajustes a almacenamiento de vida gris.', 'E: daño y escalado por rango aumentados.'] },
  { name: 'Miss Fortune', kind: 'Buff', role: 'ADC', summary: 'Más daño de E y R.', details: ['E: daño base +20 en todos los rangos.', 'R: daño crítico 130% → 145%, mejor escalado con crítico adicional.'] },
  { name: 'Nidalee', kind: 'Nerf', role: 'Jungla', summary: 'Menos daño de salto y velocidad de ataque de curación.', details: ['W (forma de puma): daño base reducido.', 'E: velocidad de ataque 30/40/50/60/70% → 20/30/40/50/60%.'] },
  { name: 'Nunu y Willump', kind: 'Buff', role: 'Jungla', summary: 'La definitiva inflige más daño máximo.', details: ['R: 625/925/1275 → 750/1100/1450 (+300% PH).'] },
  { name: 'Orianna', kind: 'Buff', role: 'Mid', summary: 'Mejores escalados de daño de Q y W.', details: ['Q: relación de PH 55% → 60%.', 'W: relación de PH 80% → 85%.'] },
  { name: 'Qiyana', kind: 'Nerf', role: 'Mid', summary: 'Reversión parcial del aumento de la versión 26.17.', details: ['Q: daño base 80/110/140/170/200 → 70/100/130/160/190.'] },
  { name: 'Rammus', kind: 'Nerf', role: 'Jungla', summary: 'Menos resistencias adicionales en W.', details: ['Escalado de armadura adicional: 30–60% → 30–50%.', 'Escalado de resistencia mágica adicional: 30–60% → 30–50%.'] },
  { name: 'Ryze', kind: 'Buff', role: 'Mid / Top', summary: 'Mejora de movilidad y daño al escalar.', details: ['Q: velocidad de movimiento adicional aumentada.', 'Q: daño adicional de Flujo mejora en rangos altos.', 'W: escalado de PH 60% → 70%.'] },
  { name: 'Sion', kind: 'Buff', role: 'Top', summary: 'Más vida por nivel y recompensa mayor al cargar la R.', details: ['Vida por nivel: 87 → 95.', 'R: daño máximo durante la canalización mejorado.', 'Corrección de texto de la relación de DA de la R.'] },
  { name: 'Taliyah', kind: 'Buff', role: 'Mid / Jungla', summary: 'E mejorada y ahora causa daño aumentado a monstruos.', details: ['E: aumenta el daño base y su relación de PH.', 'Explosión de E: daño aumentado.', 'E inflige 225% de daño a monstruos.'] },
  { name: 'Taric', kind: 'Modificación', role: 'Support', summary: 'Q, E y R funcionan correctamente sobre aliados inalcanzables.', details: ['Ajuste de comportamiento de lanzamiento; E conserva la excepción para aliados que desaparecen de pantalla.', 'Descripción de E actualizada.'] },
  { name: 'Tristana', kind: 'Nerf', role: 'ADC', summary: 'Menos velocidad de ataque inicial en Q.', details: ['Q: 60/75/90/105/120% → 40/60/80/100/120%.'] },
  { name: 'Twisted Fate', kind: 'Modificación', role: 'Mid', summary: 'R ahora revela unidades inalcanzables.', details: ['Cambio de comportamiento de Destino (R).'] },
  { name: 'Varus', kind: 'Modificación', role: 'ADC / Mid', summary: 'Se redistribuye poder de W a Q para diferenciar top y bot.', details: ['Q: más daño al cargar.', 'W: reducciones a daño al impacto, daño por acumulación y daño activo.', 'Ajustes a la interacción entre canalización de Q y W.'] },
  { name: "Vel'Koz", kind: 'Buff', role: 'Mid / Support', summary: 'Más daño de pasiva.', details: ['Pasiva: daño máximo 180 → 205 y escalado de PH 60% → 65%.'] },
  { name: 'Viktor', kind: 'Nerf', role: 'Mid', summary: 'Más vulnerable en escaramuzas.', details: ['Velocidad de movimiento: 335 → 330.', 'Q: escudo reducido de 40–140 (+25% PH) a 30–130 (+20% PH).'] },
  { name: 'Wukong', kind: 'Modificación', role: 'Jungla / Top', summary: 'Se reduce poder en jungla y se compensa en línea.', details: ['Regeneración de vida base: 3,5 → 5,5.', 'Pasiva: armadura por acumulación reducida en niveles bajos.'] },
  { name: 'Xin Zhao', kind: 'Buff', role: 'Jungla', summary: 'Mejores escalados para builds de DA y velocidad de ataque.', details: ['Q: escalado de DA adicional 40% → 45%.', 'E: progresión de velocidad de ataque mejorada.'] },
  { name: 'Yone', kind: 'Nerf', role: 'Mid / Top', summary: 'Ligera reducción de daño en Q.', details: ['Q: relación de DA 110% → 105%.'] },
  { name: 'Zyra', kind: 'Buff', role: 'Support', summary: 'Más disponibilidad de semillas.', details: ['W: enfriamiento de cargas reducido en rangos iniciales.'] },
];
const ITEMS: PatchChange[] = [
  { name: 'Quiebrabastiones', kind: 'Modificación', summary: 'Menos poder general, con duración de sabotaje permanente.', details: ['Letalidad: 22 → 18.', 'Daño de Carga moldeada reducido.', 'Duración de Sabotaje: 90 s → infinita.'] },
  { name: 'Corazón del alba', kind: 'Buff', summary: 'Más poder de habilidad para ampliar sus configuraciones.', details: ['PH por cada 100% de regeneración de maná básica: 10 → 15.'] },
  { name: 'Grebas codiciosas', kind: 'Nerf', summary: 'Se retrasa la compra temprana.', details: ['Coste total: 1000 → 1100 de oro.'] },
  { name: 'Soberbia', kind: 'Modificación', summary: 'Diferencia las estadísticas entre campeones cuerpo a cuerpo y a distancia.', details: ['DA adicional base: 15 cuerpo a cuerpo / 10 a distancia (antes 12).', 'DA por acumulación: 3 cuerpo a cuerpo / 2 a distancia.'] },
];
const MID_PATCH: PatchChange[] = [
  { name: 'Varus · actualización del 22 oct', kind: 'Buff', summary: 'Corrección de un error de Q y compensación de daño.', details: ['DA y PH adicionales de la pasiva por asesinato/eliminación: 1,1 → 1,4 por cada 10% de velocidad de ataque.', 'Daño mínimo de Q: 50–230 → 50–250.'] },
];

const tone: Record<ChangeKind, string> = { Buff: 'chip-win', Nerf: 'chip-loss', Modificación: 'chip-gold' };
function cards(changes: PatchChange[], query: string): string {
  const filtered = changes.filter((c) => `${c.name} ${c.role ?? ''} ${c.summary} ${c.details.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return filtered.length ? `<div class="grid gap-3 md:grid-cols-2">${filtered.map((c) => `<article class="card p-4"><div class="flex items-start justify-between gap-3"><div><h4 class="font-bold">${esc(c.name)}</h4>${c.role ? `<div class="mt-0.5 text-[11px] text-ink-mute">${esc(c.role)}</div>` : ''}</div><span class="chip ${tone[c.kind]}">${c.kind}</span></div><p class="mt-3 text-[12px] text-ink-dim">${esc(c.summary)}</p><ul class="mt-3 grid gap-1.5">${c.details.map((d) => `<li class="flex gap-2 text-[11.5px] leading-relaxed"><span class="text-crimson">•</span><span>${esc(d)}</span></li>`).join('')}</ul></article>`).join('')}</div>` : '<div class="card p-8 text-center text-ink-dim">No hay cambios que coincidan con la búsqueda.</div>';
}

export function mountPatchAnalysis(root: HTMLElement) {
  return createView<{ query: string }>({
    root, state: { query: '' },
    render: (s) => {
      const q = s.query.trim();
      return `<header class="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div class="eyebrow">Balance de juego · versión 26.21</div><h2 class="mt-1 text-xl font-extrabold">Análisis del parche</h2><p class="mt-1 text-ink-dim">Publicado el 21 de octubre de 2026 · resumen de campeones y objetos.</p></div><a class="btn btn-sm" href="https://www.leagueoflegends.com/es-es/news/game-updates/league-of-legends-patch-26-21-notes/" target="_blank" rel="noreferrer">${icon('link', 13)} Notas oficiales</a></header>
      <div class="card mb-4 flex flex-wrap items-center gap-2 p-3"><span class="text-xs font-semibold text-ink-dim">Clasificación:</span><span class="chip chip-win">Buff</span><span class="chip chip-loss">Nerf</span><span class="chip chip-gold">Modificación</span><label class="relative ml-auto"><span class="sr-only">Buscar cambios</span><input class="!w-64 pl-9" data-input="query" value="${esc(s.query)}" placeholder="Buscar campeón u objeto…">${icon('search', 14, 'absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute')}</label></div>
      <section class="mb-5"><div class="mb-3 flex items-center gap-2">${icon('swords', 16, 'text-crimson')}<h3 class="section-title">Campeones</h3><span class="chip">${CHANGES.length}</span></div>${cards(CHANGES, q)}</section>
      <section class="mb-5"><div class="mb-3 flex items-center gap-2">${icon('book', 16, 'text-gold')}<h3 class="section-title">Objetos</h3><span class="chip">${ITEMS.length}</span></div>${cards(ITEMS, q)}</section>
      <section class="mb-4"><div class="mb-3 flex items-center gap-2">${icon('refresh', 16, 'text-blue-side')}<h3 class="section-title">Actualización de mitad de versión</h3><span class="chip">22 oct</span></div>${cards(MID_PATCH, q)}</section>
      <footer class="card flex items-start gap-2 p-3 text-[11px] leading-relaxed text-ink-mute">${icon('info', 14, 'mt-0.5 flex-none')}<span>Las etiquetas describen la dirección principal del cambio. “Modificación” agrupa cambios mixtos, redistribuciones de poder y ajustes de funcionamiento. Resumen en español basado en las <a class="text-ink underline" href="https://www.leagueoflegends.com/es-es/news/game-updates/league-of-legends-patch-26-21-notes/" target="_blank" rel="noreferrer">notas oficiales de Riot</a>.</span></footer>`;
    },
    inputs: { query: ({ value }) => ({ query: value }) },
  });
}
