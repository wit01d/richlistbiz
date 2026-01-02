import { Eye, Link, MousePointerClick, TrendingUp, UserPlus, Wallet } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { DEPOSIT_AMOUNT, CURRENCY_SYMBOL } from '../../constants/business';
import { SectionHeader } from '../primitives';
import type { LinkStats } from '../../types';

export interface LinkAnalyticsSectionProps {
  linkStats: LinkStats;
  conversionRate: number;
}

export const LinkAnalyticsSection: React.FC<LinkAnalyticsSectionProps> = ({
  linkStats,
  conversionRate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-black/40 backdrop-blur-md border border-neon-blue/30 rounded-2xl p-6 mb-6">
      <SectionHeader
        icon={Link}
        title={t('linkAnalytics.title')}
        subtitle={t('linkAnalytics.subtitle')}
        colorTheme="blue"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="text-gray-400" size={16} />
            <span className="text-xs text-gray-500 uppercase">{t('linkAnalytics.totalViews')}</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">{linkStats.totalViews.toLocaleString()}</div>
          <div className="text-xs text-gray-600">{t('linkAnalytics.allTimeViews')}</div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="text-emerald-400" size={16} />
            <span className="text-xs text-gray-500 uppercase">{t('linkAnalytics.registrations')}</span>
          </div>
          <div className="text-2xl font-display font-bold text-emerald-400">{linkStats.registrations.toLocaleString()}</div>
          <div className="text-xs text-gray-600">{t('linkAnalytics.signupsFromLink')}</div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="text-neon-purple" size={16} />
            <span className="text-xs text-gray-500 uppercase">{t('linkAnalytics.deposits')}</span>
          </div>
          <div className="text-2xl font-display font-bold text-neon-purple">{linkStats.totalDeposits.toLocaleString()}</div>
          <div className="text-xs text-gray-600">{CURRENCY_SYMBOL}{(linkStats.totalDeposits * DEPOSIT_AMOUNT).toLocaleString()} {t('linkAnalytics.fromReferrals')}</div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-neon-pink" size={16} />
            <span className="text-xs text-gray-500 uppercase">{t('linkAnalytics.conversion')}</span>
          </div>
          <div className="text-2xl font-display font-bold text-neon-pink">{conversionRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-600">{t('linkAnalytics.clickToSignupRate')}</div>
        </div>
      </div>

      {linkStats.viewHistory.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={linkStats.viewHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number) => [value, t('linkAnalytics.views')]}
              />
              <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} fill="url(#viewsGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {linkStats.totalViews === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          <MousePointerClick className="mx-auto mb-2 text-gray-600" size={24} />
          {t('linkAnalytics.noClicks')}
        </div>
      )}
    </div>
  );
};
