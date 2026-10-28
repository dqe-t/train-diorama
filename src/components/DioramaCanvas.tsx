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
  const activeTool = useDioramaStore((s): typeof s.activeTool => s.activeTool);

  // Warm studio lighting: strong directional sun from high back-left casting diagonal shadows
  const sunColor = goldenHour ? '#ff923a' : '#ffa856';
  const skyColor = goldenHour ? '#ffa872' : '#ffc498';
  const groundBounce = goldenHour ? '#782208' : '#882e10';

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      onContextMenu={(e: React.MouseEvent): void => e.preventDefault()}
      gl={{
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: goldenHour ? 1.02 : 0.98,
      }}
    >
      {/* Dark studio tabletop presentation background */}
      <color attach="background" args={['#1e1c22']} />

      {/* Percentage-closer soft shadows: crisp contact grounding with gentle penumbra */}
      <SoftShadows size={5} samples={16} focus={0.5} />

      {/* Strictly Fixed Isometric Orthographic Camera */}
      <OrthographicCamera
        makeDefault
        position={[22, 22, 22]}
        zoom={45}
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
          RIGHT: activeTool === 'sculpt' ? undefined : MOUSE.PAN,
        }}
      />

      {/* Subtle desert environment reflections */}
      <Environment preset="sunset" environmentIntensity={goldenHour ? 0.25 : 0.18} />

      <ambientLight intensity={goldenHour ? 0.12 : 0.14} color={skyColor} />
      <hemisphereLight args={[skyColor, groundBounce, 0.25]} />
      <directionalLight
        castShadow
        position={goldenHour ? [-15, 20, 16] : [-16, 24, 18]}
        intensity={goldenHour ? 3.4 : 3.2}
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
      {/* Very faint fill light to keep darkest shadowed crevices readable */}
      <directionalLight position={[14, 8, 12]} intensity={0.12} color="#ffb080" />

      <group position={[0, 0, 0]}>
        {/* Soft ambient contact shadow beneath the plinth */}
        <ContactShadows
          position={[0, PLINTH_BOTTOM_Y - 0.005, 0]}
          opacity={0.7}
          scale={world.span * 1.6}
          blur={2.6}
          far={3.5}
          color="#0d0806"
        />

        {/* Dark studio tabletop with soft shadow catching */}
        <mesh position={[0, PLINTH_BOTTOM_Y - 0.01, 0]} rotation={[-Math.PI * 0.5, 0, 0]} receiveShadow>
          <planeGeometry args={[world.span * 3.5, world.span * 3.5]} />
          <shadowMaterial opacity={0.62} />
        </mesh>

        <DioramaTerrain />
        <DioramaTracks />
        <DioramaStructures />
        <MiniatureTrain />
      </group>
    </Canvas>
  );
}
