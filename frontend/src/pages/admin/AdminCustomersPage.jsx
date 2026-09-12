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
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import { UserCheck, Eye, ShieldAlert, ShieldCheck, Mail, Phone, Calendar, FileText, Package, Clock, ExternalLink, User } from 'lucide-react';

const AdminCustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Customer Detail Inspection Modal State
  const [inspectCustomer, setInspectCustomer] = useState(null);
  const [customerEnquiries, setCustomerEnquiries] = useState([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);

  // Status Change Confirmation State
  const [statusTarget, setStatusTarget] = useState(null);
  const [targetNewStatus, setTargetNewStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState(null);

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
      if (search.trim()) params.search = search.trim();
      if (accountStatusFilter) params.accountStatus = accountStatusFilter;

      const res = await adminService.getCustomers(params);
      setCustomers(res.data?.customers || []);
      setPagination(res.data?.pagination || { page: 1, limit: 20, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Error fetching customers directory:', err);
      setError(err.response?.data?.message || 'Failed to load customer accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, accountStatusFilter, sortBy, sortOrder]);

  // Fetch enquiries associated with selected customer when inspecting
  useEffect(() => {
    if (!inspectCustomer) {
      setCustomerEnquiries([]);
      return;
    }

    const fetchCustomerEnquiries = async () => {
      setEnquiriesLoading(true);
      try {
        // Query by userId or email
        const res = await adminService.getEnquiries({ userId: inspectCustomer._id, limit: 50 });
        let list = res.data?.enquiries || res.enquiries || [];
        
        // Fallback search by email if userId filter yields no results
        if (list.length === 0 && inspectCustomer.email) {
          const emailRes = await adminService.getEnquiries({ search: inspectCustomer.email, limit: 50 });
          list = emailRes.data?.enquiries || emailRes.enquiries || [];
        }

        setCustomerEnquiries(list);
      } catch (err) {
        console.warn('Failed to load customer enquiries for modal:', err);
        setCustomerEnquiries([]);
      } finally {
        setEnquiriesLoading(false);
      }
    };

    fetchCustomerEnquiries();
  }, [inspectCustomer]);

  const handleToggleStatusConfirm = async () => {
    if (!statusTarget || !targetNewStatus) return;
    setStatusLoading(true);
    try {
      await adminService.updateCustomerStatus(statusTarget._id, targetNewStatus);
      setToast({ message: `Customer account updated to '${targetNewStatus}'`, type: 'success' });
      
      // Update in-memory inspected customer if open
      if (inspectCustomer && inspectCustomer._id === statusTarget._id) {
        setInspectCustomer((prev) => ({ ...prev, accountStatus: targetNewStatus, status: targetNewStatus }));
      }
      
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
          setAccountStatusFilter('');
          setPage(1);
          setSortBy('createdAt');
          setSortOrder('desc');
        }}
      >
        <Button variant="outline" size="sm" onClick={() => { setPage(1); fetchCustomers(); }} className="text-xs shrink-0">
          Apply Search
        </Button>
      </FilterBar>

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
                          onClick={() => setInspectCustomer(cust)}
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

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
        </div>
      )}

      {/* Customer Inspection POPUP MODAL */}
      <Modal
        isOpen={!!inspectCustomer}
        onClose={() => setInspectCustomer(null)}
        title={`Customer Details & Enquiry History`}
        size="xl"
      >
        {inspectCustomer && (
          <div className="space-y-6">
            {/* Header Identity Card */}
            <div className="p-4 rounded-2xl bg-muted/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base shrink-0">
                  {(inspectCustomer.fullName || inspectCustomer.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">
                    {inspectCustomer.fullName || inspectCustomer.name || 'Unnamed Customer'}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                    <span>ID: {inspectCustomer._id}</span>
                    <span>•</span>
                    <span className="uppercase text-primary font-bold">{inspectCustomer.role || 'customer'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={inspectCustomer.accountStatus || inspectCustomer.status || 'active'} />
              </div>
            </div>

            {/* Basic Information Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> Basic Account Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1">
                    <Mail className="w-3 h-3 text-primary" /> Email Address
                  </div>
                  <div className="text-xs font-mono font-bold text-foreground truncate">
                    {inspectCustomer.email || 'N/A'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" /> Phone Number
                  </div>
                  <div className="text-xs font-mono font-bold text-foreground">
                    {inspectCustomer.phone || 'N/A'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-600" /> Registration Date
                  </div>
                  <div className="text-xs font-bold text-foreground">
                    {new Date(inspectCustomer.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Enquiry History Section */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Customer Enquiry Details
                </h4>
                <Badge variant="neutral" className="text-[10px] font-bold">
                  {customerEnquiries.length} Enquir{customerEnquiries.length === 1 ? 'y' : 'ies'} Found
                </Badge>
              </div>

              {enquiriesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : customerEnquiries.length === 0 ? (
                <div className="p-6 rounded-2xl bg-card border border-border text-center space-y-2">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-muted-foreground">
                    No product enquiries or quotation requests submitted by this customer yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {customerEnquiries.map((enq) => {
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
                              to={`/admin/enquiries`}
                              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
                            >
                              Inspect <ExternalLink className="w-3 h-3 ml-0.5" />
                            </Link>
                          </div>
                        </div>

                        {/* Items Overview */}
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

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <div>
                {(inspectCustomer.accountStatus || inspectCustomer.status) === 'blocked' ? (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => { setStatusTarget(inspectCustomer); setTargetNewStatus('active'); }}
                    className="text-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Unblock Account
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => { setStatusTarget(inspectCustomer); setTargetNewStatus('blocked'); }}
                    className="text-xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Block Account
                  </Button>
                )}
              </div>

              <Button variant="outline" size="sm" onClick={() => setInspectCustomer(null)}>
                Close Window
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
