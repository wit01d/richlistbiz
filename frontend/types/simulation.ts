// Simulation domain types - extracted from useReferralSimulation
import type { ListlineStats, Referral, Payment, LinkStats } from './dashboard';
import type { ReferralTreeNode } from './tree';

export interface User {
  id: string;
  name: string;
  referrerId: string | null;
  balance: number;
  totalEarnings: number;
  directRecruits: number;
  depositingRecruits: number;
  hasDeposited: boolean;
  isVerified: boolean;
  successorNominated: boolean;
  successorId: string | null;
  isSystem: boolean;
  createdAt: number;
}

export interface Listline {
  id: string;
  userId: string;
  userName: string;
  position1: string;
  position2: string;
  position3: string;
  position4: string;
  recipientName: string;
  timestamp: number;
}

// Unified simulation event type - combines all event types from different contexts
export interface SimulationEvent {
  id: string;
  type: 'user_created' | 'deposit' | 'successor' | 'info' | 'fraud_alert' | 'view' | 'registration' | 'payment';
  message: string;
  timestamp: number;
  severity?: 'low' | 'medium' | 'high';
}

// Backwards compatibility alias
export type SimEvent = SimulationEvent;

export interface Animation {
  type: 'user_join' | 'payment_flow' | 'successor';
  userId?: string;
  fromId?: string;
  toId?: string;
  successorId?: string;
  amount?: number;
  timestamp: number;
}

export interface HistoryPoint {
  timestamp: number;
  label: string;
  totalUsers: number;
  depositedUsers: number;
  verifiedUsers: number;
  totalRevenue: number;
  systemBalance: number;
  successorCount: number;
  pendingUsers: number;
}

export interface SimulationState {
  users: Record<string, User>;
  listlines: Listline[];
  events: SimulationEvent[];
  animations: Animation[];
  nameIndex: number;
  systemBalance: number;
  totalDeposited: number;
  successorCount: number;
  history: HistoryPoint[];
}

export interface PaymentData {
  from: User | null;
  to: User | null;
  listline: {
    position1: User | null;
    position2: User | null;
    position3: User | null;
    position4: User | null;
  };
}

export type SimulationMode = 'random' | 'targeted';

// Dashboard props for user display
export interface DashboardProps {
  username: string;
  referralCode: string;
  listlineStats: {
    position1Count: number;
    position2Count: number;
    position3Count: number;
    position4Count: number;
    totalEarningsFromPosition1: number;
  };
  upline: string[];
  referrals: { id: string; username: string; date: string; paid: boolean }[];
  payments: { id: string; from: string; amount: number; netAmount: number; date: string }[];
}

// Pre-computed position index for O(1) dashboard lookups
export interface PositionIndex {
  positions: Map<string, {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    payments: { id: string; from: string; timestamp: number }[];
  }>;
  referralsMap: Map<string, User[]>;
}

// Dashboard simulation state - used for user dashboard simulation
export interface DashboardSimulationState {
  referralCode: string;
  listlineStats: ListlineStats;
  upline: string[];
  referrals: Referral[];
  payments: Payment[];
  linkStats: LinkStats;
  referralTree: ReferralTreeNode[];
  events: SimulationEvent[];
  successorCount: number;
  totalDeposits: number;
}
