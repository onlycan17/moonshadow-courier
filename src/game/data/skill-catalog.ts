const skillIds = [
  'basic-shuriken',
  'lucky-seven',
  'shadow-barrage',
  'drain',
  'phantom-dual-star',
  'avenger',
  'abyss-rain',
  'rasengan',
  'gumiho-transformation',
  'triple-strike-squad',
  'heavenly-thunder-orb',
  'keen-eyesight',
  'critical-throw',
  'shadow-breathing',
  'sage-mode'
] as const;

export const SKILL_IDS = Object.freeze(skillIds);

export type SkillId = (typeof SKILL_IDS)[number];

const skillLabelsKo = {
  'basic-shuriken': '기본 표창',
  'lucky-seven': '럭키세븐',
  'shadow-barrage': '그림자 연사',
  drain: '드레인',
  'phantom-dual-star': '환영 쌍성',
  avenger: '어벤저',
  'abyss-rain': '심연 폭우',
  rasengan: '나선환',
  'gumiho-transformation': '구미호 변신',
  'triple-strike-squad': '삼인 협공',
  'heavenly-thunder-orb': '천뢰옥',
  'keen-eyesight': '예리한 시야',
  'critical-throw': '치명 투척',
  'shadow-breathing': '그림자 호흡',
  'sage-mode': '선인모드'
} as const satisfies Record<SkillId, string>;

export const SKILL_LABELS_KO = Object.freeze(skillLabelsKo);

const allSkillLevelZero = Object.fromEntries(SKILL_IDS.map((skillId) => [skillId, 0])) as Record<SkillId, number>;

export const ALL_SKILL_LEVEL_ZERO = Object.freeze(allSkillLevelZero);
