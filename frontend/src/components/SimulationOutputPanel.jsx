import { UroflowScene } from '../UroflowScene';

export function SimulationOutputPanel({ apiBase, inputs, results, jobState }) {
  return (
    <section className="panel output-panel">
      <div className="metrics-grid">
        <article>
          <p>Q_max</p>
          <h3>
            {results ? results.q_max.toFixed(2) : '--'} <span>mL/s</span>
          </h3>
        </article>
        <article>
          <p>Avg Velocity</p>
          <h3>
            {results ? results.average_velocity.toFixed(2) : '--'} <span>cm/s</span>
          </h3>
        </article>
        <article>
          <p>3D Job Status</p>
          <h3 className="mono">{jobState.status}</h3>
        </article>
      </div>

      <div className="scene-stage">
        <UroflowScene inputs={inputs} results={results} />
      </div>

      <div className="artifacts">
        <p className="artifacts-title">3D Artifacts</p>
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
        ) : (
          <p className="muted">No artifacts yet. Run a 3D job to generate VTK/metadata outputs.</p>
        )}
      </div>
    </section>
  );
}
