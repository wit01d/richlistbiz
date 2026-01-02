// Pure domain logic functions - extracted from useReferralSimulation
import { DEPOSIT_AMOUNT, NET_PAYOUT_RATE } from '../constants/business';
import { FIRST_NAMES } from './mockData';
import type {
  User,
  SimulationState,
  DashboardProps,
  PositionIndex,
} from '../types/simulation';

export const SYSTEM_ID = 'system';

// ID generation
export const generateId = (): string => Math.random().toString(36).substr(2, 9);

// Name generation with suffix for duplicates
export const generateName = (index: number): string => {
  const name = FIRST_NAMES[index % FIRST_NAMES.length];
  const suffix = Math.floor(index / FIRST_NAMES.length);
  return suffix === 0 ? name : `${name}${suffix + 1}`;
};

// Create the SYSTEM user singleton
export const createSystemUser = (): User => ({
  id: SYSTEM_ID,
  name: 'SYSTEM',
  referrerId: null,
  balance: 0,
  totalEarnings: 0,
  directRecruits: 0,
  depositingRecruits: 0,
  hasDeposited: true,
  isVerified: true,
  successorNominated: false,
  successorId: null,
  isSystem: true,
  createdAt: 0,
});

// Initial empty state
export const createInitialState = (): SimulationState => ({
  users: { [SYSTEM_ID]: createSystemUser() },
  listlines: [],
  events: [],
  animations: [],
  nameIndex: 0,
  systemBalance: 0,
  totalDeposited: 0,
  successorCount: 0,
  history: [],
});

// Get upline chain (ancestors) for a user
export const getUplineChain = (
  userId: string,
  users: Record<string, User>,
  depth = 4
): string[] => {
  const chain: string[] = [];
  let currentId = userId;
  for (let i = 0; i < depth; i++) {
    const user = users[currentId];
    if (!user || !user.referrerId) break;
    chain.push(user.referrerId);
    currentId = user.referrerId;
  }
  return chain;
};

// Build listline positions from upline chain
export const buildListline = (userId: string, users: Record<string, User>) => {
  const upline = getUplineChain(userId, users, 4);
  return {
    position1: upline[2] || SYSTEM_ID,
    position2: upline[1] || SYSTEM_ID,
    position3: upline[0] || SYSTEM_ID,
    position4: userId,
  };
};

// Build position index for O(1) dashboard lookups
export const buildPositionIndex = (state: SimulationState): PositionIndex => {
  const positions = new Map<string, {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    payments: { id: string; from: string; timestamp: number }[];
  }>();

  const referralsMap = new Map<string, User[]>();

  // Build referrals map in single pass
  for (const user of Object.values(state.users)) {
    if (user.isSystem || !user.referrerId) continue;
    const siblings = referralsMap.get(user.referrerId);
    if (siblings) {
      siblings.push(user);
    } else {
      referralsMap.set(user.referrerId, [user]);
    }
  }

  // Build position counts from listlines
  for (const ll of state.listlines) {
    // Position 1
    if (ll.position1 !== SYSTEM_ID) {
      let entry = positions.get(ll.position1);
      if (!entry) {
        entry = { p1: 0, p2: 0, p3: 0, p4: 0, payments: [] };
        positions.set(ll.position1, entry);
      }
      entry.p1++;
      entry.payments.push({ id: ll.id, from: ll.userName, timestamp: ll.timestamp });
    }

    // Position 2
    if (ll.position2 !== SYSTEM_ID) {
      let entry = positions.get(ll.position2);
      if (!entry) {
        entry = { p1: 0, p2: 0, p3: 0, p4: 0, payments: [] };
        positions.set(ll.position2, entry);
      }
      entry.p2++;
    }

    // Position 3
    if (ll.position3 !== SYSTEM_ID) {
      let entry = positions.get(ll.position3);
      if (!entry) {
        entry = { p1: 0, p2: 0, p3: 0, p4: 0, payments: [] };
        positions.set(ll.position3, entry);
      }
      entry.p3++;
    }

    // Position 4
    if (ll.position4 !== SYSTEM_ID) {
      let entry = positions.get(ll.position4);
      if (!entry) {
        entry = { p1: 0, p2: 0, p3: 0, p4: 0, payments: [] };
        positions.set(ll.position4, entry);
      }
      entry.p4++;
    }
  }

  return { positions, referralsMap };
};

// Compute dashboard props for a specific user
export const computeDashboardProps = (
  userId: string,
  state: SimulationState,
  index?: PositionIndex
): DashboardProps | null => {
  const user = state.users[userId];
  if (!user || user.isSystem) return null;

  // Use pre-computed index if available
  if (index) {
    const posData = index.positions.get(userId) || { p1: 0, p2: 0, p3: 0, p4: 0, payments: [] };
    const directReferrals = index.referralsMap.get(userId) || [];

    // Build upline (3 ancestors)
    const uplineIds = getUplineChain(userId, state.users, 3);
    const upline = uplineIds.map((id) => state.users[id]?.name || 'SYSTEM');

    return {
      username: user.name,
      referralCode: user.id.slice(0, 6).toUpperCase(),
      listlineStats: {
        position1Count: posData.p1,
        position2Count: posData.p2,
        position3Count: posData.p3,
        position4Count: posData.p4,
        totalEarningsFromPosition1: posData.p1 * DEPOSIT_AMOUNT,
      },
      upline,
      referrals: directReferrals.map((u) => ({
        id: u.id,
        username: u.name,
        date: new Date(u.createdAt).toLocaleDateString(),
        paid: u.hasDeposited,
      })),
      payments: posData.payments.map((p) => ({
        id: p.id,
        from: p.from,
        amount: DEPOSIT_AMOUNT,
        netAmount: DEPOSIT_AMOUNT * NET_PAYOUT_RATE,
        date: new Date(p.timestamp).toLocaleDateString(),
      })),
    };
  }

  // Fallback: compute without index
  let position1Count = 0;
  let position2Count = 0;
  let position3Count = 0;
  let position4Count = 0;

  const payments: DashboardProps['payments'] = [];

  for (const ll of state.listlines) {
    if (ll.position1 === userId) {
      position1Count++;
      payments.push({
        id: ll.id,
        from: ll.userName,
        amount: DEPOSIT_AMOUNT,
        netAmount: DEPOSIT_AMOUNT * NET_PAYOUT_RATE,
        date: new Date(ll.timestamp).toLocaleDateString(),
      });
    }
    if (ll.position2 === userId) position2Count++;
    if (ll.position3 === userId) position3Count++;
    if (ll.position4 === userId) position4Count++;
  }

  const uplineIds = getUplineChain(userId, state.users, 3);
  const upline = uplineIds.map((id) => state.users[id]?.name || 'SYSTEM');

  const referrals = Object.values(state.users)
    .filter((u) => u.referrerId === userId && !u.isSystem)
    .map((u) => ({
      id: u.id,
      username: u.name,
      date: new Date(u.createdAt).toLocaleDateString(),
      paid: u.hasDeposited,
    }));

  return {
    username: user.name,
    referralCode: user.id.slice(0, 6).toUpperCase(),
    listlineStats: {
      position1Count,
      position2Count,
      position3Count,
      position4Count,
      totalEarningsFromPosition1: position1Count * DEPOSIT_AMOUNT,
    },
    upline,
    referrals,
    payments,
  };
};

// Compute user categories in a single pass for performance
export const computeUserCategories = (users: Record<string, User>, successorSequenceMax: number) => {
  const allUsers = Object.values(users);
  const real: User[] = [];
  const deposited: User[] = [];
  const verified: User[] = [];
  const pending: User[] = [];
  const unverified: User[] = [];
  const successorReady: User[] = [];
  const closeToSuccessor: User[] = [];

  for (const u of allUsers) {
    if (u.isSystem) continue;

    real.push(u);

    if (u.hasDeposited) {
      deposited.push(u);
    } else {
      pending.push(u);
    }

    if (u.isVerified) {
      verified.push(u);
    } else {
      unverified.push(u);
    }

    // Successor eligibility based on sequence system
    if (!u.successorNominated) {
      if (u.depositingRecruits >= successorSequenceMax) {
        // Had all chances but didn't get nominated
      } else if (u.depositingRecruits >= 1 && u.depositingRecruits < successorSequenceMax) {
        closeToSuccessor.push(u);
      }
    }
  }

  // Sort successor lists
  successorReady.sort((a, b) => b.depositingRecruits - a.depositingRecruits);
  closeToSuccessor.sort((a, b) => b.depositingRecruits - a.depositingRecruits);

  // Compute top earners and recruiters
  const topEarners = [...real]
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, 10);

  const topRecruiters = [...real]
    .sort((a, b) => b.directRecruits - a.directRecruits)
    .slice(0, 10);

  return {
    realUsers: real,
    depositedUsers: deposited,
    verifiedUsers: verified,
    pendingUsers: pending,
    unverifiedUsers: unverified,
    topEarners,
    topRecruiters,
    successorReady,
    closeToSuccessor,
  };
};

// Build user name lookup map for O(1) name lookups
export const buildUserNameMap = (users: Record<string, User>): Map<string, string> => {
  const map = new Map<string, string>();
  for (const user of Object.values(users)) {
    map.set(user.id, user.name);
  }
  return map;
};

// Format timestamp to time string
export const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString();
