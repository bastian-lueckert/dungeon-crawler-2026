import type { ItemDefinition } from '../core/types';

export const ITEMS: Record<string, ItemDefinition> = {
  sword_short: {
    id: 'sword_short', name: 'Kurzschwert', description: 'Eine handliche Klinge.',
    slot: 'weapon', damageDice: { count: 1, sides: 6 }, value: 10, weight: 3,
  },
  dagger: {
    id: 'dagger', name: 'Dolch', description: 'Schnell und leicht.',
    slot: 'weapon', damageDice: { count: 1, sides: 4 }, value: 5, weight: 1,
  },
  mace_wood: {
    id: 'mace_wood', name: 'Streitkolben', description: 'Stumpfe Waffe für Geistliche.',
    slot: 'weapon', damageDice: { count: 1, sides: 6 }, value: 8, weight: 4,
  },
  staff_wood: {
    id: 'staff_wood', name: 'Holzstab', description: 'Verstärkt arkane Magie.',
    slot: 'weapon', damageDice: { count: 1, sides: 4 }, value: 12, weight: 2,
  },
  armor_leather: {
    id: 'armor_leather', name: 'Lederrüstung', description: 'Leichter Schutz.',
    slot: 'armor', armorBonus: 2, value: 15, weight: 8,
  },
  robe_cloth: {
    id: 'robe_cloth', name: 'Stoffrobe', description: 'Behindert Zauberwirken nicht.',
    slot: 'armor', armorBonus: 0, value: 3, weight: 1,
  },
  shield_wood: {
    id: 'shield_wood', name: 'Holzschild', description: 'Erhöht die Rüstungsklasse.',
    slot: 'offhand', armorBonus: 1, value: 10, weight: 5,
  },
  sword_long: {
    id: 'sword_long', name: 'Langschwert', description: 'Eine ausbalancierte Klinge für erfahrene Krieger.',
    slot: 'weapon', damageDice: { count: 1, sides: 8 }, value: 25, weight: 4,
  },
  axe_battle: {
    id: 'axe_battle', name: 'Streitaxt', description: 'Schwer, aber verheerend im Nahkampf.',
    slot: 'weapon', damageDice: { count: 1, sides: 10 }, value: 30, weight: 6,
  },
  warhammer: {
    id: 'warhammer', name: 'Kriegshammer', description: 'Zermalmt Rüstung und Knochen gleichermaßen.',
    slot: 'weapon', damageDice: { count: 1, sides: 8 }, value: 28, weight: 7,
  },
  shield_iron: {
    id: 'shield_iron', name: 'Eisenschild', description: 'Solider Schutz aus geschmiedetem Eisen.',
    slot: 'offhand', armorBonus: 2, value: 22, weight: 7,
  },
  shield_tower: {
    id: 'shield_tower', name: 'Turmschild', description: 'Ein massiver Schild, der den ganzen Körper deckt.',
    slot: 'offhand', armorBonus: 3, value: 35, weight: 10,
  },
  potion_healing: {
    id: 'potion_healing', name: 'Heiltrank', description: 'Heilt 2W4+2 Trefferpunkte.',
    slot: 'consumable', value: 25, weight: 0.5, stackable: true,
  },
  torch: {
    id: 'torch', name: 'Fackel', description: 'Erhellt den Dungeon.',
    slot: 'misc', value: 1, weight: 1, stackable: true,
  },
  rusty_key: {
    id: 'rusty_key', name: 'Rostiger Schlüssel', description: 'Passt in ein altes Türschloss irgendwo in dieser Ebene.',
    slot: 'misc', value: 0, weight: 0.1, stackable: true,
  },
};

export const ITEM_LIST = Object.values(ITEMS);
