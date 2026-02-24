import math
from typing import Optional


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def ipp_grade_from_mm(ipp_mm: Optional[float]) -> int:
    if ipp_mm is None:
        return 2

    ipp_mm = max(0.0, float(ipp_mm))
    if ipp_mm == 0.0:
        return 0
    if ipp_mm < 5.0:
        return 1
    if ipp_mm <= 10.0:
        return 2
    return 3


def ipp_severity_from_mm(ipp_mm: float) -> float:
    """
    Continuous IPP effect variable used by the scalar model.
    Maps:
    - 0 mm -> -1.0 (least obstructive)
    - 5 mm -> 0.0
    - 10 mm -> 1.0
    - 15+ mm -> 2.0 (saturating)
    """
    ipp_mm = clamp(float(ipp_mm), 0.0, 20.0)
    return clamp((ipp_mm / 5.0) - 1.0, -1.0, 2.0)


def run_simulation(
    p_det: float,
    length: float,
    volume: float,
    ipp_grade: Optional[int] = None,
    ipp_mm: Optional[float] = None,
    prostatic_length: Optional[float] = None,
) -> dict:
    """
    Paper-informed scalar uroflow model from:
    - Zhang et al., Sci Rep 2021;11:663
    - Ishii et al., IEEE J Transl Eng Health Med 2014;2:1800709

    Core ratios from Zhang et al.:
    - RPU-1 = TD-PU / TD-BN
    - RPU-2 = RPU-1 / LD-PU

    Fluid assumptions from Ishii et al.:
    - rho = 1035 kg/m^3, mu = 0.8583e-3 Pa*s
    - pressure-loss behavior through PU drives flow efficiency
    """

    p_det = max(0.0, float(p_det))
    length = max(0.1, float(length))
    volume = max(0.1, float(volume))
    if ipp_mm is not None:
        ipp_mm = max(0.0, float(ipp_mm))
        ipp_grade = ipp_grade_from_mm(ipp_mm)
    elif ipp_grade is None:
        ipp_grade = 2
    else:
        ipp_grade = int(clamp(float(ipp_grade), 0.0, 3.0))
        ipp_mm = {0: 0.0, 1: 2.5, 2: 7.5, 3: 12.5}[ipp_grade]
    ipp_severity = ipp_severity_from_mm(ipp_mm)

    # Use explicit prostatic urethral length when provided by UI.
    if prostatic_length is None:
        ld_pu_cm = clamp(0.16 * length, 2.0, 6.0)
    else:
        ld_pu_cm = clamp(float(prostatic_length), 2.0, 6.0)

    # Geometry proxies consistent with post-surgery PU parameter ranges.
    # Stronger IPP and longer LD-PU deliberately produce larger obstruction.
    td_bn_cm = clamp(3.1 - 0.18 * ipp_severity - 0.0035 * (volume - 40.0), 2.2, 3.4)
    td_pu_cm = clamp(
        4.4 - 0.42 * ipp_severity - 0.20 * (ld_pu_cm - 3.8) - 0.012 * (volume - 40.0),
        1.4,
        4.8,
    )

    rpu_1 = td_pu_cm / td_bn_cm
    rpu_2 = rpu_1 / ld_pu_cm

    # Vortex index: 0 means non-vortex plateau, 1 means strong vortex.
    rpu1_norm = clamp((rpu_1 - 0.79) / (1.36 - 0.79), 0.0, 1.0)
    rpu2_norm = clamp((rpu_2 - 0.02) / (0.038 - 0.02), 0.0, 1.0)
    vortex_index = 0.5 * (rpu1_norm + rpu2_norm)
    vortex_present = bool(rpu_1 > 0.79 and rpu_2 > 0.02)

    # Resistance model: friction + expansion/vortex energy loss.
    # This intentionally enforces stronger obstruction with higher IPP and longer LD-PU.
    pressure_drive_pa = max(300.0, p_det * 98.0665)  # cmH2O to Pa
    length_obstruction = (ld_pu_cm / 3.8) ** 1.7
    ipp_obstruction = 1.0 + 0.65 * ipp_severity
    volume_obstruction = (volume / 40.0) ** 0.6
    resistance_index = length_obstruction * ipp_obstruction * volume_obstruction * (1.0 + 0.45 * vortex_index)

    # Zhang et al. trend for MV-EUO, with pressure and resistance scaling.
    mv_euo_target_mps = clamp(3.16 - 0.08 * vortex_index, 2.8, 3.18)
    mv_euo_mps = mv_euo_target_mps * math.sqrt(pressure_drive_pa / (50.6 * 98.0665)) / math.sqrt(resistance_index)

    # Clinical flow outputs.
    base_qmax = 24.0 * math.sqrt(pressure_drive_pa / (50.6 * 98.0665))
    q_max = base_qmax / (resistance_index ** 0.9) * (1.02 - 0.12 * vortex_index)
    q_max = clamp(q_max, 2.0, 45.0)

    qave_ratio = clamp(0.76 - 0.14 * vortex_index - 0.05 * ipp_severity, 0.45, 0.78)
    q_ave = q_max * qave_ratio

    # Keep an internal velocity proxy (cm/s) for scene particle animation.
    euo_diameter_cm = 0.6
    euo_area_cm2 = math.pi * (euo_diameter_cm / 2.0) ** 2
    average_velocity = q_ave / euo_area_cm2

    pressure_loss_pa = pressure_drive_pa * (1.0 - 1.0 / (1.0 + resistance_index))

    return {
        "q_max": round(float(q_max), 2),
        "q_ave": round(float(q_ave), 2),
        "average_velocity": round(float(average_velocity), 2),
        "p_det_used": round(p_det, 2),
        "ipp_grade_used": int(ipp_grade),
        "ipp_mm_used": round(float(ipp_mm), 2),
        "rpu_1": round(float(rpu_1), 3),
        "rpu_2": round(float(rpu_2), 3),
        "mv_euo": round(float(mv_euo_mps), 3),
        "vortex_present": vortex_present,
        "td_bn": round(float(td_bn_cm), 2),
        "td_pu": round(float(td_pu_cm), 2),
        "ld_pu": round(float(ld_pu_cm), 2),
        "pressure_loss": round(float(pressure_loss_pa), 1),
    }
