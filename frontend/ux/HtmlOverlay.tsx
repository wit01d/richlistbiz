import { Scroll } from '@react-three/drei';
import { Loader2, Pause, Play, Settings, User as UserIcon, Zap } from 'lucide-react';
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  CONVERSION_RATE,
  CURRENCY_SYMBOL,
  DEPOSIT_AMOUNT,
  NET_PAYOUT,
  SUCCESSOR_SEQUENCE_MAX,
} from '../constants/business';
import { MembershipPayment } from '../pages/MembershipPayment';
import { ReferralCodeVerification } from '../pages/ReferralCodeVerification';
import { SIMULATION } from '../pages/SimulationUserDashboard';
import { UserDashboard } from '../pages/UserDashboard';
import { initKeycloak } from '../services/Keycloak';
import type { DashboardSimulationState } from '../types/simulation';
import type { ReferralTreeNode } from '../types/tree';
import { FeaturesSection, HeroSection, SignupCard } from '../ui/landing';
import {
  FIRST_NAMES,
  generateId,
} from '../utils/mockData';
import {
  findParentOfNode,
  findRandomNodeInTree,
  findUnpaidNodes,
  getUsedNames
} from '../utils/treeUtils';
import { YouTubeModal } from './modals';

// Lazy load heavy components for better initial load performance
const AdminConsole = lazy(() => import('../pages/AdminDashboard'));

// SUCCESSOR_SEQUENCE_MAX imported from constants/business (25% chance per recruit 1-4)

const generateInitialDashboardState = (username: string): DashboardSimulationState => {
  // Start with minimal data - simulation will grow it
  const referralTree: ReferralTreeNode[] = [];

  // Initial analytics history with views, registrations, and deposits
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

// Loading fallback for lazy-loaded components
const LazyLoadFallback: React.FC = () => (
  <div className="w-full max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
      <span className="text-gray-400 text-sm">Loading component...</span>
    </div>
  </div>
);

interface HtmlOverlayProps {
  onAuthChange?: (isAuthenticated: boolean) => void;
}

// YouTube video ID
const PROMO_VIDEO_ID = "U1Ll4mvhBXI";

type AuthenticatedView = 'dashboard' | 'simulation-dashboard' | 'admin' | 'referral-verification' | 'membership-payment';

// Map URL paths to views
const URL_VIEW_MAP: Record<string, AuthenticatedView> = {
  '/adminus': 'admin',
  '/simulation': 'simulation-dashboard',
};

// Get initial view from URL path
const getViewFromUrl = (): AuthenticatedView | null => {
  const path = window.location.pathname;
  return URL_VIEW_MAP[path] || null;
};

export const HtmlOverlay: React.FC<HtmlOverlayProps> = ({ onAuthChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>("User");
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AuthenticatedView>(() => {
    // Check URL path for initial view
    return getViewFromUrl() || 'dashboard';
  });

  // Track if view was set from URL (to skip onboarding redirect)
  const [urlViewOverride] = useState(() => getViewFromUrl() !== null);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(100); // ms between actions (10x speed default)
  const [simulationState, setSimulationState] = useState<DashboardSimulationState | null>(null);
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize simulation state when username changes
  useEffect(() => {
    setSimulationState(generateInitialDashboardState(username));
  }, [username]);

  // Simulation step function
  const simulationStep = useCallback(() => {
    setSimulationState(prev => {
      if (!prev) return prev;

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

        // Also increment views/clicks for a random node (simulates their referral link being viewed)
        if (newState.referralTree.length > 0) {
          const randomNodeForViews = findRandomNodeInTree(newState.referralTree, 3);
          if (randomNodeForViews) {
            const viewCount = Math.floor(Math.random() * 5) + 1;
            const nodeClicks = Math.floor(viewCount * (Math.random() * 0.4 + 0.1));
            const updateTreeViews = (nodes: ReferralTreeNode[]): ReferralTreeNode[] => {
              return nodes.map(node => {
                if (node.id === randomNodeForViews.id) {
                  const updatedStats = node.stats
                    ? { ...node.stats, views: node.stats.views + viewCount, clicks: node.stats.clicks + nodeClicks }
                    : { views: viewCount, clicks: nodeClicks, registrations: 0, deposits: 0 };
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
        }, ...newState.events].slice(0, 50);
      }
      // Registration based on CONVERSION_RATE (default 1%)
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
          // Add to existing node's children and update parent stats
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
        }, ...newState.events].slice(0, 50);
      }
      // 30% chance: Deposit (if unpaid users exist)
      else {
        const unpaidNodes = findUnpaidNodes(newState.referralTree);

        if (unpaidNodes.length > 0) {
          const nodeToDeposit = unpaidNodes[Math.floor(Math.random() * unpaidNodes.length)];
          const parentOfDepositor = findParentOfNode(newState.referralTree, nodeToDeposit.id);

          // Update tree with deposit and parent's deposit stats
          const updateTree = (nodes: ReferralTreeNode[]): ReferralTreeNode[] => {
            return nodes.map(node => {
              if (node.id === nodeToDeposit.id) {
                return { ...node, paid: true };
              }
              // Update parent's deposit stat
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

          // Update direct referrals list
          newState.referrals = newState.referrals.map(r =>
            r.id === nodeToDeposit.id ? { ...r, paid: true } : r
          );

          newState.totalDeposits++;

          // Add deposit event
          newState.events = [{
            id: generateId(),
            type: 'deposit' as const,
            message: `${nodeToDeposit.username} deposited ${CURRENCY_SYMBOL}${DEPOSIT_AMOUNT}`,
            timestamp: now,
          }, ...newState.events].slice(0, 50);

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
            }, ...newState.events].slice(0, 50);
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

          // Check for successor trigger (sequence-based system)
          // Each recruit gets random sequence 1-SUCCESSOR_SEQUENCE_MAX
          // Nomination happens when Nth recruit has sequence = N (25% chance per recruit)
          const directReferrals = newState.referralTree;
          const depositingDirect = directReferrals.filter(r => r.paid).length;
          const successorSequence = Math.floor(Math.random() * SUCCESSOR_SEQUENCE_MAX) + 1;

          if (
            depositingDirect <= SUCCESSOR_SEQUENCE_MAX &&
            depositingDirect === successorSequence &&
            newState.successorCount === 0
          ) {
            // The user who just deposited becomes the successor
            newState.successorCount++;

            newState.events = [{
              id: generateId(),
              type: 'successor' as const,
              message: `🎉 SUCCESSOR: ${nodeToDeposit.username} (seq #${successorSequence} = pos #${depositingDirect}) nominated! Moved to Julia's network`,
              timestamp: now + 2,
            }, ...newState.events].slice(0, 50);
          }
        }
      }

      return newState;
    });
  }, []);

  // Simulation interval effect
  // Fixed: Always clear existing interval before creating new one to prevent memory leaks
  useEffect(() => {
    // Always clear existing interval first
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }

    // Only create new interval if simulating
    if (isSimulating) {
      simulationIntervalRef.current = setInterval(simulationStep, simulationSpeed);
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
    };
  }, [isSimulating, simulationSpeed, simulationStep]);

  // Stop simulation when switching away from simulation-dashboard
  useEffect(() => {
    if (currentView !== 'simulation-dashboard') {
      setIsSimulating(false);
    }
  }, [currentView]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimulationState(generateInitialDashboardState(username));
  }, [username]);

  // Handle referral code verification
  const handleReferralVerified = useCallback((code: string) => {
    localStorage.setItem('verified_referral_code', code);
    // After referral verification, check if payment is needed
    const hasPaid = localStorage.getItem('membership_paid');
    if (!hasPaid) {
      setCurrentView('membership-payment');
    } else {
      setCurrentView('dashboard');
    }
  }, []);

  // Handle membership payment completion
  const handlePaymentComplete = useCallback(() => {
    localStorage.setItem('membership_paid', 'true');
    setCurrentView('dashboard');
  }, []);

  useEffect(() => {
    initKeycloak().then((kc) => {
        if (kc?.authenticated) {
            setIsAuthenticated(true);
            onAuthChange?.(true);
            // Try to get name from token
            const name = kc.tokenParsed?.preferred_username || kc.tokenParsed?.name || "Member";
            setUsername(name);

            // Check onboarding flow: referral code → payment → dashboard
            // TODO: tokenReferralCode will be available once Keycloak custom attribute is configured
            const tokenReferralCode = kc.tokenParsed?.referral_code as string | undefined;
            const storedReferralCode = localStorage.getItem('verified_referral_code');
            const hasPaid = localStorage.getItem('membership_paid');

            // Debug: Log onboarding state
            console.log('[Onboarding] Token referral:', tokenReferralCode);
            console.log('[Onboarding] Stored referral:', storedReferralCode);
            console.log('[Onboarding] Has paid:', hasPaid);

            const hasReferralCode = Boolean(tokenReferralCode || storedReferralCode);

            // Skip onboarding redirects if URL explicitly set a view (e.g., /adminus)
            if (urlViewOverride) {
                console.log('[Onboarding] → URL override active, skipping onboarding checks');
            } else if (!hasReferralCode) {
                // Step 1: Need referral code verification
                console.log('[Onboarding] → Showing referral verification');
                setCurrentView('referral-verification');
            } else if (!hasPaid) {
                // Step 2: Need membership payment
                console.log('[Onboarding] → Showing membership payment');
                setCurrentView('membership-payment');
            } else {
                // Step 3: All verified - show dashboard
                console.log('[Onboarding] → Showing dashboard');
                setCurrentView('dashboard');
            }
        } else {
            onAuthChange?.(false);
        }
    });
  }, [onAuthChange]);

  return (
    <Scroll html style={{ width: '100%' }}>
      {/* AUTHENTICATED SECTIONS */}
      {isAuthenticated && (
        <section className="min-h-screen w-screen flex flex-col items-center justify-start pt-20 md:pt-24 px-4">
          {currentView === 'referral-verification' ? (
            <ReferralCodeVerification onVerified={handleReferralVerified} />
          ) : currentView === 'membership-payment' ? (
            <MembershipPayment onPaymentComplete={handlePaymentComplete} />
          ) : (
          <>
          {/* Navigation Tabs */}
          <div className="w-full max-w-5xl mx-auto mb-6 flex gap-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                currentView === 'dashboard'
                  ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('simulation-dashboard')}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                currentView === 'simulation-dashboard'
                  ? 'bg-neon-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                  : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <UserIcon size={16} />
              SIMULATION
            </button>
            <button
              onClick={() => setCurrentView('admin')}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                currentView === 'admin'
                  ? 'bg-neon-pink text-white shadow-[0_0_15px_rgba(255,45,117,0.4)]'
                  : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <Settings size={16} />
              Admin
            </button>
          </div>

          {/* Dashboard View */}
          {currentView === 'dashboard' && simulationState && (
            <UserDashboard
              username={username}
              referralCode={simulationState.referralCode}
              listlineStats={simulationState.listlineStats}
              upline={simulationState.upline}
              referrals={simulationState.referrals}
              payments={simulationState.payments}
              linkStats={simulationState.linkStats}
              referralTree={simulationState.referralTree}
              onNavigate={setCurrentView}
            />
          )}

          {/* Simulation User Dashboard View */}
          {currentView === 'simulation-dashboard' && simulationState && (
            <>
              {/* Simulation Controls */}
              <div className="w-full max-w-5xl mx-auto mb-4">
                <div className="bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-purple/30 rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Zap className="text-neon-pink" size={20} />
                      <div>
                        <h3 className="text-white font-display text-sm">Live Simulation</h3>
                        <p className="text-gray-400 text-xs">Watch your network grow in real-time</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Speed Control */}
                      <select
                        value={simulationSpeed}
                        onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                        className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-neon-purple"
                      >
                        <option value={2000}>0.5x Speed</option>
                        <option value={1000}>1x Speed</option>
                        <option value={500}>2x Speed</option>
                        <option value={250}>4x Speed</option>
                        <option value={100}>10x Speed</option>
                      </select>

                      {/* Play/Pause */}
                      <button
                        onClick={() => setIsSimulating(!isSimulating)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                          isSimulating
                            ? 'bg-neon-pink text-white shadow-[0_0_15px_rgba(255,45,117,0.4)]'
                            : 'bg-neon-purple text-white hover:bg-neon-purple/80'
                        }`}
                      >
                        {isSimulating ? <Pause size={16} /> : <Play size={16} />}
                        {isSimulating ? 'Pause' : 'Start'}
                      </button>

                      {/* Reset */}
                      <button
                        onClick={resetSimulation}
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neon-blue"></div>
                      <span className="text-gray-400 text-xs">Views:</span>
                      <span className="text-white text-sm font-mono">{simulationState.linkStats.totalViews}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neon-purple"></div>
                      <span className="text-gray-400 text-xs">Registrations:</span>
                      <span className="text-white text-sm font-mono">{simulationState.linkStats.registrations}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-gray-400 text-xs">Deposits:</span>
                      <span className="text-white text-sm font-mono">{simulationState.totalDeposits}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neon-pink"></div>
                      <span className="text-gray-400 text-xs">Successors:</span>
                      <span className="text-white text-sm font-mono">{simulationState.successorCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-400 text-xs">Earnings:</span>
                      <span className="text-neon-pink text-sm font-mono font-bold">€{simulationState.listlineStats.totalEarningsFromPosition1}</span>
                    </div>
                  </div>

                  {/* Event Log */}
                  {simulationState.events.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="text-xs text-gray-500 mb-2">Recent Activity</div>
                      <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                        {simulationState.events.slice(0, 8).map((event) => (
                          <div
                            key={event.id}
                            className={`px-2 py-1 rounded text-xs ${
                              event.type === 'successor'
                                ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/30'
                                : event.type === 'payment'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : event.type === 'deposit'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : event.type === 'registration'
                                ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                                : 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                            }`}
                          >
                            {event.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <SIMULATION
                username={username}
                referralCode={simulationState.referralCode}
                listlineStats={simulationState.listlineStats}
                upline={simulationState.upline}
                referrals={simulationState.referrals}
                payments={simulationState.payments}
                linkStats={simulationState.linkStats}
                referralTree={simulationState.referralTree}
              />
            </>
          )}

          {/* Admin Console View - Lazy loaded */}
          {currentView === 'admin' && (
            <Suspense fallback={<LazyLoadFallback />}>
              <AdminConsole />
            </Suspense>
          )}
          </>
          )}
        </section>
      )}

      {/* HERO, FEATURES & SIGNUP shown only when NOT authenticated */}
      {!isAuthenticated && (
        <>
          <HeroSection onPlayClick={() => setIsVideoOpen(true)} />
          <FeaturesSection />
          <SignupCard />
        </>
      )}

      {/* YouTube Video Modal */}
      <YouTubeModal
        videoId={PROMO_VIDEO_ID}
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
      />
    </Scroll>
  );
};

