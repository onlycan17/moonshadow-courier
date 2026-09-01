import { describe, expect, it } from 'vitest';
import { createDefaultExtendedProfile, purchaseItem, useConsumable } from '../../src/game/inventory/economy-rules';

describe('상점과 인벤토리 규칙', () => {
  it('경험의 서는 1메소에 구매하고 24칸 인벤토리에 합쳐진다', () => {
    const state = createDefaultExtendedProfile();
    expect(purchaseItem(state, 'experience-book', 10)).toMatchObject({ ok: true, state: { inventory: { 'experience-book': 10 } } });
  });

  it('완전 회복 상태에서는 물약을 소비하지 않는다', () => {
    const state = { ...createDefaultExtendedProfile(), inventory: { 'recovery-potion': 1 } };
    expect(useConsumable(state, 'recovery-potion', { hp: 100, maxHp: 100, mp: 50, maxMp: 50, level: 10, exp: 0, ap: 0, sp: 0, stats: { str: 4, dex: 4, int: 4, luk: 13 }, autoDistribute: true })).toEqual({ ok: false, reason: 'no-effect' });
  });

  it('부활의 부적은 최대 한 개만 구매한다', () => {
    const rich = { ...createDefaultExtendedProfile(), mesosOverride: 2_000_000 };
    const first = purchaseItem(rich, 'revival-charm', 1);
    expect(first.ok).toBe(true);
    if (first.ok) expect(purchaseItem(first.state, 'revival-charm', 1)).toEqual({ ok: false, reason: 'limit' });
  });
});
