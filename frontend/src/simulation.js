const CMH2O_TO_DYN_PER_CM2 = 980.665;

function roundTo(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

export function runSimulationLocal(pDet, length, volume, ippGrade) {
  const pDetSafe = Math.max(0, Number(pDet));
  const lengthSafe = Math.max(0.1, Number(length));
  const volumeSafe = Math.max(0.1, Number(volume));
  const ipp = Number.parseInt(ippGrade, 10);

  const rhoUrine = 1.0; // g/cm^3
  const pMuo = 6.0;
  const ippPressureDrop = { 1: 1.0, 2: 3.5, 3: 7.0 }[ipp] ?? 3.5;
  const effectivePDet = Math.max(0, pDetSafe - pMuo - ippPressureDrop);

  const baselineDiameterCm = 0.28;
  const area0 = Math.PI * (baselineDiameterCm / 2) ** 2;
  const wallElastanceK = 24.0;
  const pTm = 0.45 * effectivePDet;
  const area = Math.max(0.28 * area0, area0 * (1 + pTm / wallElastanceK));

  const obstructionIndex = (lengthSafe / 4.0) ** 1.15 * (volumeSafe / 30.0) ** 0.65;
  const resistanceFactor = 1 + 0.22 * Math.max(0, obstructionIndex - 1);

  const dischargeCoeff = { 1: 0.92, 2: 0.84, 3: 0.72 }[ipp] ?? 0.84;
  const deltaP = effectivePDet * CMH2O_TO_DYN_PER_CM2;
  const velocity = dischargeCoeff * Math.sqrt((2 * deltaP) / rhoUrine) / resistanceFactor;
  const qMax = area * velocity;

  return {
    q_max: roundTo(qMax, 2),
    average_velocity: roundTo(velocity, 2),
    p_det_used: roundTo(pDetSafe, 2),
  };
}
