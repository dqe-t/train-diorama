import { describe, expect, it } from 'vitest';
import {
  applyWorldSpaceTool,
  clearAllTracks,
  createOrganicDiorama,
} from '../src/core/dioramaBuilder';
import { OrganicDioramaWorld, ToolType } from '../src/types/diorama';

describe('organic diorama builder & free-form world tools', (): void => {
  it('creates an organic diorama with a continuous closed spline loop and natural flora (Happy Path)', (): void => {
    const world = createOrganicDiorama(16, 4208, true);
    expect(world.trackClosed).toBe(true);
    expect(world.trackPoints.length).toBeGreaterThanOrEqual(8);
    expect(world.splineSamples.length).toBeGreaterThan(50);
    expect(world.naturalProps.length).toBeGreaterThan(10);
  });

  it('allows clearing tracks, drawing new spline points, and stacking cottages (Happy Path)', (): void => {
    let world = createOrganicDiorama(16, 4208, true);
    world = clearAllTracks(world);
    expect(world.trackPoints.length).toBe(0);

    world = applyWorldSpaceTool(world, -2.5, -2.0, 'track');
    world = applyWorldSpaceTool(world, 2.5, -2.0, 'track');
    expect(world.trackPoints.length).toBe(2);
    expect(world.splineSamples.length).toBeGreaterThan(10);

    // Find a high ground coordinate to place and stack a cottage
    world = applyWorldSpaceTool(world, -4.5, -4.5, 'cottage');
    const countAfterFirst = world.structures.length;
    if (countAfterFirst > 0) {
      const target = world.structures[countAfterFirst - 1];
      world = applyWorldSpaceTool(world, target.x, target.z, 'cottage');
      expect(world.structures[countAfterFirst - 1].stories).toBe(2);
    }
  });

  it('throws RangeError or TypeError when creating a world with invalid span or seed (Failure Path 1)', (): void => {
    expect((): OrganicDioramaWorld => createOrganicDiorama(2, 100, true)).toThrow(RangeError);
    expect((): OrganicDioramaWorld => createOrganicDiorama(16, 1.5, true)).toThrow(TypeError);
  });

  it('throws RangeError or TypeError when applying tools outside bounds or with invalid tool names (Failure Path 2)', (): void => {
    const world = createOrganicDiorama(16, 4208, false);
    expect((): OrganicDioramaWorld => applyWorldSpaceTool(world, 25, 0, 'track')).toThrow(
      RangeError
    );
    expect((): OrganicDioramaWorld =>
      applyWorldSpaceTool(world, 0, 0, 'invalid' as ToolType)
    ).toThrow(TypeError);
  });
});
