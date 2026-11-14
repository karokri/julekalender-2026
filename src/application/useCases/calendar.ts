import { allDoorNumbers, isDoorOpen, isDoorsDay } from '../../domain/calendar';
import { answerKey, scoreAnswers } from '../../domain/scoring';
import type { Answer, DoorContent, ParticipantId, PointsBreakdown } from '../../domain/types';
import type { AnswerRepository, Clock, DoorRepository } from '../ports';

export interface CalendarDeps {
  doors: DoorRepository;
  answers: AnswerRepository;
  clock: Clock;
  seasonYear: number;
}

export type DoorState = 'locked' | 'open' | 'answered' | 'empty';

export interface Door {
  readonly number: number;
  readonly state: DoorState;
  readonly isToday: boolean;
  readonly content?: DoorContent;
  readonly answer?: Answer;
  readonly points?: PointsBreakdown;
}

export async function getCalendar(deps: CalendarDeps, participantId?: ParticipantId): Promise<Door[]> {
  const today = deps.clock.today();
  const [doors, allAnswers] = await Promise.all([deps.doors.findAll(), deps.answers.findAll()]);
  const points = scoreAnswers(allAnswers, doors, deps.seasonYear);
  const mine = allAnswers.filter((a) => a.participantId === participantId);

  return allDoorNumbers().map((number) => {
    const open = isDoorOpen(deps.seasonYear, number, today);
    const content = open ? doors.find((d) => d.day === number) : undefined;
    const answer = content ? mine.find((a) => a.doorId === content.id) : undefined;

    return {
      number,
      isToday: isDoorsDay(deps.seasonYear, number, today),
      state: !open ? 'locked' : !content ? 'empty' : answer ? 'answered' : 'open',
      content,
      answer,
      points: answer ? points.get(answerKey(answer)) : undefined,
    };
  });
}

/** How many have already answered correctly today – shown to tease the speed bonus. */
export async function countCorrectToday(deps: CalendarDeps, doorId: string): Promise<number> {
  const today = deps.clock.today();
  const answers = await deps.answers.findAll();
  return answers.filter(
    (a) =>
      a.doorId === doorId &&
      a.isCorrect &&
      a.answeredOn.year === today.year &&
      a.answeredOn.month === today.month &&
      a.answeredOn.day === today.day,
  ).length;
}
