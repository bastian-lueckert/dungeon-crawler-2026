import type { CampaignDefinition } from '../core/types';

export const CAMPAIGNS: CampaignDefinition[] = [
  {
    id: 'catacombs_of_veyrn',
    order: 1,
    name: 'Die Katakomben von Veyrn',
    tagline: 'Ein vergessenes Grab unter der alten Stadt.',
    description:
      'Unter den Ruinen der Stadt Veyrn liegen jahrhundertealte Katakomben. Gerüchte über ein verfluchtes Amulett locken Abenteurer in die Tiefe – die wenigsten kehren zurück.',
    levelCount: 3,
    minCharacterLevel: 1,
    monsterPoolIds: ['giant_rat', 'skeleton', 'goblin', 'giant_spider', 'kobold', 'cave_bat'],
    bossMonsterId: 'bone_lord',
    themeColor: '#5a4a34',
  },
  {
    id: 'thornwood_depths',
    order: 2,
    name: 'Die Tiefen des Dornwalds',
    tagline: 'Ein Wald, der seine Wurzeln bis in die Unterwelt schlägt.',
    description:
      'Der Dornwald verschluckt jeden, der sich zu tief hineinwagt. Unter seinen Wurzeln erstreckt sich ein Höhlensystem voller Orks und uralter Fallen.',
    levelCount: 4,
    minCharacterLevel: 3,
    monsterPoolIds: ['orc', 'giant_spider', 'goblin', 'zombie', 'bandit', 'skeleton_archer'],
    bossMonsterId: 'orc_warchief',
    themeColor: '#2f4a2f',
  },
  {
    id: 'citadel_of_ash',
    order: 3,
    name: 'Die Zitadelle der Asche',
    tagline: 'Eine verbrannte Festung, in der ein Kult erwacht.',
    description:
      'Einst eine stolze Festung, heute ein Aschehaufen. Ein Kult dunkler Mächte hat sich in den Ruinen eingenistet und ruft etwas herbei, das nicht erwachen sollte.',
    levelCount: 4,
    minCharacterLevel: 6,
    monsterPoolIds: ['dark_cultist', 'wraith', 'ogre', 'zombie', 'skeleton', 'skeleton_archer', 'troll'],
    bossMonsterId: 'ash_high_priest',
    themeColor: '#4a2f2f',
  },
  {
    id: 'throne_of_the_wyrm',
    order: 4,
    name: 'Der Thron des Wyrms',
    tagline: 'Der letzte Abstieg zum Drachenthron.',
    description:
      'Tief unter den Bergen wacht ein junger Drache über einen Hort aus Gold und uraltem Wissen. Nur die mutigsten Abenteurer wagen den letzten Abstieg.',
    levelCount: 5,
    minCharacterLevel: 9,
    monsterPoolIds: ['ogre', 'wraith', 'dark_cultist', 'troll'],
    bossMonsterId: 'young_dragon',
    themeColor: '#4a3a1f',
  },
];

export function getCampaignById(id: string): CampaignDefinition | undefined {
  return CAMPAIGNS.find((c) => c.id === id);
}

export function getNextCampaign(currentId: string): CampaignDefinition | undefined {
  const current = getCampaignById(currentId);
  if (!current) return CAMPAIGNS[0];
  return CAMPAIGNS.find((c) => c.order === current.order + 1);
}
