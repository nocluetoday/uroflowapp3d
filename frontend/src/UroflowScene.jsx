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

function FlowModel({ inputs, totalUrethralLength, results }) {
  const groupRef = useRef(null);
  const particleRefs = useRef([]);

  const profile = useMemo(
    () => buildFlowProfile(totalUrethralLength, inputs.prostatic_length, inputs.volume, inputs.ipp_mm, results?.q_max),
    [inputs.ipp_mm, inputs.prostatic_length, inputs.volume, results?.q_max, totalUrethralLength],
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

      {inputs.showBladderPhantom ? (
        <mesh position={[-profile.worldLength / 2 - 0.9, 0.1, 0]} scale={[1.7, 1.45, 1.7]}>
          <sphereGeometry args={[0.95, 40, 32]} />
          <meshStandardMaterial color="#4db6ff" emissive="#0e3f5f" transparent opacity={0.17} roughness={0.35} />
        </mesh>
      ) : null}

      {inputs.showProstatePhantom ? (
        <mesh
          position={[profile.prostateCenterX, -0.02, 0]}
          scale={[1.25, 1.05, 1.25]}
          rotation={[0, 0, 0.1]}
        >
          <sphereGeometry args={[0.62, 38, 30]} />
          <meshStandardMaterial color="#ff9f5f" emissive="#5f2c0f" transparent opacity={0.26} roughness={0.4} />
        </mesh>
      ) : null}

      {profile.rows.map((row, idx) => (
        <mesh key={idx} position={[row.x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[row.radiusEnd, row.radiusStart, row.segLength * 1.02, 40, 1, true]} />
          <meshStandardMaterial
            color="#6de5b9"
            emissive="#0f4234"
            roughness={0.34}
            metalness={0.08}
            transparent
            opacity={0.93}
            side={2}
          />
        </mesh>
      ))}

      {seeds.map((_, idx) => (
        <mesh
          key={idx}
          ref={(node) => {
            particleRefs.current[idx] = node;
          }}
        >
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshStandardMaterial color="#ffb23f" emissive="#9a4900" />
        </mesh>
      ))}
    </group>
  );
}

export function UroflowScene({ inputs, totalUrethralLength, results }) {
  return (
    <Canvas camera={{ position: [0, 1.8, 8.2], fov: 42 }}>
      <color attach="background" args={['#081217']} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[4, 6, 6]} intensity={1.2} color="#b9ffec" />
      <directionalLight position={[-5, -2, -3]} intensity={0.65} color="#ffcb8d" />
      <FlowModel inputs={inputs} totalUrethralLength={totalUrethralLength} results={results} />
      <OrbitControls enablePan={false} minDistance={5.4} maxDistance={12} />
    </Canvas>
  );
}
