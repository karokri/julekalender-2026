import { useState } from 'react';
import { fromIsoDate, toIsoDate } from '../domain/calendar';
import { ROUTE_HASH } from '../ui/hooks/useHashRoute';
import { useServices } from '../ui/hooks/servicesContext';
import { emitDemo, type SceneAction } from './demoBus';
import { seedDemoParticipants } from './seed';
import './demo.css';

const SCENE_BUTTONS: { action: SceneAction; label: string }[] = [
  { action: 'lucia', label: '🕯️ Luciatog' },
  { action: 'snowballs', label: '❄️ Snøballkrig' },
  { action: 'cookies', label: 'Pepperkakeregn' },
  { action: 'skate', label: '⛸️ Skøytetur' },
  { action: 'tickle', label: '😆 Kile alle' },
];

const QUICK_DAYS = [
  { day: 1, label: '1. des' },
  { day: 8, label: '8. des' },
  { day: 13, label: '13. (Lucia)' },
  { day: 24, label: '24. des' },
];

/** Floating control panel, only in the demo build. */
export function DemoPanel() {
  const { services, notifyChanged } = useServices();
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState<string>();
  const today = services.clock.today();

  const goTo = (day: number) => {
    const clamped = Math.max(1, Math.min(31, day));
    services.clock.simulate(fromIsoDate(`${services.seasonYear}-12-${String(clamped).padStart(2, '0')}`));
    setStatus(undefined);
    notifyChanged();
  };

  const seed = async () => {
    setStatus('Fyller inn …');
    const count = await seedDemoParticipants(services);
    setStatus(`${count} demodeltakere har svart på alle åpne luker.`);
    notifyChanged();
  };

  const reset = () => {
    try {
      window.localStorage.clear();
    } catch {
      /* storage blocked – a reload starts fresh anyway */
    }
    window.location.hash = '';
    window.location.reload();
  };

  if (!open) {
    return (
      <button type="button" className="demo-toggle" onClick={() => setOpen(true)}>
        🎛️ Demo
      </button>
    );
  }

  return (
    <aside className="demo-panel" aria-label="Demopanel">
      <header className="demo-panel__header">
        <strong>🎛️ Demo</strong>
        <button type="button" className="demo-panel__close" onClick={() => setOpen(false)} aria-label="Skjul demopanelet">
          –
        </button>
      </header>

      <section>
        <h4>Dato</h4>
        <div className="demo-row">
          <button type="button" onClick={() => goTo(today.day - 1)} disabled={today.month === 12 && today.day <= 1}>
            ◀
          </button>
          <span className="demo-date">{today.month === 12 ? `${today.day}. desember` : toIsoDate(today)}</span>
          <button type="button" onClick={() => goTo(today.day + 1)} disabled={today.month === 12 && today.day >= 31}>
            ▶
          </button>
        </div>
        <div className="demo-row demo-row--wrap">
          {QUICK_DAYS.map((d) => (
            <button key={d.day} type="button" onClick={() => goTo(d.day)} className={today.day === d.day ? 'is-active' : undefined}>
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4>Luker</h4>
        <div className="demo-row demo-row--wrap">
          <button
            type="button"
            onClick={() => {
              window.location.hash = ROUTE_HASH.calendar;
              setTimeout(() => emitDemo('open-door', Math.min(24, today.day)), 50);
            }}
          >
            🚪 Åpne dagens luke
          </button>
        </div>
        <p className="demo-hint">Eller klikk på en åpen luke i kalenderen.</p>
      </section>

      <section>
        <h4>Nissetunet</h4>
        <div className="demo-row demo-row--wrap">
          {SCENE_BUTTONS.map((b) => (
            <button
              key={b.action}
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                emitDemo('scene', b.action);
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4>Poengtavla</h4>
        <div className="demo-row demo-row--wrap">
          <button type="button" onClick={() => void seed()}>
            👨‍👩‍👧 Fyll med demodeltakere
          </button>
          <a className="demo-link" href={ROUTE_HASH.scoreboard}>
            🏆 Vis poengtavla
          </a>
          <a className="demo-link" href={ROUTE_HASH.calendar}>
            🎄 Vis kalender
          </a>
        </div>
        {status && <p className="demo-hint">{status}</p>}
      </section>

      <section>
        <h4>Admin</h4>
        <div className="demo-row demo-row--wrap">
          <a className="demo-link" href={ROUTE_HASH.admin}>
            🔧 Rediger luker
          </a>
        </div>
        <p className="demo-hint">
          Adminkode: <code>nissefar</code>
        </p>
      </section>

      <footer className="demo-panel__footer">
        <button type="button" onClick={reset}>
          ♻️ Nullstill demo
        </button>
      </footer>
    </aside>
  );
}
