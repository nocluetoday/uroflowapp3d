# UroFlow Workbench (3D)

Clinical/engineering workbench for real-time uroflow estimation with an anatomical 3D scene.

The app combines:
- A FastAPI backend (`/simulate`, `/jobs/uroflow3d`)
- A React + Vite + React Three Fiber frontend
- An Electron desktop shell for macOS packaging (`.app` / `.dmg`)
- A paper-informed scalar obstruction model with local fallback in the UI

## Important Scope

This project is a research/engineering prototype and **not** a diagnostic medical device.
Outputs are model-derived estimates intended for simulation exploration.

## Feature Summary

- Real-time scalar outputs while sliders move
- Anatomical urethral length decomposition:
  - pendulous + bulbar + membranous + prostatic
- Obstruction-sensitive outputs with stronger dependence on:
  - prostatic urethral length
  - intravesical prostatic protrusion (IPP) grade
- 3D lumen scene with optional bladder/prostate phantom shells
- Optional asynchronous 3D artifact export (`field.vtk`, `metadata.json`)
- Desktop-safe behavior when backend is unavailable:
  - scalar model still runs locally in frontend
  - UI remains interactive

## Repository Layout

- `main.py` - FastAPI app, scalar endpoint, async 3D job orchestration
- `simulation.py` - Python scalar uroflow model
- `backend_entry.py` - backend process entrypoint for packaged desktop app
- `frontend/src/sim/uroflowModel.js` - mirrored local scalar model used by UI fallback
- `frontend/src/UroflowScene.jsx` - interactive 3D rendering
- `frontend/src/components/SimulationControlsPanel.jsx` - sliders/toggles/actions
- `frontend/src/components/SimulationOutputPanel.jsx` - metrics, definitions, artifacts panel
- `scripts/build_backend_binary.sh` - PyInstaller build for backend binary
- `scripts/vite_build_guard.sh` - guarded Vite build helper

## Tech Stack

Backend:
- Python 3.11+
- FastAPI
- Uvicorn
- Pydantic

Frontend:
- React 19
- Vite 7
- Three.js + @react-three/fiber + @react-three/drei

Desktop:
- Electron
- electron-builder / electron-packager
- PyInstaller (bundled backend binary)

## Clinical Inputs and Ranges

Current slider ranges in UI:
- Detrusor pressure: `10..150 cmH2O`
- Pendulous urethra: `8.0..22.0 cm`
- Bulbar urethra: `1.5..7.0 cm`
- Membranous urethra: `0.6..3.0 cm`
- Prostatic urethra: `2.0..6.0 cm`
- Prostate volume: `10..150 cc`
- IPP grade: `1..3`
- 3D mesh resolution: `12..64`

Derived total length:

`total_urethral_length = pendulous + bulbar + membranous + prostatic`

## Scalar Model (Current Implementation)

Implemented in:
- `simulation.py`
- `frontend/src/sim/uroflowModel.js`

### Geometry proxies and ratios

- `TD-BN` = transverse diameter of bladder neck (cm)
- `TD-PU` = transverse diameter of prostatic urethra (cm)
- `LD-PU` = longitudinal (prostatic urethral) length (cm)

Defined ratios:
- `RPU-1 = TD-PU / TD-BN`
- `RPU-2 = RPU-1 / LD-PU`

### Obstruction behavior

Model resistance increases with:
- longer `LD-PU`
- higher `IPP grade`
- larger prostate volume
- higher vortex index (ratio-derived)

This resistance index then reduces `Q_max` and `Q_ave`.

### Primary outputs

- `q_max` (mL/s)
- `q_ave` (mL/s)
- `average_velocity` (cm/s, internal rendering proxy)
- `rpu_1`, `rpu_2`
- `mv_euo` (m/s)
- `vortex_present` (boolean)
- `td_bn`, `td_pu`, `ld_pu` (cm)
- `pressure_loss` (Pa)

## Literature Basis (Informing, Not Clinical Validation)

Model structure is informed by these papers:
- Zhang et al. (Scientific Reports, 2021) - PU geometry ratios and vortex-associated trends
- Ishii et al. (IEEE JTEHM, 2014) - fluid property assumptions and pressure-loss framing

Current code uses these publications as directional constraints/trends, not as a full patient-specific CFD implementation.

## API Reference

### Health/root

- `GET /`

### Run scalar simulation

- `POST /simulate`

Request body:

```json
{
  "p_det": 60,
  "length": 24.5,
  "prostatic_length": 4.2,
  "volume": 75,
  "ipp_grade": 3
}
```

Response body (shape):

```json
{
  "q_max": 7.12,
  "q_ave": 3.87,
  "average_velocity": 13.69,
  "p_det_used": 60.0,
  "rpu_1": 0.792,
  "rpu_2": 0.189,
  "mv_euo": 2.945,
  "vortex_present": true,
  "td_bn": 2.67,
  "td_pu": 2.12,
  "ld_pu": 4.2,
  "pressure_loss": 4321.5
}
```

### Create async 3D artifact job

- `POST /jobs/uroflow3d`

Request includes scalar fields plus:
- `mesh_resolution`

### Poll async 3D job

- `GET /jobs/{job_id}`

When complete, artifacts are available under:
- `/artifacts/{job_id}/field.vtk`
- `/artifacts/{job_id}/metadata.json`

## Local Development

### 1) Backend

```bash
cd "/Users/donaldneff/Documents/Urine flow sim"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open API docs:
- `http://127.0.0.1:8000/docs`

### 2) Frontend (web)

```bash
cd "/Users/donaldneff/Documents/Urine flow sim/frontend"
npm install
npm run dev
```

### 3) Desktop dev (Electron + backend autostart)

```bash
cd "/Users/donaldneff/Documents/Urine flow sim/frontend"
npm install
npm run dev:desktop
```

## Build macOS App / DMG

From repo root, ensure Python venv exists and backend dependencies are installed.

```bash
cd "/Users/donaldneff/Documents/Urine flow sim/frontend"
npm install
npm run package:mac
```

Typical output:
- `frontend/dist/UroFlow-<version>-arm64.dmg`

Fallback if DMG step is terminated by macOS:

```bash
cd "/Users/donaldneff/Documents/Urine flow sim/frontend"
npm run package:app:mac
npm run zip:app:mac
```

Outputs:
- `frontend/release/UroFlow-darwin-arm64/UroFlow.app`
- `frontend/release/UroFlow-darwin-arm64/UroFlow.app.zip`

## How the Desktop App Boots

- Electron starts first
- Electron launches backend process:
  - dev mode: `uvicorn main:app` from repo root
  - packaged mode: bundled `uroflow-backend` binary from app resources
- Renderer loads:
  - dev URL (`ELECTRON_RENDERER_URL`) in development
  - built `dist/index.html` in packaged mode

## Troubleshooting

### White screen in desktop app

Check these first:
- Frontend not built (`frontend/dist/index.html` missing)
- `electron` cannot load renderer URL in dev mode
- JS runtime error in renderer startup

Actions:

```bash
cd "/Users/donaldneff/Documents/Urine flow sim/frontend"
npm run build
npm run dev:desktop
```

### Backend binary missing in packaged app

Rebuild backend and package again:

```bash
cd "/Users/donaldneff/Documents/Urine flow sim/frontend"
npm run build:backend:mac
npm run package:mac
```

### Frontend build appears to hang

The build guard script (`scripts/vite_build_guard.sh`) prevents overlapping builds and copies esbuild binary to local cache when needed.
Retry with a clean single build process.

### 3D artifacts unavailable

The 3D view still renders locally. Artifact export requires reachable backend job endpoints.

## Validation Notes

Recent checks performed in development:
- Frontend production build succeeds (`npm run build`)
- Directional behavior checks:
  - increasing prostatic urethral length reduces `Q_max` / `Q_ave`
  - increasing IPP grade reduces `Q_max` / `Q_ave`

For stronger scientific confidence, add formal calibration datasets and regression tests against known case series.

## Next Engineering Steps

- Add golden-case tests for monotonicity and numeric ranges
- Version the scalar model coefficients and document change logs
- Add reproducible calibration notebook for published cohorts
- Optionally offload heavy 3D field generation to GPU when true CFD is introduced

## License

MIT License. See `LICENSE`.
