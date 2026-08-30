import Phaser from 'phaser';

export type FocusSafeKeyDefinition = {
  keyboardCode: number;
  domCode: string;
};

export type FocusSafeKeyMap<T extends string> = Record<T, FocusSafeKeyDefinition>;

export function createFocusSafeKeys<T extends string>(
  scene: Phaser.Scene,
  definitions: FocusSafeKeyMap<T>
): Record<T, Phaser.Input.Keyboard.Key> {
  const keyboard = scene.input.keyboard;
  if (!keyboard) {
    throw new Error('키보드 입력을 사용할 수 없습니다.');
  }

  const canvas = scene.game.canvas;
  const domCodes = new Set<string>();
  const keys = {} as Record<T, Phaser.Input.Keyboard.Key>;

  for (const name in definitions) {
    const definition = definitions[name];
    domCodes.add(definition.domCode);
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

  window.addEventListener('keydown', guard, true);
  window.addEventListener('keyup', guard, true);

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener('keydown', guard, true);
    window.removeEventListener('keyup', guard, true);
  });

  return keys;
}
