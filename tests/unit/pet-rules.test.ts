import { describe, expect, it } from 'vitest';
import {
  chooseNearestPetDrop,
  stepPetFollower,
  type PetFollowerState,
} from '../../src/game/pets/pet-rules';

describe('Dua pet rules', () => {
  const pet: PetFollowerState = { x: 100, y: 500, velocityX: 0, facing: 1 };

  it('only targets landed drops inside the player 720px search radius', () => {
    const target = chooseNearestPetDrop(
      pet,
      { x: 120, y: 500 },
      [
        { id: 'airborne', x: 110, y: 500, landed: false },
        { id: 'outside', x: 850, y: 500, landed: true },
        { id: 'far-from-pet', x: 400, y: 500, landed: true },
        { id: 'nearest', x: 180, y: 500, landed: true },
      ],
    );

    expect(target?.id).toBe('nearest');
  });

  it('moves toward a drop and only requests collection inside 44px', () => {
    const first = stepPetFollower({
      pet,
      player: { x: 100, y: 500, velocityX: 0, facing: 1 },
      target: { id: 'drop', x: 220, y: 500, landed: true },
      deltaMs: 100,
    });

    expect(first.state.x).toBeGreaterThan(pet.x);
    expect(first.state.velocityX).toBeLessThanOrEqual(360);
    expect(first.collectDropId).toBeNull();

    const close = stepPetFollower({
      pet: { ...pet, x: 190 },
      player: { x: 100, y: 500, velocityX: 0, facing: 1 },
      target: { id: 'drop', x: 220, y: 500, landed: true },
      deltaMs: 16,
    });
    expect(close.collectDropId).toBe('drop');
  });

  it('warps behind the player after falling 560px horizontally or 220px vertically behind', () => {
    const result = stepPetFollower({
      pet: { ...pet, x: 0, y: 900 },
      player: { x: 700, y: 500, velocityX: 180, facing: 1 },
      target: null,
      deltaMs: 16,
    });

    expect(result.warped).toBe(true);
    expect(result.state.x).toBe(636);
    expect(result.state.y).toBe(500);
    expect(result.state.velocityX).toBe(180);
  });

  it('inherits clamped player velocity while waiting at the follow point', () => {
    const result = stepPetFollower({
      pet: { x: 36, y: 500, velocityX: 0, facing: 1 },
      player: { x: 100, y: 500, velocityX: 500, facing: 1 },
      target: null,
      deltaMs: 100,
    });

    expect(result.state.velocityX).toBe(90);
    expect(result.state.x).toBe(45);
    expect(result.jumping).toBe(false);
  });

  it('jumps toward a drop more than 32px above and turns toward a left target', () => {
    const above = stepPetFollower({
      pet,
      player: { x: 100, y: 500, velocityX: 0, facing: 1 },
      target: { id: 'above', x: 100, y: 400, landed: true },
      deltaMs: 100,
    });
    expect(above.jumping).toBe(true);
    expect(above.state.y).toBe(430);
    expect(above.state.facing).toBe(1);

    const left = stepPetFollower({
      pet,
      player: { x: 100, y: 500, velocityX: 0, facing: 1 },
      target: { id: 'left', x: 0, y: 500, landed: true },
      deltaMs: 100,
    });
    expect(left.state.velocityX).toBeLessThan(0);
    expect(left.state.facing).toBe(-1);
  });
});
