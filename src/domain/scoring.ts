import { doorDate, isSameDate } from './calendar';
import type { Answer, DoorContent, DoorKind, Participant, PointsBreakdown, ScoreboardEntry } from './types';

/** All the knobs for the scoring rules live here. */
export const POINTS = {
  correct: 2,
  sameDayBonus: 1,
  /** Bonus for the 1st, 2nd and 3rd correct answer on the door's own day. */
  speedBonus: [3, 2, 1] as readonly number[],
} as const;

export const SCORED_KINDS: ReadonlySet<DoorKind> = new Set(['quiz', 'riddle', 'dingbat']);

export function isScored(door: Pick<DoorContent, 'kind'>): boolean {
  return SCORED_KINDS.has(door.kind);
}

export function answerKey(answer: Pick<Answer, 'participantId' | 'doorId'>): string {
  return `${answer.participantId}/${answer.doorId}`;
}

const NO_POINTS: PointsBreakdown = { correct: 0, sameDay: 0, speed: 0, total: 0 };

/**
 * Scores every answer. Points depend on the other participants (speed bonus),
 * so they are always calculated from the full set of answers, never stored.
 */
export function scoreAnswers(
  answers: readonly Answer[],
  doors: readonly DoorContent[],
  seasonYear: number,
): Map<string, PointsBreakdown> {
  const doorsById = new Map(doors.map((d) => [d.id, d]));
  const result = new Map<string, PointsBreakdown>();

  const sameDayCorrectByDoor = new Map<string, Answer[]>();
  for (const answer of answers) {
    const door = doorsById.get(answer.doorId);
    if (!door || !isScored(door) || !answer.isCorrect) continue;
    if (!isSameDate(answer.answeredOn, doorDate(seasonYear, door.day))) continue;
    const list = sameDayCorrectByDoor.get(door.id) ?? [];
    list.push(answer);
    sameDayCorrectByDoor.set(door.id, list);
  }

  const speedPlaces = new Map<string, number>();
  for (const list of sameDayCorrectByDoor.values()) {
    [...list]
      .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt) || a.participantId.localeCompare(b.participantId))
      .forEach((answer, index) => speedPlaces.set(answerKey(answer), index + 1));
  }

  for (const answer of answers) {
    const door = doorsById.get(answer.doorId);
    if (!door || !isScored(door) || !answer.isCorrect) {
      result.set(answerKey(answer), NO_POINTS);
      continue;
    }
    const place = speedPlaces.get(answerKey(answer));
    const sameDay = place !== undefined ? POINTS.sameDayBonus : 0;
    const speed = place !== undefined ? (POINTS.speedBonus[place - 1] ?? 0) : 0;
    result.set(answerKey(answer), {
      correct: POINTS.correct,
      sameDay,
      speed,
      speedPlace: speed > 0 ? place : undefined,
      total: POINTS.correct + sameDay + speed,
    });
  }
  return result;
}

export function buildScoreboard(
  participants: readonly Participant[],
  answers: readonly Answer[],
  doors: readonly DoorContent[],
  seasonYear: number,
): ScoreboardEntry[] {
  const points = scoreAnswers(answers, doors, seasonYear);
  const doorsById = new Map(doors.map((d) => [d.id, d]));

  const unranked = participants.map((participant) => {
    const own = answers.filter((a) => a.participantId === participant.id);
    return {
      participantId: participant.id,
      name: participant.name,
      points: sum(own.map((a) => points.get(answerKey(a))?.total ?? 0)),
      correctAnswers: own.filter((a) => a.isCorrect).length,
      challengesDone: own.filter((a) => doorsById.get(a.doorId)?.kind === 'challenge').length,
    };
  });

  const sorted = unranked.sort(
    (a, b) => b.points - a.points || b.correctAnswers - a.correctAnswers || a.name.localeCompare(b.name, 'nb'),
  );

  return sorted.map((entry) => ({
    ...entry,
    rank: sorted.findIndex((other) => other.points === entry.points) + 1,
  }));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
