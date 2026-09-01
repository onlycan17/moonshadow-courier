import { describe, expect, it } from 'vitest';
import {
  GAME_FULL_TITLE_KO,
  GAME_PACKAGE_NAME,
  GAME_SUBTITLE_KO,
  GAME_TITLE_EN,
  GAME_TITLE_KO,
} from '../../src/game/data/game-brand';

describe('게임 브랜드', () => {
  it('화면명과 패키지명이 하나의 제품 정체성을 사용한다', () => {
    expect(GAME_TITLE_KO).toBe('월영전령');
    expect(GAME_SUBTITLE_KO).toBe('심연의 기록');
    expect(GAME_FULL_TITLE_KO).toBe('월영전령: 심연의 기록');
    expect(GAME_TITLE_EN).toBe('Moonshadow Courier: Chronicle of the Abyss');
    expect(GAME_PACKAGE_NAME).toBe('moonshadow-courier');
  });
});
