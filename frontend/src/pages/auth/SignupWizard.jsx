import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const PINCODE_REGEX = /^\d{6}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const inputClass =
  'w-full bg-white border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary rounded pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 outline-none transition-all font-medium';
const plainInputClass =
  'w-full bg-white border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary rounded px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 outline-none transition-all font-medium';

const FileDropField = ({ label, required, file, onChange, disabled }) => (
  <label className="block text-left">
    <span className="text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1 block">
      {label} {required && <span className="text-rose-600">*</span>}
    </span>
    <div
      className={cn(
        "flex items-center gap-2.5 px-3.5 py-2.5 rounded border text-xs cursor-pointer transition-colors bg-white",
        file
          ? "border-emerald-400 bg-emerald-50 text-emerald-800"
          : "border-dashed border-gray-300 hover:border-primary text-gray-500"
      )}
    >
      {file ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Upload className="w-4 h-4 text-gray-400 shrink-0" />}
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

const SignupWizard = ({ onSwitchToLogin, initialRole = 'customer' }) => {
  const { sendOtp, verifySignupOtp, signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(2); // directly on details form with sub-tabs
  const [role, setRole] = useState(initialRole === 'dealer' ? 'dealer' : 'customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Customer fields
  const [custName, setCustName] = useState('');
  const [custCompany, setCustCompany] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
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
  const [dealerAddress, setDealerAddress] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [pincode, setPincode] = useState('');

  // OTP step
  const [otp, setOtp] = useState('');
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const isDealer = role === 'dealer';

  const navigateByRole = () => {
    const from = location.state?.from?.pathname;
    if (from && from !== '/login' && from !== '/register' && from !== '/signup') {
      navigate(from, { replace: true });
      return;
    }
    navigate('/', { replace: true });
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError(null);
  };

  const validateStep2 = () => {
    if (!agreedTerms) {
      return 'Please agree to the Terms & Conditions and Privacy Policy to continue.';
    }

    if (!isDealer) {
      if (!custName.trim() || !custEmail.trim() || !custPhone.trim()) {
        return 'Please fill in your name, email, and mobile number.';
      }
      if (!PHONE_REGEX.test(custPhone.trim())) {
        return 'Please enter a valid 10-digit Indian mobile number.';
      }
      return null;
    }

    if (!dealerName.trim() || !dealerEmail.trim() || !dealerPhone.trim()) {
      return 'Please fill in your name, email, and phone number.';
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
      return 'Please upload a photo or PDF of your GST Certificate.';
    }
    if (!aadhaarNumber.trim() || !AADHAAR_REGEX.test(aadhaarNumber.trim())) {
      return 'A valid 12-digit Aadhaar number is required.';
    }
    if (!aadhaarFile) {
      return 'Please upload a photo or PDF of your Aadhaar Card.';
    }
    if (!dealerAddress.trim()) {
      return 'Please enter your business address.';
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
          fullName: dealerName.trim(),
          email: dealerEmail.trim().toLowerCase(),
          phone: dealerPhone.trim(),
          password: `VNX@${dealerPhone.trim()}`,
          role: 'dealer',
          companyName,
          gstin: gstin.toUpperCase(),
          aadhaarNumber,
          address: dealerAddress.trim(),
          city: selectedCity,
          state: selectedState,
          pincode,
        }
      : {
          fullName: custName.trim(),
          email: custEmail.trim().toLowerCase(),
          phone: custPhone.trim(),
          companyName: custCompany.trim() || undefined,
          password: `VNX@${custPhone.trim()}`,
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
          ? 'Dealer account created! Redirecting to storefront...'
          : 'Account created successfully! Redirecting...'
      );
      setTimeout(() => navigateByRole(), 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cardWidth =
    step === 3
      ? 'max-w-md'
      : isDealer
      ? 'max-w-4xl'
      : 'max-w-2xl';

  return (
    <div className={cn("w-full bg-white border border-gray-200/90 rounded-xl p-6 sm:p-8 shadow-sm relative z-10 transition-all duration-300", cardWidth)}>
      
      {/* Top Segmented Tabs: Login | Register (Mega Jaipur Style) */}
      <div className="grid grid-cols-2 rounded-md overflow-hidden bg-[#f4eff1] p-1 mb-5 border border-gray-200/60">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="py-2.5 text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-900 bg-transparent rounded transition-all duration-200 cursor-pointer"
        >
          Login
        </button>
        <button
          type="button"
          className="py-2.5 text-xs sm:text-sm font-bold bg-primary text-white shadow-sm rounded transition-all duration-200 cursor-pointer"
        >
          Register
        </button>
      </div>

      {/* Sub-tabs: Dealer / B2B vs Customer (Mega Jaipur Style) */}
      {step === 2 && (
        <div className="flex items-center justify-center gap-6 sm:gap-12 border-b border-gray-200 pb-2 mb-6">
          <button
            type="button"
            onClick={() => handleRoleChange('dealer')}
            className={cn(
              "flex items-center gap-2 text-xs sm:text-sm font-bold pb-2 transition-all border-b-2 cursor-pointer",
              role === 'dealer'
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            <Building2 className="w-4 h-4" /> Dealer / B2B
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('customer')}
            className={cn(
              "flex items-center gap-2 text-xs sm:text-sm font-bold pb-2 transition-all border-b-2 cursor-pointer",
              role === 'customer'
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            <User className="w-4 h-4" /> Customer
          </button>
        </div>
      )}

      {/* Form Heading */}
      {step === 2 && (
        <div className="text-left mb-5">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Create Account {isDealer && <span className="text-primary">(Dealer / B2B)</span>}
          </h2>
          <p className="text-xs text-gray-500">
            {isDealer
              ? 'Fill in your business & KYC details for wholesale dealer access'
              : 'Fill in your details to get started'}
          </p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 text-left">
          <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 text-left">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* STEP 2: CUSTOMER DETAILS FORM (Mega Jaipur Image 2 Style) */}
      {step === 2 && !isDealer && (
        <form onSubmit={handleStep2Submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                FULL NAME *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Your Full Name"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Company Name (Optional) */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                COMPANY NAME (OPTIONAL)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={custCompany}
                  onChange={(e) => setCustCompany(e.target.value)}
                  placeholder="Company Name"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                EMAIL ADDRESS *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Mobile Number (Mandatory) */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                MOBILE NUMBER *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit Mobile number"
                  maxLength={10}
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className="flex items-center text-xs pt-1 text-left">
            <label className="flex items-center gap-2.5 text-gray-600 hover:text-gray-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="sr-only"
              />
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs",
                  agreedTerms
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-gray-300 hover:border-gray-400"
                )}
              >
                {agreedTerms && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span>
                I have read and agree to the{' '}
                <Link to="/terms" target="_blank" className="font-bold text-primary hover:underline">
                  Terms & Conditions
                </Link>{' '}
                &{' '}
                <Link to="/privacy" target="_blank" className="font-bold text-primary hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded py-3 text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] disabled:opacity-50 mt-2 cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span>{loading ? 'Sending code...' : 'Create Account'}</span>
          </button>
        </form>
      )}

      {/* STEP 2: DEALER DETAILS & KYC FORM (Mega Jaipur Image 3 Style) */}
      {step === 2 && isDealer && (
        <form onSubmit={handleStep2Submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                FULL NAME *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={dealerName}
                  onChange={(e) => setDealerName(e.target.value)}
                  placeholder="Full Name of Proprietor / Authorized Person"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Company / Firm Name */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                COMPANY / FIRM NAME *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Business / Trade Registered Name"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                EMAIL ADDRESS *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={dealerEmail}
                  onChange={(e) => setDealerEmail(e.target.value)}
                  placeholder="Official Email Address"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                MOBILE NUMBER *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={dealerPhone}
                  onChange={(e) => setDealerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit Indian Mobile Number"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Business & KYC Verification Section */}
          <div className="space-y-3.5 pt-4 border-t border-gray-200 text-left">
            <div className="flex items-center gap-2 pb-1">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wide">
                Dealer Business & KYC Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  GSTIN NUMBER *
                </label>
                <input
                  type="text"
                  required
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="15-character GSTIN"
                  maxLength={15}
                  className={`${plainInputClass} uppercase`}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  AADHAAR NUMBER (12 DIGITS) *
                </label>
                <input
                  type="text"
                  required
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="12-digit Aadhaar number"
                  maxLength={12}
                  className={plainInputClass}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Document Uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FileDropField
                label="GST Certificate (Photo or PDF)"
                required
                file={gstFile}
                onChange={setGstFile}
                disabled={loading}
              />
              <FileDropField
                label="Aadhaar Card (Photo or PDF)"
                required
                file={aadhaarFile}
                onChange={setAadhaarFile}
                disabled={loading}
              />
            </div>

            {/* Business Address */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                BUSINESS ADDRESS (STREET, AREA) *
              </label>
              <textarea
                required
                value={dealerAddress}
                onChange={(e) => setDealerAddress(e.target.value)}
                placeholder="Shop / Office No, Building, Street, Area"
                rows={2}
                className={`${plainInputClass} resize-none`}
                disabled={loading}
              />
            </div>

            {/* State, City, Pincode in 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  STATE *
                </label>
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
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  CITY *
                </label>
                <SearchableSelect
                  value={selectedCity}
                  onChange={setSelectedCity}
                  options={getCitiesForState(selectedState)}
                  placeholder={selectedState ? 'Select City *' : 'Select state first'}
                  searchPlaceholder="Search cities..."
                  emptyMessage="No matching cities."
                  disabled={loading || !selectedState}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  PINCODE *
                </label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit Pincode"
                  maxLength={6}
                  className={plainInputClass}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className="flex items-center text-xs pt-1 text-left">
            <label className="flex items-center gap-2.5 text-gray-600 hover:text-gray-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="sr-only"
              />
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs",
                  agreedTerms
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-gray-300 hover:border-gray-400"
                )}
              >
                {agreedTerms && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span>
                I have read and agree to the{' '}
                <Link to="/terms" target="_blank" className="font-bold text-primary hover:underline">
                  Terms & Conditions
                </Link>{' '}
                &{' '}
                <Link to="/privacy" target="_blank" className="font-bold text-primary hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          {/* Submit Dealer Registration */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded py-3 text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] disabled:opacity-50 mt-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>{loading ? 'Sending verification code...' : 'Create Account & Submit KYC'}</span>
          </button>
        </form>
      )}

      {/* STEP 3: OTP VERIFICATION (Mega Jaipur Style) */}
      {step === 3 && (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              {isDealer ? <Phone className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Verify your {isDealer ? 'phone number' : 'email address'}
            </h3>
            <p className="text-xs text-gray-500">
              Enter the 6-digit code sent to <span className="font-bold text-gray-800">{otpIdentifier}</span>
            </p>
          </div>

          <div className="flex justify-center my-4">
            <OTPInput
              length={6}
              value={otp}
              onChange={setOtp}
              onComplete={(code) => setOtp(code)}
              label=""
              isDisabled={loading}
            />
          </div>

          <div className="text-center text-xs text-gray-500">
            Didn't get the code?{' '}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendLoading || loading}
              className="font-bold text-primary hover:underline disabled:opacity-50 cursor-pointer"
            >
              {resendLoading ? 'Resending...' : 'Resend'}
            </button>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={loading}
              className="px-4 py-2.5 rounded border border-gray-300 text-gray-600 hover:text-gray-900 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Edit details
            </button>
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold rounded py-2.5 text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Verifying...' : isDealer ? 'Verify & Submit KYC' : 'Verify & Create Account'}</span>
              {!loading && <FileCheck className="w-4 h-4" />}
            </button>
          </div>
        </form>
      )}

      {/* Bottom Switch Link */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-500 font-medium">
        <span>
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-bold text-primary hover:underline cursor-pointer"
          >
            Login
          </button>
        </span>
      </div>
    </div>
  );
};

export default SignupWizard;
