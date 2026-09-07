import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import DocumentViewerModal from '../../components/admin/DocumentViewerModal';
import Card from '../../components/ui/Card';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Textarea from '../../components/ui/Textarea';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import { 
  ArrowLeft, 
  Building2, 
  FileText, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ExternalLink, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldAlert 
} from 'lucide-react';

const AdminDealerDetailPage = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Document Viewer Modal State
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Approve / Reject / Revoke Modal States
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getDealerById(id);
      setProfile(res.data?.profile || res.profile);
    } catch (err) {
      console.error('Error fetching dealer details:', err);
      setError(err.response?.data?.message || 'Failed to load dealer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

  const handleApproveConfirm = async () => {
    setApproveLoading(true);
    try {
      await adminService.approveDealerKyc(id);
      setToast({ message: 'Dealer KYC approved successfully!', type: 'success' });
      setIsApproveOpen(false);
      fetchProfile();
    } catch (err) {
      console.error('Approve error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to approve dealer', type: 'error' });
    } finally {
      setApproveLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setRejectError('Rejection reason is required');
      return;
    }

    setRejectLoading(true);
    setRejectError('');
    try {
      await adminService.rejectDealerKyc(id, rejectionReason.trim());
      setToast({ message: 'Dealer KYC rejected', type: 'success' });
      setIsRejectOpen(false);
      setRejectionReason('');
      fetchProfile();
    } catch (err) {
      console.error('Reject error:', err);
      setRejectError(err.response?.data?.message || 'Failed to reject KYC');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleRevokeConfirm = async () => {
    setRevokeLoading(true);
    try {
      await adminService.revokeDealer(id, revokeReason.trim());
      setToast({ message: 'Dealer wholesale access revoked', type: 'success' });
      setIsRevokeOpen(false);
      setRevokeReason('');
      fetchProfile();
    } catch (err) {
      console.error('Revoke error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to revoke dealer', type: 'error' });
    } finally {
      setRevokeLoading(false);
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

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <Link to="/admin/dealers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dealers Directory
          </Button>
        </Link>
        <ErrorState title="Dealer Profile Not Found" message={error || 'Profile record unavailable'} onRetry={fetchProfile} />
      </div>
    );
  }

  const userObj = profile.userId || {};
  const kycDocs = profile.kycDocuments || [];
  const addressStr = [profile.address, profile.city, profile.state, profile.pincode].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e5d1d4]">
        <div>
          <Link to="/admin/dealers" className="inline-flex items-center gap-1.5 text-xs text-[#7c5c5f] hover:text-[#3d0a0d] transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dealer Directory
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-extrabold text-[#3d0a0d]">{profile.companyName}</h1>
            <StatusBadge status={profile.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {profile.status === 'pending' && (
            <>
              <Button variant="primary" size="sm" onClick={() => setIsApproveOpen(true)}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve KYC
              </Button>
              <Button variant="danger" size="sm" onClick={() => { setIsRejectOpen(true); setRejectionReason(''); setRejectError(''); }}>
                <XCircle className="w-4 h-4 mr-1.5" /> Reject KYC
              </Button>
            </>
          )}

          {profile.status === 'approved' && (
            <Button variant="outline" size="sm" onClick={() => { setIsRevokeOpen(true); setRevokeReason(''); }} className="text-rose-700 border-rose-200 hover:bg-rose-50">
              <RotateCcw className="w-4 h-4 mr-1.5" /> Revoke Access
            </Button>
          )}
        </div>
      </div>

      {/* Rejection Alert if present */}
      {profile.status === 'rejected' && profile.rejectionReason && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">KYC Verification Rejected</h4>
            <p className="text-xs text-rose-900 mt-1">{profile.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Information Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Profile Card */}
        <Card className="space-y-4">
          <h3 className="text-xs font-extrabold text-[#3d0a0d] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#e5d1d4]">
            <Building2 className="w-4 h-4 text-[#800020]" />
            Company Information
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-[#e5d1d4]">
              <span className="text-[#7c5c5f]">Company Name</span>
              <span className="font-bold text-[#3d0a0d]">{profile.companyName}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#e5d1d4]">
              <span className="text-[#7c5c5f]">GSTIN Number</span>
              <span className="font-mono font-bold text-[#3d0a0d]">{profile.gstin || 'Not Provided'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#e5d1d4]">
              <span className="text-[#7c5c5f]">PAN Number</span>
              <span className="font-mono font-bold text-[#3d0a0d]">{profile.pan || 'Not Provided'}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-[#7c5c5f]">Business Address</span>
              <span className="text-right text-[#3d0a0d] max-w-xs">{addressStr || 'Not Provided'}</span>
            </div>
          </div>
        </Card>

        {/* User Account Info Card */}
        <Card className="space-y-4">
          <h3 className="text-xs font-extrabold text-[#3d0a0d] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#e5d1d4]">
            <UserCheck className="w-4 h-4 text-emerald-700" />
            Applicant Account Details
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-[#e5d1d4]">
              <span className="text-[#7c5c5f]">Applicant Name</span>
              <span className="font-bold text-[#3d0a0d]">{userObj.name || userObj.fullName || 'N/A'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#e5d1d4]">
              <span className="text-[#7c5c5f]">Email Address</span>
              <span className="font-mono text-[#3d0a0d]">{userObj.email || 'N/A'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#e5d1d4]">
              <span className="text-[#7c5c5f]">Phone Number</span>
              <span className="font-mono text-[#3d0a0d]">{userObj.phone || 'N/A'}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-[#7c5c5f]">Account Status</span>
              <StatusBadge status={userObj.accountStatus || 'active'} />
            </div>
          </div>
        </Card>
      </div>

      {/* Submitted KYC Documents Gallery */}
      <Card className="space-y-4">
        <h3 className="text-xs font-extrabold text-[#3d0a0d] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#e5d1d4]">
          <FileText className="w-4 h-4 text-blue-700" />
          Submitted KYC Verification Documents ({kycDocs.length})
        </h3>

        {kycDocs.length === 0 ? (
          <p className="text-xs text-[#7c5c5f] py-6 text-center">No verification files uploaded by dealer yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {kycDocs.map((doc, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white border border-[#e5d1d4] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3d0a0d] uppercase tracking-wider">
                    {doc.type || 'Document'}
                  </span>
                  <span className="text-[10px] text-[#7c5c5f] font-mono">FILE</span>
                </div>

                <div className="h-32 bg-[#fdf8f9] rounded-lg border border-[#e5d1d4] overflow-hidden flex items-center justify-center relative">
                  {doc.url?.toLowerCase().endsWith('.pdf') ? (
                    <FileText className="w-10 h-10 text-crimson-400" />
                  ) : (
                    <img src={doc.url} alt={doc.type} className="w-full h-full object-cover" />
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDoc(doc)}
                  className="w-full text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Inspect Document
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Document Inspection Modal */}
      <DocumentViewerModal
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={`KYC Document: ${selectedDoc?.type?.toUpperCase() || ''}`}
        documentUrl={selectedDoc?.url}
        documentType={selectedDoc?.type}
      />

      {/* Approve Confirmation Modal */}
      <ConfirmDialog
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleApproveConfirm}
        title="Approve Dealer KYC"
        message={`Are you sure you want to approve KYC for "${profile.companyName}"? This will set status to Approved and unlock discounted wholesale prices across the product catalog.`}
        confirmText="Approve KYC"
        isLoading={approveLoading}
        variant="primary"
      />

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title={`Reject Dealer KYC: ${profile.companyName}`}
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <FormError message={rejectError} />
          <FormField label="Rejection Reason" required hint="Max 500 characters">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Specify exact reason for rejecting this document..."
              rows={4}
              required
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" isLoading={rejectLoading}>
              Reject Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* Revoke Modal */}
      <Modal
        isOpen={isRevokeOpen}
        onClose={() => setIsRevokeOpen(false)}
        title={`Revoke Dealer Access: ${profile.companyName}`}
      >
        <div className="space-y-4">
          <FormField label="Revocation Reason (Optional)">
            <Textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Reason for revoking dealer access..."
              rows={3}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="outline" onClick={() => setIsRevokeOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRevokeConfirm} isLoading={revokeLoading}>
              Revoke Access
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDealerDetailPage;
