import React from 'react';
import { ChevronRight, Lock } from 'lucide-react';
import { register } from '../../services/Keycloak';

export const SignupCard: React.FC = () => {
  return (
    <section className="h-screen w-screen flex flex-col items-center justify-center p-8">
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
            and be the part of <br />
            <span className="text-neon-blue/60">the big change.</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default SignupCard;
