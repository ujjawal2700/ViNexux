import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { ShieldAlert, ArrowRight, Lock, Clock, AlertTriangle } from 'lucide-react';
import { OTPInput } from '../../components/ui/OTPInput';
import Logo from '../../components/ui/Logo';
import { cn } from '../../lib/utils';
import { getResetFlow, startResetFlow, clearResetFlow } from '../../utils/resetFlowGuard';

// Must stay in sync with the backend's OTP/reset-ticket lifetimes
// (see backend config.otpExpiryMinutes and generatePasswordResetTicket).
const OTP_STEP_SECONDS = 5 * 60; // 5 minutes - matches OTP_EXPIRY_MINUTES default
const PASSWORD_STEP_SECONDS = 9 * 60; // stays under the 10-minute reset ticket expiry

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * Step 2 of the "forgot password" flow: verify the OTP that
 * ForgotPasswordPage sent, then set a new password.
 *
 * Security/UX requirements this page enforces:
 *  - Only reachable after ForgotPasswordPage actually sent an OTP (guarded
 *    via the in-memory resetFlowGuard, not just location.state - see that
 *    module for why).
 *  - A page refresh always kicks the user back to /login: the guard is a
 *    plain JS variable that resets to null on reload.
 *  - Pressing browser back/forward while on this page also kicks the user
 *    back to /login (popstate listener below).
 *  - A visible countdown enforces the same timeout server-side: OTP entry
 *    expires with the OTP itself, password entry expires with the reset
 *    ticket. Either running out redirects to /login.
 */
export const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { verifyResetOtp, resetPassword, sendOtp } = useAuth();

  const identifier = location.state?.identifier || '';

  const [step, setStep] = useState('otp'); // 'otp' | 'password'
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(OTP_STEP_SECONDS);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState(null);

  const timedOutRef = useRef(false);

  const forceExpire = useCallback(
    (message) => {
      if (timedOutRef.current) return;
      timedOutRef.current = true;
      clearResetFlow();
      toast.error(message || 'Your session has expired for security. Please verify your email or phone again.');
      navigate('/login', { replace: true });
    },
    [navigate, toast]
  );

  // Guard entry: this page is only valid right after ForgotPasswordPage
  // started a flow for this exact identifier. A hard refresh wipes the
  // in-memory flow guard, so this check fails and the user is bounced.
  useEffect(() => {
    const flow = getResetFlow();
    if (!identifier || !flow || flow.identifier !== identifier) {
      timedOutRef.current = true;
      toast.error('Your session has timed out. Please enter your email or phone number again.');
      navigate('/login', { replace: true });
    }
    // Only ever needs to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pressing browser back/forward while on this page ends the flow -
  // per the "do not press back" note shown below.
  useEffect(() => {
    const handlePopState = () => {
      forceExpire('You navigated away from the reset process, so it was cancelled for security. Please start over.');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [forceExpire]);

  // Visible countdown, mirroring the backend's own OTP / reset-ticket expiry.
  useEffect(() => {
    if (timedOutRef.current) return undefined;
    if (secondsLeft <= 0) {
      forceExpire(
        step === 'otp'
          ? 'Your verification code has expired. Please request a new one.'
          : 'Your password reset session has expired. Please start over.'
      );
      return undefined;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, step, forceExpire]);

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.length < 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await verifyResetOtp(identifier, otp);
      if (res.success && res.data?.resetToken) {
        setResetToken(res.data.resetToken);
        setStep('password');
        setSecondsLeft(PASSWORD_STEP_SECONDS);
        toast.success('Code verified! Set your new password.');
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
    if (!identifier) return;
    setResendLoading(true);
    setError(null);
    try {
      const res = await sendOtp(identifier, undefined, 'password-reset');
      if (res.success) {
        startResetFlow(identifier);
        setOtp('');
        setSecondsLeft(OTP_STEP_SECONDS);
        toast.success('A new verification code has been sent!');
      } else {
        setError(res.message || 'Failed to resend the verification code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error requesting a new verification code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await resetPassword(resetToken, newPassword);
      if (res.success) {
        timedOutRef.current = true; // stop the countdown/popstate guard from firing after we navigate away
        clearResetFlow();
        toast.success('Password reset successfully! Please log in with your new password.');
        navigate('/login', { replace: true });
      } else {
        setError(res.message || 'Failed to reset password');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const inputClass =
    'w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium';

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 sm:p-6 bg-background text-foreground relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 transition-all duration-300">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo className="h-10 sm:h-12 w-auto object-contain mb-3 drop-shadow-sm" />
          <h1 className="text-lg font-bold text-foreground">
            {step === 'otp' ? 'Verify it’s you' : 'Set a new password'}
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-1.5">
            {step === 'otp' ? (
              <>
                We sent a verification code to <span className="text-foreground font-semibold">{identifier}</span>
              </>
            ) : (
              'Choose a new password for your account'
            )}
          </p>
        </div>

        {/* Countdown */}
        <div className="mb-5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Time remaining: {formatTime(secondsLeft)}</span>
        </div>

        {/* Do-not-refresh / do-not-go-back warning */}
        <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Do not refresh this page or press your browser&apos;s back button. Doing so will end this session and
            you&apos;ll need to verify your email or phone again from the start.
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex justify-center">
              <OTPInput length={6} value={otp} onChange={setOtp} onComplete={setOtp} label="" isDisabled={loading} />
            </div>

            <div className="text-xs text-center text-muted-foreground font-normal">
              Didn&apos;t get the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || loading}
                className="font-bold text-primary hover:underline focus:outline-none transition-colors disabled:opacity-50"
              >
                {resendLoading ? 'Resending...' : 'Resend'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-full py-3.5 text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Verifying...' : 'Verify code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className={inputClass}
                disabled={loading}
              />
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={cn(
                  inputClass,
                  passwordsMismatch && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                )}
                disabled={loading}
              />
            </div>
            {passwordsMismatch && (
              <p className="text-[10px] text-rose-600 font-semibold -mt-2">Passwords don&apos;t match.</p>
            )}

            <label className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="rounded-md border-border bg-muted text-primary focus:ring-primary/20 w-3.5 h-3.5"
              />
              <span>Show passwords</span>
            </label>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword || passwordsMismatch}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-full py-3.5 text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Resetting...' : 'Reset password'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted-foreground font-medium">
          Remembered your password?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
