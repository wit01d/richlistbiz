// =============================================================================
// MOCK DATA UTILITIES
// Shared constants and helper functions for generating mock/demo data
// =============================================================================

import type { ReferralTreeNode } from '../types/tree';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * First names used for generating mock users
 * Combined list from both HtmlOverlay and useReferralSimulation
 */
export const FIRST_NAMES = [
  'Anna', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry',
  'Ivy', 'Jack', 'Kate', 'Leo', 'Mia', 'Nick', 'Olivia', 'Pete',
  'Quinn', 'Rose', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xavier',
  'Yuki', 'Zara', 'Adam', 'Bella', 'Chris', 'Diana', 'Eli', 'Fiona',
  'Gus', 'Hana', 'Ivan', 'Jill', 'Kurt', 'Luna', 'Max', 'Nora',
  'Emma', 'Liam', 'Sophia', 'Noah', 'Ava', 'Ethan', 'Isabella', 'Mason',
  'Camila', 'Daniel', 'Gianna', 'Matthew', 'Penelope', 'Sebastian', 'Aria',
  'David', 'Riley', 'Joseph', 'Zoey', 'Carter'
] as const;

/**
 * System account ID used for empty positions
 */
export const SYSTEM_ID = 'system';

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generates a random alphanumeric ID
 */
export const generateId = (): string =>
  Math.random().toString(36).substring(2, 11);

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Generates a formatted date string for a given number of days ago
 */
export const generateDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Generates a short date string (e.g., "Dec 30")
 */
export const generateShortDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// =============================================================================
// RANDOM DATA GENERATION
// =============================================================================

/**
 * Gets a random name from the FIRST_NAMES array
 */
export const getRandomName = (): string =>
  FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];

/**
 * Gets a unique random name not in the provided set
 */
export const getUniqueName = (usedNames: Set<string>): string => {
  if (usedNames.size >= FIRST_NAMES.length) {
    // If all names used, generate a numbered variant
    const baseName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    return `${baseName}${Math.floor(Math.random() * 100)}`;
  }

  let name: string;
  do {
    name = getRandomName();
  } while (usedNames.has(name));

  return name;
};

/**
 * Generates random node statistics for tree visualization
 */
export const generateNodeStats = () => {
  const views = Math.floor(Math.random() * 500) + 50;
  const clicks = Math.floor(views * (Math.random() * 0.3 + 0.1)); // 10-40% CTR
  const registrations = Math.floor(clicks * (Math.random() * 0.4 + 0.1)); // 10-50% conversion
  const deposits = Math.floor(registrations * (Math.random() * 0.6 + 0.3)); // 30-90% deposit rate
  return { views, clicks, registrations, deposits };
};

// =============================================================================
// TREE GENERATION
// =============================================================================

/**
 * Generates a mock referral tree with random data
 */
export const generateMockReferralTree = (
  depth: number,
  maxChildren: number,
  level: number = 0,
  usedNames: Set<string> = new Set()
): ReferralTreeNode[] => {
  if (level >= depth) return [];

  const numChildren = level === 0
    ? Math.floor(Math.random() * 4) + 3 // 3-6 direct referrals
    : Math.floor(Math.random() * (maxChildren + 1)); // 0-maxChildren for deeper levels

  const nodes: ReferralTreeNode[] = [];

  for (let i = 0; i < numChildren; i++) {
    const name = getUniqueName(usedNames);
    usedNames.add(name);

    const daysAgo = Math.floor(Math.random() * 60) + level * 5;
    const paid = Math.random() > 0.25; // 75% have deposited

    nodes.push({
      id: generateId(),
      username: name,
      date: generateDate(daysAgo),
      paid,
      level,
      children: generateMockReferralTree(depth, Math.max(1, maxChildren - 1), level + 1, usedNames),
      stats: generateNodeStats(),
    });
  }

  return nodes;
};

// =============================================================================
// TREE UTILITIES
// =============================================================================

/**
 * Counts total nodes in a tree
 */
export const countTreeNodes = (nodes: ReferralTreeNode[]): number => {
  return nodes.reduce((sum, node) => sum + 1 + countTreeNodes(node.children), 0);
};

/**
 * Counts deposited (paid) nodes in a tree
 */
export const countDepositedInTree = (nodes: ReferralTreeNode[]): number => {
  return nodes.reduce((sum, node) => {
    const childCount = countDepositedInTree(node.children);
    return sum + (node.paid ? 1 : 0) + childCount;
  }, 0);
};

/**
 * Finds a node by ID in the tree
 */
export const findNodeInTree = (nodes: ReferralTreeNode[], id: string): ReferralTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeInTree(node.children, id);
    if (found) return found;
  }
  return null;
};

/**
 * Gets all used names in a tree
 */
export const getUsedNamesInTree = (nodes: ReferralTreeNode[], names: Set<string> = new Set()): Set<string> => {
  for (const node of nodes) {
    names.add(node.username);
    getUsedNamesInTree(node.children, names);
  }
  return names;
};
