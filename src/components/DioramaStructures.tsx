import React from 'react';
import { useDioramaStore } from '../store/useDioramaStore';
import { PlacedStructure } from '../types/diorama';
import { PricklyPearModel, SaguaroModel } from './DesertFlora';

const ADOBE_COLORS: ReadonlyArray<string> = ['#cf9566', '#c4855a', '#d8a678', '#b97a52'];
const DOOR_COLORS: ReadonlyArray<string> = ['#3f8f8a', '#4a6f9c', '#8c3b2b', '#3f8f8a'];
const VIGA_COLOR = '#6b4a2e';
const TIMBER = '#7a5233';
const TIMBER_DARK = '#5b3a26';

interface StructureItemProps {
  readonly item: PlacedStructure;
}

/** Stackable adobe pueblo: each story steps back, with protruding vigas and a roof ladder. */
function AdobePueblo({ item }: StructureItemProps): React.JSX.Element {
  const stories = Math.max(1, item.stories);
  const storyHeight = 0.22;
  const wall = ADOBE_COLORS[item.colorVariant % ADOBE_COLORS.length];
  const door = DOOR_COLORS[item.colorVariant % DOOR_COLORS.length];

  return (
    <group position={[item.x, item.y, item.z]} rotation={[0, item.rotationY, 0]}>
      {/* Earthen footing anchored into slopes */}
      <mesh position={[0, -0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.16, 0.52]} />
        <meshStandardMaterial color="#a8724c" roughness={0.98} />
      </mesh>

      {Array.from({ length: stories }).map((_, idx): React.JSX.Element => {
        const w = 0.58 - idx * 0.13;
        const d = 0.48 - idx * 0.09;
        const ox = -idx * 0.07;
        const oz = -idx * 0.04;
        const y = idx * storyHeight + storyHeight * 0.5;
        return (
          <group key={idx} position={[ox, 0, oz]}>
            <mesh position={[0, y, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, storyHeight, d]} />
              <meshStandardMaterial color={wall} roughness={0.97} />
            </mesh>
            {/* Parapet lip */}
            <mesh position={[0, y + storyHeight * 0.5 + 0.012, 0]} castShadow>
              <boxGeometry args={[w + 0.02, 0.025, d + 0.02]} />
              <meshStandardMaterial color={wall} roughness={0.97} />
            </mesh>
            {/* Vigas (roof beams) poking out of the front wall */}
            {[-0.3, 0, 0.3].map((f): React.JSX.Element => (
              <mesh
                key={f}
                position={[f * w, y + storyHeight * 0.32, d * 0.5 + 0.03]}
                rotation={[Math.PI * 0.5, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.013, 0.013, 0.08, 5]} />
                <meshStandardMaterial color={VIGA_COLOR} roughness={0.9} />
              </mesh>
            ))}
            {/* Deep-set window */}
            <mesh position={[w * 0.25, y, d * 0.5 + 0.004]}>
              <boxGeometry args={[0.06, 0.06, 0.01]} />
              <meshStandardMaterial color="#2c1d14" roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Painted door on the ground floor */}
      <mesh position={[-0.12, 0.075, 0.245]}>
        <boxGeometry args={[0.09, 0.15, 0.012]} />
        <meshStandardMaterial color={door} roughness={0.8} />
      </mesh>

      {/* Ladder leaning against the top story */}
      {stories > 1 && (
        <group position={[0.2, (stories - 1) * storyHeight + 0.1, 0.1]} rotation={[0, 0, -0.2]}>
          {[-0.03, 0.03].map((x): React.JSX.Element => (
            <mesh key={x} position={[x, 0, 0]} castShadow>
              <boxGeometry args={[0.01, 0.3, 0.01]} />
              <meshStandardMaterial color={VIGA_COLOR} roughness={0.9} />
            </mesh>
          ))}
          {[-0.09, -0.03, 0.03, 0.09].map((y): React.JSX.Element => (
            <mesh key={y} position={[0, y, 0]}>
              <boxGeometry args={[0.07, 0.008, 0.008]} />
              <meshStandardMaterial color={VIGA_COLOR} roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/** Frontier depot with a plank platform and a wooden water tower. Track side is local +X. */
function FrontierDepot({ item }: StructureItemProps): React.JSX.Element {
  return (
    <group position={[item.x, item.y, item.z]} rotation={[0, item.rotationY, 0]}>
      {/* Plank platform */}
      <mesh position={[0.08, 0.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.14, 1.0]} />
        <meshStandardMaterial color="#8a6240" roughness={0.92} />
      </mesh>

      {/* Board-and-batten depot */}
      <mesh position={[-0.06, 0.2, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.26, 0.5]} />
        <meshStandardMaterial color="#b5754a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.06, 0.38, 0.1]} rotation={[0, Math.PI * 0.25, 0]} scale={[1, 1, 1.45]} castShadow>
        <coneGeometry args={[0.32, 0.16, 4]} />
        <meshStandardMaterial color={TIMBER_DARK} roughness={0.85} />
      </mesh>
      {/* Station sign */}
      <mesh position={[0.12, 0.3, 0.1]} castShadow>
        <boxGeometry args={[0.015, 0.06, 0.28]} />
        <meshStandardMaterial color="#efe0bf" roughness={0.8} />
      </mesh>
      {/* Platform awning */}
      <mesh position={[0.2, 0.31, 0.1]} rotation={[0, 0, -0.18]} castShadow>
        <boxGeometry args={[0.2, 0.02, 0.56]} />
        <meshStandardMaterial color={TIMBER_DARK} roughness={0.85} />
      </mesh>

      {/* Water tower */}
      <group position={[-0.12, 0, -0.33]}>
        {[
          [-0.08, -0.08],
          [0.08, -0.08],
          [-0.08, 0.08],
          [0.08, 0.08],
        ].map(([lx, lz], idx): React.JSX.Element => (
          <mesh key={idx} position={[lx, 0.2, lz]} castShadow>
            <boxGeometry args={[0.02, 0.4, 0.02]} />
            <meshStandardMaterial color={TIMBER} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.2, 12]} />
          <meshStandardMaterial color={TIMBER} roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.66, 0]} castShadow>
          <coneGeometry args={[0.15, 0.12, 12]} />
          <meshStandardMaterial color={TIMBER_DARK} roughness={0.85} />
        </mesh>
        <mesh position={[0.15, 0.45, 0]} rotation={[0, 0, -0.9]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.16, 5]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.6} metalness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function CactusPatch({ item }: StructureItemProps): React.JSX.Element {
  return (
    <group position={[item.x, item.y, item.z]} rotation={[0, item.rotationY, 0]}>
      <group position={[-0.12, 0, -0.08]} scale={[1.1, 1.1, 1.1]}>
        <SaguaroModel variant={item.colorVariant + 1} />
      </group>
      <group position={[0.16, 0, 0.02]} scale={[0.8, 0.8, 0.8]}>
        <SaguaroModel variant={item.colorVariant} />
      </group>
      <group position={[0.0, 0, 0.18]}>
        <PricklyPearModel variant={item.colorVariant} />
      </group>
    </group>
  );
}

function StandaloneWaterTower({ item }: StructureItemProps): React.JSX.Element {
  return (
    <group position={[item.x, item.y, item.z]} rotation={[0, item.rotationY, 0]}>
      {[
        [-0.1, -0.1],
        [0.1, -0.1],
        [-0.1, 0.1],
        [0.1, 0.1],
      ].map(([lx, lz], idx): React.JSX.Element => (
        <mesh key={idx} position={[lx, 0.24, lz]} castShadow>
          <boxGeometry args={[0.024, 0.48, 0.024]} />
          <meshStandardMaterial color={TIMBER} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.25, 12]} />
        <meshStandardMaterial color={TIMBER} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.79, 0]} castShadow>
        <coneGeometry args={[0.19, 0.15, 12]} />
        <meshStandardMaterial color={TIMBER_DARK} roughness={0.85} />
      </mesh>
      <mesh position={[0.18, 0.55, 0]} rotation={[0, 0, -0.9]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.2, 5]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  );
}

function ArchedFootbridge({ item }: StructureItemProps): React.JSX.Element {
  return (
    <group position={[item.x, item.y, item.z]} rotation={[0, item.rotationY, 0]}>
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.035, 0.24]} />
        <meshStandardMaterial color={TIMBER} roughness={0.9} />
      </mesh>
      {[-0.11, 0.11].map((zSide): React.JSX.Element => (
        <group key={zSide} position={[0, 0.16, zSide]}>
          <mesh castShadow>
            <boxGeometry args={[0.72, 0.02, 0.02]} />
            <meshStandardMaterial color={TIMBER_DARK} roughness={0.9} />
          </mesh>
          {[-0.3, -0.1, 0.1, 0.3].map((xPost): React.JSX.Element => (
            <mesh key={xPost} position={[xPost, -0.05, 0]} castShadow>
              <boxGeometry args={[0.02, 0.12, 0.02]} />
              <meshStandardMaterial color={TIMBER_DARK} roughness={0.9} />
            </mesh>
          ))}
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
          return <AdobePueblo key={item.id} item={item} />;
        }
        if (item.kind === 'station') {
          return <FrontierDepot key={item.id} item={item} />;
        }
        if (item.kind === 'watertower') {
          return <StandaloneWaterTower key={item.id} item={item} />;
        }
        if (item.kind === 'footbridge') {
          return <ArchedFootbridge key={item.id} item={item} />;
        }
        return <CactusPatch key={item.id} item={item} />;
      })}

      {/* Brush ring on the landscape */}
      {hoverPoint !== null && (
        <mesh position={[hoverPoint.x, hoverPoint.y + 0.04, hoverPoint.z]} rotation={[-Math.PI * 0.5, 0, 0]}>
          <ringGeometry args={[0.32, 0.4, 28]} />
          <meshBasicMaterial color="#fff3d6" />
        </mesh>
      )}
    </group>
  );
}
