import { UroflowScene } from '../UroflowScene';

function metric(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '--';
}

function wholeMetric(value) {
  return Number.isFinite(Number(value)) ? String(Math.round(Number(value))) : '--';
}

export function SimulationOutputPanel({ inputs, totalUrethralLength, results }) {
  return (
    <section className="panel output-panel">
      <div className="metrics-grid">
        <article>
          <p>Q_max</p>
          <h3>
            {metric(results?.q_max)} <span>mL/s</span>
          </h3>
        </article>
        <article>
          <p>Q_ave</p>
          <h3>
            {metric(results?.q_ave)} <span>mL/s</span>
          </h3>
        </article>
        <article>
          <p>RPU-1</p>
          <h3>{metric(results?.rpu_1)}</h3>
        </article>
        <article>
          <p>IPP Grade Used</p>
          <h3>{wholeMetric(results?.ipp_grade_used)}</h3>
        </article>
        <article>
          <p>RPU-2</p>
          <h3>{metric(results?.rpu_2)}</h3>
        </article>
        <article>
          <p>MV-EUO</p>
          <h3>
            {metric(results?.mv_euo)} <span>m/s</span>
          </h3>
        </article>
        <article>
          <p>PU Pressure Loss</p>
          <h3>
            {metric(results?.pressure_loss)} <span>Pa</span>
          </h3>
        </article>
        <article>
          <p>Vortex</p>
          <h3 className="mono">
            {typeof results?.vortex_present === 'boolean' ? (results.vortex_present ? 'present' : 'none') : '--'}
          </h3>
        </article>
      </div>

      <div className="ratio-definitions">
        <p><strong>RPU-1</strong> = TD-PU / TD-BN</p>
        <p><strong>RPU-2</strong> = RPU-1 / LD-PU</p>
      </div>

      <div className="scene-stage">
        <UroflowScene inputs={inputs} totalUrethralLength={totalUrethralLength} results={results} />
      </div>
    </section>
  );
}
