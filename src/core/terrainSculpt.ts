import { PLAIN_Y, sampleNaturalTerrainHeight } from './noise';
import { MesaStamp, RampSegment, SculptStamp } from '../types/diorama';

/**
 * Typical height of a single mesa tier in the diorama (~0.80m).
 * Lifting/lowering operates at 10% of this height (0.08m) per click.
 */
export const TYPICAL_MESA_HEIGHT = 0.80;
export const SCULPT_HEIGHT_STEP = 0.08;
export const SCULPT_BRUSH_RADIUS = 1.35;

/** Standard mesa plateau geometry: Tier 1 plateau sits at ~1.20m with steep cliff walls. */
export const MESA_PLATEAU_RADIUS = 2.1;
export const MESA_TIER1_TARGET_Y = 1.20;
export const MESA_CLIFF_WIDTH = 0.38;

/** Default width for earthen ramps connecting desert basin to mesa rim. */
export const RAMP_DEFAULT_WIDTH = 1.40;

const MIN_TOTAL_DELTA = -0.64;
const MAX_TOTAL_DELTA = 0.96;

function validateFiniteNumber(value: number, paramName: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`CRITICAL: ${paramName} must be a finite number.`);
  }
}

/** C1-continuous radial bell-curve falloff kernel: (1 - (dist / radius)^2)^2 for dist <= radius. */
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
 * Tier Isolation: vertices above plain elevation (cliffs and mesa tops) are masked to 0
 * so lifting/lowering the ground never deforms or raises the mesas.
 */
export function sampleSculptOffset(
  worldX: number,
  worldZ: number,
  stamps: ReadonlyArray<SculptStamp>,
  baseHeight: number = PLAIN_Y
): number {
  validateFiniteNumber(worldX, 'worldX');
  validateFiniteNumber(worldZ, 'worldZ');
  validateFiniteNumber(baseHeight, 'baseHeight');
  if (!Array.isArray(stamps)) {
    throw new TypeError('CRITICAL: stamps must be an array.');
  }

  // Tier Isolation: fade influence to 0 as baseHeight approaches mesa cliff tier
  const tierWeight = Math.max(0, Math.min(1, 1 - (baseHeight - PLAIN_Y) / 0.28));
  if (tierWeight <= 0) {
    return 0;
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
      totalOffset += stamp.delta * sculptBrushFalloff(dist, stamp.radius) * tierWeight;
    }
  }

  return totalOffset;
}

/**
 * Evaluates mesa plateau stamps at (worldX, worldZ) creating flat-topped mesas with steep cliffs.
 */
export function sampleMesaLayerHeight(
  worldX: number,
  worldZ: number,
  baseHeight: number,
  mesaStamps: ReadonlyArray<MesaStamp>
): number {
  validateFiniteNumber(worldX, 'worldX');
  validateFiniteNumber(worldZ, 'worldZ');
  validateFiniteNumber(baseHeight, 'baseHeight');
  if (!Array.isArray(mesaStamps)) {
    throw new TypeError('CRITICAL: mesaStamps must be an array.');
  }

  let current = baseHeight;
  for (let i = 0; i < mesaStamps.length; i += 1) {
    const stamp = mesaStamps[i];
    const dist = Math.hypot(worldX - stamp.x, worldZ - stamp.z);
    if (dist >= stamp.radius) {
      continue;
    }

    const flatRadius = Math.max(0.1, stamp.radius - MESA_CLIFF_WIDTH);
    let cliffWeight = 1.0;
    if (dist > flatRadius) {
      const t = (dist - flatRadius) / MESA_CLIFF_WIDTH;
      cliffWeight = (1 - t) * (1 - t) * (3 - 2 * (1 - t));
    }

    if (!stamp.isCarve) {
      const plateauY = current + (stamp.targetHeight - current) * cliffWeight;
      current = Math.max(current, plateauY);
    } else {
      const carvedY = current + (PLAIN_Y - current) * cliffWeight;
      current = Math.min(current, carvedY);
    }
  }

  return current;
}

/** Evaluates linear ramp corridors connecting desert basin to mesa rims with smooth railway grade. */
export function sampleRampLayerHeight(
  worldX: number,
  worldZ: number,
  currentHeight: number,
  ramps: ReadonlyArray<RampSegment>
): number {
  validateFiniteNumber(worldX, 'worldX');
  validateFiniteNumber(worldZ, 'worldZ');
  validateFiniteNumber(currentHeight, 'currentHeight');
  if (!Array.isArray(ramps)) {
    throw new TypeError('CRITICAL: ramps must be an array.');
  }

  let height = currentHeight;
  for (let i = 0; i < ramps.length; i += 1) {
    const ramp = ramps[i];
    const dx = ramp.endX - ramp.startX;
    const dz = ramp.endZ - ramp.startZ;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 0.25) {
      continue;
    }

    const t = Math.max(0, Math.min(1, ((worldX - ramp.startX) * dx + (worldZ - ramp.startZ) * dz) / lenSq));
    const projX = ramp.startX + t * dx;
    const projZ = ramp.startZ + t * dz;
    const distFromCenterline = Math.hypot(worldX - projX, worldZ - projZ);

    const halfBed = ramp.width * 0.5;
    const shoulder = ramp.width * 0.45;
    const maxInfluence = halfBed + shoulder;

    if (distFromCenterline < maxInfluence) {
      const targetGradeY = ramp.startY + t * (ramp.endY - ramp.startY);
      let rampWeight = 1.0;
      if (distFromCenterline > halfBed) {
        const factor = (distFromCenterline - halfBed) / shoulder;
        rampWeight = (1 - factor) * (1 - factor);
      }
      height = height + (targetGradeY - height) * rampWeight;
    }
  }

  return height;
}

/**
 * Composite terrain elevation combining natural fractal/mesa terrain, custom mesa plateaus,
 * tier-isolated ground sculpt offsets, and earthen ramp corridors.
 */
export function sampleCompositeTerrainHeight(
  worldX: number,
  worldZ: number,
  seed: number,
  sculptStamps: ReadonlyArray<SculptStamp>,
  mesaStamps: ReadonlyArray<MesaStamp> = [],
  rampSegments: ReadonlyArray<RampSegment> = []
): number {
  validateFiniteNumber(worldX, 'worldX');
  validateFiniteNumber(worldZ, 'worldZ');
  validateFiniteNumber(seed, 'seed');

  const natural = sampleNaturalTerrainHeight(worldX, worldZ, seed);
  const withMesas = sampleMesaLayerHeight(worldX, worldZ, natural, mesaStamps);
  const withSculpt = withMesas + sampleSculptOffset(worldX, worldZ, sculptStamps, natural);
  return sampleRampLayerHeight(worldX, worldZ, withSculpt, rampSegments);
}

/**
 * Applies a lift (+0.08m) or lower (-0.08m) brush stamp at (targetX, targetZ).
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

/**
 * Adds a mesa plateau or carves an existing mesa at (targetX, targetZ).
 */
export function applyMesaStamp(
  mesaStamps: ReadonlyArray<MesaStamp>,
  targetX: number,
  targetZ: number,
  isCarve: boolean,
  targetHeight: number = MESA_TIER1_TARGET_Y,
  radius: number = MESA_PLATEAU_RADIUS
): ReadonlyArray<MesaStamp> {
  if (!Array.isArray(mesaStamps)) {
    throw new TypeError('CRITICAL: mesaStamps must be an array.');
  }
  validateFiniteNumber(targetX, 'targetX');
  validateFiniteNumber(targetZ, 'targetZ');
  validateFiniteNumber(targetHeight, 'targetHeight');
  validateFiniteNumber(radius, 'radius');
  if (typeof isCarve !== 'boolean') {
    throw new TypeError('CRITICAL: isCarve must be a boolean.');
  }
  if (radius <= 0) {
    throw new RangeError('CRITICAL: radius must be strictly positive.');
  }

  const newStamp: MesaStamp = {
    id: `mesa_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    x: targetX,
    z: targetZ,
    radius,
    targetHeight,
    isCarve,
  };
  return [...mesaStamps, newStamp];
}

/**
 * Adds a linear earthen ramp segment between (startX, startZ) and (endX, endZ).
 */
export function applyRampSegment(
  ramps: ReadonlyArray<RampSegment>,
  startX: number,
  startZ: number,
  startY: number,
  endX: number,
  endZ: number,
  endY: number,
  width: number = RAMP_DEFAULT_WIDTH
): ReadonlyArray<RampSegment> {
  if (!Array.isArray(ramps)) {
    throw new TypeError('CRITICAL: ramps must be an array.');
  }
  validateFiniteNumber(startX, 'startX');
  validateFiniteNumber(startZ, 'startZ');
  validateFiniteNumber(startY, 'startY');
  validateFiniteNumber(endX, 'endX');
  validateFiniteNumber(endZ, 'endZ');
  validateFiniteNumber(endY, 'endY');
  validateFiniteNumber(width, 'width');
  if (width <= 0) {
    throw new RangeError('CRITICAL: width must be strictly positive.');
  }

  const length = Math.hypot(endX - startX, endZ - startZ);
  if (length < 0.6) {
    throw new RangeError('CRITICAL: ramp length must be at least 0.6m.');
  }

  const newRamp: RampSegment = {
    id: `ramp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    startX,
    startZ,
    startY,
    endX,
    endZ,
    endY,
    width,
  };
  return [...ramps, newRamp];
}
