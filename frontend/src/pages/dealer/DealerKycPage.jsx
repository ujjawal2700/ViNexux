import React, { useState, useEffect, useCallback } from 'react';
import dealerService from '../../services/dealerService';
import useToast from '../../hooks/useToast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  FileCheck,
  Upload,
  Trash2,
  Building2,
  FileText,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle,
  File,
} from 'lucide-react';

const KYC_DOCUMENT_TYPES = [
  { type: 'gst', title: 'GST Certificate', required: true },
  { type: 'aadhaar', title: 'Aadhaar Card', required: true },
  { type: 'msme', title: 'MSME Certificate', required: false },
];

export const DealerKycPage = () => {
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [deletingType, setDeletingType] = useState(null);
  const [error, setError] = useState(null);

  // Form Fields State
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

  // Fetch Dealer Profile on Mount
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
      // Profile 404 is normal for newly registered dealers who haven't created a profile yet
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

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const finalVal = (name === 'gstin' || name === 'pan') ? value.toUpperCase() : value;
    setFormData((prev) => ({ ...prev, [name]: finalVal }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Zod / Regex Validation
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

  // Submit Profile Form (Create or Update)
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

      const updatedProf = res.data?.profile || res.profile || res.data;
      setProfile(updatedProf);
    } catch (err) {
      console.error('Save profile error:', err);
      const errMsg = err.response?.data?.message || 'Failed to save dealer profile.';
      toast.error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Document File Upload
  const handleFileUpload = async (type, file) => {
    if (!file) return;

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds maximum limit of 5 MB.');
      return;
    }

    // Check allowed file types
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error('Invalid file format. Please upload JPG, PNG, or PDF.');
      return;
    }

    if (!profile) {
      toast.error('Please save your company profile details before uploading KYC documents.');
      return;
    }

    try {
      setUploadingType(type);
      const res = await dealerService.uploadKycDocument(type, file);
      const updatedProf = res.data?.profile || res.profile || res.data;
      setProfile(updatedProf);
      toast.success(`${type.toUpperCase()} document uploaded successfully!`);
    } catch (err) {
      console.error('File upload error:', err);
      const errMsg = err.response?.data?.message || 'Failed to upload document.';
      toast.error(errMsg);
    } finally {
      setUploadingType(null);
    }
  };

  // Handle Document File Delete
  const handleDeleteDocument = async (type) => {
    try {
      setDeletingType(type);
      const res = await dealerService.deleteKycDocument(type);
      const updatedProf = res.data?.profile || res.profile || res.data;
      setProfile(updatedProf);
      toast.success(`${type.toUpperCase()} document deleted.`);
    } catch (err) {
      console.error('File delete error:', err);
      const errMsg = err.response?.data?.message || 'Failed to delete document.';
      toast.error(errMsg);
    } finally {
      setDeletingType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
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
    <div className="space-y-8 text-foreground max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Onboarding & Verification</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <FileCheck className="w-7 h-7 text-primary" />
            <span>KYC Profile & Document Submission</span>
          </h1>
        </div>

        {profile && <StatusBadge status={profile.status} />}
      </div>

      {/* Critical KYC Update Notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-foreground">Automatic KYC Status Notice</span>
          <p className="text-[#664448] leading-relaxed">
            Updating GSTIN, PAN, or replacing KYC document files will automatically reset your verification status to <span className="font-bold text-amber-800 font-mono">pending</span> review for admin audit.
          </p>
        </div>
      </div>

      {/* SECTION 1: BUSINESS PROFILE FORM */}
      <form onSubmit={handleSubmitProfile} className="space-y-6">
        <Card className="bg-card p-6 rounded-2xl border border-border space-y-6 shadow-sm">
          <CardHeader className="p-0 pb-4 border-b border-border flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5 text-primary" />
              <span>Company & Tax Information</span>
            </CardTitle>
            <Badge variant="primary">Step 1</Badge>
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
              <Input
                label="City"
                name="city"
                placeholder="e.g. Mumbai"
                value={formData.city}
                onChange={handleInputChange}
              />
              <Input
                label="State"
                name="state"
                placeholder="e.g. Maharashtra"
                value={formData.state}
                onChange={handleInputChange}
              />
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
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {profile ? 'Update Business Profile' : 'Save & Create Profile'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* SECTION 2: KYC DOCUMENT UPLOADERS */}
      <div className="space-y-6">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span>Required KYC Verification Documents</span>
          </h2>
          <Badge variant="primary">Step 2</Badge>
        </div>

        {/* Mandatory documents completion progress */}
        {(() => {
          const mandatoryTypes = KYC_DOCUMENT_TYPES.filter((d) => d.required);
          const uploadedMandatory = mandatoryTypes.filter((d) => getDoc(d.type)).length;
          const isComplete = uploadedMandatory === mandatoryTypes.length;
          return (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-3 shadow-sm ${
                isComplete
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold block text-foreground">
                  {uploadedMandatory} of {mandatoryTypes.length} mandatory documents uploaded
                </span>
                <p className="leading-relaxed">
                  {isComplete
                    ? 'GST Certificate and Aadhaar Card are on file. Your registration is complete and pending admin review.'
                    : 'GST Certificate and Aadhaar Card are mandatory to complete your dealer registration. MSME Certificate is optional.'}
                </p>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

          {/* Document Card Helper Function */}
          {KYC_DOCUMENT_TYPES.map(({ type: docType, title: typeTitle, required }) => {
            const doc = getDoc(docType);
            const isUploading = uploadingType === docType;
            const isDeleting = deletingType === docType;

            return (
              <Card
                key={docType}
                className="bg-card p-5 rounded-2xl border border-border flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {docType.toUpperCase()} Doc
                    </span>
                    {doc ? (
                      <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                        Uploaded
                      </Badge>
                    ) : required ? (
                      <Badge variant="warning">Missing</Badge>
                    ) : (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-foreground text-sm mb-1">
                    {typeTitle}
                    {required && <span className="text-rose-600"> *</span>}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Accepted formats: JPG, PNG, WEBP, PDF (Max 5 MB)</p>
                </div>

                {doc ? (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-xs bg-background p-2.5 rounded-xl border border-border truncate">
                      <File className="w-4 h-4 text-primary shrink-0" />
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate font-mono"
                      >
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
                        <Button
                          variant="outline"
                          size="sm"
                          fullWidth
                          isLoading={isUploading}
                          leftIcon={<Upload className="w-3.5 h-3.5" />}
                        >
                          Replace
                        </Button>
                      </label>

                      <Button
                        variant="danger"
                        size="sm"
                        iconOnly
                        isLoading={isDeleting}
                        title="Delete Document"
                        onClick={() => handleDeleteDocument(docType)}
                      >
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
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        isLoading={isUploading}
                        leftIcon={<Upload className="w-3.5 h-3.5" />}
                      >
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

export default DealerKycPage;
