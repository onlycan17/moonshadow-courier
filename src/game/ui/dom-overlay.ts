import Phaser from 'phaser';

const APP_ROOT_ID = 'app';
const GAME_SHELL_ID = 'game-shell';
const GAME_STAGE_ID = 'game-stage';
const DOM_OVERLAY_ID = 'game-dom-overlay';

const TOUCH_KEY_BINDINGS = [
  ['←', 'ArrowLeft', 'ArrowLeft'], ['→', 'ArrowRight', 'ArrowRight'], ['↓', 'ArrowDown', 'ArrowDown'],
  ['이동', 'ArrowUp', 'ArrowUp'], ['점프', 'Alt', 'AltLeft'], ['줍기', 'z', 'KeyZ'], ['공격', 'Control', 'ControlLeft'],
  ['기술1', '1', 'Digit1'], ['기술2', '2', 'Digit2'], ['기술3', '3', 'Digit3'], ['기술4', '4', 'Digit4'], ['MENU', 'Escape', 'Escape'],
] as const;

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

  const touchControls = document.createElement('nav');
  touchControls.className = 'touch-controls';
  touchControls.setAttribute('aria-label', '터치 게임 조작');
  for (const [label, key, code] of TOUCH_KEY_BINDINGS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'touch-control-button';
    button.textContent = label;
    const release = (event: PointerEvent) => { event.preventDefault(); dispatchTouchKey('keyup', key, code); };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      document.querySelector<HTMLCanvasElement>('canvas')?.focus();
      dispatchTouchKey('keydown', key, code);
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    touchControls.append(button);
  }

  shell.append(stage, touchControls, overlay);
  appRoot.replaceChildren(shell);
  return shell;
}

function dispatchTouchKey(type: 'keydown' | 'keyup', key: string, code: string): void {
  const keyCodes: Record<string, number> = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, AltLeft: 18, ControlLeft: 17, KeyZ: 90, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Escape: 27 };
  const event = new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'keyCode', { value: keyCodes[code] ?? 0 });
  window.dispatchEvent(event);
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

export interface DomOverlayOptions {
  backdropClassName?: string;
}

export function openDomOverlay(scene: Phaser.Scene, panel: HTMLElement, options: DomOverlayOptions = {}): () => void {
  const overlayRoot = getOverlayRoot();
  const wrapper = document.createElement('div');
  wrapper.className = 'overlay-backdrop';
  if (options.backdropClassName !== undefined) wrapper.classList.add(options.backdropClassName);
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
