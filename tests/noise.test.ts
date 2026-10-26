import { describe, expect, it } from 'vitest';
import {
  fractalNoise2D,
  PLAIN_Y,
  sampleMesaMask,
  sampleNaturalTerrainHeight,
  sampleTerraformedHeight,
  sampleWashFactor,
  valueNoise2D,
  WASH_BED_Y,
} from '../src/core/noise';
import { SplineSample } from '../src/types/diorama';

function makeSample(x: number, y: number, z: number): SplineSample {
  return {
    x,
    y,
    z,
    tangentX: 1,
    tangentY: 0,
    tangentZ: 0,
    normalX: 0,
    normalZ: 1,
    yawRadians: 0,
    pitchRadians: 0,
    isBridge: false,
    terrainY: y,
    clearance: 0,
    supportTier: 'flush',
  };
}

describe('desert terrain: mesas, dry wash, flat basin & terraforming', (): void => {
  it('is deterministic and produces flat basin, wash bed and elevated mesas (Happy Path)', (): void => {
    expect(sampleNaturalTerrainHeight(2.4, -1.8, 4208)).toBe(sampleNaturalTerrainHeight(2.4, -1.8, 4208));
    expect(valueNoise2D(1.5, 2.5, 4208)).toBeGreaterThanOrEqual(0);
    expect(fractalNoise2D(1.5, 2.5, 4208)).toBeLessThanOrEqual(1);

    let minH = Number.POSITIVE_INFINITY;
    let maxH = Number.NEGATIVE_INFINITY;
    let flatCount = 0;
    let washCount = 0;
    for (let x = -7.5; x <= 7.5; x += 0.5) {
      for (let z = -7.5; z <= 7.5; z += 0.5) {
        const h = sampleNaturalTerrainHeight(x, z, 4208);
        minH = Math.min(minH, h);
        maxH = Math.max(maxH, h);
        if (Math.abs(h - PLAIN_Y) < 0.05) flatCount += 1;
        const w = sampleWashFactor(x, z, 4208);
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(1);
        if (w > 0.9) washCount += 1;
      }
    }
    expect(minH).toBeLessThan(WASH_BED_Y + 0.05);
    expect(maxH).toBeGreaterThan(PLAIN_Y + 0.9);
    expect(flatCount).toBeGreaterThan(200);
    expect(washCount).toBeGreaterThan(10);
    expect(Number.isFinite(sampleMesaMask(0, 0, 4208))).toBe(true);
  });

  it('preserves natural terrain geometry completely without track corridor flattening (Happy Path)', (): void => {
    // Terrain is untouched by tracks
    const naturalMesa = sampleNaturalTerrainHeight(2.0, 3.0, 4208);
    const untouchedMesa = sampleTerraformedHeight(2.0, 3.0, 4208, [makeSample(2.0, 0.6, 3.0)]);
    expect(untouchedMesa).toBe(naturalMesa);

    const naturalWash = sampleNaturalTerrainHeight(0.0, 0.0, 4208);
    const untouchedWash = sampleTerraformedHeight(0.0, 0.0, 4208, [makeSample(0.0, 0.6, 0.0)]);
    expect(untouchedWash).toBe(naturalWash);
  });

  it('throws TypeError for non-finite coordinates or non-array spline samples (Failure Path 1)', (): void => {
    expect((): number => sampleNaturalTerrainHeight(Number.NaN, 0, 1)).toThrow(TypeError);
    expect((): number => sampleWashFactor(0, Number.POSITIVE_INFINITY, 1)).toThrow(TypeError);
    expect((): number =>
      sampleTerraformedHeight(0, 0, 1, null as unknown as ReadonlyArray<SplineSample>)
    ).toThrow(TypeError);
  });

  it('throws TypeError for a non-finite seed in mesa mask sampling (Failure Path 2)', (): void => {
    expect((): number => sampleMesaMask(0, 0, Number.NaN)).toThrow(TypeError);
  });
});
