import { useState, useEffect, useCallback } from 'react';
import { initKeycloak, register, login, logout, isLoggedIn, getToken } from '../../services/Keycloak';

export type AuthView = 'dashboard' | 'simulation-dashboard' | 'admin' | 'referral-verification' | 'membership-payment';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string;
  currentView: AuthView;
  hasReferralCode: boolean;
  hasPaid: boolean;
}

interface UseAuthFlowOptions {
  onAuthChange?: (isAuthenticated: boolean) => void;
}

interface UseAuthFlowReturn extends AuthState {
  // Actions
  handleLogin: () => void;
  handleRegister: () => void;
  handleLogout: () => void;
  setCurrentView: (view: AuthView) => void;
  handleReferralVerified: (code: string) => void;
  handlePaymentComplete: () => void;
}

export function useAuthFlow(options: UseAuthFlowOptions = {}): UseAuthFlowReturn {
  const { onAuthChange } = options;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string>('User');
  const [currentView, setCurrentView] = useState<AuthView>('dashboard');
  const [hasReferralCode, setHasReferralCode] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);

  // Initialize Keycloak and determine initial view
  useEffect(() => {
    setIsLoading(true);

    initKeycloak()
      .then((kc) => {
        if (kc?.authenticated) {
          setIsAuthenticated(true);
          onAuthChange?.(true);

          // Get username from token
          const name = kc.tokenParsed?.preferred_username || kc.tokenParsed?.name || 'Member';
          setUsername(name);

          // Check onboarding flow: referral code -> payment -> dashboard
          const tokenReferralCode = kc.tokenParsed?.referral_code as string | undefined;
          const storedReferralCode = localStorage.getItem('verified_referral_code');
          const storedHasPaid = localStorage.getItem('membership_paid');

          const hasCode = Boolean(tokenReferralCode || storedReferralCode);
          const paid = Boolean(storedHasPaid);

          setHasReferralCode(hasCode);
          setHasPaid(paid);

          // Determine initial view based on onboarding state
          if (!hasCode) {
            setCurrentView('referral-verification');
          } else if (!paid) {
            setCurrentView('membership-payment');
          } else {
            setCurrentView('dashboard');
          }
        } else {
          setIsAuthenticated(false);
          onAuthChange?.(false);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [onAuthChange]);

  // Handle referral code verification
  const handleReferralVerified = useCallback((code: string) => {
    localStorage.setItem('verified_referral_code', code);
    setHasReferralCode(true);

    // After verification, check if payment is needed
    const storedHasPaid = localStorage.getItem('membership_paid');
    if (!storedHasPaid) {
      setCurrentView('membership-payment');
    } else {
      setHasPaid(true);
      setCurrentView('dashboard');
    }
  }, []);

  // Handle payment completion
  const handlePaymentComplete = useCallback(() => {
    localStorage.setItem('membership_paid', 'true');
    setHasPaid(true);
    setCurrentView('dashboard');
  }, []);

  // Auth actions
  const handleLogin = useCallback(() => {
    login();
  }, []);

  const handleRegister = useCallback(() => {
    register();
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setIsAuthenticated(false);
    setUsername('User');
    onAuthChange?.(false);
  }, [onAuthChange]);

  return {
    // State
    isAuthenticated,
    isLoading,
    username,
    currentView,
    hasReferralCode,
    hasPaid,

    // Actions
    handleLogin,
    handleRegister,
    handleLogout,
    setCurrentView,
    handleReferralVerified,
    handlePaymentComplete,
  };
}

export default useAuthFlow;
