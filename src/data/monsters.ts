import type { MonsterDefinition } from '../core/types';

export const MONSTERS: Record<string, MonsterDefinition> = {
  giant_rat: {
    id: 'giant_rat', name: 'Riesenratte', hitDice: { count: 1, sides: 8 },
    armorClass: 11, attackBonus: 2, damageDice: { count: 1, sides: 3 },
    xpReward: 10, goldReward: { count: 1, sides: 4 },
    description: 'Eine übergroße, aggressive Ratte.',
  },
  skeleton: {
    id: 'skeleton', name: 'Skelett', hitDice: { count: 2, sides: 8 },
    armorClass: 13, attackBonus: 3, damageDice: { count: 1, sides: 6 },
    xpReward: 25, goldReward: { count: 2, sides: 6 },
    description: 'Klappernde Knochen, von dunkler Magie angetrieben.',
  },
  goblin: {
    id: 'goblin', name: 'Goblin', hitDice: { count: 1, sides: 6 },
    armorClass: 12, attackBonus: 2, damageDice: { count: 1, sides: 6 },
    xpReward: 15, goldReward: { count: 2, sides: 4 },
    description: 'Ein kleiner, hinterhältiger Humanoid.',
  },
  giant_spider: {
    id: 'giant_spider', name: 'Riesenspinne', hitDice: { count: 3, sides: 8 },
    armorClass: 14, attackBonus: 4, damageDice: { count: 1, sides: 8 },
    xpReward: 40, goldReward: { count: 1, sides: 6 },
    description: 'Ihr Biss ist giftig und tödlich.',
  },
  orc: {
    id: 'orc', name: 'Ork', hitDice: { count: 2, sides: 10 },
    armorClass: 13, attackBonus: 4, damageDice: { count: 1, sides: 8 },
    xpReward: 35, goldReward: { count: 3, sides: 6 },
    description: 'Ein brutaler Krieger mit roher Kraft.',
  },
  zombie: {
    id: 'zombie', name: 'Zombie', hitDice: { count: 3, sides: 8 },
    armorClass: 10, attackBonus: 3, damageDice: { count: 1, sides: 8 },
    xpReward: 30, goldReward: { count: 1, sides: 4 },
    description: 'Langsam, aber widerstandsfähig gegen Schmerz.',
  },
  wraith: {
    id: 'wraith', name: 'Schemen', hitDice: { count: 5, sides: 8 },
    armorClass: 15, attackBonus: 6, damageDice: { count: 2, sides: 6 },
    xpReward: 80, goldReward: { count: 4, sides: 6 },
    description: 'Ein körperloser Geist, der Lebenskraft raubt.',
  },
  ogre: {
    id: 'ogre', name: 'Oger', hitDice: { count: 4, sides: 10 },
    armorClass: 14, attackBonus: 6, damageDice: { count: 2, sides: 8 },
    xpReward: 70, goldReward: { count: 5, sides: 6 },
    description: 'Ein riesiger, brutaler Schläger.',
  },
  dark_cultist: {
    id: 'dark_cultist', name: 'Dunkler Kultist', hitDice: { count: 3, sides: 6 },
    armorClass: 12, attackBonus: 3, damageDice: { count: 1, sides: 6 },
    xpReward: 30, goldReward: { count: 3, sides: 4 },
    description: 'Ein Anhänger finsterer Mächte.',
  },
  young_dragon: {
    id: 'young_dragon', name: 'Junger Drache', hitDice: { count: 10, sides: 10 },
    armorClass: 18, attackBonus: 9, damageDice: { count: 3, sides: 10 },
    xpReward: 500, goldReward: { count: 10, sides: 10 },
    description: 'Der gefürchtete Endgegner eines Dungeons.',
  },
  kobold: {
    id: 'kobold', name: 'Kobold', hitDice: { count: 1, sides: 6 },
    armorClass: 12, attackBonus: 1, damageDice: { count: 1, sides: 4 },
    xpReward: 8, goldReward: { count: 1, sides: 3 },
    description: 'Ein kleiner, feiger Reptilienhumanoid, der in Rudeln jagt.',
  },
  cave_bat: {
    id: 'cave_bat', name: 'Höhlenfledermaus', hitDice: { count: 1, sides: 4 },
    armorClass: 13, attackBonus: 2, damageDice: { count: 1, sides: 2 },
    xpReward: 6, goldReward: { count: 1, sides: 2 },
    description: 'Schnell und schwer zu treffen, aber schwach.',
  },
  skeleton_archer: {
    id: 'skeleton_archer', name: 'Skelettbogenschütze', hitDice: { count: 2, sides: 6 },
    armorClass: 12, attackBonus: 4, damageDice: { count: 1, sides: 8 },
    xpReward: 28, goldReward: { count: 2, sides: 6 },
    description: 'Schießt knöcherne Pfeile aus der Distanz.',
  },
  bandit: {
    id: 'bandit', name: 'Wegelagerer', hitDice: { count: 2, sides: 8 },
    armorClass: 13, attackBonus: 3, damageDice: { count: 1, sides: 6 },
    xpReward: 20, goldReward: { count: 3, sides: 6 },
    description: 'Ein abtrünniger Söldner auf der Suche nach leichter Beute.',
  },
  troll: {
    id: 'troll', name: 'Troll', hitDice: { count: 6, sides: 10 },
    armorClass: 15, attackBonus: 7, damageDice: { count: 2, sides: 8 },
    xpReward: 120, goldReward: { count: 6, sides: 6 },
    description: 'Regeneriert Wunden erschreckend schnell.',
  },
  bone_lord: {
    id: 'bone_lord', name: 'Der Gebeinlord', hitDice: { count: 8, sides: 10 },
    armorClass: 16, attackBonus: 8, damageDice: { count: 2, sides: 8 },
    xpReward: 250, goldReward: { count: 8, sides: 8 },
    description: 'Der uralte Herrscher der Katakomben von Veyrn, gehüllt in verrottende Prachtgewänder.',
  },
  orc_warchief: {
    id: 'orc_warchief', name: 'Ork-Kriegshäuptling', hitDice: { count: 9, sides: 10 },
    armorClass: 17, attackBonus: 9, damageDice: { count: 2, sides: 10 },
    xpReward: 320, goldReward: { count: 10, sides: 8 },
    description: 'Der brutale Anführer der Orks im Dornwald, vernarbt von hundert Schlachten.',
  },
  ash_high_priest: {
    id: 'ash_high_priest', name: 'Hoherpriester der Asche', hitDice: { count: 11, sides: 10 },
    armorClass: 18, attackBonus: 10, damageDice: { count: 3, sides: 8 },
    xpReward: 420, goldReward: { count: 12, sides: 10 },
    description: 'Der Anführer des Kults, der die Zitadelle der Asche in seinen Bann gezogen hat.',
  },
};

export const MONSTER_LIST = Object.values(MONSTERS);
