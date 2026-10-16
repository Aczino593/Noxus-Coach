import type { Item } from '../types';

function i(id: number, name: string, tags: string, group?: string): Item {
  return { id, name, tags: tags ? tags.split('|') : [], group };
}

export const ITEMS: Item[] = [
  // Iniciales
  i(1055, "Hoja de Doran", 'Inicial'),
  i(1054, "Escudo de Doran", 'Inicial'),
  i(1056, "Anillo de Doran", 'Inicial'),
  i(1082, 'Sello Oscuro', 'Inicial'),
  i(2003, 'Poción de Vida', 'Consumible'),
  i(2031, 'Poción Rellenable', 'Consumible'),
  i(1101, 'Cachorro Garrabrasa', 'Inicial jungla'),
  i(3862, 'Hoz Espectral', 'Inicial support'),
  i(3865, 'Atlas Mundial', 'Inicial support'),

  // Componentes / Back temprano
  i(3802, 'Capítulo Perdido', 'Componente|Maná|Poder de habilidad'),

  // Botas
  i(1001, 'Botas', 'Botas|Velocidad de movimiento'),
  i(3006, 'Grebas de Berserker', 'Botas'),
  i(3111, 'Botas de Mercurio', 'Botas|Anti-CC|Contra daño AP'),
  i(3047, 'Quijotes Blindados', 'Botas|Contra auto-ataques'),
  i(3020, 'Zapatos de Hechicero', 'Botas'),
  i(3158, 'Botas de Lucidez Jonia', 'Botas'),
  i(3009, 'Botas de Rapidez', 'Botas'),

  // Utilidad de equipo
  i(2065, 'Canción de Guerra de Shurelya', 'Utilidad de equipo|Engage / Disengage', 'speed-aura'),
  i(3107, 'Redención', 'Utilidad de equipo|Curación en área', 'redemption'),
  i(3109, 'Voto del Caballero', 'Utilidad de equipo|Protege al carry', 'knight'),
  i(3110, 'Corazón Helado', 'Contra auto-ataques|Aura de ralentización', 'frozen'),
  i(3222, 'Bendición de Mikael', 'Utilidad de equipo|Limpieza de CC', 'cleanse'),
  i(3190, 'Relicario de los Solari de Hierro', 'Utilidad de equipo|Escudo de equipo|Resistencia a burst', 'solari'),
  i(3050, 'Convergencia de Zeke', 'Utilidad de equipo|Combo con engage', 'zeke'),
  i(3001, 'Máscara Abisal', 'Utilidad de equipo|Contra daño AP en área', 'abyssal'),
  i(3143, 'Presagio de Randuin', 'Contra críticos|Contra auto-ataques', 'randuin'),
  i(3102, 'Velo de la Banshee', 'Contra daño AP en área|Anti-poke', 'banshee'),

  // Anti-curación (todos comparten pasiva)
  i(3075, 'Cota de Espinas', 'Anti-curación|Contra auto-ataques', 'antiheal'),
  i(3165, 'Morellonomicón', 'Anti-curación|Daño AP', 'antiheal'),
  i(3033, 'Recordatorio Mortal', 'Anti-curación|Penetración de armadura', 'antiheal'),
  i(6609, 'Espada Sierra Chempunk', 'Anti-curación|Daño AD', 'antiheal'),
  i(3076, 'Chaleco de Zarzas', 'Anti-curación|Componente barato', 'antiheal'),
  i(3916, 'Orbe del Olvido', 'Anti-curación|Componente barato', 'antiheal'),
  i(3123, 'Llamada del Verdugo', 'Anti-curación|Componente barato', 'antiheal'),

  // Defensivos / burst
  i(3026, 'Ángel Guardián', 'Resistencia a burst'),
  i(3157, 'Reloj de Arena de Zhonya', 'Resistencia a burst|Contra asesinos'),
  i(3156, 'Mandíbula de Malmortius', 'Resistencia a burst|Contra daño AP'),
  i(3065, 'Manto del Espíritu', 'Contra daño AP en área|Sustain'),
  i(4401, 'Fuerza de la Naturaleza', 'Contra daño AP en área'),
  i(3193, 'Placa de Piedra de Gárgola', 'Frontline|Resistencia a burst'),
  i(3068, 'Égida Solar', 'Frontline|Contra auto-ataques'),
  i(3083, 'Armadura de Warmog', 'Frontline'),
  i(3742, 'Placa del Muerto', 'Frontline|Engage'),
  i(6333, 'Danza de la Muerte', 'Resistencia a burst|Contra auto-ataques'),
  i(3053, 'Aguijón de Sterak', 'Resistencia a burst'),
  i(6673, 'Arco Inmortal', 'Resistencia a burst'),

  // Anti-tanque
  i(3071, 'Cortadora Negra', 'Anti-tanque|Reducción de armadura', 'armor-shred'),
  i(3036, 'Saludos de Lord Dominik', 'Anti-tanque'),
  i(3135, 'Bastón del Vacío', 'Anti-tanque|Penetración mágica'),
  i(6653, 'Tormento de Liandry', 'Anti-tanque|Daño por % de vida'),
  i(6694, 'Rencor de Serylda', 'Anti-tanque|Ralentización'),

  // Daño
  i(3031, 'Filo del Infinito', 'Daño crítico'),
  i(3094, 'Cañón Rápido', 'Daño crítico'),
  i(6672, 'Matakrakens', 'Daño sostenido'),
  i(3153, 'Hoja del Rey Arruinado', 'Daño sostenido|Robo de vida|Ralentización'),
  i(3124, 'Furia de Guinsoo', 'Velocidad de ataque|Daño on-hit'),
  i(3085, 'Huracán de Runaan', 'Velocidad de ataque|Daño en área'),
  i(3302, 'Terminus', 'Penetración|Daño on-hit'),
  i(3046, 'Danzante Fantasma', 'Velocidad de ataque'),
  i(3072, 'Sed de Sangre', 'Sustain'),
  i(3078, 'Fuerza de la Trinidad', 'Daño híbrido'),
  i(3089, 'Sombrero Mortal de Rabadon', 'Daño AP'),
  i(6655, 'Compañero de Luden', 'Daño AP burst|Maná'),
  i(3118, 'Malicia', 'Daño AP|Definitiva|Aceleración'),
  i(3100, 'Perdición del Liche', 'Daño AP burst|Velocidad de movimiento'),
  i(3137, 'Criptoflora', 'Daño AP|Penetración mágica|Utilidad de equipo'),
  i(6656, 'Criptofloración', 'Daño AP|Penetración mágica'),
  i(3152, 'Cinturón Cohete Hextech', 'Daño AP burst'),
  i(4645, 'Llama Sombría', 'Daño AP burst|Penetración mágica'),
  i(4629, 'Impulso Cósmico', 'Daño AP'),
  i(3003, 'Bastón del Arcángel', 'Daño AP'),
  i(3042, 'Muramana', 'Daño sostenido'),
  i(3814, 'Filo de la Noche', 'Anti-CC'),
  i(6665, "Jak'Sho, el Proteico", 'Frontline|Resistencia'),

  // Wards
  i(3340, 'Tótem Guardián', 'Visión'),
  i(2055, 'Ward de Control', 'Visión|Consumible'),
  i(3364, 'Lente del Oráculo', 'Visión'),
  i(3363, 'Alteración de Visión Lejana', 'Visión'),
];

export const ITEM_BY_ID: Record<number, Item> = Object.fromEntries(ITEMS.map((it) => [it.id, it]));

export function item(id: number): Item {
  return ITEM_BY_ID[id] ?? { id, name: `Objeto ${id}`, tags: [] };
}

export const GROUP_LABEL: Record<string, string> = {
  antiheal: 'Reducción de curación',
  'speed-aura': 'Aura de velocidad (Shurelya)',
  redemption: 'Activa de Redención',
  knight: 'Vínculo de Voto del Caballero',
  frozen: 'Aura de Corazón Helado',
  cleanse: 'Activa de Mikael',
  solari: 'Escudo de Solari',
  zeke: 'Aura de Zeke',
  abyssal: 'Aura de RM de Máscara Abisal',
  randuin: 'Pasiva de Randuin',
  banshee: 'Escudo de Banshee',
  'armor-shred': 'Reducción de armadura',
};

/** Objetos "de utilidad / situacionales de equipo" que ofrece el selector de Clash */
export const TEAM_ITEM_POOL: number[] = [
  2065, 3107, 3109, 3110, 3222, 3190, 3050, 3001, 3143, 3102,
  3075, 3165, 3033, 6609, 3916,
  3026, 3157, 3156, 3065, 4401, 3193, 3068, 3083, 3742, 6333, 3053,
  3071, 3036, 3135, 6653, 6694,
];
