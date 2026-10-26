import { SplineSample, TrackSupportTier, Vec3Point } from '../types/diorama';
import { sampleNaturalTerrainHeight, TRACK_BED_OFFSET } from './noise';

/** Maximum vertical rail slope (rise / run) to keep grades gentle (14%). */
export const MAX_RAILWAY_GRADE = 0.14;
export const CAVEAT_FLUSH_THRESHOLD = 0.12;
export const TRESTLE_THRESHOLD = 0.32;

/** Constant physical arc-length distance between railroad ties/sleepers (0.16m). */
export const CONSTANT_SLEEPER_SPACING = 0.16;
/** Constant physical arc-length distance between trestle bents (0.52m). */
export const CONSTANT_TRESTLE_SPACING = 0.52;

function validatePointArray(points: ReadonlyArray<Vec3Point>): void {
  if (!Array.isArray(points)) {
    throw new TypeError('CRITICAL: points must be an array of Vec3Point.');
  }
  for (const p of points) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      throw new TypeError('CRITICAL: Every Vec3Point must contain finite x, y, z coordinates.');
    }
  }
}

/**
 * Centripetal Catmull-Rom interpolation (alpha = 0.5).
 * Mathematically avoids cusps, self-intersections, and overshoot kinks.
 */
function centripetalCatmullRom(
  p0: Vec3Point, p1: Vec3Point, p2: Vec3Point, p3: Vec3Point, t: number
): Vec3Point {
  const getT = (tPrev: number, a: Vec3Point, b: Vec3Point): number =>
    tPrev + Math.pow(Math.max(1e-4, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)), 0.5);

  const t0 = 0;
  const t1 = getT(t0, p0, p1);
  const t2 = getT(t1, p1, p2);
  const t3 = getT(t2, p2, p3);
  const tInterp = t1 + t * (t2 - t1);

  const evalPair = (tA: number, a: Vec3Point, tB: number, b: Vec3Point): Vec3Point => {
    const inv = 1 / (tB - tA);
    const wA = (tB - tInterp) * inv;
    const wB = (tInterp - tA) * inv;
    return { x: a.x * wA + b.x * wB, y: a.y * wA + b.y * wB, z: a.z * wA + b.z * wB };
  };

  const a1 = evalPair(t0, p0, t1, p1);
  const a2 = evalPair(t1, p1, t2, p2);
  const a3 = evalPair(t2, p2, t3, p3);
  return evalPair(t1, evalPair(t0, a1, t2, a2), t2, evalPair(t1, a2, t3, a3));
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

  const getPt = (idx: number): Vec3Point =>
    closed ? points[((idx % n) + n) % n] : points[Math.max(0, Math.min(n - 1, idx))];

  return centripetalCatmullRom(
    getPt(segIdx - 1), getPt(segIdx), getPt(segIdx + 1), getPt(segIdx + 2), localT
  );
}

/**
 * Smooths control point elevations so grades are gentle and the spline never dips
 * below the natural terrain anywhere along the path.
 */
export function relaxTrackPointHeights(
  points: ReadonlyArray<Vec3Point>,
  closed: boolean,
  maxGrade: number,
  seed: number
): ReadonlyArray<Vec3Point> {
  validatePointArray(points);
  if (typeof closed !== 'boolean') {
    throw new TypeError('CRITICAL: closed must be a boolean.');
  }
  if (typeof maxGrade !== 'number' || !Number.isFinite(maxGrade) || maxGrade <= 0) {
    throw new RangeError('CRITICAL: maxGrade must be a positive finite number.');
  }
  if (!Number.isInteger(seed)) {
    throw new TypeError('CRITICAL: seed must be an integer.');
  }
  if (points.length < 2) {
    return points;
  }

  const n = points.length;
  const heights = points.map((p): number =>
    Math.max(p.y, sampleNaturalTerrainHeight(p.x, p.z, seed) + TRACK_BED_OFFSET)
  );

  const segCount = closed ? n : n - 1;
  for (let i = 0; i < segCount; i += 1) {
    const nextIdx = (i + 1) % n;
    const pA = points[i];
    const pB = points[nextIdx];
    for (let step = 1; step <= 3; step += 1) {
      const f = step / 4;
      const ground = sampleNaturalTerrainHeight(
        pA.x + (pB.x - pA.x) * f,
        pA.z + (pB.z - pA.z) * f,
        seed
      ) + TRACK_BED_OFFSET;
      const nominalY = heights[i] + (heights[nextIdx] - heights[i]) * f;
      if (nominalY < ground) {
        const deficit = ground - nominalY;
        heights[i] += deficit * (1 - f);
        heights[nextIdx] += deficit * f;
      }
    }
  }

  for (let iter = 0; iter < 16; iter += 1) {
    let changed = false;
    for (let i = 0; i < segCount; i += 1) {
      const j = (i + 1) % n;
      const dist = Math.max(0.1, Math.hypot(points[i].x - points[j].x, points[i].z - points[j].z));
      const maxDelta = dist * maxGrade;
      if (heights[i] < heights[j] - maxDelta) { heights[i] = heights[j] - maxDelta; changed = true; }
      if (heights[j] < heights[i] - maxDelta) { heights[j] = heights[i] - maxDelta; changed = true; }
    }
    if (!changed) break;
  }

  return points.map((p, idx): Vec3Point => ({ x: p.x, y: heights[idx], z: p.z }));
}

export function classifySupportTier(clearance: number): TrackSupportTier {
  if (typeof clearance !== 'number' || !Number.isFinite(clearance)) {
    throw new TypeError('CRITICAL: clearance must be a finite number.');
  }
  if (clearance <= CAVEAT_FLUSH_THRESHOLD) return 'flush';
  if (clearance <= TRESTLE_THRESHOLD) return 'cribbing';
  return 'trestle';
}

/** Computes the total arc length of a sequence of 3D samples. */
export function computeSplineArcLength(
  samples: ReadonlyArray<SplineSample>,
  closed: boolean
): number {
  if (!Array.isArray(samples)) throw new TypeError('CRITICAL: samples must be an array.');
  if (samples.length < 2) {
    throw new RangeError('CRITICAL: samples must contain at least 2 points to compute arc length.');
  }
  if (typeof closed !== 'boolean') throw new TypeError('CRITICAL: closed must be a boolean.');
  let sum = 0;
  const loopCount = closed ? samples.length : samples.length - 1;
  for (let i = 0; i < loopCount; i += 1) {
    const a = samples[i];
    const b = samples[(i + 1) % samples.length];
    sum += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
  return sum;
}

/**
 * Extracts frames at a CONSTANT physical distance (e.g. exactly 0.16m between sleepers)
 * so tie density never stretches when the track is long or cramps when the track is short.
 */
export function extractConstantDistanceFrames(
  samples: ReadonlyArray<SplineSample>,
  closed: boolean,
  targetDistance: number
): ReadonlyArray<SplineSample> {
  if (!Array.isArray(samples)) throw new TypeError('CRITICAL: samples must be an array.');
  if (samples.length < 2) throw new RangeError('CRITICAL: samples must contain at least 2 frames.');
  if (typeof closed !== 'boolean') throw new TypeError('CRITICAL: closed must be a boolean.');
  if (typeof targetDistance !== 'number') {
    throw new TypeError('CRITICAL: targetDistance must be a number.');
  }
  if (!Number.isFinite(targetDistance) || targetDistance <= 0) {
    throw new RangeError('CRITICAL: targetDistance must be a positive finite number.');
  }

  const totalLength = computeSplineArcLength(samples, closed);
  const count = Math.max(2, Math.round(totalLength / targetDistance));
  const frames: SplineSample[] = [];
  const loopLimit = closed ? count : count + 1;
  for (let i = 0; i < loopLimit; i += 1) {
    frames.push(sampleTrainPoseAlongSpline(samples, i / count));
  }
  return frames;
}

export function buildSplineSamples(
  controlPoints: ReadonlyArray<Vec3Point>,
  closed: boolean,
  seed: number,
  sampleResolution: number
): ReadonlyArray<SplineSample> {
  validatePointArray(controlPoints);
  if (typeof closed !== 'boolean') throw new TypeError('CRITICAL: closed must be a boolean.');
  if (!Number.isInteger(seed)) throw new TypeError('CRITICAL: seed must be an integer.');
  if (!Number.isInteger(sampleResolution) || sampleResolution < 8) {
    throw new RangeError('CRITICAL: sampleResolution must be an integer >= 8.');
  }
  if (controlPoints.length < 2) return [];

  const gradedPoints = relaxTrackPointHeights(controlPoints, closed, MAX_RAILWAY_GRADE, seed);

  // Dense evaluation for precise arc-length parametrization
  const denseCount = sampleResolution * 4;
  const rawPts: Vec3Point[] = [];
  const cumLen: number[] = [0];

  for (let i = 0; i <= denseCount; i += 1) {
    const u = i / denseCount;
    const pt = evaluateCatmullRomPoint(gradedPoints, closed, u);
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

  // Sample uniform points at requested resolution
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
    const pitchRadians = Math.asin(Math.max(-0.35, Math.min(0.35, ty)));

    const terrainY = sampleNaturalTerrainHeight(curr.x, curr.z, seed);
    const trackY = curr.y;
    const clearance = Math.max(0, trackY - terrainY);
    const supportTier = classifySupportTier(clearance);

    samples.push({
      x: curr.x, y: trackY, z: curr.z,
      tangentX: tx, tangentY: ty, tangentZ: tz,
      normalX: nx, normalZ: nz,
      yawRadians, pitchRadians,
      isBridge: supportTier !== 'flush',
      terrainY, clearance, supportTier,
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
    pitchRadians: Math.asin(Math.max(-0.35, Math.min(0.35, ty))),
    isBridge: a.isBridge,
    terrainY: a.terrainY + (b.terrainY - a.terrainY) * t,
    clearance: a.clearance + (b.clearance - a.clearance) * t,
    supportTier: a.supportTier,
  };
}
