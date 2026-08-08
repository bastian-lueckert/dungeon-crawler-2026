import type { SpellDefinition } from '../core/types';

export const SPELLS: Record<string, SpellDefinition> = {
  magic_missile: {
    id: 'magic_missile', name: 'Magisches Geschoss', level: 1, school: 'arcane',
    description: 'Ein Geschoss aus reiner Energie, das nie sein Ziel verfehlt.',
    damageDice: { count: 2, sides: 4 }, manaCost: 3,
  },
  fireball: {
    id: 'fireball', name: 'Feuerball', level: 3, school: 'arcane',
    description: 'Eine Explosion aus Feuer, die alle Gegner trifft.',
    damageDice: { count: 4, sides: 6 }, manaCost: 8,
  },
  cure_light_wounds: {
    id: 'cure_light_wounds', name: 'Leichte Wunden heilen', level: 1, school: 'divine',
    description: 'Heilt einen Verbündeten.',
    healDice: { count: 2, sides: 4 }, manaCost: 3,
  },
  bless: {
    id: 'bless', name: 'Segen', level: 1, school: 'divine',
    description: 'Gewährt der Gruppe einen Bonus auf Angriffswürfe.',
    manaCost: 4,
  },
};

export const SPELL_LIST = Object.values(SPELLS);
