import { createContext, useContext } from 'react';
import type { Container } from '../../app/container';

export interface ServicesValue {
  services: Container;
  /** Increments after every mutation so views re-fetch their data. */
  dataVersion: number;
  notifyChanged: () => void;
}

export const ServicesContext = createContext<ServicesValue | null>(null);

export function useServices(): ServicesValue {
  const value = useContext(ServicesContext);
  if (!value) throw new Error('useServices must be used inside <ServicesProvider>.');
  return value;
}
