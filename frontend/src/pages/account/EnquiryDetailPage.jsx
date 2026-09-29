import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import enquiryService from '../../services/enquiryService';
import { groupEnquiryItems } from '../../lib/enquiryItems';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Image } from '../../components/ui/Image';
import {
  FileText,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  ArrowLeft,
  Clock,
  MessageSquare,
} from 'lucide-react';

export const EnquiryDetailPage = () => {
  const { id } = useParams();
  const [enquiry, setEnquiry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the latest enquiry status, replies, and linked profile.
  const fetchEnquiryDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await enquiryService.getMyEnquiryById(id);
      const data = res.data?.enquiry || res.enquiry || res.data;
      if (!data) {
        setError('Enquiry not found');
      } else {
        setEnquiry(data);
      }
    } catch (err) {
      console.error('Enquiry detail fetch error:', err);
      setError('Enquiry not found or access denied.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEnquiryDetail();
  }, [fetchEnquiryDetail]);

  useEffect(() => {
    const refreshUpdates = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await enquiryService.getMyEnquiryById(id);
        const data = res.data?.enquiry || res.enquiry || res.data;
        if (data) setEnquiry(data);
      } catch { /* Keep the last successfully loaded enquiry visible. */ }
    };
    const interval = window.setInterval(refreshUpdates, 5000);
    window.addEventListener('focus', refreshUpdates);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshUpdates);
    };
  }, [id]);

  // Format Currency (INR ₹)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-6 bg-background">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <ErrorState title="Enquiry Not Found" description={error || "The requested enquiry does not exist or you do not have permission to view it."} />
        <div className="text-center mt-6">
          <Link to="/account/enquiries">
            <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to My Enquiries
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const items = groupEnquiryItems(enquiry.items || []);
  const profile = enquiry.userId && typeof enquiry.userId === 'object' ? enquiry.userId : null;
  const grandTotal = items.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-background text-slate-900 min-h-screen">
      
      {/* Header */}
      <div className="border-b border-slate-300 pb-6 space-y-3">
        <Link to="/account/enquiries" className="text-sm text-slate-700 hover:text-primary inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Enquiries
        </Link>

        <div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                #{enquiry.enquiryNumber}
              </h1>
              <StatusBadge status={enquiry.status} />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Submitted on {new Date(enquiry.createdAt).toLocaleString('en-IN')}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Items Snapshot & Admin Notes */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* ITEMS SNAPSHOT TABLE */}
          <Card className="bg-white p-6 rounded-2xl !border-slate-300 space-y-4 shadow-sm">
            <CardHeader className="p-0 pb-3 !border-slate-300">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>Enquired Equipment Items Snapshot</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 space-y-3">
              {items.map((item, idx) => {
                const prod = item.productId || {};
                const price = item.priceShown !== undefined ? item.priceShown : 0;
                const lineTotal = item.lineTotal;

                return (
                  <div key={idx} className="flex items-center justify-between text-sm py-3 border-b border-slate-300 gap-4">
                    <div className="flex items-center gap-3 truncate">
                      <Image src={item.imageUrl} alt={item.productName} aspectRatio="aspect-square" objectFit="object-contain" className="w-14 h-14 rounded-lg border border-slate-300 bg-white shrink-0" />
                      <div className="truncate space-y-0.5">
                        <span className="font-bold text-foreground block truncate">{item.productName || 'Equipment'}</span>
                        {prod.sku && <span className="font-mono text-xs text-slate-700 block">SKU: {prod.sku}</span>}
                        <span className="text-xs text-slate-700">Qty: {item.quantity} × {formatCurrency(price)}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono font-bold text-foreground shrink-0">
                      {formatCurrency(lineTotal)}
                    </div>
                  </div>
                );
              })}

              <div className="pt-3 flex justify-between text-sm font-bold border-t border-slate-300">
                <span className="text-slate-800">Estimated Total</span>
                <span className="text-foreground text-base font-mono">{formatCurrency(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>

          {/* CUSTOMER MESSAGE */}
          {enquiry.message && (
            <Card className="bg-white p-6 rounded-2xl !border-slate-300 space-y-3 shadow-sm">
              <CardHeader className="p-0 pb-2 !border-slate-300">
                <CardTitle className="text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Customer Notes / Message</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-800 leading-relaxed italic bg-slate-50 p-3 rounded-xl border border-slate-300">
                "{enquiry.message}"
              </CardContent>
            </Card>
          )}

          {/* CUSTOMER-VISIBLE SUPPORT REPLIES */}
          {enquiry.customerReplies?.length > 0 && (
            <Card className="bg-white p-6 rounded-2xl !border-slate-300 space-y-4 shadow-sm">
              <CardHeader className="p-0 pb-3 !border-slate-300">
                <CardTitle className="text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Replies from Vinexus Support</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0 space-y-3">
                {enquiry.customerReplies.map((reply, idx) => (
                  <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-300 text-sm space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-700">
                      <span className="font-semibold text-primary">{reply.adminId?.fullName || 'Vinexus Support'}</span>
                      <span>{new Date(reply.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-foreground leading-relaxed pt-1 whitespace-pre-wrap">{reply.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Contact & Address Snapshot */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-white p-6 rounded-2xl !border-slate-300 space-y-4 text-sm shadow-sm">
            <CardHeader className="p-0 pb-3 !border-slate-300">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <User className="w-4 h-4 text-primary" />
                <span>Contact & Delivery Details</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">Contact Person</span>
                <div className="space-y-1 text-slate-800">
                  <div className="font-bold text-foreground text-sm">{profile?.fullName || profile?.name || enquiry.contactName}</div>
                  <div className="flex items-center gap-1.5 break-all"><Mail className="w-3.5 h-3.5 shrink-0 text-slate-600" /> {profile?.email || enquiry.contactEmail}</div>
                  <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0 text-slate-600" /> {profile?.phone || enquiry.contactPhone}</div>
                  {enquiry.whatsappNumber && (
                    <div className="flex items-center gap-1.5 font-mono"><MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> {enquiry.whatsappNumber} (WhatsApp)</div>
                  )}
                </div>
              </div>

              {enquiry.deliveryAddress && (
                <div className="space-y-2 pt-3 border-t border-slate-300">
                  <span className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" /> Delivery Address
                  </span>
                  <div className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-300">
                    <div>{enquiry.deliveryAddress.line1}</div>
                    {enquiry.deliveryAddress.line2 && <div>{enquiry.deliveryAddress.line2}</div>}
                    <div>
                      {enquiry.deliveryAddress.city}{enquiry.deliveryAddress.state ? `, ${enquiry.deliveryAddress.state}` : ''} {enquiry.deliveryAddress.pincode}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnquiryDetailPage;
