import type { AnswerRepository, InteractionRepository, ParticipantRepository } from '../application/ports';
import type { Answer, Participant, ParticipantId } from '../domain/types';
import type { KeyValueStorage } from './storage';

/**
 * One file per participant: `participants/<id>.json`.
 * Everyone only ever writes their own file, so two people answering
 * at the same time never collide.
 */
export interface ParticipantFile extends Participant {
  answers: Answer[];
  /** Tickles, cookies and Lucia processions in Nissetunet. */
  interactions?: number;
}

export interface ParticipantFileStore {
  listAll(): Promise<ParticipantFile[]>;
  read(id: ParticipantId): Promise<ParticipantFile | undefined>;
  write(file: ParticipantFile): Promise<void>;
  delete(id: ParticipantId): Promise<void>;
}

/** Adapts a file store to the participant and answer ports. */
export function participantRepositories(store: ParticipantFileStore): {
  participants: ParticipantRepository;
  answers: AnswerRepository;
  interactions: InteractionRepository;
} {
  return {
    participants: {
      findAll: async () => (await store.listAll()).map(toParticipant),
      findById: async (id) => {
        const file = await store.read(id);
        return file && toParticipant(file);
      },
      save: async ({ passwordHash, ...participant }) => {
        const existing = await store.read(participant.id);
        await store.write({
          ...participant,
          ...(passwordHash ? { passwordHash } : {}),
          answers: existing?.answers ?? [],
          ...(existing?.interactions ? { interactions: existing.interactions } : {}),
        });
      },
      remove: (id) => store.delete(id),
    },
    answers: {
      findAll: async () => (await store.listAll()).flatMap((f) => f.answers),
      findByParticipant: async (participantId) => (await store.read(participantId))?.answers ?? [],
      save: async (answer) => {
        const file = await store.read(answer.participantId);
        if (!file) throw new Error('Fant ikke deltakeren.');
        const others = file.answers.filter((a) => a.doorId !== answer.doorId);
        await store.write({ ...file, answers: [...others, answer] });
      },
    },
    interactions: {
      add: async (participantId, count) => {
        if (count <= 0) return;
        const file = await store.read(participantId);
        if (!file) return;
        await store.write({ ...file, interactions: (file.interactions ?? 0) + count });
      },
      findAll: async () =>
        (await store.listAll()).map((f) => ({ participantId: f.id, count: f.interactions ?? 0 })),
    },
  };
}

function toParticipant({ id, name, registeredAt, passwordHash }: ParticipantFile): Participant {
  return { id, name, registeredAt, ...(passwordHash ? { passwordHash } : {}) };
}

/** Test mode: everything lives in this browser only. */
export class LocalParticipantFileStore implements ParticipantFileStore {
  private static readonly PREFIX = 'jul.participant:';
  private readonly storage: KeyValueStorage;

  constructor(storage: KeyValueStorage) {
    this.storage = storage;
  }

  async listAll(): Promise<ParticipantFile[]> {
    return this.storage
      .keys()
      .filter((k) => k.startsWith(LocalParticipantFileStore.PREFIX))
      .flatMap((k) => {
        const raw = this.storage.getItem(k);
        return raw ? [JSON.parse(raw) as ParticipantFile] : [];
      });
  }

  async read(id: ParticipantId): Promise<ParticipantFile | undefined> {
    const raw = this.storage.getItem(LocalParticipantFileStore.PREFIX + id);
    return raw ? (JSON.parse(raw) as ParticipantFile) : undefined;
  }

  async write(file: ParticipantFile): Promise<void> {
    this.storage.setItem(LocalParticipantFileStore.PREFIX + file.id, JSON.stringify(file));
  }

  async delete(id: ParticipantId): Promise<void> {
    this.storage.removeItem(LocalParticipantFileStore.PREFIX + id);
  }
}
