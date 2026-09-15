import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import {
  ArrowLeft,
  UserCheck,
  Mail,
  Phone,
  Calendar,
  FileText,
  Package,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

/**
 * Routed detail page for a single customer - mirrors AdminDealerDetailPage's
 * layout/pattern (list -> dedicated page), replacing the old "Customer
 * Details & Enquiry History" popup modal that used to live in
 * AdminCustomersPage.jsx.
 */
const AdminCustomerDetailPage = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [enquiries, setEnquiries] = useState([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);

  const [statusTargetStatus, setStatusTargetStatus] = useState('');
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const [toast, setToast] = useState(null);

  const fetchCustomer = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getCustomerById(id);
      setCustomer(res.data?.customer || res.data);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError(err.response?.data?.message || 'Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id]);

  useEffect(() => {
    if (!customer) return;

    const fetchCustomerEnquiries = async () => {
      setEnquiriesLoading(true);
      try {
        const res = await adminService.getEnquiries({ userId: customer._id, limit: 50 });
        let list = res.data?.enquiries || res.enquiries || [];

        // Fallback search by email if userId filter yields no results
        if (list.length === 0 && customer.email) {
          const emailRes = await adminService.getEnquiries({ search: customer.email, limit: 50 });
          list = emailRes.data?.enquiries || emailRes.enquiries || [];
        }

        setEnquiries(list);
      } catch (err) {
        console.warn('Failed to load customer enquiries:', err);
        setEnquiries([]);
      } finally {
        setEnquiriesLoading(false);
      }
    };

    fetchCustomerEnquiries();
  }, [customer]);

  const handleStatusConfirm = async () => {
    setStatusLoading(true);
    try {
      await adminService.updateCustomerStatus(id, statusTargetStatus);
      setToast({ message: `Customer account updated to '${statusTargetStatus}'`, type: 'success' });
      setStatusConfirmOpen(false);
      fetchCustomer();
    } catch (err) {
      console.error('Customer status update error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to update customer status', type: 'error' });
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 bg-muted" />
        <Skeleton className="h-40 rounded-xl bg-muted" />
        <Skeleton className="h-64 rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <Link to="/admin/customers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Customer Accounts
          </Button>
        </Link>
        <ErrorState title="Customer Not Found" message={error || 'Customer record unavailable'} onRetry={fetchCustomer} />
      </div>
    );
  }

  const nameStr = customer.fullName || customer.name || 'Unnamed Customer';
  const statusVal = customer.accountStatus || customer.status || 'active';
  const isBlocked = statusVal === 'blocked';

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <Link to="/admin/customers" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Customer Accounts
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-extrabold text-foreground">{nameStr}</h1>
            <StatusBadge status={statusVal} />
          </div>
          <p className="text-[11px] text-muted-foreground font-mono mt-1">ID: {customer._id}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isBlocked ? (
            <Button
              variant="success"
              size="sm"
              onClick={() => { setStatusTargetStatus('active'); setStatusConfirmOpen(true); }}
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" /> Unblock Account
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setStatusTargetStatus('blocked'); setStatusConfirmOpen(true); }}
            >
              <ShieldAlert className="w-4 h-4 mr-1.5" /> Block Account
            </Button>
          )}
        </div>
      </div>

      {/* Basic Account Details */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-primary" /> Basic Account Details
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border space-y-1">
            <div className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1">
              <Mail className="w-3 h-3 text-primary" /> Email Address
            </div>
            <div className="text-xs font-mono font-bold text-foreground truncate">{customer.email || 'N/A'}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border space-y-1">
            <div className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-600" /> Phone Number
            </div>
            <div className="text-xs font-mono font-bold text-foreground">{customer.phone || 'N/A'}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border space-y-1">
            <div className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-600" /> Registration Date
            </div>
            <div className="text-xs font-bold text-foreground">
              {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Enquiry History */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" /> Customer Enquiry History
          </h4>
          <Badge variant="secondary" className="text-[10px] font-bold">
            {enquiries.length} Enquir{enquiries.length === 1 ? 'y' : 'ies'} Found
          </Badge>
        </div>

        {enquiriesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : enquiries.length === 0 ? (
          <div className="p-6 rounded-2xl bg-card border border-border text-center space-y-2">
            <Package className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-xs font-semibold text-muted-foreground">
              No product enquiries or quotation requests submitted by this customer yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {enquiries.map((enq) => {
              const itemCount = enq.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
              const totalVal = enq.items?.reduce((sum, item) => sum + (item.priceShown || 0) * (item.quantity || 1), 0) || 0;

              return (
                <div key={enq._id} className="p-4 rounded-xl bg-card border border-border space-y-3 hover:border-primary/40 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-primary">{enq.enquiryNumber}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({new Date(enq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={enq.status} />
                      <Link
                        to={`/admin/enquiries/${enq._id}`}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
                      >
                        Inspect <ExternalLink className="w-3 h-3 ml-0.5" />
                      </Link>
                    </div>
                  </div>

                  {Array.isArray(enq.items) && enq.items.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Items Requested:</div>
                      <div className="space-y-1 bg-muted/30 p-2 rounded-lg border border-border/50">
                        {enq.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground truncate max-w-[250px]">
                              {it.productName || it.productId?.name || 'Product Item'}
                            </span>
                            <div className="font-mono text-muted-foreground shrink-0">
                              Qty: <strong className="text-foreground">{it.quantity}</strong> × ₹{(it.priceShown || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {enq.message && (
                    <div className="text-[11px] text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/40 italic">
                      "{enq.message}"
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>Total Items: <strong className="text-foreground">{itemCount}</strong></span>
                    <span>Estimated Value: <strong className="text-foreground font-mono">₹{totalVal.toLocaleString('en-IN')}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleStatusConfirm}
        title={`${statusTargetStatus === 'blocked' ? 'Block' : 'Activate'} Customer Account`}
        message={`Are you sure you want to change account status for "${nameStr}" to '${statusTargetStatus}'?`}
        confirmText={statusTargetStatus === 'blocked' ? 'Block Customer' : 'Activate Customer'}
        isLoading={statusLoading}
        variant={statusTargetStatus === 'blocked' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default AdminCustomerDetailPage;
