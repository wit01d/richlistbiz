import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DEPOSIT_AMOUNT,
  NET_PAYOUT,
  SUCCESSOR_SEQUENCE_MAX,
  CURRENCY_SYMBOL,
  CONVERSION_RATE,
} from '../../constants/business';
import { generateId, FIRST_NAMES } from '../../utils/mockData';
import {
  findRandomNodeInTree,
  findUnpaidNodes,
  findParentOfNode,
  getUsedNames,
} from '../../utils/treeUtils';
import type { ReferralTreeNode } from '../../types/tree';
import type { ListlineStats, Referral, Payment, LinkStats } from '../../types/dashboard';
import type { SimulationEvent, DashboardSimulationState } from '../../types/simulation';

// Re-export types for consumers that import from this file
export type { SimulationEvent, DashboardSimulationState };

const generateInitialState = (username: string): DashboardSimulationState => {
  const referralTree: ReferralTreeNode[] = [];

  // Initial analytics history
  const viewHistory: { date: string; views: number; registrations: number; deposits: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    viewHistory.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views: 0,
      registrations: 0,
      deposits: 0,
    });
  }

  return {
    referralCode: username.toUpperCase().slice(0, 3) + generateId().slice(0, 5).toUpperCase(),
    listlineStats: {
      position1Count: 0,
      position2Count: 0,
      position3Count: 0,
      position4Count: 1,
      totalEarningsFromPosition1: 0,
    },
    upline: ['Sarah', 'Marcus', 'Julia'],
    referrals: [],
    payments: [],
    linkStats: {
      totalViews: 0,
      uniqueViews: 0,
      registrations: 0,
      totalDeposits: 0,
      viewHistory,
    },
    referralTree,
    events: [],
    successorCount: 0,
    totalDeposits: 0,
  };
};

interface UseDashboardSimulationOptions {
  username: string;
  initialSpeed?: number;
  maxEvents?: number;
}

interface UseDashboardSimulationReturn {
  state: DashboardSimulationState;
  isSimulating: boolean;
  speed: number;
  setIsSimulating: (simulating: boolean) => void;
  setSpeed: (speed: number) => void;
  reset: () => void;
  step: () => void;
}

export function useDashboardSimulation(options: UseDashboardSimulationOptions): UseDashboardSimulationReturn {
  const { username, initialSpeed = 100, maxEvents = 50 } = options;

  const [state, setState] = useState<DashboardSimulationState>(() => generateInitialState(username));
  const [isSimulating, setIsSimulating] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when username changes
  useEffect(() => {
    setState(generateInitialState(username));
  }, [username]);

  // Simulation step function
  const step = useCallback(() => {
    setState(prev => {
      const newState = { ...prev };
      const action = Math.random();
      const now = Date.now();
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // 40% chance: Site view
      if (action < 0.4) {
        const viewCount = Math.floor(Math.random() * 3) + 1;
        const newViewHistory = [...newState.linkStats.viewHistory];
        const todayIndex = newViewHistory.findIndex(h => h.date === todayStr);
        if (todayIndex >= 0) {
          newViewHistory[todayIndex] = {
            ...newViewHistory[todayIndex],
            views: newViewHistory[todayIndex].views + viewCount,
          };
        }

        newState.linkStats = {
          ...newState.linkStats,
          totalViews: newState.linkStats.totalViews + viewCount,
          uniqueViews: newState.linkStats.uniqueViews + Math.ceil(viewCount * 0.7),
          viewHistory: newViewHistory,
        };

        // Update views for random node (all 3 levels)
        if (newState.referralTree.length > 0) {
          const randomNode = findRandomNodeInTree(newState.referralTree, 3);
          if (randomNode) {
            const nodeViews = Math.floor(Math.random() * 5) + 1;
            const nodeClicks = Math.floor(nodeViews * (Math.random() * 0.4 + 0.1));
            const updateTreeViews = (nodes: ReferralTreeNode[]): ReferralTreeNode[] => {
              return nodes.map(node => {
                if (node.id === randomNode.id) {
                  const updatedStats = node.stats
                    ? { ...node.stats, views: node.stats.views + nodeViews, clicks: node.stats.clicks + nodeClicks }
                    : { views: nodeViews, clicks: nodeClicks, registrations: 0, deposits: 0 };
                  return { ...node, stats: updatedStats };
                }
                return { ...node, children: updateTreeViews(node.children) };
              });
            };
            newState.referralTree = updateTreeViews(newState.referralTree);
          }
        }

        newState.events = [{
          id: generateId(),
          type: 'view' as const,
          message: `${viewCount} new site view${viewCount > 1 ? 's' : ''}`,
          timestamp: now,
        }, ...newState.events].slice(0, maxEvents);
      }
      // Registration based on CONVERSION_RATE
      else if (action < 0.4 + CONVERSION_RATE) {
        const usedNames = getUsedNames(newState.referralTree);
        let name: string;
        do {
          name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        } while (usedNames.has(name) && usedNames.size < FIRST_NAMES.length);

        const newNode: ReferralTreeNode = {
          id: generateId(),
          username: name,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          paid: false,
          level: 0,
          children: [],
          stats: { views: 0, clicks: 0, registrations: 0, deposits: 0 },
        };

        // Find parent - max 2 levels deep (level 0, 1) so new users are at most level 2
        // Level 0 = you're Position 3, Level 1 = Position 2, Level 2 = Position 1 (you get paid!)
        const parentNode = findRandomNodeInTree(newState.referralTree, 2);

        if (parentNode) {
          const updateTree = (nodes: ReferralTreeNode[]): ReferralTreeNode[] => {
            return nodes.map(node => {
              if (node.id === parentNode.id) {
                const updatedStats = node.stats
                  ? { ...node.stats, registrations: node.stats.registrations + 1 }
                  : { views: 0, clicks: 0, registrations: 1, deposits: 0 };
                return {
                  ...node,
                  stats: updatedStats,
                  children: [...node.children, { ...newNode, level: node.level + 1 }],
                };
              }
              return { ...node, children: updateTree(node.children) };
            });
          };
          newState.referralTree = updateTree(newState.referralTree);
        } else {
          // Direct registration via YOUR referral link
          newState.referralTree = [...newState.referralTree, newNode];
          newState.referrals = [...newState.referrals, {
            id: newNode.id,
            username: newNode.username,
            date: newNode.date,
            paid: false,
          }];

          // Only count registrations from YOUR direct link
          const regViewHistory = [...newState.linkStats.viewHistory];
          const regTodayIndex = regViewHistory.findIndex(h => h.date === todayStr);
          if (regTodayIndex >= 0) {
            regViewHistory[regTodayIndex] = {
              ...regViewHistory[regTodayIndex],
              registrations: regViewHistory[regTodayIndex].registrations + 1,
            };
          }

          newState.linkStats = {
            ...newState.linkStats,
            registrations: newState.linkStats.registrations + 1,
            viewHistory: regViewHistory,
          };
        }

        newState.events = [{
          id: generateId(),
          type: 'registration' as const,
          message: `${name} registered${parentNode ? ` under ${parentNode.username}` : ' (direct)'}`,
          timestamp: now,
        }, ...newState.events].slice(0, maxEvents);
      }
      // 30% chance: Deposit
      else {
        const unpaidNodes = findUnpaidNodes(newState.referralTree);

        if (unpaidNodes.length > 0) {
          const nodeToDeposit = unpaidNodes[Math.floor(Math.random() * unpaidNodes.length)];
          const parentOfDepositor = findParentOfNode(newState.referralTree, nodeToDeposit.id);

          // Update tree with deposit
          const updateTree = (nodes: ReferralTreeNode[]): ReferralTreeNode[] => {
            return nodes.map(node => {
              if (node.id === nodeToDeposit.id) {
                return { ...node, paid: true };
              }
              if (parentOfDepositor && node.id === parentOfDepositor.id) {
                const updatedStats = node.stats
                  ? { ...node.stats, deposits: node.stats.deposits + 1 }
                  : { views: 0, clicks: 0, registrations: 0, deposits: 1 };
                return { ...node, stats: updatedStats, children: updateTree(node.children) };
              }
              return { ...node, children: updateTree(node.children) };
            });
          };
          newState.referralTree = updateTree(newState.referralTree);

          // Update direct referrals
          newState.referrals = newState.referrals.map(r =>
            r.id === nodeToDeposit.id ? { ...r, paid: true } : r
          );

          newState.totalDeposits++;

          newState.events = [{
            id: generateId(),
            type: 'deposit' as const,
            message: `${nodeToDeposit.username} deposited ${CURRENCY_SYMBOL}${DEPOSIT_AMOUNT}`,
            timestamp: now,
          }, ...newState.events].slice(0, maxEvents);

          // Check for position 1 payment (user gets paid when someone 3 levels down deposits)
          // Level 0 = direct referral (you're Position 3)
          // Level 1 = 2 down (you're Position 2)
          // Level 2 = 3 down (you're Position 1 - you get paid!)
          if (nodeToDeposit.level === 2) {
            newState.listlineStats = {
              ...newState.listlineStats,
              position1Count: newState.listlineStats.position1Count + 1,
              totalEarningsFromPosition1: newState.listlineStats.totalEarningsFromPosition1 + NET_PAYOUT,
            };

            newState.payments = [{
              id: generateId(),
              from: nodeToDeposit.username,
              amount: DEPOSIT_AMOUNT,
              netAmount: NET_PAYOUT,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            }, ...newState.payments];

            newState.events = [{
              id: generateId(),
              type: 'payment' as const,
              message: `You received ${CURRENCY_SYMBOL}${NET_PAYOUT} from ${nodeToDeposit.username}!`,
              timestamp: now + 1,
            }, ...newState.events].slice(0, maxEvents);
          }

          // Update position stats and link analytics based on level
          if (nodeToDeposit.level === 0) {
            // Direct referral deposit - count in YOUR link analytics
            newState.listlineStats.position3Count++;

            const depViewHistory = [...newState.linkStats.viewHistory];
            const depTodayIndex = depViewHistory.findIndex(h => h.date === todayStr);
            if (depTodayIndex >= 0) {
              depViewHistory[depTodayIndex] = {
                ...depViewHistory[depTodayIndex],
                deposits: depViewHistory[depTodayIndex].deposits + 1,
              };
            }
            newState.linkStats = {
              ...newState.linkStats,
              totalDeposits: newState.linkStats.totalDeposits + 1,
              viewHistory: depViewHistory,
            };
          } else if (nodeToDeposit.level === 1) {
            newState.listlineStats.position2Count++;
          }
          // Note: level === 2 (Position 1) is handled above with payment logic

          // Check for successor trigger
          const directReferrals = newState.referralTree;
          const depositingDirect = directReferrals.filter(r => r.paid).length;
          const successorSequence = Math.floor(Math.random() * SUCCESSOR_SEQUENCE_MAX) + 1;

          if (
            depositingDirect <= SUCCESSOR_SEQUENCE_MAX &&
            depositingDirect === successorSequence &&
            newState.successorCount === 0
          ) {
            newState.successorCount++;

            newState.events = [{
              id: generateId(),
              type: 'successor' as const,
              message: `SUCCESSOR: ${nodeToDeposit.username} (seq #${successorSequence} = pos #${depositingDirect}) nominated! Moved to Julia's network`,
              timestamp: now + 2,
            }, ...newState.events].slice(0, maxEvents);
          }
        }
      }

      return newState;
    });
  }, [maxEvents]);

  // Simulation interval effect
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isSimulating) {
      intervalRef.current = setInterval(step, speed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isSimulating, speed, step]);

  // Reset simulation
  const reset = useCallback(() => {
    setIsSimulating(false);
    setState(generateInitialState(username));
  }, [username]);

  return {
    state,
    isSimulating,
    speed,
    setIsSimulating,
    setSpeed,
    reset,
    step,
  };
}

export default useDashboardSimulation;
