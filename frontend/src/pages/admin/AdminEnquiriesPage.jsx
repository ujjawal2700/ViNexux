import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import FilterBar from '../../components/admin/FilterBar';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import { Inbox, Eye, FileSpreadsheet, Send, RefreshCw } from 'lucide-react';

const ALLOWED_STATUS_TRANSITIONS = {
  new: ['contacted', 'in-progress', 'closed', 'spam'],
  contacted: ['in-progress', 'closed', 'spam'],
  'in-progress': ['closed', 'spam'],
  closed: ['closed'],
  spam: ['spam'],
};

const AdminEnquiriesPage = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Trigger loading states per enquiry id
  const [syncingId, setSyncingId] = useState(null);
  const [whatsAppId, setWhatsAppId] = useState(null);

  // Toast State
  const [toast, setToast] = useState(null);

  const fetchEnquiries = async () => {
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
      if (userTypeFilter) params.userType = userTypeFilter;

      const res = await adminService.getEnquiries(params);
      setEnquiries(res.data?.enquiries || []);
      setPagination(res.data?.pagination || { page: 1, limit: 20, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Error fetching enquiries list:', err);
      setError(err.response?.data?.message || 'Failed to load enquiries list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [page, statusFilter, userTypeFilter, sortBy, sortOrder]);

  const handleStatusChange = async (enquiryId, currentStatus, newStatus) => {
    if (currentStatus === newStatus) return;

    try {
      await adminService.updateEnquiryStatus(enquiryId, { status: newStatus });
      setToast({ message: `Enquiry status updated to '${newStatus}'`, type: 'success' });
      fetchEnquiries();
    } catch (err) {
      console.error('Status update error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to update enquiry status', type: 'error' });
    }
  };

  const handleSyncGoogleSheet = async (enquiryId) => {
    setSyncingId(enquiryId);
    try {
      const res = await adminService.syncGoogleSheet(enquiryId);
      setToast({ message: res.message || 'Synced to Google Sheets successfully!', type: 'success' });
    } catch (err) {
      console.error('Google sheet sync error:', err);
      setToast({ message: err.response?.data?.message || 'Google Sheets sync failed', type: 'error' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleResendWhatsApp = async (enquiryId) => {
    setWhatsAppId(enquiryId);
    try {
      const res = await adminService.resendWhatsApp(enquiryId);
      setToast({ message: res.message || 'WhatsApp notification resent successfully!', type: 'success' });
    } catch (err) {
      console.error('WhatsApp resend error:', err);
      setToast({ message: err.response?.data?.message || 'WhatsApp notification failed', type: 'error' });
    } finally {
      setWhatsAppId(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AdminPageHeader
        title="B2B Enquiry & Lead Management"
        subtitle="Track submitted product leads, update lead workflow statuses, sync Google Sheets & dispatch WhatsApp alerts"
        badge={`${pagination.total} Leads`}
      />

      {/* Filter Bar */}
      <FilterBar
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        searchPlaceholder="Search lead #, contact name, email, or message..."
        filters={[
          {
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All Lead Statuses' },
              { value: 'new', label: 'New Unprocessed' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'closed', label: 'Closed / Converted' },
              { value: 'spam', label: 'Marked as Spam' },
            ],
          },
          {
            value: userTypeFilter,
            onChange: (val) => {
              setUserTypeFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All User Types' },
              { value: 'customer', label: 'Retail Customers' },
              { value: 'dealer', label: 'B2B Wholesale Dealers' },
            ],
          },
        ]}
        sortOptions={[
          { value: 'createdAt', label: 'Sort by Submission Date' },
          { value: 'enquiryNumber', label: 'Sort by Lead Number' },
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
          setUserTypeFilter('');
          setPage(1);
          setSortBy('createdAt');
          setSortOrder('desc');
        }}
      >
        <Button variant="outline" size="sm" onClick={() => { setPage(1); fetchEnquiries(); }} className="text-xs shrink-0">
          Apply Search
        </Button>
      </FilterBar>

      {/* Table Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 rounded-lg bg-[#f4e7ea]" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Failed to load enquiries list" message={error} onRetry={fetchEnquiries} />
      ) : enquiries.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No enquiries found"
          description="There are no lead records matching your current filter selection or search term."
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Lead Number</Table.Head>
                <Table.Head>Contact</Table.Head>
                <Table.Head>Type</Table.Head>
                <Table.Head>Items / Price</Table.Head>
                <Table.Head>Workflow Status</Table.Head>
                <Table.Head className="text-right">Actions & Triggers</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {enquiries.map((enq) => {
                const allowedNext = ALLOWED_STATUS_TRANSITIONS[enq.status] || [enq.status];
                const statusOptions = [
                  { value: enq.status, label: enq.status.toUpperCase() },
                  ...allowedNext
                    .filter((s) => s !== enq.status)
                    .map((s) => ({ value: s, label: s.toUpperCase() })),
                ];

                const totalItemsCount = enq.items ? enq.items.reduce((acc, item) => acc + (item.quantity || 1), 0) : 0;

                return (
                  <Table.Row key={enq._id}>
                    <Table.Cell>
                      <div className="font-mono text-xs font-bold text-[#3d0a0d]">{enq.enquiryNumber}</div>
                      <div className="text-[10px] text-[#7c5c5f]">
                        {new Date(enq.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="text-xs font-bold text-[#3d0a0d]">{enq.contactName}</div>
                      <div className="text-[10px] text-[#7c5c5f]">{enq.contactEmail || enq.contactPhone}</div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        enq.userType === 'dealer'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {enq.userType || 'customer'}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="text-xs font-semibold text-[#3d0a0d]">{totalItemsCount} Item(s)</div>
                      <div className="text-[11px] font-extrabold text-emerald-700">
                        ₹{Number(enq.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="min-w-[140px]">
                      <Select
                        value={enq.status}
                        onChange={(e) => handleStatusChange(enq._id, enq.status, e.target.value)}
                        options={statusOptions}
                        className="text-xs py-1 h-8"
                      />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/enquiries/${enq._id}`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" title="Inspect Full Enquiry">
                            <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncGoogleSheet(enq._id)}
                          isLoading={syncingId === enq._id}
                          className="h-8 w-8 p-0 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                          title="Sync to Google Sheet"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendWhatsApp(enq._id)}
                          isLoading={whatsAppId === enq._id}
                          className="h-8 w-8 p-0 text-green-700 hover:text-green-800 hover:bg-green-50"
                          title="Resend WhatsApp Alert"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
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
    </div>
  );
};

export default AdminEnquiriesPage;
