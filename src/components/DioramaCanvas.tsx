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

  const sunColor = goldenHour ? '#ffad66' : '#fff5e0';
  const skyColor = goldenHour ? '#ffd5b8' : '#e8f4ff';
  const groundBounce = goldenHour ? '#75533e' : '#8f7d65';

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

      {/* Warm Miniature Diorama Lighting */}
      <ambientLight intensity={goldenHour ? 0.55 : 0.72} color={skyColor} />
      <hemisphereLight args={[skyColor, groundBounce, 0.55]} />
      <directionalLight
        castShadow
        position={goldenHour ? [14, 15, 8] : [12, 24, 10]}
        intensity={goldenHour ? 1.85 : 1.55}
        color={sunColor}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0005}
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
