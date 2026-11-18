import AdminDirectoryTable from '../../components/admin/AdminDirectoryTable';
import AccountManagementActions from '../../components/admin/AccountManagementActions';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import FilterBar from '../../components/admin/FilterBar';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import { UserCheck, Eye, ShieldAlert, ShieldCheck } from 'lucide-react';

const AdminCustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Status Change Confirmation State
  const [statusTarget, setStatusTarget] = useState(null);
  const [targetNewStatus, setTargetNewStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchCustomers = async () => {
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
      if (accountStatusFilter) params.accountStatus = accountStatusFilter;

      const res = await adminService.getCustomers(params);
      const customerList = res.data?.customers || [];
      const p = res.data?.pagination || {};
      const total = p.total ?? p.totalItems ?? p.totalCount ?? 0;

      setCustomers(customerList);
      setPagination({
        page: p.currentPage || p.page || page,
        limit: p.limit || 20,
        totalPages: p.totalPages || Math.ceil(total / (p.limit || 20)) || 1,
        total,
        totalItems: total,
      });
    } catch (err) {
      console.error('Error fetching customers directory:', err);
      setError(err.response?.data?.message || 'Failed to load customer accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, accountStatusFilter, sortBy, sortOrder, debouncedSearch]);

  const handleToggleStatusConfirm = async () => {
    if (!statusTarget || !targetNewStatus) return;
    setStatusLoading(true);
    try {
      await adminService.updateCustomerStatus(statusTarget._id, targetNewStatus);
      setToast({ message: `Customer account updated to '${targetNewStatus}'`, type: 'success' });
      setStatusTarget(null);
      setTargetNewStatus('');
      fetchCustomers();
    } catch (err) {
      console.error('Customer status update error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to update customer status', type: 'error' });
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AdminPageHeader
        title="Retail Customer Accounts"
        action={<AccountManagementActions role="customer" onSaved={fetchCustomers} />}
        subtitle="Manage customer user accounts, view contact verification status & update account access privileges"
        badge={`${pagination.total} Registered Customers`}
      />

      {/* Filter Bar */}
      <FilterBar
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        onSearchSubmit={() => {
          setDebouncedSearch(search);
          setPage(1);
        }}
        searchPlaceholder="Search customer by name, email, or phone..."
        filters={[
          {
            value: accountStatusFilter,
            onChange: (val) => {
              setAccountStatusFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All Account Statuses' },
              { value: 'active', label: 'Active Accounts Only' },
              { value: 'blocked', label: 'Blocked Accounts Only' },
              { value: 'pending', label: 'Pending Verification' },
            ],
          },
        ]}
        sortOptions={[
          { value: 'createdAt', label: 'Sort by Registration Date' },
          { value: 'fullName', label: 'Sort by Name' },
          { value: 'email', label: 'Sort by Email' },
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
          setAccountStatusFilter('');
          setPage(1);
          setSortBy('createdAt');
          setSortOrder('desc');
        }}
      />

      {/* Content Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Failed to load customer accounts" message={error} onRetry={fetchCustomers} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No customer accounts found"
          description="There are no customer records matching your current filter selection or search query."
        />
      ) : (
        <div className="space-y-4">
          <AdminDirectoryTable className="customer-directory">
            <Table.Header><Table.Row>
              <Table.Head className="w-[22%]">Customer</Table.Head>
              <Table.Head className="w-[25%]">Contact</Table.Head>
              <Table.Head className="w-[18%]">Registered</Table.Head>
              <Table.Head className="w-[15%]">Status</Table.Head>
              <Table.Head className="w-[20%]">Actions</Table.Head>
            </Table.Row></Table.Header>
            <Table.Body>{customers.map(cust => {
              const nameStr = cust.fullName || cust.name || 'Unnamed Customer';
              const statusVal = cust.accountStatus || cust.status || 'active';
              return <Table.Row key={cust._id}>
                <Table.Cell><p className="mb-1 text-xs font-bold uppercase text-slate-500 xl:hidden">Customer</p><p className="text-sm font-bold leading-6 text-foreground">{nameStr}</p><p className="mt-1 break-all font-mono text-xs text-slate-500">ID: {cust._id}</p></Table.Cell>
                <Table.Cell><p className="mb-1 text-xs font-bold uppercase text-slate-500 xl:hidden">Contact</p><p className="break-all text-sm text-slate-700">{cust.email || 'Email not provided'}</p><p className="mt-1 text-sm text-slate-600">{cust.phone || 'Phone not provided'}</p></Table.Cell>
                <Table.Cell><p className="mb-1 text-xs font-bold uppercase text-slate-500 xl:hidden">Registered</p><p className="text-sm text-slate-600">{cust.createdAt ? new Date(cust.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded'}</p></Table.Cell>
                <Table.Cell><p className="mb-1 text-xs font-bold uppercase text-slate-500 xl:hidden">Status</p><StatusBadge status={statusVal} /></Table.Cell>
                <Table.Cell className="md:col-span-2 xl:col-auto"><p className="mb-2 text-xs font-bold uppercase text-slate-500 xl:hidden">Actions</p>
                      <div className="grid grid-cols-2 gap-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/customers/${cust._id}`)}
                          className="min-h-9 min-w-0 px-2 text-sm"
                          title="View Customer Profile & Enquiries"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>

                        <AccountManagementActions role="customer" record={cust} onSaved={fetchCustomers} layout="grid" />
                        {statusVal === 'blocked' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setStatusTarget(cust); setTargetNewStatus('active'); }}
                            className="min-h-9 min-w-0 border-emerald-200 px-2 text-sm text-emerald-800 hover:bg-emerald-50"
                            title="Unblock Customer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Unblock
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setStatusTarget(cust); setTargetNewStatus('blocked'); }}
                            className="min-h-9 min-w-0 border-rose-200 px-2 text-sm text-rose-700 hover:bg-rose-50"
                            title="Block Customer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Block
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

      {/* Status Toggle Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleToggleStatusConfirm}
        title={`${targetNewStatus === 'blocked' ? 'Block' : 'Activate'} Customer Account`}
        message={`Are you sure you want to change account status for "${statusTarget?.fullName || statusTarget?.name}" to '${targetNewStatus}'?`}
        confirmText={targetNewStatus === 'blocked' ? 'Block Customer' : 'Activate Customer'}
        isLoading={statusLoading}
        variant={targetNewStatus === 'blocked' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default AdminCustomersPage;
