import { useCallback, useEffect, useMemo, useState } from 'react';
import { SimulationControlsPanel } from './components/SimulationControlsPanel';
import { SimulationOutputPanel } from './components/SimulationOutputPanel';
import { TopBar } from './components/TopBar';
import { useScalarSimulation } from './hooks/useScalarSimulation';
import { ippGradeFromMm, totalUrethralLengthCm } from './sim/uroflowModel';
import './index.css';

const DEFAULT_INPUTS = {
  p_det: 50,
  pendulous_length: 16.0,
  bulbar_length: 3.5,
  membranous_length: 1.5,
  prostatic_length: 3.5,
  volume: 40,
  ipp_mm: 5.0,
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
  const ippGrade = useMemo(() => ippGradeFromMm(inputs.ipp_mm), [inputs.ipp_mm]);
  const scalarPayload = useMemo(
    () => ({
      ...inputs,
      ipp_grade: ippGrade,
      length: totalUrethralLength,
    }),
    [inputs, ippGrade, totalUrethralLength],
  );

  const { loading, results, error, runSimulation } = useScalarSimulation();

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
          derivedIppGrade={ippGrade}
          totalUrethralLength={totalUrethralLength}
          onInputChange={updateInput}
          onRunScalar={runCurrentSimulation}
          loading={loading}
          band={band}
          error={error}
        />
        <SimulationOutputPanel
          inputs={scalarPayload}
          totalUrethralLength={totalUrethralLength}
          results={results}
        />
      </main>
    </div>
  );
}

export default App;
