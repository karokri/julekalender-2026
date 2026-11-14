import { useState } from 'react';
import { authenticateAdmin } from '../../../application/useCases/admin';
import { Nisse } from '../../components/Nisse';
import { useServices } from '../../hooks/servicesContext';
import { ParticipantsAdmin } from './ParticipantsAdmin';
import { DoorsAdmin } from './DoorsAdmin';
import { ToolsAdmin } from './ToolsAdmin';
import './admin.css';

type AdminTab = 'doors' | 'participants' | 'tools';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'doors', label: 'Luker' },
  { id: 'participants', label: 'Deltakere' },
  { id: 'tools', label: 'Verktøy' },
];

export function AdminView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tab, setTab] = useState<AdminTab>('doors');

  if (!isAuthenticated) return <AdminLogin onSuccess={() => setIsAuthenticated(true)} />;

  return (
    <section className="admin">
      <h2 className="section-title">Nissens verksted 🔧</h2>
      <nav className="tabs" aria-label="Admin">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tabs__tab ${tab === t.id ? 'is-active' : ''}`}
            aria-current={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'doors' && <DoorsAdmin />}
      {tab === 'participants' && <ParticipantsAdmin />}
      {tab === 'tools' && <ToolsAdmin />}
    </section>
  );
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const { services } = useServices();
  const [code, setCode] = useState('');
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    if (await authenticateAdmin(services, code)) onSuccess();
    else setFailed(true);
  };

  return (
    <form
      className="card admin-login"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Nisse mood={failed ? 'surprised' : 'idle'} size={110} />
      <h2>Kun for nissens hjelpere</h2>
      <label htmlFor="admin-code">Admin-kode</label>
      <div className="register__row">
        <input
          id="admin-code"
          className="input"
          type="password"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setFailed(false);
          }}
        />
        <button type="submit" className="button button--primary">
          Logg inn
        </button>
      </div>
      {failed && <p className="form-error">Feil kode. Nissen ser mistenksomt på deg.</p>}
    </form>
  );
}
