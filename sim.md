# Prostatic Urethra Fluid-Structure Interaction (FSI) Simulation Specifications

## Project Overview
This project requires building a backend computational fluid dynamics (CFD) simulation for urine flow through the prostatic urethra. The application models the lower urinary tract as a non-rigid, dynamic fluid system.

## Tech Stack
* **Frontend:** React Native
* **API Layer:** FastAPI (Python)
* **Backend Physics Engine:** FEniCS (Python/C++) or OpenFOAM
* **Infrastructure:** Docker containerization

## Mathematical Framework & Core Variables

### 1. Detrusor Pressure (P_det)
Acts as the inlet boundary condition representing driving kinetic and potential energy.
* **Equation (Modified Bernoulli):** $P_{det} = P_{muo} + \frac{1}{2}\rho v^2$
* **Variables:** $P_{muo}$ (minimum urethral opening pressure), $\rho$ (urine density), $v$ (velocity).

### 2. Prostate Size (Length and Volume)
Models flow resistance across the distensible tissue of the prostatic urethra.
* **Mechanism:** Increased longitudinal diameter increases frictional energy loss.
* **Implementation:** 3D mesh morphing based on quantitative inputs (MRI or TRUS measurements).

### 3. Intravesical Prostatic Protrusion (IPP)
Models early turbulence and kinetic energy loss at the bladder neck.
* **Equation (Reynolds number):** $Re = \frac{\rho v D}{\mu}$
* **Implementation:** Categorical input (Grade I-III) translates to a physical baffle at the inlet boundary to compute the resulting pressure drop.

## FSI Mathematical Schema

### Fluid Domain (Navier-Stokes)
* **Conservation of mass:** $\nabla \cdot \mathbf{v} = 0$
* **Conservation of momentum:** $\rho_f \left( \frac{\partial \mathbf{v}}{\partial t} + (\mathbf{v} \cdot \nabla)\mathbf{v} \right) = -\nabla p + \mu \nabla^2 \mathbf{v}$

### Solid Domain (Elastodynamics)
* **Tissue matrix displacement:** $\rho_s \frac{\partial^2 \mathbf{u}}{\partial t^2} = \nabla \cdot \boldsymbol{\sigma}_s + \mathbf{f}_b$

### Coupling Interface
* **Kinematic condition:** $\mathbf{v}_{interface} = \frac{\partial \mathbf{u}_{interface}}{\partial t}$
* **Dynamic condition:** $\boldsymbol{\sigma}_s \cdot \mathbf{n} = \boldsymbol{\tau}_f \cdot \mathbf{n}$

### 1D Collapsible Tube Law (Optimization)
* **Equation:** $P_{tm} = P_f - P_{ext} = K \left( \frac{A}{A_0} - 1 \right)$
* **Variables:** $P_f$ (internal fluid pressure), $P_{ext}$ (external pressure), $A_0$ (resting cross-sectional area), $K$ (specific elastance).

## Agent Instructions
1. Initialize a FastAPI project structure.
2. Create API endpoints to accept client inputs for P_det, prostate length, volume, and IPP grade.
3. Draft a FEniCS Python script implementing the 1D collapsible tube law equations to return simulated maximum flow rate (Q_max) and flow velocity data.
4. Containerize the environment using Docker, ensuring FEniCS and FastAPI dependencies are met.