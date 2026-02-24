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

function ToggleControl({ label, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} />
    </label>
  );
}

export function SimulationControlsPanel({
  inputs,
  derivedIppGrade,
  totalUrethralLength,
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
      <p className="panel-subtitle">Anatomical length segments, obstruction parameters, and 3D controls.</p>

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
        label="Pendulous Urethra"
        valueLabel={`${inputs.pendulous_length.toFixed(1)} cm`}
        value={inputs.pendulous_length}
        min="8"
        max="22"
        step="0.1"
        onChange={(e) => onInputChange('pendulous_length', Number(e.target.value))}
      />

      <SliderControl
        label="Bulbar Urethra"
        valueLabel={`${inputs.bulbar_length.toFixed(1)} cm`}
        value={inputs.bulbar_length}
        min="1.5"
        max="7"
        step="0.1"
        onChange={(e) => onInputChange('bulbar_length', Number(e.target.value))}
      />

      <SliderControl
        label="Membranous Urethra"
        valueLabel={`${inputs.membranous_length.toFixed(1)} cm`}
        value={inputs.membranous_length}
        min="0.6"
        max="3"
        step="0.1"
        onChange={(e) => onInputChange('membranous_length', Number(e.target.value))}
      />

      <SliderControl
        label="Prostatic Urethra"
        valueLabel={`${inputs.prostatic_length.toFixed(1)} cm`}
        value={inputs.prostatic_length}
        min="2"
        max="6"
        step="0.1"
        onChange={(e) => onInputChange('prostatic_length', Number(e.target.value))}
      />

      <div className="anatomy-summary">
        Total Urethral Length = pendulous + bulbar + membranous + prostatic = <strong>{totalUrethralLength.toFixed(1)} cm</strong>
      </div>

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
        label="IPP (Intravesical Protrusion)"
        valueLabel={`${inputs.ipp_mm.toFixed(1)} mm`}
        value={inputs.ipp_mm}
        min="0"
        max="20"
        step="0.1"
        onChange={(e) => onInputChange('ipp_mm', Number(e.target.value))}
      />

      <div className="anatomy-summary">
        Auto IPP Grade = <strong>{derivedIppGrade}</strong> (0: 0 mm, 1: &gt;0 to &lt;5 mm, 2: 5-10 mm, 3: &gt;10 mm)
      </div>

      <SliderControl
        label="3D Mesh Resolution"
        valueLabel={inputs.mesh_resolution}
        value={inputs.mesh_resolution}
        min="12"
        max="64"
        step="1"
        onChange={(e) => onInputChange('mesh_resolution', Number(e.target.value))}
      />

      <div className="toggle-group">
        <ToggleControl
          label="Show Bladder Phantom"
          checked={inputs.showBladderPhantom}
          onChange={(e) => onInputChange('showBladderPhantom', e.target.checked)}
        />
        <ToggleControl
          label="Show Prostate Phantom"
          checked={inputs.showProstatePhantom}
          onChange={(e) => onInputChange('showProstatePhantom', e.target.checked)}
        />
      </div>

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
