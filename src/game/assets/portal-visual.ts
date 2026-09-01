export const PORTAL_TEXTURE_KEY = 'map-portal-arch-tripo';

const PORTAL_ARCH_SIZE = 144;
const PORTAL_ARCH_FLOOR_OFFSET = 8;
const PORTAL_RING_FLOOR_OFFSET = 4;
const PORTAL_LABEL_GAP = 8;

export interface PortalVisualBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PortalVisualLayout {
  centerX: number;
  centerY: number;
  archBottomY: number;
  archSize: number;
  energyWidth: number;
  energyHeight: number;
  innerRingWidth: number;
  outerRingWidth: number;
  ringY: number;
  labelY: number;
}

/** 충돌 데이터는 바꾸지 않고 2D 파생 에셋과 효과만 정렬하는 순수 규칙이다(SPEC §6.3, §11.2). */
export function createPortalVisualLayout(bounds: PortalVisualBounds): PortalVisualLayout {
  return {
    centerX: bounds.x + bounds.width / 2,
    centerY: bounds.y - bounds.height / 2,
    archBottomY: bounds.y + PORTAL_ARCH_FLOOR_OFFSET,
    archSize: PORTAL_ARCH_SIZE,
    energyWidth: Math.round(bounds.width * 0.5),
    energyHeight: Math.round(bounds.height * 0.75),
    innerRingWidth: Math.round(bounds.width * 1.2),
    outerRingWidth: Math.round(bounds.width * 1.6),
    ringY: bounds.y - PORTAL_RING_FLOOR_OFFSET,
    labelY: bounds.y - PORTAL_ARCH_SIZE - PORTAL_LABEL_GAP
  };
}
