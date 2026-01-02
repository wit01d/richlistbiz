import React from 'react';
import { DEPOSIT_AMOUNT } from '../../constants/business';
import type { PaymentData } from '../../types/simulation';

interface ListlineVisualizationProps {
  payment: PaymentData | null;
  isActive: boolean;
}

const positionConfig = [
  { pos: 4, label: 'Depositor', color: 'from-cyan-500 to-cyan-600', inactiveColor: 'from-cyan-500/30 to-cyan-600/20', textColor: 'text-cyan-400' },
  { pos: 3, label: 'Parent', color: 'from-violet-500 to-violet-600', inactiveColor: 'from-violet-500/30 to-violet-600/20', textColor: 'text-violet-400' },
  { pos: 2, label: 'Grandparent', color: 'from-amber-500 to-amber-600', inactiveColor: 'from-amber-500/30 to-amber-600/20', textColor: 'text-amber-400' },
  { pos: 1, label: 'Recipient', color: 'from-rose-500 to-rose-600', inactiveColor: 'from-rose-500/30 to-rose-600/20', textColor: 'text-rose-400' },
];

export const ListlineVisualization: React.FC<ListlineVisualizationProps> = ({ payment, isActive }) => {
  if (!payment) {
    return (
      <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 mb-6">
        <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2 text-gray-400">
          <span>Payment Flow</span>
        </h3>
        <div className="text-center text-gray-500 text-sm py-4">
          Make a deposit to see the payment flow
        </div>
      </div>
    );
  }

  const positions = [
    { ...positionConfig[0], user: payment.listline.position4 },
    { ...positionConfig[1], user: payment.listline.position3 },
    { ...positionConfig[2], user: payment.listline.position2 },
    { ...positionConfig[3], user: payment.listline.position1 },
  ];

  return (
    <div className={`rounded-2xl p-4 border mb-6 transition-all duration-300 ${
      isActive
        ? 'bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border-neon-pink/50 shadow-lg shadow-neon-pink/20'
        : 'bg-black/40 backdrop-blur-md border-white/5'
    }`}>
      <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2 text-white">
        <span className={isActive ? 'text-neon-pink animate-pulse' : 'text-gray-500'}>Payment Flow: {DEPOSIT_AMOUNT}</span>
        {isActive && <span className="ml-2 text-xs text-neon-pink animate-pulse">LIVE</span>}
        {!isActive && <span className="ml-2 text-xs text-gray-500">Last Payment</span>}
      </h3>

      <div className="flex items-center justify-between gap-1">
        {positions.map((p, i) => (
          <React.Fragment key={p.pos}>
            <div className={`flex-1 text-center p-2 rounded-xl bg-gradient-to-b ${isActive ? p.color : p.inactiveColor} text-white shadow-lg transition-all duration-300 ${isActive ? 'scale-105' : ''} border border-white/10`}>
              <div className={`text-xs font-bold ${p.textColor}`}>P{p.pos}</div>
              <div className="font-display font-bold text-sm truncate">{p.user?.name || 'SYSTEM'}</div>
              <div className="text-xs opacity-75">{p.label}</div>
            </div>
            {i < 3 && (
              <span className={`text-lg transition-all ${isActive ? 'text-rose-400 animate-pulse' : 'text-gray-600'}`}></span>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className={`mt-3 text-center text-xs ${isActive ? 'text-neon-pink' : 'text-gray-500'}`}>
        {isActive ? 'Payment in progress...' : `${payment.from?.name || 'User'}  ${payment.to?.name || 'SYSTEM'}`}
      </div>
    </div>
  );
};

export default ListlineVisualization;
