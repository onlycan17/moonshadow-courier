import Phaser from 'phaser';
import { getJobLabel } from '../data/job-catalog';
import { createFocusSafeKeys } from '../input/focus-safe-keys';
import { focusGameCanvas } from '../ui/dom-overlay';
import { createProfileRepository, createTextStyle, paintScene } from './shared';

export class GameplayScene extends Phaser.Scene {
  private keys: Record<string, Phaser.Input.Keyboard.Key> | null = null;

  private inputStateText: Phaser.GameObjects.Text | null = null;

  public constructor() {
    super('Gameplay');
  }

  public create(): void {
    const repository = createProfileRepository();
    const activeSlot = repository.getActiveSlot();

    if (activeSlot === null) {
      this.scene.start('CharacterCreate');
      return;
    }

    const character = repository.loadSlot(activeSlot);
    if (character === null) {
      this.scene.start('CharacterCreate');
      return;
    }

    paintScene(this, 'Gameplay', '선택한 슬롯의 현재 캐릭터 정보를 임시 월드에 표시합니다.');

    const world = this.add.rectangle(640, 410, 960, 360, 0x2f6d54, 1);
    world.setStrokeStyle(3, 0x9fe5c2);

    this.add
      .text(640, 390, `Lv.${character.level} ${getJobLabel(character.job)} ${character.nickname}`, createTextStyle(28, '#effff7'))
      .setOrigin(0.5);
    this.inputStateText = this.add.text(640, 560, '활성 입력: 없음', createTextStyle(18, '#dbe7ff')).setOrigin(0.5);

    this.keys = createFocusSafeKeys(this, {
      left: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.LEFT, domCode: 'ArrowLeft' },
      right: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.RIGHT, domCode: 'ArrowRight' },
      up: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.UP, domCode: 'ArrowUp' },
      down: { keyboardCode: Phaser.Input.Keyboard.KeyCodes.DOWN, domCode: 'ArrowDown' }
    });

    document.body.dataset.activeNickname = character.nickname;
    document.body.dataset.activeLevel = String(character.level);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.keys = null;
      this.inputStateText = null;
      delete document.body.dataset.activeNickname;
      delete document.body.dataset.activeLevel;
    });

    focusGameCanvas(this);
  }

  public update(): void {
    if (this.keys === null || this.inputStateText === null) {
      return;
    }

    this.inputStateText.setText(`활성 입력: ${describeActiveKeys(this.keys)}`);
  }
}

function describeActiveKeys(keys: Record<string, Phaser.Input.Keyboard.Key>): string {
  const active = Object.entries(keys)
    .filter(([, key]) => key.isDown)
    .map(([name]) => name);

  return active.length > 0 ? active.join(', ') : '없음';
}
