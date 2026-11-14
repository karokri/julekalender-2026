import { useCallback } from 'react';
import {
  createParticipant,
  getCurrentParticipant,
  lookUpName,
  signIn,
  signOut,
} from '../../application/useCases/participants';
import { useAsync } from './useAsync';
import { useServices } from './servicesContext';

export function useCurrentParticipant() {
  const { services, dataVersion, notifyChanged } = useServices();
  const state = useAsync(() => getCurrentParticipant(services), [services, dataVersion]);

  const lookUp = useCallback((name: string) => lookUpName(services, name), [services]);

  const create = useCallback(
    async (name: string, password: string) => {
      await createParticipant(services, name, password);
      notifyChanged();
    },
    [services, notifyChanged],
  );

  const login = useCallback(
    async (id: string, password: string) => {
      await signIn(services, id, password);
      notifyChanged();
    },
    [services, notifyChanged],
  );

  const leave = useCallback(() => {
    signOut(services);
    notifyChanged();
  }, [services, notifyChanged]);

  return {
    participant: state.status === 'success' ? state.data : undefined,
    isLoading: state.status === 'loading',
    error: state.status === 'error' ? state.error : undefined,
    lookUp,
    create,
    login,
    leave,
  };
}
