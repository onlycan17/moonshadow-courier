import Phaser from "phaser";
import type { SkillId } from '../data/skill-catalog';
import {
  createDefaultSkillShortcuts,
  getSkillForActionKey,
  getSkillForAdditionalKey,
  type ActionSlotKey,
  type AdditionalSkillKey,
  type SkillShortcuts,
} from '../skills/skill-shortcut-rules';

export type FocusSafeKeyDefinition = {
  keyboardCode: number;
  domCodes: readonly string[];
};

export type FocusSafeKeyMap<T extends string> = Record<
  T,
  FocusSafeKeyDefinition
>;

export interface GameplayIntent {
  horizontal: -1 | 0 | 1;
  jumpPressed: boolean;
  attackPressed: boolean;
  downHeld: boolean;
  upHeld: boolean;
  interactPressed: boolean;
  skillPressed: SkillId | null;
  collectPressed: boolean;
  menuPressed: boolean;
  inventoryPressed: boolean;
  statsPressed: boolean;
  skillMenuPressed: boolean;
}

export interface GameplayInput {
  keys: Record<GameplayKeyName, Phaser.Input.Keyboard.Key>;
  getIntent: () => GameplayIntent;
}

export type GameplayKeyName =
  | 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'collect'
  | 'menu' | 'inventory' | 'stats' | 'skillMenu'
  | 'slot1' | 'slot2' | 'slot3' | 'slot4' | 'slot5' | 'slot6'
  | 'slot7' | 'slot8' | 'slot9' | 'slot0' | 'slotMinus'
  | 'luckySeven' | 'shadowBarrage' | 'drain' | 'phantomDualStar'
  | 'avenger' | 'abyssRain' | 'rasengan' | 'gumihoTransformation'
  | 'tripleStrikeSquad' | 'heavenlyThunderOrb' | 'aliasA' | 'aliasD' | 'aliasF';

const GAMEPLAY_KEY_DEFINITIONS: FocusSafeKeyMap<GameplayKeyName> = {
  left: {
    keyboardCode: Phaser.Input.Keyboard.KeyCodes.LEFT,
    domCodes: ["ArrowLeft"],
  },
  right: {
    keyboardCode: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    domCodes: ["ArrowRight"],
  },
  up: {
    keyboardCode: Phaser.Input.Keyboard.KeyCodes.UP,
    domCodes: ["ArrowUp"],
  },
  down: {
    keyboardCode: Phaser.Input.Keyboard.KeyCodes.DOWN,
    domCodes: ["ArrowDown"],
  },
  jump: {
    keyboardCode: Phaser.Input.Keyboard.KeyCodes.ALT,
    domCodes: ["AltLeft", "AltRight"],
  },
  attack: {
    keyboardCode: Phaser.Input.Keyboard.KeyCodes.CTRL,
    domCodes: ["ControlLeft", "ControlRight"],
  },
  collect: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.Z, domCodes: ['KeyZ'] },
  menu: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.ESC, domCodes: ['Escape'] },
  inventory: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.I, domCodes: ['KeyI'] },
  stats: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.S, domCodes: ['KeyS'] },
  skillMenu: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.K, domCodes: ['KeyK'] },
  slot1: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.ONE, domCodes: ['Digit1', 'Numpad1'] },
  slot2: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.TWO, domCodes: ['Digit2', 'Numpad2'] },
  slot3: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.THREE, domCodes: ['Digit3', 'Numpad3'] },
  slot4: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.FOUR, domCodes: ['Digit4', 'Numpad4'] },
  slot5: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.FIVE, domCodes: ['Digit5', 'Numpad5'] },
  slot6: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.SIX, domCodes: ['Digit6', 'Numpad6'] },
  slot7: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.SEVEN, domCodes: ['Digit7', 'Numpad7'] },
  slot8: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.EIGHT, domCodes: ['Digit8', 'Numpad8'] },
  slot9: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.NINE, domCodes: ['Digit9', 'Numpad9'] },
  slot0: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.ZERO, domCodes: ['Digit0', 'Numpad0'] },
  slotMinus: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.MINUS, domCodes: ['Minus', 'NumpadSubtract'] },
  luckySeven: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.SHIFT, domCodes: ['ShiftLeft', 'ShiftRight'] },
  shadowBarrage: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.Q, domCodes: ['KeyQ'] },
  drain: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.X, domCodes: ['KeyX'] },
  phantomDualStar: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.W, domCodes: ['KeyW'] },
  avenger: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.C, domCodes: ['KeyC'] },
  abyssRain: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.E, domCodes: ['KeyE'] },
  rasengan: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.V, domCodes: ['KeyV'] },
  gumihoTransformation: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.B, domCodes: ['KeyB'] },
  tripleStrikeSquad: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.N, domCodes: ['KeyN'] },
  heavenlyThunderOrb: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.R, domCodes: ['KeyR'] },
  aliasA: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.A, domCodes: ['KeyA'] },
  aliasD: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.D, domCodes: ['KeyD'] },
  aliasF: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.F, domCodes: ['KeyF'] },
};

const ACTION_KEY_NAMES: readonly [GameplayKeyName, ActionSlotKey][] = [
  ['slot1', '1'], ['slot2', '2'], ['slot3', '3'], ['slot4', '4'], ['slot5', '5'],
  ['slot6', '6'], ['slot7', '7'], ['slot8', '8'], ['slot9', '9'], ['slot0', '0'],
  ['slotMinus', '-'],
];

const ADDITIONAL_KEY_NAMES: readonly [GameplayKeyName, AdditionalSkillKey][] = [
  ['luckySeven', 'Shift'], ['shadowBarrage', 'Q'], ['phantomDualStar', 'W'],
  ['abyssRain', 'E'], ['heavenlyThunderOrb', 'R'], ['aliasA', 'A'], ['stats', 'S'],
  ['aliasD', 'D'], ['aliasF', 'F'], ['drain', 'X'], ['avenger', 'C'], ['rasengan', 'V'],
];

export function createFocusSafeKeys<T extends string>(
  scene: Phaser.Scene,
  definitions: FocusSafeKeyMap<T>,
): Record<T, Phaser.Input.Keyboard.Key> {
  const keyboard = scene.input.keyboard;
  if (!keyboard) {
    throw new Error("키보드 입력을 사용할 수 없습니다.");
  }

  const canvas = scene.game.canvas;
  const domCodes = new Set<string>();
  const keys = {} as Record<T, Phaser.Input.Keyboard.Key>;

  for (const name in definitions) {
    const definition = definitions[name];
    for (const domCode of definition.domCodes) {
      domCodes.add(domCode);
    }
    keys[name] = keyboard.addKey(definition.keyboardCode);
  }

  const guard = (event: KeyboardEvent) => {
    if (document.activeElement !== canvas) {
      return;
    }

    if (!domCodes.has(event.code)) {
      return;
    }

    event.preventDefault();
  };

  // Phaser의 KeyboardManager는 preventDefault된 keydown을 폐기하므로,
  // 가드는 버블 단계(Phaser 처리 후)에서 브라우저 기본 동작만 막는다(SPEC §6.1).
  window.addEventListener("keydown", guard, false);
  window.addEventListener("keyup", guard, false);

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener("keydown", guard, false);
    window.removeEventListener("keyup", guard, false);
  });

  return keys;
}

export function createGameplayInput(
  scene: Phaser.Scene,
  getShortcuts: () => SkillShortcuts = createDefaultSkillShortcuts,
): GameplayInput {
  const keys = createFocusSafeKeys(scene, GAMEPLAY_KEY_DEFINITIONS);

  return {
    keys,
    getIntent: () => {
      const leftHeld = keys.left.isDown;
      const rightHeld = keys.right.isDown;
      const upHeld = keys.up.isDown;
      const downHeld = keys.down.isDown;
      const horizontal = leftHeld === rightHeld ? 0 : leftHeld ? -1 : 1;

      const shortcuts = getShortcuts();
      const skillPressed = getJustPressedSkill(keys, shortcuts);
      return {
        horizontal,
        jumpPressed: Phaser.Input.Keyboard.JustDown(keys.jump),
        attackPressed: Phaser.Input.Keyboard.JustDown(keys.attack),
        downHeld,
        upHeld,
        interactPressed: Phaser.Input.Keyboard.JustDown(keys.up),
        skillPressed,
        collectPressed: Phaser.Input.Keyboard.JustDown(keys.collect),
        menuPressed: Phaser.Input.Keyboard.JustDown(keys.menu),
        inventoryPressed: Phaser.Input.Keyboard.JustDown(keys.inventory),
        statsPressed: skillPressed === null && getSkillForAdditionalKey(shortcuts, 'S') === null
          && Phaser.Input.Keyboard.JustDown(keys.stats),
        skillMenuPressed: Phaser.Input.Keyboard.JustDown(keys.skillMenu),
      };
    },
  };
}

function getJustPressedSkill(
  keys: Record<GameplayKeyName, Phaser.Input.Keyboard.Key>,
  shortcuts: SkillShortcuts,
): SkillId | null {
  for (const [keyName, slotKey] of ACTION_KEY_NAMES) {
    if (Phaser.Input.Keyboard.JustDown(keys[keyName])) return getSkillForActionKey(shortcuts, slotKey);
  }
  for (const [keyName, aliasKey] of ADDITIONAL_KEY_NAMES) {
    const skillId = getSkillForAdditionalKey(shortcuts, aliasKey);
    if (skillId !== null && Phaser.Input.Keyboard.JustDown(keys[keyName])) return skillId;
  }
  if (Phaser.Input.Keyboard.JustDown(keys.gumihoTransformation)) return 'gumiho-transformation';
  if (Phaser.Input.Keyboard.JustDown(keys.tripleStrikeSquad)) return 'triple-strike-squad';
  return null;
}
