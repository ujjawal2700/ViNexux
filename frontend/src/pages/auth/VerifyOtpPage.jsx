import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Zap, ArrowRight, ShieldAlert } from 'lucide-react';
import { OTPInput } from '../../components/ui/OTPInput';
import useToast from '../../hooks/useToast';

const VerifyOtpPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const identifier = location.state?.identifier || '';
  const portal = location.state?.portal;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState(null);

  const { verifyOtp, sendOtp, forceLogin, sessionConflict, conflictTicket } = useAuth();

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.length < 6) {
      setError('Please enter complete 6-digit verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyOtp(identifier, otp, portal);
      if (res.sessionConflict) {
        return;
      }
      if (res.success) {
        toast.success('Verification successful!');
        navigate(portal === 'admin' ? '/admin/dashboard' : '/');
      } else {
        setError(res.message || 'OTP verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!identifier) {
      setError('Identifier missing. Please start login process again.');
      return;
    }
    setResendLoading(true);
    setError(null);
    try {
      const res = await sendOtp(identifier, portal);
      if (res.success) {
        toast.success('A new verification code has been sent!');
      } else {
        setError(res.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error requesting new verification code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleForceLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await forceLogin(conflictTicket);
      if (res.success) {
        navigate(portal === 'admin' ? '/admin/dashboard' : '/');
      } else {
        setError(res.message || 'Force login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to invalidate existing active session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-slate-50 dark:bg-[#0A060A] min-h-[85vh] transition-colors duration-300">
      {/* Background ambient lighting in Vinexus deep wine theme */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/10 dark:bg-rose-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main 21st.dev Style Card with Dual Light & Dark Theme Support */}
      <div className="w-full max-w-md bg-gradient-to-b from-rose-50/90 via-white to-white dark:from-[#6B0E23] dark:via-[#3A0713] dark:to-[#120307] p-8 sm:p-10 rounded-[32px] border border-rose-100/80 dark:border-white/10 shadow-[0_20px_50px_rgba(128,0,32,0.08)] dark:shadow-[0_0_50px_rgba(139,21,50,0.35)] relative overflow-hidden z-10 flex flex-col items-center text-center transition-all duration-300">
        {/* Background Concentric Circular Ripples */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-20 dark:opacity-25">
          <div className="w-[260px] h-[260px] rounded-full border border-rose-900/15 dark:border-white/20 absolute -top-16"></div>
          <div className="w-[360px] h-[360px] rounded-full border border-rose-900/10 dark:border-white/15 absolute -top-28"></div>
          <div className="w-[460px] h-[460px] rounded-full border border-rose-900/5 dark:border-white/10 absolute -top-40"></div>
        </div>

        {/* Top Floating White/Primary Lightning Bolt Icon */}
        <div className="relative z-10 mb-6 flex items-center justify-center">
          <Zap className="w-7 h-7 text-primary dark:text-white fill-primary dark:fill-white drop-shadow-[0_0_12px_rgba(128,0,32,0.3)] dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] animate-pulse" />
        </div>

        {/* Card Header Title & Description */}
        <div className="relative z-10 mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Enter verification code
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300/80 mt-2 font-medium leading-relaxed">
            We emailed you a verification code to
            {identifier ? (
              <span className="block text-slate-900 dark:text-white font-semibold mt-0.5">{identifier}</span>
            ) : (
              ' your email address'
            )}
          </p>
        </div>

        {/* Error Notice Banner */}
        {error && (
          <div className="w-full mb-6 p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-200 text-xs font-medium relative z-10">
            {error}
          </div>
        )}

        {/* Session Conflict Handling */}
        {sessionConflict ? (
          <div className="w-full p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 mb-6 text-left relative z-10">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs mb-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Active Session Conflict Detected
            </div>
            <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed mb-4">
              Another device is currently logged in. Continuing will log out the active session.
            </p>
            <button
              onClick={handleForceLogin}
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              {loading ? 'Disconnecting other device...' : 'Disconnect other device & continue'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="w-full space-y-6 relative z-10">
            {/* OTP Input Grid */}
            <div className="flex justify-center">
              <OTPInput
                length={6}
                value={otp}
                onChange={setOtp}
                onComplete={(code) => {
                  setOtp(code);
                }}
                label=""
                isDisabled={loading}
              />
            </div>

            {/* Resend Action Text */}
            <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Didn't get the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || loading}
                className="font-bold text-primary dark:text-white hover:underline focus:outline-none transition-colors disabled:opacity-50"
              >
                {resendLoading ? 'Resending...' : 'Resend'}
              </button>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-primary hover:bg-primary/90 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-bold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-md dark:shadow-lg dark:hover:shadow-white/20 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white dark:border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Verify & Continue
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>
        )}

        {/* Footer Legal Terms Notice */}
        <div className="relative z-10 mt-8 pt-6 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400/80 text-center leading-relaxed w-full">
          By continuing, you agree to our{' '}
          <Link to="/content/pages/terms-and-conditions" className="underline text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-white transition-colors">
            Terms of Service
          </Link>{' '}
          &amp;{' '}
          <Link to="/content/pages/privacy-policy" className="underline text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
