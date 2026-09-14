import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { KeyRound, Mail, ArrowRight, ShieldAlert, ArrowLeft } from 'lucide-react';
import Logo from '../../components/ui/Logo';
import { startResetFlow } from '../../utils/resetFlowGuard';

/**
 * Step 1 of the "forgot password" flow: ask for the email or phone number
 * the account was registered with, and send a one-time password-reset OTP
 * to it. On success, hands off to ResetPasswordPage for OTP entry + the
 * actual password change.
 */
export const ForgotPasswordPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { sendOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your registered email address or phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sendOtp(identifier.trim(), undefined, 'password-reset');
      if (response.success) {
        startResetFlow(identifier.trim());
        toast.success('Verification code sent!');
        navigate('/reset-password', { state: { identifier: identifier.trim() }, replace: true });
      } else {
        setError(response.message || 'Failed to send verification code.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 sm:p-6 bg-background text-foreground relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 transition-all duration-300">
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo className="h-10 sm:h-12 w-auto object-contain mb-3 drop-shadow-sm" />
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Forgot your password?</h1>
          <p className="text-xs text-muted-foreground font-medium mt-1.5 leading-relaxed">
            Enter the email or phone number linked to your account and we'll send you a
            verification code to reset your password.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Email address or phone"
              className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-full py-3.5 text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Sending code...' : 'Send verification code'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-border text-center text-xs">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
