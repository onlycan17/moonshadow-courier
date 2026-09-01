import { describe, expect, it } from 'vitest';
import { getMap, MAP_DEFS, MAP_LABELS_KO } from '../../src/game/maps/map-registry';
import { MAP_IDS, type MapDef, type MapId } from '../../src/game/maps/types';

const EXPECTED_SIZES: Record<MapId, { width: number; height: number }> = {
  'cuning-city': { width: 1920, height: 720 },
  'bandit-hideout': { width: 1280, height: 720 },
  'green-mushroom-cave': { width: 1920, height: 720 },
  'shadow-testing-ground': { width: 1280, height: 720 },
  'crystal-ant-cave': { width: 1920, height: 720 },
  'clockwork-tower': { width: 1920, height: 720 },
  'sunken-coral-temple': { width: 1920, height: 720 },
  'ember-mine': { width: 1920, height: 720 },
  'moonlight-library': { width: 1920, height: 720 },
  'infinite-arena': { width: 1920, height: 720 },
  'endurance-forest': { width: 1920, height: 1440 }
};

const EXPECTED_VISUAL_GROUND_Y: Record<MapId, number> = {
  'cuning-city': 600,
  'bandit-hideout': 600,
  'green-mushroom-cave': 600,
  'shadow-testing-ground': 600,
  'crystal-ant-cave': 600,
  'clockwork-tower': 600,
  'sunken-coral-temple': 600,
  'ember-mine': 600,
  'moonlight-library': 600,
  'infinite-arena': 600,
  'endurance-forest': 1380
};

function reachableSurfaceYs(map: MapDef): number[] {
  const uniquePlatformYs = [...new Set(map.platforms.filter((platform) => platform.oneWay).map((platform) => platform.y))].sort(
    (left, right) => right - left
  );

  return [map.groundY, ...uniquePlatformYs];
}

describe('map registry', () => {
  it('keeps all 11 map ids, labels, and registry entries in sync', () => {
    expect(MAP_IDS).toHaveLength(11);
    expect(Object.keys(MAP_DEFS)).toEqual([...MAP_IDS]);
    expect(Object.keys(MAP_LABELS_KO)).toEqual([...MAP_IDS]);
  });

  it('stores the exact P2 world sizes', () => {
    for (const mapId of MAP_IDS) {
      expect(getMap(mapId)).toMatchObject(EXPECTED_SIZES[mapId]);
    }
  });

  it('aligns each map ground with the walkable surface painted in its background', () => {
    for (const mapId of MAP_IDS) {
      expect(getMap(mapId).groundY, mapId).toBe(EXPECTED_VISUAL_GROUND_Y[mapId]);
    }
  });

  it('places default spawns and portals on a registered walkable surface', () => {
    for (const mapId of MAP_IDS) {
      const map = getMap(mapId);
      const surfaceYs = new Set([map.groundY, ...map.platforms.map((platform) => platform.y)]);

      expect(surfaceYs.has(map.defaultSpawn.y), `${mapId}:defaultSpawn`).toBe(true);
      for (const portal of map.portals) {
        expect(surfaceYs.has(portal.y), `${mapId}:${portal.id}`).toBe(true);
      }
    }
  });

  it('resolves every portal target map and target portal id', () => {
    for (const mapId of MAP_IDS) {
      const map = getMap(mapId);

      for (const portal of map.portals) {
        const targetMap = MAP_DEFS[portal.targetMapId];
        const targetPortal = targetMap.portals.find((candidate) => candidate.id === portal.targetPortalId);

        expect(targetMap).toBeDefined();
        expect(targetPortal, `${mapId}:${portal.id} -> ${portal.targetMapId}:${portal.targetPortalId}`).toBeDefined();
      }
    }
  });

  it('gives infinite-arena zero ropes and exactly five one-way platforms', () => {
    const arena = getMap('infinite-arena');

    expect(arena.ropes).toHaveLength(0);
    expect(arena.platforms.filter((platform) => platform.oneWay)).toHaveLength(5);
  });

  it('keeps shadow-testing-ground to one rope and one one-way platform', () => {
    const testingGround = getMap('shadow-testing-ground');

    expect(testingGround.ropes).toHaveLength(1);
    expect(testingGround.platforms.filter((platform) => platform.oneWay)).toHaveLength(1);
  });

  it('limits reachable vertical surface gaps to 130px or less', () => {
    for (const mapId of MAP_IDS) {
      const surfaces = reachableSurfaceYs(getMap(mapId));

      for (let index = 0; index < surfaces.length - 1; index += 1) {
        const currentSurface = surfaces[index];
        const nextSurface = surfaces[index + 1];

        if (currentSurface === undefined || nextSurface === undefined) {
          throw new Error(`Missing surface pair for ${mapId}`);
        }

        expect(currentSurface - nextSurface).toBeLessThanOrEqual(130);
      }
    }
  });

  it('keeps enough clearance between the ground and the lowest platform', () => {
    for (const mapId of MAP_IDS) {
      const map = getMap(mapId);
      if (map.platforms.length === 0) continue;

      const lowestPlatformY = Math.max(...map.platforms.map((platform) => platform.y));
      expect(map.groundY - lowestPlatformY, mapId).toBeGreaterThanOrEqual(90);
    }
  });

  it('ends each rope on a registered platform surface', () => {
    for (const mapId of MAP_IDS) {
      const map = getMap(mapId);
      if (map.height !== 720) continue;
      const platformYs = new Set(map.platforms.map((platform) => platform.y));

      for (const rope of map.ropes) {
        expect(platformYs.has(rope.bottomY), `${mapId}:${rope.id}`).toBe(true);
      }
    }
  });
});
