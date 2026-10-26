import { SplineSample } from '../types/diorama';

export const DIORAMA_SPAN = 16.0;
/** Elevation of the flat desert basin floor. */
export const PLAIN_Y = 0.42;
/** Elevation of the dry arroyo (wash) bed. */
export const WASH_BED_Y = 0.1;
/** Lowest allowed rail-head elevation (keeps trestles above the wash). */
export const MIN_TRACK_Y = 0.47;

/** Mesa mask thresholds for each terraced cliff tier. */
const MESA_THRESHOLDS: readonly [number, number, number] = [0.545, 0.625, 0.69];
/** Height gained when crossing each cliff tier. */
const MESA_TIER_HEIGHTS: readonly [number, number, number] = [0.5, 0.48, 0.42];
/** Mask width over which a cliff rises (smaller = more vertical). */
const CLIFF_SHARPNESS = 0.012;

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

/** 0..~1 mask: high values become terraced mesas & buttes. */
export function sampleMesaMask(worldX: number, worldZ: number, seed: number): number {
  validateFinite(worldX, 'worldX');
  validateFinite(worldZ, 'worldZ');
  validateFinite(seed, 'seed');

  const warpX = worldX + (valueNoise2D(worldX * 0.25, worldZ * 0.25, seed + 19) - 0.5) * 2.6;
  const warpZ = worldZ + (valueNoise2D(worldX * 0.25, worldZ * 0.25, seed + 47) - 0.5) * 2.6;
  let mask = fractalNoise2D(warpX * 1.1 + 40, warpZ * 1.1 + 40, seed + 5);

  // Keep a broad, flat central basin for the town and rails
  const radial = Math.hypot(worldX, worldZ);
  mask -= 0.14 * (1 - smoothRange(2.5, 6.5, radial));

  // Raise a rocky rim near the diorama edges for a framed canyon look
  const edge = Math.max(Math.abs(worldX), Math.abs(worldZ));
  mask += 0.12 * smoothRange(5.5, 8.0, edge);

  return mask;
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

  // Terraced mesas: a soft talus apron, then near-vertical sandstone cliffs per tier
  const mask = sampleMesaMask(worldX, worldZ, seed);
  height += 0.12 * smoothRange(MESA_THRESHOLDS[0] - 0.08, MESA_THRESHOLDS[0], mask);
  for (let tier = 0; tier < MESA_THRESHOLDS.length; tier += 1) {
    const threshold = MESA_THRESHOLDS[tier];
    height += MESA_TIER_HEIGHTS[tier] * smoothRange(threshold, threshold + CLIFF_SHARPNESS, mask);
  }

  // Carve the dry arroyo — through mesas it becomes a slot canyon
  const wash = sampleWashFactor(worldX, worldZ, seed);
  if (wash > 0) {
    const bedY = WASH_BED_Y + (valueNoise2D(worldX * 1.4, worldZ * 1.4, seed + 23) - 0.5) * 0.04;
    height = lerp(height, bedY, wash);
  }

  return height;
}

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

  const naturalY = sampleNaturalTerrainHeight(worldX, worldZ, seed);
  if (splineSamples.length === 0) {
    return naturalY;
  }

  let minDistSq = Number.POSITIVE_INFINITY;
  let nearestTrackY = naturalY;
  for (let i = 0; i < splineSamples.length; i += 2) {
    const s = splineSamples[i];
    const dx = worldX - s.x;
    const dz = worldZ - s.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      nearestTrackY = s.y;
    }
  }

  const corridorRadius = 1.15;
  if (minDistSq >= corridorRadius * corridorRadius) {
    return naturalY;
  }

  const t = smoothRange(0.34, corridorRadius, Math.sqrt(minDistSq));
  const targetBedY = nearestTrackY - 0.03;
  const fill = targetBedY - naturalY;

  if (fill <= 0) {
    // Cutting: carve the hillside / mesa down to the track grade
    return lerp(targetBedY, naturalY, t);
  }

  // Embankment: small gaps get filled, deep gaps fade out (trestle bridges span them)
  const fillFade = 1 - smoothRange(0.1, 0.24, fill);
  return naturalY + fill * (1 - t) * fillFade;
}
