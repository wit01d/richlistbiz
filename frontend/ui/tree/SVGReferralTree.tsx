import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Eye, TrendingUp, UserPlus, Users, Wallet } from 'lucide-react';
import type { ReferralTreeNode, TreeNodePosition, TreeEdge } from '../../types/tree';
import { TREE_COLORS } from '../../constants/business';
import { findNodeInTree } from '../../utils/mockData';
import { useTreeNavigation } from '../../ux/hooks';

// Re-export type for backward compatibility
export type { ReferralTreeNode } from '../../types/tree';

// ============================================================================
// CONSTANTS
// ============================================================================
const TREE_NODE_RADIUS = 20;
const MIN_NODE_SPACING_X = 50;
const MIN_NODE_SPACING_Y = 60;
const MAX_VIEWPORT_HEIGHT = 500; // Target max container height
const HEADER_OFFSET = 50; // Space for root "YOU" node

// ============================================================================
// COMPONENT
// ============================================================================
export interface SVGReferralTreeProps {
  tree: ReferralTreeNode[];
  username: string;
}

export const SVGReferralTree: React.FC<SVGReferralTreeProps> = ({ tree, username }) => {
  const [selectedNode, setSelectedNode] = useState<ReferralTreeNode | null>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const localContainerRef = useRef<HTMLDivElement>(null);
  const prevNodeCountRef = useRef(0);
  const prevTreeWidthRef = useRef(600);
  const prevTreeHeightRef = useRef(400);

  // Use shared tree navigation hook
  const {
    zoom,
    pan,
    isPanning,
    setZoom,
    setPan,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleResetZoom,
  } = useTreeNavigation({ minZoom: 0.25, maxZoom: 3, enableTouch: false });

  // Track container width with ResizeObserver
  useEffect(() => {
    if (!localContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    });

    resizeObserver.observe(localContainerRef.current);
    // Set initial width
    setContainerWidth(localContainerRef.current.clientWidth || 600);

    return () => resizeObserver.disconnect();
  }, []);

  // Keep selected node in sync with tree updates
  useEffect(() => {
    if (selectedNode) {
      const updatedNode = findNodeInTree(tree, selectedNode.id);
      if (updatedNode) {
        // Only update if node data actually changed
        if (JSON.stringify(updatedNode) !== JSON.stringify(selectedNode)) {
          setSelectedNode(updatedNode);
        }
      } else {
        // Node was removed from tree
        setSelectedNode(null);
      }
    }
  }, [tree, selectedNode]);

  // Compute tree layout - viewport-aware with adaptive spacing
  // Width expands when zooming out to fill the visible viewport
  const { nodes, edges, treeWidth, treeHeight, totalNodes, optimalZoom } = useMemo(() => {
    const nodesResult: TreeNodePosition[] = [];
    const edgesResult: TreeEdge[] = [];
    const levels: Record<number, ReferralTreeNode[]> = {};

    // Collect nodes by their level property (0-2 only, matching listline positions)
    // Level 0 = Position 3, Level 1 = Position 2, Level 2 = Position 1 (you get paid!)
    const collectByLevel = (node: ReferralTreeNode, depth: number) => {
      if (depth > 2) return;
      const level = Math.min(node.level, 2); // Use node's level property, max 2
      if (!levels[level]) levels[level] = [];
      levels[level].push(node);
      node.children.forEach(child => collectByLevel(child, depth + 1));
    };

    tree.forEach(node => collectByLevel(node, 0));

    const levelKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);
    const numLevels = levelKeys.length;

    if (numLevels === 0) {
      return { nodes: [], edges: [], treeWidth: containerWidth, treeHeight: 200, totalNodes: 0, optimalZoom: 1 };
    }

    // Calculate effective width based on zoom - expands when zooming out
    const effectiveWidth = containerWidth / zoom;

    // Calculate nodes per row based on effective width (more nodes fit when zoomed out)
    const nodesPerRow = Math.max(4, Math.floor((effectiveWidth - 40) / MIN_NODE_SPACING_X));

    // Calculate total visual rows needed
    let totalRows = 0;
    const levelRowCounts: Record<number, number> = {};
    for (const level of levelKeys) {
      const rowsForLevel = Math.ceil(levels[level].length / nodesPerRow);
      levelRowCounts[level] = rowsForLevel;
      totalRows += rowsForLevel;
    }

    // Calculate adaptive vertical spacing to fit in viewport
    const effectiveHeight = MAX_VIEWPORT_HEIGHT / zoom;
    const availableHeight = effectiveHeight - HEADER_OFFSET - 40;
    const adaptiveRowHeight = Math.max(MIN_NODE_SPACING_Y, Math.min(80, availableHeight / Math.max(totalRows, 1)));

    // Calculate actual tree dimensions (expanded based on zoom)
    const calculatedWidth = effectiveWidth;
    const calculatedHeight = HEADER_OFFSET + totalRows * adaptiveRowHeight + 60;

    // Calculate cumulative Y offset for each level
    const levelYOffsets: Record<number, number> = {};
    let cumulativeRows = 0;
    for (const level of levelKeys) {
      levelYOffsets[level] = cumulativeRows * adaptiveRowHeight;
      cumulativeRows += levelRowCounts[level];
    }

    // Position nodes
    const nodePositions = new Map<string, { x: number; y: number }>();

    for (const level of levelKeys) {
      const levelNodes = levels[level];
      const totalCount = levelNodes.length;

      levelNodes.forEach((node, i) => {
        const rowIndex = Math.floor(i / nodesPerRow);
        const indexInRow = i % nodesPerRow;
        const nodesInThisRow = Math.min(nodesPerRow, totalCount - rowIndex * nodesPerRow);

        // Center nodes horizontally - spread out more when zoomed out
        const nodeSpacing = Math.min(MIN_NODE_SPACING_X * 1.5, (calculatedWidth - 60) / Math.max(nodesInThisRow, 1));
        const rowWidth = nodeSpacing * (nodesInThisRow - 1);
        const startX = (calculatedWidth - rowWidth) / 2;
        const x = startX + indexInRow * nodeSpacing;

        // Vertical position
        const y = HEADER_OFFSET + levelYOffsets[level] + rowIndex * adaptiveRowHeight + adaptiveRowHeight / 2;

        const positionedNode: TreeNodePosition = { ...node, x, y };
        nodesResult.push(positionedNode);
        nodePositions.set(node.id, { x, y });
      });
    }

    // Build edges (simplified - connect to immediate children only)
    const buildEdges = (node: ReferralTreeNode, depth: number) => {
      if (depth > 2) return;
      const parentPos = nodePositions.get(node.id);
      if (!parentPos) return;

      node.children.forEach(child => {
        const childPos = nodePositions.get(child.id);
        if (childPos) {
          edgesResult.push({
            from: { x: parentPos.x, y: parentPos.y + TREE_NODE_RADIUS },
            to: { x: childPos.x, y: childPos.y - TREE_NODE_RADIUS },
          });
        }
        buildEdges(child, depth + 1);
      });
    };

    tree.forEach(node => buildEdges(node, 0));

    // Calculate optimal zoom to fit in viewport
    const zoomX = containerWidth / calculatedWidth;
    const zoomY = MAX_VIEWPORT_HEIGHT / calculatedHeight;
    const calculatedOptimalZoom = Math.min(zoomX, zoomY, 1);

    return {
      nodes: nodesResult,
      edges: edgesResult,
      treeWidth: calculatedWidth,
      treeHeight: calculatedHeight,
      totalNodes: nodesResult.length,
      optimalZoom: Math.max(0.3, calculatedOptimalZoom),
    };
  }, [tree, containerWidth, zoom]);

  // Fit to view uses local optimalZoom from layout computation
  const handleFitToView = useCallback(() => {
    setZoom(optimalZoom);
    setPan({ x: 0, y: 0 });
  }, [optimalZoom, setZoom, setPan]);

  // Auto-fit when tree changes or container resizes
  useEffect(() => {
    const nodeCountChanged = totalNodes !== prevNodeCountRef.current;
    const sizeChanged = treeWidth !== prevTreeWidthRef.current || treeHeight !== prevTreeHeightRef.current;

    prevNodeCountRef.current = totalNodes;
    prevTreeWidthRef.current = treeWidth;
    prevTreeHeightRef.current = treeHeight;

    // Auto-fit when tree changes
    if (nodeCountChanged || sizeChanged) {
      setZoom(optimalZoom);
      setPan({ x: 0, y: 0 });
    }
  }, [totalNodes, treeWidth, treeHeight, optimalZoom]);

  // Get level color (3 levels only: Position 3, Position 2, Position 1)
  const getLevelColor = (level: number) => {
    const colors = [TREE_COLORS.neonPurple, TREE_COLORS.neonBlue, TREE_COLORS.neonPink];
    return colors[Math.min(level, colors.length - 1)];
  };

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-neon-purple/10 flex items-center justify-center mb-4">
          <Users className="text-neon-purple/50" size={40} />
        </div>
        <p className="text-gray-400 mb-2 text-lg">No referral network yet</p>
        <p className="text-gray-600 text-sm max-w-sm">
          When your referrals invite others, they'll appear here in an interactive tree up to 3 levels deep.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="bg-white/5 px-2 py-1 rounded">{totalNodes} members</span>
          <span className="bg-white/5 px-2 py-1 rounded">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(prev => Math.max(prev / 1.25, 0.25))}
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
            onClick={() => setZoom(prev => Math.min(prev * 1.25, 3))}
            className="w-8 h-8 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center text-lg font-bold border border-white/10"
          >
            +
          </button>
          <button
            onClick={handleFitToView}
            className="px-3 h-8 rounded-lg bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 transition-all text-xs font-medium border border-neon-purple/30"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Tree Container - fixed viewport height, content scales to fit */}
      <div
        ref={localContainerRef}
        className="w-full overflow-hidden bg-black/50 rounded-xl cursor-grab active:cursor-grabbing select-none border border-white/5"
        style={{ height: MAX_VIEWPORT_HEIGHT }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${containerWidth} ${MAX_VIEWPORT_HEIGHT}`}
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="treeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={TREE_COLORS.neonPurple} stopOpacity="0.8" />
              <stop offset="100%" stopColor={TREE_COLORS.neonPink} stopOpacity="0.3" />
            </linearGradient>
            <filter id="treeGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Transform group for zoom/pan - centers content in viewport */}
          <g
            style={{
              transform: `translate(${containerWidth / 2 + pan.x}px, ${MAX_VIEWPORT_HEIGHT / 2 + pan.y}px) scale(${zoom}) translate(${-treeWidth / 2}px, ${-treeHeight / 2}px)`,
              transition: isPanning ? 'none' : 'transform 0.15s ease-out',
            }}
          >

          {/* Root node (YOU) */}
          <g>
            <circle
              cx={treeWidth / 2}
              cy={30}
              r={20}
              fill="rgba(168,85,247,0.2)"
              stroke={TREE_COLORS.neonPurple}
              strokeWidth="3"
              filter="url(#treeGlow)"
            />
            <text
              x={treeWidth / 2}
              y={35}
              textAnchor="middle"
              fill="#fff"
              fontSize="10"
              fontWeight="bold"
            >
              YOU
            </text>
            <text
              x={treeWidth / 2}
              y={52}
              textAnchor="middle"
              fill={TREE_COLORS.neonPurple}
              fontSize="9"
            >
              {username}
            </text>
          </g>

          {/* Edges from root to level 0 nodes */}
          {nodes.filter(n => n.level === 0).map((node, i) => (
            <line
              key={`root-edge-${i}`}
              x1={treeWidth / 2}
              y1={50}
              x2={node.x}
              y2={node.y - TREE_NODE_RADIUS}
              stroke="url(#treeGradient)"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
          ))}

          {/* Edges between nodes */}
          {edges.map((edge, i) => (
            <line
              key={`edge-${i}`}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke="url(#treeGradient)"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
          ))}

          {/* Nodes */}
          {nodes.map((node) => {
            const color = getLevelColor(node.level);
            const isSelected = selectedNode?.id === node.id;

            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(isSelected ? null : node)}
                className="cursor-pointer"
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={TREE_NODE_RADIUS + 6}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray="4,2"
                  >
                    <animate
                      attributeName="r"
                      values={`${TREE_NODE_RADIUS + 4};${TREE_NODE_RADIUS + 10};${TREE_NODE_RADIUS + 4}`}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={TREE_NODE_RADIUS}
                  fill={node.paid ? `${color}20` : 'rgba(255,255,255,0.05)'}
                  stroke={node.paid ? color : 'rgba(255,255,255,0.2)'}
                  strokeWidth={isSelected ? 3 : 2}
                  filter={isSelected ? 'url(#treeGlow)' : 'none'}
                />

                {/* User initial */}
                <text
                  x={node.x}
                  y={node.y - 2}
                  textAnchor="middle"
                  fill={node.paid ? '#fff' : '#6b7280'}
                  fontSize="12"
                  fontWeight="bold"
                >
                  {node.username.charAt(0).toUpperCase()}
                </text>

                {/* Username below */}
                <text
                  x={node.x}
                  y={node.y + 12}
                  textAnchor="middle"
                  fill={node.paid ? color : '#6b7280'}
                  fontSize="8"
                >
                  {node.username.length > 8 ? node.username.slice(0, 7) + '…' : node.username}
                </text>

                {/* Level badge */}
                <circle
                  cx={node.x + TREE_NODE_RADIUS - 4}
                  cy={node.y - TREE_NODE_RADIUS + 4}
                  r="10"
                  fill={color}
                />
                <text
                  x={node.x + TREE_NODE_RADIUS - 4}
                  y={node.y - TREE_NODE_RADIUS + 8}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="8"
                  fontWeight="bold"
                >
                  L{node.level + 1}
                </text>

                {/* Deposit status badge */}
                {node.paid && (
                  <g>
                    <circle
                      cx={node.x - TREE_NODE_RADIUS + 4}
                      cy={node.y - TREE_NODE_RADIUS + 4}
                      r="8"
                      fill={TREE_COLORS.emerald}
                    />
                    <text
                      x={node.x - TREE_NODE_RADIUS + 4}
                      y={node.y - TREE_NODE_RADIUS + 7}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="8"
                    >
                      ✓
                    </text>
                  </g>
                )}

                {/* Children count */}
                {node.children.length > 0 && (
                  <text
                    x={node.x}
                    y={node.y + TREE_NODE_RADIUS + 14}
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize="9"
                  >
                    {node.children.length} referral{node.children.length !== 1 ? 's' : ''}
                  </text>
                )}
              </g>
            );
          })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500 justify-center flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-neon-purple/20 border-2 border-neon-purple"></span> L1 (You = P3)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-neon-blue/20 border-2 border-neon-blue"></span> L2 (You = P2)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-neon-pink/20 border-2 border-neon-pink"></span> L3 (You = P1 💰)
        </span>
        <span className="border-l border-white/10 pl-4">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Deposited
          </span>
        </span>
        <span className="border-l border-white/10 pl-4">Drag to pan • Ctrl+Scroll to zoom</span>
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
              selectedNode.paid ? 'bg-neon-purple/20 text-neon-purple' : 'bg-white/10 text-gray-400'
            }`}>
              {selectedNode.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{selectedNode.username}</p>
              <p className="text-gray-500 text-xs">Joined {selectedNode.date} • Level {selectedNode.level + 1}</p>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded text-xs ${
                selectedNode.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {selectedNode.paid ? '✓ Deposited' : 'Pending'}
              </span>
              {selectedNode.children.length > 0 && (
                <p className="text-gray-500 text-xs mt-1">{selectedNode.children.length} direct referral{selectedNode.children.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>

          {/* User Stats */}
          {selectedNode.stats && (
            <div className="grid grid-cols-4 gap-3 pt-3 border-t border-white/10">
              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1.5 rounded-lg bg-blue-500/20">
                  <Eye size={14} className="text-blue-400" />
                </div>
                <p className="text-white font-semibold text-sm">{selectedNode.stats.views.toLocaleString()}</p>
                <p className="text-gray-500 text-xs">Views</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1.5 rounded-lg bg-neon-pink/20">
                  <TrendingUp size={14} className="text-neon-pink" />
                </div>
                <p className="text-white font-semibold text-sm">
                  {selectedNode.stats.views > 0
                    ? ((selectedNode.stats.registrations / selectedNode.stats.views) * 100).toFixed(1)
                    : '0.0'}%
                </p>
                <p className="text-gray-500 text-xs">Conversion</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1.5 rounded-lg bg-neon-purple/20">
                  <UserPlus size={14} className="text-neon-purple" />
                </div>
                <p className="text-white font-semibold text-sm">{selectedNode.stats.registrations.toLocaleString()}</p>
                <p className="text-gray-500 text-xs">Registrations</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1.5 rounded-lg bg-emerald-500/20">
                  <Wallet size={14} className="text-emerald-400" />
                </div>
                <p className="text-white font-semibold text-sm">{selectedNode.stats.deposits.toLocaleString()}</p>
                <p className="text-gray-500 text-xs">Deposits</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SVGReferralTree;
