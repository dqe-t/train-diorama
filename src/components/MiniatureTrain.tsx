import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Object3D } from 'three';
import { sampleTrainPoseAlongSpline } from '../core/trackGraph';
import { useDioramaStore } from '../store/useDioramaStore';

interface PuffParticle {
  x: number;
  y: number;
  z: number;
  age: number;
}

const PUFF_COUNT = 6;

export function MiniatureTrain(): React.JSX.Element | null {
  const world = useDioramaStore((s): typeof s.world => s.world);
  const trainRunning = useDioramaStore((s): boolean => s.trainRunning);
  const goldenHour = useDioramaStore((s): boolean => s.goldenHour);

  const locoRef = useRef<Group>(null);
  const tenderRef = useRef<Group>(null);
  const coach1Ref = useRef<Group>(null);
  const coach2Ref = useRef<Group>(null);
  const coach3Ref = useRef<Group>(null);
  const puffGroupRef = useRef<Group>(null);
  const spotTargetRef = useRef<Object3D>(new Object3D());

  const distanceRef = useRef<number>(0.15);
  const directionRef = useRef<number>(1);
  const puffTimerRef = useRef<number>(0);
  const puffsRef = useRef<PuffParticle[]>(
    Array.from({ length: PUFF_COUNT }, (): PuffParticle => ({ x: 0, y: -10, z: 0, age: 1 }))
  );

  const samples = world.splineSamples;

  useFrame((_, delta): void => {
    if (
      samples.length < 6 ||
      !locoRef.current ||
      !tenderRef.current ||
      !coach1Ref.current ||
      !coach2Ref.current ||
      !coach3Ref.current
    ) {
      return;
    }

    const clampedDelta = Math.min(delta, 0.1);
    if (trainRunning) {
      const speed = 0.055;
      let nextDist = distanceRef.current + clampedDelta * speed * directionRef.current;

      if (world.trackClosed) {
        nextDist = ((nextDist % 1) + 1) % 1;
      } else {
        if (nextDist >= 0.96) {
          nextDist = 0.96;
          directionRef.current = -1;
        } else if (nextDist <= 0.08) {
          nextDist = 0.08;
          directionRef.current = 1;
        }
      }
      distanceRef.current = nextDist;
    }

    const applyCarriagePose = (ref: React.RefObject<Group | null>, offset: number): void => {
      if (!ref.current) return;
      const pose = sampleTrainPoseAlongSpline(samples, distanceRef.current - offset);
      ref.current.position.set(pose.x, pose.y + 0.06, pose.z);
      const yaw = directionRef.current >= 0 ? pose.yawRadians : pose.yawRadians + Math.PI;
      const pitch = directionRef.current >= 0 ? -pose.pitchRadians : pose.pitchRadians;
      ref.current.rotation.set(pitch, yaw, 0, 'YXZ');
    };

    const sign = directionRef.current;
    applyCarriagePose(locoRef, 0);
    applyCarriagePose(tenderRef, 0.015 * sign);
    applyCarriagePose(coach1Ref, 0.032 * sign);
    applyCarriagePose(coach2Ref, 0.051 * sign);
    applyCarriagePose(coach3Ref, 0.070 * sign);

    // Emit soft white steam puffs from the locomotive smokestack
    const locoPose = sampleTrainPoseAlongSpline(samples, distanceRef.current);
    puffTimerRef.current += clampedDelta;
    if (trainRunning && puffTimerRef.current > 0.16) {
      puffTimerRef.current = 0;
      puffsRef.current.pop();
      puffsRef.current.unshift({
        x: locoPose.x,
        y: locoPose.y + 0.36,
        z: locoPose.z,
        age: 0,
      });
    }

    if (puffGroupRef.current) {
      puffsRef.current.forEach((p, idx): void => {
        p.age = Math.min(1, p.age + clampedDelta * 0.75);
        p.y += clampedDelta * 0.38;
        const mesh = puffGroupRef.current?.children[idx];
        if (mesh) {
          mesh.position.set(p.x, p.y, p.z);
          const scale = (1 - p.age) * 0.85 + 0.16;
          mesh.scale.set(scale, scale, scale);
        }
      });
    }
  });

  if (samples.length < 6) {
    return null;
  }

  return (
    <group>
      {/* Steam Locomotive */}
      <group ref={locoRef}>
        {/* Chassis */}
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.22, 0.05, 0.42]} />
          <meshStandardMaterial color="#1a1c1e" roughness={0.7} metalness={0.6} />
        </mesh>
        {/* Cab */}
        <mesh position={[0, 0.15, -0.09]} castShadow>
          <boxGeometry args={[0.21, 0.18, 0.16]} />
          <meshStandardMaterial color="#ba3c2e" roughness={0.4} metalness={0.2} envMapIntensity={1.2} />
        </mesh>
        {/* Cab Roof */}
        <mesh position={[0, 0.25, -0.09]} castShadow>
          <boxGeometry args={[0.24, 0.03, 0.19]} />
          <meshStandardMaterial color="#dfaf38" roughness={0.35} metalness={0.6} envMapIntensity={1.5} />
        </mesh>
        {/* Boiler with metallic specular sheen */}
        <mesh position={[0, 0.13, 0.08]} rotation={[Math.PI * 0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.23, 16]} />
          <meshStandardMaterial color="#181b20" roughness={0.28} metalness={0.72} envMapIntensity={2.0} />
        </mesh>
        {/* Smokestack */}
        <mesh position={[0, 0.24, 0.14]} castShadow>
          <cylinderGeometry args={[0.038, 0.028, 0.12, 10]} />
          <meshStandardMaterial color="#ba3c2e" roughness={0.5} />
        </mesh>
        {/* Polished Brass Bell */}
        <mesh position={[0, 0.235, 0.0]} castShadow>
          <cylinderGeometry args={[0.02, 0.032, 0.04, 10]} />
          <meshStandardMaterial color="#e5c158" metalness={0.92} roughness={0.16} envMapIntensity={2.5} />
        </mesh>
        {/* Working Locomotive Headlight with forward beam */}
        <mesh position={[0, 0.18, 0.21]} castShadow>
          <boxGeometry args={[0.065, 0.065, 0.05]} />
          <meshStandardMaterial color="#1a1c1e" roughness={0.6} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.18, 0.238]}>
          <circleGeometry args={[0.026, 12]} />
          <meshStandardMaterial emissive="#fff2c2" emissiveIntensity={4.0} color="#ffffff" />
        </mesh>
        <spotLight
          position={[0, 0.18, 0.24]}
          target={spotTargetRef.current}
          angle={Math.PI / 6}
          penumbra={0.6}
          intensity={goldenHour ? 3.6 : 2.2}
          color="#fff5cc"
          distance={10}
          castShadow
        />
        <primitive object={spotTargetRef.current} position={[0, 0.0, 5.0]} />
      </group>

      {/* Coal Tender Car */}
      <group ref={tenderRef}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.2, 0.045, 0.26]} />
          <meshStandardMaterial color="#1a1c1e" roughness={0.7} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.11, 0]} castShadow>
          <boxGeometry args={[0.19, 0.11, 0.23]} />
          <meshStandardMaterial color="#ba3c2e" roughness={0.4} metalness={0.2} envMapIntensity={1.2} />
        </mesh>
      </group>

      {/* Blue Freight Boxcar */}
      <group ref={coach1Ref}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.2, 0.045, 0.34]} />
          <meshStandardMaterial color="#1a1c1e" roughness={0.7} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.13, 0]} castShadow>
          <boxGeometry args={[0.19, 0.14, 0.31]} />
          <meshStandardMaterial color="#2d72b2" roughness={0.5} metalness={0.25} envMapIntensity={1.2} />
        </mesh>
        <mesh position={[0, 0.21, 0]} castShadow>
          <boxGeometry args={[0.21, 0.025, 0.33]} />
          <meshStandardMaterial color="#ece3cc" roughness={0.6} />
        </mesh>
      </group>

      {/* Cream White Passenger Coach */}
      <group ref={coach2Ref}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.2, 0.045, 0.36]} />
          <meshStandardMaterial color="#1a1c1e" roughness={0.7} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.13, 0]} castShadow>
          <boxGeometry args={[0.19, 0.14, 0.33]} />
          <meshStandardMaterial color="#ece3cc" roughness={0.55} envMapIntensity={1.0} />
        </mesh>
        <mesh position={[0, 0.21, 0]} castShadow>
          <boxGeometry args={[0.21, 0.025, 0.35]} />
          <meshStandardMaterial color="#b27f54" roughness={0.65} />
        </mesh>
      </group>

      {/* Green Caboose */}
      <group ref={coach3Ref}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.2, 0.045, 0.34]} />
          <meshStandardMaterial color="#1a1c1e" roughness={0.7} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.13, 0]} castShadow>
          <boxGeometry args={[0.19, 0.14, 0.31]} />
          <meshStandardMaterial color="#3f7e52" roughness={0.5} metalness={0.25} envMapIntensity={1.1} />
        </mesh>
        <mesh position={[0, 0.21, 0]} castShadow>
          <boxGeometry args={[0.21, 0.025, 0.33]} />
          <meshStandardMaterial color="#ece3cc" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.25, -0.02]} castShadow>
          <boxGeometry args={[0.14, 0.06, 0.12]} />
          <meshStandardMaterial color="#3f7e52" roughness={0.5} />
        </mesh>
      </group>

      {/* Steam Puffs */}
      <group ref={puffGroupRef}>
        {Array.from({ length: PUFF_COUNT }, (_, idx): React.JSX.Element => (
          <mesh key={idx} position={[0, -10, 0]}>
            <dodecahedronGeometry args={[0.075, 1]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.78} roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
