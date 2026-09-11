import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import dealerService from '../../services/dealerService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { User, Mail, Phone, ShieldCheck, Building2, Lock, FileCheck, ArrowRight } from 'lucide-react';

export const DealerProfilePage = () => {
  const { user } = useAuth();
  const [dealerProfile, setDealerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await dealerService.getDealerProfile();
        setDealerProfile(res.data?.profile || res.data || null);
      } catch (_err) {
        // No profile created yet is fine - handled via the empty state below
        setDealerProfile(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="border-b border-border pb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Account Overview</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <User className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            <span>Dealer Profile</span>
          </h1>
        </div>
        <Badge variant="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
          {user?.role?.toUpperCase() || 'DEALER'}
        </Badge>
      </div>

      {/* Account Info */}
      <Card className="bg-card p-6 rounded-2xl border border-border space-y-6 shadow-xs">
        <CardHeader className="p-0 pb-4 border-b border-border flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">Account Information (Read-Only)</CardTitle>
          <Lock className="w-4 h-4 text-muted-foreground" />
        </CardHeader>

        <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 bg-background p-4 rounded-xl border border-border">
            <span className="text-muted-foreground font-bold flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" /> Full Name
            </span>
            <span className="text-sm font-bold text-foreground block">
              {user?.fullName || user?.name || 'Vinexus Dealer'}
            </span>
          </div>

          <div className="space-y-1.5 bg-background p-4 rounded-xl border border-border">
            <span className="text-muted-foreground font-bold flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
            </span>
            <span className="text-sm font-mono font-medium text-foreground block">{user?.email || 'N/A'}</span>
          </div>

          <div className="space-y-1.5 bg-background p-4 rounded-xl border border-border">
            <span className="text-muted-foreground font-bold flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-primary" /> Mobile Number
            </span>
            <span className="text-sm font-mono font-medium text-foreground block">{user?.phone || 'N/A'}</span>
          </div>

          <div className="space-y-1.5 bg-background p-4 rounded-xl border border-border">
            <span className="text-muted-foreground font-bold flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Account Status
            </span>
            <span className="text-sm font-bold text-foreground uppercase block">{user?.accountStatus || 'Active'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Company / KYC Summary */}
      {loading ? (
        <SkeletonCard />
      ) : (
        <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 text-xs shadow-xs">
          <CardHeader className="p-0 pb-3 border-b border-border flex items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Business & KYC Details
            </CardTitle>
            {dealerProfile?.status && <StatusBadge status={dealerProfile.status} />}
          </CardHeader>

          <CardContent className="p-0">
            {dealerProfile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 bg-background p-4 rounded-xl border border-border">
                  <span className="text-muted-foreground font-bold block">Company Name</span>
                  <span className="text-sm font-bold text-foreground block">{dealerProfile.companyName || 'N/A'}</span>
                </div>
                <div className="space-y-1.5 bg-background p-4 rounded-xl border border-border">
                  <span className="text-muted-foreground font-bold block">GSTIN</span>
                  <span className="text-sm font-mono text-foreground block">{dealerProfile.gstin || 'N/A'}</span>
                </div>
                <div className="space-y-1.5 bg-background p-4 rounded-xl border border-border sm:col-span-2">
                  <span className="text-muted-foreground font-bold block">Registered Address</span>
                  <span className="text-sm text-foreground block">
                    {[dealerProfile.address, dealerProfile.city, dealerProfile.state, dealerProfile.pincode]
                      .filter(Boolean)
                      .join(', ') || 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground py-2">No business/KYC profile submitted yet.</p>
            )}

            <Link
              to="/dealer/kyc"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              <FileCheck className="w-3.5 h-3.5" />
              {dealerProfile ? 'Update KYC & Business Details' : 'Complete KYC Submission'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DealerProfilePage;
