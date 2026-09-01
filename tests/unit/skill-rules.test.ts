import { describe, expect, it } from 'vitest';
import { resolveSkillUse } from '../../src/game/skills/skill-rules';

describe('skill rules', () => {
  it('rejects locked skills and insufficient MP without consuming resources', () => {
    expect(resolveSkillUse('lucky-seven', 0, 100, false)).toEqual({ ok: false, reason: 'locked' });
    expect(resolveSkillUse('heavenly-thunder-orb', 20, 69, false)).toEqual({ ok: false, reason: 'mp' });
  });

  it('returns a deterministic projectile plan and MP cost', () => {
    const result = resolveSkillUse('shadow-barrage', 20, 100, false);

    expect(result).toMatchObject({ ok: true, mpAfter: 84, projectileCount: 3, maxTargets: 1 });
  });

  it('switches transformation and exposes the transformed Shift attack', () => {
    expect(resolveSkillUse('gumiho-transformation', 20, 100, false)).toMatchObject({
      ok: true,
      togglesTransformation: true
    });
    expect(resolveSkillUse('lucky-seven', 20, 100, true)).toMatchObject({
      ok: true,
      resolvedSkillId: 'tailed-beast-orb',
      projectileCount: 1,
      maxTargets: 3,
      mpAfter: 55
    });
  });
});
