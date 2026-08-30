import Phaser from 'phaser';
import { SKILL_IDS } from '../data/skill-catalog';
import { getJobLabel } from '../data/job-catalog';
import type { SlotNumber, StoredCharacterV1 } from '../profile/types';
import { createOverlayPanel, openDomOverlay } from '../ui/dom-overlay';
import {
  clearGameplayDataset,
  createProfileRepository,
  getSlotStates,
  hasFilledSlot,
  hasWritableEmptySlot,
  paintScene,
  type CharacterSelectSceneData,
  type SlotState
} from './shared';

const SLOT_NUMBERS: readonly SlotNumber[] = [1, 2, 3];

export class CharacterSelectScene extends Phaser.Scene {
  public constructor() {
    super('CharacterSelect');
  }

  public create(data: CharacterSelectSceneData = {}): void {
    clearGameplayDataset();
    paintScene(this, '캐릭터 선택', '저장된 슬롯을 비교하고 원하는 캐릭터로 게임에 진입합니다.');

    const repository = createProfileRepository();
    const slotStates = getSlotStates(repository);

    if (!hasFilledSlot(slotStates) && hasWritableEmptySlot(slotStates)) {
      this.scene.start('CharacterCreate');
      return;
    }

    const activeSlot = repository.getActiveSlot();
    let selectedSlot = getInitialSlot(activeSlot, slotStates);
    const { panel, body } = createOverlayPanel('캐릭터 선택');
    const layout = document.createElement('div');
    layout.className = 'select-layout';

    const cards = document.createElement('div');
    cards.className = 'slot-card-list';
    const detailPanel = document.createElement('section');
    detailPanel.className = 'overlay-section slot-detail';
    const message = document.createElement('p');
    message.className = 'overlay-message';
    message.setAttribute('aria-live', 'polite');
    message.textContent = data.message ?? '';

    const close = openDomOverlay(this, panel);

    const renderDetails = () => {
      const slotNumber = selectedSlot;
      const selectedCharacter = slotNumber === null ? null : getFilledCharacter(slotStates, slotNumber);
      detailPanel.replaceChildren();

      const heading = document.createElement('h3');
      heading.className = 'overlay-section__title';
      heading.textContent = '상세 정보';
      detailPanel.appendChild(heading);

      if (selectedCharacter === null || slotNumber === null) {
        const emptyText = document.createElement('p');
        emptyText.className = 'overlay-copy';
        emptyText.textContent = '왼쪽 슬롯에서 캐릭터를 선택해 주세요.';
        detailPanel.appendChild(emptyText);
        return;
      }

      detailPanel.append(
        createDetailList(selectedCharacter),
        createEnterButton(this, repository, close, slotNumber)
      );
    };

    const renderCards = () => {
      cards.replaceChildren();

      for (const slotNumber of SLOT_NUMBERS) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'slot-card';
        card.setAttribute('data-slot-index', String(slotNumber));
        card.setAttribute('aria-pressed', selectedSlot === slotNumber ? 'true' : 'false');

        const slotState = getSlotStateByNumber(slotStates, slotNumber);
        if (slotState.kind === 'empty') {
          card.classList.add('slot-card--empty');
          card.append(
            createCardTitle(`${slotNumber}번 슬롯`),
            createCardCopy('빈 슬롯'),
            createCardCopy('클릭하면 이 슬롯에 새 캐릭터를 만듭니다.')
          );
          card.addEventListener('click', () => {
            close();
            this.scene.start('CharacterCreate', { slot: slotNumber });
          });
          cards.appendChild(card);
          continue;
        }

        if (slotState.kind === 'corrupt') {
          card.classList.add('slot-card--corrupt');
          card.disabled = true;
          card.append(
            createCardTitle(`${slotNumber}번 슬롯`),
            createCardCopy('손상된 슬롯'),
            createCardCopy('저장 데이터가 올바르지 않아 사용할 수 없습니다.')
          );
          cards.appendChild(card);
          continue;
        }

        const character = slotState.character;
        card.dataset.nickname = character.nickname;
        card.classList.toggle('slot-card--selected', selectedSlot === slotNumber);
        card.append(
          createCardTitle(`${slotNumber}번 슬롯`),
          createCardCopy(character.nickname),
          createCardCopy(`Lv.${character.level} ${getJobLabel(character.job)}`)
        );
        card.addEventListener('click', () => {
          selectedSlot = slotNumber;
          renderCards();
          renderDetails();
        });
        cards.appendChild(card);
      }
    };

    layout.append(cards, detailPanel);
    body.append(message, layout);
    renderCards();
    renderDetails();
  }
}

function getInitialSlot(
  activeSlot: SlotNumber | null,
  slotStates: readonly [SlotState, SlotState, SlotState]
): SlotNumber | null {
  if (activeSlot !== null && getFilledCharacter(slotStates, activeSlot) !== null) {
    return activeSlot;
  }

  for (const slotNumber of SLOT_NUMBERS) {
    if (getFilledCharacter(slotStates, slotNumber) !== null) {
      return slotNumber;
    }
  }

  return null;
}

function getFilledCharacter(
  slotStates: readonly [SlotState, SlotState, SlotState],
  slot: SlotNumber
): StoredCharacterV1 | null {
  const slotState = getSlotStateByNumber(slotStates, slot);
  return slotState.kind === 'filled' ? slotState.character : null;
}

function getSlotStateByNumber(
  slotStates: readonly [SlotState, SlotState, SlotState],
  slot: SlotNumber
): SlotState {
  if (slot === 1) {
    return slotStates[0];
  }
  if (slot === 2) {
    return slotStates[1];
  }
  return slotStates[2];
}

function createCardTitle(text: string): HTMLHeadingElement {
  const title = document.createElement('h3');
  title.className = 'slot-card__title';
  title.textContent = text;
  return title;
}

function createCardCopy(text: string): HTMLParagraphElement {
  const copy = document.createElement('p');
  copy.className = 'slot-card__copy';
  copy.textContent = text;
  return copy;
}

function createDetailList(character: StoredCharacterV1): HTMLElement {
  const details = document.createElement('dl');
  details.className = 'detail-list';

  appendDetail(details, '닉네임', character.nickname);
  appendDetail(details, '직업', getJobLabel(character.job));
  appendDetail(details, '레벨', String(character.level));
  appendDetail(details, 'HP / MP', `${character.hp} / ${character.maxHp} · ${character.mp} / ${character.maxMp}`);
  appendDetail(details, 'EXP', String(character.exp));
  appendDetail(details, 'STR / DEX / INT / LUK', `${character.stats.str} / ${character.stats.dex} / ${character.stats.int} / ${character.stats.luk}`);
  appendDetail(details, 'AP / SP', `${character.ap} / ${character.sp}`);
  appendDetail(details, '메소', String(character.mesos));
  appendDetail(details, '스킬 요약', `${countLearnedSkills(character)} / ${SKILL_IDS.length}`);

  return details;
}

function appendDetail(details: HTMLElement, label: string, value: string): void {
  const term = document.createElement('dt');
  term.className = 'detail-list__label';
  term.textContent = label;

  const description = document.createElement('dd');
  description.className = 'detail-list__value';
  description.textContent = value;

  details.append(term, description);
}

function createEnterButton(
  scene: Phaser.Scene,
  repository: ReturnType<typeof createProfileRepository>,
  close: () => void,
  slot: SlotNumber
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'overlay-button';
  button.textContent = '진입';
  button.addEventListener('click', () => {
    repository.setActiveSlot(slot);
    close();
    scene.scene.start('Gameplay');
  });
  return button;
}

function countLearnedSkills(character: StoredCharacterV1): number {
  return SKILL_IDS.filter((skillId) => (character.skills[skillId] ?? 0) > 0).length;
}
