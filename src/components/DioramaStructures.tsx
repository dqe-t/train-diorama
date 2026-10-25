import React from 'react';
import { WATER_LEVEL_Y } from '../core/noise';
import { useDioramaStore } from '../store/useDioramaStore';
import { PlacedStructure } from '../types/diorama';

const COTTAGE_WALL_COLORS: ReadonlyArray<string> = [
  '#f6ead4',
  '#f4d6be',
  '#dce8d0',
  '#f5e0a9',
];

const COTTAGE_ROOF_COLORS: ReadonlyArray<string> = [
  '#c95b44',
  '#56758a',
  '#b5654d',
  '#7a5948',
];

interface StructureItemProps {
  readonly item: PlacedStructure;
}

function TownscaperCottage({ item }: StructureItemProps): React.JSX.Element {
  const stories = Math.max(1, item.stories);
  const storyHeight = 0.26;
  const totalWallHeight = stories * storyHeight;
  const wallColor = COTTAGE_WALL_COLORS[item.colorVariant % COTTAGE_WALL_COLORS.length];
  const roofColor = COTTAGE_ROOF_COLORS[item.colorVariant % COTTAGE_ROOF_COLORS.length];

  return (
    <group position={[item.x, item.y, item.z]} rotation={[0, item.rotationY, 0]}>
      {/* Deep Stone Foundation Anchor (prevents floating on hillside slopes) */}
      <mesh position={[0, -0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.58, 0.24, 0.5]} />
        <meshStandardMaterial color="#7d7972" roughness={0.92} />
      </mesh>

      {/* Stacked Story Walls */}
      <mesh position={[0, 0.06 + totalWallHeight * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.52, totalWallHeight, 0.44]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>

      {/* Glowing Cozy Windows */}
      {Array.from({ length: stories }).map((_, idx): React.JSX.Element => {
        const wy = 0.06 + idx * storyHeight + storyHeight * 0.52;
        return (
          <group key={idx}>
            <mesh position={[-0.12, wy, 0.225]}>
              <boxGeometry args={[0.085, 0.1, 0.015]} />
              <meshStandardMaterial
                color="#ffe596"
                emissive="#ffae34"
                emissiveIntensity={0.65}
              />
            </mesh>
            <mesh position={[0.12, wy, 0.225]}>
              <boxGeometry args={[0.085, 0.1, 0.015]} />
              <meshStandardMaterial
                color="#ffe596"
                emissive="#ffae34"
                emissiveIntensity={0.65}
              />
            </mesh>
          </group>
        );
      })}

      {/* Pitched Gable Roof */}
      <mesh
        position={[0, 0.06 + totalWallHeight + 0.15, 0]}
        rotation={[0, Math.PI * 0.25, 0]}
        castShadow
        receiveShadow
      >
        <coneGeometry args={[0.42, 0.32, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.78} />
      </mesh>

      {/* Brick Chimney */}
      <mesh position={[0.14, 0.06 + totalWallHeight + 0.2, -0.09]} castShadow>
        <boxGeometry args={[0.08, 0.22, 0.08]} />
        <meshStandardMaterial color="#9c4737" roughness={0.88} />
      </mesh>
    </group>
  );
}

function RuralTrainStation({ item }: StructureItemProps): React.JSX.Element {
  return (
    <group position={[item.x, item.y, item.z]} rotation={[0, item.rotationY, 0]}>
      {/* Masonry Platform Foundation */}
      <mesh position={[0, -0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.64, 0.22, 1.08]} />
        <meshStandardMaterial color="#8c8478" roughness={0.9} />
      </mesh>

      {/* Main Cream Station Hall */}
      <mesh position={[0.06, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.3, 0.72]} />
        <meshStandardMaterial color="#f5e6c8" roughness={0.82} />
      </mesh>

      {/* Terracotta Station Roof */}
      <mesh
        position={[0.06, 0.46, 0]}
        rotation={[0, Math.PI * 0.25, 0]}
        castShadow
        receiveShadow
      >
        <coneGeometry args={[0.54, 0.25, 4]} />
        <meshStandardMaterial color="#b84a39" roughness={0.75} />
      </mesh>

      {/* Clock Tower Finial */}
      <mesh position={[0.06, 0.6, 0]} castShadow>
        <boxGeometry args={[0.16, 0.22, 0.16]} />
        <meshStandardMaterial color="#f5e6c8" roughness={0.82} />
      </mesh>
      <mesh position={[0.06, 0.76, 0]} rotation={[0, Math.PI * 0.25, 0]} castShadow>
        <coneGeometry args={[0.14, 0.16, 4]} />
        <meshStandardMaterial color="#425d70" roughness={0.75} />
      </mesh>

      {/* Trackside Platform Awning */}
      <mesh position={[-0.2, 0.25, 0]} castShadow>
        <boxGeometry args={[0.24, 0.035, 0.74]} />
        <meshStandardMaterial color="#8c3b2b" roughness={0.8} />
      </mesh>
    </group>
  );
}

function PlantedTreeGrove({ item }: StructureItemProps): React.JSX.Element {
  return (
    <group position={[item.x, item.y, item.z]} rotation={[0, item.rotationY, 0]}>
      {[
        [-0.16, -0.14, 1.05],
        [0.18, -0.1, 0.88],
        [0.02, 0.18, 1.15],
      ].map(([ox, oz, scale], idx): React.JSX.Element => (
        <group key={idx} position={[ox, 0, oz]} scale={[scale, scale, scale]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.05, 0.22, 6]} />
            <meshStandardMaterial color="#6e4b32" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.32, 0]} castShadow>
            <dodecahedronGeometry args={[0.19, 1]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#5ca653' : '#73bf63'} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function DioramaStructures(): React.JSX.Element {
  const world = useDioramaStore((s): typeof s.world => s.world);
  const hoverPoint = useDioramaStore((s): typeof s.hoverPoint => s.hoverPoint);

  return (
    <group>
      {world.structures.map((item): React.JSX.Element => {
        if (item.kind === 'cottage') {
          return <TownscaperCottage key={item.id} item={item} />;
        }
        if (item.kind === 'station') {
          return <RuralTrainStation key={item.id} item={item} />;
        }
        return <PlantedTreeGrove key={item.id} item={item} />;
      })}

      {/* Smooth Organic 3D Brush Ring on the Landscape */}
      {hoverPoint !== null && (
        <mesh
          position={[
            hoverPoint.x,
            Math.max(hoverPoint.y, WATER_LEVEL_Y) + 0.04,
            hoverPoint.z,
          ]}
          rotation={[-Math.PI * 0.5, 0, 0]}
        >
          <ringGeometry args={[0.32, 0.4, 28]} />
          <meshBasicMaterial color="#fff8c4" />
        </mesh>
      )}
    </group>
  );
}
