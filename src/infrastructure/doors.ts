import type { AnswerKeyReader, DoorRepository } from '../application/ports';
import type { AnswerKey, DoorContent, DoorId } from '../domain/types';
import { b64ToBytes, bytesToB64, decryptWithKey, deriveKey, encryptWithKey } from './crypto';
import type { KeyValueStorage } from './storage';

/** The calendar content: `doors.json` in the data repo (or `public/doors.json` as a starting point). */
export interface DoorsFile {
  /** Base64 PBKDF2 salt for the answer keys. */
  keySalt: string;
  doors: DoorContent[];
}

export type DoorsSource = () => Promise<DoorsFile>;

/** Where edited doors are saved. `undefined` from load() means «nothing saved yet». */
export interface DoorStore {
  load(): Promise<DoorsFile | undefined>;
  save(file: DoorsFile, message: string): Promise<void>;
}

export function fetchDoorsFile(url: string): DoorsSource {
  return async () => {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Kunne ikke laste kalenderen (${response.status}).`);
    return (await response.json()) as DoorsFile;
  };
}

/** Test and demo mode: edits are kept in this browser. */
export class LocalDoorStore implements DoorStore {
  private static readonly KEY = 'jul.doors';
  private readonly storage: KeyValueStorage;

  constructor(storage: KeyValueStorage) {
    this.storage = storage;
  }

  async load(): Promise<DoorsFile | undefined> {
    const raw = this.storage.getItem(LocalDoorStore.KEY);
    return raw ? (JSON.parse(raw) as DoorsFile) : undefined;
  }

  async save(file: DoorsFile): Promise<void> {
    this.storage.setItem(LocalDoorStore.KEY, JSON.stringify(file));
  }
}

/**
 * The doors of the calendar. Reads the saved file from the store; until the admin has saved
 * anything, the bundled file (public/doors.json) is used as a starting point.
 */
export class Doors implements DoorRepository {
  private file?: Promise<DoorsFile>;
  private readonly store: DoorStore;
  private readonly fallback: DoorsSource;

  constructor(store: DoorStore, fallback: DoorsSource) {
    this.store = store;
    this.fallback = fallback;
  }

  loadFile(): Promise<DoorsFile> {
    this.file ??= this.loadFromSources().catch((error: unknown) => {
      this.file = undefined;
      throw error;
    });
    return this.file;
  }

  async findAll(): Promise<DoorContent[]> {
    return [...(await this.loadFile()).doors].sort((a, b) => a.day - b.day);
  }

  async save(door: DoorContent): Promise<void> {
    const file = await this.loadFile();
    const doors = [...file.doors.filter((d) => d.id !== door.id && d.day !== door.day), door].sort((a, b) => a.day - b.day);
    await this.write({ ...file, doors }, `Oppdater luke ${door.day}`);
  }

  async remove(id: DoorId): Promise<void> {
    const file = await this.loadFile();
    const door = file.doors.find((d) => d.id === id);
    await this.write({ ...file, doors: file.doors.filter((d) => d.id !== id) }, `Tøm luke ${door?.day ?? id}`);
  }

  private async write(file: DoorsFile, message: string): Promise<void> {
    await this.store.save(file, message);
    this.file = Promise.resolve(file);
  }

  private async loadFromSources(): Promise<DoorsFile> {
    const saved = await this.store.load();
    if (saved) return saved;
    try {
      return await this.fallback();
    } catch {
      // Nothing published and nothing saved: start with an empty calendar.
      return { keySalt: bytesToB64(crypto.getRandomValues(new Uint8Array(16))), doors: [] };
    }
  }
}

/**
 * Answer keys are AES-GCM encrypted with the shared password, so they can't be read
 * without it. (Anyone who knows the password *and* opens DevTools could still dig
 * them out – this is a family calendar, not a bank.)
 */
export class EncryptedAnswerKeyReader implements AnswerKeyReader {
  private key?: Promise<CryptoKey>;
  private keySalt?: string;
  private readonly doors: Doors;
  private readonly password: string;

  constructor(doors: Doors, password: string) {
    this.doors = doors;
    this.password = password;
  }

  async read(door: DoorContent): Promise<AnswerKey> {
    if (!door.answerCipher) throw new Error(`Luke ${door.day} mangler fasit.`);
    try {
      const plain = await decryptWithKey(await this.cryptoKey(), b64ToBytes(door.answerCipher));
      return JSON.parse(plain) as AnswerKey;
    } catch {
      throw new Error('Klarte ikke å låse opp fasiten. Er lukene lagret med riktig passord?');
    }
  }

  async seal(key: AnswerKey): Promise<string> {
    return bytesToB64(await encryptWithKey(await this.cryptoKey(), JSON.stringify(key)));
  }

  private async cryptoKey(): Promise<CryptoKey> {
    const { keySalt } = await this.doors.loadFile();
    if (!this.key || this.keySalt !== keySalt) {
      this.keySalt = keySalt;
      this.key = deriveKey(this.password, b64ToBytes(keySalt));
    }
    return this.key;
  }
}
