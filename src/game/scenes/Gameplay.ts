import Phaser from 'phaser';
import { createFocusSafeKeys } from '../input/focus-safe-keys';
import { focusGameCanvas } from '../ui/dom-overlay';
import { createTextStyle, paintScene } from './shared';

export class GameplayScene extends Phaser.Scene {
  public constructor() {
    super('Gameplay');
  }

  public create(): void {
    paintScene(this, 'Gameplay', '임시 도형과 포커스 안전 입력 계층이 동작하는지 확인합니다.');

    const world = this.add.rectangle(640, 410, 960, 360, 0x2f6d54, 1);
    world.setStrokeStyle(3, 0x9fe5c2);

    this.add.text(640, 410, '임시 월드 영역', createTextStyle(24, '#effff7')).setOrigin(0.5);
    const inputState = this.add.text(640, 560, '활성 입력: 없음', createTextStyle(18, '#dbe7ff')).setOrigin(0.5);

    const keys = createFocusSafeKeys(this, {
      left: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.LEFT, domCode: 'ArrowLeft' },
      right: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.RIGHT, domCode: 'ArrowRight' },
      up: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.UP, domCode: 'ArrowUp' },
      down: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.DOWN, domCode: 'ArrowDown' }
    });

    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      inputState.setText(`활성 입력: ${describeActiveKeys(keys)}`);
    });

    focusGameCanvas(this);
  }
}

function describeActiveKeys(keys: Record<string, Phaser.Input.Keyboard.Key>): string {
  const active = Object.entries(keys)
    .filter(([, key]) => key.isDown)
    .map(([name]) => name);

  return active.length > 0 ? active.join(', ') : '없음';
}
