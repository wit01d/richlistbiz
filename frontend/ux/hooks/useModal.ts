// =============================================================================
// USE MODAL HOOK
// Shared hook for managing modal state across components
// =============================================================================

import { useState, useCallback } from 'react';

export interface UseModalReturn<T = undefined> {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Data passed to the modal when opened */
  data: T | undefined;
  /** Opens the modal, optionally with data */
  open: (data?: T) => void;
  /** Closes the modal and clears data */
  close: () => void;
  /** Toggles the modal state */
  toggle: () => void;
}

/**
 * Hook for managing modal open/close state with optional data
 *
 * @example
 * // Simple usage
 * const modal = useModal();
 * <button onClick={() => modal.open()}>Open</button>
 * {modal.isOpen && <Modal onClose={modal.close} />}
 *
 * @example
 * // With data
 * const userModal = useModal<User>();
 * <button onClick={() => userModal.open(user)}>View User</button>
 * {userModal.isOpen && <UserModal user={userModal.data} onClose={userModal.close} />}
 */
export function useModal<T = undefined>(initialOpen = false): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [data, setData] = useState<T | undefined>(undefined);

  const open = useCallback((newData?: T) => {
    setData(newData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Clear data after a short delay to allow exit animations
    setTimeout(() => setData(undefined), 300);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return { isOpen, data, open, close, toggle };
}

export default useModal;
