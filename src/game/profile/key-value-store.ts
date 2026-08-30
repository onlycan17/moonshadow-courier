import type { KeyValueStore } from './types';

export class LocalStorageStore implements KeyValueStore {
  public getItem(key: string): string | null {
    return this.getStorage().getItem(key);
  }

  public setItem(key: string, value: string): void {
    this.getStorage().setItem(key, value);
  }

  public removeItem(key: string): void {
    this.getStorage().removeItem(key);
  }

  private getStorage(): Storage {
    const { localStorage } = globalThis;
    if (localStorage === undefined) {
      throw new Error('localStorage is not available.');
    }
    return localStorage;
  }
}

export class InMemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }
}
