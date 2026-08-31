import { describe, expect, it } from 'vitest';
import { HUD_LIFT_PX, VIEW_HEIGHT, VIEW_WIDTH, clampCameraCenter } from '../../src/game/entities/camera-rules';

describe('camera rules', () => {
  it('clamps left and right within a 1920x720 world', () => {
    expect(clampCameraCenter(100, 360, 1920, 720)).toEqual({ x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 });
    expect(clampCameraCenter(1820, 360, 1920, 720)).toEqual({ x: 1920 - VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 });
  });

  it('never lets the camera show above y=0 near the top of the world', () => {
    expect(clampCameraCenter(960, 20, 1920, 1440).y).toBe(VIEW_HEIGHT / 2);
  });

  it('clamps the bottom edge to the world height', () => {
    expect(clampCameraCenter(960, 1400, 1920, 1440).y).toBe(1440 - VIEW_HEIGHT / 2);
  });

  it('applies the hud lift when the player is in the middle of a taller world', () => {
    expect(clampCameraCenter(960, 800, 1920, 1440)).toEqual({
      x: 960,
      y: 800 - HUD_LIFT_PX
    });
  });

  it('centers horizontally when the world is narrower than the viewport', () => {
    expect(clampCameraCenter(200, 360, 1000, 720).x).toBe(500);
  });
});
