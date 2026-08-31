import { describe, expect, it } from 'vitest';
import { getMap } from '../../src/game/maps/map-registry';
import {
  canUsePortal,
  findDropThroughPlatform,
  isOnRope,
  isPortalVisible,
  nearestRope,
  resolveSpawn
} from '../../src/game/maps/map-rules';

function portalById(mapId: Parameters<typeof getMap>[0], portalId: string) {
  const portal = getMap(mapId).portals.find((candidate) => candidate.id === portalId);

  if (portal === undefined) {
    throw new Error(`Missing portal ${mapId}:${portalId}`);
  }

  return portal;
}

describe('portal rules', () => {
  it('hides the moonlight-library portal until upperboss stage', () => {
    const portal = portalById('cuning-city', 'to-moonlight-library');

    expect(isPortalVisible(portal, 'none')).toBe(false);
    expect(isPortalVisible(portal, 'offer')).toBe(false);
    expect(isPortalVisible(portal, 'midboss')).toBe(false);
    expect(isPortalVisible(portal, 'upperboss')).toBe(true);
  });

  it('rejects the exam portal without an active exam', () => {
    const portal = portalById('bandit-hideout', 'to-shadow-testing-ground');

    expect(canUsePortal(portal, { level: 30, expeditionStage: 'upperboss', activeExam: false })).toEqual({
      ok: false,
      reason: 'exam-required'
    });
    expect(canUsePortal(portal, { level: 30, expeditionStage: 'upperboss', activeExam: true })).toEqual({ ok: true });
  });

  it('enforces the arena min-level gate at 200', () => {
    const portal = portalById('moonlight-library', 'to-infinite-arena');

    expect(canUsePortal(portal, { level: 199, expeditionStage: 'upperboss', activeExam: false })).toEqual({
      ok: false,
      reason: 'level-too-low'
    });
    expect(canUsePortal(portal, { level: 200, expeditionStage: 'upperboss', activeExam: false })).toEqual({ ok: true });
  });
});

describe('platform and rope rules', () => {
  it('finds only the overlapping one-way platform for drop-through', () => {
    const testingGround = getMap('shadow-testing-ground');

    expect(findDropThroughPlatform(650, 540, testingGround)?.id).toBe('trial-perch');
    expect(findDropThroughPlatform(900, 540, testingGround)).toBeNull();
    expect(findDropThroughPlatform(650, testingGround.groundY, testingGround)).toBeNull();
  });

  it('returns the nearest rope within range and confirms rope occupancy', () => {
    const testingGround = getMap('shadow-testing-ground');
    const rope = nearestRope(660, 420, testingGround);
    const onlyRope = testingGround.ropes[0];

    if (onlyRope === undefined) {
      throw new Error('Missing shadow-testing-ground rope');
    }

    expect(rope?.id).toBe('trial-rope');
    expect(nearestRope(720, 420, testingGround)).toBeNull();
    expect(isOnRope(650, 420, onlyRope)).toBe(true);
    expect(isOnRope(670, 420, onlyRope)).toBe(false);
  });
});

describe('spawn resolution', () => {
  it('returns saved positions when they are inside map bounds', () => {
    const city = getMap('cuning-city');

    expect(resolveSpawn(city, { x: 300, y: 500 })).toEqual({ x: 300, y: 500 });
  });

  it('falls back to defaultSpawn for invalid or out-of-bounds saved positions', () => {
    const forest = getMap('endurance-forest');

    expect(resolveSpawn(forest, { x: -1, y: 300 })).toEqual(forest.defaultSpawn);
    expect(resolveSpawn(forest, { x: 300, y: 2000 })).toEqual(forest.defaultSpawn);
    expect(resolveSpawn(forest, { x: Number.POSITIVE_INFINITY, y: 100 })).toEqual(forest.defaultSpawn);
    expect(resolveSpawn(forest, null)).toEqual(forest.defaultSpawn);
  });
});
