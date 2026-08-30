import { ALL_SKILL_LEVEL_ZERO, SKILL_IDS, type SkillId } from '../data/skill-catalog';
import type { CharacterStats, StoredCharacterV1 } from './types';
import { normalizeNickname, validateNickname } from './nickname';
import { validateStatSet } from './dice-stats';

const NOVICE_JOB = 'novice' as const;
const HOKAGE_JOB = 'hokage' as const;
const STARTING_MAP_ID = 'cuning-city';
const NOVICE_LEVEL = 9;
const BOOST_LEVEL = 120;
const NOVICE_HP = 180;
const NOVICE_MP = 90;
const BOOST_SP = 33;
const BOOST_SKILL_LEVEL = 20;
const LEVEL_UP_HP_GAIN = 14;
const LEVEL_UP_MP_GAIN = 7;
const LEVEL_UP_AP_GAIN = 5;
const BOOST_HP_BASE = 68;
const BOOST_MP_BASE = 34;
const INITIAL_RESOURCE_AMOUNT = 0;
const AP_BATCH_SIZE = 5;
const AP_BATCH_DEX_GAIN = 1;
const AP_BATCH_LUK_GAIN = 4;
const SAVE_VERSION = 1 as const;

export type SaveValidationResult =
  | { ok: true; nickname: string }
  | { ok: false; reason: 'empty' | 'tooShort' | 'tooLong' | 'invalidChars' | 'invalidStats' };

function cloneStats(stats: CharacterStats): CharacterStats {
  return {
    str: stats.str,
    dex: stats.dex,
    int: stats.int,
    luk: stats.luk
  };
}

function createSkillLevels(level: number): Record<SkillId, number> {
  return Object.freeze(
    Object.fromEntries(SKILL_IDS.map((skillId) => [skillId, level])) as Record<SkillId, number>
  ) as Record<SkillId, number>;
}

function createBaseCharacter(
  nickname: string,
  stats: CharacterStats,
  level: number,
  hp: number,
  mp: number,
  sp: number,
  autoDistribute: boolean,
  job: StoredCharacterV1['job'],
  skills: Record<string, number>
): StoredCharacterV1 {
  return {
    version: SAVE_VERSION,
    nickname,
    job,
    level,
    hp,
    maxHp: hp,
    mp,
    maxMp: mp,
    exp: INITIAL_RESOURCE_AMOUNT,
    stats: cloneStats(stats),
    ap: INITIAL_RESOURCE_AMOUNT,
    sp,
    autoDistribute,
    skills,
    mesos: INITIAL_RESOURCE_AMOUNT,
    mapId: STARTING_MAP_ID
  };
}

/** SPEC §7.1 자동 분배 규칙: 5점마다 DEX+1, LUK+4, 나머지는 LUK. */
export function distributeAutoAp(stats: CharacterStats, apTotal: number): CharacterStats {
  const distributedStats = cloneStats(stats);
  const batches = Math.floor(apTotal / AP_BATCH_SIZE);
  const remainder = apTotal % AP_BATCH_SIZE;

  distributedStats.dex += batches * AP_BATCH_DEX_GAIN;
  distributedStats.luk += batches * AP_BATCH_LUK_GAIN + remainder;

  return distributedStats;
}

export function buildNoviceCharacter(nickname: string, stats: CharacterStats): StoredCharacterV1 {
  return createBaseCharacter(
    nickname,
    stats,
    NOVICE_LEVEL,
    NOVICE_HP,
    NOVICE_MP,
    INITIAL_RESOURCE_AMOUNT,
    false,
    NOVICE_JOB,
    { ...ALL_SKILL_LEVEL_ZERO }
  );
}

export function buildBoostCharacter(nickname: string, stats: CharacterStats): StoredCharacterV1 {
  const gainedLevels = BOOST_LEVEL - NOVICE_LEVEL;
  const boostStats = distributeAutoAp(stats, gainedLevels * LEVEL_UP_AP_GAIN);
  const boostHp = BOOST_HP_BASE + (BOOST_LEVEL - 1) * LEVEL_UP_HP_GAIN;
  const boostMp = BOOST_MP_BASE + (BOOST_LEVEL - 1) * LEVEL_UP_MP_GAIN;

  return createBaseCharacter(
    nickname,
    boostStats,
    BOOST_LEVEL,
    boostHp,
    boostMp,
    BOOST_SP,
    true,
    HOKAGE_JOB,
    createSkillLevels(BOOST_SKILL_LEVEL)
  );
}

/** SPEC §5.2 저장 직전 규칙: 닉네임 정규화와 능력치 합계를 함께 재검증한다. */
export function validateForSave(nickname: string, stats: CharacterStats): SaveValidationResult {
  const normalizedNickname = normalizeNickname(nickname);
  const nicknameValidation = validateNickname(normalizedNickname);

  if (!nicknameValidation.ok) {
    return nicknameValidation;
  }

  if (!validateStatSet(stats)) {
    return { ok: false, reason: 'invalidStats' };
  }

  return { ok: true, nickname: normalizedNickname };
}
