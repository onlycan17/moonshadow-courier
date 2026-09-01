export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const HUD_TOP = 596;
export const HUD_HEIGHT = VIEW_HEIGHT - HUD_TOP;
export const PLAYFIELD_HEIGHT = HUD_TOP;

export interface CameraCenter {
  x: number;
  y: number;
}

export interface WorldBackgroundLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 배경을 화면이 아닌 월드 전체에 맞춰 카메라와 같은 좌표계에서 이동시킨다. */
export function resolveWorldBackgroundLayout(
  worldWidth: number,
  worldHeight: number
): WorldBackgroundLayout {
  return {
    x: worldWidth / 2,
    y: worldHeight / 2,
    width: worldWidth,
    height: worldHeight
  };
}

export function clampCameraCenter(
  playerX: number,
  playerY: number,
  worldWidth: number,
  worldHeight: number
): CameraCenter {
  return {
    x: clampAxisCenter(playerX, worldWidth, VIEW_WIDTH),
    y: clampAxisCenter(playerY, worldHeight, PLAYFIELD_HEIGHT)
  };
}

export function resolveCameraScroll(
  playerX: number,
  playerY: number,
  worldWidth: number,
  worldHeight: number
): CameraCenter {
  const center = clampCameraCenter(playerX, playerY, worldWidth, worldHeight);
  return {
    x: center.x - VIEW_WIDTH / 2,
    y: Math.max(0, center.y - PLAYFIELD_HEIGHT / 2)
  };
}

function clampAxisCenter(target: number, worldSize: number, viewSize: number): number {
  if (worldSize <= viewSize) {
    return worldSize / 2;
  }

  const minCenter = viewSize / 2;
  const maxCenter = worldSize - viewSize / 2;

  return Math.max(minCenter, Math.min(target, maxCenter));
}
