import { parseStoredCharacter } from './parse-profile';
import { CURRENT_PROFILE_VERSION } from './types';
import type { MapPosition, StoredCharacterV2 } from './types';

const migrations = new Map<number, (value: unknown) => unknown>();

export const DEFAULT_SPAWN_FALLBACK: MapPosition = { x: 100, y: 600 };

registerMigration(1, (value) => migrateV1ToV2(value));

export function registerMigration(fromVersion: number, migrate: (value: unknown) => unknown): void {
  migrations.set(fromVersion, migrate);
}

export function runMigrations(value: unknown): StoredCharacterV2 | null {
  let currentValue = value;
  let version = readVersion(currentValue);
  if (version === null) {
    return null;
  }

  while (version !== CURRENT_PROFILE_VERSION) {
    const migrate = migrations.get(version);
    if (migrate === undefined) {
      return null;
    }

    currentValue = migrate(currentValue);
    const nextVersion = readVersion(currentValue);
    if (nextVersion === null || nextVersion === version) {
      return null;
    }
    version = nextVersion;
  }

  return parseMigratedValue(currentValue);
}

function migrateV1ToV2(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const mapId = typeof value.mapId === 'string' ? value.mapId : '';
  const positions = readSourcePositions(value.positions);
  if (mapId.length > 0 && positions[mapId] === undefined) {
    positions[mapId] = { ...DEFAULT_SPAWN_FALLBACK };
  }

  return {
    ...value,
    version: CURRENT_PROFILE_VERSION,
    positions
  };
}

function readSourcePositions(value: unknown): Record<string, MapPosition> {
  if (!isPlainObject(value)) {
    return {};
  }

  const positions: Record<string, MapPosition> = {};
  for (const [mapId, positionValue] of Object.entries(value)) {
    if (mapId.length === 0 || !isPlainObject(positionValue)) {
      continue;
    }

    const x = positionValue.x;
    const y = positionValue.y;
    if (typeof x !== 'number' || typeof y !== 'number') {
      continue;
    }
    positions[mapId] = { x, y };
  }
  return positions;
}

function readVersion(value: unknown): number | null {
  if (!isRecord(value) || typeof value.version !== 'number') {
    return null;
  }
  return Number.isSafeInteger(value.version) ? value.version : null;
}

function parseMigratedValue(value: unknown): StoredCharacterV2 | null {
  const serialized = JSON.stringify(value);
  return parseStoredCharacter(serialized);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
