function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function radiusSampler(baseRadius, narrowing, centerT) {
  return (t) => {
    const notch = Math.exp(-((t - centerT) ** 2) / 0.02);
    const radius = baseRadius * (1 - narrowing * notch);
    return Math.max(0.06, radius);
  };
}

export function buildFlowProfile(totalLengthCm, prostaticLengthCm, volume, ippMm, qMax) {
  const lengthCm = Math.max(6, Number(totalLengthCm));
  const prostaticCm = clamp(Number(prostaticLengthCm) || 3.5, 1.5, lengthCm * 0.6);

  const worldLength = clamp(lengthCm * 0.22, 4.5, 11.8);
  const volumeFactor = clamp(Number(volume) / 40, 0.45, 1.5);
  const ippMmClamped = clamp(Number(ippMm) || 0, 0, 20);
  const ippSeverity = clamp((ippMmClamped / 5) - 1, -1, 2);
  const ippFactor = clamp((ippSeverity + 1) / 3, 0, 1);
  const qFactor = clamp(((qMax ?? 12) + 2) / 20, 0.35, 1.4);

  const prostaticFraction = clamp(prostaticCm / lengthCm, 0.08, 0.35);
  const prostaticWorldLength = worldLength * prostaticFraction;
  const prostateCenterT = clamp(prostaticFraction * 0.75, 0.08, 0.42);

  const baseRadius = 0.26 * qFactor;
  const narrowing = Math.min(0.62, 0.16 + 0.22 * ippFactor + 0.16 * (volumeFactor - 1));
  const radiusAt = radiusSampler(baseRadius, narrowing, prostateCenterT);

  const segments = 24;
  const segLength = worldLength / segments;
  const rows = [];
  for (let i = 0; i < segments; i += 1) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    rows.push({
      x: (i + 0.5) * segLength - worldLength / 2,
      radiusStart: radiusAt(t0),
      radiusEnd: radiusAt(t1),
      segLength,
    });
  }

  return {
    worldLength,
    prostaticWorldLength,
    prostateCenterX: -worldLength / 2 + prostateCenterT * worldLength,
    radiusAt,
    rows,
  };
}

export function pseudoRandom(index, salt) {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function createParticleSeeds(count = 36) {
  const seeds = [];
  for (let i = 0; i < count; i += 1) {
    const angle = pseudoRandom(i, 1) * Math.PI * 2;
    const radius = Math.sqrt(pseudoRandom(i, 2)) * 0.86;
    seeds.push({
      t: pseudoRandom(i, 3),
      y: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
    });
  }
  return seeds;
}

export function particleSpeed(averageVelocity) {
  return 0.12 + ((averageVelocity ?? 80) / 450);
}

export function nextParticleT(currentT, delta, speed) {
  return (currentT + delta * speed) % 1;
}

export function particlePosition(seed, t, profile) {
  const x = t * profile.worldLength - profile.worldLength / 2;
  const radius = profile.radiusAt(t);
  return {
    x,
    y: seed.y * radius * 0.72,
    z: seed.z * radius * 0.72,
  };
}
