import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ArrowRight, ShieldCheck, ShieldAlert, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';
import ThemeToggle from '../../components/ui/ThemeToggle';

/**
 * Dedicated admin sign-in page. Separate URL from the general /login used by
 * customers/dealers. The backend independently enforces that only accounts
 * with role='admin' can authenticate through this portal (see portal:'admin'
 * on send-otp / verify-otp) - this page is a UX convenience, not the
 * security boundary.
 */
const AdminLoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { sendOtp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your administrator email address or phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sendOtp(identifier, 'admin');
      if (response.success) {
        navigate('/verify-otp', { state: { identifier, portal: 'admin' } });
      } else {
        setError(response.message || 'Failed to send OTP code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background bg-grid-pattern">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <ThemeToggle className="absolute top-6 right-6 z-10" />

      <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl border border-border shadow-2xl relative z-10 bg-card">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-3 flex items-center justify-center">
            <Logo className="w-16 h-auto drop-shadow-[0_0_15px_rgba(194,24,91,0.3)]" />
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-black tracking-wider uppercase">Admin Control Center</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Restricted administrator sign-in</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-2">
              Administrator Email / Phone
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@vinexus.com"
              className="w-full bg-muted/60 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={loading}
            size="lg"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Request Admin OTP
          </Button>
        </form>

        <div className="mt-6 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" />
          <span>Non-administrator accounts are rejected by this sign-in page</span>
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors">
            &larr; Back to customer / dealer login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
