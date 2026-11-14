import { config } from '../app/config';
import { DemoPanel } from '../demo/DemoPanel';
import { isDemo } from '../demo/demoBus';
import type { Participant } from '../domain/types';
import { KnitBand } from './components/Folk';
import { Nisse } from './components/Nisse';
import { NisseScene } from './components/scene/NisseScene';
import { ThemePicker } from './components/ThemePicker';
import { Snowfall } from './components/Snowfall';
import { useServices } from './hooks/servicesContext';
import { useInteractionCounter } from './hooks/useInteractionCounter';
import { useCurrentParticipant } from './hooks/useCurrentParticipant';
import { ROUTE_HASH, useHashRoute, type Route } from './hooks/useHashRoute';
import { AdminView } from './views/admin/AdminView';
import { CalendarView } from './views/CalendarView';
import { JoinView } from './views/JoinView';
import { ScoreboardView } from './views/ScoreboardView';

const NAV: { route: Route; label: string }[] = [
  { route: 'calendar', label: '🎄 Kalender' },
  { route: 'scoreboard', label: '🏆 Poengtavla' },
];

export function App({ onForgetDevice }: { onForgetDevice: () => void }) {
  const route = useHashRoute();
  const { participant, isLoading, error, lookUp, create, login, leave } = useCurrentParticipant();
  const { services } = useServices();
  const today = services.clock.today();
  const isLuciaDay = today.month === 12 && today.day === 13;
  const countInteraction = useInteractionCounter(participant?.id);

  const content = () => {
    if (route === 'admin') return <AdminView />;
    if (isLoading) return <p className="loading">Nissen leter fram kalenderen…</p>;
    if (error) return <p className="card form-error">{error.message}</p>;
    if (!participant) return <JoinView onLookUp={lookUp} onCreate={create} onLogin={login} />;
    if (route === 'scoreboard') return <ScoreboardView currentParticipantId={participant.id} />;
    return <CalendarView participant={participant} />;
  };

  return (
    <>
      <Snowfall />
      <KnitBand />
      <div className="page">
        <Header route={route} participant={participant} onLeave={leave} />
        {participant && route !== 'admin' && <NisseScene isLuciaDay={isLuciaDay} onInteract={countInteraction} />}
        <main>{content()}</main>
        <footer className="footer">
          God jul fra nissen 🎅 · <a href={ROUTE_HASH.admin}>Admin</a> ·{' '}
          <button type="button" className="link-button" onClick={onForgetDevice}>
            Glem denne enheten
          </button>
        </footer>
      </div>
      <KnitBand className="knit-band--bottom" />
      {isDemo && participant && <DemoPanel />}
    </>
  );
}

interface HeaderProps {
  route: Route;
  participant?: Participant;
  onLeave: () => void;
}

function Header({ route, participant, onLeave }: HeaderProps) {
  return (
    <header className="header">
      <a href={ROUTE_HASH.calendar} className="logo">
        <Nisse mood="happy" size={72} className="logo__nisse" />
        <span>
          <span className="logo__big">{config.title}</span>
        </span>
      </a>
      {participant && (
        <nav className="nav" aria-label="Hovedmeny">
          {NAV.map((item) => (
            <a
              key={item.route}
              href={ROUTE_HASH[item.route]}
              className={`nav__link ${route === item.route ? 'is-active' : ''}`}
              aria-current={route === item.route ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
      <ThemePicker />
      {participant && (
        <div className="me">
          <span className="me__name">🎅 {participant.name}</span>
          <button type="button" className="button button--small" onClick={onLeave} title="Logg ut – neste gang trengs ditt passord">
            Logg ut
          </button>
        </div>
      )}
    </header>
  );
}
