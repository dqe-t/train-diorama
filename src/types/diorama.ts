export type ToolType = 'track' | 'cottage' | 'station' | 'trees' | 'demolish';

export type PropKind = 'pine' | 'puff_tree' | 'autumn_tree' | 'rock' | 'bush';

export type StructureKind = 'cottage' | 'station' | 'planted_trees';

export interface Vec3Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SplineSample {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly tangentX: number;
  readonly tangentY: number;
  readonly tangentZ: number;
  readonly normalX: number;
  readonly normalZ: number;
  readonly yawRadians: number;
  readonly pitchRadians: number;
  readonly isBridge: boolean;
  readonly terrainY: number;
}

export interface NaturalProp {
  readonly id: string;
  readonly kind: PropKind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scale: number;
  readonly rotationY: number;
  readonly colorVariant: number;
}

export interface PlacedStructure {
  readonly id: string;
  readonly kind: StructureKind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rotationY: number;
  readonly stories: number;
  readonly colorVariant: number;
}

export interface OrganicDioramaWorld {
  readonly span: number;
  readonly seed: number;
  readonly trackPoints: ReadonlyArray<Vec3Point>;
  readonly trackClosed: boolean;
  readonly splineSamples: ReadonlyArray<SplineSample>;
  readonly naturalProps: ReadonlyArray<NaturalProp>;
  readonly structures: ReadonlyArray<PlacedStructure>;
}
