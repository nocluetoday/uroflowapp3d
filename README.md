# UroFlow Workbench (3D)

Clinical/engineering workbench for real-time uroflow estimation with an anatomical 3D scene.

The app combines:
- A React + Vite + React Three Fiber frontend
- An Electron desktop shell for macOS packaging (`.app` / `.dmg`)
- A paper-informed scalar obstruction model running locally in the UI

## Important Scope

This project is a research/engineering prototype and **not** a diagnostic medical device.
Outputs are model-derived estimates intended for simulation exploration.

## Feature Summary

- Real-time scalar outputs while sliders move
- Anatomical urethral length decomposition:
  - pendulous + bulbar + membranous + prostatic
- Obstruction-sensitive outputs with stronger dependence on:
  - prostatic urethral length
  - intravesical prostatic protrusion (IPP, mm -> auto grade)
- 3D lumen scene with optional bladder/prostate phantom shells
- Desktop app runs without backend/network dependency

## Repository Layout

- `main.py` - legacy FastAPI backend (not required for desktop app runtime)
- `simulation.py` - Python scalar uroflow model
- `frontend/src/sim/uroflowModel.js` - local scalar uroflow model used by desktop app
- `frontend/src/UroflowScene.jsx` - interactive 3D rendering
- `frontend/src/components/SimulationControlsPanel.jsx` - sliders/toggles/actions
- `frontend/src/components/SimulationOutputPanel.jsx` - metrics, definitions, and live 3D viewport
- `scripts/vite_build_guard.sh` - guarded Vite build helper

## Tech Stack

Frontend:
- React 19
- Vite 7
- Three.js + @react-three/fiber + @react-three/drei

Desktop:
- Electron
- electron-builder / electron-packager

## Clinical Inputs and Ranges

Current slider ranges in UI:
- Detrusor pressure: `10..150 cmH2O`
- Pendulous urethra: `8.0..22.0 cm`
- Bulbar urethra: `1.5..7.0 cm`
- Membranous urethra: `0.6..3.0 cm`
- Prostatic urethra: `2.0..6.0 cm`
- Prostate volume: `10..150 cc`
- IPP (mm): `0.0..20.0`
- Auto-assigned IPP grade: `0..3` (`0` none, `1` <5 mm, `2` 5-10 mm, `3` >10 mm)

Derived total length:

`total_urethral_length = pendulous + bulbar + membranous + prostatic`

## Scalar Model (Current Implementation)

Implemented in:
- `simulation.py`
- `frontend/src/sim/uroflowModel.js`

### Mathematical Definition (Exact Current Code Logic)

The model is a deterministic scalar mapping from input sliders to flow/geometry outputs.

Notation:
- `clamp(x, lo, hi) = max(lo, min(hi, x))`
- pressure in `cmH2O` unless stated otherwise
- lengths in `cm`
- volume in `cc`

#### 1) Input normalization

```text
p_det   = max(0, p_det)
length  = max(0.1, length)
volume  = max(0.1, volume)
IPP_mm  = max(0, ipp_mm)
IPP     = 0 if IPP_mm == 0
          1 if 0 < IPP_mm < 5
          2 if 5 <= IPP_mm <= 10
          3 if IPP_mm > 10
```

If `prostatic_length` is explicitly provided by UI:

```text
LD_PU = clamp(prostatic_length, 2.0, 6.0)
```

Otherwise:

```text
LD_PU = clamp(0.16 * length, 2.0, 6.0)
```

#### 2) Geometry proxy equations

```text
TD_BN = clamp(3.1 - 0.18*(IPP - 1) - 0.0035*(volume - 40.0), 2.2, 3.4)

TD_PU = clamp(
  4.4
  - 0.42*(IPP - 1)
  - 0.20*(LD_PU - 3.8)
  - 0.012*(volume - 40.0),
  1.4,
  4.8
)
```

Ratio definitions:

```text
RPU_1 = TD_PU / TD_BN
RPU_2 = RPU_1 / LD_PU
```

#### 3) Vortex index and binary vortex flag

```text
RPU1_norm = clamp((RPU_1 - 0.79) / (1.36 - 0.79), 0.0, 1.0)
RPU2_norm = clamp((RPU_2 - 0.02) / (0.038 - 0.02), 0.0, 1.0)
vortex_index = 0.5 * (RPU1_norm + RPU2_norm)
vortex_present = (RPU_1 > 0.79) and (RPU_2 > 0.02)
```

`vortex_index` is continuous in `[0, 1]` and is used to modulate losses.

#### 4) Pressure drive and obstruction/resistance

Pressure conversion:

```text
pressure_drive_pa = max(300.0, p_det * 98.0665)
```

Obstruction factors:

```text
length_obstruction = (LD_PU / 3.8)^1.7
ipp_obstruction    = 1.0 + 0.65*(IPP - 1)
volume_obstruction = (volume / 40.0)^0.6
```

Combined resistance:

```text
resistance_index =
  length_obstruction
  * ipp_obstruction
  * volume_obstruction
  * (1.0 + 0.45*vortex_index)
```

This is the main mechanism that increases obstruction with longer prostatic urethra and higher IPP.

#### 5) Flow and velocity outputs

Target midpoint external orifice velocity:

```text
MV_EUO_target = clamp(3.16 - 0.08*vortex_index, 2.8, 3.18)   [m/s]
MV_EUO = MV_EUO_target
         * sqrt(pressure_drive_pa / (50.6 * 98.0665))
         / sqrt(resistance_index)
```

Maximum flow:

```text
base_qmax = 24.0 * sqrt(pressure_drive_pa / (50.6 * 98.0665))
q_max_raw = base_qmax / (resistance_index^0.9) * (1.02 - 0.12*vortex_index)
Q_max = clamp(q_max_raw, 2.0, 45.0)                            [mL/s]
```

Average flow:

```text
qave_ratio = clamp(0.76 - 0.14*vortex_index - 0.05*(IPP - 1), 0.45, 0.78)
Q_ave = Q_max * qave_ratio                                     [mL/s]
```

Internal scene velocity proxy (used for particle animation):

```text
EUO_diameter_cm = 0.6
EUO_area_cm2 = pi * (EUO_diameter_cm / 2)^2
average_velocity = Q_ave / EUO_area_cm2                        [cm/s]
```

Estimated pressure loss:

```text
pressure_loss = pressure_drive_pa * (1 - 1/(1 + resistance_index))   [Pa]
```

#### 6) Output dictionary

Returned keys and units:
- `q_max` (`mL/s`)
- `q_ave` (`mL/s`)
- `average_velocity` (`cm/s`) - animation proxy, not primary clinical endpoint
- `p_det_used` (`cmH2O`)
- `ipp_grade_used` (`0..3`)
- `ipp_mm_used` (`mm`)
- `rpu_1` (dimensionless)
- `rpu_2` (`1/cm`)
- `mv_euo` (`m/s`)
- `vortex_present` (boolean)
- `td_bn` (`cm`)
- `td_pu` (`cm`)
- `ld_pu` (`cm`)
- `pressure_loss` (`Pa`)

#### 7) Interpretation of model behavior

- Increasing `LD_PU` increases `length_obstruction`, increasing `resistance_index`, reducing `Q_max` and `Q_ave`.
- Increasing `IPP` increases both geometric narrowing and `ipp_obstruction`, reducing `Q_max` and `Q_ave`.
- Increasing `volume` generally increases obstruction through both geometry terms and `volume_obstruction`.
- Increasing `p_det` increases pressure drive and can partially compensate obstruction, but clamp limits still apply.

## Literature Basis (Informing, Not Clinical Validation)

Model structure is informed by these papers:
- Zhang et al. (Scientific Reports, 2021) - PU geometry ratios and vortex-associated trends
- Ishii et al. (IEEE JTEHM, 2014) - fluid property assumptions and pressure-loss framing

Current code uses these publications as directional constraints/trends, not as a full patient-specific CFD implementation.

## Local Development

### Desktop dev (Electron, app-only local simulation)

```bash
cd "/Users/donaldneff/Documents/Urine flow sim/frontend"
npm install
npm run dev:desktop
```

## Build macOS App / DMG

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

Optional legacy packaging path (includes backend binary):

```bash
cd "/Users/donaldneff/Documents/Urine flow sim/frontend"
npm run package:mac:with-backend
```

## How the Desktop App Boots

- Electron starts first
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

### Frontend build appears to hang

The build guard script (`scripts/vite_build_guard.sh`) prevents overlapping builds and copies esbuild binary to local cache when needed.
Retry with a clean single build process.

## Validation Notes

Recent checks performed in development:
- Frontend production build succeeds (`npm run build`)
- Directional behavior checks:
  - increasing prostatic urethral length reduces `Q_max` / `Q_ave`
  - increasing IPP mm (and therefore grade) reduces `Q_max` / `Q_ave`

For stronger scientific confidence, add formal calibration datasets and regression tests against known case series.

## Next Engineering Steps

- Add golden-case tests for monotonicity and numeric ranges
- Version the scalar model coefficients and document change logs
- Add reproducible calibration notebook for published cohorts
- Optionally offload heavy 3D field generation to GPU when true CFD is introduced

## License

MIT License. See `LICENSE`.
