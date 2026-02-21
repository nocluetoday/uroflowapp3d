import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls.js';

function pseudoRandom(index, salt) {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function FlowModel({ inputs, results }) {
  const groupRef = useRef(null);
  const particleRefs = useRef([]);

  const profile = useMemo(() => {
    const lengthCm = Math.max(2, Number(inputs.length));
    const worldLength = 7 + (lengthCm - 4) * 0.45;
    const volumeFactor = Math.min(1.5, Math.max(0.45, Number(inputs.volume) / 40));
    const ippFactor = Number(inputs.ipp_grade) / 3;
    const qFactor = Math.min(1.4, Math.max(0.35, ((results?.q_max ?? 12) + 2) / 20));

    const baseRadius = 0.27 * qFactor;
    const narrowing = Math.min(0.62, 0.16 + 0.22 * ippFactor + 0.16 * (volumeFactor - 1));

    const radiusAt = (t) => {
      const notch = Math.exp(-((t - 0.52) ** 2) / 0.02);
      const r = baseRadius * (1 - narrowing * notch);
      return Math.max(0.06, r);
    };

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

    return { worldLength, radiusAt, rows };
  }, [inputs.length, inputs.volume, inputs.ipp_grade, results?.q_max]);

  const seeds = useMemo(() => {
    const count = 36;
    const items = [];
    for (let i = 0; i < count; i += 1) {
      const a = pseudoRandom(i, 1) * Math.PI * 2;
      const r = Math.sqrt(pseudoRandom(i, 2)) * 0.86;
      items.push({
        t: pseudoRandom(i, 3),
        y: Math.cos(a) * r,
        z: Math.sin(a) * r,
      });
    }
    return items;
  }, []);

  useFrame((_, delta) => {
    const speed = 0.12 + ((results?.average_velocity ?? 80) / 450);
    seeds.forEach((seed, idx) => {
      const mesh = particleRefs.current[idx];
      if (!mesh) return;

      seed.t = (seed.t + delta * speed) % 1;
      const x = seed.t * profile.worldLength - profile.worldLength / 2;
      const radius = profile.radiusAt(seed.t);
      mesh.position.set(x, seed.y * radius * 0.72, seed.z * radius * 0.72);
    });

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.11;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
        <ringGeometry args={[2.2, 2.9, 64]} />
        <meshBasicMaterial color="#17212e" transparent opacity={0.35} />
      </mesh>

      {profile.rows.map((row, idx) => (
        <mesh key={idx} position={[row.x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[row.radiusEnd, row.radiusStart, row.segLength * 1.02, 40, 1, true]} />
          <meshStandardMaterial
            color="#6de5b9"
            emissive="#0f4234"
            roughness={0.34}
            metalness={0.08}
            transparent
            opacity={0.92}
            side={2}
          />
        </mesh>
      ))}

      {seeds.map((_, idx) => (
        <mesh key={idx} ref={(node) => { particleRefs.current[idx] = node; }}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshStandardMaterial color="#ffb23f" emissive="#9a4900" />
        </mesh>
      ))}
    </group>
  );
}

export function UroflowScene({ inputs, results }) {
  return (
    <Canvas camera={{ position: [0, 1.8, 8.2], fov: 42 }}>
      <color attach="background" args={['#081217']} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[4, 6, 6]} intensity={1.2} color="#b9ffec" />
      <directionalLight position={[-5, -2, -3]} intensity={0.65} color="#ffcb8d" />
      <FlowModel inputs={inputs} results={results} />
      <OrbitControls enablePan={false} minDistance={5.4} maxDistance={12} />
    </Canvas>
  );
}
