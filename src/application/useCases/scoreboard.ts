import { buildScoreboard } from '../../domain/scoring';
import type { ScoreboardEntry } from '../../domain/types';
import type { AnswerRepository, DoorRepository, ParticipantRepository } from '../ports';

export interface ScoreboardDeps {
  participants: ParticipantRepository;
  answers: AnswerRepository;
  doors: DoorRepository;
  seasonYear: number;
}

export async function getScoreboard(deps: ScoreboardDeps): Promise<ScoreboardEntry[]> {
  const [participants, answers, doors] = await Promise.all([
    deps.participants.findAll(),
    deps.answers.findAll(),
    deps.doors.findAll(),
  ]);
  return buildScoreboard(participants, answers, doors, deps.seasonYear);
}
