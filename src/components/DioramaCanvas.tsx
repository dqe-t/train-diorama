import React from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls, OrthographicCamera } from '@react-three/drei';
import { MOUSE } from 'three';
import { useDioramaStore } from '../store/useDioramaStore';
import { DioramaStructures } from './DioramaStructures';
import { DioramaTerrain } from './DioramaTerrain';
import { DioramaTracks } from './DioramaTracks';
import { MiniatureTrain } from './MiniatureTrain';

export function DioramaCanvas(): React.JSX.Element {
  const goldenHour = useDioramaStore((s): boolean => s.goldenHour);

  const sunColor = goldenHour ? '#ff9a52' : '#ffe9c7';
  const skyColor = goldenHour ? '#ffc9a3' : '#d6e8f5';
  const groundBounce = goldenHour ? '#8a4a2c' : '#b8784c';

  return (
    <Canvas shadows dpr={[1, 2]}>
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

      {/* Harsh desert sun with warm red-rock bounce light */}
      <ambientLight intensity={goldenHour ? 0.35 : 0.42} color={skyColor} />
      <hemisphereLight args={[skyColor, groundBounce, 0.6]} />
      <directionalLight
        castShadow
        position={goldenHour ? [16, 11, 6] : [10, 20, 7]}
        intensity={goldenHour ? 2.2 : 2.3}
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
        <DioramaTerrain />
        <DioramaTracks />
        <DioramaStructures />
        <MiniatureTrain />
      </group>
    </Canvas>
  );
}
