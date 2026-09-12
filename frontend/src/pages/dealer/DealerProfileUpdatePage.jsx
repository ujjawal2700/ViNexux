import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import dealerService from '../../services/dealerService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  User,
  Mail,
  Phone,
  Building2,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
  AlertCircle,
} from 'lucide-react';

export const DealerProfileUpdatePage = () => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Personal Info State
  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Business Info State
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDealerProfile = async () => {
      try {
        const res = await dealerService.getDealerProfile();
        const dp = res.data?.profile || res.data || {};
        if (dp.companyName) setCompanyName(dp.companyName);
        if (dp.gstin) setGstin(dp.gstin);
        if (dp.pan) setPan(dp.pan);
        if (dp.address) setAddress(dp.address);
        if (dp.city) setCity(dp.city);
        if (dp.state) setStateName(dp.state);
        if (dp.pincode) setPincode(dp.pincode);
      } catch (_err) {
        // No existing dealer profile fine
      }
    };
    loadDealerProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim() || !companyName.trim()) {
      setError('Full Name, Email Address, Mobile Number, and Company Name are required.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New password and Confirm Password do not match.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        companyName: companyName.trim(),
        gstin: gstin.trim().toUpperCase(),
        pan: pan.trim().toUpperCase(),
        address: address.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
        ...(newPassword
          ? {
              currentPassword,
              newPassword,
            }
          : {}),
      };

      const res = await updateProfile(payload);

      if (res.success) {
        toast.success('Dealer profile updated successfully! New credentials are now active.');
        setTimeout(() => {
          navigate('/dealer/profile');
        }, 1000);
      } else {
        setError(res.message || 'Failed to update profile details.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Account Management</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <User className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            <span>Update Dealer Profile</span>
          </h1>
        </div>

        <Link to="/dealer/profile">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Profile
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <Card className="bg-card p-6 rounded-2xl border border-border space-y-5 shadow-xs">
          <CardHeader className="p-0 pb-3 border-b border-border">
            <CardTitle className="text-base font-bold text-foreground">Personal Contact Information</CardTitle>
          </CardHeader>

          <CardContent className="p-0 space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter Full Name"
                  className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Email Address * (Used for Sign In)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email Address"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Mobile Number * (Used for OTP Sign In)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter Mobile Number"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dealer Business Details */}
        <Card className="bg-card p-6 rounded-2xl border border-border space-y-5 shadow-xs">
          <CardHeader className="p-0 pb-3 border-b border-border">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Dealer Business Details
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                Business / Company Name *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter Company Name"
                className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                  GSTIN Number
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="Enter GSTIN Number"
                  className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="Enter PAN Number"
                  className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                Registered Office Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter Street Address"
                className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="State"
                  className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Pincode
                </label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pincode"
                  className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Password */}
        <Card className="bg-card p-6 rounded-2xl border border-border space-y-5 shadow-xs">
          <CardHeader className="p-0 pb-3 border-b border-border">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> Security & Password Update
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 space-y-4 text-xs">
            <p className="text-xs text-muted-foreground font-medium">
              Leave password fields blank if you do not wish to change your current password.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter Current Password"
                  className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-11 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter New Password"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-11 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter New Password"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/dealer/profile">
            <Button variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="md" isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DealerProfileUpdatePage;
