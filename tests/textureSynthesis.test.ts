import { describe, expect, it } from 'vitest';
import { generateGrainPixels, generateStrataPixels } from '../src/core/textureSynthesis';

describe('procedural texture synthesis', (): void => {
  it('generates deterministic, opaque, tileable grain pixels (Happy Path)', (): void => {
    const a = generateGrainPixels(64, 7);
    const b = generateGrainPixels(64, 7);
    expect(a.length).toBe(64 * 64 * 4);
    expect(a).toEqual(b);
    for (let i = 3; i < a.length; i += 4) {
      expect(a[i]).toBe(255);
    }
    // Grain is a subtle multiplier around 0.9 (≈230)
    let sum = 0;
    for (let i = 0; i < a.length; i += 4) sum += a[i];
    const mean = sum / (64 * 64);
    expect(mean).toBeGreaterThan(200);
    expect(mean).toBeLessThan(250);
  });

  it('generates strata pixels with a darker base and a pale cap rock top (Happy Path)', (): void => {
    const w = 16;
    const h = 256;
    const px = generateStrataPixels(w, h, 3);
    expect(px.length).toBe(w * h * 4);
    const bottomBlue = px[2];
    const topBlue = px[((h - 1) * w) * 4 + 2];
    expect(topBlue).toBeGreaterThan(bottomBlue);
  });

  it('throws RangeError for sizes that are not powers of two in range (Failure Path 1)', (): void => {
    expect((): Uint8Array => generateGrainPixels(100, 1)).toThrow(RangeError);
    expect((): Uint8Array => generateGrainPixels(8, 1)).toThrow(RangeError);
    expect((): Uint8Array => generateStrataPixels(64, 2048, 1)).toThrow(RangeError);
  });

  it('throws TypeError for non-integer seeds (Failure Path 2)', (): void => {
    expect((): Uint8Array => generateGrainPixels(64, 1.5)).toThrow(TypeError);
    expect((): Uint8Array => generateStrataPixels(64, 64, Number.NaN)).toThrow(TypeError);
  });
});
