import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { ArrowLeft, Check, ShieldAlert, Loader2 } from 'lucide-react';

export const VerifyOtpPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const identifier = location.state?.identifier || '';
  const portal = location.state?.portal;

  // Format phone number nicely (e.g. +91 8209224481)
  const formatPhoneNumber = (val) => {
    if (!val) return '+91 8209224481'; // Default display preview
    const clean = val.replace(/\D/g, '');
    if (clean.length === 10) {
      return `+91 ${clean}`;
    }
    if (clean.length > 10 && clean.startsWith('91')) {
      return `+91 ${clean.slice(2)}`;
    }
    return val;
  };

  const displayIdentifier = formatPhoneNumber(identifier);

  // 6 digit OTP state
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState(null);

  // Countdown timer for Resend (starting at 30s)
  const [timer, setTimer] = useState(30);

  const { verifyOtp, sendOtp, forceLogin, sessionConflict, conflictTicket } = useAuth();

  // Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  // Auto focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const otpValue = digits.join('');

  // Handle single digit input
  const handleDigitChange = (e, index) => {
    const val = e.target.value;
    const lastChar = val.substring(val.length - 1);

    if (val && !/^\d+$/.test(lastChar)) return;

    const newDigits = [...digits];
    newDigits[index] = lastChar;
    setDigits(newDigits);
    setError(null);

    // Auto-advance to next input
    if (lastChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste of 6-digit OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setDigits(newDigits);
    setError(null);

    const targetIndex = Math.min(pastedData.length, 5);
    inputRefs.current[targetIndex]?.focus();
  };

  // Verify action
  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (otpValue.length < 6) {
      setError('Please enter complete 6-digit verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyOtp(identifier || '8209224481', otpValue, portal);
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

  // Resend action
  const handleResend = async () => {
    setResendLoading(true);
    setError(null);
    try {
      const res = await sendOtp(identifier || '8209224481', portal);
      if (res.success) {
        toast.success('A new verification code has been sent!');
        setTimer(30);
      } else {
        setError(res.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error requesting new verification code');
    } finally {
      setResendLoading(false);
    }
  };

  // Force login on session conflict
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
    <div className="min-h-[calc(100vh-220px)] flex items-center justify-center p-4 sm:p-6 bg-white sm:bg-[#f8fafc] text-gray-900">
      {/* Mega Jaipur Layout Card with ViNexus Maroon Brand Styling */}
      <div className="w-full max-w-[430px] bg-white rounded-lg sm:shadow-sm sm:border sm:border-gray-200/90 p-5 sm:p-7">
        
        {/* Top Segmented Tabs: Login (Active Maroon) | Register (Inactive) */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button
            type="button"
            className="py-2.5 bg-[#800020] text-white font-bold text-xs sm:text-sm rounded text-center shadow-xs select-none"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => navigate('/login?tab=signup')}
            className="py-2.5 bg-[#fdf2f4] hover:bg-[#fae1e6] text-[#800020] hover:text-[#590016] font-semibold text-xs sm:text-sm rounded text-center transition-colors select-none cursor-pointer"
          >
            Register
          </button>
        </div>

        {/* Back Button + Title Block */}
        <div className="flex items-center gap-3.5 mb-4 text-left">
          <button
            type="button"
            onClick={() => navigate('/login', { state: { identifier } })}
            className="w-9 h-9 rounded bg-[#fdf2f4] hover:bg-[#fae1e6] text-[#800020] flex items-center justify-center shrink-0 transition-colors cursor-pointer border border-[#f3d5dc]"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-[#800020] stroke-[2.5]" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Verify OTP
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Code sent to {displayIdentifier}
            </p>
          </div>
        </div>

        {/* Maroon-Tinted Info Notice Banner */}
        <div className="bg-[#fdf2f4] border border-[#f3d5dc] rounded p-2.5 sm:p-3 flex items-center gap-2.5 text-xs text-[#800020] font-semibold mb-6">
          <div className="w-5 h-5 rounded bg-[#800020] flex items-center justify-center text-white shrink-0">
            <span className="text-[9px] leading-none font-black tracking-tighter">•••</span>
          </div>
          <span>Check your SMS for the 6-digit code</span>
        </div>

        {/* Error Alert Notice */}
        {error && (
          <div className="mb-4 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left">
            {error}
          </div>
        )}

        {/* Session Conflict Handling */}
        {sessionConflict ? (
          <div className="w-full p-4 rounded-lg bg-amber-50 border border-amber-200 mb-5 text-left">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Active Session Conflict Detected
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed mb-3">
              Another device is currently logged in. Continuing will log out the active session.
            </p>
            <button
              onClick={handleForceLogin}
              disabled={loading}
              className="w-full bg-[#800020] hover:bg-[#9a1b32] text-white font-bold py-2.5 px-4 rounded text-xs transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Disconnecting other device...' : 'Disconnect other device & continue'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="w-full">
            {/* 6 Square OTP Inputs with ViNexus Maroon Border */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-5">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={loading}
                  onChange={(e) => handleDigitChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={handlePaste}
                  className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold text-gray-900 bg-white border-2 border-[#800020] focus:border-[#9a1b32] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 rounded transition-all select-none disabled:opacity-50"
                />
              ))}
            </div>

            {/* Action Button: Verify & Login in ViNexus Maroon */}
            <button
              type="submit"
              disabled={loading || otpValue.length < 6}
              className="w-full py-3 px-4 bg-[#800020] hover:bg-[#9a1b32] active:scale-[0.99] text-white font-bold text-sm rounded shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-3.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[#800020] shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                  </div>
                  Verify &amp; Login
                </span>
              )}
            </button>
          </form>
        )}

        {/* Bottom Actions Row: Resend in 30s / Change Number */}
        <div className="flex items-center justify-between text-xs pt-1 text-gray-500 font-medium">
          <div>
            {timer > 0 ? (
              <span className="text-gray-400">Resend in {timer}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || loading}
                className="text-[#800020] font-bold hover:underline cursor-pointer disabled:opacity-50"
              >
                {resendLoading ? 'Resending...' : 'Resend OTP'}
              </button>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => navigate('/login', { state: { identifier } })}
              className="text-[#800020] font-bold hover:underline cursor-pointer"
            >
              Change Number
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VerifyOtpPage;
