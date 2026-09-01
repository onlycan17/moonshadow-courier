import { describe, expect, it } from 'vitest';
import { applyDefense, calculateAttackDamage, getLevelMultiplier } from '../../src/game/combat/combat-rules';

describe('combat rules', () => {
  it('applies the documented level and defense formulas', () => {
    expect(getLevelMultiplier(10)).toBe(1);
    expect(getLevelMultiplier(200)).toBeCloseTo(1 + 190 / 55, 8);
    expect(applyDefense(1000, 1000)).toBe(500);
    expect(applyDefense(0, 999999)).toBe(1);
  });

  it('scales shuriken damage by job, stats, skill level and equipment', () => {
    const damage = calculateAttackDamage({
      baseDamage: 30,
      job: 'rogue',
      level: 30,
      luk: 80,
      dex: 30,
      skillLevel: 10,
      weaponMultiplier: 1.18,
      defense: 80,
      critical: false,
      usesWeapon: true
    });

    expect(damage).toBeGreaterThan(500);
    expect(Number.isInteger(damage)).toBe(true);
  });

  it('uses a 150% critical multiplier after defense', () => {
    const normal = calculateAttackDamage({
      baseDamage: 40,
      job: 'assassin',
      level: 60,
      luk: 180,
      dex: 60,
      skillLevel: 20,
      weaponMultiplier: 1.5,
      defense: 200,
      critical: false,
      usesWeapon: true
    });
    const critical = calculateAttackDamage({
      baseDamage: 40,
      job: 'assassin',
      level: 60,
      luk: 180,
      dex: 60,
      skillLevel: 20,
      weaponMultiplier: 1.5,
      defense: 200,
      critical: true,
      usesWeapon: true
    });

    expect(critical).toBe(Math.max(1, Math.floor(normal * 1.5)));
  });
});
