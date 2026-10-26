import { describe, expect, it } from 'vitest';
import { createOrganicDiorama } from '../src/core/dioramaBuilder';
import { PLAIN_Y } from '../src/core/noise';
import {
  isBuildableSite,
  pickDesertPropKind,
  scatterDesertProps,
} from '../src/core/propScatter';
import { PlacedStructure, SplineSample } from '../src/types/diorama';

describe('desert prop scattering & buildable sites', (): void => {
  it('picks props by terrain: bare cliffs, boulders in the wash, junipers on mesa tops (Happy Path)', (): void => {
    expect(pickDesertPropKind(PLAIN_Y, 1.5, 0, 0.99)).toBeNull();
    expect(pickDesertPropKind(0.1, 0.1, 1, 0.9)).toBe('boulder');
    expect(pickDesertPropKind(0.1, 0.1, 1, 0.2)).toBeNull();
    expect(pickDesertPropKind(PLAIN_Y + 1.0, 0.1, 0, 0.9)).toBe('juniper');
    expect(pickDesertPropKind(PLAIN_Y, 0.1, 0, 0.8)).toBe('saguaro');
  });

  it('scatters props clear of the track and builds only on dry, gentle ground (Happy Path)', (): void => {
    const world = createOrganicDiorama(16, 4208, true);
    const props = scatterDesertProps(16, 4208, world.splineSamples, world.structures);
    expect(props.length).toBeGreaterThan(20);
    for (const p of props) {
      if (p.kind === 'arch') continue;
      const nearest = Math.min(
        ...world.splineSamples.map((s): number => Math.hypot(s.x - p.x, s.z - p.z))
      );
      expect(nearest).toBeGreaterThan(0.7);
    }
    for (const st of world.structures) {
      expect(isBuildableSite(st.x, st.z, 4208, world.splineSamples)).toBe(true);
    }
  });

  it('throws RangeError for out-of-range slope, roll, washFactor or span (Failure Path 1)', (): void => {
    expect((): unknown => pickDesertPropKind(0.4, -1, 0, 0.5)).toThrow(RangeError);
    expect((): unknown => pickDesertPropKind(0.4, 0.1, 0, 1.5)).toThrow(RangeError);
    expect((): unknown => pickDesertPropKind(0.4, 0.1, 2, 0.5)).toThrow(RangeError);
    expect((): unknown => scatterDesertProps(1, 1, [], [])).toThrow(RangeError);
  });

  it('throws TypeError for non-integer seeds, non-array inputs or NaN values (Failure Path 2)', (): void => {
    expect((): unknown => scatterDesertProps(16, 1.5, [], [])).toThrow(TypeError);
    expect((): unknown =>
      scatterDesertProps(16, 1, null as unknown as ReadonlyArray<SplineSample>, [])
    ).toThrow(TypeError);
    expect((): unknown =>
      scatterDesertProps(16, 1, [], null as unknown as ReadonlyArray<PlacedStructure>)
    ).toThrow(TypeError);
    expect((): unknown => pickDesertPropKind(Number.NaN, 0.1, 0, 0.5)).toThrow(TypeError);
    expect((): unknown => isBuildableSite(Number.NaN, 0, 1, [])).toThrow(TypeError);
  });
});
