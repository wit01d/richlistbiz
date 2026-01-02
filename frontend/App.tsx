import { Preload, ScrollControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, { Suspense, useCallback, useState } from 'react';
import { HtmlOverlay } from './ux/HtmlOverlay';
import { NeonScene } from './ui/scene';

const Loader = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-[#050011] text-neon-pink font-display text-xl z-50">
    INITIALIZING SYSTEM...
  </div>
);

const PAGES_UNAUTHENTICATED = 3;
const PAGES_DASHBOARD = 6; // Dashboard needs more scroll space

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pages = isAuthenticated ? PAGES_DASHBOARD : PAGES_UNAUTHENTICATED;

  const handleAuthChange = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  }, []);

  return (
    <main className="w-full h-screen bg-[#050011] relative">
      <Suspense fallback={<Loader />}>
        <Canvas
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 2]}
            camera={{ position: [0, 2, 5], fov: 75, near: 0.1, far: 300 }}
        >
          <color attach="background" args={['#050011']} />

          <ScrollControls pages={pages} damping={0.2} distance={1}>
             {/* 3D Scene Content */}
             <NeonScene />

             {/* HTML Overlay Content */}
             <HtmlOverlay onAuthChange={handleAuthChange} />
          </ScrollControls>

          <Preload all />
        </Canvas>
      </Suspense>

    </main>
  );
};

export default App;
