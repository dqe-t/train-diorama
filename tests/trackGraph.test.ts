import { describe, expect, it } from 'vitest';
import {
  buildSplineSamples,
  evaluateCatmullRomPoint,
  sampleTrainPoseAlongSpline,
} from '../src/core/trackGraph';
import { Vec3Point } from '../src/types/diorama';

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

  it('throws RangeError when fewer than 2 control points or invalid u parameter are provided (Failure Path 1)', (): void => {
    expect((): Vec3Point => evaluateCatmullRomPoint([{ x: 0, y: 0, z: 0 }], false, 0.5)).toThrow(
      RangeError
    );
    expect((): Vec3Point => evaluateCatmullRomPoint(DEMO_POINTS, false, 1.5)).toThrow(RangeError);
    expect((): Vec3Point => evaluateCatmullRomPoint(DEMO_POINTS, false, -0.1)).toThrow(RangeError);
  });

  it('throws RangeError or TypeError on invalid sample resolution or empty sample interpolation (Failure Path 2)', (): void => {
    expect((): unknown => buildSplineSamples(DEMO_POINTS, true, 4208, 4)).toThrow(RangeError);
    expect((): unknown => buildSplineSamples(DEMO_POINTS, true, 12.5, 16)).toThrow(TypeError);
    expect((): unknown => sampleTrainPoseAlongSpline([], 0.5)).toThrow(RangeError);
  });
});
