import { UroflowScene } from '../UroflowScene';

function metric(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '--';
}

export function SimulationOutputPanel({ apiBase, inputs, totalUrethralLength, results, jobState }) {
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
          <p>Avg Velocity</p>
          <h3>
            {metric(results?.average_velocity)} <span>cm/s</span>
          </h3>
        </article>
        <article>
          <p>3D Job Status</p>
          <h3 className="mono">{jobState.status}</h3>
        </article>
      </div>

      <div className="scene-stage">
        <UroflowScene inputs={inputs} totalUrethralLength={totalUrethralLength} results={results} />
      </div>

      <div className="artifacts">
        <p className="artifacts-title">3D Artifacts</p>
        <p className="muted">{jobState.message}</p>
        {jobState.error ? <p className="error-text">{jobState.error}</p> : null}
        {jobState.artifacts.length > 0 ? (
          <ul>
            {jobState.artifacts.map((url) => (
              <li key={url}>
                <a href={`${apiBase}${url}`} target="_blank" rel="noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
