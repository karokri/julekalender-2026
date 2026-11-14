import { useEffect, useMemo, useState } from 'react';
import { config } from '../app/config';
import { createContainer, type Container } from '../app/container';
import { isTestMode, SessionStore, unlock } from '../infrastructure/session';
import { browserStorage } from '../infrastructure/storage';
import { isDemo } from '../demo/demoBus';
import { fromIsoDate } from '../domain/calendar';
import { App } from './App';
import { Snowfall } from './components/Snowfall';
import { ServicesProvider } from './hooks/services';
import { PasswordView } from './views/PasswordView';

/** Unlocks the shared data with the family password, then hands over to the app. */
export function Root() {
  const storage = useMemo(() => browserStorage(), []);
  const session = useMemo(() => new SessionStore(storage), [storage]);
  const [container, setContainer] = useState<Container>();
  const [restoring, setRestoring] = useState(() => !!session.password());

  const open = async (password: string) => {
    const data = await unlock(config.data, password, storage);
    session.savePassword(password);
    setContainer(createContainer({ storage, ...data }));
  };

  // Demo build: no password, doors inlined, and the date starts at 8 December.
  useEffect(() => {
    if (!isDemo) return;
    void (async () => {
      const { default: doorsFile } = await import('virtual:demo-doors');
      const data = await unlock(config.data, 'demo', storage);
      session.savePassword('demo');
      const demo = createContainer({ storage, ...data, loadDoors: async () => doorsFile });
      if (!demo.clock.simulatedDate()) demo.clock.simulate(fromIsoDate(`${config.seasonYear}-12-08`));
      setContainer(demo);
      setRestoring(false);
    })();
  }, [session, storage]);

  useEffect(() => {
    if (isDemo) return;
    const saved = session.password();
    if (!saved) return;
    open(saved)
      .catch(() => session.forgetEverything())
      .finally(() => setRestoring(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on start
  }, []);

  if (container) {
    return (
      <ServicesProvider container={container}>
        <App
          onForgetDevice={() => {
            session.forgetEverything();
            setContainer(undefined);
          }}
        />
      </ServicesProvider>
    );
  }

  return (
    <>
      <Snowfall />
      <div className="page page--narrow">
        <PasswordView restoring={restoring} testMode={isTestMode(config.data)} onSubmit={open} />
      </div>
    </>
  );
}
