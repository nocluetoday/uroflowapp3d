import { useCallback, useState } from 'react';
import { runLocalSimulation } from '../sim/uroflowModel';

export function useScalarSimulation() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = useCallback((payload) => {
    setLoading(true);
    setError(null);

    const localResult = runLocalSimulation(payload);
    setResults(localResult);
    setLoading(false);
  }, []);

  return {
    loading,
    results,
    error,
    runSimulation,
  };
}
