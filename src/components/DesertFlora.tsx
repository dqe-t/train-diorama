import React from 'react';
import { NaturalProp } from '../types/diorama';

const SANDSTONE = '#b8653a';
const SANDSTONE_DARK = '#9a4f2d';
const CAPROCK = '#e3cba0';
const CACTUS_GREEN = '#5d7f46';

interface VariantProps {
  readonly variant: number;
}

function SaguaroArm({ side, height }: { readonly side: 1 | -1; readonly height: number }): React.JSX.Element {
  return (
    <group>
      <mesh position={[side * 0.085, height, 0]} rotation={[0, 0, Math.PI * 0.5]} castShadow>
        <capsuleGeometry args={[0.04, 0.07, 4, 8]} />
        <meshStandardMaterial color={CACTUS_GREEN} roughness={0.8} />
      </mesh>
      <mesh position={[side * 0.14, height + 0.1, 0]} castShadow>
        <capsuleGeometry args={[0.042, 0.16, 4, 8]} />
        <meshStandardMaterial color={CACTUS_GREEN} roughness={0.8} />
      </mesh>
    </group>
  );
}

export function SaguaroModel({ variant }: VariantProps): React.JSX.Element {
  const arms = variant % 3;
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.06, 0.5, 4, 10]} />
        <meshStandardMaterial color={CACTUS_GREEN} roughness={0.8} />
      </mesh>
      {arms >= 1 && <SaguaroArm side={1} height={0.24} />}
      {arms >= 2 && <SaguaroArm side={-1} height={0.32} />}
    </group>
  );
}

export function PricklyPearModel({ variant }: VariantProps): React.JSX.Element {
  const pads: ReadonlyArray<readonly [number, number, number, number]> = [
    [0, 0.08, 0, 0],
    [0.07, 0.17, 0.01, 0.5],
    [-0.06, 0.15, -0.01, -0.4],
  ];
  return (
    <group>
      {pads.map(([x, y, z, rot], idx): React.JSX.Element => (
        <mesh key={idx} position={[x, y, z]} rotation={[0, variant * 0.6, rot]} scale={[1, 1.2, 0.35]} castShadow>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial color="#7a9a4f" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0.07, 0.25, 0.01]} castShadow>
        <sphereGeometry args={[0.018, 6, 4]} />
        <meshStandardMaterial color="#c2457a" roughness={0.6} />
      </mesh>
    </group>
  );
}

function SagebrushModel({ variant }: VariantProps): React.JSX.Element {
  const tone = variant % 2 === 0 ? '#9aa47c' : '#8a9670';
  return (
    <group>
      <mesh position={[0, 0.06, 0]} scale={[1, 0.75, 1]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.11, 1]} />
        <meshStandardMaterial color={tone} roughness={0.95} />
      </mesh>
      <mesh position={[0.08, 0.04, 0.05]} scale={[1, 0.7, 1]} castShadow>
        <dodecahedronGeometry args={[0.075, 1]} />
        <meshStandardMaterial color={tone} roughness={0.95} />
      </mesh>
    </group>
  );
}

function JuniperModel(): React.JSX.Element {
  return (
    <group>
      <mesh position={[0.02, 0.1, 0]} rotation={[0, 0, -0.25]} castShadow>
        <cylinderGeometry args={[0.025, 0.045, 0.22, 5]} />
        <meshStandardMaterial color="#6b5038" roughness={0.95} />
      </mesh>
      <mesh position={[0.05, 0.24, 0]} scale={[1, 0.7, 1]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.16, 1]} />
        <meshStandardMaterial color="#4f6a43" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-0.07, 0.19, 0.05]} scale={[1, 0.7, 1]} castShadow>
        <dodecahedronGeometry args={[0.1, 1]} />
        <meshStandardMaterial color="#5b7a4c" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

function BoulderModel(): React.JSX.Element {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} rotation={[0.3, 0.4, 0.1]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial color={SANDSTONE} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.15, 0.03, 0.07]} rotation={[0.5, 1.1, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial color={SANDSTONE_DARK} roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}

function HoodooModel(): React.JSX.Element {
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.21, 0.36, 7]} />
        <meshStandardMaterial color={SANDSTONE} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.11, 0.22, 7]} />
        <meshStandardMaterial color="#c97a4c" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.02, 0.58, 0]} scale={[1, 0.45, 1]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.17, 0]} />
        <meshStandardMaterial color={CAPROCK} roughness={0.92} flatShading />
      </mesh>
    </group>
  );
}

/** Natural sandstone arch (Arches-NP style): a fin with a weathered opening. */
function SandstoneArchModel(): React.JSX.Element {
  return (
    <group>
      <mesh scale={[1, 1.1, 1.6]} castShadow receiveShadow>
        <torusGeometry args={[0.62, 0.15, 7, 18, Math.PI]} />
        <meshStandardMaterial color={SANDSTONE} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.07, 0]} scale={[1, 1.1, 1.45]} castShadow>
        <torusGeometry args={[0.62, 0.08, 6, 18, Math.PI]} />
        <meshStandardMaterial color="#d79a68" roughness={0.95} flatShading />
      </mesh>
      {[-1, 1].map((side): React.JSX.Element => (
        <mesh key={side} position={[side * 0.64, -0.12, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.42, 0.44]} />
          <meshStandardMaterial color={SANDSTONE_DARK} roughness={0.95} flatShading />
        </mesh>
      ))}
      <mesh position={[0.95, 0.0, 0.18]} rotation={[0.3, 0.6, 0]} castShadow>
        <dodecahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial color={SANDSTONE_DARK} roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}

function renderPropModel(prop: NaturalProp): React.JSX.Element {
  switch (prop.kind) {
    case 'saguaro':
      return <SaguaroModel variant={prop.colorVariant} />;
    case 'sagebrush':
      return <SagebrushModel variant={prop.colorVariant} />;
    case 'juniper':
      return <JuniperModel />;
    case 'boulder':
      return <BoulderModel />;
    case 'hoodoo':
      return <HoodooModel />;
    case 'arch':
      return <SandstoneArchModel />;
  }
}

export function DesertPropItem({ prop }: { readonly prop: NaturalProp }): React.JSX.Element {
  const s = prop.scale;
  return (
    <group position={[prop.x, prop.y, prop.z]} rotation={[0, prop.rotationY, 0]} scale={[s, s, s]}>
      {renderPropModel(prop)}
    </group>
  );
}
