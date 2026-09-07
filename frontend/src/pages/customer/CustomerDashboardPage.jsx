import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import enquiryService from '../../services/enquiryService';
import cartService from '../../services/cartService';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  User,
  ShoppingBag,
  FileText,
  Grid,
  ArrowRight,
  ShieldCheck,
  Plus,
  Eye,
  Clock,
  Sparkles,
} from 'lucide-react';

export const CustomerDashboardPage = () => {
  const { user } = useAuth();
  const [recentEnquiries, setRecentEnquiries] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      // Fetch Recent Enquiries
      try {
        const enqRes = await enquiryService.getMyEnquiries({ limit: 3, sortBy: 'createdAt', sortOrder: 'desc' });
        const list = enqRes.data?.enquiries || enqRes.enquiries || [];
        setRecentEnquiries(list);
      } catch (err) {
        console.warn('Dashboard enquiries fetch error:', err);
      }

      // Fetch Cart Items Count
      try {
        const cartRes = await cartService.getCart();
        const items = cartRes.data?.cart?.items || cartRes.cart?.items || [];
        const count = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        setCartCount(count);
      } catch (err) {
        console.warn('Dashboard cart fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-[#fdf8f9] text-[#3d0a0d] min-h-screen">
      
      {/* 1. WELCOME HERO HEADER */}
      <div className="bg-[#f4e7ea] p-8 rounded-3xl border border-[#e5d1d4] relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 relative z-10">
          <Badge variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />}>
            Customer Account Portal
          </Badge>
          <h1 className="text-3xl font-extrabold text-[#3d0a0d] tracking-tight">
            Welcome back, {user?.fullName || user?.name || 'Customer'}!
          </h1>
          <p className="text-xs sm:text-sm text-[#7c5c5f] max-w-xl">
            Manage your quotation enquiries, track response status, and build commercial equipment orders.
          </p>
        </div>

        <div className="flex gap-3 shrink-0 relative z-10">
          <Link to="/products">
            <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Explore Catalog
            </Button>
          </Link>
          <Link to="/customer/cart">
            <Button variant="secondary" size="md" leftIcon={<ShoppingBag className="w-4 h-4" />}>
              View Cart ({cartCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. STATS & QUICK OVERVIEW WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card hoverable className="bg-white p-6 rounded-2xl border border-[#e5d1d4] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#7c5c5f]">Total Enquiries</span>
            <div className="w-10 h-10 rounded-xl bg-[#f4e7ea] border border-[#e5d1d4] flex items-center justify-center text-[#800020]">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#3d0a0d] mt-2">{recentEnquiries.length}</p>
          <span className="text-[11px] text-[#7c5c5f]">Submitted quotations</span>
        </Card>

        <Card hoverable className="bg-white p-6 rounded-2xl border border-[#e5d1d4] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#7c5c5f]">Active Cart Items</span>
            <div className="w-10 h-10 rounded-xl bg-[#f4e7ea] border border-[#e5d1d4] flex items-center justify-center text-[#800020]">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#3d0a0d] mt-2">{cartCount}</p>
          <span className="text-[11px] text-[#7c5c5f]">Units in current cart</span>
        </Card>

        <Card hoverable className="bg-white p-6 rounded-2xl border border-[#e5d1d4] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#7c5c5f]">Account Role</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-[#3d0a0d] mt-2 uppercase">{user?.role || 'Customer'}</p>
          <span className="text-[11px] text-[#7c5c5f]">Standard Pricing Access</span>
        </Card>
      </div>

      {/* 3. RECENT ENQUIRIES FEED */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#e5d1d4] pb-3">
          <h2 className="text-xl font-bold text-[#3d0a0d] tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#800020]" />
            <span>Recent Quotation Enquiries</span>
          </h2>
          <Link to="/customer/enquiries" className="text-xs font-semibold text-[#800020] hover:text-[#66001a]">
            View All Enquiries →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : recentEnquiries.length > 0 ? (
          <div className="space-y-3">
            {recentEnquiries.map((enq) => (
              <div
                key={enq._id}
                className="bg-white p-4 rounded-2xl border border-[#e5d1d4] flex items-center justify-between gap-4 hover:border-[#800020] transition-all shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[#3d0a0d] text-sm">#{enq.enquiryNumber}</span>
                    <StatusBadge status={enq.status} />
                  </div>
                  <div className="text-xs text-[#7c5c5f]">
                    {new Date(enq.createdAt).toLocaleDateString('en-IN')} • {enq.items?.length || 0} item(s)
                  </div>
                </div>

                <Link to={`/customer/enquiries/${enq._id}`}>
                  <Button variant="outline" size="sm" iconOnly title="View Details">
                    <Eye className="w-4 h-4 text-[#7c5c5f]" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center bg-white border border-[#e5d1d4] text-[#7c5c5f] text-xs">
            No quotation enquiries submitted yet.
          </Card>
        )}
      </div>

      {/* 4. QUICK NAVIGATION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-4">
        <Link to="/products" className="group">
          <Card hoverable className="bg-white p-5 rounded-2xl border border-[#e5d1d4] space-y-3 h-full shadow-sm">
            <Grid className="w-6 h-6 text-[#800020] group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-[#3d0a0d] text-sm">Product Catalog</h4>
            <p className="text-xs text-[#7c5c5f]">Browse CCTV cameras, DVRs, and security accessories.</p>
          </Card>
        </Link>

        <Link to="/customer/cart" className="group">
          <Card hoverable className="bg-white p-5 rounded-2xl border border-[#e5d1d4] space-y-3 h-full shadow-sm">
            <ShoppingBag className="w-6 h-6 text-[#800020] group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-[#3d0a0d] text-sm">Shopping Cart</h4>
            <p className="text-xs text-[#7c5c5f]">Review selected equipment and build WhatsApp quotes.</p>
          </Card>
        </Link>

        <Link to="/customer/enquiries" className="group">
          <Card hoverable className="bg-white p-5 rounded-2xl border border-[#e5d1d4] space-y-3 h-full shadow-sm">
            <FileText className="w-6 h-6 text-[#800020] group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-[#3d0a0d] text-sm">Enquiry History</h4>
            <p className="text-xs text-[#7c5c5f]">Track response status and admin note timelines.</p>
          </Card>
        </Link>

        <Link to="/customer/profile" className="group">
          <Card hoverable className="bg-white p-5 rounded-2xl border border-[#e5d1d4] space-y-3 h-full shadow-sm">
            <User className="w-6 h-6 text-[#800020] group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-[#3d0a0d] text-sm">Account Profile</h4>
            <p className="text-xs text-[#7c5c5f]">View user account information and phone details.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
