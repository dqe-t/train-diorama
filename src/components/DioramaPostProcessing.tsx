import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js';

/**
 * Optical macro diorama post-processing:
 * 1. Subtle glint bloom on specular rails, desert sun highlights, and locomotive headlight.
 * 2. Two-pass tilt-shift depth blur focusing the horizontal center and softly blurring foreground/background.
 * 3. ACES filmic color management and tone mapping via OutputPass.
 */
export function DioramaPostProcessing(): null {
  const { gl, scene, camera, size } = useThree();

  const [composer, hTiltPass, vTiltPass] = useMemo((): readonly [EffectComposer, ShaderPass, ShaderPass] => {
    const comp = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    comp.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new Vector2(size.width, size.height),
      0.24, // subtle warm specular glow
      0.35, // blur radius
      0.82  // threshold for highlights only
    );
    comp.addPass(bloomPass);

    const hTilt = new ShaderPass(HorizontalTiltShiftShader);
    hTilt.uniforms.h.value = 1.4 / Math.max(1, size.width);
    hTilt.uniforms.r.value = 0.5;
    comp.addPass(hTilt);

    const vTilt = new ShaderPass(VerticalTiltShiftShader);
    vTilt.uniforms.v.value = 1.4 / Math.max(1, size.height);
    vTilt.uniforms.r.value = 0.5;
    comp.addPass(vTilt);

    const outputPass = new OutputPass();
    comp.addPass(outputPass);

    return [comp, hTilt, vTilt] as const;
  }, [gl, scene, camera]);

  useEffect((): void => {
    composer.setSize(size.width, size.height);
    hTiltPass.uniforms.h.value = 1.4 / Math.max(1, size.width);
    vTiltPass.uniforms.v.value = 1.4 / Math.max(1, size.height);
  }, [composer, hTiltPass, vTiltPass, size]);

  useFrame((_, delta): void => {
    composer.render(delta);
  }, 1);

  return null;
}
