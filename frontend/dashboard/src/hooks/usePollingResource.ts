import { useEffect, useState } from "react";

interface PollingState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export function usePollingResource<T>(
  loader: () => Promise<T>,
  fallback: T,
  intervalMs: number,
  deps: unknown[] = []
): PollingState<T> {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const next = await loader();
        if (!active) {
          return;
        }

        setData(next);
        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load EvoChain platform data."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void run();
    const timer = window.setInterval(() => {
      void run();
    }, intervalMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, deps);

  return { data, loading, error };
}
