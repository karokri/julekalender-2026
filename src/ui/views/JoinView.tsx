import { useState, type ReactNode } from 'react';
import { MIN_PASSWORD_LENGTH, type NameLookup } from '../../application/useCases/participants';
import { MAX_NAME_LENGTH } from '../../domain/participantName';
import { Nisse } from '../components/Nisse';
import { NISSE_LOOKS } from '../components/nisseLooks';
import { toError } from '../hooks/useAsync';

interface JoinViewProps {
  onLookUp: (name: string) => Promise<NameLookup>;
  onCreate: (name: string, password: string) => Promise<void>;
  onLogin: (id: string, password: string) => Promise<void>;
}

/**
 * Step 1: who are you? Step 2: either create your own password (first time)
 * or log in with it (new device, or after logging out).
 */
export function JoinView({ onLookUp, onCreate, onLogin }: JoinViewProps) {
  const [name, setName] = useState('');
  const [lookup, setLookup] = useState<NameLookup>();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError(toError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setLookup(undefined);
    setPassword('');
    setRepeat('');
    setError(undefined);
  };

  if (!lookup) {
    return (
      <Card
        mood="happy"
        look={2}
        title="Hvem er du?"
        intro="Skriv navnet ditt. Bruk samme navn på alle telefoner og nettbrett du bruker."
        onSubmit={() => run(async () => setLookup(await onLookUp(name)))}
        error={error}
        submitLabel={busy ? 'Et øyeblikk…' : 'Neste'}
        submitDisabled={busy || !name.trim()}
      >
        <label className="visually-hidden" htmlFor="participant-name">
          Navn
        </label>
        <input
          id="participant-name"
          className="input"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          placeholder="F.eks. Bestemor Åse"
          autoComplete="username"
          autoCapitalize="words"
          onChange={(event) => setName(event.target.value)}
        />
      </Card>
    );
  }

  const creating = lookup.status === 'new' || !lookup.hasPassword;
  const displayName = lookup.status === 'new' ? lookup.name : lookup.participant.name;
  const mismatch = creating && repeat.length > 0 && password !== repeat;

  const submit = () =>
    run(async () => {
      if (creating && password !== repeat) throw new Error('Passordene er ikke like.');
      if (lookup.status === 'new') await onCreate(lookup.name, password);
      else await onLogin(lookup.participant.id, password);
    });

  return (
    <Card
      mood={error ? 'surprised' : 'happy'}
      look={creating ? 1 : 3}
      title={creating ? `Hei, ${displayName}! 👋` : `Velkommen tilbake, ${displayName}!`}
      intro={
        creating
          ? 'Lag ditt eget passord, så er det bare du som kan svare i ditt navn. Du trenger det når du logger inn på en ny telefon.'
          : 'Skriv ditt personlige passord.'
      }
      onSubmit={submit}
      error={error}
      submitLabel={busy ? 'Et øyeblikk…' : creating ? 'Lag passord og bli med!' : 'Logg inn'}
      submitDisabled={busy || !password || (creating && (!repeat || mismatch))}
      secondary={
        <button type="button" className="link-button" onClick={back}>
          {creating ? '← Feil navn? Gå tilbake' : '← Ikke deg? Velg et annet navn'}
        </button>
      }
    >
      {/* Hidden username field so password managers save the name/password pair. */}
      <input
        type="text"
        className="visually-hidden"
        autoComplete="username"
        value={displayName}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
      />
      <label className="visually-hidden" htmlFor="personal-password">
        Ditt passord
      </label>
      <input
        id="personal-password"
        className="input"
        type="password"
        value={password}
        autoComplete={creating ? 'new-password' : 'current-password'}
        placeholder={creating ? `Velg et passord (minst ${MIN_PASSWORD_LENGTH} tegn)` : 'Ditt passord'}
        onChange={(event) => setPassword(event.target.value)}
      />
      {creating && (
        <>
          <label className="visually-hidden" htmlFor="personal-password-repeat">
            Gjenta passordet
          </label>
          <input
            id="personal-password-repeat"
            className="input"
            type="password"
            value={repeat}
            autoComplete="new-password"
            placeholder="Skriv det en gang til"
            onChange={(event) => setRepeat(event.target.value)}
          />
          {mismatch && <p className="form-hint">Passordene er ikke like ennå.</p>}
        </>
      )}
    </Card>
  );
}

interface CardProps {
  mood: 'happy' | 'surprised';
  look: number;
  title: string;
  intro: string;
  onSubmit: () => void;
  error?: string;
  submitLabel: string;
  submitDisabled: boolean;
  secondary?: ReactNode;
  children: ReactNode;
}

function Card({ mood, look, title, intro, onSubmit, error, submitLabel, submitDisabled, secondary, children }: CardProps) {
  return (
    <form
      className="card welcome"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Nisse mood={mood} look={NISSE_LOOKS[look]} size={110} className="nisse--bounce" />
      <h2>{title}</h2>
      <p>{intro}</p>
      {children}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button button--primary button--big" disabled={submitDisabled}>
        {submitLabel}
      </button>
      {secondary}
    </form>
  );
}
