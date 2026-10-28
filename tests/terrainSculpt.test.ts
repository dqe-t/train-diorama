import { describe, expect, it } from 'vitest';
import {
  applyMesaStamp,
  applyRampSegment,
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

  // Happy Path: Tier Isolation guarantees lifting ground never alters mesa tops
  it('isolates tiers so lifting basin ground has zero influence on mesa plateau vertices', (): void => {
    const stamps = applySculptStamp([], 0, 0, 'lift');
    // On basin floor (baseHeight = 0.42m), full lift +0.08m
    const basinLift = sampleSculptOffset(0, 0, stamps, 0.42);
    expect(basinLift).toBeCloseTo(0.08, 4);

    // On mesa tier 1 plateau (baseHeight = 1.20m), lift influence is masked to exactly 0
    const mesaLift = sampleSculptOffset(0, 0, stamps, 1.20);
    expect(mesaLift).toBe(0);

    // On upper mesa tier 2 (baseHeight = 2.06m), lift influence is strictly 0
    const upperMesaLift = sampleSculptOffset(0, 0, stamps, 2.06);
    expect(upperMesaLift).toBe(0);
  });

  // Happy Path: Mesa Plateaus and Incline Ramps
  it('creates flat mesa plateaus and smooth incline ramps connecting basin to mesa', (): void => {
    // 1. Stamp a mesa plateau at (2, 2)
    const mesas = applyMesaStamp([], 2, 2, false);
    expect(mesas).toHaveLength(1);
    expect(mesas[0].targetHeight).toBeCloseTo(1.20, 2);

    // Height at mesa center equals target height 1.20m
    const mesaH = sampleCompositeTerrainHeight(2, 2, 4208, [], mesas);
    expect(mesaH).toBeCloseTo(1.20, 2);

    // 2. Build a ramp connecting basin (0, 0, 0.42) to mesa (2, 2, 1.20)
    const ramps = applyRampSegment([], 0, 0, 0.42, 2, 2, 1.20);
    expect(ramps).toHaveLength(1);

    // Midpoint of ramp (1, 1) has intermediate grade (0.42 + 1.20) / 2 = 0.81m
    const midH = sampleCompositeTerrainHeight(1, 1, 4208, [], mesas, ramps);
    expect(midH).toBeCloseTo(0.81, 1);
  });

  // Failure Path 3: Invalid mesa and ramp parameters
  it('throws TypeError / RangeError on invalid mesa stamp and ramp segment parameters', (): void => {
    expect((): void => {
      // @ts-expect-error Testing non-boolean isCarve
      applyMesaStamp([], 0, 0, 'invalid');
    }).toThrow(TypeError);

    expect((): void => {
      applyMesaStamp([], 0, 0, false, 1.2, -0.5);
    }).toThrow(RangeError);

    expect((): void => {
      // Zero-length ramp throws RangeError
      applyRampSegment([], 1, 1, 0.42, 1.1, 1.1, 1.2);
    }).toThrow(RangeError);

    expect((): void => {
      applyRampSegment([], 0, 0, 0.42, 2, 2, 1.2, -1.0);
    }).toThrow(RangeError);
  });
});
