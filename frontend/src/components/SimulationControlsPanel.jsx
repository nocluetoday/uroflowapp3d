function SliderControl({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  onChange,
}) {
  return (
    <label className="control-row">
      <div className="control-meta">
        <span>{label}</span>
        <strong>{valueLabel}</strong>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} />
    </label>
  );
}

export function SimulationControlsPanel({
  inputs,
  onInputChange,
  onRunScalar,
  onCreate3DJob,
  loading,
  submitting3D,
  band,
  error,
}) {
  return (
    <section className="panel controls-panel">
      <h2>Simulation Inputs</h2>
      <p className="panel-subtitle">Tune physiology and obstruction parameters.</p>

      <SliderControl
        label="Detrusor Pressure"
        valueLabel={`${inputs.p_det} cmH₂O`}
        value={inputs.p_det}
        min="10"
        max="150"
        step="1"
        onChange={(e) => onInputChange('p_det', Number(e.target.value))}
      />

      <SliderControl
        label="Prostate Length"
        valueLabel={`${inputs.length.toFixed(1)} cm`}
        value={inputs.length}
        min="2"
        max="8"
        step="0.1"
        onChange={(e) => onInputChange('length', Number(e.target.value))}
      />

      <SliderControl
        label="Prostate Volume"
        valueLabel={`${inputs.volume} cc`}
        value={inputs.volume}
        min="10"
        max="150"
        step="1"
        onChange={(e) => onInputChange('volume', Number(e.target.value))}
      />

      <SliderControl
        label="IPP Grade"
        valueLabel={inputs.ipp_grade}
        value={inputs.ipp_grade}
        min="1"
        max="3"
        step="1"
        onChange={(e) => onInputChange('ipp_grade', Number(e.target.value))}
      />

      <SliderControl
        label="3D Mesh Resolution"
        valueLabel={inputs.mesh_resolution}
        value={inputs.mesh_resolution}
        min="12"
        max="64"
        step="1"
        onChange={(e) => onInputChange('mesh_resolution', Number(e.target.value))}
      />

      <div className="button-row">
        <button className="btn btn-primary" onClick={onRunScalar} disabled={loading}>
          {loading ? 'Running...' : 'Run Scalar Simulation'}
        </button>
        <button className="btn btn-secondary" onClick={onCreate3DJob} disabled={submitting3D}>
          {submitting3D ? 'Submitting...' : 'Generate 3D Field Job'}
        </button>
      </div>

      <div className={`flow-band ${band.tone}`}>{band.label}</div>
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
