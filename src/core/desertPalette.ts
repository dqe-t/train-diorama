import { PLAIN_Y, smoothRange } from './noise';

/** sRGB color triple with channels in [0, 1]. */
export type Rgb = readonly [number, number, number];

/** Bottom / top of the world-space strata column (also used by the cutaway skirt). */
export const STRATA_BOTTOM_Y = -0.55;
export const STRATA_TOP_Y = 2.6;

interface StrataLayer {
  readonly top: number;
  readonly color: Rgb;
}

/**
 * Colorado-Plateau-inspired rock column (bottom → top):
 * dark basement, pale shale, chocolate Moenkopi, salmon Entrada, cream Navajo cap.
 */
/** Soft terracotta "modelling clay" strata: low contrast, wide bands, no harsh streaks. */
const STRATA_LAYERS: ReadonlyArray<StrataLayer> = [
  { top: -0.2, color: [0.5, 0.27, 0.18] },
  { top: 0.1, color: [0.64, 0.34, 0.22] },
  { top: 0.35, color: [0.75, 0.41, 0.25] },
  { top: 0.62, color: [0.81, 0.46, 0.28] },
  { top: 0.85, color: [0.75, 0.4, 0.24] },
  { top: 1.1, color: [0.83, 0.48, 0.29] },
  { top: 1.3, color: [0.87, 0.54, 0.33] },
  { top: 1.55, color: [0.79, 0.43, 0.26] },
  { top: 1.8, color: [0.85, 0.5, 0.3] },
  { top: Number.POSITIVE_INFINITY, color: [0.9, 0.58, 0.36] },
];

const DESERT_FLOOR: Rgb = [0.89, 0.53, 0.32];
const PLATEAU_TOP: Rgb = [0.88, 0.54, 0.33];
const CAP_TOP: Rgb = [0.91, 0.6, 0.38];
const WASH_SAND: Rgb = [0.94, 0.69, 0.46];
const WASH_PEBBLE: Rgb = [0.86, 0.61, 0.41];

export interface TerrainColorInput {
  readonly height: number;
  /** Surface gradient magnitude (rise / run), >= 0. */
  readonly slope: number;
  /** High-frequency grain noise in [0, 1]. */
  readonly grain: number;
  /** Vertical streak noise in [0, 1] (desert varnish on cliffs). */
  readonly streak: number;
  /** 0 = outside wash, 1 = on the wash bed. */
  readonly washFactor: number;
}

function validateFinite(value: number, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`CRITICAL: ${name} must be a finite number.`);
  }
}

function validateUnit(value: number, name: string): void {
  validateFinite(value, name);
  if (value < 0 || value > 1) {
    throw new RangeError(`CRITICAL: ${name} must be within [0, 1].`);
  }
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const c = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * c, a[1] + (b[1] - a[1]) * c, a[2] + (b[2] - a[2]) * c];
}

function clampRgb(c: Rgb): Rgb {
  return [
    Math.max(0, Math.min(1, c[0])),
    Math.max(0, Math.min(1, c[1])),
    Math.max(0, Math.min(1, c[2])),
  ];
}

/** Sandstone strata color at a given world elevation (shared by cliffs and cutaway sides). */
export function strataColorAtHeight(worldY: number): Rgb {
  validateFinite(worldY, 'worldY');
  const layer = STRATA_LAYERS.find((l): boolean => worldY < l.top);
  if (!layer) {
    throw new RangeError('CRITICAL: No strata layer found for elevation.');
  }
  // Wide, soft sedimentary bands (clay-sculpted look, not fine noisy laminations)
  const lamination = 1 + Math.sin(worldY * 26) * 0.03;
  return clampRgb([
    layer.color[0] * lamination,
    layer.color[1] * lamination,
    layer.color[2] * lamination,
  ]);
}

export function computeTerrainVertexColor(input: TerrainColorInput): Rgb {
  if (!input) {
    throw new TypeError('CRITICAL: TerrainColorInput is required.');
  }
  validateFinite(input.height, 'height');
  validateFinite(input.slope, 'slope');
  if (input.slope < 0) {
    throw new RangeError('CRITICAL: slope must be non-negative.');
  }
  validateUnit(input.grain, 'grain');
  validateUnit(input.streak, 'streak');
  validateUnit(input.washFactor, 'washFactor');

  const { height, slope, grain, streak, washFactor } = input;
  const steep = smoothRange(0.5, 1.1, slope);

  // Cliff faces: soft horizontal clay strata, slightly deeper than the flats
  const wobble = (streak - 0.5) * 0.04;
  const strata = strataColorAtHeight(height + wobble);
  const cliff: Rgb = [strata[0] * 0.95, strata[1] * 0.92, strata[2] * 0.92];

  // Flat surfaces: basin floor → plateau tops → paler cap rock
  let flat = mixRgb(DESERT_FLOOR, PLATEAU_TOP, smoothRange(PLAIN_Y + 0.3, PLAIN_Y + 0.5, height));
  flat = mixRgb(flat, CAP_TOP, smoothRange(PLAIN_Y + 1.5, PLAIN_Y + 1.7, height));

  let color = mixRgb(flat, cliff, steep);

  // Dry wash: pale sandy path with a few soft pebble patches
  const washColor = mixRgb(WASH_SAND, WASH_PEBBLE, smoothRange(0.6, 0.8, grain) * 0.5);
  color = mixRgb(color, washColor, washFactor * (1 - steep * 0.7));

  // Very subtle low-frequency tonal variation (no per-vertex speckle)
  const shift = (grain - 0.5) * 0.025;
  return clampRgb([color[0] + shift, color[1] + shift, color[2] + shift]);
}

/**
 * Cheap baked ambient occlusion for clay-like depth.
 * Concave spots (cliff feet, wash banks) darken; convex rims get a slight highlight.
 * Returns a color multiplier.
 */
export function computeCavityOcclusion(
  height: number,
  neighborhoodAverage: number,
  strength: number
): number {
  validateFinite(height, 'height');
  validateFinite(neighborhoodAverage, 'neighborhoodAverage');
  validateUnit(strength, 'strength');

  const concavity = neighborhoodAverage - height;
  const occlusion = smoothRange(0, 0.35, concavity);
  const convexity = smoothRange(0, 0.25, -concavity);
  return 1 - strength * occlusion + 0.05 * convexity;
}
