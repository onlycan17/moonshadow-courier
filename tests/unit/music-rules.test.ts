import { describe, expect, it } from 'vitest';
import {
  GAME_MUSIC_MODES,
  GAME_MUSIC_THEMES,
  getMusicFrame,
  resolveMusicMode,
} from '../../src/game/audio/music-rules';

describe('배경음악 규칙', () => {
  it('탐험과 보스 전용의 서로 다른 반복 테마를 제공한다', () => {
    expect(GAME_MUSIC_MODES).toEqual(['exploration', 'boss']);
    expect(GAME_MUSIC_THEMES.exploration.tempoBpm).toBeLessThan(GAME_MUSIC_THEMES.boss.tempoBpm);
    expect(GAME_MUSIC_THEMES.exploration.leadNotes).not.toEqual(GAME_MUSIC_THEMES.boss.leadNotes);

    for (const mode of GAME_MUSIC_MODES) {
      const theme = GAME_MUSIC_THEMES[mode];
      expect(theme.leadNotes).toHaveLength(32);
      expect(theme.bassNotes).toHaveLength(32);
      expect(theme.label.length).toBeGreaterThan(0);
    }
  });

  it('프레임 인덱스를 반복 구간 안으로 감싸고 유효한 주파수로 변환한다', () => {
    const first = getMusicFrame('exploration', 0);
    const wrapped = getMusicFrame('exploration', 32);
    const last = getMusicFrame('exploration', -1);

    expect(wrapped).toEqual(first);
    expect(last.index).toBe(31);
    expect(first.durationSeconds).toBeGreaterThan(0);
    expect(first.leadFrequency).toBeGreaterThanOrEqual(40);
    expect(first.leadFrequency).toBeLessThanOrEqual(2_000);
    expect(first.bassFrequency).toBeGreaterThanOrEqual(40);
    expect(first.bassFrequency).toBeLessThanOrEqual(2_000);
  });

  it('살아 있는 보스가 있을 때만 보스 테마를 선택한다', () => {
    expect(resolveMusicMode(false)).toBe('exploration');
    expect(resolveMusicMode(true)).toBe('boss');
  });
});
