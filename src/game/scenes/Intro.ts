import Phaser from 'phaser';
import introBackgroundUrl from '../assets/ui/credits-background-v1.webp?url';
import { GAME_SUBTITLE_KO, GAME_TITLE_KO } from '../data/game-brand';
import { openDomOverlay } from '../ui/dom-overlay';
import { clearGameplayDataset } from './shared';

const INTRO_HEADING_ID = 'intro-game-title';
const INTRO_LORE_ID = 'intro-lore';

export class IntroScene extends Phaser.Scene {
  public constructor() {
    super('Intro');
  }

  public create(): void {
    clearGameplayDataset();
    this.cameras.main.setBackgroundColor('#050a14');

    const screen = document.createElement('section');
    screen.className = 'intro-screen';
    screen.setAttribute('aria-labelledby', INTRO_HEADING_ID);
    screen.style.backgroundImage = `linear-gradient(90deg, rgba(3, 8, 18, 0.94) 0%, rgba(5, 10, 22, 0.7) 48%, rgba(3, 8, 18, 0.38) 100%), url(${introBackgroundUrl})`;

    const header = createIntroHeader();
    const content = document.createElement('div');
    content.className = 'intro-screen__content';

    const copy = document.createElement('div');
    copy.className = 'intro-hero';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'intro-eyebrow intro-reveal';
    eyebrow.textContent = 'A NIGHTBOUND CHRONICLE';

    const heading = document.createElement('h1');
    heading.id = INTRO_HEADING_ID;
    heading.className = 'intro-title intro-reveal';
    const title = document.createElement('span');
    title.textContent = GAME_TITLE_KO;
    const subtitle = document.createElement('span');
    subtitle.className = 'intro-title__subtitle';
    subtitle.textContent = GAME_SUBTITLE_KO;
    heading.append(title, subtitle);

    const description = document.createElement('p');
    description.className = 'intro-description intro-reveal';
    description.textContent = '달빛 아래 끊어진 길을 잇고, 심연에 잠든 기록을 되찾으세요. 한 명의 전령이 열한 지역의 밤을 가로지릅니다.';

    const actions = document.createElement('div');
    actions.className = 'intro-actions intro-reveal';
    const startButton = createButton('게임 시작', 'intro-button intro-button--primary');
    startButton.id = 'intro-start-button';
    const loreButton = createButton('세계관 보기', 'intro-button intro-button--quiet');
    loreButton.setAttribute('aria-expanded', 'false');
    loreButton.setAttribute('aria-controls', INTRO_LORE_ID);
    actions.append(startButton, loreButton);

    const lore = document.createElement('section');
    lore.id = INTRO_LORE_ID;
    lore.className = 'intro-lore';
    lore.hidden = true;
    const loreHeading = document.createElement('h2');
    loreHeading.textContent = '심연의 기록';
    const loreCopy = document.createElement('p');
    loreCopy.textContent = '밤의 경계가 무너진 뒤, 월영전령은 각 지역에 흩어진 기억의 파편을 회수해 마지막 수호자의 진실에 다가갑니다.';
    lore.append(loreHeading, loreCopy);

    copy.append(eyebrow, heading, description, actions, lore);
    content.append(copy, createJourneyCard());
    screen.append(header, content, createIntroFooter());

    const close = openDomOverlay(this, screen, { backdropClassName: 'overlay-backdrop--cinematic' });
    const startGame = () => {
      close();
      this.scene.start('Login');
    };
    startButton.addEventListener('click', startGame);
    loreButton.addEventListener('click', () => {
      const expanded = loreButton.getAttribute('aria-expanded') === 'true';
      loreButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      lore.hidden = expanded;
      loreButton.textContent = expanded ? '세계관 보기' : '세계관 닫기';
    });
  }
}

function createIntroHeader(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'intro-header intro-reveal';
  const brand = document.createElement('p');
  brand.className = 'intro-brand';
  brand.textContent = '月影 · MOONSHADOW ARCHIVE';
  const status = document.createElement('span');
  status.className = 'intro-status';
  status.textContent = 'LOCAL CHRONICLE';
  header.append(brand, status);
  return header;
}

function createJourneyCard(): HTMLElement {
  const card = document.createElement('aside');
  card.className = 'intro-journey intro-reveal';
  card.setAttribute('aria-label', '게임 여정 요약');
  const orbit = document.createElement('div');
  orbit.className = 'intro-orbit';
  orbit.setAttribute('aria-hidden', 'true');
  orbit.append(document.createElement('span'), document.createElement('span'), document.createElement('span'));
  const label = document.createElement('p');
  label.className = 'intro-journey__label';
  label.textContent = 'YOUR JOURNEY';
  const list = document.createElement('ul');
  list.className = 'intro-metrics';
  for (const [value, name] of [['11', '탐험 지역'], ['15', '전령 기술'], ['3', '심연 수호자']] as const) {
    const item = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = value;
    const text = document.createElement('span');
    text.textContent = name;
    item.append(strong, text);
    list.append(item);
  }
  card.append(orbit, label, list);
  return card;
}

function createIntroFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'intro-footer intro-reveal';
  const save = document.createElement('span');
  save.textContent = '진행 기록은 이 기기에 안전하게 저장됩니다.';
  const controls = document.createElement('span');
  controls.textContent = '키보드 · 터치 지원';
  footer.append(save, controls);
  return footer;
}

function createButton(label: string, className: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}
