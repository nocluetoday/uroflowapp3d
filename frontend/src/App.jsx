import { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [pDet, setPdet] = useState(50);
  const [length, setLength] = useState(4.5);
  const [volume, setVolume] = useState(40);
  const [ippGrade, setIppGrade] = useState(2);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Connects directly to the backend API provided by docker or local instance
      const response = await fetch('http://localhost:8000/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_det: parseFloat(pDet),
          length: parseFloat(length),
          volume: parseFloat(volume),
          ipp_grade: parseInt(ippGrade)
        })
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || "Failed to reach backend server. Did you run the docker container?");
    } finally {
      setLoading(false);
    }
  };

  // Auto-run simulation on initial load
  useEffect(() => {
    runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <h1>UroFlow Dynamics</h1>
        <p>Prostatic Urethra Fluid-Structure Interaction Simulator</p>
      </header>

      {/* Input Panel */}
      <section className="panel">
        <h2>
          {/* Simple SVG Icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          Clinical Parameters
        </h2>

        <div className="control-group">
          <div className="control-header">
            <span className="control-label">Detrusor Pressure (P_det)</span>
            <span className="control-value">{pDet} <span className="result-unit">cmH₂O</span></span>
          </div>
          <input
            type="range" className="slider"
            min="10" max="150" step="1"
            value={pDet} onChange={(e) => setPdet(e.target.value)}
          />
        </div>

        <div className="control-group">
          <div className="control-header">
            <span className="control-label">Prostate Length</span>
            <span className="control-value">{length} <span className="result-unit">cm</span></span>
          </div>
          <input
            type="range" className="slider"
            min="2.0" max="8.0" step="0.1"
            value={length} onChange={(e) => setLength(e.target.value)}
          />
        </div>

        <div className="control-group">
          <div className="control-header">
            <span className="control-label">Prostate Volume</span>
            <span className="control-value">{volume} <span className="result-unit">cc</span></span>
          </div>
          <input
            type="range" className="slider"
            min="10" max="150" step="1"
            value={volume} onChange={(e) => setVolume(e.target.value)}
          />
        </div>

        <div className="control-group">
          <div className="control-header">
            <span className="control-label">IPP Grade</span>
            <span className="control-value">Grade {ippGrade}</span>
          </div>
          <input
            type="range" className="slider"
            min="1" max="3" step="1"
            value={ippGrade} onChange={(e) => setIppGrade(e.target.value)}
          />
        </div>

        <button
          className="btn-primary"
          onClick={runSimulation}
          disabled={loading}
        >
          {loading ? <span className="spinner"></span> : 'Run Navier-Stokes Simulation'}
        </button>

        {error && <div style={{ color: '#ef4444', marginTop: '1rem', textAlign: 'center' }}>{error}</div>}
      </section>

      {/* Results Panel */}
      <section className="panel">
        <h2>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          Simulation Outputs
        </h2>

        <div className="result-card primary">
          <div className="result-label">Maximum Flow Rate (Q_max)</div>
          <div className="result-value">
            {results ? results.q_max : '--'}
            <span className="result-unit">ml/s</span>
          </div>
        </div>

        <div className="result-card secondary">
          <div className="result-label">Average Flow Velocity</div>
          <div className="result-value">
            {results ? results.average_velocity : '--'}
            <span className="result-unit">cm/s</span>
          </div>
        </div>

        {/* Dynamic Visual Representation */}
        <div className="flow-animation">
          <div
            className="flow-bar"
            style={{
              width: results ? `${Math.min(100, (results.q_max / 25) * 100)}%` : '0%',
              background: results && results.q_max < 10
                ? 'linear-gradient(90deg, #f59e0b, #ef4444)' // warning color for low flow
                : 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))'
            }}
          ></div>
        </div>
        <p style={{ textAlign: 'center', margin: '1rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          FEniCS Real-time 1D Collapsible Tube Profiling
        </p>

      </section>
    </div>
  );
}

export default App;
