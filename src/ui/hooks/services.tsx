import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { Container } from '../../app/container';
import { ServicesContext } from './servicesContext';

export function ServicesProvider({ container, children }: { container: Container; children: ReactNode }) {
  const [dataVersion, setDataVersion] = useState(0);
  const notifyChanged = useCallback(() => setDataVersion((v) => v + 1), []);
  const value = useMemo(() => ({ services: container, dataVersion, notifyChanged }), [container, dataVersion, notifyChanged]);
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}
