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
const STRATA_LAYERS: ReadonlyArray<StrataLayer> = [
  { top: -0.2, color: [0.37, 0.23, 0.16] },
  { top: 0.05, color: [0.49, 0.27, 0.19] },
  { top: 0.18, color: [0.66, 0.47, 0.34] },
  { top: 0.42, color: [0.55, 0.3, 0.2] },
  { top: 0.62, color: [0.56, 0.29, 0.18] },
  { top: 0.72, color: [0.68, 0.38, 0.23] },
  { top: 0.92, color: [0.6, 0.31, 0.19] },
  { top: 1.18, color: [0.77, 0.4, 0.24] },
  { top: 1.3, color: [0.83, 0.53, 0.34] },
  { top: 1.44, color: [0.74, 0.38, 0.22] },
  { top: Number.POSITIVE_INFINITY, color: [0.9, 0.81, 0.64] },
];

const VARNISH: Rgb = [0.3, 0.19, 0.14];
const DESERT_FLOOR: Rgb = [0.86, 0.65, 0.43];
const PLATEAU_TOP: Rgb = [0.8, 0.54, 0.34];
const CAP_TOP: Rgb = [0.89, 0.76, 0.57];
const SCRUB_TINT: Rgb = [0.63, 0.6, 0.43];
const WASH_SAND: Rgb = [0.86, 0.79, 0.65];
const WASH_PEBBLE: Rgb = [0.66, 0.58, 0.49];

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
  // Fine sedimentary laminations inside each layer
  const lamination = 1 + Math.sin(worldY * 90) * 0.04;
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

  // Cliff faces: banded strata + dark desert-varnish streaks
  const wobble = (streak - 0.5) * 0.06;
  const cliff = mixRgb(strataColorAtHeight(height + wobble), VARNISH, Math.pow(streak, 3) * 0.55);

  // Flat surfaces: basin floor → plateau tops → cream cap rock
  let flat = mixRgb(DESERT_FLOOR, PLATEAU_TOP, smoothRange(PLAIN_Y + 0.3, PLAIN_Y + 0.5, height));
  flat = mixRgb(flat, CAP_TOP, smoothRange(PLAIN_Y + 1.0, PLAIN_Y + 1.15, height));
  if (grain > 0.8) {
    flat = mixRgb(flat, SCRUB_TINT, (grain - 0.8) * 1.5);
  }

  let color = mixRgb(flat, cliff, steep);

  // Dry wash: pale sand with scattered pebbles
  const washColor = mixRgb(WASH_SAND, WASH_PEBBLE, grain > 0.65 ? 0.6 : 0);
  color = mixRgb(color, washColor, washFactor * (1 - steep * 0.7));

  const shift = (grain - 0.5) * 0.07;
  return clampRgb([color[0] + shift, color[1] + shift, color[2] + shift]);
}
