import type { RuntimeSkillId } from '../skills/skill-rules';

export type SkillEffectMotif =
  | 'silver-shuriken'
  | 'twin-star'
  | 'shadow-volley'
  | 'life-vortex'
  | 'phantom-cross'
  | 'avenger-star'
  | 'abyss-rain'
  | 'spiral-orb'
  | 'fox-aura'
  | 'tailed-beast-orb'
  | 'shadow-squad'
  | 'thunder-orb';

export interface SkillEffectDefinition {
  motif: SkillEffectMotif;
  primaryColor: number;
  secondaryColor: number;
  coreColor: number;
  projectileSize: number;
  spinDegrees: number;
  travelDurationMs: number;
  castDurationMs: number;
  impactScale: number;
}

export interface SkillProjectileMotion {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface SkillPresentationPlan {
  echoCount: number;
  impactWaveCount: number;
  screenAccentAlpha: number;
  screenDurationMs: number;
  screenScale: number;
}

export const ACTIVE_EFFECT_SKILL_IDS = Object.freeze([
  'basic-shuriken',
  'lucky-seven',
  'shadow-barrage',
  'drain',
  'phantom-dual-star',
  'avenger',
  'abyss-rain',
  'rasengan',
  'gumiho-transformation',
  'tailed-beast-orb',
  'triple-strike-squad',
  'heavenly-thunder-orb',
] as const satisfies readonly RuntimeSkillId[]);

const SKILL_EFFECT_DEFINITIONS = Object.freeze({
  'basic-shuriken': effect('silver-shuriken', 0xdffcff, 0x79f2dc, 0xffffff, 10, 900, 500, 180, 1),
  'lucky-seven': effect('twin-star', 0xeefcff, 0x6ff4d7, 0xffd86b, 11, 820, 500, 210, 1.1),
  'shadow-barrage': effect('shadow-volley', 0x62dcff, 0x8b5cff, 0xe8f8ff, 12, 540, 520, 230, 1.15),
  drain: effect('life-vortex', 0x76ffd8, 0x713bff, 0x170b3b, 16, 640, 560, 260, 1.3),
  'phantom-dual-star': effect('phantom-cross', 0x69e7ff, 0x3476ff, 0xf3fbff, 15, 720, 540, 260, 1.35),
  avenger: effect('avenger-star', 0xf1b6ff, 0x9a45ff, 0xffffff, 23, 1080, 600, 320, 1.65),
  'abyss-rain': effect('abyss-rain', 0xc18aff, 0x5725b5, 0xf5e8ff, 18, 80, 640, 420, 1.55),
  rasengan: effect('spiral-orb', 0x62e7ff, 0x168cff, 0xffffff, 25, 1260, 500, 300, 1.8),
  'gumiho-transformation': effect('fox-aura', 0x80ffe0, 0x20cba6, 0xffffff, 0, 0, 0, 720, 2.15),
  'tailed-beast-orb': effect('tailed-beast-orb', 0xd46cff, 0x321067, 0x090315, 30, 420, 760, 420, 2.3),
  'triple-strike-squad': effect('shadow-squad', 0x58e5ff, 0x8b55ff, 0xe8fbff, 17, 360, 580, 540, 1.55),
  'heavenly-thunder-orb': effect('thunder-orb', 0xffd75c, 0xff8a1f, 0xffffff, 27, 520, 700, 480, 2.2),
} satisfies Record<(typeof ACTIVE_EFFECT_SKILL_IDS)[number], SkillEffectDefinition>);

export const CINEMATIC_EFFECT_SKILL_IDS = Object.freeze([
  'avenger',
  'abyss-rain',
  'rasengan',
  'gumiho-transformation',
  'tailed-beast-orb',
  'triple-strike-squad',
  'heavenly-thunder-orb',
] as const satisfies readonly RuntimeSkillId[]);

const SKILL_PRESENTATION_PLANS = Object.freeze({
  avenger: presentation(2, 2, 0.13, 380, 1.24),
  'abyss-rain': presentation(2, 3, 0.16, 520, 1.3),
  rasengan: presentation(2, 2, 0.12, 420, 1.28),
  'gumiho-transformation': presentation(3, 2, 0.15, 680, 1.38),
  'tailed-beast-orb': presentation(3, 3, 0.2, 620, 1.48),
  'triple-strike-squad': presentation(3, 3, 0.16, 680, 1.4),
  'heavenly-thunder-orb': presentation(3, 3, 0.18, 580, 1.44),
} satisfies Record<(typeof CINEMATIC_EFFECT_SKILL_IDS)[number], SkillPresentationPlan>);

export function getSkillEffectDefinition(skillId: RuntimeSkillId): SkillEffectDefinition | null {
  return skillId in SKILL_EFFECT_DEFINITIONS
    ? SKILL_EFFECT_DEFINITIONS[skillId as keyof typeof SKILL_EFFECT_DEFINITIONS]
    : null;
}

export function getSkillPresentationPlan(skillId: RuntimeSkillId): SkillPresentationPlan | null {
  return skillId in SKILL_PRESENTATION_PLANS
    ? SKILL_PRESENTATION_PLANS[skillId as keyof typeof SKILL_PRESENTATION_PLANS]
    : null;
}

export function resolveSkillProjectileMotion(
  skillId: RuntimeSkillId,
  index: number,
  projectileCount: number,
  originX: number,
  originY: number,
  direction: -1 | 1,
  range: number
): SkillProjectileMotion {
  const centeredIndex = index - (projectileCount - 1) / 2;
  const commonEndX = originX + direction * range;

  if (skillId === 'abyss-rain') {
    return {
      startX: originX + direction * (42 + index * 22),
      startY: originY - 168 - Math.abs(centeredIndex) * 18,
      endX: commonEndX,
      endY: originY - 34 + centeredIndex * 44
    };
  }

  if (skillId === 'triple-strike-squad') {
    return {
      startX: originX + direction * (28 + index * 9),
      startY: originY - 48 + centeredIndex * 15,
      endX: commonEndX,
      endY: originY - 48 - centeredIndex * 24
    };
  }

  if (skillId === 'heavenly-thunder-orb') {
    return {
      startX: originX + direction * 34,
      startY: originY - 55 + centeredIndex * 58,
      endX: commonEndX,
      endY: originY - 48 - centeredIndex * 20
    };
  }

  const offsetY = centeredIndex * 18;
  return {
    startX: originX + direction * 34,
    startY: originY - 42 + offsetY,
    endX: commonEndX,
    endY: originY - 42 + offsetY * 3
  };
}

function effect(
  motif: SkillEffectMotif,
  primaryColor: number,
  secondaryColor: number,
  coreColor: number,
  projectileSize: number,
  spinDegrees: number,
  travelDurationMs: number,
  castDurationMs: number,
  impactScale: number
): SkillEffectDefinition {
  return Object.freeze({
    motif,
    primaryColor,
    secondaryColor,
    coreColor,
    projectileSize,
    spinDegrees,
    travelDurationMs,
    castDurationMs,
    impactScale
  });
}

function presentation(
  echoCount: number,
  impactWaveCount: number,
  screenAccentAlpha: number,
  screenDurationMs: number,
  screenScale: number
): SkillPresentationPlan {
  return Object.freeze({ echoCount, impactWaveCount, screenAccentAlpha, screenDurationMs, screenScale });
}
