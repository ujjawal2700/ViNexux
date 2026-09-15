import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import dealerService from '../../services/dealerService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { AddressBookSection } from '../../components/address/AddressBookSection';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  MapPin,
  Edit3,
  Building2,
  FileText,
  ExternalLink,
  Clock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

const KYC_DOC_TYPES = [
  { type: 'gst', required: true },
  { type: 'aadhaar', required: true },
  { type: 'msme', required: false },
];

/**
 * Unified account overview for both customer and dealer roles. Customers
 * get personal info + saved addresses; dealers additionally get a
 * Business & KYC Verification card (ported from the old DealerKycStatusPage)
 * since dealers need KYC approval to be flagged as a dealer at all.
 */
export const ProfilePage = () => {
  const { user } = useAuth();
  const isDealer = user?.role === 'dealer';

  const [dealerProfile, setDealerProfile] = useState(null);
  const [dealerLoading, setDealerLoading] = useState(isDealer);
  const [dealerError, setDealerError] = useState(null);

  const fetchDealerProfile = useCallback(async () => {
    if (!isDealer) return;
    setDealerLoading(true);
    setDealerError(null);
    try {
      const res = await dealerService.getDealerProfile();
      setDealerProfile(res.data?.profile || res.profile || res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setDealerProfile(null);
      } else {
        console.error('Failed to load dealer KYC profile:', err);
        setDealerError('Unable to load KYC status.');
      }
    } finally {
      setDealerLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDealer]);

  useEffect(() => {
    fetchDealerProfile();
  }, [fetchDealerProfile]);

  return (
    <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-background text-foreground min-h-screen">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Account Overview</span>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <User className="w-7 h-7 text-primary" />
            <span>My Profile</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            Verified Account
          </Badge>
          <Link to="/account/profile/update">
            <Button variant="primary" size="sm" leftIcon={<Edit3 className="w-4 h-4" />}>
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Personal Information */}
      <Card className="bg-card p-6 rounded-2xl border border-border space-y-6 shadow-sm">
        <CardHeader className="p-0 pb-4 border-b border-border flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">Personal Information</CardTitle>
          <Link to="/account/profile/update" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" /> Edit Details
          </Link>
        </CardHeader>

        <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 text-xs">
          <div className="space-y-1.5 bg-muted/40 p-4 rounded-2xl border border-border">
            <span className="text-muted-foreground font-bold block flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" /> Full Name
            </span>
            <span className="text-sm font-bold text-foreground block">
              {user?.fullName || user?.name || 'Vinexus Account'}
            </span>
          </div>

          <div className="space-y-1.5 bg-muted/40 p-4 rounded-2xl border border-border">
            <span className="text-muted-foreground font-bold block flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
            </span>
            <span className="text-sm font-mono font-medium text-foreground block">{user?.email || 'N/A'}</span>
          </div>

          <div className="space-y-1.5 bg-muted/40 p-4 rounded-2xl border border-border">
            <span className="text-muted-foreground font-bold block flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-primary" /> Mobile Number
            </span>
            <span className="text-sm font-mono font-medium text-foreground block">
              {user?.phone || user?.identifier || 'N/A'}
            </span>
          </div>

          <div className="space-y-1.5 bg-muted/40 p-4 rounded-2xl border border-border">
            <span className="text-muted-foreground font-bold block flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Account Role
            </span>
            <span className="text-sm font-extrabold text-foreground uppercase block">{user?.role || 'Customer'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Business & KYC Verification - dealer only */}
      {isDealer && (
        <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
          <CardHeader className="p-0 pb-3 border-b border-border flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Business & KYC Verification</span>
            </CardTitle>
            {dealerProfile && <StatusBadge status={dealerProfile.status} />}
          </CardHeader>

          <CardContent className="p-0">
            {dealerLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : dealerError ? (
              <p className="text-xs text-rose-600">{dealerError}</p>
            ) : !dealerProfile ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You haven't submitted your company profile and KYC documents yet. This is required to unlock dealer
                  wholesale pricing.
                </p>
                <Link to="/account/profile/update">
                  <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Start KYC Submission
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {dealerProfile.status === 'rejected' && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> KYC Rejected - Action Required
                    </div>
                    <p className="text-rose-900/80 dark:text-rose-300/80">
                      Reason: "{dealerProfile.rejectionReason || 'Submitted documentation was incomplete or invalid.'}"
                    </p>
                    <Link to="/account/profile/update">
                      <Button variant="danger" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Resubmit KYC Documents
                      </Button>
                    </Link>
                  </div>
                )}
                {dealerProfile.status === 'pending' && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-amber-900 dark:text-amber-300">
                      Your business profile and documents are under Vinexus admin review. Standard pricing applies
                      until approved.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="space-y-1 bg-background p-3 rounded-xl border border-border">
                    <span className="text-muted-foreground block text-[10px]">Company Name</span>
                    <span className="font-bold text-foreground block">{dealerProfile.companyName}</span>
                  </div>
                  <div className="space-y-1 bg-background p-3 rounded-xl border border-border">
                    <span className="text-muted-foreground block text-[10px]">GSTIN Number</span>
                    <span className="font-mono font-bold text-foreground block">{dealerProfile.gstin || 'Not Provided'}</span>
                  </div>
                  <div className="space-y-1 bg-background p-3 rounded-xl border border-border">
                    <span className="text-muted-foreground block text-[10px]">PAN Number</span>
                    <span className="font-mono font-bold text-foreground block">{dealerProfile.pan || 'Not Provided'}</span>
                  </div>
                  <div className="space-y-1 bg-background p-3 rounded-xl border border-border">
                    <span className="text-muted-foreground block text-[10px]">Registered Location</span>
                    <span className="font-bold text-foreground block">
                      {dealerProfile.city ? `${dealerProfile.city}, ${dealerProfile.state || ''} ${dealerProfile.pincode || ''}` : 'Not Provided'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Submitted KYC Documents
                  </h4>
                  {KYC_DOC_TYPES.map(({ type: docType, required }) => {
                    const doc = (dealerProfile.kycDocuments || []).find((d) => d.type === docType);
                    return (
                      <div key={docType} className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                        <span className="font-bold uppercase text-foreground">
                          {docType}
                          {!required && <span className="text-muted-foreground normal-case font-normal"> (Optional)</span>}
                        </span>
                        {doc ? (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 font-semibold">
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : required ? (
                          <span className="text-rose-600 font-semibold italic">Missing</span>
                        ) : (
                          <span className="text-muted-foreground italic">Not uploaded</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saved Addresses - both roles */}
      <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
        <CardHeader className="p-0 pb-3 border-b border-border">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Saved Addresses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AddressBookSection />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
