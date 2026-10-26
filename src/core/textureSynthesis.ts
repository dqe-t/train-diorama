import { STRATA_BOTTOM_Y, STRATA_TOP_Y, strataColorAtHeight } from './desertPalette';
import { hashCoords } from './noise';

function validatePowerOfTwo(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 16 || value > 1024 || (value & (value - 1)) !== 0) {
    throw new RangeError(`CRITICAL: ${name} must be a power of two between 16 and 1024.`);
  }
}

function validateSeed(seed: number): void {
  if (!Number.isInteger(seed)) {
    throw new TypeError('CRITICAL: seed must be an integer.');
  }
}

function toByte(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
}

/** Value noise whose lattice wraps every `period` cells, so the result tiles seamlessly. */
function periodicValueNoise(x: number, y: number, period: number, seed: number): number {
  const wrap = (v: number): number => ((v % period) + period) % period;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hashCoords(wrap(x0), wrap(y0), seed);
  const n10 = hashCoords(wrap(x0 + 1), wrap(y0), seed);
  const n01 = hashCoords(wrap(x0), wrap(y0 + 1), seed);
  const n11 = hashCoords(wrap(x0 + 1), wrap(y0 + 1), seed);

  const a = n00 + (n10 - n00) * sx;
  const b = n01 + (n11 - n01) * sx;
  return a + (b - a) * sy;
}

/**
 * Tileable greyscale sand-grain detail (RGBA, values around 0.9).
 * Used both as a color multiplier and as a bump map.
 */
export function generateGrainPixels(size: number, seed: number): Uint8Array {
  validatePowerOfTwo(size, 'size');
  validateSeed(seed);

  const data = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const medium = periodicValueNoise((px / size) * 8, (py / size) * 8, 8, seed);
      const fine = hashCoords(px, py, seed + 7);
      let v = 0.9 + (medium - 0.5) * 0.12 + (fine - 0.5) * 0.1;
      if (fine > 0.985) v -= 0.18; // dark pebble speckles
      if (fine < 0.012) v += 0.08; // bright sand glints
      const b = toByte(v);
      const i = (py * size + px) * 4;
      data[i] = b;
      data[i + 1] = b;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

/**
 * Horizontal sandstone strata bands for the diorama cutaway sides (RGBA, sRGB).
 * Row 0 corresponds to STRATA_BOTTOM_Y, the last row to STRATA_TOP_Y.
 */
export function generateStrataPixels(width: number, height: number, seed: number): Uint8Array {
  validatePowerOfTwo(width, 'width');
  validatePowerOfTwo(height, 'height');
  validateSeed(seed);

  const data = new Uint8Array(width * height * 4);
  const range = STRATA_TOP_Y - STRATA_BOTTOM_Y;

  for (let py = 0; py < height; py += 1) {
    const worldY = STRATA_BOTTOM_Y + ((py + 0.5) / height) * range;
    for (let px = 0; px < width; px += 1) {
      const wobble = (periodicValueNoise((px / width) * 4, (py / height) * 6, 4, seed) - 0.5) * 0.08;
      const color = strataColorAtHeight(worldY + wobble);
      const grain = 1 + (hashCoords(px, py, seed + 3) - 0.5) * 0.12;
      const i = (py * width + px) * 4;
      data[i] = toByte(color[0] * grain);
      data[i + 1] = toByte(color[1] * grain);
      data[i + 2] = toByte(color[2] * grain);
      data[i + 3] = 255;
    }
  }
  return data;
}

/**
 * Tangent-space normal map generated from periodic sand grain noise.
 * Encodes [Nx, Ny, Nz] in [R, G, B] as [0..255] with seamless wrap-around tiling.
 */
export function generateSandNormalPixels(size: number, seed: number, strength: number): Uint8Array {
  validatePowerOfTwo(size, 'size');
  validateSeed(seed);
  if (typeof strength !== 'number' || !Number.isFinite(strength) || strength <= 0) {
    throw new RangeError('CRITICAL: strength must be a positive finite number.');
  }

  const heightField = new Float32Array(size * size);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const medium = periodicValueNoise((px / size) * 8, (py / size) * 8, 8, seed);
      const fine = hashCoords(px, py, seed + 7);
      let v = medium * 0.7 + fine * 0.3;
      if (fine > 0.985) v -= 0.35; // recessed pebble edges
      if (fine < 0.012) v += 0.25; // raised sand crests
      heightField[py * size + px] = v;
    }
  }

  const data = new Uint8Array(size * size * 4);
  const wrap = (coord: number): number => ((coord % size) + size) % size;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const hL = heightField[py * size + wrap(px - 1)];
      const hR = heightField[py * size + wrap(px + 1)];
      const hD = heightField[wrap(py - 1) * size + px];
      const hU = heightField[wrap(py + 1) * size + px];

      const dx = (hR - hL) * strength;
      const dy = (hU - hD) * strength;
      const invLen = 1 / Math.hypot(-dx, -dy, 1.0);

      const nx = -dx * invLen;
      const ny = -dy * invLen;
      const nz = 1.0 * invLen;

      const i = (py * size + px) * 4;
      data[i] = toByte(nx * 0.5 + 0.5);
      data[i + 1] = toByte(ny * 0.5 + 0.5);
      data[i + 2] = toByte(nz * 0.5 + 0.5);
      data[i + 3] = 255;
    }
  }
  return data;
}
