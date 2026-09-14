import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import dealerService from '../../services/dealerService';
import useToast from '../../hooks/useToast';
import { INDIA_STATES, getCitiesForState } from '../../data/indiaStatesCities';
import { OTPInput } from '../../components/ui/OTPInput';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { cn } from '../../lib/utils';
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  User,
  Building2,
  Phone,
  Upload,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const PINCODE_REGEX = /^\d{6}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const inputClass =
  'w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium';
const plainInputClass =
  'w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium';

const FileDropField = ({ label, required, file, onChange, disabled }) => (
  <label className="block">
    <span className="text-[11px] font-bold text-foreground mb-1.5 block">
      {label} {required && <span className="text-rose-600">*</span>}
    </span>
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-xs cursor-pointer transition-colors ${
        file ? 'border-emerald-400 bg-emerald-500/5 text-emerald-700' : 'border-dashed border-border bg-muted/40 text-muted-foreground hover:border-primary'
      }`}
    >
      {file ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Upload className="w-4 h-4 shrink-0" />}
      <span className="truncate flex-1 font-medium">{file ? file.name : 'Choose photo or PDF (max 5MB)'}</span>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => onChange(e.target.files[0] || null)}
      />
    </div>
  </label>
);

const StepIndicator = ({ step, totalSteps = 3 }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: totalSteps }).map((_, idx) => (
      <React.Fragment key={idx}>
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-colors ${
            idx + 1 < step
              ? 'bg-primary border-primary text-white'
              : idx + 1 === step
              ? 'border-primary text-primary bg-primary/10'
              : 'border-border text-muted-foreground bg-muted/40'
          }`}
        >
          {idx + 1 < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
        </div>
        {idx < totalSteps - 1 && (
          <div className={`w-8 h-0.5 rounded-full ${idx + 1 < step ? 'bg-primary' : 'bg-border'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

const SignupWizard = ({ onSwitchToLogin }) => {
  const { sendOtp, verifySignupOtp, signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1); // 1: role, 2: details, 3: otp
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Customer fields
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [custConfirmPassword, setCustConfirmPassword] = useState('');
  const [showCustPassword, setShowCustPassword] = useState(false);

  // Dealer fields
  const [dealerName, setDealerName] = useState('');
  const [dealerEmail, setDealerEmail] = useState('');
  const [dealerPhone, setDealerPhone] = useState('');
  const [dealerPassword, setDealerPassword] = useState('');
  const [dealerConfirmPassword, setDealerConfirmPassword] = useState('');
  const [showDealerPassword, setShowDealerPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [gstFile, setGstFile] = useState(null);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [pincode, setPincode] = useState('');

  // OTP step
  const [otp, setOtp] = useState('');
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const isDealer = role === 'dealer';

  const navigateByRole = (userRole) => {
    const from = location.state?.from?.pathname;
    if (from && from !== '/login' && from !== '/register' && from !== '/signup') {
      navigate(from, { replace: true });
      return;
    }
    if (userRole === 'dealer') {
      navigate('/dealer/dashboard', { replace: true });
    } else {
      navigate('/customer/dashboard', { replace: true });
    }
  };

  const handleSelectRole = (selected) => {
    setRole(selected);
    setError(null);
    setStep(2);
  };

  const validateStep2 = () => {
    if (!isDealer) {
      if (!custName.trim() || !custEmail.trim() || !custPassword) {
        return 'Please fill in your name, email, and password.';
      }
      if (custPassword.length < 6) {
        return 'Password must be at least 6 characters long.';
      }
      if (custPassword !== custConfirmPassword) {
        return "Passwords don't match.";
      }
      return null;
    }

    if (!dealerName.trim() || !dealerEmail.trim() || !dealerPhone.trim() || !dealerPassword) {
      return 'Please fill in your name, email, phone, and password.';
    }
    if (dealerPassword.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (dealerPassword !== dealerConfirmPassword) {
      return "Passwords don't match.";
    }
    if (!PHONE_REGEX.test(dealerPhone.trim())) {
      return 'Please enter a valid 10-digit Indian mobile number.';
    }
    if (!companyName.trim()) {
      return 'Business / Company Name is required.';
    }
    if (!gstin.trim() || !GSTIN_REGEX.test(gstin.trim().toUpperCase())) {
      return 'A valid 15-character GSTIN is required.';
    }
    if (!gstFile) {
      return 'Please upload a photo of your GST Certificate.';
    }
    if (!aadhaarNumber.trim() || !AADHAAR_REGEX.test(aadhaarNumber.trim())) {
      return 'A valid 12-digit Aadhaar number is required.';
    }
    if (!aadhaarFile) {
      return 'Please upload a photo of your Aadhaar Card.';
    }
    if (!selectedState) {
      return 'Please select your state.';
    }
    if (!selectedCity) {
      return 'Please select your city.';
    }
    if (!pincode.trim() || !PINCODE_REGEX.test(pincode.trim())) {
      return 'Please enter a valid 6-digit pincode.';
    }
    for (const [file, label] of [[gstFile, 'GST Certificate'], [aadhaarFile, 'Aadhaar Card']]) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return `${label}: invalid file format. Please upload JPG, PNG, WEBP, or PDF.`;
      }
      if (file.size > MAX_FILE_SIZE) {
        return `${label}: file is too large (max 5MB).`;
      }
    }
    return null;
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    const validationError = validateStep2();
    if (validationError) {
      setError(validationError);
      return;
    }

    const identifier = isDealer ? dealerPhone.trim() : custEmail.trim();

    setLoading(true);
    setError(null);
    try {
      const response = await sendOtp(identifier, undefined, 'signup');
      if (response.success) {
        setOtpIdentifier(identifier);
        setOtp('');
        setStep(3);
      } else {
        setError(response.message || 'Failed to send verification code.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError(null);
    try {
      const response = await sendOtp(otpIdentifier, undefined, 'signup');
      if (response.success) {
        toast.success('A new verification code has been sent!');
      } else {
        setError(response.message || 'Failed to resend code.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setResendLoading(false);
    }
  };

  const finalizeSignup = async () => {
    const payload = isDealer
      ? {
          fullName: dealerName,
          email: dealerEmail,
          phone: dealerPhone,
          password: dealerPassword,
          role: 'dealer',
          companyName,
          gstin: gstin.toUpperCase(),
          aadhaarNumber,
          city: selectedCity,
          state: selectedState,
          pincode,
        }
      : {
          fullName: custName,
          email: custEmail,
          password: custPassword,
          role: 'customer',
        };

    const response = await signup(payload);
    if (!response.success) {
      throw new Error(response.message || 'Signup failed. Please check your details and try again.');
    }

    if (isDealer) {
      const uploadFailures = [];
      try {
        await dealerService.uploadKycDocument('gst', gstFile);
      } catch (_err) {
        uploadFailures.push('GST Certificate');
      }
      try {
        await dealerService.uploadKycDocument('aadhaar', aadhaarFile);
      } catch (_err) {
        uploadFailures.push('Aadhaar Card');
      }

      if (uploadFailures.length) {
        toast.error(
          `Account created, but ${uploadFailures.join(' and ')} upload failed. Please upload it from the KYC page.`,
          8000
        );
      }
    }

    return response.data?.user?.role || role;
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const verifyResponse = await verifySignupOtp(otpIdentifier, otp);
      if (!verifyResponse.success) {
        setError(verifyResponse.message || 'Invalid or expired verification code.');
        setLoading(false);
        return;
      }

      const finalRole = await finalizeSignup();
      setSuccessMsg(
        finalRole === 'dealer'
          ? 'Dealer account created! Redirecting to your dashboard...'
          : 'Account created successfully! Redirecting...'
      );
      setTimeout(() => navigateByRole(finalRole), 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cardWidth = step === 2 && isDealer ? 'max-w-xl' : 'max-w-md';

  return (
    <div className={`w-full ${cardWidth} bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 transition-all duration-300`}>
      <div className="flex flex-col items-center text-center mb-6">
        <p className="text-xs text-muted-foreground font-medium">Join Vinexus as a Customer or B2B Dealer</p>
      </div>

      {step > 1 && <StepIndicator step={step} />}

      {error && (
        <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-medium flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* STEP 1: ROLE SELECTION */}
      {step === 1 && (
        <div className="space-y-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Choose Account Type *
          </label>
          <button
            type="button"
            onClick={() => handleSelectRole('customer')}
            className="w-full p-4 rounded-2xl border border-border bg-muted/40 hover:border-primary hover:bg-primary/5 text-left transition-all flex items-center gap-3"
          >
            <div className="p-2.5 rounded-xl bg-muted text-primary">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground">Customer</div>
              <div className="text-[11px] text-muted-foreground">Retail shopper - browse and enquire on standard pricing</div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => handleSelectRole('dealer')}
            className="w-full p-4 rounded-2xl border border-border bg-muted/40 hover:border-primary hover:bg-primary/5 text-left transition-all flex items-center gap-3"
          >
            <div className="p-2.5 rounded-xl bg-muted text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground">Dealer (B2B)</div>
              <div className="text-[11px] text-muted-foreground">Wholesale pricing - requires business KYC verification</div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* STEP 2: DETAILS FORM */}
      {step === 2 && !isDealer && (
        <form onSubmit={handleStep2Submit} className="space-y-3">
          <div className="relative">
            <User className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder="Full Name"
              className={inputClass}
              disabled={loading}
            />
          </div>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              required
              value={custEmail}
              onChange={(e) => setCustEmail(e.target.value)}
              placeholder="Email address"
              className={inputClass}
              disabled={loading}
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showCustPassword ? 'text' : 'password'}
              required
              value={custPassword}
              onChange={(e) => setCustPassword(e.target.value)}
              placeholder="Create password"
              className={inputClass}
              disabled={loading}
            />
          </div>
          <div>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showCustPassword ? 'text' : 'password'}
                required
                value={custConfirmPassword}
                onChange={(e) => setCustConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className={cn(
                  inputClass,
                  custConfirmPassword && custPassword !== custConfirmPassword && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                )}
                disabled={loading}
              />
            </div>
            {custConfirmPassword && custPassword !== custConfirmPassword && (
              <p className="text-[10px] text-rose-600 font-semibold mt-1.5">Passwords don't match.</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCustPassword}
              onChange={(e) => setShowCustPassword(e.target.checked)}
              className="rounded-md border-border bg-muted text-primary focus:ring-primary/20 w-3.5 h-3.5"
            />
            <span>Show passwords</span>
          </label>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3 h-3" /> We'll send a verification code to your email
          </p>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-3.5 rounded-full border border-border text-muted-foreground hover:text-foreground text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold rounded-full py-3.5 text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Sending code...' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {step === 2 && isDealer && (
        <form onSubmit={handleStep2Submit} className="space-y-3">
          <div className="relative">
            <User className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              value={dealerName}
              onChange={(e) => setDealerName(e.target.value)}
              placeholder="Full Name"
              className={inputClass}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={dealerEmail}
                onChange={(e) => setDealerEmail(e.target.value)}
                placeholder="Email address"
                className={inputClass}
                disabled={loading}
              />
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                required
                value={dealerPhone}
                onChange={(e) => setDealerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Phone number"
                className={inputClass}
                disabled={loading}
              />
            </div>
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showDealerPassword ? 'text' : 'password'}
              required
              value={dealerPassword}
              onChange={(e) => setDealerPassword(e.target.value)}
              placeholder="Create password"
              className={inputClass}
              disabled={loading}
            />
          </div>

          <div>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showDealerPassword ? 'text' : 'password'}
                required
                value={dealerConfirmPassword}
                onChange={(e) => setDealerConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className={cn(
                  inputClass,
                  dealerConfirmPassword && dealerPassword !== dealerConfirmPassword && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                )}
                disabled={loading}
              />
            </div>
            {dealerConfirmPassword && dealerPassword !== dealerConfirmPassword && (
              <p className="text-[10px] text-rose-600 font-semibold mt-1.5">Passwords don't match.</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDealerPassword}
              onChange={(e) => setShowDealerPassword(e.target.checked)}
              className="rounded-md border-border bg-muted text-primary focus:ring-primary/20 w-3.5 h-3.5"
            />
            <span>Show passwords</span>
          </label>

          <div className="space-y-3 pt-3 border-t border-border">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" /> Dealer Business & KYC Details
            </div>

            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Business / Company Name *"
              className={plainInputClass}
              disabled={loading}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="GSTIN Number *"
                maxLength={15}
                className={`${plainInputClass} uppercase`}
                disabled={loading}
              />
              <input
                type="text"
                required
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="Aadhaar Number (12 digits) *"
                className={plainInputClass}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FileDropField label="GST Certificate Photo" required file={gstFile} onChange={setGstFile} disabled={loading} />
              <FileDropField label="Aadhaar Card Photo" required file={aadhaarFile} onChange={setAadhaarFile} disabled={loading} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <SearchableSelect
                value={selectedState}
                onChange={(val) => {
                  setSelectedState(val);
                  setSelectedCity('');
                }}
                options={INDIA_STATES}
                placeholder="Select State *"
                searchPlaceholder="Search states..."
                disabled={loading}
              />
              <SearchableSelect
                value={selectedCity}
                onChange={setSelectedCity}
                options={getCitiesForState(selectedState)}
                placeholder={selectedState ? 'Select City *' : 'Select state first'}
                searchPlaceholder="Search cities..."
                emptyMessage="No matching cities."
                disabled={loading || !selectedState}
              />
              <input
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Pincode *"
                className={plainInputClass}
                disabled={loading}
              />
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-1">
            <Phone className="w-3 h-3" /> We'll send a verification code to your phone via SMS
          </p>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-3.5 rounded-full border border-border text-muted-foreground hover:text-foreground text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold rounded-full py-3.5 text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Sending code...' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: OTP VERIFICATION */}
      {step === 3 && (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              {isDealer ? <Phone className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            </div>
            <h3 className="text-sm font-bold text-foreground">Verify your {isDealer ? 'phone number' : 'email address'}</h3>
            <p className="text-[11px] text-muted-foreground">
              Code sent to <span className="font-semibold text-foreground">{otpIdentifier}</span>
            </p>
          </div>

          <div className="flex justify-center">
            <OTPInput length={6} value={otp} onChange={setOtp} onComplete={(code) => setOtp(code)} label="" isDisabled={loading} />
          </div>

          <div className="text-center text-[11px] text-muted-foreground">
            Didn't get the code?{' '}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendLoading || loading}
              className="font-bold text-primary hover:underline disabled:opacity-50"
            >
              {resendLoading ? 'Resending...' : 'Resend'}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={loading}
              className="px-4 py-3.5 rounded-full border border-border text-muted-foreground hover:text-foreground text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Edit details
            </button>
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold rounded-full py-3.5 text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Verifying...' : isDealer ? 'Verify & Submit KYC' : 'Verify & Create Account'}</span>
              {!loading && <FileCheck className="w-4 h-4" />}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted-foreground font-medium">
        <span>
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} className="font-bold text-primary hover:underline transition-colors">
            Sign in
          </button>
        </span>
      </div>
    </div>
  );
};

export default SignupWizard;
