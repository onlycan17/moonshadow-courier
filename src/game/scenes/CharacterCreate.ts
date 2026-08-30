import Phaser from 'phaser';
import { createOverlayPanel, openDomOverlay } from '../ui/dom-overlay';
import { paintScene } from './shared';

export class CharacterCreateScene extends Phaser.Scene {
  public constructor() {
    super('CharacterCreate');
  }

  public create(): void {
    paintScene(this, '캐릭터 생성', 'P1에서 실제 닉네임과 능력치 폼이 들어올 자리입니다.');
    const { panel, body } = createOverlayPanel('캐릭터 생성 자리표시자');
    body.append(createDescription('지금은 다음 단계로 이동하는 최소 흐름만 제공합니다.'), createNextButton(this, 'CharacterSelect'));
    openDomOverlay(this, panel);
  }
}

function createDescription(text: string): HTMLParagraphElement {
  const description = document.createElement('p');
  description.className = 'overlay-copy';
  description.textContent = text;
  return description;
}

function createNextButton(scene: Phaser.Scene, nextSceneKey: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'overlay-button';
  button.textContent = '다음';
  button.addEventListener('click', () => {
    scene.scene.start(nextSceneKey);
  });
  return button;
}
