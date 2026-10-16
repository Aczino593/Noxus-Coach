import type { Role } from '../types';

/**
 * Fundamentos para jugadores principiantes: farmeo (CS) y control de visión.
 * Funciones puras: reciben los datos de UNA partida y devuelven un diagnóstico pedagógico.
 */

export type Light = 'red' | 'yellow' | 'green';

export const LIGHT_COLOR: Record<Light, string> = {
  red: 'var(--color-loss)',
  yellow: '#f5b942',
  green: 'var(--color-win)',
};

/** CS/min a partir del cual el ritmo de recursos es "excelente". */
export const CS_TARGET = 7;
/** Oro medio por súbdito (melee ≈ 21g, a distancia ≈ 14g, cañón ≈ 60g): estimación redondeada. */
export const GOLD_PER_CS = 20;

/* ─────────────── Farmeo ─────────────── */
export interface FarmReport {
  /** El soporte no se evalúa por CS */
  applicable: boolean;
  cs: number;
  csPerMin: number;
  light: Light;
  label: string;
  message: string;
  /** Súbditos que faltaron para llegar a CS_TARGET */
  lostCs: number;
  /** Oro estimado perdido por súbditos no farmeados */
  lostGold: number;
}

export function farmReport(cs: number, durationSec: number, role: Role): FarmReport {
  const mins = Math.max(1, durationSec / 60);
  const csPerMin = Math.round((cs / mins) * 10) / 10;

  if (role === 'support') {
    return {
      applicable: false,
      cs,
      csPerMin,
      light: 'green',
      label: 'No aplica',
      message: 'Como soporte no se te mide por CS: tu impacto está en la visión, la protección y las peleas.',
      lostCs: 0,
      lostGold: 0,
    };
  }

  // Rojo < 5 · Amarillo 5.0 – 6.9 · Verde ≥ 7.0
  const light: Light = csPerMin < 5 ? 'red' : csPerMin < CS_TARGET ? 'yellow' : 'green';
  const label = light === 'red' ? 'Crítico' : light === 'yellow' ? 'Aceptable' : 'Excelente';
  const message =
    light === 'red'
      ? 'Crítico: Estás perdiendo demasiado oro bajo torre y oleadas enteras.'
      : light === 'yellow'
        ? csPerMin >= 6.5
          ? `Casi en el objetivo: te faltan unos pocos súbditos por minuto para llegar a ${CS_TARGET} CS/m.`
          : 'Aceptable, pero descuidas el farmeo al pasar a fase de grupos/mid game.'
        : 'Excelente ritmo de recursos.';

  const lostCs = Math.max(0, Math.round((CS_TARGET - csPerMin) * mins));
  const lostGold = Math.round((lostCs * GOLD_PER_CS) / 10) * 10;
  return { applicable: true, cs, csPerMin, light, label, message, lostCs, lostGold };
}

/* ─────────────── Visión y Control Wards ─────────────── */
export interface VisionReport {
  visionScore: number;
  visionPerMin: number;
  /** Meta de puntuación de visión/min para el rol */
  target: number;
  light: Light;
  controlWards: number;
  /** Pinks recomendados para una partida de esta duración */
  controlTarget: number;
  /** 0 o 1 pink comprado → advertencia roja */
  noPink: boolean;
  message: string;
}

const VISION_TARGET: Record<Role, number> = {
  top: 0.9,
  jungle: 1.2,
  mid: 0.9,
  adc: 1.0,
  support: 2.0,
};

export function visionReport(visionScore: number, controlWards: number, durationSec: number, role: Role): VisionReport {
  const mins = Math.max(1, durationSec / 60);
  const visionPerMin = Math.round((visionScore / mins) * 100) / 100;
  const target = VISION_TARGET[role];
  const ratio = visionPerMin / target;
  const light: Light = ratio >= 1 ? 'green' : ratio >= 0.6 ? 'yellow' : 'red';
  const noPink = controlWards <= 1;
  const controlTarget = Math.max(2, Math.round(mins / 8));
  return {
    visionScore,
    visionPerMin,
    target,
    light,
    controlWards,
    controlTarget,
    noPink,
    message: noPink
      ? 'Falta de control de mapa: No invertiste en Wards de Control para proteger tu línea.'
      : `Buen control de mapa: compraste ${controlWards} Wards de Control.`,
  };
}
