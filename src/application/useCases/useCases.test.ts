import { describe, expect, it } from 'vitest';
import { createTestServices, december, quiz, riddle } from '../../test/fakes';
import { removeParticipant, resetPassword } from './admin';
import { getFriendsBoard, recordInteractions } from './interactions';
import { DONE, submitAnswer } from './answers';
import { countCorrectToday, getCalendar } from './calendar';
import { createParticipant, getCurrentParticipant, lookUpName, signIn, signOut } from './participants';
import { getScoreboard } from './scoreboard';

type Services = Awaited<ReturnType<typeof createTestServices>>;

function join(services: Services, name: string) {
  return createParticipant(services, name, 'hemmelig');
}

describe('participants', () => {
  it('creates a participant with a personal password and remembers them', async () => {
    const services = await createTestServices(december(1));
    const me = await join(services, ' Bestemor Åse ');
    expect(me).toMatchObject({ id: 'bestemor-aase', name: 'Bestemor Åse' });
    expect(me.passwordHash).toMatch(/^pbkdf2\$/);
    expect(await getCurrentParticipant(services)).toEqual(me);
  });

  it('requires the personal password to log in as an existing name', async () => {
    const services = await createTestServices(december(1));
    await join(services, 'Åse');
    signOut(services);

    expect(await lookUpName(services, 'åse')).toMatchObject({ status: 'existing', hasPassword: true });
    await expect(signIn(services, 'aase', 'feil')).rejects.toThrow('Feil passord');
    expect(await getCurrentParticipant(services)).toBeUndefined();

    await signIn(services, 'aase', 'hemmelig');
    expect((await getCurrentParticipant(services))?.name).toBe('Åse');
  });

  it('rejects too short passwords and taken names', async () => {
    const services = await createTestServices(december(1));
    await expect(createParticipant(services, 'Åse', 'abc')).rejects.toThrow('minst 4');
    await join(services, 'Åse');
    await expect(createParticipant(services, 'ÅSE', 'hemmelig')).rejects.toThrow('allerede tatt');
  });

  it('lets the next password become the new one after an admin reset', async () => {
    const services = await createTestServices(december(1));
    await join(services, 'Åse');
    await resetPassword(services, 'aase');
    signOut(services);

    expect(await lookUpName(services, 'Åse')).toMatchObject({ hasPassword: false });
    await signIn(services, 'aase', 'nyttpassord');
    signOut(services);
    await expect(signIn(services, 'aase', 'hemmelig')).rejects.toThrow('Feil passord');
    await signIn(services, 'aase', 'nyttpassord');
  });
});

describe('answering', () => {
  it('checks quiz answers against the encrypted key', async () => {
    const services = await createTestServices(december(3), [quiz(1), quiz(2)]);
    const me = await join(services, 'Åse');

    expect((await submitAnswer(services, { participantId: me.id, doorId: 'luke-1', response: 'a' })).isCorrect).toBe(true);
    expect((await submitAnswer(services, { participantId: me.id, doorId: 'luke-2', response: 'b' })).isCorrect).toBe(false);
  });

  it('accepts free-text answers with small typos', async () => {
    const services = await createTestServices(december(2), [riddle(2, 'juletre', 'gran')]);
    const me = await join(services, 'Åse');
    const answer = await submitAnswer(services, { participantId: me.id, doorId: 'luke-2', response: 'Et julettre' });
    expect(answer.isCorrect).toBe(true);
  });

  it('gives points for correct, same day and speed', async () => {
    const services = await createTestServices(december(1), [quiz(1)]);
    const first = await join(services, 'Først');
    const second = await join(services, 'Andre');
    await submitAnswer(services, { participantId: first.id, doorId: 'luke-1', response: 'a' });
    await submitAnswer(services, { participantId: second.id, doorId: 'luke-1', response: 'a' });

    const board = await getScoreboard(services);
    expect(board.map((e) => [e.name, e.points])).toEqual([
      ['Først', 6],
      ['Andre', 5],
    ]);
  });

  it('allows only one attempt per door', async () => {
    const services = await createTestServices(december(1), [quiz(1)]);
    const me = await join(services, 'Åse');
    await submitAnswer(services, { participantId: me.id, doorId: 'luke-1', response: 'b' });

    await expect(submitAnswer(services, { participantId: me.id, doorId: 'luke-1', response: 'a' })).rejects.toThrow(
      'allerede svart',
    );
  });

  it('refuses answers to doors that have not opened', async () => {
    const services = await createTestServices(december(1), [quiz(10)]);
    const me = await join(services, 'Åse');
    await expect(submitAnswer(services, { participantId: me.id, doorId: 'luke-10', response: 'a' })).rejects.toThrow(
      'ikke åpen',
    );
  });

  it('records challenges as done without points', async () => {
    const services = await createTestServices(december(6), [{ day: 6, kind: 'challenge', body: ['Lag en snømann'] }]);
    const me = await join(services, 'Åse');
    await submitAnswer(services, { participantId: me.id, doorId: 'luke-6', response: DONE });

    expect(await getScoreboard(services)).toMatchObject([{ points: 0, challengesDone: 1 }]);
  });
});

describe('calendar', () => {
  it('hides content behind locked doors and shows points on answered ones', async () => {
    const services = await createTestServices(december(2), [quiz(1), quiz(5)]);
    const me = await join(services, 'Åse');
    await submitAnswer(services, { participantId: me.id, doorId: 'luke-1', response: 'a' });

    const doors = await getCalendar(services, me.id);

    expect(doors).toHaveLength(24);
    expect(doors[0]).toMatchObject({ state: 'answered', points: { total: 2 } });
    expect(doors[1]).toMatchObject({ state: 'empty', isToday: true });
    expect(doors[4]).toMatchObject({ state: 'locked', content: undefined });
  });

  it('counts how many have answered correctly today', async () => {
    const services = await createTestServices(december(1), [quiz(1)]);
    const me = await join(services, 'Åse');
    await submitAnswer(services, { participantId: me.id, doorId: 'luke-1', response: 'a' });
    expect(await countCorrectToday(services, 'luke-1')).toBe(1);
  });
});

describe('admin', () => {
  it('removes a participant together with their answers', async () => {
    const services = await createTestServices(december(1), [quiz(1)]);
    const me = await join(services, 'Åse');
    await submitAnswer(services, { participantId: me.id, doorId: 'luke-1', response: 'a' });

    await removeParticipant(services, me.id);

    expect(await getScoreboard(services)).toEqual([]);
    expect(await services.answers.findAll()).toEqual([]);
  });

  it('accepts the default admin code', async () => {
    const services = await createTestServices(december(1));
    expect(await services.authenticator.verify('nissefar')).toBe(true);
    expect(await services.authenticator.verify('feil')).toBe(false);
  });
});

describe('nissevenner', () => {
  it('counts interactions per participant and ranks them', async () => {
    const services = await createTestServices(december(1));
    const a = await join(services, 'Åse');
    const b = await join(services, 'Per');
    await join(services, 'Kari');
    await recordInteractions(services, a.id, 3);
    await recordInteractions(services, b.id, 5);
    await recordInteractions(services, a.id, 4);

    expect((await getFriendsBoard(services)).map((e) => [e.name, e.count, e.rank])).toEqual([
      ['Åse', 7, 1],
      ['Per', 5, 2],
    ]);
  });

  it('keeps interactions when answering and when the password is reset', async () => {
    const services = await createTestServices(december(1), [quiz(1)]);
    const me = await join(services, 'Åse');
    await recordInteractions(services, me.id, 2);
    await submitAnswer(services, { participantId: me.id, doorId: 'luke-1', response: 'a' });
    await resetPassword(services, me.id);

    expect(await getFriendsBoard(services)).toMatchObject([{ count: 2 }]);
  });
});
