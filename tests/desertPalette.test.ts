import { describe, expect, it } from 'vitest';
import {
  computeCavityOcclusion,
  computeTerrainVertexColor,
  mixRgb,
  strataColorAtHeight,
  TerrainColorInput,
} from '../src/core/desertPalette';
import { PLAIN_Y } from '../src/core/noise';

const BASE: TerrainColorInput = {
  height: PLAIN_Y,
  slope: 0.05,
  grain: 0.5,
  streak: 0.5,
  washFactor: 0,
};

describe('desert palette & terrain vertex colors', (): void => {
  it('returns distinct colors for basin floor, cliff faces and wash bed (Happy Path)', (): void => {
    const floor = computeTerrainVertexColor(BASE);
    const cliff = computeTerrainVertexColor({ ...BASE, height: 0.8, slope: 2.5 });
    const wash = computeTerrainVertexColor({ ...BASE, height: 0.1, washFactor: 1 });

    for (const c of [floor, cliff, wash]) {
      expect(c.length).toBe(3);
      c.forEach((ch): void => {
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(1);
      });
    }
    // Cliff strata are redder/darker than the dusty basin floor; wash is paler
    expect(cliff[1]).toBeLessThan(floor[1]);
    expect(wash[2]).toBeGreaterThan(floor[2]);
  });

  it('transitions gradually from basin floor to cliff rock between slope 0.26 and 0.75 (Happy Path)', (): void => {
    const gentle = computeTerrainVertexColor({ ...BASE, slope: 0.1 });
    const midSlope = computeTerrainVertexColor({ ...BASE, slope: 0.5 });
    const sheerCliff = computeTerrainVertexColor({ ...BASE, slope: 1.5 });

    // Mid-slope color channel should lie strictly between gentle slope and sheer cliff
    expect(midSlope[1]).toBeLessThan(gentle[1]);
    expect(sheerCliff[1]).toBeLessThan(midSlope[1]);
  });

  it('exhibits distinct horizontal strata contrast between alternating layers (Happy Path)', (): void => {
    const chocolateBand = strataColorAtHeight(0.55);
    const ochreBand = strataColorAtHeight(0.75);
    // Dark chocolate layer has significantly lower red/green luminance than warm ochre band
    expect(chocolateBand[0]).toBeLessThan(ochreBand[0]);
    expect(chocolateBand[1]).toBeLessThan(ochreBand[1]);
  });

  it('maps strata layers by elevation and mixes colors linearly (Happy Path)', (): void => {
    const low = strataColorAtHeight(0.5);
    const cap = strataColorAtHeight(2.0);
    expect(cap[2]).toBeGreaterThan(low[2]); // cream Navajo cap vs chocolate Moenkopi
    expect(mixRgb([0, 0, 0], [1, 1, 1], 0.5)).toEqual([0.5, 0.5, 0.5]);
  });

  it('throws RangeError for negative slope or out-of-range unit inputs (Failure Path 1)', (): void => {
    expect((): unknown => computeTerrainVertexColor({ ...BASE, slope: -0.1 })).toThrow(RangeError);
    expect((): unknown => computeTerrainVertexColor({ ...BASE, washFactor: 1.5 })).toThrow(RangeError);
    expect((): unknown => computeTerrainVertexColor({ ...BASE, grain: -0.2 })).toThrow(RangeError);
  });

  it('throws TypeError for missing input or non-finite values (Failure Path 2)', (): void => {
    expect((): unknown =>
      computeTerrainVertexColor(null as unknown as TerrainColorInput)
    ).toThrow(TypeError);
    expect((): unknown => computeTerrainVertexColor({ ...BASE, height: Number.NaN })).toThrow(TypeError);
    expect((): unknown => strataColorAtHeight(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  it('darkens concave cliff feet and slightly brightens convex rims (Happy Path)', (): void => {
    const flat = computeCavityOcclusion(0.5, 0.5, 0.4);
    const cliffFoot = computeCavityOcclusion(0.4, 1.0, 0.4);
    const rim = computeCavityOcclusion(1.2, 0.8, 0.4);
    expect(flat).toBeCloseTo(1, 5);
    expect(cliffFoot).toBeCloseTo(0.6, 5);
    expect(rim).toBeGreaterThan(1);
    expect(rim).toBeLessThanOrEqual(1.05);
  });

  it('throws on invalid cavity occlusion inputs (Failure Paths)', (): void => {
    expect((): number => computeCavityOcclusion(Number.NaN, 0, 0.4)).toThrow(TypeError);
    expect((): number => computeCavityOcclusion(0, 0, 1.5)).toThrow(RangeError);
    expect((): number => computeCavityOcclusion(0, 0, -0.1)).toThrow(RangeError);
  });
});
