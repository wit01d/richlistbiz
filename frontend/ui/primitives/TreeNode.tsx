// =============================================================================
// TREE NODE COMPONENT
// Renders an expandable tree node for the referral network visualization
// =============================================================================

import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { ReferralTreeNode, TreeNodeProps } from '../../types/tree';
import { LEVEL_COLORS } from '../../constants/business';

/**
 * Recursively counts all nodes in a subtree
 */
const countAllInNetwork = (node: ReferralTreeNode): number =>
  1 + node.children.reduce((sum, child) => sum + countAllInNetwork(child), 0);

/**
 * TreeNode component renders a single node in the referral tree
 * with expand/collapse functionality and child rendering
 */
export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  expandedNodes,
  toggleNode,
  level,
}) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const colors = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)];

  // Calculate total network size for this node
  const networkSize = hasChildren
    ? node.children.reduce((acc, child) => acc + countAllInNetwork(child), node.children.length)
    : 0;

  return (
    <div className="relative">
      {/* Connection line */}
      {level > 0 && (
        <div
          className="absolute left-0 top-0 w-4 h-6 border-l-2 border-b-2 border-gray-700 rounded-bl-lg"
          style={{ marginLeft: `${(level - 1) * 24 + 12}px` }}
        />
      )}

      <div
        className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-white/5 ${colors.bg} ${colors.border}/30`}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={() => toggleNode(node.id)}
            className={`p-1 rounded hover:bg-white/10 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
          >
            <ChevronDown size={16} className="text-gray-400" />
          </button>
        ) : (
          <div className="w-6 flex justify-center">
            <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
          </div>
        )}

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${colors.text}`}>{node.username}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
              L{level + 1}
            </span>
            {node.paid ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                Deposited
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                Pending
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>Joined {node.date}</span>
            {hasChildren && (
              <span className="text-gray-600">
                • {node.children.length} referral{node.children.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Network stats */}
        {hasChildren && (
          <div className="text-right">
            <div className={`text-sm font-medium ${colors.text}`}>{networkSize}</div>
            <div className="text-xs text-gray-500">in network</div>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
