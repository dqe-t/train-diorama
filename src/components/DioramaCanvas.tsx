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

  // Warm studio lighting: strong directional sun from high back-left casting diagonal shadows
  const sunColor = goldenHour ? '#ffa24d' : '#ffe2c2';
  const skyColor = goldenHour ? '#ffd0a8' : '#ffe4cf';
  const groundBounce = goldenHour ? '#84280c' : '#8c3514';

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: goldenHour ? 1.08 : 1.04,
      }}
    >
      {/* Percentage-closer soft shadows: crisp contact grounding with gentle penumbra */}
      <SoftShadows size={6} samples={16} focus={0.5} />

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

      {/* Subtle desert environment reflections */}
      <Environment preset="sunset" environmentIntensity={goldenHour ? 0.35 : 0.25} />

      <ambientLight intensity={goldenHour ? 0.16 : 0.18} color={skyColor} />
      <hemisphereLight args={[skyColor, groundBounce, 0.35]} />
      <directionalLight
        castShadow
        position={goldenHour ? [-15, 18, 16] : [-16, 22, 20]}
        intensity={goldenHour ? 3.2 : 3.0}
        color={sunColor}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
      />
      {/* Warm ambient bounce from front-right to lift deep cliff crevices */}
      <directionalLight position={[14, 8, 12]} intensity={0.4} color="#ffb080" />

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
