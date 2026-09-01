import Phaser from "phaser";
import { LocalStorageStore } from "../profile/key-value-store";
import { ProfileRepository } from "../profile/profile-repository";
import { PROFILE_SLOT_KEYS } from "../profile/slot-keys";
import type { SlotNumber, StoredCharacterV1 } from "../profile/types";

const BACKGROUND_COLOR = 0x11131a;
const PANEL_STROKE_COLOR = 0x3f4760;
const PANEL_FILL_ALPHA = 0.9;
const PANEL_MARGIN = 96;

export interface CharacterCreateSceneData {
  slot?: SlotNumber;
}

export interface CharacterSelectSceneData {
  message?: string;
}

export type SlotState =
  | { kind: "empty"; slot: SlotNumber }
  | { kind: "filled"; slot: SlotNumber; character: StoredCharacterV1 }
  | { kind: "corrupt"; slot: SlotNumber };

export function paintScene(
  scene: Phaser.Scene,
  title: string,
  subtitle: string,
): void {
  scene.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
  const width = scene.scale.width;
  const height = scene.scale.height;

  scene.add
    .rectangle(
      width / 2,
      height / 2,
      width - PANEL_MARGIN,
      height - PANEL_MARGIN,
      0x1b2030,
      PANEL_FILL_ALPHA,
    )
    .setStrokeStyle(2, PANEL_STROKE_COLOR);

  scene.add
    .text(width / 2, 120, title, createTextStyle(40, "#f7f8fb"))
    .setOrigin(0.5);
  scene.add
    .text(width / 2, 176, subtitle, createTextStyle(18, "#aab4d6"))
    .setOrigin(0.5);
}

export function createTextStyle(
  fontSize: number,
  color: string,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    color,
    fontFamily: "sans-serif",
    fontSize: `${fontSize}px`,
  };
}

export function createProfileRepository(): ProfileRepository {
  return new ProfileRepository(new LocalStorageStore());
}

/**
 * 게임 상태와 동기화하는 `body[data-*]` 키 목록 (SPEC §5.3).
 * E2E는 이 속성으로 화면·위치·임시 객체 수명을 확인하므로 이름은 여기서만 관리한다.
 */
export const GAMEPLAY_DATASET_KEYS = Object.freeze({
  activeNickname: "activeNickname",
  activeLevel: "activeLevel",
  currentMap: "currentMap",
  playerX: "playerX",
  playerY: "playerY",
  playerState: "playerState",
  mapObjects: "mapObjects",
  mapBodies: "mapBodies",
  mapColliders: "mapColliders",
  mapTimers: "mapTimers",
  mapTweens: "mapTweens",
  portalAsset: "portalAsset",
  backgroundAsset: "backgroundAsset",
  playerAsset: "playerAsset",
  playerHp: "playerHp",
  playerMp: "playerMp",
  playerExp: "playerExp",
  playerMesos: "playerMesos",
  enemyCount: "enemyCount",
  enemyAlive: "enemyAlive",
  drops: "drops",
  transformed: "transformed",
  lastCombatEvent: "lastCombatEvent",
});

export function clearGameplayDataset(): void {
  for (const datasetKey of Object.values(GAMEPLAY_DATASET_KEYS)) {
    delete document.body.dataset[datasetKey];
  }
}

export function getSlotStates(
  repository: ProfileRepository,
): [SlotState, SlotState, SlotState] {
  return [1, 2, 3].map((slot) =>
    getSlotState(repository, slot as SlotNumber),
  ) as [SlotState, SlotState, SlotState];
}

export function hasWritableEmptySlot(
  slotStates: readonly SlotState[],
): boolean {
  return slotStates.some((slotState) => slotState.kind === "empty");
}

export function hasFilledSlot(slotStates: readonly SlotState[]): boolean {
  return slotStates.some((slotState) => slotState.kind === "filled");
}

function getSlotState(
  repository: ProfileRepository,
  slot: SlotNumber,
): SlotState {
  const rawValue = readSlotRawValue(slot);
  if (rawValue === null) {
    return { kind: "empty", slot };
  }

  const character = repository.loadSlot(slot);
  if (character !== null) {
    return { kind: "filled", slot, character };
  }

  return { kind: "corrupt", slot };
}

function readSlotRawValue(slot: SlotNumber): string | null {
  const store = new LocalStorageStore();
  return store.getItem(PROFILE_SLOT_KEYS[slot]);
}
