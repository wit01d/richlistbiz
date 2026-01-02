import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ListlineStats } from '../../types';

export interface ListlineStatsSectionProps {
  listlineStats: ListlineStats;
}

interface PositionStat {
  position: number;
  label: string;
  description: string;
  count: number;
  earnings: number | null;
  icon: string;
}

export const ListlineStatsSection: React.FC<ListlineStatsSectionProps> = ({
  listlineStats,
}) => {
  const { t } = useTranslation();

  const positionStats: PositionStat[] = [
    {
      position: 1,
      label: t('listline.position1'),
      description: t('listline.position1Desc'),
      count: listlineStats.position1Count,
      earnings: listlineStats.totalEarningsFromPosition1,
      icon: "💰",
    },
    {
      position: 2,
      label: t('listline.position2'),
      description: t('listline.position2Desc'),
      count: listlineStats.position2Count,
      earnings: null,
      icon: "📊",
    },
    {
      position: 3,
      label: t('listline.position3'),
      description: t('listline.position3Desc'),
      count: listlineStats.position3Count,
      earnings: null,
      icon: "👥",
    },
    {
      position: 4,
      label: t('listline.position4'),
      description: t('listline.position4Desc'),
      count: listlineStats.position4Count,
      earnings: null,
      icon: "🌱",
    },
  ];

  const getPositionStyles = (position: number) => {
    switch (position) {
      case 1:
        return {
          container: 'bg-neon-pink/10 border-neon-pink',
          badge: 'bg-neon-pink/20 text-neon-pink',
          count: 'text-neon-pink',
        };
      case 2:
        return {
          container: 'bg-neon-purple/10 border-neon-purple/50',
          badge: 'bg-neon-purple/20 text-neon-purple',
          count: 'text-neon-purple',
        };
      case 3:
        return {
          container: 'bg-neon-blue/10 border-neon-blue/50',
          badge: 'bg-neon-blue/20 text-neon-blue',
          count: 'text-neon-blue',
        };
      default:
        return {
          container: 'bg-emerald-500/10 border-emerald-500/50',
          badge: 'bg-emerald-500/20 text-emerald-400',
          count: 'text-emerald-400',
        };
    }
  };

  return (
    <div className="space-y-6 mb-8">
      <div className="bg-black/40 backdrop-blur-md border border-neon-purple/30 rounded-2xl p-6">
        <h3 className="text-white font-display text-xl mb-2">{t('listline.presenceTitle')}</h3>
        <p className="text-gray-400 text-sm mb-6">
          {t('listline.presenceSubtitle')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {positionStats.map((stat) => {
            const styles = getPositionStyles(stat.position);
            return (
              <div
                key={stat.position}
                className={`relative p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${styles.container}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{stat.icon}</span>
                  <span className={`text-xs font-mono px-2 py-1 rounded ${styles.badge}`}>
                    POS {stat.position}
                  </span>
                </div>
                <div className={`text-4xl font-display font-bold mb-1 ${styles.count}`}>
                  {stat.count}
                </div>
                <div className="text-sm text-gray-400 mb-1">{stat.label}</div>
                <div className="text-xs text-gray-600">{stat.description}</div>
                {stat.earnings !== null && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-xs text-gray-500">{t('listline.earningsFromPosition1')}</div>
                    <div className="text-lg font-bold text-neon-pink">€{stat.earnings.toFixed(2)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
