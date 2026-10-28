import { sampleNaturalTerrainHeight } from './noise';
import { SculptStamp } from '../types/diorama';

/**
 * Typical height of a single mesa tier in the diorama (~0.80m).
 * Lifting/lowering operates at 10% of this height (0.08m) per click.
 */
export const TYPICAL_MESA_HEIGHT = 0.80;
export const SCULPT_HEIGHT_STEP = 0.08;
export const SCULPT_BRUSH_RADIUS = 1.35;

/** Maximum cumulative offset bounds to prevent inversion below plinth or unbounded spikes. */
const MIN_TOTAL_DELTA = -0.64;
const MAX_TOTAL_DELTA = 0.96;

function validateFiniteNumber(value: number, paramName: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`CRITICAL: ${paramName} must be a finite number.`);
  }
}

/**
 * C1-continuous radial bell-curve falloff kernel:
 * (1 - (dist / radius)^2)^2 for dist <= radius; 0 otherwise.
 */
export function sculptBrushFalloff(distance: number, radius: number): number {
  validateFiniteNumber(distance, 'distance');
  validateFiniteNumber(radius, 'radius');
  if (radius <= 0) {
    throw new RangeError('CRITICAL: radius must be strictly positive.');
  }
  if (distance < 0) {
    throw new RangeError('CRITICAL: distance cannot be negative.');
  }
  if (distance >= radius) {
    return 0;
  }
  const ratio = distance / radius;
  const factor = 1 - ratio * ratio;
  return factor * factor;
}

/**
 * Computes cumulative elevation offset at (worldX, worldZ) from all sculpt stamps.
 */
export function sampleSculptOffset(
  worldX: number,
  worldZ: number,
  stamps: ReadonlyArray<SculptStamp>
): number {
  validateFiniteNumber(worldX, 'worldX');
  validateFiniteNumber(worldZ, 'worldZ');
  if (!Array.isArray(stamps)) {
    throw new TypeError('CRITICAL: stamps must be an array.');
  }

  let totalOffset = 0;
  for (let i = 0; i < stamps.length; i += 1) {
    const stamp = stamps[i];
    const dx = Math.abs(worldX - stamp.x);
    if (dx >= stamp.radius) {
      continue;
    }
    const dz = Math.abs(worldZ - stamp.z);
    if (dz >= stamp.radius) {
      continue;
    }
    const dist = Math.hypot(dx, dz);
    if (dist < stamp.radius) {
      totalOffset += stamp.delta * sculptBrushFalloff(dist, stamp.radius);
    }
  }

  return totalOffset;
}

/**
 * Composite terrain elevation combining natural fractal/mesa terrain and sculpt offsets.
 */
export function sampleCompositeTerrainHeight(
  worldX: number,
  worldZ: number,
  seed: number,
  stamps: ReadonlyArray<SculptStamp>
): number {
  validateFiniteNumber(worldX, 'worldX');
  validateFiniteNumber(worldZ, 'worldZ');
  validateFiniteNumber(seed, 'seed');
  if (!Array.isArray(stamps)) {
    throw new TypeError('CRITICAL: stamps must be an array.');
  }

  const natural = sampleNaturalTerrainHeight(worldX, worldZ, seed);
  const offset = sampleSculptOffset(worldX, worldZ, stamps);
  return natural + offset;
}

/**
 * Applies a lift (+0.08m) or lower (-0.08m) brush stamp at (targetX, targetZ).
 * Merges with existing nearby stamps to maintain high performance.
 */
export function applySculptStamp(
  stamps: ReadonlyArray<SculptStamp>,
  targetX: number,
  targetZ: number,
  direction: 'lift' | 'lower',
  step: number = SCULPT_HEIGHT_STEP,
  radius: number = SCULPT_BRUSH_RADIUS
): ReadonlyArray<SculptStamp> {
  if (!Array.isArray(stamps)) {
    throw new TypeError('CRITICAL: stamps must be an array.');
  }
  validateFiniteNumber(targetX, 'targetX');
  validateFiniteNumber(targetZ, 'targetZ');
  validateFiniteNumber(step, 'step');
  validateFiniteNumber(radius, 'radius');
  if (direction !== 'lift' && direction !== 'lower') {
    throw new TypeError(`CRITICAL: Invalid sculpt direction "${String(direction)}". Must be 'lift' or 'lower'.`);
  }
  if (radius <= 0) {
    throw new RangeError('CRITICAL: radius must be strictly positive.');
  }
  if (step <= 0) {
    throw new RangeError('CRITICAL: step must be strictly positive.');
  }

  const sign = direction === 'lift' ? 1 : -1;
  const delta = sign * step;

  // Search for an existing stamp close enough to merge
  const mergeDistance = radius * 0.35;
  let mergeIndex = -1;
  for (let i = 0; i < stamps.length; i += 1) {
    const s = stamps[i];
    if (Math.hypot(s.x - targetX, s.z - targetZ) <= mergeDistance) {
      mergeIndex = i;
      break;
    }
  }

  if (mergeIndex >= 0) {
    const existing = stamps[mergeIndex];
    const updatedDelta = Math.max(MIN_TOTAL_DELTA, Math.min(MAX_TOTAL_DELTA, existing.delta + delta));
    const nextStamps = [...stamps];
    nextStamps[mergeIndex] = {
      ...existing,
      delta: updatedDelta,
    };
    return nextStamps;
  }

  const newStamp: SculptStamp = {
    id: `stamp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    x: targetX,
    z: targetZ,
    delta,
    radius,
  };
  return [...stamps, newStamp];
}
