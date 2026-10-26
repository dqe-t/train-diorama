import { describe, expect, it } from 'vitest';
import {
  generateGrainPixels,
  generateSandNormalPixels,
  generateStrataPixels,
} from '../src/core/textureSynthesis';

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

  it('generates normalized tangent-space sand normal maps with dominant +Z blue channels (Happy Path)', (): void => {
    const normals = generateSandNormalPixels(64, 42, 2.2);
    expect(normals.length).toBe(64 * 64 * 4);
    for (let i = 0; i < normals.length; i += 4) {
      const r = normals[i];
      const g = normals[i + 1];
      const b = normals[i + 2];
      const a = normals[i + 3];
      expect(a).toBe(255);
      // Tangent normal maps have Nz pointing out of surface (blue >= 128)
      expect(b).toBeGreaterThanOrEqual(128);
      // Verify reconstructed vector is approximately normalized: nx^2 + ny^2 + nz^2 ≈ 1
      const nx = (r / 255) * 2 - 1;
      const ny = (g / 255) * 2 - 1;
      const nz = (b / 255) * 2 - 1;
      const len = Math.hypot(nx, ny, nz);
      expect(len).toBeCloseTo(1.0, 1);
    }
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

  it('throws RangeError for sizes that are not powers of two in range or invalid strength (Failure Path 1)', (): void => {
    expect((): Uint8Array => generateGrainPixels(100, 1)).toThrow(RangeError);
    expect((): Uint8Array => generateGrainPixels(8, 1)).toThrow(RangeError);
    expect((): Uint8Array => generateStrataPixels(64, 2048, 1)).toThrow(RangeError);
    expect((): Uint8Array => generateSandNormalPixels(64, 1, -1.5)).toThrow(RangeError);
    expect((): Uint8Array => generateSandNormalPixels(64, 1, 0)).toThrow(RangeError);
  });

  it('throws TypeError for non-integer seeds (Failure Path 2)', (): void => {
    expect((): Uint8Array => generateGrainPixels(64, 1.5)).toThrow(TypeError);
    expect((): Uint8Array => generateStrataPixels(64, 64, Number.NaN)).toThrow(TypeError);
    expect((): Uint8Array => generateSandNormalPixels(64, 12.3, 2.0)).toThrow(TypeError);
  });
});
