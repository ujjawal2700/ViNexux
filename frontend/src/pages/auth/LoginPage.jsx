import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Mail, Phone, ArrowRight, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';

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
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-[#fdf8f9] bg-grid-pattern min-h-[calc(100vh-140px)]">
      {/* Background ambient red lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#800020]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel-glow p-8 sm:p-10 rounded-3xl border border-[#e5d1d4] shadow-xl relative z-10 bg-white">
        {/* Hexagon Logo Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-3 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-14 h-14 text-[#800020] drop-shadow-[0_0_15px_rgba(128,0,32,0.3)] animate-pulse-glow">
              <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill="none" stroke="currentColor" strokeWidth="6" />
              <polygon points="50,15 82,33 82,67 50,85 18,67 18,33" fill="#f4e7ea" stroke="rgba(128,0,32,0.4)" strokeWidth="2" />
              <path d="M35 32 L50 68 L65 32" fill="none" stroke="#800020" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="50" cy="24" r="4" fill="#9a1b32" />
            </svg>
          </div>
          
          <div className="flex items-center gap-1.5 justify-center mb-1">
            <span className="text-2xl font-black tracking-widest text-[#800020]">VI</span>
            <span className="text-2xl font-black tracking-widest text-[#3d0a0d]">NEXUS</span>
          </div>
          
          <p className="text-xs text-[#7c5c5f]">Secure B2B Dealer & Customer Portal Authentication</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-[#3d0a0d] uppercase tracking-wider mb-2">
              Email Address / Registered Phone
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="customer@vinexus.com or 8209224481"
                className="w-full bg-[#f4e7ea]/60 border border-[#e5d1d4] focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 rounded-xl px-4 py-3 text-sm text-[#3d0a0d] placeholder-[#7c5c5f] outline-none transition-all font-medium"
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
        <div className="mt-6 pt-5 border-t border-[#e5d1d4] space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-[#7c5c5f] font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#800020]" /> Quick Sign In Demo Accounts:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('customer@vinexus.com')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#f4e7ea] hover:bg-[#e5d1d4] border border-[#e5d1d4] text-[#3d0a0d] font-bold transition-colors"
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('dealer@vinexus.com')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#f4e7ea] hover:bg-[#e5d1d4] border border-[#e5d1d4] text-[#3d0a0d] font-bold transition-colors"
            >
              Dealer
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@vinexus.com')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#f4e7ea] hover:bg-[#e5d1d4] border border-[#e5d1d4] text-[#3d0a0d] font-bold transition-colors"
            >
              Admin
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-[#7c5c5f] flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-[#7c5c5f]" />
          <span>Protected by Vinexus End-to-End Encryption</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

