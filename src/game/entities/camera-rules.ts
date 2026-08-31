export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const HUD_LIFT_PX = 48;

export interface CameraCenter {
  x: number;
  y: number;
}

export function clampCameraCenter(
  playerX: number,
  playerY: number,
  worldWidth: number,
  worldHeight: number
): CameraCenter {
  return {
    x: clampAxisCenter(playerX, worldWidth, VIEW_WIDTH),
    y: clampAxisCenter(playerY - HUD_LIFT_PX, worldHeight, VIEW_HEIGHT)
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
