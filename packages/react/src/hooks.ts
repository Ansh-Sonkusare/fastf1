import { useEffect, useState } from "react";

export interface UseAsyncResourceResult<A> {
  data: A | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAsyncResource<A>(
  load: () => Promise<A>,
  initialData?: A,
): UseAsyncResourceResult<A> {
  const [data, setData] = useState<A | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(initialData === undefined);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (initialData !== undefined) {
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setError(null);

    load()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [load, initialData]);

  return { data, isLoading, error };
}
