import { describe, expect, it } from 'vitest';
import { getMonsterVisualAsset } from '../../src/game/assets/monster-assets';
import { MONSTER_CATALOG } from '../../src/game/data/monster-catalog';

describe('몬스터 런타임 에셋', () => {
  it('모든 몬스터는 서로 다른 Tripo 파생 WebP를 사용한다', () => {
    const assets = Object.keys(MONSTER_CATALOG).map((monsterId) => getMonsterVisualAsset(monsterId as keyof typeof MONSTER_CATALOG));

    expect(assets.every((asset) => asset !== null)).toBe(true);
    expect(new Set(assets.map((asset) => asset?.textureKey)).size).toBe(assets.length);
    for (const asset of assets) {
      expect(asset?.textureKey).toMatch(/^monster-.+-tripo-v1$/);
      expect(asset?.url).toContain('.webp');
      expect(asset?.displayScale).toBeGreaterThan(0);
    }
  });
});
