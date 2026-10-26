import React from 'react';
import { SplineSample } from '../types/diorama';

export const TRESTLE_WOOD = '#7a5233';
export const TRESTLE_WOOD_DARK = '#5b3a26';
export const STONE_FOOTING = '#7d6b5b';

/** Low-to-moderate fill: stacked timber cribbing retaining wall supporting the track grade. */
export function TimberCribbingPier({ sample }: { readonly sample: SplineSample }): React.JSX.Element {
  const bottomY = sample.terrainY - 0.01;
  const topY = sample.y - 0.032;
  const height = Math.max(0.06, topY - bottomY);
  const midY = bottomY + height * 0.5;

  return (
    <group position={[sample.x, midY, sample.z]} rotation={[0, sample.yawRadians, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.54, height, 0.22]} />
        <meshStandardMaterial color="#6e4d34" roughness={0.95} />
      </mesh>
      <mesh position={[0, height * 0.5, 0]} castShadow>
        <boxGeometry args={[0.58, 0.025, 0.24]} />
        <meshStandardMaterial color={TRESTLE_WOOD_DARK} roughness={0.92} />
      </mesh>
    </group>
  );
}

/** High span: multi-tier battered timber trestle bent with stone footings. */
export function TrestleBent({ sample }: { readonly sample: SplineSample }): React.JSX.Element {
  const bottomY = sample.terrainY - 0.02;
  const topY = sample.y - 0.06;
  const height = Math.max(0.14, topY - bottomY);
  const midY = bottomY + height * 0.5;
  const spread = height * 0.15;
  const lean = Math.atan2(spread, height);
  const girtCount = Math.floor(height / 0.32);

  return (
    <group position={[sample.x, 0, sample.z]} rotation={[0, sample.yawRadians, 0]}>
      {/* Stone footings on natural ground */}
      {[-1, 1].map((side): React.JSX.Element => (
        <mesh
          key={`foot-${side}`}
          position={[side * (0.17 + spread), bottomY + 0.03, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.1, 0.06, 0.1]} />
          <meshStandardMaterial color={STONE_FOOTING} roughness={0.92} />
        </mesh>
      ))}

      {/* Splayed outer batter posts */}
      {[-1, 1].map((side): React.JSX.Element => (
        <mesh
          key={`post-${side}`}
          position={[side * (0.17 + spread * 0.5), midY, 0]}
          rotation={[0, 0, side * lean]}
          castShadow
        >
          <boxGeometry args={[0.038, height, 0.038]} />
          <meshStandardMaterial color={TRESTLE_WOOD} roughness={0.92} />
        </mesh>
      ))}

      {/* Center plumb post */}
      <mesh position={[0, midY, 0]} castShadow>
        <boxGeometry args={[0.038, height, 0.038]} />
        <meshStandardMaterial color={TRESTLE_WOOD} roughness={0.92} />
      </mesh>

      {/* Top cap beam */}
      <mesh position={[0, topY, 0]} castShadow>
        <boxGeometry args={[0.52, 0.045, 0.07]} />
        <meshStandardMaterial color={TRESTLE_WOOD_DARK} roughness={0.92} />
      </mesh>

      {/* Horizontal girt braces */}
      {Array.from({ length: girtCount }).map((_, idx): React.JSX.Element => {
        const gy = topY - (idx + 1) * 0.32;
        const width = 0.38 + ((topY - gy) / height) * spread * 2;
        return (
          <mesh key={idx} position={[0, gy, 0]} castShadow>
            <boxGeometry args={[width, 0.026, 0.032]} />
            <meshStandardMaterial color={TRESTLE_WOOD_DARK} roughness={0.92} />
          </mesh>
        );
      })}
    </group>
  );
}
