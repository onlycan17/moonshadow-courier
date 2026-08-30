import Phaser from 'phaser';
import { createOverlayPanel, openDomOverlay } from '../ui/dom-overlay';
import { paintScene } from './shared';

export class CharacterSelectScene extends Phaser.Scene {
  public constructor() {
    super('CharacterSelect');
  }

  public create(): void {
    paintScene(this, '캐릭터 선택', 'P1에서 슬롯 비교 UI가 추가될 예정인 자리입니다.');
    const { panel, body } = createOverlayPanel('캐릭터 선택 자리표시자');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'overlay-button';
    button.textContent = '다음';

    body.append(createDescription('현재는 Gameplay 진입 경로만 열어 둡니다.'), button);
    const close = openDomOverlay(this, panel);

    button.addEventListener('click', () => {
      close();
      this.scene.start('Gameplay');
    });
  }
}

function createDescription(text: string): HTMLParagraphElement {
  const description = document.createElement('p');
  description.className = 'overlay-copy';
  description.textContent = text;
  return description;
}
