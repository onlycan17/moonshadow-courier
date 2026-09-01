import Phaser from 'phaser';
import loginBackgroundUrl from '../assets/ui/credits-background-v1.webp?url';
import { GAME_FULL_TITLE_KO, GAME_TITLE_EN } from '../data/game-brand';
import { openDomOverlay } from '../ui/dom-overlay';
import { nextSceneAfterLogin } from '../ui/flow-rules';
import { clearGameplayDataset, createProfileRepository } from './shared';

const LOGIN_TITLE_ID = 'login-panel-title';
const LOGIN_HELP_ID = 'login-panel-help';

export class LoginScene extends Phaser.Scene {
  public constructor() {
    super('Login');
  }

  public create(): void {
    clearGameplayDataset();
    this.cameras.main.setBackgroundColor('#050a14');

    const repository = createProfileRepository();
    const screen = createLoginScreen();
    const { form, idInput, passwordInput, submitButton, passwordToggle, backButton } = screen.controls;
    const close = openDomOverlay(this, screen.root, { backdropClassName: 'overlay-backdrop--cinematic' });

    const refresh = () => {
      submitButton.disabled = !(hasText(idInput.value) && hasText(passwordInput.value));
    };

    form.addEventListener('input', refresh);
    passwordToggle.addEventListener('click', () => {
      const revealsPassword = passwordInput.type === 'password';
      passwordInput.type = revealsPassword ? 'text' : 'password';
      passwordToggle.setAttribute('aria-pressed', revealsPassword ? 'true' : 'false');
      passwordToggle.textContent = revealsPassword ? '숨기기' : '표시';
      passwordInput.focus();
    });
    backButton.addEventListener('click', () => {
      close();
      this.scene.start('Intro');
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (submitButton.disabled) return;
      const nextScene = nextSceneAfterLogin(repository.hasAnyProfile());
      close();
      this.scene.start(nextScene);
    });

    refresh();
  }
}

interface LoginScreenControls {
  form: HTMLFormElement;
  idInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  submitButton: HTMLButtonElement;
  passwordToggle: HTMLButtonElement;
  backButton: HTMLButtonElement;
}

function createLoginScreen(): { root: HTMLElement; controls: LoginScreenControls } {
  const root = document.createElement('section');
  root.className = 'auth-screen';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', LOGIN_TITLE_ID);
  root.style.backgroundImage = `linear-gradient(105deg, rgba(3, 8, 18, 0.84), rgba(5, 10, 22, 0.5)), url(${loginBackgroundUrl})`;

  const layout = document.createElement('div');
  layout.className = 'auth-layout';
  const story = createStoryPanel();
  const access = document.createElement('div');
  access.className = 'auth-access';

  const header = document.createElement('header');
  header.className = 'auth-access__header';
  const step = document.createElement('span');
  step.className = 'auth-kicker';
  step.textContent = 'PLAYER ACCESS · 01';
  const heading = document.createElement('h2');
  heading.id = LOGIN_TITLE_ID;
  heading.textContent = '기록에 접속하기';
  const help = document.createElement('p');
  help.id = LOGIN_HELP_ID;
  help.textContent = '이 데모는 실제 계정 서버에 연결하지 않으며 입력한 비밀번호를 저장하지 않습니다.';
  header.append(step, heading, help);

  const form = document.createElement('form');
  form.className = 'auth-form';
  form.noValidate = true;
  form.setAttribute('aria-describedby', LOGIN_HELP_ID);

  const idField = createAuthField('전령 ID', 'text', 'username', 'login-id', '이 기기에서 사용할 임의의 아이디');
  const passwordField = createAuthField('암호문', 'password', 'current-password', 'login-password', '저장되지 않으며 이번 접속에만 사용');
  const passwordToggle = document.createElement('button');
  passwordToggle.type = 'button';
  passwordToggle.className = 'auth-password-toggle';
  passwordToggle.setAttribute('aria-pressed', 'false');
  passwordToggle.setAttribute('aria-controls', passwordField.input.id);
  passwordToggle.textContent = '표시';
  passwordField.inputWrap.append(passwordToggle);

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'intro-button intro-button--primary auth-submit';
  submitButton.textContent = '월영전령 시작';
  submitButton.disabled = true;

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'intro-button intro-button--quiet auth-back';
  backButton.textContent = '인트로로 돌아가기';

  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'auth-actions';
  buttonGroup.append(submitButton, backButton);

  const localBadge = document.createElement('p');
  localBadge.className = 'auth-local-badge';
  localBadge.textContent = '● LOCAL SAVE · 최대 3개 캐릭터 슬롯';
  form.append(idField.field, passwordField.field, buttonGroup, localBadge);
  access.append(header, form);
  layout.append(story, access);
  root.append(layout);

  return {
    root,
    controls: {
      form,
      idInput: idField.input,
      passwordInput: passwordField.input,
      submitButton,
      passwordToggle,
      backButton,
    },
  };
}

function createStoryPanel(): HTMLElement {
  const story = document.createElement('aside');
  story.className = 'auth-story';
  const brand = document.createElement('p');
  brand.className = 'auth-story__brand';
  brand.textContent = '月影 · MOONSHADOW';
  const title = document.createElement('p');
  title.className = 'auth-story__title';
  title.textContent = GAME_FULL_TITLE_KO;
  const english = document.createElement('p');
  english.className = 'auth-story__english';
  english.textContent = GAME_TITLE_EN;
  const quote = document.createElement('blockquote');
  quote.textContent = '“밤이 길수록, 전령의 길은 더욱 선명해진다.”';
  const chapter = document.createElement('div');
  chapter.className = 'auth-chapter';
  const chapterLabel = document.createElement('span');
  chapterLabel.textContent = 'CHAPTER 01';
  const chapterTitle = document.createElement('strong');
  chapterTitle.textContent = '달빛 아래의 첫 번째 기록';
  chapter.append(chapterLabel, chapterTitle);
  story.append(brand, title, english, quote, chapter);
  return story;
}

function createAuthField(
  labelText: string,
  type: string,
  autocomplete: HTMLInputElement['autocomplete'],
  id: string,
  hintText: string
): { field: HTMLLabelElement; input: HTMLInputElement; inputWrap: HTMLDivElement } {
  const field = document.createElement('label');
  field.className = 'auth-field';
  field.htmlFor = id;
  const label = document.createElement('span');
  label.className = 'auth-field__label';
  label.textContent = labelText;
  const inputWrap = document.createElement('div');
  inputWrap.className = 'auth-input-wrap';
  const input = document.createElement('input');
  input.id = id;
  input.className = 'auth-input';
  input.type = type;
  input.autocomplete = autocomplete;
  input.required = true;
  const hint = document.createElement('span');
  hint.className = 'auth-field__hint';
  hint.textContent = hintText;
  inputWrap.append(input);
  field.append(label, inputWrap, hint);
  return { field, input, inputWrap };
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}
