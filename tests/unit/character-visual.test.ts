import { describe, expect, it } from 'vitest';
import {
  PLAYER_ANIMATION_FRAMES,
  PLAYER_FRAME_ORIGINS,
  PLAYER_FRAME_SIZE,
  PLAYER_VISUAL_LAYOUT,
  PLAYER_TEXTURE_KEY,
  resolvePlayerFrameAlignment
} from '../../src/game/assets/character-assets';

describe('character visual contract', () => {
  it('maps the 4x4 sheet to idle, walk, airborne and attack frames', () => {
    expect(PLAYER_FRAME_SIZE).toBe(128);
    expect(PLAYER_ANIMATION_FRAMES).toEqual({
      idle: [0, 1, 2, 3],
      walk: [4, 5, 6, 7],
      jump: [8, 9],
      fall: [10],
      land: [11],
      attack: [12, 13, 14, 15]
    });
  });

  it('uses a stable role-based texture key', () => {
    expect(PLAYER_TEXTURE_KEY).toBe('player-shadow-courier-v1');
  });

  it('centers the collision body under the sprite and aligns it with the feet', () => {
    expect(PLAYER_VISUAL_LAYOUT.bodyOffsetX).toBe(
      (PLAYER_VISUAL_LAYOUT.displayWidth - PLAYER_VISUAL_LAYOUT.bodyWidth) / 2
    );
    expect(
      PLAYER_VISUAL_LAYOUT.bodyOffsetY + PLAYER_VISUAL_LAYOUT.bodyHeight
    ).toBeCloseTo(PLAYER_VISUAL_LAYOUT.displayHeight * PLAYER_VISUAL_LAYOUT.originY, 6);
  });

  it('anchors every idle frame to the same visual center without moving the physics body', () => {
    const measuredIdleContentCenters = [76.5, 63.5, 49.5, 36.5];

    for (const [index, contentCenterX] of measuredIdleContentCenters.entries()) {
      const origin = PLAYER_FRAME_ORIGINS[index];
      expect(origin).toBeDefined();
      expect(contentCenterX - origin!.x * PLAYER_FRAME_SIZE).toBeCloseTo(0, 6);
      expect(origin!.bodyOffsetX - origin!.x * PLAYER_FRAME_SIZE).toBe(
        -PLAYER_VISUAL_LAYOUT.bodyWidth / 2
      );
    }
  });

  it('mirrors every frame alignment around the player center when facing left', () => {
    for (let frameIndex = 0; frameIndex < PLAYER_FRAME_ORIGINS.length; frameIndex += 1) {
      const rightAlignment = resolvePlayerFrameAlignment(frameIndex, 1);
      const leftAlignment = resolvePlayerFrameAlignment(frameIndex, -1);

      expect(rightAlignment).toBeDefined();
      expect(leftAlignment).toBeDefined();
      expect(leftAlignment!.x).toBeCloseTo(1 - rightAlignment!.x, 6);
      expect(leftAlignment!.bodyOffsetX - leftAlignment!.x * PLAYER_FRAME_SIZE).toBe(
        -PLAYER_VISUAL_LAYOUT.bodyWidth / 2
      );
    }
  });
});
