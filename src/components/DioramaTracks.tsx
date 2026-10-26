import React, { useMemo } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  TubeGeometry,
  Vector3,
} from 'three';
import { useDioramaStore } from '../store/useDioramaStore';
import { SplineSample } from '../types/diorama';

const RAIL_GAUGE = 0.24;
const BALLAST_TOP_HALF = 0.23;
const BALLAST_BOT_HALF = 0.36;
const TRESTLE_WOOD = '#7a5233';
const TRESTLE_WOOD_DARK = '#5b3a26';
const STONE_FOOTING = '#7d6b5b';

interface ContinuousTrackMeshes {
  readonly ballastGeo: BufferGeometry;
  readonly leftRailGeo: BufferGeometry;
  readonly rightRailGeo: BufferGeometry;
  readonly sleeperSamples: ReadonlyArray<SplineSample>;
  readonly trestleBents: ReadonlyArray<SplineSample>;
  readonly cribbingPiers: ReadonlyArray<SplineSample>;
}

function buildContinuousTrackMeshes(
  samples: ReadonlyArray<SplineSample>,
  closed: boolean
): ContinuousTrackMeshes | null {
  if (samples.length < 4) {
    return null;
  }

  // 1. Continuous Extruded Left & Right Steel Rails
  const leftPts: Vector3[] = [];
  const rightPts: Vector3[] = [];
  const loopCount = closed ? samples.length - 1 : samples.length;

  for (let i = 0; i < loopCount; i += 1) {
    const s = samples[i];
    const halfG = RAIL_GAUGE * 0.5;
    leftPts.push(new Vector3(s.x - s.normalX * halfG, s.y + 0.052, s.z - s.normalZ * halfG));
    rightPts.push(new Vector3(s.x + s.normalX * halfG, s.y + 0.052, s.z + s.normalZ * halfG));
  }

  const leftCurve = new CatmullRomCurve3(leftPts, closed, 'centripetal');
  const rightCurve = new CatmullRomCurve3(rightPts, closed, 'centripetal');
  const tubularSegments = samples.length * 2;
  const leftRailGeo = new TubeGeometry(leftCurve, tubularSegments, 0.018, 6, closed);
  const rightRailGeo = new TubeGeometry(rightCurve, tubularSegments, 0.018, 6, closed);

  // 2. Continuous Contoured Gravel Ballast Ribbon
  const ringVerts = 4;
  const positions = new Float32Array(samples.length * ringVerts * 3);
  let ptr = 0;

  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    const prof: ReadonlyArray<readonly [number, number]> = [
      [-BALLAST_BOT_HALF, -0.025],
      [-BALLAST_TOP_HALF, 0.025],
      [BALLAST_TOP_HALF, 0.025],
      [BALLAST_BOT_HALF, -0.025],
    ];
    for (const [lat, vert] of prof) {
      positions[ptr] = s.x + s.normalX * lat;
      positions[ptr + 1] = s.y + vert;
      positions[ptr + 2] = s.z + s.normalZ * lat;
      ptr += 3;
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < samples.length - 1; i += 1) {
    const baseA = i * ringVerts;
    const baseB = (i + 1) * ringVerts;
    for (let k = 0; k < ringVerts - 1; k += 1) {
      const a = baseA + k;
      const b = baseA + k + 1;
      const c = baseB + k;
      const d = baseB + k + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const ballastGeo = new BufferGeometry();
  ballastGeo.setAttribute('position', new BufferAttribute(positions, 3));
  ballastGeo.setIndex(indices);
  ballastGeo.computeVertexNormals();

  // 3. Classify sleepers, low-fill timber cribbing, and high-span trestle bents
  const sleeperSamples: SplineSample[] = [];
  const trestleBents: SplineSample[] = [];
  const cribbingPiers: SplineSample[] = [];

  for (let i = 0; i < loopCount; i += 1) {
    const s = samples[i];
    sleeperSamples.push(s);
    if (i % 2 === 0) {
      if (s.supportTier === 'trestle') {
        trestleBents.push(s);
      } else if (s.supportTier === 'cribbing') {
        cribbingPiers.push(s);
      }
    }
  }

  return {
    ballastGeo,
    leftRailGeo,
    rightRailGeo,
    sleeperSamples,
    trestleBents,
    cribbingPiers,
  };
}

/** Low-to-moderate fill: stacked timber cribbing retaining wall supporting the track grade. */
function TimberCribbingPier({ sample }: { readonly sample: SplineSample }): React.JSX.Element {
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
function TrestleBent({ sample }: { readonly sample: SplineSample }): React.JSX.Element {
  const bottomY = sample.terrainY - 0.02;
  const topY = sample.y - 0.07;
  const height = Math.max(0.14, topY - bottomY);
  const midY = bottomY + height * 0.5;
  const spread = height * 0.16;
  const lean = Math.atan2(spread, height);
  const girtCount = Math.floor(height / 0.3);

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
        const gy = topY - (idx + 1) * 0.3;
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

export function DioramaTracks(): React.JSX.Element | null {
  const world = useDioramaStore((s): typeof s.world => s.world);

  const trackData = useMemo(
    (): ContinuousTrackMeshes | null =>
      buildContinuousTrackMeshes(world.splineSamples, world.trackClosed),
    [world.splineSamples, world.trackClosed]
  );

  return (
    <group>
      {/* Control node markers when editing */}
      {world.trackPoints.map((pt, idx): React.JSX.Element => (
        <mesh key={`node-${idx}`} position={[pt.x, pt.y + 0.06, pt.z]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#f5d76e" roughness={0.5} />
        </mesh>
      ))}

      {trackData !== null && (
        <>
          {/* Continuous Gravel Ballast Bed conforming to 3D track path */}
          <mesh geometry={trackData.ballastGeo} receiveShadow castShadow>
            <meshStandardMaterial color="#a3826a" roughness={0.95} side={DoubleSide} />
          </mesh>

          {/* Continuous Extruded Steel Rails */}
          <mesh geometry={trackData.leftRailGeo} castShadow>
            <meshStandardMaterial color="#555d66" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh geometry={trackData.rightRailGeo} castShadow>
            <meshStandardMaterial color="#555d66" metalness={0.6} roughness={0.35} />
          </mesh>

          {/* Tangent-aligned wooden ties & bridge guardrails */}
          {trackData.sleeperSamples.map((s, idx): React.JSX.Element => (
            <group
              key={`tie-${idx}`}
              position={[s.x, s.y + 0.032, s.z]}
              rotation={[s.pitchRadians, s.yawRadians, 0]}
            >
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.42, 0.024, 0.058]} />
                <meshStandardMaterial color="#66442b" roughness={0.9} />
              </mesh>

              {/* Timber deck walkway & guardrails over elevated spans */}
              {s.isBridge && (
                <>
                  <mesh position={[0, -0.035, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.5, 0.04, 0.2]} />
                    <meshStandardMaterial color={TRESTLE_WOOD_DARK} roughness={0.92} />
                  </mesh>
                  <mesh position={[-0.24, 0.0, 0]} castShadow>
                    <boxGeometry args={[0.03, 0.05, 0.22]} />
                    <meshStandardMaterial color={TRESTLE_WOOD} roughness={0.9} />
                  </mesh>
                  <mesh position={[0.24, 0.0, 0]} castShadow>
                    <boxGeometry args={[0.03, 0.05, 0.22]} />
                    <meshStandardMaterial color={TRESTLE_WOOD} roughness={0.9} />
                  </mesh>
                </>
              )}
            </group>
          ))}

          {/* Substructures for moderate fills: stacked timber cribbing piers */}
          {trackData.cribbingPiers.map((pier, idx): React.JSX.Element => (
            <TimberCribbingPier key={`crib-${idx}`} sample={pier} />
          ))}

          {/* Substructures for high spans & wash crossings: timber trestle bents */}
          {trackData.trestleBents.map((pier, idx): React.JSX.Element => (
            <TrestleBent key={`bent-${idx}`} sample={pier} />
          ))}
        </>
      )}
    </group>
  );
}
