import Phaser from 'phaser';
import { createOverlayPanel, openDomOverlay } from '../ui/dom-overlay';
import { paintScene } from './shared';

export class LoginScene extends Phaser.Scene {
  public constructor() {
    super('Login');
  }

  public create(): void {
    paintScene(this, '로그인', '임시 접근 폼으로 다음 화면 흐름을 검증합니다.');
    const { panel, body } = createOverlayPanel('임시 로그인');
    const form = document.createElement('form');
    form.className = 'overlay-form';

    const idInput = createField('아이디', 'text', 'username');
    const passwordInput = createField('비밀번호', 'password', 'current-password');
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'overlay-button';
    submitButton.textContent = '로그인';
    submitButton.disabled = true;

    const refresh = () => {
      submitButton.disabled = !(hasText(idInput.input.value) && hasText(passwordInput.input.value));
    };

    form.addEventListener('input', refresh);
    form.append(idInput.field, passwordInput.field, submitButton);
    body.appendChild(form);
    const close = openDomOverlay(this, panel);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (submitButton.disabled) {
        return;
      }

      close();
      this.scene.start('CharacterCreate');
    });
  }
}

function createField(labelText: string, type: string, autocomplete: string): { field: HTMLLabelElement; input: HTMLInputElement } {
  const field = document.createElement('label');
  field.className = 'overlay-field';

  const label = document.createElement('span');
  label.className = 'overlay-field__label';
  label.textContent = labelText;

  const input = document.createElement('input');
  input.className = 'overlay-field__input';
  input.type = type;
  input.setAttribute('autocomplete', autocomplete);

  field.append(label, input);
  return { field, input };
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}
