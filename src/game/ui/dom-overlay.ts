import Phaser from 'phaser';

const APP_ROOT_ID = 'app';
const GAME_SHELL_ID = 'game-shell';
const GAME_STAGE_ID = 'game-stage';
const DOM_OVERLAY_ID = 'game-dom-overlay';

export function ensureGameShell(): HTMLElement {
  const appRoot = document.getElementById(APP_ROOT_ID);
  if (!(appRoot instanceof HTMLElement)) {
    throw new Error('앱 루트(#app)를 찾을 수 없습니다.');
  }

  const existingShell = document.getElementById(GAME_SHELL_ID);
  if (existingShell instanceof HTMLElement) {
    return existingShell;
  }

  const shell = document.createElement('main');
  shell.id = GAME_SHELL_ID;
  shell.className = 'game-shell';

  const stage = document.createElement('div');
  stage.id = GAME_STAGE_ID;
  stage.className = 'game-stage';

  const overlay = document.createElement('div');
  overlay.id = DOM_OVERLAY_ID;
  overlay.className = 'game-dom-overlay';
  overlay.setAttribute('aria-live', 'polite');

  shell.append(stage, overlay);
  appRoot.replaceChildren(shell);
  return shell;
}

export function getGameStageId(): string {
  return GAME_STAGE_ID;
}

export function focusGameCanvas(scene: Phaser.Scene): void {
  const canvas = scene.game.canvas;
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  canvas.tabIndex = 0;
  canvas.removeAttribute('aria-disabled');
  canvas.classList.remove('game-canvas--disabled');
  canvas.style.pointerEvents = 'auto';
  canvas.focus();
}

export function createOverlayPanel(title: string): { panel: HTMLElement; body: HTMLDivElement } {
  const panel = document.createElement('section');
  panel.className = 'overlay-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', title);

  const header = document.createElement('header');
  header.className = 'overlay-panel__header';

  const heading = document.createElement('h2');
  heading.className = 'overlay-panel__title';
  heading.textContent = title;

  const body = document.createElement('div');
  body.className = 'overlay-panel__body';

  header.appendChild(heading);
  panel.append(header, body);
  return { panel, body };
}

export function openDomOverlay(scene: Phaser.Scene, panel: HTMLElement): () => void {
  const overlayRoot = getOverlayRoot();
  const wrapper = document.createElement('div');
  wrapper.className = 'overlay-backdrop';
  wrapper.appendChild(panel);
  overlayRoot.replaceChildren(wrapper);
  setCanvasEnabled(scene, false);
  focusFirstControl(panel);

  let closed = false;
  const close = () => {
    if (closed) {
      return;
    }

    closed = true;
    wrapper.remove();
    setCanvasEnabled(scene, true);
    focusGameCanvas(scene);
  };

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, close);
  return close;
}

function getOverlayRoot(): HTMLElement {
  const overlayRoot = document.getElementById(DOM_OVERLAY_ID);
  if (!(overlayRoot instanceof HTMLElement)) {
    throw new Error('DOM 오버레이 루트를 찾을 수 없습니다.');
  }

  return overlayRoot;
}

function setCanvasEnabled(scene: Phaser.Scene, enabled: boolean): void {
  const canvas = scene.game.canvas;
  const keyboard = scene.input.keyboard;

  if (keyboard) {
    keyboard.enabled = enabled;
  }

  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  canvas.tabIndex = 0;
  canvas.style.pointerEvents = enabled ? 'auto' : 'none';
  canvas.classList.toggle('game-canvas--disabled', !enabled);

  if (!enabled) {
    canvas.setAttribute('aria-disabled', 'true');
    canvas.blur();
    return;
  }

  canvas.removeAttribute('aria-disabled');
}

function focusFirstControl(panel: HTMLElement): void {
  const target = panel.querySelector<HTMLElement>('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
  target?.focus();
}
