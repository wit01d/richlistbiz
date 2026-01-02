import React, { useState, useCallback } from 'react';
import { Link, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import type { ReferralCodeVerificationProps } from '../types/dashboard';

type ValidationState = 'empty' | 'too_short' | 'invalid_chars' | 'valid';

const getValidationState = (code: string): ValidationState => {
  if (!code.trim()) return 'empty';
  if (!/^[A-Za-z0-9]+$/.test(code)) return 'invalid_chars';
  if (code.length < 6) return 'too_short';
  if (code.length > 10) return 'invalid_chars';
  return 'valid';
};

const getValidationMessage = (state: ValidationState): string => {
  switch (state) {
    case 'empty':
      return 'Enter the referral code you received';
    case 'too_short':
      return 'Code must be at least 6 characters';
    case 'invalid_chars':
      return 'Only letters and numbers allowed (6-10 characters)';
    case 'valid':
      return 'Valid format';
  }
};

export const ReferralCodeVerification: React.FC<ReferralCodeVerificationProps> = ({ onVerified }) => {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationState = getValidationState(code);
  const isValid = validationState === 'valid';

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    // Convert to uppercase and call onVerified
    const normalizedCode = code.trim().toUpperCase();

    // Simulate brief delay for UX
    setTimeout(() => {
      onVerified(normalizedCode);
    }, 300);
  }, [code, isValid, onVerified]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only alphanumeric and convert to uppercase as user types
    const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (value.length <= 10) {
      setCode(value);
    }
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-xl border border-neon-purple/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 flex items-center justify-center border border-neon-purple/30">
              <Link className="text-neon-purple" size={28} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-display font-bold text-white text-center mb-2">
            Enter Your Referral Code
          </h1>
          <p className="text-gray-400 text-center text-sm mb-8">
            You need a referral code to join RichList.biz
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Input */}
            <div className="mb-4">
              <input
                type="text"
                value={code}
                onChange={handleInputChange}
                placeholder="e.g. ABC123XY"
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-xl bg-black/50 border text-white text-center text-lg font-mono tracking-widest placeholder-gray-500 focus:outline-none transition-all ${
                  validationState === 'valid'
                    ? 'border-emerald-500/50 focus:border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : validationState === 'empty'
                    ? 'border-white/10 focus:border-neon-purple/50'
                    : 'border-red-500/50 focus:border-red-500'
                }`}
                autoFocus
              />
            </div>

            {/* Validation Message */}
            <div className={`flex items-center justify-center gap-2 text-sm mb-6 ${
              validationState === 'valid'
                ? 'text-emerald-400'
                : validationState === 'empty'
                ? 'text-gray-500'
                : 'text-red-400'
            }`}>
              {validationState === 'valid' ? (
                <CheckCircle size={16} />
              ) : validationState !== 'empty' ? (
                <AlertCircle size={16} />
              ) : null}
              <span>{getValidationMessage(validationState)}</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all ${
                isValid && !isSubmitting
                  ? 'bg-gradient-to-r from-neon-purple to-neon-pink hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] cursor-pointer'
                  : 'bg-gray-700 cursor-not-allowed opacity-50'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Helper Text */}
          <p className="text-gray-500 text-center text-xs mt-6">
            Don't have a code? Ask an existing member to share their referral link with you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferralCodeVerification;
