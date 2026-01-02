import { Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

interface CoinProps {
  position: [number, number, number];
  scale?: number;
  hasLight?: boolean;
}

const CoinGeometry: React.FC<{ color: string; hasLight?: boolean }> = ({ color, hasLight }) => {
    const materialProps = {
        color: color,
        wireframe: true,
        transparent: false,
        emissive: new THREE.Color(color),
        emissiveIntensity: 2,
        toneMapped: false
    };

    const secondaryColor = "#FFFF00"; // Bright Yellow for details
    const secondaryMaterialProps = {
        ...materialProps,
        color: secondaryColor,
        emissive: new THREE.Color(secondaryColor),
    };

    return (
      <group rotation={[Math.PI / 2, 0, 0]}>
        {/* Main Coin Body */}
        <mesh>
            <cylinderGeometry args={[1, 1, 0.15, 32]} />
            <meshStandardMaterial {...materialProps} />
        </mesh>

        {/* Decorative Inner Rings (Minted look) on both faces */}
        <group position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
             <mesh>
                <torusGeometry args={[0.7, 0.02, 8, 32]} />
                <meshStandardMaterial {...secondaryMaterialProps} />
             </mesh>
        </group>
        <group position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
             <mesh>
                <torusGeometry args={[0.7, 0.02, 8, 32]} />
                <meshStandardMaterial {...secondaryMaterialProps} />
             </mesh>
        </group>

        {hasLight && <pointLight color={color} intensity={2} distance={15} decay={2} />}
      </group>
    );
}

export const Coin: React.FC<CoinProps> = ({ position, scale = 1, hasLight = false }) => {
  const meshRef = useRef<THREE.Group>(null);

  // Random rotation speed - giving them a tumble
  const [rotSpeed] = useState(() => ({
    x: (Math.random() - 0.5) * 3, // Faster rotation for dynamic feel
    y: (Math.random() - 0.5) * 3,
    z: (Math.random() - 0.5) * 1
  }));

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += rotSpeed.x * delta;
      meshRef.current.rotation.y += rotSpeed.y * delta;
      meshRef.current.rotation.z += rotSpeed.z * delta;
    }
  });

  return (
    <group position={position} scale={scale}>
      <Float speed={3} rotationIntensity={1} floatIntensity={1}>
        <group ref={meshRef}>
           {/* Passing Gold color for the coins */}
           <CoinGeometry color="#FFD700" hasLight={hasLight} />
           {/* Inner solid shape for occlusion/depth so you can't see perfectly through it */}
           <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.95, 0.95, 0.9]}>
             <cylinderGeometry args={[1, 1, 0.14, 32]} />
             <meshStandardMaterial
                color="#DAA520"
                transparent={false}
                emissive="#DAA520"
                emissiveIntensity={0.5}
                roughness={0.4}
                metalness={0.8}
             />
           </mesh>
        </group>
      </Float>
    </group>
  );
};

export const CoinField: React.FC = () => {
  const coins = useMemo(() => {
    const items: CoinProps[] = [];

    // PHONE POSITION from NeonScene.tsx
    // The phone group is at [0, 15, -120]
    // The screen surface is roughly at Z + 1.1 => -118.9
    // We start just slightly in front of the screen
    const origin = new THREE.Vector3(0, 15, -118);

    const count = 25; // Dense stream

    for (let i = 0; i < count; i++) {
        // t represents the progress from the phone (0) to past the camera (1+)
        const t = Math.pow(Math.random(), 0.9); // Slight power curve for distribution

        // Z Position: Start at screen (-118), go past camera (camera starts at 5, goes to -95)
        // We want coins to exist all the way from -118 to +20 so there are always coins visible
        const z = THREE.MathUtils.lerp(origin.z, 20, t);

        // Spread logic: Cone shape expanding from source
        // Base spread at source (screen dimensions roughly w18 x h36)
        const baseSpreadX = 8;
        const baseSpreadY = 16;

        // Expansion calculation
        const distance = z - origin.z;
        const expansion = distance * 0.3; // Expands as it travels forward

        // Randomize position within the cone slice
        const xOffset = (Math.random() - 0.5) * 2 * (baseSpreadX + expansion * 0.6);
        const yOffset = (Math.random() - 0.5) * 2 * (baseSpreadY + expansion * 0.6);

        const x = origin.x + xOffset;
        const y = origin.y + yOffset;

        // Prevent coins from going below the floor (y = -5)
        // If y is too low, we might clamp it or just skip
        // Let's just clamp the lowest Y to -4.5 to avoid clipping hard into the grid
        const safeY = Math.max(y, -4.5);

        items.push({
            position: [x, safeY, z],
            scale: Math.random() * 0.8 + 0.4,
            hasLight: Math.random() > 0.95 // Rare bright coins
        });
    }

    // Add a few "Hero" coins guaranteed to be close to the initial camera view (Z around 0-5)
    items.push({ position: [3, 2, 2], scale: 0.6, hasLight: true });
    items.push({ position: [-2, 0, -1], scale: 0.7, hasLight: true });
    items.push({ position: [1, -2, 4], scale: 0.5, hasLight: false });

    return items;
  }, []);

  return (
    <group>
      {coins.map((data, i) => (
        <Coin
            key={i}
            position={data.position}
            scale={data.scale}
            hasLight={data.hasLight}
        />
      ))}
    </group>
  );
};
