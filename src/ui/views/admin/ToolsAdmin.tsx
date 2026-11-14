import { useState } from 'react';
import { fromIsoDate, toIsoDate } from '../../../domain/calendar';
import { useServices } from '../../hooks/servicesContext';

export function ToolsAdmin() {
  const { services, notifyChanged } = useServices();
  const simulated = services.clock.simulatedDate();
  const [date, setDate] = useState(simulated ? toIsoDate(simulated) : `${services.seasonYear}-12-01`);

  const simulate = (iso?: string) => {
    services.clock.simulate(iso ? fromIsoDate(iso) : undefined);
    notifyChanged();
  };

  return (
    <div className="tools">
      <section className="card">
        <h3>Tidsmaskin ⏰</h3>
        <p>
          Lat som om det er en annen dato <em>i denne nettleseren</em> – nyttig for å teste luker før desember.
        </p>
        <p>
          Nå: <strong>{simulated ? `${toIsoDate(simulated)} (simulert)` : `${toIsoDate(services.clock.today())} (ekte dato)`}</strong>
        </p>
        <div className="register__row">
          <input className="input input--narrow" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <button type="button" className="button button--primary" onClick={() => simulate(date)} disabled={!date}>
            Simuler
          </button>
          {simulated && (
            <button type="button" className="button" onClick={() => simulate(undefined)}>
              Tilbake til i dag
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h3>Endre innholdet ✏️</h3>
        <p>
          Rediger lukene under fanen <strong>Luker</strong>. Endringene lagres med en gang i data-repoet, og deltakerne
          ser dem neste gang de åpner kalenderen. Fasiten krypteres med fellespassordet før den lagres.
        </p>
      </section>
    </div>
  );
}
