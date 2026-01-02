import React from 'react';
import { User as UserIcon, Mail, Cpu } from 'lucide-react';

const features = [
  { icon: UserIcon, title: "Register", desc: "and get a membership on RichList.biz." },
  { icon: Mail, title: "Send", desc: "links to your best friends and invite them to join your list." },
  { icon: Cpu, title: "Earn", desc: "coins for every new membership." }
];

export const FeaturesSection: React.FC = () => {
  return (
    <section className="h-screen w-screen flex flex-col items-start justify-center p-8">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="bg-black/40 backdrop-blur-md border border-neon-purple/30 p-8 rounded-lg transform transition-all hover:scale-105 hover:border-neon-pink group"
          >
            <feature.icon className="w-12 h-12 text-neon-blue mb-4 group-hover:text-neon-pink transition-colors duration-300" />
            <h3 className="font-display text-2xl text-white mb-2">{feature.title}</h3>
            <p className="font-sans text-gray-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
