import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/game/config', () => ({
  GAME_GRAVITY_Y: 1250
}));

import {
  AIR_CONTROL_ACCELERATION,
  APEX_VERTICAL_THRESHOLD,
  FALL_TERMINAL_VELOCITY,
  GROUND_ACCELERATION,
  GROUND_DECELERATION,
  MAX_RUN_SPEED,
  applyGravity,
  canStartJump,
  classifyVertical,
  stepHorizontalVelocity
} from '../../src/game/entities/movement-rules';
import { nextState, type PlayerState } from '../../src/game/entities/player-states';

describe('movement rules', () => {
  it('reverses to exact max speed in air when the input changes direction', () => {
    expect(stepHorizontalVelocity(MAX_RUN_SPEED, -1, false, 1 / 60)).toBe(-MAX_RUN_SPEED);
  });

  it('preserves air inertia with no input', () => {
    expect(stepHorizontalVelocity(123, 0, false, 1 / 60)).toBe(123);
    expect(stepHorizontalVelocity(-87, 0, false, 1 / 30)).toBe(-87);
  });

  it('accelerates on the ground up to the cap without exceeding it', () => {
    let vx = 0;

    for (let index = 0; index < 20; index += 1) {
      vx = stepHorizontalVelocity(vx, 1, true, 1 / 60);
    }

    expect(vx).toBe(MAX_RUN_SPEED);
    expect(vx).toBeLessThanOrEqual(MAX_RUN_SPEED);
    expect(GROUND_ACCELERATION).toBe(2400);
  });

  it('decelerates to exactly zero on the ground without overshooting past zero', () => {
    expect(stepHorizontalVelocity(10, 0, true, 1 / 30)).toBe(0);
    expect(stepHorizontalVelocity(-10, 0, true, 1 / 30)).toBe(0);
    expect(GROUND_DECELERATION).toBe(2600);
  });

  it('scales ground acceleration consistently across frame sizes', () => {
    const singleStep = stepHorizontalVelocity(0, 1, true, 1 / 30);
    const halfStep = stepHorizontalVelocity(stepHorizontalVelocity(0, 1, true, 1 / 60), 1, true, 1 / 60);

    expect(halfStep).toBeCloseTo(singleStep, 6);
  });

  it('prevents jump start for down-plus-jump and while airborne', () => {
    expect(canStartJump(true, true)).toBe(false);
    expect(canStartJump(false, false)).toBe(false);
    expect(canStartJump(true, false)).toBe(true);
  });

  it('classifies rise, apex, and fall at the threshold boundaries', () => {
    expect(classifyVertical(-APEX_VERTICAL_THRESHOLD - 0.001)).toBe('rise');
    expect(classifyVertical(-APEX_VERTICAL_THRESHOLD)).toBe('apex');
    expect(classifyVertical(0)).toBe('apex');
    expect(classifyVertical(APEX_VERTICAL_THRESHOLD)).toBe('apex');
    expect(classifyVertical(APEX_VERTICAL_THRESHOLD + 0.001)).toBe('fall');
  });

  it('applies gravity and clamps to the fall terminal velocity', () => {
    expect(applyGravity(0, 0.2)).toBeCloseTo(250, 6);
    expect(applyGravity(FALL_TERMINAL_VELOCITY - 1, 1)).toBe(FALL_TERMINAL_VELOCITY);
  });

  it('accelerates in air toward the cap when already moving with the input direction', () => {
    expect(stepHorizontalVelocity(0, 1, false, 0.1)).toBe(AIR_CONTROL_ACCELERATION * 0.1);
    expect(stepHorizontalVelocity(250, 1, false, 0.1)).toBe(MAX_RUN_SPEED);
  });
});

describe('player states', () => {
  it('keeps hurt externally forced', () => {
    expectState(
      nextState('hurt', {
        onGround: true,
        vy: 0,
        horizontalInput: 1,
        climbing: false,
        attacking: false
      }),
      'hurt'
    );
  });

  it('prioritizes climbing over all other movement states', () => {
    expectState(
      nextState('walk', {
        onGround: false,
        vy: -300,
        horizontalInput: 1,
        climbing: true,
        attacking: false
      }),
      'climb'
    );
  });

  it('uses jump while rising and switches to fall at apex threshold', () => {
    expectState(
      nextState('jump', {
        onGround: false,
        vy: -100,
        horizontalInput: 0,
        climbing: false,
        attacking: false
      }),
      'jump'
    );
    expectState(
      nextState('jump', {
        onGround: false,
        vy: APEX_VERTICAL_THRESHOLD,
        horizontalInput: 0,
        climbing: false,
        attacking: false
      }),
      'fall'
    );
  });

  it('returns walk or idle while grounded', () => {
    expectState(
      nextState('fall', {
        onGround: true,
        vy: 200,
        horizontalInput: 1,
        climbing: false,
        attacking: false
      }),
      'walk'
    );
    expectState(
      nextState('walk', {
        onGround: true,
        vy: 0,
        horizontalInput: 0,
        climbing: false,
        attacking: false
      }),
      'idle'
    );
  });
});

function expectState(actual: PlayerState, expected: PlayerState): void {
  expect(actual).toBe(expected);
}
