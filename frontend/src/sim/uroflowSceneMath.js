function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function radiusSampler(baseRadius, narrowing) {
  return (t) => {
    const notch = Math.exp(-((t - 0.52) ** 2) / 0.02);
    const radius = baseRadius * (1 - narrowing * notch);
    return Math.max(0.06, radius);
  };
}

export function buildFlowProfile(length, volume, ippGrade, qMax) {
  const lengthCm = Math.max(2, Number(length));
  const worldLength = 7 + (lengthCm - 4) * 0.45;
  const volumeFactor = clamp(Number(volume) / 40, 0.45, 1.5);
  const ippFactor = Number(ippGrade) / 3;
  const qFactor = clamp(((qMax ?? 12) + 2) / 20, 0.35, 1.4);

  const baseRadius = 0.27 * qFactor;
  const narrowing = Math.min(0.62, 0.16 + 0.22 * ippFactor + 0.16 * (volumeFactor - 1));
  const radiusAt = radiusSampler(baseRadius, narrowing);

  const segments = 22;
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
