import { useCallback, useEffect, useRef, useState, type DependencyList, type Dispatch, type SetStateAction } from 'react';
import { subscribe } from '../api/mockDb';

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  refetch: () => void;
  /** Optimistic local update; the next refetch reconciles with the server. */
  setData: Dispatch<SetStateAction<T | undefined>>;
}

/**
 * Fetch helper with refetch + automatic revalidation whenever the mock DB commits
 * (so organizer actions are reflected across tabs/views immediately).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const refetch = useCallback(() => {
    const id = ++seq.current;
    setLoading(true);
    run()
      .then((d) => {
        if (id === seq.current) {
          setData(d);
          setError(undefined);
        }
      })
      .catch((e: Error) => id === seq.current && setError(e))
      .finally(() => id === seq.current && setLoading(false));
  }, [run]);

  useEffect(() => {
    refetch();
    return subscribe(() => refetch());
  }, [refetch]);

  return { data, error, loading, refetch, setData };
}
