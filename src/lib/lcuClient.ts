import { RUNES_DATA } from '../components/RunesTree';
import type { RuneSetup } from '../data/builds';
import type { BuildPreset } from './buildEngine';

/** Configuración de HUD detectada del cliente oficial de LoL */
export interface HudSettings {
  connected: boolean;
  /** Escala general de HUD (0.0 a 1.0, por ejemplo 0.3 o 1.0) */
  globalScale: number;
  /** Escala del minimapa (0.0 a 1.0+) */
  minimapScale: number;
  /** true si el jugador tiene el minimapa en la izquierda */
  flipMiniMap: boolean;
  chatScale: number;
  source: 'lcu_api' | 'config_file' | 'default';
}

function norm(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Resuelve los 9 IDs numéricos oficiales de Riot Games para el árbol de runas
 * [Keystone, Slot1, Slot2, Slot3, Sec1, Sec2, Shard1, Shard2, Shard3]
 */
export function resolvePerkIds(runes: RuneSetup): {
  primaryStyleId: number;
  subStyleId: number;
  selectedPerkIds: number[];
} {
  const pTree = RUNES_DATA[runes.primary.tree] ?? RUNES_DATA.domination;
  const sTree = RUNES_DATA[runes.secondary.tree] ?? RUNES_DATA.sorcery;

  const perkIds: number[] = [];

  // 1. Keystone (Fila 0 de la rama primaria)
  const ksName = norm(runes.primary.keystone?.name || '');
  const ksNode =
    pTree.slots[0].find((n) => norm(n.name) === ksName || norm(n.key) === ksName) ||
    pTree.slots[0].find((n) => ksName.includes(norm(n.name)) || norm(n.name).includes(ksName)) ||
    pTree.slots[0][0];
  perkIds.push(ksNode.id);

  // 2. Tres slots de la rama primaria (Filas 1, 2 y 3)
  const pSlotsNorm = (runes.primary.slots || []).map(norm);
  for (let r = 1; r <= 3; r++) {
    const row = pTree.slots[r] || [];
    const matched =
      row.find((n) => pSlotsNorm.includes(norm(n.name)) || pSlotsNorm.includes(norm(n.key))) ||
      row.find((n) => pSlotsNorm.some((s) => s.includes(norm(n.name)) || norm(n.name).includes(s))) ||
      row[0];
    if (matched) perkIds.push(matched.id);
  }

  // 3. Dos slots de la rama secundaria
  const sSlotsNorm = (runes.secondary.slots || []).map(norm);
  const matchedSec: number[] = [];
  for (let r = 1; r <= 3; r++) {
    const row = sTree.slots[r] || [];
    for (const n of row) {
      if (
        sSlotsNorm.includes(norm(n.name)) ||
        sSlotsNorm.includes(norm(n.key)) ||
        sSlotsNorm.some((s) => s.includes(norm(n.name)) || norm(n.name).includes(s))
      ) {
        if (!matchedSec.includes(n.id)) matchedSec.push(n.id);
      }
    }
  }
  // Fallbacks si falta alguno en la secundaria
  if (matchedSec.length < 2) {
    for (let r = 1; r <= 3 && matchedSec.length < 2; r++) {
      for (const n of sTree.slots[r] || []) {
        if (!matchedSec.includes(n.id)) {
          matchedSec.push(n.id);
          break;
        }
      }
    }
  }
  perkIds.push(...matchedSec.slice(0, 2));

  // 4. Tres fragmentos de estadísticas (Stat Shards)
  const shards = runes.shards || [];
  const s0 = norm(shards[0] || 'adapt');
  const s1 = norm(shards[1] || 'adapt');
  const s2 = norm(shards[2] || 'vida');

  // Fila Ofensiva: 5008 (Adapt), 5005 (Vel Ataque), 5007 (Haste)
  perkIds.push(s0.includes('ataque') || s0.includes('attack') ? 5005 : s0.includes('aceleracion') || s0.includes('haste') ? 5007 : 5008);

  // Fila Flexible: 5008 (Adapt), 5010 (Vel Movimiento), 5001 (Vida Escalable)
  perkIds.push(s1.includes('movimiento') || s1.includes('speed') ? 5010 : s1.includes('escalable') || s1.includes('vida') || s1.includes('hp') ? 5001 : 5008);

  // Fila Defensiva: 5011 (Vida Plana 65), 5013 (Tenacidad), 5001 (Vida Escalable)
  perkIds.push(s2.includes('plana') || s2.includes('flat') || s2.includes('65') ? 5011 : s2.includes('tenacidad') || s2.includes('tenacity') ? 5013 : 5001);

  return {
    primaryStyleId: pTree.id,
    subStyleId: sTree.id,
    selectedPerkIds: perkIds,
  };
}

/**
 * Consulta la configuración de escala del HUD y del Minimapa
 */
export async function fetchHudSettings(): Promise<HudSettings> {
  try {
    const res = await fetch('/lol-lcu/hud-settings');
    if (res.ok) {
      const data = await res.json();
      return {
        connected: !!data.connected,
        globalScale: typeof data.globalScale === 'number' ? data.globalScale : 1.0,
        minimapScale: typeof data.minimapScale === 'number' ? data.minimapScale : 1.0,
        flipMiniMap: !!data.flipMiniMap,
        chatScale: typeof data.chatScale === 'number' ? data.chatScale : 100,
        source: data.source || 'default',
      };
    }
  } catch {
    // ignore
  }
  return {
    connected: false,
    globalScale: 1.0,
    minimapScale: 1.0,
    flipMiniMap: false,
    chatScale: 100,
    source: 'default',
  };
}

/**
 * Envía las runas al cliente de League of Legends mediante la LCU API
 */
export async function importRunesToClient(
  runes: RuneSetup,
  champName: string,
  presetLabel: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const { primaryStyleId, subStyleId, selectedPerkIds } = resolvePerkIds(runes);
    const body = {
      name: `Noxus: ${champName} (${presetLabel})`,
      primaryStyleId,
      subStyleId,
      selectedPerkIds,
      current: true,
    };

    const res = await fetch('/lol-lcu/import-runes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { success: false, message: `Error del servidor HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      success: !!data.success,
      message: data.message || (data.success ? 'Runas importadas correctamente' : 'No se pudieron importar'),
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error de conexión con el cliente de LoL' };
  }
}

/**
 * Envía la build de objetos directamente a la tienda del League of Legends
 */
export async function importBuildToClient(
  champName: string,
  preset: BuildPreset,
): Promise<{ success: boolean; message: string }> {
  try {
    const starterItems = (preset.starterItems || []).map((it) => ({ id: String(it.item), count: 1 }));
    const earlyItems = (preset.earlyItems || []).map((it) => ({ id: String(it.item), count: 1 }));
    const coreItems = (preset.coreItems || []).map((it) => ({ id: String(it.item), count: 1 }));
    const fullBuild = (preset.fullBuild || []).map((id) => ({ id: String(id), count: 1 }));
    const situationalItems = (preset.situational || []).map((it) => ({ id: String(it.item), count: 1 }));

    const payload = {
      champName,
      title: `Noxus Coach: ${champName} (${preset.label})`,
      blocks: [
        { type: 'Objetos Iniciales', items: starterItems },
        { type: 'Objetos Tempranos y Botas', items: earlyItems },
        { type: 'Núcleo de la Build', items: coreItems },
        { type: 'Build Completa', items: fullBuild },
        { type: 'Objetos Situacionales / Anti-Meta', items: situationalItems },
      ],
    };

    const res = await fetch('/lol-lcu/import-build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { success: false, message: `Error HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      success: !!data.success,
      message: data.message || (data.success ? 'Build guardada en la tienda de LoL' : 'No se pudo guardar la build'),
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error exportando la build' };
  }
}
