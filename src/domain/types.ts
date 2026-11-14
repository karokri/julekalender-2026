export type ParticipantId = string;
export type DoorId = string;

export interface Participant {
  readonly id: ParticipantId;
  readonly name: string;
  readonly registeredAt: string;
  /** Salted PBKDF2 hash of the participant's own password (see PasswordHasher). */
  readonly passwordHash?: string;
}

/**
 * What hides behind a door.
 * - quiz: multiple choice, scored
 * - riddle / dingbat: free text, scored (tolerant matching)
 * - challenge: something to do in real life, just for fun
 * - surprise: jokes, facts, recipes … nothing to answer
 */
export type DoorKind = 'quiz' | 'riddle' | 'dingbat' | 'challenge' | 'surprise';

export interface AnswerOption {
  readonly id: string;
  readonly text: string;
}

export interface ContentList {
  readonly title?: string;
  readonly items: readonly string[];
  readonly ordered?: boolean;
}

export interface DoorContent {
  readonly id: DoorId;
  /** Day in December (1–24) the door opens. */
  readonly day: number;
  readonly kind: DoorKind;
  readonly title: string;
  readonly prompt?: string;
  readonly body?: readonly string[];
  readonly lists?: readonly ContentList[];
  /** Image path relative to the site root (dingbats). */
  readonly image?: string;
  readonly imageAlt?: string;
  readonly options?: readonly AnswerOption[];
  /** Encrypted {@link AnswerKey} – only scored doors have one. */
  readonly answerCipher?: string;
  readonly funFact?: string;
}

/** The decrypted solution of a scored door. */
export interface AnswerKey {
  /** Quiz: id of the correct option. */
  readonly correctOptionId?: string;
  /** Free text: accepted answers (any spelling variant counts). */
  readonly accepted?: readonly string[];
  /** Shown to the participant after answering. */
  readonly display: string;
}

/** A date without time, interpreted in the calendar's time zone. */
export interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface Answer {
  readonly participantId: ParticipantId;
  readonly doorId: DoorId;
  /** Option id (quiz), typed text (riddle/dingbat) or "done" (challenge/surprise). */
  readonly response: string;
  readonly isCorrect: boolean;
  readonly answeredOn: CalendarDate;
  /** Full ISO timestamp – decides who was fastest. */
  readonly answeredAt: string;
}

export interface PointsBreakdown {
  readonly correct: number;
  readonly sameDay: number;
  readonly speed: number;
  /** 1-based position among same-day correct answers, if it earned a speed bonus. */
  readonly speedPlace?: number;
  readonly total: number;
}

export interface ScoreboardEntry {
  readonly participantId: ParticipantId;
  readonly name: string;
  readonly points: number;
  readonly correctAnswers: number;
  readonly challengesDone: number;
  readonly rank: number;
}
