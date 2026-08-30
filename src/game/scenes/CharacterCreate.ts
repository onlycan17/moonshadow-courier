import Phaser from 'phaser';
import { buildBoostCharacter, buildNoviceCharacter, validateForSave } from '../profile/create-character';
import { rollStats } from '../profile/dice-stats';
import { normalizeNickname, validateNickname, type NicknameValidationResult } from '../profile/nickname';
import type { CharacterStats, SlotNumber } from '../profile/types';
import { createOverlayPanel, openDomOverlay } from '../ui/dom-overlay';
import {
  clearGameplayDataset,
  createProfileRepository,
  getSlotStates,
  hasWritableEmptySlot,
  paintScene,
  type CharacterCreateSceneData,
  type CharacterSelectSceneData,
  type SlotState
} from './shared';

const STAT_KEYS = ['str', 'dex', 'int', 'luk'] as const;
const ROLL_ANIMATION_DURATION_MS = 450;
const INTERMEDIATE_ROLL_DELAYS_MS = [90, 210, 330] as const;

export class CharacterCreateScene extends Phaser.Scene {
  public constructor() {
    super('CharacterCreate');
  }

  public create(data: CharacterCreateSceneData = {}): void {
    clearGameplayDataset();
    paintScene(this, '캐릭터 생성', '닉네임과 주사위 능력치를 확정한 뒤 슬롯에 저장합니다.');

    const repository = createProfileRepository();
    const slotStates = getSlotStates(repository);
    const targetSlot = resolveTargetSlot(data.slot, slotStates);

    if (targetSlot === null) {
      this.openBlockedPanel('빈 슬롯이 없어 캐릭터를 만들 수 없습니다.', '캐릭터 선택으로 돌아가기');
      return;
    }

    const { panel, body } = createOverlayPanel(`캐릭터 생성 · ${targetSlot}번 슬롯`);
    const form = document.createElement('form');
    form.className = 'overlay-form overlay-form--wide';
    form.noValidate = true;

    const nicknameField = createNicknameField();
    const nicknameMessage = document.createElement('p');
    nicknameMessage.className = 'overlay-message';
    nicknameMessage.setAttribute('aria-live', 'polite');

    const statsSection = document.createElement('section');
    statsSection.className = 'overlay-section';
    const statsHeading = document.createElement('h3');
    statsHeading.className = 'overlay-section__title';
    statsHeading.textContent = '현재 능력치';
    const statsGrid = document.createElement('dl');
    statsGrid.className = 'stat-grid';
    const statValues = createStatValueMap(statsGrid);
    statsSection.append(statsHeading, statsGrid);

    const rollButton = document.createElement('button');
    rollButton.type = 'button';
    rollButton.className = 'overlay-button';
    rollButton.textContent = '주사위 굴리기';

    const boostField = document.createElement('label');
    boostField.className = 'overlay-checkbox';
    const boostCheckbox = document.createElement('input');
    boostCheckbox.type = 'checkbox';
    boostCheckbox.setAttribute('data-boost-toggle', 'true');
    const boostText = document.createElement('span');
    boostText.textContent = 'Lv.120 호카게 부스트';
    boostField.append(boostCheckbox, boostText);

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'overlay-button';
    submitButton.textContent = '생성';
    submitButton.disabled = true;

    const formMessage = document.createElement('p');
    formMessage.className = 'overlay-message';
    formMessage.setAttribute('aria-live', 'assertive');

    form.append(nicknameField.field, nicknameMessage, statsSection, rollButton, boostField, submitButton, formMessage);
    body.appendChild(form);

    const close = openDomOverlay(this, panel);
    const timeouts: number[] = [];
    let currentStats: CharacterStats | null = null;
    let isRolling = false;

    const clearRollTimers = () => {
      for (const timeoutId of timeouts) {
        window.clearTimeout(timeoutId);
      }
      timeouts.length = 0;
      isRolling = false;
    };

    const renderStats = (stats: CharacterStats | null) => {
      for (const statKey of STAT_KEYS) {
        statValues[statKey].textContent = stats === null ? '-' : String(stats[statKey]);
      }
    };

    const refreshButtons = () => {
      const normalizedNickname = normalizeNickname(nicknameField.input.value);
      const nicknameValidation = validateNickname(normalizedNickname);
      nicknameMessage.textContent = getNicknameMessage(nicknameValidation, normalizedNickname);
      nicknameMessage.dataset.state = nicknameValidation.ok ? 'valid' : 'invalid';
      nicknameField.input.setAttribute('aria-invalid', nicknameValidation.ok ? 'false' : 'true');
      const canSubmit = nicknameValidation.ok && currentStats !== null && !isRolling;
      submitButton.disabled = !canSubmit;
      rollButton.disabled = isRolling;
    };

    const scheduleTimeout = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(callback, delay);
      timeouts.push(timeoutId);
    };

    const startRollAnimation = () => {
      if (isRolling) {
        return;
      }

      clearRollTimers();
      isRolling = true;
      currentStats = null;
      formMessage.textContent = '';
      renderStats(null);
      refreshButtons();

      for (const delay of INTERMEDIATE_ROLL_DELAYS_MS) {
        scheduleTimeout(() => {
          renderStats(rollStats(randomFloat));
        }, delay);
      }

      scheduleTimeout(() => {
        currentStats = rollStats(randomFloat);
        renderStats(currentStats);
        clearRollTimers();
        refreshButtons();
      }, ROLL_ANIMATION_DURATION_MS);
    };

    nicknameField.input.addEventListener('input', () => {
      formMessage.textContent = '';
      refreshButtons();
    });

    nicknameField.input.addEventListener('blur', () => {
      nicknameField.input.value = normalizeNickname(nicknameField.input.value);
      refreshButtons();
    });

    rollButton.addEventListener('click', startRollAnimation);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (currentStats === null || isRolling) {
        return;
      }

      const saveValidation = validateForSave(nicknameField.input.value, currentStats);
      if (!saveValidation.ok) {
        formMessage.textContent = getSaveValidationMessage(saveValidation.reason);
        refreshButtons();
        return;
      }

      const character = boostCheckbox.checked
        ? buildBoostCharacter(saveValidation.nickname, currentStats)
        : buildNoviceCharacter(saveValidation.nickname, currentStats);
      const saveResult = repository.saveNewCharacter(targetSlot, character);

      if (!saveResult.ok) {
        if (saveResult.reason === 'occupied') {
          close();
          const nextData: CharacterSelectSceneData = { message: `${targetSlot}번 슬롯이 이미 사용 중입니다.` };
          this.scene.start('CharacterSelect', nextData);
          return;
        }

        formMessage.textContent = '저장할 수 없는 캐릭터 상태입니다. 입력값을 다시 확인해 주세요.';
        refreshButtons();
        return;
      }

      repository.setActiveSlot(targetSlot);
      close();
      this.scene.start('CharacterSelect');
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearRollTimers();
    });

    renderStats(null);
    refreshButtons();
  }

  private openBlockedPanel(message: string, buttonText: string): void {
    const { panel, body } = createOverlayPanel('캐릭터 생성 불가');
    const description = document.createElement('p');
    description.className = 'overlay-copy';
    description.textContent = message;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'overlay-button';
    button.textContent = buttonText;

    body.append(description, button);
    const close = openDomOverlay(this, panel);
    button.addEventListener('click', () => {
      close();
      this.scene.start('CharacterSelect', { message });
    });
  }
}

function createNicknameField(): { field: HTMLLabelElement; input: HTMLInputElement } {
  const field = document.createElement('label');
  field.className = 'overlay-field';

  const label = document.createElement('span');
  label.className = 'overlay-field__label';
  label.textContent = '닉네임';

  const input = document.createElement('input');
  input.className = 'overlay-field__input';
  input.type = 'text';
  input.maxLength = 24;
  input.setAttribute('autocomplete', 'nickname');

  field.append(label, input);
  return { field, input };
}

function createStatValueMap(statsGrid: HTMLElement): Record<(typeof STAT_KEYS)[number], HTMLElement> {
  return {
    str: appendStatRow(statsGrid, 'STR', 'str'),
    dex: appendStatRow(statsGrid, 'DEX', 'dex'),
    int: appendStatRow(statsGrid, 'INT', 'int'),
    luk: appendStatRow(statsGrid, 'LUK', 'luk')
  };
}

function appendStatRow(statsGrid: HTMLElement, label: string, statKey: (typeof STAT_KEYS)[number]): HTMLElement {
  const term = document.createElement('dt');
  term.className = 'stat-grid__label';
  term.textContent = label;

  const description = document.createElement('dd');
  description.className = 'stat-grid__value';
  description.setAttribute('data-stat', statKey);
  description.textContent = '-';

  statsGrid.append(term, description);
  return description;
}

function getNicknameMessage(validation: NicknameValidationResult, normalizedNickname: string): string {
  if (validation.ok) {
    return normalizedNickname.length === 0
      ? '닉네임은 2자 이상 12자 이하의 한글, 영문, 숫자만 사용할 수 있습니다.'
      : `사용 가능한 닉네임입니다: ${normalizedNickname}`;
  }

  switch (validation.reason) {
    case 'empty':
      return '닉네임을 입력해 주세요.';
    case 'tooShort':
      return '닉네임은 최소 2자여야 합니다.';
    case 'tooLong':
      return '닉네임은 최대 12자까지 가능합니다.';
    case 'invalidChars':
      return '닉네임은 한글, 영문, 숫자만 사용할 수 있습니다.';
  }
}

function getSaveValidationMessage(reason: 'empty' | 'tooShort' | 'tooLong' | 'invalidChars' | 'invalidStats'): string {
  if (reason === 'invalidStats') {
    return '능력치가 손상되었습니다. 다시 주사위를 굴려 주세요.';
  }

  return getNicknameMessage({ ok: false, reason }, '');
}

function resolveTargetSlot(
  preferredSlot: SlotNumber | undefined,
  slotStates: readonly [SlotState, SlotState, SlotState]
): SlotNumber | null {
  if (preferredSlot !== undefined) {
    const requestedSlot = getSlotStateByNumber(slotStates, preferredSlot);
    return requestedSlot.kind === 'empty' ? preferredSlot : null;
  }

  if (!hasWritableEmptySlot(slotStates)) {
    return null;
  }

  return getFirstWritableEmptySlot(slotStates);
}

function getFirstWritableEmptySlot(slotStates: readonly [SlotState, SlotState, SlotState]): SlotNumber | null {
  if (slotStates[0].kind === 'empty') {
    return 1;
  }
  if (slotStates[1].kind === 'empty') {
    return 2;
  }
  if (slotStates[2].kind === 'empty') {
    return 3;
  }
  return null;
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

function randomFloat(): number {
  return Math.random();
}
