import { removeParticipant, resetPassword } from '../../../application/useCases/admin';
import { getScoreboard } from '../../../application/useCases/scoreboard';
import type { ScoreboardEntry } from '../../../domain/types';
import { useServices } from '../../hooks/servicesContext';
import { useAsync } from '../../hooks/useAsync';

export function ParticipantsAdmin() {
  const { services, dataVersion, notifyChanged } = useServices();
  const entries = useAsync(() => getScoreboard(services), [services, dataVersion]);

  if (entries.status !== 'success') return <p className="loading">Laster deltakere…</p>;
  if (entries.data.length === 0) return <p className="card">Ingen deltakere ennå.</p>;

  const remove = async (entry: ScoreboardEntry) => {
    if (!window.confirm(`Fjerne ${entry.name} og alle svarene deres?`)) return;
    await removeParticipant(services, entry.participantId);
    notifyChanged();
  };

  const reset = async (entry: ScoreboardEntry) => {
    if (!window.confirm(`Nullstille passordet til ${entry.name}? Neste passord de logger inn med blir det nye.`)) return;
    await resetPassword(services, entry.participantId);
    notifyChanged();
  };

  return (
    <ul className="admin-list">
      {entries.data.map((entry) => (
        <li key={entry.participantId} className="admin-list__item">
          <span className="admin-list__day">{entry.rank}</span>
          <span className="admin-list__text">
            {entry.name} – {entry.points} poeng ({entry.correctAnswers} riktige)
          </span>
          <button type="button" className="button button--small" onClick={() => void reset(entry)}>
            Nytt passord
          </button>
          <button type="button" className="button button--small button--danger" onClick={() => void remove(entry)}>
            Fjern
          </button>
        </li>
      ))}
    </ul>
  );
}
