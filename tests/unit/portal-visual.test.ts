import { describe, expect, it } from 'vitest';
import {
  PORTAL_TEXTURE_KEY,
  createPortalVisualLayout
} from '../../src/game/assets/portal-visual';

describe('portal visual contract', () => {
  it('aligns the Tripo arch and animated layers to the portal collision bounds', () => {
    const layout = createPortalVisualLayout({
      x: 280,
      y: 660,
      width: 56,
      height: 96
    });

    expect(layout).toEqual({
      centerX: 308,
      centerY: 612,
      archBottomY: 668,
      archSize: 144,
      energyWidth: 28,
      energyHeight: 72,
      innerRingWidth: 67,
      outerRingWidth: 90,
      ringY: 656,
      labelY: 508
    });
  });

  it('keeps the runtime texture key role-based instead of task-id based', () => {
    expect(PORTAL_TEXTURE_KEY).toBe('map-portal-arch-tripo');
  });
});
