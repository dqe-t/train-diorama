import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { sampleTrainPoseAlongSpline } from '../core/trackGraph';
import { useDioramaStore } from '../store/useDioramaStore';

interface PuffParticle {
  x: number;
  y: number;
  z: number;
  age: number;
}

export function MiniatureTrain(): React.JSX.Element | null {
  const world = useDioramaStore((s): typeof s.world => s.world);
  const trainRunning = useDioramaStore((s): boolean => s.trainRunning);

  const locoRef = useRef<Group>(null);
  const tenderRef = useRef<Group>(null);
  const coach1Ref = useRef<Group>(null);
  const coach2Ref = useRef<Group>(null);
  const puffGroupRef = useRef<Group>(null);

  const distanceRef = useRef<number>(0.15);
  const directionRef = useRef<number>(1);
  const puffTimerRef = useRef<number>(0);
  const puffsRef = useRef<PuffParticle[]>([
    { x: 0, y: -10, z: 0, age: 1 },
    { x: 0, y: -10, z: 0, age: 1 },
    { x: 0, y: -10, z: 0, age: 1 },
    { x: 0, y: -10, z: 0, age: 1 },
  ]);

  const samples = world.splineSamples;

  useFrame((_, delta): void => {
    if (
      samples.length < 6 ||
      !locoRef.current ||
      !tenderRef.current ||
      !coach1Ref.current ||
      !coach2Ref.current
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

    // Emit soft white steam puffs from the locomotive smokestack
    const locoPose = sampleTrainPoseAlongSpline(samples, distanceRef.current);
    puffTimerRef.current += clampedDelta;
    if (trainRunning && puffTimerRef.current > 0.2) {
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
        p.age = Math.min(1, p.age + clampedDelta * 0.85);
        p.y += clampedDelta * 0.34;
        const mesh = puffGroupRef.current?.children[idx];
        if (mesh) {
          mesh.position.set(p.x, p.y, p.z);
          const scale = (1 - p.age) * 0.95 + 0.12;
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
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.22, 0.05, 0.42]} />
          <meshStandardMaterial color="#26282a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.15, -0.09]} castShadow>
          <boxGeometry args={[0.21, 0.18, 0.16]} />
          <meshStandardMaterial color="#cf4738" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.25, -0.09]} castShadow>
          <boxGeometry args={[0.24, 0.03, 0.19]} />
          <meshStandardMaterial color="#f2cf66" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.13, 0.08]} rotation={[Math.PI * 0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.23, 12]} />
          <meshStandardMaterial color="#30363d" roughness={0.45} metalness={0.35} />
        </mesh>
        <mesh position={[0, 0.24, 0.14]} castShadow>
          <cylinderGeometry args={[0.038, 0.028, 0.12, 8]} />
          <meshStandardMaterial color="#cf4738" roughness={0.6} />
        </mesh>
      </group>

      {/* Coal Tender Car */}
      <group ref={tenderRef}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.2, 0.045, 0.26]} />
          <meshStandardMaterial color="#26282a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.11, 0]} castShadow>
          <boxGeometry args={[0.19, 0.11, 0.23]} />
          <meshStandardMaterial color="#cf4738" roughness={0.6} />
        </mesh>
      </group>

      {/* First Passenger Coach */}
      <group ref={coach1Ref}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.2, 0.045, 0.36]} />
          <meshStandardMaterial color="#26282a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.13, 0]} castShadow>
          <boxGeometry args={[0.19, 0.14, 0.33]} />
          <meshStandardMaterial color="#4b7ea8" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.21, 0]} castShadow>
          <boxGeometry args={[0.21, 0.03, 0.35]} />
          <meshStandardMaterial color="#f2ead3" roughness={0.7} />
        </mesh>
      </group>

      {/* Second Passenger Coach */}
      <group ref={coach2Ref}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.2, 0.045, 0.36]} />
          <meshStandardMaterial color="#26282a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.13, 0]} castShadow>
          <boxGeometry args={[0.19, 0.14, 0.33]} />
          <meshStandardMaterial color="#588f67" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.21, 0]} castShadow>
          <boxGeometry args={[0.21, 0.03, 0.35]} />
          <meshStandardMaterial color="#f2ead3" roughness={0.7} />
        </mesh>
      </group>

      {/* Steam Puffs */}
      <group ref={puffGroupRef}>
        {[0, 1, 2, 3].map((idx): React.JSX.Element => (
          <mesh key={idx} position={[0, -10, 0]}>
            <dodecahedronGeometry args={[0.075, 1]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.82} roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
