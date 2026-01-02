// =============================================================================
// DASHBOARD TYPES
// Centralized type definitions for dashboard components
// =============================================================================

import { ReferralTreeNode } from './tree';

/**
 * Statistics for listline positions
 */
export interface ListlineStats {
  position1Count: number;
  position2Count: number;
  position3Count: number;
  position4Count: number;
  totalEarningsFromPosition1: number;
}

/**
 * Referral information
 */
export interface Referral {
  id: string;
  username: string;
  date: string;
  paid: boolean;
}

/**
 * Payment record
 */
export interface Payment {
  id: string;
  from: string;
  amount: number;
  netAmount: number;
  date: string;
}

/**
 * Analytics history data point for tracking views, registrations, and deposits over time
 */
export interface AnalyticsHistoryPoint {
  date: string;
  views: number;
  registrations: number;
  deposits: number;
}

/**
 * Link statistics for referral tracking
 */
export interface LinkStats {
  totalViews: number;
  uniqueViews: number;
  registrations: number;
  totalDeposits: number;
  viewHistory: AnalyticsHistoryPoint[];
}

/**
 * Click history data point (deprecated - use AnalyticsHistoryPoint)
 * @deprecated Use AnalyticsHistoryPoint instead
 */
export interface ClickHistoryPoint {
  date: string;
  clicks: number;
}

/**
 * Pending successor nomination details
 */
export interface PendingSuccessorNomination {
  nominationId: string;
  nomineeId: string;
  nomineeName: string;
  nomineeDate: string;
  autoSelectedAt: string;
  expiresAt?: string;
  position1Name: string;
}

/**
 * Props for UserDashboard component
 */
export interface UserDashboardProps {
  username?: string;
  referralCode?: string;
  listlineStats?: ListlineStats;
  upline?: string[];
  referrals?: Referral[];
  payments?: Payment[];
  linkStats?: LinkStats;
  referralTree?: ReferralTreeNode[];
  onNavigate?: (view: 'dashboard' | 'simulation-dashboard' | 'admin') => void;
  pendingSuccessorNomination?: PendingSuccessorNomination;
  onConfirmSuccessor?: (nominationId: string) => Promise<void>;
  onDeclineSuccessor?: (nominationId: string) => Promise<void>;
  successorsUsedThisYear?: number;
}

/**
 * Props for ReferralCodeVerification component
 */
export interface ReferralCodeVerificationProps {
  onVerified: (code: string) => void;
}

/**
 * Props for MembershipPayment component
 */
export interface MembershipPaymentProps {
  onPaymentComplete: () => void;
  referrerName?: string;
}
