import { ArrowUpRight, Gift, Wallet } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MAINTENANCE_FEE_PERCENT, SUCCESSOR_SEQUENCE_MAX, MIN_WITHDRAWAL_AMOUNT } from '../../constants/business';

export interface OverviewStatsSectionProps {
  totalEarnings: number;
  paidReferrals: number;
  onOpenWithdrawalModal: () => void;
}

export const OverviewStatsSection: React.FC<OverviewStatsSectionProps> = ({
  totalEarnings,
  paidReferrals,
  onOpenWithdrawalModal,
}) => {
  const { t } = useTranslation();

  const stats = [
    {
      icon: Wallet,
      label: t('stats.totalEarnings'),
      value: `€${totalEarnings.toFixed(2)}`,
      color: "text-neon-pink",
      subtext: t('stats.maintenanceDeducted', { percent: MAINTENANCE_FEE_PERCENT }),
      showWithdraw: true,
    },
    {
      icon: Gift,
      label: t('stats.successorsAvailable'),
      value: `${paidReferrals}/${SUCCESSOR_SEQUENCE_MAX}`,
      color: "text-emerald-400",
      subtext: paidReferrals >= SUCCESSOR_SEQUENCE_MAX
        ? t('stats.chancesUsed')
        : t('stats.chancesRemaining', { count: SUCCESSOR_SEQUENCE_MAX - paidReferrals }),
      showWithdraw: false,
    },
  ];

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl hover:border-neon-blue/50 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={18} />
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-2xl text-white font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-gray-600">{stat.subtext}</div>
              </div>
              {stat.showWithdraw && (
                <button
                  onClick={onOpenWithdrawalModal}
                  disabled={totalEarnings < MIN_WITHDRAWAL_AMOUNT}
                  className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                    totalEarnings >= MIN_WITHDRAWAL_AMOUNT
                      ? 'bg-gradient-to-r from-neon-pink to-neon-purple text-white hover:shadow-[0_0_20px_rgba(255,45,117,0.4)]'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <ArrowUpRight size={16} />
                  {t('withdrawal.withdrawButton', { amount: '' })}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
