import Phaser from "phaser";

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
  downHeld: boolean;
  upHeld: boolean;
  interactPressed: boolean;
}

export interface GameplayInput {
  keys: Record<GameplayKeyName, Phaser.Input.Keyboard.Key>;
  getIntent: () => GameplayIntent;
}

export type GameplayKeyName = "left" | "right" | "up" | "down" | "jump";

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
};

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

export function createGameplayInput(scene: Phaser.Scene): GameplayInput {
  const keys = createFocusSafeKeys(scene, GAMEPLAY_KEY_DEFINITIONS);

  return {
    keys,
    getIntent: () => {
      const leftHeld = keys.left.isDown;
      const rightHeld = keys.right.isDown;
      const upHeld = keys.up.isDown;
      const downHeld = keys.down.isDown;
      const horizontal = leftHeld === rightHeld ? 0 : leftHeld ? -1 : 1;

      return {
        horizontal,
        jumpPressed: Phaser.Input.Keyboard.JustDown(keys.jump),
        downHeld,
        upHeld,
        interactPressed: Phaser.Input.Keyboard.JustDown(keys.up),
      };
    },
  };
}
