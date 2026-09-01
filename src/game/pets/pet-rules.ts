export interface Point {
  x: number;
  y: number;
}

export interface PetDropTarget extends Point {
  id: string;
  landed: boolean;
}

export interface PetFollowerState extends Point {
  velocityX: number;
  facing: -1 | 1;
}

export interface PetPlayerState extends Point {
  velocityX: number;
  facing: -1 | 1;
}

export interface PetFollowerStep {
  state: PetFollowerState;
  collectDropId: string | null;
  warped: boolean;
  jumping: boolean;
}

export const PET_SEARCH_RANGE = 720;
export const PET_COLLECT_RANGE = 44;
export const PET_MAX_SPEED = 360;
export const PET_JUMP_SPEED = 700;
export const PET_WARP_X = 560;
export const PET_WARP_Y = 220;
export const PET_FOLLOW_DISTANCE = 64;

export function chooseNearestPetDrop(
  pet: Point,
  player: Point,
  drops: readonly PetDropTarget[],
): PetDropTarget | null {
  let nearest: PetDropTarget | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const drop of drops) {
    if (!drop.landed || distance(player, drop) > PET_SEARCH_RANGE) continue;
    const petDistance = distance(pet, drop);
    if (petDistance < nearestDistance) {
      nearest = drop;
      nearestDistance = petDistance;
    }
  }

  return nearest;
}

export function stepPetFollower(input: {
  pet: PetFollowerState;
  player: PetPlayerState;
  target: PetDropTarget | null;
  deltaMs: number;
}): PetFollowerStep {
  const { pet, player, target } = input;
  if (Math.abs(player.x - pet.x) >= PET_WARP_X || Math.abs(player.y - pet.y) >= PET_WARP_Y) {
    return {
      state: {
        x: player.x - player.facing * PET_FOLLOW_DISTANCE,
        y: player.y,
        velocityX: clamp(player.velocityX, -PET_MAX_SPEED, PET_MAX_SPEED),
        facing: player.facing,
      },
      collectDropId: null,
      warped: true,
      jumping: false,
    };
  }

  if (target !== null && distance(pet, target) <= PET_COLLECT_RANGE) {
    return { state: { ...pet }, collectDropId: target.id, warped: false, jumping: false };
  }

  const deltaSeconds = clamp(input.deltaMs, 0, 100) / 1000;
  const destination = target ?? {
    x: player.x - player.facing * PET_FOLLOW_DISTANCE,
    y: player.y,
  };
  const deltaX = destination.x - pet.x;
  const desiredVelocity = Math.abs(deltaX) <= 12
    ? (target === null ? clamp(player.velocityX, -PET_MAX_SPEED, PET_MAX_SPEED) : 0)
    : Math.sign(deltaX) * PET_MAX_SPEED;
  const acceleration = (target === null && Math.abs(deltaX) <= 12 ? 900 : 1400) * deltaSeconds;
  const velocityX = approach(pet.velocityX, desiredVelocity, acceleration);
  const x = pet.x + velocityX * deltaSeconds;
  const jumping = destination.y < pet.y - 32;
  const verticalSpeed = jumping ? PET_JUMP_SPEED : PET_MAX_SPEED;
  const y = approach(pet.y, destination.y, verticalSpeed * deltaSeconds);
  const facing = Math.abs(velocityX) < 1 ? pet.facing : velocityX < 0 ? -1 : 1;
  const state: PetFollowerState = { x, y, velocityX, facing };
  const collectDropId = target !== null && distance(state, target) <= PET_COLLECT_RANGE ? target.id : null;

  return { state, collectDropId, warped: false, jumping };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  return Math.max(target, current - maxDelta);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
