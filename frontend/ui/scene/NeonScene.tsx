import { Float, RoundedBox, Sparkles, Stars, useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import React, { useRef } from 'react';
import * as THREE from 'three';
import { CoinField } from './FloatingCoins';

export const NeonScene: React.FC = () => {
  const scroll = useScroll();
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const phoneRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    // SCROLL ANIMATION:
    // We map the scroll offset (0 to 1) to the camera's Z position.
    // Start at Z=5, end at Z=-100 (closer to the phone)
    const targetZ = 5 - (scroll.offset * 100);

    // Smooth camera movement
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1);

    // Subtle camera sway for "flying" feel
    const time = state.clock.getElapsedTime();
    camera.position.x = Math.sin(time * 0.2) * 2;
    camera.position.y = Math.cos(time * 0.3) * 1 + 2; // Keep slightly above ground

    camera.lookAt(0, 0, -150); // Always look at the phone

    // Animate Phone (Rotate slightly)
    if (phoneRef.current) {
        phoneRef.current.rotation.y = Math.sin(time * 0.1) * 0.1;
        phoneRef.current.rotation.z = Math.cos(time * 0.15) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Fog for depth fading */}
      <fog attach="fog" args={['#050011', 10, 130]} />

      <ambientLight intensity={0.2} color="#440044" />

      {/* THE IPHONE FRAME (Replaces the generic box) */}
      <group ref={phoneRef} position={[0, 15, -120]}>
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>

            {/* Main Metal Frame */}
            <RoundedBox args={[19, 38, 2]} radius={2.5} smoothness={8} creaseAngle={0.4}>
                <meshStandardMaterial
                    color="#2a2a2a"
                    metalness={0.9}
                    roughness={0.1}
                    emissive="#111"
                    emissiveIntensity={0.2}
                />
            </RoundedBox>

            {/* Glowing Metal Rim Detail */}
            <group position={[0,0,0]} scale={[1.01, 1.01, 1]}>
               {/* This subtle wireframe effect simulates the polished edge reflecting light */}
               <mesh>
                  <boxGeometry args={[19, 38, 2.1]} />
                  <meshBasicMaterial color="#ff00ff" wireframe transparent opacity={0.05} />
               </mesh>
            </group>

            {/* Front Black Glass Bezel */}
            <RoundedBox args={[18, 37, 0.1]} radius={2} smoothness={8} position={[0, 0, 1.05]}>
                <meshStandardMaterial color="#000" roughness={0.0} metalness={0.8} />
            </RoundedBox>

            {/* The Screen Display (Glowing Pink) */}
            <RoundedBox args={[17, 36, 0.1]} radius={1.5} smoothness={4} position={[0, 0, 1.1]}>
                 <meshBasicMaterial color="#ff00ff" toneMapped={false} />
            </RoundedBox>

            {/* Dynamic Island / Notch */}
            <RoundedBox args={[5, 1.5, 0.2]} radius={0.75} smoothness={8} position={[0, 16.5, 1.15]}>
                <meshBasicMaterial color="#000" />
            </RoundedBox>

            {/* Screen Reflection / Glare */}
            <pointLight intensity={2} color="#ff00ff" distance={80} decay={2} position={[0, 0, 10]} />
        </Float>
      </group>

      {/* STARS & SPARKLES */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={500} scale={100} size={4} speed={0.4} opacity={0.5} color="#00ffff" />

      {/* FLOATING OBJECTS (COINS) */}
      <CoinField />
    </group>
  );
};
