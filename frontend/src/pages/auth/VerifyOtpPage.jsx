import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { KeyRound, ArrowRight, AlertTriangle, ShieldAlert } from 'lucide-react';

const VerifyOtpPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const identifier = location.state?.identifier || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { verifyOtp, forceLogin, sessionConflict, conflictTicket } = useAuth();

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError('Please enter valid 6-digit OTP code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyOtp(identifier, otp);
      if (res.sessionConflict) {
        // State set in AuthContext; UI displays session conflict prompt
        return;
      }
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message || 'OTP verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await forceLogin(conflictTicket);
      if (res.success) {
        navigate('/');
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
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-[#fdf8f9] min-h-[75vh]">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-[#e5d1d4] shadow-xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#800020] p-0.5 shadow-md mb-3 flex items-center justify-center text-white">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#3d0a0d] tracking-tight">Enter Verification Code</h2>
          <p className="text-xs text-[#7c5c5f] mt-1">
            Sent to <span className="text-[#3d0a0d] font-semibold">{identifier || 'your account'}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Session Conflict Handling Prompt */}
        {sessionConflict ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6 text-left">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-2">
              <ShieldAlert className="w-4 h-4" />
              Active Session Conflict Detected
            </div>
            <p className="text-xs text-[#664448] leading-relaxed mb-4">
              Another active session is currently logged into this account. Continuing will invalidate and log out the other device.
            </p>
            <button
              onClick={handleForceLogin}
              disabled={loading}
              className="w-full bg-[#800020] hover:bg-[#66001a] text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Logging out other device...' : 'Log out other device & continue'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#3d0a0d] uppercase tracking-wider mb-2 text-center">
                6-Digit Security Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full text-center text-2xl font-mono tracking-widest bg-[#fdf8f9] border border-[#e5d1d4] focus:border-[#800020] focus:ring-1 focus:ring-[#800020] rounded-xl py-3 text-[#3d0a0d] placeholder-[#9a6870] outline-none transition-all"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#800020] hover:bg-[#66001a] text-white justify-center py-3 text-sm font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Confirm & Authenticate
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default VerifyOtpPage;
