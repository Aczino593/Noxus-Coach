import { esc, spellIcon } from '../lib/ui';
import type { RuneSetup, TreeId } from '../data/builds';

export interface RuneNode {
  id: number;
  key: string;
  name: string;
  icon: string;
}

export interface TreeDefinition {
  id: number;
  key: string;
  name: string;
  treeId: TreeId;
  color: string;
  icon: string;
  slots: RuneNode[][];
}

const CDN_BASE = 'https://ddragon.leagueoflegends.com/cdn/img';

export const RUNES_DATA: Record<TreeId, TreeDefinition> = {
  domination: {
    id: 8100,
    key: 'Domination',
    name: 'Dominación',
    treeId: 'domination',
    color: '#ff4d63',
    icon: 'perk-images/Styles/7200_Domination.png',
    slots: [
      [
        { id: 8112, key: 'Electrocute', name: 'Electrocutar', icon: 'perk-images/Styles/Domination/Electrocute/Electrocute.png' },
        { id: 8128, key: 'DarkHarvest', name: 'Cosecha oscura', icon: 'perk-images/Styles/Domination/DarkHarvest/DarkHarvest.png' },
        { id: 9923, key: 'HailOfBlades', name: 'Lluvia de cuchillas', icon: 'perk-images/Styles/Domination/HailOfBlades/HailOfBlades.png' },
      ],
      [
        { id: 8126, key: 'CheapShot', name: 'Golpe bajo', icon: 'perk-images/Styles/Domination/CheapShot/CheapShot.png' },
        { id: 8139, key: 'TasteOfBlood', name: 'Sabor a sangre', icon: 'perk-images/Styles/Domination/TasteOfBlood/GreenTerror_TasteOfBlood.png' },
        { id: 8143, key: 'SuddenImpact', name: 'Impacto repentino', icon: 'perk-images/Styles/Domination/SuddenImpact/SuddenImpact.png' },
      ],
      [
        { id: 8136, key: 'ZombieWard', name: 'Guardián zombi', icon: 'perk-images/Styles/Domination/ZombieWard/ZombieWard.png' },
        { id: 8120, key: 'GhostPoro', name: 'Poro fantasmal', icon: 'perk-images/Styles/Domination/GhostPoro/GhostPoro.png' },
        { id: 8138, key: 'EyeballCollection', name: 'Colección de globos oculares', icon: 'perk-images/Styles/Domination/EyeballCollection/EyeballCollection.png' },
      ],
      [
        { id: 8135, key: 'TreasureHunter', name: 'Cazador de tesoros', icon: 'perk-images/Styles/Domination/TreasureHunter/TreasureHunter.png' },
        { id: 8105, key: 'RelentlessHunter', name: 'Cazador incesante', icon: 'perk-images/Styles/Domination/RelentlessHunter/RelentlessHunter.png' },
        { id: 8106, key: 'UltimateHunter', name: 'Cazador definitivo', icon: 'perk-images/Styles/Domination/UltimateHunter/UltimateHunter.png' },
      ],
    ],
  },
  precision: {
    id: 8000,
    key: 'Precision',
    name: 'Precisión',
    treeId: 'precision',
    color: '#c8aa6e',
    icon: 'perk-images/Styles/7201_Precision.png',
    slots: [
      [
        { id: 8005, key: 'PressTheAttack', name: 'Ataque intensificado', icon: 'perk-images/Styles/Precision/PressTheAttack/PressTheAttack.png' },
        { id: 8008, key: 'LethalTempo', name: 'Compás letal', icon: 'perk-images/Styles/Precision/LethalTempo/LethalTempoTemp.png' },
        { id: 8021, key: 'FleetFootwork', name: 'Pies veloces', icon: 'perk-images/Styles/Precision/FleetFootwork/FleetFootwork.png' },
        { id: 8010, key: 'Conqueror', name: 'Conquistador', icon: 'perk-images/Styles/Precision/Conqueror/Conqueror.png' },
      ],
      [
        { id: 9101, key: 'AbsorbLife', name: 'Absorber vida', icon: 'perk-images/Styles/Precision/AbsorbLife/AbsorbLife.png' },
        { id: 9111, key: 'Triumph', name: 'Triunfo', icon: 'perk-images/Styles/Precision/Triumph.png' },
        { id: 8009, key: 'PresenceOfMind', name: 'Claridad mental', icon: 'perk-images/Styles/Precision/PresenceOfMind/PresenceOfMind.png' },
      ],
      [
        { id: 9104, key: 'LegendAlacrity', name: 'Leyenda: Presteza', icon: 'perk-images/Styles/Precision/LegendAlacrity/LegendAlacrity.png' },
        { id: 9105, key: 'LegendHaste', name: 'Leyenda: Velocidad', icon: 'perk-images/Styles/Precision/LegendHaste/LegendHaste.png' },
        { id: 9103, key: 'LegendBloodline', name: 'Leyenda: Linaje', icon: 'perk-images/Styles/Precision/LegendBloodline/LegendBloodline.png' },
      ],
      [
        { id: 8014, key: 'CoupDeGrace', name: 'Golpe de gracia', icon: 'perk-images/Styles/Precision/CoupDeGrace/CoupDeGrace.png' },
        { id: 8017, key: 'CutDown', name: 'Derribado', icon: 'perk-images/Styles/Precision/CutDown/CutDown.png' },
        { id: 8299, key: 'LastStand', name: 'Último esfuerzo', icon: 'perk-images/Styles/Sorcery/LastStand/LastStand.png' },
      ],
    ],
  },
  sorcery: {
    id: 8200,
    key: 'Sorcery',
    name: 'Brujería',
    treeId: 'sorcery',
    color: '#9aa7ff',
    icon: 'perk-images/Styles/7202_Sorcery.png',
    slots: [
      [
        { id: 8214, key: 'SummonAery', name: 'Invocar a Aery', icon: 'perk-images/Styles/Sorcery/SummonAery/SummonAery.png' },
        { id: 8229, key: 'ArcaneComet', name: 'Cometa arcano', icon: 'perk-images/Styles/Sorcery/ArcaneComet/ArcaneComet.png' },
        { id: 8230, key: 'PhaseRush', name: 'Irrupción de fase', icon: 'perk-images/Styles/Sorcery/PhaseRush/PhaseRush.png' },
      ],
      [
        { id: 8224, key: 'NullifyingOrb', name: 'Orbe anulador', icon: 'perk-images/Styles/Sorcery/NullifyingOrb/Pokeshield.png' },
        { id: 8226, key: 'ManaflowBand', name: 'Banda de maná', icon: 'perk-images/Styles/Sorcery/ManaflowBand/ManaflowBand.png' },
        { id: 8275, key: 'NimbusCloak', name: 'Capa del nimbo', icon: 'perk-images/Styles/Sorcery/NimbusCloak/6361.png' },
      ],
      [
        { id: 8210, key: 'Transcendence', name: 'Trascendencia', icon: 'perk-images/Styles/Sorcery/Transcendence/Transcendence.png' },
        { id: 8234, key: 'Celerity', name: 'Celeridad', icon: 'perk-images/Styles/Sorcery/Celerity/CelerityTemp.png' },
        { id: 8233, key: 'AbsoluteFocus', name: 'Concentración absoluta', icon: 'perk-images/Styles/Sorcery/AbsoluteFocus/AbsoluteFocus.png' },
      ],
      [
        { id: 8237, key: 'Scorch', name: 'Piroláser', icon: 'perk-images/Styles/Sorcery/Scorch/Scorch.png' },
        { id: 8232, key: 'Waterwalking', name: 'Caminar sobre agua', icon: 'perk-images/Styles/Sorcery/Waterwalking/Waterwalking.png' },
        { id: 8236, key: 'GatheringStorm', name: 'Se avecina tormenta', icon: 'perk-images/Styles/Sorcery/GatheringStorm/GatheringStorm.png' },
      ],
    ],
  },
  resolve: {
    id: 8400,
    key: 'Resolve',
    name: 'Valor',
    treeId: 'resolve',
    color: '#4cc38a',
    icon: 'perk-images/Styles/7204_Resolve.png',
    slots: [
      [
        { id: 8437, key: 'GraspOfTheUndying', name: 'Garras del inmortal', icon: 'perk-images/Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png' },
        { id: 8439, key: 'Aftershock', name: 'Reverberacción', icon: 'perk-images/Styles/Resolve/VeteranAftershock/VeteranAftershock.png' },
        { id: 8465, key: 'Guardian', name: 'Protector', icon: 'perk-images/Styles/Resolve/Guardian/Guardian.png' },
      ],
      [
        { id: 8446, key: 'Demolish', name: 'Demoler', icon: 'perk-images/Styles/Resolve/Demolish/Demolish.png' },
        { id: 8463, key: 'FontOfLife', name: 'Fuente de vida', icon: 'perk-images/Styles/Resolve/FontOfLife/FontOfLife.png' },
        { id: 8401, key: 'ShieldBash', name: 'Golpe de escudo', icon: 'perk-images/Styles/Resolve/MirrorShell/MirrorShell.png' },
      ],
      [
        { id: 8429, key: 'Conditioning', name: 'Condicionamiento', icon: 'perk-images/Styles/Resolve/Conditioning/Conditioning.png' },
        { id: 8444, key: 'SecondWind', name: 'Fuerzas renovadas', icon: 'perk-images/Styles/Resolve/SecondWind/SecondWind.png' },
        { id: 8473, key: 'BonePlating', name: 'Revestimiento de huesos', icon: 'perk-images/Styles/Resolve/BonePlating/BonePlating.png' },
      ],
      [
        { id: 8451, key: 'Overgrowth', name: 'Sobrecrecimiento', icon: 'perk-images/Styles/Resolve/Overgrowth/Overgrowth.png' },
        { id: 8453, key: 'Revitalize', name: 'Revitalizar', icon: 'perk-images/Styles/Resolve/Revitalize/Revitalize.png' },
        { id: 8242, key: 'Unflinching', name: 'Inquebrantable', icon: 'perk-images/Styles/Sorcery/Unflinching/Unflinching.png' },
      ],
    ],
  },
  inspiration: {
    id: 8300,
    key: 'Inspiration',
    name: 'Inspiración',
    treeId: 'inspiration',
    color: '#49d0d6',
    icon: 'perk-images/Styles/7203_Whimsy.png',
    slots: [
      [
        { id: 8351, key: 'GlacialAugment', name: 'Mejora glacial', icon: 'perk-images/Styles/Inspiration/GlacialAugment/GlacialAugment.png' },
        { id: 8360, key: 'UnsealedSpellbook', name: 'Libro de hechizos', icon: 'perk-images/Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png' },
        { id: 8369, key: 'FirstStrike', name: 'Primer golpe', icon: 'perk-images/Styles/Inspiration/FirstStrike/FirstStrike.png' },
      ],
      [
        { id: 8306, key: 'HextechFlashtraption', name: 'Destello hextech', icon: 'perk-images/Styles/Inspiration/HextechFlashtraption/HextechFlashtraption.png' },
        { id: 8304, key: 'MagicalFootwear', name: 'Calzado mágico', icon: 'perk-images/Styles/Inspiration/MagicalFootwear/MagicalFootwear.png' },
        { id: 8321, key: 'CashBack', name: 'Reembolso', icon: 'perk-images/Styles/Inspiration/CashBack/CashBack2.png' },
      ],
      [
        { id: 8313, key: 'PerfectTiming', name: 'Tónico triple', icon: 'perk-images/Styles/Inspiration/PerfectTiming/AlchemistCabinet.png' },
        { id: 8352, key: 'TimeWarpTonic', name: 'Tónico de distorsión temporal', icon: 'perk-images/Styles/Inspiration/TimeWarpTonic/TimeWarpTonic.png' },
        { id: 8345, key: 'BiscuitDelivery', name: 'Entrega de galletas', icon: 'perk-images/Styles/Inspiration/BiscuitDelivery/BiscuitDelivery.png' },
      ],
      [
        { id: 8347, key: 'CosmicInsight', name: 'Perspicacia cósmica', icon: 'perk-images/Styles/Inspiration/CosmicInsight/CosmicInsight.png' },
        { id: 8410, key: 'ApproachVelocity', name: 'Velocidad de acercamiento', icon: 'perk-images/Styles/Resolve/ApproachVelocity/ApproachVelocity.png' },
        { id: 8316, key: 'JackOfAllTrades', name: 'Manitas', icon: 'perk-images/Styles/Inspiration/JackOfAllTrades/JackofAllTrades2.png' },
      ],
    ],
  },
};

/* ─────────────── Definición de los 3 Fragmentos de Estadísticas (Stat Shards) ─────────────── */
export interface StatShard {
  id: string;
  name: string;
  icon: string;
}

export const STAT_SHARD_ROWS: { title: string; shards: StatShard[] }[] = [
  {
    title: 'Ofensivo',
    shards: [
      { id: 'adapt', name: '+9 Fuerza Adaptable', icon: 'perk-images/StatMods/StatModsAdaptiveForceIcon.png' },
      { id: 'as', name: '+10% Velocidad de Ataque', icon: 'perk-images/StatMods/StatModsAttackSpeedIcon.png' },
      { id: 'ah', name: '+8 Aceleración de Habilidad', icon: 'perk-images/StatMods/StatModsCDRScalingIcon.png' },
    ],
  },
  {
    title: 'Flexible',
    shards: [
      { id: 'adapt', name: '+9 Fuerza Adaptable', icon: 'perk-images/StatMods/StatModsAdaptiveForceIcon.png' },
      { id: 'ms', name: '+2% Velocidad de Movimiento', icon: 'perk-images/StatMods/StatModsMovementSpeedIcon.png' },
      { id: 'scalingHp', name: '+10-180 Vida Escalable', icon: 'perk-images/StatMods/StatModsHealthScalingIcon.png' },
    ],
  },
  {
    title: 'Defensivo',
    shards: [
      { id: 'flatHp', name: '+65 Vida Plana', icon: 'perk-images/StatMods/StatModsHealthPlusIcon.png' },
      { id: 'tenacity', name: '+10% Tenacidad y Resist. Ralentizaciones', icon: 'perk-images/StatMods/StatModsTenacityIcon.png' },
      { id: 'scalingHp', name: '+10-180 Vida Escalable', icon: 'perk-images/StatMods/StatModsHealthScalingIcon.png' },
    ],
  },
];

/** Normaliza nombres para comparación flexible de runas */
function norm(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function matchRune(rune: RuneNode, selectedList: string[]): boolean {
  const rName = norm(rune.name);
  const rKey = norm(rune.key);
  return selectedList.some((sel) => {
    const s = norm(sel);
    return s === rName || s === rKey || rName.includes(s) || s.includes(rName);
  });
}

function matchShard(shard: StatShard, selectedVal: string): boolean {
  const s = norm(selectedVal);
  if (shard.id === 'adapt') return s.includes('adapt') || s.includes('fuerza');
  if (shard.id === 'as') return s.includes('ataque') || s.includes('attack') || s.includes('vel');
  if (shard.id === 'ah') return s.includes('aceleracion') || s.includes('haste') || s.includes('cdr');
  if (shard.id === 'ms') return s.includes('movimiento') || s.includes('speed');
  if (shard.id === 'scalingHp') return s.includes('escalable') || s.includes('scaling');
  if (shard.id === 'flatHp') return s.includes('plana') || s.includes('flat') || s.includes('65');
  if (shard.id === 'tenacity') return s.includes('tenacidad') || s.includes('tenacity');
  return false;
}

/**
 * Renderiza el Árbol de Runas estilo Mobalytics en 3 columnas completas:
 * 1. Rama Primaria: Icono de rama, Keystone fila 0 + 3 filas con todas las opciones visibles.
 * 2. Rama Secundaria: Icono de rama + 3 filas secundarias con las 2 runas activas iluminadas.
 * 3. Fragmentos de Estadísticas: 3 filas con los 3 fragmentos circulares oficiales.
 */
export function runesTree(runes: RuneSetup, spells?: string[]): string {
  const pTree = RUNES_DATA[runes.primary.tree] ?? RUNES_DATA['domination'];
  const sTree = RUNES_DATA[runes.secondary.tree] ?? RUNES_DATA['sorcery'];

  const primarySelected = [runes.primary.keystone.name, ...runes.primary.slots];
  const secondarySelected = [...runes.secondary.slots];

  /* ────────────── Columna 1: Rama Primaria ────────────── */
  const renderPrimary = () => {
    return `
    <div class="card-inset p-3.5 flex flex-col justify-between">
      <!-- Encabezado de la rama -->
      <div class="flex items-center gap-2.5 pb-2.5 border-b border-line mb-3">
        <img src="${CDN_BASE}/${pTree.icon}" class="w-6 h-6 object-contain" alt="${esc(pTree.name)}" />
        <span class="text-[13px] font-bold" style="color: ${pTree.color}">${esc(pTree.name)}</span>
        <span class="chip chip-crimson ml-auto text-[9.5px]">Primaria</span>
      </div>

      <!-- Fila 0: Piedras Clave (Keystones) -->
      <div class="flex items-center justify-around py-2 px-1 mb-2 bg-[#090b0e] rounded-xl border border-line-strong/60">
        ${pTree.slots[0]
          .map((rune) => {
            const active = matchRune(rune, [runes.primary.keystone.name]);
            return `
            <div class="relative flex items-center justify-center" data-tip="${esc(rune.name)}">
              <span class="relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 ${
                active
                  ? 'border-2 ring-2 ring-crimson/50 scale-105 shadow-[0_0_16px_2px_var(--color-crimson)]'
                  : 'opacity-30 grayscale hover:opacity-50 hover:grayscale-0'
              }"
                    style="${active ? `border-color: ${pTree.color}; background: ${pTree.color}22` : 'border: 1px solid rgba(255,255,255,0.08)'}">
                <img src="${CDN_BASE}/${rune.icon}"
                     class="w-8 h-8 object-contain transition-transform"
                     alt="${esc(rune.name)}" />
              </span>
            </div>`;
          })
          .join('')}
      </div>

      <!-- Filas 1, 2 y 3: Ranuras Secundarias -->
      <div class="space-y-2.5">
        ${pTree.slots
          .slice(1)
          .map((slot) => {
            return `
            <div class="flex items-center justify-around py-1.5 px-1 bg-surface-2/40 rounded-lg border border-line/50">
              ${slot
                .map((rune) => {
                  const active = matchRune(rune, primarySelected);
                  return `
                  <div class="relative flex items-center justify-center" data-tip="${esc(rune.name)}">
                    <span class="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                      active
                        ? 'border-2 scale-105 shadow-[0_0_12px_1px_rgba(255,46,77,0.7)]'
                        : 'opacity-30 grayscale hover:opacity-60'
                    }"
                          style="${active ? `border-color: ${pTree.color}; background: ${pTree.color}22` : 'border: 1px solid rgba(255,255,255,0.08)'}">
                      <img src="${CDN_BASE}/${rune.icon}"
                           class="w-6 h-6 object-contain"
                           alt="${esc(rune.name)}" />
                    </span>
                  </div>`;
                })
                .join('')}
            </div>`;
          })
          .join('')}
      </div>
    </div>`;
  };

  /* ────────────── Columna 2: Rama Secundaria ────────────── */
  const renderSecondary = () => {
    return `
    <div class="card-inset p-3.5 flex flex-col justify-between">
      <!-- Encabezado de la rama secundaria -->
      <div class="flex items-center gap-2.5 pb-2.5 border-b border-line mb-3">
        <img src="${CDN_BASE}/${sTree.icon}" class="w-6 h-6 object-contain" alt="${esc(sTree.name)}" />
        <span class="text-[13px] font-bold" style="color: ${sTree.color}">${esc(sTree.name)}</span>
        <span class="chip ml-auto text-[9.5px]">Secundaria</span>
      </div>

      <!-- Filas de la rama secundaria (Slots 1, 2 y 3) -->
      <div class="space-y-3 my-auto">
        ${sTree.slots
          .slice(1)
          .map((slot) => {
            return `
            <div class="flex items-center justify-around py-2 px-1 bg-surface-2/40 rounded-lg border border-line/50">
              ${slot
                .map((rune) => {
                  const active = matchRune(rune, secondarySelected);
                  return `
                  <div class="relative flex items-center justify-center" data-tip="${esc(rune.name)}">
                    <span class="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                      active
                        ? 'border-2 scale-105 shadow-[0_0_12px_1px_rgba(255,46,77,0.7)]'
                        : 'opacity-30 grayscale hover:opacity-60'
                    }"
                          style="${active ? `border-color: ${sTree.color}; background: ${sTree.color}22` : 'border: 1px solid rgba(255,255,255,0.08)'}">
                      <img src="${CDN_BASE}/${rune.icon}"
                           class="w-6 h-6 object-contain"
                           alt="${esc(rune.name)}" />
                    </span>
                  </div>`;
                })
                .join('')}
            </div>`;
          })
          .join('')}
      </div>
    </div>`;
  };

  /* ────────────── Columna 3: Fragmentos de Estadísticas + Hechizos ────────────── */
  const renderShards = () => {
    return `
    <div class="card-inset p-3.5 flex flex-col justify-between">
      <!-- Encabezado de Fragmentos -->
      <div class="flex items-center gap-2 pb-2.5 border-b border-line mb-3">
        <span class="text-[13px] font-bold text-ink">Fragmentos de Stats</span>
        <span class="chip chip-gold ml-auto text-[9.5px]">Estadísticas</span>
      </div>

      <!-- Las 3 filas de fragmentos -->
      <div class="space-y-2.5 my-auto">
        ${STAT_SHARD_ROWS.map((row, rowIdx) => {
          const selectedShardStr = runes.shards[rowIdx] || '';
          return `
          <div class="flex items-center justify-around py-1.5 px-2 bg-surface-2/40 rounded-lg border border-line/50">
            ${row.shards
              .map((shard) => {
                const active = matchShard(shard, selectedShardStr);
                return `
                <div class="relative flex items-center justify-center" data-tip="${esc(shard.name)}">
                  <span class="flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${
                    active
                      ? 'border-2 border-gold bg-gold/20 scale-105 shadow-[0_0_10px_rgba(224,169,109,0.7)]'
                      : 'opacity-30 grayscale hover:opacity-60 border border-white/10'
                  }">
                    <img src="${CDN_BASE}/${shard.icon}"
                         class="w-5 h-5 object-contain"
                         alt="${esc(shard.name)}" />
                  </span>
                </div>`;
              })
              .join('')}
          </div>`;
        }).join('')}
      </div>

      <!-- Hechizos de Invocador recomendados -->
      ${
        spells && spells.length
          ? `
        <div class="mt-3 pt-2.5 border-t border-line flex items-center justify-between">
          <span class="eyebrow text-[10px]">Hechizos:</span>
          <div class="flex items-center gap-2">
            ${spells.map((sp) => spellIcon(sp, 26)).join('')}
          </div>
        </div>`
          : ''
      }
    </div>`;
  };

  return `
  <section class="card p-5">
    <div class="flex items-center justify-between mb-3.5">
      <div>
        <h3 class="section-title">Árbol de Runas Completo</h3>
        <p class="section-sub mt-0.5">Configuración meta de mayor winrate recomendada para este matchup.</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="chip" style="color:${pTree.color};border-color:${pTree.color}44;background:${pTree.color}15">
          ${pTree.name}
        </span>
        <span class="text-ink-mute text-[11px]">+</span>
        <span class="chip" style="color:${sTree.color};border-color:${sTree.color}44;background:${sTree.color}15">
          ${sTree.name}
        </span>
      </div>
    </div>

    <!-- Las 3 Columnas estilo Mobalytics -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
      ${renderPrimary()}
      ${renderSecondary()}
      ${renderShards()}
    </div>
  </section>`;
}
