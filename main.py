import json
import math
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from simulation import ipp_grade_from_mm, run_simulation
import logging

app = FastAPI(
    title="Urine Flow Simulation API",
    description="Backend computational fluid dynamics (CFD) simulation for urine flow through the prostatic urethra.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

app.mount("/artifacts", StaticFiles(directory=str(ARTIFACTS_DIR)), name="artifacts")

executor = ThreadPoolExecutor(max_workers=2)
jobs_lock = threading.Lock()
jobs = {}


class SimulationRequest(BaseModel):
    p_det: float = Field(..., description="Detrusor Pressure (cmH2O)")
    length: float = Field(..., description="Total urethral length (cm)")
    prostatic_length: Optional[float] = Field(None, description="Prostatic urethral length LD-PU (cm)")
    volume: float = Field(..., description="Prostate Size Volume (cc)")
    ipp_grade: Optional[int] = Field(
        None,
        ge=0,
        le=3,
        description="Intravesical Prostatic Protrusion (IPP) Grade 0-3. Ignored if ipp_mm is provided.",
    )
    ipp_mm: Optional[float] = Field(
        None,
        ge=0,
        description="Intravesical Prostatic Protrusion (IPP) in millimeters. Used to auto-assign grade.",
    )

class SimulationResponse(BaseModel):
    q_max: float = Field(..., description="Maximum flow rate (ml/s)")
    q_ave: float = Field(..., description="Average flow rate over voiding profile (ml/s)")
    average_velocity: float = Field(..., description="Average flow velocity (cm/s)")
    p_det_used: float = Field(..., description="Detrusor pressure used (cmH2O)")
    ipp_grade_used: int = Field(..., description="IPP grade used by model (0-3)")
    ipp_mm_used: float = Field(..., description="IPP value used by model (mm)")
    rpu_1: float = Field(..., description="RPU-1 ratio (TD-PU / TD-BN)")
    rpu_2: float = Field(..., description="RPU-2 ratio (RPU-1 / LD-PU)")
    mv_euo: float = Field(..., description="Midpoint velocity at external urethral orifice (m/s)")
    vortex_present: bool = Field(..., description="Whether vortex is predicted in PU region")
    td_bn: float = Field(..., description="Estimated transverse diameter of bladder neck (cm)")
    td_pu: float = Field(..., description="Estimated transverse diameter of prostatic urethra (cm)")
    ld_pu: float = Field(..., description="Estimated longitudinal diameter of prostatic urethra (cm)")
    pressure_loss: float = Field(..., description="Estimated pressure loss through PU (Pa)")


class Uroflow3DRequest(SimulationRequest):
    mesh_resolution: int = Field(
        28,
        ge=12,
        le=96,
        description="Structured grid resolution along urethral length for VTK artifact generation.",
    )


class SimulationJobCreateResponse(BaseModel):
    job_id: str
    status: str
    created_at: str


class SimulationJobStatusResponse(BaseModel):
    job_id: str
    status: str
    created_at: str
    updated_at: str
    request: dict
    result: Optional[dict] = None
    artifacts: list[str] = Field(default_factory=list)
    error: Optional[str] = None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_ipp_grade(ipp_grade: Optional[int], ipp_mm: Optional[float]) -> int:
    if ipp_mm is not None:
        return ipp_grade_from_mm(ipp_mm)
    if ipp_grade is None:
        return 2
    return int(max(0, min(3, ipp_grade)))


def set_job_state(job_id: str, **updates):
    with jobs_lock:
        current = jobs[job_id]
        current.update(updates)
        current["updated_at"] = utc_now_iso()


def build_proxy_vtk_artifact(out_path: Path, request_data: dict, sim_result: dict):
    """
    Phase-1 bridge artifact: 3D velocity/pressure field in VTK legacy format.
    This is not a CFD solve yet, but it validates the end-to-end 3D data contract.
    """
    nx = int(request_data["mesh_resolution"])
    ny = max(10, nx // 2)
    nz = ny

    length_cm = max(0.1, float(request_data["length"]))
    baseline_radius_cm = 0.14
    radius_scale = max(0.65, min(1.55, sim_result["q_max"] / 20.0))
    radius_cm = baseline_radius_cm * radius_scale

    dx = length_cm / max(1, nx - 1)
    dy = (2.0 * radius_cm) / max(1, ny - 1)
    dz = (2.0 * radius_cm) / max(1, nz - 1)

    ipp_entry_loss = {0: 0.0, 1: 1.0, 2: 3.5, 3: 7.0}.get(int(request_data.get("ipp_grade", 2)), 3.5)
    p_inlet = float(sim_result["p_det_used"])
    p_outlet = max(0.0, p_inlet * 0.25)
    v_mean = float(sim_result["average_velocity"])

    n_points = nx * ny * nz
    pressure_values = []
    velocity_vectors = []

    for k in range(nz):
        z = -radius_cm + k * dz
        for j in range(ny):
            y = -radius_cm + j * dy
            radial_fraction = min(1.0, math.sqrt(y * y + z * z) / max(radius_cm, 1e-6))
            radial_profile = max(0.0, 1.0 - radial_fraction * radial_fraction)
            edge_penalty = ipp_entry_loss * (1.0 - radial_profile)

            for i in range(nx):
                x = i * dx
                axial_fraction = x / max(length_cm, 1e-6)
                pressure_axial = p_inlet - (p_inlet - p_outlet) * axial_fraction
                pressure = max(0.0, pressure_axial - edge_penalty)

                pulsatility = 1.0 + 0.1 * math.sin(math.pi * axial_fraction)
                vx = v_mean * radial_profile * pulsatility
                pressure_values.append(pressure)
                velocity_vectors.append((vx, 0.0, 0.0))

    with out_path.open("w", encoding="utf-8") as f:
        f.write("# vtk DataFile Version 3.0\n")
        f.write("Uroflow proxy field (phase-1 contract)\n")
        f.write("ASCII\n")
        f.write("DATASET STRUCTURED_POINTS\n")
        f.write(f"DIMENSIONS {nx} {ny} {nz}\n")
        f.write(f"ORIGIN 0 {-radius_cm:.6f} {-radius_cm:.6f}\n")
        f.write(f"SPACING {dx:.6f} {dy:.6f} {dz:.6f}\n")
        f.write(f"POINT_DATA {n_points}\n")
        f.write("SCALARS pressure_cmh2o float 1\n")
        f.write("LOOKUP_TABLE default\n")
        for p in pressure_values:
            f.write(f"{p:.6f}\n")
        f.write("VECTORS velocity_cms float\n")
        for vx, vy, vz in velocity_vectors:
            f.write(f"{vx:.6f} {vy:.6f} {vz:.6f}\n")


def run_3d_job(job_id: str, request_data: dict):
    set_job_state(job_id, status="running")
    try:
        result = run_simulation(
            p_det=request_data["p_det"],
            length=request_data["length"],
            prostatic_length=request_data.get("prostatic_length"),
            volume=request_data["volume"],
            ipp_grade=request_data.get("ipp_grade"),
            ipp_mm=request_data.get("ipp_mm"),
        )

        job_dir = ARTIFACTS_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        vtk_file = job_dir / "field.vtk"
        metadata_file = job_dir / "metadata.json"

        build_proxy_vtk_artifact(vtk_file, request_data, result)
        metadata_file.write_text(
            json.dumps(
                {
                    "job_id": job_id,
                    "generated_at": utc_now_iso(),
                    "phase": "phase-1-proxy",
                    "units": {
                        "pressure": "cmH2O",
                        "velocity": "cm/s",
                        "length": "cm",
                    },
                    "request": request_data,
                    "result": result,
                },
                indent=2,
            ),
            encoding="utf-8",
        )

        artifacts = [
            f"/artifacts/{job_id}/field.vtk",
            f"/artifacts/{job_id}/metadata.json",
        ]
        set_job_state(job_id, status="completed", result=result, artifacts=artifacts)
    except Exception as e:
        logger.exception("3D job failed")
        set_job_state(job_id, status="failed", error=str(e))


@app.get("/")
def read_root():
    return {"message": "Welcome to the Urine Flow Simulation API. Use POST /simulate to run a simulation."}

@app.post("/simulate", response_model=SimulationResponse)
def simulate_flow(request: SimulationRequest):
    try:
        # Run the FEniCS simulation
        result = run_simulation(
            p_det=request.p_det,
            length=request.length,
            prostatic_length=request.prostatic_length,
            volume=request.volume,
            ipp_grade=request.ipp_grade,
            ipp_mm=request.ipp_mm,
        )
        return result
    except Exception as e:
        logger.error(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


@app.post("/jobs/uroflow3d", response_model=SimulationJobCreateResponse)
def create_uroflow_3d_job(request: Uroflow3DRequest):
    job_id = str(uuid4())
    now = utc_now_iso()
    request_data = request.model_dump()
    request_data["ipp_grade"] = resolve_ipp_grade(request.ipp_grade, request.ipp_mm)
    if request_data.get("ipp_mm") is None:
        request_data["ipp_mm"] = {0: 0.0, 1: 2.5, 2: 7.5, 3: 12.5}[request_data["ipp_grade"]]

    with jobs_lock:
        jobs[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "created_at": now,
            "updated_at": now,
            "request": request_data,
            "result": None,
            "artifacts": [],
            "error": None,
        }

    executor.submit(run_3d_job, job_id, request_data)
    return SimulationJobCreateResponse(job_id=job_id, status="queued", created_at=now)


@app.get("/jobs/{job_id}", response_model=SimulationJobStatusResponse)
def get_job_status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found")
        return SimulationJobStatusResponse(**job)


@app.on_event("shutdown")
def on_shutdown():
    executor.shutdown(wait=False, cancel_futures=True)
