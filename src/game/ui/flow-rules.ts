import type { SlotNumber, StoredCharacterV1 } from '../profile/types';

export type CharacterSlots = readonly [StoredCharacterV1 | null, StoredCharacterV1 | null, StoredCharacterV1 | null];

export function firstEmptySlot(slots: CharacterSlots): SlotNumber | null {
  if (slots[0] === null) {
    return 1;
  }
  if (slots[1] === null) {
    return 2;
  }
  if (slots[2] === null) {
    return 3;
  }
  return null;
}

export function nextSceneAfterLogin(hasProfile: boolean): 'CharacterSelect' | 'CharacterCreate' {
  return hasProfile ? 'CharacterSelect' : 'CharacterCreate';
}
