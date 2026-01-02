// =============================================================================
// TREE UTILITIES
// Shared functions for traversing and manipulating referral trees
// =============================================================================

import type { ReferralTreeNode } from '../types/tree';

/**
 * Filters a tree to only include nodes where paid=true
 * Recursively filters children as well
 */
export const filterPaidNodes = (nodes: ReferralTreeNode[]): ReferralTreeNode[] => {
  return nodes
    .filter(node => node.paid)
    .map(node => ({ ...node, children: filterPaidNodes(node.children) }));
};

/**
 * Find a random eligible node in the tree (paid nodes under maxLevel)
 * Used for simulation to add new referrals
 */
export const findRandomNodeInTree = (nodes: ReferralTreeNode[], maxLevel: number = 2): ReferralTreeNode | null => {
  const eligibleNodes: ReferralTreeNode[] = [];

  const collectEligible = (nodeList: ReferralTreeNode[], level: number) => {
    for (const node of nodeList) {
      if (node.paid && level < maxLevel) {
        eligibleNodes.push(node);
      }
      if (level < maxLevel) {
        collectEligible(node.children, level + 1);
      }
    }
  };

  collectEligible(nodes, 0);

  if (eligibleNodes.length === 0) return null;
  return eligibleNodes[Math.floor(Math.random() * eligibleNodes.length)];
};

/**
 * Find all unpaid nodes that can potentially deposit
 */
export const findUnpaidNodes = (nodes: ReferralTreeNode[]): ReferralTreeNode[] => {
  const unpaid: ReferralTreeNode[] = [];

  const collect = (nodeList: ReferralTreeNode[]) => {
    for (const node of nodeList) {
      if (!node.paid) {
        unpaid.push(node);
      }
      collect(node.children);
    }
  };

  collect(nodes);
  return unpaid;
};

/**
 * Count direct children that have deposited (paid=true)
 */
export const countDepositingChildren = (node: ReferralTreeNode): number => {
  return node.children.filter(c => c.paid).length;
};

/**
 * Find the parent node of a given node by ID
 */
export const findParentOfNode = (nodes: ReferralTreeNode[], targetId: string): ReferralTreeNode | null => {
  for (const node of nodes) {
    if (node.children.some(c => c.id === targetId)) {
      return node;
    }
    const found = findParentOfNode(node.children, targetId);
    if (found) return found;
  }
  return null;
};

/**
 * Get all used usernames in a tree
 */
export const getUsedNames = (nodes: ReferralTreeNode[]): Set<string> => {
  const names = new Set<string>();
  const collect = (nodeList: ReferralTreeNode[]) => {
    for (const node of nodeList) {
      names.add(node.username);
      collect(node.children);
    }
  };
  collect(nodes);
  return names;
};

/**
 * Collect all nodes in a flat array
 */
export const collectAllNodes = (nodes: ReferralTreeNode[]): ReferralTreeNode[] => {
  const result: ReferralTreeNode[] = [];
  const collect = (nodeList: ReferralTreeNode[]) => {
    for (const node of nodeList) {
      result.push(node);
      collect(node.children);
    }
  };
  collect(nodes);
  return result;
};
