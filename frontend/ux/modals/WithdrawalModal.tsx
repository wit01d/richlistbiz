import { ArrowUpRight, Banknote, Check, Clock, Loader2, Shield, Wallet, X } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from '../../ui/primitives';
import { MIN_WITHDRAWAL_AMOUNT, CURRENCY_SYMBOL } from '../../constants/business';

export interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onWithdraw: (amount: number) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
}

interface WithdrawalRequirement {
  label: string;
  met: boolean;
  icon: React.ElementType;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  balance,
  onWithdraw,
  isProcessing,
  error,
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>('');

  const numericAmount = parseFloat(amount) || 0;
  const canWithdraw = numericAmount >= MIN_WITHDRAWAL_AMOUNT && numericAmount <= balance;

  const requirements: WithdrawalRequirement[] = [
    { label: t('withdrawal.minBalance', { amount: `${CURRENCY_SYMBOL}${MIN_WITHDRAWAL_AMOUNT}` }), met: balance >= MIN_WITHDRAWAL_AMOUNT, icon: Wallet },
    { label: t('withdrawal.kycCompleted'), met: true, icon: Shield },
    { label: t('withdrawal.accountAge'), met: true, icon: Clock },
    { label: t('withdrawal.recentActivity'), met: true, icon: Check },
  ];

  const allRequirementsMet = requirements.every(r => r.met);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(value);
  };

  const handleMaxClick = () => {
    setAmount(balance.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWithdraw || isProcessing) return;
    await onWithdraw(numericAmount);
    setAmount('');
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isProcessing}
      colorTheme="pink"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-neon-pink/20 rounded-xl">
          <Banknote className="text-neon-pink" size={24} />
        </div>
        <div>
          <h3 className="text-white font-display text-xl">{t('withdrawal.title')}</h3>
          <p className="text-gray-400 text-sm">{t('withdrawal.subtitle')}</p>
        </div>
      </div>

      {/* Current Balance */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">{t('withdrawal.availableBalance')}</span>
          <span className="text-2xl font-display font-bold text-white">
            {CURRENCY_SYMBOL}{balance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-2 mb-6">
        <p className="text-gray-400 text-sm font-medium mb-3">{t('withdrawal.requirements')}</p>
        {requirements.map((req, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              req.met ? 'bg-emerald-500/20' : 'bg-red-500/20'
            }`}>
              {req.met ? (
                <Check className="text-emerald-400" size={14} />
              ) : (
                <X className="text-red-400" size={14} />
              )}
            </div>
            <span className={`text-sm ${req.met ? 'text-gray-300' : 'text-red-400'}`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>

      {/* Withdrawal Form */}
      {allRequirementsMet && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">{t('withdrawal.amount')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                {CURRENCY_SYMBOL}
              </span>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                disabled={isProcessing}
                className="w-full pl-8 pr-20 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-lg font-mono placeholder-gray-600 focus:outline-none focus:border-neon-pink/50 transition-colors"
              />
              <button
                type="button"
                onClick={handleMaxClick}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-neon-pink bg-neon-pink/10 rounded-lg hover:bg-neon-pink/20 transition-colors"
              >
                MAX
              </button>
            </div>
            {numericAmount > 0 && numericAmount < MIN_WITHDRAWAL_AMOUNT && (
              <p className="text-red-400 text-xs mt-2">
                {t('withdrawal.minAmountError', { amount: `${CURRENCY_SYMBOL}${MIN_WITHDRAWAL_AMOUNT}` })}
              </p>
            )}
            {numericAmount > balance && (
              <p className="text-red-400 text-xs mt-2">{t('withdrawal.insufficientBalance')}</p>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Cooling Period Notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Clock className="text-amber-400 mt-0.5 flex-shrink-0" size={16} />
              <p className="text-amber-400 text-xs">{t('withdrawal.coolingPeriod')}</p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canWithdraw || isProcessing}
            className={`w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all ${
              canWithdraw && !isProcessing
                ? 'bg-gradient-to-r from-neon-pink to-neon-purple hover:shadow-[0_0_30px_rgba(255,45,117,0.4)] cursor-pointer'
                : 'bg-gray-700 cursor-not-allowed opacity-50'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {t('withdrawal.processing')}
              </>
            ) : (
              <>
                <ArrowUpRight size={18} />
                {t('withdrawal.withdrawButton', { amount: numericAmount > 0 ? `${CURRENCY_SYMBOL}${numericAmount.toFixed(2)}` : '' })}
              </>
            )}
          </button>
        </form>
      )}

      {/* Not eligible message */}
      {!allRequirementsMet && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
          <p className="text-red-400 text-sm">{t('withdrawal.notEligible')}</p>
        </div>
      )}
    </BaseModal>
  );
};
