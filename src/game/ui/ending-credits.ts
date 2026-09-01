import Phaser from 'phaser';
import { GAME_FULL_TITLE_KO } from '../data/game-brand';
import creditsBackgroundUrl from '../assets/ui/credits-background-v1.webp?url';
import { createOverlayPanel, openDomOverlay } from './dom-overlay';

export function openEndingCredits(scene: Phaser.Scene, onClose: () => void): () => void {
  const { panel, body } = createOverlayPanel(`${GAME_FULL_TITLE_KO} · 엔딩 크레딧`);
  panel.classList.add('ending-credits');
  panel.style.backgroundImage = `linear-gradient(rgba(4, 9, 20, 0.38), rgba(4, 9, 20, 0.74)), url(${creditsBackgroundUrl})`;
  const lines = [
    ['시스템·던전·몬스터·캐릭터·스킬·FX·테스트', '임상진 with Codex'],
    ['게임 레퍼런스', '메이플스토리'],
    ['3D 원본 제작 도구', 'Tripo 3D'],
    ['감사합니다', '계속해서 모든 지역을 자유롭게 플레이할 수 있습니다.'],
  ] as const;
  for (const [title, credit] of lines) {
    const section = document.createElement('section');
    section.className = 'overlay-section ending-credits__line';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const text = document.createElement('p');
    text.textContent = credit;
    section.append(heading, text);
    body.append(section);
  }
  const continueButton = document.createElement('button');
  continueButton.type = 'button';
  continueButton.className = 'overlay-button';
  continueButton.textContent = '계속 플레이';
  body.append(continueButton);
  let closeOverlay = openDomOverlay(scene, panel);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    window.clearTimeout(timeout);
    window.removeEventListener('keydown', keyHandler);
    closeOverlay();
    onClose();
  };
  const keyHandler = (event: KeyboardEvent) => { if (event.code === 'Escape') close(); };
  continueButton.addEventListener('click', close);
  window.addEventListener('keydown', keyHandler);
  const timeout = window.setTimeout(close, 18_000);
  return close;
}
