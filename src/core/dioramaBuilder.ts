import {
  NaturalProp,
  OrganicDioramaWorld,
  PlacedStructure,
  PropKind,
  SplineSample,
  ToolType,
  Vec3Point,
} from '../types/diorama';
import {
  hashCoords,
  MIN_TRACK_Y,
  sampleNaturalTerrainHeight,
  sampleTerraformedHeight,
  WATER_LEVEL_Y,
} from './noise';
import { buildSplineSamples } from './trackGraph';

const DEFAULT_SPLINE_SAMPLES = 160;

function computeTrackPointY(x: number, z: number, seed: number): number {
  const rawY = sampleNaturalTerrainHeight(x, z, seed);
  // Smoothly dampen extreme mountain heights so trains maintain a gentle scenic grade
  const gradedY = Math.max(MIN_TRACK_Y, WATER_LEVEL_Y + 0.22 + Math.max(0, rawY - 0.35) * 0.55);
  return Math.min(1.38, gradedY);
}

function scatterNaturalProps(
  span: number,
  seed: number,
  splineSamples: ReadonlyArray<SplineSample>,
  structures: ReadonlyArray<PlacedStructure>
): ReadonlyArray<NaturalProp> {
  const props: NaturalProp[] = [];
  const half = span * 0.5 - 0.7;
  const gridCells = 19;
  const step = (half * 2) / gridCells;

  for (let gx = 0; gx < gridCells; gx += 1) {
    for (let gz = 0; gz < gridCells; gz += 1) {
      const densityRoll = hashCoords(gx * 7, gz * 13, seed + 401);
      if (densityRoll < 0.42) {
        continue;
      }

      const jx = (hashCoords(gx, gz, seed + 101) - 0.5) * step * 0.85;
      const jz = (hashCoords(gx, gz, seed + 202) - 0.5) * step * 0.85;
      const wx = -half + (gx + 0.5) * step + jx;
      const wz = -half + (gz + 0.5) * step + jz;

      const y = sampleTerraformedHeight(wx, wz, seed, splineSamples);
      if (y < WATER_LEVEL_Y + 0.08 || y > 1.85) {
        continue;
      }

      // Keep clear of the railway corridor
      const nearTrack = splineSamples.some(
        (s): boolean => (s.x - wx) * (s.x - wx) + (s.z - wz) * (s.z - wz) < 0.72 * 0.72
      );
      if (nearTrack) {
        continue;
      }

      // Keep clear of placed buildings
      const nearStruct = structures.some(
        (st): boolean => (st.x - wx) * (st.x - wx) + (st.z - wz) * (st.z - wz) < 0.85 * 0.85
      );
      if (nearStruct) {
        continue;
      }

      const typeRoll = hashCoords(gx, gz, seed + 709);
      let kind: PropKind = 'pine';
      if (y > 1.32) {
        kind = typeRoll > 0.45 ? 'rock' : 'pine';
      } else if (y > 0.82) {
        kind = typeRoll > 0.72 ? 'rock' : typeRoll > 0.3 ? 'pine' : 'autumn_tree';
      } else {
        if (typeRoll > 0.78) kind = 'autumn_tree';
        else if (typeRoll > 0.42) kind = 'puff_tree';
        else if (typeRoll > 0.18) kind = 'pine';
        else kind = 'bush';
      }

      const scale = 0.78 + hashCoords(gx, gz, seed + 888) * 0.52;
      const rotationY = hashCoords(gx, gz, seed + 999) * Math.PI * 2;
      const colorVariant = Math.floor(hashCoords(gx, gz, seed + 555) * 4);

      props.push({
        id: `prop-${gx}-${gz}`,
        kind,
        x: wx,
        y,
        z: wz,
        scale,
        rotationY,
        colorVariant,
      });
    }
  }
  return props;
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
    // Sweeping figure-ish kidney loop crossing the river twice and curving around hills
    const loopAngles = 12;
    for (let i = 0; i < loopAngles; i += 1) {
      const theta = (i / loopAngles) * Math.PI * 2;
      const radiusX = 5.1 + Math.sin(theta * 2) * 0.75;
      const radiusZ = 4.4 + Math.cos(theta * 3) * 0.65;
      const wx = Math.cos(theta) * radiusX;
      const wz = Math.sin(theta) * radiusZ;
      trackPoints.push({
        x: wx,
        y: computeTrackPointY(wx, wz, seed),
        z: wz,
      });
    }
  }

  const trackClosed = withStarterTrack;
  const splineSamples =
    trackPoints.length >= 2
      ? buildSplineSamples(trackPoints, trackClosed, seed, DEFAULT_SPLINE_SAMPLES)
      : [];

  const structures: PlacedStructure[] = [];
  if (withStarterTrack && splineSamples.length > 20) {
    // Place a scenic train station aligned along a flat meadow stretch of the spline
    const stationSample =
      splineSamples.find((s): boolean => !s.isBridge && s.terrainY > WATER_LEVEL_Y + 0.14) ??
      splineSamples[10];

    const stationX = stationSample.x + stationSample.normalX * 0.82;
    const stationZ = stationSample.z + stationSample.normalZ * 0.82;
    const stationY = sampleTerraformedHeight(stationX, stationZ, seed, splineSamples);

    if (stationY > WATER_LEVEL_Y + 0.08) {
      structures.push({
        id: 'starter-station',
        kind: 'station',
        x: stationX,
        y: stationY,
        z: stationZ,
        rotationY: stationSample.yawRadians,
        stories: 1,
        colorVariant: 0,
      });
    }

    // Place a small cluster of cozy cottages near the village
    const cottageOffsets: ReadonlyArray<readonly [number, number, number]> = [
      [-1.8, -1.2, 2],
      [-0.7, -1.9, 1],
      [1.4, -1.6, 1],
      [2.1, -0.8, 2],
    ];
    cottageOffsets.forEach(([cx, cz, stories], idx): void => {
      const cy = sampleTerraformedHeight(cx, cz, seed, splineSamples);
      if (cy > WATER_LEVEL_Y + 0.1) {
        structures.push({
          id: `starter-cottage-${idx}`,
          kind: 'cottage',
          x: cx,
          y: cy,
          z: cz,
          rotationY: idx * 1.1,
          stories,
          colorVariant: idx,
        });
      }
    });
  }

  const naturalProps = scatterNaturalProps(span, seed, splineSamples, structures);

  return {
    span,
    seed,
    trackPoints,
    trackClosed,
    splineSamples,
    naturalProps,
    structures,
  };
}

export function applyWorldSpaceTool(
  world: OrganicDioramaWorld,
  worldX: number,
  worldZ: number,
  tool: ToolType
): OrganicDioramaWorld {
  if (!world || typeof world.span !== 'number') {
    throw new TypeError('CRITICAL: Valid OrganicDioramaWorld is required.');
  }
  if (!Number.isFinite(worldX) || !Number.isFinite(worldZ)) {
    throw new TypeError('CRITICAL: worldX and worldZ must be finite numbers.');
  }
  const half = world.span * 0.5;
  if (Math.abs(worldX) > half || Math.abs(worldZ) > half) {
    throw new RangeError('CRITICAL: Target coordinates are outside the diorama bounds.');
  }
  const validTools: ReadonlyArray<ToolType> = ['track', 'cottage', 'station', 'trees', 'demolish'];
  if (!validTools.includes(tool)) {
    throw new TypeError(`CRITICAL: Invalid tool "${String(tool)}".`);
  }

  if (tool === 'track') {
    const newPt: Vec3Point = {
      x: worldX,
      y: computeTrackPointY(worldX, worldZ, world.seed),
      z: worldZ,
    };

    // If starting fresh or extending an open track
    let nextPoints = [...world.trackPoints];
    let nextClosed = world.trackClosed;

    if (nextClosed) {
      // Insert point into the nearest segment of the closed loop to reshape it organically!
      let bestIdx = nextPoints.length;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < nextPoints.length; i += 1) {
        const a = nextPoints[i];
        const b = nextPoints[(i + 1) % nextPoints.length];
        const mx = (a.x + b.x) * 0.5;
        const mz = (a.z + b.z) * 0.5;
        const d = Math.hypot(worldX - mx, worldZ - mz);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i + 1;
        }
      }
      // Avoid duplicate overlapping control points
      const tooClose = nextPoints.some(
        (p): boolean => Math.hypot(p.x - worldX, p.z - worldZ) < 0.75
      );
      if (tooClose) {
        return world;
      }
      nextPoints.splice(bestIdx, 0, newPt);
    } else {
      if (nextPoints.length > 0) {
        const last = nextPoints[nextPoints.length - 1];
        if (Math.hypot(last.x - worldX, last.z - worldZ) < 0.85) {
          return world;
        }
        // Auto-close loop if clicking near the start point with >= 4 nodes
        const first = nextPoints[0];
        if (nextPoints.length >= 4 && Math.hypot(first.x - worldX, first.z - worldZ) < 1.35) {
          nextClosed = true;
        } else {
          nextPoints.push(newPt);
        }
      } else {
        nextPoints.push(newPt);
      }
    }

    const nextSamples =
      nextPoints.length >= 2
        ? buildSplineSamples(nextPoints, nextClosed, world.seed, DEFAULT_SPLINE_SAMPLES)
        : [];
    const nextProps = scatterNaturalProps(world.span, world.seed, nextSamples, world.structures);

    return {
      ...world,
      trackPoints: nextPoints,
      trackClosed: nextClosed,
      splineSamples: nextSamples,
      naturalProps: nextProps,
    };
  }

  if (tool === 'demolish') {
    const remainingStructs = world.structures.filter(
      (st): boolean => Math.hypot(st.x - worldX, st.z - worldZ) > 0.9
    );
    const remainingPts = world.trackPoints.filter(
      (p): boolean => Math.hypot(p.x - worldX, p.z - worldZ) > 1.25
    );
    const nextClosed = remainingPts.length >= 3 ? world.trackClosed : false;
    const nextSamples =
      remainingPts.length >= 2
        ? buildSplineSamples(remainingPts, nextClosed, world.seed, DEFAULT_SPLINE_SAMPLES)
        : [];
    const nextProps = scatterNaturalProps(world.span, world.seed, nextSamples, remainingStructs);

    return {
      ...world,
      trackPoints: remainingPts,
      trackClosed: nextClosed,
      splineSamples: nextSamples,
      structures: remainingStructs,
      naturalProps: nextProps,
    };
  }

  // Building placement (Cottage, Station, or Planted Trees)
  const surfaceY = sampleTerraformedHeight(worldX, worldZ, world.seed, world.splineSamples);
  if (surfaceY < WATER_LEVEL_Y + 0.06) {
    return world;
  }

  // If clicking an existing cottage with the cottage tool, stack an extra story!
  if (tool === 'cottage') {
    const existingIdx = world.structures.findIndex(
      (st): boolean => st.kind === 'cottage' && Math.hypot(st.x - worldX, st.z - worldZ) < 0.65
    );
    if (existingIdx >= 0) {
      const updated = [...world.structures];
      const target = updated[existingIdx];
      updated[existingIdx] = {
        ...target,
        stories: Math.min(3, target.stories + 1),
      };
      return {
        ...world,
        structures: updated,
      };
    }
  }

  // Align stations to the nearest track tangent; cottages get organic rotation
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
    id: `struct-${Date.now()}-${Math.round(worldX * 100)}`,
    kind: tool === 'cottage' ? 'cottage' : tool === 'station' ? 'station' : 'planted_trees',
    x: worldX,
    y: surfaceY,
    z: worldZ,
    rotationY,
    stories: 1,
    colorVariant: Math.floor(hashCoords(worldX * 17, worldZ * 23, world.seed) * 4),
  };

  const nextStructures = [...world.structures, newStruct];
  const nextProps = scatterNaturalProps(world.span, world.seed, world.splineSamples, nextStructures);

  return {
    ...world,
    structures: nextStructures,
    naturalProps: nextProps,
  };
}

export function clearAllTracks(world: OrganicDioramaWorld): OrganicDioramaWorld {
  if (!world || typeof world.span !== 'number') {
    throw new TypeError('CRITICAL: Valid OrganicDioramaWorld is required.');
  }
  const nextProps = scatterNaturalProps(world.span, world.seed, [], world.structures);
  return {
    ...world,
    trackPoints: [],
    trackClosed: false,
    splineSamples: [],
    naturalProps: nextProps,
  };
}
