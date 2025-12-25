import { Scroll } from '@react-three/drei';
import { ArrowDown, ChevronRight, Cpu, Lock, Mail, User as UserIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ReferralDashboard } from '../pages/ReferralDashboard';
import { initKeycloak, register } from '../services/Keycloak';

const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <section className={`h-screen w-screen flex flex-col items-center justify-center p-8 ${className}`}>
    {children}
  </section>
);

export const HtmlOverlay: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>("User");

  useEffect(() => {
    initKeycloak().then((kc) => {
        if (kc?.authenticated) {
            setIsAuthenticated(true);
            // Try to get name from token
            const name = kc.tokenParsed?.preferred_username || kc.tokenParsed?.name || "Member";
            setUsername(name);
        }
    });
  }, []);

  return (
    <Scroll html style={{ width: '100%', height: '100%' }}>
      {/* DASHBOARD SECTION (shown first when authenticated) */}
      {isAuthenticated && (
        <section className="min-h-screen w-screen flex flex-col items-center justify-start pt-20 md:pt-24 px-4">
          <ReferralDashboard username={username} />
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
            <p className="font-sans text-xl md:text-3xl text-neon-blue tracking-widest uppercase mb-12 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">
              Get on your own list.
            </p>
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
    </Scroll>
  );
};

