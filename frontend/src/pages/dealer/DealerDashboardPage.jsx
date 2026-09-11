import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import dealerService from '../../services/dealerService';
import enquiryService from '../../services/enquiryService';
import cartService from '../../services/cartService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Tag,
  FileCheck,
  ShoppingBag,
  Send,
  Building2,
  ArrowRight,
  Eye,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const DealerDashboardPage = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [recentEnquiries, setRecentEnquiries] = useState([]);
  const [cartCount, setCartCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Dashboard Telemetry
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      // 1. Fetch Dealer Profile
      try {
        const profRes = await dealerService.getDealerProfile();
        const profData = profRes.data?.profile || profRes.profile || profRes.data;
        setProfile(profData);
      } catch (profErr) {
        // Handle 404 cleanly if dealer hasn't created a profile yet
        console.warn('Dealer profile not created yet or fetch error:', profErr);
      }

      // 2. Fetch Recent Enquiries
      try {
        const enqRes = await enquiryService.getMyEnquiries({ limit: 3, sortBy: 'createdAt', sortOrder: 'desc' });
        const list = enqRes.data?.enquiries || enqRes.enquiries || [];
        setRecentEnquiries(list);
      } catch (enqErr) {
        console.warn('Dealer recent enquiries error:', enqErr);
      }

      // 3. Fetch Cart Items Count
      try {
        const cartRes = await cartService.getCart();
        const items = cartRes.data?.cart?.items || cartRes.cart?.items || [];
        const count = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        setCartCount(count);
      } catch (cartErr) {
        console.warn('Dealer cart count error:', cartErr);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const kycStatus = profile?.status || 'pending';

  return (
    <div className="space-y-8 text-foreground">
      
      {/* 1. DYNAMIC KYC STATUS BANNER */}
      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : kycStatus === 'approved' ? (
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-base">Verified Dealer Account</span>
                <Badge variant="success">Wholesale Pricing Unlocked</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Verified Commercial Account! Exclusive dealer pricing is active across all CCTV & security catalog items.
              </p>
            </div>
          </div>
          <Link to="/dealer/pricing" className="shrink-0">
            <Button variant="success" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Browse Wholesale Rates
            </Button>
          </Link>
        </div>
      ) : kycStatus === 'rejected' ? (
        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-base">KYC Verification Rejected</span>
                <Badge variant="danger">Action Required</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Reason: <span className="text-rose-700 font-semibold">{profile?.rejectionReason || 'Documents require resubmission'}</span>. Please update your profile or documents.
              </p>
            </div>
          </div>
          <Link to="/dealer/kyc" className="shrink-0">
            <Button variant="danger" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Resubmit KYC Documents
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-base">KYC Verification Under Review</span>
                <Badge variant="warning">Standard Rates Apply</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your KYC profile & documents are currently under review by Vinexus Admin. Standard pricing applies until verified.
              </p>
            </div>
          </div>
          <Link to="/dealer/kyc/status" className="shrink-0">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Check KYC Status
            </Button>
          </Link>
        </div>
      )}

      {/* 2. DEALER PROFILE SUMMARY & STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Profile Card */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-primary">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-base">
                    {profile?.companyName || 'Business Entity Profile'}
                  </h3>
                  <span className="text-xs text-muted-foreground">Registered Partner Account</span>
                </div>
              </div>
              <StatusBadge status={kycStatus} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-background p-3 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px]">GSTIN Number</span>
                <span className="font-mono font-bold text-foreground block truncate">
                  {profile?.gstin || 'Not Provided'}
                </span>
              </div>
              <div className="bg-background p-3 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px]">PAN Number</span>
                <span className="font-mono font-bold text-foreground block truncate">
                  {profile?.pan || 'Not Provided'}
                </span>
              </div>
              <div className="bg-background p-3 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px]">Location</span>
                <span className="font-bold text-foreground block truncate">
                  {profile?.city ? `${profile.city}, ${profile.state || ''}` : 'India'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Link to="/dealer/kyc">
                <Button variant="outline" size="sm" leftIcon={<FileCheck className="w-4 h-4" />}>
                  {profile ? 'Edit Business Profile' : 'Setup Dealer Profile'}
                </Button>
              </Link>
            </div>
          </Card>

          {/* RECENT WHOLESALE ENQUIRIES FEED */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                <span>Recent Wholesale Enquiries</span>
              </h3>
              <Link to="/dealer/enquiries" className="text-xs text-primary hover:text-primary/80 font-semibold">
                View All Enquiries →
              </Link>
            </div>

            {isLoading ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : recentEnquiries.length > 0 ? (
              <div className="space-y-3">
                {recentEnquiries.map((enq) => (
                  <div
                    key={enq._id}
                    className="bg-card p-4 rounded-xl border border-border flex items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-foreground text-sm">#{enq.enquiryNumber}</span>
                        <StatusBadge status={enq.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(enq.createdAt).toLocaleDateString('en-IN')} • {enq.items?.length || 0} item(s)
                      </div>
                    </div>
                    <Link to={`/dealer/enquiries/${enq._id}`}>
                      <Button variant="outline" size="sm" iconOnly title="View Enquiry">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-card rounded-xl text-xs text-muted-foreground border border-border">
                No wholesale commercial enquiries submitted yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Stats & Navigation */}
        <div className="lg:col-span-4 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-card p-5 rounded-2xl border border-border shadow-sm">
              <span className="text-xs font-bold uppercase text-muted-foreground">Commercial Cart Units</span>
              <p className="text-3xl font-extrabold text-foreground mt-1">{cartCount}</p>
              <Link to="/dealer/cart" className="text-xs text-primary hover:text-primary/80 font-semibold block mt-2">
                Open Commercial Cart →
              </Link>
            </Card>

            <Card className="bg-card p-5 rounded-2xl border border-border shadow-sm">
              <span className="text-xs font-bold uppercase text-muted-foreground">KYC Verification State</span>
              <p className="text-xl font-extrabold text-foreground mt-1 uppercase">{kycStatus}</p>
              <Link to="/dealer/kyc/status" className="text-xs text-primary hover:text-primary/80 font-semibold block mt-2">
                View Verification Details →
              </Link>
            </Card>
          </div>

          {/* Quick Navigation Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-muted-foreground">Dealer Quick Actions</h4>
            <Link to="/dealer/pricing" className="block">
              <div className="bg-card p-4 rounded-xl border border-border hover:border-primary transition-all flex items-center justify-between group shadow-sm">
                <div className="flex items-center gap-3">
                  <Tag className="w-5 h-5 text-primary" />
                  <span className="text-xs font-bold text-foreground">Wholesale Price Catalog</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link to="/dealer/kyc" className="block">
              <div className="bg-card p-4 rounded-xl border border-border hover:border-primary transition-all flex items-center justify-between group shadow-sm">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-primary" />
                  <span className="text-xs font-bold text-foreground">Upload KYC Documents</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealerDashboardPage;
