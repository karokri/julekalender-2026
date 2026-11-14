import { getFriendsBoard } from '../../application/useCases/interactions';
import { getScoreboard } from '../../application/useCases/scoreboard';
import { POINTS } from '../../domain/scoring';
import type { ParticipantId, ScoreboardEntry } from '../../domain/types';
import { Nisse } from '../components/Nisse';
import { NISSE_LOOKS } from '../components/nisseLooks';
import { useServices } from '../hooks/servicesContext';
import { useAsync } from '../hooks/useAsync';

const PODIUM_ORDER = [1, 0, 2];
const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];

export function ScoreboardView({ currentParticipantId }: { currentParticipantId?: ParticipantId }) {
  const { services, dataVersion } = useServices();
  const scoreboard = useAsync(() => getScoreboard(services), [services, dataVersion]);

  if (scoreboard.status === 'loading') return <p className="loading">Nissen teller poeng…</p>;
  if (scoreboard.status === 'error') return <p className="card form-error">{scoreboard.error.message}</p>;
  if (scoreboard.data.length === 0) return <p className="card">Ingen er med ennå. Bli den første!</p>;

  const podium = scoreboard.data.slice(0, 3);

  return (
    <section className="scoreboard">
      <h2 className="section-title">Poengtavla</h2>
      <ol className="podium">
        {PODIUM_ORDER.filter((i) => podium[i]).map((i) => (
          <PodiumPlace key={podium[i].participantId} entry={podium[i]} place={i} />
        ))}
      </ol>
      <div className="card scoreboard__card">
        <table className="scoreboard__table">
          <thead>
            <tr>
              <th>#</th>
              <th>Navn</th>
              <th title="Riktige svar">✔︎</th>
              <th title="Utfordringer gjort">🎯</th>
              <th>Poeng</th>
            </tr>
          </thead>
          <tbody>
            {scoreboard.data.map((entry) => (
              <tr key={entry.participantId} className={entry.participantId === currentParticipantId ? 'is-me' : undefined}>
                <td>{entry.rank}</td>
                <td>{entry.name}</td>
                <td>{entry.correctAnswers}</td>
                <td>{entry.challengesDone || ''}</td>
                <td className="scoreboard__points">{entry.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="scoreboard__rules">
        {POINTS.correct} poeng per riktig svar · +{POINTS.sameDayBonus} når du svarer samme dag · fartsbonus +
        {POINTS.speedBonus.join('/+')} til de tre første som svarer riktig samme dag. Utfordringer gir 🎯, ikke poeng.
      </p>
      <FriendsBoard currentParticipantId={currentParticipantId} />
    </section>
  );
}

/** Who has tickled and fed the nisser and reindeer the most. A board of its own, next to the quiz. */
function FriendsBoard({ currentParticipantId }: { currentParticipantId?: ParticipantId }) {
  const { services, dataVersion } = useServices();
  const board = useAsync(() => getFriendsBoard(services), [services, dataVersion]);

  return (
    <section className="friends" aria-label="Nissevenner">
      <h2 className="section-title">Nissevenner 🎅🦌</h2>
      {board.status === 'loading' && <p className="loading">Teller kilinger…</p>}
      {board.status === 'error' && <p className="card form-error">{board.error.message}</p>}
      {board.status === 'success' &&
        (board.data.length === 0 ? (
          <p className="card">Ingen har kilt nissene ennå. Gå til kalenderen og klikk på en nisse eller et reinsdyr!</p>
        ) : (
          <div className="card scoreboard__card">
            <table className="scoreboard__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Navn</th>
                  <th>Kilinger og kast</th>
                </tr>
              </thead>
              <tbody>
                {board.data.map((entry) => (
                  <tr key={entry.participantId} className={entry.participantId === currentParticipantId ? 'is-me' : undefined}>
                    <td>{entry.rank === 1 ? '🥇' : entry.rank}</td>
                    <td>{entry.name}</td>
                    <td className="scoreboard__points">{entry.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      <p className="scoreboard__rules">
        1 poeng hver gang du kiler en nisse eller et reinsdyr, eller kaster en pepperkake eller snøball. Lagres
        hvert 15. sekund.
      </p>
    </section>
  );
}

function PodiumPlace({ entry, place }: { entry: ScoreboardEntry; place: number }) {
  return (
    <li className={`podium__place podium__place--${place + 1}`}>
      <Nisse
        look={NISSE_LOOKS[place]}
        mood={place === 0 ? 'happy' : 'idle'}
        size={place === 0 ? 110 : 84}
        className={place === 0 ? 'nisse--bounce' : undefined}
      />
      <span className="podium__name">{entry.name}</span>
      <span className="podium__block">
        {PODIUM_MEDALS[place]} {entry.points} p
      </span>
    </li>
  );
}
