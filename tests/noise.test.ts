import { describe, expect, it } from 'vitest';
import {
  computeTerrainVertexColor,
  fractalNoise2D,
  hashCoords,
  sampleNaturalTerrainHeight,
  sampleTerraformedHeight,
  valueNoise2D,
} from '../src/core/noise';
import { SplineSample } from '../src/types/diorama';

describe('continuous noise, terrain height & terraforming', (): void => {
  it('computes deterministic continuous elevation and vertex biome colors (Happy Path)', (): void => {
    const h1 = sampleNaturalTerrainHeight(2.4, -1.8, 4208);
    const h2 = sampleNaturalTerrainHeight(2.4, -1.8, 4208);
    expect(h1).toBe(h2);
    expect(Number.isFinite(h1)).toBe(true);

    const v = valueNoise2D(1.5, 2.5, 4208);
    const f = fractalNoise2D(1.5, 2.5, 4208);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThanOrEqual(1);

    const color = computeTerrainVertexColor(0.65, 0.15, hashCoords(3, 4, 4208));
    expect(color.length).toBe(3);
  });

  it('blends terrain elevation smoothly toward nearby track spline samples (Happy Path)', (): void => {
    const sample: SplineSample = {
      x: 1.0,
      y: 0.72,
      z: 1.0,
      tangentX: 1,
      tangentY: 0,
      tangentZ: 0,
      normalX: 0,
      normalZ: 1,
      yawRadians: 0,
      pitchRadians: 0,
      isBridge: false,
      terrainY: 0.9,
    };
    const terraformed = sampleTerraformedHeight(1.0, 1.0, 4208, [sample]);
    expect(Number.isFinite(terraformed)).toBe(true);
  });

  it('throws TypeError when non-finite numbers are passed to terrain functions (Failure Path 1)', (): void => {
    expect((): number => sampleNaturalTerrainHeight(Number.NaN, 0, 1)).toThrow(TypeError);
    expect((): number => sampleTerraformedHeight(0, Number.POSITIVE_INFINITY, 1, [])).toThrow(
      TypeError
    );
    expect((): number =>
      sampleTerraformedHeight(0, 0, 1, null as unknown as ReadonlyArray<SplineSample>)
    ).toThrow(TypeError);
  });

  it('throws RangeError when negative slope is passed to computeTerrainVertexColor (Failure Path 2)', (): void => {
    expect((): readonly [number, number, number] =>
      computeTerrainVertexColor(0.5, -0.2, 0.5)
    ).toThrow(RangeError);
  });
});
