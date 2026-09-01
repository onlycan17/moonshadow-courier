import { SKILL_IDS, type SkillId } from '../data/skill-catalog';

export const ACTION_SLOT_KEYS = Object.freeze([
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-',
] as const);

export const ADDITIONAL_SKILL_KEYS = Object.freeze([
  'Shift', 'Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'X', 'C', 'V',
] as const);

export type ActionSlotKey = (typeof ACTION_SLOT_KEYS)[number];
export type AdditionalSkillKey = (typeof ADDITIONAL_SKILL_KEYS)[number];

export const ACTIVE_SKILL_IDS = Object.freeze(SKILL_IDS.slice(0, 11)) as readonly SkillId[];

export interface SkillShortcuts {
  actionSlots: SkillId[];
  additionalSkills: Record<AdditionalSkillKey, SkillId | null>;
}

const DEFAULT_ACTION_SLOTS: readonly SkillId[] = Object.freeze([
  'basic-shuriken',
  'lucky-seven',
  'shadow-barrage',
  'drain',
  'phantom-dual-star',
  'avenger',
  'abyss-rain',
  'rasengan',
  'gumiho-transformation',
  'triple-strike-squad',
  'heavenly-thunder-orb',
]);

const DEFAULT_ADDITIONAL_SKILLS: Readonly<Record<AdditionalSkillKey, SkillId | null>> = Object.freeze({
  Shift: 'lucky-seven',
  Q: 'shadow-barrage',
  W: 'phantom-dual-star',
  E: 'abyss-rain',
  R: 'heavenly-thunder-orb',
  A: null,
  S: null,
  D: null,
  F: null,
  X: 'drain',
  C: 'avenger',
  V: 'rasengan',
});

export function createDefaultSkillShortcuts(): SkillShortcuts {
  return {
    actionSlots: [...DEFAULT_ACTION_SLOTS],
    additionalSkills: { ...DEFAULT_ADDITIONAL_SKILLS },
  };
}

export function normalizeSkillShortcuts(value: unknown): SkillShortcuts {
  const defaults = createDefaultSkillShortcuts();
  if (!isRecord(value)) return defaults;

  const uniqueSlots: SkillId[] = [];
  if (Array.isArray(value.actionSlots)) {
    for (const entry of value.actionSlots) {
      if (isActiveSkillId(entry) && !uniqueSlots.includes(entry)) uniqueSlots.push(entry);
    }
  }
  for (const skillId of DEFAULT_ACTION_SLOTS) {
    if (!uniqueSlots.includes(skillId)) uniqueSlots.push(skillId);
  }

  const rawAliases = isRecord(value.additionalSkills) ? value.additionalSkills : null;
  const additionalSkills = { ...defaults.additionalSkills };
  if (rawAliases !== null) {
    for (const key of ADDITIONAL_SKILL_KEYS) {
      if (!Object.hasOwn(rawAliases, key)) continue;
      const entry = rawAliases[key];
      additionalSkills[key] = entry === null || isActiveSkillId(entry) ? entry : null;
    }
  }

  return { actionSlots: uniqueSlots.slice(0, ACTION_SLOT_KEYS.length), additionalSkills };
}

export function swapActionSlots(shortcuts: SkillShortcuts, fromIndex: number, toIndex: number): SkillShortcuts {
  if (!isSlotIndex(fromIndex) || !isSlotIndex(toIndex) || fromIndex === toIndex) return cloneShortcuts(shortcuts);
  const actionSlots = [...shortcuts.actionSlots];
  const previous = actionSlots[fromIndex];
  const next = actionSlots[toIndex];
  if (previous === undefined || next === undefined) return cloneShortcuts(shortcuts);
  actionSlots[fromIndex] = next;
  actionSlots[toIndex] = previous;
  return { actionSlots, additionalSkills: { ...shortcuts.additionalSkills } };
}

export function setAdditionalSkill(shortcuts: SkillShortcuts, key: AdditionalSkillKey, skillId: SkillId | null): SkillShortcuts {
  return {
    actionSlots: [...shortcuts.actionSlots],
    additionalSkills: { ...shortcuts.additionalSkills, [key]: skillId },
  };
}

export function getSkillForActionKey(shortcuts: SkillShortcuts, key: ActionSlotKey): SkillId {
  return shortcuts.actionSlots[ACTION_SLOT_KEYS.indexOf(key)] ?? 'basic-shuriken';
}

export function getSkillForAdditionalKey(shortcuts: SkillShortcuts, key: AdditionalSkillKey): SkillId | null {
  return shortcuts.additionalSkills[key] ?? null;
}

function cloneShortcuts(shortcuts: SkillShortcuts): SkillShortcuts {
  return { actionSlots: [...shortcuts.actionSlots], additionalSkills: { ...shortcuts.additionalSkills } };
}

function isSlotIndex(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < ACTION_SLOT_KEYS.length;
}

function isActiveSkillId(value: unknown): value is SkillId {
  return typeof value === 'string' && ACTIVE_SKILL_IDS.includes(value as SkillId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
