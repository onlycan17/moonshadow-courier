import type { SlotNumber } from './types';

// 기존 플레이어의 캐릭터가 사라지지 않도록 제품명 변경 뒤에도 레거시 저장 namespace를 유지한다.
export const PROFILE_SLOT_1_KEY = 'kerning-shadows.local-profile.v1';
export const PROFILE_SLOT_2_KEY = 'kerning-shadows.local-profile.v1.slot-2';
export const PROFILE_SLOT_3_KEY = 'kerning-shadows.local-profile.v1.slot-3';
export const PROFILE_ACTIVE_SLOT_KEY = 'kerning-shadows.local-profile.v1.active-slot';

export const PROFILE_SLOT_KEYS = Object.freeze<Record<SlotNumber, string>>({
  1: PROFILE_SLOT_1_KEY,
  2: PROFILE_SLOT_2_KEY,
  3: PROFILE_SLOT_3_KEY
});

export const PROFILE_STORAGE_KEYS = Object.freeze({
  slots: PROFILE_SLOT_KEYS,
  activeSlot: PROFILE_ACTIVE_SLOT_KEY
});
