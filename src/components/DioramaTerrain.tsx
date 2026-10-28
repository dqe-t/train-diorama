import React, { useEffect, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Line, RoundedBox } from '@react-three/drei';
import {
  BufferAttribute, BufferGeometry, ClampToEdgeWrapping, Color, DataTexture,
  DoubleSide, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping,
  RGBAFormat, SRGBColorSpace, Vector2,
} from 'three';
import {
  computeCavityOcclusion, computeTerrainVertexColor, STRATA_BOTTOM_Y, STRATA_TOP_Y,
} from '../core/desertPalette';
import { sampleWashFactor, valueNoise2D } from '../core/noise';
import { sampleCompositeTerrainHeight } from '../core/terrainSculpt';
import { generateSandNormalPixels, generateStrataPixels } from '../core/textureSynthesis';
import { useDioramaStore } from '../store/useDioramaStore';
import { MesaStamp, RampSegment, SculptStamp } from '../types/diorama';
import { DesertPropItem } from './DesertFlora';

const MESH_SEGMENTS = 192;
const RIPPLE_REPEAT = 6;
const RIPPLE_TEXTURE_SIZE = 256;
/** Neighborhood radius (in grid cells) used for baked cavity occlusion. */
const AO_RADIUS = 4;
const AO_STRENGTH = 0.38;

interface TerrainGeometries {
  readonly surfaceGeo: BufferGeometry;
  readonly skirtGeo: BufferGeometry;
}

function buildSculptedTerrainGeometry(
  span: number,
  seed: number,
  sculptStamps: ReadonlyArray<SculptStamp>,
  mesaStamps: ReadonlyArray<MesaStamp>,
  rampSegments: ReadonlyArray<RampSegment>
): TerrainGeometries {
  const half = span * 0.5;
  const step = span / MESH_SEGMENTS;
  const vertsPerRow = MESH_SEGMENTS + 1;
  const last = MESH_SEGMENTS;

  const heights: number[][] = [];
  for (let iz = 0; iz <= MESH_SEGMENTS; iz += 1) {
    const row: number[] = [];
    for (let ix = 0; ix <= MESH_SEGMENTS; ix += 1) {
      row.push(
        sampleCompositeTerrainHeight(
          -half + ix * step,
          -half + iz * step,
          seed,
          sculptStamps,
          mesaStamps,
          rampSegments
        )
      );
    }
    heights.push(row);
  }
  const hAt = (ix: number, iz: number): number =>
    heights[Math.max(0, Math.min(last, iz))][Math.max(0, Math.min(last, ix))];

  const vertCount = vertsPerRow * vertsPerRow;
  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const linear = new Color();
  const r = AO_RADIUS;

  for (let iz = 0; iz <= MESH_SEGMENTS; iz += 1) {
    const wz = -half + iz * step;
    for (let ix = 0; ix <= MESH_SEGMENTS; ix += 1) {
      const wx = -half + ix * step;
      const h = heights[iz][ix];
      const slope = Math.hypot(
        (hAt(ix + 1, iz) - hAt(ix - 1, iz)) / (2 * step),
        (hAt(ix, iz + 1) - hAt(ix, iz - 1)) / (2 * step)
      );

      const [cr, cg, cb] = computeTerrainVertexColor({
        height: h,
        slope,
        grain: valueNoise2D(wx * 1.2, wz * 1.2, seed + 77),
        streak: valueNoise2D(wx * 2, wz * 2, seed + 13),
        washFactor: sampleWashFactor(wx, wz, seed),
      });

      const neighborhood =
        (hAt(ix - r, iz) + hAt(ix + r, iz) + hAt(ix, iz - r) + hAt(ix, iz + r) +
          hAt(ix - r, iz - r) + hAt(ix + r, iz + r) + hAt(ix - r, iz + r) + hAt(ix + r, iz - r)) * 0.125;
      const ao = computeCavityOcclusion(h, neighborhood, AO_STRENGTH);
      linear.setRGB(cr * ao, cg * ao, cb * ao, SRGBColorSpace);

      const vi = iz * vertsPerRow + ix;
      positions.set([wx, h, wz], vi * 3);
      colors.set([linear.r, linear.g, linear.b], vi * 3);
      uvs.set([((wx + half) / span) * RIPPLE_REPEAT, ((wz + half) / span) * RIPPLE_REPEAT], vi * 2);
    }
  }

  const indices: number[] = [];
  for (let iz = 0; iz < MESH_SEGMENTS; iz += 1) {
    for (let ix = 0; ix < MESH_SEGMENTS; ix += 1) {
      const a = iz * vertsPerRow + ix;
      const b = a + 1;
      const c = a + vertsPerRow;
      indices.push(a, c, b, b, c, c + 1);
    }
  }

  const surfaceGeo = new BufferGeometry();
  surfaceGeo.setAttribute('position', new BufferAttribute(positions, 3));
  surfaceGeo.setAttribute('color', new BufferAttribute(colors, 3));
  surfaceGeo.setAttribute('uv', new BufferAttribute(uvs, 2));
  surfaceGeo.setIndex(indices);
  surfaceGeo.computeVertexNormals();

  const skirtPos: number[] = [];
  const skirtUv: number[] = [];
  const strataRange = STRATA_TOP_Y - STRATA_BOTTOM_Y;
  const vOf = (y: number): number => (y - STRATA_BOTTOM_Y) / strataRange;

  const addQuad = (
    x0: number, y0: number, z0: number, u0: number,
    x1: number, y1: number, z1: number, u1: number
  ): void => {
    const b = STRATA_BOTTOM_Y;
    skirtPos.push(x0, y0, z0, x0, b, z0, x1, y1, z1, x1, y1, z1, x0, b, z0, x1, b, z1);
    skirtUv.push(u0, vOf(y0), u0, 0, u1, vOf(y1), u1, vOf(y1), u0, 0, u1, 0);
  };

  for (let i = 0; i < MESH_SEGMENTS; i += 1) {
    const t0 = -half + i * step;
    const t1 = t0 + step;
    const u0 = ((t0 + half) / span) * 4;
    const u1 = ((t1 + half) / span) * 4;
    addQuad(t0, heights[last][i], half, u0, t1, heights[last][i + 1], half, u1);
    addQuad(t1, heights[0][i + 1], -half, u1, t0, heights[0][i], -half, u0);
    addQuad(half, heights[i + 1][last], t1, u1, half, heights[i][last], t0, u0);
    addQuad(-half, heights[i][0], t0, u0, -half, heights[i + 1][0], t1, u1);
  }

  const skirtGeo = new BufferGeometry();
  skirtGeo.setAttribute('position', new BufferAttribute(new Float32Array(skirtPos), 3));
  skirtGeo.setAttribute('uv', new BufferAttribute(new Float32Array(skirtUv), 2));
  skirtGeo.computeVertexNormals();

  return { surfaceGeo, skirtGeo };
}

function createStrataTexture(seed: number): DataTexture {
  const tex = new DataTexture(generateStrataPixels(64, 256, seed), 64, 256, RGBAFormat);
  tex.wrapS = RepeatWrapping; tex.wrapT = ClampToEdgeWrapping;
  tex.magFilter = LinearFilter; tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.colorSpace = SRGBColorSpace; tex.needsUpdate = true;
  return tex;
}

function createRippleNormalTexture(seed: number): DataTexture {
  const s = RIPPLE_TEXTURE_SIZE;
  const tex = new DataTexture(generateSandNormalPixels(s, seed, 3.0), s, s, RGBAFormat);
  tex.wrapS = RepeatWrapping; tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter; tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.anisotropy = 4; tex.needsUpdate = true;
  return tex;
}

export function DioramaTerrain(): React.JSX.Element {
  const world = useDioramaStore((s): typeof s.world => s.world);
  const activeTool = useDioramaStore((s): typeof s.activeTool => s.activeTool);
  const isPointerDragging = useDioramaStore((s): boolean => s.isPointerDragging);
  const hoverPoint = useDioramaStore((s): typeof s.hoverPoint => s.hoverPoint);
  const rampStartPoint = useDioramaStore((s): typeof s.rampStartPoint => s.rampStartPoint);
  const setHoverPoint = useDioramaStore((s): typeof s.setHoverPoint => s.setHoverPoint);
  const setPointerDragging = useDioramaStore((s): typeof s.setPointerDragging => s.setPointerDragging);
  const setRampStartPoint = useDioramaStore((s): typeof s.setRampStartPoint => s.setRampStartPoint);
  const interactAtWorldPoint = useDioramaStore((s): typeof s.interactAtWorldPoint => s.interactAtWorldPoint);
  const sculptGroundAtPoint = useDioramaStore((s): typeof s.sculptGroundAtPoint => s.sculptGroundAtPoint);
  const stampMesaAtPoint = useDioramaStore((s): typeof s.stampMesaAtPoint => s.stampMesaAtPoint);
  const createRampSegment = useDioramaStore((s): typeof s.createRampSegment => s.createRampSegment);

  const geometries = useMemo(
    (): TerrainGeometries =>
      buildSculptedTerrainGeometry(
        world.span,
        world.seed,
        world.sculptStamps,
        world.mesaStamps,
        world.rampSegments
      ),
    [world.span, world.seed, world.sculptStamps, world.mesaStamps, world.rampSegments]
  );
  const rippleTexture = useMemo(
    (): DataTexture => createRippleNormalTexture(world.seed),
    [world.seed]
  );
  const strataTexture = useMemo((): DataTexture => createStrataTexture(world.seed), [world.seed]);
  const normalScale = useMemo((): Vector2 => new Vector2(0.55, 0.55), []);

  useEffect(
    (): (() => void) => (): void => {
      geometries.surfaceGeo.dispose();
      geometries.skirtGeo.dispose();
    },
    [geometries]
  );
  useEffect((): (() => void) => (): void => rippleTexture.dispose(), [rippleTexture]);
  useEffect((): (() => void) => (): void => strataTexture.dispose(), [strataTexture]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>): void => {
    e.stopPropagation();
    if (activeTool === 'sculpt') {
      if (e.button === 0) {
        sculptGroundAtPoint(e.point.x, e.point.z, 'lift');
      } else if (e.button === 2) {
        sculptGroundAtPoint(e.point.x, e.point.z, 'lower');
      }
      return;
    }
    if (activeTool === 'mesa') {
      if (e.button === 0) {
        stampMesaAtPoint(e.point.x, e.point.z, false);
      } else if (e.button === 2) {
        stampMesaAtPoint(e.point.x, e.point.z, true);
      }
      return;
    }
    if (activeTool === 'ramp') {
      if (e.button === 0) {
        setRampStartPoint({ x: e.point.x, y: e.point.y, z: e.point.z });
        setPointerDragging(true);
      }
      return;
    }
    if (e.button !== 0) {
      return;
    }
    setPointerDragging(true);
    interactAtWorldPoint(e.point.x, e.point.z);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>): void => {
    e.stopPropagation();
    if (activeTool === 'ramp' && rampStartPoint) {
      const dist = Math.hypot(e.point.x - rampStartPoint.x, e.point.z - rampStartPoint.z);
      if (dist >= 0.75) {
        createRampSegment(
          rampStartPoint.x,
          rampStartPoint.z,
          rampStartPoint.y,
          e.point.x,
          e.point.z,
          e.point.y
        );
      }
      setRampStartPoint(null);
    }
    setPointerDragging(false);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>): void => {
    e.stopPropagation();
    setHoverPoint({ x: e.point.x, y: e.point.y, z: e.point.z });
    if (
      isPointerDragging &&
      (activeTool === 'track' || activeTool === 'trees' || activeTool === 'demolish')
    ) {
      interactAtWorldPoint(e.point.x, e.point.z);
    }
  };

  return (
    <group
      onPointerUp={handlePointerUp}
      onPointerLeave={(): void => {
        setHoverPoint(null);
        setRampStartPoint(null);
        setPointerDragging(false);
      }}
    >
      {/* Layered clay base: a soft terracotta slab on top of a dark rounded display plinth */}
      <RoundedBox
        args={[world.span + 0.3, 0.16, world.span + 0.3]}
        radius={0.07}
        smoothness={4}
        position={[0, STRATA_BOTTOM_Y - 0.08, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#ba5427" roughness={0.92} envMapIntensity={0.4} />
      </RoundedBox>
      <RoundedBox
        args={[world.span + 0.6, 0.22, world.span + 0.6]}
        radius={0.09}
        smoothness={4}
        position={[0, STRATA_BOTTOM_Y - 0.27, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#2a2522" roughness={0.75} envMapIntensity={0.5} />
      </RoundedBox>

      {/* Soft clay strata cutaway sides */}
      <mesh geometry={geometries.skirtGeo} receiveShadow castShadow>
        <meshStandardMaterial
          map={strataTexture}
          roughness={0.95}
          envMapIntensity={0.45}
          side={DoubleSide}
        />
      </mesh>

      {/* Sculpted clay desert surface with gentle dune ripples */}
      <mesh
        geometry={geometries.surfaceGeo}
        receiveShadow
        castShadow
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <meshStandardMaterial
          vertexColors
          normalMap={rippleTexture}
          normalScale={normalScale}
          roughness={0.93}
          metalness={0}
          envMapIntensity={0.45}
        />
      </mesh>

      {activeTool === 'ramp' && rampStartPoint && isPointerDragging && hoverPoint && (
        <Line
          points={[
            [rampStartPoint.x, rampStartPoint.y + 0.06, rampStartPoint.z],
            [hoverPoint.x, hoverPoint.y + 0.06, hoverPoint.z],
          ]}
          color="#ffd257"
          lineWidth={4}
        />
      )}

      {world.naturalProps.map((prop): React.JSX.Element => (
        <DesertPropItem key={prop.id} prop={prop} />
      ))}
    </group>
  );
}
