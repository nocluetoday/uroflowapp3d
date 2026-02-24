import { useCallback, useEffect, useMemo, useState } from 'react';
import { SimulationControlsPanel } from './components/SimulationControlsPanel';
import { SimulationOutputPanel } from './components/SimulationOutputPanel';
import { TopBar } from './components/TopBar';
import { use3DJobPolling } from './hooks/use3DJobPolling';
import { useScalarSimulation } from './hooks/useScalarSimulation';
import { totalUrethralLengthCm } from './sim/uroflowModel';
import './index.css';

const API_BASE = 'http://127.0.0.1:8000';

const DEFAULT_INPUTS = {
  p_det: 50,
  pendulous_length: 16.0,
  bulbar_length: 3.5,
  membranous_length: 1.5,
  prostatic_length: 3.5,
  volume: 40,
  ipp_grade: 2,
  mesh_resolution: 28,
  showBladderPhantom: true,
  showProstatePhantom: true,
};

function flowBand(qMax) {
  if (qMax == null) return { label: 'Ready', tone: 'neutral' };
  if (qMax < 10) return { label: 'Severely Reduced Flow', tone: 'critical' };
  if (qMax < 15) return { label: 'Reduced Flow', tone: 'warning' };
  if (qMax < 25) return { label: 'Functional Range', tone: 'good' };
  return { label: 'High Flow State', tone: 'accent' };
}

function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);

  const totalUrethralLength = useMemo(() => totalUrethralLengthCm(inputs), [inputs]);
  const scalarPayload = useMemo(
    () => ({
      ...inputs,
      length: totalUrethralLength,
    }),
    [inputs, totalUrethralLength],
  );

  const { loading, results, error, runSimulation, applyResult } = useScalarSimulation({
    apiBase: API_BASE,
  });

  const { jobState, submitting3D, create3DJob } = use3DJobPolling({
    apiBase: API_BASE,
    inputs: scalarPayload,
    onResult: applyResult,
  });

  const band = useMemo(() => flowBand(results?.q_max ?? null), [results]);

  const updateInput = useCallback((key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const runCurrentSimulation = useCallback(() => {
    runSimulation(scalarPayload);
  }, [runSimulation, scalarPayload]);

  useEffect(() => {
    runSimulation(scalarPayload);
  }, [runSimulation, scalarPayload]);

  return (
    <div className="shell">
      <div className="aurora aurora-left"></div>
      <div className="aurora aurora-right"></div>

      <TopBar />

      <main className="workspace">
        <SimulationControlsPanel
          inputs={inputs}
          totalUrethralLength={totalUrethralLength}
          onInputChange={updateInput}
          onRunScalar={runCurrentSimulation}
          onCreate3DJob={create3DJob}
          loading={loading}
          submitting3D={submitting3D}
          band={band}
          error={error}
        />
        <SimulationOutputPanel
          apiBase={API_BASE}
          inputs={inputs}
          totalUrethralLength={totalUrethralLength}
          results={results}
          jobState={jobState}
        />
      </main>
    </div>
  );
}

export default App;
