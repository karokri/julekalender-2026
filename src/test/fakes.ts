import type { Clock } from '../application/ports';
import { createContainer } from '../app/container';
import { toIsoDate } from '../domain/calendar';
import type { AnswerKey, CalendarDate, DoorContent } from '../domain/types';
import { bytesToB64, deriveKey, encryptWithKey } from '../infrastructure/crypto';
import { LocalDoorStore, type DoorsFile } from '../infrastructure/doors';
import { LocalParticipantFileStore } from '../infrastructure/participantFiles';
import { InMemoryStorage } from '../infrastructure/storage';

export class FixedClock implements Clock {
  date: CalendarDate;
  private tick = 0;

  constructor(date: CalendarDate) {
    this.date = date;
  }

  today(): CalendarDate {
    return this.date;
  }

  /** Every call is one second later, so answer order is deterministic. */
  nowIso(): string {
    this.tick += 1;
    return `${toIsoDate(this.date)}T10:00:${String(this.tick).padStart(2, '0')}.000Z`;
  }
}

export function december(day: number, year = 2026): CalendarDate {
  return { year, month: 12, day };
}

export const TEST_PASSWORD = 'pepperkake';

export type DoorSpec = Omit<DoorContent, 'id' | 'answerCipher' | 'title'> & { title?: string; key?: AnswerKey };

/** Builds a doors.json the same way scripts/publish-doors.mjs does. */
export async function buildDoorsFile(specs: DoorSpec[], password = TEST_PASSWORD): Promise<DoorsFile> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const doors = await Promise.all(
    specs.map(async ({ key: answerKey, ...spec }) => ({
      id: `luke-${spec.day}`,
      title: `Luke ${spec.day}`,
      ...spec,
      ...(answerKey ? { answerCipher: bytesToB64(await encryptWithKey(key, JSON.stringify(answerKey))) } : {}),
    })),
  );
  return { keySalt: bytesToB64(salt), doors };
}

export const quiz = (day: number): DoorSpec => ({
  day,
  kind: 'quiz',
  prompt: `Spørsmål ${day}`,
  options: [
    { id: 'a', text: 'Riktig' },
    { id: 'b', text: 'Feil' },
  ],
  key: { correctOptionId: 'a', display: 'Riktig' },
});

export const riddle = (day: number, ...accepted: string[]): DoorSpec => ({
  day,
  kind: 'riddle',
  prompt: 'Gåte',
  key: { accepted, display: accepted[0] },
});

/** A real container wired with in-memory storage, a fixed clock and in-memory doors. */
export async function createTestServices(today: CalendarDate, doors: DoorSpec[] = []) {
  const file = await buildDoorsFile(doors);
  const storage = new InMemoryStorage();
  const container = createContainer({
    storage,
    files: new LocalParticipantFileStore(storage),
    doorStore: new LocalDoorStore(storage),
    contentPassword: TEST_PASSWORD,
    loadDoors: async () => file,
  });
  container.currentParticipant.savePassword(TEST_PASSWORD);
  return { ...container, clock: new FixedClock(today), seasonYear: 2026 };
}
