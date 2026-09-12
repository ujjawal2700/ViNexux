import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  User,
  Building2,
  Phone,
} from 'lucide-react';

import Logo from '../../components/ui/Logo';

export const LoginPage = ({ initialTab = 'login' }) => {
  const [searchParams] = useSearchParams();
  const queryMode = searchParams.get('mode') || searchParams.get('tab');

  // Mode: 'login' or 'signup'
  const [activeTab, setActiveTab] = useState(queryMode === 'signup' ? 'signup' : initialTab);
  
  // Account Role for Signup: 'customer' or 'dealer'
  const [accountRole, setAccountRole] = useState('customer');

  // Input States - Sign In
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Input States - Sign Up Personal Details
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [dob, setDob] = useState('');

  // Input States - Dealer KYC Details
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const { sendOtp, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (queryMode === 'signup') {
      setActiveTab('signup');
    } else if (queryMode === 'login') {
      setActiveTab('login');
    }
  }, [queryMode]);

  // Role-based redirect helper after authentication
  const navigateByRole = (userRole, defaultRedirect) => {
    if (defaultRedirect && defaultRedirect !== '/login' && defaultRedirect !== '/customer/login' && defaultRedirect !== '/register') {
      navigate(defaultRedirect, { replace: true });
      return;
    }
    if (userRole === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (userRole === 'dealer') {
      navigate('/dealer/dashboard', { replace: true });
    } else {
      navigate('/customer/dashboard', { replace: true });
    }
  };

  // Helper to clear form state & messages
  const resetFormFields = () => {
    setError(null);
    setSuccessMsg(null);
    setIdentifier('');
    setLoginPassword('');
    setFullName('');
    setEmail('');
    setPhone('');
    setSignupPassword('');
    setDob('');
    setCompanyName('');
    setGstin('');
    setPan('');
    setAddress('');
    setCity('');
    setStateName('');
    setPincode('');
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    resetFormFields();
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

  // Handle Signup submission (Customer or Dealer)
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !signupPassword || !phone.trim()) {
      setError('Please fill in all required fields (Name, Email, Phone, Password).');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (accountRole === 'dealer' && !companyName.trim()) {
      setError('Business / Company Name is required for Dealer registration.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        fullName,
        email,
        phone,
        password: signupPassword,
        dob,
        role: accountRole,
        ...(accountRole === 'dealer'
          ? {
              companyName,
              gstin,
              pan,
              address,
              city,
              state: stateName,
              pincode,
            }
          : {}),
      };

      const response = await signup(payload);

      if (response.success) {
        const userRole = response.data?.user?.role || accountRole;
        resetFormFields();
        if (userRole === 'dealer') {
          setSuccessMsg('Dealer account submitted! Redirecting to portal...');
        } else {
          setSuccessMsg('Customer account created successfully! Redirecting...');
        }

        setTimeout(() => {
          navigateByRole(userRole, location.state?.from?.pathname);
        }, 1200);
      } else {
        setError(response.message || 'Signup failed. Please check your details and try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup error. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 sm:p-6 bg-background text-foreground relative overflow-hidden">
      {/* Ambient background glow matching Vinexus brand theme */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`w-full ${
          activeTab === 'signup' && accountRole === 'dealer' ? 'max-w-xl' : 'max-w-md'
        } bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 transition-all duration-300`}
      >
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo className="h-10 sm:h-12 w-auto object-contain mb-3 drop-shadow-sm" />
          <p className="text-xs text-muted-foreground font-medium">
            {activeTab === 'login'
              ? 'Sign in to continue to Vinexus'
              : 'Join Vinexus as a Customer or B2B Dealer'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-medium flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORM 1: SIGN IN */}
        {activeTab === 'login' && (
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
        )}

        {/* FORM 2: SIGN UP */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            {/* Account Role Selection Cards */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Choose Account Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountRole('customer')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                    accountRole === 'customer'
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                      : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${accountRole === 'customer' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Customer</div>
                    <div className="text-[10px] text-muted-foreground">Retail Shopper</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountRole('dealer')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                    accountRole === 'dealer'
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                      : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${accountRole === 'dealer' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Dealer (B2B)</div>
                    <div className="text-[10px] text-muted-foreground">Wholesale KYC</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Personal Details */}
            <div className="space-y-3 pt-1">
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                    disabled={loading}
                  />
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Create password"
                  className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-11 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Dealer KYC Extra Fields */}
            {accountRole === 'dealer' && (
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Dealer Business Details
                </div>

                <input
                  type="text"
                  required={accountRole === 'dealer'}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Business / Company Name *"
                  className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                  disabled={loading}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="GSTIN Number (Optional)"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium uppercase"
                    disabled={loading}
                  />

                  <input
                    type="text"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="PAN Number (Optional)"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium uppercase"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="State"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Pincode"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Submit Sign Up Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-full py-3.5 text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Creating Account...' : accountRole === 'dealer' ? 'Submit Dealer KYC & Register' : 'Sign Up'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Bottom Switch Link */}
        <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted-foreground font-medium">
          {activeTab === 'login' ? (
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
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="font-bold text-primary hover:underline transition-colors"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
