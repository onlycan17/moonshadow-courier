import { describe, expect, it } from 'vitest';
import { InMemoryKeyValueStore } from '../../src/game/profile/key-value-store';
import { parseStoredCharacter } from '../../src/game/profile/parse-profile';
import { ProfileRepository } from '../../src/game/profile/profile-repository';
import { PROFILE_ACTIVE_SLOT_KEY, PROFILE_SLOT_1_KEY, PROFILE_SLOT_2_KEY, PROFILE_SLOT_3_KEY } from '../../src/game/profile/slot-keys';
import type { StoredCharacterV1 } from '../../src/game/profile/types';

const BASE_CHARACTER: StoredCharacterV1 = {
  version: 1,
  nickname: 'Shadow',
  job: 'novice',
  level: 9,
  hp: 180,
  maxHp: 180,
  mp: 90,
  maxMp: 90,
  exp: 0,
  stats: {
    str: 4,
    dex: 13,
    int: 4,
    luk: 4
  },
  ap: 0,
  sp: 0,
  autoDistribute: false,
  skills: {
    basicThrow: 1
  },
  mesos: 0,
  mapId: 'kerning-city'
};

describe('profile storage', () => {
  it('round-trips save and load independently for each slot', () => {
    const store = new InMemoryKeyValueStore();
    const repository = new ProfileRepository(store);
    const slot1 = createCharacter({ nickname: 'One', level: 9 });
    const slot2 = createCharacter({ nickname: 'Two', level: 30, job: 'hokage', hp: 450, maxHp: 450 });
    const slot3 = createCharacter({ nickname: 'Three', mesos: 777 });

    expect(repository.saveNewCharacter(1, slot1)).toEqual({ ok: true });
    expect(repository.saveNewCharacter(2, slot2)).toEqual({ ok: true });
    expect(repository.saveNewCharacter(3, slot3)).toEqual({ ok: true });
    expect(repository.loadSlot(1)).toEqual(slot1);
    expect(repository.loadSlot(2)).toEqual(slot2);
    expect(repository.loadSlot(3)).toEqual(slot3);
    expect(repository.listSlots()).toEqual([slot1, slot2, slot3]);
  });

  it('isolates corrupt slot-2 data and preserves other slots and active slot bytes', () => {
    const store = new InMemoryKeyValueStore();
    const repository = new ProfileRepository(store);
    const slot1 = createCharacter({ nickname: 'Alpha' });
    const slot3 = createCharacter({ nickname: 'Gamma', mesos: 10 });

    store.setItem(PROFILE_SLOT_1_KEY, JSON.stringify(slot1));
    store.setItem(PROFILE_SLOT_2_KEY, '{bad-json');
    store.setItem(PROFILE_SLOT_3_KEY, JSON.stringify(slot3));
    store.setItem(PROFILE_ACTIVE_SLOT_KEY, '3');

    const slot1Before = store.getItem(PROFILE_SLOT_1_KEY);
    const slot3Before = store.getItem(PROFILE_SLOT_3_KEY);
    const activeBefore = store.getItem(PROFILE_ACTIVE_SLOT_KEY);

    expect(repository.loadSlot(1)).toEqual(slot1);
    expect(repository.loadSlot(2)).toBeNull();
    expect(repository.loadSlot(3)).toEqual(slot3);
    expect(repository.getActiveSlot()).toBe(3);
    expect(store.getItem(PROFILE_SLOT_1_KEY)).toBe(slot1Before);
    expect(store.getItem(PROFILE_SLOT_3_KEY)).toBe(slot3Before);
    expect(store.getItem(PROFILE_ACTIVE_SLOT_KEY)).toBe(activeBefore);
  });

  it('returns null for all missing keys', () => {
    const repository = new ProfileRepository(new InMemoryKeyValueStore());

    expect(repository.loadSlot(1)).toBeNull();
    expect(repository.loadSlot(2)).toBeNull();
    expect(repository.loadSlot(3)).toBeNull();
    expect(repository.listSlots()).toEqual([null, null, null]);
    expect(repository.getActiveSlot()).toBeNull();
    expect(repository.hasAnyProfile()).toBe(false);
  });

  it('rejects saveNewCharacter for occupied slots without changing stored bytes', () => {
    const store = new InMemoryKeyValueStore();
    const repository = new ProfileRepository(store);
    const original = createCharacter({ nickname: 'Original' });
    const replacement = createCharacter({ nickname: 'Replacement', mesos: 999 });

    expect(repository.saveNewCharacter(1, original)).toEqual({ ok: true });
    const before = store.getItem(PROFILE_SLOT_1_KEY);

    expect(repository.saveNewCharacter(1, replacement)).toEqual({ ok: false, reason: 'occupied' });
    expect(store.getItem(PROFILE_SLOT_1_KEY)).toBe(before);
    expect(repository.loadSlot(1)).toEqual(original);
  });

  it('rejects invalid characters when saving a new slot', () => {
    const repository = new ProfileRepository(new InMemoryKeyValueStore());
    const invalidCharacter = createCharacter({ level: 201 });

    expect(repository.saveNewCharacter(1, invalidCharacter)).toEqual({ ok: false, reason: 'invalid' });
    expect(repository.loadSlot(1)).toBeNull();
  });

  it('rejects cross-field and enum violations in the parser', () => {
    expect(parseStoredCharacter(rawCharacter({ hp: 181 }))).toBeNull();
    expect(parseStoredCharacter(rawCharacter({ level: 0 }))).toBeNull();
    expect(parseStoredCharacter(rawCharacter({ level: 201 }))).toBeNull();
    expect(parseStoredCharacter(rawCharacter({ skills: { basicThrow: 21 } }))).toBeNull();
    expect(parseStoredCharacter(rawCharacter({ mesos: -1 }))).toBeNull();
    expect(parseStoredCharacter(rawCharacter({ job: 'wizard' }))).toBeNull();
  });

  it('rejects garbage active-slot values', () => {
    const store = new InMemoryKeyValueStore();
    const repository = new ProfileRepository(store);

    store.setItem(PROFILE_ACTIVE_SLOT_KEY, 'banana');
    expect(repository.getActiveSlot()).toBeNull();

    repository.setActiveSlot(2);
    expect(repository.getActiveSlot()).toBe(2);

    repository.clearActiveSlot();
    expect(repository.getActiveSlot()).toBeNull();
  });

  it('tracks whether any valid profile exists', () => {
    const store = new InMemoryKeyValueStore();
    const repository = new ProfileRepository(store);

    expect(repository.hasAnyProfile()).toBe(false);
    expect(repository.saveNewCharacter(2, createCharacter({ nickname: 'Live' }))).toEqual({ ok: true });
    expect(repository.hasAnyProfile()).toBe(true);

    store.removeItem(PROFILE_SLOT_2_KEY);
    expect(repository.hasAnyProfile()).toBe(false);
  });

  it('validates updateCharacter before overwriting a slot', () => {
    const store = new InMemoryKeyValueStore();
    const repository = new ProfileRepository(store);
    const original = createCharacter({ nickname: 'Stable' });

    expect(repository.saveNewCharacter(3, original)).toEqual({ ok: true });
    const before = store.getItem(PROFILE_SLOT_3_KEY);
    const invalid = createCharacter({ hp: 9999 });

    expect(repository.updateCharacter(3, invalid)).toEqual({ ok: false, reason: 'invalid' });
    expect(store.getItem(PROFILE_SLOT_3_KEY)).toBe(before);
    expect(repository.updateCharacter(3, createCharacter({ nickname: 'Updated', mesos: 12 }))).toEqual({ ok: true });
    expect(repository.loadSlot(3)).toEqual(createCharacter({ nickname: 'Updated', mesos: 12 }));
  });
});

function createCharacter(overrides: Partial<StoredCharacterV1>): StoredCharacterV1 {
  return {
    ...BASE_CHARACTER,
    ...overrides,
    stats: {
      ...BASE_CHARACTER.stats,
      ...overrides.stats
    },
    skills: {
      ...BASE_CHARACTER.skills,
      ...overrides.skills
    }
  };
}

function rawCharacter(overrides: Record<string, unknown>): string {
  return JSON.stringify({
    ...BASE_CHARACTER,
    ...overrides
  });
}
