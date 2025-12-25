import { Preload, ScrollControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, { Suspense } from 'react';
import { HtmlOverlay } from './components/HtmlOverlay';
import { NeonScene } from './components/NeonScene';

const Loader = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-[#050011] text-neon-pink font-display text-xl z-50">
    INITIALIZING SYSTEM...
  </div>
);

const App: React.FC = () => {
  return (
    <main className="w-full h-screen bg-[#050011] relative">
      <Suspense fallback={<Loader />}>
        <Canvas
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 2]}
            camera={{ position: [0, 2, 5], fov: 75, near: 0.1, far: 300 }}
        >
          <color attach="background" args={['#050011']} />

          <ScrollControls pages={3} damping={0.2} distance={1}>
             {/* 3D Scene Content */}
             <NeonScene />

             {/* HTML Overlay Content */}
             <HtmlOverlay />
          </ScrollControls>

          <Preload all />
        </Canvas>
      </Suspense>

      {/* Persistent Audio/UI Controls could go here outside canvas if needed */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
         {/* <span className="text-white/20 font-mono text-xs">RichList.biz 2025</span> */}
      </div>
    </main>
  );
};

export default App;
