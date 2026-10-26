import React from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, MapControls, OrthographicCamera } from '@react-three/drei';
import { ACESFilmicToneMapping, MOUSE } from 'three';
import { STRATA_BOTTOM_Y } from '../core/desertPalette';
import { useDioramaStore } from '../store/useDioramaStore';
import { DioramaPostProcessing } from './DioramaPostProcessing';
import { DioramaStructures } from './DioramaStructures';
import { DioramaTerrain } from './DioramaTerrain';
import { DioramaTracks } from './DioramaTracks';
import { MiniatureTrain } from './MiniatureTrain';

export function DioramaCanvas(): React.JSX.Element {
  const world = useDioramaStore((s): typeof s.world => s.world);
  const goldenHour = useDioramaStore((s): boolean => s.goldenHour);

  const sunColor = goldenHour ? '#ff9a52' : '#ffe9c7';
  const skyColor = goldenHour ? '#ffc9a3' : '#d6e8f5';
  const groundBounce = goldenHour ? '#8a4a2c' : '#b8784c';

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: goldenHour ? 1.15 : 1.05,
      }}
    >
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

      {/* Desert Environment IBL Reflection Map */}
      <Environment preset="sunset" environmentIntensity={goldenHour ? 0.85 : 0.65} />

      {/* Harsh desert sun with warm red-rock bounce light */}
      <ambientLight intensity={goldenHour ? 0.32 : 0.38} color={skyColor} />
      <hemisphereLight args={[skyColor, groundBounce, 0.55]} />
      <directionalLight
        castShadow
        position={goldenHour ? [16, 11, 6] : [10, 20, 7]}
        intensity={goldenHour ? 2.3 : 2.4}
        color={sunColor}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />

      <group position={[0, -0.3, 0]}>
        {/* Soft Ambient Contact Shadows beneath the Plinth */}
        <ContactShadows
          position={[0, STRATA_BOTTOM_Y - 0.34, 0]}
          opacity={0.65}
          scale={world.span * 1.5}
          blur={2.4}
          far={3.5}
          color="#160c06"
        />

        {/* Studio Museum Tabletop Desk */}
        <mesh
          position={[0, STRATA_BOTTOM_Y - 0.35, 0]}
          rotation={[-Math.PI * 0.5, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[world.span * 3.5, world.span * 3.5]} />
          <meshStandardMaterial color="#1a1410" roughness={0.65} metalness={0.08} />
        </mesh>

        <DioramaTerrain />
        <DioramaTracks />
        <DioramaStructures />
        <MiniatureTrain />
      </group>

      {/* Macro Tilt-Shift & Bloom Optical Pipeline */}
      <DioramaPostProcessing />
    </Canvas>
  );
}
