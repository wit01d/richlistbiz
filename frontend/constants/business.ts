// Payment amounts
export const DEPOSIT_AMOUNT = 10;
export const DEPOSIT_AMOUNT_CENTS = 1000;
export const MIN_WITHDRAWAL_AMOUNT = 100;

// Fees
export const MAINTENANCE_FEE_PERCENT = 10;
export const MAINTENANCE_FEE_RATE = MAINTENANCE_FEE_PERCENT / 100;
export const NET_PAYOUT_RATE = 1 - MAINTENANCE_FEE_RATE;

// Derived values
export const NET_PAYOUT = DEPOSIT_AMOUNT * NET_PAYOUT_RATE;

// Currency
export const DEFAULT_CURRENCY = 'EUR';
export const CURRENCY_SYMBOL = '€';

// Conversion rate (view → registration)
export const CONVERSION_RATE = 0.01; // 1%

// Successor system
// Each depositing recruit is assigned a random sequence number (1 to SUCCESSOR_SEQUENCE_MAX).
// When the Nth depositing recruit has sequence number = N, they are immediately nominated.
// Probability of nomination per recruit: 1/SUCCESSOR_SEQUENCE_MAX (25% with default of 4).
export const SUCCESSOR_SEQUENCE_MAX = 4;

// UI display limits
export const MAX_EVENTS_DISPLAYED = 100;
export const MAX_HISTORY_POINTS = 50;
export const MAX_PAYMENTS_DISPLAYED = 5;
export const MAX_USERS_DISPLAYED = 20;

// Colors for charts and visualizations
export const COLORS = {
  neonPink: '#ff2d75',
  neonPurple: '#a855f7',
  neonBlue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  system: '#7c3aed',
  red: '#ef4444',
  background: '#050011',
} as const;

// Tree visualization colors (subset of COLORS for tree components)
export const TREE_COLORS = {
  neonPink: COLORS.neonPink,
  neonPurple: COLORS.neonPurple,
  neonBlue: COLORS.neonBlue,
  emerald: COLORS.emerald,
} as const;

// Level-based color styling for tree nodes (Tailwind classes)
// 3 levels matching listline positions: L1=P3 (purple), L2=P2 (blue), L3=P1 (pink, you get paid!)
export const LEVEL_COLORS = [
  { bg: 'bg-neon-purple/20', border: 'border-neon-purple', text: 'text-neon-purple', dot: 'bg-neon-purple' },
  { bg: 'bg-neon-blue/20', border: 'border-neon-blue', text: 'text-neon-blue', dot: 'bg-neon-blue' },
  { bg: 'bg-neon-pink/20', border: 'border-neon-pink', text: 'text-neon-pink', dot: 'bg-neon-pink' },
] as const;

// Helper function for formatting currency
export const formatCurrency = (value: number): string =>
  `${CURRENCY_SYMBOL}${value.toLocaleString()}`;

// Helper function for calculating net amount after fees
export const calculateNetAmount = (grossAmount: number): number =>
  grossAmount * NET_PAYOUT_RATE;
