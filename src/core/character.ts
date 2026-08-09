import { Rng } from './rng';
import { abilityModifier, type Abilities, type Character, type ClassId } from './types';
import { CLASSES } from '../data/classes';
import { SPELLS } from '../data/spells';
import { ITEMS } from '../data/items';

/** Berechnet die Rüstungsklasse aus Basiswert, Geschicklichkeit und ausgerüsteten Gegenständen neu. */
export function recomputeArmorClass(character: Character): void {
  const cls = CLASSES[character.classId];
  let bonus = 0;
  for (const slot of ['armor', 'offhand', 'head', 'accessory'] as const) {
    const itemId = character.equipment[slot];
    const item = itemId ? ITEMS[itemId] : undefined;
    if (item?.armorBonus) bonus += item.armorBonus;
  }
  character.armorClass = cls.baseArmorClass + abilityModifier(character.abilities.dex) + bonus;
}

const EQUIPPABLE_SLOTS = ['weapon', 'offhand', 'armor', 'accessory', 'head'] as const;

/** Rüstet einen Gegenstand aus dem Inventar in seinem passenden Slot aus (Waffe/Nebenhand/Rüstung/Accessoire/Kopf). */
export function equipItem(character: Character, itemId: string): void {
  const item = ITEMS[itemId];
  if (!item || !(EQUIPPABLE_SLOTS as readonly string[]).includes(item.slot)) return;
  character.equipment[item.slot] = itemId;
  recomputeArmorClass(character);
}

function itemScore(itemId: string): number {
  const item = ITEMS[itemId];
  if (!item) return -1;
  if (item.damageDice) return (item.damageDice.count * (item.damageDice.sides + 1)) / 2;
  return item.armorBonus ?? 0;
}

/** Rüstet einen neu gefundenen Gegenstand automatisch aus, falls der Slot leer ist oder der Fund besser ist. */
export function autoEquipIfBetter(character: Character, itemId: string): boolean {
  const item = ITEMS[itemId];
  if (!item || !(EQUIPPABLE_SLOTS as readonly string[]).includes(item.slot)) return false;
  const current = character.equipment[item.slot];
  if (!current || itemScore(itemId) > itemScore(current)) {
    equipItem(character, itemId);
    return true;
  }
  return false;
}

export function rollAbilities(rng: Rng): Abilities {
  const rollScore = () => {
    // 4W6, niedrigsten Wurf verwerfen (klassische D&D-Methode)
    const rolls = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)].sort((a, b) => b - a);
    return rolls[0] + rolls[1] + rolls[2];
  };
  return {
    str: rollScore(),
    dex: rollScore(),
    con: rollScore(),
    int: rollScore(),
    wis: rollScore(),
    cha: rollScore(),
  };
}

export function createCharacter(name: string, classId: ClassId, abilities: Abilities, rng: Rng): Character {
  const cls = CLASSES[classId];
  const conMod = abilityModifier(abilities.con);
  const maxHp = Math.max(1, cls.hitDie + conMod);
  const castsSpells = cls.canCastArcane || cls.canCastDivine;
  const spellAbility = cls.canCastArcane ? abilities.int : abilities.wis;
  const maxMana = castsSpells ? Math.max(0, 4 + abilityModifier(spellAbility) * 2) : 0;

  const knownSpellIds = castsSpells
    ? Object.values(SPELLS)
        .filter((s) => s.level === 1 && ((cls.canCastArcane && s.school === 'arcane') || (cls.canCastDivine && s.school === 'divine')))
        .map((s) => s.id)
    : [];

  const character: Character = {
    id: `char_${Date.now()}_${rng.int(1000, 9999)}`,
    name,
    classId,
    level: 1,
    xp: 0,
    abilities,
    maxHp,
    hp: maxHp,
    maxMana,
    mana: maxMana,
    armorClass: cls.baseArmorClass + abilityModifier(abilities.dex),
    inventory: cls.startingEquipmentIds.map((id) => ({ itemId: id, quantity: 1 })),
    equipment: {},
    knownSpellIds,
    portraitSeed: rng.int(0, 999999),
    isAlive: true,
  };

  for (const itemId of cls.startingEquipmentIds) equipItem(character, itemId);
  recomputeArmorClass(character);

  return character;
}

export function xpForNextLevel(level: number): number {
  return level * level * 100;
}

export function grantXp(character: Character, xp: number): boolean {
  character.xp += xp;
  let leveledUp = false;
  while (character.xp >= xpForNextLevel(character.level)) {
    levelUp(character);
    leveledUp = true;
  }
  return leveledUp;
}

export function levelUp(character: Character): void {
  const cls = CLASSES[character.classId];
  const conMod = abilityModifier(character.abilities.con);
  const hpGain = Math.max(1, Math.floor(cls.hitDie / 2) + 1 + conMod);
  character.level += 1;
  character.maxHp += hpGain;
  character.hp = character.maxHp;
  if (character.maxMana > 0) {
    character.maxMana += 2;
    character.mana = character.maxMana;
  }
}
