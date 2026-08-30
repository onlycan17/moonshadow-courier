import { parseStoredCharacter } from './parse-profile';
import type { StoredCharacterV1 } from './types';

const migrations = new Map<number, (value: unknown) => unknown>();

registerMigration(1, (value) => value);

export function registerMigration(fromVersion: number, migrate: (value: unknown) => unknown): void {
  migrations.set(fromVersion, migrate);
}

export function runMigrations(value: unknown): StoredCharacterV1 | null {
  const version = readVersion(value);
  if (version === null) {
    return null;
  }

  const migrate = migrations.get(version);
  if (migrate === undefined) {
    return null;
  }

  return parseMigratedValue(migrate(value));
}

function readVersion(value: unknown): number | null {
  if (!isRecord(value) || typeof value.version !== 'number') {
    return null;
  }
  return Number.isSafeInteger(value.version) ? value.version : null;
}

function parseMigratedValue(value: unknown): StoredCharacterV1 | null {
  const serialized = JSON.stringify(value);
  return parseStoredCharacter(serialized);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
