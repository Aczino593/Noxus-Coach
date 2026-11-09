import { champIdFromKey, champNameFromKey, itemImg } from '../lib/assets';
import { createView, type View } from '../lib/view';
import { champIcon, esc, icon } from '../lib/ui';
import { CHAMP_BY_ID } from '../data/champions';
import { item } from '../data/items';
import { itemGuide } from '../data/itemGuide';
import { ROLE_LABEL, ROLES, type Champion, type Role } from '../types';
import { isTauri } from '../lib/tauri';

interface LcuMember {
  cellId?: number;
  championId?: number;
  championPickIntent?: number;
  assignedPosition?: string;
}
interface DraftSnapshot {
  connected: boolean;
  inChampSelect: boolean;
  reason?: string;
  session?: { localPlayerCellId?: number; myTeam?: LcuMember[]; theirTeam?: LcuMember[] };
}
interface Recommendation { id: number; category: string; reason: string; }
interface TacticalAdvice { champion: string; label: string; advice: string; }
interface State {
  snapshot: DraftSnapshot | null;
  role: Role;
  loading: boolean;
  error: string;
  capturedAt: string;
}

const ROLE_BY_POSITION: Record<string, Role> = {
  TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'mid', BOTTOM: 'adc', UTILITY: 'support',
};

async function readSnapshot(): Promise<DraftSnapshot> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<DraftSnapshot>('get_champ_select_session');
  }
  const response = await fetch('/lol-lcu/champ-select');
  if (!response.ok) throw new Error(`No se pudo consultar el cliente (HTTP ${response.status}).`);
  return response.json() as Promise<DraftSnapshot>;
}

function selectedKey(member: LcuMember): number {
  return Number(member.championId || member.championPickIntent || 0);
}

function resolvedChampId(key: number): string {
  if (!key || champNameFromKey(key) === String(key)) return '';
  return champIdFromKey(key);
}

function recommendations(role: Role, ownChamp: (typeof CHAMP_BY_ID)[string] | undefined, enemies: ReturnType<typeof enemyChampions>): Recommendation[] {
  const tanks = enemies.filter((c) => c.traits.includes('tank') || c.traits.includes('engage')).length;
  const healers = enemies.filter((c) => c.traits.includes('heal')).length;
  const apThreats = enemies.filter((c) => c.dmg === 'AP').length;
  const out: Recommendation[] = [];
  const add = (id: number, category: string, reason: string) => { if (!out.some((r) => r.id === id)) out.push({ id, category, reason }); };

  if (tanks >= 2) {
    if (role === 'adc') {
      add(3036, 'Contra tanques', `${tanks} rivales parecen de primera línea: la penetración de armadura ayuda a atravesar defensas.`);
      add(3153, 'Daño sostenido', 'El daño según la vida actual del objetivo gana valor en peleas largas contra campeones con mucha vida.');
    } else if (ownChamp?.dmg === 'AP') {
      add(3135, 'Contra resistencias', 'Varios rivales resistentes pueden comprar resistencia mágica; la penetración porcentual ayuda a responder.');
      add(6653, 'Daño sostenido', 'El daño prolongado de Liandry complementa a un campeón AP contra objetivos con mucha vida.');
    } else if (ownChamp?.dmg === 'AD') {
      add(3071, 'Contra tanques', 'La reducción de armadura beneficia el daño físico de tu equipo frente a varios objetivos resistentes.');
      add(3036, 'Contra tanques', 'La penetración de armadura puede ayudar a tu campeón físico a dañar la primera línea rival.');
    } else {
      add(3135, 'Contra resistencias', 'Varios rivales resistentes pueden comprar resistencia mágica; la penetración porcentual ayuda a responder.');
      add(6653, 'Daño sostenido', 'El daño prolongado según la vida del rival es una opción útil contra composiciones resistentes.');
    }
  }
  if (healers >= 2) {
    const antiHeal = role === 'adc' ? 3033 : ownChamp?.dmg === 'AP' ? 3165 : 6609;
    add(antiHeal, 'Contra curaciones', `${healers} campeones rivales tienen herramientas de curación; considera aplicar reducción de curación.`);
  }
  if (apThreats >= 3) {
    add(role === 'adc' ? 3156 : role === 'mid' ? 3102 : 4401, 'Defensa contra AP', `${apThreats} de los picks visibles infligen daño mágico: valora una respuesta defensiva si te presionan.`);
  }
  if (!out.length) {
    add(role === 'adc' ? 3046 : role === 'mid' ? 3157 : 3156, 'Opción general', 'No aparece una amenaza dominante en los picks visibles; esta opción general depende de tu campeón y partida.');
  }
  return out.slice(0, 4);
}

function enemyChampions(snapshot: DraftSnapshot | null) {
  const team = snapshot?.session?.theirTeam ?? [];
  return team.map((member) => CHAMP_BY_ID[resolvedChampId(selectedKey(member))]).filter((champ) => !!champ);
}

const JUNGLE_ADVICE: Record<string, string> = {
  LeeSin: 'Suele poder buscar duelos e invasiones temprano. Coloca visión en entradas del río y de tu jungla antes de avanzar; evita disputar cangrejo u objetivos sin prioridad de línea o información de su posición.',
  Elise: 'Puede convertir sus herramientas de control en ganks tempranos. Protege las rutas de entrada a las líneas y evita empujar sin saber dónde está.',
  JarvanIV: 'Su engage facilita ganks desde ángulos inesperados. Vigila arbustos y accesos laterales; conserva una herramienta de escape si no aparece en el mapa.',
  XinZhao: 'Es peligroso en escaramuzas tempranas a corta distancia. No lo enfrentes solo en el río si tus líneas no pueden ayudar primero.',
  Nidalee: 'Puede presionar con poke e invasiones tempranas. Da visión a las entradas de la jungla y evita entrar con poca vida o sin apoyo cercano.',
  Warwick: 'Su sustain y persecución pueden castigar peleas largas al inicio. Retrocede si la pelea se prolonga y avisa cuando desaparezca de tu zona.',
};

function tacticalAdvice(enemies: Champion[]): TacticalAdvice[] {
  const notes: TacticalAdvice[] = [];
  for (const enemy of enemies) {
    if (JUNGLE_ADVICE[enemy.id]) {
      notes.push({ champion: enemy.name, label: 'Presión temprana', advice: JUNGLE_ADVICE[enemy.id] });
    } else if (enemy.roles.includes('jungle') && enemy.early >= 4) {
      notes.push({ champion: enemy.name, label: 'Jungla activa al inicio', advice: 'Su perfil apunta a una fase temprana fuerte. Coloca guardianes en accesos al río, avisa si desaparece y evita invadir o disputar objetivos sin prioridad de línea.' });
    } else if (enemy.traits.includes('assassin')) {
      notes.push({ champion: enemy.name, label: 'Amenaza de flanco', advice: 'Evita revisar arbustos a solas y separarte del equipo cuando no esté visible. Guarda una herramienta defensiva para responder a su entrada.' });
    } else if (enemy.traits.includes('engage')) {
      notes.push({ champion: enemy.name, label: 'Iniciación y control', advice: 'Respeta los ángulos de entrada y coloca visión antes de objetivos. Mantén espacio para reaccionar y no agrupes al equipo en un corredor estrecho.' });
    } else if (enemy.traits.includes('poke')) {
      notes.push({ champion: enemy.name, label: 'Pokeo a distancia', advice: 'Usa súbditos y terreno como cobertura, evita llegar con poca vida a los objetivos y busca iniciar cuando falle una habilidad importante.' });
    }
  }
  return notes.slice(0, 4);
}

function renderRecommendations(role: Role, ownChamp: (typeof CHAMP_BY_ID)[string] | undefined, enemies: ReturnType<typeof enemyChampions>) {
  const list = recommendations(role, ownChamp, enemies);
  return `<div class="mt-3 grid gap-3 sm:grid-cols-2">${list.map((rec) => {
    const it = item(rec.id);
    const guide = itemGuide(rec.id);
    return `<article class="card-inset flex gap-3 p-3"><img src="${itemImg(rec.id)}" alt="" class="h-12 w-12 rounded-lg border border-line-strong" loading="lazy"><div class="min-w-0"><div class="mb-1 flex flex-wrap items-center gap-2"><span class="chip chip-crimson !py-0">${esc(rec.category)}</span><span class="chip !py-0">${esc(guide.role)}</span></div><b>${esc(it.name)}</b><p class="mt-1 text-xs leading-relaxed text-ink-dim"><strong>Por qué aparece:</strong> ${esc(rec.reason)}</p><p class="mt-1 text-xs leading-relaxed text-ink-mute"><strong>Qué aporta:</strong> ${esc(guide.why)}</p></div></article>`;
  }).join('')}</div>`;
}

function renderTactics(enemies: Champion[]): string {
  const notes = tacticalAdvice(enemies);
  if (!notes.length) return `<p class="mt-3 text-sm text-ink-dim">Con los perfiles tácticos reconocidos no aparece una alerta específica todavía. Actualiza cuando haya más picks visibles.</p>`;
  return `<div class="mt-3 grid gap-3 md:grid-cols-2">${notes.map((note) => `<article class="card-inset p-3"><div class="flex flex-wrap items-center justify-between gap-2"><b>${esc(note.champion)}</b><span class="chip chip-crimson !py-0">${esc(note.label)}</span></div><p class="mt-2 text-sm leading-relaxed text-ink-dim">${esc(note.advice)}</p></article>`).join('')}</div>`;
}

function render(snapshot: DraftSnapshot | null, role: Role, error: string, capturedAt: string): string {
  if (!snapshot) {
    return `<section class="card p-5"><div class="eyebrow">Herramienta local · lectura de selección</div><h2 class="mt-1 text-xl font-extrabold">Recomendador de draft</h2><p class="mt-2 max-w-3xl text-sm leading-relaxed text-ink-dim">Toma una instantánea de los picks visibles del cliente de League of Legends y genera sugerencias estáticas de objetos para ${ROLE_LABEL[role]}.</p>${error ? `<p class="mt-3 text-sm text-crimson">${esc(error)}</p>` : ''}<button class="btn btn-primary mt-4" data-action="refresh" ${error === '__loading' ? 'disabled' : ''}>${icon('refresh', 14)} Actualizar selección</button><p class="mt-3 text-xs text-ink-mute">No compra, importa ni selecciona nada. Las sugerencias requieren criterio del jugador.</p></section>`;
  }

  const session = snapshot.session;
  const localId = session?.localPlayerCellId;
  const me = session?.myTeam?.find((member) => member.cellId === localId);
  const ownId = me ? selectedKey(me) : 0;
  const ownChampId = resolvedChampId(ownId);
  const ownChamp = ownChampId ? CHAMP_BY_ID[ownChampId] : undefined;
  const enemies = enemyChampions(snapshot);
  const suggestions = snapshot.inChampSelect ? renderRecommendations(role, ownChamp, enemies) : '';
  const ownName = ownChamp?.name ?? (ownChampId ? champNameFromKey(ownId) : ownId ? `Campeón ${ownId}` : 'Sin pick confirmado');
  const isIntent = !!me?.championPickIntent && !me?.championId;
  const teamCards = (session?.theirTeam ?? []).map((m) => {
    const key = selectedKey(m); if (!key) return '';
    const id = resolvedChampId(key); const c = CHAMP_BY_ID[id];
    return `<div class="flex items-center gap-2 rounded-lg border border-line bg-canvas p-2">${id ? champIcon(id, 34) : `<div class="grid h-[34px] w-[34px] place-items-center rounded-lg bg-surface text-xs">?</div>`}<span class="text-xs font-semibold">${esc(c?.name ?? (id ? champNameFromKey(key) : `Campeón ${key}`))}</span></div>`;
  }).filter(Boolean).join('');
  const visibleEnemyPicks = (session?.theirTeam ?? []).filter((member) => selectedKey(member) > 0).length;

  return `<header class="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div class="eyebrow">LCU · Instantánea manual</div><h2 class="mt-1 text-xl font-extrabold">Recomendador de draft</h2><p class="mt-1 text-sm text-ink-dim">Selección detectada una sola vez al actualizar. Sin acciones dentro del juego.</p></div><button class="btn btn-primary" data-action="refresh" ${error === '__loading' ? 'disabled' : ''}>${icon('refresh', 14)} Actualizar selección</button></header>
    ${error && error !== '__loading' ? `<div class="card mb-4 border-crimson/40 p-3 text-sm text-crimson">${esc(error)}</div>` : ''}
    ${!snapshot.connected ? `<section class="card p-5"><h3 class="section-title">No se encontró el cliente de League</h3><p class="section-sub mt-1">Abre el cliente del juego y vuelve a actualizar. En macOS debe estar en la ubicación estándar de Riot; en instalaciones personalizadas puedes configurar <code>NOXUS_LEAGUE_DIR</code>.</p></section>` : !snapshot.inChampSelect ? `<section class="card p-5"><h3 class="section-title">No estás en selección de campeones</h3><p class="section-sub mt-1">Cuando entres a una sala de selección, pulsa “Actualizar selección”. La app no consulta la sesión en segundo plano.</p></section>` : `<div class="grid gap-4 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]"><section class="card p-4"><div class="eyebrow">Tu selección</div><div class="mt-3 flex items-center gap-3">${ownChampId ? champIcon(ownChampId, 54) : `<div class="grid h-[54px] w-[54px] place-items-center rounded-xl border border-line bg-canvas text-crimson">${icon('user', 20)}</div>`}<div><h3 class="font-extrabold">${esc(ownName)}</h3><p class="text-xs text-ink-dim">${isIntent ? 'Intención de pick, todavía no confirmada' : 'Pick de tu equipo'}</p></div></div><label class="mt-4 block text-xs font-semibold text-ink-dim">Rol para ajustar la recomendación<select class="input mt-1" data-change="role">${ROLES.map((r) => `<option value="${r}" ${r === role ? 'selected' : ''}>${ROLE_LABEL[r]}</option>`).join('')}</select></label><p class="mt-3 text-xs text-ink-mute">Instantánea: ${esc(capturedAt || 'recién actualizada')}</p></section><section class="card p-4"><div class="flex items-center justify-between gap-2"><div><div class="eyebrow">Picks rivales visibles</div><h3 class="mt-1 font-extrabold">Composición enemiga</h3></div><span class="chip">${visibleEnemyPicks} / 5 detectados</span></div><div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">${teamCards || '<p class="col-span-full text-sm text-ink-dim">Aún no hay picks rivales visibles.</p>'}</div></section></div><section class="card mt-4 p-4"><div class="eyebrow">Lectura táctica</div><h3 class="mt-1 font-extrabold">Qué respetar de los picks rivales</h3><p class="mt-1 text-xs text-ink-dim">Consejos preventivos basados en el perfil local de cada campeón; úsalos como guía, no como certeza de lo que hará el rival.</p>${renderTactics(enemies)}</section><section class="card mt-4 p-4"><div class="eyebrow">Sugerencias de objetos</div><h3 class="mt-1 font-extrabold">Respuestas posibles para ${ROLE_LABEL[role]}</h3><p class="mt-1 text-xs text-ink-dim">Cada objeto incluye la situación que lo activa y el propósito descrito en la guía local. No es una build óptima garantizada.</p>${suggestions}</section>`}
    <p class="mt-3 text-[11px] leading-relaxed text-ink-mute">Solo lectura y bajo demanda. Esta función no compra objetos, no importa builds y no modifica tu selección. Los datos de objetos deben revisarse para el parche actual.</p>`;
}

export function mountChampSelectCoach(root: HTMLElement): View<State> {
  let view: View<State>;
  view = createView<State>({
    root,
    state: { snapshot: null, role: 'adc', loading: false, error: '', capturedAt: '' },
    render: (s) => render(s.snapshot, s.role, s.loading ? '__loading' : s.error, s.capturedAt),
    actions: {
      refresh: async ({ state }) => {
        if (state.loading) return;
        view.set({ loading: true, error: '' });
        try {
          const snapshot = await readSnapshot();
          const assigned = snapshot.session?.myTeam?.find((p) => p.cellId === snapshot.session?.localPlayerCellId)?.assignedPosition;
          view.set({ snapshot, loading: false, role: ROLE_BY_POSITION[(assigned ?? '').toUpperCase()] ?? state.role, capturedAt: new Date().toLocaleTimeString() });
        } catch (e) {
          view.set({ loading: false, error: e instanceof Error ? e.message : 'No se pudo leer la sesión de selección.' });
        }
      },
    },
    changes: { role: ({ value }) => ({ role: ROLES.includes(value as Role) ? value as Role : 'adc' }) },
  });
  return view;
}
