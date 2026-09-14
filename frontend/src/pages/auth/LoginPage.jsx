import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import Logo from '../../components/ui/Logo';
import SignupWizard from './SignupWizard';

export const LoginPage = ({ initialTab = 'login' }) => {
  const [searchParams] = useSearchParams();
  const queryMode = searchParams.get('mode') || searchParams.get('tab');

  // Mode: 'login' or 'signup'
  const [activeTab, setActiveTab] = useState(queryMode === 'signup' ? 'signup' : initialTab);

  // Input States - Sign In
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { sendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (queryMode === 'signup') {
      setActiveTab('signup');
    } else if (queryMode === 'login') {
      setActiveTab('login');
    }
  }, [queryMode]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError(null);
    setIdentifier('');
    setLoginPassword('');
  };

  // Handle Sign In submission (OTP / Auth flow)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter a valid email address or phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sendOtp(identifier);
      if (response.success) {
        navigate('/verify-otp', { state: { identifier, from: location.state?.from?.pathname } });
      } else {
        setError(response.message || 'Failed to send verification code.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 sm:p-6 bg-background text-foreground relative overflow-hidden">
      {/* Ambient background glow matching Vinexus brand theme */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {activeTab === 'signup' ? (
        <SignupWizard onSwitchToLogin={() => handleTabSwitch('login')} />
      ) : (
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 transition-all duration-300">
          {/* Brand Logo Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <Logo className="h-10 sm:h-12 w-auto object-contain mb-3 drop-shadow-sm" />
            <p className="text-xs text-muted-foreground font-medium">Sign in to continue to Vinexus</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Identifier Field (Email / Phone) */}
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email address or phone"
                className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-11 py-3.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-1 pb-1">
              <label className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-md border-border bg-muted text-primary focus:ring-primary/20 w-3.5 h-3.5"
                />
                <span>Remember me</span>
              </label>

              <a href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-primary transition-colors font-medium">
                Forgot password?
              </a>
            </div>

            {/* Submit Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-full py-3.5 text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Bottom Switch Link */}
          <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted-foreground font-medium">
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('signup')}
                className="font-bold text-primary hover:underline transition-colors"
              >
                Sign up
              </button>
            </span>
          </div>

          <div className="mt-4 text-center">
            <Link to="/admin/login" className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors">
              Administrator? Sign in here &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
