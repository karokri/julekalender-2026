import { useEffect, useRef, useState } from 'react';
import { countCorrectToday, type Door } from '../../../application/useCases/calendar';
import { DONE, submitAnswer } from '../../../application/useCases/answers';
import { isScored, POINTS } from '../../../domain/scoring';
import type { Answer, DoorContent, Participant, PointsBreakdown } from '../../../domain/types';
import { useServices } from '../../hooks/servicesContext';
import { toError, useAsync } from '../../hooks/useAsync';
import { Confetti } from '../Confetti';
import { Modal } from '../Modal';
import { Nisse } from '../Nisse';
import { NISSE_LOOKS } from '../nisseLooks';
import { DoorBody } from './DoorBody';
import { KIND_LABELS } from './kindLabels';
import './door.css';

/** Titles that only repeat the kind label aren't shown twice. */
const GENERIC_TITLES = new Set(['Dingbat', 'Gåte', 'Quiz']);

interface DoorDialogProps {
  door: Door & { content: DoorContent };
  participant: Participant;
  onClose: () => void;
}

export function DoorDialog({ door, participant, onClose }: DoorDialogProps) {
  const { services, notifyChanged } = useServices();
  const content = door.content;
  const [answer, setAnswer] = useState<Answer | undefined>(door.answer);
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false);

  const submit = async (response: string) => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      setAnswer(await submitAnswer(services, { participantId: participant.id, doorId: content.id, response }));
      setJustAnswered(true);
      notifyChanged();
    } catch (e) {
      setError(toError(e).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Opening a surprise counts as "seen", so the door stays open in the calendar.
  const markedSurprise = useRef(false);
  useEffect(() => {
    if (content.kind !== 'surprise' || door.answer || markedSurprise.current) return;
    markedSurprise.current = true;
    submitAnswer(services, { participantId: participant.id, doorId: content.id, response: DONE })
      .then(setAnswer)
      .then(notifyChanged)
      .catch(() => {
        /* not important – the surprise is shown either way */
      });
  }, [content, door.answer, participant.id, services, notifyChanged]);

  return (
    <Modal title={`Luke ${door.number}`} onClose={onClose}>
      <p className="door-kind">{KIND_LABELS[content.kind]}</p>
      {!GENERIC_TITLES.has(content.title) && <h3 className="door-title">{content.title}</h3>}
      <DoorBody content={content} />

      {isScored(content) &&
        (answer ? (
          <ScoredResult content={content} answer={answer} points={door.points} celebrate={justAnswered} />
        ) : (
          <>
            {door.isToday && <SpeedTeaser doorId={content.id} />}
            {content.kind === 'quiz' ? (
              <QuizForm content={content} disabled={isSubmitting} onSubmit={submit} />
            ) : (
              <TextAnswerForm disabled={isSubmitting} onSubmit={submit} />
            )}
            <p className="quiz__hint">Du har bare ett forsøk – tenk deg godt om!</p>
          </>
        ))}

      {content.kind === 'challenge' &&
        (answer ? (
          <div className="quiz__result is-correct">
            {justAnswered && <Confetti />}
            <Nisse mood="happy" look={NISSE_LOOKS[3]} size={110} className="nisse--bounce" />
            <p className="quiz__verdict">Så flink du er! 🎉</p>
            <p>Utfordringer gir ikke poeng, men du får en 🎯 på poengtavla.</p>
          </div>
        ) : (
          <button
            type="button"
            className="button button--primary button--big"
            disabled={isSubmitting}
            onClick={() => void submit(DONE)}
          >
            Jeg har gjort det! 🎯
          </button>
        ))}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

function SpeedTeaser({ doorId }: { doorId: string }) {
  const { services } = useServices();
  const count = useAsync(() => countCorrectToday(services, doorId), [services, doorId]);
  const place = count.status === 'success' ? count.data + 1 : undefined;
  const bonus = place ? (POINTS.speedBonus[place - 1] ?? 0) : 0;

  return (
    <p className="quiz__bonus">
      ⭐ Svar i dag for +{POINTS.sameDayBonus} bonus
      {bonus > 0 && (
        <>
          {' '}
          – og er du den {ordinal(place!)} som svarer riktig, får du +{bonus} for fart! ⚡
        </>
      )}
    </p>
  );
}

function QuizForm({
  content,
  disabled,
  onSubmit,
}: {
  content: DoorContent;
  disabled: boolean;
  onSubmit: (optionId: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string>();
  return (
    <form
      className="quiz__form"
      onSubmit={(event) => {
        event.preventDefault();
        if (selected) void onSubmit(selected);
      }}
    >
      <fieldset className="quiz__options">
        <legend className="visually-hidden">Svaralternativer</legend>
        {content.options?.map((option, index) => (
          <label key={option.id} className={`quiz__option ${selected === option.id ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="option"
              value={option.id}
              checked={selected === option.id}
              onChange={() => setSelected(option.id)}
            />
            <span className="quiz__letter">{String.fromCharCode(65 + index)}</span>
            {option.text}
          </label>
        ))}
      </fieldset>
      <button type="submit" className="button button--primary button--big" disabled={!selected || disabled}>
        {disabled ? 'Sender…' : 'Svar!'}
      </button>
    </form>
  );
}

function TextAnswerForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState('');
  return (
    <form
      className="quiz__form"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim()) void onSubmit(text);
      }}
    >
      <label className="visually-hidden" htmlFor="free-answer">
        Ditt svar
      </label>
      <input
        id="free-answer"
        className="input input--big"
        value={text}
        maxLength={80}
        autoComplete="off"
        placeholder="Skriv svaret ditt her"
        onChange={(event) => setText(event.target.value)}
      />
      <p className="quiz__hint">Små skrivefeil er helt greit 😊</p>
      <button type="submit" className="button button--primary button--big" disabled={!text.trim() || disabled}>
        {disabled ? 'Sender…' : 'Svar!'}
      </button>
    </form>
  );
}

function ScoredResult({
  content,
  answer,
  points,
  celebrate,
}: {
  content: DoorContent;
  answer: Answer;
  points?: PointsBreakdown;
  celebrate: boolean;
}) {
  const { services } = useServices();
  const key = useAsync(() => services.answerKeys.read(content), [services, content]);
  const yourAnswer =
    content.kind === 'quiz' ? content.options?.find((o) => o.id === answer.response)?.text : answer.response;

  return (
    <div className={`quiz__result ${answer.isCorrect ? 'is-correct' : 'is-wrong'}`}>
      {answer.isCorrect && celebrate && <Confetti />}
      <Nisse
        mood={answer.isCorrect ? 'happy' : 'sad'}
        look={NISSE_LOOKS[answer.isCorrect ? 1 : 2]}
        size={120}
        className={answer.isCorrect ? 'nisse--bounce' : undefined}
      />
      <p className="quiz__verdict">{answer.isCorrect ? 'Riktig! 🎉' : 'Å nei, det var feil…'}</p>
      <p>
        Ditt svar: <strong>{yourAnswer}</strong>
      </p>
      {key.status === 'success' && (
        <p>
          Riktig svar: <strong>{key.data.display}</strong>
        </p>
      )}
      {answer.isCorrect && points && <PointsList points={points} />}
      {content.funFact && <p className="quiz__fact">💡 {content.funFact}</p>}
    </div>
  );
}

function PointsList({ points }: { points: PointsBreakdown }) {
  return (
    <ul className="points-list">
      <li>Riktig svar: +{points.correct}</li>
      {points.sameDay > 0 && <li>Samme dag: +{points.sameDay}</li>}
      {points.speed > 0 && (
        <li>
          Fartsbonus ({ordinal(points.speedPlace!)} raskest): +{points.speed} ⚡
        </li>
      )}
      <li className="points-list__total">Totalt: {points.total} poeng</li>
    </ul>
  );
}

function ordinal(place: number): string {
  return ['første', 'andre', 'tredje'][place - 1] ?? `${place}.`;
}
