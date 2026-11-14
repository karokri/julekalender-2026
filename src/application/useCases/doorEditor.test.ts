import { describe, expect, it } from 'vitest';
import { emptyDraft } from '../../domain/doorDraft';
import { createParticipant } from './participants';
import { createTestServices, december, quiz, riddle } from '../../test/fakes';
import { submitAnswer } from './answers';
import { clearDoor, loadEditableDoors, saveDoor } from './doorEditor';
import { getCalendar } from './calendar';

describe('door editor', () => {
  it('lists all 24 days with existing doors unlocked for editing', async () => {
    const services = await createTestServices(december(1), [quiz(1), riddle(2, 'juletre', 'gran')]);
    const doors = await loadEditableDoors(services);

    expect(doors).toHaveLength(24);
    expect(doors[0]).toMatchObject({ exists: true, draft: { kind: 'quiz', options: ['Riktig', 'Feil'], correctIndex: 0 } });
    expect(doors[1].draft).toMatchObject({ kind: 'riddle', accepted: ['juletre', 'gran'] });
    expect(doors[2]).toMatchObject({ exists: false, draft: { day: 3 } });
  });

  it('saves a new quiz door with an encrypted answer that players can answer', async () => {
    const services = await createTestServices(december(5));
    await saveDoor(services, {
      ...emptyDraft(5),
      title: 'Ny quiz',
      prompt: 'Hva er 2 + 2?',
      options: ['3', '4', '5'],
      correctIndex: 1,
    });

    const door = (await services.doors.findAll())[0];
    expect(door.answerCipher).toBeTruthy();
    expect(JSON.stringify(door)).not.toContain('"correctIndex"');

    const me = await createParticipant(services, 'Åse', 'hemmelig');
    const answer = await submitAnswer(services, { participantId: me.id, doorId: door.id, response: 'b' });
    expect(answer.isCorrect).toBe(true);
  });

  it('replaces the door on the same day and keeps the solution when editing', async () => {
    const services = await createTestServices(december(2), [riddle(2, 'juletre')]);
    const [, day2] = await loadEditableDoors(services);
    await saveDoor(services, { ...day2.draft, title: 'Ny tittel', accepted: ['juletre', 'grantre'] });

    const doors = await services.doors.findAll();
    expect(doors).toHaveLength(1);
    expect(doors[0].title).toBe('Ny tittel');
    expect((await services.answerKeys.read(doors[0])).accepted).toEqual(['juletre', 'grantre']);
  });

  it('rejects incomplete doors', async () => {
    const services = await createTestServices(december(1));
    await expect(saveDoor(services, { ...emptyDraft(1), title: 'Quiz', prompt: 'Hm?', options: ['Bare én', ''] })).rejects.toThrow(
      'minst to',
    );
    await expect(saveDoor(services, { ...emptyDraft(1), kind: 'dingbat', title: 'D', prompt: 'Hva?', accepted: ['x'] })).rejects.toThrow(
      'bilde',
    );
  });

  it('can empty a door', async () => {
    const services = await createTestServices(december(1), [quiz(1)]);
    await clearDoor(services, 'luke-1');
    expect((await getCalendar(services))[0].state).toBe('empty');
  });

  it('counts existing answers so the admin is warned before changing a solution', async () => {
    const services = await createTestServices(december(1), [quiz(1)]);
    const me = await createParticipant(services, 'Åse', 'hemmelig');
    await submitAnswer(services, { participantId: me.id, doorId: 'luke-1', response: 'a' });
    expect((await loadEditableDoors(services))[0].answerCount).toBe(1);
  });
});
