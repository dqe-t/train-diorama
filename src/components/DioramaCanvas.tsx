import React from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  MapControls,
  OrthographicCamera,
  SoftShadows,
} from '@react-three/drei';
import { ACESFilmicToneMapping, MOUSE } from 'three';
import { STRATA_BOTTOM_Y } from '../core/desertPalette';
import { useDioramaStore } from '../store/useDioramaStore';
import { DioramaStructures } from './DioramaStructures';
import { DioramaTerrain } from './DioramaTerrain';
import { DioramaTracks } from './DioramaTracks';
import { MiniatureTrain } from './MiniatureTrain';

/** Bottom of the layered display plinth (see DioramaTerrain). */
const PLINTH_BOTTOM_Y = STRATA_BOTTOM_Y - 0.38;

export function DioramaCanvas(): React.JSX.Element {
  const world = useDioramaStore((s): typeof s.world => s.world);
  const goldenHour = useDioramaStore((s): boolean => s.goldenHour);

  // Warm studio lighting: low key light from the back-left so cliffs cast long soft shadows
  const sunColor = goldenHour ? '#ffab6b' : '#fff1dc';
  const skyColor = goldenHour ? '#ffd2b0' : '#ffe9d6';
  const groundBounce = goldenHour ? '#9a4a28' : '#c0653a';

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: goldenHour ? 1.1 : 1.0,
      }}
    >
      {/* Percentage-closer soft shadows: soft penumbras like a studio-lit clay model */}
      <SoftShadows size={28} samples={14} focus={0.4} />

      {/* Strictly Fixed Isometric Orthographic Camera */}
      <OrthographicCamera
        makeDefault
        position={[22, 22, 22]}
        zoom={44}
        near={-60}
        far={140}
      />

      {/* Rotation Disabled — Pure Tabletop Slide & Clamped Zoom */}
      <MapControls
        enableRotate={false}
        enablePan={true}
        enableZoom={true}
        minZoom={26}
        maxZoom={68}
        panSpeed={1.1}
        mouseButtons={{
          LEFT: MOUSE.PAN,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.PAN,
        }}
      />

      {/* Gentle environment fill for soft matte shading */}
      <Environment preset="sunset" environmentIntensity={goldenHour ? 0.55 : 0.45} />

      <ambientLight intensity={goldenHour ? 0.22 : 0.26} color={skyColor} />
      <hemisphereLight args={[skyColor, groundBounce, 0.65]} />
      <directionalLight
        castShadow
        position={goldenHour ? [-15, 9, 7] : [-11, 17, 9]}
        intensity={goldenHour ? 2.6 : 2.5}
        color={sunColor}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
      {/* Weak warm rim light from the front-right to lift the shadow side of cliffs */}
      <directionalLight position={[12, 6, 10]} intensity={0.35} color="#ffc49a" />

      <group position={[0, -0.3, 0]}>
        {/* Soft ambient contact shadow beneath the plinth */}
        <ContactShadows
          position={[0, PLINTH_BOTTOM_Y - 0.005, 0]}
          opacity={0.7}
          scale={world.span * 1.6}
          blur={2.6}
          far={3.5}
          color="#0d0806"
        />

        {/* Dark studio tabletop */}
        <mesh position={[0, PLINTH_BOTTOM_Y - 0.01, 0]} rotation={[-Math.PI * 0.5, 0, 0]} receiveShadow>
          <planeGeometry args={[world.span * 3.5, world.span * 3.5]} />
          <meshStandardMaterial color="#18181a" roughness={0.85} metalness={0} />
        </mesh>

        <DioramaTerrain />
        <DioramaTracks />
        <DioramaStructures />
        <MiniatureTrain />
      </group>
    </Canvas>
  );
}
