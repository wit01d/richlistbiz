import React from 'react';
import { Card } from '../../ui/primitives';
import type { SimEvent } from '../../types/simulation';

interface SimulationEventLogProps {
  events: SimEvent[];
  maxDisplay?: number;
  className?: string;
}

const eventStyles: Record<string, string> = {
  successor: 'bg-neon-pink/10 border border-neon-pink/20 text-neon-pink',
  deposit: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
  user_created: 'bg-neon-blue/10 border border-neon-blue/20 text-neon-blue',
  info: 'bg-white/5 border border-white/10 text-gray-400',
  fraud_alert: 'bg-red-500/10 border border-red-500/20 text-red-400',
};

export const SimulationEventLog: React.FC<SimulationEventLogProps> = ({
  events,
  maxDisplay = 20,
  className = '',
}) => {
  return (
    <Card className={`max-h-64 overflow-y-auto ${className}`}>
      <h2 className="text-sm font-display font-semibold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
        <span>Event Log</span>
      </h2>
      <div className="space-y-1.5 text-xs">
        {events.slice(0, maxDisplay).map((event) => (
          <div
            key={event.id}
            className={`p-2 rounded-lg ${eventStyles[event.type] || eventStyles.info}`}
          >
            {event.message}
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-gray-600 text-center py-4">Press Play or Step to start</div>
        )}
      </div>
    </Card>
  );
};

export default SimulationEventLog;
