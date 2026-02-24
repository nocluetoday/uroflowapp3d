function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

export function ippGradeFromMm(ippMmValue) {
  const ippMm = Math.max(0, asNumber(ippMmValue, 0));
  if (ippMm === 0) {
    return 0;
  }
  if (ippMm < 5) {
    return 1;
  }
  if (ippMm <= 10) {
    return 2;
  }
  return 3;
}

export function ippSeverityFromMm(ippMmValue) {
  const ippMm = clamp(asNumber(ippMmValue, 0), 0, 20);
  return clamp((ippMm / 5) - 1, -1, 2);
}

export function totalUrethralLengthCm(inputs) {
  if (inputs && Number.isFinite(Number(inputs.length))) {
    return Math.max(0.1, Number(inputs.length));
  }

  const pendulous = asNumber(inputs?.pendulous_length, 16);
  const bulbar = asNumber(inputs?.bulbar_length, 3.5);
  const membranous = asNumber(inputs?.membranous_length, 1.5);
  const prostatic = asNumber(inputs?.prostatic_length, 3.5);
  return Math.max(0.1, pendulous + bulbar + membranous + prostatic);
}

export function runLocalSimulation(payload) {
  const pDet = Math.max(0, asNumber(payload?.p_det, 0));
  const totalLength = Math.max(0.1, totalUrethralLengthCm(payload));
  const volume = Math.max(0.1, asNumber(payload?.volume, 0));
  const ippMm = Math.max(0, asNumber(payload?.ipp_mm, 0));
  const ippGrade = ippGradeFromMm(ippMm);
  const ippSeverity = ippSeverityFromMm(ippMm);

  const prostaticLength = asNumber(payload?.prostatic_length, 0);
  const ldPuCm = prostaticLength > 0 ? clamp(prostaticLength, 2.0, 6.0) : clamp(0.16 * totalLength, 2.0, 6.0);

  const tdBnCm = clamp(3.1 - 0.18 * ippSeverity - 0.0035 * (volume - 40.0), 2.2, 3.4);
  const tdPuCm = clamp(
    4.4 - 0.42 * ippSeverity - 0.2 * (ldPuCm - 3.8) - 0.012 * (volume - 40.0),
    1.4,
    4.8,
  );

  const rpu1 = tdPuCm / tdBnCm;
  const rpu2 = rpu1 / ldPuCm;

  const rpu1Norm = clamp((rpu1 - 0.79) / (1.36 - 0.79), 0.0, 1.0);
  const rpu2Norm = clamp((rpu2 - 0.02) / (0.038 - 0.02), 0.0, 1.0);
  const vortexIndex = 0.5 * (rpu1Norm + rpu2Norm);
  const vortexPresent = rpu1 > 0.79 && rpu2 > 0.02;

  const pressureDrivePa = Math.max(300.0, pDet * 98.0665);
  const lengthObstruction = (ldPuCm / 3.8) ** 1.7;
  const ippObstruction = 1.0 + 0.65 * ippSeverity;
  const volumeObstruction = (volume / 40.0) ** 0.6;
  const resistanceIndex = lengthObstruction * ippObstruction * volumeObstruction * (1.0 + 0.45 * vortexIndex);

  const mvEuoTargetMps = clamp(3.16 - 0.08 * vortexIndex, 2.8, 3.18);
  const mvEuoMps = mvEuoTargetMps * Math.sqrt(pressureDrivePa / (50.6 * 98.0665)) / Math.sqrt(resistanceIndex);

  const baseQmax = 24.0 * Math.sqrt(pressureDrivePa / (50.6 * 98.0665));
  let qMax = (baseQmax / (resistanceIndex ** 0.9)) * (1.02 - 0.12 * vortexIndex);
  qMax = clamp(qMax, 2.0, 45.0);

  const qaveRatio = clamp(0.76 - 0.14 * vortexIndex - 0.05 * ippSeverity, 0.45, 0.78);
  const qAve = qMax * qaveRatio;

  const euoDiameterCm = 0.6;
  const euoAreaCm2 = Math.PI * (euoDiameterCm / 2.0) ** 2;
  const averageVelocity = qAve / euoAreaCm2;
  const pressureLoss = pressureDrivePa * (1.0 - 1.0 / (1.0 + resistanceIndex));

  return {
    q_max: round2(qMax),
    q_ave: round2(qAve),
    average_velocity: round2(averageVelocity),
    p_det_used: round2(pDet),
    ipp_grade_used: ippGrade,
    ipp_mm_used: round2(ippMm),
    rpu_1: round3(rpu1),
    rpu_2: round3(rpu2),
    mv_euo: round3(mvEuoMps),
    vortex_present: vortexPresent,
    td_bn: round2(tdBnCm),
    td_pu: round2(tdPuCm),
    ld_pu: round2(ldPuCm),
    pressure_loss: round2(pressureLoss),
  };
}
