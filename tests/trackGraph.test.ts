import { describe, expect, it } from 'vitest';
import {
  buildSplineSamples,
  classifySupportTier,
  evaluateCatmullRomPoint,
  relaxTrackPointHeights,
  sampleTrainPoseAlongSpline,
} from '../src/core/trackGraph';
import { TrackSupportTier, Vec3Point } from '../src/types/diorama';

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

  it('throws RangeError when fewer than 2 control points or invalid u parameter are provided (Failure Path 1)', (): void => {
    expect((): Vec3Point => evaluateCatmullRomPoint([{ x: 0, y: 0, z: 0 }], false, 0.5)).toThrow(
      RangeError
    );
    expect((): Vec3Point => evaluateCatmullRomPoint(DEMO_POINTS, false, 1.5)).toThrow(RangeError);
    expect((): Vec3Point => evaluateCatmullRomPoint(DEMO_POINTS, false, -0.1)).toThrow(RangeError);
    expect((): ReadonlyArray<Vec3Point> =>
      relaxTrackPointHeights(DEMO_POINTS, false, -0.05, 4208)
    ).toThrow(RangeError);
  });

  it('throws RangeError or TypeError on invalid sample resolution, clearance, or empty sample interpolation (Failure Path 2)', (): void => {
    expect((): unknown => buildSplineSamples(DEMO_POINTS, true, 4208, 4)).toThrow(RangeError);
    expect((): unknown => buildSplineSamples(DEMO_POINTS, true, 12.5, 16)).toThrow(TypeError);
    expect((): unknown => sampleTrainPoseAlongSpline([], 0.5)).toThrow(RangeError);
    expect((): TrackSupportTier => classifySupportTier(Number.NaN)).toThrow(TypeError);
  });
});
