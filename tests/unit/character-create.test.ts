import { describe, expect, it } from 'vitest';
import { ALL_SKILL_LEVEL_ZERO, SKILL_IDS, SKILL_LABELS_KO } from '../../src/game/data/skill-catalog';
import { buildBoostCharacter, buildNoviceCharacter, distributeAutoAp, validateForSave } from '../../src/game/profile/create-character';
import { rollStats, validateStatSet } from '../../src/game/profile/dice-stats';
import { normalizeNickname, validateNickname } from '../../src/game/profile/nickname';
import type { CharacterStats } from '../../src/game/profile/types';

function mulberry32(seed: number): () => number {
  let state = seed;

  return () => {
    let next = (state += 0x6d2b79f5);
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function createSkillLevels(level: number): Record<string, number> {
  return Object.fromEntries(SKILL_IDS.map((skillId) => [skillId, level]));
}

describe('nickname rules', () => {
  it('normalizes decomposed hangul into NFC', () => {
    expect(normalizeNickname('가')).toBe('가');
  });

  it('trims outer whitespace before validation callers reuse the result', () => {
    const normalizedNickname = normalizeNickname('  나루토  ');

    expect(normalizedNickname).toBe('나루토');
    expect(validateNickname(normalizedNickname)).toEqual({ ok: true });
  });

  it('counts Unicode code points for 1, 2, 12, and 13 character boundaries', () => {
    expect(validateNickname('가')).toEqual({ ok: false, reason: 'tooShort' });
    expect(validateNickname('가나')).toEqual({ ok: true });
    expect(validateNickname('가나다라마바사아자차카타')).toEqual({ ok: true });
    expect(validateNickname('가나다라마바사아자차카타파')).toEqual({ ok: false, reason: 'tooLong' });
  });

  it('treats astral-plane emoji as invalidChars after passing length checks', () => {
    expect(validateNickname('가😀')).toEqual({ ok: false, reason: 'invalidChars' });
  });

  it('rejects symbols and inner spaces', () => {
    expect(validateNickname('나루토!')).toEqual({ ok: false, reason: 'invalidChars' });
    expect(validateNickname('나 루')).toEqual({ ok: false, reason: 'invalidChars' });
  });
});

describe('skill catalog', () => {
  it('keeps all 15 internal ids and Korean labels in sync', () => {
    expect(SKILL_IDS).toHaveLength(15);
    expect(Object.keys(SKILL_LABELS_KO)).toEqual([...SKILL_IDS]);
    expect(ALL_SKILL_LEVEL_ZERO).toEqual(createSkillLevels(0));
  });
});

describe('dice stats', () => {
  it('rollStats stays within range and total across 1000 seeded runs', () => {
    for (let seed = 1; seed <= 1000; seed += 1) {
      const stats = rollStats(mulberry32(seed));

      expect(validateStatSet(stats)).toBe(true);
    }
  });
});

describe('auto ap distribution', () => {
  it('applies the exact 555-point boost math', () => {
    const stats: CharacterStats = { str: 4, dex: 4, int: 4, luk: 13 };

    expect(distributeAutoAp(stats, 555)).toEqual({
      str: 4,
      dex: 115,
      int: 4,
      luk: 457
    });
  });

  it('puts remainder points into LUK after one full batch', () => {
    const stats: CharacterStats = { str: 4, dex: 5, int: 6, luk: 10 };

    expect(distributeAutoAp(stats, 7)).toEqual({
      str: 4,
      dex: 6,
      int: 6,
      luk: 16
    });
  });
});

describe('character builders', () => {
  it('builds novice defaults exactly', () => {
    const stats: CharacterStats = { str: 4, dex: 5, int: 6, luk: 10 };

    expect(buildNoviceCharacter('나루토', stats)).toEqual({
      version: 1,
      nickname: '나루토',
      job: 'novice',
      level: 9,
      hp: 180,
      maxHp: 180,
      mp: 90,
      maxMp: 90,
      exp: 0,
      stats,
      ap: 0,
      sp: 0,
      autoDistribute: false,
      skills: ALL_SKILL_LEVEL_ZERO,
      mesos: 0,
      mapId: 'cuning-city'
    });
  });

  it('builds a deterministic boost character from a fixed seeded roll', () => {
    const rolledStats = rollStats(mulberry32(123456789));

    expect(buildBoostCharacter('사스케', rolledStats)).toEqual({
      version: 1,
      nickname: '사스케',
      job: 'hokage',
      level: 120,
      hp: 1734,
      maxHp: 1734,
      mp: 867,
      maxMp: 867,
      exp: 0,
      stats: {
        str: 6,
        dex: 118,
        int: 5,
        luk: 451
      },
      ap: 0,
      sp: 33,
      autoDistribute: true,
      skills: createSkillLevels(20),
      mesos: 0,
      mapId: 'cuning-city'
    });
  });
});

describe('save validation', () => {
  it('returns normalized nickname for valid input', () => {
    expect(validateForSave('  가나  ', { str: 4, dex: 4, int: 4, luk: 13 })).toEqual({
      ok: true,
      nickname: '가나'
    });
  });

  it('rejects tampered stats even with a valid nickname', () => {
    expect(validateForSave('나루토', { str: 4, dex: 4, int: 4, luk: 12 })).toEqual({
      ok: false,
      reason: 'invalidStats'
    });
  });
});
