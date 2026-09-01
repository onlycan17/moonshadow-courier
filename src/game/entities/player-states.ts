import { classifyVertical, type HorizontalInput, type VerticalMotion } from './movement-rules';

export type PlayerState = 'idle' | 'walk' | 'jump' | 'fall' | 'attack' | 'skill' | 'hurt' | 'climb';

export interface PlayerStateFlags {
  onGround: boolean;
  vy: number;
  horizontalInput: HorizontalInput;
  climbing: boolean;
  attacking: boolean;
  skilling?: boolean;
}

export function nextState(current: PlayerState, flags: PlayerStateFlags): PlayerState {
  if (current === 'hurt') {
    return 'hurt';
  }

  if (flags.climbing) {
    return 'climb';
  }

  if (flags.skilling) {
    return 'skill';
  }

  if (flags.attacking) {
    return 'attack';
  }

  if (!flags.onGround) {
    return toAirborneState(classifyVertical(flags.vy));
  }

  if (flags.horizontalInput !== 0) {
    return 'walk';
  }

  return 'idle';
}

function toAirborneState(verticalMotion: VerticalMotion): PlayerState {
  return verticalMotion === 'rise' ? 'jump' : 'fall';
}
