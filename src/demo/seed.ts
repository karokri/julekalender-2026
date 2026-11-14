import type { Container } from '../app/container';
import { doorDate, isDoorOpen, toIsoDate } from '../domain/calendar';
import { participantIdFromName } from '../domain/participantName';
import { isScored } from '../domain/scoring';
import type { Answer, DoorContent } from '../domain/types';

const DEMO_PEOPLE = [
  { name: 'Bestemor Åse', skill: 0.9, early: 0.9, tickles: 34 },
  { name: 'Onkel Per', skill: 0.75, early: 0.5, tickles: 12 },
  { name: 'Lillebror', skill: 0.55, early: 0.8, tickles: 187 },
  { name: 'Tante Kari', skill: 0.8, early: 0.3, tickles: 5 },
  { name: 'Kusine Ida', skill: 0.65, early: 0.6, tickles: 76 },
  { name: 'Morfar Nils', skill: 0.85, early: 0.95, tickles: 0 },
];

/**
 * Fills the scoreboard with pretend friends and family who have answered
 * every door that is open on the (simulated) date.
 */
export async function seedDemoParticipants(services: Container): Promise<number> {
  const today = services.clock.today();
  const doors = (await services.doors.findAll()).filter((d) => isDoorOpen(services.seasonYear, d.day, today));
  const random = seeded(2026);

  for (const person of DEMO_PEOPLE) {
    const id = participantIdFromName(person.name);
    if (!(await services.participants.findById(id))) {
      await services.participants.save({
        id,
        name: person.name,
        registeredAt: `${services.seasonYear}-11-30`,
        passwordHash: await services.passwords.hash('demo'),
      });
      await services.interactions.add(id, person.tickles);
    }
    const existing = new Set((await services.answers.findByParticipant(id)).map((a) => a.doorId));
    for (const door of doors) {
      if (existing.has(door.id) || door.kind === 'surprise') continue;
      if (door.kind === 'challenge' && random() > 0.6) continue;
      await services.answers.save(await fakeAnswer(services, id, door, person, random));
    }
  }
  return DEMO_PEOPLE.length;
}

async function fakeAnswer(
  services: Container,
  participantId: string,
  door: DoorContent,
  person: { skill: number; early: number },
  random: () => number,
): Promise<Answer> {
  const sameDay = random() < person.early;
  const date = sameDay ? doorDate(services.seasonYear, door.day) : doorDate(services.seasonYear, Math.min(24, door.day + 1));
  const hour = String(7 + Math.floor(random() * 14)).padStart(2, '0');
  const minute = String(Math.floor(random() * 60)).padStart(2, '0');
  const answeredAt = `${toIsoDate(date)}T${hour}:${minute}:00.000Z`;

  if (!isScored(door)) {
    return { participantId, doorId: door.id, response: 'done', isCorrect: false, answeredOn: date, answeredAt };
  }
  const key = await services.answerKeys.read(door);
  const isCorrect = random() < person.skill;
  const response =
    door.kind === 'quiz'
      ? isCorrect
        ? key.correctOptionId!
        : (door.options?.find((o) => o.id !== key.correctOptionId)?.id ?? 'a')
      : isCorrect
        ? (key.accepted?.[0] ?? '')
        : 'ingen anelse';
  return { participantId, doorId: door.id, response, isCorrect, answeredOn: date, answeredAt };
}

/** Deterministic pseudo-random numbers, so the demo looks the same every time. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
