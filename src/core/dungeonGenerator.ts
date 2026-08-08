import { Rng } from './rng';
import type {
  CampaignDefinition,
  ChestSpawn,
  DecorationKind,
  DecorationSpawn,
  DungeonLevel,
  DungeonTile,
  MonsterSpawn,
  TreasureSpawn,
  Vec2,
} from './types';
import { ITEM_LIST } from '../data/items';
import { SPELL_LIST } from '../data/spells';

const WEAPON_IDS = ITEM_LIST.filter((i) => i.slot === 'weapon').map((i) => i.id);
const SHIELD_IDS = ITEM_LIST.filter((i) => i.slot === 'offhand').map((i) => i.id);
const DECORATION_KINDS: DecorationKind[] = ['skeleton', 'well', 'rubble', 'web', 'bones'];

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

function emptyTile(): DungeonTile {
  return { type: 'wall', wallsN: true, wallsE: true, wallsS: true, wallsW: true, discovered: false };
}

function roomsOverlap(a: Room, b: Room, margin = 1): boolean {
  return (
    a.x - margin < b.x + b.w &&
    a.x + a.w + margin > b.x &&
    a.y - margin < b.y + b.h &&
    a.y + a.h + margin > b.y
  );
}

function carveRoom(tiles: DungeonTile[][], room: Room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      tiles[y][x].type = 'floor';
    }
  }
}

interface CorridorPoint {
  pos: Vec2;
  isEndpoint: boolean;
}

function carveCorridor(tiles: DungeonTile[][], from: Vec2, to: Vec2, rng: Rng): CorridorPoint[] {
  let x = from.x;
  let y = from.y;
  const horizontalFirst = rng.chance(0.5);
  const path: CorridorPoint[] = [];

  const carve = () => {
    const wasWall = tiles[y][x].type === 'wall';
    if (wasWall) tiles[y][x].type = 'floor';
    path.push({ pos: { x, y }, isEndpoint: false });
  };

  const stepX = () => {
    while (x !== to.x) {
      carve();
      x += x < to.x ? 1 : -1;
    }
  };
  const stepY = () => {
    while (y !== to.y) {
      carve();
      y += y < to.y ? 1 : -1;
    }
  };

  if (horizontalFirst) {
    stepX();
    stepY();
  } else {
    stepY();
    stepX();
  }
  carve();
  return path;
}

function computeWalls(tiles: DungeonTile[][], width: number, height: number) {
  const isFloorLike = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return tiles[y][x].type !== 'wall';
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x];
      if (tile.type === 'wall') continue;
      tile.wallsN = !isFloorLike(x, y - 1);
      tile.wallsS = !isFloorLike(x, y + 1);
      tile.wallsW = !isFloorLike(x - 1, y);
      tile.wallsE = !isFloorLike(x + 1, y);
    }
  }
}

function roomCenter(room: Room): Vec2 {
  return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
}

function inAnyRoom(pos: Vec2, rooms: Room[]): boolean {
  return rooms.some((r) => pos.x >= r.x && pos.x < r.x + r.w && pos.y >= r.y && pos.y < r.y + r.h);
}

export interface GenerateLevelOptions {
  campaign: CampaignDefinition;
  levelIndexInCampaign: number; // 0-basiert
  seed: string;
  width?: number;
  height?: number;
}

export function generateDungeonLevel(opts: GenerateLevelOptions): DungeonLevel {
  const width = opts.width ?? 24;
  const height = opts.height ?? 24;
  const rng = Rng.fromString(opts.seed);

  const tiles: DungeonTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => emptyTile())
  );

  const rooms: Room[] = [];
  const targetRooms = rng.int(7, 11);
  let attempts = 0;

  while (rooms.length < targetRooms && attempts < 300) {
    attempts++;
    const w = rng.int(3, 6);
    const h = rng.int(3, 6);
    const x = rng.int(1, width - w - 2);
    const y = rng.int(1, height - h - 2);
    const candidate: Room = { x, y, w, h };
    if (rooms.some((r) => roomsOverlap(candidate, r))) continue;
    rooms.push(candidate);
    carveRoom(tiles, candidate);
  }

  // Räume verbinden (jeden Raum mit dem nächsten in Erzeugungsreihenfolge, plus ein paar Extra-Kanten für Schleifen)
  const corridorMidpoints: Vec2[] = [];
  for (let i = 1; i < rooms.length; i++) {
    const path = carveCorridor(tiles, roomCenter(rooms[i - 1]), roomCenter(rooms[i]), rng);
    const candidates = path.filter((p) => !inAnyRoom(p.pos, rooms));
    if (candidates.length > 0) corridorMidpoints.push(candidates[Math.floor(candidates.length / 2)].pos);
  }
  const extraLoops = rng.int(1, 3);
  for (let i = 0; i < extraLoops && rooms.length > 3; i++) {
    const a = rng.pick(rooms);
    const b = rng.pick(rooms);
    if (a !== b) carveCorridor(tiles, roomCenter(a), roomCenter(b), rng);
  }

  computeWalls(tiles, width, height);

  const startRoom = rooms[0];
  const stairsRoom = rooms[rooms.length - 1];
  const startPosition = roomCenter(startRoom);
  const stairsDownPosition = roomCenter(stairsRoom);
  tiles[stairsDownPosition.y][stairsDownPosition.x].type = 'stairsDown';

  // Türen an Korridor-Engstellen platzieren; ein Teil davon verschlossen mit Schlüssel dahinter
  const keyId = 'rusty_key';
  const doorCandidates = corridorMidpoints.filter(
    (p) => !(p.x === startPosition.x && p.y === startPosition.y) && !(p.x === stairsDownPosition.x && p.y === stairsDownPosition.y)
  );
  const shuffledDoors = rng.shuffle(doorCandidates);
  const doorCount = Math.min(shuffledDoors.length, rng.int(2, 4));
  let lockedDoorPlaced = false;
  for (let i = 0; i < doorCount; i++) {
    const p = shuffledDoors[i];
    const tile = tiles[p.y][p.x];
    if (tile.type !== 'floor') continue;
    tile.type = 'door';
    const makeLocked = !lockedDoorPlaced && rng.chance(0.7);
    if (makeLocked) {
      tile.doorLocked = true;
      tile.doorKeyId = keyId;
      lockedDoorPlaced = true;
    }
  }

  const occupied = new Set<string>();
  const keyOf = (p: Vec2) => `${p.x},${p.y}`;
  occupied.add(keyOf(startPosition));
  occupied.add(keyOf(stairsDownPosition));

  const spawnableRooms = rooms.slice(1);
  function randomFreeSpotIn(room: Room): Vec2 | null {
    for (let attempt = 0; attempt < 12; attempt++) {
      const pos = { x: rng.int(room.x, room.x + room.w - 1), y: rng.int(room.y, room.y + room.h - 1) };
      if (!occupied.has(keyOf(pos))) return pos;
    }
    return null;
  }

  const isLastLevel = opts.levelIndexInCampaign === opts.campaign.levelCount - 1;

  // Monster verteilen (nicht im Startraum) — teils als Gruppen für spannendere Kämpfe
  const monsterSpawns: MonsterSpawn[] = [];

  // Endgegner auf der letzten Ebene der Kampagne, bewacht die Treppe
  if (isLastLevel) {
    const bossRoom = stairsRoom;
    const bossPos = randomFreeSpotIn(bossRoom) ?? roomCenter(bossRoom);
    occupied.add(keyOf(bossPos));
    monsterSpawns.push({ position: bossPos, monsterIds: [opts.campaign.bossMonsterId], triggered: false, isBoss: true });
  }

  const spawnPointCount = rng.int(6, 10) + Math.floor(opts.levelIndexInCampaign * 1.5);
  for (let i = 0; i < spawnPointCount; i++) {
    const room = rng.pick(spawnableRooms);
    const pos = randomFreeSpotIn(room);
    if (!pos) continue;
    occupied.add(keyOf(pos));
    const groupSize = rng.chance(0.4) ? rng.int(2, 3) : 1;
    const monsterIds = Array.from({ length: groupSize }, () => rng.pick(opts.campaign.monsterPoolIds));
    monsterSpawns.push({ position: pos, monsterIds, triggered: false });
  }

  // Schätze verteilen: Gold, Tränke, mit einer Chance auf Waffen oder Schilde
  const treasureSpawns: TreasureSpawn[] = [];
  const treasureCount = rng.int(4, 7);
  for (let i = 0; i < treasureCount; i++) {
    const room = rng.pick(spawnableRooms);
    const pos = randomFreeSpotIn(room);
    if (!pos) continue;
    occupied.add(keyOf(pos));
    const roll = rng.next();
    let items: { itemId: string; quantity: number }[] = [];
    if (roll < 0.18) items = [{ itemId: rng.pick(WEAPON_IDS), quantity: 1 }];
    else if (roll < 0.3) items = [{ itemId: rng.pick(SHIELD_IDS), quantity: 1 }];
    else if (roll < 0.55) items = [{ itemId: rng.pick(ITEM_LIST).id, quantity: 1 }];
    treasureSpawns.push({ position: pos, items, gold: rng.dice(2, 10), looted: false });
  }
  if (lockedDoorPlaced) {
    const room = rng.pick(spawnableRooms);
    const pos = randomFreeSpotIn(room) ?? roomCenter(room);
    occupied.add(keyOf(pos));
    treasureSpawns.push({ position: pos, items: [{ itemId: 'rusty_key', quantity: 1 }], gold: 0, looted: false });
  }

  // Schatztruhen: Waffe, Schild, Zauberschriftrolle — oder ein Hinterhalt
  const chestSpawns: ChestSpawn[] = [];
  const chestCount = rng.int(1, 3);
  for (let i = 0; i < chestCount; i++) {
    const room = rng.pick(spawnableRooms);
    const pos = randomFreeSpotIn(room);
    if (!pos) continue;
    occupied.add(keyOf(pos));
    const roll = rng.next();
    if (roll < 0.22) {
      chestSpawns.push({ position: pos, lootKind: 'weapon', itemId: rng.pick(WEAPON_IDS), gold: rng.dice(1, 6), opened: false });
    } else if (roll < 0.44) {
      chestSpawns.push({ position: pos, lootKind: 'shield', itemId: rng.pick(SHIELD_IDS), gold: rng.dice(1, 6), opened: false });
    } else if (roll < 0.66) {
      chestSpawns.push({ position: pos, lootKind: 'spell', spellId: rng.pick(SPELL_LIST).id, gold: rng.dice(1, 4), opened: false });
    } else {
      chestSpawns.push({
        position: pos,
        lootKind: 'monster',
        monsterId: rng.pick(opts.campaign.monsterPoolIds),
        gold: rng.dice(3, 10),
        opened: false,
      });
    }
  }

  // Dekorationen: rein optische Belebung des Bodens (Skelette, Brunnen, Trümmer, Spinnweben)
  const decorations: DecorationSpawn[] = [];
  const decorationCount = rng.int(10, 18);
  for (let i = 0; i < decorationCount; i++) {
    const room = rng.pick(rooms);
    const pos = { x: rng.int(room.x, room.x + room.w - 1), y: rng.int(room.y, room.y + room.h - 1) };
    if (occupied.has(keyOf(pos))) continue;
    decorations.push({ position: pos, kind: rng.pick(DECORATION_KINDS) });
  }

  // Fallen in zufälligen Bodenfeldern (nicht Start/Treppe)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x];
      if (tile.type !== 'floor') continue;
      if ((x === startPosition.x && y === startPosition.y) || (x === stairsDownPosition.x && y === stairsDownPosition.y)) continue;
      if (rng.chance(0.03)) {
        tile.trap = { id: `trap_${x}_${y}`, name: 'Pfeilfalle', damageDice: { count: 1, sides: 6 }, triggered: false };
      }
    }
  }

  return {
    seed: opts.seed,
    width,
    height,
    tiles,
    startPosition,
    stairsDownPosition,
    monsterSpawns,
    treasureSpawns,
    decorations,
    chestSpawns,
    themeColor: opts.campaign.themeColor,
  };
}
