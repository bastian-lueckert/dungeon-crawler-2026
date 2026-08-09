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

  // ---- Monstertrophäen: Beutestücke, die sich verkaufen lassen ----
  rat_tail: {
    id: 'rat_tail', name: 'Rattenschwanz', description: 'Ein Beweis für einen erlegten Nager. Bei Händlern ein paar Münzen wert.',
    slot: 'misc', value: 2, weight: 0.1, stackable: true,
  },
  kobold_tooth: {
    id: 'kobold_tooth', name: 'Koboldzahn', description: 'Ein scharfer Zahn, den mancher Sammler zu schätzen weiß.',
    slot: 'misc', value: 3, weight: 0.1, stackable: true,
  },
  bat_wing: {
    id: 'bat_wing', name: 'Fledermausflügel', description: 'Zutat für allerlei zwielichtige Tränke.',
    slot: 'misc', value: 3, weight: 0.1, stackable: true,
  },
  goblin_ear: {
    id: 'goblin_ear', name: 'Goblinohr', description: 'Manche Wachposten zahlen für jedes erlegte Goblin-Paar.',
    slot: 'misc', value: 4, weight: 0.1, stackable: true,
  },
  bone_fragment: {
    id: 'bone_fragment', name: 'Knochensplitter', description: 'Überrest eines Untoten, nützlich für Nekromanten und Alchemisten.',
    slot: 'misc', value: 3, weight: 0.1, stackable: true,
  },
  spider_silk: {
    id: 'spider_silk', name: 'Spinnenseide', description: 'Reißfestes Gespinst, begehrt bei Webern und Rüstungsschmieden.',
    slot: 'misc', value: 6, weight: 0.2, stackable: true,
  },
  orc_tusk: {
    id: 'orc_tusk', name: 'Ork-Stoßzahn', description: 'Ein Trophäenzahn, geschätzt unter Söldnern.',
    slot: 'misc', value: 6, weight: 0.2, stackable: true,
  },
  troll_hide: {
    id: 'troll_hide', name: 'Trollhaut', description: 'Zähes, sich selbst heilendes Leder von großem Wert.',
    slot: 'misc', value: 14, weight: 1, stackable: true,
  },
  cultist_talisman: {
    id: 'cultist_talisman', name: 'Kult-Talisman', description: 'Ein unheiliges Amulett, das dunkle Sammler teuer bezahlen.',
    slot: 'misc', value: 12, weight: 0.2, stackable: true,
  },
  dragon_scale: {
    id: 'dragon_scale', name: 'Drachenschuppe', description: 'Hart wie Stahl und schillernd — ein wahrer Schatz.',
    slot: 'misc', value: 60, weight: 0.5, stackable: true,
  },

  // ---- Schmuckstücke: ausrüstbar im Accessoire-Slot ----
  ring_protection: {
    id: 'ring_protection', name: 'Ring des Schutzes', description: 'Ein schlichter Ring, der eine schützende Aura webt.',
    slot: 'accessory', armorBonus: 1, value: 20, weight: 0.1,
  },
  amulet_ward: {
    id: 'amulet_ward', name: 'Amulett der Abwehr', description: 'Ein altes Amulett, das Angriffe abschwächt.',
    slot: 'accessory', armorBonus: 2, value: 40, weight: 0.2,
  },
  dragonscale_pendant: {
    id: 'dragonscale_pendant', name: 'Drachenschuppen-Anhänger', description: 'Aus einer echten Drachenschuppe gefertigt, bietet er außergewöhnlichen Schutz.',
    slot: 'accessory', armorBonus: 3, value: 80, weight: 0.3,
  },
};

export const ITEM_LIST = Object.values(ITEMS);
