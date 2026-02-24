import { useCallback, useState } from 'react';
import { simulate } from '../api';
import { runLocalSimulation } from '../sim/uroflowModel';

export function useScalarSimulation({ apiBase }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = useCallback((payload) => {
    setLoading(true);
    setError(null);

    const localResult = runLocalSimulation(payload);
    setResults(localResult);
    setLoading(false);

    // Try backend sync opportunistically for parity with packaged binary output.
    void simulate(apiBase, payload)
      .then((backendResult) => {
        if (backendResult && Number.isFinite(Number(backendResult.q_max))) {
          setResults(backendResult);
        }
      })
      .catch(() => {
        // Ignore backend network errors in desktop mode; local model remains authoritative.
      });
  }, [apiBase]);

  const applyResult = useCallback((nextResult) => {
    if (!nextResult) {
      return;
    }
    setResults(nextResult);
  }, []);

  return {
    loading,
    results,
    error,
    runSimulation,
    applyResult,
  };
}
