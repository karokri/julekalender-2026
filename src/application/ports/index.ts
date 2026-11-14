import type {
  Answer,
  AnswerKey,
  CalendarDate,
  DoorContent,
  DoorId,
  Participant,
  ParticipantId,
} from '../../domain/types';

/*
 * Ports: the application layer depends only on these abstractions.
 * Infrastructure provides a GitHub-backed implementation (shared between everyone)
 * and an in-browser one (test mode).
 */

export interface ParticipantRepository {
  findAll(): Promise<Participant[]>;
  findById(id: ParticipantId): Promise<Participant | undefined>;
  save(participant: Participant): Promise<void>;
  remove(id: ParticipantId): Promise<void>;
}

export interface AnswerRepository {
  findAll(): Promise<Answer[]>;
  findByParticipant(participantId: ParticipantId): Promise<Answer[]>;
  save(answer: Answer): Promise<void>;
}

/** Tickles and cookies in Nissetunet – counted per participant. */
export interface InteractionRepository {
  add(participantId: ParticipantId, count: number): Promise<void>;
  findAll(): Promise<{ participantId: ParticipantId; count: number }[]>;
}

export interface DoorRepository {
  findAll(): Promise<DoorContent[]>;
  /** Adds or replaces the door for its day. */
  save(door: DoorContent): Promise<void>;
  remove(id: DoorId): Promise<void>;
}

/** Locks and unlocks the encrypted solution of a door. */
export interface AnswerKeyReader {
  read(door: DoorContent): Promise<AnswerKey>;
  /** Encrypts a solution, ready to store as `answerCipher`. */
  seal(key: AnswerKey): Promise<string>;
}

/** Remembers which participant is using this browser. */
export interface CurrentParticipantStore {
  get(): ParticipantId | undefined;
  set(id: ParticipantId): void;
  clear(): void;
}

export interface Clock {
  today(): CalendarDate;
  /** Full ISO timestamp, used to rank the fastest answers. */
  nowIso(): string;
}

export interface Hasher {
  sha256(text: string): Promise<string>;
}

export interface AdminAuthenticator {
  verify(code: string): Promise<boolean>;
}

/** Hashes and verifies the personal passwords participants choose. */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, stored: string): Promise<boolean>;
}
