import Phaser from 'phaser';
import { SHURIKEN_CATALOG, type ExtendedProfile, type ItemId, type ShurikenId } from '../inventory/economy-rules';
import type { QuestState } from '../quests/quest-rules';
import { loadAudioSettings, saveAudioSettings } from '../settings/audio-settings';
import { JOB_LABELS_KO } from '../data/job-catalog';
import { SKILL_IDS, SKILL_LABELS_KO, type SkillId } from '../data/skill-catalog';
import {
  ACTION_SLOT_KEYS,
  ACTIVE_SKILL_IDS,
  ADDITIONAL_SKILL_KEYS,
  type AdditionalSkillKey,
  type SkillShortcuts,
} from '../skills/skill-shortcut-rules';
import type { StoredCharacterV2 } from '../profile/types';
import { createOverlayPanel, openDomOverlay } from './dom-overlay';
import { getSkillIconAsset } from '../assets/skill-icon-assets';

export type GameplayPanelKind = 'menu' | 'inventory' | 'stats' | 'skills' | 'shortcuts';

export interface GameplayMenuActions {
  switchPanel: (kind: GameplayPanelKind) => void;
  useItem: (itemId: 'recovery-potion' | 'experience-book') => void;
  buyItem: (itemId: ItemId) => void;
  buyShuriken: (id: ShurikenId) => void;
  equipShuriken: (id: ShurikenId) => void;
  allocateStat: (stat: 'str' | 'dex' | 'int' | 'luk') => void;
  setAutoDistribute: (enabled: boolean) => void;
  levelSkill: (skillId: SkillId) => void;
  swapActionSlots: (fromIndex: number, toIndex: number) => void;
  setAdditionalSkill: (key: AdditionalSkillKey, skillId: SkillId | null) => void;
  handleJobExam: () => void;
  handleExpedition: () => void;
  registerPet: () => void;
  onClose: () => void;
}

const ITEM_LABELS: Record<ItemId, string> = {
  'recovery-potion': '회복 물약',
  'experience-book': '경험의 서',
  mungpuccino: '멍푸치노',
  'revival-charm': '부활의 부적',
};

export function openGameplayPanel(scene: Phaser.Scene, kind: GameplayPanelKind, character: StoredCharacterV2, economy: ExtendedProfile, quests: QuestState, shortcuts: SkillShortcuts, actions: GameplayMenuActions): () => void {
  const titles: Record<GameplayPanelKind, string> = { menu: '전체 메뉴', inventory: '인벤토리 · 상점', stats: '능력치 · 표창 장비', skills: '스킬', shortcuts: '스킬 단축키' };
  const { panel, body } = createOverlayPanel(titles[kind]);
  panel.classList.add('overlay-panel--gameplay');
  const header = panel.querySelector('.overlay-panel__header');
  const closeButton = makeButton('닫기', () => close(), 'overlay-button overlay-button--compact');
  header?.append(closeButton);

  if (kind === 'menu') renderMenu(body, character, quests, actions);
  if (kind === 'inventory') renderInventory(body, economy, actions);
  if (kind === 'stats') renderStats(body, character, economy, actions);
  if (kind === 'skills') renderSkills(body, character, actions);
  if (kind === 'shortcuts') renderShortcuts(body, shortcuts, actions);

  let closeOverlay = openDomOverlay(scene, panel);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', onKeyDown);
    closeOverlay();
    actions.onClose();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code !== 'Escape') return;
    event.preventDefault();
    close();
  };
  window.addEventListener('keydown', onKeyDown);
  return close;
}

function renderMenu(body: HTMLDivElement, character: StoredCharacterV2, quests: QuestState, actions: GameplayMenuActions): void {
  body.append(copy(`Lv.${character.level} ${JOB_LABELS_KO[character.job]} ${character.nickname}`));
  const nav = section('기능');
  nav.append(
    makeButton('인벤토리 · 상점 (I)', () => actions.switchPanel('inventory')),
    makeButton('능력치 · 장비 (S)', () => actions.switchPanel('stats')),
    makeButton('스킬 · SP (K)', () => actions.switchPanel('skills')),
    makeButton('스킬 단축키', () => actions.switchPanel('shortcuts')),
  );
  body.append(nav);

  const quest = section('퀘스트');
  quest.append(copy(jobExamSummary(quests)), makeButton(quests.jobExam.status === 'ready' ? '전직 완료 보고' : '전직 시험 수락', actions.handleJobExam));
  if (character.level >= 100) quest.append(copy(`깨어난 던전 회랑: ${quests.expeditionStage}`), makeButton('원정 수락/보고', actions.handleExpedition));
  body.append(quest);

  const pet = section('동료 두아');
  pet.append(copy('멍푸치노를 보유하면 두아를 등록해 주변 전리품을 자동으로 회수할 수 있습니다.'), makeButton('두아 등록', actions.registerPet));
  body.append(pet);

  const audio = section('환경설정');
  const settings = loadAudioSettings();
  const mute = document.createElement('input');
  mute.type = 'checkbox';
  mute.checked = settings.muted;
  const muteLabel = document.createElement('label');
  muteLabel.className = 'overlay-checkbox';
  muteLabel.append(mute, document.createTextNode('음소거'));
  mute.addEventListener('change', () => saveAudioSettings({ ...loadAudioSettings(), muted: mute.checked }));
  audio.append(muteLabel, rangeControl('BGM 음량', settings.bgmVolume, (value) => saveAudioSettings({ ...loadAudioSettings(), bgmVolume: value })), rangeControl('효과음 음량', settings.sfxVolume, (value) => saveAudioSettings({ ...loadAudioSettings(), sfxVolume: value })));
  body.append(audio);
}

function renderInventory(body: HTMLDivElement, economy: ExtendedProfile, actions: GameplayMenuActions): void {
  body.append(copy(`메소 ${economy.mesosOverride.toLocaleString()} · 인벤토리 ${Object.keys(economy.inventory).length}/24칸`));
  const inventory = section('보유 아이템');
  for (const itemId of Object.keys(ITEM_LABELS) as ItemId[]) {
    const amount = economy.inventory[itemId] ?? 0;
    const row = document.createElement('div');
    row.className = 'game-menu-row';
    row.append(copy(`${ITEM_LABELS[itemId]} × ${amount}`));
    if (itemId === 'recovery-potion' || itemId === 'experience-book') row.append(makeButton('사용하기', () => actions.useItem(itemId), 'overlay-button overlay-button--compact', amount <= 0));
    inventory.append(row);
  }
  body.append(inventory);
  const shop = section('서적상 레오');
  const goods: [ItemId, string][] = [['experience-book', '경험의 서 · 1메소'], ['recovery-potion', '회복 물약 · 120메소'], ['mungpuccino', '멍푸치노 · 50,000메소'], ['revival-charm', '부활의 부적 · 1,000,000메소']];
  for (const [id, label] of goods) shop.append(makeButton(`${label} 구매`, () => actions.buyItem(id)));
  body.append(shop);
  body.append(makeButton('전체 메뉴로', () => actions.switchPanel('menu')));
}

function renderStats(body: HTMLDivElement, character: StoredCharacterV2, economy: ExtendedProfile, actions: GameplayMenuActions): void {
  body.append(copy(`남은 AP ${character.ap} · 자동분배 ${character.autoDistribute ? '켜짐' : '꺼짐'}`));
  const statSection = section('능력치');
  for (const stat of ['str', 'dex', 'int', 'luk'] as const) {
    const row = document.createElement('div');
    row.className = 'game-menu-row';
    row.append(copy(`${stat.toUpperCase()} ${character.stats[stat]}`), makeButton('+1', () => actions.allocateStat(stat), 'overlay-button overlay-button--compact', character.ap <= 0));
    statSection.append(row);
  }
  const auto = document.createElement('input');
  auto.type = 'checkbox';
  auto.checked = character.autoDistribute;
  auto.addEventListener('change', () => actions.setAutoDistribute(auto.checked));
  const autoLabel = document.createElement('label');
  autoLabel.className = 'overlay-checkbox';
  autoLabel.append(auto, document.createTextNode('레벨업 시 LUK 4 / DEX 1 자동분배'));
  statSection.append(autoLabel);
  body.append(statSection);
  const equipment = section(`표창 장비 · 현재 ${SHURIKEN_CATALOG[economy.equippedShuriken].label}`);
  for (const id of Object.keys(SHURIKEN_CATALOG) as ShurikenId[]) {
    const item = SHURIKEN_CATALOG[id];
    const owned = economy.ownedShuriken.includes(id);
    equipment.append(makeButton(owned ? `${item.label} 장착 · ×${item.multiplier}` : `${item.label} 구매 · ${item.price?.toLocaleString() ?? '보상 전용'}메소`, () => owned ? actions.equipShuriken(id) : actions.buyShuriken(id), 'overlay-button', id === economy.equippedShuriken || (!owned && item.price === null)));
  }
  body.append(equipment, makeButton('전체 메뉴로', () => actions.switchPanel('menu')));
}

function renderSkills(body: HTMLDivElement, character: StoredCharacterV2, actions: GameplayMenuActions): void {
  body.append(copy(`남은 SP ${character.sp} · 액티브 11개와 패시브 4개`));
  const list = section('액티브 · 패시브 기술');
  SKILL_IDS.forEach((id, index) => {
    const level = character.skills[id] ?? 0;
    const row = document.createElement('div');
    row.className = 'game-menu-row';
    row.append(skillSummary(id, `${index < 11 ? `${slotLabel(index)} · ` : '패시브 · '}${SKILL_LABELS_KO[id]} Lv.${level}/20`), makeButton('+1', () => actions.levelSkill(id), 'overlay-button overlay-button--compact', level >= 20 || character.sp <= 0));
    list.append(row);
  });
  body.append(list, makeButton('단축키 편집', () => actions.switchPanel('shortcuts')), makeButton('전체 메뉴로', () => actions.switchPanel('menu')));
}

function renderShortcuts(body: HTMLDivElement, shortcuts: SkillShortcuts, actions: GameplayMenuActions): void {
  body.append(copy('1~0/-는 11개 액티브의 순열입니다. 화살표로 이웃 슬롯과 교환할 수 있습니다.'));
  const actionSlots = section('액션 바 11칸');
  shortcuts.actionSlots.forEach((skillId, index) => {
    const row = document.createElement('div');
    row.className = 'game-menu-row game-menu-row--shortcut';
    row.dataset.shortcutSlot = ACTION_SLOT_KEYS[index];
    row.append(
      skillSummary(skillId, `${ACTION_SLOT_KEYS[index]} · ${SKILL_LABELS_KO[skillId]}`),
      makeButton('←', () => actions.swapActionSlots(index, index - 1), 'overlay-button overlay-button--compact', index === 0),
      makeButton('→', () => actions.swapActionSlots(index, index + 1), 'overlay-button overlay-button--compact', index === shortcuts.actionSlots.length - 1),
    );
    actionSlots.append(row);
  });
  body.append(actionSlots);

  const aliases = section('추가 스킬 키 · 빈 값과 중복 허용');
  for (const key of ADDITIONAL_SKILL_KEYS) {
    const label = document.createElement('label');
    label.className = 'overlay-field game-shortcut-field';
    const heading = document.createElement('span');
    heading.textContent = `${key} 추가 스킬`;
    const select = document.createElement('select');
    select.setAttribute('aria-label', `${key} 추가 스킬`);
    select.append(new Option('비움', ''));
    for (const skillId of ACTIVE_SKILL_IDS) select.append(new Option(SKILL_LABELS_KO[skillId], skillId));
    select.value = shortcuts.additionalSkills[key] ?? '';
    select.addEventListener('change', () => actions.setAdditionalSkill(key, select.value === '' ? null : select.value as SkillId));
    label.append(heading, select);
    aliases.append(label);
  }
  aliases.append(copy('B 구미호 변신 · N 삼인 협공은 고정입니다. Z는 항상 전리품 회수이며 편집할 수 없습니다. S를 비우면 능력치 창이 열립니다.'));
  body.append(aliases, makeButton('스킬 · SP로', () => actions.switchPanel('skills')), makeButton('전체 메뉴로', () => actions.switchPanel('menu')));
}

function skillSummary(skillId: SkillId, label: string): HTMLDivElement {
  const summary = document.createElement('div');
  summary.className = 'game-skill-summary';
  const icon = document.createElement('img');
  icon.className = 'game-skill-icon';
  icon.src = getSkillIconAsset(skillId).url;
  icon.alt = '';
  icon.width = 44;
  icon.height = 44;
  summary.append(icon, copy(label));
  return summary;
}

function section(title: string): HTMLElement {
  const element = document.createElement('section');
  element.className = 'overlay-section';
  const heading = document.createElement('h3');
  heading.className = 'overlay-section__title';
  heading.textContent = title;
  element.append(heading);
  return element;
}

function copy(text: string): HTMLParagraphElement {
  const element = document.createElement('p');
  element.className = 'overlay-copy';
  element.textContent = text;
  return element;
}

function makeButton(label: string, action: () => void, className = 'overlay-button', disabled = false): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('click', action);
  return button;
}

function rangeControl(label: string, initial: number, onChange: (value: number) => void): HTMLLabelElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'overlay-field';
  const text = copy(label);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0'; input.max = '1'; input.step = '0.05'; input.value = String(initial);
  input.addEventListener('input', () => onChange(Number(input.value)));
  wrapper.append(text, input);
  return wrapper;
}

function slotLabel(index: number): string {
  return index === 9 ? '0' : index === 10 ? '-' : String(index + 1);
}

function jobExamSummary(quests: QuestState): string {
  if (quests.jobExam.status === 'none') return '전직 시험을 받을 수 있는지 확인하세요.';
  if (quests.jobExam.status === 'ready') return `전직 목표 완료 (${quests.jobExam.kills}) · 보고 가능`;
  return `전직 시험 진행 중 · 처치 ${quests.jobExam.kills}`;
}
