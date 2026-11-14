import { isAcceptedAnswer } from '../../domain/answerMatching';
import { isDoorOpen } from '../../domain/calendar';
import { isScored } from '../../domain/scoring';
import type { Answer, DoorId, ParticipantId } from '../../domain/types';
import { DomainRuleViolation } from '../errors';
import type { AnswerKeyReader, AnswerRepository, Clock, DoorRepository, ParticipantRepository } from '../ports';

export interface AnswerDeps {
  doors: DoorRepository;
  answers: AnswerRepository;
  participants: ParticipantRepository;
  answerKeys: AnswerKeyReader;
  clock: Clock;
  seasonYear: number;
}

export interface SubmitAnswerCommand {
  participantId: ParticipantId;
  doorId: DoorId;
  /** Option id for quiz, free text for riddle/dingbat, ignored for challenge/surprise. */
  response: string;
}

export const DONE = 'done';

export async function submitAnswer(deps: AnswerDeps, command: SubmitAnswerCommand): Promise<Answer> {
  const today = deps.clock.today();
  const door = (await deps.doors.findAll()).find((d) => d.id === command.doorId);

  if (!door) throw new DomainRuleViolation('Fant ikke luken.');
  if (!(await deps.participants.findById(command.participantId))) {
    throw new DomainRuleViolation('Du må logge inn før du kan svare.');
  }
  if (!isDoorOpen(deps.seasonYear, door.day, today)) {
    throw new DomainRuleViolation('Ingen sniktitting! Denne luken er ikke åpen ennå.');
  }

  const previous = await deps.answers.findByParticipant(command.participantId);
  if (previous.some((a) => a.doorId === door.id)) {
    throw new DomainRuleViolation('Du har allerede svart på denne luken.');
  }

  let response = DONE;
  let isCorrect = false;

  if (isScored(door)) {
    response = command.response.trim();
    if (!response) throw new DomainRuleViolation('Skriv eller velg et svar først.');
    if (door.kind === 'quiz' && !door.options?.some((o) => o.id === response)) {
      throw new DomainRuleViolation('Ugyldig svaralternativ.');
    }
    const key = await deps.answerKeys.read(door);
    isCorrect =
      door.kind === 'quiz' ? key.correctOptionId === response : isAcceptedAnswer(response, key.accepted ?? []);
  }

  const answer: Answer = {
    participantId: command.participantId,
    doorId: door.id,
    response,
    isCorrect,
    answeredOn: today,
    answeredAt: deps.clock.nowIso(),
  };

  await deps.answers.save(answer);
  return answer;
}
