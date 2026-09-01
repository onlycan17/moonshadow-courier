import type { CharacterStats } from '../profile/types';

export const MAX_LEVEL = 200;
const LEVEL_HP_GAIN = 14;
const LEVEL_MP_GAIN = 7;
const LEVEL_AP_GAIN = 5;
const LEVEL_SP_GAIN = 3;

export interface ProgressionState {
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  ap: number;
  sp: number;
  stats: CharacterStats;
  autoDistribute: boolean;
}

export function getRequiredExperience(level: number): number {
  return 100 + Math.max(0, Math.floor(level) - 10) * 40;
}

export function addExperience(state: ProgressionState, gainedExperience: number): ProgressionState {
  let level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(state.level)));
  let exp = Math.max(0, Math.floor(state.exp)) + Math.max(0, Math.floor(gainedExperience));
  let maxHp = state.maxHp;
  let maxMp = state.maxMp;
  let ap = state.ap;
  let sp = state.sp;
  const stats = { ...state.stats };

  while (level < MAX_LEVEL) {
    const required = getRequiredExperience(level);
    if (exp < required) {
      break;
    }
    exp -= required;
    level += 1;
    maxHp += LEVEL_HP_GAIN;
    maxMp += LEVEL_MP_GAIN;
    sp += LEVEL_SP_GAIN;
    if (state.autoDistribute) {
      stats.dex += 1;
      stats.luk += 4;
    } else {
      ap += LEVEL_AP_GAIN;
    }
  }

  if (level >= MAX_LEVEL) {
    exp = 0;
  }

  const leveledUp = level > state.level;
  return {
    ...state,
    level,
    exp,
    maxHp,
    maxMp,
    hp: leveledUp ? maxHp : Math.min(state.hp, maxHp),
    mp: leveledUp ? maxMp : Math.min(state.mp, maxMp),
    ap,
    sp,
    stats
  };
}
