import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COLORS,
  DEPOSIT_AMOUNT,
  formatCurrency,
  MAX_EVENTS_DISPLAYED,
  MAX_HISTORY_POINTS,
  NET_PAYOUT_RATE,
  SUCCESSOR_SEQUENCE_MAX,
} from '../../constants/business';
import { FIRST_NAMES } from '../../utils/mockData';
import {
  SYSTEM_ID,
  generateId,
  generateName,
  createSystemUser,
  createInitialState as initialState,
} from '../../utils/simulationLogic';

// Re-export constants for backward compatibility
export {
  COLORS, DEPOSIT_AMOUNT, formatCurrency, SUCCESSOR_SEQUENCE_MAX, SYSTEM_ID
};

// ============================================================================
// TYPES
// ============================================================================
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

// Unified event type - compatible with all simulation contexts
export interface SimEvent {
  id: string;
  type: 'user_created' | 'deposit' | 'successor' | 'info' | 'fraud_alert' | 'view' | 'registration' | 'payment';
  message: string;
  timestamp: number;
  severity?: 'low' | 'medium' | 'high';
}

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
  events: SimEvent[];
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

// ============================================================================
// HELPERS
// ============================================================================
// Re-export for backward compatibility (imported from utils/simulationLogic.ts)
export { generateId, generateName, createSystemUser, initialState };

export const formatTime = (timestamp: number): string => new Date(timestamp).toLocaleTimeString();

// ============================================================================
// DASHBOARD PROPS TRANSFORMER
// ============================================================================
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
  // userId -> { p1Count, p2Count, p3Count, p4Count, payments[] }
  positions: Map<string, {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    payments: { id: string; from: string; timestamp: number }[];
  }>;
  // userId -> User[] (direct referrals)
  referralsMap: Map<string, User[]>;
}

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

export const computeDashboardProps = (
  userId: string,
  state: SimulationState,
  index?: PositionIndex
): DashboardProps | null => {
  const user = state.users[userId];
  if (!user || user.isSystem) return null;

  // Use pre-computed index if available, otherwise compute on the fly
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

  // Fallback: compute without index (legacy behavior)
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

// ============================================================================
// UPLINE & LISTLINE HELPERS
// ============================================================================
export const getUplineChain = (userId: string, users: Record<string, User>, depth = 4): string[] => {
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

export const buildListline = (userId: string, users: Record<string, User>) => {
  const upline = getUplineChain(userId, users, 4);
  return {
    position1: upline[2] || SYSTEM_ID,
    position2: upline[1] || SYSTEM_ID,
    position3: upline[0] || SYSTEM_ID,
    position4: userId,
  };
};

// ============================================================================
// SCENARIO CREATOR
// ============================================================================
export const createSuccessorScenario = (): SimulationState => {
  const scenarioState: SimulationState = {
    users: { [SYSTEM_ID]: createSystemUser() },
    listlines: [],
    events: [],
    animations: [],
    nameIndex: 0,
    systemBalance: 0,
    totalDeposited: 0,
    successorCount: 0,
    history: [],
  };

  const createUser = (name: string, referrerId: string, hasDeposited = true): User => {
    const id = `user_${name.toLowerCase().replace(/\s/g, '_')}`;
    return {
      id,
      name,
      referrerId,
      balance: 0,
      totalEarnings: 0,
      directRecruits: 0,
      depositingRecruits: 0,
      hasDeposited,
      isVerified: Math.random() > 0.2,
      successorNominated: false,
      successorId: null,
      isSystem: false,
      createdAt: Date.now() + scenarioState.nameIndex++,
    };
  };

  const founder = createUser('Founder', SYSTEM_ID);
  scenarioState.users[founder.id] = founder;
  scenarioState.users[SYSTEM_ID].directRecruits = 1;

  const alice = createUser('Alice', founder.id);
  scenarioState.users[alice.id] = alice;
  scenarioState.users[founder.id] = { ...scenarioState.users[founder.id], directRecruits: scenarioState.users[founder.id].directRecruits + 1, depositingRecruits: scenarioState.users[founder.id].depositingRecruits + 1 };

  const bob = createUser('Bob', alice.id);
  scenarioState.users[bob.id] = bob;
  scenarioState.users[alice.id] = { ...scenarioState.users[alice.id], directRecruits: scenarioState.users[alice.id].directRecruits + 1, depositingRecruits: scenarioState.users[alice.id].depositingRecruits + 1 };

  const carol = createUser('Carol', bob.id);
  scenarioState.users[carol.id] = carol;
  scenarioState.users[bob.id] = { ...scenarioState.users[bob.id], directRecruits: scenarioState.users[bob.id].directRecruits + 1, depositingRecruits: scenarioState.users[bob.id].depositingRecruits + 1 };

  const recruitNames = [
    'Dave', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Leo', 'Mia', 'Nick', 'Olivia', 'Pete'
  ];

  recruitNames.forEach((name) => {
    const recruit = createUser(name, carol.id);
    scenarioState.users[recruit.id] = recruit;
    scenarioState.users[carol.id] = {
      ...scenarioState.users[carol.id],
      directRecruits: scenarioState.users[carol.id].directRecruits + 1,
      depositingRecruits: scenarioState.users[carol.id].depositingRecruits + 1
    };
  });

  const secondBranch = createUser('Zara', founder.id);
  scenarioState.users[secondBranch.id] = secondBranch;
  scenarioState.users[founder.id] = { ...scenarioState.users[founder.id], directRecruits: scenarioState.users[founder.id].directRecruits + 1, depositingRecruits: scenarioState.users[founder.id].depositingRecruits + 1 };

  const secondBranchChild = createUser('Yuki', secondBranch.id);
  scenarioState.users[secondBranchChild.id] = secondBranchChild;
  scenarioState.users[secondBranch.id] = { ...scenarioState.users[secondBranch.id], directRecruits: scenarioState.users[secondBranch.id].directRecruits + 1, depositingRecruits: scenarioState.users[secondBranch.id].depositingRecruits + 1 };

  const secondBranchGrandchild = createUser('Xavier', secondBranchChild.id);
  scenarioState.users[secondBranchGrandchild.id] = secondBranchGrandchild;
  scenarioState.users[secondBranchChild.id] = { ...scenarioState.users[secondBranchChild.id], directRecruits: scenarioState.users[secondBranchChild.id].directRecruits + 1, depositingRecruits: scenarioState.users[secondBranchChild.id].depositingRecruits + 1 };

  const secondLineNames = ['Quinn', 'Rose', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy'];
  secondLineNames.forEach((name) => {
    const recruit = createUser(name, secondBranchGrandchild.id);
    scenarioState.users[recruit.id] = recruit;
    scenarioState.users[secondBranchGrandchild.id] = {
      ...scenarioState.users[secondBranchGrandchild.id],
      directRecruits: scenarioState.users[secondBranchGrandchild.id].directRecruits + 1,
      depositingRecruits: scenarioState.users[secondBranchGrandchild.id].depositingRecruits + 1
    };
  });

  let totalDeposited = 0;
  let systemBalance = 0;

  Object.values(scenarioState.users).forEach(user => {
    if (user.hasDeposited && !user.isSystem) {
      totalDeposited += DEPOSIT_AMOUNT;

      const upline = getUplineChain(user.id, scenarioState.users, 4);
      const recipientId = upline[2] || SYSTEM_ID;

      if (recipientId === SYSTEM_ID) {
        systemBalance += DEPOSIT_AMOUNT;
      } else {
        const recipient = scenarioState.users[recipientId];
        if (recipient) {
          scenarioState.users[recipientId] = {
            ...recipient,
            balance: recipient.balance + DEPOSIT_AMOUNT,
            totalEarnings: recipient.totalEarnings + DEPOSIT_AMOUNT,
          };
        }
      }

      scenarioState.listlines.push({
        id: `ll_${user.id}`,
        userId: user.id,
        userName: user.name,
        position1: upline[2] || SYSTEM_ID,
        position2: upline[1] || SYSTEM_ID,
        position3: upline[0] || SYSTEM_ID,
        position4: user.id,
        recipientName: scenarioState.users[recipientId]?.name || 'SYSTEM',
        timestamp: Date.now(),
      });
    }
  });

  scenarioState.systemBalance = systemBalance;
  scenarioState.totalDeposited = totalDeposited;
  scenarioState.nameIndex = 30;

  scenarioState.events = [
    { id: 'evt1', type: 'info', message: 'Successor Scenario Loaded - 2 branches ready!', timestamp: Date.now() },
    { id: 'evt2', type: 'info', message: `Sequence-based successor: Each recruit gets random seq 1-${SUCCESSOR_SEQUENCE_MAX}`, timestamp: Date.now() - 100 },
    { id: 'evt3', type: 'info', message: 'When Nth recruit has sequence = N, they become successor (25% chance)', timestamp: Date.now() - 200 },
    { id: 'evt4', type: 'info', message: 'Click Play to watch successor nominations happen!', timestamp: Date.now() - 300 },
  ];

  return scenarioState;
};

// ============================================================================
// MAIN HOOK
// ============================================================================
export interface UseReferralSimulationOptions {
  maxEvents?: number;
  trackHistory?: boolean;
  enableAnimations?: boolean;
  enableFraudDetection?: boolean;
}

export interface UseReferralSimulationReturn {
  state: SimulationState;
  isPlaying: boolean;
  speed: number;
  simulationMode: SimulationMode;
  selectedUserId: string | null;

  // Actions
  setIsPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setSimulationMode: (mode: SimulationMode) => void;
  setSelectedUserId: (userId: string | null) => void;
  step: () => void;
  reset: () => void;
  loadSuccessorScenario: () => void;
  addUser: (specificReferrerId?: string | null) => void;
  processDeposit: (userId: string) => void;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;

  // Computed values
  realUsers: User[];
  depositedUsers: User[];
  verifiedUsers: User[];
  pendingUsers: User[];
  unverifiedUsers: User[];
  topEarners: User[];
  topRecruiters: User[];
  successorReady: User[];
  closeToSuccessor: User[];
  fraudAlerts: SimEvent[];

  // Dashboard integration
  getDashboardProps: (userId?: string) => DashboardProps | null;
  selectedUserDashboardProps: DashboardProps | null;
  // Helper for O(1) user name lookup
  getUserName: (userId: string | null | undefined) => string;
}

export function useReferralSimulation(options: UseReferralSimulationOptions = {}): UseReferralSimulationReturn {
  const {
    maxEvents = MAX_EVENTS_DISPLAYED,
    trackHistory = true,
    enableAnimations = true,
    enableFraudDetection = true,
  } = options;

  const [state, setState] = useState<SimulationState>(initialState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(150); // Default to 10x Speed
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('random');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  const historyCountRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const recordHistory = useCallback((newState: SimulationState): HistoryPoint[] => {
    if (!trackHistory) return newState.history;

    const realUsers = Object.values(newState.users).filter(u => !u.isSystem);
    const depositedUsers = realUsers.filter(u => u.hasDeposited);
    const verifiedUsers = realUsers.filter(u => u.isVerified);

    historyCountRef.current++;

    const point: HistoryPoint = {
      timestamp: Date.now(),
      label: `T${historyCountRef.current}`,
      totalUsers: realUsers.length,
      depositedUsers: depositedUsers.length,
      verifiedUsers: verifiedUsers.length,
      totalRevenue: newState.totalDeposited,
      systemBalance: newState.systemBalance,
      successorCount: newState.successorCount,
      pendingUsers: realUsers.filter(u => !u.hasDeposited).length,
    };

    return [...newState.history, point].slice(-MAX_HISTORY_POINTS);
  }, [trackHistory]);

  const addUser = useCallback((specificReferrerId: string | null = null) => {
    setState(prev => {
      const newUsers = { ...prev.users };
      const userId = generateId();
      const name = generateName(prev.nameIndex);

      let referrerId = specificReferrerId;

      if (!referrerId) {
        const availableReferrers = Object.values(newUsers).filter(
          u => u.hasDeposited && !u.isSystem
        );

        referrerId = SYSTEM_ID;
        if (availableReferrers.length > 0) {
          const weights = availableReferrers.map(u => {
            let w = 1;
            if (u.directRecruits < 5) w *= 3;
            if (u.directRecruits < 3) w *= 2;
            return w;
          });
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let random = Math.random() * totalWeight;
          for (let i = 0; i < availableReferrers.length; i++) {
            random -= weights[i];
            if (random <= 0) {
              referrerId = availableReferrers[i].id;
              break;
            }
          }
        }
      }

      const isSuspicious = enableFraudDetection && Math.random() < 0.05;

      newUsers[userId] = {
        id: userId,
        name,
        referrerId,
        balance: 0,
        totalEarnings: 0,
        directRecruits: 0,
        depositingRecruits: 0,
        hasDeposited: false,
        isVerified: Math.random() > 0.15,
        successorNominated: false,
        successorId: null,
        isSystem: false,
        createdAt: Date.now(),
      };

      if (referrerId !== SYSTEM_ID && newUsers[referrerId]) {
        newUsers[referrerId] = {
          ...newUsers[referrerId],
          directRecruits: newUsers[referrerId].directRecruits + 1,
        };
      }

      const events: SimEvent[] = [{
        id: generateId(),
        type: 'user_created',
        message: `${name} registered under ${newUsers[referrerId]?.name || 'SYSTEM'}`,
        timestamp: Date.now(),
      }];

      if (isSuspicious) {
        events.push({
          id: generateId(),
          type: 'fraud_alert',
          message: `Suspicious activity detected for ${name} - rapid registration pattern`,
          timestamp: Date.now(),
          severity: 'medium',
        });
      }

      const newAnimations = enableAnimations
        ? [...prev.animations, { type: 'user_join' as const, userId, timestamp: Date.now() }]
        : prev.animations;

      const newState = {
        ...prev,
        users: newUsers,
        nameIndex: prev.nameIndex + 1,
        events: [...events, ...prev.events].slice(0, maxEvents),
        animations: newAnimations,
      };

      return { ...newState, history: recordHistory(newState) };
    });
  }, [recordHistory, maxEvents, enableAnimations, enableFraudDetection]);

  const processDeposit = useCallback((userId: string) => {
    setState(prev => {
      const user = prev.users[userId];
      if (!user || user.hasDeposited || user.isSystem) return prev;

      const newUsers = { ...prev.users };
      const listline = buildListline(userId, newUsers);
      const recipientId = listline.position1;
      const recipientIsSystem = recipientId === SYSTEM_ID;

      newUsers[userId] = { ...newUsers[userId], hasDeposited: true };

      let newSystemBalance = prev.systemBalance;
      if (recipientIsSystem) {
        newSystemBalance += DEPOSIT_AMOUNT;
      } else if (newUsers[recipientId]) {
        newUsers[recipientId] = {
          ...newUsers[recipientId],
          balance: newUsers[recipientId].balance + DEPOSIT_AMOUNT,
          totalEarnings: newUsers[recipientId].totalEarnings + DEPOSIT_AMOUNT,
        };
      }

      const referrerId = user.referrerId;
      let successorEvent: SimEvent | null = null;
      let newSuccessorCount = prev.successorCount;
      let nominatedSuccessorId: string | null = null;

      // Assign random sequence number (1 to SUCCESSOR_SEQUENCE_MAX) to this deposit
      const successorSequence = Math.floor(Math.random() * SUCCESSOR_SEQUENCE_MAX) + 1;

      if (referrerId && referrerId !== SYSTEM_ID && newUsers[referrerId]) {
        newUsers[referrerId] = {
          ...newUsers[referrerId],
          depositingRecruits: newUsers[referrerId].depositingRecruits + 1,
        };

        const referrer = newUsers[referrerId];
        const depositPosition = referrer.depositingRecruits; // This is now the Nth deposit

        // Sequence-based successor nomination:
        // When Nth depositing recruit has sequence = N, they are immediately nominated
        // This only applies for positions 1-SUCCESSOR_SEQUENCE_MAX (25% chance per recruit)
        if (
          depositPosition <= SUCCESSOR_SEQUENCE_MAX &&
          depositPosition === successorSequence &&
          !referrer.successorNominated &&
          listline.position1 !== SYSTEM_ID
        ) {
          // The current user (who just deposited) IS the successor
          const successor = newUsers[userId];
          const newParentId = listline.position1;

          nominatedSuccessorId = successor.id;

          newUsers[successor.id] = {
            ...newUsers[successor.id],
            referrerId: newParentId,
          };

          newUsers[referrerId] = {
            ...newUsers[referrerId],
            successorNominated: true,
            successorId: successor.id,
            directRecruits: newUsers[referrerId].directRecruits - 1,
          };

          if (newUsers[newParentId]) {
            newUsers[newParentId] = {
              ...newUsers[newParentId],
              directRecruits: newUsers[newParentId].directRecruits + 1,
            };
          }

          newSuccessorCount++;

          successorEvent = {
            id: generateId(),
            type: 'successor',
            message: `SUCCESSOR: ${successor.name} (seq #${successorSequence} = pos #${depositPosition}) nominated by ${referrer.name} → moves to ${newUsers[newParentId]?.name || 'SYSTEM'}`,
            timestamp: Date.now(),
          };
        }
      }

      const newListline: Listline = {
        id: generateId(),
        userId,
        userName: user.name,
        position1: listline.position1,
        position2: listline.position2,
        position3: listline.position3,
        position4: listline.position4,
        recipientName: newUsers[recipientId]?.name || 'SYSTEM',
        timestamp: Date.now(),
      };

      const depositEvent: SimEvent = {
        id: generateId(),
        type: 'deposit',
        message: `€${DEPOSIT_AMOUNT} from ${user.name} → ${newUsers[recipientId]?.name || 'SYSTEM'}`,
        timestamp: Date.now(),
      };

      const newEvents = successorEvent
        ? [successorEvent, depositEvent, ...prev.events]
        : [depositEvent, ...prev.events];

      let newAnimations = prev.animations;
      if (enableAnimations) {
        newAnimations = [
          ...prev.animations,
          {
            type: 'payment_flow' as const,
            fromId: userId,
            toId: recipientId,
            amount: DEPOSIT_AMOUNT,
            timestamp: Date.now()
          }
        ];

        if (nominatedSuccessorId) {
          newAnimations.push({
            type: 'successor' as const,
            successorId: nominatedSuccessorId,
            timestamp: Date.now(),
          });
        }
      }

      const newState = {
        ...prev,
        users: newUsers,
        listlines: [newListline, ...prev.listlines],
        systemBalance: newSystemBalance,
        totalDeposited: prev.totalDeposited + DEPOSIT_AMOUNT,
        successorCount: newSuccessorCount,
        events: newEvents.slice(0, maxEvents),
        animations: newAnimations,
      };

      return { ...newState, history: recordHistory(newState) };
    });
  }, [recordHistory, maxEvents, enableAnimations]);

  const step = useCallback(() => {
    const currentState = stateRef.current;
    const pendingUsers = Object.values(currentState.users).filter(
      u => !u.hasDeposited && !u.isSystem
    );

    if (pendingUsers.length > 0) {
      processDeposit(pendingUsers[0].id);
      return;
    }

    if (simulationMode === 'targeted') {
      // In sequence-based system, target users who can still get a successor
      // (depositingRecruits < SUCCESSOR_SEQUENCE_MAX and not nominated yet)
      const usersNeedingRecruits = Object.values(currentState.users)
        .filter(u => !u.isSystem && u.hasDeposited && u.depositingRecruits < SUCCESSOR_SEQUENCE_MAX && !u.successorNominated)
        .sort((a, b) => b.depositingRecruits - a.depositingRecruits);

      if (usersNeedingRecruits.length > 0) {
        const targetUser = usersNeedingRecruits[0];
        addUser(targetUser.id);
        return;
      }
    }

    const availableReferrers = Object.values(currentState.users).filter(
      u => u.hasDeposited && !u.isSystem
    );

    if (availableReferrers.length > 0) {
      if (simulationMode === 'targeted') {
        // Prefer users who can still get a successor (within first 4 recruits)
        const bestReferrer = availableReferrers
          .filter(u => u.depositingRecruits < SUCCESSOR_SEQUENCE_MAX && !u.successorNominated)
          .sort((a, b) => b.depositingRecruits - a.depositingRecruits)[0] || availableReferrers[0];
        addUser(bestReferrer.id);
      } else {
        const referrer = availableReferrers[Math.floor(Math.random() * availableReferrers.length)];
        addUser(referrer.id);
      }
    } else {
      addUser();
    }
  }, [addUser, processDeposit, simulationMode]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setState(initialState());
    historyCountRef.current = 0;
  }, []);

  const loadSuccessorScenario = useCallback(() => {
    setIsPlaying(false);
    setState(createSuccessorScenario());
    historyCountRef.current = 0;
    setSimulationMode('targeted');
  }, []);

  // Auto-play interval
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(step, speed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, step]);

  // Computed values - consolidated into single pass for performance
  const computedUsers = useMemo(() => {
    const allUsers = Object.values(state.users);
    const real: User[] = [];
    const deposited: User[] = [];
    const verified: User[] = [];
    const pending: User[] = [];
    const unverified: User[] = [];
    const successorReadyList: User[] = [];
    const closeToSuccessorList: User[] = [];

    // Single pass through all users
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

      // In sequence-based system, users with 1-4 recruits can still get nominated
      // "Successor ready" means they have recruits but haven't been nominated yet
      // After SUCCESSOR_SEQUENCE_MAX recruits, no more chances
      if (!u.successorNominated) {
        if (u.depositingRecruits >= SUCCESSOR_SEQUENCE_MAX) {
          // Had all 4 chances but didn't get nominated - missed out
          // Don't add to successorReady
        } else if (u.depositingRecruits >= 1 && u.depositingRecruits < SUCCESSOR_SEQUENCE_MAX) {
          // Still has chances remaining (25% per remaining recruit)
          closeToSuccessorList.push(u);
        }
      }
    }

    // Sort successor lists by depositing recruits (descending)
    successorReadyList.sort((a, b) => b.depositingRecruits - a.depositingRecruits);
    closeToSuccessorList.sort((a, b) => b.depositingRecruits - a.depositingRecruits);

    // Compute top earners and recruiters from real users
    const topEarnersList = [...real]
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 10);

    const topRecruitersList = [...real]
      .sort((a, b) => b.directRecruits - a.directRecruits)
      .slice(0, 10);

    return {
      realUsers: real,
      depositedUsers: deposited,
      verifiedUsers: verified,
      pendingUsers: pending,
      unverifiedUsers: unverified,
      topEarners: topEarnersList,
      topRecruiters: topRecruitersList,
      successorReady: successorReadyList,
      closeToSuccessor: closeToSuccessorList,
    };
  }, [state.users]);

  // Destructure for easier access
  const {
    realUsers,
    depositedUsers,
    verifiedUsers,
    pendingUsers,
    unverifiedUsers,
    topEarners,
    topRecruiters,
    successorReady,
    closeToSuccessor,
  } = computedUsers;

  const fraudAlerts = useMemo(() =>
    state.events.filter(e => e.type === 'fraud_alert'),
    [state.events]
  );

  // Pre-computed user names map for O(1) name lookups in render
  const userNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of Object.values(state.users)) {
      map.set(user.id, user.name);
    }
    return map;
  }, [state.users]);

  // Helper function for getting user name with fallback
  const getUserName = useCallback((userId: string | null | undefined): string => {
    if (!userId) return 'SYSTEM';
    return userNames.get(userId) || 'SYSTEM';
  }, [userNames]);

  // Pre-computed position index for O(1) dashboard lookups
  const positionIndex = useMemo(() =>
    buildPositionIndex(state),
    [state.users, state.listlines]
  );

  // Dashboard integration - now uses pre-computed index
  const getDashboardProps = useCallback(
    (userId?: string) => computeDashboardProps(userId || selectedUserId || '', state, positionIndex),
    [state, selectedUserId, positionIndex]
  );

  const selectedUserDashboardProps = useMemo(
    () => (selectedUserId ? computeDashboardProps(selectedUserId, state, positionIndex) : null),
    [selectedUserId, state, positionIndex]
  );

  return {
    state,
    isPlaying,
    speed,
    simulationMode,
    selectedUserId,
    setIsPlaying,
    setSpeed,
    setSimulationMode,
    setSelectedUserId,
    step,
    reset,
    loadSuccessorScenario,
    addUser,
    processDeposit,
    setState,
    realUsers,
    depositedUsers,
    verifiedUsers,
    pendingUsers,
    unverifiedUsers,
    topEarners,
    topRecruiters,
    successorReady,
    closeToSuccessor,
    fraudAlerts,
    getDashboardProps,
    selectedUserDashboardProps,
    getUserName,
  };
}
