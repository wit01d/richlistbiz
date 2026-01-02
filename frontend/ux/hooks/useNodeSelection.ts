import { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================
export interface NodeSelectionOptions<T> {
  /** Called when a node is selected */
  onSelect?: (node: T | null) => void;
  /** Called when focusing on a node */
  onFocus?: (nodeId: string) => void;
  /** Duration in ms to keep focus highlight (0 = permanent) */
  focusDuration?: number;
}

export interface UseNodeSelectionResult<T> {
  /** Currently selected node */
  selectedNode: T | null;
  /** ID of the node being focused (highlighted temporarily) */
  focusedNodeId: string | null;
  /** Select a node (or null to deselect) */
  selectNode: (node: T | null) => void;
  /** Toggle selection - select if not selected, deselect if already selected */
  toggleNode: (node: T) => void;
  /** Focus on a specific node by ID */
  focusOnNode: (nodeId: string) => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Clear focus highlight */
  clearFocus: () => void;
  /** Check if a node is selected */
  isSelected: (nodeId: string) => boolean;
  /** Check if a node is focused */
  isFocused: (nodeId: string) => boolean;
}

// ============================================================================
// DEFAULTS
// ============================================================================
const DEFAULT_OPTIONS = {
  focusDuration: 3000,
};

// ============================================================================
// HOOK
// ============================================================================
export function useNodeSelection<T extends { id: string }>(
  options: NodeSelectionOptions<T> = {}
): UseNodeSelectionResult<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { onSelect, onFocus, focusDuration } = opts;

  // State
  const [selectedNode, setSelectedNode] = useState<T | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Select a node
  const selectNode = useCallback((node: T | null) => {
    setSelectedNode(node);
    onSelect?.(node);
  }, [onSelect]);

  // Toggle selection
  const toggleNode = useCallback((node: T) => {
    setSelectedNode(prev => {
      const newNode = prev?.id === node.id ? null : node;
      onSelect?.(newNode);
      return newNode;
    });
  }, [onSelect]);

  // Focus on a node (temporary highlight)
  const focusOnNode = useCallback((nodeId: string) => {
    setFocusedNodeId(nodeId);
    onFocus?.(nodeId);

    if (focusDuration > 0) {
      setTimeout(() => setFocusedNodeId(null), focusDuration);
    }
  }, [onFocus, focusDuration]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    onSelect?.(null);
  }, [onSelect]);

  // Clear focus
  const clearFocus = useCallback(() => {
    setFocusedNodeId(null);
  }, []);

  // Check if a node is selected
  const isSelected = useCallback((nodeId: string) => {
    return selectedNode?.id === nodeId;
  }, [selectedNode]);

  // Check if a node is focused
  const isFocused = useCallback((nodeId: string) => {
    return focusedNodeId === nodeId;
  }, [focusedNodeId]);

  return {
    selectedNode,
    focusedNodeId,
    selectNode,
    toggleNode,
    focusOnNode,
    clearSelection,
    clearFocus,
    isSelected,
    isFocused,
  };
}
