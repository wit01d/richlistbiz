// =============================================================================
// TREE TYPES
// Centralized type definitions for referral tree structures
// =============================================================================

/**
 * Represents a node in the referral tree
 */
export interface ReferralTreeNode {
  id: string;
  username: string;
  date: string;
  paid: boolean;
  level: number;
  children: ReferralTreeNode[];
  stats?: {
    views: number;
    clicks: number;
    registrations: number;
    deposits: number;
  };
}

/**
 * Extended tree node with position coordinates for visualization
 */
export interface TreeNodePosition extends ReferralTreeNode {
  x: number;
  y: number;
}

/**
 * Represents an edge between two nodes in the tree visualization
 */
export interface TreeEdge {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/**
 * Props for tree node component rendering
 */
export interface TreeNodeProps {
  node: ReferralTreeNode;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  level: number;
}
