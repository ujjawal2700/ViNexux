import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import Image from '../../components/ui/Image';
import { 
  ArrowLeft, 
  Inbox, 
  User, 
  MapPin, 
  MessageSquare, 
  FileSpreadsheet, 
  Send, 
  CheckCircle2, 
  Clock, 
  UserCheck 
} from 'lucide-react';

const ALLOWED_STATUS_TRANSITIONS = {
  new: ['contacted', 'in-progress', 'closed', 'spam'],
  contacted: ['in-progress', 'closed', 'spam'],
  'in-progress': ['closed', 'spam'],
  closed: ['closed'],
  spam: ['spam'],
};

const AdminEnquiryDetailPage = () => {
  const { id } = useParams();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status & Note Submission State
  const [selectedStatus, setSelectedStatus] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Triggers loading
  const [syncing, setSyncing] = useState(false);
  const [whatsAppSending, setWhatsAppSending] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState(null);

  const fetchEnquiryDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getEnquiryById(id);
      const enqObj = res.data?.enquiry || res.enquiry;
      setEnquiry(enqObj);
      if (enqObj) setSelectedStatus(enqObj.status);
    } catch (err) {
      console.error('Error fetching enquiry details:', err);
      setError(err.response?.data?.message || 'Failed to load enquiry details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchEnquiryDetails();
  }, [id]);

  const handleUpdateStatus = async (targetStatus) => {
    try {
      await adminService.updateEnquiryStatus(id, { status: targetStatus });
      setToast({ message: `Enquiry status updated to '${targetStatus}'`, type: 'success' });
      setSelectedStatus(targetStatus);
      fetchEnquiryDetails();
    } catch (err) {
      console.error('Status update error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to update status', type: 'error' });
    }
  };

  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setNoteSubmitting(true);
    setFormError('');
    try {
      await adminService.updateEnquiryStatus(id, { note: newNoteText.trim() });
      setToast({ message: 'Internal admin note added!', type: 'success' });
      setNewNoteText('');
      fetchEnquiryDetails();
    } catch (err) {
      console.error('Add note error:', err);
      setFormError(err.response?.data?.message || 'Failed to add admin note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleSyncGoogleSheet = async () => {
    setSyncing(true);
    try {
      const res = await adminService.syncGoogleSheet(id);
      setToast({ message: res.message || 'Enquiry synced to Google Sheet successfully!', type: 'success' });
    } catch (err) {
      console.error('Google Sheet sync error:', err);
      setToast({ message: err.response?.data?.message || 'Google Sheets sync failed', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleResendWhatsApp = async () => {
    setWhatsAppSending(true);
    try {
      const res = await adminService.resendWhatsApp(id);
      setToast({ message: res.message || 'WhatsApp notification dispatched!', type: 'success' });
    } catch (err) {
      console.error('WhatsApp resend error:', err);
      setToast({ message: err.response?.data?.message || 'WhatsApp dispatch failed', type: 'error' });
    } finally {
      setWhatsAppSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 bg-[#f4e7ea]" />
        <Skeleton className="h-64 rounded-xl bg-[#f4e7ea]" />
        <Skeleton className="h-48 rounded-xl bg-[#f4e7ea]" />
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="space-y-6">
        <Link to="/admin/enquiries">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Enquiries
          </Button>
        </Link>
        <ErrorState title="Enquiry Record Not Found" message={error || 'Enquiry record unavailable'} onRetry={fetchEnquiryDetails} />
      </div>
    );
  }

  const items = enquiry.items || [];
  const address = enquiry.deliveryAddress || {};
  const addressStr = [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(', ');
  const notes = enquiry.notes || [];

  const allowedNext = ALLOWED_STATUS_TRANSITIONS[enquiry.status] || [enquiry.status];
  const statusOptions = [
    { value: enquiry.status, label: enquiry.status.toUpperCase() },
    ...allowedNext
      .filter((s) => s !== enquiry.status)
      .map((s) => ({ value: s, label: s.toUpperCase() })),
  ];

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e5d1d4]">
        <div>
          <Link to="/admin/enquiries" className="inline-flex items-center gap-1.5 text-xs text-[#7c5c5f] hover:text-[#3d0a0d] transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Enquiries
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-extrabold text-[#3d0a0d] font-mono">{enquiry.enquiryNumber}</h1>
            <StatusBadge status={enquiry.status} />
            <span className="text-xs text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 uppercase font-bold">
              {enquiry.userType || 'customer'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncGoogleSheet} isLoading={syncing} className="text-emerald-700 border-emerald-200">
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Sync Sheet
          </Button>
          <Button variant="outline" size="sm" onClick={handleResendWhatsApp} isLoading={whatsAppSending} className="text-green-700 border-green-200">
            <Send className="w-4 h-4 mr-1.5" /> Send WhatsApp
          </Button>
        </div>
      </div>

      {/* Two Column Layout: Customer Details & Lead Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact & Address Information */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact Details Card */}
          <Card className="space-y-4">
            <h3 className="text-xs font-extrabold text-[#3d0a0d] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#e5d1d4]">
              <User className="w-4 h-4 text-[#800020]" />
              Contact & Delivery Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-[#e5d1d4]">
                  <span className="text-[#7c5c5f]">Contact Name:</span>
                  <span className="font-bold text-[#3d0a0d]">{enquiry.contactName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#e5d1d4]">
                  <span className="text-[#7c5c5f]">Email Address:</span>
                  <span className="font-mono text-[#3d0a0d]">{enquiry.contactEmail || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#7c5c5f]">Phone Number:</span>
                  <span className="font-mono text-[#3d0a0d]">{enquiry.contactPhone || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-[#e5d1d4]">
                  <span className="text-[#7c5c5f]">User Account Role:</span>
                  <span className="font-bold text-purple-800 uppercase">{enquiry.userType || 'customer'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#e5d1d4]">
                  <span className="text-[#7c5c5f]">Submission Date:</span>
                  <span className="text-[#3d0a0d]">
                    {new Date(enquiry.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {addressStr && (
              <div className="pt-2 border-t border-[#e5d1d4]">
                <span className="text-xs font-bold text-[#7c5c5f] flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#800020]" /> Delivery Address:
                </span>
                <p className="text-xs text-[#3d0a0d] bg-white p-2.5 rounded-lg border border-[#e5d1d4]">
                  {addressStr}
                </p>
              </div>
            )}

            {enquiry.message && (
              <div className="pt-2 border-t border-[#e5d1d4]">
                <span className="text-xs font-bold text-[#7c5c5f] flex items-center gap-1.5 mb-1">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-700" /> Customer Message / Instructions:
                </span>
                <p className="text-xs text-[#3d0a0d] bg-[#fdf8f9] p-2.5 rounded-lg border border-[#e5d1d4] italic">
                  "{enquiry.message}"
                </p>
              </div>
            )}
          </Card>

          {/* Itemized Price Snapshot Table */}
          <Card className="space-y-4">
            <h3 className="text-xs font-extrabold text-[#3d0a0d] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#e5d1d4]">
              <Inbox className="w-4 h-4 text-emerald-700" />
              Itemized Order & Price Snapshot ({items.length} Unique Items)
            </h3>

            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Product</Table.Head>
                  <Table.Head>SKU</Table.Head>
                  <Table.Head className="text-center">Qty</Table.Head>
                  <Table.Head className="text-right">Price Shown</Table.Head>
                  <Table.Head className="text-right">Subtotal</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {items.map((item, idx) => {
                  const prod = item.productId || {};
                  const productName = item.productName || prod.name || 'Product';
                  const price = item.priceShown || 0;
                  const qty = item.quantity || 1;

                  return (
                    <Table.Row key={idx}>
                      <Table.Cell className="font-bold text-[#3d0a0d] text-xs">
                        {productName}
                      </Table.Cell>
                      <Table.Cell className="font-mono text-[11px] text-[#7c5c5f]">
                        {prod.sku || 'N/A'}
                      </Table.Cell>
                      <Table.Cell className="text-center font-mono text-xs font-bold text-[#3d0a0d]">
                        {qty}
                      </Table.Cell>
                      <Table.Cell className="text-right font-mono text-xs text-[#3d0a0d]">
                        ₹{Number(price).toLocaleString('en-IN')}
                      </Table.Cell>
                      <Table.Cell className="text-right font-mono text-xs font-extrabold text-emerald-700">
                        ₹{Number(price * qty).toLocaleString('en-IN')}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>

            <div className="flex justify-end pt-3 border-t border-[#e5d1d4]">
              <div className="text-right">
                <span className="text-xs text-[#7c5c5f]">Grand Total Amount:</span>
                <h4 className="text-xl font-extrabold text-emerald-700 mt-0.5">
                  ₹{Number(enquiry.totalAmount || 0).toLocaleString('en-IN')}
                </h4>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Internal Admin Control Panel & Notes Timeline */}
        <div className="space-y-6">
          {/* Status Control Card */}
          <Card className="space-y-4">
            <h3 className="text-xs font-extrabold text-[#3d0a0d] uppercase tracking-wider pb-2 border-b border-[#e5d1d4]">
              Lead Workflow Control
            </h3>

            <FormField label="Change Status">
              <Select
                value={selectedStatus}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                options={statusOptions}
              />
            </FormField>
          </Card>

          {/* Internal Admin Notes Feed */}
          <Card className="space-y-4">
            <h3 className="text-xs font-extrabold text-[#3d0a0d] uppercase tracking-wider flex items-center justify-between pb-2 border-b border-[#e5d1d4]">
              <span>Internal Admin Notes ({notes.length})</span>
              <span className="text-[10px] text-[#7c5c5f] font-normal">Private Timeline</span>
            </h3>

            {/* Note History List */}
            {notes.length === 0 ? (
              <p className="text-xs text-[#7c5c5f] py-3 text-center">No internal admin notes added yet.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {notes.map((n, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#fdf8f9] border border-[#e5d1d4] space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#7c5c5f]">
                      <span className="font-bold text-[#800020]">
                        {n.adminId?.fullName || n.adminId?.email || 'Admin'}
                      </span>
                      <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-[#3d0a0d] whitespace-pre-wrap">{n.note}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Note Form */}
            <form onSubmit={handleAddInternalNote} className="space-y-3 pt-2 border-t border-[#e5d1d4]">
              <FormError message={formError} />
              <FormField label="Append Internal Note">
                <Textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="e.g. Spoke on call. Quoted ₹45,000 bulk price for 10 camera units."
                  rows={3}
                />
              </FormField>
              <Button variant="primary" size="sm" type="submit" isLoading={noteSubmitting} disabled={!newNoteText.trim()} className="w-full text-xs">
                Add Note
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminEnquiryDetailPage;
