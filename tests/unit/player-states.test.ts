import { describe, expect, it } from 'vitest';
import { nextState } from '../../src/game/entities/player-states';

describe('player states', () => {
  it('prioritizes skill and attack animations over grounded movement', () => {
    expect(nextState('idle', {
      onGround: true,
      vy: 0,
      horizontalInput: 1,
      climbing: false,
      attacking: false,
      skilling: true
    })).toBe('skill');
    expect(nextState('idle', {
      onGround: true,
      vy: 0,
      horizontalInput: 1,
      climbing: false,
      attacking: true,
      skilling: false
    })).toBe('attack');
  });
});
