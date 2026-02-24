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
  const length = Math.max(0.1, totalUrethralLengthCm(payload));
  const volume = Math.max(0.1, asNumber(payload?.volume, 0));
  const ippGrade = clamp(Math.round(asNumber(payload?.ipp_grade, 2)), 1, 3);

  const rhoUrine = 1.0;
  const CMH2O_TO_DYN_PER_CM2 = 980.665;

  const pMuo = 6.0;
  const ippPressureDrop = { 1: 1.0, 2: 3.5, 3: 7.0 }[ippGrade] ?? 3.5;
  const effectivePDet = Math.max(0.0, pDet - pMuo - ippPressureDrop);

  const baselineDiameterCm = 0.28;
  const area0 = Math.PI * (baselineDiameterCm / 2.0) ** 2;
  const wallElastanceK = 24.0;
  const pTm = 0.45 * effectivePDet;
  const area = Math.max(0.28 * area0, area0 * (1.0 + pTm / wallElastanceK));

  const obstructionIndex = (length / 24.5) ** 1.15 * (volume / 30.0) ** 0.65;
  const resistanceFactor = 1.0 + 0.22 * Math.max(0.0, obstructionIndex - 1.0);

  const dischargeCoeff = { 1: 0.92, 2: 0.84, 3: 0.72 }[ippGrade] ?? 0.84;

  const deltaP = effectivePDet * CMH2O_TO_DYN_PER_CM2;
  const velocity = dischargeCoeff * Math.sqrt((2.0 * deltaP) / rhoUrine) / resistanceFactor;
  const qMax = area * velocity;

  return {
    q_max: round2(qMax),
    average_velocity: round2(velocity),
    p_det_used: round2(pDet),
  };
}
