import useAuth from '../../hooks/useAuth';
import { isSuperAdmin } from '../../../../shared/adminAccess.js';
import AdminDirectoryTable from '../../components/admin/AdminDirectoryTable';
import InstallerPricingSettings from '../../components/admin/InstallerPricingSettings';
import AccountManagementActions from '../../components/admin/AccountManagementActions';
import apiClient from '../../api/axios';
import DealerReviewAttribution from '../../components/admin/DealerReviewAttribution';
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import FilterBar from '../../components/admin/FilterBar';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
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

const AdminDealersPage = ({ mode = 'verification' }) => {
  const { adminUser } = useAuth();
  const canSetDiscount = isSuperAdmin(adminUser);
  const [discountPercent, setDiscountPercent] = useState('0');
  const accounts = mode === 'accounts';
  const basePath = accounts ? '/admin/dealer-accounts' : '/admin/dealers';
  const [dealers, setDealers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState((accounts || ['pending', 'rejected'].includes(searchParams.get('status'))) ? (searchParams.get('status') || '') : 'pending');
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

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

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
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter) params.status = statusFilter;
      if (cityFilter.trim()) params.city = cityFilter.trim();
      if (stateFilter.trim()) params.state = stateFilter.trim();

      const res = accounts ? (await apiClient.get(basePath, { params })).data : await adminService.getDealers(params);
      const dealerList = res.data?.dealers || [];
      const p = res.data?.pagination || {};
      const total = p.total ?? p.totalItems ?? p.totalCount ?? 0;

      setDealers(dealerList);
      setPagination({
        page: p.currentPage || p.page || page,
        limit: p.limit || 20,
        totalPages: p.totalPages || Math.ceil(total / (p.limit || 20)) || 1,
        total,
        totalItems: total,
      });
    } catch (err) {
      console.error('Error fetching admin dealers list:', err);
      setError(err.response?.data?.message || 'Failed to load dealer directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealers();
  }, [page, statusFilter, sortBy, sortOrder, debouncedSearch]);

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;
    setApproveLoading(true);
    try {
      await adminService.approveDealerKyc(approveTarget._id, canSetDiscount ? { dealerDiscountPercent: Number(discountPercent) } : {});
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
      await apiClient.put(`${basePath}/${revokeTarget._id}/revoke`, { reason: revokeReason.trim() });
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
        title={accounts ? "Dealer Accounts" : "Dealer Verification"}
        action={accounts ? <><InstallerPricingSettings /><AccountManagementActions role="dealer" onSaved={fetchDealers} /></> : undefined}
        subtitle={accounts ? "Manage dealer accounts, account status and wholesale access" : "Review pending applications and rejected submissions before approving dealer access"}
        badge={`${pagination.total} Dealer Records`}
      />

      {/* Filter & Search Bar */}
      <FilterBar
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        onSearchSubmit={() => {
          setDebouncedSearch(search);
          setPage(1);
        }}
        searchPlaceholder="Search by company name, GSTIN, PAN, or email..."
        filters={[
          {
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: accounts ? 'All Verification Statuses' : 'Pending & Rejected Applications' },
              { value: 'pending', label: 'Pending Verification (Queue)' },
              ...(accounts ? [{ value: 'approved', label: 'Approved Dealers' }] : []),
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
          setDebouncedSearch('');
          setStatusFilter(accounts ? '' : 'pending');
          setCityFilter('');
          setStateFilter('');
          setPage(1);
          setSortBy('createdAt');
          setSortOrder('desc');
        }}
      />

      {/* Table Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 rounded-lg" />
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
          <AdminDirectoryTable className="dealer-directory">
            <Table.Header><Table.Row>
              <Table.Head className="w-[22%]">Company / Tax details</Table.Head>
              <Table.Head className="w-[23%]">Applicant / Location</Table.Head>
              <Table.Head className="w-[15%]">Status</Table.Head>
              <Table.Head className="w-[20%]">Verification</Table.Head>
              <Table.Head className="w-[20%]">Actions</Table.Head>
            </Table.Row></Table.Header>
            <Table.Body>{dealers.map(dlr => {
              const userObj = dlr.userId;
              return <Table.Row key={dlr._id}>
                <Table.Cell>
                  <p className="mb-1 text-xs font-bold uppercase text-slate-500 xl:hidden">Company / Tax details</p>
                  <p className="text-sm font-bold leading-6 text-foreground">{dlr.companyName}</p>
                  {dlr.organisationType && <p className="mt-1 text-sm text-slate-600">{dlr.organisationType}</p>}
                  <p className="mt-2 break-all text-xs text-slate-600">GST: {dlr.gstin || 'N/A'}</p>
                  <p className="break-all text-xs text-slate-600">PAN: {dlr.pan || 'N/A'}</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-500">ID: {dlr._id}</p>
                </Table.Cell>
                <Table.Cell>
                  <p className="mb-1 text-xs font-bold uppercase text-slate-500 xl:hidden">Applicant / Location</p>
                  <p className="text-sm font-semibold text-foreground">{userObj?.name || userObj?.fullName || 'N/A'}</p>
                  <p className="mt-1 break-all text-sm text-slate-600">{userObj?.email || userObj?.phone}</p>
                  <p className="mt-2 text-sm text-slate-600">{[dlr.city, dlr.state].filter(Boolean).join(', ') || 'Location not provided'}</p>
                </Table.Cell>
                <Table.Cell>
                  <p className="mb-1 text-xs font-bold uppercase text-slate-500 xl:hidden">Status</p>
                  <div className="space-y-3"><div><p className="mb-1 text-xs text-slate-600">KYC</p><StatusBadge status={dlr.status} /></div>
                  {accounts && <div><p className="mb-1 text-xs text-slate-600">Account</p><StatusBadge status={userObj?.accountStatus || 'pending'} /></div>}</div>
                </Table.Cell>
                <Table.Cell><p className="mb-1 text-xs font-bold uppercase text-slate-500 xl:hidden">Verification</p><DealerReviewAttribution profile={dlr} /></Table.Cell>
                <Table.Cell className="md:col-span-2 xl:col-auto"><p className="mb-2 text-xs font-bold uppercase text-slate-500 xl:hidden">Actions</p>
                      <div className="grid grid-cols-2 gap-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <Link to={`${basePath}/${dlr._id}`}>
                          <Button variant="outline" size="sm" className="min-h-9 w-full min-w-0 px-2 text-sm" title="Inspect Profile & Documents">
                            <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                          </Button>
                        </Link>

                        {!accounts && dlr.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setDiscountPercent(String(dlr.dealerDiscountPercent || 0)); setApproveTarget(dlr); }}
                              className="min-h-9 min-w-0 border border-emerald-200 px-2 text-sm text-emerald-800 hover:bg-emerald-50"
                              title="Approve KYC"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setRejectTarget(dlr); setRejectionReason(''); setRejectError(''); }}
                              className="min-h-9 min-w-0 border border-rose-200 px-2 text-sm text-rose-700 hover:bg-rose-50"
                              title="Reject KYC"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}

                        <>{accounts && <AccountManagementActions role="dealer" record={dlr} onSaved={fetchDealers} layout="grid" />}</>
                        {accounts && dlr.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setRevokeTarget(dlr); setRevokeReason(''); }}
                            className="min-h-9 min-w-0 border border-amber-200 px-2 text-sm text-amber-800 hover:bg-amber-50"
                            title="Revoke Wholesale Access"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Revoke
                          </Button>
                        )}
                      </div>
                </Table.Cell>
              </Table.Row>;
            })}</Table.Body>
          </AdminDirectoryTable>

          {pagination.total > 0 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pagination.limit || 20}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
        </div>
      )}

      {/* Quick Approve Confirmation Modal */}
      <Modal isOpen={!!approveTarget} onClose={approveLoading ? undefined : () => setApproveTarget(null)} title="Approve Dealer KYC" size="sm">
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); handleApproveConfirm(); }}>
          <p className="text-sm text-muted-foreground">Approve KYC for {approveTarget?.companyName} and unlock dealer pricing?</p>
          {canSetDiscount && <label className="block space-y-2 text-sm font-semibold">Extra global dealer discount (%)
            <input aria-label="Extra global dealer discount (%)" type="number" min="0" max="100" step="0.01" required value={discountPercent} disabled={approveLoading} onChange={event => setDiscountPercent(event.target.value)} className="block w-full rounded-lg border bg-background p-2" />
            <span className="block text-xs font-normal text-muted-foreground">Super admin only. Dealers see final prices without a special-discount label. Edit the discount later from their profile.</span>
          </label>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={approveLoading} onClick={() => setApproveTarget(null)}>Cancel</Button><Button type="submit" isLoading={approveLoading}>Approve KYC</Button></div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title={`Reject KYC: ${rejectTarget?.companyName || ''}`}
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <FormError message={rejectError} />
          <p className="text-sm text-slate-600">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
          <p className="text-sm text-slate-600">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
