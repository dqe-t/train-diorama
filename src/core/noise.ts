import { SplineSample } from '../types/diorama';

export const WATER_LEVEL_Y = 0.22;
export const MIN_TRACK_Y = 0.44;
export const DIORAMA_SPAN = 16.0;

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

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
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
  const sx = smoothstep(x - x0);
  const sz = smoothstep(z - z0);

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

export function sampleNaturalTerrainHeight(worldX: number, worldZ: number, seed: number): number {
  validateFinite(worldX, 'worldX');
  validateFinite(worldZ, 'worldZ');
  validateFinite(seed, 'seed');

  // Domain warp for organic hillside contours
  const warpX = worldX + (valueNoise2D(worldX * 0.22, worldZ * 0.22, seed + 19) - 0.5) * 2.2;
  const warpZ = worldZ + (valueNoise2D(worldX * 0.22, worldZ * 0.22, seed + 47) - 0.5) * 2.2;

  const baseNoise = fractalNoise2D(warpX + 20, warpZ + 20, seed);
  const ridgeNoise = Math.pow(fractalNoise2D(warpX * 0.9 - 10, warpZ * 0.9 + 15, seed + 311), 1.6);

  // Sculpt rolling hills and a picturesque mountain corner
  let elevation = 0.28 + baseNoise * 1.15 + ridgeNoise * 1.45;

  // Carve an organic winding river valley across the landscape
  const phase = (seed % 17) * 0.35;
  const riverCenterZ =
    Math.sin(worldX * 0.34 + phase) * 2.4 + Math.cos(worldX * 0.17 - phase) * 1.1;
  const riverDist = Math.abs(worldZ - riverCenterZ);
  const riverWidth = 1.55 + valueNoise2D(worldX * 0.3, worldZ * 0.3, seed + 88) * 0.65;

  if (riverDist < riverWidth * 2.3) {
    const bankBlend = smoothstep(riverDist / (riverWidth * 2.3));
    const riverbedY = -0.18 + baseNoise * 0.14;
    elevation = lerp(riverbedY, elevation, bankBlend);
  }

  return elevation;
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
  if (naturalY < WATER_LEVEL_Y + 0.03 || splineSamples.length === 0) {
    // Do not raise riverbed under water bridges; let viaduct piers span over water
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

  const dist = Math.sqrt(minDistSq);
  const innerRadius = 0.34;
  const t = smoothstep((dist - innerRadius) / (corridorRadius - innerRadius));
  const targetBedY = nearestTrackY - 0.03;

  return lerp(targetBedY, naturalY, t);
}

export function computeTerrainVertexColor(
  height: number,
  slope: number,
  variation: number
): readonly [number, number, number] {
  validateFinite(height, 'height');
  validateFinite(slope, 'slope');
  validateFinite(variation, 'variation');
  if (slope < 0) {
    throw new RangeError('CRITICAL: slope must be non-negative.');
  }

  // Submerged sand & wet riverbank
  if (height < WATER_LEVEL_Y + 0.09) {
    return [0.83, 0.75, 0.56];
  }
  // Steep rocky cliff faces
  if (slope > 0.56) {
    return [0.54, 0.53, 0.50];
  }
  // High alpine snow/rock peaks
  if (height > 1.88) {
    return [0.93, 0.95, 0.96];
  }
  if (height > 1.48) {
    return [0.58, 0.61, 0.55];
  }
  // Highland sage green
  if (height > 0.95) {
    const v = (variation - 0.5) * 0.05;
    return [0.42 + v, 0.63 + v, 0.35 + v];
  }
  // Lush spring meadow grass
  const v = (variation - 0.5) * 0.06;
  return [0.51 + v, 0.74 + v, 0.41 + v];
}
