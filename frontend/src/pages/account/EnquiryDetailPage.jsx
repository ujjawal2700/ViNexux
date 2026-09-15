import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import enquiryService from '../../services/enquiryService';
import contentService from '../../services/contentService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusBadge, Badge } from '../../components/ui/Badge';
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
  ShieldCheck,
} from 'lucide-react';

export const EnquiryDetailPage = () => {
  const { id } = useParams();
  const [enquiry, setEnquiry] = useState(null);
  const [supportPhone, setSupportPhone] = useState('919876543210');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch Enquiry Details & Footer Phone
  const fetchEnquiryDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Fetch support phone from CMS footer
    try {
      const footerRes = await contentService.getFooterContent();
      const phoneRaw = footerRes.data?.footer?.contactDetails?.phone || footerRes.footer?.contactDetails?.phone;
      if (phoneRaw) {
        const cleaned = phoneRaw.replace(/\D/g, '');
        if (cleaned.length >= 10) {
          setSupportPhone(cleaned.startsWith('91') ? cleaned : `91${cleaned}`);
        }
      }
    } catch (err) {
      console.warn('Could not fetch support phone:', err);
    }

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

  // Format Currency (INR ₹)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // WhatsApp Deep Link generator for specific enquiry
  const generateWhatsAppLink = () => {
    if (!enquiry) return '#';
    const num = enquiry.enquiryNumber || 'VNX';
    let text = `*Vinexus Enquiry Inquiry - #${num}*\n\n`;
    text += `Hello, I am enquiring about my submitted commercial lead *#${num}* (Status: ${enquiry.status?.toUpperCase()}).\n\n`;
    text += `*Items Included:*\n`;
    (enquiry.items || []).forEach((item, idx) => {
      text += `${idx + 1}. ${item.productName || 'Equipment'} (Qty: ${item.quantity})\n`;
    });
    text += `\nPlease provide me with an update on this quotation. Thank you!`;
    return `https://wa.me/${supportPhone}?text=${encodeURIComponent(text)}`;
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

  const items = enquiry.items || [];
  const grandTotal = items.reduce(
    (sum, item) => sum + (item.priceShown || 0) * (item.quantity || 1),
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-background text-foreground min-h-screen">
      
      {/* Header */}
      <div className="border-b border-border pb-6 space-y-3">
        <Link to="/account/enquiries" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Enquiries
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                #{enquiry.enquiryNumber}
              </h1>
              <StatusBadge status={enquiry.status} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Submitted on {new Date(enquiry.createdAt).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <a href={generateWhatsAppLink()} target="_blank" rel="noopener noreferrer">
            <Button variant="success" size="md" leftIcon={<MessageCircle className="w-4 h-4" />}>
              Chat on WhatsApp
            </Button>
          </a>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Items Snapshot & Admin Notes */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* ITEMS SNAPSHOT TABLE */}
          <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
            <CardHeader className="p-0 pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>Enquired Equipment Items Snapshot</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 space-y-3">
              {items.map((item, idx) => {
                const prod = item.productId || {};
                const imgUrl = prod.images?.[0]?.url || prod.image || '';
                const price = item.priceShown !== undefined ? item.priceShown : 0;
                const lineTotal = price * (item.quantity || 1);

                return (
                  <div key={idx} className="flex items-center justify-between text-xs py-3 border-b border-border gap-4">
                    <div className="flex items-center gap-3 truncate">
                      <Image src={imgUrl} alt={item.productName} aspectRatio="aspect-square" className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                      <div className="truncate space-y-0.5">
                        <span className="font-bold text-foreground block truncate">{item.productName || 'Equipment'}</span>
                        {prod.sku && <span className="font-mono text-[10px] text-[#9a6870] block">SKU: {prod.sku}</span>}
                        <span className="text-[11px] text-muted-foreground">Qty: {item.quantity} × {formatCurrency(price)}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono font-bold text-foreground shrink-0">
                      {formatCurrency(lineTotal)}
                    </div>
                  </div>
                );
              })}

              <div className="pt-3 flex justify-between text-sm font-bold border-t border-border">
                <span className="text-[#664448]">Estimated Total</span>
                <span className="text-foreground text-base font-mono">{formatCurrency(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>

          {/* CUSTOMER MESSAGE */}
          {enquiry.message && (
            <Card className="bg-card p-6 rounded-2xl border border-border space-y-3 shadow-sm">
              <CardHeader className="p-0 pb-2 border-b border-border">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Customer Notes / Message</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 text-xs text-[#664448] leading-relaxed italic bg-background p-3 rounded-xl border border-border">
                "{enquiry.message}"
              </CardContent>
            </Card>
          )}

          {/* ADMIN NOTES TIMELINE */}
          {enquiry.notes && enquiry.notes.length > 0 && (
            <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
              <CardHeader className="p-0 pb-3 border-b border-border">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Vinexus Support Updates & Notes</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0 space-y-3">
                {enquiry.notes.map((noteItem, idx) => (
                  <div key={idx} className="bg-background p-3.5 rounded-xl border border-border text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-primary">Vinexus Commercial Rep</span>
                      <span>{new Date(noteItem.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-foreground leading-relaxed pt-1">{noteItem.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Contact & Address Snapshot */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 text-xs shadow-sm">
            <CardHeader className="p-0 pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <User className="w-4 h-4 text-primary" />
                <span>Contact & Delivery Snapshot</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-[#9a6870] tracking-wider">Contact Person</span>
                <div className="space-y-1 text-[#664448]">
                  <div className="font-bold text-foreground text-sm">{enquiry.contactName}</div>
                  <div className="flex items-center gap-1.5 font-mono"><Mail className="w-3.5 h-3.5 text-[#9a6870]" /> {enquiry.contactEmail}</div>
                  <div className="flex items-center gap-1.5 font-mono"><Phone className="w-3.5 h-3.5 text-[#9a6870]" /> {enquiry.contactPhone}</div>
                  {enquiry.whatsappNumber && (
                    <div className="flex items-center gap-1.5 font-mono"><MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> {enquiry.whatsappNumber} (WhatsApp)</div>
                  )}
                </div>
              </div>

              {enquiry.deliveryAddress && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <span className="text-[10px] font-bold uppercase text-[#9a6870] tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" /> Delivery Address
                  </span>
                  <div className="text-[#664448] leading-relaxed bg-background p-3 rounded-xl border border-border">
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
