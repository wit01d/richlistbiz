// =============================================================================
// BASE MODAL COMPONENT
// Reusable modal wrapper with portal, overlay, and close button
// =============================================================================

import { X } from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Disable close on overlay click and close button */
  isLoading?: boolean;
  /** Border/shadow color theme */
  colorTheme?: 'pink' | 'emerald' | 'purple' | 'blue';
  /** Max width class (default: 'max-w-md') */
  maxWidth?: string;
}

const colorThemes = {
  pink: {
    border: 'border-neon-pink/30',
    shadow: 'shadow-[0_0_40px_rgba(255,45,117,0.2)]',
  },
  emerald: {
    border: 'border-emerald-500/30',
    shadow: 'shadow-[0_0_40px_rgba(16,185,129,0.2)]',
  },
  purple: {
    border: 'border-neon-purple/30',
    shadow: 'shadow-[0_0_40px_rgba(168,85,247,0.2)]',
  },
  blue: {
    border: 'border-neon-blue/30',
    shadow: 'shadow-[0_0_40px_rgba(59,130,246,0.2)]',
  },
};

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  children,
  isLoading = false,
  colorTheme = 'pink',
  maxWidth = 'max-w-md',
}) => {
  if (!isOpen) return null;

  const theme = colorThemes[colorTheme];

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={isLoading ? undefined : onClose}
    >
      <div
        className={`relative w-full ${maxWidth} bg-slate-900 ${theme.border} rounded-2xl p-6 ${theme.shadow}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>

        {children}
      </div>
    </div>,
    document.body
  );
};
