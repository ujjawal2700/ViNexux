import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import dealerService from '../../services/dealerService';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
  AlertCircle,
  FileCheck,
  Upload,
  Trash2,
  Building2,
  FileText,
  ShieldAlert,
  CheckCircle2,
  File,
} from 'lucide-react';

const KYC_DOCUMENT_TYPES = [
  { type: 'gst', title: 'GST Certificate', required: true },
  { type: 'aadhaar', title: 'Aadhaar Card', required: true },
  { type: 'msme', title: 'MSME Certificate', required: false },
];

/**
 * Dealer-only Business & KYC section - a direct port of the old standalone
 * DealerKycPage, unchanged in behavior. Same validators, same
 * dealerService calls, same auto-reset-to-pending notice, same document
 * upload/replace/delete controls. Relocated here per the "same
 * functionality, just a different location" instruction.
 */
const DealerKycSection = () => {
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [deletingType, setDeletingType] = useState(null);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    companyName: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await dealerService.getDealerProfile();
      const prof = res.data?.profile || res.profile || res.data;
      if (prof) {
        setProfile(prof);
        setFormData({
          companyName: prof.companyName || '',
          gstin: prof.gstin || '',
          pan: prof.pan || '',
          address: prof.address || '',
          city: prof.city || '',
          state: prof.state || '',
          pincode: prof.pincode || '',
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setProfile(null);
      } else {
        console.error('Failed to load dealer profile:', err);
        setError('Unable to load dealer profile data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const finalVal = (name === 'gstin' || name === 'pan') ? value.toUpperCase() : value;
    setFormData((prev) => ({ ...prev, [name]: finalVal }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const pincodeRegex = /^\d{6}$/;

    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    } else if (formData.companyName.trim().length < 2) {
      errors.companyName = 'Company name must be at least 2 characters';
    }
    if (formData.gstin.trim() && !gstinRegex.test(formData.gstin.trim())) {
      errors.gstin = 'Invalid GSTIN format (15 uppercase chars, e.g. 27ABCDE1234F1Z5)';
    }
    if (formData.pan.trim() && !panRegex.test(formData.pan.trim())) {
      errors.pan = 'Invalid PAN format (10 uppercase chars, e.g. ABCDE1234F)';
    }
    if (formData.pincode.trim() && !pincodeRegex.test(formData.pincode.trim())) {
      errors.pincode = 'Pincode must be exactly 6 digits';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the validation errors in the form.');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        companyName: formData.companyName.trim(),
        gstin: formData.gstin.trim() || undefined,
        pan: formData.pan.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
      };

      let res;
      if (profile) {
        res = await dealerService.updateDealerProfile(payload);
        toast.success('Dealer profile updated successfully!');
      } else {
        res = await dealerService.createDealerProfile(payload);
        toast.success('Dealer profile created successfully!');
      }

      setProfile(res.data?.profile || res.profile || res.data);
    } catch (err) {
      console.error('Save profile error:', err);
      toast.error(err.response?.data?.message || 'Failed to save dealer profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (type, file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds maximum limit of 5 MB.');
      return;
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error('Invalid file format. Please upload JPG, PNG, WEBP, or PDF.');
      return;
    }

    if (!profile) {
      toast.error('Please save your company profile details before uploading KYC documents.');
      return;
    }

    try {
      setUploadingType(type);
      const res = await dealerService.uploadKycDocument(type, file);
      setProfile(res.data?.profile || res.profile || res.data);
      toast.success(`${type.toUpperCase()} document uploaded successfully!`);
    } catch (err) {
      console.error('File upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleDeleteDocument = async (type) => {
    try {
      setDeletingType(type);
      const res = await dealerService.deleteKycDocument(type);
      setProfile(res.data?.profile || res.profile || res.data);
      toast.success(`${type.toUpperCase()} document deleted.`);
    } catch (err) {
      console.error('File delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete document.');
    } finally {
      setDeletingType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Profile Error" description={error} onRetry={fetchProfile} />;
  }

  const kycDocs = profile?.kycDocuments || [];
  const getDoc = (type) => kycDocs.find((d) => d.type === type);

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          <span>Business & KYC Verification</span>
        </h2>
        {profile && <StatusBadge status={profile.status} />}
      </div>

      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-amber-950 dark:text-amber-200">Automatic KYC Status Notice</span>
          <p className="text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
            Updating GSTIN, PAN, or replacing KYC document files will automatically reset your verification status to{' '}
            <span className="font-bold text-amber-800 dark:text-amber-200 font-mono">pending</span> review for admin audit.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmitProfile} className="space-y-6">
        <Card className="bg-card p-6 rounded-2xl border border-border space-y-6 shadow-sm">
          <CardHeader className="p-0 pb-4 border-b border-border flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5 text-primary" />
              <span>Company & Tax Information</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 space-y-4">
            <Input
              label="Company / Firm Registered Name *"
              name="companyName"
              placeholder="e.g. Apex Security Systems Pvt Ltd"
              value={formData.companyName}
              onChange={handleInputChange}
              error={formErrors.companyName}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="GSTIN Number (15 uppercase chars)"
                name="gstin"
                placeholder="27ABCDE1234F1Z5"
                value={formData.gstin}
                onChange={handleInputChange}
                error={formErrors.gstin}
              />
              <Input
                label="PAN Number (10 uppercase chars)"
                name="pan"
                placeholder="ABCDE1234F"
                value={formData.pan}
                onChange={handleInputChange}
                error={formErrors.pan}
              />
            </div>

            <Input
              label="Business Registered Address"
              name="address"
              placeholder="Shop No, Building, Commercial Area..."
              value={formData.address}
              onChange={handleInputChange}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="City" name="city" placeholder="e.g. Mumbai" value={formData.city} onChange={handleInputChange} />
              <Input label="State" name="state" placeholder="e.g. Maharashtra" value={formData.state} onChange={handleInputChange} />
              <Input
                label="Pincode (6 digits)"
                name="pincode"
                placeholder="400001"
                value={formData.pincode}
                onChange={handleInputChange}
                error={formErrors.pincode}
              />
            </div>
          </CardContent>

          <CardFooter className="p-0 pt-4 border-t border-border flex justify-end">
            <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
              {profile ? 'Update Business Profile' : 'Save & Create Profile'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <div className="space-y-6">
        <div className="border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Required KYC Verification Documents</span>
          </h3>
        </div>

        {(() => {
          const mandatoryTypes = KYC_DOCUMENT_TYPES.filter((d) => d.required);
          const uploadedMandatory = mandatoryTypes.filter((d) => getDoc(d.type)).length;
          const isComplete = uploadedMandatory === mandatoryTypes.length;
          return (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-3 shadow-sm ${
                isComplete
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              {isComplete ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
              <div>
                <span className={`font-bold block ${isComplete ? 'text-emerald-950 dark:text-emerald-200' : 'text-rose-950 dark:text-rose-200'}`}>
                  {uploadedMandatory} of {mandatoryTypes.length} mandatory documents uploaded
                </span>
                <p className="leading-relaxed opacity-80">
                  {isComplete
                    ? 'GST Certificate and Aadhaar Card are on file. Your registration is complete and pending admin review.'
                    : 'GST Certificate and Aadhaar Card are mandatory to complete your dealer registration. MSME Certificate is optional.'}
                </p>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {KYC_DOCUMENT_TYPES.map(({ type: docType, title: typeTitle, required }) => {
            const doc = getDoc(docType);
            const isUploading = uploadingType === docType;
            const isDeleting = deletingType === docType;

            return (
              <Card key={docType} className="bg-card p-5 rounded-2xl border border-border flex flex-col justify-between space-y-4 shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{docType.toUpperCase()} Doc</span>
                    {doc ? (
                      <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>Uploaded</Badge>
                    ) : required ? (
                      <Badge variant="warning">Missing</Badge>
                    ) : (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </div>
                  <h4 className="font-bold text-foreground text-sm mb-1">
                    {typeTitle}
                    {required && <span className="text-rose-600"> *</span>}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Accepted formats: JPG, PNG, WEBP, PDF (Max 5 MB)</p>
                </div>

                {doc ? (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-xs bg-background p-2.5 rounded-xl border border-border truncate">
                      <File className="w-4 h-4 text-primary shrink-0" />
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate font-mono">
                        View Uploaded File
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(docType, e.target.files[0])}
                          disabled={isUploading || isDeleting}
                        />
                        <Button variant="outline" size="sm" fullWidth isLoading={isUploading} leftIcon={<Upload className="w-3.5 h-3.5" />}>
                          Replace
                        </Button>
                      </label>
                      <Button variant="danger" size="sm" iconOnly isLoading={isDeleting} title="Delete Document" onClick={() => handleDeleteDocument(docType)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-border">
                    <label className="block w-full">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        className="hidden"
                        onChange={(e) => handleFileUpload(docType, e.target.files[0])}
                        disabled={isUploading}
                      />
                      <Button variant="primary" size="sm" fullWidth isLoading={isUploading} leftIcon={<Upload className="w-3.5 h-3.5" />}>
                        Upload {docType.toUpperCase()} File
                      </Button>
                    </label>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const ProfileUpdatePage = () => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const isDealer = user?.role === 'dealer';

  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || user?.identifier || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError('Full Name, Email Address, and Mobile Number are required.');
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
        ...(newPassword ? { currentPassword, newPassword } : {}),
      };

      const res = await updateProfile(payload);

      if (res.success) {
        toast.success('Profile updated successfully! New credentials are now active.');
        setTimeout(() => {
          navigate('/account/profile');
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
    <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-background text-foreground min-h-screen">
      <div className="border-b border-border pb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Account Management</span>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <User className="w-7 h-7 text-primary" />
            <span>Update Profile</span>
          </h1>
        </div>

        <Link to="/account/profile">
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
        <Card className="bg-card p-6 rounded-2xl border border-border space-y-5 shadow-sm">
          <CardHeader className="p-0 pb-3 border-b border-border">
            <CardTitle className="text-base font-bold text-foreground">Personal Details</CardTitle>
          </CardHeader>

          <CardContent className="p-0 space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">Full Name *</label>
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

        <Card className="bg-card p-6 rounded-2xl border border-border space-y-5 shadow-sm">
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
              <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">Current Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter Current Password"
                  className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-11 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter New Password"
                    className="w-full bg-muted/40 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-11 py-3 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-medium"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">Confirm New Password</label>
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/account/profile">
            <Button variant="outline" size="md">Cancel</Button>
          </Link>
          <Button type="submit" variant="primary" size="md" isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        </div>
      </form>

      {/* Business & KYC - dealer only, direct port of the old DealerKycPage */}
      {isDealer && (
        <div className="pt-4 border-t border-border">
          <DealerKycSection />
        </div>
      )}
    </div>
  );
};

export default ProfileUpdatePage;
