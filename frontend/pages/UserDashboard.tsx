import { Check, Copy, LogOut } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DigitalProductSection,
  LinkAnalyticsSection,
  ListlineStatsSection,
  OverviewStatsSection,
  ReferralsSection,
  ReferralTreeSection,
} from '../ui/dashboard';
import { LanguageSelector } from '../ui/LanguageSelector';
import { SuccessorConfirmationModal, WithdrawalModal } from '../ux/modals';
import { logout } from '../services/Keycloak';
import type { UserDashboardProps } from '../types';
import { useDashboardStats } from '../ux/hooks/useDashboardStats';

export const UserDashboard: React.FC<UserDashboardProps> = ({
  username = "Member",
  referralCode = "ABC123",
  listlineStats = {
    position1Count: 0,
    position2Count: 0,
    position3Count: 0,
    position4Count: 0,
    totalEarningsFromPosition1: 0,
  },
  referrals = [],
  payments = [],
  linkStats = {
    totalViews: 0,
    uniqueViews: 0,
    registrations: 0,
    totalDeposits: 0,
    viewHistory: [],
  },
  referralTree = [],
  pendingSuccessorNomination,
  onConfirmSuccessor,
  onDeclineSuccessor,
  successorsUsedThisYear = 0,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // Successor confirmation modal state
  const [successorModalOpen, setSuccessorModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Withdrawal modal state
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  const referralLink = `richlist.biz/?ref=${referralCode}`;

  // Computed values from shared hook
  const {
    conversionRate,
    totalReferrals,
    paidReferrals,
    totalEarnings,
    depositedReferralTree,
  } = useDashboardStats({ referrals, payments, linkStats, referralTree });

  // Handlers
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink]);

  const handleCloseSuccessorModal = useCallback(() => {
    if (!isConfirming && !isDeclining) {
      setSuccessorModalOpen(false);
      setConfirmError(null);
    }
  }, [isConfirming, isDeclining]);

  const handleConfirmSuccessor = useCallback(async () => {
    if (!pendingSuccessorNomination || !onConfirmSuccessor) return;
    setIsConfirming(true);
    setConfirmError(null);
    try {
      await onConfirmSuccessor(pendingSuccessorNomination.nominationId);
      setSuccessorModalOpen(false);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Failed to confirm successor');
    } finally {
      setIsConfirming(false);
    }
  }, [pendingSuccessorNomination, onConfirmSuccessor]);

  const handleDeclineSuccessor = useCallback(async () => {
    if (!pendingSuccessorNomination || !onDeclineSuccessor) return;
    setIsDeclining(true);
    setConfirmError(null);
    try {
      await onDeclineSuccessor(pendingSuccessorNomination.nominationId);
      setSuccessorModalOpen(false);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Failed to decline successor');
    } finally {
      setIsDeclining(false);
    }
  }, [pendingSuccessorNomination, onDeclineSuccessor]);

  const handleOpenWithdrawalModal = useCallback(() => {
    setWithdrawalModalOpen(true);
    setWithdrawalError(null);
  }, []);

  const handleCloseWithdrawalModal = useCallback(() => {
    if (!isWithdrawing) {
      setWithdrawalModalOpen(false);
      setWithdrawalError(null);
    }
  }, [isWithdrawing]);

  const handleWithdraw = useCallback(async (amount: number) => {
    setIsWithdrawing(true);
    setWithdrawalError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`[Withdrawal] Processing €${amount.toFixed(2)} withdrawal`);
      setWithdrawalModalOpen(false);
    } catch (err) {
      setWithdrawalError(err instanceof Error ? err.message : 'Failed to process withdrawal');
    } finally {
      setIsWithdrawing(false);
    }
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="font-display text-3xl text-white mb-1">
            {t('dashboard.welcome')} <span className="text-neon-pink">{username}</span>
          </h2>
          <p className="font-sans text-gray-400 text-sm">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0 flex-wrap items-center">
          <LanguageSelector />
          <button
            onClick={() => logout()}
            className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            {t('common.signOut')}
          </button>
        </div>
      </div>

      {/* Referral Link Bar */}
      <div className="bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-purple/30 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">{t('dashboard.yourLink')}</span>
            <code className="text-neon-blue bg-black/40 px-3 py-1 rounded font-mono text-sm">{referralLink}</code>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-white/10 rounded-md transition-colors text-white"
              title={copied ? t('common.copied') : t('common.copy')}
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Sections */}
      <ReferralsSection
        referrals={referrals}
        totalReferrals={totalReferrals}
        onCopyLink={handleCopy}
      />

      <LinkAnalyticsSection
        linkStats={linkStats}
        conversionRate={conversionRate}
      />

      <ReferralTreeSection
        tree={depositedReferralTree}
        username={username}
      />

      <ListlineStatsSection listlineStats={listlineStats} />

      <OverviewStatsSection
        totalEarnings={totalEarnings}
        paidReferrals={paidReferrals}
        onOpenWithdrawalModal={handleOpenWithdrawalModal}
      />

      <DigitalProductSection />

      {/* Modals */}
      {pendingSuccessorNomination && (
        <SuccessorConfirmationModal
          isOpen={successorModalOpen}
          onClose={handleCloseSuccessorModal}
          nomination={pendingSuccessorNomination}
          onConfirm={handleConfirmSuccessor}
          onDecline={onDeclineSuccessor ? handleDeclineSuccessor : undefined}
          isConfirming={isConfirming}
          isDeclining={isDeclining}
          error={confirmError}
          successorsUsedThisYear={successorsUsedThisYear}
        />
      )}

      <WithdrawalModal
        isOpen={withdrawalModalOpen}
        onClose={handleCloseWithdrawalModal}
        balance={totalEarnings}
        onWithdraw={handleWithdraw}
        isProcessing={isWithdrawing}
        error={withdrawalError}
      />
    </div>
  );
};
