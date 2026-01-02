// =============================================================================
// DASHBOARD STATS HOOK
// Shared calculations for dashboard metrics
// =============================================================================

import { useMemo } from 'react';
import type { LinkStats, Payment, Referral } from '../../types/dashboard';
import type { ReferralTreeNode } from '../../types/tree';
import { filterPaidNodes } from '../../utils/treeUtils';

interface DashboardStatsInput {
  referrals: Referral[];
  payments: Payment[];
  linkStats: LinkStats;
  referralTree: ReferralTreeNode[];
}

interface DashboardStats {
  conversionRate: number;
  totalReferrals: number;
  paidReferrals: number;
  totalEarnings: number;
  depositedReferralTree: ReferralTreeNode[];
}

/**
 * Hook to compute dashboard statistics from raw data
 * Memoizes calculations for performance
 */
export const useDashboardStats = ({
  referrals,
  payments,
  linkStats,
  referralTree,
}: DashboardStatsInput): DashboardStats => {
  const conversionRate = useMemo(() => {
    if (linkStats.uniqueViews === 0) return 0;
    return (linkStats.registrations / linkStats.uniqueViews) * 100;
  }, [linkStats.uniqueViews, linkStats.registrations]);

  const { totalReferrals, paidReferrals, totalEarnings } = useMemo(() => {
    const total = referrals.length;
    const paid = referrals.filter(r => r.paid).length;
    const earnings = payments.reduce((sum, p) => sum + p.netAmount, 0);
    return { totalReferrals: total, paidReferrals: paid, totalEarnings: earnings };
  }, [referrals, payments]);

  const depositedReferralTree = useMemo(() => {
    return filterPaidNodes(referralTree);
  }, [referralTree]);

  return {
    conversionRate,
    totalReferrals,
    paidReferrals,
    totalEarnings,
    depositedReferralTree,
  };
};
