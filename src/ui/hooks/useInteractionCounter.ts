import { useCallback, useEffect, useRef } from 'react';
import { recordInteractions } from '../../application/useCases/interactions';
import type { ParticipantId } from '../../domain/types';
import { useServices } from './servicesContext';

const FLUSH_EVERY_MS = 15_000;
/** Lets the scoreboard ask for pending interactions to be saved before it loads. */
export const FLUSH_EVENT = 'jul:flush-interactions';

/**
 * Counts interactions locally and saves them in batches (every 15 s, and when the
 * page is hidden or closed) – not one write per click.
 */
export function useInteractionCounter(participantId?: ParticipantId): () => void {
  const { services, notifyChanged } = useServices();
  const pending = useRef(0);

  const flush = useCallback(() => {
    const count = pending.current;
    if (!participantId || count === 0) return;
    pending.current = 0;
    recordInteractions(services, participantId, count).then(
      () => window.location.hash === '#poeng' && notifyChanged(),
      () => {
        pending.current += count; // try again next time
      },
    );
  }, [services, participantId, notifyChanged]);

  useEffect(() => {
    const timer = window.setInterval(flush, FLUSH_EVERY_MS);
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    window.addEventListener('hashchange', flush);
    window.addEventListener(FLUSH_EVENT, flush);
    return () => {
      window.removeEventListener('hashchange', flush);
      window.removeEventListener(FLUSH_EVENT, flush);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  return useCallback(() => {
    if (participantId) pending.current += 1;
  }, [participantId]);
}
