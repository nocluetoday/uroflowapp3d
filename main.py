from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from simulation import run_simulation
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

class SimulationRequest(BaseModel):
    p_det: float = Field(..., description="Detrusor Pressure (cmH2O)")
    length: float = Field(..., description="Prostate Size Length (cm)")
    volume: float = Field(..., description="Prostate Size Volume (cc)")
    ipp_grade: int = Field(..., ge=1, le=3, description="Intravesical Prostatic Protrusion (IPP) Grade 1-3")

class SimulationResponse(BaseModel):
    q_max: float = Field(..., description="Maximum flow rate (ml/s)")
    average_velocity: float = Field(..., description="Average flow velocity (cm/s)")
    p_det_used: float = Field(..., description="Detrusor pressure used (cmH2O)")

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
            volume=request.volume,
            ipp_grade=request.ipp_grade
        )
        return result
    except Exception as e:
        logger.error(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")
