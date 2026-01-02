import { AlertTriangle, ChevronRight, Crown, Loader2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from '../../ui/primitives';
import type { PendingSuccessorNomination } from '../../types';

export interface SuccessorConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomination: PendingSuccessorNomination;
  onConfirm: () => Promise<void>;
  onDecline?: () => Promise<void>;
  isConfirming: boolean;
  isDeclining: boolean;
  error: string | null;
  successorsUsedThisYear: number;
}

export const SuccessorConfirmationModal: React.FC<SuccessorConfirmationModalProps> = ({
  isOpen,
  onClose,
  nomination,
  onConfirm,
  onDecline,
  isConfirming,
  isDeclining,
  error,
  successorsUsedThisYear,
}) => {
  const { t } = useTranslation();
  const isLoading = isConfirming || isDeclining;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isLoading}
      colorTheme="emerald"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-500/20 rounded-xl">
          <Crown className="text-emerald-400" size={24} />
        </div>
        <div>
          <h3 className="text-white font-display text-xl">{t('successorModal.title')}</h3>
          <p className="text-gray-400 text-sm">{t('successorModal.subtitle')}</p>
        </div>
      </div>

      {/* Nominee Card */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-lg">
            {nomination.nomineeName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-white font-medium text-lg">{nomination.nomineeName}</p>
            <p className="text-gray-500 text-sm">{t('successorModal.joined', { date: nomination.nomineeDate })}</p>
            <p className="text-emerald-400 text-xs mt-1">{t('successorModal.autoSelectedAt', { date: nomination.autoSelectedAt })}</p>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="space-y-3 mb-6">
        <p className="text-gray-300 text-sm font-medium">{t('successorModal.explanation')}</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2 text-gray-400">
            <ChevronRight className="text-emerald-400 mt-0.5 flex-shrink-0" size={16} />
            <span><span className="text-white">{nomination.nomineeName}</span> {t('successorModal.willMove', { name: '', position1: nomination.position1Name }).replace(nomination.nomineeName, '').trim()}</span>
          </li>
          <li className="flex items-start gap-2 text-gray-400">
            <ChevronRight className="text-emerald-400 mt-0.5 flex-shrink-0" size={16} />
            <span>{t('successorModal.noLongerDownline')}</span>
          </li>
          <li className="flex items-start gap-2 text-amber-400">
            <AlertTriangle className="mt-0.5 flex-shrink-0" size={16} />
            <span>{t('successorModal.cannotUndo')}</span>
          </li>
        </ul>
      </div>

      {/* Progress indicator */}
      <div className="bg-white/5 rounded-lg p-3 mb-6 flex items-center justify-between">
        <span className="text-gray-400 text-sm">{t('successorModal.usedThisYear')}</span>
        <span className="text-white font-mono">{successorsUsedThisYear}/3</span>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        {onDecline && (
          <button
            onClick={onDecline}
            disabled={isLoading}
            className="px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeclining ? <Loader2 className="animate-spin" size={16} /> : null}
            {t('common.decline')}
          </button>
        )}
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isConfirming ? <Loader2 className="animate-spin" size={16} /> : null}
          {isConfirming ? t('successorModal.confirming') : t('common.confirm')}
        </button>
      </div>
    </BaseModal>
  );
};
