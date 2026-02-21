export function TopBar({ backendOnline }) {
  return (
    <header className="topbar">
      <div>
        <h1>UroFlow Workbench</h1>
        <p>Clinical sliders, scalar metrics, and a live 3D lumen view.</p>
      </div>
      <div className={`status-pill ${backendOnline ? 'online' : 'offline'}`}>
        <span className="dot"></span>
        {backendOnline ? 'Backend Connected' : 'Backend Unreachable'}
      </div>
    </header>
  );
}
