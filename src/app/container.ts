import { fromIsoDate } from '../domain/calendar';
import { Doors, EncryptedAnswerKeyReader, fetchDoorsFile, type DoorStore, type DoorsSource } from '../infrastructure/doors';
import { participantRepositories, type ParticipantFileStore } from '../infrastructure/participantFiles';
import { SessionStore } from '../infrastructure/session';
import type { KeyValueStorage } from '../infrastructure/storage';
import {
  HashedCodeAuthenticator,
  Pbkdf2PasswordHasher,
  SimulatableClock,
  WebCryptoHasher,
  ZonedClock,
} from '../infrastructure/system';
import { config } from './config';

export interface ContainerOptions {
  storage: KeyValueStorage;
  /** Where participants and answers are stored (GitHub, or the browser in test mode). */
  files: ParticipantFileStore;
  /** Where the admin's door edits are saved. */
  doorStore: DoorStore;
  /** Password the answer keys in doors.json are encrypted with. */
  contentPassword: string;
  /** Starting content until the admin has saved anything (public/doors.json). */
  loadDoors?: DoorsSource;
}

/** Composition root: the only place that knows which adapters implement the ports. */
export function createContainer({
  storage,
  files,
  doorStore,
  contentPassword,
  loadDoors = fetchDoorsFile(config.doorsUrl),
}: ContainerOptions) {
  const hasher = new WebCryptoHasher();
  const clock = new SimulatableClock(
    new ZonedClock(config.timeZone),
    storage,
    config.demoDate ? fromIsoDate(config.demoDate) : undefined,
  );
  const doors = new Doors(doorStore, loadDoors);
  const { participants, answers, interactions } = participantRepositories(files);

  return {
    seasonYear: config.seasonYear,
    clock,
    hasher,
    doors,
    answerKeys: new EncryptedAnswerKeyReader(doors, contentPassword),
    participants,
    answers,
    interactions,
    currentParticipant: new SessionStore(storage),
    passwords: new Pbkdf2PasswordHasher(),
    authenticator: new HashedCodeAuthenticator(hasher, config.adminCodeHash),
  };
}

export type Container = ReturnType<typeof createContainer>;
