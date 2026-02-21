import { useCallback, useEffect, useMemo, useState } from 'react';
import { SimulationControlsPanel } from './components/SimulationControlsPanel';
import { SimulationOutputPanel } from './components/SimulationOutputPanel';
import { TopBar } from './components/TopBar';
import { use3DJobPolling } from './hooks/use3DJobPolling';
import { useScalarSimulation } from './hooks/useScalarSimulation';
import { pingBackend as pingBackendApi } from './api';
import './index.css';

const API_BASE = 'http://127.0.0.1:8000';

const DEFAULT_INPUTS = {
  p_det: 50,
  length: 4.5,
  volume: 40,
  ipp_grade: 2,
  mesh_resolution: 28,
};

function flowBand(qMax) {
  if (qMax == null) return { label: 'No Data', tone: 'neutral' };
  if (qMax < 10) return { label: 'Severely Reduced Flow', tone: 'critical' };
  if (qMax < 15) return { label: 'Reduced Flow', tone: 'warning' };
  if (qMax < 25) return { label: 'Functional Range', tone: 'good' };
  return { label: 'High Flow State', tone: 'accent' };
}

function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [backendOnline, setBackendOnline] = useState(false);

  const { loading, results, error, runSimulation, applyResult } = useScalarSimulation({
    apiBase: API_BASE,
    onBackendOnlineChange: setBackendOnline,
  });

  const { jobState, submitting3D, create3DJob } = use3DJobPolling({
    apiBase: API_BASE,
    inputs,
    onResult: applyResult,
    onBackendOnlineChange: setBackendOnline,
  });

  const band = useMemo(() => flowBand(results?.q_max ?? null), [results]);

  const updateInput = useCallback((key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const runCurrentSimulation = useCallback(() => {
    runSimulation(inputs);
  }, [inputs, runSimulation]);

  const pingBackend = useCallback(async () => {
    const online = await pingBackendApi(API_BASE);
    setBackendOnline(online);
  }, []);

  useEffect(() => {
    runSimulation(DEFAULT_INPUTS);
    const timer = setInterval(pingBackend, 5000);
    return () => clearInterval(timer);
  }, [pingBackend, runSimulation]);

  return (
    <div className="shell">
      <div className="aurora aurora-left"></div>
      <div className="aurora aurora-right"></div>

      <TopBar backendOnline={backendOnline} />

      <main className="workspace">
        <SimulationControlsPanel
          inputs={inputs}
          onInputChange={updateInput}
          onRunScalar={runCurrentSimulation}
          onCreate3DJob={create3DJob}
          loading={loading}
          submitting3D={submitting3D}
          band={band}
          error={error}
        />
        <SimulationOutputPanel apiBase={API_BASE} inputs={inputs} results={results} jobState={jobState} />
      </main>
    </div>
  );
}

export default App;
