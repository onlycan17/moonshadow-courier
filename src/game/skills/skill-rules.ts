import type { SkillId } from '../data/skill-catalog';

export type RuntimeSkillId = SkillId | 'tailed-beast-orb';

export interface SkillDefinition {
  id: RuntimeSkillId;
  mpCost: number;
  baseDamage: number;
  projectileCount: number;
  maxTargets: number;
  cooldownMs: number;
  usesWeapon: boolean;
}

const ACTIVE_SKILLS: Readonly<Partial<Record<RuntimeSkillId, SkillDefinition>>> = Object.freeze({
  'basic-shuriken': { id: 'basic-shuriken', mpCost: 0, baseDamage: 28, projectileCount: 1, maxTargets: 1, cooldownMs: 360, usesWeapon: true },
  'lucky-seven': { id: 'lucky-seven', mpCost: 12, baseDamage: 21, projectileCount: 2, maxTargets: 1, cooldownMs: 460, usesWeapon: true },
  'shadow-barrage': { id: 'shadow-barrage', mpCost: 16, baseDamage: 16, projectileCount: 3, maxTargets: 1, cooldownMs: 520, usesWeapon: true },
  drain: { id: 'drain', mpCost: 16, baseDamage: 44, projectileCount: 1, maxTargets: 1, cooldownMs: 620, usesWeapon: true },
  'phantom-dual-star': { id: 'phantom-dual-star', mpCost: 24, baseDamage: 35, projectileCount: 2, maxTargets: 2, cooldownMs: 680, usesWeapon: true },
  avenger: { id: 'avenger', mpCost: 24, baseDamage: 39, projectileCount: 1, maxTargets: 4, cooldownMs: 760, usesWeapon: true },
  'abyss-rain': { id: 'abyss-rain', mpCost: 42, baseDamage: 48, projectileCount: 3, maxTargets: 4, cooldownMs: 980, usesWeapon: true },
  rasengan: { id: 'rasengan', mpCost: 30, baseDamage: 81, projectileCount: 1, maxTargets: 1, cooldownMs: 760, usesWeapon: false },
  'gumiho-transformation': { id: 'gumiho-transformation', mpCost: 60, baseDamage: 0, projectileCount: 0, maxTargets: 0, cooldownMs: 500, usesWeapon: false },
  'tailed-beast-orb': { id: 'tailed-beast-orb', mpCost: 45, baseDamage: 125, projectileCount: 1, maxTargets: 3, cooldownMs: 900, usesWeapon: false },
  'triple-strike-squad': { id: 'triple-strike-squad', mpCost: 80, baseDamage: 50, projectileCount: 5, maxTargets: 1, cooldownMs: 1600, usesWeapon: false },
  'heavenly-thunder-orb': { id: 'heavenly-thunder-orb', mpCost: 70, baseDamage: 110, projectileCount: 2, maxTargets: 5, cooldownMs: 1250, usesWeapon: false }
});

export type SkillUseResult =
  | { ok: false; reason: 'locked' | 'mp' | 'transformation' }
  | {
      ok: true;
      resolvedSkillId: RuntimeSkillId;
      mpAfter: number;
      baseDamage: number;
      projectileCount: number;
      maxTargets: number;
      cooldownMs: number;
      usesWeapon: boolean;
      togglesTransformation: boolean;
    };

export function resolveSkillUse(
  requestedSkillId: SkillId,
  skillLevel: number,
  currentMp: number,
  transformed: boolean
): SkillUseResult {
  if (skillLevel <= 0) {
    return { ok: false, reason: 'locked' };
  }

  const resolvedSkillId: RuntimeSkillId = transformed && requestedSkillId === 'lucky-seven'
    ? 'tailed-beast-orb'
    : requestedSkillId;
  const definition = ACTIVE_SKILLS[resolvedSkillId];
  if (definition === undefined) {
    return { ok: false, reason: 'locked' };
  }
  if (resolvedSkillId === 'tailed-beast-orb' && !transformed) {
    return { ok: false, reason: 'transformation' };
  }
  if (currentMp < definition.mpCost) {
    return { ok: false, reason: 'mp' };
  }

  return {
    ok: true,
    resolvedSkillId,
    mpAfter: currentMp - definition.mpCost,
    baseDamage: definition.baseDamage,
    projectileCount: definition.projectileCount,
    maxTargets: definition.maxTargets,
    cooldownMs: definition.cooldownMs,
    usesWeapon: definition.usesWeapon,
    togglesTransformation: requestedSkillId === 'gumiho-transformation'
  };
}

export function getSkillDefinition(skillId: RuntimeSkillId): SkillDefinition | null {
  return ACTIVE_SKILLS[skillId] ?? null;
}
