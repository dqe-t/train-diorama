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

interface ContinuousTrackMeshes {
  readonly ballastGeo: BufferGeometry;
  readonly leftRailGeo: BufferGeometry;
  readonly rightRailGeo: BufferGeometry;
  readonly sleeperSamples: ReadonlyArray<SplineSample>;
  readonly viaductPiers: ReadonlyArray<SplineSample>;
}

function buildContinuousTrackMeshes(
  samples: ReadonlyArray<SplineSample>,
  closed: boolean
): ContinuousTrackMeshes | null {
  if (samples.length < 4) {
    return null;
  }

  // 1. Build Continuous Extruded Left & Right Steel Rails using CatmullRomCurve3 + TubeGeometry
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

  // 2. Build Continuous Contoured Gravel Ballast Ribbon Geometry
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

  // 3. Extract evenly spaced sleepers and timber trestle bents
  const sleeperSamples: SplineSample[] = [];
  const viaductPiers: SplineSample[] = [];

  for (let i = 0; i < loopCount; i += 1) {
    sleeperSamples.push(samples[i]);
    if (samples[i].isBridge && i % 2 === 0) {
      viaductPiers.push(samples[i]);
    }
  }

  return {
    ballastGeo,
    leftRailGeo,
    rightRailGeo,
    sleeperSamples,
    viaductPiers,
  };
}

const TRESTLE_WOOD = '#7a5233';
const TRESTLE_WOOD_DARK = '#5e3f27';

/** Battered timber trestle bent: splayed outer posts, a center post, cap beam and girts. */
function TrestleBent({ sample }: { readonly sample: SplineSample }): React.JSX.Element {
  const bottomY = sample.terrainY - 0.06;
  const topY = sample.y - 0.07;
  const height = Math.max(0.12, topY - bottomY);
  const midY = bottomY + height * 0.5;
  const spread = height * 0.14;
  const lean = Math.atan2(spread, height);
  const girtCount = Math.floor(height / 0.32);

  return (
    <group position={[sample.x, 0, sample.z]} rotation={[0, sample.yawRadians, 0]}>
      {[-1, 1].map((side): React.JSX.Element => (
        <mesh
          key={side}
          position={[side * (0.17 + spread * 0.5), midY, 0]}
          rotation={[0, 0, side * lean]}
          castShadow
        >
          <boxGeometry args={[0.035, height, 0.035]} />
          <meshStandardMaterial color={TRESTLE_WOOD} roughness={0.92} />
        </mesh>
      ))}
      <mesh position={[0, midY, 0]} castShadow>
        <boxGeometry args={[0.035, height, 0.035]} />
        <meshStandardMaterial color={TRESTLE_WOOD} roughness={0.92} />
      </mesh>
      <mesh position={[0, topY, 0]} castShadow>
        <boxGeometry args={[0.5, 0.04, 0.06]} />
        <meshStandardMaterial color={TRESTLE_WOOD_DARK} roughness={0.92} />
      </mesh>
      {Array.from({ length: girtCount }).map((_, idx): React.JSX.Element => {
        const gy = topY - (idx + 1) * 0.32;
        const width = 0.36 + ((topY - gy) / height) * spread * 2;
        return (
          <mesh key={idx} position={[0, gy, 0]} castShadow>
            <boxGeometry args={[width, 0.025, 0.03]} />
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
      {/* Subtle Control Node Markers when in Track Mode */}
      {world.trackPoints.map((pt, idx): React.JSX.Element => (
        <mesh key={`node-${idx}`} position={[pt.x, pt.y + 0.06, pt.z]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#f5d76e" roughness={0.5} />
        </mesh>
      ))}

      {trackData !== null && (
        <>
          {/* Continuous Gravel Ballast Bed */}
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

          {/* Tangent-Aligned Wooden Sleepers & Bridge Parapets */}
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

              {/* Timber deck stringers & walkway over trestles */}
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

          {/* Timber trestle bents spanning the dry wash */}
          {trackData.viaductPiers.map((pier, idx): React.JSX.Element => (
            <TrestleBent key={`bent-${idx}`} sample={pier} />
          ))}
        </>
      )}
    </group>
  );
}
