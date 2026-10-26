import {
  OrganicDioramaWorld,
  PlacedStructure,
  SplineSample,
  ToolType,
  Vec3Point,
} from '../types/diorama';
import {
  hashCoords,
  sampleNaturalTerrainHeight,
  TRACK_BED_OFFSET,
} from './noise';
import { isBuildableSite, scatterDesertProps } from './propScatter';
import { buildSplineSamples } from './trackGraph';

const DEFAULT_SPLINE_SAMPLES = 160;
const VALID_TOOLS: ReadonlyArray<ToolType> = ['track', 'cottage', 'station', 'trees', 'demolish'];

function validateWorld(world: OrganicDioramaWorld): void {
  if (!world || typeof world.span !== 'number') {
    throw new TypeError('CRITICAL: Valid OrganicDioramaWorld is required.');
  }
}

/**
 * Tracks conform directly to the natural landscape elevation.
 * Spline relaxation then smooths out overly steep gradients by elevating
 * tracks on substructures.
 */
function computeTrackPointY(x: number, z: number, seed: number): number {
  return sampleNaturalTerrainHeight(x, z, seed) + TRACK_BED_OFFSET;
}

function rebuildSamples(
  points: ReadonlyArray<Vec3Point>,
  closed: boolean,
  seed: number
): ReadonlyArray<SplineSample> {
  return points.length >= 2 ? buildSplineSamples(points, closed, seed, DEFAULT_SPLINE_SAMPLES) : [];
}

function buildStarterStructures(
  seed: number,
  samples: ReadonlyArray<SplineSample>
): PlacedStructure[] {
  const structures: PlacedStructure[] = [];
  if (samples.length <= 20) {
    return structures;
  }

  // Depot beside the first flat, non-bridge stretch of track
  const stationSample = samples.find((s, idx): boolean => {
    if (s.isBridge || idx < 4) return false;
    const sx = s.x + s.normalX * 0.82;
    const sz = s.z + s.normalZ * 0.82;
    return isBuildableSite(sx, sz, seed, samples);
  });
  if (stationSample) {
    const sx = stationSample.x + stationSample.normalX * 0.82;
    const sz = stationSample.z + stationSample.normalZ * 0.82;
    structures.push({
      id: 'starter-station',
      kind: 'station',
      x: sx,
      y: sampleNaturalTerrainHeight(sx, sz, seed),
      z: sz,
      rotationY: stationSample.yawRadians,
      stories: 1,
      colorVariant: 0,
    });
  }

  // A small adobe pueblo cluster in the flat central basin
  const offsets: ReadonlyArray<readonly [number, number, number]> = [
    [-1.8, -1.2, 2],
    [-0.7, -1.9, 1],
    [1.4, -1.6, 3],
    [2.1, -0.6, 1],
    [0.3, 1.4, 2],
  ];
  offsets.forEach(([cx, cz, stories], idx): void => {
    if (!isBuildableSite(cx, cz, seed, samples)) return;
    structures.push({
      id: `starter-cottage-${idx}`,
      kind: 'cottage',
      x: cx,
      y: sampleNaturalTerrainHeight(cx, cz, seed),
      z: cz,
      rotationY: idx * 0.4,
      stories,
      colorVariant: idx,
    });
  });
  return structures;
}

export function createOrganicDiorama(
  span: number,
  seed: number,
  withStarterTrack: boolean
): OrganicDioramaWorld {
  if (typeof span !== 'number' || !Number.isFinite(span) || span < 8 || span > 32) {
    throw new RangeError('CRITICAL: span must be a finite number between 8 and 32.');
  }
  if (!Number.isInteger(seed)) {
    throw new TypeError('CRITICAL: seed must be an integer.');
  }
  if (typeof withStarterTrack !== 'boolean') {
    throw new TypeError('CRITICAL: withStarterTrack must be a boolean.');
  }

  const trackPoints: Vec3Point[] = [];
  if (withStarterTrack) {
    // Wide, graceful model railroad loop with gentle curves
    const nodes = 16;
    for (let i = 0; i < nodes; i += 1) {
      const theta = (i / nodes) * Math.PI * 2;
      const r = 4.6 + Math.cos(2 * theta) * 0.45;
      const wx = Math.sin(theta) * (r + 0.35);
      const wz = Math.cos(theta) * (r - 0.35);
      trackPoints.push({ x: wx, y: computeTrackPointY(wx, wz, seed), z: wz });
    }
  }

  const splineSamples = rebuildSamples(trackPoints, withStarterTrack, seed);
  const structures = withStarterTrack ? buildStarterStructures(seed, splineSamples) : [];

  return {
    span,
    seed,
    trackPoints,
    trackClosed: withStarterTrack,
    splineSamples,
    naturalProps: scatterDesertProps(span, seed, splineSamples, structures),
    structures,
  };
}

function applyTrackTool(world: OrganicDioramaWorld, worldX: number, worldZ: number): OrganicDioramaWorld {
  const newPt: Vec3Point = { x: worldX, y: computeTrackPointY(worldX, worldZ, world.seed), z: worldZ };
  const nextPoints = [...world.trackPoints];
  let nextClosed = world.trackClosed;

  if (nextClosed) {
    if (nextPoints.some((p): boolean => Math.hypot(p.x - worldX, p.z - worldZ) < 0.85)) {
      return world;
    }
    let bestIdx = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < nextPoints.length; i += 1) {
      const a = nextPoints[i];
      const b = nextPoints[(i + 1) % nextPoints.length];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const lenSq = dx * dx + dz * dz;
      if (lenSq < 0.25) continue;
      const t = Math.max(0.15, Math.min(0.85, ((worldX - a.x) * dx + (worldZ - a.z) * dz) / lenSq));
      const projX = a.x + dx * t;
      const projZ = a.z + dz * t;
      const dist = Math.hypot(worldX - projX, worldZ - projZ);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i + 1;
      }
    }
    if (bestIdx >= 0) {
      const prev = nextPoints[(bestIdx - 1 + nextPoints.length) % nextPoints.length];
      const next = nextPoints[bestIdx % nextPoints.length];
      const v1x = newPt.x - prev.x;
      const v1z = newPt.z - prev.z;
      const v2x = next.x - newPt.x;
      const v2z = next.z - newPt.z;
      const dot = (v1x * v2x + v1z * v2z) / (Math.hypot(v1x, v1z) * Math.hypot(v2x, v2z));
      if (dot < 0.15) {
        return world; // Prevent acute hairpin kinks
      }
      nextPoints.splice(bestIdx, 0, newPt);
    }
  } else if (nextPoints.length > 0) {
    const last = nextPoints[nextPoints.length - 1];
    if (Math.hypot(last.x - worldX, last.z - worldZ) < 0.85) {
      return world;
    }
    if (nextPoints.length >= 2) {
      const prev = nextPoints[nextPoints.length - 2];
      const v1x = last.x - prev.x;
      const v1z = last.z - prev.z;
      const v2x = newPt.x - last.x;
      const v2z = newPt.z - last.z;
      const dot = (v1x * v2x + v1z * v2z) / (Math.hypot(v1x, v1z) * Math.hypot(v2x, v2z));
      if (dot < -0.2) {
        return world; // Prevent sharp backwards turn
      }
    }
    const first = nextPoints[0];
    if (nextPoints.length >= 4 && Math.hypot(first.x - worldX, first.z - worldZ) < 1.35) {
      nextClosed = true; // auto-close loop near start
    } else {
      nextPoints.push(newPt);
    }
  } else {
    nextPoints.push(newPt);
  }

  const nextSamples = rebuildSamples(nextPoints, nextClosed, world.seed);
  return {
    ...world,
    trackPoints: nextPoints,
    trackClosed: nextClosed,
    splineSamples: nextSamples,
    naturalProps: scatterDesertProps(world.span, world.seed, nextSamples, world.structures),
  };
}

function applyDemolishTool(
  world: OrganicDioramaWorld,
  worldX: number,
  worldZ: number
): OrganicDioramaWorld {
  const structures = world.structures.filter(
    (st): boolean => Math.hypot(st.x - worldX, st.z - worldZ) > 0.9
  );
  const points = world.trackPoints.filter(
    (p): boolean => Math.hypot(p.x - worldX, p.z - worldZ) > 1.25
  );
  const closed = points.length >= 3 ? world.trackClosed : false;
  const samples = rebuildSamples(points, closed, world.seed);
  return {
    ...world,
    trackPoints: points,
    trackClosed: closed,
    splineSamples: samples,
    structures,
    naturalProps: scatterDesertProps(world.span, world.seed, samples, structures),
  };
}

function applyBuildingTool(
  world: OrganicDioramaWorld,
  worldX: number,
  worldZ: number,
  tool: ToolType
): OrganicDioramaWorld {
  // Clicking an existing adobe with the adobe tool stacks another story
  if (tool === 'cottage') {
    const existingIdx = world.structures.findIndex(
      (st): boolean => st.kind === 'cottage' && Math.hypot(st.x - worldX, st.z - worldZ) < 0.65
    );
    if (existingIdx >= 0) {
      const updated = [...world.structures];
      const target = updated[existingIdx];
      updated[existingIdx] = { ...target, stories: Math.min(3, target.stories + 1) };
      return { ...world, structures: updated };
    }
  }

  if (!isBuildableSite(worldX, worldZ, world.seed, world.splineSamples)) {
    return world;
  }

  // Depots align to the nearest track tangent; everything else gets an organic rotation
  let rotationY = hashCoords(worldX * 10, worldZ * 10, world.seed) * Math.PI * 2;
  if (tool === 'station' && world.splineSamples.length > 0) {
    let minDist = Number.POSITIVE_INFINITY;
    for (const s of world.splineSamples) {
      const d = Math.hypot(s.x - worldX, s.z - worldZ);
      if (d < minDist) {
        minDist = d;
        rotationY = s.yawRadians;
      }
    }
  }

  const newStruct: PlacedStructure = {
    id: `struct-${Date.now()}-${Math.round(worldX * 100)}-${Math.round(worldZ * 100)}`,
    kind: tool === 'cottage' ? 'cottage' : tool === 'station' ? 'station' : 'planted_trees',
    x: worldX,
    y: sampleNaturalTerrainHeight(worldX, worldZ, world.seed),
    z: worldZ,
    rotationY,
    stories: 1,
    colorVariant: Math.floor(hashCoords(worldX * 17, worldZ * 23, world.seed) * 4),
  };

  const structures = [...world.structures, newStruct];
  return {
    ...world,
    structures,
    naturalProps: scatterDesertProps(world.span, world.seed, world.splineSamples, structures),
  };
}

export function applyWorldSpaceTool(
  world: OrganicDioramaWorld,
  worldX: number,
  worldZ: number,
  tool: ToolType
): OrganicDioramaWorld {
  validateWorld(world);
  if (!Number.isFinite(worldX) || !Number.isFinite(worldZ)) {
    throw new TypeError('CRITICAL: worldX and worldZ must be finite numbers.');
  }
  const half = world.span * 0.5;
  if (Math.abs(worldX) > half || Math.abs(worldZ) > half) {
    throw new RangeError('CRITICAL: Target coordinates are outside the diorama bounds.');
  }
  if (!VALID_TOOLS.includes(tool)) {
    throw new TypeError(`CRITICAL: Invalid tool "${String(tool)}".`);
  }

  if (tool === 'track') return applyTrackTool(world, worldX, worldZ);
  if (tool === 'demolish') return applyDemolishTool(world, worldX, worldZ);
  return applyBuildingTool(world, worldX, worldZ, tool);
}

export function clearAllTracks(world: OrganicDioramaWorld): OrganicDioramaWorld {
  validateWorld(world);
  return {
    ...world,
    trackPoints: [],
    trackClosed: false,
    splineSamples: [],
    naturalProps: scatterDesertProps(world.span, world.seed, [], world.structures),
  };
}
