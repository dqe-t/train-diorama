import { describe, expect, it } from 'vitest';
import { TRACK_BED_OFFSET } from '../src/core/noise';
import {
  buildSplineSamples,
  classifySupportTier,
  computeSplineArcLength,
  CONSTANT_SLEEPER_SPACING,
  CONSTANT_TRESTLE_SPACING,
  evaluateCatmullRomPoint,
  extractConstantDistanceFrames,
  relaxTrackPointHeights,
  sampleTrainPoseAlongSpline,
} from '../src/core/trackGraph';
import { SplineSample, TrackSupportTier, Vec3Point } from '../src/types/diorama';

const DEMO_POINTS: ReadonlyArray<Vec3Point> = [
  { x: -3, y: 0.5, z: -3 },
  { x: 3, y: 0.6, z: -3 },
  { x: 3, y: 0.55, z: 3 },
  { x: -3, y: 0.5, z: 3 },
];

describe('Catmull-Rom spline evaluation & train pose interpolation', (): void => {
  it('evaluates smooth Catmull-Rom points and builds uniform arc-length samples (Happy Path)', (): void => {
    const mid = evaluateCatmullRomPoint(DEMO_POINTS, true, 0.5);
    expect(Number.isFinite(mid.x)).toBe(true);
    expect(Number.isFinite(mid.y)).toBe(true);
    expect(Number.isFinite(mid.z)).toBe(true);

    const samples = buildSplineSamples(DEMO_POINTS, true, 4208, 32);
    expect(samples.length).toBe(33);

    const trainPose = sampleTrainPoseAlongSpline(samples, 0.35);
    expect(Number.isFinite(trainPose.x)).toBe(true);
    expect(Number.isFinite(trainPose.yawRadians)).toBe(true);
  });

  it('computes spline arc length and maintains constant distance frames invariant of track length (Happy Path)', (): void => {
    const shortPoints: ReadonlyArray<Vec3Point> = [
      { x: -2, y: 0, z: -2 },
      { x: 2, y: 0, z: -2 },
      { x: 2, y: 0, z: 2 },
      { x: -2, y: 0, z: 2 },
    ];
    const longPoints: ReadonlyArray<Vec3Point> = [
      { x: -8, y: 0, z: -8 },
      { x: 8, y: 0, z: -8 },
      { x: 8, y: 0, z: 8 },
      { x: -8, y: 0, z: 8 },
    ];

    const shortSamples = buildSplineSamples(shortPoints, true, 4208, 120);
    const longSamples = buildSplineSamples(longPoints, true, 4208, 120);

    const shortArcLength = computeSplineArcLength(shortSamples, true);
    const longArcLength = computeSplineArcLength(longSamples, true);

    expect(shortArcLength).toBeGreaterThan(12);
    expect(longArcLength).toBeGreaterThan(50);
    expect(longArcLength).toBeGreaterThan(shortArcLength * 3.5);

    const shortSleepers = extractConstantDistanceFrames(
      shortSamples,
      true,
      CONSTANT_SLEEPER_SPACING
    );
    const longSleepers = extractConstantDistanceFrames(
      longSamples,
      true,
      CONSTANT_SLEEPER_SPACING
    );

    // Sleepers count scales proportionally with length so physical spacing is constant!
    expect(longSleepers.length).toBeGreaterThan(shortSleepers.length * 3);

    // Verify distance between adjacent sleepers on both tracks matches CONSTANT_SLEEPER_SPACING
    const dist = (a: Vec3Point, b: Vec3Point): number =>
      Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

    const dShort = dist(shortSleepers[0], shortSleepers[1]);
    const dLong = dist(longSleepers[0], longSleepers[1]);

    expect(dShort).toBeCloseTo(CONSTANT_SLEEPER_SPACING, 1);
    expect(dLong).toBeCloseTo(CONSTANT_SLEEPER_SPACING, 1);
    expect(Math.abs(dShort - dLong)).toBeLessThan(0.04);

    const shortTrestles = extractConstantDistanceFrames(
      shortSamples,
      true,
      CONSTANT_TRESTLE_SPACING
    );
    expect(shortTrestles.length).toBeLessThan(shortSleepers.length);
  });

  it('relaxes steep vertical control points and classifies adaptive substructure tiers (Happy Path)', (): void => {
    // Two points 1.0 unit apart horizontally with a 1.0 unit vertical cliff drop
    const steepDrop: ReadonlyArray<Vec3Point> = [
      { x: 0, y: 1.5, z: 0 },
      { x: 1, y: 0.5, z: 0 },
    ];
    const relaxed = relaxTrackPointHeights(steepDrop, false, 0.16, 4208);
    // Point 1 should be held up by substructures so slope does not exceed 0.16
    expect(relaxed[1].y).toBeGreaterThanOrEqual(1.5 - 0.16 * 1.0 - 1e-4);

    expect(classifySupportTier(0.04)).toBe('flush');
    expect(classifySupportTier(0.2)).toBe('cribbing');
    expect(classifySupportTier(0.5)).toBe('trestle');
  });

  it('guarantees spline track elevation never dips into or clips inside natural terrain (Happy Path)', (): void => {
    const loopPoints: ReadonlyArray<Vec3Point> = [
      { x: -4, y: 0, z: -4 },
      { x: 4, y: 0, z: -4 },
      { x: 4, y: 0, z: 4 },
      { x: -4, y: 0, z: 4 },
    ];
    const samples = buildSplineSamples(loopPoints, true, 4208, 64);
    for (const s of samples) {
      expect(s.y).toBeGreaterThanOrEqual(s.terrainY + TRACK_BED_OFFSET - 1e-4);
      expect(s.clearance).toBeGreaterThanOrEqual(0);
    }
  });

  it('throws RangeError when fewer than 2 control points or invalid u parameter are provided (Failure Path 1)', (): void => {
    expect((): Vec3Point => evaluateCatmullRomPoint([{ x: 0, y: 0, z: 0 }], false, 0.5)).toThrow(
      RangeError
    );
    expect((): Vec3Point => evaluateCatmullRomPoint(DEMO_POINTS, false, 1.5)).toThrow(RangeError);
    expect((): Vec3Point => evaluateCatmullRomPoint(DEMO_POINTS, false, -0.1)).toThrow(RangeError);
    expect((): ReadonlyArray<Vec3Point> =>
      relaxTrackPointHeights(DEMO_POINTS, false, -0.05, 4208)
    ).toThrow(RangeError);
    expect((): number => computeSplineArcLength([], false)).toThrow(RangeError);
    expect((): unknown => extractConstantDistanceFrames([], false, 0.2)).toThrow(RangeError);
    const dummySample: SplineSample = {
      x: 0,
      y: 0,
      z: 0,
      tangentX: 1,
      tangentY: 0,
      tangentZ: 0,
      normalX: 0,
      normalZ: 1,
      yawRadians: 0,
      pitchRadians: 0,
      isBridge: false,
      terrainY: 0,
      clearance: 0,
      supportTier: 'flush',
    };
    expect((): unknown =>
      extractConstantDistanceFrames([dummySample, dummySample], false, -0.5)
    ).toThrow(RangeError);
  });

  it('throws RangeError or TypeError on invalid sample resolution, clearance, or empty sample interpolation (Failure Path 2)', (): void => {
    expect((): unknown => buildSplineSamples(DEMO_POINTS, true, 4208, 4)).toThrow(RangeError);
    expect((): unknown => buildSplineSamples(DEMO_POINTS, true, 12.5, 16)).toThrow(TypeError);
    expect((): unknown => sampleTrainPoseAlongSpline([], 0.5)).toThrow(RangeError);
    expect((): TrackSupportTier => classifySupportTier(Number.NaN)).toThrow(TypeError);
    const dummySample: SplineSample = {
      x: 0,
      y: 0,
      z: 0,
      tangentX: 1,
      tangentY: 0,
      tangentZ: 0,
      normalX: 0,
      normalZ: 1,
      yawRadians: 0,
      pitchRadians: 0,
      isBridge: false,
      terrainY: 0,
      clearance: 0,
      supportTier: 'flush',
    };
    expect((): unknown =>
      extractConstantDistanceFrames([dummySample, dummySample], false, Number.NaN)
    ).toThrow(RangeError);
  });
});
