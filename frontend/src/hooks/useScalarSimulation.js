import { useCallback, useState } from 'react';
import { simulate } from '../api';

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

export function useScalarSimulation({ apiBase, onBackendOnlineChange }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = useCallback(async (payload) => {
    setLoading(true);
    setError(null);

    try {
      const data = await simulate(apiBase, payload);
      setResults(data);
      onBackendOnlineChange?.(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not reach local backend.'));
      onBackendOnlineChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [apiBase, onBackendOnlineChange]);

  const applyResult = useCallback((nextResult) => {
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
