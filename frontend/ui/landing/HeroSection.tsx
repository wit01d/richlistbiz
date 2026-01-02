import React from 'react';
import { ArrowDown, Play } from 'lucide-react';

export interface HeroSectionProps {
  onPlayClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onPlayClick }) => {
  return (
    <section className="h-screen w-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="font-display text-6xl md:text-9xl font-black text-white drop-shadow-[0_0_15px_rgba(255,0,255,0.8)] tracking-tighter mb-4">
        RichList.biz
      </h1>
      <p className="font-sans text-xl md:text-3xl text-neon-blue tracking-widest uppercase mb-8 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">
        Get on your own list.
      </p>

      {/* YouTube Play Button */}
      <button
        onClick={onPlayClick}
        className="group relative w-20 h-20 mb-8 rounded-full bg-white/20 border-2 border-white flex items-center justify-center hover:bg-white/40 hover:scale-110 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:shadow-[0_0_40px_rgba(255,255,255,0.6)]"
      >
        <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
      </button>
      <p className="text-sm text-gray-400 mb-8">Watch how it works</p>

      <div className="animate-bounce">
        <ArrowDown className="w-8 h-8 text-neon-pink" />
      </div>
    </section>
  );
};

export default HeroSection;
