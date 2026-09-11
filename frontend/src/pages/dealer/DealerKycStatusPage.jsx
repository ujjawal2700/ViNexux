import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import dealerService from '../../services/dealerService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileCheck,
  Building2,
  FileText,
  ExternalLink,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const DealerKycStatusPage = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await dealerService.getDealerProfile();
      const prof = res.data?.profile || res.profile || res.data;
      setProfile(prof);
    } catch (err) {
      if (err.response?.status === 404) {
        setProfile(null);
      } else {
        console.error('KYC status fetch error:', err);
        setError('Unable to load KYC status telemetry.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="KYC Status Error" description={error} onRetry={fetchStatus} />;
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-primary mx-auto">
          <FileCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-foreground">No KYC Profile Created Yet</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Please submit your company profile details and GST/PAN verification documents to unlock dealer wholesale pricing.
          </p>
        </div>
        <Link to="/dealer/kyc">
          <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Create Dealer Profile & Upload KYC
          </Button>
        </Link>
      </div>
    );
  }

  const status = profile.status || 'pending';
  const kycDocs = profile.kycDocuments || [];

  return (
    <div className="space-y-8 text-foreground max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="border-b border-border pb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Account Audit Center</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <span>KYC Verification Status</span>
          </h1>
        </div>

        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={fetchStatus}>
          Refresh Status
        </Button>
      </div>

      {/* STATUS DISPLAY BANNER */}
      {status === 'approved' ? (
        <Card className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">KYC Status: Approved</h3>
                <span className="text-xs text-emerald-700 font-semibold">Tier 1 Wholesale Rates Unlocked</span>
              </div>
            </div>
            <StatusBadge status="approved" />
          </div>
          <p className="text-xs text-[#664448] leading-relaxed">
            Your business profile and tax documents have been audited and approved by Vinexus Admin. Discounted dealer rates are active across the product catalog.
          </p>
        </Card>
      ) : status === 'rejected' ? (
        <Card className="bg-rose-50 p-6 rounded-2xl border border-rose-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">KYC Status: Rejected</h3>
                <span className="text-xs text-rose-700 font-semibold">Action Required</span>
              </div>
            </div>
            <StatusBadge status="rejected" />
          </div>

          <div className="p-4 rounded-xl bg-card border border-rose-200 text-xs space-y-1">
            <span className="font-bold text-rose-700 block uppercase text-[10px]">Rejection Reason</span>
            <p className="text-foreground font-medium">
              "{profile.rejectionReason || 'Submitted documentation was incomplete or invalid.'}"
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Link to="/dealer/kyc">
              <Button variant="danger" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Resubmit KYC Information
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="bg-amber-50 p-6 rounded-2xl border border-amber-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">KYC Status: Under Review</h3>
                <span className="text-xs text-amber-800 font-semibold">Standard Rates Apply</span>
              </div>
            </div>
            <StatusBadge status="pending" />
          </div>
          <p className="text-xs text-[#664448] leading-relaxed">
            Your submitted company profile and tax verification files are currently in queue for Vinexus commercial verification. Reviews are typically processed within 24-48 hours.
          </p>
        </Card>
      )}

      {/* SUBMITTED PROFILE DATA SUMMARY */}
      <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
        <CardHeader className="p-0 pb-3 border-b border-border flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Building2 className="w-4 h-4 text-primary" />
            <span>Submitted Business Telemetry</span>
          </CardTitle>
          <Link to="/dealer/kyc">
            <Button variant="outline" size="sm">
              Edit Details
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1 bg-background p-3 rounded-xl border border-border">
            <span className="text-[#9a6870] block text-[10px]">Company Name</span>
            <span className="font-bold text-foreground block">{profile.companyName}</span>
          </div>

          <div className="space-y-1 bg-background p-3 rounded-xl border border-border">
            <span className="text-[#9a6870] block text-[10px]">GSTIN Number</span>
            <span className="font-mono font-bold text-foreground block">{profile.gstin || 'Not Provided'}</span>
          </div>

          <div className="space-y-1 bg-background p-3 rounded-xl border border-border">
            <span className="text-[#9a6870] block text-[10px]">PAN Number</span>
            <span className="font-mono font-bold text-foreground block">{profile.pan || 'Not Provided'}</span>
          </div>

          <div className="space-y-1 bg-background p-3 rounded-xl border border-border">
            <span className="text-[#9a6870] block text-[10px]">Registered Location</span>
            <span className="font-bold text-foreground block">
              {profile.city ? `${profile.city}, ${profile.state || ''} ${profile.pincode || ''}` : 'Not Provided'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* SUBMITTED DOCUMENTS CHECKLIST */}
      <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
        <CardHeader className="p-0 pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <FileText className="w-4 h-4 text-primary" />
            <span>Submitted KYC Verification Files</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 space-y-3 text-xs">
          {['gst', 'pan', 'aadhaar'].map((docType) => {
            const doc = kycDocs.find((d) => d.type === docType);
            return (
              <div key={docType} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-bold uppercase text-foreground">{docType} Document</span>
                </div>

                {doc ? (
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground">
                      Uploaded {new Date(doc.uploadedAt || profile.updatedAt).toLocaleDateString()}
                    </span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <span className="text-rose-600 font-semibold italic">Missing</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerKycStatusPage;
