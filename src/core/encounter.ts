import { Rng } from './rng';
import { abilityModifier, type Character, type MonsterInstance, type SpellDefinition } from './types';
import { MONSTERS } from '../data/monsters';
import {
  applyDamageToCharacter,
  applyDamageToMonster,
  castSpell,
  characterAttackMonster,
  healCharacter,
  instantiateMonster,
  monsterAttackCharacter,
  rollInitiative,
} from './combat';

export type TurnActor =
  | { kind: 'character'; character: Character }
  | { kind: 'monster'; monster: MonsterInstance };

export interface InitiativeEntry {
  actor: TurnActor;
  initiative: number;
}

export interface LastAction {
  kind: 'attack' | 'spellDamage' | 'spellHeal' | 'defend' | 'item';
  attacker: { kind: 'character' | 'monster'; key: string };
  target?: { kind: 'character' | 'monster'; key: string };
  hit: boolean;
  critical: boolean;
  amount: number;
}

export class Encounter {
  readonly monsters: MonsterInstance[];
  readonly party: Character[];
  readonly order: InitiativeEntry[];
  turnIndex = 0;
  readonly log: string[] = [];
  finished = false;
  victory = false;
  readonly defendingIds = new Set<string>();
  lastAction: LastAction | null = null;
  private rng: Rng;

  constructor(party: Character[], monsterIds: string[], rng: Rng, isBoss = false) {
    this.rng = rng;
    this.party = party;
    this.monsters = monsterIds.map((id) => {
      const m = instantiateMonster(id, rng);
      if (isBoss) m.isBoss = true;
      return m;
    });
    this.order = this.rollInitiativeOrder();
  }

  private rollInitiativeOrder(): InitiativeEntry[] {
    const entries: InitiativeEntry[] = [];
    for (const c of this.party) {
      if (!c.isAlive) continue;
      entries.push({ actor: { kind: 'character', character: c }, initiative: rollInitiative(this.rng, abilityModifier(c.abilities.dex)) });
    }
    for (const m of this.monsters) {
      entries.push({ actor: { kind: 'monster', monster: m }, initiative: rollInitiative(this.rng, 0) });
    }
    return entries.sort((a, b) => b.initiative - a.initiative);
  }

  currentActor(): TurnActor | null {
    this.skipDeadActors();
    if (this.finished) return null;
    return this.order[this.turnIndex]?.actor ?? null;
  }

  monsterKey(monster: MonsterInstance): string {
    return String(this.monsters.indexOf(monster));
  }

  private skipDeadActors() {
    let guard = 0;
    while (guard++ < this.order.length * 2) {
      this.checkEndConditions();
      if (this.finished) return;
      const actor = this.order[this.turnIndex]?.actor;
      if (!actor) {
        this.nextIndex();
        continue;
      }
      const alive = actor.kind === 'character' ? actor.character.isAlive : actor.monster.isAlive;
      if (alive) return;
      this.nextIndex();
    }
  }

  private nextIndex() {
    this.turnIndex = (this.turnIndex + 1) % this.order.length;
    if (this.turnIndex === 0) this.defendingIds.clear();
  }

  private checkEndConditions() {
    if (this.monsters.every((m) => !m.isAlive)) {
      this.finished = true;
      this.victory = true;
    } else if (this.party.every((c) => !c.isAlive)) {
      this.finished = true;
      this.victory = false;
    }
  }

  /** Charakter greift ein Monster mit der Waffe an. */
  playerAttack(character: Character, monsterIndex: number) {
    const monster = this.monsters[monsterIndex];
    if (!monster || !monster.isAlive) return;
    const def = MONSTERS[monster.defId];
    const result = characterAttackMonster(character, def, this.rng);
    this.log.push(result.log);
    if (result.hit) applyDamageToMonster(monster, result.damage);
    this.lastAction = {
      kind: 'attack',
      attacker: { kind: 'character', key: character.id },
      target: { kind: 'monster', key: String(monsterIndex) },
      hit: result.hit,
      critical: result.critical,
      amount: result.damage,
    };
    this.advanceTurn();
  }

  /** Charakter wirkt einen Schadenszauber auf ein Monster. */
  playerCastDamageSpell(character: Character, spell: SpellDefinition, monsterIndex: number) {
    const monster = this.monsters[monsterIndex];
    if (!monster || !monster.isAlive || character.mana < spell.manaCost) return;
    character.mana -= spell.manaCost;
    const def = MONSTERS[monster.defId];
    const result = castSpell(character, spell, this.rng, { monsterDef: def });
    this.log.push(result.log);
    applyDamageToMonster(monster, result.damage);
    this.lastAction = {
      kind: 'spellDamage',
      attacker: { kind: 'character', key: character.id },
      target: { kind: 'monster', key: String(monsterIndex) },
      hit: true,
      critical: false,
      amount: result.damage,
    };
    this.advanceTurn();
  }

  /** Charakter wirkt einen Heilzauber auf einen Verbündeten. */
  playerCastHealSpell(character: Character, spell: SpellDefinition, target: Character) {
    if (!target.isAlive || character.mana < spell.manaCost) return;
    character.mana -= spell.manaCost;
    const result = castSpell(character, spell, this.rng, { healTarget: target });
    this.log.push(result.log);
    healCharacter(target, result.heal);
    this.lastAction = {
      kind: 'spellHeal',
      attacker: { kind: 'character', key: character.id },
      target: { kind: 'character', key: target.id },
      hit: true,
      critical: false,
      amount: result.heal,
    };
    this.advanceTurn();
  }

  /** Charakter verteidigt sich: erhöhte Rüstungsklasse und halbierter Schaden bis zur nächsten eigenen Runde. */
  playerDefend(character: Character) {
    this.defendingIds.add(character.id);
    this.log.push(`${character.name} geht in Verteidigungsstellung.`);
    this.lastAction = {
      kind: 'defend',
      attacker: { kind: 'character', key: character.id },
      hit: true,
      critical: false,
      amount: 0,
    };
    this.advanceTurn();
  }

  /** Charakter trinkt einen Heiltrank aus dem Inventar. */
  playerUseHealingPotion(character: Character) {
    const stack = character.inventory.find((s) => s.itemId === 'potion_healing' && s.quantity > 0);
    if (!stack) return;
    stack.quantity -= 1;
    character.inventory = character.inventory.filter((s) => s.quantity > 0);
    const heal = Math.max(1, this.rng.dice(2, 4) + 2);
    healCharacter(character, heal);
    this.log.push(`${character.name} trinkt einen Heiltrank und heilt ${heal} Trefferpunkte.`);
    this.lastAction = {
      kind: 'item',
      attacker: { kind: 'character', key: character.id },
      target: { kind: 'character', key: character.id },
      hit: true,
      critical: false,
      amount: heal,
    };
    this.advanceTurn();
  }

  /** Führt den Zug eines Monsters automatisch aus (greift zufälligen lebenden Charakter an). */
  monsterTurn(monster: MonsterInstance) {
    const aliveTargets = this.party.filter((c) => c.isAlive);
    if (aliveTargets.length === 0) return;
    const target = aliveTargets[this.rng.int(0, aliveTargets.length - 1)];
    const def = MONSTERS[monster.defId];
    const defending = this.defendingIds.has(target.id);
    const result = monsterAttackCharacter(def, target, this.rng, defending);
    this.log.push(result.log);
    if (result.hit) applyDamageToCharacter(target, result.damage);
    this.lastAction = {
      kind: 'attack',
      attacker: { kind: 'monster', key: this.monsterKey(monster) },
      target: { kind: 'character', key: target.id },
      hit: result.hit,
      critical: result.critical,
      amount: result.damage,
    };
    this.advanceTurn();
  }

  advanceTurn() {
    this.checkEndConditions();
    if (this.finished) return;
    this.nextIndex();
    this.skipDeadActors();
  }
}

export function hasHealingPotion(character: Character): boolean {
  return character.inventory.some((s) => s.itemId === 'potion_healing' && s.quantity > 0);
}
