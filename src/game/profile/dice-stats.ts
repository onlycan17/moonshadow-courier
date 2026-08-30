import type { CharacterStats } from './types';

const STAT_KEYS = ['str', 'dex', 'int', 'luk'] as const satisfies readonly (keyof CharacterStats)[];
const STAT_MIN = 4;
const STAT_MAX = 13;
const STAT_SUM = 25;
const DISTRIBUTABLE_POINTS = STAT_SUM - STAT_MIN * STAT_KEYS.length;

function createBaseStats(): CharacterStats {
  return {
    str: STAT_MIN,
    dex: STAT_MIN,
    int: STAT_MIN,
    luk: STAT_MIN
  };
}

function pickStatIndex(rng: () => number, length: number): number {
  return Math.floor(rng() * length);
}

export function rollStats(rng: () => number): CharacterStats {
  const stats = createBaseStats();

  for (let point = 0; point < DISTRIBUTABLE_POINTS; point += 1) {
    const availableKeys = STAT_KEYS.filter((key) => stats[key] < STAT_MAX);
    const selectedKey = availableKeys[pickStatIndex(rng, availableKeys.length)];

    if (selectedKey === undefined) {
      return stats;
    }

    stats[selectedKey] += 1;
  }

  return stats;
}

export function validateStatSet(stats: CharacterStats): boolean {
  const total = STAT_KEYS.reduce((sum, key) => sum + stats[key], 0);

  if (total !== STAT_SUM) {
    return false;
  }

  return STAT_KEYS.every((key) => Number.isInteger(stats[key]) && stats[key] >= STAT_MIN && stats[key] <= STAT_MAX);
}
