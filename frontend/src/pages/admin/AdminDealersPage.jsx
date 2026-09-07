import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import FilterBar from '../../components/admin/FilterBar';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import { Users, Eye, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

const AdminDealersPage = () => {
  const [dealers, setDealers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Reject Modal State
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Revoke Modal State
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Quick Approve State
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  const fetchDealers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 20,
        sortBy,
        sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (cityFilter.trim()) params.city = cityFilter.trim();
      if (stateFilter.trim()) params.state = stateFilter.trim();

      const res = await adminService.getDealers(params);
      setDealers(res.data?.dealers || []);
      setPagination(res.data?.pagination || { page: 1, limit: 20, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Error fetching admin dealers list:', err);
      setError(err.response?.data?.message || 'Failed to load dealer directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealers();
  }, [page, statusFilter, sortBy, sortOrder]);

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;
    setApproveLoading(true);
    try {
      await adminService.approveDealerKyc(approveTarget._id);
      setToast({ message: `Dealer "${approveTarget.companyName}" KYC approved! Wholesale price unlocked.`, type: 'success' });
      setApproveTarget(null);
      fetchDealers();
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
    if (rejectionReason.trim().length > 500) {
      setRejectError('Rejection reason cannot exceed 500 characters');
      return;
    }

    setRejectLoading(true);
    setRejectError('');
    try {
      await adminService.rejectDealerKyc(rejectTarget._id, rejectionReason.trim());
      setToast({ message: `Dealer KYC rejected for "${rejectTarget.companyName}".`, type: 'success' });
      setRejectTarget(null);
      setRejectionReason('');
      fetchDealers();
    } catch (err) {
      console.error('Reject error:', err);
      setRejectError(err.response?.data?.message || 'Failed to reject dealer KYC');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      await adminService.revokeDealer(revokeTarget._id, revokeReason.trim());
      setToast({ message: `Dealer status revoked for "${revokeTarget.companyName}".`, type: 'success' });
      setRevokeTarget(null);
      setRevokeReason('');
      fetchDealers();
    } catch (err) {
      console.error('Revoke error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to revoke dealer status', type: 'error' });
    } finally {
      setRevokeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AdminPageHeader
        title="Dealer Verification & B2B Directory"
        subtitle="Review business verification profiles, GST/PAN documents, and unlock wholesale catalog pricing"
        badge={`${pagination.total} Dealer Records`}
      />

      {/* Filter & Search Bar */}
      <FilterBar
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        searchPlaceholder="Search by company name, GSTIN, PAN, or email..."
        filters={[
          {
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All Verification Statuses' },
              { value: 'pending', label: 'Pending Verification (Queue)' },
              { value: 'approved', label: 'Approved Dealers' },
              { value: 'rejected', label: 'Rejected Applications' },
            ],
          },
        ]}
        sortOptions={[
          { value: 'createdAt', label: 'Sort by Application Date' },
          { value: 'companyName', label: 'Sort by Company Name' },
          { value: 'status', label: 'Sort by Status' },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
          setCityFilter('');
          setStateFilter('');
          setPage(1);
          setSortBy('createdAt');
          setSortOrder('desc');
        }}
      >
        <Button variant="outline" size="sm" onClick={() => { setPage(1); fetchDealers(); }} className="text-xs shrink-0">
          Apply Search
        </Button>
      </FilterBar>

      {/* Table Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 rounded-lg bg-slate-900" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Failed to load dealer directory" message={error} onRetry={fetchDealers} />
      ) : dealers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No dealer records found"
          description="There are no dealer profiles matching your current status filter or search parameters."
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Company Name</Table.Head>
                <Table.Head>GSTIN / PAN</Table.Head>
                <Table.Head>Location</Table.Head>
                <Table.Head>Applicant</Table.Head>
                <Table.Head>KYC Status</Table.Head>
                <Table.Head className="text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {dealers.map((dlr) => {
                const userObj = dlr.userId;
                const locationStr = [dlr.city, dlr.state].filter(Boolean).join(', ') || 'N/A';

                return (
                  <Table.Row key={dlr._id}>
                    <Table.Cell>
                      <div className="text-xs font-bold text-white">{dlr.companyName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {dlr._id}</div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="font-mono text-[11px] text-slate-300">GST: {dlr.gstin || 'N/A'}</div>
                      <div className="font-mono text-[10px] text-slate-400">PAN: {dlr.pan || 'N/A'}</div>
                    </Table.Cell>
                    <Table.Cell className="text-xs text-slate-300">
                      {locationStr}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="text-xs font-semibold text-slate-200">{userObj?.name || userObj?.fullName || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">{userObj?.email || userObj?.phone}</div>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={dlr.status} />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/dealers/${dlr._id}`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" title="Inspect Profile & Documents">
                            <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                          </Button>
                        </Link>

                        {dlr.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setApproveTarget(dlr)}
                              className="h-8 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30"
                              title="Approve KYC"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setRejectTarget(dlr); setRejectionReason(''); setRejectError(''); }}
                              className="h-8 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                              title="Reject KYC"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}

                        {dlr.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setRevokeTarget(dlr); setRevokeReason(''); }}
                            className="h-8 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-950/30"
                            title="Revoke Wholesale Access"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Revoke
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
        </div>
      )}

      {/* Quick Approve Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApproveConfirm}
        title="Approve Dealer KYC"
        message={`Are you sure you want to approve KYC for "${approveTarget?.companyName}"? This will activate their B2B dealer account and unlock wholesale pricing across the catalog.`}
        confirmText="Approve KYC"
        isLoading={approveLoading}
        variant="primary"
      />

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title={`Reject KYC: ${rejectTarget?.companyName || ''}`}
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <FormError message={rejectError} />
          <p className="text-xs text-slate-300">
            Please provide a clear reason for rejecting this dealer's verification. The dealer will see this message in their KYC center.
          </p>

          <FormField label="Rejection Reason" required hint="Max 500 characters">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. GSTIN document image is blurry or expired. Please upload a clear original PDF copy."
              rows={4}
              required
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" isLoading={rejectLoading}>
              Reject KYC Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* Revoke Modal */}
      <Modal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title={`Revoke Approved Dealer: ${revokeTarget?.companyName || ''}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Revoking this dealer will reset their account status to rejected and revert them back to standard retail pricing.
          </p>

          <FormField label="Revocation Reason (Optional)">
            <Textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Reason for revoking dealer verification status..."
              rows={3}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRevokeConfirm} isLoading={revokeLoading}>
              Revoke Wholesale Access
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDealersPage;
