import { Scroll } from '@react-three/drei';
import { ArrowDown, ChevronRight, Cpu, FlaskConical, Lock, Loader2, Mail, Play, Settings, User as UserIcon, X } from 'lucide-react';
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { UserDashboard } from '../pages/UserDashboard';
import { initKeycloak, register } from '../services/Keycloak';

// Lazy load heavy components for better initial load performance
const ReferralSimulation = lazy(() => import('../pages/ReferralSimulation'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));

// Loading fallback for lazy-loaded components
const LazyLoadFallback: React.FC = () => (
  <div className="w-full max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
      <span className="text-gray-400 text-sm">Loading component...</span>
    </div>
  </div>
);

// YouTube Video Modal Component - uses portal to render outside Scroll/Canvas
const YouTubeModal: React.FC<{ videoId: string; isOpen: boolean; onClose: () => void }> = ({ videoId, isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl mx-4 aspect-video"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-neon-pink transition-colors"
        >
          <X className="w-8 h-8" />
        </button>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          className="w-full h-full rounded-lg border border-neon-purple/50 shadow-[0_0_30px_rgba(191,0,255,0.3)]"
          style={{ zIndex: 10000 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>,
    document.body
  );
};

const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <section className={`h-screen w-screen flex flex-col items-center justify-center p-8 ${className}`}>
    {children}
  </section>
);

interface HtmlOverlayProps {
  onAuthChange?: (isAuthenticated: boolean) => void;
}

// Replace with your actual YouTube video ID

// const PROMO_VIDEO_ID = "0tHb6U2604g";
const PROMO_VIDEO_ID = "U1Ll4mvhBXI";

type AuthenticatedView = 'dashboard' | 'simulation' | 'admin';

export const HtmlOverlay: React.FC<HtmlOverlayProps> = ({ onAuthChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>("User");
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AuthenticatedView>('dashboard');

  useEffect(() => {
    initKeycloak().then((kc) => {
        if (kc?.authenticated) {
            setIsAuthenticated(true);
            onAuthChange?.(true);
            // Try to get name from token
            const name = kc.tokenParsed?.preferred_username || kc.tokenParsed?.name || "Member";
            setUsername(name);
        } else {
            onAuthChange?.(false);
        }
    });
  }, [onAuthChange]);

  return (
    <Scroll html style={{ width: '100%' }}>
      {/* AUTHENTICATED SECTIONS */}
      {isAuthenticated && (
        <section className="min-h-screen w-screen flex flex-col items-center justify-start pt-20 md:pt-24 px-4">
          {/* Navigation Tabs */}
          <div className="w-full max-w-5xl mx-auto mb-6 flex gap-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                currentView === 'dashboard'
                  ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('simulation')}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                currentView === 'simulation'
                  ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <FlaskConical size={16} />
              Simulation
            </button>
            <button
              onClick={() => setCurrentView('admin')}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                currentView === 'admin'
                  ? 'bg-neon-pink text-white shadow-[0_0_15px_rgba(255,45,117,0.4)]'
                  : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <Settings size={16} />
              Admin
            </button>
          </div>

          {/* Dashboard View */}
          {currentView === 'dashboard' && <UserDashboard username={username} onNavigate={setCurrentView} />}

          {/* Simulation View - Lazy loaded */}
          {currentView === 'simulation' && (
            <Suspense fallback={<LazyLoadFallback />}>
              <ReferralSimulation />
            </Suspense>
          )}

          {/* Admin Console View - Lazy loaded */}
          {currentView === 'admin' && (
            <Suspense fallback={<LazyLoadFallback />}>
              <AdminDashboard />
            </Suspense>
          )}
        </section>
      )}

      {/* HERO, FEATURES & SIGNUP shown only when NOT authenticated */}
      {!isAuthenticated && (
        <>
          {/* HERO SECTION */}
          <Section className="text-center">
            <h1 className="font-display text-6xl md:text-9xl font-black text-white drop-shadow-[0_0_15px_rgba(255,0,255,0.8)] tracking-tighter mb-4">
              RichList.biz
            </h1>
            <p className="font-sans text-xl md:text-3xl text-neon-blue tracking-widest uppercase mb-8 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">
              Get on your own list.
            </p>

            {/* YouTube Play Button */}
            <button
              onClick={() => setIsVideoOpen(true)}
              className="group relative w-20 h-20 mb-8 rounded-full bg-white/20 border-2 border-white flex items-center justify-center hover:bg-white/40 hover:scale-110 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:shadow-[0_0_40px_rgba(255,255,255,0.6)]"
            >
              <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
            </button>
            <p className="text-sm text-gray-400 mb-8">Watch how it works</p>

            <div className="animate-bounce">
                <ArrowDown className="w-8 h-8 text-neon-pink" />
            </div>
          </Section>

          {/* FEATURES SECTION */}
          <Section className="items-start">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                {[
                    { icon: UserIcon, title: "Register", desc: "and get a membership on RichList.biz." },
                    { icon: Mail, title: "Send", desc: "links to your best friends and invite them to join your list." },
                    { icon: Cpu, title: "Earn", desc: "coins for every new membership." }
                ].map((feature, idx) => (
                    <div key={idx} className="bg-black/40 backdrop-blur-md border border-neon-purple/30 p-8 rounded-lg transform transition-all hover:scale-105 hover:border-neon-pink group">
                        <feature.icon className="w-12 h-12 text-neon-blue mb-4 group-hover:text-neon-pink transition-colors duration-300" />
                        <h3 className="font-display text-2xl text-white mb-2">{feature.title}</h3>
                        <p className="font-sans text-gray-400">{feature.desc}</p>
                    </div>
                ))}
            </div>
          </Section>

          {/* SIGNUP CARD SECTION */}
          <Section>
              <div className="w-full max-w-md bg-black/70 backdrop-blur-2xl border border-neon-pink p-8 rounded-2xl shadow-[0_0_50px_rgba(255,0,255,0.25)] relative overflow-hidden group">

                  {/* Animated shiny border effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />

                  <div className="text-center mb-8 relative z-10">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-pink/10 border border-neon-pink mb-4 shadow-[0_0_20px_rgba(255,0,255,0.4)]">
                          <Lock className="w-8 h-8 text-neon-pink" />
                      </div>
                      <h2 className="font-display text-4xl text-white mb-2 tracking-tight">JOIN THE LIST</h2>
                      <p className="font-sans text-neon-blue uppercase tracking-widest text-xs">
                          by clicking the button
                      </p>
                  </div>

                  <div className="space-y-4 relative z-10">

                          <button
                              type="button"
                              onClick={() => register()}
                              className="w-full bg-gradient-to-r from-neon-purple to-neon-pink text-white font-display font-bold py-4 rounded-lg shadow-[0_0_20px_rgba(191,0,255,0.4)] hover:shadow-[0_0_40px_rgba(255,0,255,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group/btn mt-2"
                          >
                              Register <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                          </button>

                          <p className="text-[10px] text-center text-gray-600 font-mono uppercase tracking-tight mt-4">
                              and be the part of <br/>
                                <span className="text-neon-blue/60">the big change.</span>
                          </p>
                      </div>

              </div>
          </Section>
        </>
      )}

      {/* YouTube Video Modal */}
      <YouTubeModal
        videoId={PROMO_VIDEO_ID}
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
      />
    </Scroll>
  );
};

