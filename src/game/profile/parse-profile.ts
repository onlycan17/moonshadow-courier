import { runMigrations } from './migrations';
import { CURRENT_PROFILE_VERSION } from './types';
import type { CharacterStats, JobId, MapPosition, StoredCharacterV2 } from './types';

const NICKNAME_MAX_LENGTH = 50;
const MIN_LEVEL = 1;
const MAX_LEVEL = 200;
const MIN_RESOURCE = 0;
const MIN_MAX_RESOURCE = 1;
const MIN_STAT = 4;
const MAX_STAT = 9999;
const MIN_SKILL_LEVEL = 0;
const MAX_SKILL_LEVEL = 20;
const MIN_POSITION = 0;
const MAX_POSITION = 99999;

export function parseStoredCharacter(raw: string): StoredCharacterV2 | null {
  const parsed = parseJson(raw);
  if (!isRecord(parsed)) {
    return null;
  }

  return parseStoredCharacterRecord(parsed);
}

function parseJson(raw: string): unknown {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

function parseStoredCharacterRecord(record: Record<string, unknown>): StoredCharacterV2 | null {
  const version = readVersion(record.version);
  if (version === 1) {
    return runMigrations(record);
  }
  if (version !== CURRENT_PROFILE_VERSION) {
    return null;
  }

  const nickname = readNickname(record.nickname);
  const job = readJob(record.job);
  const level = readLevel(record.level);
  const resources = readResources(record);
  const stats = readStats(record.stats);
  const ap = readNonNegative(record.ap);
  const sp = readNonNegative(record.sp);
  const autoDistribute = readBoolean(record.autoDistribute);
  const skills = readSkills(record.skills);
  const mesos = readNonNegative(record.mesos);
  const mapId = readRequiredString(record.mapId);

  if (nickname === null || job === null || level === null) {
    return null;
  }
  if (resources === null || stats === null || ap === null || sp === null) {
    return null;
  }
  if (autoDistribute === null || skills === null || mesos === null || mapId === null) {
    return null;
  }

  return {
    ...resources,
    version,
    nickname,
    job,
    level,
    stats,
    ap,
    sp,
    autoDistribute,
    skills,
    mesos,
    mapId,
    positions: readPositions(record.positions)
  };
}

function readResources(record: Record<string, unknown>): Pick<StoredCharacterV2, 'hp' | 'maxHp' | 'mp' | 'maxMp' | 'exp'> | null {
  const maxHp = readSafeIntegerInRange(record.maxHp, MIN_MAX_RESOURCE, Number.MAX_SAFE_INTEGER);
  const maxMp = readSafeIntegerInRange(record.maxMp, MIN_MAX_RESOURCE, Number.MAX_SAFE_INTEGER);
  if (maxHp === null || maxMp === null) {
    return null;
  }

  const hp = readSafeIntegerInRange(record.hp, MIN_RESOURCE, maxHp);
  const mp = readSafeIntegerInRange(record.mp, MIN_RESOURCE, maxMp);
  const exp = readNonNegative(record.exp);
  return hp === null || mp === null || exp === null ? null : { hp, maxHp, mp, maxMp, exp };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return value;
}

function readNickname(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > NICKNAME_MAX_LENGTH) {
    return null;
  }
  return trimmed;
}

function readJob(value: unknown): JobId | null {
  if (value === 'novice' || value === 'rogue' || value === 'assassin' || value === 'hermit' || value === 'hokage') {
    return value;
  }
  return null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readVersion(value: unknown): 1 | typeof CURRENT_PROFILE_VERSION | null {
  if (value === 1 || value === CURRENT_PROFILE_VERSION) {
    return value;
  }
  return null;
}

function readLevel(value: unknown): number | null {
  return readSafeIntegerInRange(value, MIN_LEVEL, MAX_LEVEL);
}

function readNonNegative(value: unknown): number | null {
  return readSafeIntegerInRange(value, MIN_RESOURCE, Number.MAX_SAFE_INTEGER);
}

function readSafeIntegerInRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    return null;
  }
  if (value < min || value > max) {
    return null;
  }
  return value;
}

function readStats(value: unknown): CharacterStats | null {
  if (!isRecord(value)) {
    return null;
  }

  const str = readSafeIntegerInRange(value.str, MIN_STAT, MAX_STAT);
  const dex = readSafeIntegerInRange(value.dex, MIN_STAT, MAX_STAT);
  const int = readSafeIntegerInRange(value.int, MIN_STAT, MAX_STAT);
  const luk = readSafeIntegerInRange(value.luk, MIN_STAT, MAX_STAT);
  if (str === null || dex === null || int === null || luk === null) {
    return null;
  }
  return { str, dex, int, luk };
}

function readSkills(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) {
    return null;
  }

  const skills: Record<string, number> = {};
  for (const [key, skillLevel] of Object.entries(value)) {
    const parsedLevel = readSafeIntegerInRange(skillLevel, MIN_SKILL_LEVEL, MAX_SKILL_LEVEL);
    if (parsedLevel === null) {
      return null;
    }
    skills[key] = parsedLevel;
  }
  return skills;
}

function readPositions(value: unknown): Record<string, MapPosition> {
  if (!isPlainObject(value)) {
    return {};
  }

  const positions: Record<string, MapPosition> = {};
  for (const [mapId, positionValue] of Object.entries(value)) {
    if (mapId.length === 0) {
      continue;
    }

    const position = readMapPosition(positionValue);
    if (position === null) {
      continue;
    }
    positions[mapId] = position;
  }
  return positions;
}

function readMapPosition(value: unknown): MapPosition | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const x = readSafeIntegerInRange(value.x, MIN_POSITION, MAX_POSITION);
  const y = readSafeIntegerInRange(value.y, MIN_POSITION, MAX_POSITION);
  return x === null || y === null ? null : { x, y };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
