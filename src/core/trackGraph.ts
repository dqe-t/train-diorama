import { SplineSample, Vec3Point } from '../types/diorama';
import { MIN_TRACK_Y, sampleNaturalTerrainHeight, WATER_LEVEL_Y } from './noise';

function validatePointArray(points: ReadonlyArray<Vec3Point>): void {
  if (!Array.isArray(points)) {
    throw new TypeError('CRITICAL: points must be an array of Vec3Point.');
  }
  for (const p of points) {
    if (
      !p ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      !Number.isFinite(p.z)
    ) {
      throw new TypeError('CRITICAL: Every Vec3Point must contain finite x, y, z coordinates.');
    }
  }
}

function catmullRomScalar(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export function evaluateCatmullRomPoint(
  points: ReadonlyArray<Vec3Point>,
  closed: boolean,
  u: number
): Vec3Point {
  validatePointArray(points);
  if (points.length < 2) {
    throw new RangeError('CRITICAL: At least 2 control points are required to evaluate a spline.');
  }
  if (typeof closed !== 'boolean') {
    throw new TypeError('CRITICAL: closed flag must be a boolean.');
  }
  if (typeof u !== 'number' || !Number.isFinite(u) || u < 0 || u > 1) {
    throw new RangeError('CRITICAL: Spline parameter u must be within [0, 1].');
  }

  const n = points.length;
  const segmentCount = closed ? n : n - 1;
  const scaled = Math.min(u * segmentCount, segmentCount - 1e-7);
  const segIdx = Math.floor(scaled);
  const localT = scaled - segIdx;

  const getPt = (idx: number): Vec3Point => {
    if (closed) {
      return points[((idx % n) + n) % n];
    }
    return points[Math.max(0, Math.min(n - 1, idx))];
  };

  const p0 = getPt(segIdx - 1);
  const p1 = getPt(segIdx);
  const p2 = getPt(segIdx + 1);
  const p3 = getPt(segIdx + 2);

  return {
    x: catmullRomScalar(p0.x, p1.x, p2.x, p3.x, localT),
    y: catmullRomScalar(p0.y, p1.y, p2.y, p3.y, localT),
    z: catmullRomScalar(p0.z, p1.z, p2.z, p3.z, localT),
  };
}

export function buildSplineSamples(
  controlPoints: ReadonlyArray<Vec3Point>,
  closed: boolean,
  seed: number,
  sampleResolution: number
): ReadonlyArray<SplineSample> {
  validatePointArray(controlPoints);
  if (typeof closed !== 'boolean') {
    throw new TypeError('CRITICAL: closed must be a boolean.');
  }
  if (!Number.isInteger(seed)) {
    throw new TypeError('CRITICAL: seed must be an integer.');
  }
  if (!Number.isInteger(sampleResolution) || sampleResolution < 8) {
    throw new RangeError('CRITICAL: sampleResolution must be an integer >= 8.');
  }

  if (controlPoints.length < 2) {
    return [];
  }

  // First pass: oversample and re-parameterize by uniform arc length
  const denseCount = sampleResolution * 3;
  const rawPts: Vec3Point[] = [];
  const cumLen: number[] = [0];

  for (let i = 0; i <= denseCount; i += 1) {
    const u = i / denseCount;
    const pt = evaluateCatmullRomPoint(controlPoints, closed, u);
    rawPts.push(pt);
    if (i > 0) {
      const prev = rawPts[i - 1];
      const d = Math.hypot(pt.x - prev.x, pt.y - prev.y, pt.z - prev.z);
      cumLen.push(cumLen[i - 1] + d);
    }
  }

  const totalLength = cumLen[cumLen.length - 1];
  if (totalLength < 0.05) {
    return [];
  }

  const uniformPts: Vec3Point[] = [];
  for (let i = 0; i <= sampleResolution; i += 1) {
    const targetDist = (i / sampleResolution) * totalLength;
    let idx = 0;
    while (idx < cumLen.length - 2 && cumLen[idx + 1] < targetDist) {
      idx += 1;
    }
    const segLen = Math.max(1e-6, cumLen[idx + 1] - cumLen[idx]);
    const frac = (targetDist - cumLen[idx]) / segLen;
    const a = rawPts[idx];
    const b = rawPts[idx + 1];
    uniformPts.push({
      x: a.x + (b.x - a.x) * frac,
      y: a.y + (b.y - a.y) * frac,
      z: a.z + (b.z - a.z) * frac,
    });
  }

  const samples: SplineSample[] = [];
  const count = uniformPts.length;

  for (let i = 0; i < count; i += 1) {
    const curr = uniformPts[i];
    const prev = closed
      ? uniformPts[(i - 1 + count - 1) % (count - 1)]
      : uniformPts[Math.max(0, i - 1)];
    const next = closed
      ? uniformPts[(i + 1) % (count - 1)]
      : uniformPts[Math.min(count - 1, i + 1)];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const dz = next.z - prev.z;
    const len = Math.max(1e-6, Math.hypot(dx, dy, dz));

    const tx = dx / len;
    const ty = dy / len;
    const tz = dz / len;

    const horizLen = Math.max(1e-6, Math.hypot(tx, tz));
    const nx = -tz / horizLen;
    const nz = tx / horizLen;

    const yawRadians = Math.atan2(tx, tz);
    const pitchRadians = Math.asin(Math.max(-0.5, Math.min(0.5, ty)));

    const terrainY = sampleNaturalTerrainHeight(curr.x, curr.z, seed);
    const isBridge = terrainY < WATER_LEVEL_Y + 0.06 || curr.y - terrainY > 0.24;

    samples.push({
      x: curr.x,
      y: Math.max(MIN_TRACK_Y, curr.y),
      z: curr.z,
      tangentX: tx,
      tangentY: ty,
      tangentZ: tz,
      normalX: nx,
      normalZ: nz,
      yawRadians,
      pitchRadians,
      isBridge,
      terrainY,
    });
  }

  return samples;
}

export function sampleTrainPoseAlongSpline(
  samples: ReadonlyArray<SplineSample>,
  normalizedDistance: number
): SplineSample {
  if (!Array.isArray(samples) || samples.length < 2) {
    throw new RangeError('CRITICAL: At least 2 SplineSamples are required to interpolate train pose.');
  }
  if (typeof normalizedDistance !== 'number' || !Number.isFinite(normalizedDistance)) {
    throw new TypeError('CRITICAL: normalizedDistance must be a finite number.');
  }

  const wrapped = ((normalizedDistance % 1) + 1) % 1;
  const maxIdx = samples.length - 1;
  const scaled = wrapped * maxIdx;
  const idx0 = Math.floor(scaled);
  const idx1 = Math.min(maxIdx, idx0 + 1);
  const t = scaled - idx0;

  const a = samples[idx0];
  const b = samples[idx1];

  const tx = a.tangentX + (b.tangentX - a.tangentX) * t;
  const ty = a.tangentY + (b.tangentY - a.tangentY) * t;
  const tz = a.tangentZ + (b.tangentZ - a.tangentZ) * t;

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    tangentX: tx,
    tangentY: ty,
    tangentZ: tz,
    normalX: a.normalX + (b.normalX - a.normalX) * t,
    normalZ: a.normalZ + (b.normalZ - a.normalZ) * t,
    yawRadians: Math.atan2(tx, tz),
    pitchRadians: Math.asin(Math.max(-0.5, Math.min(0.5, ty))),
    isBridge: a.isBridge,
    terrainY: a.terrainY + (b.terrainY - a.terrainY) * t,
  };
}
