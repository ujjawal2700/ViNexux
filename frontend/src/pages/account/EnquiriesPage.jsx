import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Search } from 'lucide-react';
import enquiryService from '../../services/enquiryService';
import { StatusBadge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { groupEnquiryItems } from '../../lib/enquiryItems';

const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(amount);

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
  { value: 'spam', label: 'Spam' },
];

export const EnquiriesPage = ({ embedded = false }) => {
  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0, limit: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchEnquiries = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const params = { page: currentPage, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };
      if (statusFilter) params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const response = await enquiryService.getMyEnquiries(params);
      const list = response.data?.enquiries || response.enquiries || [];
      const pageInfo = response.data?.pagination || response.pagination || {};
      setEnquiries(list);
      setPagination({
        totalPages: pageInfo.totalPages ?? 1,
        total: pageInfo.totalItems ?? pageInfo.total ?? list.length,
        limit: pageInfo.limit ?? 10,
      });
    } catch (err) {
      if (!silent) setError('Unable to load your enquiries.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [currentPage, statusFilter, debouncedSearch]);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') fetchEnquiries({ silent: true });
    };
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [fetchEnquiries]);

  const cellClass = 'border-t border-r border-slate-300 px-4 py-4 align-middle text-sm text-slate-900 last:border-r-0';
  const headingClass = 'border-r border-slate-300 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-900 last:border-r-0';

  return (
    <div className={embedded ? 'w-full min-w-0 space-y-6 text-left' : 'w-full min-h-screen px-3 py-6 sm:px-6 lg:px-8 space-y-6 text-left'}>
      <div>
        <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-extrabold text-slate-950">
          <FileText className="h-7 w-7 text-[var(--store-primary)]" /> My Enquiries
        </h1>
        <p className="mt-1 text-sm text-slate-600">Track the product enquiries you have sent to our team.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block w-full min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <span className="sr-only">Search by enquiry number</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by enquiry number..."
            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[var(--store-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--store-primary)]"
          />
        </label>
        <div className="w-full sm:w-56">
          <Select
            aria-label="Filter enquiries by status"
            placeholder={null}
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }}
            options={statusOptions}
            className="h-11 border-slate-300 text-slate-900"
          />
        </div>
      </div>

      {error ? <ErrorState title="Enquiries unavailable" description={error} onRetry={fetchEnquiries} /> : isLoading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : (
        <>
          <div className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-slate-100">
                <tr>
                  <th scope="col" className={headingClass}>Enquiry No.</th>
                  <th scope="col" className={headingClass}>Date</th>
                  <th scope="col" className={headingClass}>Status</th>
                  <th scope="col" className={headingClass}>Products / Quantity</th>
                  <th scope="col" className={`${headingClass} text-right`}>Estimated Total</th>
                  <th scope="col" className={`${headingClass} text-center`}>Details</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.length === 0 ? <tr><td colSpan={6} className="border-t border-slate-300 px-4 py-12 text-center text-sm font-medium text-slate-700">No enquiries match this status or enquiry number.</td></tr> : enquiries.map((enquiry) => {
                  const items = enquiry.items || [];
                  const quantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
                  const total = items.reduce((sum, item) => sum + (Number(item.priceShown) || 0) * (Number(item.quantity) || 1), 0);
                  return <tr key={enquiry._id} className="hover:bg-slate-50">
                    <td className={`${cellClass} font-mono font-bold`}><Link className="text-[var(--store-primary)] hover:underline" to={`/account/enquiries/${enquiry._id}`}>{enquiry.enquiryNumber}</Link></td>
                    <td className={cellClass}>{new Date(enquiry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className={cellClass}><StatusBadge status={enquiry.status} /></td>
                    <td className={cellClass}>{groupEnquiryItems(items).length} product(s) · Qty {quantity}</td>
                    <td className={`${cellClass} text-right font-semibold`}>{formatCurrency(total)}</td>
                    <td className={`${cellClass} text-center`}><Link to={`/account/enquiries/${enquiry._id}`} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 font-semibold text-[var(--store-primary)] hover:bg-[var(--store-primary)]/5"><Eye className="h-4 w-4" /> View</Link></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && <Pagination currentPage={currentPage} totalPages={pagination.totalPages} totalItems={pagination.total} pageSize={pagination.limit} onPageChange={setCurrentPage} />}
        </>
      )}
    </div>
  );
};

export default EnquiriesPage;
