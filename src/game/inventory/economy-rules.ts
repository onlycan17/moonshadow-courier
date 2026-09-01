import { addExperience, getRequiredExperience, type ProgressionState } from '../progression/progression-rules';

export type ItemId = 'recovery-potion' | 'experience-book' | 'mungpuccino' | 'revival-charm';
export type ShurikenId = 'trainee' | 'steel' | 'jade' | 'flame' | 'eclipse' | 'giant-icicle';

export interface ExtendedProfile {
  inventory: Partial<Record<ItemId, number>>;
  ownedShuriken: ShurikenId[];
  equippedShuriken: ShurikenId;
  petRegistered: boolean;
  enduranceRewardClaimed: boolean;
  mesosOverride: number;
}

const ITEM_PRICES: Readonly<Record<ItemId, number>> = Object.freeze({
  'recovery-potion': 120,
  'experience-book': 1,
  mungpuccino: 50_000,
  'revival-charm': 1_000_000,
});

export const SHURIKEN_CATALOG = Object.freeze({
  trainee: { label: '수련생 표창', price: 50, multiplier: 1 },
  steel: { label: '강철 표창', price: 250, multiplier: 1.08 },
  jade: { label: '청옥 표창', price: 1_000, multiplier: 1.18 },
  flame: { label: '홍염 표창', price: 4_000, multiplier: 1.32 },
  eclipse: { label: '일식 표창', price: 12_000, multiplier: 1.5 },
  'giant-icicle': { label: '초대형 고드름', price: null, multiplier: 2 },
} as const satisfies Record<ShurikenId, { label: string; price: number | null; multiplier: number }>);

export function createDefaultExtendedProfile(): ExtendedProfile {
  return { inventory: {}, ownedShuriken: ['trainee'], equippedShuriken: 'trainee', petRegistered: false, enduranceRewardClaimed: false, mesosOverride: 100 };
}

export function purchaseItem(state: ExtendedProfile, itemId: ItemId, quantity: number): { ok: true; state: ExtendedProfile } | { ok: false; reason: 'mesos' | 'limit' | 'inventory' } {
  const amount = Math.max(1, Math.floor(quantity));
  const existing = state.inventory[itemId] ?? 0;
  if ((itemId === 'revival-charm' && existing >= 1) || (itemId === 'mungpuccino' && (existing >= 1 || state.petRegistered))) return { ok: false, reason: 'limit' };
  const distinctCount = Object.values(state.inventory).filter((value) => (value ?? 0) > 0).length;
  if (existing === 0 && distinctCount >= 24) return { ok: false, reason: 'inventory' };
  const boundedAmount = itemId === 'revival-charm' || itemId === 'mungpuccino' ? 1 : amount;
  const cost = ITEM_PRICES[itemId] * boundedAmount;
  if (state.mesosOverride < cost) return { ok: false, reason: 'mesos' };
  return { ok: true, state: { ...state, mesosOverride: state.mesosOverride - cost, inventory: { ...state.inventory, [itemId]: existing + boundedAmount } } };
}

export function useConsumable(state: ExtendedProfile, itemId: 'recovery-potion' | 'experience-book', progression: ProgressionState): { ok: true; state: ExtendedProfile; progression: ProgressionState } | { ok: false; reason: 'missing' | 'no-effect' } {
  const quantity = state.inventory[itemId] ?? 0;
  if (quantity <= 0) return { ok: false, reason: 'missing' };
  let nextProgression = progression;
  if (itemId === 'recovery-potion') {
    if (progression.hp >= progression.maxHp && progression.mp >= progression.maxMp) return { ok: false, reason: 'no-effect' };
    nextProgression = { ...progression, hp: Math.min(progression.maxHp, progression.hp + Math.ceil(progression.maxHp * 0.5)), mp: Math.min(progression.maxMp, progression.mp + Math.ceil(progression.maxMp * 0.5)) };
  } else {
    if (progression.level >= 200) return { ok: false, reason: 'no-effect' };
    let gained = 0;
    for (let level = progression.level; level < Math.min(200, progression.level + 10); level += 1) gained += getRequiredExperience(level);
    nextProgression = addExperience(progression, gained);
  }
  const inventory = { ...state.inventory, [itemId]: quantity - 1 };
  if (inventory[itemId] === 0) delete inventory[itemId];
  return { ok: true, state: { ...state, inventory }, progression: nextProgression };
}

export function purchaseShuriken(state: ExtendedProfile, shurikenId: ShurikenId): { ok: true; state: ExtendedProfile } | { ok: false; reason: 'owned' | 'unavailable' | 'mesos' } {
  if (state.ownedShuriken.includes(shurikenId)) return { ok: false, reason: 'owned' };
  const price = SHURIKEN_CATALOG[shurikenId].price;
  if (price === null) return { ok: false, reason: 'unavailable' };
  if (state.mesosOverride < price) return { ok: false, reason: 'mesos' };
  return { ok: true, state: { ...state, mesosOverride: state.mesosOverride - price, ownedShuriken: [...state.ownedShuriken, shurikenId] } };
}

export function getEquippedWeaponMultiplier(state: ExtendedProfile): number {
  return SHURIKEN_CATALOG[state.equippedShuriken].multiplier;
}
