import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRuntimeProfileExtension, saveRuntimeProfileExtension } from '../../src/game/profile/extended-profile-store';
import {
  ACTION_SLOT_KEYS,
  ADDITIONAL_SKILL_KEYS,
  createDefaultSkillShortcuts,
  getSkillForActionKey,
  getSkillForAdditionalKey,
  normalizeSkillShortcuts,
  setAdditionalSkill,
  swapActionSlots,
} from '../../src/game/skills/skill-shortcut-rules';

describe('skill shortcut rules', () => {
  it('creates the documented 11-slot order and legacy additional-key defaults', () => {
    const shortcuts = createDefaultSkillShortcuts();

    expect(shortcuts.actionSlots).toHaveLength(11);
    expect(new Set(shortcuts.actionSlots).size).toBe(11);
    expect(getSkillForActionKey(shortcuts, '1')).toBe('basic-shuriken');
    expect(getSkillForActionKey(shortcuts, '-')).toBe('heavenly-thunder-orb');
    expect(getSkillForAdditionalKey(shortcuts, 'Shift')).toBe('lucky-seven');
    expect(getSkillForAdditionalKey(shortcuts, 'S')).toBeNull();
    expect(ACTION_SLOT_KEYS).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-']);
    expect(ADDITIONAL_SKILL_KEYS).toEqual(['Shift', 'Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'X', 'C', 'V']);
  });

  it('swaps action slots without losing or duplicating skills', () => {
    const original = createDefaultSkillShortcuts();
    const swapped = swapActionSlots(original, 0, 10);

    expect(swapped.actionSlots[0]).toBe('heavenly-thunder-orb');
    expect(swapped.actionSlots[10]).toBe('basic-shuriken');
    expect(new Set(swapped.actionSlots)).toEqual(new Set(original.actionSlots));
    expect(original.actionSlots[0]).toBe('basic-shuriken');
  });

  it('allows empty and duplicate additional bindings without changing fixed action slots', () => {
    const original = createDefaultSkillShortcuts();
    const duplicated = setAdditionalSkill(
      setAdditionalSkill(original, 'A', 'drain'),
      'S',
      'drain',
    );
    const cleared = setAdditionalSkill(duplicated, 'Shift', null);

    expect(getSkillForAdditionalKey(duplicated, 'A')).toBe('drain');
    expect(getSkillForAdditionalKey(duplicated, 'S')).toBe('drain');
    expect(getSkillForAdditionalKey(cleared, 'Shift')).toBeNull();
    expect(cleared.actionSlots).toEqual(original.actionSlots);
  });

  it('repairs corrupt permutations and aliases while preserving valid entries', () => {
    const normalized = normalizeSkillShortcuts({
      actionSlots: ['drain', 'drain', 'invalid', 'rasengan'],
      additionalSkills: { Shift: 'invalid', Q: 'avenger', S: null, Z: 'drain' },
    });

    expect(normalized.actionSlots).toHaveLength(11);
    expect(new Set(normalized.actionSlots).size).toBe(11);
    expect(normalized.actionSlots[0]).toBe('drain');
    expect(normalized.actionSlots[1]).not.toBe('drain');
    expect(normalized.additionalSkills.Q).toBe('avenger');
    expect(normalized.additionalSkills.Shift).toBeNull();
    expect(normalized.additionalSkills.S).toBeNull();
    expect('Z' in normalized.additionalSkills).toBe(false);
  });
});

describe('skill shortcut slot persistence', () => {
  let values: Map<string, string>;

  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('migrates an extension without shortcut fields to documented defaults', () => {
    values.set('kerning-shadows.local-profile-extension.v1.slot-1', JSON.stringify({
      economy: {},
      quests: {},
      defeatedBosses: [],
    }));

    const loaded = loadRuntimeProfileExtension(1, 0);

    expect(loaded.shortcuts).toEqual(createDefaultSkillShortcuts());
  });

  it('saves edited shortcuts independently per character slot', () => {
    const slotOne = loadRuntimeProfileExtension(1, 0);
    slotOne.shortcuts = setAdditionalSkill(swapActionSlots(slotOne.shortcuts, 0, 1), 'S', 'drain');
    saveRuntimeProfileExtension(1, slotOne);

    expect(loadRuntimeProfileExtension(1, 0).shortcuts).toEqual(slotOne.shortcuts);
    expect(loadRuntimeProfileExtension(2, 0).shortcuts).toEqual(createDefaultSkillShortcuts());
  });
});
