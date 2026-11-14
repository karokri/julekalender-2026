import type { CurrentParticipantStore } from '../application/ports';
import type { ParticipantId } from '../domain/types';
import { decryptBlob } from './crypto';
import { LocalDoorStore, type DoorStore } from './doors';
import { GitHubDoorStore, GitHubParticipantFileStore, GitHubRepoClient } from './githubStore';
import { LocalParticipantFileStore, type ParticipantFileStore } from './participantFiles';
import type { KeyValueStorage } from './storage';

export interface DataConfig {
  /** GitHub token encrypted with the shared password. Missing → test mode. */
  encryptedToken?: string;
  dataRepo?: string;
  dataBranch: string;
  /** The password doors.json is encrypted with in test mode. */
  testModePassword: string;
}

export function isTestMode(config: DataConfig): boolean {
  return !config.encryptedToken || !config.dataRepo;
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Feil passord – prøv igjen.');
    this.name = 'WrongPasswordError';
  }
}

export interface UnlockedData {
  files: ParticipantFileStore;
  /** Where the admin's door edits are saved. */
  doorStore: DoorStore;
  /** Password used to decrypt the answer keys. */
  contentPassword: string;
}

/** The shared password unlocks the GitHub token. Wrong password → {@link WrongPasswordError}. */
export async function unlock(config: DataConfig, password: string, storage: KeyValueStorage): Promise<UnlockedData> {
  if (isTestMode(config)) {
    return {
      files: new LocalParticipantFileStore(storage),
      doorStore: new LocalDoorStore(storage),
      contentPassword: config.testModePassword,
    };
  }
  let token: string;
  try {
    token = await decryptBlob(config.encryptedToken!, password);
  } catch {
    throw new WrongPasswordError();
  }
  const client = new GitHubRepoClient(token, config.dataRepo!, config.dataBranch);
  return {
    files: new GitHubParticipantFileStore(client),
    doorStore: new GitHubDoorStore(client),
    contentPassword: password,
  };
}

const SESSION_KEY = 'jul.session';

interface SavedSession {
  password: string;
  participantId?: ParticipantId;
}

/** Remembers the password and who you are, so you don't have to log in every day. */
export class SessionStore implements CurrentParticipantStore {
  private readonly storage: KeyValueStorage;

  constructor(storage: KeyValueStorage) {
    this.storage = storage;
  }

  password(): string | undefined {
    return this.load()?.password;
  }

  savePassword(password: string): void {
    this.save({ ...this.load(), password });
  }

  get(): ParticipantId | undefined {
    return this.load()?.participantId;
  }

  set(id: ParticipantId): void {
    const current = this.load();
    if (current) this.save({ ...current, participantId: id });
  }

  clear(): void {
    const current = this.load();
    if (current) this.save({ password: current.password });
  }

  forgetEverything(): void {
    this.storage.removeItem(SESSION_KEY);
  }

  private load(): SavedSession | undefined {
    try {
      const raw = this.storage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as SavedSession) : undefined;
    } catch {
      return undefined;
    }
  }

  private save(session: SavedSession): void {
    try {
      this.storage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* private mode – you'll just have to log in again after a reload */
    }
  }
}
