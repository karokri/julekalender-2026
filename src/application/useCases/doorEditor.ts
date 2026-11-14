import { emptyDraft, OPTION_IDS, validateDoorDraft, type DoorDraft } from '../../domain/doorDraft';
import { allDoorNumbers } from '../../domain/calendar';
import { isScored } from '../../domain/scoring';
import type { AnswerKey, DoorContent, DoorId } from '../../domain/types';
import { DomainRuleViolation } from '../errors';
import type { AnswerKeyReader, AnswerRepository, DoorRepository } from '../ports';

export interface DoorEditorDeps {
  doors: DoorRepository;
  answerKeys: AnswerKeyReader;
  answers: AnswerRepository;
}

export interface EditableDoor {
  day: number;
  draft: DoorDraft;
  exists: boolean;
  answerCount: number;
}

/** All 24 days, with the solution unlocked so the admin can edit it. */
export async function loadEditableDoors(deps: DoorEditorDeps): Promise<EditableDoor[]> {
  const [doors, answers] = await Promise.all([deps.doors.findAll(), deps.answers.findAll()]);
  return Promise.all(
    allDoorNumbers().map(async (day) => {
      const door = doors.find((d) => d.day === day);
      return {
        day,
        exists: !!door,
        draft: door ? await toDraft(deps, door) : emptyDraft(day),
        answerCount: door ? answers.filter((a) => a.doorId === door.id).length : 0,
      };
    }),
  );
}

export async function saveDoor(deps: DoorEditorDeps, draft: DoorDraft): Promise<DoorContent> {
  const problem = validateDoorDraft(draft);
  if (problem) throw new DomainRuleViolation(problem);

  const prompt = draft.prompt.trim();
  const body = draft.body.map((p) => p.trim()).filter(Boolean);
  const lists = draft.lists
    .map((l) => ({ ...l, title: l.title?.trim() || undefined, items: l.items.map((i) => i.trim()).filter(Boolean) }))
    .filter((l) => l.items.length);

  const door: DoorContent = {
    id: draft.id ?? `luke-${draft.day}`,
    day: draft.day,
    kind: draft.kind,
    title: draft.title.trim(),
    ...(prompt ? { prompt } : {}),
    ...(body.length ? { body } : {}),
    ...(lists.length ? { lists } : {}),
    ...(draft.image ? { image: draft.image, ...(draft.imageAlt?.trim() ? { imageAlt: draft.imageAlt.trim() } : {}) } : {}),
    ...(draft.funFact?.trim() ? { funFact: draft.funFact.trim() } : {}),
  };

  if (draft.kind === 'quiz') {
    const options = draft.options.map((text, i) => ({ id: OPTION_IDS[i], text: text.trim() }));
    const key: AnswerKey = {
      correctOptionId: OPTION_IDS[draft.correctIndex],
      display: draft.display.trim() || options[draft.correctIndex].text,
    };
    Object.assign(door, { options, answerCipher: await deps.answerKeys.seal(key) });
  } else if (isScored(door)) {
    const accepted = draft.accepted.map((a) => a.trim()).filter(Boolean);
    const key: AnswerKey = { accepted, display: draft.display.trim() || accepted[0] };
    Object.assign(door, { answerCipher: await deps.answerKeys.seal(key) });
  }

  await deps.doors.save(door);
  return door;
}

export function clearDoor(deps: DoorEditorDeps, id: DoorId): Promise<void> {
  return deps.doors.remove(id);
}

async function toDraft(deps: DoorEditorDeps, door: DoorContent): Promise<DoorDraft> {
  const base: DoorDraft = {
    ...emptyDraft(door.day),
    id: door.id,
    kind: door.kind,
    title: door.title,
    prompt: door.prompt ?? '',
    body: [...(door.body ?? [])],
    lists: (door.lists ?? []).map((l) => ({ ...l, items: [...l.items] })),
    image: door.image,
    imageAlt: door.imageAlt,
    funFact: door.funFact,
  };
  if (!door.answerCipher) return base;

  const key = await deps.answerKeys.read(door);
  if (door.kind === 'quiz') {
    const options = door.options ?? [];
    const correctIndex = Math.max(0, options.findIndex((o) => o.id === key.correctOptionId));
    const defaultDisplay = options[correctIndex]?.text ?? '';
    return {
      ...base,
      options: options.map((o) => o.text),
      correctIndex,
      display: key.display === defaultDisplay ? '' : key.display,
    };
  }
  const accepted = [...(key.accepted ?? [])];
  return { ...base, accepted, display: key.display === accepted[0] ? '' : key.display };
}
