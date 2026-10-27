import { SplineSample } from '../types/diorama';

export const DIORAMA_SPAN = 16.0;
/** Elevation of the flat desert basin floor. */
export const PLAIN_Y = 0.42;
/** Elevation of the dry arroyo (wash) bed. */
export const WASH_BED_Y = 0.1;
/** Minimal clearance above natural terrain for the track bed. */
export const TRACK_BED_OFFSET = 0.04;

/** Two distinct plateau tiers: Lower Mesa (Tier 1) and Upper Backdrop Mesa (Tier 2). */
export const MESA_THRESHOLDS: readonly [number, number] = [0.46, 0.68];
/** Height gained when crossing each cliff tier (Tier 1 rises +0.78m, Tier 2 rises +0.86m). */
export const MESA_TIER_HEIGHTS: readonly [number, number] = [0.78, 0.86];
/** Mask width over which a cliff rises (smaller = more vertical). */
const CLIFF_SHARPNESS = 0.026;

function validateFinite(value: number, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`CRITICAL: ${name} must be a finite number.`);
  }
}

export function hashCoords(x: number, z: number, seed: number): number {
  validateFinite(x, 'x');
  validateFinite(z, 'z');
  validateFinite(seed, 'seed');

  let h = Math.imul(Math.floor(x) ^ Math.floor(seed), 374761393);
  h = Math.imul(h ^ Math.floor(z), 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function smoothRange(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function valueNoise2D(x: number, z: number, seed: number): number {
  validateFinite(x, 'x');
  validateFinite(z, 'z');
  validateFinite(seed, 'seed');

  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const sx = smoothRange(0, 1, x - x0);
  const sz = smoothRange(0, 1, z - z0);

  const n00 = hashCoords(x0, z0, seed);
  const n10 = hashCoords(x0 + 1, z0, seed);
  const n01 = hashCoords(x0, z0 + 1, seed);
  const n11 = hashCoords(x0 + 1, z0 + 1, seed);

  return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sz);
}

export function fractalNoise2D(x: number, z: number, seed: number): number {
  validateFinite(x, 'x');
  validateFinite(z, 'z');
  validateFinite(seed, 'seed');

  let amp = 1.0;
  let freq = 0.16;
  let sum = 0;
  let norm = 0;

  for (let i = 0; i < 4; i += 1) {
    sum += valueNoise2D(x * freq, z * freq, seed + i * 131) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return sum / norm;
}

/**
 * 0..~1 mask: high values become terraced mesas & buttes.
 * Stepped primarily towards the rear backdrop (-X, -Z) so mesas form a theatrical
 * backdrop wall and never obstruct trains and tracks running in the open foreground (+X, +Z).
 */
export function sampleMesaMask(worldX: number, worldZ: number, seed: number): number {
  validateFinite(worldX, 'worldX');
  validateFinite(worldZ, 'worldZ');
  validateFinite(seed, 'seed');

  // Low-frequency organic domain warping for natural, winding cliff lines
  const warpX = worldX + (valueNoise2D(worldX * 0.22, worldZ * 0.22, seed + 19) - 0.5) * 3.2;
  const warpZ = worldZ + (valueNoise2D(worldX * 0.22, worldZ * 0.22, seed + 47) - 0.5) * 3.2;

  // Depth along the viewing axis: camera is at (+22, +22, +22) looking towards (0, 0, 0)
  // (-warpX - warpZ) is positive in the rear/backdrop, negative in the foreground
  const rearDepth = -(warpX + warpZ) / 1.4142;

  // Organic canyon ridge fractal noise
  const ridgeNoise = fractalNoise2D(warpX * 0.85 + 45, warpZ * 0.85 + 45, seed + 9);

  // Backdrop progression: 0 in the foreground, smoothly ramping up towards the rear
  const backdropBias = smoothRange(-2.0, 7.0, rearDepth);

  // Combine backdrop ramp with fractal ridge contours
  let mask = backdropBias * 0.62 + ridgeNoise * 0.46;

  // In the foreground (warpX + warpZ > 0.8), strictly suppress the mask so the view of trains is unobstructed
  const frontWeight = smoothRange(0.2, 3.8, warpX + warpZ);
  mask *= 1 - frontWeight * 0.82;

  // Gentle boundary fade at outer edges of the diorama block
  const edge = Math.max(Math.abs(worldX), Math.abs(worldZ));
  if (edge > 6.5) {
    mask -= smoothRange(6.5, 8.0, edge) * 0.12;
  }

  return Math.max(0, Math.min(1, mask));
}

/** 0 = outside the dry wash, 1 = on the arroyo bed. */
export function sampleWashFactor(worldX: number, worldZ: number, seed: number): number {
  validateFinite(worldX, 'worldX');
  validateFinite(worldZ, 'worldZ');
  validateFinite(seed, 'seed');

  const phase = (seed % 17) * 0.35;
  const centerZ =
    Math.sin(worldX * 0.3 + phase) * 2.6 +
    Math.cos(worldX * 0.13 - phase) * 1.2 +
    (valueNoise2D(worldX * 0.5, 3.0, seed + 61) - 0.5) * 1.0;
  const width = 0.7 + valueNoise2D(worldX * 0.35, 7.0, seed + 88) * 0.45;
  const dist = Math.abs(worldZ - centerZ);

  return 1 - smoothRange(width * 0.55, width * 1.15, dist);
}

export function sampleNaturalTerrainHeight(worldX: number, worldZ: number, seed: number): number {
  validateFinite(worldX, 'worldX');
  validateFinite(worldZ, 'worldZ');
  validateFinite(seed, 'seed');

  // Flat desert floor with very gentle dune undulation
  let height = PLAIN_Y + (valueNoise2D(worldX * 0.6, worldZ * 0.6, seed + 7) - 0.5) * 0.05;

  const mask = sampleMesaMask(worldX, worldZ, seed);

  // Soft talus scree apron before Level 1 cliff
  height += 0.10 * smoothRange(MESA_THRESHOLDS[0] - 0.08, MESA_THRESHOLDS[0], mask);

  // Two distinct stepped plateau tiers
  for (let tier = 0; tier < MESA_THRESHOLDS.length; tier += 1) {
    const threshold = MESA_THRESHOLDS[tier];
    height += MESA_TIER_HEIGHTS[tier] * smoothRange(threshold, threshold + CLIFF_SHARPNESS, mask);
  }

  // Carve the dry arroyo wash
  const wash = sampleWashFactor(worldX, worldZ, seed);
  if (wash > 0) {
    const bedY = WASH_BED_Y + (valueNoise2D(worldX * 1.4, worldZ * 1.4, seed + 23) - 0.5) * 0.04;
    height = lerp(height, bedY, wash);
  }

  return height;
}

/**
 * Natural untouched landscape height.
 * The landscape is NEVER modified or flattened by train tracks;
 * tracks instead conform to the landscape and are elevated on substructures.
 */
export function sampleTerraformedHeight(
  worldX: number,
  worldZ: number,
  seed: number,
  splineSamples: ReadonlyArray<SplineSample>
): number {
  validateFinite(worldX, 'worldX');
  validateFinite(worldZ, 'worldZ');
  validateFinite(seed, 'seed');
  if (!Array.isArray(splineSamples)) {
    throw new TypeError('CRITICAL: splineSamples must be an array.');
  }

  return sampleNaturalTerrainHeight(worldX, worldZ, seed);
}
