import type { MapDef, PlatformDef, PortalDef, RopeDef } from './types';

export type ExpeditionStage = 'none' | 'offer' | 'midboss' | 'upperboss';

export interface PortalUseContext {
  level: number;
  expeditionStage: ExpeditionStage;
  activeExam: boolean;
}

export type PortalUseResult =
  | { ok: true }
  | { ok: false; reason: 'level-too-low' | 'level-too-high' | 'portal-hidden' | 'exam-required' };

export const DROP_THROUGH_TOLERANCE = 12;
export const ROPE_DEFAULT_RANGE = 40;
export const ROPE_GRAB_TOLERANCE = 12;

function isWithinInclusiveRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function distanceToRope(x: number, y: number, rope: RopeDef): number {
  const dx = Math.abs(x - rope.x);

  if (y < rope.topY) {
    return Math.hypot(dx, rope.topY - y);
  }

  if (y > rope.bottomY) {
    return Math.hypot(dx, y - rope.bottomY);
  }

  return dx;
}

export function isPortalVisible(portal: PortalDef, expeditionStage: ExpeditionStage): boolean {
  if (portal.hiddenUntilExpeditionStage === undefined) {
    return true;
  }

  return expeditionStage === portal.hiddenUntilExpeditionStage;
}

export function canUsePortal(portal: PortalDef, ctx: PortalUseContext): PortalUseResult {
  if (!isPortalVisible(portal, ctx.expeditionStage)) {
    return { ok: false, reason: 'portal-hidden' };
  }

  if (portal.requiresActiveExam === true && !ctx.activeExam) {
    return { ok: false, reason: 'exam-required' };
  }

  if (portal.minLevel !== undefined && ctx.level < portal.minLevel) {
    return { ok: false, reason: 'level-too-low' };
  }

  if (portal.maxLevel !== undefined && ctx.level > portal.maxLevel) {
    return { ok: false, reason: 'level-too-high' };
  }

  return { ok: true };
}

export function findDropThroughPlatform(footX: number, footY: number, map: MapDef): PlatformDef | null {
  const candidates = map.platforms.filter((platform) => {
    if (!platform.oneWay) {
      return false;
    }

    const rightX = platform.x + platform.width;
    return isWithinInclusiveRange(footX, platform.x, rightX) && Math.abs(footY - platform.y) <= DROP_THROUGH_TOLERANCE;
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((closestPlatform, platform) => {
    const closestDistance = Math.abs(footY - closestPlatform.y);
    const platformDistance = Math.abs(footY - platform.y);

    return platformDistance < closestDistance ? platform : closestPlatform;
  });
}

export function nearestRope(x: number, y: number, map: MapDef, range = ROPE_DEFAULT_RANGE): RopeDef | null {
  let bestRope: RopeDef | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const rope of map.ropes) {
    const distance = distanceToRope(x, y, rope);

    if (distance > range || distance >= bestDistance) {
      continue;
    }

    bestRope = rope;
    bestDistance = distance;
  }

  return bestRope;
}

export function isOnRope(x: number, y: number, rope: RopeDef): boolean {
  return Math.abs(x - rope.x) <= ROPE_GRAB_TOLERANCE && isWithinInclusiveRange(y, rope.topY, rope.bottomY);
}

export function resolveSpawn(map: MapDef, saved?: { x: number; y: number } | null): { x: number; y: number } {
  if (
    saved === null ||
    saved === undefined ||
    !Number.isFinite(saved.x) ||
    !Number.isFinite(saved.y) ||
    saved.x < 0 ||
    saved.x > map.width ||
    saved.y < 0 ||
    saved.y > map.height
  ) {
    return { ...map.defaultSpawn };
  }

  return { x: saved.x, y: Math.min(saved.y, map.groundY) };
}
