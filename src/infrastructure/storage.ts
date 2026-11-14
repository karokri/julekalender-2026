/** Minimal subset of the Web Storage API, so adapters can be tested with an in-memory map. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export class InMemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  keys(): string[] {
    return [...this.values.keys()];
  }
}

class WebStorage implements KeyValueStorage {
  private readonly storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  keys(): string[] {
    return Array.from({ length: this.storage.length }, (_, i) => this.storage.key(i)).filter(
      (k): k is string => k !== null,
    );
  }
}

/** Falls back to memory when the browser blocks storage (private mode, disabled cookies). */
export function browserStorage(): KeyValueStorage {
  try {
    const probe = '__jul_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return new WebStorage(window.localStorage);
  } catch {
    return new InMemoryStorage();
  }
}
