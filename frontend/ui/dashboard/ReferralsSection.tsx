import { Copy, Users } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Referral } from '../../types';

export interface ReferralsSectionProps {
  referrals: Referral[];
  totalReferrals: number;
  onCopyLink: () => void;
}

export const ReferralsSection: React.FC<ReferralsSectionProps> = ({
  referrals,
  totalReferrals,
  onCopyLink,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 mb-6">
      <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-display text-xl">{t('referrals.title')}</h3>
          <span className="text-gray-400 text-sm">{totalReferrals} {t('referrals.total')}</span>
        </div>

        {referrals.length > 0 ? (
          <div className="space-y-3">
            {referrals.map((referral, idx) => (
              <div key={referral.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neon-purple/30 flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{referral.username}</p>
                    <p className="text-gray-500 text-xs">{t('referrals.joined', { date: referral.date })}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${referral.paid
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                  {referral.paid ? t('referrals.deposited') : t('referrals.pending')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Users className="text-gray-600 mb-3" size={40} />
            <p className="text-gray-400 mb-2">{t('referrals.noReferrals')}</p>
            <p className="text-gray-600 text-sm max-w-sm">{t('referrals.noReferralsDesc')}</p>
            <button
              onClick={onCopyLink}
              className="mt-4 px-4 py-2 bg-neon-purple text-white rounded-lg font-medium text-sm hover:bg-neon-purple/80 transition-colors flex items-center gap-2"
            >
              <Copy size={16} />
              {t('referrals.copyLink')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
