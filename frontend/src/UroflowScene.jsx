import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls.js';
import {
  buildFlowProfile,
  createParticleSeeds,
  nextParticleT,
  particlePosition,
  particleSpeed,
} from './sim/uroflowSceneMath';

function FlowModel({ inputs, results }) {
  const groupRef = useRef(null);
  const particleRefs = useRef([]);

  const profile = useMemo(
    () => buildFlowProfile(inputs.length, inputs.volume, inputs.ipp_grade, results?.q_max),
    [inputs.length, inputs.volume, inputs.ipp_grade, results?.q_max],
  );

  const seeds = useMemo(() => createParticleSeeds(36), []);

  useFrame((_, delta) => {
    const speed = particleSpeed(results?.average_velocity);
    seeds.forEach((seed, idx) => {
      const mesh = particleRefs.current[idx];
      if (!mesh) return;

      seed.t = nextParticleT(seed.t, delta, speed);
      const position = particlePosition(seed, seed.t, profile);
      mesh.position.set(position.x, position.y, position.z);
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
