import math


def run_simulation(p_det: float, length: float, volume: float, ipp_grade: int) -> dict:
    """
    Phenomenological uroflow model with unit-correct Bernoulli velocity.

    Key relations:
    - Effective pressure after opening + IPP losses: P_eff = P_det - P_muo - dP_ipp
    - Velocity from Bernoulli in cgs units: v = C_d * sqrt(2 * P_eff / rho) / R_obs
    - Distensible lumen via collapsible tube law: A = A0 * (1 + P_tm / K)
    - Q_max = A * v   (cm^3/s == mL/s)
    """

    # Clamp physically invalid inputs.
    p_det = max(0.0, float(p_det))
    length = max(0.1, float(length))
    volume = max(0.1, float(volume))
    ipp_grade = int(ipp_grade)

    # cgs units keep Q in mL/s directly (cm^3/s).
    rho_urine = 1.0  # g/cm^3
    CMH2O_TO_DYN_PER_CM2 = 980.665

    # Opening threshold and IPP-induced entry losses.
    p_muo = 6.0
    ipp_pressure_drop = {1: 1.0, 2: 3.5, 3: 7.0}.get(ipp_grade, 3.5)
    effective_p_det = max(0.0, p_det - p_muo - ipp_pressure_drop)

    # Baseline urethral geometry and wall elastance.
    baseline_diameter_cm = 0.28
    area_0 = math.pi * (baseline_diameter_cm / 2.0) ** 2
    wall_elastance_k = 24.0
    p_tm = 0.45 * effective_p_det
    area = max(0.28 * area_0, area_0 * (1.0 + p_tm / wall_elastance_k))

    # Obstruction scales nonlinearly with gland size.
    obstruction_index = (length / 4.0) ** 1.15 * (volume / 30.0) ** 0.65
    resistance_factor = 1.0 + 0.22 * max(0.0, obstruction_index - 1.0)

    # IPP shifts discharge coefficient (turbulence + vena contracta losses).
    discharge_coeff = {1: 0.92, 2: 0.84, 3: 0.72}.get(ipp_grade, 0.84)

    # Unit-correct Bernoulli velocity in cm/s.
    delta_p = effective_p_det * CMH2O_TO_DYN_PER_CM2
    velocity = discharge_coeff * math.sqrt((2.0 * delta_p) / rho_urine) / resistance_factor
    q_max = area * velocity

    return {
        "q_max": round(float(q_max), 2),
        "average_velocity": round(float(velocity), 2),
        "p_det_used": round(p_det, 2),
    }
