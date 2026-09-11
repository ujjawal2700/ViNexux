import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Mail, Phone, ArrowRight, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { sendOtp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
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
        navigate('/verify-otp', { state: { identifier } });
      } else {
        setError(response.message || 'Failed to send OTP code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (email) => {
    setIdentifier(email);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-background bg-grid-pattern min-h-[calc(100vh-140px)]">
      {/* Background ambient red lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel-glow p-8 sm:p-10 rounded-3xl border border-border shadow-xl relative z-10 bg-card">
        {/* Vi Nexus Logo Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-3 flex items-center justify-center">
            <Logo
              className="w-20 h-auto drop-shadow-[0_0_15px_rgba(128,0,32,0.25)] animate-pulse-glow"
            />
          </div>

          <p className="text-xs text-muted-foreground">Secure B2B Dealer & Customer Portal Authentication</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-2">
              Email Address / Registered Phone
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="customer@vinexus.com or 8209224481"
                className="w-full bg-muted/60 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={loading}
            size="lg"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Request OTP Verification
          </Button>
        </form>

        {/* Quick Credentials Filler Pills */}
        <div className="mt-6 pt-5 border-t border-border space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" /> Quick Sign In Demo Accounts:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('customer@vinexus.com')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-border border border-border text-foreground font-bold transition-colors"
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('dealer@vinexus.com')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-border border border-border text-foreground font-bold transition-colors"
            >
              Dealer
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-muted-foreground" />
          <span>Protected by Vinexus End-to-End Encryption</span>
        </div>

        <div className="mt-4 text-center">
          <Link to="/admin/login" className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors">
            Administrator? Sign in here &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

