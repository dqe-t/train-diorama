import { NaturalProp, PlacedStructure, PropKind, SplineSample } from '../types/diorama';
import { hashCoords, PLAIN_Y, sampleTerraformedHeight, sampleWashFactor } from './noise';

const TRACK_CLEARANCE = 0.72;
const STRUCTURE_CLEARANCE = 0.85;
const ARCH_TRACK_CLEARANCE = 1.5;
const ARCH_SPAN_HALF = 0.62;
const MAX_ARCHES = 2;
const SCATTER_CELLS = 22;

function validateFinite(value: number, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`CRITICAL: ${name} must be a finite number.`);
  }
}

function validateArrays(
  samples: ReadonlyArray<SplineSample>,
  structures: ReadonlyArray<PlacedStructure>
): void {
  if (!Array.isArray(samples)) {
    throw new TypeError('CRITICAL: splineSamples must be an array.');
  }
  if (!Array.isArray(structures)) {
    throw new TypeError('CRITICAL: structures must be an array.');
  }
}

function minDistSqToTrack(x: number, z: number, samples: ReadonlyArray<SplineSample>): number {
  let best = Number.POSITIVE_INFINITY;
  for (const s of samples) {
    const d = (s.x - x) * (s.x - x) + (s.z - z) * (s.z - z);
    if (d < best) best = d;
  }
  return best;
}

function isNearStructure(
  x: number,
  z: number,
  structures: ReadonlyArray<PlacedStructure>,
  radius: number
): boolean {
  return structures.some(
    (st): boolean => (st.x - x) * (st.x - x) + (st.z - z) * (st.z - z) < radius * radius
  );
}

export function estimateSlope(
  x: number,
  z: number,
  seed: number,
  samples: ReadonlyArray<SplineSample>
): number {
  validateFinite(x, 'x');
  validateFinite(z, 'z');
  const e = 0.12;
  const dx =
    (sampleTerraformedHeight(x + e, z, seed, samples) -
      sampleTerraformedHeight(x - e, z, seed, samples)) /
    (2 * e);
  const dz =
    (sampleTerraformedHeight(x, z + e, seed, samples) -
      sampleTerraformedHeight(x, z - e, seed, samples)) /
    (2 * e);
  return Math.hypot(dx, dz);
}

/** Chooses a desert prop for a site, or null if the site stays bare (cliffs, empty sand). */
export function pickDesertPropKind(
  height: number,
  slope: number,
  washFactor: number,
  roll: number
): PropKind | null {
  validateFinite(height, 'height');
  validateFinite(slope, 'slope');
  validateFinite(washFactor, 'washFactor');
  validateFinite(roll, 'roll');
  if (slope < 0) {
    throw new RangeError('CRITICAL: slope must be non-negative.');
  }
  if (roll < 0 || roll > 1 || washFactor < 0 || washFactor > 1) {
    throw new RangeError('CRITICAL: roll and washFactor must be within [0, 1].');
  }

  if (slope > 0.55) return null;
  if (washFactor > 0.5) return roll > 0.7 ? 'boulder' : null;

  if (height - PLAIN_Y > 0.35) {
    if (roll > 0.72) return 'juniper';
    if (roll > 0.45) return 'sagebrush';
    if (roll > 0.35) return 'boulder';
    return null;
  }

  if (roll > 0.92) return 'hoodoo';
  if (roll > 0.74) return 'saguaro';
  if (roll > 0.52) return 'sagebrush';
  if (roll > 0.42) return 'boulder';
  if (roll > 0.36) return 'juniper';
  return null;
}

/** True when a structure may be placed: dry, not too steep, out of the wash. */
export function isBuildableSite(
  x: number,
  z: number,
  seed: number,
  samples: ReadonlyArray<SplineSample>
): boolean {
  validateFinite(x, 'x');
  validateFinite(z, 'z');
  if (!Array.isArray(samples)) {
    throw new TypeError('CRITICAL: splineSamples must be an array.');
  }
  if (sampleWashFactor(x, z, seed) > 0.3) {
    return false;
  }
  return estimateSlope(x, z, seed, samples) < 0.6;
}

function placeLandmarkArches(
  span: number,
  seed: number,
  samples: ReadonlyArray<SplineSample>,
  structures: ReadonlyArray<PlacedStructure>
): NaturalProp[] {
  const arches: NaturalProp[] = [];
  const half = span * 0.5 - 1.6;

  for (let attempt = 0; attempt < 48 && arches.length < MAX_ARCHES; attempt += 1) {
    const x = -half + hashCoords(attempt, 11, seed + 1201) * half * 2;
    const z = -half + hashCoords(attempt, 29, seed + 1307) * half * 2;
    const rotationY = hashCoords(attempt, 41, seed + 1409) * Math.PI;

    if (minDistSqToTrack(x, z, samples) < ARCH_TRACK_CLEARANCE * ARCH_TRACK_CLEARANCE) continue;
    if (isNearStructure(x, z, structures, 1.4)) continue;
    if (arches.some((a): boolean => Math.hypot(a.x - x, a.z - z) < 3.0)) continue;
    if (sampleWashFactor(x, z, seed) > 0.05) continue;

    // Both feet must stand on gentle ground
    const fx = Math.cos(rotationY) * ARCH_SPAN_HALF;
    const fz = -Math.sin(rotationY) * ARCH_SPAN_HALF;
    const feet: ReadonlyArray<readonly [number, number]> = [
      [x + fx, z + fz],
      [x - fx, z - fz],
    ];
    const footOk = feet.every(
      ([px, pz]): boolean =>
        sampleWashFactor(px, pz, seed) < 0.05 && estimateSlope(px, pz, seed, samples) < 0.35
    );
    if (!footOk || estimateSlope(x, z, seed, samples) > 0.3) continue;

    const y = Math.min(...feet.map(([px, pz]): number => sampleTerraformedHeight(px, pz, seed, samples)));
    arches.push({
      id: `arch-${attempt}`,
      kind: 'arch',
      x,
      y,
      z,
      scale: 1.05 + hashCoords(attempt, 53, seed + 1511) * 0.4,
      rotationY,
      colorVariant: attempt % 4,
    });
  }
  return arches;
}

export function scatterDesertProps(
  span: number,
  seed: number,
  samples: ReadonlyArray<SplineSample>,
  structures: ReadonlyArray<PlacedStructure>
): ReadonlyArray<NaturalProp> {
  validateFinite(span, 'span');
  if (span <= 2) {
    throw new RangeError('CRITICAL: span must be greater than 2.');
  }
  if (!Number.isInteger(seed)) {
    throw new TypeError('CRITICAL: seed must be an integer.');
  }
  validateArrays(samples, structures);

  const arches = placeLandmarkArches(span, seed, samples, structures);
  const props: NaturalProp[] = [...arches];
  const half = span * 0.5 - 0.5;
  const step = (half * 2) / SCATTER_CELLS;

  for (let gx = 0; gx < SCATTER_CELLS; gx += 1) {
    for (let gz = 0; gz < SCATTER_CELLS; gz += 1) {
      const jx = (hashCoords(gx, gz, seed + 101) - 0.5) * step * 0.85;
      const jz = (hashCoords(gx, gz, seed + 202) - 0.5) * step * 0.85;
      const x = -half + (gx + 0.5) * step + jx;
      const z = -half + (gz + 0.5) * step + jz;

      if (minDistSqToTrack(x, z, samples) < TRACK_CLEARANCE * TRACK_CLEARANCE) continue;
      if (isNearStructure(x, z, structures, STRUCTURE_CLEARANCE)) continue;
      if (arches.some((a): boolean => Math.hypot(a.x - x, a.z - z) < 1.0 * a.scale)) continue;

      const y = sampleTerraformedHeight(x, z, seed, samples);
      const slope = estimateSlope(x, z, seed, samples);
      const wash = sampleWashFactor(x, z, seed);
      const kind = pickDesertPropKind(y, slope, wash, hashCoords(gx, gz, seed + 709));
      if (kind === null) continue;

      props.push({
        id: `prop-${gx}-${gz}`,
        kind,
        x,
        y,
        z,
        scale: 0.78 + hashCoords(gx, gz, seed + 888) * 0.52,
        rotationY: hashCoords(gx, gz, seed + 999) * Math.PI * 2,
        colorVariant: Math.floor(hashCoords(gx, gz, seed + 555) * 4),
      });
    }
  }
  return props;
}
