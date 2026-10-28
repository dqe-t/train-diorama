import { describe, expect, it } from 'vitest';
import {
  applySculptStamp,
  sampleCompositeTerrainHeight,
  sampleSculptOffset,
  sculptBrushFalloff,
  SCULPT_HEIGHT_STEP,
  TYPICAL_MESA_HEIGHT,
} from '../src/core/terrainSculpt';
import { SculptStamp } from '../src/types/diorama';

describe('terrainSculpt module', (): void => {
  // Requirement verification: 10% of typical mesa height
  it('enforces sculpt step height to be exactly 10% of typical mesa height', (): void => {
    expect(SCULPT_HEIGHT_STEP).toBeCloseTo(0.1 * TYPICAL_MESA_HEIGHT, 5);
  });

  // Happy Path: apply lift and lower stamps and evaluate composite height
  it('applies lift (+0.08m) and lower (-0.08m) stamps and samples continuous falloff', (): void => {
    const emptyStamps: SculptStamp[] = [];

    // 1. Lift stamp at origin
    const liftedStamps = applySculptStamp(emptyStamps, 0, 0, 'lift');
    expect(liftedStamps).toHaveLength(1);
    expect(liftedStamps[0].delta).toBeCloseTo(0.08, 4);

    // Peak offset at stamp center equals exactly +0.08m
    const peakOffset = sampleSculptOffset(0, 0, liftedStamps);
    expect(peakOffset).toBeCloseTo(0.08, 4);

    // Falloff halfway to radius
    const halfRadius = liftedStamps[0].radius * 0.5;
    const midOffset = sampleSculptOffset(halfRadius, 0, liftedStamps);
    expect(midOffset).toBeLessThan(peakOffset);
    expect(midOffset).toBeGreaterThan(0);

    // Beyond radius offset is 0
    const farOffset = sampleSculptOffset(liftedStamps[0].radius + 0.1, 0, liftedStamps);
    expect(farOffset).toBe(0);

    // 2. Lower stamp at distant coordinate
    const lowerStamps = applySculptStamp(liftedStamps, 4, 4, 'lower');
    expect(lowerStamps).toHaveLength(2);
    expect(sampleSculptOffset(4, 4, lowerStamps)).toBeCloseTo(-0.08, 4);

    // 3. Merging nearby stamps increases delta
    const mergedStamps = applySculptStamp(liftedStamps, 0.05, 0.05, 'lift');
    expect(mergedStamps).toHaveLength(1);
    expect(mergedStamps[0].delta).toBeCloseTo(0.16, 4);

    // Composite height check
    const compositeH = sampleCompositeTerrainHeight(0, 0, 4208, liftedStamps);
    const naturalH = sampleCompositeTerrainHeight(0, 0, 4208, emptyStamps);
    expect(compositeH - naturalH).toBeCloseTo(0.08, 4);
  });

  // Failure Path 1: Invalid coordinates or parameters in sculptBrushFalloff and sampleSculptOffset
  it('throws TypeError / RangeError on non-finite coordinates or invalid radius', (): void => {
    expect((): void => {
      sculptBrushFalloff(Number.NaN, 1.2);
    }).toThrow(TypeError);

    expect((): void => {
      sculptBrushFalloff(0.5, 0);
    }).toThrow(RangeError);

    expect((): void => {
      sculptBrushFalloff(-1, 1.2);
    }).toThrow(RangeError);

    expect((): void => {
      sampleSculptOffset(Number.POSITIVE_INFINITY, 0, []);
    }).toThrow(TypeError);

    expect((): void => {
      // @ts-expect-error Testing invalid stamps input
      sampleSculptOffset(0, 0, null);
    }).toThrow(TypeError);
  });

  // Failure Path 2: Invalid direction or inputs to applySculptStamp
  it('throws TypeError on invalid direction or malformed parameters in applySculptStamp', (): void => {
    expect((): void => {
      // @ts-expect-error Testing invalid direction
      applySculptStamp([], 0, 0, 'sideways');
    }).toThrow(TypeError);

    expect((): void => {
      // @ts-expect-error Testing non-array stamps
      applySculptStamp(null, 0, 0, 'lift');
    }).toThrow(TypeError);

    expect((): void => {
      applySculptStamp([], 0, 0, 'lift', -0.5);
    }).toThrow(RangeError);

    expect((): void => {
      applySculptStamp([], 0, 0, 'lift', 0.08, -1.0);
    }).toThrow(RangeError);
  });
});
