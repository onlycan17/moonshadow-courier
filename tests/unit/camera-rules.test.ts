import { describe, expect, it } from 'vitest';
import {
  PLAYFIELD_HEIGHT,
  VIEW_WIDTH,
  clampCameraCenter,
  resolveCameraScroll,
  resolveWorldBackgroundLayout
} from '../../src/game/entities/camera-rules';

describe('camera rules', () => {
  it('clamps left and right within a 1920x720 world', () => {
    expect(clampCameraCenter(100, 360, 1920, 720)).toEqual({ x: VIEW_WIDTH / 2, y: 360 });
    expect(clampCameraCenter(1820, 360, 1920, 720)).toEqual({ x: 1920 - VIEW_WIDTH / 2, y: 360 });
  });

  it('never lets the camera show above y=0 near the top of the world', () => {
    expect(clampCameraCenter(960, 20, 1920, 1440).y).toBe(PLAYFIELD_HEIGHT / 2);
  });

  it('clamps the bottom edge to the world height', () => {
    expect(clampCameraCenter(960, 1400, 1920, 1440).y).toBe(1440 - PLAYFIELD_HEIGHT / 2);
  });

  it('centers the player in the visible playfield of a taller world', () => {
    expect(clampCameraCenter(960, 800, 1920, 1440)).toEqual({
      x: 960,
      y: 800
    });
  });

  it('places the 720px world bottom directly above the HUD', () => {
    expect(resolveCameraScroll(960, 660, 1920, 720)).toEqual({
      x: 320,
      y: 720 - PLAYFIELD_HEIGHT
    });
  });

  it('centers horizontally when the world is narrower than the viewport', () => {
    expect(clampCameraCenter(200, 360, 1000, 720).x).toBe(500);
  });

  it('sizes and centers the background on the full map world', () => {
    expect(resolveWorldBackgroundLayout(1920, 720)).toEqual({
      x: 960,
      y: 360,
      width: 1920,
      height: 720
    });

    expect(resolveWorldBackgroundLayout(1920, 1440)).toEqual({
      x: 960,
      y: 720,
      width: 1920,
      height: 1440
    });
  });
});
