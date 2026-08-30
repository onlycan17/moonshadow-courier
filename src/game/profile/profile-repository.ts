import { runMigrations } from './migrations';
import { parseStoredCharacter } from './parse-profile';
import { PROFILE_ACTIVE_SLOT_KEY, PROFILE_SLOT_KEYS } from './slot-keys';
import type { KeyValueStore, SlotNumber, StoredCharacterV1 } from './types';

const SLOT_NUMBERS: readonly SlotNumber[] = [1, 2, 3];

export class ProfileRepository {
  public constructor(private readonly store: KeyValueStore) {}

  public loadSlot(slot: SlotNumber): StoredCharacterV1 | null {
    const raw = this.store.getItem(getSlotKey(slot));
    if (raw === null) {
      return null;
    }
    return loadStoredCharacter(raw);
  }

  public saveNewCharacter(slot: SlotNumber, character: StoredCharacterV1): { ok: true } | { ok: false; reason: 'occupied' | 'invalid' } {
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

  public updateCharacter(slot: SlotNumber, character: StoredCharacterV1): { ok: true } | { ok: false; reason: 'invalid' } {
    const serialized = serializeCharacter(character);
    if (serialized === null) {
      return { ok: false, reason: 'invalid' };
    }

    this.store.setItem(getSlotKey(slot), serialized);
    return { ok: true };
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
    return SLOT_NUMBERS.some((slot) => this.loadSlot(slot) !== null);
  }
}

function getSlotKey(slot: SlotNumber): string {
  return PROFILE_SLOT_KEYS[slot];
}

function loadStoredCharacter(raw: string): StoredCharacterV1 | null {
  const parsed = parseStoredCharacter(raw);
  if (parsed !== null) {
    return parsed;
  }

  const unknownValue = parseUnknownJson(raw);
  return unknownValue === null ? null : runMigrations(unknownValue);
}

function serializeCharacter(character: StoredCharacterV1): string | null {
  const serialized = JSON.stringify(character);
  return parseStoredCharacter(serialized) === null ? null : serialized;
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
