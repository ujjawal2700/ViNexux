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
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Customer Name</Table.Head>
                <Table.Head>Email Address</Table.Head>
                <Table.Head>Phone Number</Table.Head>
                <Table.Head>Registered Date</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head className="text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {customers.map((cust) => {
                const nameStr = cust.fullName || cust.name || 'Unnamed Customer';
                const statusVal = cust.accountStatus || cust.status || 'active';

                return (
                  <Table.Row key={cust._id}>
                    <Table.Cell>
                      <div className="text-xs font-bold text-foreground">{nameStr}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">ID: {cust._id}</div>
                    </Table.Cell>
                    <Table.Cell className="font-mono text-xs text-foreground">
                      {cust.email || 'N/A'}
                    </Table.Cell>
                    <Table.Cell className="font-mono text-xs text-foreground">
                      {cust.phone || 'N/A'}
                    </Table.Cell>
                    <Table.Cell className="text-xs text-muted-foreground">
                      {new Date(cust.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={statusVal} />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/customers/${cust._id}`)}
                          className="h-8 px-2 text-xs"
                          title="View Customer Profile & Enquiries"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>

                        {statusVal === 'blocked' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setStatusTarget(cust); setTargetNewStatus('active'); }}
                            className="h-8 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                            title="Unblock Customer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Unblock
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setStatusTarget(cust); setTargetNewStatus('blocked'); }}
                            className="h-8 px-2 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                            title="Block Customer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Block
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>

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
