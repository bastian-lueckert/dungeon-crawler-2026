import type { SaveGame } from './types';

const SAVE_KEY_PREFIX = 'dc2026_save_';
const SAVE_VERSION = 1;

export function listSaveSlots(): number[] {
  const slots: number[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SAVE_KEY_PREFIX)) {
      const slot = Number(key.slice(SAVE_KEY_PREFIX.length));
      if (!Number.isNaN(slot)) slots.push(slot);
    }
  }
  return slots.sort((a, b) => a - b);
}

export function saveGame(slot: number, save: Omit<SaveGame, 'version' | 'savedAt'>): void {
  const full: SaveGame = { ...save, version: SAVE_VERSION, savedAt: Date.now() };
  localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, JSON.stringify(full));
}

export function loadGame(slot: number): SaveGame | null {
  const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SaveGame;
  } catch {
    return null;
  }
}

export function deleteSave(slot: number): void {
  localStorage.removeItem(`${SAVE_KEY_PREFIX}${slot}`);
}

export function saveMeta(slot: number): { savedAt: number; partyNames: string[]; campaignId: string } | null {
  const save = loadGame(slot);
  if (!save) return null;
  return {
    savedAt: save.savedAt,
    partyNames: save.party.members.map((m) => m.name),
    campaignId: save.party.campaignId,
  };
}
