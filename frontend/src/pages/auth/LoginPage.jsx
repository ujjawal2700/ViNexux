import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Mail, Lock, ShieldCheck, User, MessageSquare, Check } from 'lucide-react';
import SignupWizard from './SignupWizard';
import { cn } from '../../lib/utils';

export const LoginPage = ({ initialTab = 'login' }) => {
  const [searchParams] = useSearchParams();
  const queryMode = searchParams.get('mode') || searchParams.get('tab');
  const roleParam = searchParams.get('role');

  // Mode: 'login' or 'signup'
  const [activeTab, setActiveTab] = useState(
    queryMode === 'signup' || queryMode === 'register' ? 'signup' : initialTab
  );

  // Input States - Sign In
  const [identifier, setIdentifier] = useState('');
  const [otpChannel, setOtpChannel] = useState('sms');
  const [rememberMe, setRememberMe] = useState(false);

  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { sendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (queryMode === 'signup' || queryMode === 'register') {
      setActiveTab('signup');
    } else if (queryMode === 'login') {
      setActiveTab('login');
    }
  }, [queryMode]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError(null);
    setIdentifier('');
  };

  // Handle Sign In submission (OTP flow)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter a valid email address or phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sendOtp(identifier.trim());
      if (response.success) {
        navigate('/verify-otp', { state: { identifier: identifier.trim(), from: location.state?.from?.pathname } });
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
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 sm:p-6 bg-[#f9fafb] text-gray-900">
      {activeTab === 'signup' ? (
        <SignupWizard
          onSwitchToLogin={() => handleTabSwitch('login')}
          initialRole={roleParam || 'customer'}
        />
      ) : (
        <div className="w-full max-w-md bg-white border border-gray-200/90 rounded-xl p-6 sm:p-8 shadow-sm transition-all duration-200">
          {/* Top Segmented Tabs: Login | Register (Mega Jaipur Style with ViNexus Maroon) */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={cn(
                "py-2.5 text-xs sm:text-sm font-bold rounded transition-all duration-200 cursor-pointer text-center",
                activeTab === 'login'
                  ? "bg-[#800020] text-white shadow-xs"
                  : "bg-[#fdf2f4] hover:bg-[#fae1e6] text-[#800020] hover:text-[#590016] font-semibold"
              )}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('signup')}
              className={cn(
                "py-2.5 text-xs sm:text-sm font-bold rounded transition-all duration-200 cursor-pointer text-center",
                activeTab === 'signup'
                  ? "bg-[#800020] text-white shadow-xs"
                  : "bg-[#fdf2f4] hover:bg-[#fae1e6] text-[#800020] hover:text-[#590016] font-semibold"
              )}
            >
              Register
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Identifier Field (Email ID or Mobile Number) */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                EMAIL ID OR MOBILE NUMBER
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email ID Or 9876543210"
                  className="w-full bg-white border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary rounded pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 outline-none transition-all font-medium"
                  disabled={loading}
                />
              </div>
            </div>

            {/* SEND OTP VIA Channel Selector (Only SMS and Email, WhatsApp removed) */}
            <div className="space-y-1.5 text-left pt-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                SEND OTP VIA
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOtpChannel('sms')}
                  className={cn(
                    "flex flex-col items-center justify-center py-2.5 px-2 rounded border transition-all cursor-pointer",
                    otpChannel === 'sms'
                      ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                  )}
                >
                  <MessageSquare className="w-4 h-4 mb-1 text-primary" />
                  <span className="text-[11px]">SMS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOtpChannel('email')}
                  className={cn(
                    "flex flex-col items-center justify-center py-2.5 px-2 rounded border transition-all cursor-pointer",
                    otpChannel === 'email'
                      ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                  )}
                >
                  <Mail className="w-4 h-4 mb-1 text-blue-600" />
                  <span className="text-[11px]">Email</span>
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center text-xs pt-0.5 text-left">
              <label className="flex items-center gap-2.5 text-gray-600 hover:text-gray-900 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs",
                    rememberMe
                      ? "bg-primary border-primary text-white"
                      : "bg-white border-gray-300 hover:border-gray-400"
                  )}
                >
                  {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>Remember me</span>
              </label>
            </div>

            {/* Submit Button (Solid Primary with Lock Icon) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded py-3 text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] disabled:opacity-50 mt-4 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Get OTP & Login'}</span>
            </button>
          </form>

          {/* Bottom Switch Link */}
          <div className="mt-5 pt-4 border-t border-gray-100 text-center text-xs text-gray-500 font-medium">
            <span>
              New here?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('signup')}
                className="font-bold text-primary hover:underline cursor-pointer"
              >
                Create account
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;

