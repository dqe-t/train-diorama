import React, { useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, DoubleSide } from 'three';
import {
  computeTerrainVertexColor,
  hashCoords,
  sampleTerraformedHeight,
  WATER_LEVEL_Y,
} from '../core/noise';
import { useDioramaStore } from '../store/useDioramaStore';
import { NaturalProp, SplineSample } from '../types/diorama';

const MESH_SEGMENTS = 84;
const SKIRT_BOTTOM_Y = -0.55;

function buildSculptedTerrainGeometry(
  span: number,
  seed: number,
  splineSamples: ReadonlyArray<SplineSample>
): { readonly surfaceGeo: BufferGeometry; readonly skirtGeo: BufferGeometry } {
  const half = span * 0.5;
  const vertsPerRow = MESH_SEGMENTS + 1;
  const heights: number[][] = [];

  for (let iz = 0; iz <= MESH_SEGMENTS; iz += 1) {
    const row: number[] = [];
    const wz = -half + (iz / MESH_SEGMENTS) * span;
    for (let ix = 0; ix <= MESH_SEGMENTS; ix += 1) {
      const wx = -half + (ix / MESH_SEGMENTS) * span;
      row.push(sampleTerraformedHeight(wx, wz, seed, splineSamples));
    }
    heights.push(row);
  }

  const positions = new Float32Array(vertsPerRow * vertsPerRow * 3);
  const colors = new Float32Array(vertsPerRow * vertsPerRow * 3);
  const step = span / MESH_SEGMENTS;

  let ptr = 0;
  for (let iz = 0; iz <= MESH_SEGMENTS; iz += 1) {
    const wz = -half + iz * step;
    for (let ix = 0; ix <= MESH_SEGMENTS; ix += 1) {
      const wx = -half + ix * step;
      const h = heights[iz][ix];

      const hL = heights[iz][Math.max(0, ix - 1)];
      const hR = heights[iz][Math.min(MESH_SEGMENTS, ix + 1)];
      const hD = heights[Math.max(0, iz - 1)][ix];
      const hU = heights[Math.min(MESH_SEGMENTS, iz + 1)][ix];
      const slope = Math.hypot((hR - hL) / (2 * step), (hU - hD) / (2 * step));

      const variation = hashCoords(ix, iz, seed + 77);
      const [r, g, b] = computeTerrainVertexColor(h, slope, variation);

      positions[ptr] = wx;
      positions[ptr + 1] = h;
      positions[ptr + 2] = wz;

      colors[ptr] = r;
      colors[ptr + 1] = g;
      colors[ptr + 2] = b;
      ptr += 3;
    }
  }

  const indices: number[] = [];
  for (let iz = 0; iz < MESH_SEGMENTS; iz += 1) {
    for (let ix = 0; ix < MESH_SEGMENTS; ix += 1) {
      const a = iz * vertsPerRow + ix;
      const b = a + 1;
      const c = (iz + 1) * vertsPerRow + ix;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const surfaceGeo = new BufferGeometry();
  surfaceGeo.setAttribute('position', new BufferAttribute(positions, 3));
  surfaceGeo.setAttribute('color', new BufferAttribute(colors, 3));
  surfaceGeo.setIndex(indices);
  surfaceGeo.computeVertexNormals();

  // Build Contoured Diorama Cross-Section Skirt Walls around all 4 edges
  const skirtVerts: number[] = [];
  const addQuad = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number
  ): void => {
    skirtVerts.push(
      x0, y0, z0,
      x0, SKIRT_BOTTOM_Y, z0,
      x1, y1, z1,
      x1, y1, z1,
      x0, SKIRT_BOTTOM_Y, z0,
      x1, SKIRT_BOTTOM_Y, z1
    );
  };

  for (let i = 0; i < MESH_SEGMENTS; i += 1) {
    const t0 = -half + i * step;
    const t1 = -half + (i + 1) * step;
    // South edge (+Z)
    addQuad(t0, heights[MESH_SEGMENTS][i], half, t1, heights[MESH_SEGMENTS][i + 1], half);
    // North edge (-Z)
    addQuad(t1, heights[0][i + 1], -half, t0, heights[0][i], -half);
    // East edge (+X)
    addQuad(half, heights[i + 1][MESH_SEGMENTS], t1, half, heights[i][MESH_SEGMENTS], t0);
    // West edge (-X)
    addQuad(-half, heights[i][0], t0, -half, heights[i + 1][0], t1);
  }

  const skirtGeo = new BufferGeometry();
  skirtGeo.setAttribute('position', new BufferAttribute(new Float32Array(skirtVerts), 3));
  skirtGeo.computeVertexNormals();

  return { surfaceGeo, skirtGeo };
}

function OrganicFloraItem({ prop }: { readonly prop: NaturalProp }): React.JSX.Element {
  const s = prop.scale;
  if (prop.kind === 'pine') {
    return (
      <group
        position={[prop.x, prop.y, prop.z]}
        rotation={[0, prop.rotationY, 0]}
        scale={[s, s, s]}
      >
        <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.04, 0.055, 0.24, 6]} />
          <meshStandardMaterial color="#69482e" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.25, 0.42, 7]} />
          <meshStandardMaterial color="#356b3e" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.56, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.19, 0.36, 7]} />
          <meshStandardMaterial color="#427d4b" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.12, 0.26, 7]} />
          <meshStandardMaterial color="#508f59" roughness={0.85} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === 'puff_tree' || prop.kind === 'autumn_tree') {
    const crownColor =
      prop.kind === 'autumn_tree'
        ? prop.colorVariant % 2 === 0
          ? '#df7a3e'
          : '#e8a844'
        : prop.colorVariant % 2 === 0
          ? '#65b054'
          : '#78bf64';

    return (
      <group
        position={[prop.x, prop.y, prop.z]}
        rotation={[0, prop.rotationY, 0]}
        scale={[s, s, s]}
      >
        <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.04, 0.06, 0.28, 6]} />
          <meshStandardMaterial color="#704c32" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.24, 1]} />
          <meshStandardMaterial color={crownColor} roughness={0.82} />
        </mesh>
        <mesh position={[0.12, 0.32, 0.08]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.16, 1]} />
          <meshStandardMaterial color={crownColor} roughness={0.82} />
        </mesh>
        <mesh position={[-0.1, 0.3, -0.09]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.15, 1]} />
          <meshStandardMaterial color={crownColor} roughness={0.82} />
        </mesh>
      </group>
    );
  }

  if (prop.kind === 'bush') {
    return (
      <group
        position={[prop.x, prop.y, prop.z]}
        rotation={[0, prop.rotationY, 0]}
        scale={[s, s, s]}
      >
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.13, 1]} />
          <meshStandardMaterial color="#5ea34e" roughness={0.85} />
        </mesh>
        <mesh position={[0.09, 0.06, 0.05]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.09, 1]} />
          <meshStandardMaterial color="#72b860" roughness={0.85} />
        </mesh>
      </group>
    );
  }

  return (
    <group
      position={[prop.x, prop.y, prop.z]}
      rotation={[0.2, prop.rotationY, 0.1]}
      scale={[s, s, s]}
    >
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color="#878a84" roughness={0.92} />
      </mesh>
      <mesh position={[0.14, 0.05, 0.08]} rotation={[0.4, 0.8, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.11, 0]} />
        <meshStandardMaterial color="#757872" roughness={0.92} />
      </mesh>
    </group>
  );
}

export function DioramaTerrain(): React.JSX.Element {
  const world = useDioramaStore((s): typeof s.world => s.world);
  const activeTool = useDioramaStore((s): typeof s.activeTool => s.activeTool);
  const isPointerDragging = useDioramaStore((s): boolean => s.isPointerDragging);
  const setHoverPoint = useDioramaStore((s): typeof s.setHoverPoint => s.setHoverPoint);
  const setPointerDragging = useDioramaStore(
    (s): typeof s.setPointerDragging => s.setPointerDragging
  );
  const interactAtWorldPoint = useDioramaStore(
    (s): typeof s.interactAtWorldPoint => s.interactAtWorldPoint
  );

  const { surfaceGeo, skirtGeo } = useMemo(
    (): { readonly surfaceGeo: BufferGeometry; readonly skirtGeo: BufferGeometry } =>
      buildSculptedTerrainGeometry(world.span, world.seed, world.splineSamples),
    [world.span, world.seed, world.splineSamples]
  );

  const handlePointerDown = (e: ThreeEvent<PointerEvent>): void => {
    e.stopPropagation();
    if (e.button !== 0) {
      return;
    }
    setPointerDragging(true);
    interactAtWorldPoint(e.point.x, e.point.z);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>): void => {
    e.stopPropagation();
    setHoverPoint({ x: e.point.x, y: e.point.y, z: e.point.z });
    if (isPointerDragging && (activeTool === 'track' || activeTool === 'trees' || activeTool === 'demolish')) {
      interactAtWorldPoint(e.point.x, e.point.z);
    }
  };

  return (
    <group
      onPointerUp={(): void => setPointerDragging(false)}
      onPointerLeave={(): void => {
        setHoverPoint(null);
        setPointerDragging(false);
      }}
    >
      {/* Carved Museum Walnut Tabletop Plinth */}
      <mesh position={[0, -0.72, 0]} receiveShadow castShadow>
        <boxGeometry args={[world.span + 0.65, 0.34, world.span + 0.65]} />
        <meshStandardMaterial color="#4e3422" roughness={0.72} />
      </mesh>

      {/* Contoured Earth Strata Cutaway Skirt */}
      <mesh geometry={skirtGeo} receiveShadow castShadow>
        <meshStandardMaterial color="#87664b" roughness={0.92} side={DoubleSide} />
      </mesh>

      {/* Continuous Sculpted 3D Landscape Surface */}
      <mesh
        geometry={surfaceGeo}
        receiveShadow
        castShadow
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <meshStandardMaterial vertexColors roughness={0.86} flatShading />
      </mesh>

      {/* Translucent River & Lake Water Volume */}
      <mesh
        position={[0, (WATER_LEVEL_Y + SKIRT_BOTTOM_Y) * 0.5, 0]}
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <boxGeometry
          args={[world.span - 0.04, WATER_LEVEL_Y - SKIRT_BOTTOM_Y, world.span - 0.04]}
        />
        <meshStandardMaterial
          color="#46bac2"
          transparent
          opacity={0.76}
          roughness={0.16}
          metalness={0.1}
        />
      </mesh>

      {/* Scattered Organic Trees, Bushes & Boulders */}
      {world.naturalProps.map((prop): React.JSX.Element => (
        <OrganicFloraItem key={prop.id} prop={prop} />
      ))}
    </group>
  );
}
