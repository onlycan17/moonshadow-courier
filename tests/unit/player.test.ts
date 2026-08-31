import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/game/config', () => ({
  GAME_GRAVITY_Y: 1250
}));

import { getMap } from '../../src/game/maps/map-registry';
import { stepHorizontalVelocity } from '../../src/game/entities/movement-rules';
import { createInitialRuntimeState, runPlayerStepWithIntent, type PlayerBodyLike, type PlayerIntent } from '../../src/game/entities/player';

const SHADOW_TESTING_GROUND = getMap('shadow-testing-ground');

describe('player runtime', () => {
  it('uses the injected intent provider to wire horizontal motion through movement rules', () => {
    const body = createFakeBody({ blockedDown: true });
    const getIntent = vi.fn<() => PlayerIntent>(() => ({
      horizontal: 1,
      jumpPressed: false,
      downHeld: false,
      upHeld: false
    }));

    const result = runPlayerStepWithIntent({
      body,
      map: SHADOW_TESTING_GROUND,
      getIntent,
      dtSeconds: 1 / 60,
      nowMs: 100,
      runtime: createInitialRuntimeState()
    });

    expect(getIntent).toHaveBeenCalledTimes(1);
    expect(body.velocity.x).toBe(stepHorizontalVelocity(0, 1, true, 1 / 60));
    expect(result.movementState).toBe('walk');
  });

  it('marks exactly one overlapping one-way platform to ignore on down-plus-jump', () => {
    const body = createFakeBody({
      x: 632,
      y: 488,
      blockedDown: true
    });

    const result = runPlayerStepWithIntent({
      body,
      map: SHADOW_TESTING_GROUND,
      getIntent: () => ({
        horizontal: 0,
        jumpPressed: true,
        downHeld: true,
        upHeld: false
      }),
      dtSeconds: 1 / 60,
      nowMs: 250,
      runtime: createInitialRuntimeState('walk')
    });

    expect(result.ignoredOneWayPlatformId).toBe('trial-perch');
    expect(result.ignoreOneWayUntilMs).toBe(500);
    expect(body.velocity.y).toBe(1);
    expect(result.movementState).toBe('fall');
  });
});

function createFakeBody(overrides: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  blockedDown?: boolean;
  touchingDown?: boolean;
  velocityX?: number;
  velocityY?: number;
} = {}): PlayerBodyLike {
  return {
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 36,
    height: overrides.height ?? 52,
    velocity: {
      x: overrides.velocityX ?? 0,
      y: overrides.velocityY ?? 0
    },
    blocked: {
      down: overrides.blockedDown ?? false
    },
    touching: {
      down: overrides.touchingDown ?? false
    }
  };
}
