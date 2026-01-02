import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LinkAnalyticsSection,
  ListlineStatsSection,
  OverviewStatsSection,
  ReferralsSection,
  ReferralTreeSection,
} from '../ui/dashboard';
import { SuccessorConfirmationModal, WithdrawalModal } from '../ux/modals';
import type { UserDashboardProps } from '../types';
import { useDashboardStats } from '../ux/hooks/useDashboardStats';

// Simulation dashboard component
export const SIMULATION: React.FC<UserDashboardProps> = ({
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
      {/* Dashboard Sections - No header or referral link bar in simulation mode */}
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
