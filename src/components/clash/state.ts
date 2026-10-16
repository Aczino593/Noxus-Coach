import type { Archetype } from '../../types';
import type { ScoutPlayer } from '../../data/clashMock';
import type { Team } from '../../lib/clashEngine';

export type ClashTab = 'comp' | 'scout' | 'builds';

export interface ClashState {
  tab: ClashTab;
  arch: Archetype;
  team: Team;
  /** Slot de la comp con el selector de campeón abierto */
  picker: number | null;
  query: string;
  // Scouting
  enemy: ScoutPlayer[];
  scouting: boolean;
  bansOn: Record<string, boolean>;
  // Builds de equipo
  utility: number[][];
  buildsLoading: boolean;
}

/** Valores de formularios que no necesitan re-render por tecla */
export const scoutDraft = {
  region: 'LAS',
  inputs: [
    { name: 'Brisaroja', tag: 'LAS' },
    { name: 'Cazalobos', tag: 'NOX' },
    { name: 'YoneEsMiVida', tag: '6969' },
    { name: 'Piltover99', tag: 'CAIT' },
    { name: 'MareaNegra', tag: 'SUP' },
  ],
};

export const PALETTE = ['#ff2e4d', '#e0a96d', '#4c8dff', '#10b981', '#9aa7ff'];
