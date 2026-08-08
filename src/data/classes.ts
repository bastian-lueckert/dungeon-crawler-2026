import type { ClassDefinition } from '../core/types';

export const CLASSES: Record<string, ClassDefinition> = {
  warrior: {
    id: 'warrior',
    name: 'Krieger',
    description: 'Ein Meister der Waffen und Rüstungen, vorne in der Schlachtreihe.',
    hitDie: 10,
    primaryAbility: 'str',
    savingThrows: ['str', 'con'],
    startingEquipmentIds: ['sword_short', 'armor_leather', 'shield_wood'],
    canCastArcane: false,
    canCastDivine: false,
    baseArmorClass: 10,
  },
  mage: {
    id: 'mage',
    name: 'Magier',
    description: 'Wirkt arkane Zauber, schwach im Nahkampf aber mächtig aus der Distanz.',
    hitDie: 4,
    primaryAbility: 'int',
    savingThrows: ['int', 'wis'],
    startingEquipmentIds: ['staff_wood', 'robe_cloth'],
    canCastArcane: true,
    canCastDivine: false,
    baseArmorClass: 10,
  },
  cleric: {
    id: 'cleric',
    name: 'Kleriker',
    description: 'Ein Geistlicher, der heilt und die Gruppe mit göttlicher Magie unterstützt.',
    hitDie: 8,
    primaryAbility: 'wis',
    savingThrows: ['wis', 'cha'],
    startingEquipmentIds: ['mace_wood', 'armor_leather'],
    canCastArcane: false,
    canCastDivine: true,
    baseArmorClass: 10,
  },
  rogue: {
    id: 'rogue',
    name: 'Schurke',
    description: 'Schnell und heimtückisch, findet Fallen und trifft empfindliche Stellen.',
    hitDie: 6,
    primaryAbility: 'dex',
    savingThrows: ['dex', 'int'],
    startingEquipmentIds: ['dagger', 'armor_leather'],
    canCastArcane: false,
    canCastDivine: false,
    baseArmorClass: 10,
  },
};

export const CLASS_LIST = Object.values(CLASSES);
