import { describe, expect, it } from 'vitest';
import { firstEmptySlot, nextSceneAfterLogin } from '../../src/game/ui/flow-rules';
import type { StoredCharacterV1 } from '../../src/game/profile/types';

const BASE_CHARACTER: StoredCharacterV1 = {
  version: 1,
  nickname: '기본캐',
  job: 'novice',
  level: 9,
  hp: 180,
  maxHp: 180,
  mp: 90,
  maxMp: 90,
  exp: 0,
  stats: {
    str: 4,
    dex: 4,
    int: 4,
    luk: 13
  },
  ap: 0,
  sp: 0,
  autoDistribute: false,
  skills: {},
  mesos: 0,
  mapId: 'cuning-city'
};

describe('flow rules', () => {
  it('returns the first empty slot for an empty roster', () => {
    expect(firstEmptySlot([null, null, null])).toBe(1);
  });

  it('returns the first gap for mixed slots', () => {
    expect(firstEmptySlot([createCharacter('하나'), null, createCharacter('셋')])).toBe(2);
  });

  it('skips filled leading slots and finds the last empty slot', () => {
    expect(firstEmptySlot([createCharacter('하나'), createCharacter('둘'), null])).toBe(3);
  });

  it('returns null when all three slots are full', () => {
    expect(firstEmptySlot([createCharacter('하나'), createCharacter('둘'), createCharacter('셋')])).toBeNull();
  });

  it('routes login to select only when a saved profile exists', () => {
    expect(nextSceneAfterLogin(false)).toBe('CharacterCreate');
    expect(nextSceneAfterLogin(true)).toBe('CharacterSelect');
  });
});

function createCharacter(nickname: string): StoredCharacterV1 {
  return {
    ...BASE_CHARACTER,
    nickname
  };
}
