import { describe, expect, it } from 'vitest';
import { InMemoryKeyValueStore } from '../../src/game/profile/key-value-store';
import { ProfileRepository } from '../../src/game/profile/profile-repository';
import { PROFILE_SLOT_1_KEY, PROFILE_SLOT_2_KEY, PROFILE_SLOT_3_KEY } from '../../src/game/profile/slot-keys';
import type { StoredCharacterV1 } from '../../src/game/profile/types';

const BASE_CHARACTER: StoredCharacterV1 = {
  version: 1,
  nickname: '테스트',
  job: 'novice',
  level: 9,
  hp: 180,
  maxHp: 180,
  mp: 90,
  maxMp: 90,
  exp: 0,
  stats: { str: 4, dex: 4, int: 4, luk: 13 },
  ap: 0,
  sp: 0,
  autoDistribute: false,
  skills: {},
  mesos: 0,
  mapId: 'cuning-city'
};

describe('scene slot state assumptions', () => {
  it('distinguishes raw-empty and raw-present-invalid slots at repository level', () => {
    const store = new InMemoryKeyValueStore();
    const repository = new ProfileRepository(store);

    store.setItem(PROFILE_SLOT_1_KEY, JSON.stringify(BASE_CHARACTER));
    store.setItem(PROFILE_SLOT_2_KEY, '{bad-json');

    expect(store.getItem(PROFILE_SLOT_3_KEY)).toBeNull();
    expect(repository.loadSlot(1)?.nickname).toBe('테스트');
    expect(repository.loadSlot(2)).toBeNull();
    expect(repository.loadSlot(3)).toBeNull();
  });
});
