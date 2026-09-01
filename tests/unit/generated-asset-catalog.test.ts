import { describe, expect, it } from 'vitest';
import { DUA_PET_ASSET } from '../../src/game/assets/pet-assets';
import { getSkillIconAsset, SKILL_ICON_ASSETS } from '../../src/game/assets/skill-icon-assets';
import { SKILL_IDS } from '../../src/game/data/skill-catalog';

describe('생성형 런타임 에셋 카탈로그', () => {
  it('두아는 Tripo 파생 WebP를 사용한다', () => {
    expect(DUA_PET_ASSET).toMatchObject({ textureKey: 'pet-dua-tripo-v1' });
    expect(DUA_PET_ASSET.url).toContain('.webp');
  });

  it('모든 기술은 Phaser와 DOM이 공유할 독립 WebP를 가진다', () => {
    expect(Object.keys(SKILL_ICON_ASSETS)).toEqual([...SKILL_IDS]);
    expect(new Set(Object.values(SKILL_ICON_ASSETS).map((asset) => asset.textureKey)).size).toBe(SKILL_IDS.length);
    for (const skillId of SKILL_IDS) {
      const asset = getSkillIconAsset(skillId);
      expect(asset.textureKey).toBe(`skill-${skillId}-icon-v1`);
      expect(asset.url).toContain('.webp');
    }
  });
});
