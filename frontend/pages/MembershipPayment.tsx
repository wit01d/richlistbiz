import React, { useState, useCallback } from 'react';
import { CreditCard, Check, Shield, Users, TrendingUp, Zap } from 'lucide-react';
import { DEPOSIT_AMOUNT, CURRENCY_SYMBOL } from '../constants/business';
import type { MembershipPaymentProps } from '../types/dashboard';

const benefits = [
  { icon: Users, text: 'Access to your referral network' },
  { icon: TrendingUp, text: 'Earn from Position 1 payments' },
  { icon: Zap, text: 'Automatic successor nominations' },
  { icon: Shield, text: 'Secure payment processing' },
];

export const MembershipPayment: React.FC<MembershipPaymentProps> = ({ onPaymentComplete, referrerName }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const handlePayment = useCallback(async () => {
    setIsProcessing(true);
    setPaymentStatus('processing');

    // Simulate payment processing (will be replaced with Stripe integration)
    await new Promise(resolve => setTimeout(resolve, 2000));

    setPaymentStatus('success');

    // Brief delay to show success state
    await new Promise(resolve => setTimeout(resolve, 1000));

    onPaymentComplete();
  }, [onPaymentComplete]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-xl border border-neon-pink/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(255,45,117,0.15)]">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 flex items-center justify-center border border-neon-pink/30">
              {paymentStatus === 'success' ? (
                <Check className="text-emerald-400" size={32} />
              ) : (
                <CreditCard className="text-neon-pink" size={28} />
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-display font-bold text-white text-center mb-2">
            {paymentStatus === 'success' ? 'Payment Successful!' : 'Membership Payment'}
          </h1>
          <p className="text-gray-400 text-center text-sm mb-6">
            {paymentStatus === 'success'
              ? 'Welcome to RichList.biz! Redirecting to your dashboard...'
              : 'Complete your membership to access the platform'
            }
          </p>

          {/* Referrer Info */}
          {referrerName && paymentStatus !== 'success' && (
            <div className="bg-neon-purple/10 border border-neon-purple/30 rounded-xl p-3 mb-6">
              <p className="text-center text-sm">
                <span className="text-gray-400">Referred by </span>
                <span className="text-neon-purple font-medium">{referrerName}</span>
              </p>
            </div>
          )}

          {/* Price Display */}
          {paymentStatus !== 'success' && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
              <div className="text-center">
                <div className="text-gray-400 text-sm mb-1">Monthly Membership Fee</div>
                <div className="text-5xl font-display font-bold text-white mb-2">
                  {CURRENCY_SYMBOL}{DEPOSIT_AMOUNT}
                </div>
                <div className="text-gray-500 text-xs">One-time payment to activate your account</div>
              </div>
            </div>
          )}

          {/* Benefits */}
          {paymentStatus !== 'success' && (
            <div className="space-y-3 mb-6">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <benefit.icon className="text-neon-pink" size={16} />
                  </div>
                  <span className="text-gray-300">{benefit.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Payment Button */}
          {paymentStatus !== 'success' && (
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className={`w-full py-4 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all ${
                isProcessing
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-neon-pink to-neon-purple hover:shadow-[0_0_30px_rgba(255,45,117,0.4)] cursor-pointer'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  Pay {CURRENCY_SYMBOL}{DEPOSIT_AMOUNT} Now
                </>
              )}
            </button>
          )}

          {/* Success Animation */}
          {paymentStatus === 'success' && (
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                <Check className="text-emerald-400" size={32} />
              </div>
            </div>
          )}

          {/* Security Note */}
          {paymentStatus !== 'success' && (
            <div className="flex items-center justify-center gap-2 mt-6 text-gray-500 text-xs">
              <Shield size={14} />
              <span>Secure payment powered by Stripe</span>
            </div>
          )}

          {/* Terms */}
          {paymentStatus !== 'success' && (
            <p className="text-gray-600 text-center text-xs mt-4">
              By proceeding, you agree to our Terms of Service and Privacy Policy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembershipPayment;
