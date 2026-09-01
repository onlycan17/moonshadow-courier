import { describe, expect, it } from 'vitest';
import {
  ACTIVE_EFFECT_SKILL_IDS,
  CINEMATIC_EFFECT_SKILL_IDS,
  getSkillEffectDefinition,
  getSkillPresentationPlan,
  resolveSkillProjectileMotion
} from '../../src/game/effects/skill-effect-rules';

describe('아이콘 기반 스킬 이펙트 규칙', () => {
  it('모든 액티브 런타임 스킬에 색상과 고유 문양을 제공한다', () => {
    const definitions = ACTIVE_EFFECT_SKILL_IDS.map((skillId) => getSkillEffectDefinition(skillId));

    expect(definitions.every((definition) => definition !== null)).toBe(true);
    expect(new Set(definitions.map((definition) => definition?.motif)).size).toBe(ACTIVE_EFFECT_SKILL_IDS.length);
  });

  it('고급 스킬은 기본 표창보다 큰 시전·명중 연출을 사용한다', () => {
    const basic = getSkillEffectDefinition('basic-shuriken');
    const advanced = ['avenger', 'abyss-rain', 'rasengan', 'tailed-beast-orb', 'triple-strike-squad', 'heavenly-thunder-orb'] as const;

    expect(basic).not.toBeNull();
    for (const skillId of advanced) {
      const definition = getSkillEffectDefinition(skillId);
      expect(definition?.projectileSize ?? 0).toBeGreaterThan(basic?.projectileSize ?? 0);
      expect(definition?.impactScale ?? 0).toBeGreaterThan(basic?.impactScale ?? 0);
      expect(definition?.castDurationMs ?? 0).toBeGreaterThan(basic?.castDurationMs ?? 0);
    }
  });

  it('심연 폭우는 위에서 내려오고 천뢰옥 두 발은 서로 다른 높이에서 교차한다', () => {
    const rain = resolveSkillProjectileMotion('abyss-rain', 1, 3, 400, 660, 1, 270);
    expect(rain.startY).toBeLessThan(500);
    expect(rain.endY).toBeGreaterThan(rain.startY);

    const thunderUpper = resolveSkillProjectileMotion('heavenly-thunder-orb', 0, 2, 400, 660, 1, 270);
    const thunderLower = resolveSkillProjectileMotion('heavenly-thunder-orb', 1, 2, 400, 660, 1, 270);
    expect(thunderUpper.startY).toBeLessThan(thunderLower.startY);
    expect(thunderUpper.endY).toBeGreaterThan(thunderLower.endY);
  });

  it('참고 영상형 고급 연출은 화면장·다중 잔상·2차 이상 충격파를 사용한다', () => {
    for (const skillId of CINEMATIC_EFFECT_SKILL_IDS) {
      const plan = getSkillPresentationPlan(skillId);
      expect(plan?.echoCount ?? 0).toBeGreaterThanOrEqual(2);
      expect(plan?.impactWaveCount ?? 0).toBeGreaterThanOrEqual(2);
      expect(plan?.screenAccentAlpha ?? 0).toBeGreaterThan(0);
      expect(plan?.screenDurationMs ?? 0).toBeGreaterThanOrEqual(380);
    }

    expect(getSkillPresentationPlan('basic-shuriken')).toBeNull();
  });
});
