import { describe, expect, it } from 'vitest';
import {
  MAP_BACKGROUND_ASSETS,
  getMapBackgroundAsset
} from '../../src/game/assets/map-background-assets';
import { MAP_IDS } from '../../src/game/maps/types';

describe('map background asset contract', () => {
  it('assigns one role-based background texture to every map', () => {
    expect(Object.keys(MAP_BACKGROUND_ASSETS).sort()).toEqual([...MAP_IDS].sort());

    for (const mapId of MAP_IDS) {
      const asset = getMapBackgroundAsset(mapId);
      expect(asset.textureKey).toBe(`map-background-${mapId}-v1`);
      expect(asset.url).toMatch(/\.webp(?:\?|$)/);
    }
  });

  it('does not reuse a background texture between distinct entrances', () => {
    const textureKeys = MAP_IDS.map((mapId) => getMapBackgroundAsset(mapId).textureKey);
    expect(new Set(textureKeys).size).toBe(MAP_IDS.length);
  });

  it('uses subdued map-specific collision overlay colors instead of the mint placeholder', () => {
    for (const mapId of MAP_IDS) {
      const asset = getMapBackgroundAsset(mapId);
      expect(asset.platformFill).toBeGreaterThanOrEqual(0);
      expect(asset.platformFill).toBeLessThanOrEqual(0xffffff);
      expect(asset.platformStroke).not.toBe(0x75c6a2);
      expect(asset.ropeColor).not.toBe(0x75c6a2);
    }
  });
});
