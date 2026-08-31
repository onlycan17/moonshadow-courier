import { GAME_GRAVITY_Y } from '../config';

export type HorizontalInput = -1 | 0 | 1;
export type VerticalMotion = 'rise' | 'apex' | 'fall';

export const MAX_RUN_SPEED = 260;
export const GROUND_ACCELERATION = 2400;
export const GROUND_DECELERATION = 2600;
export const AIR_CONTROL_ACCELERATION = 1800;
export const JUMP_VELOCITY = -640;
export const APEX_VERTICAL_THRESHOLD = 40;
export const FALL_TERMINAL_VELOCITY = 900;

export function stepHorizontalVelocity(
  currentVx: number,
  input: HorizontalInput,
  onGround: boolean,
  dtSeconds: number
): number {
  if (dtSeconds <= 0) {
    return clampRunSpeed(currentVx);
  }

  if (onGround) {
    if (input === 0) {
      return decelerateToZero(currentVx, GROUND_DECELERATION * dtSeconds);
    }

    return accelerateToward(currentVx, input * MAX_RUN_SPEED, GROUND_ACCELERATION * dtSeconds);
  }

  if (input === 0) {
    return currentVx;
  }

  if (hasOppositeDirection(currentVx, input)) {
    return input * MAX_RUN_SPEED;
  }

  return accelerateToward(currentVx, input * MAX_RUN_SPEED, AIR_CONTROL_ACCELERATION * dtSeconds);
}

export function canStartJump(onGround: boolean, downHeld: boolean): boolean {
  return onGround && !downHeld;
}

export function classifyVertical(vy: number): VerticalMotion {
  if (vy < -APEX_VERTICAL_THRESHOLD) {
    return 'rise';
  }

  if (vy > APEX_VERTICAL_THRESHOLD) {
    return 'fall';
  }

  return 'apex';
}

export function applyGravity(vy: number, dtSeconds: number): number {
  if (dtSeconds <= 0) {
    return Math.min(vy, FALL_TERMINAL_VELOCITY);
  }

  return Math.min(vy + GAME_GRAVITY_Y * dtSeconds, FALL_TERMINAL_VELOCITY);
}

function accelerateToward(current: number, target: number, delta: number): number {
  if (current < target) {
    return Math.min(current + delta, target);
  }

  if (current > target) {
    return Math.max(current - delta, target);
  }

  return current;
}

function decelerateToZero(current: number, delta: number): number {
  if (current > 0) {
    return Math.max(current - delta, 0);
  }

  if (current < 0) {
    return Math.min(current + delta, 0);
  }

  return 0;
}

function hasOppositeDirection(currentVx: number, input: Exclude<HorizontalInput, 0>): boolean {
  return (currentVx > 0 && input < 0) || (currentVx < 0 && input > 0);
}

function clampRunSpeed(value: number): number {
  return Math.max(-MAX_RUN_SPEED, Math.min(MAX_RUN_SPEED, value));
}
