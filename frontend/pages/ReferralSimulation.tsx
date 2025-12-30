import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Crown, Gift, Trophy, Users, Wallet } from 'lucide-react';
import {
  useReferralSimulation,
  SYSTEM_ID,
  DEPOSIT_AMOUNT,
  SUCCESSOR_THRESHOLD,
  COLORS,
  type User,
  type Listline,
  type PaymentData,
  type SimulationMode,
} from '../hooks/useReferralSimulation';

// ============================================================================
// CONSTANTS (UI-specific)
// ============================================================================
const MAX_EVENTS_DISPLAY = 50;
const ANIMATION_DURATION_MS = 2000;
const PAYMENT_ANIMATION_DURATION_MS = 1500;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;

// ============================================================================
// TYPES (UI-specific)
// ============================================================================
interface TreeNode extends User {
  x: number;
  y: number;
  level: number;
}

interface TreeEdge {
  from: { x: number; y: number; isSystem?: boolean };
  to: TreeNode;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
interface ListlineVisualizationProps {
  payment: PaymentData | null;
  isActive: boolean;
}

const ListlineVisualization: React.FC<ListlineVisualizationProps> = ({ payment, isActive }) => {
  if (!payment) {
    return (
      <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 mb-6">
        <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2 text-gray-400">
          <span>⚡</span>
          Payment Flow
        </h3>
        <div className="text-center text-gray-500 text-sm py-4">
          Make a deposit to see the payment flow
        </div>
      </div>
    );
  }

  const positions = [
    { pos: 4, user: payment.listline.position4, label: 'Depositor', color: isActive ? 'from-neon-blue to-neon-blue/80' : 'from-neon-blue/30 to-neon-blue/20' },
    { pos: 3, user: payment.listline.position3, label: 'Parent', color: isActive ? 'from-neon-purple to-neon-purple/80' : 'from-neon-purple/30 to-neon-purple/20' },
    { pos: 2, user: payment.listline.position2, label: 'Grandparent', color: isActive ? 'from-neon-purple to-neon-pink/80' : 'from-neon-purple/30 to-neon-pink/20' },
    { pos: 1, user: payment.listline.position1, label: 'Recipient', color: isActive ? 'from-neon-pink to-neon-pink/80' : 'from-neon-pink/30 to-neon-pink/20' },
  ];

  return (
    <div className={`rounded-2xl p-4 border mb-6 transition-all duration-300 ${
      isActive
        ? 'bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border-neon-pink/50 shadow-lg shadow-neon-pink/20'
        : 'bg-black/40 backdrop-blur-md border-white/5'
    }`}>
      <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2 text-white">
        <span className={isActive ? 'text-neon-pink animate-pulse' : 'text-gray-500'}>⚡</span>
        Payment Flow: €{DEPOSIT_AMOUNT}
        {isActive && <span className="ml-2 text-xs text-neon-pink animate-pulse">LIVE</span>}
        {!isActive && <span className="ml-2 text-xs text-gray-500">Last Payment</span>}
      </h3>
      <div className="flex items-center justify-between gap-1">
        {positions.map((p, i) => (
          <React.Fragment key={p.pos}>
            <div className={`flex-1 text-center p-2 rounded-xl bg-gradient-to-b ${p.color} text-white shadow-lg transition-all duration-300 ${isActive ? 'scale-105' : ''}`}>
              <div className="text-xs opacity-75">P{p.pos}</div>
              <div className="font-display font-bold text-sm truncate">{p.user?.name || 'SYSTEM'}</div>
              <div className="text-xs opacity-75">{p.label}</div>
            </div>
            {i < 3 && (
              <span className={`text-lg transition-all ${isActive ? 'text-neon-pink animate-pulse' : 'text-gray-600'}`}>→</span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className={`mt-3 text-center text-xs ${isActive ? 'text-neon-pink' : 'text-gray-500'}`}>
        {isActive ? '💸 Payment in progress...' : `${payment.from?.name || 'User'} → ${payment.to?.name || 'SYSTEM'}`}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function ReferralSimulation() {
  const {
    state,
    setState,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    simulationMode,
    setSimulationMode,
    step,
    reset,
    loadSuccessorScenario,
    addUser,
    processDeposit,
    realUsers,
    depositedUsers,
    verifiedUsers,
    pendingUsers: notDepositedUsers,
    unverifiedUsers: notVerifiedUsers,
    topEarners,
    successorReady,
    closeToSuccessor,
    getUserName,
  } = useReferralSimulation({
    trackHistory: false,
    enableAnimations: true,
    enableFraudDetection: false,
  });

  // UI-specific state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showListline, setShowListline] = useState<Listline | null>(null);
  const [highlightedPayment, setHighlightedPayment] = useState<PaymentData | null>(null);
  const [lastPayment, setLastPayment] = useState<PaymentData | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Animation render time - updates only when animations are active
  // This avoids calling Date.now() during render which doesn't trigger re-renders
  const [renderTime, setRenderTime] = useState(Date.now);

  // Update renderTime on animation frame when animations are active
  useEffect(() => {
    if (state.animations.length === 0) return;

    let animationFrameId: number;
    const updateTime = () => {
      setRenderTime(Date.now());
      animationFrameId = requestAnimationFrame(updateTime);
    };
    animationFrameId = requestAnimationFrame(updateTime);

    return () => cancelAnimationFrame(animationFrameId);
  }, [state.animations.length]);

  // Animation cleanup - only runs when animations exist, with smart scheduling
  useEffect(() => {
    if (state.animations.length === 0) return;

    // Find the oldest animation and schedule cleanup for when it expires
    const oldestTimestamp = Math.min(...state.animations.map(a => a.timestamp));
    const timeUntilExpiry = ANIMATION_DURATION_MS - (Date.now() - oldestTimestamp);
    const cleanupDelay = Math.max(100, timeUntilExpiry + 50); // Add 50ms buffer

    const timeout = setTimeout(() => {
      const now = Date.now();
      setState(prev => {
        const filtered = prev.animations.filter(a => now - a.timestamp < ANIMATION_DURATION_MS);
        if (filtered.length === prev.animations.length) return prev;
        return { ...prev, animations: filtered };
      });
    }, cleanupDelay);

    return () => clearTimeout(timeout);
  }, [state.animations, setState]);

  // Watch for deposits to update payment visualization
  // Only triggers when listlines.length changes (new deposit added)
  useEffect(() => {
    const latestDeposit = state.listlines[0];
    if (latestDeposit) {
      const paymentData: PaymentData = {
        from: state.users[latestDeposit.userId] || null,
        to: state.users[latestDeposit.position1] || null,
        listline: {
          position1: state.users[latestDeposit.position1] || null,
          position2: state.users[latestDeposit.position2] || null,
          position3: state.users[latestDeposit.position3] || null,
          position4: state.users[latestDeposit.position4] || null,
        },
      };
      setHighlightedPayment(paymentData);
      setLastPayment(paymentData);
      const timeout = setTimeout(() => setHighlightedPayment(null), ANIMATION_DURATION_MS);
      return () => clearTimeout(timeout);
    }
    // Note: state.listlines removed - only need length to detect new deposits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.listlines.length, state.users]);

  // Reset UI state on simulation reset
  const handleReset = useCallback(() => {
    reset();
    setSelectedUser(null);
    setShowListline(null);
    setHighlightedPayment(null);
    setLastPayment(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchPanel(false);
    setShowUserModal(false);
    setFocusedUserId(null);
  }, [reset]);

  const handleLoadScenario = useCallback(() => {
    loadSuccessorScenario();
    setSelectedUser(null);
    setShowListline(null);
    setHighlightedPayment(null);
    setLastPayment(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchPanel(false);
    setShowUserModal(false);
    setFocusedUserId(null);
  }, [loadSuccessorScenario]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  }, [pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPanning && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y,
      });
    }
  }, [isPanning, panStart]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Tree layout computation - optimized with children lookup map (O(n) instead of O(n²))
  const { nodes, edges, maxLevel, dynamicWidth } = useMemo(() => {
    const nodesResult: TreeNode[] = [];
    const edgesResult: TreeEdge[] = [];
    const levels: Record<number, { user: User }[]> = {};

    // Build children lookup map in single pass - O(n)
    const childrenMap = new Map<string, User[]>();
    const allUsers = Object.values(state.users);

    for (const user of allUsers) {
      if (user.isSystem || !user.referrerId) continue;
      const siblings = childrenMap.get(user.referrerId);
      if (siblings) {
        siblings.push(user);
      } else {
        childrenMap.set(user.referrerId, [user]);
      }
    }

    // Get system children from the map
    const systemChildren = childrenMap.get(SYSTEM_ID) || [];

    const processNode = (user: User, level: number) => {
      if (!levels[level]) levels[level] = [];
      levels[level].push({ user });
    };

    // Traverse using the lookup map - O(1) child lookup
    const traverse = (userId: string, level = 0) => {
      const user = state.users[userId];
      if (!user || user.isSystem) return;

      processNode(user, level);

      const children = childrenMap.get(userId) || [];
      for (const child of children) {
        traverse(child.id, level + 1);
      }
    };

    for (const child of systemChildren) {
      traverse(child.id, 0);
    }

    const levelKeys = Object.keys(levels).map(Number);
    const maxLevelNum = levelKeys.length > 0 ? Math.max(...levelKeys) : 0;
    const levelValues = Object.values(levels);
    const maxNodesInLevel = levelValues.length > 0 ? Math.max(...levelValues.map(l => l.length)) : 1;
    const calculatedWidth = Math.max(800, maxNodesInLevel * 60 + 100);

    // Build node positions - create a map for O(1) parent lookup
    const nodeMap = new Map<string, TreeNode>();

    for (const [level, items] of Object.entries(levels)) {
      const l = parseInt(level);
      const count = items.length;
      const spacing = Math.max(50, Math.min(120, (calculatedWidth - 100) / (count + 1)));
      const startX = (calculatedWidth - spacing * (count - 1)) / 2;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const x = startX + i * spacing;
        const y = 60 + l * 90;
        const node: TreeNode = { ...item.user, x, y, level: l };
        nodesResult.push(node);
        nodeMap.set(node.id, node);
      }
    }

    // Build edges using the node map - O(1) parent lookup
    for (const node of nodesResult) {
      if (node.referrerId && node.referrerId !== SYSTEM_ID) {
        const parent = nodeMap.get(node.referrerId);
        if (parent) {
          edgesResult.push({ from: parent, to: node });
        }
      } else if (node.referrerId === SYSTEM_ID) {
        edgesResult.push({ from: { x: calculatedWidth / 2, y: 20, isSystem: true }, to: node });
      }
    }

    return { nodes: nodesResult, edges: edgesResult, maxLevel: maxLevelNum, dynamicWidth: calculatedWidth };
  }, [state.users]);

  // Zoom helpers
  const getZoomFocusPoint = useCallback(() => {
    const focusId = focusedUserId || selectedUser?.id;
    if (focusId) {
      const node = nodes.find(n => n.id === focusId);
      if (node) {
        return { x: node.x, y: node.y };
      }
    }
    return { x: dynamicWidth / 2, y: 200 };
  }, [focusedUserId, selectedUser, nodes, dynamicWidth]);

  const zoomToPoint = useCallback((newZoom: number, focusPoint: { x: number; y: number }) => {
    if (!treeContainerRef.current) {
      setZoom(newZoom);
      return;
    }

    const containerWidth = treeContainerRef.current.clientWidth;
    const containerHeight = treeContainerRef.current.clientHeight;

    const newPanX = containerWidth / 2 - focusPoint.x * newZoom;
    const newPanY = containerHeight / 2 - focusPoint.y * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, []);

  const handleFitToView = useCallback(() => {
    if (!treeContainerRef.current) return;
    const containerWidth = treeContainerRef.current.clientWidth;
    const containerHeight = treeContainerRef.current.clientHeight;
    const contentWidth = dynamicWidth;
    const contentHeight = Math.max(500, (maxLevel + 1) * 90 + 100);
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1) * 0.9;
    const finalZoom = Math.max(newZoom, MIN_ZOOM);

    const treeCenterX = dynamicWidth / 2;
    const treeCenterY = contentHeight / 2;

    const newPanX = containerWidth / 2 - treeCenterX * finalZoom;
    const newPanY = containerHeight / 2 - treeCenterY * finalZoom;

    setZoom(finalZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [dynamicWidth, maxLevel]);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom * ZOOM_STEP, MAX_ZOOM);
    const focusPoint = getZoomFocusPoint();
    zoomToPoint(newZoom, focusPoint);
  }, [zoom, getZoomFocusPoint, zoomToPoint]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom / ZOOM_STEP, MIN_ZOOM);
    const focusPoint = getZoomFocusPoint();
    zoomToPoint(newZoom, focusPoint);
  }, [zoom, getZoomFocusPoint, zoomToPoint]);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * delta, MIN_ZOOM), MAX_ZOOM);
      const focusPoint = getZoomFocusPoint();
      zoomToPoint(newZoom, focusPoint);
    }
  }, [zoom, getZoomFocusPoint, zoomToPoint]);

  // Compensate pan when tree width changes
  const prevDynamicWidthRef = useRef(dynamicWidth);
  useEffect(() => {
    const widthDelta = dynamicWidth - prevDynamicWidthRef.current;
    prevDynamicWidthRef.current = dynamicWidth;

    if (widthDelta !== 0) {
      setPan(prev => ({
        x: prev.x - (widthDelta / 2) * zoom,
        y: prev.y
      }));
    }
  }, [dynamicWidth, zoom]);

  // Auto-zoom as tree grows
  const prevNodeCountRef = useRef(nodes.length);
  useEffect(() => {
    if (!treeContainerRef.current) return;

    const isGrowing = nodes.length > prevNodeCountRef.current && prevNodeCountRef.current > 0;
    prevNodeCountRef.current = nodes.length;

    if (!isGrowing) return;

    const containerWidth = treeContainerRef.current.clientWidth;
    const containerHeight = treeContainerRef.current.clientHeight;
    const contentWidth = dynamicWidth;
    const contentHeight = Math.max(500, (maxLevel + 1) * 90 + 100);

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const optimalZoom = Math.min(scaleX, scaleY, 1) * 0.85;
    const targetZoom = Math.max(optimalZoom, MIN_ZOOM);

    if (zoom > targetZoom) {
      const focusPoint = getZoomFocusPoint();
      zoomToPoint(targetZoom, focusPoint);
    }
  }, [nodes.length, dynamicWidth, maxLevel, zoom, getZoomFocusPoint, zoomToPoint]);

  const focusOnUser = useCallback((userId: string) => {
    const node = nodes.find(n => n.id === userId);
    if (!node || !treeContainerRef.current) return;

    const containerWidth = treeContainerRef.current.clientWidth;
    const containerHeight = treeContainerRef.current.clientHeight;

    const targetZoom = 1.5;
    const newPanX = containerWidth / 2 - node.x * targetZoom;
    const newPanY = containerHeight / 2 - node.y * targetZoom;

    setZoom(targetZoom);
    setPan({ x: newPanX, y: newPanY });
    setFocusedUserId(userId);

    setTimeout(() => setFocusedUserId(null), 3000);

    const user = state.users[userId];
    if (user) {
      setSelectedUser(user);
      const listline = state.listlines.find(l => l.userId === userId);
      setShowListline(listline || null);
    }
  }, [nodes, state.users, state.listlines]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = Object.values(state.users)
      .filter(u => !u.isSystem && u.name.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
    setSearchResults(results);
  }, [state.users]);

  const selectSearchResult = useCallback((user: User) => {
    setSelectedUser(user);
    const listline = state.listlines.find(l => l.userId === user.id);
    setShowListline(listline || null);
    focusOnUser(user.id);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchPanel(false);
    setShowUserModal(true);
  }, [state.listlines, focusOnUser]);

  // Extracted node click handler for SVG tree nodes
  const handleNodeClick = useCallback((node: TreeNode) => {
    setSelectedUser(node);
    const listline = state.listlines.find(l => l.userId === node.id);
    setShowListline(listline || null);
    setShowUserModal(true);
  }, [state.listlines]);

  // Extracted handlers for user actions
  const handleDepositClick = useCallback((userId: string) => {
    processDeposit(userId);
  }, [processDeposit]);

  const handleAddRecruitClick = useCallback((referrerId: string) => {
    addUser(referrerId);
  }, [addUser]);

  const handleDepositAndCloseModal = useCallback((userId: string) => {
    processDeposit(userId);
    setShowUserModal(false);
  }, [processDeposit]);

  const handleAddRecruitAndCloseModal = useCallback((referrerId: string) => {
    addUser(referrerId);
    setShowUserModal(false);
  }, [addUser]);

  const handleFocusAndCloseModal = useCallback((userId: string) => {
    focusOnUser(userId);
    setShowUserModal(false);
  }, [focusOnUser]);

  // Memoized selected user full info - computed only when selectedUser or state changes
  const selectedUserFullInfo = useMemo(() => {
    if (!selectedUser) return null;

    const referrer = selectedUser.referrerId ? state.users[selectedUser.referrerId] : null;
    const directRecruitsList = Object.values(state.users).filter(u => u.referrerId === selectedUser.id);
    const depositingRecruitsList = directRecruitsList.filter(u => u.hasDeposited);

    const userListlines = state.listlines.filter(l => l.userId === selectedUser.id);
    const earningsFromDeposits = state.listlines.filter(l => l.position1 === selectedUser.id).length * DEPOSIT_AMOUNT;

    const upline: User[] = [];
    let currentId = selectedUser.referrerId;
    for (let i = 0; i < 10 && currentId; i++) {
      const uplineUser = state.users[currentId];
      if (!uplineUser) break;
      upline.push(uplineUser);
      currentId = uplineUser.referrerId;
    }

    return {
      user: selectedUser,
      referrer,
      directRecruitsList,
      depositingRecruitsList,
      userListlines,
      earningsFromDeposits,
      upline,
      treeDepth: upline.length,
    };
  }, [selectedUser, state.users, state.listlines]);

  const activePaymentAnimations = useMemo(() =>
    state.animations.filter(
      a => a.type === 'payment_flow' && renderTime - a.timestamp < PAYMENT_ANIMATION_DURATION_MS
    ),
    [state.animations, renderTime]
  );

  const stats = [
    { icon: Users, label: "Verified", value: `${verifiedUsers.length} / ${notVerifiedUsers.length}`, color: "text-neon-blue", subtext: "verified / not verified" },
    { icon: Wallet, label: "Deposited", value: `${depositedUsers.length} / ${notDepositedUsers.length}`, color: "text-neon-pink", subtext: "deposited / not deposited" },
    { icon: Trophy, label: "System Balance", value: `€${state.systemBalance}`, color: "text-neon-purple", subtext: "from shallow chains" },
    { icon: Gift, label: "Successors", value: state.successorCount.toString(), color: "text-emerald-400", subtext: "nominations triggered" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 pb-8 text-white">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue bg-clip-text text-transparent">
            Referral System Simulation
          </h1>
          <p className="text-gray-400 text-sm mt-2">4-Position Listline with Successor Mechanism</p>
        </header>

        {/* Controls */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl mb-6">
          <div className="flex gap-3 justify-center mb-4 flex-wrap">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                isPlaying
                  ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/50 hover:bg-neon-pink/30'
                  : 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50 hover:bg-neon-purple/30'
              }`}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={step}
              disabled={isPlaying}
              className="px-5 py-2.5 rounded-lg font-medium bg-neon-blue/20 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ⏭ Step
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-lg font-medium bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-all"
            >
              ↺ Reset
            </button>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-neon-purple"
            >
              <option value={2500}>0.5x Speed</option>
              <option value={1500}>1x Speed</option>
              <option value={800}>2x Speed</option>
              <option value={400}>4x Speed</option>
              <option value={150}>10x Speed</option>
              <option value={75}>20x Speed</option>
            </select>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={handleLoadScenario}
              className="px-5 py-2.5 rounded-lg font-medium bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 text-neon-pink border border-neon-pink/30 hover:from-neon-purple/30 hover:to-neon-pink/30 transition-all"
            >
              🎯 Load Successor Scenario
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
              <span className="text-xs text-gray-400">Mode:</span>
              <button
                onClick={() => setSimulationMode('random')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  simulationMode === 'random'
                    ? 'bg-neon-purple text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                Random
              </button>
              <button
                onClick={() => setSimulationMode('targeted')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  simulationMode === 'targeted'
                    ? 'bg-neon-pink text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                🎯 Targeted
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-xs text-gray-400">
              {simulationMode === 'targeted' ? (
                <span>⚡ Focusing recruits on users close to {SUCCESSOR_THRESHOLD} deposits</span>
              ) : (
                <span>🎲 Random referral distribution</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-black/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:border-neon-purple/30 transition-colors group">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={18} />
                </div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="font-display text-2xl text-white font-bold mb-1">{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.subtext}</div>
            </div>
          ))}
        </div>

        {/* Successor Ready */}
        {successorReady.length > 0 && (
          <div className="bg-gradient-to-r from-neon-pink/20 to-emerald-500/10 rounded-2xl p-4 border border-neon-pink/40 mb-6 shadow-lg shadow-neon-pink/10">
            <h3 className="text-sm font-display font-semibold text-neon-pink mb-3 flex items-center gap-2">
              <Crown className="text-neon-pink animate-pulse" size={16} />
              Successor Ready
              <span className="ml-auto text-xs bg-neon-pink/20 px-2 py-0.5 rounded-full">{successorReady.length} ready</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {successorReady.map(user => (
                <button
                  key={user.id}
                  onClick={() => selectSearchResult(user)}
                  className="w-[calc(20%-0.6rem)] min-w-[120px] bg-black/40 backdrop-blur-md rounded-xl p-3 hover:bg-white/10 transition-all text-left border border-neon-pink/30 hover:border-neon-pink/50 shadow-md shadow-neon-pink/10"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-neon-pink text-white animate-pulse">
                      {user.name.charAt(0)}
                    </span>
                    <span className="text-white text-sm font-medium truncate">{user.name}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                    <div
                      className="h-2 rounded-full bg-neon-pink animate-pulse"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="text-xs text-neon-pink text-center font-medium">
                    {user.depositingRecruits}/{SUCCESSOR_THRESHOLD} READY!
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Close to Successor */}
        {closeToSuccessor.length > 0 && (
          <div className="bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-2xl p-4 border border-neon-purple/20 mb-6">
            <h3 className="text-sm font-display font-semibold text-neon-purple mb-3 flex items-center gap-2">
              <Crown className="text-neon-purple" size={16} />
              Close to Successor Nomination
              <span className="ml-auto text-xs bg-neon-purple/20 px-2 py-0.5 rounded-full">{closeToSuccessor.length} close</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {closeToSuccessor.map(user => (
                <button
                  key={user.id}
                  onClick={() => selectSearchResult(user)}
                  className="w-[calc(20%-0.6rem)] min-w-[120px] bg-black/40 backdrop-blur-md rounded-xl p-3 hover:bg-white/10 transition-all text-left border border-white/5 hover:border-neon-purple/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-neon-purple/30 text-neon-purple">
                      {user.name.charAt(0)}
                    </span>
                    <span className="text-white text-sm font-medium truncate">{user.name}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink transition-all"
                      style={{ width: `${Math.min(100, (user.depositingRecruits / SUCCESSOR_THRESHOLD) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 text-center">
                    {user.depositingRecruits}/{SUCCESSOR_THRESHOLD}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment Flow Visualization */}
        <ListlineVisualization
          payment={highlightedPayment || lastPayment}
          isActive={!!highlightedPayment}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Tree Visualization */}
          <div className="col-span-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
            <div className="flex items-center justify-between mb-3 gap-4">
              <h2 className="text-sm font-display font-semibold text-white uppercase tracking-wider">Referral Tree</h2>

              <div className="flex-1 max-w-xs relative">
                <input
                  type="text"
                  placeholder="🔍 Search users..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setShowSearchPanel(true)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple"
                />
                {searchResults.length > 0 && showSearchPanel && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => selectSearchResult(user)}
                        className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            user.hasDeposited ? 'bg-neon-pink/30 text-neon-pink' : 'bg-white/10 text-gray-400'
                          }`}>
                            {user.name.charAt(0)}
                          </span>
                          <span className="text-white text-sm">{user.name}</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          €{user.totalEarnings} | {user.depositingRecruits} deps
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && showSearchPanel && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl z-50 p-3 text-center text-gray-500 text-sm">
                    No users found
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={handleZoomOut}
                  className="w-8 h-8 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center text-lg font-bold border border-white/10"
                >
                  −
                </button>
                <button
                  onClick={handleResetZoom}
                  className="px-2 h-8 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-xs font-medium border border-white/10"
                >
                  100%
                </button>
                <button
                  onClick={handleZoomIn}
                  className="w-8 h-8 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center text-lg font-bold border border-white/10"
                >
                  +
                </button>
                <button
                  onClick={handleFitToView}
                  className="px-2 h-8 rounded-lg bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 transition-all text-xs font-medium border border-neon-blue/30"
                >
                  Fit
                </button>
              </div>
            </div>
            <div
              ref={treeContainerRef}
              className="overflow-hidden max-h-[500px] bg-black/50 rounded-xl cursor-grab active:cursor-grabbing select-none border border-white/5"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <svg
                width={dynamicWidth}
                height={Math.max(500, (maxLevel + 1) * 90 + 100)}
                className="min-w-full"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: '0 0',
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                }}
              >
                <defs>
                  <linearGradient id="paymentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={COLORS.neonPink} stopOpacity="0" />
                    <stop offset="50%" stopColor={COLORS.neonPink} stopOpacity="1" />
                    <stop offset="100%" stopColor={COLORS.neonPink} stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                <circle cx={dynamicWidth / 2} cy="20" r="16" fill="#1a1a2e" stroke={COLORS.system} strokeWidth="2" />
                <text x={dynamicWidth / 2} y="25" textAnchor="middle" fill={COLORS.system} fontSize="10" fontWeight="bold">SYS</text>

                {edges.map((edge, i) => (
                  <line
                    key={i}
                    x1={edge.from.x}
                    y1={edge.from.y + (edge.from.isSystem ? 0 : 16)}
                    x2={edge.to.x}
                    y2={edge.to.y - 16}
                    stroke={COLORS.neonPink}
                    strokeOpacity={edge.from.isSystem ? 0.3 : 0.5}
                    strokeWidth="1.5"
                    strokeDasharray={edge.from.isSystem ? "4,4" : "none"}
                  />
                ))}

                {activePaymentAnimations.map((anim, i) => {
                  const fromNode = nodes.find(n => n.id === anim.fromId);
                  const toNode = anim.toId === SYSTEM_ID
                    ? { x: dynamicWidth / 2, y: 20 }
                    : nodes.find(n => n.id === anim.toId);

                  if (!fromNode || !toNode) return null;

                  const progress = (renderTime - anim.timestamp) / PAYMENT_ANIMATION_DURATION_MS;
                  const x = fromNode.x + (toNode.x - fromNode.x) * progress;
                  const y = fromNode.y + (toNode.y - fromNode.y) * progress;

                  return (
                    <g key={`payment-${i}`}>
                      <line
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke={COLORS.neonPink}
                        strokeWidth="2"
                        strokeOpacity={0.5}
                        filter="url(#glow)"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r="8"
                        fill={COLORS.neonPink}
                        filter="url(#glow)"
                      >
                        <animate
                          attributeName="r"
                          values="6;10;6"
                          dur="0.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <text x={x} y={y + 3} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">€</text>
                    </g>
                  );
                })}

                {nodes.map((node) => {
                  const isNew = state.animations.some(
                    a => a.type === 'user_join' && a.userId === node.id && renderTime - a.timestamp < 1000
                  );
                  const isSuccessor = state.animations.some(
                    a => a.type === 'successor' && a.successorId === node.id && renderTime - a.timestamp < ANIMATION_DURATION_MS
                  );
                  const isSelected = selectedUser?.id === node.id;
                  const isFocused = focusedUserId === node.id;
                  const isCloseToSuccessor = node.depositingRecruits >= 10 && node.depositingRecruits < SUCCESSOR_THRESHOLD && !node.successorNominated;
                  const isReadyForSuccessor = node.depositingRecruits >= SUCCESSOR_THRESHOLD && !node.successorNominated;

                  return (
                    <g
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      className="cursor-pointer"
                    >
                      {isReadyForSuccessor && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="28"
                          fill="none"
                          stroke={COLORS.neonPink}
                          strokeWidth="2"
                          strokeDasharray="4,2"
                        >
                          <animate
                            attributeName="r"
                            values="26;32;26"
                            dur="1.5s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="1;0.4;1"
                            dur="1.5s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}
                      {isCloseToSuccessor && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="26"
                          fill="none"
                          stroke={COLORS.neonPurple}
                          strokeWidth="1.5"
                          strokeDasharray="3,3"
                          opacity="0.6"
                        />
                      )}
                      {isFocused && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="30"
                          fill="none"
                          stroke={COLORS.neonPink}
                          strokeWidth="3"
                          opacity="0.8"
                        >
                          <animate
                            attributeName="r"
                            values="25;35;25"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.8;0.3;0.8"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isSelected || isFocused ? 22 : 18}
                        fill={
                          isReadyForSuccessor ? 'rgba(255,45,117,0.2)' :
                          node.successorNominated ? 'rgba(255,45,117,0.2)' :
                          node.hasDeposited ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'
                        }
                        stroke={
                          isFocused ? COLORS.neonPink :
                          isReadyForSuccessor ? COLORS.neonPink :
                          isSuccessor ? COLORS.neonPink :
                          isNew ? COLORS.neonBlue :
                          isSelected ? COLORS.neonBlue :
                          isCloseToSuccessor ? COLORS.neonPurple :
                          node.successorNominated ? COLORS.neonPink :
                          node.hasDeposited ? COLORS.emerald : 'rgba(255,255,255,0.2)'
                        }
                        strokeWidth={isNew || isSuccessor || isSelected || isFocused || isReadyForSuccessor ? 3 : 2}
                        filter={isNew || isSuccessor || isFocused || isReadyForSuccessor ? 'url(#glow)' : 'none'}
                      >
                        {isNew && (
                          <animate
                            attributeName="r"
                            values="10;22;18"
                            dur="0.5s"
                            fill="freeze"
                          />
                        )}
                      </circle>
                      <text
                        x={node.x}
                        y={node.y + 4}
                        textAnchor="middle"
                        fill={node.hasDeposited ? '#fff' : '#6b7280'}
                        fontSize="9"
                        fontWeight="bold"
                      >
                        {node.name.slice(0, 4)}
                      </text>
                      {node.totalEarnings > 0 && (
                        <text
                          x={node.x}
                          y={node.y + 32}
                          textAnchor="middle"
                          fill={COLORS.neonPink}
                          fontSize="9"
                          fontWeight="bold"
                        >
                          €{node.totalEarnings}
                        </text>
                      )}
                      {node.depositingRecruits >= 5 && !node.successorNominated && (
                        <g>
                          <circle
                            cx={node.x + 18}
                            cy={node.y - 14}
                            r="10"
                            fill={node.depositingRecruits >= SUCCESSOR_THRESHOLD ? COLORS.neonPink : COLORS.neonPurple}
                          />
                          <text
                            x={node.x + 18}
                            y={node.y - 11}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize="8"
                            fontWeight="bold"
                          >
                            {node.depositingRecruits}
                          </text>
                        </g>
                      )}
                      {node.successorNominated && (
                        <text x={node.x + 20} y={node.y - 12} fontSize="12">🎯</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex gap-4 mt-3 text-xs text-gray-500 justify-center flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-white/10 border-2 border-white/20"></span> Pending
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500/20 border-2 border-emerald-500"></span> Deposited
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-neon-purple/20 border-2 border-neon-purple"></span> Close (10-12)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-neon-pink/20 border-2 border-neon-pink animate-pulse"></span> Ready ({SUCCESSOR_THRESHOLD}+)
              </span>
              <span className="border-l border-white/10 pl-4">Drag to pan • Ctrl+Scroll to zoom</span>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected User Panel */}
            {selectedUser && !selectedUser.isSystem && (() => {
              const fullInfo = selectedUserFullInfo;
              if (!fullInfo) return null;

              return (
                <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4 max-h-[600px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-display font-semibold text-neon-blue uppercase tracking-wider flex items-center gap-2">
                      <span>👤</span> {selectedUser.name}
                    </h2>
                    <button
                      onClick={() => focusOnUser(selectedUser.id)}
                      className="px-2 py-1 text-xs bg-neon-blue/20 text-neon-blue rounded border border-neon-blue/30 hover:bg-neon-blue/30 transition-all"
                    >
                      📍 Focus
                    </button>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                        <div className="text-gray-500 text-xs">Balance</div>
                        <div className="font-display font-bold text-neon-pink">€{selectedUser.balance.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                        <div className="text-gray-500 text-xs">Total Earnings</div>
                        <div className="font-display font-bold text-white">€{selectedUser.totalEarnings.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                        <div className="text-gray-500 text-xs">Direct Recruits</div>
                        <div className="font-display font-bold text-white">{selectedUser.directRecruits}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                        <div className="text-gray-500 text-xs">Depositing</div>
                        <div className="font-display font-bold text-white">{selectedUser.depositingRecruits}/{SUCCESSOR_THRESHOLD}</div>
                      </div>
                    </div>

                    <div className="flex gap-2 text-xs">
                      <span className={`px-2 py-1 rounded ${selectedUser.hasDeposited ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'}`}>
                        {selectedUser.hasDeposited ? '✓ Deposited' : '✗ Not Deposited'}
                      </span>
                      {selectedUser.successorNominated && (
                        <span className="px-2 py-1 rounded bg-neon-pink/20 text-neon-pink">
                          🎯 Successor Nominated
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <div className="text-xs text-gray-500 mb-2">Successor Progress:</div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-neon-purple to-neon-pink h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (selectedUser.depositingRecruits / SUCCESSOR_THRESHOLD) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {!selectedUser.hasDeposited && (
                        <button
                          onClick={() => processDeposit(selectedUser.id)}
                          className="flex-1 px-3 py-2 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-xl text-xs font-medium hover:bg-neon-pink/30 transition-all"
                        >
                          💰 Deposit €{DEPOSIT_AMOUNT}
                        </button>
                      )}
                      <button
                        onClick={() => addUser(selectedUser.id)}
                        disabled={!selectedUser.hasDeposited}
                        className="flex-1 px-3 py-2 bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded-xl text-xs font-medium hover:bg-neon-blue/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        👤+ Add Recruit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Top Earners */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4">
              <h2 className="text-sm font-display font-semibold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="text-yellow-400" size={16} />
                Top Earners
              </h2>
              <div className="space-y-2">
                {topEarners.filter(u => u.totalEarnings > 0).length === 0 ? (
                  <div className="text-gray-600 text-sm text-center py-4">No earnings yet</div>
                ) : (
                  topEarners.filter(u => u.totalEarnings > 0).slice(0, 5).map((user, i) => (
                    <div
                      key={user.id}
                      onClick={() => selectSearchResult(user)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                        selectedUser?.id === user.id ? 'bg-neon-blue/20 ring-1 ring-neon-blue' : 'hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-yellow-500 text-yellow-900' :
                          i === 1 ? 'bg-gray-400 text-gray-900' :
                          i === 2 ? 'bg-amber-600 text-amber-100' :
                          'bg-white/10 text-gray-400'
                        }`}>
                          {i + 1}
                        </span>
                        <span className="text-white">{user.name}</span>
                        {user.successorNominated && <span className="text-xs">🎯</span>}
                      </span>
                      <div className="text-right">
                        <span className="text-neon-pink font-bold">€{user.totalEarnings}</span>
                        <div className="text-xs text-gray-500">{user.depositingRecruits} deps</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Event Log */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4 max-h-64 overflow-y-auto">
              <h2 className="text-sm font-display font-semibold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                <span>📋</span> Event Log
              </h2>
              <div className="space-y-1.5 text-xs">
                {state.events.slice(0, 20).map((event) => (
                  <div
                    key={event.id}
                    className={`p-2 rounded-lg ${
                      event.type === 'successor'
                        ? 'bg-neon-pink/10 border border-neon-pink/20 text-neon-pink'
                        : event.type === 'deposit'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-neon-blue/10 border border-neon-blue/20 text-neon-blue'
                    }`}
                  >
                    {event.message}
                  </div>
                ))}
                {state.events.length === 0 && (
                  <div className="text-gray-600 text-center py-4">Press Play or Step to start</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-6 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-6">
          <h2 className="text-sm font-display font-semibold text-white mb-4 uppercase tracking-wider">How It Works</h2>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="bg-neon-blue/10 border border-neon-blue/20 rounded-xl p-4">
              <h3 className="text-neon-blue font-display font-medium mb-1">1. Registration</h3>
              <p className="text-gray-500 text-xs">New users register via referral from an existing deposited user.</p>
            </div>
            <div className="bg-neon-purple/10 border border-neon-purple/20 rounded-xl p-4">
              <h3 className="text-neon-purple font-display font-medium mb-1">2. Deposit (€{DEPOSIT_AMOUNT})</h3>
              <p className="text-gray-500 text-xs">User makes €{DEPOSIT_AMOUNT} deposit. A 4-position listline is created.</p>
            </div>
            <div className="bg-neon-pink/10 border border-neon-pink/20 rounded-xl p-4">
              <h3 className="text-neon-pink font-display font-medium mb-1">3. Payment Routing</h3>
              <p className="text-gray-500 text-xs">€{DEPOSIT_AMOUNT} goes to P1 (great-grandparent). SYSTEM absorbs shallow chains.</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <h3 className="text-emerald-400 font-display font-medium mb-1">4. Successor ({SUCCESSOR_THRESHOLD} Deps)</h3>
              <p className="text-gray-500 text-xs">At {SUCCESSOR_THRESHOLD} depositing recruits, one from last 3 becomes successor.</p>
            </div>
          </div>
        </div>

        {/* User Modal */}
        {showUserModal && selectedUser && !selectedUser.isSystem && (() => {
          const fullInfo = selectedUserFullInfo;
          if (!fullInfo) return null;

          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowUserModal(false)}>
              <div
                className="bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-black/90 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                      selectedUser.hasDeposited ? 'bg-neon-pink/20 text-neon-pink' : 'bg-white/10 text-gray-400'
                    }`}>
                      {selectedUser.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold text-white">{selectedUser.name}</h2>
                      <div className="flex gap-2 text-xs mt-1">
                        <span className={`px-2 py-0.5 rounded ${selectedUser.hasDeposited ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'}`}>
                          {selectedUser.hasDeposited ? '✓ Active' : 'Pending'}
                        </span>
                        {selectedUser.successorNominated && (
                          <span className="px-2 py-0.5 rounded bg-neon-pink/20 text-neon-pink">🎯 Successor</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFocusAndCloseModal(selectedUser.id)}
                      className="px-3 py-2 bg-neon-blue/20 text-neon-blue rounded-lg text-sm hover:bg-neon-blue/30 transition-all border border-neon-blue/30"
                    >
                      📍 Focus on Tree
                    </button>
                    <button
                      onClick={() => setShowUserModal(false)}
                      className="px-3 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-all border border-white/10"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                      <div className="text-2xl font-display font-bold text-neon-pink">€{selectedUser.balance.toFixed(2)}</div>
                      <div className="text-xs text-gray-500 mt-1">Balance</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                      <div className="text-2xl font-display font-bold text-white">€{selectedUser.totalEarnings.toFixed(2)}</div>
                      <div className="text-xs text-gray-500 mt-1">Total Earnings</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                      <div className="text-2xl font-display font-bold text-neon-blue">{selectedUser.directRecruits}</div>
                      <div className="text-xs text-gray-500 mt-1">Direct Recruits</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                      <div className="text-2xl font-display font-bold text-neon-purple">{selectedUser.depositingRecruits}</div>
                      <div className="text-xs text-gray-500 mt-1">Depositing</div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Successor Progress</span>
                      <span className="text-sm text-white">{selectedUser.depositingRecruits}/{SUCCESSOR_THRESHOLD}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-neon-purple to-neon-pink h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (selectedUser.depositingRecruits / SUCCESSOR_THRESHOLD) * 100)}%` }}
                      />
                    </div>
                    {selectedUser.depositingRecruits >= SUCCESSOR_THRESHOLD && (
                      <div className="text-xs text-neon-pink mt-2 text-center">🎉 Successor threshold reached!</div>
                    )}
                  </div>

                  {showListline && (
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <h3 className="text-sm font-display font-semibold text-white mb-3 flex items-center gap-2">
                        <span>💸</span> Listline (Payment Chain)
                      </h3>
                      <div className="flex items-center gap-2">
                        {[
                          { pos: 'P4', id: showListline.position4, label: 'User', color: 'neon-blue' },
                          { pos: 'P3', id: showListline.position3, label: 'Parent', color: 'neon-purple' },
                          { pos: 'P2', id: showListline.position2, label: 'Grandparent', color: 'neon-purple' },
                          { pos: 'P1', id: showListline.position1, label: 'Recipient', color: 'neon-pink' },
                        ].map(({ pos, id, label, color }, i) => (
                          <React.Fragment key={pos}>
                            <div className={`flex-1 text-center p-2 rounded-xl ${
                              pos === 'P1' ? 'bg-neon-pink/10 border border-neon-pink/30' : 'bg-white/5 border border-white/5'
                            }`}>
                              <div className={`text-xs text-${color}`}>{pos}</div>
                              <div className="font-medium text-sm text-white">{getUserName(id)}</div>
                              <div className="text-xs text-gray-500">{label}</div>
                            </div>
                            {i < 3 && <span className="text-gray-600">→</span>}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="text-xs text-center text-gray-500 mt-2">
                        €{DEPOSIT_AMOUNT} deposit flows from P4 to P1 (recipient)
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    {!selectedUser.hasDeposited && (
                      <button
                        onClick={() => handleDepositAndCloseModal(selectedUser.id)}
                        className="flex-1 px-4 py-3 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-xl font-medium hover:bg-neon-pink/30 transition-all"
                      >
                        💰 Make Deposit (€{DEPOSIT_AMOUNT})
                      </button>
                    )}
                    <button
                      onClick={() => handleAddRecruitAndCloseModal(selectedUser.id)}
                      disabled={!selectedUser.hasDeposited}
                      className="flex-1 px-4 py-3 bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded-xl font-medium hover:bg-neon-blue/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      👤+ Add New Recruit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

export default ReferralSimulation;
