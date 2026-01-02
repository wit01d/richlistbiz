import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

export interface StatCardTrend {
  value: number;
  isPositive: boolean;
}

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
  trend?: StatCardTrend;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  subtext,
  color = 'text-neon-blue',
  trend,
  className = '',
}) => {
  return (
    <Card hoverable className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
            <Icon size={18} />
          </div>
          <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        </div>
        {trend && (
          <span className={`text-xs px-2 py-1 rounded ${trend.isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="font-display text-2xl text-white font-bold mb-1">{value}</div>
      {subtext && <div className="text-xs text-gray-600">{subtext}</div>}
    </Card>
  );
};

export default StatCard;
