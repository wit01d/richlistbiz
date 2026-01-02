import React from 'react';
import { Crown } from 'lucide-react';
import { SUCCESSOR_SEQUENCE_MAX } from '../../constants/business';
import type { User } from '../../types/simulation';

interface SuccessorProgressCardsProps {
  successorReady: User[];
  closeToSuccessor: User[];
  onUserSelect: (user: User) => void;
}

export const SuccessorProgressCards: React.FC<SuccessorProgressCardsProps> = ({
  successorReady,
  closeToSuccessor,
  onUserSelect,
}) => {
  return (
    <>
      {/* Successor Ready */}
      {successorReady.length > 0 && (
        <div className="bg-gradient-to-r from-neon-pink/20 to-emerald-500/10 rounded-2xl p-4 border border-neon-pink/40 mb-6 shadow-lg shadow-neon-pink/10">
          <h3 className="text-sm font-display font-semibold text-neon-pink mb-3 flex items-center gap-2">
            <Crown className="text-neon-pink animate-pulse" size={16} />
            Successor Ready
            <span className="ml-auto text-xs bg-neon-pink/20 px-2 py-0.5 rounded-full">{successorReady.length} ready</span>
          </h3>
          <div className="flex flex-wrap gap-3">
            {successorReady.map(user => (
              <button
                key={user.id}
                onClick={() => onUserSelect(user)}
                className="w-[calc(20%-0.6rem)] min-w-[120px] bg-black/40 backdrop-blur-md rounded-xl p-3 hover:bg-white/10 transition-all text-left border border-neon-pink/30 hover:border-neon-pink/50 shadow-md shadow-neon-pink/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-neon-pink text-white animate-pulse">
                    {user.name.charAt(0)}
                  </span>
                  <span className="text-white text-sm font-medium truncate">{user.name}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                  <div
                    className="h-2 rounded-full bg-neon-pink animate-pulse"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="text-xs text-neon-pink text-center font-medium">
                  {user.depositingRecruits}/{SUCCESSOR_SEQUENCE_MAX} READY!
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Close to Successor */}
      {closeToSuccessor.length > 0 && (
        <div className="bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-2xl p-4 border border-neon-purple/20 mb-6">
          <h3 className="text-sm font-display font-semibold text-neon-purple mb-3 flex items-center gap-2">
            <Crown className="text-neon-purple" size={16} />
            Close to Successor Nomination
            <span className="ml-auto text-xs bg-neon-purple/20 px-2 py-0.5 rounded-full">{closeToSuccessor.length} close</span>
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {closeToSuccessor.map(user => (
              <button
                key={user.id}
                onClick={() => onUserSelect(user)}
                className="flex-shrink-0 w-32 bg-black/40 backdrop-blur-md rounded-xl p-3 hover:bg-white/10 transition-all text-left border border-white/5 hover:border-neon-purple/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-neon-purple/30 text-neon-purple">
                    {user.name.charAt(0)}
                  </span>
                  <span className="text-white text-sm font-medium truncate">{user.name}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink transition-all"
                    style={{ width: `${Math.min(100, (user.depositingRecruits / SUCCESSOR_SEQUENCE_MAX) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 text-center">
                  {user.depositingRecruits}/{SUCCESSOR_SEQUENCE_MAX}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default SuccessorProgressCards;
