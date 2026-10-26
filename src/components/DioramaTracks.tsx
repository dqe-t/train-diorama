import React, { useMemo } from 'react';
import { BufferAttribute, BufferGeometry, DoubleSide } from 'three';
import { useDioramaStore } from '../store/useDioramaStore';
import { SplineSample } from '../types/diorama';
import {
  CONSTANT_SLEEPER_SPACING,
  CONSTANT_TRESTLE_SPACING,
  extractConstantDistanceFrames,
} from '../core/trackGraph';
import {
  TimberCribbingPier,
  TrestleBent,
  TRESTLE_WOOD_DARK,
} from './TrackSubstructures';

const RAIL_GAUGE = 0.24;
const BALLAST_TOP_HALF = 0.22;
const BALLAST_BOT_HALF = 0.35;

interface ContinuousTrackMeshes {
  readonly ballastGeo: BufferGeometry;
  readonly leftRailGeo: BufferGeometry;
  readonly rightRailGeo: BufferGeometry;
  readonly bridgeDeckGeo: BufferGeometry | null;
  readonly sleeperSamples: ReadonlyArray<SplineSample>;
  readonly trestleBents: ReadonlyArray<SplineSample>;
  readonly cribbingPiers: ReadonlyArray<SplineSample>;
}

function buildSweptRailTube(
  samples: ReadonlyArray<SplineSample>,
  offsetSign: 1 | -1,
  closed: boolean
): BufferGeometry {
  const segments = samples.length;
  const radialSegments = 5;
  const vertCount = segments * radialSegments;
  const positions = new Float32Array(vertCount * 3);
  const halfG = (RAIL_GAUGE * 0.5) * offsetSign;

  const angles: number[] = [];
  for (let j = 0; j < radialSegments; j += 1) {
    angles.push((j / radialSegments) * Math.PI * 2);
  }

  let ptr = 0;
  for (let i = 0; i < segments; i += 1) {
    const s = samples[i];
    const cx = s.x + s.normalX * halfG;
    const cy = s.y + 0.052;
    const cz = s.z + s.normalZ * halfG;

    for (let j = 0; j < radialSegments; j += 1) {
      const a = angles[j];
      const cosA = Math.cos(a) * 0.015;
      const sinA = Math.sin(a) * 0.018;
      positions[ptr] = cx + s.normalX * cosA;
      positions[ptr + 1] = cy + sinA;
      positions[ptr + 2] = cz + s.normalZ * cosA;
      ptr += 3;
    }
  }

  const loopCount = closed ? segments : segments - 1;
  const indices: number[] = [];
  for (let i = 0; i < loopCount; i += 1) {
    const nextI = (i + 1) % segments;
    const baseA = i * radialSegments;
    const baseB = nextI * radialSegments;
    for (let j = 0; j < radialSegments; j += 1) {
      const nextJ = (j + 1) % radialSegments;
      const a = baseA + j;
      const b = baseA + nextJ;
      const c = baseB + j;
      const d = baseB + nextJ;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildContinuousBridgeDeck(
  samples: ReadonlyArray<SplineSample>,
  closed: boolean
): BufferGeometry | null {
  const verts: number[] = [];
  const loopCount = closed ? samples.length : samples.length - 1;

  for (let i = 0; i < loopCount; i += 1) {
    const sA = samples[i];
    const sB = samples[(i + 1) % samples.length];

    if (!sA.isBridge || !sB.isBridge) {
      continue;
    }

    const lx0 = sA.x - sA.normalX * 0.25;
    const lz0 = sA.z - sA.normalZ * 0.25;
    const rx0 = sA.x + sA.normalX * 0.25;
    const rz0 = sA.z + sA.normalZ * 0.25;

    const lx1 = sB.x - sB.normalX * 0.25;
    const lz1 = sB.z - sB.normalZ * 0.25;
    const rx1 = sB.x + sB.normalX * 0.25;
    const rz1 = sB.z + sB.normalZ * 0.25;

    const dy = -0.025;
    verts.push(
      lx0, sA.y + dy, lz0,
      rx0, sA.y + dy, rz0,
      lx1, sB.y + dy, lz1,
      rx0, sA.y + dy, rz0,
      rx1, sB.y + dy, rz1,
      lx1, sB.y + dy, lz1
    );

    for (const side of [-1, 1]) {
      const oxA = sA.x + sA.normalX * (0.24 * side);
      const ozA = sA.z + sA.normalZ * (0.24 * side);
      const oxB = sB.x + sB.normalX * (0.24 * side);
      const ozB = sB.z + sB.normalZ * (0.24 * side);
      const gy0 = sA.y - 0.01;
      const gy1 = sA.y + 0.045;
      const gy0B = sB.y - 0.01;
      const gy1B = sB.y + 0.045;

      verts.push(
        oxA, gy0, ozA,
        oxA, gy1, ozA,
        oxB, gy0B, ozB,
        oxA, gy1, ozA,
        oxB, gy1B, ozB,
        oxB, gy0B, ozB
      );
    }
  }

  if (verts.length === 0) {
    return null;
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3));
  geo.computeVertexNormals();
  return geo;
}

function buildContinuousTrackMeshes(
  samples: ReadonlyArray<SplineSample>,
  closed: boolean
): ContinuousTrackMeshes | null {
  if (samples.length < 4) {
    return null;
  }

  const leftRailGeo = buildSweptRailTube(samples, -1, closed);
  const rightRailGeo = buildSweptRailTube(samples, 1, closed);
  const bridgeDeckGeo = buildContinuousBridgeDeck(samples, closed);

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
  const loopCount = closed ? samples.length : samples.length - 1;
  for (let i = 0; i < loopCount; i += 1) {
    const nextI = (i + 1) % samples.length;
    const baseA = i * ringVerts;
    const baseB = nextI * ringVerts;
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

  const sleeperSamples = extractConstantDistanceFrames(samples, closed, CONSTANT_SLEEPER_SPACING);
  const supportFrames = extractConstantDistanceFrames(samples, closed, CONSTANT_TRESTLE_SPACING);
  const trestleBents = supportFrames.filter((s): boolean => s.supportTier === 'trestle');
  const cribbingPiers = supportFrames.filter((s): boolean => s.supportTier === 'cribbing');

  return {
    ballastGeo,
    leftRailGeo,
    rightRailGeo,
    bridgeDeckGeo,
    sleeperSamples,
    trestleBents,
    cribbingPiers,
  };
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
      {world.trackPoints.map((pt, idx): React.JSX.Element => (
        <mesh key={`node-${idx}`} position={[pt.x, pt.y + 0.06, pt.z]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#f5d76e" roughness={0.5} />
        </mesh>
      ))}

      {trackData !== null && (
        <>
          <mesh geometry={trackData.ballastGeo} receiveShadow castShadow>
            <meshStandardMaterial
              color="#8c6a50"
              roughness={0.94}
              side={DoubleSide}
              envMapIntensity={0.5}
            />
          </mesh>

          <mesh geometry={trackData.leftRailGeo} castShadow>
            <meshStandardMaterial
              color="#d6dde6"
              metalness={0.92}
              roughness={0.2}
              envMapIntensity={2.0}
            />
          </mesh>
          <mesh geometry={trackData.rightRailGeo} castShadow>
            <meshStandardMaterial
              color="#d6dde6"
              metalness={0.92}
              roughness={0.2}
              envMapIntensity={2.0}
            />
          </mesh>

          {trackData.bridgeDeckGeo !== null && (
            <mesh geometry={trackData.bridgeDeckGeo} receiveShadow castShadow>
              <meshStandardMaterial
                color={TRESTLE_WOOD_DARK}
                roughness={0.92}
                envMapIntensity={0.6}
                side={DoubleSide}
              />
            </mesh>
          )}

          {trackData.sleeperSamples.map((s, idx): React.JSX.Element => (
            <group
              key={`tie-${idx}`}
              position={[s.x, s.y + 0.032, s.z]}
              rotation={[s.pitchRadians, s.yawRadians, 0]}
            >
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.42, 0.024, 0.058]} />
                <meshStandardMaterial color="#523620" roughness={0.88} envMapIntensity={0.6} />
              </mesh>
            </group>
          ))}

          {trackData.cribbingPiers.map((pier, idx): React.JSX.Element => (
            <TimberCribbingPier key={`crib-${idx}`} sample={pier} />
          ))}

          {trackData.trestleBents.map((pier, idx): React.JSX.Element => (
            <TrestleBent key={`bent-${idx}`} sample={pier} />
          ))}
        </>
      )}
    </group>
  );
}
