import { Rng } from './rng';
import { abilityModifier, type Character, type MonsterDefinition, type MonsterInstance, type SpellDefinition } from './types';
import { MONSTERS } from '../data/monsters';
import { ITEMS } from '../data/items';
import { CLASSES } from '../data/classes';

export interface CombatLogEntry {
  message: string;
}

export interface CombatParticipant {
  kind: 'character' | 'monster';
  id: string; // character.id oder monster instance index als string
}

export function instantiateMonster(monsterId: string, rng: Rng): MonsterInstance {
  const def = MONSTERS[monsterId];
  const hp = Math.max(1, rng.dice(def.hitDice.count, def.hitDice.sides));
  return { defId: monsterId, hp, maxHp: hp, isAlive: true };
}

export function rollInitiative(rng: Rng, dexMod: number): number {
  return rng.int(1, 20) + dexMod;
}

function weaponDamageDice(character: Character): { count: number; sides: number } {
  const weaponId = character.equipment.weapon;
  const weapon = weaponId ? ITEMS[weaponId] : undefined;
  return weapon?.damageDice ?? { count: 1, sides: 3 }; // waffenlos: 1W3
}

export interface AttackResult {
  hit: boolean;
  critical: boolean;
  damage: number;
  attackRoll: number;
  log: string;
}

/** Angriff eines Charakters gegen ein Monster, nach D&D-Grundregeln (d20 + Modifikator vs. Rüstungsklasse). */
export function characterAttackMonster(
  attacker: Character,
  defenderDef: MonsterDefinition,
  rng: Rng
): AttackResult {
  const strMod = abilityModifier(attacker.abilities.str);
  const roll = rng.int(1, 20);
  const attackBonus = strMod + Math.ceil(attacker.level / 2);
  const total = roll + attackBonus;
  const critical = roll === 20;
  const hit = critical || roll !== 1 && total >= defenderDef.armorClass;

  if (!hit) {
    return { hit: false, critical: false, damage: 0, attackRoll: roll, log: `${attacker.name} verfehlt ${defenderDef.name} (Wurf ${roll}).` };
  }

  const dice = weaponDamageDice(attacker);
  let damage = rng.dice(dice.count, dice.sides) + strMod;
  if (critical) damage *= 2;
  damage = Math.max(1, damage);

  return {
    hit: true,
    critical,
    damage,
    attackRoll: roll,
    log: `${attacker.name} trifft ${defenderDef.name} für ${damage} Schaden${critical ? ' (Kritischer Treffer!)' : ''}.`,
  };
}

/** Angriff eines Monsters gegen einen Charakter. `defending` halbiert erlittenen Schaden (aufgerundet mind. 1). */
export function monsterAttackCharacter(attackerDef: MonsterDefinition, defender: Character, rng: Rng, defending = false): AttackResult {
  const roll = rng.int(1, 20);
  const effectiveAc = defender.armorClass + (defending ? 2 : 0);
  const total = roll + attackerDef.attackBonus;
  const critical = roll === 20;
  const hit = critical || (roll !== 1 && total >= effectiveAc);

  if (!hit) {
    return { hit: false, critical: false, damage: 0, attackRoll: roll, log: `${attackerDef.name} verfehlt ${defender.name} (Wurf ${roll}).` };
  }

  let damage = rng.dice(attackerDef.damageDice.count, attackerDef.damageDice.sides);
  if (critical) damage *= 2;
  if (defending) damage = Math.ceil(damage / 2);
  damage = Math.max(1, damage);

  return {
    hit: true,
    critical,
    damage,
    attackRoll: roll,
    log: `${attackerDef.name} trifft ${defender.name} für ${damage} Schaden${critical ? ' (Kritischer Treffer!)' : ''}${defending ? ' (verteidigt sich)' : ''}.`,
  };
}

export interface SpellCastResult {
  damage: number;
  heal: number;
  log: string;
}

/** Wirkt einen Zauber eines Charakters. Schadenszauber treffen ein Monster, Heilzauber einen Verbündeten. */
export function castSpell(
  caster: Character,
  spell: SpellDefinition,
  rng: Rng,
  opts: { monsterDef?: MonsterDefinition; healTarget?: Character } = {}
): SpellCastResult {
  const cls = CLASSES[caster.classId];
  const spellMod = abilityModifier(cls.canCastArcane ? caster.abilities.int : caster.abilities.wis);

  if (spell.damageDice && opts.monsterDef) {
    const damage = Math.max(1, rng.dice(spell.damageDice.count, spell.damageDice.sides) + Math.max(0, spellMod));
    return {
      damage,
      heal: 0,
      log: `${caster.name} wirkt ${spell.name} auf ${opts.monsterDef.name} für ${damage} Schaden.`,
    };
  }
  if (spell.healDice && opts.healTarget) {
    const heal = Math.max(1, rng.dice(spell.healDice.count, spell.healDice.sides) + Math.max(0, spellMod));
    return {
      damage: 0,
      heal,
      log: `${caster.name} wirkt ${spell.name} und heilt ${opts.healTarget.name} um ${heal} Trefferpunkte.`,
    };
  }
  return { damage: 0, heal: 0, log: `${caster.name} wirkt ${spell.name}.` };
}

export function applyDamageToMonster(monster: MonsterInstance, damage: number): void {
  monster.hp = Math.max(0, monster.hp - damage);
  if (monster.hp === 0) monster.isAlive = false;
}

export function applyDamageToCharacter(character: Character, damage: number): void {
  character.hp = Math.max(0, character.hp - damage);
  if (character.hp === 0) character.isAlive = false;
}

export function healCharacter(character: Character, amount: number): void {
  character.hp = Math.min(character.maxHp, character.hp + amount);
}
