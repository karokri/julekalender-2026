import { describe, expect, it } from 'vitest';
import { answerKey, buildScoreboard, POINTS, scoreAnswers } from './scoring';
import type { Answer, DoorContent, Participant } from './types';

const doors: DoorContent[] = [
  { id: 'q1', day: 1, kind: 'quiz', title: 'Quiz' },
  { id: 'q2', day: 2, kind: 'riddle', title: 'Gåte' },
  { id: 'c3', day: 3, kind: 'challenge', title: 'Utfordring' },
];

function answer(participantId: string, doorId: string, day: number, time: string, isCorrect = true): Answer {
  return {
    participantId,
    doorId,
    response: 'x',
    isCorrect,
    answeredOn: { year: 2026, month: 12, day },
    answeredAt: `2026-12-${String(day).padStart(2, '0')}T${time}Z`,
  };
}

const participants: Participant[] = ['anna', 'bjorn', 'cato', 'dina'].map((id) => ({
  id,
  name: id[0].toUpperCase() + id.slice(1),
  registeredAt: '2026-11-30',
}));

describe('scoreAnswers', () => {
  it('gives speed bonus to the first three correct same-day answers', () => {
    const answers = [
      answer('bjorn', 'q1', 1, '08:00:00'),
      answer('anna', 'q1', 1, '07:00:00'),
      answer('cato', 'q1', 1, '09:00:00'),
      answer('dina', 'q1', 1, '10:00:00'),
    ];
    const points = scoreAnswers(answers, doors, 2026);
    const total = (id: string) => points.get(answerKey({ participantId: id, doorId: 'q1' }))!.total;
    const base = POINTS.correct + POINTS.sameDayBonus;

    expect(total('anna')).toBe(base + POINTS.speedBonus[0]);
    expect(total('bjorn')).toBe(base + POINTS.speedBonus[1]);
    expect(total('cato')).toBe(base + POINTS.speedBonus[2]);
    expect(total('dina')).toBe(base);
  });

  it('gives no bonus for late answers and nothing for wrong ones', () => {
    const answers = [answer('anna', 'q1', 3, '07:00:00'), answer('bjorn', 'q1', 1, '07:00:00', false)];
    const points = scoreAnswers(answers, doors, 2026);
    expect(points.get('anna/q1')).toMatchObject({ total: POINTS.correct, sameDay: 0, speed: 0 });
    expect(points.get('bjorn/q1')?.total).toBe(0);
  });

  it('wrong answers do not take a speed place', () => {
    const answers = [answer('anna', 'q1', 1, '07:00:00', false), answer('bjorn', 'q1', 1, '08:00:00')];
    expect(scoreAnswers(answers, doors, 2026).get('bjorn/q1')?.speedPlace).toBe(1);
  });

  it('challenges never give points', () => {
    const points = scoreAnswers([answer('anna', 'c3', 3, '07:00:00', false)], doors, 2026);
    expect(points.get('anna/c3')?.total).toBe(0);
  });
});

describe('buildScoreboard', () => {
  it('ranks by points, shares ranks on ties and counts challenges', () => {
    const answers = [
      answer('anna', 'q1', 1, '07:00:00'),
      answer('bjorn', 'q1', 2, '07:00:00'),
      answer('cato', 'q1', 2, '08:00:00'),
      answer('cato', 'c3', 3, '08:00:00', false),
    ];
    const board = buildScoreboard(participants, answers, doors, 2026);

    expect(board.map((e) => [e.name, e.rank])).toEqual([
      ['Anna', 1],
      ['Bjorn', 2],
      ['Cato', 2],
      ['Dina', 4],
    ]);
    expect(board.find((e) => e.name === 'Cato')?.challengesDone).toBe(1);
  });
});
