import { describe, expect, it } from 'vitest';
import { addExperience, getRequiredExperience } from '../../src/game/progression/progression-rules';

describe('progression rules', () => {
  it('uses the documented required EXP curve', () => {
    expect(getRequiredExperience(9)).toBe(100);
    expect(getRequiredExperience(10)).toBe(100);
    expect(getRequiredExperience(30)).toBe(900);
  });

  it('supports multiple level-ups and awards resources with auto AP distribution', () => {
    const result = addExperience({
      level: 9,
      exp: 0,
      hp: 1,
      maxHp: 180,
      mp: 1,
      maxMp: 90,
      ap: 0,
      sp: 0,
      stats: { str: 4, dex: 4, int: 4, luk: 13 },
      autoDistribute: true
    }, 200);

    expect(result.level).toBe(11);
    expect(result.exp).toBe(0);
    expect(result.maxHp).toBe(208);
    expect(result.maxMp).toBe(104);
    expect(result.hp).toBe(208);
    expect(result.mp).toBe(104);
    expect(result.sp).toBe(6);
    expect(result.stats.dex).toBe(6);
    expect(result.stats.luk).toBe(21);
  });

  it('caps progression at level 200', () => {
    const result = addExperience({
      level: 199,
      exp: 0,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      ap: 0,
      sp: 0,
      stats: { str: 4, dex: 4, int: 4, luk: 13 },
      autoDistribute: false
    }, 99999999);

    expect(result.level).toBe(200);
    expect(result.exp).toBe(0);
    expect(result.ap).toBe(5);
    expect(result.sp).toBe(3);
  });
});
