import { FIRST_DOOR, LAST_DOOR } from './calendar';
import type { ContentList, DoorKind } from './types';

/** A door as the admin edits it – with the solution in plain text. */
export interface DoorDraft {
  id?: string;
  day: number;
  kind: DoorKind;
  title: string;
  prompt: string;
  body: string[];
  lists: ContentList[];
  image?: string;
  imageAlt?: string;
  funFact?: string;
  /** Quiz */
  options: string[];
  correctIndex: number;
  /** Riddle / dingbat */
  accepted: string[];
  /** Shown after answering; defaults to the correct option / first accepted answer. */
  display: string;
}

export const OPTION_IDS = 'abcdefgh';
export const MAX_OPTIONS = 6;

export function emptyDraft(day: number): DoorDraft {
  return {
    day,
    kind: 'quiz',
    title: '',
    prompt: '',
    body: [],
    lists: [],
    options: ['', ''],
    correctIndex: 0,
    accepted: [],
    display: '',
  };
}

/** Returns the first problem with the draft, or undefined if it can be saved. */
export function validateDoorDraft(draft: DoorDraft): string | undefined {
  if (!Number.isInteger(draft.day) || draft.day < FIRST_DOOR || draft.day > LAST_DOOR) {
    return `Dag må være mellom ${FIRST_DOOR} og ${LAST_DOOR}.`;
  }
  if (!draft.title.trim()) return 'Luken trenger en tittel.';

  switch (draft.kind) {
    case 'quiz': {
      const options = draft.options.map((o) => o.trim());
      if (!draft.prompt.trim()) return 'Skriv spørsmålet.';
      if (options.filter(Boolean).length < 2) return 'En quiz trenger minst to svaralternativer.';
      if (options.some((o) => !o)) return 'Fjern tomme svaralternativer.';
      if (options.length > MAX_OPTIONS) return `Maks ${MAX_OPTIONS} svaralternativer.`;
      if (draft.correctIndex < 0 || draft.correctIndex >= options.length) return 'Velg hvilket alternativ som er riktig.';
      return undefined;
    }
    case 'riddle':
    case 'dingbat':
      if (draft.kind === 'dingbat' && !draft.image) return 'En dingbat trenger et bilde.';
      if (!draft.prompt.trim()) return 'Skriv spørsmålet (f.eks. «Hvilket juleord er dette?»).';
      if (!draft.accepted.some((a) => a.trim())) return 'Legg inn minst ett godkjent svar.';
      return undefined;
    case 'challenge':
    case 'surprise':
      if (!draft.prompt.trim() && !draft.body.some((p) => p.trim()) && !draft.lists.length) {
        return 'Skriv noe tekst i luken.';
      }
      return undefined;
  }
}
