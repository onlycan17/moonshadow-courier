import { describe, expect, it } from 'vitest';
import { GAME_SFX_IDS } from '../../src/game/audio/procedural-audio';

describe('절차형 효과음 계약', () => {
  it('문서에서 요구한 사건용 효과음 12종을 제공한다', () => {
    expect(new Set(GAME_SFX_IDS).size).toBe(12);
  });
});
