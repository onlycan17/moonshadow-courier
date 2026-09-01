import type { JobId } from '../profile/types';

const JOB_MULTIPLIERS: Readonly<Record<JobId, number>> = Object.freeze({
  novice: 1,
  rogue: 12,
  assassin: 70,
  hermit: 350,
  hokage: 1400
});

export interface AttackDamageInput {
  baseDamage: number;
  job: JobId;
  level: number;
  luk: number;
  dex: number;
  skillLevel: number;
  weaponMultiplier: number;
  defense: number;
  critical: boolean;
  usesWeapon: boolean;
}

export function getLevelMultiplier(level: number): number {
  const normalizedLevel = Math.max(10, Math.min(200, Math.floor(level)));
  return 1 + (normalizedLevel - 10) / 55;
}

export function getShurikenStatBonus(luk: number, dex: number): number {
  return Math.floor((Math.max(0, luk) * 2 + Math.max(0, dex)) / 16);
}

export function applyDefense(rawDamage: number, defense: number): number {
  return Math.max(1, Math.floor(Math.max(0, rawDamage) * 1000 / (1000 + Math.max(0, defense))));
}

export function calculateAttackDamage(input: AttackDamageInput): number {
  const skillMultiplier = 1 + Math.max(0, Math.min(20, input.skillLevel)) * 0.05;
  const statBonus = input.usesWeapon ? getShurikenStatBonus(input.luk, input.dex) : 0;
  const weaponMultiplier = input.usesWeapon ? Math.max(1, input.weaponMultiplier) : 1;
  const rawDamage = (Math.max(1, input.baseDamage) + statBonus)
    * JOB_MULTIPLIERS[input.job]
    * getLevelMultiplier(input.level)
    * skillMultiplier
    * weaponMultiplier;
  const defended = applyDefense(rawDamage, input.defense);
  return input.critical ? Math.max(1, Math.floor(defended * 1.5)) : defended;
}

export function isDeterministicCritical(sequence: number, criticalSkillLevel: number): boolean {
  const chancePercent = Math.max(0, Math.min(20, criticalSkillLevel));
  const roll = Math.abs(Math.trunc(sequence * 37 + 17)) % 100;
  return roll < chancePercent;
}
