import { describe, expect, it } from 'vitest';
import { GAME_CONFIG, GAME_GRAVITY_Y, GAME_HEIGHT, GAME_PIXEL_ART, GAME_SCENE_KEYS, GAME_WIDTH } from '../../src/game/config';

describe('P0 scaffold config', () => {
  it('uses the required logical resolution and physics defaults', () => {
    expect(GAME_WIDTH).toBe(1280);
    expect(GAME_HEIGHT).toBe(720);
    expect(GAME_GRAVITY_Y).toBe(1250);
    expect(GAME_PIXEL_ART).toBe(true);
    expect(GAME_CONFIG.pixelArt).toBe(true);
    expect(GAME_CONFIG.physics).toMatchObject({
      arcade: {
        fixedStep: true,
        gravity: { y: 1250 }
      }
    });
  });

  it('registers scenes in the required order', () => {
    expect(GAME_SCENE_KEYS).toEqual(['Boot', 'Intro', 'Login', 'CharacterCreate', 'CharacterSelect', 'Gameplay']);
  });
});
