import { useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

/** Runs `load` whenever a dependency changes and ignores results from stale runs. */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => !cancelled && setState({ status: 'success', data }),
      (error: unknown) => !cancelled && setState({ status: 'error', error: toError(error) }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass the dependencies explicitly
  }, deps);

  return state;
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
