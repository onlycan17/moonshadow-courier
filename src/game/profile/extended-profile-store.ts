import { createDefaultExtendedProfile, type ExtendedProfile, type ItemId, type ShurikenId } from '../inventory/economy-rules';
import { createDefaultQuestState, type QuestState } from '../quests/quest-rules';
import { createDefaultSkillShortcuts, normalizeSkillShortcuts, type SkillShortcuts } from '../skills/skill-shortcut-rules';
import type { SlotNumber } from './types';

export interface RuntimeProfileExtension {
  economy: ExtendedProfile;
  quests: QuestState;
  defeatedBosses: string[];
  shortcuts: SkillShortcuts;
}

const KEY_PREFIX = 'kerning-shadows.local-profile-extension.v1.slot-';

export function loadRuntimeProfileExtension(slot: SlotNumber, mesos: number): RuntimeProfileExtension {
  const fallback: RuntimeProfileExtension = {
    economy: { ...createDefaultExtendedProfile(), mesosOverride: mesos },
    quests: createDefaultQuestState(),
    defeatedBosses: [],
    shortcuts: createDefaultSkillShortcuts(),
  };
  const raw = localStorage.getItem(`${KEY_PREFIX}${slot}`);
  if (raw === null) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return fallback;
    const economyValue = isRecord(value.economy) ? value.economy : {};
    const inventoryValue = isRecord(economyValue.inventory) ? economyValue.inventory : {};
    const inventory: Partial<Record<ItemId, number>> = {};
    for (const itemId of ['recovery-potion', 'experience-book', 'mungpuccino', 'revival-charm'] as const) {
      const amount = inventoryValue[itemId];
      if (typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0) inventory[itemId] = Math.min(999, amount);
    }
    const shurikenIds: ShurikenId[] = ['trainee', 'steel', 'jade', 'flame', 'eclipse', 'giant-icicle'];
    const owned: ShurikenId[] = Array.isArray(economyValue.ownedShuriken) ? economyValue.ownedShuriken.filter((id): id is ShurikenId => typeof id === 'string' && shurikenIds.includes(id as ShurikenId)) : ['trainee'];
    const equipped = typeof economyValue.equippedShuriken === 'string' && owned.includes(economyValue.equippedShuriken as ShurikenId) ? economyValue.equippedShuriken as ShurikenId : 'trainee';
    const questValue = isRecord(value.quests) ? value.quests : {};
    const examValue = isRecord(questValue.jobExam) ? questValue.jobExam : {};
    const validStatus = examValue.status === 'active' || examValue.status === 'ready' ? examValue.status : 'none';
    const validJob = examValue.job === 'novice' || examValue.job === 'rogue' || examValue.job === 'assassin' || examValue.job === 'hermit' ? examValue.job : null;
    const kills = typeof examValue.kills === 'number' && Number.isSafeInteger(examValue.kills) ? Math.max(0, examValue.kills) : 0;
    const stages = ['none', 'midboss', 'upperboss', 'finalboss', 'report', 'complete'] as const;
    const expeditionStage = typeof questValue.expeditionStage === 'string' && stages.includes(questValue.expeditionStage as typeof stages[number]) ? questValue.expeditionStage as typeof stages[number] : 'none';
    return {
      economy: { inventory, ownedShuriken: owned.length > 0 ? [...new Set(owned)] : ['trainee'], equippedShuriken: equipped, petRegistered: economyValue.petRegistered === true, enduranceRewardClaimed: economyValue.enduranceRewardClaimed === true, mesosOverride: mesos },
      quests: { jobExam: { status: validStatus, job: validJob, kills }, expeditionStage },
      defeatedBosses: Array.isArray(value.defeatedBosses) ? value.defeatedBosses.filter((id): id is string => typeof id === 'string') : [],
      shortcuts: normalizeSkillShortcuts(value.shortcuts),
    };
  } catch {
    return fallback;
  }
}

export function saveRuntimeProfileExtension(slot: SlotNumber, extension: RuntimeProfileExtension): void {
  localStorage.setItem(`${KEY_PREFIX}${slot}`, JSON.stringify(extension));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
