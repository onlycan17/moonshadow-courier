import { runMigrations } from './migrations';
import { parseStoredCharacter } from './parse-profile';
import { PROFILE_ACTIVE_SLOT_KEY, PROFILE_SLOT_KEYS } from './slot-keys';
import type { KeyValueStore, MapPosition, SlotNumber, StoredCharacterV1, StoredCharacterV2 } from './types';

const SLOT_NUMBERS: readonly SlotNumber[] = [1, 2, 3];
const MIN_POSITION = 0;
const MAX_POSITION = 99999;

export class ProfileRepository {
  public constructor(private readonly store: KeyValueStore) {}

  public loadSlot(slot: SlotNumber): StoredCharacterV1 | null {
    const character = this.loadCurrentCharacter(slot);
    return character === null ? null : toLegacyCharacter(character);
  }

  public loadCharacterV2(slot: SlotNumber): StoredCharacterV2 | null {
    return this.loadCurrentCharacter(slot);
  }

  public saveNewCharacter(slot: SlotNumber, character: StoredCharacterV1 | StoredCharacterV2): { ok: true } | { ok: false; reason: 'occupied' | 'invalid' } {
    const slotKey = getSlotKey(slot);
    if (this.store.getItem(slotKey) !== null) {
      return { ok: false, reason: 'occupied' };
    }

    const serialized = serializeCharacter(character);
    if (serialized === null) {
      return { ok: false, reason: 'invalid' };
    }

    this.store.setItem(slotKey, serialized);
    return { ok: true };
  }

  public updateCharacter(slot: SlotNumber, character: StoredCharacterV1 | StoredCharacterV2): { ok: true } | { ok: false; reason: 'invalid' } {
    const serialized = serializeCharacter(character);
    if (serialized === null) {
      return { ok: false, reason: 'invalid' };
    }

    this.store.setItem(getSlotKey(slot), serialized);
    return { ok: true };
  }

  public savePosition(slot: SlotNumber, mapId: string, x: number, y: number): { ok: true } | { ok: false; reason: 'missing' | 'invalid' } {
    if (!isValidMapId(mapId) || !isValidPositionValue(x) || !isValidPositionValue(y)) {
      return { ok: false, reason: 'invalid' };
    }

    const currentCharacter = this.loadCurrentCharacter(slot);
    if (currentCharacter === null) {
      return { ok: false, reason: 'missing' };
    }

    return this.updateCharacter(slot, {
      ...currentCharacter,
      positions: {
        ...currentCharacter.positions,
        [mapId]: { x, y }
      }
    });
  }

  public listSlots(): [StoredCharacterV1 | null, StoredCharacterV1 | null, StoredCharacterV1 | null] {
    return [this.loadSlot(1), this.loadSlot(2), this.loadSlot(3)];
  }

  public getActiveSlot(): SlotNumber | null {
    return parseSlotNumber(this.store.getItem(PROFILE_ACTIVE_SLOT_KEY));
  }

  public setActiveSlot(slot: SlotNumber): void {
    this.store.setItem(PROFILE_ACTIVE_SLOT_KEY, String(slot));
  }

  public clearActiveSlot(): void {
    this.store.removeItem(PROFILE_ACTIVE_SLOT_KEY);
  }

  public hasAnyProfile(): boolean {
    return SLOT_NUMBERS.some((slot) => this.loadCurrentCharacter(slot) !== null);
  }

  private loadCurrentCharacter(slot: SlotNumber): StoredCharacterV2 | null {
    const raw = this.store.getItem(getSlotKey(slot));
    if (raw === null) {
      return null;
    }
    return loadStoredCharacter(raw);
  }
}

export function getPosition(character: StoredCharacterV2, mapId: string): MapPosition | null {
  if (!isValidMapId(mapId)) {
    return null;
  }

  return character.positions[mapId] ?? null;
}

function getSlotKey(slot: SlotNumber): string {
  return PROFILE_SLOT_KEYS[slot];
}

function loadStoredCharacter(raw: string): StoredCharacterV2 | null {
  const parsed = parseStoredCharacter(raw);
  if (parsed !== null) {
    return parsed;
  }

  const unknownValue = parseUnknownJson(raw);
  return unknownValue === null ? null : runMigrations(unknownValue);
}

function serializeCharacter(character: StoredCharacterV1 | StoredCharacterV2): string | null {
  const upgraded = upgradeCharacter(character);
  return upgraded === null ? null : JSON.stringify(upgraded);
}

function upgradeCharacter(character: StoredCharacterV1 | StoredCharacterV2): StoredCharacterV2 | null {
  const serialized = JSON.stringify(character);
  const unknownValue = parseUnknownJson(serialized);
  return unknownValue === null ? null : runMigrations(unknownValue);
}

function parseUnknownJson(raw: string): unknown | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

function parseSlotNumber(raw: string | null): SlotNumber | null {
  if (raw === '1') {
    return 1;
  }
  if (raw === '2') {
    return 2;
  }
  if (raw === '3') {
    return 3;
  }
  return null;
}

function toLegacyCharacter(character: StoredCharacterV2): StoredCharacterV1 {
  return {
    version: 1,
    nickname: character.nickname,
    job: character.job,
    level: character.level,
    hp: character.hp,
    maxHp: character.maxHp,
    mp: character.mp,
    maxMp: character.maxMp,
    exp: character.exp,
    stats: { ...character.stats },
    ap: character.ap,
    sp: character.sp,
    autoDistribute: character.autoDistribute,
    skills: { ...character.skills },
    mesos: character.mesos,
    mapId: character.mapId
  };
}

function isValidMapId(value: string): boolean {
  return value.length > 0;
}

function isValidPositionValue(value: number): boolean {
  return Number.isSafeInteger(value) && value >= MIN_POSITION && value <= MAX_POSITION;
}
