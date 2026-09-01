export const PLAYER_TEXTURE_KEY = 'player-shadow-courier-v1';
export const PLAYER_FRAME_SIZE = 128;

const PLAYER_DISPLAY_SIZE = 128;
const PLAYER_BODY_WIDTH = 36;
const PLAYER_BODY_HEIGHT = 52;
const PLAYER_ORIGIN_Y = 0.82;

export const PLAYER_VISUAL_LAYOUT = Object.freeze({
  displayWidth: PLAYER_DISPLAY_SIZE,
  displayHeight: PLAYER_DISPLAY_SIZE,
  bodyWidth: PLAYER_BODY_WIDTH,
  bodyHeight: PLAYER_BODY_HEIGHT,
  originX: 0.5,
  originY: PLAYER_ORIGIN_Y,
  bodyOffsetX: (PLAYER_DISPLAY_SIZE - PLAYER_BODY_WIDTH) / 2,
  bodyOffsetY: PLAYER_DISPLAY_SIZE * PLAYER_ORIGIN_Y - PLAYER_BODY_HEIGHT
});

const PLAYER_CONTENT_CENTER_X_BY_COLUMN = [76.5, 63.5, 49.5, 36.5] as const;

export interface PlayerFrameOrigin {
  x: number;
  bodyOffsetX: number;
}

export type PlayerFacingDirection = -1 | 1;

/**
 * 생성 시트의 각 열은 캐릭터 픽셀이 서로 다른 x에 놓여 있다.
 * 프레임 원점을 불투명 몸체 중심에 맞추고 물리 바디는 월드 x 중앙에 고정한다.
 */
export const PLAYER_FRAME_ORIGINS = Object.freeze(
  Array.from({ length: 16 }, (_, frameIndex): PlayerFrameOrigin => {
    const contentCenterX = PLAYER_CONTENT_CENTER_X_BY_COLUMN[frameIndex % 4]!;
    const originX = contentCenterX / PLAYER_FRAME_SIZE;
    return Object.freeze({
      x: originX,
      bodyOffsetX: contentCenterX - PLAYER_BODY_WIDTH / 2
    });
  })
);

const PLAYER_LEFT_FRAME_ORIGINS = Object.freeze(
  PLAYER_FRAME_ORIGINS.map((rightOrigin): PlayerFrameOrigin => {
    const x = 1 - rightOrigin.x;
    return Object.freeze({
      x,
      bodyOffsetX: x * PLAYER_FRAME_SIZE - PLAYER_BODY_WIDTH / 2
    });
  })
);

export function resolvePlayerFrameAlignment(
  frameIndex: number,
  facingDirection: PlayerFacingDirection
): PlayerFrameOrigin | undefined {
  return facingDirection < 0
    ? PLAYER_LEFT_FRAME_ORIGINS[frameIndex]
    : PLAYER_FRAME_ORIGINS[frameIndex];
}

export const PLAYER_ANIMATION_FRAMES = Object.freeze({
  idle: [0, 1, 2, 3],
  walk: [4, 5, 6, 7],
  jump: [8, 9],
  fall: [10],
  land: [11],
  attack: [12, 13, 14, 15]
});
