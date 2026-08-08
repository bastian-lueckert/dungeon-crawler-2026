// ---------- Basis ----------

export type Direction = 0 | 1 | 2 | 3; // 0=Nord, 1=Ost, 2=Süd, 3=West

export interface Vec2 {
  x: number;
  y: number;
}

// ---------- Attribute (D&D-Stil) ----------

export interface Abilities {
  str: number; // Stärke
  dex: number; // Geschicklichkeit
  con: number; // Konstitution
  int: number; // Intelligenz
  wis: number; // Weisheit
  cha: number; // Charisma
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// ---------- Charakterklassen ----------

export type ClassId = 'warrior' | 'mage' | 'cleric' | 'rogue';

export interface ClassDefinition {
  id: ClassId;
  name: string;
  description: string;
  hitDie: number; // z.B. 10 = W10 pro Stufe
  primaryAbility: keyof Abilities;
  savingThrows: (keyof Abilities)[];
  startingEquipmentIds: string[];
  canCastArcane: boolean;
  canCastDivine: boolean;
  baseArmorClass: number;
}

// ---------- Items ----------

export type ItemSlot = 'weapon' | 'offhand' | 'armor' | 'head' | 'accessory' | 'consumable' | 'misc';

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  slot: ItemSlot;
  damageDice?: { count: number; sides: number };
  armorBonus?: number;
  value: number;
  weight: number;
  stackable?: boolean;
}

export interface ItemStack {
  itemId: string;
  quantity: number;
}

// ---------- Zauber ----------

export interface SpellDefinition {
  id: string;
  name: string;
  level: number;
  school: 'arcane' | 'divine';
  description: string;
  damageDice?: { count: number; sides: number };
  healDice?: { count: number; sides: number };
  manaCost: number;
}

// ---------- Charakter ----------

export interface Character {
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  abilities: Abilities;
  maxHp: number;
  hp: number;
  maxMana: number;
  mana: number;
  armorClass: number;
  inventory: ItemStack[];
  equipment: Partial<Record<ItemSlot, string>>;
  knownSpellIds: string[];
  portraitSeed: number;
  isAlive: boolean;
}

// ---------- Party ----------

export interface Party {
  members: Character[];
  gold: number;
  position: Vec2;
  facing: Direction;
  campaignId: string;
  levelIndex: number;
}

// ---------- Dungeon ----------

export type TileType = 'wall' | 'floor' | 'door' | 'stairsDown' | 'stairsUp';

export interface DungeonTile {
  type: TileType;
  wallsN: boolean;
  wallsE: boolean;
  wallsS: boolean;
  wallsW: boolean;
  trap?: TrapDefinition;
  discovered: boolean;
  doorLocked?: boolean;
  doorKeyId?: string;
}

export interface TrapDefinition {
  id: string;
  name: string;
  damageDice: { count: number; sides: number };
  triggered: boolean;
}

export interface MonsterSpawn {
  position: Vec2;
  monsterIds: string[];
  triggered: boolean;
  isBoss?: boolean;
}

export interface TreasureSpawn {
  position: Vec2;
  items: ItemStack[];
  gold: number;
  looted: boolean;
}

export type DecorationKind = 'skeleton' | 'well' | 'rubble' | 'web' | 'bones';

export interface DecorationSpawn {
  position: Vec2;
  kind: DecorationKind;
}

export type ChestLootKind = 'weapon' | 'shield' | 'spell' | 'monster';

export interface ChestSpawn {
  position: Vec2;
  lootKind: ChestLootKind;
  itemId?: string;
  spellId?: string;
  monsterId?: string;
  gold: number;
  opened: boolean;
}

export interface DungeonLevel {
  seed: string;
  width: number;
  height: number;
  tiles: DungeonTile[][]; // [y][x]
  startPosition: Vec2;
  stairsDownPosition: Vec2;
  monsterSpawns: MonsterSpawn[];
  treasureSpawns: TreasureSpawn[];
  decorations: DecorationSpawn[];
  chestSpawns: ChestSpawn[];
  themeColor: string;
}

// ---------- Monster ----------

export interface MonsterDefinition {
  id: string;
  name: string;
  hitDice: { count: number; sides: number };
  armorClass: number;
  attackBonus: number;
  damageDice: { count: number; sides: number };
  xpReward: number;
  goldReward: { count: number; sides: number };
  description: string;
}

export interface MonsterInstance {
  defId: string;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  isBoss?: boolean;
}

// ---------- Kampagnen ----------

export interface CampaignDefinition {
  id: string;
  order: number;
  name: string;
  tagline: string;
  description: string;
  levelCount: number;
  minCharacterLevel: number;
  monsterPoolIds: string[];
  bossMonsterId: string;
  themeColor: string;
}

// ---------- Speicherstand ----------

export interface SaveGame {
  version: number;
  savedAt: number;
  party: Party;
  campaignProgress: Record<string, { unlocked: boolean; completed: boolean; highestLevelReached: number }>;
  dungeonSeed: string;
}
