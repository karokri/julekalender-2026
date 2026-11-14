import { useState } from 'react';
import { config } from '../../app/config';
import { Rosemaling } from '../components/Folk';
import { Nisse } from '../components/Nisse';
import { toError } from '../hooks/useAsync';

interface PasswordViewProps {
  restoring: boolean;
  testMode: boolean;
  onSubmit: (password: string) => Promise<void>;
}

export function PasswordView({ restoring, testMode, onSubmit }: PasswordViewProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (restoring) return <p className="loading">Nissen leter fram kalenderen…</p>;

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit(password);
    } catch (e) {
      setError(toError(e).message);
      setBusy(false);
    }
  };

  return (
    <form
      className="card welcome"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Rosemaling size={160} className="welcome__rose" />
      <Nisse mood={error ? 'surprised' : 'happy'} size={110} className="nisse--bounce" />
      <h1 className="welcome__title">{config.title}</h1>
      <p>Skriv inn fellespassordet du har fått for å komme inn. Etterpå lager du ditt eget.</p>
      <label className="visually-hidden" htmlFor="password">
        Passord
      </label>
      <input
        id="password"
        className="input"
        type="password"
        value={password}
        autoComplete="current-password"
        placeholder={testMode ? 'Testmodus – hva som helst' : 'Passord'}
        onChange={(event) => {
          setPassword(event.target.value);
          setError(undefined);
        }}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button button--primary button--big" disabled={busy || (!password && !testMode)}>
        {busy ? 'Låser opp…' : 'Slipp meg inn! 🎄'}
      </button>
    </form>
  );
}
