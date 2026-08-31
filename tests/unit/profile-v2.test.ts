import { describe, expect, it } from 'vitest';
import { InMemoryKeyValueStore } from '../../src/game/profile/key-value-store';
import { DEFAULT_SPAWN_FALLBACK } from '../../src/game/profile/migrations';
import { parseStoredCharacter } from '../../src/game/profile/parse-profile';
import { getPosition, ProfileRepository } from '../../src/game/profile/profile-repository';
import { PROFILE_ACTIVE_SLOT_KEY, PROFILE_SLOT_1_KEY, PROFILE_SLOT_2_KEY } from '../../src/game/profile/slot-keys';
import type { StoredCharacterV1, StoredCharacterV2 } from '../../src/game/profile/types';

const BASE_V1_CHARACTER: StoredCharacterV1 = {
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

describe('profile schema v2', () => {
  it('migrates a v1 fixture while preserving legacy fields and seeding current map position', () => {
    const parsed = parseStoredCharacter(JSON.stringify(createV1Character({ nickname: 'Legacy', mesos: 321, sp: 5 })));

    expect(parsed).toEqual({
      ...createV1Character({ nickname: 'Legacy', mesos: 321, sp: 5 }),
      version: 2,
      positions: {
        'kerning-city': DEFAULT_SPAWN_FALLBACK
      }
    });
  });

  it('drops only corrupt individual position entries and keeps the character', () => {
    const parsed = parseStoredCharacter(JSON.stringify(createV2Character({
      positions: {
        'kerning-city': { x: 120, y: 640 },
        'shadow-field': { x: Number.NaN, y: 10 },
        'forest-edge': { x: 10.5, y: 20 },
        '': { x: 1, y: 1 },
        'town-backstreet': { x: 30, y: 99999 }
      }
    })));

    expect(parsed).toEqual(createV2Character({
      positions: {
        'kerning-city': { x: 120, y: 640 },
        'town-backstreet': { x: 30, y: 99999 }
      }
    }));
  });

  it('normalizes non-object positions to an empty object', () => {
    const parsed = parseStoredCharacter(JSON.stringify({
      ...createV2Character(),
      positions: 123
    }));

    expect(parsed).toEqual(createV2Character({ positions: {} }));
  });

  it('savePosition round-trips as v2 storage and keeps slot isolation and active-slot bytes', () => {
    const store = new InMemoryKeyValueStore();
    const repository = new ProfileRepository(store);

    expect(repository.saveNewCharacter(1, createV1Character({ nickname: 'SlotOne' }))).toEqual({ ok: true });
    expect(repository.saveNewCharacter(2, createV1Character({ nickname: 'SlotTwo', mesos: 55 }))).toEqual({ ok: true });
    repository.setActiveSlot(2);

    const slot2Before = store.getItem(PROFILE_SLOT_2_KEY);
    const activeBefore = store.getItem(PROFILE_ACTIVE_SLOT_KEY);

    expect(repository.savePosition(1, 'shadow-field', 321, 654)).toEqual({ ok: true });

    const slot1Stored = parseStoredCharacter(store.getItem(PROFILE_SLOT_1_KEY) ?? '');
    const slot2Stored = parseStoredCharacter(store.getItem(PROFILE_SLOT_2_KEY) ?? '');

    expect(slot1Stored).toEqual(createV2Character({
      nickname: 'SlotOne',
      positions: {
        'kerning-city': DEFAULT_SPAWN_FALLBACK,
        'shadow-field': { x: 321, y: 654 }
      }
    }));
    expect(slot2Stored).toEqual(createV2Character({
      nickname: 'SlotTwo',
      mesos: 55,
      positions: {
        'kerning-city': DEFAULT_SPAWN_FALLBACK
      }
    }));
    expect(store.getItem(PROFILE_SLOT_2_KEY)).toBe(slot2Before);
    expect(store.getItem(PROFILE_ACTIVE_SLOT_KEY)).toBe(activeBefore);
  });

  it('exposes current-version characters while keeping loadSlot on the legacy shape', () => {
    const store = new InMemoryKeyValueStore();
    const repository = new ProfileRepository(store);

    expect(repository.saveNewCharacter(1, createV2Character({
      nickname: 'Runtime',
      positions: {
        'cuning-city': { x: 144, y: 612 },
        'green-mushroom-cave': { x: 888, y: 444 }
      }
    }))).toEqual({ ok: true });

    expect(repository.loadCharacterV2(1)).toEqual(createV2Character({
      nickname: 'Runtime',
      positions: {
        'cuning-city': { x: 144, y: 612 },
        'green-mushroom-cave': { x: 888, y: 444 }
      }
    }));
    expect(repository.loadSlot(1)).toEqual(createV1Character({
      nickname: 'Runtime'
    }));
  });

  it('returns null from getPosition for unknown maps', () => {
    const character = createV2Character({
      positions: {
        'kerning-city': { x: 100, y: 600 }
      }
    });

    expect(getPosition(character, 'missing-map')).toBeNull();
  });

  it('repository still rejects invalid characters and invalid savePosition inputs', () => {
    const repository = new ProfileRepository(new InMemoryKeyValueStore());

    expect(repository.saveNewCharacter(1, createV1Character({ level: 201 }))).toEqual({ ok: false, reason: 'invalid' });
    expect(repository.updateCharacter(1, createV2Character({ mapId: '' }))).toEqual({ ok: false, reason: 'invalid' });
    expect(repository.savePosition(1, 'kerning-city', -1, 10)).toEqual({ ok: false, reason: 'invalid' });
    expect(repository.savePosition(3, 'kerning-city', 1, 2)).toEqual({ ok: false, reason: 'missing' });
  });
});

function createV1Character(overrides: Partial<StoredCharacterV1> = {}): StoredCharacterV1 {
  return {
    ...BASE_V1_CHARACTER,
    ...overrides,
    stats: {
      ...BASE_V1_CHARACTER.stats,
      ...overrides.stats
    },
    skills: {
      ...BASE_V1_CHARACTER.skills,
      ...overrides.skills
    }
  };
}

function createV2Character(overrides: Partial<StoredCharacterV2> = {}): StoredCharacterV2 {
  const { positions, version: _version, ...legacyOverrides } = overrides;

  return {
    ...createV1Character(legacyOverrides),
    version: 2,
    positions: {
      ...(positions ?? {})
    }
  };
}
